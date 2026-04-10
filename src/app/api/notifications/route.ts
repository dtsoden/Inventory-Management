import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { requireTenantContext } from '@/lib/auth';
import { isAppError } from '@/lib/errors';
import type { ApiResponse } from '@/lib/types';

export async function GET(req: NextRequest) {
  try {
    const ctx = await requireTenantContext();
    const url = req.nextUrl;

    const page = parseInt(url.searchParams.get('page') ?? '1', 10);
    const pageSize = parseInt(url.searchParams.get('pageSize') ?? '20', 10);
    const unreadOnly = url.searchParams.get('unreadOnly') === 'true';

    const where: Record<string, unknown> = {
      tenantId: ctx.tenantId,
      userId: ctx.userId,
    };

    if (unreadOnly) {
      where.isRead = false;
    }

    const safePage = Math.max(1, page);
    const safePageSize = Math.min(50, Math.max(1, pageSize));

    const [total, unreadCount, notifications] = await Promise.all([
      prisma.notification.count({ where }),
      prisma.notification.count({
        where: {
          tenantId: ctx.tenantId,
          userId: ctx.userId,
          isRead: false,
        },
      }),
      prisma.notification.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (safePage - 1) * safePageSize,
        take: safePageSize,
      }),
    ]);

    const body: ApiResponse = {
      success: true,
      data: {
        notifications,
        unreadCount,
        total,
        page: safePage,
        pageSize: safePageSize,
        totalPages: Math.ceil(total / safePageSize),
      },
    };
    return NextResponse.json(body);
  } catch (error: unknown) {
    if (isAppError(error)) {
      return NextResponse.json(
        { success: false, error: error.message, code: error.code },
        { status: error.statusCode }
      );
    }
    console.error('Unhandled error in GET /api/notifications:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const ctx = await requireTenantContext();
    const data = await req.json();

    const { title, message, type, userId, link } = data;

    if (!title || !message) {
      return NextResponse.json(
        { success: false, error: 'Title and message are required' },
        { status: 400 }
      );
    }

    const notification = await prisma.notification.create({
      data: {
        tenantId: ctx.tenantId,
        userId: userId || ctx.userId,
        title,
        message,
        type: type || 'INFO',
        link: link || null,
      },
    });

    const body: ApiResponse = { success: true, data: notification };
    return NextResponse.json(body, { status: 201 });
  } catch (error: unknown) {
    if (isAppError(error)) {
      return NextResponse.json(
        { success: false, error: error.message, code: error.code },
        { status: error.statusCode }
      );
    }
    console.error('Unhandled error in POST /api/notifications:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}
