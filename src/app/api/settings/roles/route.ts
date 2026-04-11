import { NextRequest, NextResponse } from 'next/server';
import { BaseApiHandler } from '@/lib/base/BaseApiHandler';
import { TenantContext, UserRole } from '@/lib/types';
import { ValidationError, ForbiddenError, NotFoundError, AppError } from '@/lib/errors';
import { getDefaultRoles } from '@/lib/roles';
import { prisma } from '@/lib/db';
import { SystemConfigRepository } from '@/lib/config/SystemConfigRepository';

const SYSTEM_CONFIG_KEY = 'custom_roles';
const MAX_ROLES = 10;
const DEFAULT_ROLE_KEYS = ['ADMIN', 'MANAGER', 'PURCHASING_MANAGER', 'WAREHOUSE_STAFF'];

interface StoredRole {
  value: string;
  label: string;
  description: string;
  permissions: Record<string, boolean>;
}

const systemConfigRepo = new SystemConfigRepository(prisma);

async function loadRoles(): Promise<StoredRole[]> {
  const config = await systemConfigRepo.findByKey(SYSTEM_CONFIG_KEY);

  const codeDefaults = getDefaultRoles() as StoredRole[];
  const codeDefaultsByValue = new Map<string, StoredRole>(
    codeDefaults.map((r) => [r.value as string, r]),
  );

  if (!config) {
    await systemConfigRepo.upsert({
      key: SYSTEM_CONFIG_KEY,
      value: JSON.stringify(codeDefaults),
      isSecret: false,
      category: 'roles',
      description: 'Custom role definitions with permissions',
    });
    return codeDefaults;
  }

  const stored = JSON.parse(config.value) as StoredRole[];

  // Self-healing reconciliation: default roles always overwritten with
  // current code defaults; missing defaults inserted; custom roles kept.
  let mutated = false;
  const reconciled: StoredRole[] = [];
  const seenDefaults = new Set<string>();

  for (const role of stored) {
    if (codeDefaultsByValue.has(role.value)) {
      const fresh = codeDefaultsByValue.get(role.value)!;
      reconciled.push(fresh);
      seenDefaults.add(role.value);
      if (JSON.stringify(role) !== JSON.stringify(fresh)) mutated = true;
    } else {
      reconciled.push(role);
    }
  }
  for (const def of codeDefaults) {
    if (!seenDefaults.has(def.value)) {
      reconciled.push(def);
      mutated = true;
    }
  }

  if (mutated) {
    await systemConfigRepo.upsert({
      key: SYSTEM_CONFIG_KEY,
      value: JSON.stringify(reconciled),
      isSecret: false,
      category: 'roles',
      description: 'Custom role definitions with permissions',
    });
  }

  return reconciled;
}

async function saveRoles(roles: StoredRole[]): Promise<void> {
  await systemConfigRepo.upsert({
    key: SYSTEM_CONFIG_KEY,
    value: JSON.stringify(roles),
    isSecret: false,
    category: 'roles',
    description: 'Custom role definitions with permissions',
  });
}

class RolesHandler extends BaseApiHandler {
  protected async onGet(_req: NextRequest, _ctx: TenantContext): Promise<NextResponse> {
    const roles = await loadRoles();
    return this.success(roles);
  }

  protected async onPut(req: NextRequest, _ctx: TenantContext): Promise<NextResponse> {
    const body = await req.json();
    const { value, label, description, permissions } = body as StoredRole;

    if (!value || !label) throw new ValidationError('Role value and label are required');
    if (value === 'ADMIN') throw new ForbiddenError('ADMIN role cannot be modified');

    const roles = await loadRoles();
    const index = roles.findIndex((r) => r.value === value);
    if (index === -1) throw new NotFoundError('Role', value);

    roles[index] = { value, label, description, permissions };
    await saveRoles(roles);
    return this.success(roles);
  }

  protected async onPost(req: NextRequest, _ctx: TenantContext): Promise<NextResponse> {
    const body = await req.json();
    const { label, description } = body as { label: string; description: string };

    if (!label) throw new ValidationError('Role label is required');

    const roles = await loadRoles();
    if (roles.length >= MAX_ROLES) {
      throw new AppError(`Maximum of ${MAX_ROLES} roles allowed`, 400, 'MAX_ROLES');
    }

    const value = label.toUpperCase().replace(/[^A-Z0-9]+/g, '_').replace(/^_|_$/g, '');
    if (roles.some((r) => r.value === value)) {
      throw new ValidationError('A role with this name already exists');
    }

    const { PERMISSIONS } = await import('@/lib/roles');
    const permissions: Record<string, boolean> = {};
    for (const p of PERMISSIONS) permissions[p] = false;

    const newRole: StoredRole = { value, label, description: description || '', permissions };
    roles.push(newRole);
    await saveRoles(roles);
    return this.success(roles);
  }

  protected async onDelete(req: NextRequest, _ctx: TenantContext): Promise<NextResponse> {
    const value = req.nextUrl.searchParams.get('value');
    if (!value) throw new ValidationError('Role value is required');
    if (DEFAULT_ROLE_KEYS.includes(value)) {
      throw new ForbiddenError('Default roles cannot be deleted');
    }

    const roles = await loadRoles();
    const filtered = roles.filter((r) => r.value !== value);
    if (filtered.length === roles.length) throw new NotFoundError('Role', value);

    await saveRoles(filtered);
    return this.success(filtered);
  }
}

const handler = new RolesHandler();
export const GET = handler.handle('GET', { requiredRoles: [UserRole.ADMIN] });
export const PUT = handler.handle('PUT', { requiredRoles: [UserRole.ADMIN] });
export const POST = handler.handle('POST', { requiredRoles: [UserRole.ADMIN] });
export const DELETE = handler.handle('DELETE', { requiredRoles: [UserRole.ADMIN] });
