import { NextRequest, NextResponse } from 'next/server';
import { BaseApiHandler } from '@/lib/base/BaseApiHandler';
import { TenantContext, UserRole } from '@/lib/types';
import { prisma } from '@/lib/db';
import {
  getSampleDataStatus,
  insertSampleData,
  removeSampleData,
} from '@/lib/seed/sample-data';

class SampleDataHandler extends BaseApiHandler {
  protected async onGet(_req: NextRequest, ctx: TenantContext): Promise<NextResponse> {
    const status = await getSampleDataStatus(prisma, ctx.tenantId);
    return this.success(status);
  }

  protected async onPost(_req: NextRequest, ctx: TenantContext): Promise<NextResponse> {
    const ids = await insertSampleData(prisma, ctx.tenantId, ctx.userId);
    const counts = {
      vendors: ids.vendors.length,
      items: ids.items.length,
      categories: ids.categories.length,
      orders: ids.purchaseOrders.length,
      assets: ids.assets.length,
    };
    return this.success({ counts }, 201);
  }

  protected async onDelete(_req: NextRequest, ctx: TenantContext): Promise<NextResponse> {
    await removeSampleData(prisma, ctx.tenantId);
    return this.successMessage('Sample data removed.');
  }
}

const handler = new SampleDataHandler();
export const GET = handler.handle('GET', { requiredRoles: [UserRole.ADMIN] });
export const POST = handler.handle('POST', { requiredRoles: [UserRole.ADMIN] });
export const DELETE = handler.handle('DELETE', { requiredRoles: [UserRole.ADMIN] });
