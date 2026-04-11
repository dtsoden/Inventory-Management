import { NextRequest, NextResponse } from 'next/server';
import { BaseApiHandler } from '@/lib/base/BaseApiHandler';
import { TenantContext } from '@/lib/types';
import { prisma } from '@/lib/db';
import { purchaseOrderService } from '@/lib/procurement';

class OrderLineHandler extends BaseApiHandler {
  protected async onPut(
    req: NextRequest,
    ctx: TenantContext,
  ): Promise<NextResponse> {
    const { orderId, lineId } = parseIds(req);

    // Verify tenant ownership and that the order is editable.
    const order = await purchaseOrderService.getByIdOrThrow(ctx, orderId);
    if (order.status !== 'DRAFT') {
      return NextResponse.json(
        {
          success: false,
          error: `Cannot edit lines on a ${order.status} order. Revoke or reject it back to DRAFT first.`,
        },
        { status: 400 },
      );
    }

    const body = await req.json();
    const line = await prisma.purchaseOrderLine.update({
      where: { id: lineId, purchaseOrderId: orderId },
      data: {
        itemId: body.itemId,
        quantity: body.quantity,
        unitCost: body.unitCost,
      },
      include: { item: { select: { id: true, name: true, sku: true } } },
    });

    await purchaseOrderService.recalculateTotal(orderId);
    return this.success(line);
  }

  protected async onDelete(
    req: NextRequest,
    ctx: TenantContext,
  ): Promise<NextResponse> {
    const { orderId, lineId } = parseIds(req);

    const order = await purchaseOrderService.getByIdOrThrow(ctx, orderId);
    if (order.status !== 'DRAFT') {
      return NextResponse.json(
        {
          success: false,
          error: `Cannot delete lines from a ${order.status} order. Revoke or reject it back to DRAFT first.`,
        },
        { status: 400 },
      );
    }

    await prisma.purchaseOrderLine.delete({
      where: { id: lineId, purchaseOrderId: orderId },
    });

    await purchaseOrderService.recalculateTotal(orderId);
    return this.successMessage('Line removed');
  }
}

function parseIds(req: NextRequest): { orderId: string; lineId: string } {
  const segments = req.nextUrl.pathname.split('/');
  const orderId = segments[segments.indexOf('orders') + 1];
  const lineId = segments[segments.indexOf('lines') + 1];
  return { orderId, lineId };
}

const handler = new OrderLineHandler();
export const PUT = handler.handle('PUT');
export const DELETE = handler.handle('DELETE');
