#!/bin/sh
# ----------------------------------------------------------------
# Container startup script
# ----------------------------------------------------------------

DB=/app/data/inventory.db
DATA_DIR=/app/data

# --- Verify data directory is a bind mount ------------------------
# If /app/data is ephemeral container storage, all data will be lost
# when the container is destroyed. Refuse to start.
if ! mountpoint -q "$DATA_DIR" 2>/dev/null; then
  echo ""
  echo "============================================================"
  echo "  FATAL: /app/data is NOT a bind mount."
  echo ""
  echo "  The data directory must be mapped to persistent storage"
  echo "  outside the container, or ALL DATA WILL BE LOST when the"
  echo "  container is destroyed."
  echo ""
  echo "  Add this to your docker-compose.yml:"
  echo ""
  echo "    volumes:"
  echo "      - ./data:/app/data"
  echo ""
  echo "  Then restart: docker compose up -d"
  echo "============================================================"
  echo ""
  exit 1
fi

# --- Initialize database if it doesn't exist ----------------------
if [ ! -f "$DB" ]; then
  echo "[init] No database found, initializing from template..."
  cp /app/docker-init/inventory.db.template "$DB"
  echo "[init] Database initialized."
fi

# --- Enable WAL mode for concurrent read/write --------------------
sqlite3 "$DB" "PRAGMA journal_mode=WAL" > /dev/null 2>&1

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

# --- Check VAULT_KEY is set ---------------------------------------
if [ -z "$VAULT_KEY" ]; then
  echo "[warn] VAULT_KEY is not set. Encrypted secrets will be unreadable."
  echo "[warn] Set VAULT_KEY in your .env file. See README for details."
fi

# --- Start the application ----------------------------------------
exec node server.js
