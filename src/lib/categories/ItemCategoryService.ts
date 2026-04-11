import type { PrismaClient } from '@prisma/client';
import { BaseService } from '@/lib/base/BaseService';
import {
  ValidationError,
  NotFoundError,
  AppError,
} from '@/lib/errors';
import { TenantContext } from '@/lib/types';
import {
  ItemCategoryRepository,
  type ItemCategoryRecord,
  type ItemCategoryWithCount,
} from './ItemCategoryRepository';

export class CategoryHasItemsError extends AppError {
  constructor(count: number) {
    super(
      `Cannot delete category with ${count} items. Reassign or remove items first.`,
      409,
      'CATEGORY_HAS_ITEMS',
    );
  }
}

export class ItemCategoryService extends BaseService<ItemCategoryRecord> {
  private readonly catRepo: ItemCategoryRepository;

  constructor(prisma: PrismaClient) {
    const repo = new ItemCategoryRepository(prisma);
    super(repo, prisma);
    this.catRepo = repo;
  }

  protected get entityName(): string {
    return 'ItemCategory';
  }

  async listAll(ctx: TenantContext): Promise<ItemCategoryWithCount[]> {
    return this.catRepo.listWithItemCounts(ctx.tenantId);
  }

  async getOne(ctx: TenantContext, id: string): Promise<ItemCategoryWithCount> {
    const cat = await this.catRepo.findByIdWithCount(ctx.tenantId, id);
    if (!cat) throw new NotFoundError('Category', id);
    return cat;
  }

  async createOne(
    ctx: TenantContext,
    data: { name?: string; description?: string },
  ): Promise<ItemCategoryRecord> {
    const name = (data.name ?? '').trim();
    if (!name) throw new ValidationError('Category name is required');
    return this.create(ctx, {
      name,
      description: data.description?.trim() || null,
    });
  }

  async updateOne(
    ctx: TenantContext,
    id: string,
    data: { name?: string; description?: string },
  ): Promise<ItemCategoryRecord> {
    const existing = await this.catRepo.findById(ctx.tenantId, id);
    if (!existing) throw new NotFoundError('Category', id);

    if (data.name !== undefined && !data.name.trim()) {
      throw new ValidationError('Category name cannot be empty');
    }

    return this.update(ctx, id, {
      name: data.name?.trim() ?? existing.name,
      description:
        data.description !== undefined
          ? data.description?.trim() || null
          : existing.description,
    });
  }

  /**
   * Hard delete with referential integrity check: refuse if any items
   * still belong to the category.
   */
  async deleteOne(ctx: TenantContext, id: string): Promise<void> {
    const existing = await this.catRepo.findByIdWithCount(ctx.tenantId, id);
    if (!existing) throw new NotFoundError('Category', id);
    if (existing._count.items > 0) {
      throw new CategoryHasItemsError(existing._count.items);
    }
    await this.catRepo.deleteHard(id);
    await this.logAudit(ctx, 'DELETE', id, { name: existing.name });
  }
}
