import { NextRequest, NextResponse } from 'next/server';
import { BaseApiHandler } from '@/lib/base/BaseApiHandler';
import { TenantContext } from '@/lib/types';
import { prisma } from '@/lib/db';
import { purchaseOrderService } from '@/lib/procurement';

class OrderLinesHandler extends BaseApiHandler {
  protected async onGet(
    req: NextRequest,
    ctx: TenantContext
  ): Promise<NextResponse> {
    const segments = req.nextUrl.pathname.split('/');
    const orderId = segments[segments.indexOf('orders') + 1];

    // Verify tenant ownership
    await purchaseOrderService.getByIdOrThrow(ctx, orderId);

    const lines = await prisma.purchaseOrderLine.findMany({
      where: { purchaseOrderId: orderId },
      include: { item: { select: { id: true, name: true, sku: true } } },
    });
    return this.success(lines);
  }

  protected async onPost(
    req: NextRequest,
    ctx: TenantContext
  ): Promise<NextResponse> {
    const segments = req.nextUrl.pathname.split('/');
    const orderId = segments[segments.indexOf('orders') + 1];

    // Verify tenant ownership
    await purchaseOrderService.getByIdOrThrow(ctx, orderId);

    const body = await req.json();
    const line = await prisma.purchaseOrderLine.create({
      data: {
        purchaseOrderId: orderId,
        itemId: body.itemId,
        quantity: body.quantity,
        unitCost: body.unitCost,
      },
      include: { item: { select: { id: true, name: true, sku: true } } },
    });

    // Recalculate total
    await purchaseOrderService.recalculateTotal(orderId);

    return this.success(line, 201);
  }
}

const handler = new OrderLinesHandler();
export const GET = handler.handle('GET');
export const POST = handler.handle('POST');
