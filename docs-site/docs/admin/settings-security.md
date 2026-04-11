---
title: Security
sidebar_label: Security
---

# Security

Path: `/settings/security`. Source: `src/app/(authenticated)/settings/security/page.tsx`. API: `/api/settings/integrations` (with `category=security` and `category=password_policy`).

The Security page is a three tab control surface covering CORS, sessions, and password policy. Vault and encryption management are discussed at the bottom of this page because they are operational concerns rather than UI surfaces.

## CORS tab

Controls which origins are allowed to make cross origin requests to the API.

- **Allowed Origins**: a comma separated list of origins, or `*` for permissive dev mode. The default value from the setup wizard is `*`.
- Persisted as `SystemConfig.security.corsOrigins`.
- Read by the middleware in `src/middleware.ts` which echoes matching origins back as `Access-Control-Allow-Origin` headers on preflight responses.

In production, list the exact origins you serve from. For the canonical deployment behind a Cloudflared tunnel, that is usually a single value like `https://shane-inventory.example.com`. A wildcard is fine for development but should never ship to production; it disables the same origin protections that keep hostile pages from hitting your API through a logged in user's browser.

Click **Save CORS Settings** to persist. Changes take effect on the next request; no restart needed.

## Sessions tab

Controls how long a user's session lasts before they are forced to sign in again.

- **Idle Timeout** (in minutes): default `480` (8 hours). Range `15` to `1440`. Persisted as `SystemConfig.security.sessionTimeout`.
- This value is read by NextAuth's JWT handler at sign in time and applied as the `maxAge` of the issued token.
- Changing the timeout does not invalidate existing sessions; it only affects new sessions issued after the save.

The caption explains: "Users will be automatically signed out after this period of inactivity." Inactivity is measured from the last request the user made, so a user working actively is not logged out mid task.

## Password Policy tab

Controls the requirements applied to passwords when they are set or changed.

- **Minimum Length**: number of characters. Default `8`, range `6` to `128`. Stored as `SystemConfig.password_policy.minLength`.
- **Require Uppercase Letters**: at least one `A-Z`. Default on. Stored as `requireUppercase`.
- **Require Lowercase Letters**: at least one `a-z`. Default on. Stored as `requireLowercase`.
- **Require Numbers**: at least one `0-9`. Default on. Stored as `requireNumbers`.
- **Require Special Characters**: at least one of `!@#$%^&*`. Default off. Stored as `requireSpecialChars`.

All four requirement flags are serialized as strings (`"true"` or `"false"`) in the config table to match the generic key value shape.

**Important**: policy changes apply only to new passwords. Users whose current passwords do not meet the new policy are not locked out. They will be forced to comply the next time they change their password.

The tab also shows a read only Encryption Info panel as a reference for auditors:

- **Hashing**: bcrypt (12 rounds)
- **Encryption**: AES-256-GCM
- **Key derivation**: PBKDF2 (600k iterations)

These values are hard coded in the application and cannot be changed from the UI. See `src/lib/encryption/EncryptionService.ts` and the bcrypt calls in `src/lib/auth.ts` for the source.

## Vault management

The Security UI currently exposes the user facing security knobs. The vault itself (the AES-256-GCM encryption service that protects every secret in `SystemConfig`) is managed outside the UI because its failure modes are operational.

### What the vault protects

Every row in `SystemConfig` with `isSecret = true` is stored as a base64 packed ciphertext (IV || ciphertext || auth tag). That includes:

- The OpenAI API key
- The SMTP password
- Any header tokens on external data sources
- Any future secret values added to the config table

### Unlocking the vault

Two paths exist:

1. **Environment variable**. Set `VAULT_KEY` in `docker-compose.yml` to the base64 derived key from your setup passphrase. The container unlocks automatically on startup and survives restarts without admin intervention. This is the standard production deployment.
2. **Admin passphrase**. If `VAULT_KEY` is not set, the first admin to sign in after a restart is prompted for the setup passphrase. The app derives the key, verifies it against the hash stored on `SetupState`, and holds the derived key in process memory.

If neither path succeeds, any feature that reads a secret (AI assistant, SMTP sender, data source sync) will fail with a "vault locked" error.

### Rotating the encryption passphrase

Rotating the root passphrase re-encrypts every secret row in place. The procedure:

1. Back up `data/inventory.db`.
2. Unlock the vault with the current passphrase if you have not already.
3. Call the rotation endpoint (administrative, not currently in the UI; run via an admin script) with the new passphrase.
4. The server derives the new key, reads every secret row with the old key, encrypts with the new key, and writes back in a single transaction.
5. The new derived key replaces the old one in memory; update `VAULT_KEY` in your compose file and restart if you are using env var unlock.

Until a rotation endpoint lands in the UI, this is a planned maintenance operation that should be scheduled with a backup window.

### Losing the passphrase

If you lose the passphrase and `VAULT_KEY` is not set anywhere else, the encrypted secrets are unrecoverable. The rest of the database (users, items, orders, assets) is still readable because only the `isSecret` rows use the vault. You can reset the vault by wiping `SystemConfig` rows where `isSecret = true` and re-entering each value from the UI, but you will lose whatever you cannot re-obtain from source (for example, an OpenAI key you never wrote down).

This is why step 1 of the setup wizard exists. Write the passphrase down.

## Audit log retention

Every action on a setting or a user writes a row to `AuditLog`. The table grows without bound by default. Retention is a planned feature; today the operational recommendation is to back up and truncate the table on a schedule if it grows past your comfort level. Indexes exist on `createdAt` so a `DELETE ... WHERE createdAt < ?` query is efficient.
