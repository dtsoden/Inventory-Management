---
title: Initial Setup Wizard
sidebar_label: Setup Wizard
---

# Initial Setup Wizard

The setup wizard runs once, on the very first load of a fresh Inventory Management deployment. It collects everything the platform needs to boot: admin credentials, organization identity, branding, integration keys, and CORS settings. When it finishes it flips `SetupState.isSetupComplete` to `true` and the wizard is never shown again.

**Before running the wizard**, you must have a `VAULT_KEY` set in your `.env` file. The wizard uses this key to encrypt all sensitive configuration. See the [Docker Deployment](/docs/admin/docker-deployment) guide for how to generate it.

The wizard lives in `src/app/setup/_components/SetupWizard.tsx`. It is a six-step form that posts a single payload to `POST /api/setup` at the end. Step validation happens client-side before each "Next" click; the server revalidates everything before writing.

## Step 1: Admin Account

Component: `AdminStep`

Creates the first `ADMIN` user. This user is the only account that exists until additional users are added through `/settings/users`.

- Fields: `adminFirstName`, `adminLastName`, `adminEmail`, `adminPassword`
- Validation: first and last name required, email must contain `@`, password minimum 8 characters
- Storage: bcrypt hash (12 rounds) written to `User.passwordHash`
- Role: hard-coded to `ADMIN`

## Step 2: Organization

Component: `OrgStep`

Defines the single tenant that will own all data. Inventory Management is single-tenant per container.

- Fields: `orgName`, `orgSlug`
- Validation: both required
- Storage: inserts a row in `Tenant`. The organization name is also used as the platform's `appName` in branding.

## Step 3: Branding

Component: `BrandingStep`. All fields optional, sensible defaults everywhere.

- `brandingPrimaryColorLight` (default `#7ed321`), `brandingPrimaryColorDark` (default `#7ed321`)
- `brandingLogoPreviewLight`, `brandingLogoPreviewDark`: data URLs. PNG, JPG, SVG, WebP. Max 2MB each.
- `brandingFaviconPreview`: ICO, PNG, JPG, SVG, WebP. Max 1MB.
- `brandingThemeMode`: `auto`, `light`, or `dark`

Branding is merged into `Tenant.settings` JSON via `mergeBrandingIntoSettings()`.

## Step 4: Integrations

Component: `IntegrationsStep`

- `openaiApiKey` (required): validated with a real call to OpenAI before the wizard accepts it
- `openaiModel` (default `gpt-5.4-nano`): populated from a live `GET /v1/models` call once a valid key is entered
- `smtpHost`, `smtpPort` (default `587`), `smtpUser`, `smtpPassword`: optional
- `catalogApiUrl`: optional

All secret values are encrypted with the `VAULT_KEY` using AES-256-GCM before storage.

## Step 5: CORS and Security

Component: `CorsStep`

- `corsOrigins` (default `*`): comma-separated list of allowed origins, or `*` for permissive dev mode

## Step 6: Review and Launch

Component: `ReviewStep`. Shows a read-only recap of every field. Has a `seedDemoData` toggle (default on): when true, the setup route seeds sample vendors, items, and purchase orders.

When the user clicks Launch, the wizard posts one JSON payload to `POST /api/setup`. The server:

1. Validates the payload.
2. Reads `VAULT_KEY` from the environment.
3. Writes `SetupState` (key hash, `isSetupComplete = true`).
4. Creates `Tenant`, the admin `User`, and all `SystemConfig` rows (encrypting secrets with the vault key).
5. Generates and stores a `NEXTAUTH_SECRET` in the database.
6. Optionally seeds demo data.
7. Redirects the browser to `/login`.

If any step fails, the wizard shows the server error. The user can edit and resubmit without losing typed values.

## Post-setup

Once complete, hitting `/setup` redirects to `/login`. All values collected above are editable later from `/settings/*`. The `VAULT_KEY` is fixed for the life of the database; changing it requires re-encrypting all vault entries.
