---
title: Branding
sidebar_label: Branding
---

# Branding

Path: `/settings` (the Branding tab on the Organization page). Source: `src/app/(authenticated)/settings/page.tsx`. Library: `src/lib/branding.ts`. API: `/api/settings/branding`, `/api/settings/branding/logo`, `/api/settings/branding/favicon`.

Shane Inventory is a white label application. Every visual identity value (app name, logo, favicon, primary color, theme mode) is stored in the tenant's settings JSON and rendered server side on every page load. There is no flash of unstyled content on first paint because the branding block is inlined into the HTML before the first byte hits the client.

## The branding shape

From `src/lib/branding.ts`:

```ts
export interface TenantBranding {
  appName: string;
  logoUrlLight: string | null;
  logoUrlDark: string | null;
  primaryColorLight: string;
  primaryColorDark: string;
  faviconUrl: string | null;
  themeMode: 'auto' | 'light' | 'dark';
}
```

The default values:

- `appName`: `"Inventory Management Platform"`. In practice this is always overwritten by the organization name set in the setup wizard or on the Organization tab. App name and organization name are a single source of truth.
- `primaryColorLight` and `primaryColorDark`: `#7ed321` (Shane green).
- `logoUrlLight`, `logoUrlDark`, `faviconUrl`: all `null`.
- `themeMode`: `auto`.

## Primary colors

Separate values exist for light and dark mode so a logo that looks great against white does not need to compromise on a dark background.

- Both are hex strings, validated by `isValidHexColor()` which accepts `#rgb` and `#rrggbb`.
- A native color picker (`<input type="color">`) and a text input are wired to the same state, so you can either pick visually or paste a hex.
- An inline swatch previews the color. If the hex is invalid, a red caption appears and the form cannot be saved until the color is valid.
- Colors are converted to HSL CSS values by `hexToHsl()` and injected as `--brand-color` style custom properties in the root layout. All ShadCN primary tokens resolve through this variable.

## Theme mode

Three choices, rendered as a three column pill group:

- **Auto**: the default. The user can toggle between light and dark at the top of the app, and the OS preference is respected on first load.
- **Light Only**: forces the app to light mode regardless of user or OS preference. The theme toggle disappears.
- **Dark Only**: same idea, forcing dark mode.

This is enforced by the server component that renders the HTML shell: if the mode is locked, the `class` attribute on `<html>` is set explicitly and the toggle control is not rendered.

## Logo upload

Separate upload zones for the light mode logo and the dark mode logo sit side by side. Each zone is a drag and drop target and a click to browse input. The light zone has a white background, the dark zone has a dark neutral background, so you can see exactly how the logo will look in context.

Constraints:

- **Accepted types**: PNG, JPG, SVG, WebP.
- **Max size**: 2 MB.
- Files are uploaded to `POST /api/settings/branding/logo`. The server writes the file into the `DATA_DIR` (`/app/data`) under a content hashed filename and returns the public URL. The URL is then saved into the branding JSON.
- A local preview using `FileReader` displays immediately while the upload is in flight.
- A small `X` button removes the logo without uploading a replacement; the branding record's URL field is set back to `null` on save.

If only one logo is uploaded (for example, just the light mode), the dark mode will fall back to it via backward compatibility logic in `parseBranding()`. That logic also respects the legacy single `logoUrl` field for databases that predate the split.

## Favicon upload

One upload slot, separate from the logos.

- **Accepted types**: ICO, PNG, JPG, SVG, WebP.
- **Max size**: 1 MB.
- **Recommended**: 32x32 or 64x64 pixels.
- Endpoint: `POST /api/settings/branding/favicon`.

The favicon URL is written into the document head on every page render. Browsers may cache favicons aggressively; a hard refresh (`Ctrl+Shift+R`) is sometimes needed to see the new icon.

## Saving

The Branding tab has its own **Save Branding** button. It only submits the branding payload, not the Organization Details fields. Saving validates the hex colors one more time, then sends the full `TenantBranding` object to `PUT /api/settings/branding`.

The API route merges the new branding into the existing `Tenant.settings` JSON via `mergeBrandingIntoSettings()`. Other JSON keys under `settings` are preserved untouched.

On success, the page calls `refreshBranding()` from `BrandingProvider`, which re-fetches the current branding and updates the running UI immediately. You do not need to reload the page to see color or logo changes.

## How server side rendering avoids the flash

The standard approach of reading branding in a client side hook causes a visible flash: the page renders with the default color, then snaps to the tenant's color a few milliseconds later. Shane Inventory avoids this by:

1. The authenticated layout (`src/app/(authenticated)/layout.tsx`) reads the tenant's settings from SQLite on every request.
2. `parseBranding()` parses the JSON and returns a `TenantBranding`.
3. The layout inlines the primary color as a CSS variable on the `<html>` element and sets the theme class explicitly based on `themeMode`.
4. The logo and favicon URLs are rendered into the HTML before the first byte ships.
5. By the time React hydrates on the client, the visual identity is already correct. No flash, no recoloring.

This is why the Organization Details and Branding tabs ship separately: editing the organization name propagates to `appName` because they share a source of truth, and the branding save path refreshes the provider without a full reload.

## Branding vs themes

Branding is not a theme selector for end users. It is tenant level chrome. End users never see a "pick a theme" option; they only see the chrome you chose. If the theme mode is `auto`, the individual user can toggle dark mode for themselves, but the colors and logo are still tenant controlled.
