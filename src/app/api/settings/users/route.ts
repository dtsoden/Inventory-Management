import { NextRequest, NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import { prisma } from '@/lib/db';
import { requireTenantContext } from '@/lib/auth';
import { isAppError, ForbiddenError } from '@/lib/errors';
import { UserRole } from '@/lib/types';
import type { ApiResponse } from '@/lib/types';

export async function GET() {
  try {
    const ctx = await requireTenantContext();

    // Only admins can view users
    if (ctx.role !== UserRole.SUPER_ADMIN && ctx.role !== UserRole.ORG_ADMIN) {
      throw new ForbiddenError('Only admins can manage users');
    }

    const users = await prisma.user.findMany({
      where: { tenantId: ctx.tenantId },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        isActive: true,
        lastLoginAt: true,
        createdAt: true,
      },
      orderBy: { createdAt: 'desc' },
    });

    const body: ApiResponse = { success: true, data: users };
    return NextResponse.json(body);
  } catch (error: unknown) {
    if (isAppError(error)) {
      return NextResponse.json(
        { success: false, error: error.message, code: error.code },
        { status: error.statusCode }
      );
    }
    console.error('Unhandled error in GET /api/settings/users:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const ctx = await requireTenantContext();

    if (ctx.role !== UserRole.SUPER_ADMIN && ctx.role !== UserRole.ORG_ADMIN) {
      throw new ForbiddenError('Only admins can create users');
    }

    const data = await req.json();
    const { name, email, password, role } = data;

    if (!name || !email || !password) {
      return NextResponse.json(
        { success: false, error: 'Name, email, and password are required' },
        { status: 400 }
      );
    }

    if (password.length < 8) {
      return NextResponse.json(
        { success: false, error: 'Password must be at least 8 characters' },
        { status: 400 }
      );
    }

    // Check if email already exists
    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) {
      return NextResponse.json(
        { success: false, error: 'A user with this email already exists' },
        { status: 409 }
      );
    }

    // Cannot create SUPER_ADMIN via this route
    const validRole = role === 'SUPER_ADMIN' ? 'ORG_ADMIN' : role;

    const passwordHash = await bcrypt.hash(password, 10);

    const user = await prisma.user.create({
      data: {
        tenantId: ctx.tenantId,
        name,
        email,
        passwordHash,
        role: validRole || 'WAREHOUSE_STAFF',
      },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        isActive: true,
        createdAt: true,
      },
    });

    // Audit log
    await prisma.auditLog.create({
      data: {
        tenantId: ctx.tenantId,
        userId: ctx.userId,
        action: 'CREATE',
        entity: 'User',
        entityId: user.id,
        details: `Created user ${name} (${email}) with role ${validRole}`,
      },
    });

    const body: ApiResponse = { success: true, data: user };
    return NextResponse.json(body, { status: 201 });
  } catch (error: unknown) {
    if (isAppError(error)) {
      return NextResponse.json(
        { success: false, error: error.message, code: error.code },
        { status: error.statusCode }
      );
    }
    console.error('Unhandled error in POST /api/settings/users:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}
