import type { PrismaClient } from '@prisma/client';
import type { TenantContext } from '@/lib/types';
import type { ActionItem } from './types';

export class ActionItemService {
  constructor(private readonly prisma: PrismaClient) {}

  async getActionItems(ctx: TenantContext): Promise<ActionItem[]> {
    const items: ActionItem[] = [];

    await Promise.all([
      this.getPendingApprovals(ctx, items),
      this.getAwaitingApproval(ctx, items),
      this.getReceivingInProgress(ctx, items),
      this.getLowStockAlerts(ctx, items),
    ]);

    items.sort((a, b) => {
      const priorityOrder = { high: 0, medium: 1, low: 2 };
      const diff = priorityOrder[a.priority] - priorityOrder[b.priority];
      if (diff !== 0) return diff;
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    });

    return items;
  }

  private async getPendingApprovals(
    ctx: TenantContext,
    items: ActionItem[],
  ): Promise<void> {
    if (ctx.role !== 'ADMIN' && ctx.role !== 'PURCHASING_MANAGER') return;

    const orders = await this.prisma.purchaseOrder.findMany({
      where: { tenantId: ctx.tenantId, status: 'PENDING_APPROVAL' },
      select: {
        id: true,
        orderNumber: true,
        vendorName: true,
        totalAmount: true,
        createdAt: true,
        orderedBy: { select: { name: true } },
      },
      orderBy: { createdAt: 'asc' },
    });

    for (const po of orders) {
      items.push({
        id: `po-approve-${po.id}`,
        type: 'PO_PENDING_APPROVAL',
        title: `Approve ${po.orderNumber}`,
        description: `${po.vendorName ?? 'Unknown vendor'} - $${(po.totalAmount ?? 0).toFixed(2)} - submitted by ${po.orderedBy?.name ?? 'unknown'}`,
        priority: 'high',
        href: `/procurement/orders/${po.id}`,
        createdAt: po.createdAt.toISOString(),
        metadata: { orderNumber: po.orderNumber, amount: po.totalAmount },
      });
    }
  }

  private async getAwaitingApproval(
    ctx: TenantContext,
    items: ActionItem[],
  ): Promise<void> {
    const orders = await this.prisma.purchaseOrder.findMany({
      where: {
        tenantId: ctx.tenantId,
        status: 'PENDING_APPROVAL',
        orderedById: ctx.userId,
      },
      select: {
        id: true,
        orderNumber: true,
        vendorName: true,
        totalAmount: true,
        createdAt: true,
      },
      orderBy: { createdAt: 'asc' },
    });

    for (const po of orders) {
      items.push({
        id: `po-waiting-${po.id}`,
        type: 'PO_AWAITING_APPROVAL',
        title: `${po.orderNumber} awaiting approval`,
        description: `${po.vendorName ?? 'Unknown vendor'} - $${(po.totalAmount ?? 0).toFixed(2)}`,
        priority: 'medium',
        href: `/procurement/orders/${po.id}`,
        createdAt: po.createdAt.toISOString(),
        metadata: { orderNumber: po.orderNumber },
      });
    }
  }

  private async getReceivingInProgress(
    ctx: TenantContext,
    items: ActionItem[],
  ): Promise<void> {
    const sessions = await this.prisma.receivingSession.findMany({
      where: {
        tenantId: ctx.tenantId,
        status: 'IN_PROGRESS',
        receivedById: ctx.userId,
      },
      select: {
        id: true,
        purchaseOrderId: true,
        createdAt: true,
      },
      orderBy: { createdAt: 'asc' },
    });

    for (const session of sessions) {
      let poLabel = 'Manual receiving';
      let vendor = '';
      if (session.purchaseOrderId) {
        const po = await this.prisma.purchaseOrder.findUnique({
          where: { id: session.purchaseOrderId },
          select: { orderNumber: true, vendorName: true },
        });
        if (po) {
          poLabel = po.orderNumber;
          vendor = po.vendorName ?? '';
        }
      }
      items.push({
        id: `recv-${session.id}`,
        type: 'RECEIVING_IN_PROGRESS',
        title: `Complete receiving: ${poLabel}`,
        description: vendor ? `${vendor} - started ${new Date(session.createdAt).toLocaleDateString()}` : `Started ${new Date(session.createdAt).toLocaleDateString()}`,
        priority: 'medium',
        href: `/receiving/${session.id}`,
        createdAt: session.createdAt.toISOString(),
      });
    }
  }

  private async getLowStockAlerts(
    ctx: TenantContext,
    items: ActionItem[],
  ): Promise<void> {
    if (ctx.role !== 'ADMIN' && ctx.role !== 'MANAGER') return;

    const lowStockItems = await this.prisma.item.findMany({
      where: {
        tenantId: ctx.tenantId,
        isActive: true,
        reorderPoint: { gt: 0 },
      },
      select: {
        id: true,
        name: true,
        sku: true,
        reorderPoint: true,
        updatedAt: true,
        assets: {
          where: { status: 'AVAILABLE' },
          select: { id: true },
        },
      },
    });

    for (const item of lowStockItems) {
      const available = item.assets.length;
      if (available < (item.reorderPoint ?? 0)) {
        items.push({
          id: `lowstock-${item.id}`,
          type: 'LOW_STOCK',
          title: `Low stock: ${item.name}`,
          description: `${available} available, reorder point is ${item.reorderPoint}${item.sku ? ` (SKU: ${item.sku})` : ''}`,
          priority: 'low',
          href: `/inventory/items/${item.id}`,
          createdAt: item.updatedAt.toISOString(),
          metadata: { available, reorderPoint: item.reorderPoint },
        });
      }
    }
  }
}
