# ZAMCOPS Member Portal

A web portal for the **Zambian Music Copyright Protection Society (ZAMCOPS)**.
Membership is restricted to ZAMCOPS' actual mandate — **composers, authors and
publishers** — who can apply for membership (the digitised official application
forms and Deed of Assignment), register a musical work by sending the **song and
its artwork together**, download PDFs issued by staff, and follow royalty
receiving and distribution.

It also includes a separate, wider **staff / admin dashboard** for reviewing
applications, works, submissions and files, issuing the generated membership
documents (application PDF, signed Deed, admission letter), publishing royalty
distributions and answering support tickets.

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
- **File storage:** Cloudflare R2 (preferred — private bucket, presigned
  uploads up to 300MB) or Vercel Blob for large files (audio), with an
  inline base64 fallback in the database for small files (≤4MB) and the
  system-generated PDFs
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

Existing files already stored inline stay where they are — R2 applies to
uploads made after it is configured.

## Deploying on free tiers

Every service the portal needs has a free plan that covers it, with one
exception (SMS). Run `npm run preflight` before deploying — it talks to each
real service with the real credentials and reports what would break.

| Need | Service | Free allowance |
| :--- | :--- | :--- |
| Hosting | Vercel Hobby | non-commercial use only — see the caveat below |
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
```

## Notes

- `prisma db push` runs automatically on install when the database is
  reachable; run `npm run db:push` manually after schema changes.
- Generated member documents (application form, Deed of Assignment,
  admission letter) are issued by staff at approval and stored inline in the
  database; members can download them once their membership is Active.
- Royalty figures under "Royalties" separate **receiving** (amounts
  actually distributed to the member) from **detected usage**. Confirmed
  amounts appear only once staff publish a Distribution.
