---
title: Docker Deployment
sidebar_label: Docker Deployment
---

# Docker Deployment

Inventory Management ships as a single Docker image. A `docker-compose.yml` provides the canonical one-service stack: a port mapping, a persistent volume mount, and a `.env` file containing your vault key. All application configuration is stored in the database via the setup wizard.

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

No API keys, no secrets, no configuration URLs. `VAULT_KEY` in `.env` is the only environment variable. All application configuration goes in the database via the setup wizard.

---

## CRITICAL: Persistent storage

The application stores **everything** in `/app/data` inside the container: the SQLite database, uploaded logos, user avatars, and encrypted secrets. Docker containers use **ephemeral storage** by default. If the container is destroyed, recreated, or upgraded without a volume mount, **all data is permanently lost with no possibility of recovery**.

### The volume mount

The `volumes:` line in `docker-compose.yml` maps a directory on your host machine to `/app/data` inside the container:

```yaml
volumes:
  - ./data:/app/data    # Host directory ./data <-> Container /app/data
```

This is what makes the data persistent. The container can be destroyed and recreated any number of times; the data survives because it lives on the host filesystem, not inside the container.

**The container will refuse to start if `/app/data` is not a bind mount.** This is an intentional safety check. If you see this error on startup, you have a volume configuration problem that must be fixed before proceeding.

### Running with `docker run` (no compose)

If you run the container directly without `docker compose`, you must pass the volume flag explicitly:

```bash
docker run -d \
  -p 5600:3000 \
  -v /absolute/path/on/host/data:/app/data \
  --env-file .env \
  inventory-management-inventory
```

Replace `/absolute/path/on/host/data` with a real path on your host machine.

### Cloud and VPS deployments

On a cloud VPS (AWS EC2, DigitalOcean, Hetzner, Azure VM, etc.), map `/app/data` to a directory on persistent block storage:

```yaml
volumes:
  - /mnt/data/inventory-management:/app/data   # Persistent disk on the VPS
```

On managed container platforms (ECS, Cloud Run, Azure Container Apps, Fly.io), attach a persistent volume or network-mounted filesystem. **Do not rely on the container's own filesystem.** If your platform does not support persistent volumes, you cannot run this application on it without data loss.

### What gets lost without a volume mount

Without the volume mount, destroying or recreating the container loses:

- The entire SQLite database (all users, orders, inventory, vendors, audit logs)
- All encrypted secrets (API keys, SMTP credentials, NEXTAUTH_SECRET)
- All uploaded branding (logos, favicons)
- All user avatars
- Every active session

**There is no recovery.** This is not a warning you can deal with later. Configure the volume mount before running the setup wizard.

---

## Data directory layout

```
./data/
  inventory.db          # SQLite database (users, business data, encrypted configuration)
  uploads/
    branding/           # Uploaded logos and favicons
    avatars/            # User profile images
```

**Never delete this directory or its contents.** Not during upgrades. Not to "reset" the app. Not because a deploy looks stuck. If you need a clean reset for testing, create a separate compose file with a different volume path and a fresh `.env`.

## Port mapping

The container runs Next.js on its default internal port 3000. The compose file maps host port **5600** to container port 3000. To use a different port, change the left side only: `"8080:3000"`. Do not change the container side.

## What happens on startup

The startup script (`docker-init/start.sh`) runs on every container start:

1. **Verifies `/app/data` is a bind mount** (refuses to start if not)
2. Initializes the database from a blank template if no database file exists
3. Runs idempotent schema migrations (only adds missing columns, never deletes data)
4. Warns if `VAULT_KEY` is not set
5. Starts the Next.js server

## Encryption and the vault

The setup wizard encrypts all sensitive configuration (OpenAI API key, SMTP credentials, etc.) using AES-256-GCM before storing them in the database. The encryption key comes from the `VAULT_KEY` in your `.env` file.

- The `.env` file lives on the host, not inside the container or the data directory
- Docker Compose reads it on every `docker compose up`, so it survives container destroy/recreate
- It is in `.gitignore` and never committed to version control
- If someone steals the `./data` directory alone, they get an encrypted database they cannot read

**If you lose `VAULT_KEY`, all encrypted data in the database is permanently unrecoverable.** Store the key in a password manager or offline backup.

`VAULT_KEY` is the **only** environment variable the application uses. Everything else is stored in the database.

## Backups

Back up two things:

1. **`./data/`** directory (or at minimum `./data/inventory.db`). SQLite in WAL mode supports online file copies. For extra safety, stop the container first.
2. **`.env`** file (or record the `VAULT_KEY` value). The database backup is useless without the key to decrypt the secrets inside it.

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

Inventory Management is single-tenant per container. To host multiple organizations, run multiple containers on different ports with different volumes and `.env` files.

## Upgrades

```bash
git pull
docker compose up -d --build
```

On startup, `docker-init/start.sh` runs idempotent `ALTER TABLE` statements for any new columns. User data and encrypted secrets are always preserved. The volume mount ensures the data directory survives the rebuild.

## Health check

```bash
curl -I http://localhost:5600/
```

Fresh install returns `200` on `/setup`. Already configured returns `307` redirect to `/login`.
