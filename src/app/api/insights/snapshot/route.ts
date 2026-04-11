import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { requireTenantContext } from '@/lib/auth';
import { isAppError, ForbiddenError } from '@/lib/errors';
import { UserRole } from '@/lib/types';
import { InsightsService } from '@/lib/insights/InsightsService';

export async function GET(req: NextRequest) {
  try {
    const ctx = await requireTenantContext();
    if (
      ctx.role !== UserRole.ADMIN &&
      ctx.role !== UserRole.MANAGER &&
      ctx.role !== UserRole.PURCHASING_MANAGER
    ) {
      throw new ForbiddenError('Insights are restricted to procurement roles.');
    }

    const periodDays = Math.max(
      1,
      Math.min(365, parseInt(req.nextUrl.searchParams.get('period') ?? '30', 10) || 30),
    );

    const service = new InsightsService(prisma);
    const snapshot = await service.snapshot(ctx.tenantId, periodDays);

    return NextResponse.json({ success: true, data: snapshot });
  } catch (error: unknown) {
    if (isAppError(error)) {
      return NextResponse.json(
        { success: false, error: error.message, code: error.code },
        { status: error.statusCode },
      );
    }
    console.error('GET /api/insights/snapshot error:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 },
    );
  }
}
