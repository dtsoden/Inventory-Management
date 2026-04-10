import { PrismaClient } from '@prisma/client';
import { BaseRepository, FindAllOptions } from '@/lib/base/BaseRepository';
import { PaginatedResult } from '@/lib/types';

export interface PurchaseOrderWithLines {
  id: string;
  tenantId: string;
  orderNumber: string;
  status: string;
  vendorName: string | null;
  notes: string | null;
  orderedById: string | null;
  orderedAt: Date | null;
  expectedDate: Date | null;
  totalAmount: number;
  createdAt: Date;
  updatedAt: Date;
  orderedBy?: { id: string; name: string; email: string } | null;
  lines?: PurchaseOrderLineRecord[];
}

export interface PurchaseOrderLineRecord {
  id: string;
  purchaseOrderId: string;
  itemId: string;
  quantity: number;
  unitCost: number;
  receivedQty: number;
  createdAt: Date;
  updatedAt: Date;
  item?: { id: string; name: string; sku: string | null };
}

export class PurchaseOrderRepository extends BaseRepository<PurchaseOrderWithLines> {
  constructor(prisma: PrismaClient) {
    super(prisma);
  }

  protected get modelName(): string {
    return 'purchaseOrder';
  }

  async findAllWithRelations(
    tenantId: string,
    options?: FindAllOptions
  ): Promise<PaginatedResult<PurchaseOrderWithLines>> {
    return this.findAll(tenantId, {
      ...options,
      include: {
        orderedBy: { select: { id: true, name: true, email: true } },
        lines: {
          include: { item: { select: { id: true, name: true, sku: true } } },
        },
        ...options?.include,
      },
    });
  }

  async findByIdWithRelations(
    tenantId: string,
    id: string
  ): Promise<PurchaseOrderWithLines | null> {
    return this.findById(tenantId, id, {
      orderedBy: { select: { id: true, name: true, email: true } },
      lines: {
        include: { item: { select: { id: true, name: true, sku: true } } },
      },
    });
  }

  async getNextOrderNumber(tenantId: string): Promise<string> {
    const count = await this.model.count({ where: { tenantId } });
    const seq = (count + 1).toString().padStart(5, '0');
    return `PO-${seq}`;
  }

  async updateTotalAmount(id: string): Promise<void> {
    const lines = await this.prisma.purchaseOrderLine.findMany({
      where: { purchaseOrderId: id },
    });
    const total = lines.reduce(
      (sum: number, line: { quantity: number; unitCost: number }) =>
        sum + line.quantity * line.unitCost,
      0
    );
    await this.model.update({
      where: { id },
      data: { totalAmount: total },
    });
  }
}
