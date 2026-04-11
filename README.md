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

That is it. The app is now serving on `http://localhost:5600`.

The first time you open it the setup wizard will walk you through:

1. An encryption passphrase (used to derive an AES-256-GCM key for the secrets vault)
2. The admin user account
3. Organization name (this becomes the app name and the browser tab title)
4. Branding (logo light, logo dark, favicon, primary colors, theme mode)
5. Integrations (OpenAI API key, optional SMTP, optional catalog API URL)
6. CORS and security
7. Review and launch

After the wizard completes you can sign in with the admin credentials you just created.

## Docker compose configuration

`docker-compose.yml` defines a single service:

- Host port `5600` mapped to container port `3000`
- A bind-mounted volume at `./data` containing the SQLite database, encrypted secrets vault, uploaded logos, and avatars
- Environment variables for `DATABASE_URL`, `NEXTAUTH_URL`, `NEXTAUTH_SECRET`, `OPENAI_API_KEY`
- `restart: unless-stopped`

If you want the container to start unattended after a reboot without a manual vault unlock, set `VAULT_KEY` in your environment as well.

### Environment variables

| Variable | Purpose | Required |
|---|---|---|
| `DATABASE_URL` | SQLite path inside the container, default `file:/app/data/inventory.db` | Yes (defaulted) |
| `NEXTAUTH_URL` | Public URL the app is served from | Yes |
| `NEXTAUTH_SECRET` | NextAuth JWT signing secret, generate a long random string | Yes |
| `OPENAI_API_KEY` | OpenAI key for the AI assistant and packing-slip extraction | Yes for AI features |
| `VAULT_KEY` | Pre-derived vault key so the container can boot unattended | No |

## Persistence and backups

`./data/inventory.db` holds everything: schema, business data, encrypted secrets, and uploaded files. **Never delete this file.** Back it up the same way you back up any other SQLite database (a periodic file copy is fine because of WAL mode).

The container performs idempotent runtime schema migrations on every startup via `docker-init/start.sh`. New columns are added with `ALTER TABLE` only when they are missing, so user data survives every upgrade.

## Documentation

Once the container is running, the full documentation site is bundled in at:

- `http://localhost:5600/docs` (landing)
- `http://localhost:5600/docs/user/getting-started` (User Guide, visible to all)
- `http://localhost:5600/docs/admin/setup-wizard` (Admin Guide, ADMIN role only)
- `http://localhost:5600/docs/comparison` (Shane comparison + business case, ADMIN only)

Non-admin users do not see the Admin Guide or the Shane Comparison links anywhere in the navbar, sidebar, or footer. The Next.js middleware also enforces this server-side, so guessing the URL will redirect a non-admin to the User Guide.

You can also reach the docs from the help (`?`) icon in the application header bar. Regular users see one entry; admins see all three.

## Updating

```bash
git pull
docker compose up -d --build
```

The runtime migration step in `start.sh` will apply any new schema changes to your existing database without losing data.

## Architecture (high level)

- **Next.js 15** (App Router, standalone build, TypeScript)
- **Prisma 7** with `@prisma/adapter-libsql` against SQLite (single file, persistent volume)
- **NextAuth** credentials provider, JWT sessions
- **OOP service layer**: `BaseRepository`, `BaseService`, `BaseApiHandler` so every module follows the same pattern
- **AssistantService**: OpenAI tool use with a `queryDatabase` function, HTML output sanitized into the chat panel
- **Encrypted SystemConfig vault**: AES-256-GCM, key derived from the setup-time passphrase via PBKDF2
- **Server-side branding injection**: tenant logo, primary color, and theme mode render in the initial HTML so there is no flash on load
- **Docusaurus 3** documentation site, built in a separate Docker stage and served from the Next.js public directory at `/docs`, role-gated by middleware

For the visual architecture diagram and the full settings reference, open `/docs/admin/architecture` after the container is running.

## License and contributions

This is a personal project. See the comparison page for the licensing tier model used in commercial engagements.
