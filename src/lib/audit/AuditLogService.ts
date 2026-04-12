import type { PrismaClient } from '@prisma/client';
import { BaseService } from '@/lib/base/BaseService';
import { ForbiddenError } from '@/lib/errors';
import { TenantContext, UserRole } from '@/lib/types';
import {
  AuditLogRepository,
  type AuditLogRecord,
  type AuditLogPage,
  type AuditLogQueryFilters,
} from './AuditLogRepository';

export interface AuditLogPageWithFilters extends AuditLogPage {
  filters: {
    actions: string[];
    entities: string[];
    users: Array<{ id: string; name: string }>;
  };
}

export class AuditLogService extends BaseService<AuditLogRecord> {
  private readonly auditRepo: AuditLogRepository;

  constructor(prisma: PrismaClient) {
    const repo = new AuditLogRepository(prisma);
    super(repo, prisma);
    this.auditRepo = repo;
  }

  protected get entityName(): string {
    return 'AuditLog';
  }

  /**
   * Admin-gated paginated read with filter dropdown values bundled in.
   * The user list comes from the User table directly because the audit
   * log itself doesn't carry display names.
   */
  async query(
    ctx: TenantContext,
    filters: AuditLogQueryFilters,
    page: number,
    pageSize: number,
    sortField = 'createdAt',
    sortDirection: 'asc' | 'desc' = 'desc',
  ): Promise<AuditLogPageWithFilters> {
    if (ctx.role !== UserRole.ADMIN) {
      throw new ForbiddenError('Only admins can view audit logs');
    }

    const [pageResult, actions, entities, users] = await Promise.all([
      this.auditRepo.query(ctx.tenantId, filters, page, pageSize, sortField, sortDirection),
      this.auditRepo.distinctActions(ctx.tenantId),
      this.auditRepo.distinctEntities(ctx.tenantId),
      this.prisma.user.findMany({
        where: { tenantId: ctx.tenantId },
        select: { id: true, name: true },
        orderBy: { name: 'asc' },
      }),
    ]);

    return {
      ...pageResult,
      filters: { actions, entities, users },
    };
  }
}
