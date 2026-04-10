import { BaseRepository } from '@/lib/base/BaseRepository';

export interface ReceivingSessionRecord {
  id: string;
  tenantId: string;
  purchaseOrderId: string | null;
  receivedById: string | null;
  packingSlipImageUrl: string | null;
  aiExtractionData: string | null;
  status: string;
  notes: string | null;
  isActive: boolean;
  completedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

export class ReceivingRepository extends BaseRepository<ReceivingSessionRecord> {
  protected get modelName(): string {
    return 'receivingSession';
  }

  async findByIdWithPO(
    tenantId: string,
    id: string
  ): Promise<ReceivingSessionRecord | null> {
    const session = await this.model.findFirst({
      where: { id, tenantId, isActive: true },
    });
    return session as ReceivingSessionRecord | null;
  }

  async findActiveByPO(
    tenantId: string,
    purchaseOrderId: string
  ): Promise<ReceivingSessionRecord | null> {
    const session = await this.model.findFirst({
      where: {
        tenantId,
        purchaseOrderId,
        status: 'IN_PROGRESS',
        isActive: true,
      },
    });
    return session as ReceivingSessionRecord | null;
  }
}
