---
title: Docker Deployment
sidebar_label: Docker Deployment
---

# Docker Deployment

Shane Inventory ships as a single Docker image built from the `Dockerfile` at the repo root. A `docker-compose.yml` provides the canonical one service stack: a persistent volume, a port mapping, and the environment contract. This page documents how to build, run, upgrade, and back up the container on a host you control.

## Prerequisites

- Docker Engine 24 or newer
- Docker Compose v2
- A reverse proxy (Caddy, Nginx, Traefik) or a Cloudflared tunnel if you want HTTPS, which you should
- An OpenAI API key for the AI features

## Build and run

From the repo root:

```bash
docker compose up -d --build
```

That command uses `docker-compose.yml`:

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
      - NEXTAUTH_URL=https://shane-inventory.davidsoden.com
      - NEXTAUTH_SECRET=change-me-in-production-generate-a-random-string
      - OPENAI_API_KEY=${OPENAI_API_KEY}
    restart: unless-stopped
```

The container listens on port 3000 internally and is published on host port **5600**. Change the host side of the port mapping if you already use 5600; do not change the container side.

The application serves at `http://<host>:5600` once the container is healthy. First load redirects to `/setup` if no database exists. See `admin/setup-wizard`.

## Volumes

There is exactly one volume, and losing it loses all your data.

- `./data:/app/data` is where `inventory.db` lives. It also holds uploaded logos, favicons, and any other user assets the app writes. The `DATA_DIR` environment variable is hard set to `/app/data` in the Dockerfile; do not override it.

**Never delete `data/inventory.db` during a deploy or upgrade.** The runtime migration script in `docker-init/start.sh` is specifically designed to upgrade an existing database in place. If you wipe the file, you wipe your tenant, users, items, purchase orders, assets, audit log, and every encrypted secret in the vault.

Back the volume up with whatever you already use (restic, borg, rsync). An online SQLite copy is safe because we run in WAL mode; for belt and suspenders, stop the container first.

## Environment variables

| Variable | Required | Purpose |
| --- | --- | --- |
| `DATABASE_URL` | yes | SQLite connection string. Always `file:/app/data/inventory.db`. |
| `NEXTAUTH_URL` | yes | Public URL where users reach the app. Must match the origin the browser sees, or NextAuth will reject callbacks. |
| `NEXTAUTH_SECRET` | yes | Random string used to sign JWT sessions. Generate with `openssl rand -base64 32`. Rotating this invalidates all active sessions. |
| `OPENAI_API_KEY` | no at runtime | Only consumed during build as a placeholder. The real key is stored in the encrypted vault via the setup wizard. You can still set it in compose for operator convenience; it is not read by the running app after setup. |
| `VAULT_KEY` | no | If set, the container unlocks the vault on startup without prompting an admin for the passphrase. Useful for unattended restarts. See `admin/settings-security` for how to generate and rotate this value. |
| `PORT` | no | Defaults to 3000. Do not change. |
| `HOSTNAME` | no | Defaults to `0.0.0.0`. Do not change. |
| `NODE_ENV` | no | Forced to `production` in the runner stage. |

Generate a strong `NEXTAUTH_SECRET` before going anywhere near production:

```bash
openssl rand -base64 32
```

## Cloudflared tunnel

The canonical reference deployment fronts the container with a Cloudflared tunnel instead of opening port 5600 to the internet. A minimal `config.yml` for `cloudflared`:

```yaml
tunnel: <your-tunnel-id>
credentials-file: /etc/cloudflared/<your-tunnel-id>.json
ingress:
  - hostname: shane-inventory.example.com
    service: http://localhost:5600
  - service: http_status:404
```

Point `NEXTAUTH_URL` at `https://shane-inventory.example.com` in `docker-compose.yml` and restart. The tunnel handles TLS; the app never sees an untrusted request.

## Single tenant deployment

Shane Inventory is deliberately single tenant per container. The `Tenant` table exists to keep the data model clean and to enable future expansion, but there is no cross tenant switching in the UI and the setup wizard only creates one tenant row. If you need to host multiple organizations, run multiple containers on different ports with different volumes.

## Upgrades

Upgrading in place is the supported path and preserves all user data:

```bash
git pull
docker compose up -d --build
```

On startup `docker-init/start.sh` runs any idempotent `ALTER TABLE` statements added since the last image. See `admin/runtime-migrations` for the full pattern.

If an upgrade fails mid way, the database is still intact. Roll back to the previous image tag and bring the stack up; no data is lost because the runtime migration script only ever adds columns.

## Health check

Once the container is up, curl the root:

```bash
curl -I http://localhost:5600/
```

You should get `200` on `/setup` (fresh install) or `307` redirect to `/login` (already set up). If you get `502` or the container is restarting, check `docker compose logs -f inventory` for the error.

## Persistent data warning

Repeating because it is the single most common way to destroy a deployment:

**Never delete `data/inventory.db` or the `./data` directory.** Not during upgrades. Not to "reset" the app. Not because a deploy looks stuck. The file contains the encryption salt, the admin password hash, every vault entry, and all tenant data. There is no recovery without a backup. If you need a clean reset for testing, create a separate compose file with a different volume path.
