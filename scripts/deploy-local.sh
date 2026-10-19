#!/usr/bin/env bash
# Pull ghcr.io/dtsoden/inventory-management:latest and restart the local
# container on it. The database in ./data is a bind mount and is untouched.
#
#   scripts/deploy-local.sh [expected-version]
#
# With an expected version, fails unless the restarted app reports it.
# Afterwards it deletes old images of this app and clears Docker's build
# cache so releases don't fill the disk.
set -euo pipefail
cd "$(dirname "$0")/.."

IMAGE="ghcr.io/dtsoden/inventory-management:latest"
PORT="${PORT:-5600}"
EXPECTED="${1:-}"

echo "==> Pulling $IMAGE"
docker compose pull

echo "==> Restarting container"
docker compose up -d

echo "==> Waiting for the app on port $PORT"
version=""
for _ in $(seq 1 60); do
  version=$(curl -fsS "http://localhost:$PORT/api/health" 2>/dev/null | sed -n 's/.*"version":"\([^"]*\)".*/\1/p' || true)
  [ -n "$version" ] && break
  sleep 2
done

if [ -z "$version" ]; then
  echo "App did not answer on http://localhost:$PORT/api/health" >&2
  docker compose logs --tail 40 >&2
  exit 1
fi

running=$(docker inspect --format '{{.Image}}' "$(docker compose ps -q inventory)")
pulled=$(docker image inspect --format '{{.Id}}' "$IMAGE")
if [ "$running" != "$pulled" ]; then
  echo "Container is not running the pulled image ($running vs $pulled)" >&2
  exit 1
fi

if [ -n "$EXPECTED" ] && [ "$version" != "$EXPECTED" ]; then
  echo "Running version is $version, expected $EXPECTED" >&2
  exit 1
fi

echo "==> Running v$version from $IMAGE"

# ----- disk cleanup -----
# Old copies of this app's image: the previous :latest becomes untagged
# when a new one is pulled. Matched by source label so other projects'
# images are never touched. The running image is in use and is skipped.
echo "==> Removing old images of this app"
docker image prune -f --filter "label=org.opencontainers.image.source=https://github.com/dtsoden/Inventory-Management" | tail -1
# Images from before the registry switch, when compose built locally.
docker image rm inventory-management-inventory >/dev/null 2>&1 && echo "    removed old local build" || true

# Build cache is shared by every project on this machine. This app no
# longer builds locally, so clearing it only costs other projects a
# slower next build.
if [ "${KEEP_BUILD_CACHE:-0}" != "1" ]; then
  echo "==> Clearing Docker build cache (set KEEP_BUILD_CACHE=1 to skip)"
  docker builder prune -f | tail -1
fi
