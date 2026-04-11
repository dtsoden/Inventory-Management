import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { requireTenantContext } from '@/lib/auth';
import { isAppError, ForbiddenError, NotFoundError, ValidationError } from '@/lib/errors';
import { UserRole } from '@/lib/types';
import type { ApiResponse } from '@/lib/types';

export async function GET(
  _req: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  try {
    const ctx = await requireTenantContext();
    const { id } = await context.params;

    const category = await prisma.itemCategory.findFirst({
      where: { id, tenantId: ctx.tenantId },
      include: { _count: { select: { items: true } } },
    });

    if (!category) {
      throw new NotFoundError('Category', id);
    }

    return NextResponse.json({ success: true, data: category });
  } catch (error: unknown) {
    if (isAppError(error)) {
      return NextResponse.json(
        { success: false, error: error.message, code: error.code },
        { status: error.statusCode },
      );
    }
    console.error('GET /api/categories/[id] error:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 },
    );
  }
}

export async function PUT(
  req: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  try {
    const ctx = await requireTenantContext();
    if (ctx.role !== UserRole.ADMIN && ctx.role !== UserRole.MANAGER) {
      throw new ForbiddenError('Only admins or managers can update categories');
    }

    const { id } = await context.params;
    const body = await req.json();
    const { name, description } = body as { name?: string; description?: string };

    const existing = await prisma.itemCategory.findFirst({
      where: { id, tenantId: ctx.tenantId },
    });
    if (!existing) {
      throw new NotFoundError('Category', id);
    }

    if (name !== undefined && !name.trim()) {
      throw new ValidationError('Category name cannot be empty');
    }

    const updated = await prisma.itemCategory.update({
      where: { id },
      data: {
        name: name?.trim() ?? existing.name,
        description: description !== undefined ? (description?.trim() || null) : existing.description,
      },
    });

    const result: ApiResponse = { success: true, data: updated };
    return NextResponse.json(result);
  } catch (error: unknown) {
    if (isAppError(error)) {
      return NextResponse.json(
        { success: false, error: error.message, code: error.code },
        { status: error.statusCode },
      );
    }
    console.error('PUT /api/categories/[id] error:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 },
    );
  }
}

export async function DELETE(
  _req: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  try {
    const ctx = await requireTenantContext();
    if (ctx.role !== UserRole.ADMIN && ctx.role !== UserRole.MANAGER) {
      throw new ForbiddenError('Only admins or managers can delete categories');
    }

    const { id } = await context.params;

    const existing = await prisma.itemCategory.findFirst({
      where: { id, tenantId: ctx.tenantId },
      include: { _count: { select: { items: true } } },
    });
    if (!existing) {
      throw new NotFoundError('Category', id);
    }

    if (existing._count.items > 0) {
      return NextResponse.json(
        { success: false, error: `Cannot delete category with ${existing._count.items} items. Reassign or remove items first.` },
        { status: 409 },
      );
    }

    await prisma.itemCategory.delete({ where: { id } });

    return NextResponse.json({ success: true });
  } catch (error: unknown) {
    if (isAppError(error)) {
      return NextResponse.json(
        { success: false, error: error.message, code: error.code },
        { status: error.statusCode },
      );
    }
    console.error('DELETE /api/categories/[id] error:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 },
    );
  }
}
