# ZAMCOPS Member Portal

A web portal for the **Zambian Music Copyright Protection Society (ZAMCOPS)**.
Membership is restricted to ZAMCOPS' actual mandate — **composers, authors and
publishers** — who can apply for membership (the digitised official application
forms and Deed of Assignment), register a musical work by sending the **song and
its artwork together**, download PDFs issued by staff, and follow royalty
receiving and distribution.

It also includes a separate, wider **staff / admin dashboard** for reviewing
applications, works, submissions and files, issuing the generated documents
(application PDF, signed Deed of Assignment, admission letter, work
declarations and certificates of registration), publishing royalty
distributions and answering support tickets.

It runs on Vercel or on **your own VPS** — see "Self-hosting on a VPS" below
for the Docker Compose stack (portal + PostgreSQL + HTTPS, uploads on disk).

The app has two clearly-separated areas:

- **Member portal** — `app/(portal)/` — a responsive layout with a sidebar on
  desktop and mobile navigation on small screens
- **Admin dashboard** — `app/admin/`

## Tech stack

- **Next.js 15** (App Router) + **React 19** + **TypeScript**
- **Tailwind CSS v3** with the ZAMCOPS institutional light palette
- **Prisma + PostgreSQL** (hosted on Neon; pooled + direct connection URLs)
- **Auth:** hashed passwords (bcryptjs) + signed JWT in an httpOnly cookie
  (jose), enforced both in route handlers and in `middleware.ts`
- **File storage:** a directory on the host (`LOCAL_STORAGE_DIR` — the default
  when self-hosting), Cloudflare R2 or any S3-compatible bucket, or Vercel
  Blob, with an inline base64 fallback in the database for small files (≤4MB)
  and the system-generated PDFs
- **Notifications:** email via Resend and SMS via Africa's Talking, both
  optional (`lib/notify.ts`); registration email verification uses OTP codes
- **API:** Next.js Route Handlers under `app/api/`
- PWA: web manifest, icon and a minimal service worker

## Run locally

