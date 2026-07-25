# SmartHub

> تطبيق إسلامي شامل: أوقات الصلاة، الأذكار، القرآن الكريم، التقويم الهجري، الطقس، الألعاب والمراسلة في مكان واحد.

A comprehensive Islamic companion web app. It bundles **prayer times** (Aladhan + astronomical calculation), a dual **Hijri/Gregorian calendar**, Quran virtues and tafsir, prophetic-day routines, timed and untimed Sunnah libraries, duas, a classical **Arabic poetry diwan**, **weather** (Open-Meteo), Islamic occasions, an **RSS reader**, a knowledge **archive**, a **PKM** note layer, a **travel atlas**, end-to-end **messaging**, and a collection of **games**. The interface is Arabic-only (RTL) with an "Obsidian Depth" dark theme.

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
| `bun run lint` | ESLint over the repo. Must report **0 errors**. |
| `bun run lint:fix` | ESLint with autofix |
| `bun run lint:budget` | Fails if any budgeted warning count rises — see [Lint budget](#lint-budget) |
| `bun run typecheck` | `tsc --noEmit` against `tsconfig.app.json` |
| `bun run test` | Vitest in single-run mode |
| `bun run test:watch` | Vitest in watch mode |
| `bun run e2e` | Playwright end-to-end tests (`e2e/`). Builds the app and serves it itself. |
| `bun run verify` | `typecheck` + `lint` + `test` — what CI runs |
| `bun run format` | Prettier write |
| `bun run format:check` | Prettier check |

The one-off Diwan ingest pipeline in `scripts/diwan/` has no package script; run
the files directly with `bun scripts/diwan/<file>.ts` when you need them. They
require `SUPABASE_SERVICE_ROLE_KEY` (see [Environment Variables](#environment-variables)).

---

## Tech Stack

- **Build / dev** — Vite 5 + SWC, TypeScript 5 strict mode, Tailwind 3 with design tokens, shadcn-style primitives (Radix + tailwind-variants).
- **Frontend** — React 18, React Router 6, framer-motion, Phosphor icons (via the `src/lib/icons.tsx` barrel), TanStack Query for server state.
- **Backend** — Supabase (Postgres + Row-Level Security + Auth + Realtime + Storage + Edge Functions in `supabase/functions/`).
- **Astronomy** — `adhan` for prayer-time calculation, with the [Aladhan API](https://aladhan.com/prayer-times-api) used as the primary source and `adhan` as offline fallback.
- **Weather** — [Open-Meteo](https://open-meteo.com) (no API key required).
- **PWA** — `public/manifest.json` plus two service workers: an app-shell worker generated at build time by the `appShellServiceWorker()` Vite plugin (`build/swTemplate.js` → `dist/sw.js`, registered in `src/lib/registerServiceWorker.ts`), and a separate reading-mode cache worker (`public/reading-sw.js`).
- **Observability** — `src/lib/telemetry.ts` scrubs and forwards uncaught errors to Sentry when `VITE_SENTRY_DSN` is set; otherwise it buffers them in memory for local debugging.
- **Tests** — Vitest for unit, Playwright for E2E (`e2e/`).

---

## Project Structure

```
src/
├─ App.tsx                   # Routing + persistent-tabs layer
├─ main.tsx                  # Entry point (boots motion, SW, telemetry)
├─ components/
│  ├─ ui/                    # shadcn primitives + app-shell
│  └─ portal/                # Portal launcher chrome
├─ pages/                    # Route components not yet migrated to features/
├─ features/                 # account, archive, calendar, chat, clipboard,
│                            # diwan, duas, games, journal, knowledge, mind,
│                            # now, pkm, podcasts, reading, travel-atlas,
│                            # weather, wellness
├─ hooks/                    # useAuth, usePresence, usePrayerTimesCache, ...
├─ contexts/                 # AppContext (theme, settings), VoicePlayerContext
├─ integrations/supabase/    # Client + generated DB types
├─ lib/                      # chat/, auth/, icons, telemetry, prayerTimes, motion
├─ i18n/                     # ar.json + lookup helper
├─ data/                     # Static datasets (sunnah, nawawi hadiths)
└─ utils/themeEngine.ts      # Dynamic palette generator (Material-3-style)

build/                       # Vite plugins: app-shell SW, Phosphor weight pruning
docs/architecture/           # ADR-style notes (persistent tabs, Diwan, data layer)
e2e/                         # Playwright specs
public/data/                 # Runtime-fetched datasets (diwan poetry corpus)
supabase/
├─ functions/                # Edge functions (RSS, keyword alerts, search, account)
└─ migrations/               # SQL migrations
scripts/diwan/               # One-shot scrapers + ingest pipeline
```

### Persistent tabs

The bottom nav has been retired in favour of the Portal launcher. Three hot routes (`/`, `/games`, `/chat` — see `TAB_PATHS` in [`src/App.tsx`](./src/App.tsx)) are rendered together inside `<PersistentTabs>` and toggled with `display:none` rather than remounted, so returning to them is instant. Every other destination is a lazy route so a cold homepage visit doesn't pay for it. Details: [`docs/architecture/persistent-tabs.md`](./docs/architecture/persistent-tabs.md).

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

Optional browser-side variables:

| Variable | Purpose |
|---|---|
| `VITE_SENTRY_DSN` | Enables the Sentry error drain. Unset ⇒ errors buffer in memory only. |
| `VITE_APP_VERSION` | Release tag attached to Sentry events. Defaults to `dev`. |

Server-side scripts (`scripts/diwan/ingest.ts`) additionally need `SUPABASE_SERVICE_ROLE_KEY`. Never expose that key to the browser; it bypasses RLS entirely.

When env vars are missing, [`src/integrations/supabase/client.ts`](./src/integrations/supabase/client.ts) returns a structured 503 (`{ code: 'supabase_not_configured' }`) for every request and skips realtime subscriptions, so feature code can branch cleanly via the exported `isSupabaseConfigured` flag.

---

## End-to-end tests

```bash
bunx playwright install chromium   # once
bun run e2e
```

Specs live in [`e2e/`](./e2e). The config builds the app and serves it with
`vite preview` through Playwright's own `webServer`, so you do not start
anything yourself. Two projects run every spec: desktop Chrome and an emulated
Pixel 7, because the app is phone-first (the bottom nav was replaced by the
Portal launcher, `ResponsiveDrawer` switches between a sheet and a dialog on
viewport width, and safe-area insets drive the layout).

No Supabase credentials are used. The client falls back to placeholders and the
app degrades to local-only mode, so the suite runs on a fork with no secrets and
covers the signed-out paths a first-time visitor actually lands on.

[`e2e/fixtures.ts`](./e2e/fixtures.ts) gives every spec two things:

- **External network is stubbed.** Aladhan, Open-Meteo, alquran.cloud and Google
  Fonts are fulfilled locally; anything else off-origin is aborted, so a new
  outbound request fails visibly instead of turning into flake.
- **Console and page errors fail the test.** A spec cannot pass while the app
  throws. Opt out at describe level with
  `test.use({ allowConsoleErrors: true })` when the error is what you are
  asserting.

---

## Lint budget

`bun run lint` must report **zero errors**. On top of that, a set of rules is
deliberately demoted to warnings because the repo has a real backlog against
them — mostly the React Compiler rule family (`react-hooks/refs`,
`set-state-in-effect`, …), `no-explicit-any`, and dead declarations left by
feature removals.

A warning nobody counts is a warning that grows, so the current per-rule counts
are frozen in [`lint-budget.json`](./lint-budget.json) and
`bun run lint:budget` fails if any of them rises. The debt can shrink freely; it
cannot grow.

```bash
bun run lint:budget             # what CI runs
bun run lint:budget -- --write  # after you FIX some, to lock in the lower count
```

Only ever use `--write` to record a reduction. If it raises a number you are
recording a regression — fix the finding instead. The reasoning behind each
budgeted rule, and what fixing it actually involves, is in the comment block in
[`eslint.config.js`](./eslint.config.js).

---

## Package Manager

This repository uses **Bun** with a single text-format lockfile (`bun.lock`). The legacy binary `bun.lockb` and any `package-lock.json` / `yarn.lock` / `pnpm-lock.yaml` are gitignored to prevent multi-manager drift. If you must use npm or pnpm, regenerate locally — but please don't commit the artefact.

---

## Internationalization

**The app is currently Arabic-only.** The single translation table lives in
[`src/i18n/ar.json`](./src/i18n/ar.json); `AppContext` coerces any persisted
language preference to `'ar'`. The `useApp().t(key)` helper falls back to the key
itself for missing entries.

To add a new key: add `"my.new.key": "..."` to `ar.json`, then call
`t('my.new.key')` from any component that imports `useApp`.

> **Caveat before adding a second language:** `ar.json` holds ~326 keys while the
> app spans 550+ source files, so most UI strings are hardcoded Arabic literals.
> Adding a locale is an extraction project, not a new-file project. The wiring
> itself is small — extend the `Language` union and the lookup map in
> [`src/i18n/index.ts`](./src/i18n/index.ts) and stop the `'ar'` coercion in
> [`src/contexts/AppContext.tsx`](./src/contexts/AppContext.tsx).

---

## Authentication

Supabase email-password auth, but usernames are mapped to a synthetic email `<username>@smartapp.local` so users only ever see a username field. See [`src/hooks/useAuth.tsx`](./src/hooks/useAuth.tsx) for the validation rules. The hook is implemented as a module-level singleton — every consumer subscribes to one underlying `onAuthStateChange` listener.

---

## Contributing

Before opening a PR, please:

1. Run `bun run verify` (`typecheck` + `lint` + `test`). This is exactly what the
   [CI workflow](./.github/workflows/ci.yml) runs on every push and pull request,
   so a green local run means a green PR.
2. Run `bun run e2e` if you changed routing, prayer times, or the chat surface.
3. If you change a tab route or a sub-route prefetch list, update [`docs/architecture/persistent-tabs.md`](./docs/architecture/persistent-tabs.md).
4. If you add or migrate a feature, flip its row in [`docs/architecture/feature-map.md`](./docs/architecture/feature-map.md).

See [`docs/CONTRIBUTING.md`](./docs/CONTRIBUTING.md) for the full guide.

---

## License

MIT — see [`LICENSE`](./LICENSE).
