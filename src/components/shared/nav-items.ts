import {
  LayoutDashboard,
  ClipboardCheck,
  Building2,
  ShoppingCart,
  PackageCheck,
  Boxes,
  Bot,
  Sparkles,
  ClipboardList,
  Settings,
} from 'lucide-react';
import { UserRole } from '@/lib/types';

export interface NavItem {
  label: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  roles?: UserRole[];
}

export const navItems: NavItem[] = [
  { label: 'Dashboard', href: '/', icon: LayoutDashboard },
  { label: 'My Tasks', href: '/tasks', icon: ClipboardCheck },
  { label: 'Vendors', href: '/vendors', icon: Building2 },
  { label: 'Purchase Orders', href: '/procurement', icon: ShoppingCart },
  { label: 'Receiving', href: '/receiving', icon: PackageCheck },
  { label: 'Inventory', href: '/inventory', icon: Boxes },
  { label: 'AI Assistant', href: '/assistant', icon: Bot },
  {
    label: 'AI Insights',
    href: '/insights',
    icon: Sparkles,
    roles: [UserRole.ADMIN, UserRole.MANAGER, UserRole.PURCHASING_MANAGER],
  },
  {
    label: 'Audit Log',
    href: '/audit-log',
    icon: ClipboardList,
    roles: [UserRole.ADMIN],
  },
  {
    label: 'Settings',
    href: '/settings',
    icon: Settings,
    roles: [UserRole.ADMIN],
  },
];

export function filterNavItemsByRole(
  items: NavItem[],
  role: UserRole | undefined,
): NavItem[] {
  return items.filter((item) => {
    if (!item.roles) return true;
    return role && item.roles.includes(role);
  });
}
