import { BaseRepository } from '@/lib/base/BaseRepository';
import type { PaginatedResult } from '@/lib/types';

export interface ManufacturerRecord {
  id: string;
  tenantId: string;
  name: string;
  website: string | null;
  supportUrl: string | null;
  supportPhone: string | null;
  supportEmail: string | null;
  notes: string | null;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface ListManufacturersOptions {
  page?: number;
  pageSize?: number;
  search?: string;
  activeOnly?: boolean;
}

export class ManufacturerRepository extends BaseRepository<ManufacturerRecord> {
  protected get modelName(): string {
    return 'manufacturer';
  }

  /** List with search + activeOnly + pagination, including item counts. */
  async listWithCounts(
    tenantId: string,
    options: ListManufacturersOptions = {},
  ): Promise<PaginatedResult<ManufacturerRecord & { _count: { items: number } }>> {
    const page = Math.max(1, options.page ?? 1);
    const pageSize = Math.min(100, Math.max(1, options.pageSize ?? 50));
    const activeOnly = options.activeOnly ?? true;

    const where: Record<string, unknown> = { tenantId };
    if (activeOnly) where.isActive = true;
    if (options.search) {
      where.OR = [
        { name: { contains: options.search } },
        { notes: { contains: options.search } },
      ];
    }

    const [data, total] = await Promise.all([
      this.model.findMany({
        where,
        orderBy: { name: 'asc' },
        skip: (page - 1) * pageSize,
        take: pageSize,
        include: {
          _count: { select: { items: true } },
        },
      }),
      this.model.count({ where }),
    ]);

    return {
      data,
      total,
      page,
      pageSize,
      totalPages: Math.ceil(total / pageSize),
    };
  }

  /** Read one manufacturer with full item list (for the detail page). */
  async findByIdWithItems(
    tenantId: string,
    id: string,
  ): Promise<ManufacturerRecord | null> {
    return this.model.findFirst({
      where: { id, tenantId },
      include: {
        _count: { select: { items: true } },
        items: {
          select: {
            id: true,
            name: true,
            sku: true,
            manufacturerPartNumber: true,
          },
          orderBy: { name: 'asc' },
        },
      },
    });
  }
}
