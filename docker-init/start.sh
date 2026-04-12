#!/bin/sh
# ----------------------------------------------------------------
# Container startup script
# ----------------------------------------------------------------

DB=/app/data/inventory.db

# --- Auto-generate NEXTAUTH_SECRET if not provided -----------------
# Persists to /app/data/.nextauth-secret so the same value survives
# container restarts without the user ever setting an env var.
if [ -z "$NEXTAUTH_SECRET" ]; then
  SECRET_FILE=/app/data/.nextauth-secret
  if [ ! -f "$SECRET_FILE" ]; then
    head -c 48 /dev/urandom | base64 > "$SECRET_FILE"
    echo "[init] Generated NEXTAUTH_SECRET"
  fi
  export NEXTAUTH_SECRET=$(cat "$SECRET_FILE")
fi

# --- Default NEXTAUTH_URL to localhost if not set ------------------
if [ -z "$NEXTAUTH_URL" ]; then
  export NEXTAUTH_URL="http://localhost:${PORT:-3000}"
  echo "[init] NEXTAUTH_URL defaulting to $NEXTAUTH_URL"
fi

# --- Initialize database if it doesn't exist ----------------------
if [ ! -f "$DB" ]; then
  echo "[init] No database found, initializing from template..."
  cp /app/docker-init/inventory.db.template "$DB"
  echo "[init] Database initialized."
fi

# --- Idempotent runtime migrations --------------------------------
# Never delete user data, only ALTER TABLE additions.
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

# --- Start the application ----------------------------------------
exec node server.js
