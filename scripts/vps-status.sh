#!/usr/bin/env bash
# ZAMCOPS portal — VPS deployment status report.
#
# Read-only: it inspects, it never changes anything. Run it on the Contabo box:
#
#   bash vps-status.sh            # auto-detects the checkout
#   bash vps-status.sh /opt/zamcops-member-portal
#
# Secrets are NEVER printed — .env keys are reported only as set/missing with a
# length, so the whole output is safe to paste back into a chat.

set -uo pipefail
DIR="${1:-}"

say()  { printf '\n\033[1m== %s ==\033[0m\n' "$1"; }
ok()   { printf '  [ ok ] %s\n' "$1"; }
no()   { printf '  [MISS] %s\n' "$1"; }
note() { printf '         %s\n' "$1"; }

say "Host"
( . /etc/os-release 2>/dev/null && echo "  OS       : $PRETTY_NAME" ) || echo "  OS       : unknown"
echo "  Kernel   : $(uname -r)"
echo "  CPU/RAM  : $(nproc) vCPU / $(free -h 2>/dev/null | awk '/^Mem:/{print $2}')"
echo "  Uptime   : $(uptime -p 2>/dev/null)"
echo "  Disk     :"; df -h / 2>/dev/null | awk 'NR==1||NR==2{print "    "$0}'

say "Docker"
if command -v docker >/dev/null 2>&1; then
  ok "docker $(docker --version 2>/dev/null | sed 's/Docker version //')"
  docker compose version >/dev/null 2>&1 \
    && ok "compose $(docker compose version --short 2>/dev/null)" \
    || no "docker compose v2 plugin not installed"
  docker info >/dev/null 2>&1 || no "docker daemon not reachable as $(whoami)"
else
  no "docker is NOT installed — nothing has been deployed yet"
fi

