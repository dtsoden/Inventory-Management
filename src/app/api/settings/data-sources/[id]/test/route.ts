import { NextRequest, NextResponse } from 'next/server';
import { requireTenantContext } from '@/lib/auth';
import { isAppError, ForbiddenError } from '@/lib/errors';
import { UserRole } from '@/lib/types';
import type { ApiResponse } from '@/lib/types';
import { testConnection } from '@/lib/integrations/data-source-service';

export async function POST(req: NextRequest) {
  try {
    const ctx = await requireTenantContext();

    if (ctx.role !== UserRole.SUPER_ADMIN && ctx.role !== UserRole.ORG_ADMIN) {
      throw new ForbiddenError('Only admins can test data sources');
    }

    const { apiUrl, apiHeaders } = await req.json();

    if (!apiUrl) {
      return NextResponse.json(
        { success: false, error: 'API URL is required' },
        { status: 400 }
      );
    }

    const result = await testConnection(apiUrl, apiHeaders || undefined);

    const body: ApiResponse = { success: true, data: result };
    return NextResponse.json(body);
  } catch (error: unknown) {
    if (isAppError(error)) {
      return NextResponse.json(
        { success: false, error: error.message, code: error.code },
        { status: error.statusCode }
      );
    }
    console.error('Unhandled error in POST /api/settings/data-sources/[id]/test:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}
