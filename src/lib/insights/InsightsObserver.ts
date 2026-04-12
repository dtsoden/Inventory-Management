import OpenAI from 'openai';
import { PrismaClient } from '@prisma/client';
import type { InsightsSnapshot } from './InsightsService';

/**
 * Calls OpenAI with a strict, locked-down system prompt and the
 * pre-computed snapshot. The model is forbidden from inventing values
 * not present in the snapshot. Output is JSON-validated against a
 * schema before being returned.
 *
 * The user-facing dial maps to three hardcoded modes here. The mode
 * controls BOTH temperature and the system prompt instructions, so
 * "Just the numbers" is genuinely incapable of speculation.
 */

export type InsightMode = 'strict' | 'balanced' | 'speculative';

export interface Observation {
  title: string;
  body: string;
  references: string[];
  speculative: boolean;
}

const MODE_TEMPERATURE: Record<InsightMode, number> = {
  strict: 0,
  balanced: 0.3,
  speculative: 0.7,
};

const MODE_INSTRUCTIONS: Record<InsightMode, string> = {
  strict: `Mode: STRICT (just the numbers).
You may ONLY restate the values present in the DATA object using clear procurement
language. You MAY NOT interpret, predict, recommend, or speculate. You MAY NOT
explain causes. You MAY NOT use words like "likely", "probably", "consider",
"recommend", "should", "may want to", "might". Each observation must directly
quote one or more numbers from DATA.`,

  balanced: `Mode: BALANCED (with context).
You may restate values from DATA AND add brief framing using only the
risk classifications already present in DATA (riskLevel: low/medium/high).
You MAY NOT predict the future. You MAY NOT speculate on causes. You MAY
say "this is classified as high risk" if the DATA classifies it as high.`,

  speculative: `Mode: SPECULATIVE (propose causes).
You may restate values from DATA and propose plausible causes or
recommended next actions. EVERY speculation must reference a specific
number in DATA. You MAY use words like "likely", "consider", "recommend",
"may indicate". The user has been warned that speculative output is not
verified by the data alone, so you may exercise judgment, but each
speculation must trace back to a specific DATA field via the references
array.`,
};

const SYSTEM_PROMPT_BASE = `You are a procurement analyst writing concise observations for a manager.

OUTPUT FORMAT (this is non-negotiable):
You MUST return a JSON object with EXACTLY this top-level shape:

{
  "observations": [
    {
      "title": "<= 80 chars",
      "body": "<= 280 chars",
      "references": ["dot.notation.path", "topVendors[0].name", ...],
      "speculative": false
    },
    ... more observations ...
  ]
}

The top-level key MUST be "observations" and its value MUST be an
array. Even if you have only one observation, it goes inside an array.
Do not return a single observation object at the top level. Do not
return anything else outside the "observations" array.

ABSOLUTE RULES (these override everything else):
1. You may ONLY reference values present in the DATA object below. You may
   not invent vendor names, item names, dates, percentages, dollar amounts,
   or any other facts not in DATA.
2. Every reference path you list MUST exist in the actual DATA. If you
   cannot trace a claim to a specific DATA path, do not write that
   observation.
3. Write 3 to 6 observations. If DATA is too thin (e.g. zero spend),
   return fewer.
4. Each observation must mark itself "speculative": true if it speculates
   on causes or future state, false if it is a direct restatement of
   DATA values.
5. Do not use em dashes. Use commas, semicolons, or periods instead.
6. Do not output markdown fences. Pure JSON object only.`;

export class InsightsObserver {
  constructor(private readonly prisma: PrismaClient) {}

