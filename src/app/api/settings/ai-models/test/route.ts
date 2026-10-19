import { NextRequest, NextResponse } from 'next/server';
import { BaseApiHandler } from '@/lib/base/BaseApiHandler';
import { TenantContext, UserRole } from '@/lib/types';
import { AppError } from '@/lib/errors';
import { OpenAIClient } from '@/lib/ai/OpenAIClient';

// The assistant always sends tools, so the test does too. That catches
// models that accept plain chat but reject tool calls.
const PROBE_TOOL = OpenAIClient.functionTool({
  name: 'ping',
  description: 'Connectivity probe. Never needs to be called.',
});

/**
 * POST { model? } sends one small request with the stored API key and
 * the given (or saved) model, the same way the assistant does, and
 * reports the reply or OpenAI's error.
 */
class AiModelTestHandler extends BaseApiHandler {
  protected async onPost(req: NextRequest, _ctx: TenantContext): Promise<NextResponse> {
    const body = await req.json().catch(() => ({}));
    const { getOpenAIKey, getOpenAIModel } = await import('@/lib/config/vault');
    const apiKey = await getOpenAIKey();
    if (!apiKey) {
      throw new AppError('No usable OpenAI API key is stored. Save one above.', 400, 'OPENAI_NOT_CONFIGURED');
    }
    const model = String(body.model || (await getOpenAIModel()));

    const started = Date.now();
    const response = await new OpenAIClient(apiKey).respond({
      model,
      input: 'Reply with the single word: ready',
      tools: [PROBE_TOOL],
      reasoningEffort: 'none',
    });

    return this.success({
      model: response.model || model,
      reply: response.output_text?.trim() || '(empty reply)',
      latencyMs: Date.now() - started,
    });
  }
}

const handler = new AiModelTestHandler();
export const POST = handler.handle('POST', { requiredRoles: [UserRole.ADMIN] });
