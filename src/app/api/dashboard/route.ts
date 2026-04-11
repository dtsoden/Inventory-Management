import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { requireTenantContext } from '@/lib/auth';
import { isAppError } from '@/lib/errors';
import type { ApiResponse } from '@/lib/types';

export async function GET() {
  try {
    const ctx = await requireTenantContext();
    const { tenantId } = ctx;

    // Run all queries in parallel for performance
    const [
      totalAssets,
      pendingOrders,
      activeVendors,
      lowStockItems,
      recentActivity,
      assetsByStatus,
      ordersByMonth,
    ] = await Promise.all([
      // Total assets count
      prisma.asset.count({ where: { tenantId } }),

      // Pending orders (PENDING_APPROVAL status only - matches the dashboard link)
      prisma.purchaseOrder.count({
        where: {
          tenantId,
          status: 'PENDING_APPROVAL',
        },
      }),

      // Active vendors
      prisma.vendor.count({ where: { tenantId, isActive: true } }),

      // Low stock alerts: items where the asset count is at or below reorder point
      prisma.item.findMany({
        where: { tenantId, isActive: true, reorderPoint: { gt: 0 } },
        select: {
          id: true,
          name: true,
          reorderPoint: true,
          _count: { select: { assets: true } },
        },
      }).then((items) =>
        items.filter((item) => item._count.assets <= item.reorderPoint).length
      ),

      // Recent activity (last 10 audit log entries)
      prisma.auditLog.findMany({
        where: { tenantId },
        orderBy: { createdAt: 'desc' },
        take: 10,
        include: {
          user: { select: { name: true, email: true } },
        },
      }),

      // Assets grouped by status
      prisma.asset.groupBy({
        by: ['status'],
        where: { tenantId },
        _count: { status: true },
      }),

      // Orders by month (last 6 months)
      prisma.purchaseOrder.findMany({
        where: { tenantId },
        select: { createdAt: true, status: true, totalAmount: true },
        orderBy: { createdAt: 'desc' },
      }),
    ]);

    // Process orders by month
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

    // Process assets by status into a clean format
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

    const dashboard = {
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
    };

    const body: ApiResponse = { success: true, data: dashboard };
    return NextResponse.json(body);
  } catch (error: unknown) {
    if (isAppError(error)) {
      return NextResponse.json(
        { success: false, error: error.message, code: error.code },
        { status: error.statusCode }
      );
    }
    console.error('Unhandled error in GET /api/dashboard:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}
