import { NextRequest, NextResponse } from 'next/server';
import { BaseApiHandler } from '@/lib/base/BaseApiHandler';
import { TenantContext } from '@/lib/types';
import {
  purchaseOrderService,
  purchaseOrderRepository,
} from '@/lib/procurement';

class OrderHandler extends BaseApiHandler {
  protected async onGet(
    req: NextRequest,
    ctx: TenantContext
  ): Promise<NextResponse> {
    const id = req.nextUrl.pathname.split('/').at(-1)!;
    const order = await purchaseOrderRepository.findByIdWithRelations(
      ctx.tenantId,
      id
    );
    if (!order) {
      return NextResponse.json(
        { success: false, error: 'Order not found' },
        { status: 404 }
      );
    }
    return this.success(order);
  }

  protected async onPut(
    req: NextRequest,
    ctx: TenantContext,
  ): Promise<NextResponse> {
    const id = req.nextUrl.pathname.split('/').at(-1)!;
    const body = await req.json();

    // Coerce date-shaped strings to Date objects so Prisma's DateTime
    // columns accept them. The HTML <input type="date"> sends bare
    // YYYY-MM-DD strings which Prisma rejects.
    const dateFields = ['expectedDate', 'orderedAt', 'createdAt'];
    for (const field of dateFields) {
      if (body[field] && typeof body[field] === 'string') {
        body[field] = new Date(body[field]);
      }
    }

    const order = await purchaseOrderService.update(ctx, id, body);
    return this.success(order);
  }

  protected async onDelete(
    req: NextRequest,
    ctx: TenantContext
  ): Promise<NextResponse> {
    const id = req.nextUrl.pathname.split('/').at(-1)!;
    await purchaseOrderService.delete(ctx, id);
    return this.successMessage('Order deleted');
  }
}

const handler = new OrderHandler();
export const GET = handler.handle('GET');
export const PUT = handler.handle('PUT');
export const DELETE = handler.handle('DELETE');