say "Checkout"
if [ -z "$DIR" ]; then
  for c in /opt/zamcops-member-portal /root/zamcops-member-portal /home/*/zamcops-member-portal \
           /srv/zamcops-member-portal /var/www/zamcops-member-portal; do
    [ -d "$c/.git" ] && DIR="$c" && break
  done
fi
if [ -n "$DIR" ] && [ -d "$DIR/.git" ]; then
  ok "found at $DIR"
  git -C "$DIR" log -1 --format='         commit   : %h %s (%cr)' 2>/dev/null
  echo "         branch   : $(git -C "$DIR" branch --show-current 2>/dev/null)"
  # PR #27 brought the Docker stack in; 5982581 is its commit.
  if git -C "$DIR" merge-base --is-ancestor 5982581 HEAD 2>/dev/null; then
    ok "includes the VPS/Docker work (PR #27)"
  else
    no "does NOT include PR #27 — this checkout predates the Docker stack; git pull needed"
  fi
  for f in Dockerfile docker-compose.yml docker/entrypoint.sh docker/Caddyfile; do
    [ -f "$DIR/$f" ] && ok "$f present" || no "$f MISSING"
  done
else
  no "no git checkout found — the repo has not been cloned onto this box"
  note "expected somewhere like /opt/zamcops-member-portal"
fi

say "Configuration (.env) — names and lengths only, never values"
if [ -n "$DIR" ] && [ -f "$DIR/.env" ]; then
  ok ".env present"
  for k in PORTAL_DOMAIN ACME_EMAIL POSTGRES_USER POSTGRES_PASSWORD POSTGRES_DB \
           AUTH_SECRET ADMIN_EMAIL ADMIN_PASSWORD ADMIN_NAME \
           LOCAL_STORAGE_DIR RESEND_API_KEY EMAIL_FROM AT_USERNAME AT_API_KEY; do
    v=$(grep -E "^${k}=" "$DIR/.env" 2>/dev/null | head -1 | cut -d= -f2- | tr -d '"'"'"'')
    if [ -n "$v" ]; then
      case "$k" in
        PORTAL_DOMAIN|ADMIN_EMAIL|EMAIL_FROM|POSTGRES_USER|POSTGRES_DB|LOCAL_STORAGE_DIR|ACME_EMAIL|ADMIN_NAME)
          ok "$k = $v" ;;                             # not secret, useful to see
        *) ok "$k set (${#v} chars)" ;;               # secret — length only
      esac
      [ "$k" = "ADMIN_PASSWORD" ] && [ "$v" = "admin123" ] && no "ADMIN_PASSWORD is still the placeholder!"
    else
      no "$k not set"
    fi
  done
else
  no ".env not found — the stack cannot start without it"
fi

say "Containers"
if command -v docker >/dev/null 2>&1 && docker info >/dev/null 2>&1; then
  if [ -n "$DIR" ] && [ -f "$DIR/docker-compose.yml" ]; then
    out=$(cd "$DIR" && docker compose ps --format '  {{.Service}}\t{{.State}}\t{{.Status}}' 2>/dev/null)
    [ -n "$out" ] && echo "$out" || no "no containers for this project (never brought up, or torn down)"
  fi
  echo "  --- all containers on the box ---"
  docker ps -a --format '  {{.Names}}\t{{.State}}\t{{.Status}}\t{{.Image}}' 2>/dev/null | head -20
  echo "  --- volumes ---"
  docker volume ls --format '  {{.Name}}' 2>/dev/null | grep -i zamcops || note "(no zamcops volumes — no data stored yet)"
fi

say "Service reachability"
if command -v curl >/dev/null 2>&1; then
  h=$(curl -fsS --max-time 6 http://127.0.0.1:3000/api/health 2>/dev/null)
  [ -n "$h" ] && ok "app health (local): $h" || no "app not answering on 127.0.0.1:3000"
  d=$(grep -E '^PORTAL_DOMAIN=' "${DIR:-.}/.env" 2>/dev/null | cut -d= -f2- | tr -d '"'"'"'')
  if [ -n "$d" ]; then
    echo "  domain   : $d"
    echo "  DNS      : $(getent hosts "$d" 2>/dev/null | awk '{print $1}' | paste -sd, - || echo 'does NOT resolve')"
    echo "  public IP: $(curl -fsS --max-time 6 https://api.ipify.org 2>/dev/null || echo unknown)"
    s=$(curl -fsS --max-time 10 -o /dev/null -w '%{http_code} cert=%{ssl_verify_result}' "https://$d/api/health" 2>/dev/null)
    [ -n "$s" ] && ok "https://$d/api/health -> $s (cert=0 means the TLS cert is valid)" \
                || no "https://$d not reachable — Caddy has no certificate yet, or DNS is not pointed here"
  fi
fi

say "Database"
if command -v docker >/dev/null 2>&1 && [ -n "$DIR" ] && (cd "$DIR" && docker compose ps db 2>/dev/null | grep -q Up); then
  u=$(grep -E '^POSTGRES_USER=' "$DIR/.env" 2>/dev/null | cut -d= -f2- | tr -d '"'"'"''); u=${u:-zamcops}
  b=$(grep -E '^POSTGRES_DB='   "$DIR/.env" 2>/dev/null | cut -d= -f2- | tr -d '"'"'"''); b=${b:-zamcops}
  n=$(cd "$DIR" && docker compose exec -T db psql -U "$u" -d "$b" -tAc \
      "select count(*) from information_schema.tables where table_schema='public'" 2>/dev/null)
  [ -n "$n" ] && ok "$n tables in the public schema" || no "could not query the database"
  [ "${n:-0}" -gt 0 ] 2>/dev/null && (cd "$DIR" && docker compose exec -T db psql -U "$u" -d "$b" -tAc \
      'select "membershipStatus", count(*) from "Member" group by 1' 2>/dev/null \
      | sed 's/^/         members: /') || true
else
  no "database container is not running"
fi

say "Uploads volume"
if command -v docker >/dev/null 2>&1 && [ -n "$DIR" ] && (cd "$DIR" && docker compose ps app 2>/dev/null | grep -q Up); then
  (cd "$DIR" && docker compose exec -T app sh -c 'echo "         path : $LOCAL_STORAGE_DIR"; du -sh "$LOCAL_STORAGE_DIR" 2>/dev/null | sed "s/^/         size : /"; find "$LOCAL_STORAGE_DIR" -type f 2>/dev/null | wc -l | sed "s/^/         files: /"') 2>/dev/null
else
  no "app container is not running — cannot inspect uploads"
fi

say "Other workloads on this box — DO NOT DISTURB"
# This VPS is shared. Anything below belongs to another project; the portal must
# coexist with it, which above all means not fighting it for ports 80 and 443.
if command -v docker >/dev/null 2>&1 && docker info >/dev/null 2>&1; then
  others=$(docker ps --format '{{.Names}}\t{{.Image}}\t{{.Ports}}' 2>/dev/null | grep -vi zamcops)
  [ -n "$others" ] && echo "$others" | sed 's/^/  /' || note "(no other containers running)"
fi
proxy=""
for svc in nginx apache2 caddy traefik haproxy; do
  if systemctl is-active --quiet "$svc" 2>/dev/null; then proxy="$svc"; no "$svc is running as a system service"; fi
done
docker ps --format '{{.Image}}' 2>/dev/null | grep -Eiq 'nginx|caddy|traefik|haproxy' \
  && { proxy="${proxy:-a container}"; no "a reverse-proxy container is already running"; }
if [ -n "$proxy" ]; then
  note "-> ports 80/443 are already taken. Start the portal WITHOUT its own Caddy:"
  note "     docker compose up -d app db"
  note "   then add a vhost on the existing proxy pointing at 127.0.0.1:3000"
else
  ok "nothing is holding 80/443 — the bundled Caddy can be used as-is"
fi

say "Ports and firewall"
(ss -tlnp 2>/dev/null || netstat -tlnp 2>/dev/null) | grep -E ':(80|443|3000|5432)\b' | sed 's/^/  /' || note "(none of 80/443/3000/5432 listening)"
command -v ufw >/dev/null 2>&1 && echo "  ufw: $(ufw status 2>/dev/null | head -1)"

say "Recent app logs (last 25 lines)"
if command -v docker >/dev/null 2>&1 && [ -n "$DIR" ]; then
  (cd "$DIR" && docker compose logs --tail 25 app 2>/dev/null | sed 's/^/  /') || note "(no logs)"
fi

printf '\n\033[1m== Report complete — output above contains no secret values ==\033[0m\n'
