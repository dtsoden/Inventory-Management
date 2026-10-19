import OpenAI from 'openai';
import type {
  FunctionTool,
  Response,
  ResponseCreateParamsNonStreaming,
  ResponseFunctionToolCall,
  ResponseInput,
  ResponseInputItem,
} from 'openai/resources/responses/responses';
import { AppError } from '@/lib/errors';

export interface RespondOptions {
  model: string;
  instructions?: string;
  input: string | ResponseInput;
  /** Ask for a JSON object back. The prompt must mention JSON. */
  json?: boolean;
  temperature?: number;
  maxOutputTokens?: number;
  /**
   * Reasoning models default to 'medium', which with tools attached can
   * add 10+ seconds to a one-word reply. Interactive callers pass 'none'.
   * Models without reasoning reject the field and it is dropped.
   */
  reasoningEffort?: 'none' | 'minimal' | 'low' | 'medium' | 'high';
  tools?: FunctionTool[];
}

export interface RunToolsOptions extends RespondOptions {
  tools: FunctionTool[];
  execute: (name: string, args: Record<string, unknown>) => Promise<unknown>;
  maxRounds?: number;
}

/** Optional request fields some models refuse. Safe to drop and retry. */
const DROPPABLE = ['temperature', 'top_p', 'max_output_tokens', 'reasoning', 'text'] as const;
type Droppable = (typeof DROPPABLE)[number];

/**
 * The single way this app talks to OpenAI. Uses the Responses API
 * (/v1/responses), which supports function tools, JSON output and image
 * input on every current model, reasoning models included.
 *
 * Models differ in which optional parameters they accept (reasoning
 * models reject temperature, for one). When OpenAI names one of those
 * as the problem, we drop it, remember that for the model, and retry.
 */
export class OpenAIClient {
  private static readonly unsupported = new Map<string, Set<Droppable>>();

  private readonly openai: OpenAI;

  constructor(apiKey: string) {
    this.openai = new OpenAI({ apiKey });
  }

  /** Client and model from Settings > Integrations, or a clear error. */
  static async fromSettings(): Promise<{ client: OpenAIClient; model: string }> {
    const { getOpenAIKey, getOpenAIModel } = await import('@/lib/config/vault');
    const apiKey = await getOpenAIKey();
    if (!apiKey) {
      throw new AppError(
        'OpenAI API key not configured. Set it in Settings > Integrations.',
        400,
        'OPENAI_NOT_CONFIGURED',
      );
    }
    return { client: new OpenAIClient(apiKey), model: await getOpenAIModel() };
  }

  async respond(options: RespondOptions): Promise<Response> {
    const params = this.buildParams(options);
    const skipped = OpenAIClient.unsupported.get(options.model) ?? new Set<Droppable>();
    for (const field of skipped) delete params[field];

    for (let attempt = 0; attempt <= DROPPABLE.length; attempt++) {
      const started = Date.now();
      try {
        const response = await this.openai.responses.create(params);
        const usage = response.usage;
        console.log(
          `[openai] ${options.model} ${Date.now() - started}ms in=${usage?.input_tokens ?? '?'} out=${usage?.output_tokens ?? '?'}` +
            ` reasoning=${usage?.output_tokens_details?.reasoning_tokens ?? 0} tools=${response.output.filter((o) => o.type === 'function_call').length}`,
        );
        return response;
      } catch (err) {
        console.error(`[openai] ${options.model} failed after ${Date.now() - started}ms:`, err instanceof Error ? err.message : err);
        const field = this.rejectedField(err, params);
        if (!field) throw OpenAIClient.toAppError(err, options.model);
        delete params[field];
        skipped.add(field);
        OpenAIClient.unsupported.set(options.model, skipped);
      }
    }
    throw new AppError(`OpenAI kept rejecting the request for model "${options.model}"`, 502, 'OPENAI_API_ERROR');
  }

