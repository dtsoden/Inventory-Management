import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { requireTenantContext } from '@/lib/auth';
import { isAppError, ForbiddenError } from '@/lib/errors';
import { UserRole } from '@/lib/types';
import { getDefaultRoles } from '@/lib/roles';
import type { ApiResponse } from '@/lib/types';

const SYSTEM_CONFIG_KEY = 'custom_roles';
const MAX_ROLES = 10;
const DEFAULT_ROLE_KEYS = ['ADMIN', 'MANAGER', 'PURCHASING_MANAGER', 'WAREHOUSE_STAFF'];

interface StoredRole {
  value: string;
  label: string;
  description: string;
  permissions: Record<string, boolean>;
}

async function loadRoles(): Promise<StoredRole[]> {
  const config = await prisma.systemConfig.findUnique({
    where: { key: SYSTEM_CONFIG_KEY },
  });

  if (config) {
    return JSON.parse(config.value) as StoredRole[];
  }

  // Seed from defaults on first access
  const defaults = getDefaultRoles();
  await prisma.systemConfig.create({
    data: {
      key: SYSTEM_CONFIG_KEY,
      value: JSON.stringify(defaults),
      category: 'roles',
      description: 'Custom role definitions with permissions',
    },
  });
  return defaults;
}

async function saveRoles(roles: StoredRole[]): Promise<void> {
  await prisma.systemConfig.upsert({
    where: { key: SYSTEM_CONFIG_KEY },
    update: { value: JSON.stringify(roles) },
    create: {
      key: SYSTEM_CONFIG_KEY,
      value: JSON.stringify(roles),
      category: 'roles',
      description: 'Custom role definitions with permissions',
    },
  });
}

export async function GET() {
  try {
    const ctx = await requireTenantContext();
    if (ctx.role !== UserRole.ADMIN) {
      throw new ForbiddenError('Only admins can view roles');
    }

    const roles = await loadRoles();
    const body: ApiResponse = { success: true, data: roles };
    return NextResponse.json(body);
  } catch (error: unknown) {
    if (isAppError(error)) {
      return NextResponse.json(
        { success: false, error: error.message, code: (error as { code?: string }).code },
        { status: (error as { statusCode?: number }).statusCode ?? 500 },
      );
    }
    console.error('GET /api/settings/roles error:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 },
    );
  }
}

export async function PUT(req: NextRequest) {
  try {
    const ctx = await requireTenantContext();
    if (ctx.role !== UserRole.ADMIN) {
      throw new ForbiddenError('Only admins can manage roles');
    }

    const body = await req.json();
    const { value, label, description, permissions } = body as StoredRole;

    if (!value || !label) {
      return NextResponse.json(
        { success: false, error: 'Role value and label are required' },
        { status: 400 },
      );
    }

    if (value === 'ADMIN') {
      return NextResponse.json(
        { success: false, error: 'ADMIN role cannot be modified' },
        { status: 403 },
      );
    }

    const roles = await loadRoles();
    const index = roles.findIndex((r) => r.value === value);
    if (index === -1) {
      return NextResponse.json(
        { success: false, error: 'Role not found' },
        { status: 404 },
      );
    }

    roles[index] = { value, label, description, permissions };
    await saveRoles(roles);

    const resp: ApiResponse = { success: true, data: roles };
    return NextResponse.json(resp);
  } catch (error: unknown) {
    if (isAppError(error)) {
      return NextResponse.json(
        { success: false, error: error.message, code: (error as { code?: string }).code },
        { status: (error as { statusCode?: number }).statusCode ?? 500 },
      );
    }
    console.error('PUT /api/settings/roles error:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 },
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const ctx = await requireTenantContext();
    if (ctx.role !== UserRole.ADMIN) {
      throw new ForbiddenError('Only admins can manage roles');
    }

    const body = await req.json();
    const { label, description } = body as { label: string; description: string };

    if (!label) {
      return NextResponse.json(
        { success: false, error: 'Role label is required' },
        { status: 400 },
      );
    }

    const roles = await loadRoles();

    if (roles.length >= MAX_ROLES) {
      return NextResponse.json(
        { success: false, error: `Maximum of ${MAX_ROLES} roles allowed` },
        { status: 400 },
      );
    }

    // Generate a key from the label
    const value = label.toUpperCase().replace(/[^A-Z0-9]+/g, '_').replace(/^_|_$/g, '');

    if (roles.some((r) => r.value === value)) {
      return NextResponse.json(
        { success: false, error: 'A role with this name already exists' },
        { status: 400 },
      );
    }

    // Import PERMISSIONS to create a permissions map with all off
    const { PERMISSIONS } = await import('@/lib/roles');
    const permissions: Record<string, boolean> = {};
    for (const p of PERMISSIONS) {
      permissions[p] = false;
    }

    const newRole: StoredRole = { value, label, description: description || '', permissions };
    roles.push(newRole);
    await saveRoles(roles);

    const resp: ApiResponse = { success: true, data: roles };
    return NextResponse.json(resp);
  } catch (error: unknown) {
    if (isAppError(error)) {
      return NextResponse.json(
        { success: false, error: error.message, code: (error as { code?: string }).code },
        { status: (error as { statusCode?: number }).statusCode ?? 500 },
      );
    }
    console.error('POST /api/settings/roles error:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 },
    );
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const ctx = await requireTenantContext();
    if (ctx.role !== UserRole.ADMIN) {
      throw new ForbiddenError('Only admins can manage roles');
    }

    const { searchParams } = new URL(req.url);
    const value = searchParams.get('value');

    if (!value) {
      return NextResponse.json(
        { success: false, error: 'Role value is required' },
        { status: 400 },
      );
    }

    if (DEFAULT_ROLE_KEYS.includes(value)) {
      return NextResponse.json(
        { success: false, error: 'Default roles cannot be deleted' },
        { status: 403 },
      );
    }

    const roles = await loadRoles();
    const filtered = roles.filter((r) => r.value !== value);

    if (filtered.length === roles.length) {
      return NextResponse.json(
        { success: false, error: 'Role not found' },
        { status: 404 },
      );
    }

    await saveRoles(filtered);

    const resp: ApiResponse = { success: true, data: filtered };
    return NextResponse.json(resp);
  } catch (error: unknown) {
    if (isAppError(error)) {
      return NextResponse.json(
        { success: false, error: error.message, code: (error as { code?: string }).code },
        { status: (error as { statusCode?: number }).statusCode ?? 500 },
      );
    }
    console.error('DELETE /api/settings/roles error:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 },
    );
  }
}