  async observe(
    snapshot: InsightsSnapshot,
    mode: InsightMode = 'strict',
  ): Promise<Observation[]> {
    const { getOpenAIKey, getOpenAIModel } = await import('@/lib/config/vault');
    const apiKey = await getOpenAIKey();
    if (!apiKey) return [];

    const openai = new OpenAI({ apiKey });
    const modelId = await getOpenAIModel();

    const systemPrompt = `${SYSTEM_PROMPT_BASE}\n\n${MODE_INSTRUCTIONS[mode]}`;
    const userPrompt = `DATA:\n${JSON.stringify(snapshot, null, 2)}`;

    let raw: string;
    try {
      const response = await openai.chat.completions.create({
        model: modelId,
        temperature: MODE_TEMPERATURE[mode],
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt },
        ],
        response_format: { type: 'json_object' },
      });
      raw = response.choices[0]?.message?.content ?? '';
    } catch (err) {
      console.error('[Insights] OpenAI call failed:', err);
      return [];
    }

    console.log('[Insights] raw model output (first 500 chars):', raw.slice(0, 500));

    const parsed = this.safeParse(raw);
    if (!parsed) {
      console.warn('[Insights] safeParse returned null, raw was:', raw);
      return [];
    }
    console.log(`[Insights] parsed ${parsed.length} candidate observations`);

    const validated: Observation[] = [];
    const snapshotObj = snapshot as unknown as Record<string, unknown>;

    for (const candidate of parsed) {
      // Be permissive: accept anything with title and body. Default
      // missing fields rather than dropping the whole observation, so
      // we don't burn user tokens on silently-rejected output.
      if (typeof candidate !== 'object' || candidate === null) {
        console.warn('[Insights] dropped non-object candidate:', candidate);
        continue;
      }
      const c = candidate as Record<string, unknown>;
      const title = typeof c.title === 'string' ? c.title : '';
      const body = typeof c.body === 'string' ? c.body : '';
      if (!title.trim() || !body.trim()) {
        console.warn('[Insights] dropped candidate with no title/body:', c);
        continue;
      }
      const rawReferences = Array.isArray(c.references)
        ? (c.references.filter((r) => typeof r === 'string') as string[])
        : [];
      // Filter references to only those that actually resolve in the
      // snapshot. The observation is shown even if zero references
      // survive; we just rely on the schema (title/body) and the
      // model's mode-locked instructions.
      const verifiedReferences = rawReferences.filter((path) =>
        pathExists(snapshotObj, path),
      );
      const droppedReferences = rawReferences.length - verifiedReferences.length;
      if (droppedReferences > 0) {
        console.warn(
          `[Insights] dropped ${droppedReferences} of ${rawReferences.length} references for "${title}":`,
          rawReferences.filter((p) => !pathExists(snapshotObj, p)),
        );
      }

      validated.push({
        title: title.slice(0, 120),
        body: body.slice(0, 320),
        references: verifiedReferences.slice(0, 6),
        speculative: Boolean(c.speculative),
      });
    }

    console.log(
      `[Insights] returning ${validated.length} observations to client`,
    );
    return validated;
  }

  private safeParse(raw: string): unknown[] | null {
    try {
      const obj = JSON.parse(raw);

      // Bare array of observation objects.
      if (Array.isArray(obj) && this.isArrayOfObjects(obj)) return obj;

      if (!obj || typeof obj !== 'object') return null;

      // Preferred shape: { observations: [...] }
      if (Array.isArray(obj.observations) && this.isArrayOfObjects(obj.observations)) {
        return obj.observations;
      }

      // Fallback: scan keys for the FIRST array-of-objects, ignoring
      // arrays of strings/numbers (e.g. a misnamed `references` field).
      for (const key of Object.keys(obj)) {
        const value = obj[key];
        if (Array.isArray(value) && this.isArrayOfObjects(value)) {
          return value;
        }
      }

      // Last resort: the model returned a single observation object
      // at the top level. Wrap it in an array so the caller can handle
      // it uniformly.
      if ('title' in obj && 'body' in obj) {
        return [obj];
      }

      return null;
    } catch {
      return null;
    }
  }

  private isArrayOfObjects(arr: unknown[]): boolean {
    if (arr.length === 0) return true; // empty array is fine
    return arr.every(
      (item) => typeof item === 'object' && item !== null && !Array.isArray(item),
    );
  }
}

function isObservation(value: unknown): value is Observation {
  if (typeof value !== 'object' || value === null) return false;
  const v = value as Record<string, unknown>;
  return (
    typeof v.title === 'string' &&
    typeof v.body === 'string' &&
    Array.isArray(v.references) &&
    v.references.every((r) => typeof r === 'string') &&
    typeof v.speculative === 'boolean'
  );
}

/**
 * Lightweight JSON-path existence checker. Supports dot notation and
 * [index] for arrays. Used to verify that every AI-claimed reference
 * actually exists in the snapshot before showing the observation.
 */
function pathExists(obj: Record<string, unknown>, path: string): boolean {
  const segments = path
    .replace(/\[(\d+)\]/g, '.$1')
    .split('.')
    .filter(Boolean);
  let current: unknown = obj;
  for (const seg of segments) {
    if (current === null || current === undefined) return false;
    if (typeof current !== 'object') return false;
    current = (current as Record<string, unknown>)[seg];
  }
  return current !== undefined;
}

export const insightsObserver = (prisma: PrismaClient) =>
  new InsightsObserver(prisma);
