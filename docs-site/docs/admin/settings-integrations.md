---
title: Integrations
sidebar_label: Integrations
---

# Integrations

Path: `/settings/integrations`. Source: `src/app/(authenticated)/settings/integrations/page.tsx`. API: `/api/settings/integrations`, `/api/settings/ai-models`, `/api/settings/data-sources`.

The Integrations page is a three tab control surface for the external services Shane Inventory talks to: OpenAI (for the AI assistant and field mapping), SMTP (for email notifications), and the External Data Sources catalog. All secret values on this page are encrypted in `SystemConfig` before they hit disk.

## AI tab

### OpenAI API key

The first panel is the OpenAI key manager.

- **Display**: when a key is already configured, the current key is shown masked in the form `sk-abc1...xyz9`. The full key is never returned to the client, not even to admins. If you need the full value back, you must have stored it yourself; rotate if you have lost it.
- **Entry**: typing a new key into the input replaces the stored value on save. Clicking the eye icon toggles plaintext visibility for the value you are typing.
- **Persistence**: the key is saved via `PUT /api/settings/integrations` with `{ category: 'integrations', settings: { openaiApiKey: '...' } }`. The server encrypts with the vault and stores as a `SystemConfig` row with `isSecret = true`.
- **Masking**: after a successful save the client computes a local mask (`key.slice(0,7) + '...' + key.slice(-4)`) for display. This local mask is cosmetic; the authoritative masked value comes from the server on the next page load.

### Model picker

- On page load the component silently calls `GET /api/settings/ai-models`. That endpoint uses the currently stored OpenAI key to hit `/v1/models` on OpenAI and returns the list of models the key has access to.
- The list is bound to a ShadCN `Select` component. The current selected model is pulled from `SystemConfig.integrations.openaiModel` and defaults to `gpt-5.4-nano`.
- If the key is missing, invalid, or OpenAI is down, the fetch fails silently and the dropdown falls back to whatever was previously saved. No error toast is shown on initial load.
- Clicking **Save Model** persists the selection via the same `/api/settings/integrations` PUT route.

This double validation means a bad key surfaces two ways: an empty model dropdown, and the assistant returning an error when you actually try to use it.

## Data Sources tab

The Data Sources tab is where external catalog integrations live. Full details including the drag and drop field mapping wizard are covered in `admin/settings-data-sources`. The summary:

- A table lists every configured data source with its name, API URL, active toggle, last sync time, and last sync status.
- **Sync** triggers `POST /api/settings/data-sources/:id/sync`, which fetches the remote data, applies the saved field mapping, and upserts into `Item`.
- **Delete** removes the data source definition. It does not remove items that were previously imported.
- **Add Data Source** opens the five step wizard (name and URL, analyze schema, map fields with AI suggestions, preview, confirm).

## SMTP tab

Shane Inventory uses SMTP for outbound email notifications (low stock alerts, approval requests, order status changes). Everything lives in the `smtp` category of `SystemConfig`.

Fields:

- **Host** (`smtp_host`): FQDN of your mail server, e.g. `smtp.gmail.com` or `smtp.sendgrid.net`.
- **Port** (`smtp_port`): defaults to `587` for STARTTLS. Use `465` for implicit TLS or `25` for unencrypted (not recommended).
- **Username** (`smtp_user`): SMTP auth username.
- **Password** (`smtp_password`): SMTP auth password. Encrypted at rest. Toggle the eye icon to show while typing.
- **From Address** (`smtp_from`): the `From:` header that will appear on outbound emails. Usually something like `inventory@example.com`.

Clicking **Save SMTP** persists the category via `PUT /api/settings/integrations` with `category: 'smtp'`. There is a Test button that sends a one off test email to the current user's address to verify the configuration works before you turn on notifications for real.

When SMTP is not configured, the Notifications page shows a warning banner and all notification toggles are disabled. See `admin/settings-notifications`.

## Catalog API URL

The optional `catalogApiUrl` setting captured in the setup wizard is also surfaced here for later edits. It is persisted under the `integrations` category. The value is a single URL pointing at an external catalog service that Shane Inventory can query. Unlike the data sources feature, this is a legacy single URL integration kept for backward compatibility.

## How secrets are stored

Every secret value on this page (OpenAI API key, SMTP password) follows the same pipeline:

1. The client sends the plaintext value over HTTPS to the API route.
2. The API route calls `EncryptionService.encrypt()` using the in-memory vault key.
3. The resulting base64 packed blob (IV || ciphertext || auth tag) is written to the `SystemConfig.value` column.
4. The `SystemConfig.isSecret` column is set to `true` so other parts of the codebase know this value requires vault access to read.
5. When the app needs the value (for example, the AI assistant reading the OpenAI key), it reads the row, decrypts with the same vault key, and uses the plaintext only in memory.

If the vault is locked (no `VAULT_KEY` env var and no admin has unlocked with the passphrase since the container started), reads of secret rows fail and the integration features error out with a "vault locked" message. Unlock the vault from the Security page and the features come back online.

## Auditing

Every change on this page writes an `AuditLog` entry with the acting user, the category touched, and the keys modified. Plaintext values are never logged.
