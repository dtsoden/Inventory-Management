import { PrismaClient } from '@prisma/client';
import { BaseService } from '@/lib/base/BaseService';
import { TenantContext, ReceivingStatus, OrderStatus, AssetStatus } from '@/lib/types';
import { ValidationError, NotFoundError } from '@/lib/errors';
import { ReceivingRepository, ReceivingSessionRecord } from './ReceivingRepository';
import { extractPackingSlipData, PackingSlipExtraction } from './openai';

export class ReceivingService extends BaseService<ReceivingSessionRecord> {
  private readonly receivingRepo: ReceivingRepository;

  constructor(repository: ReceivingRepository, prisma: PrismaClient) {
    super(repository, prisma);
    this.receivingRepo = repository;
  }

  protected get entityName(): string {
    return 'ReceivingSession';
  }

  protected get dateFields(): string[] {
    return ['completedAt'];
  }

  async startSession(
    ctx: TenantContext,
    purchaseOrderId: string
  ): Promise<ReceivingSessionRecord> {
    // Validate that the PO exists and belongs to this tenant
    const po = await (this.prisma as any).purchaseOrder.findFirst({
      where: {
        id: purchaseOrderId,
        tenantId: ctx.tenantId,
      },
    });

    if (!po) {
      throw new NotFoundError('PurchaseOrder', purchaseOrderId);
    }

    // Validate PO status
    const validStatuses = [OrderStatus.SUBMITTED, OrderStatus.PARTIALLY_RECEIVED];
    if (!validStatuses.includes(po.status)) {
      throw new ValidationError(
        `Purchase order must be in SUBMITTED or PARTIALLY_RECEIVED status. Current status: ${po.status}`
      );
    }

    // Check for existing active session on this PO
    const existingSession = await this.receivingRepo.findActiveByPO(
      ctx.tenantId,
      purchaseOrderId
    );
    if (existingSession) {
      throw new ValidationError(
        'An active receiving session already exists for this purchase order'
      );
    }

    const session = await this.receivingRepo.create(ctx.tenantId, {
      purchaseOrderId,
      receivedById: ctx.userId,
      status: ReceivingStatus.IN_PROGRESS,
    });

    await this.logAudit(ctx, 'CREATE', session.id, {
      action: 'startReceivingSession',
      purchaseOrderId,
    });

    return session;
  }

  async extractPackingSlip(
    ctx: TenantContext,
    sessionId: string,
    imageBase64: string,
  ): Promise<PackingSlipExtraction> {
    const session = await this.getByIdOrThrow(ctx, sessionId);

    if (session.status !== ReceivingStatus.IN_PROGRESS) {
      throw new ValidationError('Session is not in progress');
    }

    const extractionResult = await extractPackingSlipData(imageBase64);

    await this.receivingRepo.update(ctx.tenantId, sessionId, {
      aiExtractionData: JSON.stringify(extractionResult),
      packingSlipImageUrl: `data:image/jpeg;base64,${imageBase64.substring(0, 50)}...`,
    });

    await this.logAudit(ctx, 'UPDATE', sessionId, {
      action: 'extractPackingSlip',
      itemCount: extractionResult.lineItems.length,
    });

    return extractionResult;
  }

  async extractPackingSlipFromDocument(
    ctx: TenantContext,
    sessionId: string,
    fileBuffer: Buffer,
    mimeType: string,
    fileName: string,
  ): Promise<PackingSlipExtraction> {
    const session = await this.getByIdOrThrow(ctx, sessionId);

    if (session.status !== ReceivingStatus.IN_PROGRESS) {
      throw new ValidationError('Session is not in progress');
    }

    const { isImageMime } = await import('./document-parser');

    let extractionResult: PackingSlipExtraction;

    if (isImageMime(mimeType)) {
      const base64 = fileBuffer.toString('base64');
      extractionResult = await extractPackingSlipData(base64);
    } else {
      const { extractTextFromDocument } = await import('./document-parser');
      const text = await extractTextFromDocument(fileBuffer, mimeType);
      const { extractPackingSlipFromText } = await import('./openai');
      extractionResult = await extractPackingSlipFromText(text);
    }

    await this.receivingRepo.update(ctx.tenantId, sessionId, {
      aiExtractionData: JSON.stringify(extractionResult),
      packingSlipImageUrl: `[document] ${fileName}`,
    });

    await this.logAudit(ctx, 'UPDATE', sessionId, {
      action: 'extractPackingSlipDocument',
      fileName,
      mimeType,
      itemCount: extractionResult.lineItems.length,
    });

    return extractionResult;
  }

