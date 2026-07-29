#!/usr/bin/env bash
#
# End-to-end deploy, run from your machine.
#
#   ./deploy/deploy.sh --bootstrap --seed          # first time
#   ./deploy/deploy.sh                             # every time after
#   ./deploy/deploy.sh --bootstrap --domain hms.example.com --email you@example.com
#
# Full plan and constraints: docs/DEPLOYMENT.md
#
set -euo pipefail

SERVER_IP="${SERVER_IP:-130.210.38.184}"
SERVER_USER="${SERVER_USER:-ubuntu}"
SSH_KEY="${SSH_KEY:-$HOME/Downloads/espl OCI keys/ssh-key-2026-07-26.key}"
APP_DIR=/opt/smart-hospital/app

DO_BOOTSTRAP=0
DO_SEED=0
SKIP_BUILD=0
LOCAL_BUILD=0
DOMAIN=""
EMAIL=""

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

log()  { printf '\n\033[1;35m━━ %s\033[0m\n' "$*"; }
ok()   { printf '  \033[32m✓\033[0m %s\n' "$*"; }
warn() { printf '  \033[33m!\033[0m %s\n' "$*"; }
die()  { printf '\n\033[1;31m✗ %s\033[0m\n' "$*" >&2; exit 1; }

usage() {
  sed -n '3,9p' "$0" | sed 's/^# \{0,1\}//'
  cat <<'USAGE'

Flags
  --bootstrap      one-time provisioning (idempotent, safe to repeat)
  --domain D       serve under D and obtain a Let's Encrypt certificate
  --email E        registration address for certbot
  --seed           run the demo seed — FIRST DEPLOY ONLY (see DEPLOYMENT.md §6)
  --skip-build     sync and restart without rebuilding
  --local-build    build here and ship artifacts (needs a Linux x86_64 builder)
  -h, --help       this

Environment overrides
  SERVER_IP, SERVER_USER, SSH_KEY
USAGE
}

while [[ $# -gt 0 ]]; do
  case "$1" in
    --bootstrap)   DO_BOOTSTRAP=1; shift ;;
    --seed)        DO_SEED=1; shift ;;
    --skip-build)  SKIP_BUILD=1; shift ;;
    --local-build) LOCAL_BUILD=1; shift ;;
    --domain)      DOMAIN="${2:-}"; shift 2 ;;
    --email)       EMAIL="${2:-}"; shift 2 ;;
    -h|--help)     usage; exit 0 ;;
    *)             die "unknown flag: $1  (--help for usage)" ;;
  esac
done

[[ -f "$SSH_KEY" ]] || die "SSH key not found: $SSH_KEY"
chmod 600 "$SSH_KEY" 2>/dev/null || true

SSH=(ssh -i "$SSH_KEY" -o StrictHostKeyChecking=accept-new -o ConnectTimeout=20 "$SERVER_USER@$SERVER_IP")
# rsync splits -e on whitespace, so a key path containing spaces has to be
# single-quoted *inside* the string. Backslash-escaping does not work here —
# rsync honours quotes but not escapes. The stock OCI key path
# ("…/espl OCI keys/…") hits this, so it is not a hypothetical.
RSYNC_RSH="ssh -i '$SSH_KEY' -o StrictHostKeyChecking=accept-new"

# ── preflight ───────────────────────────────────────────────────────────────
log "Preflight"
"${SSH[@]}" 'echo ok' >/dev/null 2>&1 || die "cannot SSH to $SERVER_USER@$SERVER_IP"
ok "SSH to $SERVER_IP"

if [[ -n "$DOMAIN" && -z "$EMAIL" ]]; then
  die "--domain requires --email (certbot needs a registration address)"
fi

if [[ "$DO_SEED" == "1" ]]; then
  warn "--seed will write demo data including the superadmin account."
  warn "This is destructive on a database that already holds real records."
  read -r -p "  Seed? [y/N] " reply
  [[ "$reply" =~ ^[Yy]$ ]] || { DO_SEED=0; ok "seeding skipped"; }
fi

