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
import { NotificationPreferenceService } from './NotificationPreferenceService';
import { emailService, type EmailService } from '@/lib/email/email-service';

export interface NotificationPayload {
  type: string;
  title: string;
  message: string;
  link?: string | null;
}

/**
 * NotificationService keeps the owner-scoping rule (tenantId AND
 * userId) at the service layer so any caller has to come through it.
 *
 * The "owner" can either be the current request user (most cases) or
 * an explicit target user passed by a caller that wants to fan out
 * notifications to other users (PO submit, low-stock alerts, etc.).
 *
 * Every notification goes through here so it lands in the in-app bell
 * and, when SMTP is configured and the user's preference allows that
 * type, in their inbox as well.
 */
export class NotificationService extends BaseService<NotificationRecord> {
  private readonly notifRepo: NotificationRepository;
  private readonly prefs: NotificationPreferenceService;

  constructor(
    prisma: PrismaClient,
    private readonly mailer: EmailService = emailService,
  ) {
    const repo = new NotificationRepository(prisma);
    super(repo, prisma);
    this.notifRepo = repo;
    this.prefs = new NotificationPreferenceService(prisma);
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
    const created = await this.notifRepo.createForOwner(
      ctx.tenantId,
      data.userId ?? ctx.userId,
      { title, message, type: data.type, link: data.link ?? null },
    );
    await this.emailUsers([created.userId], {
      type: created.type,
      title,
      message,
      link: created.link,
    });
    return created;
  }

  /**
   * Fan a notification out to several users from inside a domain
   * service (no request context needed). Email failures are logged and
   * never block the business action that raised the notification.
   */
  async notifyUsers(
    tenantId: string,
    userIds: string[],
    payload: NotificationPayload,
  ): Promise<void> {
    const ids = [...new Set(userIds)];
    for (const userId of ids) {
      await this.notifRepo.createForOwner(tenantId, userId, {
        title: payload.title,
        message: payload.message,
        type: payload.type,
        link: payload.link ?? null,
      });
    }
    await this.emailUsers(ids, payload);
  }

  private async emailUsers(userIds: string[], payload: NotificationPayload): Promise<void> {
    try {
      if (!(await this.mailer.isConfigured())) return;
      const users = await this.prisma.user.findMany({
        where: { id: { in: userIds }, isActive: true },
        select: { id: true, email: true, name: true },
      });
      for (const user of users) {
        if (!(await this.prefs.wantsEmail(user.id, payload.type))) continue;
        try {
          await this.mailer.sendNotification({
            to: user.email,
            name: user.name,
            title: payload.title,
            message: payload.message,
            link: payload.link,
          });
        } catch (err) {
          console.error(`Notification email to ${user.email} failed:`, err);
        }
      }
    } catch (err) {
      console.error('Notification email dispatch failed:', err);
    }
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
