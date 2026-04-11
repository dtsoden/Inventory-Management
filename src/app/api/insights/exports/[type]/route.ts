import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { requireTenantContext } from '@/lib/auth';
import { isAppError, ForbiddenError } from '@/lib/errors';
import { UserRole } from '@/lib/types';

// One-click CSV exports for accounting and procurement reporting.
// All queries are pure SQL (Prisma); no AI involvement.

type ExportType =
  | 'vendor-spend'
  | 'open-commitments'
  | 'po-aging'
  | 'asset-register'
  | 'reorder-candidates';

const VALID_TYPES: ExportType[] = [
  'vendor-spend',
  'open-commitments',
  'po-aging',
  'asset-register',
  'reorder-candidates',
];

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ type: string }> },
) {
  try {
    const ctx = await requireTenantContext();
    if (
      ctx.role !== UserRole.ADMIN &&
      ctx.role !== UserRole.MANAGER &&
      ctx.role !== UserRole.PURCHASING_MANAGER
    ) {
      throw new ForbiddenError('Exports are restricted to procurement roles.');
    }

    const { type } = await params;
    if (!VALID_TYPES.includes(type as ExportType)) {
      return NextResponse.json(
        { success: false, error: 'Unknown export type' },
        { status: 404 },
      );
    }

    const periodDays = Math.max(
      1,
      Math.min(
        365,
        parseInt(req.nextUrl.searchParams.get('period') ?? '90', 10) || 90,
      ),
    );

    const csv = await buildCsv(type as ExportType, ctx.tenantId, periodDays);
    const filename = `${type}-${new Date().toISOString().slice(0, 10)}.csv`;

    return new NextResponse(csv, {
      status: 200,
      headers: {
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': `attachment; filename="${filename}"`,
      },
    });
  } catch (error: unknown) {
    if (isAppError(error)) {
      return NextResponse.json(
        { success: false, error: error.message, code: error.code },
        { status: error.statusCode },
      );
    }
    console.error('GET /api/insights/exports error:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 },
    );
  }
}

