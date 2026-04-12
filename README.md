# Inventory Management Platform

A single-tenant inventory management application built in Next.js 15, TypeScript, Prisma 7, SQLite, and OpenAI. End-to-end traceability from Manufacturer to Vendor to Item to Purchase Order to Asset, with a built-in AI assistant, real Code 128 / QR barcode scanning, full white-label branding, and a Docusaurus documentation site that ships inside the same container.

This is a pro-code, AI-assisted replica of Shane Young's Power Platform inventory demo. The whole thing was built in roughly five hours of AI-assisted development with human-in-the-loop testing and validation. See `/docs/comparison` once it is running for the full feature parity matrix and the business case.

## Quick start (Docker)

You need Docker Desktop (or Docker Engine) and Git. Nothing else.

```bash
git clone https://github.com/dtsoden/Shane-Inventory.git
cd Shane-Inventory
docker compose up -d --build
```

That is it. The app is now serving on **http://localhost:5600**.

The first time you open it, the setup wizard walks you through everything:

1. An encryption passphrase (derives an AES-256-GCM key for the secrets vault)
2. The admin user account
3. Organization name (becomes the app name and browser tab title)
4. Branding (logo light, logo dark, favicon, primary colors, theme mode)
5. Integrations (OpenAI API key, optional SMTP, optional catalog API URL)
6. CORS and security
7. Review and launch

Every setting from the wizard is stored in the database. No environment variables to configure.

## How it works

### Data directory

The container mounts `./data` from your project directory to `/app/data` inside the container. This single directory contains everything that persists:

```
./data/
  inventory.db          # SQLite database (schema, users, business data)
  .nextauth-secret      # Auto-generated JWT signing secret
  .vault-key            # Encryption key for the secrets vault
  uploads/
    branding/           # Uploaded logos and favicons
    avatars/            # User profile images
```

The `volumes:` line in `docker-compose.yml` creates this bind mount:

```yaml
volumes:
  - ./data:/app/data    # Host ./data <-> Container /app/data
```

**Never delete this directory.** It is your entire application state.

### What the container does on startup

1. If no database exists, copies a blank template from `docker-init/`
2. Runs idempotent schema migrations (only adds missing columns, never deletes data)
3. Auto-generates a `NEXTAUTH_SECRET` if one does not already exist (persists to `./data/.nextauth-secret`)
4. Starts the Next.js server on port 3000 (mapped to host port 5600)

### Port mapping

The container runs Next.js on its default internal port 3000. The `docker-compose.yml` maps host port **5600** to container port 3000:

```yaml
ports:
  - "5600:3000"   # You access http://localhost:5600
```

To change the external port, modify the left side: `"8080:3000"` serves on port 8080.

### Secrets and the vault

During setup, the wizard stores sensitive values (OpenAI API key, SMTP password, etc.) in an encrypted vault inside the database. The encryption key is derived from your passphrase and automatically persisted to `./data/.vault-key` so the container can read secrets on every restart without manual intervention.

The app reads secrets from the vault at runtime. No API keys need to go in environment variables or `docker-compose.yml`.

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

### Environment variables

| Variable | Purpose | Default | Required |
|---|---|---|---|
| `DATABASE_URL` | Prisma connection string for SQLite. This is a file path in Prisma's `file:` format, not a network URL. | `file:/app/data/inventory.db` | Defaulted |
| `NEXTAUTH_URL` | Public URL the app is served from. Only needed for HTTPS/reverse-proxy deployments. | Auto-detected (`http://localhost:3000`) | No |
| `NEXTAUTH_SECRET` | JWT signing secret. | Auto-generated on first run | No |
| `OPENAI_API_KEY` | Env-var fallback if the vault is not set up yet. The wizard stores this in the vault, so you normally do not need this. | Read from vault | No |

For a basic `docker compose up -d --build` deployment, you do not need to set any environment variables. Everything is handled by the setup wizard and the startup script.

### Production with HTTPS

If you serve the app behind a reverse proxy (Nginx, Caddy, Traefik) with HTTPS, set `NEXTAUTH_URL` to your public URL:

```yaml
environment:
  - DATABASE_URL=file:/app/data/inventory.db
  - NEXTAUTH_URL=https://inventory.example.com
```

This tells NextAuth to use HTTPS-only session cookies and generate correct callback URLs.

## Persistence and backups

`./data/inventory.db` holds everything: schema, business data, encrypted secrets, and uploaded files. **Never delete this file.** Back it up the same way you back up any other SQLite database (a periodic file copy is fine because of WAL mode).

The container performs idempotent runtime schema migrations on every startup via `docker-init/start.sh`. New columns are added with `ALTER TABLE` only when they are missing, so user data survives every upgrade.

## Documentation

Once the container is running, the full documentation site is bundled at:

- `http://localhost:5600/docs` (landing)
- `http://localhost:5600/docs/user/getting-started` (User Guide, visible to all)
- `http://localhost:5600/docs/admin/setup-wizard` (Admin Guide, ADMIN role only)
- `http://localhost:5600/docs/comparison` (Shane comparison + business case, ADMIN only)

Non-admin users do not see the Admin Guide or the Shane Comparison links. The Next.js middleware enforces this server-side.

You can also reach the docs from the help (`?`) icon in the application header.

## Updating

```bash
git pull
docker compose up -d --build
```

The runtime migration step in `start.sh` applies any new schema changes to your existing database without losing data.

## Architecture (high level)

- **Next.js 15** (App Router, standalone build, TypeScript)
- **Prisma 7** with `@prisma/adapter-libsql` against SQLite (single file, persistent volume)
- **NextAuth** credentials provider, JWT sessions
- **OOP service layer**: `BaseRepository`, `BaseService`, `BaseApiHandler` so every module follows the same pattern
- **AssistantService**: OpenAI tool use with a `queryDatabase` function, HTML output sanitized into the chat panel
- **Encrypted SystemConfig vault**: AES-256-GCM, key derived from the setup-time passphrase via PBKDF2, auto-unlocked from persisted key file
- **Server-side branding injection**: tenant logo, primary color, and theme mode render in the initial HTML so there is no flash on load
- **Docusaurus 3** documentation site, built in a separate Docker stage and served from the Next.js public directory at `/docs`, role-gated by middleware

For the visual architecture diagram and the full settings reference, open `/docs/admin/architecture` after the container is running.

## License and contributions

This is a personal project. See the comparison page for the licensing tier model used in commercial engagements.
