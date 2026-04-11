// Client-side branding sync for Docusaurus.
//
// Docusaurus is built statically at Docker build time, but the host app's
// branding (name, logo, favicon, colors) is set at runtime via the setup
// wizard. This module fetches /api/branding/public when each doc page
// loads and rewrites the favicon, navbar logo, document title, and
// primary color CSS variables to match the live tenant.

interface PublicBranding {
  appName: string;
  logoUrlLight: string | null;
  logoUrlDark: string | null;
  faviconUrl: string | null;
  primaryColorLight: string;
  primaryColorDark: string;
  themeMode: 'auto' | 'light' | 'dark';
}

function hexToHslComponents(hex: string): {h: number; s: number; l: number} | null {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(
    hex.length === 4
      ? `#${hex[1]}${hex[1]}${hex[2]}${hex[2]}${hex[3]}${hex[3]}`
      : hex,
  );
  if (!result) return null;

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

  return {h: Math.round(h * 360), s: Math.round(s * 100), l: Math.round(l * 100)};
}

function setPrimaryColor(hex: string) {
  const root = document.documentElement;
  // Docusaurus theme variables
  root.style.setProperty('--ifm-color-primary', hex);
  const hsl = hexToHslComponents(hex);
  if (!hsl) return;
  // Generate a sensible scale around the base color
  const shades: Array<[string, number]> = [
    ['--ifm-color-primary-darkest', -16],
    ['--ifm-color-primary-darker', -10],
    ['--ifm-color-primary-dark', -5],
    ['--ifm-color-primary', 0],
    ['--ifm-color-primary-light', 6],
    ['--ifm-color-primary-lighter', 10],
    ['--ifm-color-primary-lightest', 16],
  ];
  for (const [varName, lightnessDelta] of shades) {
    const l = Math.max(0, Math.min(100, hsl.l + lightnessDelta));
    root.style.setProperty(varName, `hsl(${hsl.h}, ${hsl.s}%, ${l}%)`);
  }
}

function setFavicon(url: string) {
  const links = document.querySelectorAll<HTMLLinkElement>(
    'link[rel="icon"], link[rel="shortcut icon"], link[rel="apple-touch-icon"]',
  );
  links.forEach((link) => {
    link.href = url;
  });
  if (links.length === 0) {
    const link = document.createElement('link');
    link.rel = 'icon';
    link.href = url;
    document.head.appendChild(link);
  }
}

function setNavbarLogo(lightUrl: string | null, darkUrl: string | null) {
  // Docusaurus renders the navbar logo as <img> elements. There are
  // typically two when both light and dark logos are configured, with
  // theme-aware classes. We replace whatever's there.
  const imgs = document.querySelectorAll<HTMLImageElement>('.navbar__logo img');
  if (imgs.length === 0) return;
  const isDark = document.documentElement.dataset.theme === 'dark';
  const url = isDark ? darkUrl || lightUrl : lightUrl || darkUrl;
  if (!url) return;
  imgs.forEach((img) => {
    img.src = url;
  });
}

function setNavbarTitle(name: string) {
  const titleEl = document.querySelector<HTMLElement>('.navbar__title');
  if (titleEl) titleEl.textContent = name;
  // Also update the document title where it includes the site name
  if (document.title.includes('Inventory Management Platform')) {
    document.title = document.title.replace('Inventory Management Platform', name);
  }
}

async function fetchAndApply() {
  try {
    const res = await fetch('/api/branding/public', {credentials: 'same-origin'});
    if (!res.ok) return;
    const json = await res.json();
    if (!json?.success || !json.data) return;
    const branding: PublicBranding = json.data;

    if (branding.appName) setNavbarTitle(branding.appName);
    if (branding.faviconUrl) setFavicon(branding.faviconUrl);
    setNavbarLogo(branding.logoUrlLight, branding.logoUrlDark);

    const isDark = document.documentElement.dataset.theme === 'dark';
    const color = isDark
      ? branding.primaryColorDark || branding.primaryColorLight
      : branding.primaryColorLight || branding.primaryColorDark;
    if (color) setPrimaryColor(color);
  } catch {
    // Network failure: leave the static defaults in place
  }
}

if (typeof window !== 'undefined') {
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', fetchAndApply);
  } else {
    fetchAndApply();
  }
  // Re-apply when the user toggles dark mode so logo and color follow
  const observer = new MutationObserver(() => {
    fetchAndApply();
  });
  observer.observe(document.documentElement, {
    attributes: true,
    attributeFilter: ['data-theme'],
  });
}

export default {};
