#!/usr/bin/env bash
#
# One-time server provisioning. Runs ON the server, as ubuntu, via deploy.sh.
# Idempotent — safe to re-run; every step checks before it acts.
#
#   swap · node 20 · pnpm · postgres 16 · nginx · hms user · firewall
#   · systemd units · nightly backup cron
#
set -euo pipefail

APP_ROOT=/opt/smart-hospital
APP_DIR="$APP_ROOT/app"
SHARED_DIR="$APP_ROOT/shared"
SVC_USER=hms
NODE_MAJOR=20
PG_DB=smart_hospital
PG_USER=smarthospital
SWAP_GB=4

DOMAIN="${DOMAIN:-}"
CERTBOT_EMAIL="${CERTBOT_EMAIL:-}"

log()  { printf '\n\033[1;36m▸ %s\033[0m\n' "$*"; }
ok()   { printf '  \033[32m✓\033[0m %s\n' "$*"; }
warn() { printf '  \033[33m!\033[0m %s\n' "$*"; }

# ── swap ────────────────────────────────────────────────────────────────────
# Must come first. Everything after this point is more comfortable with it,
# and the Next.js build is impossible without it on a 1 GB box.
log "Swap"
if swapon --show | grep -q '/swapfile'; then
  ok "already active ($(swapon --show=SIZE --noheadings | head -1 | tr -d ' '))"
else
  sudo fallocate -l "${SWAP_GB}G" /swapfile 2>/dev/null || \
    sudo dd if=/dev/zero of=/swapfile bs=1M count=$((SWAP_GB * 1024)) status=none
  sudo chmod 600 /swapfile
  sudo mkswap /swapfile >/dev/null
  sudo swapon /swapfile
  grep -q '^/swapfile' /etc/fstab || echo '/swapfile none swap sw 0 0' | sudo tee -a /etc/fstab >/dev/null
  ok "${SWAP_GB} GB swapfile created and persisted"
fi

# Low swappiness: use swap as an overflow for build spikes, not for routine
# paging of the running services — that would make every request slow.
sudo sysctl -qw vm.swappiness=10
grep -q '^vm.swappiness' /etc/sysctl.conf || echo 'vm.swappiness=10' | sudo tee -a /etc/sysctl.conf >/dev/null
ok "vm.swappiness=10"

# ── packages ────────────────────────────────────────────────────────────────
log "Base packages"
export DEBIAN_FRONTEND=noninteractive
sudo apt-get update -qq
sudo apt-get install -y -qq --no-install-recommends \
  curl ca-certificates gnupg git rsync zstd jq \
  nginx postgresql postgresql-contrib \
  iptables-persistent >/dev/null
ok "nginx, postgresql, tooling"

# ── node + pnpm ─────────────────────────────────────────────────────────────
log "Node ${NODE_MAJOR} + pnpm"
if ! command -v node >/dev/null || [[ "$(node -v)" != v${NODE_MAJOR}.* ]]; then
  curl -fsSL "https://deb.nodesource.com/setup_${NODE_MAJOR}.x" | sudo -E bash - >/dev/null 2>&1
  sudo apt-get install -y -qq nodejs >/dev/null
fi
ok "node $(node -v)"

# corepack pins pnpm to the version in package.json#packageManager
sudo corepack enable >/dev/null 2>&1 || sudo npm i -g corepack >/dev/null 2>&1
ok "pnpm via corepack"

# ── service user ────────────────────────────────────────────────────────────
log "Service user"
if id "$SVC_USER" &>/dev/null; then
  ok "$SVC_USER exists"
else
  sudo useradd --system --create-home --shell /usr/sbin/nologin "$SVC_USER"
  ok "$SVC_USER created (system, no shell)"
fi

sudo mkdir -p "$APP_DIR" "$SHARED_DIR" "$APP_ROOT/artifacts" "$APP_ROOT/backups"
# ubuntu owns the checkout so rsync can write without sudo; hms only reads.
sudo chown -R ubuntu:ubuntu "$APP_DIR"
sudo chown -R "$SVC_USER:$SVC_USER" "$APP_ROOT/artifacts" "$APP_ROOT/backups"
sudo chown root:"$SVC_USER" "$SHARED_DIR"
sudo chmod 750 "$SHARED_DIR"
ok "$APP_ROOT laid out"

# ── postgres ────────────────────────────────────────────────────────────────
log "PostgreSQL"
sudo systemctl enable --now postgresql >/dev/null 2>&1

if sudo -u postgres psql -tAc "SELECT 1 FROM pg_roles WHERE rolname='$PG_USER'" | grep -q 1; then
  ok "role $PG_USER exists"
