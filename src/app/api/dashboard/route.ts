import { NextRequest, NextResponse } from 'next/server';
import { BaseApiHandler } from '@/lib/base/BaseApiHandler';
import { TenantContext } from '@/lib/types';
import { prisma } from '@/lib/db';

class DashboardHandler extends BaseApiHandler {
  protected async onGet(_req: NextRequest, ctx: TenantContext): Promise<NextResponse> {
    const { tenantId } = ctx;

    const [
      totalAssets,
      pendingOrders,
      activeVendors,
      lowStockItems,
      recentActivity,
      assetsByStatus,
      ordersByMonth,
    ] = await Promise.all([
      prisma.asset.count({ where: { tenantId } }),
      prisma.purchaseOrder.count({
        where: { tenantId, status: 'PENDING_APPROVAL' },
      }),
      prisma.vendor.count({ where: { tenantId, isActive: true } }),
      prisma.item
        .findMany({
          where: { tenantId, isActive: true, reorderPoint: { gt: 0 } },
          select: {
            id: true,
            reorderPoint: true,
            assets: { where: { status: 'AVAILABLE' }, select: { id: true } },
          },
        })
        .then((items) =>
          items.filter((item) => item.assets.length < item.reorderPoint).length,
        ),
      prisma.auditLog.findMany({
        where: { tenantId },
        orderBy: { createdAt: 'desc' },
        take: 10,
        include: { user: { select: { name: true, email: true } } },
      }),
      prisma.asset.groupBy({
        by: ['status'],
        where: { tenantId },
        _count: { status: true },
      }),
      prisma.purchaseOrder.findMany({
        where: { tenantId },
        select: { createdAt: true, status: true, totalAmount: true },
        orderBy: { createdAt: 'desc' },
      }),
    ]);

    const monthMap: Record<string, { count: number; total: number }> = {};
    const now = new Date();
    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      monthMap[key] = { count: 0, total: 0 };
    }
    for (const order of ordersByMonth) {
      const d = new Date(order.createdAt);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      if (monthMap[key]) {
        monthMap[key].count++;
        monthMap[key].total += order.totalAmount;
      }
    }
    const ordersByMonthData = Object.entries(monthMap).map(([month, data]) => ({
      month,
      ...data,
    }));

    const statusColors: Record<string, string> = {
      AVAILABLE: '#22c55e',
      ASSIGNED: '#3b82f6',
      IN_MAINTENANCE: '#f59e0b',
      RETIRED: '#6b7280',
      LOST: '#ef4444',
      CHECKED_OUT: '#8b5cf6',
      IN_REPAIR: '#f97316',
      DISPOSED: '#374151',
    };
    const assetStatusData = assetsByStatus.map((group) => ({
      status: group.status,
      count: group._count.status,
      color: statusColors[group.status] || '#6b7280',
    }));

    return this.success({
      kpi: {
        totalAssets,
        pendingOrders,
        activeVendors,
        lowStockAlerts: lowStockItems,
      },
      recentActivity: recentActivity.map((entry) => ({
        id: entry.id,
        user: entry.user?.name || 'System',
        userEmail: entry.user?.email || '',
        action: entry.action,
        entity: entry.entity,
        entityId: entry.entityId,
        details: entry.details,
        createdAt: entry.createdAt,
      })),
      assetsByStatus: assetStatusData,
      ordersByMonth: ordersByMonthData,
    });
  }
}

const handler = new DashboardHandler();
export const GET = handler.handle('GET');
