# SmartHub

> تطبيق إسلامي شامل: أوقات الصلاة، الأذكار، القرآن الكريم، التقويم الهجري، الطقس، الألعاب والمراسلة في مكان واحد.

A comprehensive Islamic companion web app. It bundles **prayer times** (Aladhan + astronomical calculation), a dual **Hijri/Gregorian calendar**, Quran virtues, prophetic-day routines, timed and untimed Sunnah libraries, duas, a classical **Arabic poetry diwan**, **weather** (Open-Meteo), Islamic occasions, an **RSS reader**, end-to-end **messaging**, and a small collection of **games**. The interface ships in Arabic (RTL) and German with an "Obsidian Depth" dark theme.

A machine-readable summary of every page lives at [`public/llms.txt`](./public/llms.txt).

---

## Quickstart

Prerequisites: **[Bun](https://bun.sh)** ≥ 1.2 (the project uses `bun.lock` exclusively — see [Package Manager](#package-manager)).

```bash
# 1. Install dependencies
bun install

# 2. Configure the backend (Supabase). See `.env.example`.
cp .env.example .env
$EDITOR .env

# 3. Start the dev server (Vite, port 8080)
bun run dev
```

Open `http://localhost:8080`. The app degrades gracefully when Supabase isn't configured — local-only features (prayer times, weather, games, static Diwan content) keep working, and a single console banner explains what's disabled.

---

## Scripts

| Command | What it does |
|---|---|
| `bun run dev` | Vite dev server with HMR on `:8080` |
| `bun run build` | Production build (Rollup → `dist/`) |
| `bun run build:dev` | Development-mode build (sourcemaps, no minification) |
| `bun run preview` | Serve the built `dist/` locally |
| `bun run lint` | ESLint over `src/` |
| `bun run test` | Vitest in single-run mode |
| `bun run test:watch` | Vitest in watch mode |
| `bun run e2e` | Playwright end-to-end tests |
| `bun run diwan:scrape` | One-off scraper for adab.com (Diwan ingest) |
| `bun run diwan:ingest` | Push scraped diwan data into Supabase |
| `bun run diwan:seed` | Seed local Diwan tables from the scraped JSON |

---

## Tech Stack

- **Build / dev** — Vite 5 + SWC, TypeScript 5 strict mode, Tailwind 3 with design tokens, shadcn-style primitives (Radix + tailwind-variants).
- **Frontend** — React 18, React Router 6, framer-motion, lucide-react, TanStack Query for server state.
- **Backend** — Supabase (Postgres + Row-Level Security + Auth + Realtime + Storage + Edge Functions in `supabase/functions/`).
- **Astronomy** — `adhan` for prayer-time calculation, with the [Aladhan API](https://aladhan.com/prayer-times-api) used as the primary source and `adhan` as offline fallback.
- **Weather** — [Open-Meteo](https://open-meteo.com) (no API key required).
- **PWA** — manifest + service worker for fonts (`public/fonts-sw.js`) and reading-mode caching (`public/reading-sw.js`).
- **Tests** — Vitest for unit, Playwright for E2E.

---

## Project Structure

```
src/
├─ App.tsx                   # Routing + persistent-tabs layer
├─ main.tsx                  # Entry point
├─ components/
│  ├─ ui/                    # shadcn primitives
│  ├─ chat/                  # Drawer-based 1-to-1 messenger
│  └─ diwan/                 # Poetry browsing surfaces
├─ pages/                    # Route components (lazy where it makes sense)
├─ features/
│  ├─ reading/               # RSS reader (sync + offline)
│  └─ wellness/              # Nutrition / vitals / supplements / fitness
├─ hooks/                    # useAuth, useUnreadMessages, useDeviceLocation, ...
├─ contexts/                 # AppContext (theme, language, settings)
├─ integrations/supabase/    # Client + generated DB types
├─ lib/                      # Utility modules (diwan API, navPerf, reverseGeocode)
├─ data/                     # Static datasets (poetry, occasions, sunnah)
└─ utils/themeEngine.ts      # Dynamic palette generator (Material-3-style)

docs/architecture/           # ADR-style notes on persistent tabs & Diwan library
supabase/
├─ functions/                # Edge functions (RSS, keyword alerts, search)
└─ migrations/               # SQL migrations
scripts/diwan/               # One-shot scrapers + ingest pipeline
```

### Persistent tabs

Three of the seven bottom-nav tab routes (`/`, `/games`, `/chat`, `/settings`, `/duas`) are eager-imported in [`src/App.tsx`](./src/App.tsx) and rendered together inside `<PersistentTabs>` — switching between them is a `display:none` toggle, not a remount. The data-heavy `/wellness` and `/diwan` tabs are lazy-loaded so a cold homepage visit doesn't pay for them. Details: [`docs/architecture/persistent-tabs.md`](./docs/architecture/persistent-tabs.md).

### Diwan library

Adab.com integration with offline fallback to bundled JSON. Architecture: [`docs/architecture/diwan-library.md`](./docs/architecture/diwan-library.md).

---

## Environment Variables

See [`.env.example`](./.env.example) for the full list. The required browser-side variables are:

| Variable | Purpose |
|---|---|
| `VITE_SUPABASE_URL` | Project URL, e.g. `https://xxx.supabase.co` |
| `VITE_SUPABASE_PUBLISHABLE_KEY` | Anon (publishable) key — safe to ship to the client |
| `VITE_SUPABASE_PROJECT_ID` | Used by some edge-function URLs |

Server-side scripts (`scripts/diwan/ingest.ts`) additionally need `SUPABASE_SERVICE_ROLE_KEY`. Never expose that key to the browser; it bypasses RLS entirely.

When env vars are missing, [`src/integrations/supabase/client.ts`](./src/integrations/supabase/client.ts) returns a structured 503 (`{ code: 'supabase_not_configured' }`) for every request and skips realtime subscriptions, so feature code can branch cleanly via the exported `isSupabaseConfigured` flag.

---

## Package Manager

This repository uses **Bun** with a single text-format lockfile (`bun.lock`). The legacy binary `bun.lockb` and any `package-lock.json` / `yarn.lock` / `pnpm-lock.yaml` are gitignored to prevent multi-manager drift. If you must use npm or pnpm, regenerate locally — but please don't commit the artefact.

---

## Internationalization

Translation tables live in [`src/i18n/ar.json`](./src/i18n/ar.json) and [`src/i18n/de.json`](./src/i18n/de.json). The `useApp().t(key)` helper looks up the active language and falls back to the key itself for missing entries.

To add a new key:

1. Add `"my.new.key": "..."` to **both** JSON files.
2. Use `t('my.new.key')` from any component that imports `useApp`.

To add a third language (e.g. English): drop in `src/i18n/en.json`, then extend the `Language` union and the `i18nByLanguage` map in `src/contexts/AppContext.tsx`.

---

## Authentication

Supabase email-password auth, but usernames are mapped to a synthetic email `<username>@smartapp.local` so users only ever see a username field. See [`src/hooks/useAuth.tsx`](./src/hooks/useAuth.tsx) for the validation rules. The hook is implemented as a module-level singleton — every consumer subscribes to one underlying `onAuthStateChange` listener.

---

## Contributing

Before opening a PR, please:

1. Run `bun run lint` and resolve warnings in files you touched.
2. Run `bun run test` (and `bun run e2e` if you changed routing, prayer times, or the chat surface).
3. If you change a tab route or a sub-route prefetch list, update [`docs/architecture/persistent-tabs.md`](./docs/architecture/persistent-tabs.md).

---

## License

MIT. See [`LICENSE`](./LICENSE) (if present) or treat the repository default as MIT until one is committed.
