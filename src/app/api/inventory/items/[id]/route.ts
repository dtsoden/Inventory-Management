import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { requireTenantContext } from '@/lib/auth';
import { isAppError, NotFoundError } from '@/lib/errors';
import type { ApiResponse } from '@/lib/types';

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const ctx = await requireTenantContext();
    const { id } = await params;

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

    if (!item) {
      throw new NotFoundError('Item', id);
    }

    // Stock aggregations
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

    // Collect unique vendors who have sold this item (from PO history)
    const vendorSet = new Map<string, { name: string; lastOrderedAt: Date | null }>();
    for (const line of item.purchaseOrderLines) {
      const vname = line.purchaseOrder.vendorName;
      if (!vname) continue;
      const existing = vendorSet.get(vname);
      const orderedAt = line.purchaseOrder.orderedAt ?? line.purchaseOrder.createdAt;
      if (!existing || (orderedAt && existing.lastOrderedAt && orderedAt > existing.lastOrderedAt)) {
        vendorSet.set(vname, { name: vname, lastOrderedAt: orderedAt });
      } else if (!existing) {
        vendorSet.set(vname, { name: vname, lastOrderedAt: orderedAt });
      }
    }
    const knownVendors = Array.from(vendorSet.values());

    const isLowStock =
      item.reorderPoint > 0 && stock.available < item.reorderPoint;

    const result = {
      ...item,
      stock,
      isLowStock,
      knownVendors,
    };

    const body: ApiResponse = { success: true, data: result };
    return NextResponse.json(body);
  } catch (error: unknown) {
    if (isAppError(error)) {
      return NextResponse.json(
        { success: false, error: error.message, code: error.code },
        { status: error.statusCode }
      );
    }
    console.error('Unhandled error in GET /api/inventory/items/[id]:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}
