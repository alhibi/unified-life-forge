# Stage 1 — Diagnostic Audit: Re-renders, CLS, Stacking, Leaks, Transitions, Virtualization

Date: 2026-09-08 · Scope: static audit of the whole app (no code changes in this stage)
Method: four parallel read-only passes over `src/`, `build/`, `docs/`, `index.html`.

Severity = user-visible impact. Complexity = engineering effort (trivial / low / medium / high).

---

## 0. Executive summary

Four systems are genuinely well built and should not be touched: the realtime channel registry
(ref-counted with a grace window), the z-index token ladder (CSS custom-property scale with a
vitest guard), the page-transition compositing model (transform/opacity only, `contain`,
no inline `will-change`), and the persistent-tab shell (nav/header are **not** torn down —
there is no global nav to tear down since it was replaced by the Portal launcher).

The real weight comes from six root causes, in priority order:

| # | Root cause | Severity | Complexity |
|---|---|---|---|
| R1 | `AppContext` is one ~150-field mega-context with 52 consumers | High | Medium |
| R2 | Chat rows are an inline closure inside a 1731-line component, no memo boundary | High | Medium |
| R3 | `Geolocation.watchPosition` leaks on fast unmount (fitness) | High | Low |
| R4 | Bare whole-store Zustand subscriptions (~14 sites) | Medium | Low (per site) |
| R5 | German dictionary grows an unbounded DOM (5,000+ rows, no windowing) | Medium | Medium |
| R6 | Stacking escape hatches + one duplicate z token + a no-op guard test | Medium | Trivial–Low |

Everything else below is low severity polish, but several items are trivial wins.

---

## R1 — Context re-render blast radius

**`src/contexts/AppContext.tsx`** — High / Medium
- `AppContextType` spans ~150 fields (`:155-333`): theme, typography, motion, prayer settings,
  interface scale, all in one object.
- The value **is** memoized (`:1917-2175`), but the dependency list contains essentially every
  piece of provider state. So one setter — e.g. `setFontOpacity` during a slider drag —
  produces a new value object and re-renders **every** consumer.
- `useApp()` is called in **52 `.tsx` files**, with no selector API. High-frequency tweak UI
  (appearance/motion sliders) is bundled with static values (madhab, language).
- Affected screens: everywhere; most acutely Appearance/Motion settings, Portal, `UmmahPulse`.
- Fix direction: split into Theme / Appearance+Motion / PrayerSettings contexts, or move to a
  `useSyncExternalStore` selector store (the pattern `useAuth` already uses).

**`src/contexts/ImageUploadContext.tsx`** — Medium / Low
- Provider value is a **fresh object literal** every render (`:277`), and `setUploads` fires on
  every XHR `progress` event (`:178-183`). Every consumer re-renders per progress tick even if it
  only needs `startUpload`. `getUpload` is `useCallback`-keyed on `uploads` (`:266`), so its
  identity also churns per tick.

**`src/components/UmmahPulse.tsx`** — Low–Medium / Low
- Self-contained 15s/60s tick; internal recomputation is correctly memoized (`:187-237`).
- But it reads `prayerMadhab` from `AppContext` (`:150`), so it re-renders on *any* app setting
  change — R1 compounding into the heaviest visual widget (300+ star SVG when expanded).

**Not a problem:** `src/hooks/useAuth.tsx` (module singleton, low-frequency data),
`src/contexts/SystemEngineContext.tsx` (memoized, 3 consumers).
No dedicated realtime "Pulse feed" context/store exists — `UmmahPulse` is the closest analog.

---

## R2 — Chat render cost

**`src/features/chat/components/ChatDrawer.tsx:865-940+`** — High / Medium
- `renderRow={(msg, idx) => { ... }}` is a new closure per render containing the entire per-message
  tree (date separator, unread divider, bubble, swipe wrapper, context menu, reactions).
- `ChatDrawer` has 13 `useState`/`useEffect` sites. Typing in `convSearchQuery` (`:209`), toggling
  selection mode, or opening message info re-runs `renderRow` for every visible index and
  recomputes `getMessageMeta`, `getMessageOpacity`, `getBubbleRadius` per row.