  async text(options: RespondOptions): Promise<string> {
    return (await this.respond(options)).output_text ?? '';
  }

  /**
   * Run the model with function tools until it answers in text. Each
   * round feeds the tool results back as function_call_output items.
   */
  async runTools(options: RunToolsOptions): Promise<string> {
    const { execute, maxRounds = 8, ...rest } = options;
    const input: ResponseInputItem[] =
      typeof rest.input === 'string' ? [{ role: 'user', content: rest.input }] : [...rest.input];

    for (let round = 0; round < maxRounds; round++) {
      const response = await this.respond({ ...rest, input });
      const calls = response.output.filter(
        (item): item is ResponseFunctionToolCall => item.type === 'function_call',
      );
      if (calls.length === 0) return response.output_text ?? '';

      input.push(...(response.output as ResponseInputItem[]));
      for (const call of calls) {
        let result: unknown;
        try {
          result = await execute(call.name, JSON.parse(call.arguments || '{}'));
        } catch (err) {
          result = { error: err instanceof Error ? err.message : String(err) };
        }
        input.push({ type: 'function_call_output', call_id: call.call_id, output: JSON.stringify(result) });
      }
    }
    throw new AppError('The assistant used too many tool calls without answering. Try a narrower question.', 502, 'OPENAI_TOOL_LOOP');
  }

  /** Convert a Chat Completions style tool definition to a Responses one. */
  static functionTool(def: { name: string; description?: string; parameters?: Record<string, unknown> }): FunctionTool {
    return {
      type: 'function',
      name: def.name,
      description: def.description ?? null,
      parameters: def.parameters ?? { type: 'object', properties: {} },
      strict: false,
    };
  }

  // ----- internals -----

  private buildParams(options: RespondOptions): ResponseCreateParamsNonStreaming & Record<string, unknown> {
    const params: ResponseCreateParamsNonStreaming & Record<string, unknown> = {
      model: options.model,
      input: options.input,
    };
    if (options.instructions) params.instructions = options.instructions;
    if (options.tools?.length) params.tools = options.tools;
    if (options.json) params.text = { format: { type: 'json_object' } };
    if (options.temperature !== undefined) params.temperature = options.temperature;
    if (options.maxOutputTokens !== undefined) params.max_output_tokens = options.maxOutputTokens;
    if (options.reasoningEffort) params.reasoning = { effort: options.reasoningEffort };
    return params;
  }

  private rejectedField(err: unknown, params: Record<string, unknown>): Droppable | null {
    if (!(err instanceof OpenAI.APIError) || err.status !== 400) return null;
    const named = (err.param ?? '').split('.')[0];
    for (const field of DROPPABLE) {
      if (!(field in params)) continue;
      if (named === field || new RegExp(`\\b${field}\\b`).test(err.message)) return field;
    }
    return null;
  }

  /** Turn an OpenAI SDK error into a message an admin can act on. */
  static toAppError(err: unknown, model: string): AppError {
    if (err instanceof AppError) return err;
    if (err instanceof OpenAI.APIError) {
      const status = err.status ?? 502;
      const detail = err.message || 'Unknown OpenAI error';
      if (status === 401) {
        return new AppError(`OpenAI rejected the API key (401). ${detail}`, 400, 'OPENAI_AUTH');
      }
      if (status === 404) {
        return new AppError(`Model "${model}" is not available to this API key. ${detail}`, 400, 'OPENAI_MODEL');
      }
      if (status === 429) {
        return new AppError(`OpenAI rate limit or quota reached (429). ${detail}`, 429, 'OPENAI_RATE_LIMIT');
      }
      return new AppError(`OpenAI error ${status} for model "${model}": ${detail}`, 502, 'OPENAI_API_ERROR');
    }
    const message = err instanceof Error ? err.message : String(err);
    return new AppError(`Could not reach OpenAI: ${message}`, 502, 'OPENAI_UNREACHABLE');
  }
}
