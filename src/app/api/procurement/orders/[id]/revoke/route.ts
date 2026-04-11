import { NextRequest, NextResponse } from 'next/server';
import { BaseApiHandler } from '@/lib/base/BaseApiHandler';
import { TenantContext, UserRole } from '@/lib/types';
import { purchaseOrderService } from '@/lib/procurement';

class RevokeApprovalHandler extends BaseApiHandler {
  protected async onPost(
    req: NextRequest,
    ctx: TenantContext
  ): Promise<NextResponse> {
    const segments = req.nextUrl.pathname.split('/');
    const id = segments[segments.indexOf('orders') + 1];
    const body = await req.json().catch(() => ({}));
    const comment = (body?.comment as string) ?? '';
    const order = await purchaseOrderService.revokeApproval(ctx, id, comment);
    return this.success(order);
  }
}

const handler = new RevokeApprovalHandler();
export const POST = handler.handle('POST', {
  requiredRoles: [UserRole.ADMIN, UserRole.PURCHASING_MANAGER],
});
