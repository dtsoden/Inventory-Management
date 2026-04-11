import type { PrismaClient } from '@prisma/client';
import { BaseService } from '@/lib/base/BaseService';
import { ValidationError, NotFoundError } from '@/lib/errors';
import { TenantContext, PaginatedResult } from '@/lib/types';
import {
  ManufacturerRepository,
  type ManufacturerRecord,
  type ListManufacturersOptions,
} from './ManufacturerRepository';

export class ManufacturerService extends BaseService<ManufacturerRecord> {
  private readonly mfgRepo: ManufacturerRepository;

  constructor(prisma: PrismaClient) {
    const repo = new ManufacturerRepository(prisma);
    super(repo, prisma);
    this.mfgRepo = repo;
  }

  protected get entityName(): string {
    return 'Manufacturer';
  }

  async listWithCounts(
    ctx: TenantContext,
    options: ListManufacturersOptions = {},
  ): Promise<PaginatedResult<ManufacturerRecord & { _count: { items: number } }>> {
    return this.mfgRepo.listWithCounts(ctx.tenantId, options);
  }

  async getByIdWithItems(
    ctx: TenantContext,
    id: string,
  ): Promise<ManufacturerRecord> {
    const mfg = await this.mfgRepo.findByIdWithItems(ctx.tenantId, id);
    if (!mfg) throw new NotFoundError('Manufacturer', id);
    return mfg;
  }

  async createOne(
    ctx: TenantContext,
    data: Record<string, unknown>,
  ): Promise<ManufacturerRecord> {
    const name = typeof data.name === 'string' ? data.name.trim() : '';
    if (!name) {
      throw new ValidationError('Manufacturer name is required');
    }
    return this.create(ctx, {
      name,
      website: data.website ?? null,
      supportUrl: data.supportUrl ?? null,
      supportPhone: data.supportPhone ?? null,
      supportEmail: data.supportEmail ?? null,
      notes: data.notes ?? null,
      isActive: data.isActive ?? true,
    });
  }

  async updateOne(
    ctx: TenantContext,
    id: string,
    data: Record<string, unknown>,
  ): Promise<ManufacturerRecord> {
    const existing = await this.mfgRepo.findById(ctx.tenantId, id);
    if (!existing) throw new NotFoundError('Manufacturer', id);
    return this.update(ctx, id, {
      name: typeof data.name === 'string' && data.name.trim() ? data.name.trim() : existing.name,
      website: data.website ?? existing.website,
      supportUrl: data.supportUrl ?? existing.supportUrl,
      supportPhone: data.supportPhone ?? existing.supportPhone,
      supportEmail: data.supportEmail ?? existing.supportEmail,
      notes: data.notes ?? existing.notes,
      isActive: data.isActive ?? existing.isActive,
    });
  }

  /** Soft-deactivate so item references are preserved. */
  async deactivate(ctx: TenantContext, id: string): Promise<void> {
    const existing = await this.mfgRepo.findById(ctx.tenantId, id);
    if (!existing) throw new NotFoundError('Manufacturer', id);
    await this.update(ctx, id, { isActive: false });
  }
}
