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

ABSOLUTE RULES (these override everything else):
1. You may ONLY reference values present in the DATA object below. You may
   not invent vendor names, item names, dates, percentages, dollar amounts,
   or any other facts not in DATA.
2. You must return a JSON array of observations matching this exact schema:
   [{ "title": string (max 80 chars), "body": string (max 280 chars),
      "references": string[] (each entry is a JSON path into DATA, e.g.
      "spend.percentChange" or "topVendors[0].name"),
      "speculative": boolean }]
3. Every reference path you list MUST exist in the actual DATA. If you
   cannot trace a claim to a specific DATA path, do not write that
   observation.
4. Write 3 to 6 observations. If DATA is too thin (e.g. zero spend),
   return fewer or an empty array.
5. Do not output anything outside the JSON array. No prose, no markdown
   fences, no commentary.
6. Each observation must mark itself "speculative": true if it speculates
   on causes or future state, false if it is a direct restatement of
   DATA values.
7. Do not use em dashes. Use commas, semicolons, or periods instead.`;

export class InsightsObserver {
  constructor(private readonly prisma: PrismaClient) {}

  async observe(
    snapshot: InsightsSnapshot,
    mode: InsightMode = 'strict',
  ): Promise<Observation[]> {
    if (!process.env.OPENAI_API_KEY) {
      return [];
    }

    const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
    const modelConfig = await (this.prisma as any).systemConfig.findUnique({
      where: { key: 'openai_model' },
    });
    const modelId =
      (modelConfig as { value?: string } | null)?.value || 'gpt-5.4-nano';

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
      console.error('InsightsObserver OpenAI call failed:', err);
      return [];
    }

    // Parse + schema-validate + reference-validate
    const parsed = this.safeParse(raw);
    if (!parsed) return [];

    const validated: Observation[] = [];
    for (const candidate of parsed) {
      if (!isObservation(candidate)) continue;
      // Verify every reference path actually exists in the snapshot.
      const allReferencesValid = candidate.references.every((path) =>
        pathExists(snapshot as unknown as Record<string, unknown>, path),
      );
      if (!allReferencesValid) continue;
      // Trim to length caps to be defensive
      validated.push({
        title: candidate.title.slice(0, 80),
        body: candidate.body.slice(0, 280),
        references: candidate.references.slice(0, 6),
        speculative: Boolean(candidate.speculative),
      });
    }

    return validated;
  }

  private safeParse(raw: string): unknown[] | null {
    try {
      const obj = JSON.parse(raw);
      // Accept either { observations: [...] } or a bare array.
      if (Array.isArray(obj)) return obj;
      if (obj && Array.isArray(obj.observations)) return obj.observations;
      // Some models wrap as { data: [...] } or { insights: [...] }
      for (const key of Object.keys(obj ?? {})) {
        if (Array.isArray(obj[key])) return obj[key];
      }
      return null;
    } catch {
      return null;
    }
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
