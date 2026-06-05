# ZAMCOPS Member Portal

A **mobile-first web app / PWA** for the **Zambian Music Copyright Protection
Society (ZAMCOPS)**. It lets artists, composers, producers, publishers, labels
and rightsholders register as members, declare their musical works, submit
singles and albums, track royalties and manage their membership — all from an
Android-style app experience in the browser.

It also includes a separate, wider **staff / admin dashboard** for reviewing
member applications, works, submissions, files and royalties.

The app has two clearly-separated areas:

- **Member portal** — `app/(portal)/` (artists **and** publishers, by role)
- **Admin dashboard** — `app/admin/`

## Tech stack

- **Next.js 15** (App Router) + **React 19** + **TypeScript**
- **Tailwind CSS** with a ZAMCOPS institutional theme (deep blue + gold)
- **Prisma + SQLite** database (real persistence)
- **Auth:** hashed passwords (bcrypt) + signed JWT in an httpOnly cookie (jose)
- **API:** Next.js Route Handlers under `app/api/`
- PWA: web manifest, icon and a minimal service worker

## Run locally

```bash
npm install          # also runs `prisma generate`
npm run db:push      # create the SQLite database from the schema
npm run dev          # http://localhost:3000
```

Build for production:

```bash
npm run build && npm start
```

### Environment

Copy `.env.example` to `.env` and adjust as needed:

- `DATABASE_URL` — defaults to a local SQLite file (`file:./dev.db`).
- `AUTH_SECRET` — secret used to sign session tokens.
- `ADMIN_EMAIL` / `ADMIN_PASSWORD` / `ADMIN_NAME` — the staff account, created
  automatically on first admin sign-in.

## Accounts

- **Member portal:** register a new account at `/register`, then sign in at `/login`.
- **Admin dashboard** (`/admin`): sign in with the `ADMIN_*` credentials from `.env`.

## Structure

```
app/
  (portal)/            # member portal (artists & publishers) — phone-width
    page.tsx           # splash
    onboarding/ login/ register/ forgot-password/
    (member)/          # authenticated screens with bottom nav
      dashboard/ profile/ works/ works/new/
      submit/ submit/single/ submit/album/
      uploads/ royalties/ statements/ notifications/ support/ settings/
  admin/               # wider staff dashboard
    login/ members/ works/ songs/ albums/ files/ royalties/ reports/
  api/                 # route handlers (auth, member, admin)
components/            # UI primitives, mobile chrome, admin shell
data/                  # reference lists (provinces, genres, languages)
lib/                   # db client, auth, server helpers, client store
prisma/                # schema (SQLite)
types/                 # domain models
public/                # manifest, icon, service worker
```

## Deploying to a hosted database

SQLite is used for a self-contained local setup. For a hosted deploy, change the
`datasource` provider in `prisma/schema.prisma` to `postgresql` (or `mysql`),
point `DATABASE_URL` at your database, and run `npx prisma migrate deploy`.

## Notes

- File pickers record the chosen file name only; binary upload/storage is not
  yet implemented.
- Royalty figures shown are illustrative until usage ingestion is connected.
