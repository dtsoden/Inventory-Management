---
title: External Data Sources
sidebar_label: Data Sources
---

# External Data Sources

Path: `/settings/data-sources` and `/settings/data-sources/new`. Source: `src/app/(authenticated)/settings/data-sources/page.tsx` and `src/app/(authenticated)/settings/data-sources/new/page.tsx`. API: `/api/settings/data-sources` and `/api/settings/data-sources/:id/sync`. Data model: `ExternalDataSource` in `prisma/schema.prisma`.

The External Data Sources feature lets an administrator hook Shane Inventory up to any JSON HTTP API that returns a list of catalog items, describe how the remote fields map onto the local `Item` schema, and then sync on demand. The mapping itself is assisted by OpenAI: the AI suggests a mapping based on the remote field names and sample values, then a human confirms or tweaks before anything is saved. This is the human in the loop model, by design.

## List view

At `/settings/data-sources` you see a table with every configured source:

- **Name**: display name you gave the source.
- **API URL**: truncated with an external link icon.
- **Active**: toggle for whether this source is enabled. Disabled sources cannot be synced.
- **Last Sync**: relative timestamp or "Never synced".
- **Status badge**: `SUCCESS`, `FAILED`, or `NEVER`, color coded.

Row actions:

- **Sync now**: posts to `/api/settings/data-sources/:id/sync`. The server fetches the API, applies the stored field mapping and conversions, and upserts into `Item`. The toast reports `X created, Y updated, Z errors`.
- **Delete**: removes the `ExternalDataSource` row after a browser confirm. Previously imported items are not deleted.

Click **Add Data Source** to open the five step wizard.

## The wizard

The wizard lives at `/settings/data-sources/new` and walks through name, connection test, schema analysis, field mapping, and save. It is also reachable inline from the Integrations page.

### Step 1: Name and URL

Collects:

- **Name**: a display label.
- **API URL**: the full URL that returns the JSON list. The wizard calls `POST /api/settings/data-sources/test` with the URL. The server fetches it, returns the first few records as `sampleData`, and a `schema` array describing each detected field.

If the test fails (non-2xx, non-JSON, empty array), the wizard blocks and shows the error. You cannot proceed until a test succeeds.

### Step 2: Schema inspection

The detected schema is rendered as a table with three columns: field name, inferred type, sample value. This is your sanity check that the wizard is looking at the right payload. If the field list is wrong (wrong endpoint, wrong envelope), go back and fix the URL.

### Step 3: Field mapping

This is the core of the feature. The page shows two columns:

- **Target fields** (the `Item` columns we support): `name` (required), `sku`, `description`, `unitCost` (required), `imageUrl`, `externalId`, `category`. Defined in `TARGET_FIELDS` in `integrations/page.tsx`.
- **Source fields** (the schema detected in step 2).

Actions:

- **AI suggest**: calls the mapping service, which sends the field list and sample rows to OpenAI with a prompt asking it to match each source field to the best target field and to guess any needed conversion. The response populates the target rows with suggested source field, suggested conversion, and a confidence score (`High`, `Medium`, `Low` based on thresholds of 0.8 and 0.5). Confidence colors: green, yellow, red.
- **Manual override**: drag a source field onto a target, or pick from a dropdown. Any AI suggestion can be overridden.
- **Conversion**: each mapping has a conversion picker (`none`, `toString`, `toNumber`, `toBoolean`, `parseDate`). The `applyConversion()` helper is responsible for running these at sync time.

The human in the loop rule is strict: the UI never auto submits the AI suggestions. You must review, adjust, and explicitly click Save.

### Step 4: Preview

A table shows the first few records as they would be imported: target field values on the left, resolved source values on the right, with any conversion applied. Required fields that resolve to `null` are highlighted so you can fix the mapping before saving.

### Step 5: Save

Writes a new `ExternalDataSource` row via `POST /api/settings/data-sources` with:

- `name`
- `apiUrl`
- `apiHeaders`: JSON string of headers (future use for auth tokens). Currently set via manual edit.
- `fieldMapping`: JSON string of the resolved mapping.
- `dataTypeConversions`: JSON of the per-field conversion rules.
- `isActive: true`
- `lastSyncAt: null`, `lastSyncStatus: 'NEVER'`

After save, the wizard returns to the list view.

## Sync behavior

When a sync runs, the handler:

1. Fetches the remote API.
2. For each record, walks the field mapping to pick source values using `getNestedValue()` (dot paths supported for nested JSON).
3. Applies the configured conversion via `applyConversion()`.
4. Matches existing items by `externalId` if mapped, otherwise by `sku`, otherwise creates a new row.
5. Upserts into `Item`, scoped to the current tenant.
6. Increments counters and collects errors for the toast summary.
7. Updates `lastSyncAt` and `lastSyncStatus` on the `ExternalDataSource` row.

Errors on individual records do not abort the sync; they are counted and reported. Check the server logs for details on record level failures.

## Data model

From `prisma/schema.prisma`:

```ts
model ExternalDataSource {
  id                  String   @id @default(uuid())
  tenantId            String
  name                String
  apiUrl              String
  apiHeaders          String?
  fieldMapping        String
  dataTypeConversions String?
  isActive            Boolean  @default(true)
  lastSyncAt          DateTime?
  lastSyncStatus      String?
  createdAt           DateTime @default(now())
  updatedAt           DateTime @updatedAt
}
```

`fieldMapping` and `dataTypeConversions` are stored as JSON strings because SQLite has no first class JSON support. The client serializes and deserializes on every read and write.

## Security notes

- API URLs are stored in plaintext. Do not embed credentials in the URL.
- API headers will eventually support encrypted storage for bearer tokens and API keys. Today, only non-sensitive headers should be used.
- OpenAI receives the source field names and a small sample of rows during the AI suggestion step. Do not point the mapper at endpoints that return PII or regulated data unless you are comfortable with that payload going to OpenAI.
