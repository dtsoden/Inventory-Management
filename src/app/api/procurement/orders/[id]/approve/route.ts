import { NextRequest, NextResponse } from 'next/server';
import { BaseApiHandler } from '@/lib/base/BaseApiHandler';
import { TenantContext, UserRole } from '@/lib/types';
import { purchaseOrderService } from '@/lib/procurement';

class ApproveOrderHandler extends BaseApiHandler {
  protected async onPost(
    req: NextRequest,
    ctx: TenantContext
  ): Promise<NextResponse> {
    const segments = req.nextUrl.pathname.split('/');
    const id = segments[segments.indexOf('orders') + 1];
    const order = await purchaseOrderService.approveOrder(ctx, id);
    return this.success(order);
  }
}

const handler = new ApproveOrderHandler();
export const POST = handler.handle('POST', {
  requiredRoles: [UserRole.SUPER_ADMIN, UserRole.ORG_ADMIN, UserRole.MANAGER],
});