- `MessageRowErrorBoundary` (`:876`) is a fault boundary, not a memo boundary.
- `VirtualMessageList` (`:112`) limits *mounted* rows via `@tanstack/react-virtual` but is itself
  not `memo`'d, and its `renderRow`/callback props are unstable by construction, so the visible
  window still fully re-reconciles.
- `SwipeableMessage` (`MessageBubble.tsx:31`) is not memoized and receives an inline
  `onSwipeReply={() => {...}}` (`ChatDrawer.tsx:921`).
- `reactionsByMsgId` (`:448`) and `useTypingIndicator` (dedup at `:140-144`, refcounted channel)
  are already correct — the churn is in the drawer, not the hooks.
- Fix direction: extract a `memo`'d `MessageRow` with a custom comparator (msg identity,
  reactions, selection, fade opacity) and per-id stabilized callbacks.
- Open item: verify `chat.messages` array identity stability in `useChatMessages` — a new array
  per unrelated render defeats virtualizer measurement caching.

---

## R3 — Subscription / interval / watcher leaks

**`src/features/fitness/model/useFitnessEngine.ts:12-31`** — High / Low — **the one confirmed leak**
```ts
let watchId: string | null = null;
const setup = async () => { watchId = await Geolocation.watchPosition(...); };
setup();
return () => { if (watchId) Geolocation.clearWatch({ id: watchId }); };
```
Unmount before the `await` resolves ⇒ cleanup sees `null` ⇒ the OS GPS watch is never cleared and
keeps firing `store.addCoordinate` into a dead closure for the rest of the process lifetime.
`src/features/fitness/useActivityTracking.ts:444-451, 582-587` already shows the correct
`watchIdRef` + cancellation pattern to copy.

**`src/features/crypto/pages/CryptoWatchlist.tsx:78-84` and `:156-168`** — Low / Low
Two `setTimeout`s (1.5s pulse clear, 5.1s undo-window removal) live in handlers, not effects, and
are never cancelled — post-unmount `setState` plus a network call fired after navigating away.
The 30s poll + `visibilitychange` in the same file (`:100-129`) **are** cleaned up correctly.

**Verified clean** (no action): `channelRegistry.ts:70-121` (refcount + 4s grace),
`useSharedChannel.ts:24-50`, `useChatMessages.ts:131-159`, `useTypingIndicator.ts:116-154`,
`usePresence.ts:169-361` (BroadcastChannel leader election, 25s heartbeat, all timers tracked in
refs and cleared, including the unmount-while-joining case), `useWeather.ts:46-49, 96-100`,
`useAutoPrayerTheme.ts:90-139`, `PrayerTimes.tsx:449-461`, `PriceChart.tsx:121-174`,
`FullActivityMap.tsx:36-55` (MutationObserver disconnected), `Reading.tsx:212-252`,
`KeywordAlertsView.tsx:146-175`. No re-subscription loops found — realtime effect deps are minimal.

**Scalability note (not a leak):** `usePresence.ts:398-419` (`useOtherUserPresence`) opens one
channel per user; in any list context prefer `useOnlineUserIds` (`:429-451`).

**Unclosed:** `FullActivityMap.tsx:143` has a `setTimeout` with no adjacent `clearTimeout` — needs a
read of the surrounding block.

---

## R4 — Whole-store Zustand subscriptions

High-value: **`useFitnessEngine.ts:10`** `const store = useFitnessStore();` — no selector, so every
GPS coordinate (`currentSpeedMps`, `activeMetrics`) re-renders every consumer, e.g.
`FitnessDashboardPage.tsx:11` which needs only 5 fields.
Same pattern: **`src/pages/Fitness.tsx:142`** (`useFitnessAppStore()`).

Medium, lower-frequency but ~11 sites: `german-club/components/dictionary/AlphabetNav.tsx:11`,
`DictionaryCard.tsx:14`, `DictionaryDetailModal.tsx:35`, `DictionarySearchFilters.tsx:38`,
`WortDesTagesCard.tsx:14`, `pages/ContentReviewAdmin.tsx:18`, `GermanClubHome.tsx:25`,
`GermanDictionary.tsx:27`, `GrammarCorner.tsx:12`, `ShelfDetail.tsx:28`, `WortlistePage.tsx:37`,
`features/diwan/pages/BayanDashboard.tsx:24`.

