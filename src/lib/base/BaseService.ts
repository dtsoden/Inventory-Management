import { PrismaClient } from '@prisma/client';
import { TenantContext, PaginatedResult } from '@/lib/types';
import { NotFoundError } from '@/lib/errors';
import { BaseRepository, FindAllOptions } from './BaseRepository';

export abstract class BaseService<T = unknown> {
  constructor(
    protected readonly repository: BaseRepository<T>,
    protected readonly prisma: PrismaClient
  ) {}

  protected abstract get entityName(): string;

  async list(
    ctx: TenantContext,
    options?: FindAllOptions
  ): Promise<PaginatedResult<T>> {
    return this.repository.findAll(ctx.tenantId, options);
  }

  async getById(ctx: TenantContext, id: string): Promise<T | null> {
    return this.repository.findById(ctx.tenantId, id);
  }

  async getByIdOrThrow(ctx: TenantContext, id: string): Promise<T> {
    const entity = await this.repository.findById(ctx.tenantId, id);
    if (!entity) {
      throw new NotFoundError(this.entityName, id);
    }
    return entity;
  }

  async create(ctx: TenantContext, data: Record<string, unknown>): Promise<T> {
    const entity = await this.repository.create(ctx.tenantId, data);
    await this.logAudit(ctx, 'CREATE', (entity as any).id, { data });
    return entity;
  }

  async update(
    ctx: TenantContext,
    id: string,
    data: Record<string, unknown>
  ): Promise<T> {
    const before = await this.getByIdOrThrow(ctx, id);
    const after = await this.repository.update(ctx.tenantId, id, data);
    await this.logAudit(ctx, 'UPDATE', id, { before, after });
    return after;
  }

  async delete(ctx: TenantContext, id: string): Promise<T> {
    const entity = await this.repository.softDelete(ctx.tenantId, id);
    await this.logAudit(ctx, 'DELETE', id);
    return entity;
  }

  async count(
    ctx: TenantContext,
    where?: Record<string, unknown>
  ): Promise<number> {
    return this.repository.count(ctx.tenantId, where);
  }

  protected async logAudit(
    ctx: TenantContext,
    action: string,
    entityId: string,
    details?: Record<string, unknown>
  ): Promise<void> {
    try {
      await (this.prisma as any).auditLog.create({
        data: {
          tenantId: ctx.tenantId,
          userId: ctx.userId,
          action,
          entity: this.entityName,
          entityId,
          details: details ? JSON.stringify(details) : undefined,
          ipAddress: ctx.ipAddress,
        },
      });
    } catch {
      // Audit logging should not break the main operation
      console.error('Failed to write audit log:', action, entityId);
    }
  }
}
