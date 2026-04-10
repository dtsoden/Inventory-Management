import { PrismaClient } from '@/generated/prisma';
import { PaginationParams, PaginatedResult, SortParams } from '@/lib/types';
import { NotFoundError, TenantIsolationError } from '@/lib/errors';

export interface FindAllOptions {
  pagination?: PaginationParams;
  sort?: SortParams;
  where?: Record<string, unknown>;
  include?: Record<string, unknown>;
}

export abstract class BaseRepository<T = unknown> {
  constructor(protected readonly prisma: PrismaClient) {}

  protected abstract get modelName(): string;

  protected get model() {
    return (this.prisma as any)[this.modelName];
  }

  async findAll(
    tenantId: string,
    options?: FindAllOptions
  ): Promise<PaginatedResult<T>> {
    const { pagination, sort, where, include } = options ?? {};

    const page = pagination?.page ?? 1;
    const pageSize = pagination?.pageSize ?? 20;

    const whereClause = {
      tenantId,
      isActive: true,
      ...where,
    };

    const [data, total] = await Promise.all([
      this.model.findMany({
        where: whereClause,
        skip: (page - 1) * pageSize,
        take: pageSize,
        orderBy: sort ? { [sort.field]: sort.direction } : undefined,
        include,
      }),
      this.model.count({ where: whereClause }),
    ]);

    return {
      data: data as T[],
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
  ): Promise<T | null> {
    const entity = await this.model.findFirst({
      where: { id, tenantId, isActive: true },
      include,
    });
    return entity as T | null;
  }

  async create(tenantId: string, data: Record<string, unknown>): Promise<T> {
    return this.model.create({
      data: {
        ...data,
        tenantId,
      },
    }) as Promise<T>;
  }

  async update(
    tenantId: string,
    id: string,
    data: Record<string, unknown>
  ): Promise<T> {
    await this.verifyTenantOwnership(tenantId, id);
    return this.model.update({
      where: { id },
      data,
    }) as Promise<T>;
  }

  async softDelete(tenantId: string, id: string): Promise<T> {
    await this.verifyTenantOwnership(tenantId, id);
    return this.model.update({
      where: { id },
      data: { isActive: false },
    }) as Promise<T>;
  }

  async count(
    tenantId: string,
    where?: Record<string, unknown>
  ): Promise<number> {
    return this.model.count({
      where: {
        tenantId,
        isActive: true,
        ...where,
      },
    });
  }

  private async verifyTenantOwnership(
    tenantId: string,
    id: string
  ): Promise<void> {
    const entity = await this.model.findUnique({
      where: { id },
      select: { id: true, tenantId: true },
    });

    if (!entity) {
      throw new NotFoundError(this.modelName, id);
    }

    if (entity.tenantId !== tenantId) {
      throw new TenantIsolationError();
    }
  }
}
