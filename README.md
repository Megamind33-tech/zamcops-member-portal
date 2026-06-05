# ZAMCOPS Member Portal

A **mobile-first web app / PWA** for the **Zambian Music Copyright Protection
Society (ZAMCOPS)**. It lets artists, composers, producers, publishers, labels
and rightsholders register as members, declare their musical works, submit
singles and albums, track royalties and manage their membership — all from an
Android-style app experience in the browser.

It also includes a separate, wider **staff / admin dashboard** for reviewing
applications, works, submissions, files and royalties.

## Tech stack

- **Next.js 15** (App Router) + **React 19** + **TypeScript**
- **Tailwind CSS** with a ZAMCOPS institutional theme (deep blue + gold)
- **lucide-react** icons
- Client-side **mock data** persisted to `localStorage` (no backend required)
- PWA: web manifest, icon and a minimal service worker

## Run locally

```bash
npm install
npm run dev
# open http://localhost:3000
```

Build for production:

```bash
npm run build && npm start
```

## Demo accounts

- **Member app:** `demo@zamcops.org.zm` / `demo1234` (or register a new account)
- **Admin dashboard** (`/admin`): `admin@zamcops.org.zm` / `admin123`

## Structure

```
app/
  (mobile)/            # phone-width artist app + auth (route group)
    page.tsx           # splash
    onboarding/ login/ register/ forgot-password/
    (member)/          # authenticated screens with bottom nav
      dashboard/ profile/ works/ works/new/
      submit/ submit/single/ submit/album/
      uploads/ royalties/ statements/ notifications/ support/ settings/
  admin/               # wider staff dashboard
    login/ members/ works/ songs/ albums/ files/ royalties/ reports/
components/            # UI primitives, mobile chrome, admin shell
data/                  # mock seed data
lib/                   # store (context), formatting, auth helpers
types/                 # domain models
public/                # manifest, icon, service worker
```

## Notes

- Data is mock/local only. File pickers record file names but do not upload.
- Royalty figures are realistic placeholders for prototype purposes.
- Use **Settings → Reset demo data** in the app to restore seeded content.
