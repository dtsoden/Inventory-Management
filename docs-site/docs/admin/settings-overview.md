---
title: Settings Overview
sidebar_label: Settings Overview
---

# Settings Overview

The `/settings` area is the administrative control surface for a running Shane Inventory deployment. Every value that was collected during the setup wizard can be edited here, along with a few things the wizard does not expose (user management, password policy, custom roles, sample data, list customization).

The settings layout is a two column page: a left hand nav with seven tabs, and a content area that renders the selected tab. The nav lives in `src/app/(authenticated)/settings/layout.tsx` and is the same on every settings page.

## Left nav tabs

The seven tabs, in order:

1. **Organization** at `/settings`. Organization name, URL slug, and branding (colors, logos, favicon, theme mode). This is the landing page. Implemented in `src/app/(authenticated)/settings/page.tsx`.
2. **Users and Roles** at `/settings/users`. List, add, edit, deactivate, and delete users. Manage custom roles and per-role permissions. The platform ships with four default roles: `ADMIN`, `PURCHASING_MANAGER`, `MANAGER`, and `WAREHOUSE_STAFF`. Only `ADMIN` and `PURCHASING_MANAGER` can approve purchase orders; `MANAGER` lost that right for segregation-of-duties reasons (see `admin/procurement-workflow`). Source: `src/app/(authenticated)/settings/users/page.tsx`.
3. **Integrations** at `/settings/integrations`. OpenAI API key and model selection, SMTP configuration, and external data source management. Source: `src/app/(authenticated)/settings/integrations/page.tsx`.
4. **Notifications** at `/settings/notifications`. Per-user notification preference toggles (requires SMTP configured). Source: `src/app/(authenticated)/settings/notifications/page.tsx`.
5. **Security** at `/settings/security`. CORS allow list, session idle timeout, password policy. Source: `src/app/(authenticated)/settings/security/page.tsx`.
6. **Manage Lists** at `/settings/lists`. Customize item categories and add custom asset statuses or order statuses. Source: `src/app/(authenticated)/settings/lists/page.tsx`.
7. **Sample Data** at `/settings/sample-data`. Load or remove demo data for evaluation and testing. Source: `src/app/(authenticated)/settings/sample-data/page.tsx`.

There is also a nested route at `/settings/data-sources/new` which is reachable from the Integrations tab's "Add Data Source" wizard. See `admin/settings-data-sources`.

## Active tab highlighting

The layout uses `usePathname()` to highlight the active tab. A tab is considered active if the pathname starts with its href, except for the root `/settings` entry which requires an exact match so it does not light up on every subroute.

## Access control

Every `/settings/*` route requires an authenticated session. Most actions additionally require `ADMIN` role, enforced at the API layer in each route handler under `src/app/api/settings/*`. Non-admin users who reach a settings page will see the UI render but writes will be rejected with a 403.

The last admin protection (see `admin/settings-users`) is enforced on both the front end (disabling the destructive menu items) and the back end (the API will refuse the change).

## What lives where

For administrators cross referencing what a setting does to the database:

- Branding values are merged into `Tenant.settings` JSON via `mergeBrandingIntoSettings()` in `src/lib/branding.ts`.
- Organization name and slug update columns on the `Tenant` row.
- Integration, SMTP, and security values are key value rows in `SystemConfig`, grouped by `category` (`integrations`, `smtp`, `security`, `password_policy`, etc.). Rows with `isSecret = true` are encrypted by the vault before insert.
- User records live in `User`, scoped by `tenantId`.
- Custom role definitions live in `SystemConfig` under a dedicated category; see `admin/settings-users`.
- Custom statuses live in `SystemConfig` under the `lists` category.
- Sample data is tagged on creation so it can be found and removed as a unit.

See each individual settings page in this documentation for specifics.

## Reading and writing

All settings pages are client components that call API routes under `/api/settings/*`:

- `GET /api/settings/integrations?category=<name>` returns a plain JSON object of the key value pairs for that category.
- `PUT /api/settings/integrations` accepts `{ category, settings }` and upserts each key.
- Dedicated routes exist for branding (`/api/settings/branding`), users (`/api/settings/users`), roles (`/api/settings/roles`), data sources (`/api/settings/data-sources`), sample data (`/api/settings/sample-data`), lists (`/api/settings/lists`), and notifications (`/api/settings/notifications`).

Every write goes through `BaseApiHandler`, which checks the session, enforces the role requirement, writes the audit log, and returns the standard `{ success, data, error }` envelope.
