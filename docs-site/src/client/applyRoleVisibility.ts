// Hide Docusaurus navbar / footer / sidebar items that point to admin-only
// content when the visitor is not an authenticated ADMIN.
//
// The Next.js middleware already enforces this on the server (any request
// to /docs/admin/* without an ADMIN session is redirected). This module
// makes the client-side UI match: anonymous and non-admin viewers should
// not even see the links to admin-only pages.

const ADMIN_ONLY_PATTERNS = ['/admin/', '/admin', '/comparison'];

function isAdminOnlyHref(href: string | null): boolean {
  if (!href) return false;
  // Match both relative ("/admin/setup-wizard") and absolute URLs.
  let pathname = href;
  try {
    pathname = new URL(href, window.location.origin).pathname;
  } catch {
    // already a path
  }
  // Strip the Docusaurus baseUrl ("/docs") so the patterns match
  pathname = pathname.replace(/^\/docs/, '');
  return ADMIN_ONLY_PATTERNS.some((p) =>
    p.endsWith('/') ? pathname.startsWith(p) : pathname === p || pathname.startsWith(p + '/'),
  );
}

function hideAdminOnlyElements() {
  // Navbar links (desktop + mobile)
  const navLinks = document.querySelectorAll<HTMLAnchorElement>(
    '.navbar a.navbar__item, .navbar a.menu__link, .navbar__items a',
  );
  navLinks.forEach((a) => {
    if (isAdminOnlyHref(a.getAttribute('href'))) {
      const li = a.closest('li, .navbar__item');
      if (li && li !== a) {
        (li as HTMLElement).style.display = 'none';
      } else {
        a.style.display = 'none';
      }
    }
  });

  // Sidebar items
  const sidebarLinks = document.querySelectorAll<HTMLAnchorElement>(
    '.theme-doc-sidebar-container a, .menu__link',
  );
  sidebarLinks.forEach((a) => {
    if (isAdminOnlyHref(a.getAttribute('href'))) {
      const li = a.closest('li.menu__list-item');
      if (li) {
        (li as HTMLElement).style.display = 'none';
      } else {
        a.style.display = 'none';
      }
    }
  });

  // Footer links
  const footerLinks = document.querySelectorAll<HTMLAnchorElement>('.footer a');
  footerLinks.forEach((a) => {
    if (isAdminOnlyHref(a.getAttribute('href'))) {
      const li = a.closest('li');
      if (li) {
        (li as HTMLElement).style.display = 'none';
      } else {
        a.style.display = 'none';
      }
    }
  });

  // Homepage hero buttons
  const heroLinks = document.querySelectorAll<HTMLAnchorElement>('.button');
  heroLinks.forEach((a) => {
    if (isAdminOnlyHref(a.getAttribute('href'))) {
      a.style.display = 'none';
    }
  });
}

async function applyRoleVisibility() {
  try {
    const res = await fetch('/api/profile', {
      credentials: 'same-origin',
      headers: {Accept: 'application/json'},
    });
    if (res.ok) {
      const json = await res.json();
      const role = json?.data?.role;
      if (role === 'ADMIN') {
        // Admin sees everything: nothing to hide.
        return;
      }
    }
    // Either not authenticated or not an admin: hide everything admin-only.
    hideAdminOnlyElements();
    // Re-run after Docusaurus might have re-rendered (route change, theme toggle).
    setTimeout(hideAdminOnlyElements, 200);
    setTimeout(hideAdminOnlyElements, 800);
  } catch {
    // Network failure: assume non-admin and hide.
    hideAdminOnlyElements();
  }
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', applyRoleVisibility);
} else {
  applyRoleVisibility();
}
const originalPushStateRole = history.pushState;
history.pushState = function (...args) {
  const result = originalPushStateRole.apply(this, args);
  setTimeout(applyRoleVisibility, 50);
  return result;
};
window.addEventListener('popstate', () => setTimeout(applyRoleVisibility, 50));

export default {};
