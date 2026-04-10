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
  APPROVED: ['SUBMITTED', 'CANCELLED'],
  SUBMITTED: ['PARTIALLY_RECEIVED', 'RECEIVED', 'CANCELLED'],
  PARTIALLY_RECEIVED: ['RECEIVED'],
  RECEIVED: [],
  CANCELLED: [],
};

export class PurchaseOrderService extends BaseService<PurchaseOrderWithLines> {
  private readonly orderRepo: PurchaseOrderRepository;

  constructor(repository: PurchaseOrderRepository, prisma: PrismaClient) {
    super(repository, prisma);
    this.orderRepo = repository;
  }

  protected get entityName(): string {
    return 'PurchaseOrder';
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
    return updated;
  }

  async approveOrder(
    ctx: TenantContext,
    id: string
  ): Promise<PurchaseOrderWithLines> {
    // Only managers and above can approve
    if (
      ctx.role !== 'SUPER_ADMIN' &&
      ctx.role !== 'ORG_ADMIN' &&
      ctx.role !== 'MANAGER'
    ) {
      throw new ForbiddenError('Only managers or above can approve orders');
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
