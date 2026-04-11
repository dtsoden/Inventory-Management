import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { requireTenantContext } from '@/lib/auth';
import { isAppError } from '@/lib/errors';
import type { ApiResponse } from '@/lib/types';

/**
 * Item-based inventory view.
 * Returns one row per catalog item with aggregated stock levels derived from
 * the assets that reference it.
 */
export async function GET(req: NextRequest) {
  try {
    const ctx = await requireTenantContext();
    const url = req.nextUrl;

    const page = Math.max(1, parseInt(url.searchParams.get('page') ?? '1', 10));
    const pageSize = Math.min(200, Math.max(1, parseInt(url.searchParams.get('pageSize') ?? '50', 10)));
    const search = url.searchParams.get('search') ?? '';
    const sortField = url.searchParams.get('sortField') ?? 'name';
    const sortDirection =
      url.searchParams.get('sortDirection') === 'desc' ? 'desc' as const : 'asc' as const;
    const lowStockOnly = url.searchParams.get('lowStock') === 'true';

    const where: Record<string, unknown> = {
      tenantId: ctx.tenantId,
      isActive: true,
    };

    if (search) {
      where.OR = [
        { name: { contains: search } },
        { sku: { contains: search } },
        { manufacturerPartNumber: { contains: search } },
        { manufacturer: { name: { contains: search } } },
        { vendor: { name: { contains: search } } },
      ];
    }

    // Sortable columns on Item model
    const validSortFields = ['name', 'sku', 'unitCost', 'reorderPoint', 'createdAt'];
    const orderBy = validSortFields.includes(sortField)
      ? { [sortField]: sortDirection }
      : { name: 'asc' as const };

    // Fetch all matching items (we may need to filter by computed stock) and
    // paginate in-memory. For reasonable catalog sizes this is fine. If the
    // catalog becomes huge we can add raw SQL with GROUP BY.
    const items = await prisma.item.findMany({
      where,
      orderBy,
      include: {
        manufacturer: { select: { id: true, name: true } },
        vendor: { select: { id: true, name: true } },
        category: { select: { id: true, name: true } },
        assets: {
          select: { id: true, status: true },
        },
      },
    });

    const enriched = items.map((item) => {
      const counts = {
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
            counts.available++;
            break;
          case 'ASSIGNED':
          case 'CHECKED_OUT':
            counts.assigned++;
            break;
          case 'IN_MAINTENANCE':
          case 'IN_REPAIR':
            counts.inMaintenance++;
            break;
          case 'RETIRED':
          case 'DISPOSED':
            counts.retired++;
            break;
          case 'LOST':
            counts.lost++;
            break;
        }
      }

      const isLowStock =
        item.reorderPoint > 0 && counts.available < item.reorderPoint;

      return {
        id: item.id,
        name: item.name,
        sku: item.sku,
        description: item.description,
        manufacturerPartNumber: item.manufacturerPartNumber,
        unitCost: item.unitCost,
        reorderPoint: item.reorderPoint,
        reorderQuantity: item.reorderQuantity,
        imageUrl: item.imageUrl,
        manufacturer: item.manufacturer,
        vendor: item.vendor,
        category: item.category,
        stock: counts,
        isLowStock,
      };
    });

    const filtered = lowStockOnly ? enriched.filter((i) => i.isLowStock) : enriched;
    const total = filtered.length;
    const start = (page - 1) * pageSize;
    const paged = filtered.slice(start, start + pageSize);

    const result = {
      data: paged,
      total,
      page,
      pageSize,
      totalPages: Math.max(1, Math.ceil(total / pageSize)),
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
    console.error('Unhandled error in GET /api/inventory/items:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}
