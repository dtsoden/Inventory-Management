'use client';

import { Package } from 'lucide-react';
import { useBranding } from '@/components/providers/BrandingProvider';

interface LogoProps {
  collapsed?: boolean;
}

export function Logo({ collapsed = false }: LogoProps) {
  const { branding } = useBranding();

  const appName = branding.appName || 'Inventory';

  return (
    <div className="flex items-center gap-2" style={{ padding: '5px 0' }}>
      {branding.logoUrl ? (
        <img
          src={branding.logoUrl}
          alt={appName}
          className="shrink-0 object-contain"
          style={{
            maxHeight: collapsed ? '36px' : '40px',
            maxWidth: collapsed ? '36px' : '160px',
          }}
        />
      ) : (
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-brand-green text-white">
          <Package className="h-5 w-5" />
        </div>
      )}
      {!collapsed && (
        <span className="text-lg font-bold tracking-tight truncate">
          {appName}
        </span>
      )}
    </div>
  );
}
