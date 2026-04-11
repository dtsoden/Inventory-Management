import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { requireTenantContext } from '@/lib/auth';
import { isAppError, ForbiddenError } from '@/lib/errors';
import { UserRole } from '@/lib/types';
import { InsightsService } from '@/lib/insights/InsightsService';
import {
  InsightsObserver,
  type InsightMode,
} from '@/lib/insights/InsightsObserver';

const VALID_MODES: InsightMode[] = ['strict', 'balanced', 'speculative'];

export async function POST(req: NextRequest) {
  try {
    const ctx = await requireTenantContext();
    if (
      ctx.role !== UserRole.ADMIN &&
      ctx.role !== UserRole.MANAGER &&
      ctx.role !== UserRole.PURCHASING_MANAGER
    ) {
      throw new ForbiddenError('Insights are restricted to procurement roles.');
    }

    const body = await req.json().catch(() => ({}));
    const periodDays = Math.max(
      1,
      Math.min(365, Number(body?.period) || 30),
    );
    const requestedMode = String(body?.mode ?? 'strict') as InsightMode;
    const mode: InsightMode = VALID_MODES.includes(requestedMode)
      ? requestedMode
      : 'strict';

    const service = new InsightsService(prisma);
    const snapshot = await service.snapshot(ctx.tenantId, periodDays);

    const observer = new InsightsObserver(prisma);
    const observations = await observer.observe(snapshot, mode);

    return NextResponse.json({
      success: true,
      data: { snapshot, observations, mode },
    });
  } catch (error: unknown) {
    if (isAppError(error)) {
      return NextResponse.json(
        { success: false, error: error.message, code: error.code },
        { status: error.statusCode },
      );
    }
    console.error('POST /api/insights/observe error:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 },
    );
  }
}
