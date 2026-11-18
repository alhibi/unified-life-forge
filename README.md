# amv.life — تطبيق عربي متكامل

### SmartHub · حياة واحدة، غرفة واحدة بإضاءة تتغيّر

[![CI Workflow](https://github.com/alhibi/unified-life-forge/actions/workflows/verify.yml/badge.svg)](https://github.com/alhibi/unified-life-forge/actions)
[![License: MIT](https://img.shields.io/badge/License-MIT-copper?color=B8492E)](./LICENSE)
[![Stack: React 19](https://img.shields.io/badge/Stack-React%2019%20%2B%20Vite%208-146B65)](#-tech-stack)
[![Architecture: FSD](https://img.shields.io/badge/Architecture-Feature--Sliced%20Design-0d0d0d)](./docs/architecture/feature-structure.md)

> **amv.life** (repo identity: `smarthub`) is an Arabic-first, RTL-only companion app for
> prayer, reading, knowledge and everyday life. Built with React 19, Vite, TypeScript,
> Tailwind CSS v4 and Bun, it ships **26 feature domains** across **82 product routes**,
> one Portal launcher and three persistent tabs. It is installable as a PWA and wraps in
> Capacitor for native shells.

---

## 🎨 Design system

There is exactly one visual authority: **[DESIGN.md](./DESIGN.md)**. It defines the semantic
token contract, the fourteen theme families, the page grammars (G1–G7), motion, accessibility
and the exception register. Do not invent a local value to imitate a shared token.

- **Implementation contract:** [.kiro/steering/design-system.md](./.kiro/steering/design-system.md)
  — the short, enforceable rules to read before writing JSX.
- **Route × grammar × states:** [docs/design-system/route-coverage.md](./docs/design-system/route-coverage.md)
  — every route mapped to its page grammar, required states and verification status.
- **Component catalog:** [docs/design-system/component-catalog.md](./docs/design-system/component-catalog.md)
  — props and A/B/C states for the primitives below.
- **Engineering rules:** [AGENTS.md](./AGENTS.md).

The primitives are `PageShell`, `PageHeader`, `AppCard`, `AppList`/`AppRow`,
`IconChip`, `StatGrid`/`Stat`, `IconButton`, `Section` and `StateView` in
`src/components/ui/app-shell.tsx` and `src/components/`. Colours, radii and spacing come
from semantic tokens in `src/index.css`; there is **no `tailwind.config.ts`**.

### What the system is

- **Arabic is the only interface language.** The document is `dir="rtl"` and `lang="ar"`;
  German and Latin content is authentic material rendered locally with `dir="ltr"`.
- **Fourteen theme families** — expressive, editorial, copper, paper, mono, obsidian, clay,
  gold, moss, ocean, arctic, midnight, nebula, rose — plus `dynamic` derived from an image.
  Each family has an art direction in `src/utils/themeArtDirections.ts` and publishes the
  same semantic roles through `src/utils/themeEngine.ts`.
- **One runtime type stack:** IBM Plex Sans Arabic + Inter Tight (`src/lib/fonts.ts`).
  Amiri and Tajawal are editorial material for Quran, poetry and Diwan only.
- **Flat by contract.** Depth comes from surface tone, spacing and hairline borders; raw
  shadows, decorative gradients, glow, blur and glass belong to the registered exceptions in
  `DESIGN.md` §11.
- **User preferences win.** Theme, mode, OLED, density, width, corners, borders, motion and
  type size are stored and migrated; a component never overrides them with a local literal.

---

## 🧭 Navigation

The home screen is the **Portal launcher at `/`**: identity and date, today's live widgets,
then a categorised grid of apps. There is no bottom navigation bar and no six-tab nav.

Exactly **three persistent tabs** exist:

| Tab    | Path     | Behaviour                                             |
| ------ | -------- | ----------------------------------------------------- |
| Portal | `/`      | Eagerly imported; the launcher and its today widgets  |
| Games  | `/games` | Lazy chunk; mounted on first visit, then kept mounted |
| Chat   | `/chat`  | Lazy chunk; mounted on first visit, then kept mounted |

`<PersistentTabs/>` (inside `src/App.tsx`) renders each visited slot with
`display:block` and hides the others with `display:none` — they never unmount, so returning
is instant. Inactive slots stay out of the bundle until first visit; `useIdlePrefetch()`
warms Games, Chat, Browse, Mihrab, Settings and the other likely next routes one chunk at a
time on `requestIdleCallback`, skipping the prefetch on save-data, 2G or low-memory devices.
Tab-to-tab swaps never animate horizontally; pushing into a deep route slides the whole tab
layer with the same push/pop motion as any other page.

Every other destination is a normal lazy route under `<Routes>` with its own
`PageHeader`/`BackButton` back flow. `/wellness`, `/browse` and `/mihrab` are route-level
hubs with internal tabs, not persistent tabs. For the full model see
[docs/architecture/information-architecture.md](./docs/architecture/information-architecture.md)
and [docs/architecture/persistent-tabs.md](./docs/architecture/persistent-tabs.md).

---

## 🧩 The 26 feature domains

`src/features/<domain>/` is the unit of ownership. A domain exposes its public surface from
`index.ts`; cross-feature imports go through that barrel, and Supabase access belongs in the
domain's data layer (`api.ts`).

### Spirit & knowledge

| Domain         | Routes / entry                                                         |
| -------------- | ---------------------------------------------------------------------- |
| **mihrab**     | `/mihrab` — Quran, Dhikr, Sunnah and Literature tabs (`?tab=`)         |
| **duas**       | `/duas`                                                                |
| **archive**    | `/archive`, `/archive/new`, `/archive/:id`                             |
| **knowledge**  | `/knowledge`                                                           |
| **diwan**      | `/diwan`, `/diwan/library/**`, `/diwan/bayan`                          |
| **reading**    | `/reading`                                                             |
| **marginalia** | `/marginalia`                                                          |
| **podcasts**   | `/podcasts`, `/podcasts/library`, `/podcasts/history`, `/podcasts/:id` |
| **calendar**   | `/occasions`                                                           |

### Body & place

| Domain           | Routes / entry                                                                                                                                                                        |
| ---------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **wellness**     | `/wellness` — workouts, calisthenics, activity, nutrition, diet, insights, atlas, encyclopedia                                                                                        |
| **fitness**      | `/fitness` — GPS sessions, Health Connect, route simplification                                                                                                                       |
| **weather**      | `/weather`                                                                                                                                                                            |
| **travel-atlas** | `/travel-atlas`, `/travel-atlas/explore`, `/travel-atlas/countries`, `/travel-atlas/place/:placeId`, `/travel-atlas/trips`, `/travel-atlas/trips/:tripId`, `/travel-atlas/:countryId` |

### Mind & memory

| Domain          | Routes / entry                                                                                                                                 |
| --------------- | ---------------------------------------------------------------------------------------------------------------------------------------------- |
| **pkm**         | `/pkm`                                                                                                                                         |
| **mind**        | `/pkm/mind` (and `/dev/material-preview` in development)                                                                                       |
| **journal**     | `/journal`                                                                                                                                     |
| **german-club** | `/german-club`, `/german-club/dictionary`, `/german-club/shelf/:slug`, `/german-club/grammar`, `/german-club/review`, `/german-club/wortliste` |
| **time-ledger** | `/time-ledger`                                                                                                                                 |
| **crypto**      | `/crypto`                                                                                                                                      |

### People & play

| Domain    | Routes / entry                                                                                                                       |
| --------- | ------------------------------------------------------------------------------------------------------------------------------------ |
| **chat**  | `/chat`, `/chat/groups`, `/chat/g/:chatId`, `/chat/settings`                                                                         |
| **games** | `/games`, `/games/sudoku`, `/games/chess`, `/games/chess/puzzles`, `/games/chess/career`, `/games/memory`, `/games/memory/adventure` |

### Account & shell

| Domain         | Routes / entry                                           |
| -------------- | -------------------------------------------------------- |
| **account**    | account export and deletion, surfaced inside `/settings` |
| **profile**    | `/profile`, `/settings/profile`                          |
| **appearance** | `/settings/appearance`, `/settings/interface`            |
| **keyboard**   | `/settings/keyboard` and the in-app keyboard provider    |
| **motion**     | `/settings/motion`                                       |

The per-domain inventory, public entry files and data ownership live in
[docs/architecture/feature-map.md](./docs/architecture/feature-map.md). The folder contract is
[docs/architecture/feature-structure.md](./docs/architecture/feature-structure.md).

---

## ⚡ Runtime capabilities

These are the shared services that make the app feel native. They are composed at the root of
`src/App.tsx`, not re-implemented per page:

1. **Command palette** (`cmdk`) — `⌘K` / `Ctrl+K` over app routes.
2. **Intent prefetching** — `usePredictivePrefetch` observes pointer intent and warms the
   route chunk through the de-duplicating registry in `src/lib/routePrefetch.ts`.
3. **Idle prefetch and data warmers** — one chunk at a time on idle, plus TTL-guarded
   read-only query warmers (`registerDataPrefetch`), skipped on constrained devices.
4. **Split workspace** — opt-in dual-pane layout via `react-resizable-panels`, lazy so it
   stays out of the entry chunk; `?is_split_pane=true` marks a nested frame so it never
   splits twice.
5. **Hardware-aware motion** — battery/network signals plus the motion preferences in
   `src/lib/motionPreferences.ts` reduce or disable animation on constrained devices.
6. **Telemetry** — scrubbed, in-memory error ring buffer; sent to Sentry only when
   `VITE_SENTRY_DSN` is configured.

---

## 🛠️ Tech stack

| Layer     | Choice                                                                                         |
| --------- | ---------------------------------------------------------------------------------------------- |
| UI        | React 19.2, TypeScript 5.8 (strict), Vite 8 + SWC, Tailwind CSS v4                             |
| Routing   | React Router 7                                                                                 |
| Data      | TanStack Query 5, Supabase, Dexie (local-first caches)                                         |
| State     | Zustand 5 stores with explicit action interfaces and `partialize`                              |
| Motion    | Framer Motion, governed by `src/lib/motion.ts`                                                 |
| Native    | Capacitor 8 (app id `app.lovable.p5e00a076b7eb4a24bbacaeff3467597a`)                           |
| Delivery  | PWA manifest + app-shell service worker (emitted as `/sw.js`), installable and offline-capable |
| Toolchain | Bun 1.4 + Node 26 locally; CI pins Bun 1.2.23. Vitest 4, Playwright                            |

Tailwind v4 has no config file: design tokens are published in `src/index.css` as
`@theme`/`@utility` rules and CSS variables on `<html>`.

---

## 📦 Scripts reference

| Command                                                  | Action                                                                          |
| :------------------------------------------------------- | :------------------------------------------------------------------------------ |
| `bun install`                                            | Resolves and installs dependencies from `bun.lock`.                             |
| `bun run dev`                                            | Starts the Vite development server on port `8080`.                              |
| `bun run build`                                          | Builds the production bundle into `dist/`.                                      |
| `NODE_OPTIONS="--max-old-space-size=4096" bun run build` | Build override for low-memory machines.                                         |
| `bun run typecheck`                                      | `tsc --noEmit` against the app project.                                         |
| `bun run lint` / `bun run lint:budget`                   | ESLint, then the frozen warning budget.                                         |
| `bun run arch`                                           | Import-graph gate: cycles, orphans, feature isolation, Supabase/env boundaries. |
| `bun run test`                                           | Vitest unit and integration tests.                                              |
| `bun run e2e`                                            | Playwright end-to-end flows (desktop + Pixel 7 projects).                       |
| `bun run test:smoke`                                     | Every route in jsdom shards (kept out of `bun run test`).                       |
| `bun run verify`                                         | `typecheck && lint && lint:budget && arch && test && build`.                    |

`bun run verify` is the pre-push gate; UI changes additionally need `bun run e2e` and a
rendered check at 360 / 768 / 1440 in light and dark.

---

## 🚀 Quickstart

```bash
# 1. Clone the repository
git clone https://github.com/alhibi/unified-life-forge.git
cd unified-life-forge

# 2. Install with Bun
bun install

# 3. Optional: point at your own Supabase project
cp .env.example .env

# 4. Start Vite on http://localhost:8080
bun run dev
```

The browser client ships publishable fallbacks for the project URL and anon key, so a fresh
clone and `bun run dev` work without a `.env`. Set `VITE_SUPABASE_URL`,
`VITE_SUPABASE_PUBLISHABLE_KEY` and `VITE_SUPABASE_PROJECT_ID` to target a different
project. Never ship the service-role key; it bypasses RLS.

---

## 🏛️ Contributing

1. **Read the visual contract first.** `DESIGN.md` → `.kiro/steering/design-system.md` →
   `docs/design-system/component-catalog.md`.
2. **Respect Feature-Sliced Design.** A feature lives in `src/features/<domain>/`; its
   public surface is `index.ts`; it never imports another feature's internals.
3. **Keep Supabase in `api.ts`.** Components and hooks call the feature API, not the client.
4. **Compose, don't fork.** Extend a primitive in `src/components/ui/app-shell.tsx` instead
   of writing a local card, header or icon button.
5. **Verify before pushing.** `bun run verify`; add `bun run e2e` and a screenshot for UI
   work.

---

## ⚖️ License

Distributed under the MIT License. See [LICENSE](./LICENSE) for details.

<sub align="right">amv.life — ٢٠٢٦</sub>
