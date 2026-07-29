# Deployment — Smart Hospital HMS

Target: **130.210.38.184** (Oracle Cloud, `ap-mumbai-1`).

This document is the plan. The scripts under `deploy/` are the executable form of
it. Read §1 and §2 before running anything — the hardware is the constraint that
shapes every other decision here.

---

## 1. What the server actually is

Surveyed 2026-07-29 over SSH:

| | |
|---|---|
| Shape | `VM.Standard.E2.1.Micro` (OCI Always-Free) |
| CPU | 1 OCPU / 2 vCPU threads, x86_64 |
| **RAM** | **954 MiB total, ~530 MiB available, no swap** |
| Disk | 45 GB ext4, 6 % used (42 GB free) |
| OS | Ubuntu 24.04.4 LTS, kernel 6.17 |
| Login | `ubuntu`, passwordless sudo |
| Installed | `git` only — no node, pnpm, docker, nginx, postgres |
| Firewall | iptables `INPUT` ends in `REJECT`; only 22 open. `netfilter-persistent` enabled |
| Outbound | github.com, registry.npmjs.org, deb.nodesource.com all reachable |

### The one number that matters

**954 MiB with no swap.** A Next.js production build routinely peaks above 1.5 GB.
Run `pnpm build` on this box as-is and the OOM killer takes it — usually killing
postgres or sshd along the way, not just the build.

Everything below follows from that:

- **Swap is not optional.** 4 GB, provisioned before the first build.
- **No Docker.** The daemon costs ~100–150 MiB resident — 15 % of total RAM for
  no benefit at single-node scale. Native packages + systemd instead.
- **Builds are serialised.** `turbo run build` parallelises across workspaces by
  default; two Next/Nest builds at once will not fit. Forced to `--concurrency=1`.
- **Postgres is tuned down** from its defaults, which assume a much larger box.

### Redis is not needed

`docker-compose.yml` and `.env.example` both define Redis, but nothing consumes
it: no `ioredis`/`redis` dependency in `apps/api/package.json`, no `REDIS_URL` in
the `envSchema` in `apps/api/src/app.module.ts`, no client construction anywhere
in `apps/api/src` or `apps/web/src`. It is dev-compose scaffolding that was never
wired up. Production omits it and saves the memory. If a real cache is introduced
later, add it back deliberately.

---

## 2. Two things you must do by hand

The scripts cannot do these, and the deployment will *appear* to succeed without
them while being unreachable.

### 2.1 Open 80/443 in the OCI Security List

The instance firewall is only half the story. OCI filters at the VCN level too,
and that is invisible from inside the box. In the OCI console:

> Networking → Virtual Cloud Networks → *your VCN* → Security Lists → *default* →
> Add Ingress Rules

| Source | Protocol | Dest. port |
|---|---|---|
| `0.0.0.0/0` | TCP | 80 |
| `0.0.0.0/0` | TCP | 443 |

`bootstrap.sh` opens the matching holes in iptables and persists them. If the
site is unreachable afterwards, this security-list step is almost always why.

### 2.2 Decide on a domain

TLS needs a hostname — a public CA will not issue for a bare IP. Options:

- **Have a domain** → point an A record at `130.210.38.184`, pass
  `--domain hms.example.com` to `deploy.sh`, and it runs certbot for you.
- **No domain yet** → deploy HTTP-only on the IP. Works, but logins and patient
  data cross the network in clear text. Acceptable for a demo or internal pilot;
  **not acceptable for real patient data.** Add the domain before go-live.

---

## 3. Target architecture

```
                    :80 / :443
                        │
                   ┌────▼─────┐
                   │  nginx   │  TLS, gzip, single origin
                   └──┬────┬──┘
              /api/   │    │   /
                 ┌────▼┐  ┌▼─────────┐
                 │ API │  │   web    │
                 │:4000│  │  :3001   │   both systemd, both 127.0.0.1
                 └──┬──┘  └──────────┘
                    │
              ┌─────▼──────┐
              │ PostgreSQL │  :5432, localhost only
              └────────────┘
```

Everything binds to loopback except nginx. Ports 4000/3001/5432 are never
exposed; the only way in is through nginx.

### Why one origin matters

nginx serves the app and the API from the same origin, so `CORS_ORIGINS` stops
mattering and `NEXT_PUBLIC_API_URL` becomes the relative path `/api/v1`.

That last point is a build-time trap worth stating plainly: `NEXT_PUBLIC_*` is
**inlined into the client bundle at build time**, not read at runtime. Setting it
in a systemd unit after the fact does nothing — the value is already compiled in.
`release.sh` therefore writes `.env.production` *before* building. If you ever
change the public API URL, you must rebuild, not just restart.

---

## 4. Layout on disk

```
/opt/smart-hospital/
├── app/                    # the git checkout; build happens here
├── shared/.env.production  # secrets, 0600, root:hms — never in git
├── artifacts/              # tarred build outputs, last 5 kept, for fast rollback
└── backups/                # nightly pg_dump.gz, 14-day retention
```

Services run as the unprivileged `hms` user, which owns nothing it does not need
to write.

---

## 5. Running it

### 5.1 First time

```bash
./deploy/deploy.sh --bootstrap
```