# ── bootstrap ───────────────────────────────────────────────────────────────
if [[ "$DO_BOOTSTRAP" == "1" ]]; then
  log "Bootstrap (one-time provisioning)"
  "${SSH[@]}" "sudo mkdir -p $APP_DIR/deploy && sudo chown -R $SERVER_USER:$SERVER_USER /opt/smart-hospital"
  rsync -az -e "$RSYNC_RSH" "$REPO_ROOT/deploy/bootstrap.sh" \
    "$SERVER_USER@$SERVER_IP:$APP_DIR/deploy/"
  "${SSH[@]}" "chmod +x $APP_DIR/deploy/bootstrap.sh && \
    DOMAIN='$DOMAIN' CERTBOT_EMAIL='$EMAIL' bash $APP_DIR/deploy/bootstrap.sh"
  ok "provisioning done"
fi

# ── sync ────────────────────────────────────────────────────────────────────
log "Sync source"
# --delete keeps the server tree honest; excludes keep build state and secrets
# from being clobbered or shipped.
#
# --stats, not --info=stats1: macOS ships openrsync (an Apple reimplementation
# advertising "rsync 2.6.9 compatible"), which has no --info at all. --stats is
# understood by both it and GNU rsync.
rsync -az --delete --stats -e "$RSYNC_RSH" \
  --exclude '.git' \
  --exclude 'node_modules' \
  --exclude '.next' \
  --exclude '.turbo' \
  --exclude 'dist' \
  --exclude '.env' \
  --exclude '.env.local' \
  --exclude '.env.production' \
  --exclude '*.pdf' \
  --exclude '.DS_Store' \
  "$REPO_ROOT/" "$SERVER_USER@$SERVER_IP:$APP_DIR/"
ok "source synced to $APP_DIR"

if [[ "$LOCAL_BUILD" == "1" ]]; then
  log "Local build"
  case "$(uname -s)-$(uname -m)" in
    Linux-x86_64) ;;
    *) die "--local-build needs Linux x86_64: argon2 and @prisma/client ship
   platform-specific binaries, and $(uname -s)-$(uname -m) artifacts will not
   run on the server. Use CI, Docker --platform linux/amd64, or drop the flag." ;;
  esac
  ( cd "$REPO_ROOT" && \
    NEXT_PUBLIC_API_URL=/api/v1 pnpm turbo run build --concurrency=1 )
  rsync -az -e "$RSYNC_RSH" \
    "$REPO_ROOT/packages/shared/dist" "$SERVER_USER@$SERVER_IP:$APP_DIR/packages/shared/"
  rsync -az -e "$RSYNC_RSH" \
    "$REPO_ROOT/apps/api/dist" "$SERVER_USER@$SERVER_IP:$APP_DIR/apps/api/"
  rsync -az -e "$RSYNC_RSH" \
    "$REPO_ROOT/apps/web/.next" "$SERVER_USER@$SERVER_IP:$APP_DIR/apps/web/"
  SKIP_BUILD=1
  ok "artifacts shipped"
fi

# ── release ─────────────────────────────────────────────────────────────────
log "Release"
if [[ -n "$DOMAIN" ]]; then
  PUBLIC_ORIGIN="https://$DOMAIN"
else
  PUBLIC_ORIGIN="http://$SERVER_IP"
fi

"${SSH[@]}" "chmod +x $APP_DIR/deploy/*.sh && \
  DO_SEED=$DO_SEED SKIP_BUILD=$SKIP_BUILD PUBLIC_ORIGIN='$PUBLIC_ORIGIN' \
  bash $APP_DIR/deploy/release.sh"

# ── reachability from here ──────────────────────────────────────────────────
log "External check"
URL="${DOMAIN:+https://$DOMAIN}"
URL="${URL:-http://$SERVER_IP}"
CODE=$(curl -s -o /dev/null -w '%{http_code}' --max-time 20 "$URL/login" || echo 000)
if [[ "$CODE" == "200" ]]; then
  ok "reachable from your machine: $URL/login"
else
  warn "not reachable from here (HTTP $CODE)"
  warn "the app checked out fine on the box, so this is almost certainly the"
  warn "OCI Security List — add ingress for TCP 80/443. docs/DEPLOYMENT.md §2.1"
fi

log "Done"
echo "  URL   $URL"
echo "  Logs  ssh -i \"\$SSH_KEY\" $SERVER_USER@$SERVER_IP 'sudo journalctl -u smart-hospital-api -f'"
echo "  Back  ssh -i \"\$SSH_KEY\" $SERVER_USER@$SERVER_IP 'sudo $APP_DIR/deploy/rollback.sh'"
