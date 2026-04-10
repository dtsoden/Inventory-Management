import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { requireTenantContext } from '@/lib/auth';
import { isAppError, ForbiddenError } from '@/lib/errors';
import { UserRole } from '@/lib/types';
import type { ApiResponse } from '@/lib/types';
import { suggestMappings } from '@/lib/integrations/data-source-service';
import type { ApiSchemaField } from '@/lib/integrations/types';

export async function POST(req: NextRequest) {
  try {
    const ctx = await requireTenantContext();

    if (ctx.role !== UserRole.ADMIN) {
      throw new ForbiddenError('Only admins can analyze data sources');
    }

    const { schema } = (await req.json()) as { schema: ApiSchemaField[] };

    if (!schema || !Array.isArray(schema) || schema.length === 0) {
      return NextResponse.json(
        { success: false, error: 'Schema data is required' },
        { status: 400 }
      );
    }

    // Use the environment variable for OpenAI key (SystemConfig stores it encrypted)
    const openaiApiKey = process.env.OPENAI_API_KEY;

    if (!openaiApiKey) {
      return NextResponse.json(
        {
          success: false,
          error: 'OpenAI API key not configured. Set it in Settings > Integrations.',
        },
        { status: 400 }
      );
    }

    const mappings = await suggestMappings(schema, openaiApiKey);

    const body: ApiResponse = { success: true, data: mappings };
    return NextResponse.json(body);
  } catch (error: unknown) {
    if (isAppError(error)) {
      return NextResponse.json(
        { success: false, error: error.message, code: error.code },
        { status: error.statusCode }
      );
    }
    console.error('Unhandled error in POST /api/settings/data-sources/[id]/analyze:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}
