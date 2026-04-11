#!/bin/sh
# Initialize database if it doesn't exist
if [ ! -f /app/data/inventory.db ]; then
  echo "No database found, initializing from template..."
  cp /app/docker-init/inventory.db.template /app/data/inventory.db
  echo "Database initialized."
fi

# Apply idempotent runtime migrations for existing databases.
# Never delete user data, only ALTER TABLE additions.
DB=/app/data/inventory.db

add_column_if_missing() {
  table="$1"
  column="$2"
  type="$3"
  if ! sqlite3 "$DB" "PRAGMA table_info($table)" | grep -q "|$column|"; then
    echo "[migrate] Adding $table.$column"
    sqlite3 "$DB" "ALTER TABLE \"$table\" ADD COLUMN \"$column\" $type;"
  fi
}

add_column_if_missing User    avatarUrl TEXT
add_column_if_missing Vendor  address   TEXT
add_column_if_missing Vendor  city      TEXT
add_column_if_missing Vendor  state     TEXT
add_column_if_missing Vendor  zip       TEXT
add_column_if_missing Vendor  country   TEXT
add_column_if_missing Vendor  rating    INTEGER

# Start the application
exec node server.js