else
  PG_PASS="$(openssl rand -hex 24)"
  sudo -u postgres psql -qc "CREATE ROLE $PG_USER LOGIN PASSWORD '$PG_PASS'"
  # Stash it for release.sh to compose DATABASE_URL from, root-only.
  printf '%s' "$PG_PASS" | sudo tee "$SHARED_DIR/.pgpass" >/dev/null
  sudo chmod 600 "$SHARED_DIR/.pgpass"
  sudo chown root:root "$SHARED_DIR/.pgpass"
  ok "role $PG_USER created with generated password"
fi

if sudo -u postgres psql -tAc "SELECT 1 FROM pg_database WHERE datname='$PG_DB'" | grep -q 1; then
  ok "database $PG_DB exists"
else
  sudo -u postgres createdb -O "$PG_USER" "$PG_DB"
  ok "database $PG_DB created"
fi

# Defaults assume far more RAM than we have. These keep postgres to roughly
# 80–120 MiB resident so the node processes have somewhere to live.
PG_CONF_D=$(sudo -u postgres psql -tAc 'SHOW config_file' | xargs dirname)
sudo mkdir -p "$PG_CONF_D/conf.d"
sudo tee "$PG_CONF_D/conf.d/10-micro.conf" >/dev/null <<'PGCONF'
# Tuned for a 1 GB VM.Standard.E2.1.Micro. See docs/DEPLOYMENT.md §1.
listen_addresses = 'localhost'
max_connections = 40
shared_buffers = 96MB
effective_cache_size = 256MB
work_mem = 2MB
maintenance_work_mem = 32MB
wal_buffers = 4MB
min_wal_size = 80MB
max_wal_size = 512MB
random_page_cost = 1.1
PGCONF
grep -q "conf.d" "$PG_CONF_D/postgresql.conf" || \
  echo "include_dir = 'conf.d'" | sudo tee -a "$PG_CONF_D/postgresql.conf" >/dev/null
sudo systemctl restart postgresql
ok "tuned for 1 GB and restarted"

# ── firewall ────────────────────────────────────────────────────────────────
# The OCI image ends INPUT with a REJECT, so new ACCEPTs must be *inserted*
# above it, not appended below where they would never be reached.
log "Firewall (instance)"
for port in 80 443; do
  if sudo iptables -C INPUT -p tcp --dport $port -m state --state NEW -j ACCEPT 2>/dev/null; then
    ok "$port already open"
  else
    # Find the terminal REJECT and insert above it. Hardcoding a position works
    # against today's chain but silently appends *below* the REJECT — where it
    # can never match — if the chain ever changes.
    REJECT_AT=$(sudo iptables -L INPUT --line-numbers -n | awk '$2=="REJECT"{print $1; exit}')
    if [[ -n "$REJECT_AT" ]]; then
      sudo iptables -I INPUT "$REJECT_AT" -p tcp --dport $port -m state --state NEW -j ACCEPT
    else
      sudo iptables -A INPUT -p tcp --dport $port -m state --state NEW -j ACCEPT
    fi
    ok "$port opened"
  fi
done
sudo netfilter-persistent save >/dev/null 2>&1
ok "rules persisted"
warn "OCI Security List must also allow 80/443 — see docs/DEPLOYMENT.md §2.1"

# ── systemd units ───────────────────────────────────────────────────────────
log "systemd units"
sudo tee /etc/systemd/system/smart-hospital-api.service >/dev/null <<UNIT
[Unit]
Description=Smart Hospital API (NestJS)
After=network-online.target postgresql.service
Requires=postgresql.service

[Service]
Type=simple
User=$SVC_USER
WorkingDirectory=$APP_DIR/apps/api
EnvironmentFile=$SHARED_DIR/.env.production
ExecStart=/usr/bin/node dist/src/main.js
Restart=always
RestartSec=5
# MemoryHigh throttles (soft); MemoryMax kills (hard). Nest + Prisma client
# sits near 200M, so the hard ceiling has real headroom above the soft one.
MemoryHigh=260M
MemoryMax=420M
NoNewPrivileges=true
PrivateTmp=true
ProtectSystem=strict
ProtectHome=true
ReadWritePaths=$APP_ROOT
StandardOutput=journal
StandardError=journal
SyslogIdentifier=hms-api

[Install]
WantedBy=multi-user.target
UNIT

sudo tee /etc/systemd/system/smart-hospital-web.service >/dev/null <<UNIT
[Unit]
Description=Smart Hospital Web (Next.js)
After=network-online.target smart-hospital-api.service

