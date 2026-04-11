import { PrismaClient } from '@prisma/client';
import { BaseService } from '@/lib/base/BaseService';
import { TenantContext } from '@/lib/types';
import { ValidationError, ForbiddenError } from '@/lib/errors';
import {
  PurchaseOrderRepository,
  PurchaseOrderWithLines,
} from './PurchaseOrderRepository';

const VALID_TRANSITIONS: Record<string, string[]> = {
  DRAFT: ['PENDING_APPROVAL', 'CANCELLED'],
  PENDING_APPROVAL: ['APPROVED', 'DRAFT', 'CANCELLED'],
  APPROVED: ['SUBMITTED', 'DRAFT', 'CANCELLED'],
  SUBMITTED: ['PARTIALLY_RECEIVED', 'RECEIVED', 'CANCELLED'],
  PARTIALLY_RECEIVED: ['RECEIVED'],
  RECEIVED: [],
  CANCELLED: [],
};

// Roles allowed to approve, reject, or revoke purchase orders.
// MANAGER is intentionally excluded: segregation of duties means the same
// person who creates a PO must not also approve it.
const APPROVER_ROLES = new Set(['ADMIN', 'PURCHASING_MANAGER']);

export class PurchaseOrderService extends BaseService<PurchaseOrderWithLines> {
  private readonly orderRepo: PurchaseOrderRepository;

  constructor(repository: PurchaseOrderRepository, prisma: PrismaClient) {
    super(repository, prisma);
    this.orderRepo = repository;
  }

  protected get entityName(): string {
    return 'PurchaseOrder';
  }

  protected get dateFields(): string[] {
    return ['expectedDate', 'orderedAt'];
  }

  async generateOrderNumber(tenantId: string): Promise<string> {
    return this.orderRepo.getNextOrderNumber(tenantId);
  }

  async createOrder(
    ctx: TenantContext,
    data: {
      vendorName: string;
      notes?: string;
      expectedDate?: string;
      lines?: Array<{ itemId: string; quantity: number; unitCost: number }>;
    }
  ): Promise<PurchaseOrderWithLines> {
    const orderNumber = await this.generateOrderNumber(ctx.tenantId);

    const order = await this.prisma.purchaseOrder.create({
      data: {
        tenantId: ctx.tenantId,
        orderNumber,
        status: 'DRAFT',
        vendorName: data.vendorName,
        notes: data.notes ?? null,
        orderedById: ctx.userId,
        expectedDate: data.expectedDate ? new Date(data.expectedDate) : null,
        totalAmount: 0,
        lines: data.lines
          ? {
              create: data.lines.map((l) => ({
                itemId: l.itemId,
                quantity: l.quantity,
                unitCost: l.unitCost,
              })),
            }
          : undefined,
      },
      include: {
        orderedBy: { select: { id: true, name: true, email: true } },
        lines: {
          include: { item: { select: { id: true, name: true, sku: true } } },
        },
      },
    });

    // Recalculate total
    await this.orderRepo.updateTotalAmount(order.id);

    await this.logAudit(ctx, 'CREATE', order.id, {
      orderNumber,
      vendorName: data.vendorName,
    });

    // Re-fetch with updated total
    return (await this.orderRepo.findByIdWithRelations(
      ctx.tenantId,
      order.id
    ))!;
  }

