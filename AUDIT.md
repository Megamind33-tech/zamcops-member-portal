# ZAMCOPS Member Portal — Consistency Audit

Date: 2026-07-30 · Branch: `claude/confident-hawking-rk867y` · Baseline: `a669002`

Status at time of audit: `npx tsc --noEmit` passes, `next build` passes,
`npm run lint` is broken (see A-7). Findings are ordered by severity within
each section, with file references.

---

## A. Functional bugs (behaviour is inconsistent with intent)

### A-1. `hasFile` is always false for inline-stored files — download/play buttons disappear
`uploadDTO` and `memberDocumentDTO` compute `hasFile: !!(d.data || d.url)`
(`lib/serialize.ts:154`, `lib/serialize.ts:280`), but every listing query strips
`data` with Prisma `omit`:

- `app/api/member/bootstrap/route.ts:43` (uploads)
- `app/api/member/documents/route.ts:18` (member documents)
- `app/api/admin/overview/route.ts:31,36` (uploads + member documents)

With `omit: { data: true }` the field is absent, so for any file stored inline
(uploads ≤ 4 MB **and all system-generated PDFs**, which `lib/issueDocuments.ts:112`
writes to `data` with an empty `url`) `hasFile` evaluates to `false`. Consequences:

- Members see their approved Membership Application / Deed of Assignment /
  Admission Letter with **no download button** (`app/(portal)/(member)/documents/page.tsx:97`).
- Staff can't download those documents either — `AdminDocDownload` renders
  nothing when `!hasFile` (`components/admin/ApplicationPanel.tsx:264`).
- The admin Files page hides Play/Download for every inline upload
  (`app/admin/files/page.tsx:72,97,112`).

The direct download endpoints themselves work (they read the full row), the UI
just never offers them. Fix by having the list queries return a real
"has bytes" signal (e.g. `select` a computed boolean, or keep a `fileSize`/flag
column maintained at write time) instead of deriving it from an omitted column.

### A-2. Middleware doesn't guard `/application` and `/documents`
`middleware.ts:10-22` lists member paths, and the matcher repeats them
(`middleware.ts:67-82`) — but `/application` and `/documents` (both in the
member sidebar, `components/member/MemberSidebar.tsx:28-29`) are missing from
both lists. Those two pages fall back to the client-side guard only, which is
exactly the flash-then-redirect the middleware's own comment says it exists to
prevent. Root cause worth fixing too: the path list is duplicated in two places
in the same file, so additions have to be made twice.

### A-3. Phone numbers are not unique, but are used as a login identifier
- `prisma/schema.prisma:46` — `phone String` has no `@unique`.
- Registration checks for duplicates manually (`app/api/auth/register/route.ts:26-29`),
  but the profile editor lets a member change `phone` to any value with no
  uniqueness check (`app/api/member/profile/route.ts:10,24-28`).
- Login resolves the identifier with `findFirst` over email OR phone
  (`app/api/auth/login/route.ts:21-23`), so once two members share a phone,
  phone-login silently picks an arbitrary account. The reset-request flow has
  the same ambiguity (`app/api/auth/reset-request/route.ts:20-22`).

Fix: make `phone` `@unique` (after de-duping data), and validate uniqueness in
the profile PATCH.

### A-4. Member-number generation can collide and 500
`genMemberNumber()` picks a random 5-digit number (`lib/server.ts:8-12`) and
`memberNumber` is `@unique`. There's no retry, so a collision makes
registration throw an unhandled Prisma error (HTTP 500) instead of retrying.
~1% collision odds by ~1,300 members in a year (birthday problem on 90k values,
scoped per year).

### A-5. "Under Review" status exists but is unreachable/invisible
- `types/index.ts:10` and the admin review route (`app/api/admin/review/route.ts:9`)
  support `"Under Review"`, and the admin widgets can render its badge
  (`components/admin/widgets.tsx:88`), but no admin UI ever sets it
  (`app/admin/works/page.tsx:67-69` offers only Approve/Reject).
- The member Works filter list omits it (`app/(portal)/(member)/works/page.tsx:18`),
  so if it were ever set, members could not filter to it.

Either wire it up in the admin UI or drop it from the type/route.

### A-6. Upload `fileType` accepted unvalidated
`app/api/member/upload/route.ts:25,43` casts client input to `UploadType`
without checking membership of the allowed set — any string is persisted, and
downstream UI switches on exact values ("Audio" gets Processing status, etc.).

---

## B. Security / configuration inconsistencies

### B-1. Default admin credentials are auto-seeded, including in production
`app/api/admin/login/route.ts:9-19` creates `admin@zamcops.org.zm` /
`admin123` on first login attempt whenever `ADMIN_EMAIL`/`ADMIN_PASSWORD` are
unset — with no production guard. A deploy that forgets those env vars is
enterable by anyone who reads the README. At minimum, refuse to seed with the
default password when `NODE_ENV === "production"`.

### B-2. `AUTH_SECRET` falls back to a published dev secret in production
Both `lib/auth.ts:17-24` (warns, then proceeds) and `middleware.ts:24-26`
(silent) fall back to `"dev-zamcops-secret-change-in-production"`, which is in
the public repo — forged session cookies become trivial. Production should fail
closed. Also note the cookie name and secret logic are duplicated between the
two files and must be kept in sync by hand.

### B-3. Linting is entirely broken
- `eslint` and `eslint-config-next` are not in `package.json` at all, so
  `npm run lint` errors ("ESLint must be installed").
- Two conflicting config files exist: legacy `.eslintrc.json` and flat
  `eslint.config.mjs` (which imports the uninstalled `eslint-config-next`).
- `next.config.ts:5-7` sets `eslint.ignoreDuringBuilds: true`, so builds hide
  the breakage.

