import { BaseRepository } from '@/lib/base/BaseRepository';

export interface ItemCategoryRecord {
  id: string;
  tenantId: string;
  name: string;
  description: string | null;
  parentId: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface ItemCategoryWithCount extends ItemCategoryRecord {
  _count: { items: number };
}

export class ItemCategoryRepository extends BaseRepository<ItemCategoryRecord> {
  protected get modelName(): string {
    return 'itemCategory';
  }

  protected get hasIsActive(): boolean {
    return false;
  }

  async listWithItemCounts(tenantId: string): Promise<ItemCategoryWithCount[]> {
    return this.model.findMany({
      where: { tenantId },
      orderBy: { name: 'asc' },
      include: { _count: { select: { items: true } } },
    });
  }

  async findByIdWithCount(
    tenantId: string,
    id: string,
  ): Promise<ItemCategoryWithCount | null> {
    return this.model.findFirst({
      where: { id, tenantId },
      include: { _count: { select: { items: true } } },
    });
  }

  async deleteHard(id: string): Promise<void> {
    await this.model.delete({ where: { id } });
  }
}
