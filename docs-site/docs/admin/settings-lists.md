---
title: Manage Lists
sidebar_label: Manage Lists
---

# Manage Lists

Path: `/settings/lists`. Source: `src/app/(authenticated)/settings/lists/page.tsx`. API: `/api/categories` and `/api/settings/lists`.

The Manage Lists page is where an administrator curates the enumerated values that populate dropdowns across the rest of the application: item categories, asset statuses, order statuses, user roles, and notification types. Some of these lists are hard coded (canonical values the platform's business logic depends on) and some are extensible (where you can add your own values).

## Item Categories

The first section manages `ItemCategory` rows. Categories are fully user defined. Each has:

- **Name**: required, displayed everywhere categories appear.
- **Description**: optional, a short explanation of what belongs in the category.
- **Parent**: optional, for hierarchical taxonomies. Self references and cycles are rejected.
- **Item count**: computed, shows how many items reference this category.

Add, rename, reparent, and delete work through the usual CRUD buttons. Deleting a category sets `categoryId` on referencing items to `NULL` (`onDelete: SetNull` in the schema), so items are not deleted along with their category.

Data model: `ItemCategory` in `prisma/schema.prisma` with a self reference on `parentId`. Indexes on `tenantId` and `parentId`.

## Asset Statuses

Asset statuses describe the lifecycle of an individual physical asset. Five **default** statuses ship out of the box, all read only:

- **AVAILABLE**: in stock and ready to be assigned.
- **ASSIGNED**: currently assigned to a person.
- **IN_MAINTENANCE**: being repaired or serviced.
- **RETIRED**: decommissioned and no longer in use.
- **LOST**: cannot be located or accounted for.

These five are referenced directly in service code (for example, the dashboard widgets that count available assets) and cannot be deleted or renamed. Each is shown with a badge and a short description in the list section of the page.

You can add **custom** asset statuses on top of the defaults. Click **Add Asset Status**, type a name, and it is appended to the custom list. Custom statuses are stored in `SystemConfig` under a dedicated list key; the API surface is `GET /api/settings/lists` returning `{ assetStatuses: { defaults, custom }, orderStatuses: { defaults, custom } }`. Custom statuses appear in the asset status dropdown on the asset edit page, alongside the defaults, and can be deleted from here without touching any assets that already reference them (the asset simply retains the old value as a free form string).

## Order Statuses

Order statuses describe where a purchase order sits in its procurement workflow. The seven **default** statuses:

- **DRAFT**: being prepared, not yet submitted.
- **PENDING_APPROVAL**: submitted and awaiting manager approval.
- **APPROVED**: approved, ready to send to vendor.
- **SUBMITTED**: sent to the vendor.
- **PARTIALLY_RECEIVED**: some line items received.
- **RECEIVED**: all line items received.
- **CANCELLED**: cancelled.

These are also read only. They correspond to the state machine enforced by `PurchaseOrderService`; arbitrary additions cannot participate in the service's transition guards.

**Custom** order statuses work like asset statuses: you can add them as cosmetic labels, but they do not plug into the approval workflow. They are useful if your process has a checkpoint that does not fit the defaults (for example, "Pending Finance Review") and you want to surface it on the order page.

## User Roles

A read only reference list of the role constants the platform uses. Defaults are **ADMIN**, **MANAGER**, and **WAREHOUSE_STAFF**, with the same descriptions shown on the Users and Roles page.

This section is informational. To add, edit, or delete custom roles, go to `/settings/users` and use the Roles tab there. See `admin/settings-users`.

## Notification Types

A read only reference list of the notification type constants (`ORDER_STATUS`, `LOW_STOCK`, `APPROVAL_REQUIRED`, `ASSET_ASSIGNED`, `SYSTEM`). These values appear on the `Notification.type` column and are used by the notification service to pick the right template and toggle.

This section is informational. To change which notification types send email, go to `/settings/notifications`. See `admin/settings-notifications`.

## Why some lists are editable and others are not

The platform distinguishes two kinds of lists:

1. **Data driven lists** like item categories. The business logic does not care what the value is; it only stores it and renders it. These are fully editable.
2. **State machine lists** like asset and order statuses. The business logic has transition rules, widgets, and reports keyed on specific values. The defaults cannot be removed because removing them would break those rules. Additions are allowed as cosmetic labels only.

If you find yourself wanting a new order status that actually participates in the workflow (for example, a new approval step), that is a feature request, not a list change. Open an issue or talk to engineering.

## Saving

- **Categories** use the generic `/api/categories` route and save per operation (add, edit, delete fires its own request).
- **Custom asset statuses** and **custom order statuses** save to `/api/settings/lists` via a PUT with the full custom arrays. The server replaces the stored arrays wholesale.

There is no global Save button on the page; each list manages its own saves so you cannot lose work if you navigate away mid edit.
