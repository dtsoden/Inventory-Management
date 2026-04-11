---
title: Notifications
sidebar_label: Notifications
---

# Notifications

Path: `/settings/notifications`. Source: `src/app/(authenticated)/settings/notifications/page.tsx`. API: `/api/settings/notifications`.

The Notifications page is where an administrator chooses which categories of platform events generate outbound email. There are five categories, each a simple on or off toggle. Every event Shane Inventory sends is also surfaced as an in app notification on the bell icon; the toggles on this page only control whether the event also becomes an email.

## Categories

The list comes from `NOTIFICATION_CATEGORIES` in the page source:

- **Order Status Changes** (`orderStatusChanges`): an email whenever a purchase order transitions state (submitted, approved, ordered, received, etc.). This is the noisiest category and should be on only if your workflow relies on email visibility into ordering.
- **Low Stock Alerts** (`lowStockAlerts`): an email whenever an item's on hand quantity drops below its `reorderPoint`. Useful for warehouse teams who want a nudge without checking the dashboard.
- **Approval Requests** (`approvalRequests`): an email to approvers when a purchase order is submitted and needs their approval. This toggle is now fully wired into the `submitOrder()` path (it was previously decorative). When a PO transitions from `DRAFT` to `PENDING_APPROVAL`, the system writes a `Notification` row for every active user in the tenant whose role is `ADMIN` or `PURCHASING_MANAGER`, and if this category is on, also sends the email. Keep this on if approvers do not live in the app.
- **Asset Assignments** (`assetAssignments`): an email to a user when an asset is assigned to them. Pairs with the asset tracking module.
- **System Notifications** (`systemNotifications`): platform updates and administrative announcements. Usually on.

Each row renders an icon, title, description, a saving spinner, and a toggle switch.

## SMTP gate

The entire page is gated on whether SMTP is configured. On mount the page calls `GET /api/settings/integrations?category=smtp_check`. The API returns `{ smtpConfigured: true | false }` based on whether the SMTP host is set in the vault.

- If SMTP is **not** configured, a yellow banner appears at the top of the page:

  > SMTP Not Configured
  >
  > Email notifications require SMTP settings to be configured.

  The banner has a button that jumps straight to `/settings/integrations?tab=smtp`. All category toggles are rendered at 50 percent opacity with pointer events disabled, so a click has no effect.

- If SMTP **is** configured, the toggles are interactive and the current preferences load from `GET /api/settings/notifications`.

A gear icon at the top right of the card is a shortcut to the SMTP tab regardless of the configured state.

## Saving preferences

Each toggle saves individually. When you flip a switch, the client optimistically updates local state and posts to `PUT /api/settings/notifications` with the full preferences object. The server persists to `SystemConfig` under a notification preferences category (per tenant).

If the save fails, the local state is rolled back and an error toast appears. This means you never see a stale UI state: the switch always reflects what is actually stored.

A small loader icon appears next to the switch while the save is in flight.

## Data model

Notification preferences are stored as boolean values in `SystemConfig`, one key per category (`orderStatusChanges`, `lowStockAlerts`, `approvalRequests`, `assetAssignments`, `systemNotifications`). They are not secret, so `isSecret = false`.

In app notifications themselves are written to the `Notification` table (see `prisma/schema.prisma`). Columns: `id`, `tenantId`, `userId`, `title`, `message`, `type`, `isRead`, `link`, `createdAt`. The notification bell in the header reads unread rows for the current user.

The email dispatcher reads the Notification row, checks the preference category, and if enabled, sends through SMTP. The in app notification is always created regardless of the email preference.

## Who receives what

Notifications are scoped by role and by explicit targeting:

- **Approval Requests** go to every active user whose role is `ADMIN` or `PURCHASING_MANAGER` in the tenant. The fan-out happens inside `PurchaseOrderService.submitOrder()` at the moment a PO transitions from `DRAFT` to `PENDING_APPROVAL`. Each recipient gets a `Notification` row with a `link` that opens the order detail page.
- **Order status changes for the requester**: when an approver runs Approve, Reject, or Revoke & Amend, the system writes a notification to the original requester (`PurchaseOrder.orderedBy`) so they see the decision in their bell. This is independent of the approvers' notifications and always fires, even if the email category is off.
- **Low Stock Alerts** go to users with a role that can see inventory (by default, all active users).
- **Order Status Changes** (email category) mirror the in-app order events: submitted, approved, rejected, revoked, sent to vendor, received, cancelled.
- **Asset Assignments** go to the user the asset was assigned to.
- **System Notifications** go to all admins.

These rules are enforced in the notification service, not in the Notifications UI. The UI only decides whether to emit email for a category that would otherwise fire as an in app notification.

## Deleting an in-app notification

Each user can dismiss notifications from their own bell dropdown. The dismiss action hits `DELETE /api/notifications/[id]`, which is owner-scoped: any authenticated user can call it, but the handler confirms that the target row's `userId` matches the caller before deleting. Approvers cannot dismiss notifications for other users, and there is no admin override endpoint. The row is hard-deleted (not soft-deleted) because the `Notification` table is a transient inbox, not an audit surface. The authoritative record of every approval, rejection, and revocation lives in the `AuditLog` table instead, see `admin/procurement-workflow`.

## Troubleshooting

Common issues:

- **The yellow banner never goes away.** SMTP is not configured or the check is failing. Open the Integrations page, complete the SMTP tab, and save. The check re-runs on page reload.
- **Toggles flip back on save.** The PUT call failed. Check the browser console for the error message and the server logs for details. The most common cause is a vault lock (the server cannot read SMTP credentials to validate the config). Unlock the vault from the Security page.
- **In app notifications appear but no email.** Either the category toggle is off, or the recipient does not match the targeting rules for that category, or the SMTP dispatcher hit an error. Server logs will have the SMTP response.
- **Too much email.** Turn off categories you do not need. Order Status Changes is the usual culprit.
