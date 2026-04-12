# Inventory Management Platform

A single-tenant inventory management application built in Next.js 15, TypeScript, Prisma 7, SQLite, and OpenAI. End-to-end traceability from Manufacturer to Vendor to Item to Purchase Order to Asset, with a built-in AI assistant, real Code 128 / QR barcode scanning, full white-label branding, and a Docusaurus documentation site that ships inside the same container.

This is a pro-code, AI-assisted replica of Shane Young's Power Platform inventory demo. The whole thing was built in roughly five hours of AI-assisted development with human-in-the-loop testing and validation. See `/docs/comparison` once it is running for the full feature parity matrix and the business case.

## Quick start (Docker)

You need Docker Desktop (or Docker Engine) and Git.

### 1. Clone the repo

```bash
git clone https://github.com/dtsoden/Shane-Inventory.git
cd Shane-Inventory
```

### 2. Generate your vault key

```bash
openssl rand -hex 32
```

This produces a 64-character hex string. This key encrypts all sensitive configuration (API keys, SMTP credentials, etc.) stored in the database. **Save it somewhere safe (password manager, offline backup). If you lose this key, encrypted data in the database is permanently unrecoverable.**

### 3. Create your `.env` file

```bash
echo "VAULT_KEY=paste-your-64-char-hex-key-here" > .env
```

### 4. Build and run

```bash
docker compose up -d --build
```

The app is now serving at **http://localhost:5600**. Open it in your browser. The setup wizard will walk you through creating an admin account, naming your organization, uploading branding, entering your OpenAI API key, and configuring integrations. Everything the wizard collects is encrypted and stored in the database.

## How it works

### Data directory

The container mounts `./data` from your host to `/app/data` inside the container:

```
./data/
  inventory.db          # SQLite database (everything: users, data, encrypted secrets)
  uploads/
    branding/           # Uploaded logos and favicons
    avatars/            # User profile images
```

**Never delete this directory.** It is your entire application state.

### What the container does on startup

1. Initializes the database from a blank template if no database file exists
2. Runs idempotent schema migrations (only adds missing columns, never deletes data)
3. Reads `NEXTAUTH_SECRET` from the database (auto-generated during setup)
4. Starts the Next.js server on port 3000 (mapped to host port 5600)

### Configuration

All configuration is stored in the database. The setup wizard collects it once and encrypts sensitive values using your `VAULT_KEY`. There are no API keys, secrets, or URLs in `docker-compose.yml`.

### Port mapping

The container runs Next.js on port 3000 internally. `docker-compose.yml` maps host port **5600** to container port 3000. To change the external port, modify the left side: `"8080:3000"`.

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

## .env file

The `.env` file contains exactly one value:

```
VAULT_KEY=your-64-character-hex-key-here
```

This file is read by Docker Compose on every container start. It is listed in `.gitignore` and is never committed to version control.

| What it does | Encrypts/decrypts all sensitive configuration stored in the database |
|---|---|
| **How to generate** | `openssl rand -hex 32` |
| **Where it lives** | `.env` file on the host, next to `docker-compose.yml` |
| **If you lose it** | All encrypted data in the database is permanently unrecoverable |

### Production with HTTPS

If you serve the app behind a reverse proxy with HTTPS, add `NEXTAUTH_URL` to your `.env`:

```
VAULT_KEY=your-64-character-hex-key-here
NEXTAUTH_URL=https://inventory.example.com
```

This tells NextAuth to use HTTPS-only session cookies and generate correct callback URLs.

## Persistence and backups

`./data/inventory.db` holds everything. **Never delete this file.** Back it up with whatever you already use (restic, borg, rsync, periodic file copy). SQLite in WAL mode supports online copies.

The container performs idempotent runtime schema migrations on every startup. New columns are added with `ALTER TABLE` only when missing, so user data survives every upgrade.

## Documentation

Once the container is running, the full documentation site is bundled at:

- `http://localhost:5600/docs` (landing)
- `http://localhost:5600/docs/user/getting-started` (User Guide)
- `http://localhost:5600/docs/admin/setup-wizard` (Admin Guide, ADMIN only)
- `http://localhost:5600/docs/comparison` (Shane comparison, ADMIN only)

## Updating

```bash
git pull
docker compose up -d --build
```

## Architecture (high level)

- **Next.js 15** (App Router, standalone build, TypeScript)
- **Prisma 7** with `@prisma/adapter-libsql` against SQLite
- **NextAuth** credentials provider, JWT sessions
- **OOP service layer**: `BaseRepository`, `BaseService`, `BaseApiHandler`
- **Encrypted vault**: AES-256-GCM, key from `VAULT_KEY` environment variable, all secrets stored encrypted in the database
- **Server-side branding injection**: tenant logo, colors, theme mode in the initial HTML
- **Docusaurus 3** docs site, role-gated by middleware

## License and contributions

This is a personal project. See the comparison page for the licensing tier model.
