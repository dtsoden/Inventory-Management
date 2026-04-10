'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard,
  Building2,
  ShoppingCart,
  PackageCheck,
  Boxes,
  Bot,
  ClipboardList,
  Settings,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useCurrentUser } from '@/hooks/useSession';
import { UserRole } from '@/lib/types';
import { Logo } from './Logo';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';

interface NavItem {
  label: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  roles?: UserRole[];
}

const navItems: NavItem[] = [
  { label: 'Dashboard', href: '/', icon: LayoutDashboard },
  { label: 'Vendors', href: '/vendors', icon: Building2 },
  { label: 'Procurement', href: '/procurement', icon: ShoppingCart },
  { label: 'Receiving', href: '/receiving', icon: PackageCheck },
  { label: 'Inventory', href: '/inventory', icon: Boxes },
  { label: 'AI Assistant', href: '/assistant', icon: Bot },
  {
    label: 'Audit Log',
    href: '/audit-log',
    icon: ClipboardList,
    roles: [UserRole.SUPER_ADMIN, UserRole.ORG_ADMIN],
  },
  {
    label: 'Settings',
    href: '/settings',
    icon: Settings,
    roles: [UserRole.SUPER_ADMIN, UserRole.ORG_ADMIN],
  },
];

export function Sidebar() {
  const [collapsed, setCollapsed] = useState(false);
  const pathname = usePathname();
  const user = useCurrentUser();

  const visibleItems = navItems.filter((item) => {
    if (!item.roles) return true;
    return user && item.roles.includes(user.role);
  });

  return (
    <TooltipProvider>
      <aside
        className={cn(
          'flex h-screen flex-col border-r bg-card transition-all duration-200',
          collapsed ? 'w-16' : 'w-64'
        )}
      >
        {/* Logo */}
        <div className="flex h-16 items-center border-b px-4">
          <Logo collapsed={collapsed} />
        </div>

        {/* Navigation */}
        <nav className="flex-1 space-y-1 overflow-y-auto p-2">
          {visibleItems.map((item) => {
            const isActive =
              item.href === '/'
                ? pathname === '/' || pathname === '/dashboard'
                : pathname.startsWith(item.href);

            const linkContent = (
              <Link
                href={item.href === '/' ? '/dashboard' : item.href}
                className={cn(
                  'flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors',
                  isActive
                    ? 'bg-brand-green/10 text-brand-green'
                    : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground',
                  collapsed && 'justify-center px-2'
                )}
              >
                <item.icon className="h-5 w-5 shrink-0" />
                {!collapsed && <span>{item.label}</span>}
              </Link>
            );

            if (collapsed) {
              return (
                <Tooltip key={item.href}>
                  <TooltipTrigger render={<div />}>
                    {linkContent}
                  </TooltipTrigger>
                  <TooltipContent side="right">{item.label}</TooltipContent>
                </Tooltip>
              );
            }

            return <div key={item.href}>{linkContent}</div>;
          })}
        </nav>

        {/* Collapse toggle */}
        <div className="border-t p-2">
          <button
            onClick={() => setCollapsed(!collapsed)}
            className="flex w-full items-center justify-center rounded-lg p-2 text-muted-foreground hover:bg-accent hover:text-accent-foreground"
          >
            {collapsed ? (
              <ChevronRight className="h-5 w-5" />
            ) : (
              <ChevronLeft className="h-5 w-5" />
            )}
          </button>
        </div>
      </aside>
    </TooltipProvider>
  );
}
