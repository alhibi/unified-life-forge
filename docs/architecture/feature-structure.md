# Feature Structure

Every user-facing domain in amv.life lives under `src/features/<domain>/`. The goal is
**isolation**: editing one domain must not require touching another, and a contributor can add
a domain by creating a folder without integrating into a god-context or a god-component.

Current inventory: **26 domains** under `src/features/`. See
[feature-map.md](./feature-map.md) for the domain-by-domain entry points.

## Target shape

```text
src/features/<domain>/
  pages/         Route components (thin shells, mounted from App.tsx)
  components/    Domain-only UI (never imported by another domain)
  hooks/         React Query hooks + stateful helpers
  api.ts         All Supabase calls for this domain
  types.ts       Domain types (exported from index.ts)
  queryKeys.ts   Typed React Query key factory, when the domain has server data
  data/          Static datasets (poems, hadiths, puzzles, catalogs…)
  lib/           Pure domain helpers
  utils/         Pure helpers (legacy naming; prefer lib/)
  index.ts       Public barrel — the only surface other code may import
```

Not every domain needs every folder. A domain with no server data has no `api.ts`; a domain
whose screen is a thin shell in `src/pages/` still owns its logic, data and components here.

## Rules

1. **Supabase stays in the data layer.** Pages, components and hooks call the domain API.
   `api.ts` is the sanctioned home for the client; the architecture gate enforces the import
   boundary and freezes the existing exceptions in `arch-budget.json` so the number can only
   go down.
2. **No cross-domain imports.** `features/a/*` must not import `features/b/*` except through
   `features/b/index.ts`. If two domains genuinely share code, lift it to `src/lib/` (pure
   utilities) or `src/components/ui/` (primitives).
3. **Public surface = `index.ts`.** External code imports from `@/features/<domain>` — never
   from a deep file path. Internal files may import each other directly.
4. **Pages are thin.** A `pages/Foo.tsx` composes components and calls hooks. Business logic
   belongs in `hooks/`, `lib/` or `api.ts`.
5. **Tests are colocated.** `foo.test.ts` sits next to `foo.ts` (or in `__tests__/` when a
   group of files is tested together).
6. **Do not add a second styling or state system.** UI composes the primitives in
   `src/components/ui/`; global state uses the existing Zustand stores.

## What stays outside `features/`

| Location                     | Contents                                                                                                                                                                                                                 |
| ---------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `src/pages/`                 | Route shells and cross-domain screens: `Portal`, `Browse`, `Mihrab`, `Wellness`, `Fitness`, `Reading`, `ProfileEdit`, settings screens, Quran/Sunnah/QuranVirtues pages                                                  |
| `src/components/ui/`         | Primitives: `app-shell.tsx` (PageShell, AppCard, AppList, AppRow, IconChip, StatGrid, Stat, IconButton, Section), `state-view.tsx`, shadcn/Radix controls, skeletons                                                     |
| `src/components/` (root)     | App chrome only: `PageHeader`, `BackButton`, `PageTransition`, `ScrollToTop`, `EdgeSwipeBack`, `ErrorBoundary`, `SEO`, `CommandPalette`, `NativeShell`, `SplitWorkspace`, `AuthGuard`                                    |
| `src/components/portal/`     | Portal-only launcher pieces (app registry, greeting, today widgets, filter bar, detail panel)                                                                                                                            |
| `src/hooks/`                 | Truly shared hooks: auth, location, network, motion runtime, unread messages, presence, predictive prefetch, smart back, visit tracking                                                                                  |
| `src/lib/`                   | Cross-domain pure utilities and platforms: fonts, motion, interfaceScale, routePrefetch, navPerf, icons, telemetry, appearances, native, chat client                                                                     |
| `src/contexts/`              | App-wide providers only: `AppContext` (theme/preferences), `SystemEngineContext`, `ImageUploadContext`, `VoicePlayerContext`. Domain providers live inside the domain (`PodcastPlayerContext`, `WeatherLocationContext`) |
| `src/integrations/supabase/` | Generated client + database types, imported by domain data layers only                                                                                                                                                   |

There is **no `src/components/BottomNav.tsx`** and no bottom navigation. Navigation chrome is
the Portal plus `PageHeader`/`BackButton` inside routes. Persistent tabs are implemented in
`src/App.tsx` (see [persistent-tabs.md](./persistent-tabs.md)).

## Adding a domain (recipe)

1. Create `src/features/<domain>/` with the folders you actually need
   (`pages`, `components`, `hooks`, `lib`, `data`).
2. Add `api.ts`, `types.ts`, `queryKeys.ts` and `index.ts` if the domain owns server data.
3. Register the route in `src/App.tsx` with a named lazy loader, and add it to
   `src/lib/routePrefetch.ts` / the idle queue if it is a likely next tap.
4. Export the public surface from `index.ts`.
5. Add the domain to [feature-map.md](./feature-map.md) and its routes to
   `docs/design-system/route-coverage.md`.
6. If it is a new visible screen, read `DESIGN.md` §8 for its page grammar before writing JSX.

See `data-layer.md` for `api.ts` conventions and `ui-primitives.md` for the component
primitives every domain must reuse.
