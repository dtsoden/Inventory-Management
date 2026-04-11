import { BaseRepository } from '@/lib/base/BaseRepository';

export interface NotificationRecord {
  id: string;
  tenantId: string;
  userId: string;
  title: string;
  message: string;
  type: string;
  isRead: boolean;
  link: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface ListOwnerNotificationsOptions {
  page?: number;
  pageSize?: number;
  unreadOnly?: boolean;
}

export interface OwnerNotificationsPage {
  notifications: NotificationRecord[];
  unreadCount: number;
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

/**
 * Notifications are owner-scoped: every query filters by both tenantId
 * AND userId. The standard BaseRepository tenant scoping is preserved
 * (we still extend it for the contract), but the public methods on
 * this class always require userId as well so a malicious caller can
 * never read another user's notifications even within the same tenant.
 */
export class NotificationRepository extends BaseRepository<NotificationRecord> {
  protected get modelName(): string {
    return 'notification';
  }

  protected get hasIsActive(): boolean {
    return false;
  }

  async listForOwner(
    tenantId: string,
    userId: string,
    options: ListOwnerNotificationsOptions = {},
  ): Promise<OwnerNotificationsPage> {
    const page = Math.max(1, options.page ?? 1);
    const pageSize = Math.min(50, Math.max(1, options.pageSize ?? 20));

    const where: Record<string, unknown> = { tenantId, userId };
    if (options.unreadOnly) where.isRead = false;

    const [total, unreadCount, notifications] = await Promise.all([
      this.model.count({ where }),
      this.model.count({ where: { tenantId, userId, isRead: false } }),
      this.model.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
    ]);

    return {
      notifications,
      unreadCount,
      total,
      page,
      pageSize,
      totalPages: Math.ceil(total / pageSize),
    };
  }

  async findByIdForOwner(
    tenantId: string,
    userId: string,
    id: string,
  ): Promise<NotificationRecord | null> {
    return this.model.findFirst({
      where: { id, tenantId, userId },
    });
  }

  async createForOwner(
    tenantId: string,
    userId: string,
    data: {
      title: string;
      message: string;
      type?: string;
      link?: string | null;
    },
  ): Promise<NotificationRecord> {
    return this.model.create({
      data: {
        tenantId,
        userId,
        title: data.title,
        message: data.message,
        type: data.type ?? 'INFO',
        link: data.link ?? null,
      },
    });
  }

  async markRead(tenantId: string, userId: string, id: string): Promise<void> {
    await this.model.updateMany({
      where: { id, tenantId, userId },
      data: { isRead: true },
    });
  }

  async markAllReadForOwner(tenantId: string, userId: string): Promise<number> {
    const result = await this.model.updateMany({
      where: { tenantId, userId, isRead: false },
      data: { isRead: true },
    });
    return result.count;
  }

  async deleteForOwner(
    tenantId: string,
    userId: string,
    id: string,
  ): Promise<boolean> {
    const result = await this.model.deleteMany({
      where: { id, tenantId, userId },
    });
    return result.count > 0;
  }

  async clearReadForOwner(tenantId: string, userId: string): Promise<number> {
    const result = await this.model.deleteMany({
      where: { tenantId, userId, isRead: true },
    });
    return result.count;
  }
}
