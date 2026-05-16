---
name: Persistent Tabs
description: All 6 bottom-nav tab pages stay mounted forever — never unmount on tab switch
type: feature
---
The 6 bottom-nav tab routes (`/`, `/games`, `/chat`, `/settings`, `/duas`, `/diwan`) are eager-imported in `src/App.tsx` and rendered together inside `<PersistentTabs/>`. Active tab uses `display:block`, inactive use `display:none` — never unmount.

The matching `<Route>` entries in `<Routes>` render `element={null}` so React Router doesn't double-mount them. Non-tab routes (games subpages, settings details, wellness, etc.) remain `lazy()` + `<Suspense>` as before.

Idle prefetch now warms sub-routes (Theme, Profile, Prayer, Reading) instead of the tabs.

Do NOT re-add the tab pages to lazy() or to active <Route element=...>. Do NOT wrap PersistentTabs slots in PageTransition — tab switches must be instant (no fade).
