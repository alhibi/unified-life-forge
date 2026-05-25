---
name: Persistent Tabs
description: Three of the six bottom-nav tabs stay mounted forever. Wellness, Browse, and Mihrab are lazy non-persistent routes.
type: feature
---

The three small, hot bottom-nav routes (`/`, `/games`, `/chat`) are eager-imported in `src/App.tsx` and rendered together inside `<PersistentTabs/>`. The active tab uses `display:block`, inactive tabs use `display:none` — they never unmount, so switching between them feels instant.

The matching `<Route>` entries in `<Routes>` render `element={null}` so React Router doesn't double-mount them.

## Wellness, Browse, and Mihrab are deliberately *not* persistent

`/wellness`, `/browse`, and `/mihrab` are routed lazily (`React.lazy` + `<Suspense>`).

- **Wellness** and the legacy `/diwan` redirect both pull on ~10 000 lines of static data (`wellnessData.ts`, `exerciseCatalog.ts`, `foodAtlas.ts`, `calisthenicsAtlas.ts`, `poetryData.ts`). Eager-loading them dominated cold-paint even for users who never opened them.
- **Mihrab** owns the Literature tab, which embeds `DiwanLibraryPage` and therefore inherits the same poetry-dataset cost. Mihrab also owns the Dhikr tab (Nawawi 40 + categorised Duas data) and the Quran tab (surah index).
- **Browse** is light by itself (just two landing tabs) but is paired symmetrically with Mihrab so the bottom-nav layout has consistent perceived performance: every "discovery" tap pays a one-time skeleton.

The trade-off: the very first tap to Wellness, Browse, or Mihrab shows a brief skeleton; every visit after that hits `React.lazy`'s module cache and is instant. The idle prefetch in `useIdlePrefetch()` warms these modules on first idle so even that first tap usually feels free.

## Idle prefetch

`useIdlePrefetch()` warms a handful of "likely next" lazy modules on `requestIdleCallback`:

- Persistent-tab sub-routes: `Theme`, `Profile`, `Prayer`, `Reading`.
- The lazy tabs themselves: `Wellness`, `Diwan`, `Browse`, `Mihrab`.
- `Settings` (now reached via the home avatar shortcut, so often the first tap of a session).

## Rules

- **Don't** re-add the persistent tab pages to `lazy()` or to active `<Route element=...>`.
- **Don't** wrap `PersistentTabs` slots in `PageTransition` — tab switches must be instant (no fade).
- **Don't** add `/wellness`, `/browse`, or `/mihrab` to `TAB_PATHS` in `App.tsx`. They are listed in `BottomNav.tsx`'s `tabs[]` array (which derives its own visibility set), so the nav stays visible on them without making them persistent.
- If you add a new tab, ask first: does its bundle weigh more than its mount cost saves? If yes, route it lazily like Wellness, Browse, or Mihrab.