Correct reference: `FitnessActivityChart.tsx:8` (`useFitnessStore(s => s.activities)`).
Recommend a lint rule banning bare `useXStore()` rather than one-off fixes.

---

## R5 — Unvirtualized long lists

| Surface | State | Severity |
|---|---|---|
| `german-club/pages/GermanDictionary.tsx:30, 58-68, 184-193` | `visibleCount` "load more" over 5,000+ entries (`lib/dictionaryData.ts:28`), no windowing, no cap — DOM accumulates thousands of rows per session | **Medium / Medium** |
| `diwan/pages/LibraryPoet.tsx:65-80`, `LibrarySearch.tsx` | IntersectionObserver infinite scroll: lazy *fetch* only, DOM grows unbounded but corpora are tens–low hundreds | Low |
| `travel-atlas/pages/TravelAtlasPage.tsx:263,291`, `CountryMapPage.tsx:177` | Direct `.map()`; per-country scoping suggests bounded, no explicit cap found | Low (unconfirmed) |
| `german-club/pages/WortlistePage.tsx:157`, `ShelfDetail.tsx:208` | User-scoped subsets, realistically small; no enforced cap verified | Low |
| Chat (`ChatDrawer.tsx:861` → `VirtualMessageList`) | Virtualized — the only consumer of it | OK |
| RSS `reading/ArticleListGrouped.tsx:426-539` | Hand-rolled windowing with spacers above `VIRTUALIZATION_THRESHOLD`; the comment at `:46` claiming virtualization is disabled is stale/misleading | OK (fix comment) |
| Dhikr/Duas (`mihrab/DhikrTab.tsx`, `duas/data/duas.ts` ~114, `DhikrCounter.tsx:201`) | Dozens–~114 items; unvirtualized is correct at this scale | OK |

---

## R6 — Stacking / z-index

Canonical ladder in `src/index.css:61-83`, guarded by `build/__tests__/tailwindTokens.test.ts:92-95`:
`base 0 · scrim 5 · raised 10 · sticky 20 · header 30 · float 40 · drawer 50/51 · sheet 60/61 ·
picker 70/71 · nested 80/81 · deep 90/91 · fullscreen 100/110 · player 120 · queue 130 ·
overlay 200 · lightbox 200 · toast 300`.
Radix primitives (`sheet/dialog/drawer/alert-dialog/popover/dropdown-menu/select/context-menu/tooltip`)
correctly share `z-drawer` for overlay+content — coherent.

Issues:
1. **Duplicate value:** `--z-index-overlay: 200` and `--z-index-lightbox: 200` (`index.css:82-83`).
   `CommandPalette.tsx:67` vs `ImageLightbox.tsx:139` then resolve by DOM/paint order, not intent.
   Medium / trivial.
2. **`z-[9999]`** in `features/archive/pages/ArchiveReader.tsx:637`, above *every* token including
   toast (300) — a toast or the soft keyboard can be hidden behind the archive reader. Documented as
   known debt at `index.css:2047`. Medium / low.
3. **`z-[95]`** magic number in `features/keyboard/KeyboardProvider.tsx:189` (between `deep-above` 91
   and `fullscreen` 100) — intentional but untokenized and unguarded; any future `z-fullscreen`
   surface with an input silently breaks. Medium / low (add `--z-index-keyboard: 95`).
4. **German Club bypasses the token system entirely** — raw `z-30` sticky headers
   (`WortlistePage.tsx:62`, `ShelfDetail.tsx:101`, `GrammarCorner.tsx:31`, `GermanDictionary.tsx:83`,
   `GermanClubHome.tsx:47`, `ContentReviewAdmin.tsx:43`), raw `z-50` modals
   (`GenerationModal.tsx:428`, `Wortspaziergang.tsx:72`, `dictionary/DictionaryDetailModal.tsx:69`),
   raw `z-20/z-50` (`FurnaceButton.tsx:94,99`, `QuickLookup.tsx:153`). Values coincide numerically
   today, so severity is low — but a future rescale desyncs the whole feature.
