---
name: Persistent Tabs
description: Five of the seven bottom-nav tab pages stay mounted forever. Wellness and Diwan are lazy.
type: feature
---

The five low-cost bottom-nav tab routes (`/`, `/games`, `/chat`, `/settings`, `/duas`) are eager-imported in `src/App.tsx` and rendered together inside `<PersistentTabs/>`. The active tab uses `display:block`, inactive tabs use `display:none` — they never unmount, so switching between them feels instant.

The matching `<Route>` entries in `<Routes>` render `element={null}` so React Router doesn't double-mount them.

## Wellness and Diwan are deliberately *not* persistent

`/wellness` and `/diwan` are routed lazily (`React.lazy` + `<Suspense>`). Their bundled static datasets total ~10 000 lines (`wellnessData.ts`, `exerciseCatalog.ts`, `foodAtlas.ts`, `calisthenicsAtlas.ts`, `poetryData.ts`), and eager-loading them dominated the cold-paint of the homepage even for users who never opened either tab.

The trade-off: the very first tap to Wellness or Diwan shows a brief skeleton; every visit after that hits `React.lazy`'s module cache and is instant. The idle prefetch in `useIdlePrefetch()` warms both modules on first idle so even that first tap usually feels free.

## Idle prefetch

`useIdlePrefetch()` warms a handful of "likely next" lazy modules on `requestIdleCallback`:

- Persistent-tab sub-routes: `Theme`, `Profile`, `Prayer`, `Reading`.
- The two lazy tabs themselves: `Wellness`, `Diwan`.

## Rules

- **Don't** re-add the persistent tab pages to `lazy()` or to active `<Route element=...>`.
- **Don't** wrap `PersistentTabs` slots in `PageTransition` — tab switches must be instant (no fade).
- **Don't** add `/wellness` or `/diwan` back into `TAB_PATHS` in `App.tsx`.
- **Do** keep `/wellness` and `/diwan` listed in `BottomNav.tsx`'s `TAB_PATHS` set so the nav stays visible on those routes.
- If you add a new tab, ask first: does its bundle weigh more than its mount cost saves? If yes, route it lazily like Wellness and Diwan.
