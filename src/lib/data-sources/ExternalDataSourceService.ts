import type { PrismaClient } from '@prisma/client';
import { BaseService } from '@/lib/base/BaseService';
import {
  ValidationError,
  NotFoundError,
  ForbiddenError,
} from '@/lib/errors';
import { TenantContext, UserRole } from '@/lib/types';
import {
  ExternalDataSourceRepository,
  type ExternalDataSourceRecord,
  type DataSourceListItem,
} from './ExternalDataSourceRepository';

export interface DataSourceWithParsedJson {
  id: string;
  tenantId: string;
  name: string;
  apiUrl: string;
  apiHeaders: Record<string, string>;
  fieldMapping: unknown;
  dataTypeConversions: string | null;
  isActive: boolean;
  lastSyncAt: Date | null;
  lastSyncStatus: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateDataSourceInput {
  name?: string;
  apiUrl?: string;
  apiHeaders?: Record<string, string>;
  fieldMappings?: unknown;
  isActive?: boolean;
}

export interface UpdateDataSourceInput {
  name?: string;
  apiUrl?: string;
  apiHeaders?: Record<string, string>;
  fieldMappings?: unknown;
  isActive?: boolean;
}

export class ExternalDataSourceService extends BaseService<ExternalDataSourceRecord> {
  private readonly dsRepo: ExternalDataSourceRepository;

  constructor(prisma: PrismaClient) {
    const repo = new ExternalDataSourceRepository(prisma);
    super(repo, prisma);
    this.dsRepo = repo;
  }

  protected get entityName(): string {
    return 'ExternalDataSource';
  }

  // ----- Reads -----

  async listForCurrentTenant(ctx: TenantContext): Promise<DataSourceListItem[]> {
    this.requireAdmin(ctx);
    return this.dsRepo.listForTenant(ctx.tenantId);
  }

  async getOne(
    ctx: TenantContext,
    id: string,
  ): Promise<DataSourceWithParsedJson> {
    this.requireAdmin(ctx);
    const source = await this.dsRepo.findInTenant(ctx.tenantId, id);
    if (!source) throw new NotFoundError('ExternalDataSource', id);
    return this.toParsed(source);
  }

  // ----- Writes -----

  async createOne(
    ctx: TenantContext,
    input: CreateDataSourceInput,
  ): Promise<ExternalDataSourceRecord> {
    this.requireAdmin(ctx);

    const name = (input.name ?? '').trim();
    const apiUrl = (input.apiUrl ?? '').trim();
    if (!name || !apiUrl) {
      throw new ValidationError('Name and API URL are required');
    }

    const created = await this.dsRepo.createOne({
      tenantId: ctx.tenantId,
      name,
      apiUrl,
      apiHeaders: input.apiHeaders ? JSON.stringify(input.apiHeaders) : null,
      fieldMapping: JSON.stringify(input.fieldMappings ?? []),
      dataTypeConversions: null,
      isActive: input.isActive ?? true,
      lastSyncStatus: 'NEVER',
    });
    await this.logAudit(ctx, 'CREATE', created.id, {
      details: `Created external data source: ${name}`,
    });
    return created;
  }

  async updateOne(
    ctx: TenantContext,
    id: string,
    input: UpdateDataSourceInput,
  ): Promise<ExternalDataSourceRecord> {
    this.requireAdmin(ctx);
    const existing = await this.dsRepo.findInTenant(ctx.tenantId, id);
    if (!existing) throw new NotFoundError('ExternalDataSource', id);

    const updateData: Partial<ExternalDataSourceRecord> = {};
    if (input.name !== undefined) updateData.name = input.name;
    if (input.apiUrl !== undefined) updateData.apiUrl = input.apiUrl;
    if (input.apiHeaders !== undefined)
      updateData.apiHeaders = JSON.stringify(input.apiHeaders);
    if (input.fieldMappings !== undefined)
      updateData.fieldMapping = JSON.stringify(input.fieldMappings);
    if (input.isActive !== undefined) updateData.isActive = input.isActive;

    const updated = await this.dsRepo.updateOne(id, updateData);
    await this.logAudit(ctx, 'UPDATE', id, {
      details: `Updated external data source: ${updated.name}`,
    });
    return updated;
  }

  async deleteOne(ctx: TenantContext, id: string): Promise<void> {
    this.requireAdmin(ctx);
    const existing = await this.dsRepo.findInTenant(ctx.tenantId, id);
    if (!existing) throw new NotFoundError('ExternalDataSource', id);
    await this.dsRepo.deleteHard(id);
    await this.logAudit(ctx, 'DELETE', id, {
      details: `Deleted external data source: ${existing.name}`,
    });
  }

  async markSyncResult(
    ctx: TenantContext,
    id: string,
    status: 'SUCCESS' | 'FAILED',
  ): Promise<void> {
    this.requireAdmin(ctx);
    const existing = await this.dsRepo.findInTenant(ctx.tenantId, id);
    if (!existing) throw new NotFoundError('ExternalDataSource', id);
    await this.dsRepo.markSync(id, status);
  }

  // ----- Helpers -----

  private toParsed(row: ExternalDataSourceRecord): DataSourceWithParsedJson {
    return {
      ...row,
      apiHeaders: row.apiHeaders ? JSON.parse(row.apiHeaders) : {},
      fieldMapping: JSON.parse(row.fieldMapping),
    };
  }

  private requireAdmin(ctx: TenantContext): void {
    if (ctx.role !== UserRole.ADMIN) {
      throw new ForbiddenError('Only admins can manage data sources');
    }
  }
}