  async submitOrder(
    ctx: TenantContext,
    id: string
  ): Promise<PurchaseOrderWithLines> {
    const order = await this.getByIdOrThrow(ctx, id);
    this.validateTransition(order.status, 'PENDING_APPROVAL');

    // Ensure the order has at least one line
    const lineCount = await this.prisma.purchaseOrderLine.count({
      where: { purchaseOrderId: id },
    });
    if (lineCount === 0) {
      throw new ValidationError(
        'Cannot submit an order with no line items'
      );
    }

    const updated = await this.orderRepo.update(ctx.tenantId, id, {
      status: 'PENDING_APPROVAL',
    });
    await this.logAudit(ctx, 'SUBMIT', id, {
      previousStatus: order.status,
      newStatus: 'PENDING_APPROVAL',
    });

    // Notify every approver in the tenant.
    await this.notifyApprovers(ctx.tenantId, {
      type: 'APPROVAL_REQUIRED',
      title: `PO ${order.orderNumber} needs approval`,
      message: `${order.vendorName ?? 'Vendor'} order for $${(order.totalAmount ?? 0).toFixed(2)} is awaiting your approval.`,
      link: `/procurement/orders/${id}`,
    });

    return updated;
  }

  async approveOrder(
    ctx: TenantContext,
    id: string
  ): Promise<PurchaseOrderWithLines> {
    if (!APPROVER_ROLES.has(ctx.role)) {
      throw new ForbiddenError(
        'Only Purchasing Managers or Admins can approve purchase orders.'
      );
    }

    const order = await this.getByIdOrThrow(ctx, id);
    this.validateTransition(order.status, 'APPROVED');

    const updated = await this.orderRepo.update(ctx.tenantId, id, {
      status: 'APPROVED',
      orderedAt: new Date(),
    });
    await this.logAudit(ctx, 'APPROVE', id, {
      previousStatus: order.status,
      newStatus: 'APPROVED',
    });

    // Notify the requester
    if (order.orderedById) {
      await this.notifyUser(ctx.tenantId, order.orderedById, {
        type: 'ORDER_STATUS',
        title: `PO ${order.orderNumber} approved`,
        message: `Your purchase order has been approved and is ready to send to ${order.vendorName ?? 'the vendor'}.`,
        link: `/procurement/orders/${id}`,
      });
    }

    return updated;
  }

  async rejectOrder(
    ctx: TenantContext,
    id: string,
    comment: string
  ): Promise<PurchaseOrderWithLines> {
    if (!APPROVER_ROLES.has(ctx.role)) {
      throw new ForbiddenError(
        'Only Purchasing Managers or Admins can reject purchase orders.'
      );
    }
    if (!comment || !comment.trim()) {
      throw new ValidationError('A rejection comment is required.');
    }

    const order = await this.getByIdOrThrow(ctx, id);
    if (order.status !== 'PENDING_APPROVAL') {
      throw new ValidationError(
        `Only orders in PENDING_APPROVAL can be rejected (current status: ${order.status}).`
      );
    }

    // Reject sends the order back to DRAFT so the requester can edit
    // and resubmit. The rejection comment is stored in audit + notification.
    const updated = await this.orderRepo.update(ctx.tenantId, id, {
      status: 'DRAFT',
    });
    await this.logAudit(ctx, 'REJECT', id, {
      previousStatus: order.status,
      newStatus: 'DRAFT',
      comment,
    });

    if (order.orderedById) {
      await this.notifyUser(ctx.tenantId, order.orderedById, {
        type: 'ORDER_STATUS',
        title: `PO ${order.orderNumber} rejected`,
        message: `Reason: ${comment}`,
        link: `/procurement/orders/${id}`,
      });
    }

    return updated;
  }

  async revokeApproval(
    ctx: TenantContext,
    id: string,
    comment: string
  ): Promise<PurchaseOrderWithLines> {
    if (!APPROVER_ROLES.has(ctx.role)) {
      throw new ForbiddenError(
        'Only Purchasing Managers or Admins can revoke an approved order.'
      );
    }
    if (!comment || !comment.trim()) {
      throw new ValidationError(
        'A revocation comment is required so the requester knows why.'
      );
    }

    const order = await this.getByIdOrThrow(ctx, id);
    if (order.status !== 'APPROVED') {
      throw new ValidationError(
        `Only APPROVED orders can be revoked (current status: ${order.status}).`
      );
    }

    const updated = await this.orderRepo.update(ctx.tenantId, id, {
      status: 'DRAFT',
    });
    await this.logAudit(ctx, 'REVOKE_APPROVAL', id, {
      previousStatus: 'APPROVED',
      newStatus: 'DRAFT',
      comment,
    });

    if (order.orderedById) {
      await this.notifyUser(ctx.tenantId, order.orderedById, {
        type: 'ORDER_STATUS',
        title: `PO ${order.orderNumber} approval revoked`,
        message: `${comment} The order is back in DRAFT and can be edited.`,
        link: `/procurement/orders/${id}`,
      });
    }

    return updated;
  }

