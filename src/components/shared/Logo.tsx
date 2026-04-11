'use client';

import { Package } from 'lucide-react';
import { useTheme } from 'next-themes';
import { useBranding } from '@/components/providers/BrandingProvider';

interface LogoProps {
  collapsed?: boolean;
}

export function Logo({ collapsed = false }: LogoProps) {
  const { branding } = useBranding();
  const { resolvedTheme } = useTheme();

  const appName = branding.appName || 'Inventory';

  // Determine which logo to show based on locked theme mode or resolved theme.
  let effectiveTheme: 'light' | 'dark';
  if (branding.themeMode === 'dark') {
    effectiveTheme = 'dark';
  } else if (branding.themeMode === 'light') {
    effectiveTheme = 'light';
  } else {
    effectiveTheme = resolvedTheme === 'dark' ? 'dark' : 'light';
  }

  // Pick the logo for the effective theme, falling back to the other variant.
  const logoSrc =
    effectiveTheme === 'dark'
      ? branding.logoUrlDark || branding.logoUrlLight
      : branding.logoUrlLight || branding.logoUrlDark;

  // Logo area is exclusively for the logo image. No text here.
  // The app name only appears in the browser tab title.
  return (
    <div className="flex items-center justify-center" style={{ padding: '5px 0' }}>
      {logoSrc ? (
        <img
          src={logoSrc}
          alt={appName}
          className="shrink-0 object-contain"
          style={{
            maxHeight: collapsed ? '36px' : '46px',
            maxWidth: collapsed ? '36px' : '200px',
          }}
        />
      ) : (
        <div className="flex items-center gap-2">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-brand-green text-white">
            <Package className="h-5 w-5" />
          </div>
          {!collapsed && (
            <span className="text-lg font-bold tracking-tight truncate">
              {appName}
            </span>
          )}
        </div>
      )}
    </div>
  );
}
