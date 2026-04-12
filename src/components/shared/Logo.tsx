'use client';

import { useEffect, useState } from 'react';
import { Package } from 'lucide-react';
import { useTheme } from 'next-themes';
import { useBranding } from '@/components/providers/BrandingProvider';

interface LogoProps {
  collapsed?: boolean;
}

export function Logo({ collapsed = false }: LogoProps) {
  const { branding } = useBranding();
  const { resolvedTheme } = useTheme();

  // next-themes returns resolvedTheme: undefined on the server and during
  // first client render. Without the mounted guard the SSR'd markup falls
  // into the "light" branch and React keeps that markup after hydration,
  // so dark-mode users see the light logo until they manually re-render.
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  const appName = branding.appName || 'Inventory';

  // Determine which logo to show based on locked theme mode or resolved theme.
  let effectiveTheme: 'light' | 'dark';
  if (branding.themeMode === 'dark') {
    effectiveTheme = 'dark';
  } else if (branding.themeMode === 'light') {
    effectiveTheme = 'light';
  } else if (mounted) {
    effectiveTheme = resolvedTheme === 'dark' ? 'dark' : 'light';
  } else {
    // Pre-hydration: don't commit to a theme. Render an invisible placeholder
    // until mounted so we never bake the wrong logo into SSR markup.
    effectiveTheme = 'light';
  }

  // Pick the logo for the effective theme, falling back to the other variant.
  const logoSrc =
    effectiveTheme === 'dark'
      ? branding.logoUrlDark || branding.logoUrlLight
      : branding.logoUrlLight || branding.logoUrlDark;

  if (!mounted && branding.themeMode === 'auto') {
    // Reserve the same vertical space the real logo will occupy so the
    // sidebar layout doesn't shift on hydration.
    return (
      <div
        className="flex items-center justify-center"
        style={{ padding: '5px 0', height: collapsed ? '46px' : '56px' }}
        aria-hidden="true"
      />
    );
  }

  const faviconUrl = branding.faviconUrl;

  return (
    <div className="flex items-center justify-center" style={{ padding: '5px 0' }}>
      {collapsed ? (
        faviconUrl ? (
          <img
            src={faviconUrl}
            alt={appName}
            className="size-9 shrink-0 rounded object-contain"
          />
        ) : logoSrc ? (
          <img
            src={logoSrc}
            alt={appName}
            className="size-9 shrink-0 object-contain"
          />
        ) : (
          <div className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-brand-green text-white">
            <Package className="h-5 w-5" />
          </div>
        )
      ) : logoSrc ? (
        <img
          src={logoSrc}
          alt={appName}
          className="shrink-0 object-contain"
          style={{ maxHeight: '46px', maxWidth: '200px' }}
        />
      ) : (
        <div className="flex items-center gap-2">
          <div className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-brand-green text-white">
            <Package className="h-5 w-5" />
          </div>
          <span className="text-lg font-bold tracking-tight truncate">
            {appName}
          </span>
        </div>
      )}
    </div>
  );
}
