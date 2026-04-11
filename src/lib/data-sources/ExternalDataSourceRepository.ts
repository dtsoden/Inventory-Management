import { BaseRepository } from '@/lib/base/BaseRepository';

export interface ExternalDataSourceRecord {
  id: string;
  tenantId: string;
  name: string;
  apiUrl: string;
  apiHeaders: string | null;
  fieldMapping: string;
  dataTypeConversions: string | null;
  isActive: boolean;
  lastSyncAt: Date | null;
  lastSyncStatus: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface DataSourceListItem {
  id: string;
  name: string;
  apiUrl: string;
  isActive: boolean;
  lastSyncAt: Date | null;
  lastSyncStatus: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export class ExternalDataSourceRepository extends BaseRepository<ExternalDataSourceRecord> {
  protected get modelName(): string {
    return 'externalDataSource';
  }

  async listForTenant(tenantId: string): Promise<DataSourceListItem[]> {
    return this.model.findMany({
      where: { tenantId },
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        name: true,
        apiUrl: true,
        isActive: true,
        lastSyncAt: true,
        lastSyncStatus: true,
        createdAt: true,
        updatedAt: true,
      },
    });
  }

  async findInTenant(
    tenantId: string,
    id: string,
  ): Promise<ExternalDataSourceRecord | null> {
    return this.model.findFirst({ where: { id, tenantId } });
  }

  async createOne(
    data: Omit<ExternalDataSourceRecord, 'id' | 'createdAt' | 'updatedAt' | 'lastSyncAt'>,
  ): Promise<ExternalDataSourceRecord> {
    return this.model.create({ data });
  }

  async updateOne(
    id: string,
    data: Partial<Omit<ExternalDataSourceRecord, 'id' | 'tenantId' | 'createdAt' | 'updatedAt'>>,
  ): Promise<ExternalDataSourceRecord> {
    return this.model.update({ where: { id }, data });
  }

  async deleteHard(id: string): Promise<void> {
    await this.model.delete({ where: { id } });
  }

  async markSync(
    id: string,
    status: 'SUCCESS' | 'FAILED',
  ): Promise<void> {
    await this.model.update({
      where: { id },
      data: { lastSyncAt: new Date(), lastSyncStatus: status },
    });
  }
}
