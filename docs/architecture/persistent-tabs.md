---
name: Persistent Tabs
description: The Portal, Games and Chat tabs stay mounted once visited; every other route is lazy and non-persistent. There is no bottom navigation.
type: feature
---

# Persistent tabs

The app has exactly three persistent routes: `/` (Portal), `/games` and `/chat`. They are
declared by `TAB_PATHS` in `src/App.tsx`:

```ts
const TAB_PATHS = ['/', '/games', '/chat'] as const;
```

The `PersistentTabs` component is defined **inside `src/App.tsx`** — there is no
`src/components/PersistentTabs.tsx`. It receives the active tab (an exact pathname match) and
the current navigation mode, and renders one slot per visited tab.

## What "persistent" means here

- **Portal is eager.** `pages/Portal` is imported statically because it is the first paint.
- **Games and Chat are lazy but persistent.** `loadGames` and `loadChatTab` are dynamic
  imports. Their code leaves the entry chunk; once a tab has been visited, its component stays
  mounted for the rest of the session.
- **A slot is created on first visit.** `seen` starts as the current tab (if any). Any tab not
  yet in `seen` renders `null`; adding it to `seen` mounts the slot.
- **Visibility is CSS, not mounting.** The shown slot is `display:block`; the others are
  `display:none` with `aria-hidden`. Query caches and local component state survive a tab
  switch.
- **Scroll is remembered per tab.** All tabs share the window scroller, so `ScrollToTop`
  records each persistent tab's offset and restores it on return (mirrored to
  `sessionStorage` for mobile WebView reloads). Sub-pages open at the top on push and
  restore on pop.
- **Each slot has its own boundary.** `ErrorBoundary` + `Suspense fallback={<PageSkeleton />}`
  wrap every slot, so a lazy chunk or a crashed tab never blanks the layer.
- **The router does not double-mount.** The same three paths appear in `<Routes>` with
  `element={null}`:

```tsx
<Route path="/" element={null} />
<Route path="/games" element={null} />
<Route path="/chat" element={null} />
```

## Motion contract

The tab layer is a single `AnimatePresence` child with the constant key `"tab-layer"`:

- **Tab → tab:** no horizontal transition. The newly shown slot plays the `tab-zoom-in`
  keyframe (a short vertical fade-up) so the change registers without pretending it was a push.
- **Tab → deep route:** `activeTab` becomes `null`, the layer exits with the same push/pop
  variants as `PageTransition`, and the incoming page slides over it. `lastTabForExit` keeps
  the outgoing tab's content rendered during the exit instead of flashing empty.
- **Deep route → tab:** the layer enters from the matching edge with the correct parallax.
- **Reduced motion:** the OS preference or the in-app switch selects
  `REDUCED_MOTION_TAB_LAYER_VARIANTS`; the OS preference can only reinforce, never be
  overridden by, the app switch.

Never wrap a slot in `PageTransition`: tab switches must be instant, and the layer already
owns push/pop motion when leaving a tab.

## Every other route is non-persistent

`/wellness`, `/browse`, `/mihrab`, `/diwan`, `/reading`, `/settings/**` and all other
destinations are `React.lazy` routes rendered inside `<Routes>` under `<PageTransition>`.
They are not in `TAB_PATHS` and they are not in the tab layer.

`/wellness`, `/browse` and `/mihrab` are still top-level _destinations_ (each has internal
tabs and its own back target), but they are deliberately route-rendered:

- **Wellness** pulls large static data modules (workout, food and encyclopedia datasets).
- **Mihrab** owns the Dhikr, Sunnah and Literature bodies, and Literature embeds the Diwan
  library, which is the heaviest reading payload in the app.
- **Browse** is light, but pairing it with the other two keeps the first-tap cost predictable.

Making them persistent would keep their data hooks alive behind `display:none` for users who
never open them. A lazy route pays a one-time skeleton instead, then hits React's module cache
on every later visit.

## Idle prefetch

`useIdlePrefetch()` pumps a single ordered queue on `requestIdleCallback` (one dynamic import
per idle callback, never the whole queue at once — firing many imports together spikes memory
hard enough for low-end phones to discard the tab). The queue starts with the most likely next
routes and ends with the heaviest:

```
loadBrowse, loadMihrab, loadSettings, loadWeather, loadPrayer, loadReading,
loadProfile, loadAppearance, loadChatTab, loadGames, loadQuran, loadDhikr,
loadSunnah, loadKnowledge, loadBayan, loadWellness, loadFitness, loadDiwan,
loadGroupsIndex, loadChatSettings, loadTimeLedger, loadGermanClubHome
```

The whole prefetch is skipped when `navigator.connection.saveData` is true, the effective
type is 2G, or the device reports `deviceMemory <= 2` / `hardwareConcurrency <= 2`. The
intent-based `usePredictivePrefetch` and the `registerRoute`/`registerDataPrefetch`
registries cover hovers and pointer intent in the foreground.

## Rules

- **Do not** reintroduce a bottom navigation bar or a `BottomNav.tsx`. There is no nav
  allowlist and no route reserves bottom padding for a bar; the page shell owns `.pb-page`.
- **Do not** add the persistent tab pages to `<Route element={...}>`; they are owned by
  `<PersistentTabs/>` and listed with `element={null}`.
- **Do not** wrap `PersistentTabs` slots in `PageTransition`.
- **Do not** add `/wellness`, `/browse`, `/mihrab` or any other destination to `TAB_PATHS`
  without measuring its bundle and mount cost. The default is a lazy route.
- **Do not** re-add a new tab to the entry chunk without a reason: the current split exists
  because Chat's realtime stack and Games' game modules were being downloaded and parsed by
  every visitor before the Portal could paint.
