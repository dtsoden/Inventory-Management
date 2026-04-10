import { PrismaClient } from '@prisma/client';
import { BaseRepository, FindAllOptions } from '@/lib/base/BaseRepository';
import { PaginatedResult } from '@/lib/types';

export interface ItemRecord {
  id: string;
  tenantId: string;
  name: string;
  description: string | null;
  sku: string | null;
  vendorId: string | null;
  categoryId: string | null;
  unitCost: number | null;
  reorderPoint: number;
  reorderQuantity: number;
  imageUrl: string | null;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
  vendor?: { id: string; name: string } | null;
  category?: { id: string; name: string } | null;
}

export class ItemRepository extends BaseRepository<ItemRecord> {
  constructor(prisma: PrismaClient) {
    super(prisma);
  }

  protected get modelName(): string {
    return 'item';
  }

  async findAllWithRelations(
    tenantId: string,
    options?: FindAllOptions
  ): Promise<PaginatedResult<ItemRecord>> {
    return this.findAll(tenantId, {
      ...options,
      include: {
        vendor: { select: { id: true, name: true } },
        category: { select: { id: true, name: true } },
        ...options?.include,
      },
    });
  }

  async findByIdWithRelations(
    tenantId: string,
    id: string
  ): Promise<ItemRecord | null> {
    return this.findById(tenantId, id, {
      vendor: { select: { id: true, name: true } },
      category: { select: { id: true, name: true } },
    });
  }
}
