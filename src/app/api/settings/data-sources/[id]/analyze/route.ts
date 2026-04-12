import { NextRequest, NextResponse } from 'next/server';
import { BaseApiHandler } from '@/lib/base/BaseApiHandler';
import { TenantContext, UserRole } from '@/lib/types';
import { ValidationError, AppError } from '@/lib/errors';
import { suggestMappings } from '@/lib/integrations/data-source-service';
import type { ApiSchemaField } from '@/lib/integrations/types';

class AnalyzeSchemaHandler extends BaseApiHandler {
  protected async onPost(req: NextRequest, _ctx: TenantContext): Promise<NextResponse> {
    const { schema } = (await req.json()) as { schema: ApiSchemaField[] };
    if (!schema || !Array.isArray(schema) || schema.length === 0) {
      throw new ValidationError('Schema data is required');
    }

    const { getOpenAIKey } = await import('@/lib/config/vault');
    const openaiApiKey = await getOpenAIKey();
    if (!openaiApiKey) {
      throw new AppError(
        'OpenAI API key not configured. Set it in Settings > Integrations.',
        400,
        'OPENAI_NOT_CONFIGURED',
      );
    }

    const mappings = await suggestMappings(schema, openaiApiKey);
    return this.success(mappings);
  }
}

const handler = new AnalyzeSchemaHandler();
export const POST = handler.handle('POST', { requiredRoles: [UserRole.ADMIN] });
