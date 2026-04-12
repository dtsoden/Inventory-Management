import { NextRequest, NextResponse } from 'next/server';
import { BaseApiHandler } from '@/lib/base/BaseApiHandler';
import { TenantContext, UserRole } from '@/lib/types';
import { auditLogService } from '@/lib/audit';

class AuditLogHandler extends BaseApiHandler {
  protected async onGet(req: NextRequest, ctx: TenantContext): Promise<NextResponse> {
    const url = req.nextUrl;
    const page = parseInt(url.searchParams.get('page') ?? '1', 10);
    const pageSize = parseInt(url.searchParams.get('pageSize') ?? '25', 10);

    const sortField = url.searchParams.get('sortField') || 'createdAt';
    const sortDirection = url.searchParams.get('sortDirection') === 'asc' ? 'asc' : 'desc';

    const result = await auditLogService.query(
      ctx,
      {
        action: url.searchParams.get('action') || undefined,
        entity: url.searchParams.get('entity') || undefined,
        entityId: url.searchParams.get('entityId') || undefined,
        userId: url.searchParams.get('userId') || undefined,
        dateFrom: url.searchParams.get('dateFrom') || undefined,
        dateTo: url.searchParams.get('dateTo') || undefined,
        search: url.searchParams.get('search') || undefined,
      },
      page,
      pageSize,
      sortField,
      sortDirection,
    );

    // Reshape to match the existing client expectations: { data, total, ... }
    return this.success({
      data: result.rows.map((log) => ({
        id: log.id,
        userId: log.userId,
        userName: log.user?.name || 'System',
        userEmail: log.user?.email || '',
        action: log.action,
        entity: log.entity,
        entityId: log.entityId,
        details: log.details,
        ipAddress: log.ipAddress,
        createdAt: log.createdAt,
      })),
      total: result.total,
      page: result.page,
      pageSize: result.pageSize,
      totalPages: result.totalPages,
      filters: result.filters,
    });
  }
}

const handler = new AuditLogHandler();
export const GET = handler.handle('GET', { requiredRoles: [UserRole.ADMIN] });
