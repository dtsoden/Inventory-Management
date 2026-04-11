import { NextRequest, NextResponse } from 'next/server';
import { BaseApiHandler } from '@/lib/base/BaseApiHandler';
import { TenantContext } from '@/lib/types';
import { prisma } from '@/lib/db';
import { SystemConfigRepository } from '@/lib/config/SystemConfigRepository';

const CONFIG_KEY_PREFIX = 'notification_prefs_';

function configKey(userId: string): string {
  return `${CONFIG_KEY_PREFIX}${userId}`;
}

const DEFAULT_PREFS: Record<string, boolean> = {
  orderStatusChanges: true,
  lowStockAlerts: true,
  approvalRequests: true,
  assetAssignments: true,
  systemNotifications: false,
};

const systemConfigRepo = new SystemConfigRepository(prisma);

class NotificationPrefsHandler extends BaseApiHandler {
  protected async onGet(_req: NextRequest, ctx: TenantContext): Promise<NextResponse> {
    const config = await systemConfigRepo.findByKey(configKey(ctx.userId));
    let prefs = { ...DEFAULT_PREFS };
    if (config?.value) {
      try {
        prefs = { ...DEFAULT_PREFS, ...JSON.parse(config.value) };
      } catch {
        // fall back to defaults if stored JSON is corrupt
      }
    }
    return this.success(prefs);
  }

  protected async onPut(req: NextRequest, ctx: TenantContext): Promise<NextResponse> {
    const body = await req.json();

    // Whitelist: only known boolean preference keys.
    const prefs: Record<string, boolean> = {};
    for (const [k, v] of Object.entries(body)) {
      if (k in DEFAULT_PREFS && typeof v === 'boolean') {
        prefs[k] = v;
      }
    }

    await systemConfigRepo.upsert({
      key: configKey(ctx.userId),
      value: JSON.stringify(prefs),
      isSecret: false,
      category: 'notifications',
      description: `Notification preferences for user ${ctx.userId}`,
    });

    return this.success(prefs);
  }
}

const handler = new NotificationPrefsHandler();
export const GET = handler.handle('GET');
export const PUT = handler.handle('PUT');