async function buildCsv(
  type: ExportType,
  tenantId: string,
  periodDays: number,
): Promise<string> {
  const periodStart = new Date(Date.now() - periodDays * 86400000);

  switch (type) {
    case 'vendor-spend': {
      const rollup = await prisma.purchaseOrder.groupBy({
        by: ['vendorName'],
        where: {
          tenantId,
          status: { in: ['APPROVED', 'SUBMITTED', 'PARTIALLY_RECEIVED', 'RECEIVED'] },
          createdAt: { gte: periodStart },
          vendorName: { not: null },
        },
        _sum: { totalAmount: true },
        _count: { id: true },
      });
      const rows = rollup
        .map((r) => ({
          vendor: r.vendorName ?? 'Unknown',
          po_count: r._count.id,
          total_spend: r._sum.totalAmount ?? 0,
        }))
        .sort((a, b) => b.total_spend - a.total_spend);
      return toCsv(['vendor', 'po_count', 'total_spend'], rows);
    }

    case 'open-commitments': {
      const orders = await prisma.purchaseOrder.findMany({
        where: {
          tenantId,
          status: { in: ['APPROVED', 'SUBMITTED'] },
        },
        select: {
          orderNumber: true,
          status: true,
          vendorName: true,
          totalAmount: true,
          orderedAt: true,
          expectedDate: true,
          createdAt: true,
        },
        orderBy: { createdAt: 'desc' },
      });
      return toCsv(
        ['order_number', 'status', 'vendor', 'total_amount', 'ordered_at', 'expected_date'],
        orders.map((o) => ({
          order_number: o.orderNumber,
          status: o.status,
          vendor: o.vendorName ?? '',
          total_amount: o.totalAmount ?? 0,
          ordered_at: o.orderedAt?.toISOString() ?? '',
          expected_date: o.expectedDate?.toISOString().slice(0, 10) ?? '',
        })),
      );
    }

    case 'po-aging': {
      const orders = await prisma.purchaseOrder.findMany({
        where: { tenantId },
        select: {
          orderNumber: true,
          status: true,
          vendorName: true,
          totalAmount: true,
          createdAt: true,
          updatedAt: true,
        },
        orderBy: { updatedAt: 'desc' },
      });
      const now = Date.now();
      return toCsv(
        ['order_number', 'status', 'vendor', 'total_amount', 'days_in_current_state', 'created_at'],
        orders.map((o) => ({
          order_number: o.orderNumber,
          status: o.status,
          vendor: o.vendorName ?? '',
          total_amount: o.totalAmount ?? 0,
          days_in_current_state: Math.floor(
            (now - o.updatedAt.getTime()) / 86400000,
          ),
          created_at: o.createdAt.toISOString().slice(0, 10),
        })),
      );
    }

    case 'asset-register': {
      const assets = await prisma.asset.findMany({
        where: { tenantId },
        select: {
          assetTag: true,
          serialNumber: true,
          status: true,
          condition: true,
          location: true,
          assignedTo: true,
          purchasedAt: true,
          warrantyUntil: true,
          item: { select: { name: true, sku: true, unitCost: true } },
        },
        orderBy: { assetTag: 'asc' },
      });
      return toCsv(
        [
          'asset_tag',
          'serial_number',
          'item_name',
          'sku',
          'unit_cost',
          'status',
          'condition',
          'location',
          'assigned_to',
          'purchased_at',
          'warranty_until',
        ],
        assets.map((a) => ({
          asset_tag: a.assetTag ?? '',
          serial_number: a.serialNumber ?? '',
          item_name: a.item?.name ?? '',
          sku: a.item?.sku ?? '',
          unit_cost: a.item?.unitCost ?? 0,
          status: a.status,
          condition: a.condition ?? '',
          location: a.location ?? '',
          assigned_to: a.assignedTo ?? '',
          purchased_at: a.purchasedAt?.toISOString().slice(0, 10) ?? '',
          warranty_until: a.warrantyUntil?.toISOString().slice(0, 10) ?? '',
        })),
      );
    }

    case 'reorder-candidates': {
      const items = await prisma.item.findMany({
        where: { tenantId, isActive: true, reorderPoint: { gt: 0 } },
        select: {
          name: true,
          sku: true,
          reorderPoint: true,
          reorderQuantity: true,
          unitCost: true,
          vendor: { select: { name: true } },
          assets: { where: { status: 'AVAILABLE' }, select: { id: true } },
          purchaseOrderLines: {
            where: {
              purchaseOrder: {
                tenantId,
                status: { in: ['DRAFT', 'PENDING_APPROVAL', 'APPROVED', 'SUBMITTED'] },
              },
            },
            select: { id: true },
          },
        },
      });
      const rows = items
        .map((i) => ({
          item_name: i.name,
          sku: i.sku ?? '',
          vendor: i.vendor?.name ?? '',
          current_stock: i.assets.length,
          reorder_point: i.reorderPoint ?? 0,
          reorder_quantity: i.reorderQuantity ?? 0,
          unit_cost: i.unitCost ?? 0,
          has_open_po: i.purchaseOrderLines.length > 0 ? 'yes' : 'no',
        }))
        .filter((r) => r.current_stock < r.reorder_point)
        .sort((a, b) => a.current_stock - b.current_stock);
      return toCsv(
        [
          'item_name',
          'sku',
          'vendor',
          'current_stock',
          'reorder_point',
          'reorder_quantity',
          'unit_cost',
          'has_open_po',
        ],
        rows,
      );
    }
  }
}

function toCsv(headers: string[], rows: Array<Record<string, unknown>>): string {
  const escape = (value: unknown): string => {
    if (value === null || value === undefined) return '';
    const str = String(value);
    if (/[",\n]/.test(str)) {
      return `"${str.replace(/"/g, '""')}"`;
    }
    return str;
  };
  const lines = [headers.join(',')];
  for (const row of rows) {
    lines.push(headers.map((h) => escape(row[h])).join(','));
  }
  return lines.join('\n') + '\n';
}
