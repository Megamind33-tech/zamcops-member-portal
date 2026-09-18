# ZAMCOPS Member Portal — Contabo Deploy Audit

Audited commit: `e2e2b97` (origin/main) · Target: existing Contabo VPS already
running two other apps.

The Docker stack on `main` (added in `5982581`) is genuinely production-shaped:
multi-stage build on Next.js standalone output, non-root runtime user, Prisma
CLI isolated from the pruned bundle, container healthcheck, Postgres not
published, app bound to loopback, Caddy terminating TLS, correct
`binaryTargets` for the Debian base image, and a schema sync that deliberately
refuses `--accept-data-loss`. The findings below are what stands between that
and a first successful deploy **on a box that already hosts two other apps**.

Severity: **BLOCKER** = deploy fails or is unsafe to run · **FIX** = fix before
go-live · **ADVISORY** = do it soon.

> **Status.** §2, §3, §4, §5 and the volume-name half of §7 are **fixed in this
> branch** (see "Fixed" tags below). §1 (port collision) is an operational
> decision that depends on the box; §6, §8 and the rest of §7 are actions for
> whoever runs the deploy. Nothing here has been applied to a server.

---

## 1. Port 80/443 will collide with the two apps already on the box — BLOCKER

`docker-compose.yml` publishes `80:80`, `443:443` and `443:443/udp` for Caddy.
If anything on the Contabo box already binds those (nginx, Apache, another
Caddy/Traefik, another compose stack), `docker compose up` fails with
`address already in use` — and if it somehow wins the bind, it takes the other
two apps offline.

**Decide which of these applies before deploying:**

- **A — something already serves 80/443 (most likely).** Don't start Caddy:
  ```bash
  docker compose up -d --build app db
  ```
  The app is already published on `127.0.0.1:3000`. Point the existing reverse
  proxy at it. For nginx, the upload path needs the limits raised — the portal
  accepts 300MB files and nginx defaults to 1MB:
  ```nginx
  location / {
      proxy_pass http://127.0.0.1:3000;
      proxy_http_version 1.1;
      proxy_set_header Host $host;
      proxy_set_header X-Forwarded-Proto $scheme;
      proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
      client_max_body_size 300M;
      proxy_read_timeout 1800s;
      proxy_send_timeout 1800s;
  }
  ```
- **B — nothing serves 80/443 yet.** Use the bundled Caddy as documented.

Also check `127.0.0.1:3000` itself is free — one of the existing apps may
already be on 3000. If so, set `APP_HOST_PORT` in `.env`; only the host side
moves, the container still listens on 3000.

**Check first:** `sudo ss -tlnp | grep -E ':(80|443|3000)\s'`

### Measured on the target box (`vmi3566248`, 79.143.177.140)

```
LISTEN 0 511   0.0.0.0:80     backlog 511  → nginx
LISTEN 0 511   0.0.0.0:443    backlog 511  → nginx
LISTEN 0 4096  0.0.0.0:3000   backlog 4096 → an existing Node app
Mem: 7.8Gi total, 4.7Gi available · Swap: 4.0Gi (1.6Gi used)
Docker 29.8.0 · Compose v5.5.1
```

**Path A applies, with a port move.** All three default ports are taken, so:
`docker compose up -d --build app db` (no Caddy) **and** `APP_HOST_PORT=3100`
in `.env`. Memory and swap are ample for an on-box build. Both Docker versions
support `name:` and `deploy.resources.limits`.

## 2. Copying `.env.example` verbatim ships `admin123` to production — BLOCKER · FIXED

`.env.example` line: `ADMIN_PASSWORD="admin123"`. The production guard in
`app/api/admin/login/route.ts` only refuses to seed when `ADMIN_PASSWORD` is
**unset** — and `docker-compose.yml` makes it *required* (`${ADMIN_PASSWORD:?}`),
so on this path it is always set. Copy the template, forget that line, and the
staff console — every member's record, every generated document — is behind a
password published in this repository. The README warns "Not `admin123`", but
nothing enforces it.

