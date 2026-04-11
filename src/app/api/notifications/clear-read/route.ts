import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { requireTenantContext } from '@/lib/auth';
import { isAppError } from '@/lib/errors';
import type { ApiResponse } from '@/lib/types';

export async function POST() {
  try {
    const ctx = await requireTenantContext();

    // Tenant + user scoped bulk delete of already-read notifications.
    const result = await prisma.notification.deleteMany({
      where: {
        tenantId: ctx.tenantId,
        userId: ctx.userId,
        isRead: true,
      },
    });

    const body: ApiResponse = {
      success: true,
      data: { deleted: result.count },
    };
    return NextResponse.json(body);
  } catch (error: unknown) {
    if (isAppError(error)) {
      return NextResponse.json(
        { success: false, error: error.message, code: error.code },
        { status: error.statusCode },
      );
    }
    console.error('POST /api/notifications/clear-read error:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 },
    );
  }
}
