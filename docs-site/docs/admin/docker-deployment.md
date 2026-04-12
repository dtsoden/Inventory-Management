---
title: Docker Deployment
sidebar_label: Docker Deployment
---

# Docker Deployment

Shane Inventory ships as a single Docker image. A `docker-compose.yml` provides the canonical one-service stack: a port mapping, a persistent volume, and a `.env` file containing your vault key. All application configuration is stored in the database via the setup wizard.

## Prerequisites

- Docker Engine 24 or newer
- Docker Compose v2
- An OpenAI API key (entered during the setup wizard, stored encrypted in the database)

## Build and run

### 1. Generate your vault key

```bash
openssl rand -hex 32
```

This produces a 64-character hex string. **Save it somewhere safe (password manager, offline backup). If you lose this key, encrypted data in the database is permanently unrecoverable.**

### 2. Create your `.env` file

Create a file called `.env` in the repo root (next to `docker-compose.yml`):

```
VAULT_KEY=paste-your-64-char-hex-key-here
```

### 3. Build and start

```bash
docker compose up -d --build
```

The app serves at **http://localhost:5600**. First load opens the setup wizard. See the [Setup Wizard](/docs/admin/setup-wizard) guide for the walkthrough.

## docker-compose.yml

```yaml
services:
  inventory:
    build: .
    ports:
      - "5600:3000"
    volumes:
      - ./data:/app/data
    env_file:
      - .env
    restart: unless-stopped
```

No API keys, no secrets, no configuration URLs. All of that goes in the database via the setup wizard.

## Data directory

The `volumes:` line creates a bind mount from `./data` on your host to `/app/data` inside the container. This directory is your entire application state:

```
./data/
  inventory.db          # SQLite database (users, data, encrypted configuration)
  uploads/
    branding/           # Uploaded logos and favicons
    avatars/            # User profile images
```

**Never delete this directory or its contents.** There is no recovery without a backup.

## Port mapping

The container runs Next.js on its default internal port 3000. The compose file maps host port **5600** to container port 3000. To use a different port, change the left side only: `"8080:3000"`.

## What happens on startup

The startup script (`docker-init/start.sh`) runs on every container start:

1. Initializes the database from a blank template if no database file exists
2. Runs idempotent schema migrations (only adds missing columns, never deletes data)
3. Reads `NEXTAUTH_SECRET` from the database (generated during setup)
4. Warns if `VAULT_KEY` is not set
5. Starts the Next.js server

## Encryption and the vault

The setup wizard encrypts all sensitive configuration (OpenAI API key, SMTP credentials, etc.) using AES-256-GCM before storing them in the database. The encryption key comes from the `VAULT_KEY` in your `.env` file.

- The `.env` file lives on the host, not in the container or the data directory
- Docker Compose reads it on every `docker compose up`, so it survives container destroy/recreate
- It is in `.gitignore` and never committed to version control
- If someone steals the `./data` directory, they get an encrypted database they cannot read

**If you lose `VAULT_KEY`, all encrypted data in the database is permanently unrecoverable.** Store it in a password manager or offline backup.

## HTTPS with a reverse proxy

If you serve the app behind a reverse proxy (Nginx, Caddy, Traefik) or a Cloudflared tunnel, add `NEXTAUTH_URL` to your `.env`:

```
VAULT_KEY=your-64-character-hex-key-here
NEXTAUTH_URL=https://inventory.example.com
```

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

Shane Inventory is single-tenant per container. To host multiple organizations, run multiple containers on different ports with different volumes and `.env` files.

## Upgrades

```bash
git pull
docker compose up -d --build
```

On startup, `docker-init/start.sh` runs idempotent `ALTER TABLE` statements for any new columns. User data and encrypted secrets are always preserved.

## Backups

Back up `./data/inventory.db` with whatever you already use. SQLite in WAL mode supports online copies. For extra safety, stop the container first.

**Also back up your `.env` file (or at minimum, the `VAULT_KEY` value).** The database backup is useless without the key to decrypt the secrets inside it.

## Health check

```bash
curl -I http://localhost:5600/
```

Fresh install returns `200` on `/setup`. Already configured returns `307` redirect to `/login`.

## Persistent data warning

**Never delete `./data/inventory.db`, the `./data` directory, or your `.env` file.** Not during upgrades. Not to "reset" the app. If you need a clean reset for testing, create a separate compose file with a different volume path and a fresh `.env`.