[Service]
Type=simple
User=$SVC_USER
WorkingDirectory=$APP_DIR/apps/web
EnvironmentFile=$SHARED_DIR/.env.production
Environment=NODE_ENV=production
Environment=PORT=3001
# Explicit binary path: npx resolution depends on cwd and PATH, which is
# needless ambiguity for something systemd runs at boot.
ExecStart=/opt/smart-hospital/app/apps/web/node_modules/.bin/next start -p 3001
Restart=always
RestartSec=5
MemoryHigh=300M
MemoryMax=480M
NoNewPrivileges=true
PrivateTmp=true
ProtectSystem=strict
ProtectHome=true
ReadWritePaths=$APP_ROOT
StandardOutput=journal
StandardError=journal
SyslogIdentifier=hms-web

[Install]
WantedBy=multi-user.target
UNIT

sudo systemctl daemon-reload
ok "smart-hospital-api, smart-hospital-web"

# ── nginx ───────────────────────────────────────────────────────────────────
log "nginx"
SERVER_NAME="${DOMAIN:-_}"
sudo tee /etc/nginx/sites-available/smart-hospital >/dev/null <<NGINX
# Single origin for app + API: no CORS, and NEXT_PUBLIC_API_URL can stay relative.
server {
    listen 80;
    listen [::]:80;
    server_name $SERVER_NAME;

    client_max_body_size 20M;

    gzip on;
    gzip_proxied any;
    gzip_comp_level 5;
    gzip_min_length 1024;
    gzip_types text/plain text/css application/json application/javascript
               application/x-javascript text/xml application/xml image/svg+xml;

    # Long-lived immutable build assets.
    location /_next/static/ {
        proxy_pass http://127.0.0.1:3001;
        proxy_cache_valid 200 60m;
        add_header Cache-Control "public, max-age=31536000, immutable";
    }

    location /api/ {
        proxy_pass http://127.0.0.1:4000;
        proxy_http_version 1.1;
        proxy_set_header Host              \$host;
        proxy_set_header X-Real-IP         \$remote_addr;
        proxy_set_header X-Forwarded-For   \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
        proxy_read_timeout 60s;
    }

    location / {
        proxy_pass http://127.0.0.1:3001;
        proxy_http_version 1.1;
        proxy_set_header Upgrade           \$http_upgrade;
        proxy_set_header Connection        "upgrade";
        proxy_set_header Host              \$host;
        proxy_set_header X-Real-IP         \$remote_addr;
        proxy_set_header X-Forwarded-For   \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
        proxy_read_timeout 60s;
    }
}
NGINX

sudo ln -sf /etc/nginx/sites-available/smart-hospital /etc/nginx/sites-enabled/smart-hospital
sudo rm -f /etc/nginx/sites-enabled/default
sudo nginx -t >/dev/null 2>&1 && sudo systemctl reload nginx
sudo systemctl enable nginx >/dev/null 2>&1
ok "reverse proxy configured (server_name: $SERVER_NAME)"

# ── TLS ─────────────────────────────────────────────────────────────────────
if [[ -n "$DOMAIN" && -n "$CERTBOT_EMAIL" ]]; then
  log "TLS for $DOMAIN"
  sudo apt-get install -y -qq certbot python3-certbot-nginx >/dev/null
  if sudo certbot certificates 2>/dev/null | grep -q "$DOMAIN"; then
    ok "certificate already present"
  elif sudo certbot --nginx -d "$DOMAIN" --non-interactive --agree-tos \
         -m "$CERTBOT_EMAIL" --redirect >/dev/null 2>&1; then
    ok "certificate issued; auto-renew via certbot.timer"
  else
    warn "certbot failed — check the A record for $DOMAIN and OCI ingress on :80"
    warn "site stays on HTTP; re-run bootstrap once DNS resolves"
  fi
else
  warn "no --domain given: serving HTTP only. Do not carry real patient data like this"
fi

# ── backups ─────────────────────────────────────────────────────────────────
log "Nightly backup"
sudo tee /etc/cron.d/smart-hospital-backup >/dev/null <<CRON
# Nightly pg_dump, 14-day retention. Same-disk only — copy off-box for real DR.
30 2 * * * postgres pg_dump $PG_DB | gzip > $APP_ROOT/backups/\$(date +\%F).sql.gz 2>/dev/null; find $APP_ROOT/backups -name '*.sql.gz' -mtime +14 -delete
CRON
ok "02:30 daily → $APP_ROOT/backups"

log "Bootstrap complete"
free -h | head -2
