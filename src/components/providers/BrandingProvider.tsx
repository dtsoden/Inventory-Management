'use client';

import {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
  type ReactNode,
} from 'react';
import { useTheme } from 'next-themes';
import type { TenantBranding } from '@/lib/branding';

interface BrandingContextValue {
  branding: TenantBranding;
  loading: boolean;
  refresh: () => Promise<void>;
}

const DEFAULT_BRANDING: TenantBranding = {
  appName: 'Inventory Management Platform',
  logoUrl: null,
  primaryColorLight: '#7ed321',
  primaryColorDark: '#7ed321',
  faviconUrl: null,
};

const BrandingContext = createContext<BrandingContextValue>({
  branding: DEFAULT_BRANDING,
  loading: true,
  refresh: async () => {},
});

export function useBranding() {
  return useContext(BrandingContext);
}

function hexToHsl(hex: string): string {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(
    hex.length === 4
      ? `#${hex[1]}${hex[1]}${hex[2]}${hex[2]}${hex[3]}${hex[3]}`
      : hex,
  );
  if (!result) return '0 0% 0%';

  const r = parseInt(result[1], 16) / 255;
  const g = parseInt(result[2], 16) / 255;
  const b = parseInt(result[3], 16) / 255;

  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  let h = 0;
  let s = 0;
  const l = (max + min) / 2;

  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    switch (max) {
      case r:
        h = ((g - b) / d + (g < b ? 6 : 0)) / 6;
        break;
      case g:
        h = ((b - r) / d + 2) / 6;
        break;
      case b:
        h = ((r - g) / d + 4) / 6;
        break;
    }
  }

  return `${Math.round(h * 360)} ${Math.round(s * 100)}% ${Math.round(l * 100)}%`;
}

function applyBrandingColors(branding: TenantBranding, isDark: boolean) {
  const root = document.documentElement;
  const color = isDark ? branding.primaryColorDark : branding.primaryColorLight;

  if (color) {
    root.style.setProperty('--brand-green', color);
    root.style.setProperty('--brand-green-light', color);
    root.style.setProperty('--brand-green-dark', color);
  }
}

function getInitialBranding(): TenantBranding {
  if (typeof window !== 'undefined' && (window as any).__BRANDING__) {
    const b = (window as any).__BRANDING__;
    return {
      appName: b.appName || DEFAULT_BRANDING.appName,
      logoUrl: b.logoUrl || null,
      primaryColorLight: b.primaryColorLight || DEFAULT_BRANDING.primaryColorLight,
      primaryColorDark: b.primaryColorDark || DEFAULT_BRANDING.primaryColorDark,
      faviconUrl: b.faviconUrl || null,
    };
  }
  return DEFAULT_BRANDING;
}

export function BrandingProvider({ children }: { children: ReactNode }) {
  const [branding, setBranding] = useState<TenantBranding>(getInitialBranding);
  const [loading, setLoading] = useState(false);
  const { resolvedTheme } = useTheme();

  const fetchBranding = useCallback(async () => {
    try {
      const res = await fetch('/api/settings/branding');
      const json = await res.json();
      if (json.success && json.data) {
        setBranding(json.data);
      }
    } catch {
      // Keep defaults on error
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchBranding();
  }, [fetchBranding]);

  // Apply CSS custom properties when branding or theme changes
  useEffect(() => {
    const isDark = resolvedTheme === 'dark';
    applyBrandingColors(branding, isDark);
  }, [branding, resolvedTheme]);

  // Update favicon link when branding changes
  useEffect(() => {
    const link =
      (document.querySelector('link[rel="icon"]') as HTMLLinkElement) ||
      document.createElement('link');
    link.rel = 'icon';
    link.href = `/api/favicon?t=${Date.now()}`;
    if (!document.querySelector('link[rel="icon"]')) {
      document.head.appendChild(link);
    }
  }, [branding.faviconUrl, branding.primaryColorLight]);

  // Update document title when appName changes
  useEffect(() => {
    if (branding.appName) {
      document.title = branding.appName;
    }
  }, [branding.appName]);

  return (
    <BrandingContext.Provider
      value={{ branding, loading, refresh: fetchBranding }}
    >
      {children}
    </BrandingContext.Provider>
  );
}
