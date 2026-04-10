import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { requireTenantContext } from '@/lib/auth';
import { isAppError, ForbiddenError, NotFoundError } from '@/lib/errors';
import { UserRole } from '@/lib/types';
import type { ApiResponse } from '@/lib/types';

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const ctx = await requireTenantContext();
    const { id } = await params;

    if (ctx.role !== UserRole.ADMIN) {
      throw new ForbiddenError('Only admins can update users');
    }

    // Verify user belongs to the same tenant
    const existingUser = await prisma.user.findFirst({
      where: { id, tenantId: ctx.tenantId },
    });

    if (!existingUser) {
      throw new NotFoundError('User', id);
    }

    const data = await req.json();
    const updateData: Record<string, unknown> = {};

    if (data.role !== undefined) {
      // Only admins can assign ADMIN role
      if (data.role === 'ADMIN' && ctx.role !== UserRole.ADMIN) {
        throw new ForbiddenError('Cannot assign ADMIN role');
      }
      updateData.role = data.role;
    }

    if (data.isActive !== undefined) {
      // Cannot deactivate yourself
      if (id === ctx.userId) {
        return NextResponse.json(
          { success: false, error: 'Cannot deactivate your own account' },
          { status: 400 }
        );
      }
      updateData.isActive = data.isActive;
    }

    const updatedUser = await prisma.user.update({
      where: { id },
      data: updateData,
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        isActive: true,
        lastLoginAt: true,
        createdAt: true,
      },
    });

    // Audit log
    const changes = Object.entries(updateData)
      .map(([key, value]) => `${key}: ${value}`)
      .join(', ');

    await prisma.auditLog.create({
      data: {
        tenantId: ctx.tenantId,
        userId: ctx.userId,
        action: 'UPDATE',
        entity: 'User',
        entityId: id,
        details: `Updated user ${existingUser.name}: ${changes}`,
      },
    });

    const body: ApiResponse = { success: true, data: updatedUser };
    return NextResponse.json(body);
  } catch (error: unknown) {
    if (isAppError(error)) {
      return NextResponse.json(
        { success: false, error: error.message, code: error.code },
        { status: error.statusCode }
      );
    }
    console.error('Unhandled error in PUT /api/settings/users/[id]:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const ctx = await requireTenantContext();
    const { id } = await params;

    if (ctx.role !== UserRole.ADMIN) {
      throw new ForbiddenError('Only admins can delete users');
    }

    if (id === ctx.userId) {
      return NextResponse.json(
        { success: false, error: 'Cannot delete your own account' },
        { status: 400 }
      );
    }

    const existingUser = await prisma.user.findFirst({
      where: { id, tenantId: ctx.tenantId },
    });

    if (!existingUser) {
      throw new NotFoundError('User', id);
    }

    // Soft delete by deactivating
    await prisma.user.update({
      where: { id },
      data: { isActive: false },
    });

    await prisma.auditLog.create({
      data: {
        tenantId: ctx.tenantId,
        userId: ctx.userId,
        action: 'DELETE',
        entity: 'User',
        entityId: id,
        details: `Deactivated user ${existingUser.name} (${existingUser.email})`,
      },
    });

    const body: ApiResponse = { success: true, message: 'User deactivated' };
    return NextResponse.json(body);
  } catch (error: unknown) {
    if (isAppError(error)) {
      return NextResponse.json(
        { success: false, error: error.message, code: error.code },
        { status: error.statusCode }
      );
    }
    console.error('Unhandled error in DELETE /api/settings/users/[id]:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}