  async tagAsset(
    ctx: TenantContext,
    sessionId: string,
    data: { itemId: string; assetTag: string; serialNumber?: string }
  ): Promise<Record<string, unknown>> {
    const session = await this.getByIdOrThrow(ctx, sessionId);

    if (session.status !== ReceivingStatus.IN_PROGRESS) {
      throw new ValidationError('Session is not in progress');
    }

    // Validate that the item exists
    const item = await (this.prisma as any).item.findFirst({
      where: { id: data.itemId, tenantId: ctx.tenantId },
    });
    if (!item) {
      throw new NotFoundError('Item', data.itemId);
    }

    // Resolve the purchase order line for provenance. The session points to a
    // PO, and we match the line by itemId. If multiple lines exist we pick the
    // one with the fewest received assets first so receipts fan out across
    // lines.
    let purchaseOrderLineId: string | null = null;
    if (session.purchaseOrderId) {
      const poLines = await (this.prisma as any).purchaseOrderLine.findMany({
        where: {
          purchaseOrderId: session.purchaseOrderId,
          itemId: data.itemId,
        },
        include: { _count: { select: { assets: true } } },
        orderBy: { createdAt: 'asc' },
      });
      if (poLines.length > 0) {
        // Prefer a line that still has remaining capacity
        const withCapacity = poLines.find(
          (l: any) => l._count.assets < l.quantity
        );
        purchaseOrderLineId = (withCapacity ?? poLines[0]).id;
      }
    }

    const asset = await (this.prisma as any).asset.create({
      data: {
        tenantId: ctx.tenantId,
        itemId: data.itemId,
        purchaseOrderLineId,
        receivingSessionId: sessionId,
        assetTag: data.assetTag,
        serialNumber: data.serialNumber ?? null,
        status: AssetStatus.AVAILABLE,
        purchasedAt: new Date(),
      },
    });

    await this.logAudit(ctx, 'CREATE', asset.id, {
      action: 'tagAsset',
      sessionId,
      assetTag: data.assetTag,
      itemId: data.itemId,
    });

    return asset;
  }

  async cancelSession(
    ctx: TenantContext,
    sessionId: string,
  ): Promise<ReceivingSessionRecord> {
    const session = await this.getByIdOrThrow(ctx, sessionId);

    if (session.status !== ReceivingStatus.IN_PROGRESS) {
      throw new ValidationError('Only in-progress sessions can be cancelled');
    }

    // Delete all assets created during this session
    await (this.prisma as any).asset.deleteMany({
      where: {
        tenantId: ctx.tenantId,
        receivingSessionId: sessionId,
      },
    });

    // Reset PO status back to SUBMITTED so it can be received again
    if (session.purchaseOrderId) {
      await (this.prisma as any).purchaseOrder.update({
        where: { id: session.purchaseOrderId },
        data: { status: OrderStatus.SUBMITTED },
      });
    }

    // Mark session as cancelled
    const cancelled = await this.receivingRepo.update(
      ctx.tenantId,
      sessionId,
      { status: 'CANCELLED' },
    );

    await this.logAudit(ctx, 'UPDATE', sessionId, {
      action: 'cancelReceivingSession',
    });

    return cancelled;
  }

  async completeSession(
    ctx: TenantContext,
    sessionId: string
  ): Promise<ReceivingSessionRecord> {
    const session = await this.getByIdOrThrow(ctx, sessionId);

    if (session.status !== ReceivingStatus.IN_PROGRESS) {
      throw new ValidationError('Session is not in progress');
    }

    // Mark session as completed
    const updatedSession = await this.receivingRepo.update(
      ctx.tenantId,
      sessionId,
      {
        status: ReceivingStatus.COMPLETED,
        completedAt: new Date(),
      }
    );

    // Update the PO status if applicable
    if (session.purchaseOrderId) {
      // Count assets created for this PO
      const assetCount = await (this.prisma as any).asset.count({
        where: {
          tenantId: ctx.tenantId,
          // Assets linked by item relationship to this PO's lines
        },
      });

      // Get total expected quantity from PO lines
      const poLines = await (this.prisma as any).purchaseOrderLine.findMany({
        where: {
          purchaseOrder: {
            id: session.purchaseOrderId,
            tenantId: ctx.tenantId,
          },
        },
      });

      const totalExpected = poLines.reduce(
        (sum: number, line: { quantity: number }) => sum + line.quantity,
        0
      );

      // Update PO status based on received count vs expected
      const newStatus =
        assetCount >= totalExpected
          ? OrderStatus.RECEIVED
          : OrderStatus.PARTIALLY_RECEIVED;

      await (this.prisma as any).purchaseOrder.update({
        where: { id: session.purchaseOrderId },
        data: { status: newStatus },
      });
    }

    await this.logAudit(ctx, 'UPDATE', sessionId, {
      action: 'completeReceivingSession',
    });

    return updatedSession;
  }
}
