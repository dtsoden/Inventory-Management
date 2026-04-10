import { NextRequest, NextResponse } from 'next/server';
import { BaseApiHandler } from '@/lib/base/BaseApiHandler';
import { TenantContext } from '@/lib/types';
import { purchaseOrderService } from '@/lib/procurement';

class SubmitOrderHandler extends BaseApiHandler {
  protected async onPost(
    req: NextRequest,
    ctx: TenantContext
  ): Promise<NextResponse> {
    const segments = req.nextUrl.pathname.split('/');
    const id = segments[segments.indexOf('orders') + 1];
    const order = await purchaseOrderService.submitOrder(ctx, id);
    return this.success(order);
  }
}

const handler = new SubmitOrderHandler();
export const POST = handler.handle('POST');
