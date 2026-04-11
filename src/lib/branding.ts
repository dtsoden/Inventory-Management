export type ThemeMode = 'auto' | 'light' | 'dark';

export interface TenantBranding {
  appName: string;
  logoUrlLight: string | null;
  logoUrlDark: string | null;
  primaryColorLight: string;
  primaryColorDark: string;
  faviconUrl: string | null;
  themeMode: ThemeMode;
}

export const DEFAULT_BRANDING: TenantBranding = {
  appName: 'Inventory Management Platform',
  logoUrlLight: null,
  logoUrlDark: null,
  primaryColorLight: '#7ed321',
  primaryColorDark: '#7ed321',
  faviconUrl: null,
  themeMode: 'auto',
};

function normalizeThemeMode(value: unknown): ThemeMode {
  if (value === 'light' || value === 'dark' || value === 'auto') return value;
  return 'auto';
}

/**
 * Parse tenant settings JSON and extract branding, falling back to defaults.
 * Preserves backward compatibility: if the legacy single `logoUrl` exists,
 * it is used for both light and dark logos.
 */
export function parseBranding(settingsJson: string | null | undefined): TenantBranding {
  if (!settingsJson) return { ...DEFAULT_BRANDING };
  try {
    const parsed = JSON.parse(settingsJson);
    const branding = parsed?.branding;
    if (!branding) return { ...DEFAULT_BRANDING };

    const legacyLogo: string | null = branding.logoUrl ?? null;
    const logoUrlLight: string | null =
      branding.logoUrlLight !== undefined ? branding.logoUrlLight : legacyLogo;
    const logoUrlDark: string | null =
      branding.logoUrlDark !== undefined ? branding.logoUrlDark : legacyLogo;

    return {
      appName: branding.appName || DEFAULT_BRANDING.appName,
      logoUrlLight: logoUrlLight ?? null,
      logoUrlDark: logoUrlDark ?? null,
      primaryColorLight: branding.primaryColorLight || DEFAULT_BRANDING.primaryColorLight,
      primaryColorDark: branding.primaryColorDark || DEFAULT_BRANDING.primaryColorDark,
      faviconUrl: branding.faviconUrl ?? null,
      themeMode: normalizeThemeMode(branding.themeMode),
    };
  } catch {
    return { ...DEFAULT_BRANDING };
  }
}

/**
 * Merge branding into an existing settings JSON string.
 */
export function mergeBrandingIntoSettings(
  existingSettingsJson: string | null | undefined,
  branding: TenantBranding,
): string {
  let existing: Record<string, unknown> = {};
  if (existingSettingsJson) {
    try {
      existing = JSON.parse(existingSettingsJson);
    } catch {
      existing = {};
    }
  }
  existing.branding = branding;
  return JSON.stringify(existing);
}

/**
 * Validate a hex color string (e.g. #ff0000 or #abc).
 */
export function isValidHexColor(color: string): boolean {
  return /^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/.test(color);
}

/**
 * Convert a hex color to an HSL string for CSS custom properties.
 * Returns "H S% L%" format (no parentheses or "hsl" prefix).
 */
export function hexToHsl(hex: string): string {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(
    hex.length === 4
      ? `#${hex[1]}${hex[1]}${hex[2]}${hex[2]}${hex[3]}${hex[3]}`
      : hex,
  );
  if (!result) return '0 0% 0%';

  let r = parseInt(result[1], 16) / 255;
  let g = parseInt(result[2], 16) / 255;
  let b = parseInt(result[3], 16) / 255;

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
