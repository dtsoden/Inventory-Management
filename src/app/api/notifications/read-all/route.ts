import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { requireTenantContext } from '@/lib/auth';
import { isAppError } from '@/lib/errors';
import type { ApiResponse } from '@/lib/types';

export async function PATCH() {
  try {
    const ctx = await requireTenantContext();

    await prisma.notification.updateMany({
      where: {
        tenantId: ctx.tenantId,
        userId: ctx.userId,
        isRead: false,
      },
      data: { isRead: true },
    });

    const body: ApiResponse = { success: true };
    return NextResponse.json(body);
  } catch (error: unknown) {
    if (isAppError(error)) {
      return NextResponse.json(
        { success: false, error: error.message, code: error.code },
        { status: error.statusCode }
      );
    }
    console.error('Unhandled error in PATCH /api/notifications/read-all:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}
