# Changelog

Each release is tagged `vX.Y.Z` on GitHub. The running version shows at the bottom of the app sidebar and in the landing page footer.

## 1.1.3 - 2026-10-19

- The container runs on Node.js 24, the current LTS. Node.js 20 reached end of life in April 2026.
- The image build workflow uses the Node.js 24 releases of its GitHub Actions, which clears GitHub's Node.js 20 deprecation warning.
- The Dockerfile passes its build-time placeholder values only to the build command, so they are not stored in the image.
- `scripts/deploy-local.sh` reads the port from `INVENTORY_PORT` (default 5600). It used `PORT`, which is often already set in a shell for another app.

## 1.1.2 - 2026-10-19

- `scripts/release.sh` cuts a release in one step: version bump, typecheck, tag, wait for the GitHub image build, GitHub release, then pull and restart the local container on the new image.
- `scripts/deploy-local.sh` pulls `latest` and restarts the local container, then checks it is running the pulled image and the expected version. It then deletes old images of this app and clears the Docker build cache so releases don't fill the disk.
- `GET /api/health` returns the running version without signing in.
- Removed a stale, unused Prisma client file that broke builds from a clean checkout.
- Each release is published as a container image to the GitHub Container Registry as `ghcr.io/dtsoden/inventory-management:latest`, for x86-64 and ARM64. A GitHub Actions workflow builds it when a release tag is pushed, each architecture on its own native runner, then deletes the previous release's image so only `latest` is kept.
- `docker-compose.yml` runs the published image with `pull_policy: always`, so `docker compose up -d` installs and updates it.

## 1.1.0 - 2026-10-19

### Email

- One global SMTP configuration under Settings > Integrations > Email now drives every email the app sends: purchase orders, password resets and notification emails.
- The SMTP password is stored encrypted in the vault. Earlier builds saved it in plain text from the settings page, which made every send fail its login. Existing plain-text values are re-encrypted on first use.
- The test button now logs in to the mail server and sends a real email to an address you choose, and shows the result or the server's error on the page.
- Notifications are emailed to each recipient when SMTP is set up and their Settings > Notifications preference for that type is on. Email failures are logged and never block the action that raised the notification.
- Purchase order notifications go through the shared notification service.

### AI assistant and OpenAI

- Every OpenAI call (assistant, insights, packing slip extraction, catalog field mapping) now uses the Responses API, so current models such as gpt-6-luna work, tools included.
- Optional parameters a model rejects, such as temperature on reasoning models, are dropped automatically and the request retried.
- Settings > Integrations > AI has a Test Key and Model button that sends one request with the saved key and selected model.
- The model dropdown lists only text models your key can use, without dated snapshot duplicates. If OpenAI can't be reached, it says so instead of falling back to a stale hardcoded list.
- The assistant chat shows the actual error when a request fails.
- The assistant runs with reasoning turned off. Reasoning models default to medium effort, which with the assistant's tools attached took 10 to 13 seconds to answer "hi". It now takes 1 to 2 seconds per OpenAI call.
- Every OpenAI call is logged with its model, duration and token counts.
- Saving a new OpenAI key from the settings page stores it encrypted. Plain-text keys saved by earlier builds are re-encrypted on first use.

### App

- Toast notifications appear again. Their container was never mounted, so every success and error message in the app was being dropped.
- The app version shows in the sidebar and links to its GitHub release.
- The landing page links to the GitHub repository and releases.
- Vault read failures are logged instead of being silently ignored.
- Settings > Logs shows server logs with search, level, source and time filters, auto-refresh, and CSV or JSON export. Logs are kept for 14 days as daily files in data/logs on the Docker volume, and keys, tokens and passwords are masked.
- Opening the Admin Guide no longer returns a 500 error. Its access check lived in src/middleware.ts on the edge runtime, which can't load the database code it needed, and now runs as src/proxy.ts on Node.js.
- The documentation site uses the logo from Organization settings, or the app icon when none is set, in place of the Docusaurus logo. Its favicon matches the app's.

## 1.0.0

- First version.
