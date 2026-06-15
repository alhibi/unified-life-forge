# Feature Structure

Every user-facing feature in SmartHub lives inside its own folder under
`src/features/<feature>/`. The goal is **isolation**: editing one feature must
not require touching any other feature, and an external contributor (via
GitHub) can add a new feature by creating a new folder without integrating
into a god-context or god-component.

## Target shape

```text
src/features/<feature>/
  pages/         Route components (thin shells, mounted in App.tsx)
  components/    Feature-only UI (never imported by other features)
  hooks/         React Query hooks + small stateful helpers
  api.ts         ALL Supabase calls for this feature
  types.ts       Domain types (exported from index.ts)
  queryKeys.ts   Typed React Query key factory (if feature has server data)
  data/          Static datasets, if any (poems, hadiths, puzzles, …)
  utils/         Pure helpers used only by this feature
  index.ts       Public barrel — the ONLY surface other code may import
```

## Rules

1. **No Supabase outside `api.ts`.** Pages, components and hooks call
   `featureApi.xyz()` from `./api`. The `supabase` client is imported by
   `api.ts` alone.
2. **No cross-feature imports.** `features/a/*` must never import from
   `features/b/*`. If two features genuinely need to share code, lift it to
   `src/lib/` (pure utilities) or `src/components/ui/` (primitives).
3. **Public surface = `index.ts`.** External code (e.g. `App.tsx`) imports
   from `@/features/<feature>` — never from a deep file path. Internal
   files inside the feature may import each other directly.
4. **Pages are thin.** A `pages/Foo.tsx` should mostly compose components
   and call hooks. Business logic belongs in `hooks/` or `api.ts`.
5. **Tests colocated.** `foo.test.ts` next to `foo.ts`.

## What stays outside `features/`

| Location | Contents |
|---|---|
| `src/components/ui/` | shadcn primitives + `app-shell.tsx` (PageShell/AppCard/IconButton/Section) |
| `src/components/` (root) | App chrome only: BottomNav, BackButton, PageTransition, ScrollToTop, EdgeSwipeBack, ErrorBoundary, SEO, NavLink, PageHeader |
| `src/hooks/` | Truly shared hooks: useAuth, useDeviceLocation, use-mobile, useFastTap, useNavDirection, useSmartBack |
| `src/lib/` | Cross-feature pure utilities: motion, navPerf, routePrefetch, fetchRetry, icons, notify |
| `src/contexts/` | App-wide providers only (theme, i18n). Per-feature contexts live inside the feature. |
| `src/integrations/supabase/` | Auto-generated client + types. Imported only by `features/*/api.ts`. |

## Adding a new feature (recipe)

1. `mkdir src/features/<name>/{pages,components,hooks}`
2. Create `api.ts`, `types.ts`, `queryKeys.ts`, `index.ts`.
3. Register the route in `src/App.tsx` and (if prefetched) in
   `src/lib/routePrefetch.ts`.
4. Export the public surface from `index.ts`.
5. Add a one-liner row to `docs/architecture/feature-map.md`.

See `data-layer.md` for `api.ts` conventions and `ui-primitives.md` for the
component primitives every feature must reuse.