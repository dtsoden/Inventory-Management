import { BaseRepository } from '@/lib/base/BaseRepository';

export interface AuditLogRecord {
  id: string;
  tenantId: string;
  userId: string | null;
  action: string;
  entity: string;
  entityId: string | null;
  details: string | null;
  ipAddress: string | null;
  createdAt: Date;
}

export interface AuditLogQueryFilters {
  action?: string;
  entity?: string;
  entityId?: string;
  userId?: string;
  dateFrom?: string;
  dateTo?: string;
}

export interface AuditLogPage {
  rows: Array<AuditLogRecord & { user: { name: string; email: string } | null }>;
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

export class AuditLogRepository extends BaseRepository<AuditLogRecord> {
  protected get modelName(): string {
    return 'auditLog';
  }

  protected get hasIsActive(): boolean {
    return false;
  }

  /** Tenant-scoped paginated read with optional filters and joined user. */
  async query(
    tenantId: string,
    filters: AuditLogQueryFilters,
    page = 1,
    pageSize = 25,
  ): Promise<AuditLogPage> {
    const where: Record<string, unknown> = { tenantId };
    if (filters.action) where.action = filters.action;
    if (filters.entity) where.entity = filters.entity;
    if (filters.entityId) where.entityId = filters.entityId;
    if (filters.userId) where.userId = filters.userId;
    if (filters.dateFrom || filters.dateTo) {
      const createdAt: Record<string, Date> = {};
      if (filters.dateFrom) createdAt.gte = new Date(filters.dateFrom);
      if (filters.dateTo) createdAt.lte = new Date(filters.dateTo + 'T23:59:59.999Z');
      where.createdAt = createdAt;
    }

    const safePage = Math.max(1, page);
    const safePageSize = Math.min(100, Math.max(1, pageSize));

    const [total, rows] = await Promise.all([
      this.model.count({ where }),
      this.model.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (safePage - 1) * safePageSize,
        take: safePageSize,
        include: {
          user: { select: { name: true, email: true } },
        },
      }),
    ]);

    return {
      rows,
      total,
      page: safePage,
      pageSize: safePageSize,
      totalPages: Math.ceil(total / safePageSize),
    };
  }

  /** Distinct action values for the filter dropdown. */
  async distinctActions(tenantId: string): Promise<string[]> {
    const rows = await this.model.findMany({
      where: { tenantId },
      select: { action: true },
      distinct: ['action'],
    });
    return rows.map((r: { action: string }) => r.action);
  }

  /** Distinct entity values for the filter dropdown. */
  async distinctEntities(tenantId: string): Promise<string[]> {
    const rows = await this.model.findMany({
      where: { tenantId },
      select: { entity: true },
      distinct: ['entity'],
    });
    return rows.map((r: { entity: string }) => r.entity);
  }
}