**Fix:** blank the value in `.env.example` (`ADMIN_PASSWORD=""`, which then
trips compose's own required-variable error), and additionally reject the known
default at runtime in production:

```ts
if (process.env.NODE_ENV === "production" && (!password || password === "admin123")) {
  return "Refusing to create a staff account with the default password in production.";
}
```

## 3. A `/` or `#` in `POSTGRES_PASSWORD` silently breaks the DB URL — FIXED

Compose interpolates the password straight into a connection string:
`postgresql://${POSTGRES_USER}:${POSTGRES_PASSWORD}@db:5432/${POSTGRES_DB}`.
Verified against the URL parser:

| password | result |
| :--- | :--- |
| `Xy7kPq2mNr8t` | OK |
| `p@ssw0rd` | OK (last `@` wins) |
| `ab/cd+ef=gh` | **Invalid URL** |
| `we:ird#pass` | **Invalid URL** |

This is likely to hit: the README suggests `openssl rand -base64 48` for
`AUTH_SECRET`, and anyone reaching for the same generator for the DB password
gets `/` and `+` about half the time. The failure surfaces as a confusing
connection error at first boot, not as "bad password".

**Fix:** generate a URL-safe password —
`openssl rand -hex 32` or `openssl rand -base64 48 | tr -d '/+='` — and say so
in `.env.example`. (`AUTH_SECRET` is unaffected; it is never put in a URL.)

## 4. Container logs are uncapped — will fill the disk — FIXED

Caddy's own access log rotates (`roll_size 10MiB`, `roll_keep 5`), but the
`app` and `db` containers use Docker's default `json-file` driver with **no
rotation**. On a shared box, a filled disk takes down the two existing apps
too, not just the portal.

**Fix** — add to each service in `docker-compose.yml`:
```yaml
    logging:
      driver: json-file
      options: { max-size: "10m", max-file: "5" }
```

## 5. No resource limits on a shared box — FIXED

Nothing caps the portal's memory or CPU, so a runaway request or a large PDF
generation can starve the other two apps — and Postgres, which is the thing you
least want OOM-killed. Add conservative limits sized to what the VPS can spare,
e.g.:
```yaml
    deploy:
      resources:
        limits: { memory: 1.5g }
```
(`deploy.resources.limits` is honoured by `docker compose` v2 without Swarm.)

## 6. Building on the VPS can OOM — ADVISORY

`docker compose up -d --build` runs `next build` on the box; that needs roughly
2GB of headroom on its own, *on top of* the two existing apps and Postgres. The
README's "2 vCPU / 4GB is comfortable" is about steady state, not build time.

**Options:** ensure swap exists (`free -h`; 2GB swapfile is enough), build with
the other services stopped, or build the image elsewhere and push it to a
registry so the VPS only pulls.

## 7. Backups are documented but manual — FIX before go-live

The README gives correct `pg_dump` and volume-tar commands, but nothing runs
them. For a society's membership register and its members' signed deeds, an
unscheduled backup is an intention, not a backup. Put both in cron on day one
and verify a restore once.

Two snags in the documented commands:

- The volume name is hardcoded as `zamcops-member-portal_uploads`, which is
  derived from the **directory name**. Clone into any other directory and the
  command silently backs up nothing. Fix by pinning the project name — add
  `name: zamcops` at the top of `docker-compose.yml`.
- `pg_dump` and the uploads tar must be taken as a **pair**; a database row
  pointing at bytes that a later tar doesn't contain restores to a broken
  document.

## 8. Without `RESEND_API_KEY`, nobody can register — FIX

Registration issues an email OTP, and `POST /api/member/application` refuses to
submit until `emailVerifiedAt` is set. With no email provider configured, every
new member stops at the verification screen and no application can ever be
submitted. The README notes this; it is listed here because it is a **go-live
blocker disguised as an optional setting**.

Configure `RESEND_API_KEY` **and** `EMAIL_FROM` on a domain verified in Resend
(the shared `onboarding@resend.dev` sender only delivers to the Resend account
owner, so it will look like it works in testing and fail for real members).

## 9. Smaller items — ADVISORY

- **`caddy` waits for `app` to start, not to be healthy.** `depends_on: [app]`
  has no `condition: service_healthy`, so Caddy may proxy to a still-migrating
  app for a few seconds after `up`. Harmless (it retries), but the healthcheck
  already exists — use it.
- **`.env` permissions.** It holds the DB password, `AUTH_SECRET` and the staff
  password. `chmod 600 .env` after creating it; on a shared box this matters.
- **Schema sync, not migrations.** `prisma db push` on every boot has no
  migration history and no rollback path. The deliberate omission of
  `--accept-data-loss` makes it safe-by-default, which is the right call for
  now — but for records with legal weight, moving to `prisma migrate deploy`
  before the catalogue grows is worth scheduling.
- **DNS before first `up` (path B only).** Caddy requests the certificate
  immediately; if `PORTAL_DOMAIN` doesn't already resolve to the VPS, the
  request fails and Caddy will back off. Point the A/AAAA record first.
- **Firewall.** Confirm Contabo's firewall and any `ufw` rules allow 80/443
  inbound; Let's Encrypt's HTTP-01 challenge needs port 80 reachable.

---

## Deploy runbook (path A — existing reverse proxy)

```bash
# 0. On the VPS, check what is already bound
sudo ss -tlnp | grep -E ':(80|443|3000)\s'
free -h                                  # confirm swap exists before building

# 1. Get the code
git clone https://github.com/Megamind33-tech/zamcops-member-portal.git
cd zamcops-member-portal

# 2. Configure
cp .env.example .env
chmod 600 .env
openssl rand -hex 32                     # -> POSTGRES_PASSWORD (URL-safe: see §3)
openssl rand -base64 48                  # -> AUTH_SECRET
#   set ADMIN_EMAIL / ADMIN_PASSWORD to real values, NOT admin123   (§2)
#   set RESEND_API_KEY + EMAIL_FROM, or registration cannot complete (§8)
#   PORTAL_DOMAIN / ACME_EMAIL are only needed if you run the bundled Caddy

# 3. Bring up the portal and its database, without Caddy
docker compose up -d --build app db
docker compose logs -f app               # watch the first schema sync

# 4. Verify before wiring the proxy
curl -fsS http://127.0.0.1:3000/api/health          # {"status":"ok","database":"ok"}
docker compose exec app node scripts/preflight.mjs  # checks db, storage, email, SMS

# 5. Point the existing nginx/Caddy at 127.0.0.1:3000 (config in §1), reload it
# 6. Sign in once at https://<domain>/admin to create the staff account
# 7. Schedule the backups in §7, then test a restore
```

For path B (nothing on 80/443 yet), replace steps 3–5 with
`docker compose up -d --build` after pointing DNS at the VPS.

---

## Note on access

This session has **no SSH client and no keys**, and outbound traffic is limited
to an HTTPS agent proxy — so I cannot reach the Contabo box or run any of the
above there. The runbook is written to be executed by someone with shell access;
paste the output back and I can work through whatever it reports.
