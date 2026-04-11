import { NextRequest, NextResponse } from 'next/server';
import { BaseApiHandler } from '@/lib/base/BaseApiHandler';
import { TenantContext, UserRole } from '@/lib/types';
import { prisma } from '@/lib/db';
import { InsightsService } from '@/lib/insights/InsightsService';

const insightsService = new InsightsService(prisma);

class InsightsSnapshotHandler extends BaseApiHandler {
  protected async onGet(req: NextRequest, ctx: TenantContext): Promise<NextResponse> {
    const periodDays = Math.max(
      1,
      Math.min(365, parseInt(req.nextUrl.searchParams.get('period') ?? '30', 10) || 30),
    );
    const snapshot = await insightsService.snapshot(ctx.tenantId, periodDays);
    return this.success(snapshot);
  }
}

const handler = new InsightsSnapshotHandler();
export const GET = handler.handle('GET', {
  requiredRoles: [UserRole.ADMIN, UserRole.MANAGER, UserRole.PURCHASING_MANAGER],
});
