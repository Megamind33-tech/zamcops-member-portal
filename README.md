# ZAMCOPS Member Portal

A web portal for the **Zambian Music Copyright Protection Society (ZAMCOPS)**.
Membership is restricted to ZAMCOPS' actual mandate — **composers, authors and
publishers** — who can apply for membership (the digitised official application
forms and Deed of Assignment), declare their musical works, submit singles and
albums, track royalty distributions, opt works into direct/sync licensing and
manage their membership.

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
- **File storage:** Vercel Blob for large files (audio), with an inline
  base64 fallback in the database for small files (≤4MB) and the
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
- `BLOB_READ_WRITE_TOKEN` — Vercel Blob token for large-file uploads
  (small files fall back to inline storage without it).
- `RESEND_API_KEY` / `EMAIL_FROM` — email channel (OTP codes, notifications).
- `AT_USERNAME` / `AT_API_KEY` / `AT_SENDER_ID` — SMS via Africa's Talking.

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
- Royalty figures under "royalties" are detected-activity estimates; members
  only see confirmed amounts once staff publish a Distribution.
