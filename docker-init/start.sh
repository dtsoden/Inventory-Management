#!/bin/sh
# Initialize database if it doesn't exist
if [ ! -f /app/data/inventory.db ]; then
  echo "No database found, initializing from template..."
  cp /app/docker-init/inventory.db.template /app/data/inventory.db
  echo "Database initialized."
fi

# Apply idempotent runtime migrations for existing databases.
# Never delete user data — only ALTER TABLE additions.
DB=/app/data/inventory.db
if ! sqlite3 "$DB" "PRAGMA table_info(User)" | grep -q "|avatarUrl|"; then
  echo "[migrate] Adding User.avatarUrl"
  sqlite3 "$DB" 'ALTER TABLE "User" ADD COLUMN "avatarUrl" TEXT;'
fi

# Start the application
exec node server.js
