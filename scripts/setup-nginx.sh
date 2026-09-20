#!/usr/bin/env bash
# ZAMCOPS Member Portal — put the portal behind the nginx already on this box.
#
#   sudo bash scripts/setup-nginx.sh portal.example.org
#
# This machine serves other sites. The script therefore only ever ADDS a vhost:
# it refuses to overwrite an existing config, refuses if another vhost already
# claims the domain, and validates with `nginx -t` before reloading. It never
# edits or removes anything that is already there.

set -uo pipefail

RED=$'\e[31m'; GRN=$'\e[32m'; YEL=$'\e[33m'; BLD=$'\e[1m'; RST=$'\e[0m'
ok()   { echo "  ${GRN}✓${RST} $*"; }
warn() { echo "  ${YEL}!${RST} $*"; }
die()  { echo "  ${RED}✗${RST} $*" >&2; exit 1; }
step() { echo; echo "${BLD}$*${RST}"; }

DOMAIN="${1:-}"
[ -n "$DOMAIN" ] || die "usage: sudo bash scripts/setup-nginx.sh <domain>"
[ "$(id -u)" -eq 0 ] || die "run with sudo — this writes to /etc/nginx"

cd "$(dirname "$0")/.." || die "cannot find the repository root"
APP_PORT=$(grep '^APP_HOST_PORT=' .env 2>/dev/null | cut -d= -f2- | tr -dc '0-9')
APP_PORT=${APP_PORT:-3100}
# Let's Encrypt certificates last 90 days. Registered against an address, the
# CA warns before one expires; registered anonymously, a renewal that quietly
# stops working is discovered when the portal goes dark.
ACME_EMAIL=$(grep '^ACME_EMAIL=' .env 2>/dev/null | cut -d= -f2- | tr -d '"'"'"'' | tr -d "'")

AVAIL="/etc/nginx/sites-available/zamcops"
ENABLED="/etc/nginx/sites-enabled/zamcops"

step "1. Pre-flight"

command -v nginx >/dev/null || die "nginx is not installed"
ok "nginx present"

curl -fsS "http://127.0.0.1:${APP_PORT}/api/health" >/dev/null 2>&1 \
  || die "the portal is not answering on 127.0.0.1:${APP_PORT} — run scripts/deploy-vps.sh first"
ok "portal healthy on 127.0.0.1:${APP_PORT}"

# Never clobber an existing vhost.
[ -e "$AVAIL" ] && die "$AVAIL already exists — inspect it yourself rather than letting this script overwrite it"

# Never fight another vhost for the same hostname.
if grep -rlE "^\s*server_name\s+.*\b${DOMAIN//./\\.}\b" /etc/nginx/sites-enabled/ 2>/dev/null | grep -q .; then
  grep -rlE "^\s*server_name\s+.*\b${DOMAIN//./\\.}\b" /etc/nginx/sites-enabled/ 2>/dev/null | sed 's/^/      /'
  die "another enabled vhost already serves ${DOMAIN} (listed above)"
fi
ok "no other vhost claims ${DOMAIN}"

# DNS must already point here, or certbot's challenge fails.
SERVER_IP=$(curl -fsS --max-time 10 https://api.ipify.org 2>/dev/null || echo "")
RESOLVED=$(getent hosts "$DOMAIN" 2>/dev/null | awk '{print $1}' | head -1)
if [ -z "$RESOLVED" ]; then
  warn "${DOMAIN} does not resolve yet — add an A record pointing at ${SERVER_IP:-this server} before requesting a certificate"
elif [ -n "$SERVER_IP" ] && [ "$RESOLVED" != "$SERVER_IP" ]; then
  warn "${DOMAIN} resolves to ${RESOLVED}, but this server is ${SERVER_IP} — the certificate request will fail until that matches"
else
  ok "${DOMAIN} resolves to this server (${RESOLVED})"
fi

step "2. Writing ${AVAIL}"

cat > "$AVAIL" <<NGINX
# ZAMCOPS Member Portal — proxies to the container on 127.0.0.1:${APP_PORT}.
server {
    listen 80;
    listen [::]:80;
    server_name ${DOMAIN};

    # Audio masters are up to 300MB; nginx defaults to 1MB and would reject them.
    client_max_body_size 300M;

    location / {
        proxy_pass http://127.0.0.1:${APP_PORT};
        proxy_http_version 1.1;

        proxy_set_header Host              \$host;
        proxy_set_header X-Real-IP         \$remote_addr;
        proxy_set_header X-Forwarded-For   \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
        proxy_set_header Upgrade           \$http_upgrade;
        proxy_set_header Connection        "upgrade";

        # A large upload on a slow connection must not be cut off mid-transfer.
        proxy_read_timeout    1800s;
        proxy_send_timeout    1800s;
        proxy_request_buffering off;
    }
}
NGINX
ok "vhost written"

ln -sfn "$AVAIL" "$ENABLED"
ok "enabled"

step "3. Validating"
if ! nginx -t 2>&1 | sed 's/^/      /'; then
  rm -f "$ENABLED"
  die "nginx rejected the config — the symlink has been removed, your other sites are untouched"
fi
ok "config valid"

systemctl reload nginx || die "reload failed"
ok "nginx reloaded (other sites unaffected)"

step "4. HTTPS"
if command -v certbot >/dev/null; then
  echo "  Requesting a certificate for ${DOMAIN}…"
  if [ -n "$ACME_EMAIL" ]; then
    REGISTRATION="--email $ACME_EMAIL"
    ok "expiry warnings will go to ${ACME_EMAIL}"
  else
    REGISTRATION="--register-unsafely-without-email"
    warn "ACME_EMAIL is not set in .env — no warning before this certificate expires"
    warn "set it and re-run certbot to register an address"
  fi
  # shellcheck disable=SC2086 # REGISTRATION is two words by design
  if certbot --nginx -d "$DOMAIN" --non-interactive --agree-tos $REGISTRATION --redirect; then
    ok "certificate installed; HTTP now redirects to HTTPS"
  else
    warn "certbot failed — the site still works on http://${DOMAIN}. Fix DNS, then: sudo certbot --nginx -d ${DOMAIN}"
  fi
else
  warn "certbot not installed. To enable HTTPS:"
  echo "      sudo apt install -y certbot python3-certbot-nginx"
  echo "      sudo certbot --nginx -d ${DOMAIN}"
fi

step "Done"
echo "  http://${DOMAIN}/api/health should now answer {\"status\":\"ok\"}."
echo "  Staff sign-in: https://${DOMAIN}/admin   (password: grep ADMIN_PASSWORD .env)"
