#!/usr/bin/env bash
# Cut a release end to end:
#   1. checks: on main, nothing staged, in sync with origin, CHANGELOG section present
#   2. bump package.json, typecheck, commit, tag vX.Y.Z, push
#   3. wait for GitHub Actions to build and push :latest to GHCR
#   4. publish the GitHub release with the CHANGELOG section as notes
#   5. pull the new image and restart the local container on it
#
#   scripts/release.sh <patch|minor|major|X.Y.Z>
#
# Write the CHANGELOG.md section ("## X.Y.Z - YYYY-MM-DD") before running.
set -euo pipefail
cd "$(dirname "$0")/.."

REPO="dtsoden/Inventory-Management"
WORKFLOW="publish-image.yml"
BUMP="${1:-}"

die() { echo "error: $*" >&2; exit 1; }

[ -n "$BUMP" ] || die "usage: scripts/release.sh <patch|minor|major|X.Y.Z>"

# ----- 1. checks -----
[ "$(git rev-parse --abbrev-ref HEAD)" = "main" ] || die "release from main"
git diff --cached --quiet || die "unstage or commit staged changes first; they would end up in the release commit"
# The image is built from the tagged commit, so unrelated local edits are
# left alone and never included. List them so nothing is a surprise.
if ! git diff --quiet; then
  echo "note: these uncommitted files are not part of the release:"
  git diff --name-only | sed 's/^/    /'
fi
gh auth status --active 2>&1 | grep -q "account dtsoden" || die "switch gh to dtsoden: gh auth switch --user dtsoden"
git fetch -q origin main
[ "$(git rev-parse HEAD)" = "$(git rev-parse origin/main)" ] || die "local main differs from origin/main; pull or push first"

current=$(node -p "require('./package.json').version")
case "$BUMP" in
  patch|minor|major)
    next=$(node -e "
      const [a,b,c] = '$current'.split('.').map(Number);
      const m = { patch: [a,b,c+1], minor: [a,b+1,0], major: [a+1,0,0] }['$BUMP'];
      console.log(m.join('.'));") ;;
  [0-9]*.[0-9]*.[0-9]*) next="$BUMP" ;;
  *) die "unknown version '$BUMP'" ;;
esac
tag="v$next"
git rev-parse -q --verify "refs/tags/$tag" >/dev/null && die "tag $tag already exists"
grep -q "^## $next " CHANGELOG.md || die "CHANGELOG.md has no '## $next - date' section"

echo "==> Releasing $current -> $next"

# ----- 2. bump, check, commit, tag, push -----
npm version "$next" --no-git-tag-version >/dev/null
npx tsc --noEmit -p .
git add package.json package-lock.json CHANGELOG.md
git commit -q -m "release: $tag"
git tag -a "$tag" -m "$tag"
git push -q origin main
git push -q origin "$tag"

# ----- 3. wait for the image build -----
echo "==> Waiting for GitHub Actions to build the image"
run_id=""
for _ in $(seq 1 30); do
  run_id=$(gh run list --repo "$REPO" --workflow "$WORKFLOW" --branch "$tag" --limit 1 --json databaseId --jq '.[0].databaseId // empty')
  [ -n "$run_id" ] && break
  sleep 5
done
[ -n "$run_id" ] || die "no workflow run started for $tag"
echo "    https://github.com/$REPO/actions/runs/$run_id"
if ! gh run watch "$run_id" --repo "$REPO" --exit-status --interval 30 >/dev/null; then
  gh run view "$run_id" --repo "$REPO" --log-failed | tail -30 >&2
  die "image build failed; $tag is pushed but not released or deployed"
fi

# ----- 4. GitHub release -----
notes=$(awk -v v="## $next " 'index($0, v) == 1 {on=1; next} /^## / {on=0} on' CHANGELOG.md)
gh release create "$tag" --repo "$REPO" --title "$tag" --latest --notes "$notes" >/dev/null
echo "==> Released https://github.com/$REPO/releases/tag/$tag"

# ----- 5. deploy locally from the registry -----
scripts/deploy-local.sh "$next"
