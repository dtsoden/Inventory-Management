import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { requireTenantContext } from '@/lib/auth';
import { isAppError } from '@/lib/errors';
import type { ApiResponse } from '@/lib/types';

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const ctx = await requireTenantContext();
    const { id } = await params;

    // Tenant + owner scoped delete so users can only remove their own
    // notifications.
    const notification = await prisma.notification.findFirst({
      where: { id, tenantId: ctx.tenantId, userId: ctx.userId },
      select: { id: true },
    });

    if (!notification) {
      return NextResponse.json(
        { success: false, error: 'Notification not found' },
        { status: 404 },
      );
    }

    await prisma.notification.delete({ where: { id } });

    const body: ApiResponse = { success: true };
    return NextResponse.json(body);
  } catch (error: unknown) {
    if (isAppError(error)) {
      return NextResponse.json(
        { success: false, error: error.message, code: error.code },
        { status: error.statusCode },
      );
    }
    console.error('DELETE /api/notifications/[id] error:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 },
    );
  }
}
