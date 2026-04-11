import { NextRequest, NextResponse } from 'next/server';
import { BaseApiHandler } from '@/lib/base/BaseApiHandler';
import { TenantContext, UserRole } from '@/lib/types';
import { AppError } from '@/lib/errors';

class AiModelsHandler extends BaseApiHandler {
  protected async onGet(_req: NextRequest, _ctx: TenantContext): Promise<NextResponse> {
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      throw new AppError(
        'OpenAI API key is not configured. Set OPENAI_API_KEY in the environment.',
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
      .filter((model) => model.id.includes('gpt'))
      .map((model) => ({ id: model.id }))
      .sort((a, b) => a.id.localeCompare(b.id));

    return this.success(chatModels);
  }
}

const handler = new AiModelsHandler();
export const GET = handler.handle('GET', { requiredRoles: [UserRole.ADMIN] });