A PostgreSQL database is **required** (a free [Neon](https://neon.tech)
project works well). Copy the env template and fill it in:

```bash
cp .env.example .env   # then set DATABASE_URL, DIRECT_URL, AUTH_SECRET, ...
npm install            # runs `prisma generate` and pushes the schema if the DB is reachable
npm run dev            # http://localhost:3000
```

Build for production:

```bash
npm run build && npm start
```

### Environment

See `.env.example` for the full annotated list:

- `DATABASE_URL` — **required.** Pooled PostgreSQL connection string used at
  runtime (for Neon, the `-pooler` host).
- `DIRECT_URL` — **required.** Direct (non-pooled) connection used by
  `prisma db push` / migrations.
- `AUTH_SECRET` — secret used to sign session JWTs. **Required in
  production** — the app refuses to fall back to the dev secret.
- `ADMIN_EMAIL` / `ADMIN_PASSWORD` / `ADMIN_NAME` — the staff account,
  created on first admin sign-in. **Required in production** — the default
  `admin123` account is only seeded in development.
- `R2_ACCOUNT_ID` / `R2_ACCESS_KEY_ID` / `R2_SECRET_ACCESS_KEY` /
  `R2_BUCKET` — Cloudflare R2 for large-file uploads (preferred; see
  "File storage" below and `.env.example` for bucket + CORS setup).
- `BLOB_READ_WRITE_TOKEN` — Vercel Blob, used when R2 is not configured
  (small files fall back to inline storage without either).
- `RESEND_API_KEY` / `EMAIL_FROM` — email channel (OTP codes, notifications).
- `AT_USERNAME` / `AT_API_KEY` / `AT_SENDER_ID` — SMS via Africa's Talking.

## File storage (Cloudflare R2)

Without R2, uploads are capped at **4MB** and stored as base64 **inside the
PostgreSQL database** — which fills a Neon free tier quickly and makes every
query heavier. Setting the four `R2_*` vars moves audio masters, artwork and
documents to a private R2 bucket instead (10GB free, no egress fees), lifting
the per-file limit to 300MB. This is a configuration change only; the code
path already exists and needs no edits.

1. Cloudflare dashboard → **R2** → create a bucket. Keep it **private** —
   members' files must never be publicly readable.
2. **R2 → Manage API Tokens** → create a token with **Object Read & Write**
   scoped to that bucket. Copy the Access Key ID and Secret; the Account ID is
   on the R2 overview page.
3. On the bucket → **Settings → CORS policy**, allow the browser's direct
   upload (see `.env.example` for the exact JSON).
4. Set `R2_ACCOUNT_ID`, `R2_ACCESS_KEY_ID`, `R2_SECRET_ACCESS_KEY` and
   `R2_BUCKET` — locally in `.env`, and on the host as environment variables.
   All four must be present; if any is missing the app silently falls back to
   Vercel Blob and then to inline storage.
5. Verify end to end with `npm run check:r2` (see "Deploying on free
   tiers" below). It uploads a small object through a presigned PUT, reads it
   back through a presigned GET, confirms the bucket rejects unsigned reads,
   probes the CORS rule that only browsers exercise, and deletes the object.

### Moving existing files out of the database

R2 only catches new uploads. Anything uploaded before it was configured is
still base64 in Postgres, taking up the Neon free branch. `npm run preflight
-- db` reports how much. To move it:

```bash
npm run backfill:r2                      # dry run — lists what would move
npm run backfill:r2 -- --apply           # move it
npm run backfill:r2 -- --apply --limit 1 # or try a single file first
```

It covers both member uploads and the documents on a member's file, largest
first. Per file the order is upload → verify the bytes landed → only then
point the row at R2 and clear `data`, so an interrupted or failed run leaves
the row untouched with its data intact and re-running simply redoes it. Rows
that already live in R2 are skipped. Only one file is held in memory at a
time, so a large backlog does not need a large machine.

Postgres does not release the freed pages until it vacuums; run
`npm run preflight -- db` afterwards to see the result.

## Self-hosting on a VPS

`docker compose up -d --build` brings up the whole portal on one machine: the
Next.js server, PostgreSQL, and Caddy terminating HTTPS with a certificate it
obtains and renews by itself. No Vercel, no Neon, no Cloudflare account.

```bash
git clone <this repo> && cd zamcops-member-portal
cp .env.example .env         # fill in the VPS block — see below
docker compose up -d --build
docker compose logs -f app   # watch the first schema sync
```

Fill in these before the first `up`:

| Variable | What it is |
| :--- | :--- |
| `PORTAL_DOMAIN` | the domain Caddy requests a certificate for. **Point its DNS at the VPS first** — the certificate request fails otherwise. |
| `ACME_EMAIL` | where Let's Encrypt sends expiry warnings. |
| `POSTGRES_PASSWORD` | required, no default. A long random string. |
| `AUTH_SECRET` | signs session cookies. A long random string — `openssl rand -base64 48`. Changing it signs everyone out. |
| `ADMIN_EMAIL` / `ADMIN_PASSWORD` | the staff account, created on first sign-in at `/admin`. Not `admin123`. |

`DATABASE_URL` and `DIRECT_URL` are built for you from the `POSTGRES_*` values;
leave them as they are. `RESEND_API_KEY` and the `AT_*` SMS variables stay
optional — leave them empty and those channels simply stay off (but note that
**registration needs email**: without it nobody can verify an address and
complete a membership application).

### What runs where

- **app** — the portal, published on `127.0.0.1:3000` only. Caddy reaches it
  over the compose network; nothing else can.
- **db** — PostgreSQL 16, not published at all.
- **caddy** — ports 80/443. Drop this service (`docker compose up -d app db`)
  if you already run nginx on the box, and proxy to `127.0.0.1:3000` yourself.

Uploads go to the `uploads` volume (`/data/uploads` in the container) rather
than into PostgreSQL, so a 300MB master costs the database nothing. Nothing
under that directory is served statically — every download goes through an
authenticated route, exactly as with R2.

### Operating it

```bash
docker compose ps                       # what is up
docker compose logs -f app              # portal logs
docker compose pull && docker compose up -d --build   # deploy a new version
docker compose exec app node scripts/preflight.mjs    # check the live config
curl -fsS https://$PORTAL_DOMAIN/api/health           # {"status":"ok"}
```

**Back up two things, together:** the `db-data` volume and the `uploads`
volume. Either one alone is useless — the database holds the rows that name
the files, the volume holds the bytes.

```bash
docker compose exec -T db pg_dump -U zamcops zamcops | gzip > zamcops-$(date +%F).sql.gz
docker run --rm -v zamcops_uploads:/data -v "$PWD":/backup alpine \
  tar czf /backup/uploads-$(date +%F).tar.gz -C /data .
```

The container syncs the schema with `prisma db push` on every start. It is
idempotent, and it deliberately runs *without* `--accept-data-loss`: a schema
change that would drop a column stops the deploy instead of quietly discarding
members' records. Work through one by hand with `SKIP_DB_PUSH=1` set.

### Sizing

Two vCPU and 4GB of RAM is comfortable for a society of this size. Disk is the
part that grows: audio masters at 30–100MB each add up far faster than the
database does, so size the volume for the catalogue rather than for the rows.

### Using S3 instead of the local disk

Set `S3_ENDPOINT` together with `S3_ACCESS_KEY_ID` / `S3_SECRET_ACCESS_KEY` /
`S3_BUCKET` (or the `R2_*` equivalents) and uploads are signed against that
endpoint instead — MinIO in a container beside the portal, Cloudflare R2, or
another provider. Leave `LOCAL_STORAGE_DIR` empty when you do; it takes
precedence over everything else.

## Generated documents

Every official document the society issues is rendered server-side with jsPDF
on the same letterhead (`lib/pdfKit.ts`), so the stationery can only change in
one place. Official signature images are drawn on the server and never reach
the client — members receive the rendered PDF, not the signature.

**On approval of a membership application** (`lib/issueDocuments.ts` →
`issueMemberDocuments`), filed under the member's documents:

1. **Membership application** — the completed Individual / Group / Publisher
   form, field for field, with the applicant's signature under the declaration.
2. **Deed of Assignment** (incl. Mechanical) — the full legal text
   (`lib/deedText.ts`), signed by the Assignor and counter-signed by the Board
   Secretary.
3. **Admission letter** — signed by the General Manager.

**On approval of a work** (`issueWorkDocuments`), filed the same way:

4. **Declaration of a Musical Work** — every particular declared (titles, type,
   language, genre, duration, ISWC/ISRC, date created), composers, authors,
   arrangers and publisher with IPI numbers, the full **schedule of interested
   parties** (capacity, rights stream, IPI/CAE, how each party is identified,
   share, and a total that is flagged on the face of the document when it does
   not reach 100%), the evidence lodged, and the member's signature under the
   seven declaration clauses (`lib/workDeedText.ts`).
5. **Certificate of Registration** — the same particulars, certified and
   counter-signed by the Board Secretary.

Members can download the declaration for any of their works **before** approval
from *My catalogue → Declaration*; it is rendered per request
(`app/api/member/works/[id]/declaration`), so it always reflects the current
particulars. The certificate exists only once the work is in the register.

Both require the member's stored signature and the Board Secretary's official
signature (*Admin → Official Signatures*). If either is missing, the work is
still approved and staff are told what is missing; **Admin → Work Declarations
→ Re-issue** generates the pair once it is fixed, and after any later amendment.

## Deploying on free tiers

Every service the portal needs has a free plan that covers it, with one
exception (SMS). Run `npm run preflight` before deploying — it talks to each
real service with the real credentials and reports what would break.

| Need | Service | Free allowance |
| :--- | :--- | :--- |
| Hosting | Vercel Hobby | non-commercial use only — see the caveat below (or self-host, above) |
| Database | Neon | 0.5 GB per branch |
| File storage | Cloudflare R2 | 10 GB, no egress fees |
| Email / OTP | Resend | 3,000 per month, 100 per day |
| SMS | Africa's Talking | **none** — billed per message |

SMS is the only piece with no free tier. Leave `AT_*` unset and the app skips
it: every notice still reaches members in-app and by email. Nothing else
degrades.

### Preflight

```bash
npm run preflight                 # every section
npm run preflight -- email        # core | db | storage | email | sms
npm run preflight -- --origin https://staging.example.org
npm run check:r2                  # alias for the storage section
```

It exits non-zero on a **blocker** — something that breaks a member-facing
flow — and zero on advisories. Checks, per section:

- **core** — `AUTH_SECRET` present and long enough (production refuses to sign
  sessions without it, so every login fails); `ADMIN_PASSWORD` set and not
  the `admin123` placeholder (no staff account can be created otherwise).
- **db** — the database is reachable, how much of Neon's 0.5 GB is used, and
  how much of that is files kept inline as base64 rather than in R2.
- **storage** — the real upload path: presigned PUT, read back, the bucket
  refuses unsigned reads, the CORS rule browsers need, then cleanup.
- **email** — `EMAIL_FROM` parses, the Resend key is accepted, and its domain
  is actually *verified* on that account. This one matters most: registration
  issues a 6-digit code by email, and a member cannot submit a membership
  application until it is verified (`app/api/member/application/route.ts`).
  If mail does not deliver, nobody can complete the flow the portal exists
  for — and the failure is silent server-side.
- **sms** — reports whether SMS is off (fine), in sandbox (simulator only), or
  live and billing.

### Two caveats worth knowing

- **Vercel's Hobby plan is for non-commercial use.** A collecting society
  running member operations on it is a licensing risk, not a technical one.
  Nothing in the code depends on the plan.
- **Neon's free branch is 0.5 GB**, and without R2 every upload is base64'd
  into it at up to 4 MB each. `npm run preflight -- db` shows exactly how much
  of the database that accounts for.

## Accounts

- **Member portal:** register at `/register` (Composer, Author or Publisher),
  verify your email with the OTP code, then sign in at `/login`.
- **Admin dashboard** (`/admin`): sign in with the `ADMIN_*` credentials.

## Structure

```
app/
  (portal)/              # member-facing portal
    page.tsx             # splash
    onboarding/ login/ register/ verify-email/ forgot-password/
    (member)/            # authenticated screens (sidebar layout)
      dashboard/ application/ documents/ works/ works/new/
      submit/ submit/single/ submit/album/
      uploads/ royalties/ statements/ licensing/ licensing/new/
      notifications/ profile/ support/ settings/
  admin/                 # wider staff dashboard
    login/ members/ directory/ works/ songs/ albums/ files/
    royalties/ distributions/ licensing/ reports/ signatures/
    support/ team/
  api/                   # route handlers (auth, member, admin, blob)
components/              # UI primitives, media, admin shell
data/                    # reference lists (provinces, genres, languages)
lib/                     # db client, auth/session, PDFs, notify, helpers
prisma/                  # schema (PostgreSQL)
types/                   # domain models
public/                  # manifest, icon, service worker
docker/                  # entrypoint + Caddyfile for self-hosting
Dockerfile               # production image (Next.js standalone)
docker-compose.yml       # portal + PostgreSQL + Caddy, for one VPS
```

## Notes

- `prisma db push` runs automatically on install when the database is
  reachable; run `npm run db:push` manually after schema changes.
- Generated member documents (application form, Deed of Assignment,
  admission letter, work declarations and certificates of registration) are
  issued by staff at approval and stored inline in the database; members can
  download them once their membership is Active. See "Generated documents".
- Royalty figures under "Royalties" separate **receiving** (amounts
  actually distributed to the member) from **detected usage**. Confirmed
  amounts appear only once staff publish a Distribution.
