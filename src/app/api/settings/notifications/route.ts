import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { requireTenantContext } from '@/lib/auth';
import { isAppError } from '@/lib/errors';
import type { ApiResponse } from '@/lib/types';

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

export async function GET() {
  try {
    const ctx = await requireTenantContext();
    const key = configKey(ctx.userId);

    const config = await prisma.systemConfig.findUnique({
      where: { key },
    });

    let prefs = { ...DEFAULT_PREFS };
    if (config?.value) {
      try {
        prefs = { ...DEFAULT_PREFS, ...JSON.parse(config.value) };
      } catch {
        // If the stored value is invalid JSON, fall back to defaults
      }
    }

    const body: ApiResponse = { success: true, data: prefs };
    return NextResponse.json(body);
  } catch (error: unknown) {
    if (isAppError(error)) {
      return NextResponse.json(
        { success: false, error: error.message },
        { status: (error as { statusCode?: number }).statusCode ?? 500 }
      );
    }
    console.error('GET /api/settings/notifications error:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function PUT(req: NextRequest) {
  try {
    const ctx = await requireTenantContext();
    const key = configKey(ctx.userId);
    const body = await req.json();

    // Validate: only allow known preference keys with boolean values
    const prefs: Record<string, boolean> = {};
    for (const [k, v] of Object.entries(body)) {
      if (k in DEFAULT_PREFS && typeof v === 'boolean') {
        prefs[k] = v;
      }
    }

    await prisma.systemConfig.upsert({
      where: { key },
      create: {
        key,
        value: JSON.stringify(prefs),
        category: 'notifications',
        description: `Notification preferences for user ${ctx.userId}`,
      },
      update: {
        value: JSON.stringify(prefs),
      },
    });

    const response: ApiResponse = { success: true, data: prefs };
    return NextResponse.json(response);
  } catch (error: unknown) {
    if (isAppError(error)) {
      return NextResponse.json(
        { success: false, error: error.message },
        { status: (error as { statusCode?: number }).statusCode ?? 500 }
      );
    }
    console.error('PUT /api/settings/notifications error:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}
