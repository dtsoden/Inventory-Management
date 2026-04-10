import { UserRole } from './types';

/**
 * Centralized role definitions with display names and permissions.
 *
 * All role dropdowns, permission checks, and UI elements read from this
 * single source. To add a new role or change permissions, update this
 * file only. Everything else inherits.
 */

export interface RoleDefinition {
  value: UserRole;
  label: string;
  description: string;
  permissions: Record<string, boolean>;
}

export const PERMISSIONS = [
  'dashboard',
  'vendors.view',
  'vendors.manage',
  'procurement.view',
  'procurement.create',
  'procurement.approve',
  'receiving',
  'inventory',
  'assistant',
  'settings',
  'audit_log',
  'user_management',
] as const;

export type Permission = (typeof PERMISSIONS)[number];

export const PERMISSION_LABELS: Record<Permission, string> = {
  'dashboard': 'Dashboard',
  'vendors.view': 'Vendors (view)',
  'vendors.manage': 'Vendors (manage)',
  'procurement.view': 'Procurement (view)',
  'procurement.create': 'Procurement (create/edit)',
  'procurement.approve': 'Procurement (approve)',
  'receiving': 'Receiving',
  'inventory': 'Inventory',
  'assistant': 'AI Assistant',
  'settings': 'Settings',
  'audit_log': 'Audit Log',
  'user_management': 'User Management',
};

export const ROLE_DEFINITIONS: RoleDefinition[] = [
  {
    value: UserRole.SUPER_ADMIN,
    label: 'Super Admin',
    description: 'Full platform access including tenant management',
    permissions: Object.fromEntries(PERMISSIONS.map((p) => [p, true])),
  },
  {
    value: UserRole.ORG_ADMIN,
    label: 'Org Admin',
    description: 'Full organization access including settings and users',
    permissions: Object.fromEntries(PERMISSIONS.map((p) => [p, true])),
  },
  {
    value: UserRole.MANAGER,
    label: 'Manager',
    description: 'Can manage vendors, create and approve orders, view reports',
    permissions: {
      'dashboard': true,
      'vendors.view': true,
      'vendors.manage': true,
      'procurement.view': true,
      'procurement.create': true,
      'procurement.approve': true,
      'receiving': true,
      'inventory': true,
      'assistant': true,
      'settings': false,
      'audit_log': false,
      'user_management': false,
    },
  },
  {
    value: UserRole.WAREHOUSE_STAFF,
    label: 'Warehouse Staff',
    description: 'Can receive shipments, scan assets, and view inventory',
    permissions: {
      'dashboard': true,
      'vendors.view': true,
      'vendors.manage': false,
      'procurement.view': true,
      'procurement.create': false,
      'procurement.approve': false,
      'receiving': true,
      'inventory': true,
      'assistant': true,
      'settings': false,
      'audit_log': false,
      'user_management': false,
    },
  },
];

/**
 * Get a role definition by its value.
 */
export function getRoleDefinition(role: string): RoleDefinition | undefined {
  return ROLE_DEFINITIONS.find((r) => r.value === role);
}

/**
 * Get the display label for a role.
 */
export function getRoleLabel(role: string): string {
  return getRoleDefinition(role)?.label ?? role;
}

/**
 * Check if a role has a specific permission.
 */
export function hasPermission(role: string, permission: Permission): boolean {
  const def = getRoleDefinition(role);
  return def?.permissions[permission] ?? false;
}
