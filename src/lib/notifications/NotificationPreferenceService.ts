import type { PrismaClient } from '@prisma/client';
import { SystemConfigRepository } from '@/lib/config/SystemConfigRepository';

export type NotificationPrefKey =
  | 'orderStatusChanges'
  | 'lowStockAlerts'
  | 'approvalRequests'
  | 'assetAssignments'
  | 'systemNotifications';

export type NotificationPrefs = Record<NotificationPrefKey, boolean>;

export const DEFAULT_NOTIFICATION_PREFS: NotificationPrefs = {
  orderStatusChanges: true,
  lowStockAlerts: true,
  approvalRequests: true,
  assetAssignments: true,
  systemNotifications: false,
};

/** Which email preference governs each Notification.type. */
const TYPE_TO_PREF: Record<string, NotificationPrefKey> = {
  APPROVAL_REQUIRED: 'approvalRequests',
  ORDER_STATUS: 'orderStatusChanges',
  PO_APPROVED: 'orderStatusChanges',
  PO_RECEIVED: 'orderStatusChanges',
  LOW_STOCK: 'lowStockAlerts',
  ASSET_ASSIGNED: 'assetAssignments',
  SYSTEM: 'systemNotifications',
  INFO: 'systemNotifications',
};

const CONFIG_KEY_PREFIX = 'notification_prefs_';

/**
 * Per-user email notification preferences (Settings > Notifications).
 * Stored as JSON in SystemConfig, one row per user.
 */
export class NotificationPreferenceService {
  private readonly repo: SystemConfigRepository;

  constructor(prisma: PrismaClient) {
    this.repo = new SystemConfigRepository(prisma);
  }

  async getForUser(userId: string): Promise<NotificationPrefs> {
    const row = await this.repo.findByKey(this.configKey(userId));
    if (!row?.value) return { ...DEFAULT_NOTIFICATION_PREFS };
    try {
      return { ...DEFAULT_NOTIFICATION_PREFS, ...JSON.parse(row.value) };
    } catch {
      return { ...DEFAULT_NOTIFICATION_PREFS };
    }
  }

  async saveForUser(userId: string, input: Record<string, unknown>): Promise<NotificationPrefs> {
    const prefs = await this.getForUser(userId);
    for (const [k, v] of Object.entries(input)) {
      if (k in DEFAULT_NOTIFICATION_PREFS && typeof v === 'boolean') {
        prefs[k as NotificationPrefKey] = v;
      }
    }
    await this.repo.upsert({
      key: this.configKey(userId),
      value: JSON.stringify(prefs),
      isSecret: false,
      category: 'notifications',
      description: `Notification preferences for user ${userId}`,
    });
    return prefs;
  }

  async wantsEmail(userId: string, type: string): Promise<boolean> {
    const pref = TYPE_TO_PREF[type] ?? 'systemNotifications';
    return (await this.getForUser(userId))[pref];
  }

  private configKey(userId: string): string {
    return `${CONFIG_KEY_PREFIX}${userId}`;
  }
}