Adds swap, installs Node 20 + pnpm + PostgreSQL 16 + nginx, creates the `hms`
user and the database, opens the firewall, writes systemd units, generates JWT
secrets, syncs the repo, builds, migrates, seeds, and starts everything.

Expect **20–35 minutes**, most of it the web build grinding through swap on one
core. That is normal on this shape. Do not interrupt it.

### 5.2 With a domain and TLS

```bash
./deploy/deploy.sh --bootstrap --domain hms.example.com --email you@example.com
```

Point the A record at the IP *first* — certbot validates over HTTP and will fail
if DNS has not propagated.

### 5.3 Subsequent deploys

```bash
./deploy/deploy.sh
```

Syncs, rebuilds, runs `prisma migrate deploy`, restarts. Takes a database backup
before migrating, and archives the previous build so rollback is fast.

### 5.4 Useful flags

| Flag | Effect |
|---|---|
| `--bootstrap` | Run one-time provisioning first. Safe to repeat; it is idempotent |
| `--domain D` | Serve under `D` and obtain a Let's Encrypt certificate |
| `--email E` | Registration address for certbot |
| `--seed` | Run the seed script. **First deploy only** — see §6 |
| `--skip-build` | Sync and restart without rebuilding |
| `--local-build` | Build on your laptop and ship artifacts (see §7) |

---

## 6. Seeding is destructive after day one

`--seed` runs `apps/api/prisma/seed.ts`, which writes demo data — including the
`superadmin` account. On a live database this will collide with, or overwrite,
real records.

**Pass `--seed` on the very first deploy and never again.** The script asks for
confirmation if it detects existing patient rows, but do not rely on that as
your only guard.

---

## 7. If the on-server build is too slow

`--local-build` compiles on your machine and ships only the outputs
(`packages/shared/dist`, `apps/api/dist`, `apps/web/.next`) plus a production
`node_modules`. Deploys drop to a couple of minutes.

Two conditions:

- Your machine must be **x86_64 Linux-compatible for native modules**. `argon2`
  and `@prisma/client` ship platform-specific binaries. Building on an Apple
  Silicon Mac produces darwin-arm64 artifacts that will not run on the server.
  Use CI, or Docker with `--platform linux/amd64`, or let the server build.
- The server still needs `node`, so `--bootstrap` runs regardless.

Given this repo is being developed on a Mac, **on-server build is the default and
the recommended path.** `--local-build` exists for a future Linux CI runner.

---

## 8. Recommended follow-ups

Not done by these scripts, because each is an application code change and out of
scope for a deployment task. All are worth doing.

1. **`output: 'standalone'` in `apps/web/next.config.mjs`.** Next then emits a
   self-contained server with only the modules it actually reached. On this box
   it is the single highest-value change available: the runtime footprint drops
   substantially and you stop shipping a full `node_modules` for the web app.
2. **Bind the API to `127.0.0.1`.** `app.listen(port)` currently binds all
   interfaces. The firewall covers this today, but `app.listen(port, '127.0.0.1')`
   makes it true by construction rather than by configuration.
3. **A real health endpoint.** There is no `/health` route, so nginx, systemd and
   any future load balancer have nothing cheap to probe. The scripts fall back to
   `GET /api/v1/meta`, which works but does more than a health check should.
4. **Move off Always-Free before real load.** One core and 1 GB is a demo tier.
   The next shape up (`VM.Standard.E2.1`, 1 OCPU / 8 GB) removes every memory
   constraint described in this document.

---

## 9. Operations

```bash
# Status and logs
ssh -i "$KEY" ubuntu@130.210.38.184
sudo systemctl status smart-hospital-api smart-hospital-web
sudo journalctl -u smart-hospital-api -f
sudo journalctl -u smart-hospital-web -f

# Restart
sudo systemctl restart smart-hospital-api smart-hospital-web

# Roll back to the previous build (fast — no rebuild)
sudo /opt/smart-hospital/app/deploy/rollback.sh

# Manual database backup
sudo -u postgres pg_dump smart_hospital | gzip > /tmp/hms-$(date +%F).sql.gz
```

Nightly `pg_dump` runs at 02:30 via cron into `/opt/smart-hospital/backups`,
retained 14 days. **These backups sit on the same disk as the database**, so they
protect against bad migrations and fat-fingered deletes, not against losing the
volume. Copy them off-box (OCI Object Storage) before this holds anything real.

---

## 10. Troubleshooting

| Symptom | Cause |
|---|---|
| Site unreachable, `curl localhost` works on the box | OCI Security List — §2.1 |
| Build killed with no error | OOM. Confirm swap: `free -h`, check `dmesg -T \| grep -i oom` |
| `502 Bad Gateway` | API or web unit down — `systemctl status`, then journalctl |
| API exits at boot | `envSchema` rejected `.env.production`. `DATABASE_URL` must be a valid URL and both JWT secrets ≥ 8 chars |
| Login works, all data calls 404 | `NEXT_PUBLIC_API_URL` was wrong **at build time**. Fix and rebuild — restarting will not help |
| certbot fails | A record not pointing here yet, or port 80 blocked at the security list |
| Migration fails midway | Restore: `gunzip -c /opt/smart-hospital/backups/<f>.sql.gz \| sudo -u postgres psql smart_hospital` |
