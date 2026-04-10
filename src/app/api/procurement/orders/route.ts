import { NextRequest, NextResponse } from 'next/server';
import { BaseApiHandler } from '@/lib/base/BaseApiHandler';
import { TenantContext } from '@/lib/types';
import { purchaseOrderService, purchaseOrderRepository } from '@/lib/procurement';

class OrdersHandler extends BaseApiHandler {
  protected async onGet(
    req: NextRequest,
    ctx: TenantContext
  ): Promise<NextResponse> {
    const pagination = this.getPagination(req);
    const sort = this.getSort(req);
    const status = req.nextUrl.searchParams.get('status');

    const where: Record<string, unknown> = {};
    if (status && status !== 'ALL') {
      where.status = status;
    }

    const result = await purchaseOrderRepository.findAllWithRelations(
      ctx.tenantId,
      { pagination, sort, where }
    );
    return this.success(result);
  }

  protected async onPost(
    req: NextRequest,
    ctx: TenantContext
  ): Promise<NextResponse> {
    const body = await req.json();
    const order = await purchaseOrderService.createOrder(ctx, body);
    return this.success(order, 201);
  }
}

const handler = new OrdersHandler();
export const GET = handler.handle('GET');
export const POST = handler.handle('POST');
