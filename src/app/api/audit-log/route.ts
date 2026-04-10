import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { requireTenantContext } from '@/lib/auth';
import { isAppError, ForbiddenError } from '@/lib/errors';
import { UserRole } from '@/lib/types';
import type { ApiResponse } from '@/lib/types';

export async function GET(req: NextRequest) {
  try {
    const ctx = await requireTenantContext();

    // Only admins can view audit logs
    if (ctx.role !== UserRole.ADMIN) {
      throw new ForbiddenError('Only admins can view audit logs');
    }

    const url = req.nextUrl;
    const page = parseInt(url.searchParams.get('page') ?? '1', 10);
    const pageSize = parseInt(url.searchParams.get('pageSize') ?? '25', 10);
    const action = url.searchParams.get('action') || undefined;
    const entity = url.searchParams.get('entity') || undefined;
    const entityId = url.searchParams.get('entityId') || undefined;
    const userId = url.searchParams.get('userId') || undefined;
    const dateFrom = url.searchParams.get('dateFrom') || undefined;
    const dateTo = url.searchParams.get('dateTo') || undefined;

    const where: Record<string, unknown> = { tenantId: ctx.tenantId };

    if (action) where.action = action;
    if (entity) where.entity = entity;
    if (entityId) where.entityId = entityId;
    if (userId) where.userId = userId;
    if (dateFrom || dateTo) {
      const createdAt: Record<string, Date> = {};
      if (dateFrom) createdAt.gte = new Date(dateFrom);
      if (dateTo) createdAt.lte = new Date(dateTo + 'T23:59:59.999Z');
      where.createdAt = createdAt;
    }

    const safePage = Math.max(1, page);
    const safePageSize = Math.min(100, Math.max(1, pageSize));

    const [total, logs] = await Promise.all([
      prisma.auditLog.count({ where }),
      prisma.auditLog.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (safePage - 1) * safePageSize,
        take: safePageSize,
        include: {
          user: { select: { name: true, email: true } },
        },
      }),
    ]);

    // Also get distinct values for filters
    const [actions, entities, users] = await Promise.all([
      prisma.auditLog
        .findMany({
          where: { tenantId: ctx.tenantId },
          select: { action: true },
          distinct: ['action'],
        })
        .then((rows) => rows.map((r) => r.action)),
      prisma.auditLog
        .findMany({
          where: { tenantId: ctx.tenantId },
          select: { entity: true },
          distinct: ['entity'],
        })
        .then((rows) => rows.map((r) => r.entity)),
      prisma.user
        .findMany({
          where: { tenantId: ctx.tenantId },
          select: { id: true, name: true },
          orderBy: { name: 'asc' },
        }),
    ]);

    const body: ApiResponse = {
      success: true,
      data: {
        data: logs.map((log) => ({
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
        total,
        page: safePage,
        pageSize: safePageSize,
        totalPages: Math.ceil(total / safePageSize),
        filters: { actions, entities, users },
      },
    };
    return NextResponse.json(body);
  } catch (error: unknown) {
    if (isAppError(error)) {
      return NextResponse.json(
        { success: false, error: error.message, code: error.code },
        { status: error.statusCode }
      );
    }
    console.error('Unhandled error in GET /api/audit-log:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}
