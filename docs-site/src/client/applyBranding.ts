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
  // Remove every existing favicon link so the browser can't fall back
  // to the static one Docusaurus baked into the HTML head.
  const existing = document.querySelectorAll<HTMLLinkElement>(
    'link[rel~="icon"], link[rel="shortcut icon"], link[rel="apple-touch-icon"], link[rel="mask-icon"]',
  );
  existing.forEach((l) => l.parentNode?.removeChild(l));

  // Append a fresh link with a cache-busting query so the browser refetches.
  const cacheBust = url.includes('?') ? `&_=${Date.now()}` : `?_=${Date.now()}`;
  const fresh = document.createElement('link');
  fresh.rel = 'icon';
  fresh.type = 'image/x-icon';
  fresh.href = url + cacheBust;
  document.head.appendChild(fresh);

  // Belt-and-suspenders: also drop in a shortcut-icon variant for older
  // browsers that ignore link[rel="icon"] when there's no shortcut alias.
  const shortcut = document.createElement('link');
  shortcut.rel = 'shortcut icon';
  shortcut.href = url + cacheBust;
  document.head.appendChild(shortcut);
}

function setNavbarLogo(lightUrl: string | null, darkUrl: string | null) {
  // Docusaurus renders the navbar logo as an <img>. React re-renders
  // the navbar on theme toggle and route change, which wipes any plain
  // `img.src` swap we did. We watch for those rerenders elsewhere and
  // call back into this function. CRITICAL: we must NOT touch the DOM
  // unless the value is actually changing, or the MutationObserver
  // that called us will re-fire and we'll spin forever.
  const imgs = document.querySelectorAll<HTMLImageElement>('.navbar__logo img');
  if (imgs.length === 0) return;
  const isDark = document.documentElement.dataset.theme === 'dark';
  const url = isDark ? darkUrl || lightUrl : lightUrl || darkUrl;
  if (!url) return;
  imgs.forEach((img) => {
    const currentSrc = img.getAttribute('src');
    if (img.hasAttribute('srcset')) {
      img.removeAttribute('srcset');
    }
    if (currentSrc !== url) {
      img.setAttribute('src', url);
    }
  });
}

function setNavbarTitle(name: string) {
  // Navbar shows the logo only, not a text title. We still update the
  // browser document title so the tab text reflects the tenant.
  if (document.title.includes('Inventory Management Platform')) {
    document.title = document.title.replace('Inventory Management Platform', name);
  }
  // Hide any residual title element if Docusaurus rendered one.
  // Guarded so we never re-touch the DOM and re-trigger our own observer.
  const titleEl = document.querySelector<HTMLElement>('.navbar__title');
  if (titleEl && titleEl.style.display !== 'none') {
    titleEl.style.display = 'none';
  }

  // Homepage hero heading
  const heroTitle = document.querySelector<HTMLElement>('.docs-home-hero-title');
  if (heroTitle && heroTitle.textContent !== name) {
    heroTitle.textContent = name;
  }
}

// Cache the branding response so re-application is instant and never
// blocked on a network round-trip.
let cachedBranding: PublicBranding | null = null;

function applyAll(branding: PublicBranding) {
  if (branding.appName) setNavbarTitle(branding.appName);
  if (branding.faviconUrl) setFavicon(branding.faviconUrl);
  setNavbarLogo(branding.logoUrlLight, branding.logoUrlDark);

  const isDark = document.documentElement.dataset.theme === 'dark';
  const color = isDark
    ? branding.primaryColorDark || branding.primaryColorLight
    : branding.primaryColorLight || branding.primaryColorDark;
  if (color) setPrimaryColor(color);
}

async function fetchAndApply() {
  try {
    const res = await fetch('/api/branding/public', {credentials: 'same-origin'});
    if (!res.ok) return;
    const json = await res.json();
    if (!json?.success || !json.data) return;
    cachedBranding = json.data;
    if (cachedBranding) applyAll(cachedBranding);
  } catch {
    // Network failure: leave the static defaults in place
  }
}

function reapplyFromCache() {
  if (cachedBranding) applyAll(cachedBranding);
}

// Coalesce observer-triggered reapplies into one per animation frame so
// we cannot possibly spin in a feedback loop with our own DOM mutations.
let reapplyScheduled = false;
function scheduleReapply() {
  if (reapplyScheduled) return;
  reapplyScheduled = true;
  requestAnimationFrame(() => {
    reapplyScheduled = false;
    reapplyFromCache();
  });
}

import ExecutionEnvironment from '@docusaurus/ExecutionEnvironment';

// SSR build runs this file in Node where `document` is undefined.
// Use Docusaurus's official ExecutionEnvironment guard which the
// minifier preserves correctly (the previous `typeof window` form
// got mangled into `"u" > typeof window`, a false comparison that
// silently disabled the entire script in production).
if (ExecutionEnvironment.canUseDOM) {

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', fetchAndApply);
} else {
  fetchAndApply();
}

// Re-apply when the user toggles dark mode so logo and color follow.
const themeObserver = new MutationObserver(() => {
  reapplyFromCache();
});
themeObserver.observe(document.documentElement, {
  attributes: true,
  attributeFilter: ['data-theme'],
});

// React re-renders the navbar on route change, theme toggle, hover
// state, and other internal updates. On the Docusaurus homepage React
// fully unmounts the navbar element and mounts a new one, which would
// orphan an observer attached to the old .navbar node. Attach the
// observer to the stable Docusaurus root container instead so it
// survives navbar replacement.
function attachNavbarObserver() {
  const root =
    document.getElementById('__docusaurus') ||
    document.body;
  if (!root) {
    requestAnimationFrame(attachNavbarObserver);
    return;
  }
  const navObserver = new MutationObserver(() => {
    scheduleReapply();
  });
  navObserver.observe(root, {
    childList: true,
    subtree: true,
    attributes: true,
    attributeFilter: ['src', 'srcset', 'class'],
  });
}
attachNavbarObserver();

// Belt-and-suspenders: reapply at fixed intervals during the first
// 3 seconds after load. The homepage in particular hydrates the
// navbar a few times after first paint and we want every render to
// land on the tenant logo, not the static default.
[100, 250, 500, 900, 1500, 2500].forEach((ms) => {
  setTimeout(reapplyFromCache, ms);
});

// Reapply on SPA route changes too (Docusaurus uses pushState).
const originalPushState = history.pushState;
history.pushState = function (...args) {
  const result = originalPushState.apply(this, args);
  setTimeout(reapplyFromCache, 50);
  setTimeout(reapplyFromCache, 250);
  return result;
};
window.addEventListener('popstate', () => {
  setTimeout(reapplyFromCache, 50);
  setTimeout(reapplyFromCache, 250);
});

} // end if (ExecutionEnvironment.canUseDOM)

export default {};