Pick one config format, install the packages, and re-enable lint in builds.

---

## C. Dependency & tooling inconsistencies (`package.json`)

| # | Finding | Detail |
|---|---------|--------|
| C-1 | Tailwind v3 and v4 both installed | `tailwindcss@3.4.19` (used — `tailwind.config.js` + `postcss.config.mjs` use the v3 plugin) alongside `@tailwindcss/postcss@4.3.0` (v4, completely unused). Remove the v4 package. |
| C-2 | `framer-motion` and `motion` both installed | Same library twice (both resolve to 11.18.2). Only `framer-motion` is imported (3 files). `next.config.ts:23` `transpilePackages: ['motion']` is dead config. |
| C-3 | `@types/bcryptjs` redundant | `bcryptjs@3.x` ships its own types; the DT stub targets the 2.x API. |
| C-4 | Build-time packages in `dependencies` | `autoprefixer`, `@tailwindcss/postcss` belong in `devDependencies`. |
| C-5 | `tsconfig.tsbuildinfo` committed | Incremental-build cache (142 KB) is tracked; add to `.gitignore`. |
| C-6 | `.gitignore` has SQLite leftovers | Ignores `/prisma/dev.db*` but the datasource is PostgreSQL/Neon. |
| C-7 | Mojibake + leftover config in `next.config.ts` | Line 26: "Do not modifyâfile watching" (broken en-dash); `picsum.photos` remote-image allowance appears to be a leftover from scaffolding (no code references picsum). |

---

## D. Documentation is out of date with the code

### D-1. README.md contradicts the current app on most counts
- Claims **Prisma + SQLite** and "change provider for hosted deploys" — schema
  is PostgreSQL with Neon pooled/direct URLs (`prisma/schema.prisma:10-14`).
- Claims "**No `.env` is required**" — `DATABASE_URL` is now mandatory.
- Claims "binary upload/storage is **not yet implemented**" — inline base64 and
  Vercel Blob uploads both exist (`app/api/member/upload`, `app/api/blob/upload`).
- Claims the member portal is "phone-width / Android-style" — it's now a
  responsive sidebar layout (`app/(portal)/(member)/layout.tsx`).
- Membership described as "artists, composers, producers, publishers, labels" —
  registration is restricted to Composer / Author / Publisher
  (`app/api/auth/register/route.ts:11`, commit `0d0a1e7`). Same stale wording in
  `metadata.json` and the `Member` model comment (`prisma/schema.prisma:41`).
- The structure listing omits `application/`, `documents/`, `licensing/`,
  `statements/`, `verify-email/`, and several admin pages.

### D-2. Stale inline comments
- `app/api/auth/reset-request/route.ts:7` and
  `app/api/admin/members/reset-password/route.ts:18` say "No email service is
  configured yet" — Resend integration exists (`lib/notify.ts`) and is already
  used for OTP email. The reset flow could email members directly now.

---

## E. Design-system / component debt

### E-1. Two parallel UI kits with a CSS shim bridging them
- New light "zam" kit: `components/zam/*` + `zam` palette (member portal, admin shell/widgets).
- Old dark "Midnight Studio" kit: `components/ui/*` + `brand/night/iris/gold/pop/accent`
  palettes — still used by **13 admin pages** (`app/admin/*`) and
  `components/admin/ApplicationPanel.tsx`.
- `app/globals.css:250+` contains a remap layer (`.admin-surface .text-night-* { … }`)
  that re-colours the dark-palette classes to light-theme values so the old
  pages look right on the new canvas. It works, but every new colour used in an
  admin page needs a matching override, and pages mix both palettes
  (e.g. `app/admin/support/page.tsx` uses `zam-*` and `night-*` together).

Recommended direction: migrate the remaining admin pages to the zam kit, then
delete the shim and the unused palettes from `tailwind.config.js`.

### E-2. Dead components (no imports anywhere)
- `components/SplitEditor.tsx` (superseded by `components/zam/SplitsEditor.tsx`)
- `components/SubmitSuccess.tsx` (superseded by `components/zam/SubmitSuccess.tsx`)
- `components/auth/AuthScreen.tsx`
- `components/mobile/BottomNav.tsx`, `components/mobile/TopBar.tsx`
  (superseded by `components/member/MemberBottomBar.tsx` / `MemberTopbar.tsx`)
- `components/zam/Modal.tsx`

Safe to delete; keeping look-alike duplicates invites edits to the wrong file.

---

## F. Business-logic questions (flagging, not asserting)

- **K350 "Membership Receipt" issued at registration** (`lib/server.ts:23-31`)
  — a receipt for a fixed fee is created before any payment or approval exists.
  If the fee isn't collected at registration, this is a receipt for money never
  received.
- **"Royalty Statement" type is defined but never generated** (`types/index.ts:30-33`)
  — statements only ever come from registration and submissions.
- **Document downloads gated on `membershipStatus === "Active"`**
  (`app/api/member/documents/[id]/route.ts:22`) also blocks a member from
  retrieving documents they themselves uploaded (e.g. ID copies) while Pending.
  Possibly intended; worth confirming.
- **In-memory rate limiter** (`lib/rateLimit.ts`) — per-instance on serverless,
  as its own comment acknowledges. Fine for now; revisit before launch.

---

## Suggested fix order

1. **A-1** (`hasFile`) — breaks the flagship approval-documents feature.
2. **B-1 / B-2** — production credential/secret hardening (small diffs).
3. **A-2, A-3, A-4** — middleware paths, phone uniqueness, member-number retry.
4. **B-3 + C-1…C-7** — restore lint, prune dependencies (one cleanup PR).
5. **D-1, D-2** — rewrite README, fix stale comments.
6. **E-1, E-2** — admin palette migration + dead-code deletion (largest, purely cosmetic).
