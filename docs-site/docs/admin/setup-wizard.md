---
title: Initial Setup Wizard
sidebar_label: Setup Wizard
---

# Initial Setup Wizard

The setup wizard runs once, on the very first load of a fresh Shane Inventory deployment. It collects everything the platform needs to boot: encryption passphrase, admin credentials, organization identity, branding, integration keys, and CORS. When it finishes it flips `SetupState.isSetupComplete` to `true` and the wizard is never shown again. A fresh database cannot skip this flow.

The wizard lives in `src/app/setup/_components/SetupWizard.tsx`. It is a seven step form that posts a single payload to `POST /api/setup` at the end. Step validation happens client side before each "Next" click; the server revalidates everything before writing.

## Step 1: Welcome (Encryption Passphrase)

Component: `WelcomeStep`

The passphrase is the root secret for the application vault. Every secret value stored afterward (OpenAI key, SMTP password, external API headers, etc.) is encrypted with a key derived from this passphrase.

- Field: `passphrase`
- Validation: minimum 12 characters
- Storage: a random 16 byte salt is generated and stored on `SetupState.encryptionSalt` (base64). The passphrase itself is never persisted. A verification hash (`SHA-256` of the derived key) is stored so future unlock attempts can fail fast on a wrong passphrase.
- Derivation: PBKDF2-SHA512, 600,000 iterations, 32 byte key. Defined in `src/lib/encryption/EncryptionService.ts`.

If you ever lose this passphrase and `VAULT_KEY` is not set in the environment, encrypted secrets cannot be recovered. Write it down.

## Step 2: Admin Account

Component: `AdminStep`

Creates the first `ADMIN` user. This user is the only account that exists until additional users are added through `/settings/users`.

- Fields: `adminFirstName`, `adminLastName`, `adminEmail`, `adminPassword`
- Validation: first and last name required (non empty), email must contain `@`, password minimum 8 characters
- Storage: bcrypt hash (12 rounds) written to `User.passwordHash`. The plaintext is also used to seed `SetupState.adminPasswordHash` for the auth bootstrap.
- Role: hard coded to `ADMIN`

## Step 3: Organization

Component: `OrgStep`

Defines the single tenant that will own all data. Shane Inventory is single tenant per container; the `Tenant` row exists for data isolation and for the multi-tenant primitives in the schema, not for cross-org switching at runtime.

- Fields: `orgName`, `orgSlug`
- Validation: both required (non empty after trim)
- Storage: inserts a row in `Tenant`. The organization name is also used as the platform's `appName` in branding (single source of truth, see `src/lib/branding.ts`).
- Slug rules: lowercased, non alphanumeric collapsed to hyphens in the UI before submission.

## Step 4: Branding

Component: `BrandingStep`. All fields optional, sensible defaults everywhere.

- `brandingPrimaryColorLight` (default `#7ed321`), `brandingPrimaryColorDark` (default `#7ed321`): hex strings, validated with the regex in `isValidHexColor()`.
- `brandingLogoPreviewLight`, `brandingLogoPreviewDark`: data URLs uploaded during setup. Persisted by the `/api/setup` route into the branding JSON. PNG, JPG, SVG, WebP. Max 2MB each.
- `brandingFaviconPreview`: ICO, PNG, JPG, SVG, WebP. Max 1MB.
- `brandingThemeMode`: `auto`, `light`, or `dark`. `auto` lets users toggle; the other two lock the app to that mode.

Branding is merged into `Tenant.settings` JSON via `mergeBrandingIntoSettings()`.

## Step 5: Integrations

Component: `IntegrationsStep`

- `openaiApiKey` (required): validated server side with a real call to OpenAI before the wizard accepts it. If invalid, the wizard blocks progression with the OpenAI error message.
- `openaiModel` (default `gpt-5.4-nano`): populated from a live `GET /v1/models` call once a valid key is entered. Rendered in a ShadCN `Select`. Persisted to `SystemConfig` under the `integrations` category as `openaiModel`.
- `smtpHost`, `smtpPort` (default `587`), `smtpUser`, `smtpPassword`: optional. If any are filled, all are stored in `SystemConfig` under the `smtp` category. SMTP password is encrypted.
- `catalogApiUrl`: optional, stored in `SystemConfig` under `integrations`.

All secret values written here are encrypted with the vault key derived from the step 1 passphrase, then base64 packed (IV || ciphertext || auth tag) per `EncryptionService.encrypt()`.

## Step 6: CORS and Security

Component: `CorsStep`

- `corsOrigins` (default `*`): comma separated list of allowed origins, or `*` for permissive dev mode
- Validation: non empty (the default `*` satisfies this)
- Storage: `SystemConfig` category `security`, key `corsOrigins`

The CORS value is read by the middleware in `src/middleware.ts` to decide which preflight responses to send.

## Step 7: Review and Launch

Component: `ReviewStep`. Shows a read only recap of every field. Has a `seedDemoData` toggle (default on): when true, the `/api/setup` route calls the sample data seeder from `src/lib/seed/` after the tenant and admin rows are committed.

When the user clicks Launch, the wizard posts one JSON payload to `POST /api/setup`. The server:

1. Validates the payload again.
2. Generates the salt, derives the key, hashes for verification.
3. Writes `SetupState` (salt, hash, `isSetupComplete = true`).
4. Creates `Tenant`, the admin `User`, and all `SystemConfig` rows (encrypting secrets on the way in).
5. Optionally seeds demo data.
6. Redirects the browser to `/login`.

If any step fails the entire transaction rolls back and the wizard shows the server error. The user can edit and resubmit without losing any of their typed values.

## Post setup

Once complete, hitting `/setup` redirects to `/login`. All the values collected above are editable later from `/settings/*`, except the encryption salt, which is fixed for the life of the database. Rotating the passphrase re-encrypts all vault entries in place, see `admin/settings-security`.