  async cancelOrder(
    ctx: TenantContext,
    id: string
  ): Promise<PurchaseOrderWithLines> {
    const order = await this.getByIdOrThrow(ctx, id);
    this.validateTransition(order.status, 'CANCELLED');

    const updated = await this.orderRepo.update(ctx.tenantId, id, {
      status: 'CANCELLED',
    });
    await this.logAudit(ctx, 'CANCEL', id, {
      previousStatus: order.status,
      newStatus: 'CANCELLED',
    });
    return updated;
  }

  // ----------------------------------------------------------------
  // Notification helpers
  // ----------------------------------------------------------------

  private async notifyApprovers(
    tenantId: string,
    payload: {
      type: string;
      title: string;
      message: string;
      link?: string;
    }
  ): Promise<void> {
    const approvers = await this.prisma.user.findMany({
      where: {
        tenantId,
        isActive: true,
        role: { in: ['ADMIN', 'PURCHASING_MANAGER'] },
      },
      select: { id: true },
    });
    if (approvers.length === 0) return;

    await this.prisma.notification.createMany({
      data: approvers.map((u) => ({
        tenantId,
        userId: u.id,
        type: payload.type,
        title: payload.title,
        message: payload.message,
        link: payload.link,
        isRead: false,
      })),
    });
  }

  private async notifyUser(
    tenantId: string,
    userId: string,
    payload: {
      type: string;
      title: string;
      message: string;
      link?: string;
    }
  ): Promise<void> {
    try {
      await this.prisma.notification.create({
        data: {
          tenantId,
          userId,
          type: payload.type,
          title: payload.title,
          message: payload.message,
          link: payload.link,
          isRead: false,
        },
      });
    } catch (e) {
      console.error('Failed to write user notification:', e);
    }
  }

  async submitToVendor(
    ctx: TenantContext,
    id: string
  ): Promise<PurchaseOrderWithLines> {
    const order = await this.getByIdOrThrow(ctx, id);
    this.validateTransition(order.status, 'SUBMITTED');

    const updated = await this.orderRepo.update(ctx.tenantId, id, {
      status: 'SUBMITTED',
      orderedAt: new Date(),
    });
    await this.logAudit(ctx, 'SUBMIT_TO_VENDOR', id, {
      previousStatus: order.status,
      newStatus: 'SUBMITTED',
    });
    return updated;
  }

  async markReceived(
    ctx: TenantContext,
    id: string
  ): Promise<PurchaseOrderWithLines> {
    const order = await this.getByIdOrThrow(ctx, id);
    this.validateTransition(order.status, 'RECEIVED');

    const updated = await this.orderRepo.update(ctx.tenantId, id, {
      status: 'RECEIVED',
    });
    await this.logAudit(ctx, 'RECEIVE', id, {
      previousStatus: order.status,
      newStatus: 'RECEIVED',
    });
    return updated;
  }

  async recalculateTotal(id: string): Promise<void> {
    await this.orderRepo.updateTotalAmount(id);
  }

  private validateTransition(
    currentStatus: string,
    newStatus: string
  ): void {
    const allowed = VALID_TRANSITIONS[currentStatus] ?? [];
    if (!allowed.includes(newStatus)) {
      throw new ValidationError(
        `Cannot transition from ${currentStatus} to ${newStatus}`
      );
    }
  }
}
