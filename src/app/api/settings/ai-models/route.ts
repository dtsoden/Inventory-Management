import { NextRequest, NextResponse } from 'next/server';
import { BaseApiHandler } from '@/lib/base/BaseApiHandler';
import { TenantContext, UserRole } from '@/lib/types';
import { AppError } from '@/lib/errors';

// Model ids that can't hold a text conversation with tools.
const NON_CHAT = /(audio|realtime|live|tts|transcribe|image|search|instruct|embedding|moderation|codex|dall-e|whisper|computer-use)/i;
// Dated snapshots (gpt-5.4-2026-03-05) duplicate their alias; show the alias.
const SNAPSHOT = /-\d{4}-\d{2}-\d{2}$/;
// Retired or legacy families that the Responses API assistant shouldn't offer.
const LEGACY = /^(gpt-3\.5|gpt-4-|gpt-4$)/i;

class AiModelsHandler extends BaseApiHandler {
  protected async onGet(_req: NextRequest, _ctx: TenantContext): Promise<NextResponse> {
    const { getOpenAIKey } = await import('@/lib/config/vault');
    const apiKey = await getOpenAIKey();
    if (!apiKey) {
      throw new AppError(
        'OpenAI API key not configured. Set it in Settings > Integrations.',
        400,
        'OPENAI_NOT_CONFIGURED',
      );
    }

    const response = await fetch('https://api.openai.com/v1/models', {
      headers: { Authorization: `Bearer ${apiKey}` },
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new AppError(
        `OpenAI API error: ${response.status} - ${errorText}`,
        response.status,
        'OPENAI_API_ERROR',
      );
    }

    const data = await response.json();
    const chatModels = (data.data as Array<{ id: string; created: number }>)
      .filter((model) => model.id.startsWith('gpt') || /^o\d/.test(model.id))
      .filter((model) => !NON_CHAT.test(model.id) && !LEGACY.test(model.id) && !SNAPSHOT.test(model.id))
      .map((model) => ({ id: model.id }))
      .sort((a, b) => a.id.localeCompare(b.id));

    return this.success(chatModels);
  }
}

const handler = new AiModelsHandler();
export const GET = handler.handle('GET', { requiredRoles: [UserRole.ADMIN] });