5. **The guard test that should catch #4 appears to be a no-op:** `src/test/designSystem.test.ts:78,91,105`
   double-nests the same negated `includes` check, so raw-z offenders may pass CI. Medium / trivial.
6. **`z-modal` is used 3× but is not defined** in the ladder (no `--z-index-modal`). Needs
   `rg -n "z-modal" src` to confirm resolution. Medium / trivial.
7. Untokenized raw values: `EdgeSwipeBack.tsx:91` (inline `z-index:0` CSS string),
   `weather/pages/weather-theme.css:213`, `index.css:2420,2614`. Low / trivial.
8. `ui/sonner.tsx` — not confirmed to consume `--z-index-toast`; if it uses Sonner's own default it
   may conflict with `z-fullscreen-above` (110) surfaces such as `UmmahPulse.tsx:1040`. Low.

---

## R7 — Layout shift (CLS)

Image hygiene is **already good** — the reserved-container pattern is used consistently:
`reading/ArticleCard.tsx:257` (`aspect-ratio 16/9`), `:420` (fixed 84×84), `:543` (16/10),
`podcasts/pages/Podcasts.tsx:301` (`aspect-square`), `travel-atlas/.../TravelAtlasPage.tsx:361`,
`PlaceRow.tsx:56`, portal tiles/avatars (`AppTile.tsx`, `PortalHeader.tsx:50-57`). Weather is
all inline `<svg viewBox>` inside sized parents — no raster CLS.

Remaining sources:
1. **Injected article HTML** — `reading/ReaderView.tsx:61,320` rewrites `<img src>` inside sanitized
   third-party markup with no guaranteed `width`/`height`/`aspect-ratio`. This is the one genuine
   real-world CLS source, and the reserved-container pattern does not reach it. Medium / medium
   (force a placeholder background + carry over source dimensions where present, add `loading="lazy"`).
2. **Fonts** — `index.html:44-51` loads **7 families** (Instrument Serif, IBM Plex Sans Arabic, Cairo,
   Tajawal, Readex Pro, Amiri, IBM Plex Mono) in one render-blocking stylesheet with `display=swap`
   and **no fallback metric overrides** (`size-adjust` / `ascent-override`). Amiri and Instrument
   Serif have very different metrics from the Georgia/system fallback, so headings reflow on swap.
   Also: `src/lib/fonts.ts:1-9` claims "Inter Display is the sole typeface" while
   `DISPLAY_SERIF_STACK` (`:34-35`) and `index.css:494-497, 738` still use Instrument Serif/Amiri —
   comment and reality contradict. Medium / medium.
3. **Missing skeletons** (perceived flicker more than geometric shift). Skeletons exist
   (`ui/skeleton.tsx`, `portal/PortalSkeletons.tsx`, `reading/Skeletons.tsx`,
   `fitness/.../FitnessDashboardSkeleton.tsx`) but these features use spinners or nothing:
   crypto, calendar, journal, mind, pkm, time-ledger, wellness, german-club, weather, duas, mihrab,
   games; diwan/chat mix both. Multi-field forms (`ProfileEdit.tsx:1127`, `Settings.tsx`) paint
   default values that then pop to real data. Low–Medium / low.
4. `Portal.tsx:205-207` — `PortalTodayWidgets` uses `<Suspense fallback={null}>`, so the widgets pop
   in with no reserved box. Low / low.
5. `reading/ArticleReader.tsx:550-555` — eager hero image with no placeholder fill (height fixed, so
   flash rather than shift). Low / trivial.

---

## R8 — Transition mechanics (mostly healthy)

**The shared shell is not rebuilt.** `App.tsx:480-483` — `ALL_NAV_PATHS` is intentionally empty
(bottom nav retired for the Portal launcher). Global singletons `NativeShell`, `EdgeSwipeBack`,
`PortalBackButton`, `PodcastMiniPlayer`, `KeyboardProvider`, `CommandPalette` mount once outside
`<Routes>` (`App.tsx:1347, 1380-1392`). Persistent tabs (`/`, `/games`, `/chat`) genuinely stay
mounted via `display` toggling (`App.tsx:574-597`), matching `docs/architecture/persistent-tabs.md`.
Per-page headers (e.g. `Portal.tsx:195`) do remount per route — page chrome, not shell.

