---
title: Runtime Migrations
sidebar_label: Runtime Migrations
---

# Runtime Migrations

Inventory Management upgrades its schema in place on container startup using a small, boring, idempotent shell script. It does not run `prisma migrate` inside the container. This page explains why, how it works, and how to add a new column safely without nuking user data.

## Why not `prisma migrate`

Prisma's migration workflow is designed for ephemeral dev databases and destructive CI pipelines. It generates timestamped SQL files, tracks them in a `_prisma_migrations` table, and happily drops columns and rebuilds tables when it thinks the schema drifted. All of that is wrong for a single tenant appliance container where the database file is the customer's entire book of record and cannot be dropped under any circumstance.

Instead we use:

- A **database template** baked into the image at `docker-init/inventory.db.template`. This is the schema as of the image's build time, with no data.
- A **runtime migration script** at `docker-init/start.sh` that runs on every container start. It copies the template into place if no database exists, then applies additive `ALTER TABLE` statements guarded by feature detection.

Prisma is still the source of truth for the schema at build time (`prisma/schema.prisma`); we just never let it touch the live database at runtime.

## The startup script

The entire script, for reference:

```bash
#!/bin/sh
# Initialize database if it doesn't exist
if [ ! -f /app/data/inventory.db ]; then
  echo "No database found, initializing from template..."
  cp /app/docker-init/inventory.db.template /app/data/inventory.db
  echo "Database initialized."
fi

# Apply idempotent runtime migrations for existing databases.
# Never delete user data; only ALTER TABLE additions.
DB=/app/data/inventory.db
if ! sqlite3 "$DB" "PRAGMA table_info(User)" | grep -q "|avatarUrl|"; then
  echo "[migrate] Adding User.avatarUrl"
  sqlite3 "$DB" 'ALTER TABLE "User" ADD COLUMN "avatarUrl" TEXT;'
fi

# Start the application
exec node server.js
```

Two phases:

1. **Bootstrap.** If `/app/data/inventory.db` does not exist, the template is copied into place. This is the only way a new database comes into being in production.
2. **Migrate.** For each schema change made since the template was last regenerated, a guard block checks whether the change has been applied and applies it if not.

## The guard pattern

Every migration block follows this shape:

```bash
if ! sqlite3 "$DB" "PRAGMA table_info(TableName)" | grep -q "|columnName|"; then
  echo "[migrate] Adding TableName.columnName"
  sqlite3 "$DB" 'ALTER TABLE "TableName" ADD COLUMN "columnName" TEXT;'
fi
```

- `PRAGMA table_info(TableName)` returns one row per column. Each row contains the column name wrapped in pipes when grepped.
- The guard runs the `ALTER TABLE` only when the column is missing.
- Both fresh containers (where the template already has the column) and existing containers (where it doesn't) converge to the same final schema.

Running the script twice is safe. Running it a hundred times is safe. That is the whole point.

## Adding a new column safely

Say you want to add `Item.barcode TEXT` to the schema. Follow this checklist:

1. **Edit `prisma/schema.prisma`.** Add the field to the Prisma model. This keeps the generated client in sync for application code.

   ```ts
   model Item {
     // existing fields
     barcode String?
   }
   ```

2. **Regenerate the Prisma client** locally to verify the app still builds:

   ```bash
   npx prisma generate
   npm run build
   ```

3. **Regenerate the template database** so new installs get the column out of the box:

   ```bash
   rm docker-init/inventory.db.template
   DATABASE_URL="file:./docker-init/inventory.db.template" npx prisma db push --skip-generate --accept-data-loss
   ```

   The `--accept-data-loss` flag is safe here because the template is empty by definition.

4. **Add a guard to `docker-init/start.sh`** for the exact same column, so existing databases get the column added on their next restart:

   ```bash
   if ! sqlite3 "$DB" "PRAGMA table_info(Item)" | grep -q "|barcode|"; then
     echo "[migrate] Adding Item.barcode"
     sqlite3 "$DB" 'ALTER TABLE "Item" ADD COLUMN "barcode" TEXT;'
   fi
   ```

5. **Commit all three changes together** (`schema.prisma`, `inventory.db.template`, `start.sh`). A deploy that ships one without the others is a broken deploy.

6. **Test the upgrade path** by running the new image against a copy of a production database file. Confirm the log line `[migrate] Adding Item.barcode` appears exactly once and the column shows up in `sqlite3 inventory.db ".schema Item"`.

## What you cannot do at runtime

The runtime migration script only supports additive changes:

- `ALTER TABLE ... ADD COLUMN` with a nullable type, or a default value
- Creating new tables (same pattern: `CREATE TABLE IF NOT EXISTS`)
- Creating new indexes (`CREATE INDEX IF NOT EXISTS`)

It does **not** support renaming columns, changing column types, dropping columns, or restructuring tables. SQLite's own `ALTER TABLE` is limited in these areas, and even where it works, the operations are destructive enough that they need a proper migration with a backup taken first. If you need a destructive schema change, write it as a one off migration script, document the exact procedure, and run it manually with a backup in hand.

## Verifying migrations on a running container

To confirm the current database schema matches the code:

```bash
docker compose exec inventory sqlite3 /app/data/inventory.db ".schema"
```

You can diff the output against `prisma/schema.prisma` to spot drift.

## Reminder

The script's comment says it plainly: "Never delete user data, only ALTER TABLE additions." Keep it that way. Every deploy that preserves `inventory.db` is a deploy that preserves your customers' trust.
