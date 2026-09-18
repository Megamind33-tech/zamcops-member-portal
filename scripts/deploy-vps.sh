#!/usr/bin/env bash
# ZAMCOPS Member Portal — one-shot VPS deploy.
#
#   bash scripts/deploy-vps.sh
#
# Idempotent and safe to re-run: it never regenerates secrets that already
# exist, because rotating AUTH_SECRET signs every member out and rotating
# POSTGRES_PASSWORD locks the app out of the existing database volume.
#
# Brings up the portal and PostgreSQL only. Caddy is left alone — on a box that
# already serves 80/443, the existing reverse proxy fronts this instead
# (scripts/setup-nginx.sh writes that config).

set -uo pipefail

RED=$'\e[31m'; GRN=$'\e[32m'; YEL=$'\e[33m'; BLD=$'\e[1m'; RST=$'\e[0m'
ok()   { echo "  ${GRN}✓${RST} $*"; }
warn() { echo "  ${YEL}!${RST} $*"; }
die()  { echo "  ${RED}✗${RST} $*" >&2; exit 1; }
step() { echo; echo "${BLD}$*${RST}"; }

cd "$(dirname "$0")/.." || die "cannot find the repository root"

# ── 1. Prerequisites ────────────────────────────────────────────────────────
step "1. Checking prerequisites"

command -v docker >/dev/null || die "docker is not installed"
docker info >/dev/null 2>&1 || die "cannot talk to the Docker daemon (is your user in the 'docker' group? log out and back in after usermod)"
ok "docker $(docker version --format '{{.Server.Version}}' 2>/dev/null || echo '?')"

docker compose version >/dev/null 2>&1 || die "the 'docker compose' plugin is not available"
ok "compose $(docker compose version --short 2>/dev/null || echo '?')"

AVAIL_GB=$(df -BG --output=avail . | tail -1 | tr -dc '0-9')
[ "${AVAIL_GB:-0}" -ge 6 ] \
  && ok "disk: ${AVAIL_GB}GB free" \
  || die "only ${AVAIL_GB}GB free — need ~6GB. Try: docker builder prune -f   (never use --volumes on a shared box)"

# ── 2. Configuration ────────────────────────────────────────────────────────
step "2. Configuration (.env)"

APP_HOST_PORT_DEFAULT=3100

if [ -f .env ]; then
  ok ".env exists — keeping it (secrets are never regenerated)"
  # Backfill only variables that are absent; never touch existing values.
  add_if_missing() {
    grep -q "^$1=" .env || { printf '%s=%s\n' "$1" "$2" >> .env; warn "added missing $1"; }
  }
  add_if_missing POSTGRES_USER zamcops
  add_if_missing POSTGRES_DB zamcops
  add_if_missing POSTGRES_PASSWORD "$(openssl rand -hex 32)"
  add_if_missing AUTH_SECRET "$(openssl rand -base64 48 | tr -d '\n')"
  add_if_missing ADMIN_EMAIL admin@zamcops.org.zm
  add_if_missing ADMIN_PASSWORD "$(openssl rand -base64 24 | tr -d '\n')"
  add_if_missing ADMIN_NAME "ZAMCOPS Staff"
  add_if_missing APP_HOST_PORT "$APP_HOST_PORT_DEFAULT"
  add_if_missing LOCAL_STORAGE_DIR /data/uploads
  add_if_missing PORTAL_DOMAIN ""
  add_if_missing RESEND_API_KEY ""
  add_if_missing EMAIL_FROM ""
else
  # hex for the database password: compose interpolates it into a URL, and a
  # "/" or "#" from base64 would make that URL invalid.
  cat > .env <<EOF
POSTGRES_USER=zamcops
POSTGRES_PASSWORD=$(openssl rand -hex 32)
POSTGRES_DB=zamcops
AUTH_SECRET=$(openssl rand -base64 48 | tr -d '\n')
ADMIN_EMAIL=admin@zamcops.org.zm
ADMIN_PASSWORD=$(openssl rand -base64 24 | tr -d '\n')
ADMIN_NAME=ZAMCOPS Staff
APP_HOST_PORT=$APP_HOST_PORT_DEFAULT
LOCAL_STORAGE_DIR=/data/uploads
PORTAL_DOMAIN=
RESEND_API_KEY=
EMAIL_FROM=
EOF
  ok ".env generated with fresh secrets"
fi

chmod 600 .env
ok ".env permissions set to 600"

APP_PORT=$(grep '^APP_HOST_PORT=' .env | cut -d= -f2- | tr -dc '0-9')
APP_PORT=${APP_PORT:-$APP_HOST_PORT_DEFAULT}

# ── 3. Port availability ────────────────────────────────────────────────────
step "3. Port ${APP_PORT}"

port_busy() { ss -tln 2>/dev/null | grep -qE "[:.]$1 "; }
if port_busy "$APP_PORT" && ! docker compose ps --status running 2>/dev/null | grep -q app; then
  echo
  echo "  Port ${APP_PORT} is already in use by something else. Pick a free one:"
  for p in 3100 3200 3300 3400; do port_busy "$p" || echo "      ${p} is free"; done
  die "set APP_HOST_PORT in .env to a free port, then re-run"
fi
ok "port ${APP_PORT} available (or already ours)"

# ── 4. Build and start ──────────────────────────────────────────────────────
step "4. Building and starting (this takes a few minutes)"

docker compose up -d --build app db || die "build/start failed — scroll up for the cause (exit 137 means out of memory)"
ok "containers started"

# ── 5. Wait for health ──────────────────────────────────────────────────────
step "5. Waiting for the portal to answer"

HEALTHY=""
for i in $(seq 1 60); do
  if curl -fsS "http://127.0.0.1:${APP_PORT}/api/health" >/dev/null 2>&1; then HEALTHY=1; break; fi
  sleep 3
  [ $((i % 10)) -eq 0 ] && echo "    still waiting… ($((i * 3))s elapsed, giving up at 180s)"
done

echo
if [ -n "$HEALTHY" ]; then
  echo "${GRN}${BLD}  DEPLOYED${RST}"
  echo "  health: $(curl -fsS "http://127.0.0.1:${APP_PORT}/api/health")"
else
  echo "${RED}${BLD}  NOT HEALTHY${RST} — the containers are up but /api/health never answered."
  echo "  Last 40 log lines:"
  docker compose logs --tail=40 app
  exit 1
fi

step "Status"
docker compose ps
docker stats --no-stream --format '  {{.Name}}: cpu {{.CPUPerc}}, mem {{.MemUsage}}' 2>/dev/null

step "Next"
cat <<EOF
  The portal is running on 127.0.0.1:${APP_PORT}, reachable only from this box.

  1. Put it on the internet — writes an nginx vhost and gets a certificate:
       sudo bash scripts/setup-nginx.sh <your-domain>

  2. Before members use it, set RESEND_API_KEY and EMAIL_FROM in .env and
     re-run this script. Without email, registration cannot complete: the
     verification code gates membership applications.

  3. Your staff password is in .env (grep ADMIN_PASSWORD .env). Sign in once at
     /admin, create a named account under Team & Activity, then retire it.

  4. Schedule backups — the database and the uploads volume, as a pair:
       docker compose exec -T db pg_dump -U zamcops zamcops | gzip > db-\$(date +%F).sql.gz
       docker run --rm -v zamcops_uploads:/data -v "\$PWD":/backup alpine \\
         tar czf /backup/uploads-\$(date +%F).tar.gz -C /data .
EOF
