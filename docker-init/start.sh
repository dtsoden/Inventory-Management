#!/bin/sh
# Initialize database if it doesn't exist
if [ ! -f /app/data/inventory.db ]; then
  echo "No database found, initializing from template..."
  cp /app/docker-init/inventory.db.template /app/data/inventory.db
  echo "Database initialized."
fi

# Start the application
exec node server.js
