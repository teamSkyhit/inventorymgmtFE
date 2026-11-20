#!/usr/bin/env bash
# Activate an uploaded frontend release on the production server.
# Runs on the droplet as user `deploy` (invoked over SSH by
# .github/workflows/deploy-prod.yml).
#
# Usage: remote-deploy.sh <release-id> <archive.tgz>
#
# Layout:
#   $APP_DIR/releases/<release-id>/   extracted standalone bundle
#   $APP_DIR/shared/.env              optional runtime env (linked into release)
#   $APP_DIR/current -> releases/<release-id>
#
# Steps: extract -> link shared/.env -> atomically switch `current` ->
# pm2 startOrReload -> health check -> on failure roll back to the previous
# release and exit non-zero -> keep the newest $KEEP_RELEASES releases.
set -Eeuo pipefail

RELEASE_ID="${1:?usage: remote-deploy.sh <release-id> <archive.tgz>}"
ARCHIVE="${2:?usage: remote-deploy.sh <release-id> <archive.tgz>}"

APP_DIR="${APP_DIR:-/var/www/prod/poojastore-frontend}"
APP_NAME="${APP_NAME:-poojastore-web}"
APP_PORT="${APP_PORT:-8102}"
KEEP_RELEASES="${KEEP_RELEASES:-5}"
HEALTH_TIMEOUT="${HEALTH_TIMEOUT:-60}"
HEALTH_PATHS="${HEALTH_PATHS:-/ /login}"

RELEASES_DIR="$APP_DIR/releases"
SHARED_DIR="$APP_DIR/shared"
CURRENT_LINK="$APP_DIR/current"

log() { printf '[deploy %s] %s\n' "$(date -u +%H:%M:%S)" "$*"; }
die() { log "ERROR: $*"; exit 1; }

command -v pm2 >/dev/null 2>&1 || die "pm2 not found in PATH"
command -v curl >/dev/null 2>&1 || die "curl not found in PATH"
[[ "$RELEASE_ID" =~ ^[A-Za-z0-9._-]+$ ]] || die "invalid release id: $RELEASE_ID"
[[ -f "$ARCHIVE" ]] || die "archive not found: $ARCHIVE"

mkdir -p "$RELEASES_DIR" "$SHARED_DIR"

PREVIOUS=""
if [[ -L "$CURRENT_LINK" ]]; then
  PREVIOUS="$(readlink -f "$CURRENT_LINK" || true)"
fi

# Redeploying the commit that is already live: use a fresh directory so the
# running release is never modified in place.
RELEASE_DIR="$RELEASES_DIR/$RELEASE_ID"
if [[ -n "$PREVIOUS" && "$(readlink -f "$RELEASE_DIR" 2>/dev/null || true)" == "$PREVIOUS" ]]; then
  RELEASE_DIR="$RELEASES_DIR/${RELEASE_ID}-$(date -u +%Y%m%d%H%M%S)"
fi

log "Extracting release into $RELEASE_DIR"
rm -rf "$RELEASE_DIR"
mkdir -p "$RELEASE_DIR"
tar -xzf "$ARCHIVE" -C "$RELEASE_DIR"
rm -f "$ARCHIVE"
# tar restores the archive's mtime on the release dir; pruning sorts by mtime.
touch "$RELEASE_DIR"

[[ -f "$RELEASE_DIR/server.js" ]] || die "server.js missing in release"
[[ -d "$RELEASE_DIR/.next/static" ]] || die ".next/static missing in release"
[[ -f "$RELEASE_DIR/ecosystem.config.js" ]] || die "ecosystem.config.js missing in release"

rm -f "$RELEASE_DIR/.env"
if [[ -f "$SHARED_DIR/.env" ]]; then
  ln -s "$SHARED_DIR/.env" "$RELEASE_DIR/.env"
  log "Linked shared/.env"
else
  log "No shared/.env (optional) - skipping"
fi

switch_to() {
  local target="$1"
  ln -sfn "$target" "$CURRENT_LINK.tmp"
  mv -Tf "$CURRENT_LINK.tmp" "$CURRENT_LINK"
  log "current -> $target"
}

pm2_apply() {
  # startOrReload re-reads the ecosystem file: starts the app on the first
  # deploy, reloads it afterwards. cwd is the `current` symlink, which is
  # resolved when the process spawns, so the reload picks up the new release.
  pm2 startOrReload "$CURRENT_LINK/ecosystem.config.js" --only "$APP_NAME" --update-env || return 1
  pm2 save >/dev/null || log "warning: pm2 save failed"
}

healthy() {
  local deadline=$((SECONDS + HEALTH_TIMEOUT))
  local path="" code="" all_ok
  while (( SECONDS < deadline )); do
    all_ok=1
    for path in $HEALTH_PATHS; do
      code="$(curl -s -o /dev/null -w '%{http_code}' --max-time 5 "http://127.0.0.1:${APP_PORT}${path}" || true)"
      if [[ "$code" != "200" ]]; then
        all_ok=0
        break
      fi
    done
    if (( all_ok )); then
      log "Health check passed ($HEALTH_PATHS)"
      return 0
    fi
    sleep 2
  done
  log "Health check failed: last ${path} -> HTTP ${code:-none}"
  return 1
}

switch_to "$RELEASE_DIR"

if ! pm2_apply || ! healthy; then
  pm2 logs "$APP_NAME" --lines 50 --nostream || true
  if [[ -n "$PREVIOUS" && -d "$PREVIOUS" ]]; then
    log "Rolling back to $PREVIOUS"
    switch_to "$PREVIOUS"
    if pm2_apply && healthy; then
      log "Rollback succeeded"
    else
      log "Rollback health check also failed - manual attention needed"
    fi
  else
    log "No previous release to roll back to"
  fi
  rm -rf "$RELEASE_DIR"
  die "Deploy of $RELEASE_ID failed"
fi

# Keep the newest $KEEP_RELEASES releases (never the live one).
LIVE="$(readlink -f "$CURRENT_LINK")"
mapfile -t ALL_RELEASES < <(find "$RELEASES_DIR" -mindepth 1 -maxdepth 1 -type d -printf '%T@ %p\n' | sort -rn | cut -d' ' -f2-)
for i in "${!ALL_RELEASES[@]}"; do
  dir="${ALL_RELEASES[$i]}"
  if (( i >= KEEP_RELEASES )) && [[ "$(readlink -f "$dir")" != "$LIVE" ]]; then
    log "Pruning old release $(basename "$dir")"
    rm -rf "$dir"
  fi
done

log "Deployed $RELEASE_ID -> $LIVE"