Findings:
1. **`will-change` is applied for the whole session, and possibly to the wrong layer.**
   `index.css:1898-1900` targets `html[data-compositor-hints='true'] main#main-content > div` — the
   first child of `<main>` is the `primaryContent` wrapper (`App.tsx:689`), not the animating
   `[data-page-surface]` node. So the hint may promote a coarse always-mounted wrapper instead of the
   page surface, and it stays applied permanently rather than only during the animation window
   (classic "will-change left on"). Medium / low (retarget to `[data-page-surface]`) + medium
   (scope to the animation via `onAnimationStart/Complete`).
   Contrast: `EdgeSwipeBack.tsx:117-132, 177` sets and clears `willChange` imperatively — correct.
2. **`backdrop-blur-md` on a sticky bar inside an animating ancestor** — `Portal.tsx:210`. The blur
   region is recomposited every scroll frame *and* while the ancestor `data-page-surface` is being
   transformed on page-enter — a plausible source of Portal first-frame jank on mid/low-end devices.
   Medium / low–medium (drop the blur during the nav window via a `data-navigating` flag).
3. **`usePredictivePrefetch.ts:21-91`** runs `document.querySelectorAll('a[href], button[data-route],
   [data-prefetch-target]')` **plus a `getBoundingClientRect()` per match on every `pointermove`**,
   gated only by a velocity check — no rAF/debounce. It is live globally during every transition
   (`App.tsx:638`), competing with the transition it accelerates. Medium / medium (rAF-throttle,
   cache the NodeList, re-query on route change/resize).
4. **No paint containment on the tab layer** — `PageTransition.tsx:82` sets
   `contain: 'layout paint'`, but the persistent-tab wrapper (`App.tsx:610-623`) does not. Low / trivial.
5. **First-visit skeleton flashes** — ~60 lazy routes (`App.tsx:231-303`) each pay one `PageSkeleton`
   inside `PageTransition` (`:695-703`); documented trade-off. Low.
6. **Two stacked `AnimatePresence` trees** (`App.tsx:600` and `:700`, `mode="popLayout"`) kept in sync
   only by a shared `mode` from `useNavDirection`. No double-mount today (`activeTab === null` gate at
   `:701`, `key={location.pathname}` at `:702` is correct), but editing one variant table without the
   other silently breaks the single-direction invariant. Low / medium (unify into one owner).
7. **Scroll-attribution race** — `ScrollToTop.tsx:55-79` uses one global `window` scroll listener
   attributing to the current `ownerRef`/`lastSubKeyRef`; during the `popLayout` exit/enter overlap a
   scroll event can be attributed to the incoming page. Narrow window (layout effect runs pre-paint);
   restoration correctly uses `behavior: 'instant'`. Low / low.
8. Positive controls: nav variants (`motion.ts:506-781`) animate only `opacity`/`x`/`scale` — no
   non-composited property animation found anywhere in the transition path.

---

## 9. Suggested Stage-2 order

1. R3 GPS watch leak (High, Low) — smallest diff, worst consequence.
2. R6 items 1/3/5/6 + R8 item 1 (Trivial–Low, immediate correctness).
3. R4 fitness selectors (High-frequency, Low).
4. R2 memoized `MessageRow` (High, Medium).
5. R8 items 2/3 (Portal jank + pointermove cost).
6. R1 context split (highest ceiling, largest blast radius — do it deliberately, with the
   `useApp()` call sites migrated in batches).
7. R5 dictionary virtualization, R7 reader-image CLS + font fallback metrics, skeleton coverage.

## 10. Open questions requiring runtime verification

- Does `will-change` land on `[data-page-surface]`? (DevTools Layers panel.)
- Does `z-modal` resolve at all? (`rg -n "z-modal" src`, `rg -n "modal" src/index.css`.)
- Is `src/test/designSystem.test.ts` actually failing on raw-z offenders, or is the double-negation
  making it inert?
- `chat.messages` array identity stability in `useChatMessages`.
- Travel Atlas / German shelf list sizes (server-side `.limit()`?).
- `FullActivityMap.tsx:143` timeout cleanup.
- Measured CLS/INP on a mid-tier Android device: Portal → Wellness → back, and a chat session with
  typing while scrolled.
