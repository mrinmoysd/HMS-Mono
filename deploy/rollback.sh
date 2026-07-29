#!/usr/bin/env bash
#
# Roll back to a previously archived build. Runs ON the server.
#
#   sudo /opt/smart-hospital/app/deploy/rollback.sh          # previous build
#   sudo /opt/smart-hospital/app/deploy/rollback.sh --list   # show archives
#   sudo /opt/smart-hospital/app/deploy/rollback.sh 20260729-143012
#
# Restores build outputs only — it does not touch the database. A migration
# that changed the schema will not be undone by this; restore the matching
# pre-deploy dump from /opt/smart-hospital/backups for that.
#
set -euo pipefail

APP_ROOT=/opt/smart-hospital
APP_DIR="$APP_ROOT/app"
ART_DIR="$APP_ROOT/artifacts"
SVC_USER=hms

log() { printf '\n\033[1;36m▸ %s\033[0m\n' "$*"; }
ok()  { printf '  \033[32m✓\033[0m %s\n' "$*"; }
die() { printf '\n\033[1;31m✗ %s\033[0m\n' "$*" >&2; exit 1; }

mapfile -t ARCHIVES < <(ls -1t "$ART_DIR"/build-*.tar.zst 2>/dev/null || true)
[[ ${#ARCHIVES[@]} -gt 0 ]] || die "no archives in $ART_DIR"

if [[ "${1:-}" == "--list" ]]; then
  echo "Available builds (newest first):"
  for a in "${ARCHIVES[@]}"; do
    printf '  %s  %s\n' "$(basename "$a" .tar.zst | sed 's/^build-//')" "$(du -h "$a" | cut -f1)"
  done
  exit 0
fi

if [[ -n "${1:-}" ]]; then
  TARGET="$ART_DIR/build-$1.tar.zst"
  [[ -f "$TARGET" ]] || die "no archive for stamp '$1' (try --list)"
else
  # [0] is the build currently deployed, so the rollback target is [1].
  [[ ${#ARCHIVES[@]} -ge 2 ]] || die "only one archive exists — nothing to roll back to"
  TARGET="${ARCHIVES[1]}"
fi

log "Rolling back to $(basename "$TARGET")"

log "Snapshotting current build first"
PRE="$ART_DIR/pre-rollback-$(date +%Y%m%d-%H%M%S).tar.zst"
tar --zstd -cf "$PRE" -C "$APP_DIR" \
  packages/shared/dist apps/api/dist apps/web/.next 2>/dev/null || true
ok "$(basename "$PRE")"

log "Stopping services"
systemctl stop smart-hospital-web smart-hospital-api
ok "stopped"

log "Restoring outputs"
rm -rf "$APP_DIR/apps/web/.next" "$APP_DIR/apps/api/dist" "$APP_DIR/packages/shared/dist"
tar --zstd -xf "$TARGET" -C "$APP_DIR"
chown -R "$SVC_USER:$SVC_USER" "$APP_DIR/apps/web/.next" 2>/dev/null || true
chmod -R a+rX "$APP_DIR"
ok "restored"

log "Starting services"
systemctl start smart-hospital-api
sleep 4
systemctl start smart-hospital-web
sleep 6

FAIL=0
for unit in smart-hospital-api smart-hospital-web; do
  systemctl is-active --quiet "$unit" && ok "$unit active" || { echo "  ✗ $unit failed"; FAIL=1; }
done

CODE=$(curl -s -o /dev/null -w '%{http_code}' --max-time 10 http://127.0.0.1/login || echo 000)
[[ "$CODE" == "200" ]] && ok "serving (HTTP $CODE)" || { echo "  ✗ not serving (HTTP $CODE)"; FAIL=1; }

[[ "$FAIL" == "0" ]] || die "rollback finished but services are unhealthy — check journalctl"

log "Rollback complete"
echo "  If the bad deploy also ran a migration, restore the matching dump:"
echo "    ls $APP_ROOT/backups/"
echo "    gunzip -c $APP_ROOT/backups/<file>.sql.gz | sudo -u postgres psql smart_hospital"
