#!/bin/sh
# ----------------------------------------------------------------
# Container startup script
# ----------------------------------------------------------------

DB=/app/data/inventory.db

# --- Initialize database if it doesn't exist ----------------------
if [ ! -f "$DB" ]; then
  echo "[init] No database found, initializing from template..."
  cp /app/docker-init/inventory.db.template "$DB"
  echo "[init] Database initialized."
fi

# --- Idempotent runtime migrations --------------------------------
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

# --- Read NEXTAUTH_SECRET from the database -----------------------
# Stored unencrypted in SystemConfig during setup. The signing key is
# useless without the running server so plaintext in the DB is fine.
if [ -z "$NEXTAUTH_SECRET" ]; then
  SECRET=$(sqlite3 "$DB" "SELECT value FROM SystemConfig WHERE key = 'nextauth_secret' LIMIT 1" 2>/dev/null)
  if [ -n "$SECRET" ]; then
    export NEXTAUTH_SECRET="$SECRET"
    echo "[init] NEXTAUTH_SECRET loaded from database"
  else
    # Fresh install: no setup yet. Generate a temporary secret so NextAuth
    # can function during the setup wizard. Setup will store the permanent
    # one in the database; next restart picks it up.
    export NEXTAUTH_SECRET=$(head -c 48 /dev/urandom | base64)
    echo "[init] NEXTAUTH_SECRET generated (temporary, pre-setup)"
  fi
fi

# --- Default NEXTAUTH_URL to localhost if not set ------------------
if [ -z "$NEXTAUTH_URL" ]; then
  export NEXTAUTH_URL="http://localhost:${PORT:-3000}"
fi

# --- Check VAULT_KEY is set ---------------------------------------
if [ -z "$VAULT_KEY" ]; then
  echo "[warn] VAULT_KEY is not set. Encrypted secrets will be unreadable."
  echo "[warn] Set VAULT_KEY in your .env file. See README for details."
fi

# --- Start the application ----------------------------------------
exec node server.js
