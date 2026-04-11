---
title: Users and Roles
sidebar_label: Users and Roles
---

# Users and Roles

Path: `/settings/users`. Source: `src/app/(authenticated)/settings/users/page.tsx`. API: `/api/settings/users` and `/api/settings/roles`.

The Users and Roles page is split into two tabs. The Users tab manages actual user accounts. The Roles tab manages the role definitions and per-role permissions that those users are assigned to.

## Roles

Shane Inventory ships with four default roles. They are defined in `src/lib/types.ts` and `src/lib/roles.ts` and used wherever role based gating happens.

- **ADMIN**: full access to everything including settings, users, vault, and integrations. Always has every permission. The permission switches are locked on the UI and cannot be edited. An `ADMIN` badge with a padlock icon marks this role in the selector.
- **PURCHASING_MANAGER**: approves purchase orders and receives approval-request notifications. Can also do everything a Manager can (manage vendors, manage the catalog, create and edit POs). Along with `ADMIN`, this is one of the two roles that can approve, reject, or revoke a purchase order.
- **MANAGER**: creates and edits purchase orders, manages vendors and catalog. Cannot approve POs (segregation of duties). Views reports. No access to settings or user management.
- **WAREHOUSE_STAFF**: receives shipments, scans assets, views inventory. The default role assigned to new users who are not explicitly promoted.

Only **ADMIN** and **PURCHASING_MANAGER** can act on the `procurement.approve` permission. The `MANAGER` role explicitly has `procurement.approve = false` so that the person who drafts a PO is not the same person who signs off on it. See `admin/procurement-workflow` for the full segregation-of-duties breakdown.

Additional custom roles can be added (up to ten total). Custom roles start with all permissions turned off and are editable freely. They can also be deleted, unlike the four defaults.

Role data is stored in `SystemConfig` under a dedicated category; the API serializes and deserializes through `src/lib/roles.ts`.

### Editing a role

1. Click any role pill at the top of the Roles tab. The selected role fills in the Role Name, Description, and Permissions panels below.
2. Toggle individual permission switches. The list of permissions comes from `PERMISSIONS` in `src/lib/roles.ts` with human labels from `PERMISSION_LABELS`.
3. Click **Save Role**. The `dirty` flag on the form only enables the Save button after you change something, so a stale click cannot overwrite a role.

Restrictions:

- The **ADMIN** role cannot be edited. Every switch is forced on and disabled.
- Default roles (`ADMIN`, `PURCHASING_MANAGER`, `MANAGER`, `WAREHOUSE_STAFF`) cannot be deleted. Custom roles show a trash icon next to the header.

### Creating a custom role

Click **Add Role** (the dashed pill at the end of the selector). A dialog asks for:

- **Role Name**: required. The machine key is derived by uppercasing, collapsing non alphanumerics to underscores, and trimming (so "Audit Reviewer" becomes `AUDIT_REVIEWER`).
- **Description**: optional.

The new role is created with all permissions off. Turn on what you need and hit Save.

## Users

The Users tab shows a table of every user in the tenant with their avatar initials, role badge, active status, last login, and an actions menu.

Columns:

- **User**: avatar (two letter initials from the display name), full name, email.
- **Role**: colored badge. `ADMIN` is the primary color, `PURCHASING_MANAGER` and `MANAGER` are the secondary, `WAREHOUSE_STAFF` is outlined.
- **Status**: Active or Inactive.
- **Last Login**: localized date or "Never".
- **Actions**: three dot menu.

### Adding a user

Click **Add User**. The dialog takes:

- **Full Name**: required.
- **Email**: required, validated for `@`.
- **Password**: required. The password policy (see `admin/settings-security`) determines minimum length and character class requirements. Default minimum is 8.
- **Role**: one of the defined roles, defaults to `WAREHOUSE_STAFF`.

On submit, `POST /api/settings/users` creates the row. The password is bcrypt hashed (12 rounds) before insert. Duplicate emails are rejected with a 409.

### Editing a user

Open the actions menu on a row and choose **Edit User**. The edit dialog shows first name, last name, email, and role. The current name is split on whitespace to populate the two name fields. Saving joins them back with a space.

- First name is required.
- Email is required.
- Role is editable unless the target user is the last active admin (see below).

### Deactivating and reactivating

The actions menu shows **Deactivate** for active users and **Reactivate** for inactive ones. Deactivation sets `isActive = false` but preserves the row. Deactivated users cannot log in but their historical audit log entries and purchase orders remain intact with their name attached.

### Deleting a user

The actions menu's **Delete** item issues a browser `confirm()` dialog and then `DELETE /api/settings/users/:id`. Despite the word "Delete," the UI treats this as a hard deactivation and the server may or may not hard delete depending on whether the user has historical references. In practice, a user with any audit log or order history will be preserved as a deactivated row to keep referential integrity.

### Last admin protection

This is the single most important safeguard on the page. The UI computes `activeAdminCount` from the currently loaded users. If a user is the only remaining active admin, the following are all disabled:

- The Deactivate menu item (with a toast explaining why).
- The Delete menu item (with a toast explaining why).
- The Role dropdown in the Edit dialog (with a caption explaining why).

The server enforces the same rule independently. An API client that bypasses the UI and tries to demote the last admin is rejected with a 400.

The rule is simple: if losing this user would leave the tenant with zero active admins, the action is refused. Create another admin first, then try again.

## Data model

Users are stored in the `User` table, defined in `prisma/schema.prisma`. Key columns:

- `id` UUID
- `tenantId` foreign key, every query is scoped by it
- `email` unique index
- `name`
- `passwordHash` bcrypt hash, never returned to the client
- `role` string, one of the role keys
- `isActive` boolean
- `avatarUrl` optional, added by a runtime migration (see `admin/runtime-migrations`)
- `lastLoginAt`, `createdAt`, `updatedAt`

Indexes exist on `tenantId` and `email` for the hot lookups.

## Auditing

Every create, update, and delete on a user writes an `AuditLog` row with the acting user, action (`user.create`, `user.update`, `user.delete`, `user.deactivate`), target entity, and a JSON diff of the changed fields. Password hashes are never logged.
