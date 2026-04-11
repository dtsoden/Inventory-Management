import { NextRequest, NextResponse } from 'next/server';
import { BaseApiHandler } from '@/lib/base/BaseApiHandler';
import { TenantContext, UserRole } from '@/lib/types';
import { prisma } from '@/lib/db';
import { InsightsService } from '@/lib/insights/InsightsService';
import {
  InsightsObserver,
  type InsightMode,
} from '@/lib/insights/InsightsObserver';

const VALID_MODES: InsightMode[] = ['strict', 'balanced', 'speculative'];
const insightsService = new InsightsService(prisma);
const insightsObserver = new InsightsObserver(prisma);

class InsightsObserveHandler extends BaseApiHandler {
  protected async onPost(req: NextRequest, ctx: TenantContext): Promise<NextResponse> {
    const body = await req.json().catch(() => ({}));
    const periodDays = Math.max(1, Math.min(365, Number(body?.period) || 30));
    const requestedMode = String(body?.mode ?? 'strict') as InsightMode;
    const mode: InsightMode = VALID_MODES.includes(requestedMode) ? requestedMode : 'strict';

    const snapshot = await insightsService.snapshot(ctx.tenantId, periodDays);
    const observations = await insightsObserver.observe(snapshot, mode);
    return this.success({ snapshot, observations, mode });
  }
}

const handler = new InsightsObserveHandler();
export const POST = handler.handle('POST', {
  requiredRoles: [UserRole.ADMIN, UserRole.MANAGER, UserRole.PURCHASING_MANAGER],
});
