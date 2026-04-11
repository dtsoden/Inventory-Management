import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { requireTenantContext } from '@/lib/auth';
import { isAppError, ForbiddenError, ValidationError } from '@/lib/errors';
import { UserRole } from '@/lib/types';
import type { ApiResponse } from '@/lib/types';

export async function GET() {
  try {
    const ctx = await requireTenantContext();

    const categories = await prisma.itemCategory.findMany({
      where: { tenantId: ctx.tenantId },
      orderBy: { name: 'asc' },
      include: { _count: { select: { items: true } } },
    });

    const data = categories.map((c) => ({
      id: c.id,
      name: c.name,
      description: c.description,
      itemCount: c._count.items,
      createdAt: c.createdAt,
      updatedAt: c.updatedAt,
    }));

    const body: ApiResponse = { success: true, data };
    return NextResponse.json(body);
  } catch (error: unknown) {
    if (isAppError(error)) {
      return NextResponse.json(
        { success: false, error: error.message, code: error.code },
        { status: error.statusCode },
      );
    }
    console.error('GET /api/categories error:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 },
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const ctx = await requireTenantContext();

    if (ctx.role !== UserRole.ADMIN && ctx.role !== UserRole.MANAGER) {
      throw new ForbiddenError('Only admins or managers can create categories');
    }

    const body = await req.json();
    const { name, description } = body as { name?: string; description?: string };

    if (!name || !name.trim()) {
      throw new ValidationError('Category name is required');
    }

    const created = await prisma.itemCategory.create({
      data: {
        tenantId: ctx.tenantId,
        name: name.trim(),
        description: description?.trim() || null,
      },
    });

    const result: ApiResponse = { success: true, data: created };
    return NextResponse.json(result, { status: 201 });
  } catch (error: unknown) {
    if (isAppError(error)) {
      return NextResponse.json(
        { success: false, error: error.message, code: error.code },
        { status: error.statusCode },
      );
    }
    console.error('POST /api/categories error:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 },
    );
  }
}
