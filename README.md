# SmartHub — Unified Life Forge

[![CI](https://github.com/alhibi/unified-life-forge/actions/workflows/ci.yml/badge.svg)](https://github.com/alhibi/unified-life-forge/actions/workflows/ci.yml)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)
[![Node](https://img.shields.io/badge/node-%3E%3D20-brightgreen)](https://nodejs.org)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.8-blue)](https://www.typescriptlang.org)
[![Vite](https://img.shields.io/badge/Vite-5-646CFF)](https://vitejs.dev)
[![React](https://img.shields.io/badge/React-18-61DAFB)](https://react.dev)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind-3-38BDF8)](https://tailwindcss.com)
[![Supabase](https://img.shields.io/badge/Supabase-Postgres%20%2B%20Edge-3ECF8E)](https://supabase.com)

A comprehensive Islamic companion progressive web app: prayer times, sunnah practices,
duas, Quran tafsir, classical Arabic poetry (Diwan), wellness tracking, an RSS reader,
end-to-end chat, and a small games suite. Mobile-first, RTL Arabic and German, single-page
app deployed at **[amv.life](https://amv.life)**.

---

## Table of Contents

- [Features](#features)
- [Tech Stack](#tech-stack)
- [Prerequisites](#prerequisites)
- [Quick Start](#quick-start)
- [Environment Variables](#environment-variables)
- [Project Structure](#project-structure)
- [Available Scripts](#available-scripts)
- [Testing](#testing)
- [Supabase Backend](#supabase-backend)
- [Deployment](#deployment)
- [Contributing](#contributing)
- [License](#license)

---

## Features

- **Prayer times** — astronomical computation via [`adhan`](https://github.com/batoulapps/adhan-js),
  per-madhab adjustments (Shafiʿi, Hanafi, Maliki, Hanbali), high-latitude rules, optional DST.
- **Hijri / Gregorian dual calendar** with religious occasion countdowns.
- **Quran virtues, Tafsir, sunnah libraries** — timed/untimed sunnah, prophetic-day routines.
- **Duas** in Amiri typography with bilingual labels.
- **Diwan** — classical Arabic poetry organized by era, with literary connection graph.
- **Wellness** — supplements, nutrition (food atlas, macros), skin/hair, athletic engine,
  recovery engine, calisthenics atlas, encyclopedia, insights, goals.
- **RSS reader** — feeds, search, OPML import, keyword alerts, offline cache (IndexedDB),
  reader view with highlights, in-app cron scheduler.
- **Chat** — 1:1 conversations with realtime presence, typing indicators, voice notes,
  reactions, replies, forwards, self-destruct timers, image lightbox, wallpapers.
- **Games** — Sudoku, chess (with puzzle and career modes), memory pairs, dice tournament,
  focus decathlon.
- **Theming** — 30+ color themes, light/dark/system, dynamic palette generator, optional
  auto-theme that follows the prayer schedule.
- **Internationalisation** — Arabic (RTL) and German built-in.
- **PWA** — installable, with two service workers (fonts + reading cache).

## Tech Stack

| Layer            | Choice                                                                    |
| ---------------- | ------------------------------------------------------------------------- |
| Framework        | [React 18](https://react.dev) with [TypeScript 5](https://typescriptlang.org) |
| Build tool       | [Vite 5](https://vitejs.dev) + [`@vitejs/plugin-react-swc`](https://github.com/vitejs/vite-plugin-react/tree/main/packages/plugin-react-swc) |
| Styling          | [Tailwind CSS 3](https://tailwindcss.com), [shadcn/ui](https://ui.shadcn.com), Radix primitives |
| Routing          | [React Router 6](https://reactrouter.com)                                 |
| Server state     | [TanStack Query 5](https://tanstack.com/query)                            |
| Forms / schema   | [react-hook-form](https://react-hook-form.com) + [Zod](https://zod.dev)   |
| Animation        | [Framer Motion](https://www.framer.com/motion)                            |
| Backend          | [Supabase](https://supabase.com) (Postgres + Auth + Storage + Edge Functions / Deno) |
| SEO              | [react-helmet-async](https://github.com/staylor/react-helmet-async)       |
| Testing          | [Vitest 3](https://vitest.dev) + [Testing Library](https://testing-library.com), [Playwright](https://playwright.dev) |
| Lint / format    | [ESLint 9](https://eslint.org) (flat config), [Prettier 3](https://prettier.io) |
| Hooks            | [Husky](https://typicode.github.io/husky) + [lint-staged](https://github.com/lint-staged/lint-staged) |

## Prerequisites

- **Node.js ≥ 20** (see [`.nvmrc`](./.nvmrc))
- **npm ≥ 10** (the lockfile committed to source). `bun.lock` is also committed for those
  who prefer [Bun](https://bun.sh) ≥ 1.1, but CI uses npm.
- A [Supabase](https://supabase.com) project (free tier is fine) for auth, database,
  storage, and edge functions. The app degrades gracefully when no Supabase config is
  present — features that require it simply log a warning.

## Quick Start

```bash
git clone https://github.com/alhibi/unified-life-forge.git
cd unified-life-forge
cp .env.example .env       # then fill in your Supabase project values
npm ci                     # or: bun install
npm run dev                # http://localhost:8080
```

## Environment Variables

All client-side env vars must be prefixed `VITE_`. Copy `.env.example` to `.env` and fill in
the values from your Supabase project settings.

| Variable                         | Required | Description                                                    |
| -------------------------------- | -------- | -------------------------------------------------------------- |
| `VITE_SUPABASE_URL`              | Yes\*    | Your Supabase project URL (e.g. `https://xyz.supabase.co`).    |
| `VITE_SUPABASE_PUBLISHABLE_KEY`  | Yes\*    | Supabase anon / publishable key. Safe to ship to the browser. |

\* The app starts without these, but every feature that talks to Supabase
(auth, chat, wellness, RSS reader, etc.) will be unavailable. A console warning is logged.

Edge functions read their secrets from Supabase's runtime environment — they do not need to be
listed here. See [`supabase/functions/`](./supabase/functions) for which secrets each function
expects (typically `SUPABASE_URL`, `SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`).

## Project Structure

```
unified-life-forge/
├── public/                       # static assets, manifest, service workers, robots, sitemap
│   ├── icons/
│   ├── fonts-sw.js               # font caching service worker (root scope)
│   ├── reading-sw.js             # reading-feature service worker (/reading scope)
│   └── manifest.json
├── src/
│   ├── App.tsx                   # router + providers (persistent tabs, lazy sub-pages)
│   ├── main.tsx                  # entrypoint
│   ├── index.css                 # Tailwind base + design tokens (motion, color, type)
│   ├── assets/                   # bundled assets (avatars)
│   ├── components/
│   │   ├── ui/                   # shadcn/ui primitives (button, dialog, etc.)
│   │   ├── chat/                 # chat module (drawer, bubbles, input, voice, hooks)
│   │   ├── diwan/                # poetry-specific components
│   │   └── *.tsx                 # cross-feature components (BottomNav, SEO, ...)
│   ├── contexts/                 # global React contexts (App, VoicePlayer, ImageUpload)
│   ├── data/                     # static data (chess openings, hadith, poetry, occasions)
│   ├── features/
│   │   ├── reading/              # RSS reader (article list, reader view, OPML, alerts)
│   │   └── wellness/             # wellness tabs (Diet, Atlas, Vitals, Encyclopedia, ...)
│   ├── hooks/                    # cross-feature hooks (auth, presence, fast tap, ...)
│   ├── integrations/
│   │   ├── lovable/              # Lovable cloud auth wiring
│   │   └── supabase/             # generated Supabase client + database types
│   ├── lib/                      # framework-agnostic utilities (notify, motion, retry)
│   ├── pages/                    # one .tsx per route
│   ├── test/                     # Vitest setup + tests
│   └── utils/                    # higher-level utilities (theme engine, prayer math)
├── supabase/
│   ├── config.toml               # function-level overrides (e.g. verify_jwt)
│   ├── functions/                # Deno edge functions (RSS, alerts, search, extract)
│   └── migrations/               # SQL migrations (timestamp-prefixed)
├── docs/architecture/            # narrow architectural notes
├── .github/                      # CI workflow + PR / issue templates
├── .env.example
├── .editorconfig
├── .prettierrc.json
├── eslint.config.js              # ESLint 9 flat config
├── tailwind.config.ts
├── vite.config.ts
├── vitest.config.ts
├── playwright.config.ts
└── package.json
```

A tab-routing nuance worth knowing about: the seven bottom-nav routes
(`/`, `/games`, `/chat`, `/settings`, `/duas`, `/diwan`, `/wellness`) are eager-imported and
stay mounted forever — switching tabs toggles `display`, never unmount. See
[`docs/architecture/persistent-tabs.md`](./docs/architecture/persistent-tabs.md).

## Available Scripts

| Script                  | Purpose                                                            |
| ----------------------- | ------------------------------------------------------------------ |
| `npm run dev`           | Start the dev server on `http://localhost:8080` with HMR.          |
| `npm run build`         | Production build into `dist/`.                                     |
| `npm run build:dev`     | Development-mode build (with the Lovable component tagger).        |
| `npm run preview`       | Serve the built `dist/` locally.                                   |
| `npm run start`         | Alias for `vite preview --host`.                                   |
| `npm run typecheck`     | `tsc -b --noEmit` across all project references.                   |
| `npm run lint`          | ESLint over the whole tree.                                        |
| `npm run lint:fix`      | ESLint with auto-fix.                                              |
| `npm run format`        | Prettier write across all supported files.                         |
| `npm run format:check`  | Prettier check (CI mode — fails on diffs).                         |
| `npm run test`          | Vitest single run (CI mode).                                       |
| `npm run test:watch`    | Vitest in watch mode.                                              |
| `npm run test:coverage` | Vitest run with v8 coverage.                                       |
| `npm run test:e2e`      | Playwright end-to-end tests.                                       |
| `npm run ci`            | `typecheck` + `lint` + `format:check` + `test` + `build`.          |

## Testing

Unit and component tests live next to (or inside) `src/test/` and run on Vitest with
jsdom. The project uses `@testing-library/react` and `@testing-library/jest-dom`.

```bash
npm run test                 # one-shot
npm run test:watch           # interactive
npm run test:coverage        # v8 coverage report
```

Playwright is wired through `lovable-agent-playwright-config` (see
[`playwright.config.ts`](./playwright.config.ts) and
[`playwright-fixture.ts`](./playwright-fixture.ts)). Run with:

```bash
npm run test:e2e
```

## Supabase Backend

The app expects the schema, RLS policies, and storage buckets defined in
[`supabase/migrations/`](./supabase/migrations). To bring up a local Supabase stack:

```bash
# install the Supabase CLI separately, then
supabase start
supabase db reset            # applies all migrations
supabase functions serve     # serves edge functions locally
```

The generated typed client lives at [`src/integrations/supabase/client.ts`](./src/integrations/supabase/client.ts);
the database types at [`src/integrations/supabase/types.ts`](./src/integrations/supabase/types.ts)
are auto-generated and should not be edited by hand.

## Deployment

The output of `npm run build` is a static SPA in `dist/` — deploy it to any static host
(Vercel, Netlify, Cloudflare Pages, etc.). The production deployment is at
[amv.life](https://amv.life).

Two things to remember when deploying:

1. **SPA fallback** — your host must serve `index.html` for any unknown path so React Router
   can take over.
2. **Service workers** — `public/fonts-sw.js` and `public/reading-sw.js` are served from
   their own scopes; no extra configuration is needed if your host respects the `public/`
   directory.

## Contributing

Pull requests are welcome. Please read [CONTRIBUTING.md](./CONTRIBUTING.md) before opening one
— it covers branch naming, the Conventional Commits format we use, the lint / test / format
gates, and the PR checklist.

## License

[MIT](./LICENSE) © unified-life-forge contributors.
