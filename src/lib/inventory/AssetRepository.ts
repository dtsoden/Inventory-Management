import { PrismaClient } from '@prisma/client';
import { BaseRepository, FindAllOptions } from '@/lib/base/BaseRepository';
import { PaginatedResult } from '@/lib/types';

export interface AssetRecord {
  id: string;
  tenantId: string;
  itemId: string;
  assetTag: string | null;
  serialNumber: string | null;
  status: string;
  condition: string | null;
  location: string | null;
  assignedTo: string | null;
  notes: string | null;
  purchasedAt: Date | null;
  warrantyUntil: Date | null;
  createdAt: Date;
  updatedAt: Date;
  item?: {
    id: string;
    name: string;
    sku: string | null;
    categoryId: string | null;
    vendorId: string | null;
    category?: { id: string; name: string } | null;
    vendor?: { id: string; name: string } | null;
  };
}

export class AssetRepository extends BaseRepository<AssetRecord> {
  constructor(prisma: PrismaClient) {
    super(prisma);
  }

  protected get modelName(): string {
    return 'asset';
  }

  protected get hasIsActive(): boolean {
    return false;
  }

  private get defaultInclude() {
    return {
      item: {
        include: {
          category: { select: { id: true, name: true } },
          vendor: { select: { id: true, name: true } },
        },
      },
    };
  }

  /**
   * Override findAll to skip the isActive filter since Asset has no isActive field,
   * and to include item relations by default.
   */
  async findAll(
    tenantId: string,
    options?: FindAllOptions
  ): Promise<PaginatedResult<AssetRecord>> {
    const { pagination, sort, where, include } = options ?? {};

    const page = pagination?.page ?? 1;
    const pageSize = pagination?.pageSize ?? 20;

    const whereClause = {
      tenantId,
      ...where,
    };

    const [data, total] = await Promise.all([
      this.model.findMany({
        where: whereClause,
        skip: (page - 1) * pageSize,
        take: pageSize,
        orderBy: sort ? { [sort.field]: sort.direction } : { createdAt: 'desc' },
        include: include ?? this.defaultInclude,
      }),
      this.model.count({ where: whereClause }),
    ]);

    return {
      data: data as AssetRecord[],
      total,
      page,
      pageSize,
      totalPages: Math.ceil(total / pageSize),
    };
  }

  async findById(
    tenantId: string,
    id: string,
    include?: Record<string, unknown>
  ): Promise<AssetRecord | null> {
    const entity = await this.model.findFirst({
      where: { id, tenantId },
      include: include ?? this.defaultInclude,
    });
    return entity as AssetRecord | null;
  }

  async count(
    tenantId: string,
    where?: Record<string, unknown>
  ): Promise<number> {
    return this.model.count({
      where: {
        tenantId,
        ...where,
      },
    });
  }

  async search(
    tenantId: string,
    query: string,
    options?: FindAllOptions
  ): Promise<PaginatedResult<AssetRecord>> {
    const searchFilter = {
      OR: [
        { assetTag: { contains: query } },
        { serialNumber: { contains: query } },
        { location: { contains: query } },
        { assignedTo: { contains: query } },
        { notes: { contains: query } },
        { item: { name: { contains: query } } },
        { item: { sku: { contains: query } } },
      ],
    };

    const mergedWhere = {
      ...options?.where,
      ...searchFilter,
    };

    return this.findAll(tenantId, {
      ...options,
      where: mergedWhere,
    });
  }

  /**
   * Delete an asset permanently (Asset has no isActive/soft-delete).
   */
  async hardDelete(tenantId: string, id: string): Promise<AssetRecord> {
    const existing = await this.model.findFirst({
      where: { id, tenantId },
    });
    if (!existing) {
      const { NotFoundError } = await import('@/lib/errors');
      throw new NotFoundError('Asset', id);
    }
    return this.model.delete({ where: { id } }) as Promise<AssetRecord>;
  }
}
