import type { PrismaClient } from '@prisma/client';
import { BaseService } from '@/lib/base/BaseService';
import { ValidationError, NotFoundError } from '@/lib/errors';
import { TenantContext } from '@/lib/types';
import {
  NotificationRepository,
  type NotificationRecord,
  type ListOwnerNotificationsOptions,
  type OwnerNotificationsPage,
} from './NotificationRepository';

/**
 * NotificationService keeps the owner-scoping rule (tenantId AND
 * userId) at the service layer so any caller has to come through it.
 *
 * The "owner" can either be the current request user (most cases) or
 * an explicit target user passed by a caller that wants to fan out
 * notifications to other users (PO submit, low-stock alerts, etc.).
 */
export class NotificationService extends BaseService<NotificationRecord> {
  private readonly notifRepo: NotificationRepository;

  constructor(prisma: PrismaClient) {
    const repo = new NotificationRepository(prisma);
    super(repo, prisma);
    this.notifRepo = repo;
  }

  protected get entityName(): string {
    return 'Notification';
  }

  // ----- Reads (always for the current user) -----

  async listForCurrentUser(
    ctx: TenantContext,
    options: ListOwnerNotificationsOptions = {},
  ): Promise<OwnerNotificationsPage> {
    return this.notifRepo.listForOwner(ctx.tenantId, ctx.userId, options);
  }

  async getOwnedById(
    ctx: TenantContext,
    id: string,
  ): Promise<NotificationRecord> {
    const n = await this.notifRepo.findByIdForOwner(ctx.tenantId, ctx.userId, id);
    if (!n) throw new NotFoundError('Notification', id);
    return n;
  }

  // ----- Writes -----

  /**
   * Create a notification for a target user. If targetUserId is omitted
   * the notification is created for the current request user.
   */
  async createForUser(
    ctx: TenantContext,
    data: {
      title?: string;
      message?: string;
      type?: string;
      link?: string | null;
      userId?: string;
    },
  ): Promise<NotificationRecord> {
    const title = (data.title ?? '').trim();
    const message = (data.message ?? '').trim();
    if (!title || !message) {
      throw new ValidationError('Title and message are required');
    }
    return this.notifRepo.createForOwner(
      ctx.tenantId,
      data.userId ?? ctx.userId,
      { title, message, type: data.type, link: data.link ?? null },
    );
  }

  async markRead(ctx: TenantContext, id: string): Promise<void> {
    // Verify ownership before mutating, to keep error messaging clean.
    const existing = await this.notifRepo.findByIdForOwner(
      ctx.tenantId,
      ctx.userId,
      id,
    );
    if (!existing) throw new NotFoundError('Notification', id);
    await this.notifRepo.markRead(ctx.tenantId, ctx.userId, id);
  }

  async markAllRead(ctx: TenantContext): Promise<number> {
    return this.notifRepo.markAllReadForOwner(ctx.tenantId, ctx.userId);
  }

  async deleteOwn(ctx: TenantContext, id: string): Promise<void> {
    const ok = await this.notifRepo.deleteForOwner(
      ctx.tenantId,
      ctx.userId,
      id,
    );
    if (!ok) throw new NotFoundError('Notification', id);
  }

  async clearRead(ctx: TenantContext): Promise<number> {
    return this.notifRepo.clearReadForOwner(ctx.tenantId, ctx.userId);
  }
}
