---
title: Docker Deployment
sidebar_label: Docker Deployment
---

# Docker Deployment

Shane Inventory ships as a single Docker image built from the `Dockerfile` at the repo root. A `docker-compose.yml` provides the canonical one-service stack: a persistent volume, a port mapping, and one defaulted environment variable. Everything else is configured through the setup wizard and stored in the database.

## Prerequisites

- Docker Engine 24 or newer
- Docker Compose v2
- An OpenAI API key for the AI features (entered during the setup wizard)

## Build and run

From the repo root:

```bash
git clone https://github.com/dtsoden/Shane-Inventory.git
cd Shane-Inventory
docker compose up -d --build
```

The app is now serving at **http://localhost:5600**. Open that URL in your browser to start the setup wizard.

## docker-compose.yml

```yaml
services:
  inventory:
    build: .
    ports:
      - "5600:3000"
    volumes:
      - ./data:/app/data
    environment:
      - DATABASE_URL=file:/app/data/inventory.db
    restart: unless-stopped
```

This is the entire file. No API keys, no secrets, no URLs to configure.

## Data directory

The `volumes:` line creates a bind mount from `./data` on your host to `/app/data` inside the container. This single directory is your entire application state:

```
./data/
  inventory.db          # SQLite database (users, business data, encrypted secrets)
  .nextauth-secret      # Auto-generated JWT signing key
  .vault-key            # Encryption key for the secrets vault (created during setup)
  uploads/
    branding/           # Uploaded logos and favicons
    avatars/            # User profile images
```

**Never delete this directory or its contents.** It contains the encryption salt, the admin password hash, every vault entry, and all tenant data. There is no recovery without a backup.

## Port mapping

The container runs Next.js on its default internal port 3000. The compose file maps host port **5600** to container port 3000:

```yaml
ports:
  - "5600:3000"   # You access http://localhost:5600
```

To use a different port, change the left side only: `"8080:3000"` serves on port 8080. Do not change the container side.

## What happens on startup

The startup script (`docker-init/start.sh`) runs these steps on every container start:

1. **Auto-generates a JWT secret** if one does not exist, persists to `./data/.nextauth-secret`
2. **Defaults NEXTAUTH_URL** to `http://localhost:3000` if not overridden
3. **Initializes the database** from a blank template if no database file exists
4. **Runs idempotent schema migrations** (only adds missing columns, never deletes data)
5. **Starts the Next.js server**

## Environment variables

| Variable | Purpose | Default | Required |
|---|---|---|---|
| `DATABASE_URL` | Prisma connection string for SQLite. Uses Prisma's `file:` format. | `file:/app/data/inventory.db` | Defaulted |
| `NEXTAUTH_URL` | Public URL. Only needed for HTTPS reverse-proxy deployments. | Auto-detected | No |
| `NEXTAUTH_SECRET` | JWT signing secret. | Auto-generated on first run | No |
| `OPENAI_API_KEY` | Env-var fallback. The wizard stores this in the vault, so you normally do not need it. | Read from vault | No |

For a standard deployment, you do not need to set any of these. The only one in `docker-compose.yml` is `DATABASE_URL` with its default value.

## Secrets and the vault

During setup, the wizard stores sensitive values (OpenAI API key, SMTP credentials, etc.) in an encrypted vault inside the database using AES-256-GCM. The encryption key is derived from your passphrase and automatically persisted to `./data/.vault-key`.

The app reads secrets from the vault at runtime. No API keys need to go in environment variables or `docker-compose.yml`.

## HTTPS with a reverse proxy

If you serve the app behind a reverse proxy (Nginx, Caddy, Traefik) or a Cloudflared tunnel, add `NEXTAUTH_URL` to your compose file:

```yaml
environment:
  - DATABASE_URL=file:/app/data/inventory.db
  - NEXTAUTH_URL=https://inventory.example.com
```

This tells NextAuth to use HTTPS-only session cookies and generate correct callback URLs.

### Cloudflared tunnel example

```yaml
tunnel: <your-tunnel-id>
credentials-file: /etc/cloudflared/<your-tunnel-id>.json
ingress:
  - hostname: inventory.example.com
    service: http://localhost:5600
  - service: http_status:404
```

## Single-tenant deployment

Shane Inventory is single-tenant per container. The `Tenant` table exists to keep the data model clean, but the setup wizard only creates one tenant. To host multiple organizations, run multiple containers on different ports with different volumes.

## Upgrades

```bash
git pull
docker compose up -d --build
```

On startup, `docker-init/start.sh` runs idempotent `ALTER TABLE` statements for any new columns. User data is always preserved. If an upgrade fails, roll back to the previous image; no data is lost because the migration script only ever adds columns.

## Backups

Back up `./data/inventory.db` with whatever you already use (restic, borg, rsync, periodic file copy). SQLite in WAL mode supports online copies. For extra safety, stop the container first.

## Health check

```bash
curl -I http://localhost:5600/
```

Fresh install returns `200` on `/setup`. Already configured returns `307` redirect to `/login`. If you get `502` or the container keeps restarting, check `docker compose logs -f inventory`.

## Persistent data warning

**Never delete `./data/inventory.db` or the `./data` directory.** Not during upgrades. Not to "reset" the app. Not because a deploy looks stuck. If you need a clean reset for testing, create a separate compose file with a different volume path.
