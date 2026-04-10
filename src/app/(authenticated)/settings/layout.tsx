'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  Building2,
  Users,
  Plug,
  Bell,
  Shield,
} from 'lucide-react';
import { cn } from '@/lib/utils';

const settingsTabs = [
  { label: 'Organization', href: '/settings', icon: Building2 },
  { label: 'Users & Roles', href: '/settings/users', icon: Users },
  { label: 'Integrations', href: '/settings/integrations', icon: Plug },
  { label: 'Notifications', href: '/settings/notifications', icon: Bell },
  { label: 'Security', href: '/settings/security', icon: Shield },
];

export default function SettingsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();

  return (
    <div>
      <div className="page-header">
        <h1 className="page-title">Settings</h1>
      </div>

      <div className="mt-6 flex flex-col gap-6 lg:flex-row">
        {/* Sidebar tabs */}
        <nav className="w-full shrink-0 lg:w-56">
          <div className="card-base rounded-xl p-2">
            {settingsTabs.map((tab) => {
              const isActive =
                tab.href === '/settings'
                  ? pathname === '/settings'
                  : pathname.startsWith(tab.href);

              return (
                <Link
                  key={tab.href}
                  href={tab.href}
                  className={cn(
                    'flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors',
                    isActive
                      ? 'bg-brand-green/10 text-brand-green'
                      : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground'
                  )}
                >
                  <tab.icon className="h-4 w-4 shrink-0" />
                  {tab.label}
                </Link>
              );
            })}
          </div>
        </nav>

        {/* Content area */}
        <div className="flex-1 min-w-0">{children}</div>
      </div>
    </div>
  );
}
