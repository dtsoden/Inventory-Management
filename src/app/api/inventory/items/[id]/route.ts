import { NextRequest, NextResponse } from 'next/server';
import { BaseApiHandler } from '@/lib/base/BaseApiHandler';
import { TenantContext } from '@/lib/types';
import { NotFoundError } from '@/lib/errors';
import { prisma } from '@/lib/db';

function parseId(req: NextRequest): string {
  const segments = req.nextUrl.pathname.split('/');
  return segments[segments.indexOf('items') + 1];
}

class InventoryItemDetailHandler extends BaseApiHandler {
  protected async onGet(req: NextRequest, ctx: TenantContext): Promise<NextResponse> {
    const id = parseId(req);
    const item = await prisma.item.findFirst({
      where: { id, tenantId: ctx.tenantId },
      include: {
        manufacturer: true,
        vendor: true,
        category: { select: { id: true, name: true } },
        assets: {
          orderBy: { createdAt: 'desc' },
          include: {
            purchaseOrderLine: {
              include: {
                purchaseOrder: {
                  select: { id: true, orderNumber: true, vendorName: true },
                },
              },
            },
          },
        },
        purchaseOrderLines: {
          orderBy: { createdAt: 'desc' },
          include: {
            purchaseOrder: {
              select: {
                id: true,
                orderNumber: true,
                vendorName: true,
                status: true,
                orderedAt: true,
                createdAt: true,
              },
            },
          },
        },
      },
    });

    if (!item) throw new NotFoundError('Item', id);

    const stock = {
      total: item.assets.length,
      available: 0,
      assigned: 0,
      inMaintenance: 0,
      retired: 0,
      lost: 0,
    };
    for (const a of item.assets) {
      switch (a.status) {
        case 'AVAILABLE':
          stock.available++;
          break;
        case 'ASSIGNED':
        case 'CHECKED_OUT':
          stock.assigned++;
          break;
        case 'IN_MAINTENANCE':
        case 'IN_REPAIR':
          stock.inMaintenance++;
          break;
        case 'RETIRED':
        case 'DISPOSED':
          stock.retired++;
          break;
        case 'LOST':
          stock.lost++;
          break;
      }
    }

    const vendorSet = new Map<string, { name: string; lastOrderedAt: Date | null }>();
    for (const line of item.purchaseOrderLines) {
      const vname = line.purchaseOrder.vendorName;
      if (!vname) continue;
      const existing = vendorSet.get(vname);
      const orderedAt = line.purchaseOrder.orderedAt ?? line.purchaseOrder.createdAt;
      if (
        !existing ||
        (orderedAt && existing.lastOrderedAt && orderedAt > existing.lastOrderedAt)
      ) {
        vendorSet.set(vname, { name: vname, lastOrderedAt: orderedAt });
      } else if (!existing) {
        vendorSet.set(vname, { name: vname, lastOrderedAt: orderedAt });
      }
    }
    const knownVendors = Array.from(vendorSet.values());

    const isLowStock = item.reorderPoint > 0 && stock.available < item.reorderPoint;

    return this.success({ ...item, stock, isLowStock, knownVendors });
  }
}

const handler = new InventoryItemDetailHandler();
export const GET = handler.handle('GET');
