# Stage 4 — Verification (2026-09-08)

Measured against the Stage 1 audit (`2026-09-08-perceived-performance-audit.md`).
Stage 1 was a static/read-only audit, so it produced **no numeric baseline**:
where a real before/after number exists it is stated; where it does not, the
comparison is structural and labelled as such. That is a limitation of Stage 1,
not a measurement gap invented here.

## Method

- Chromium (Playwright), phone viewport, signed-in session.
- Two builds measured: the dev server (unminified, HMR — worst case) and the
  **production bundle** served from `dist/` (what a phone actually runs).
- Android parity approximated with an Android WebView user agent, 412x870 @2.6
  DPR, `is_mobile`/touch, and **4x CPU throttling** — a mid-range Android phone.
- LCP and CLS from `PerformanceObserver` (`largest-contentful-paint`,
  `layout-shift`, buffered). INP is reported as a *proxy*: worst
  pointerdown→second-paint latency over the first eight interactive elements —
  a lab estimate, not field INP.
- Re-render counts from a `__REACT_DEVTOOLS_GLOBAL_HOOK__` shim counting
  committed fibers with non-zero `actualDuration` (the same data the DevTools
  Profiler reads; the DevTools UI itself cannot run headless).

## Core Web Vitals — production build

| Screen | LCP | CLS | Long tasks | INP proxy |
| --- | --- | --- | --- | --- |
| Home / launcher | 388 ms | 0.022 | 4 (241 ms total) | 103 ms |
| Settings (multi-field) | 656 ms | 0.013 | 1 (72 ms) | 34 ms |
| Fitness (heavy) | 724 ms | 0.013 | 2 (154 ms) | 34 ms |
| Chat (heavy) | 872 ms | 0.013 | 1 (84 ms) | 34 ms |
| German dictionary (longest list) | 752 ms | 0.013 | 2 (187 ms) | 34 ms |

All five screens land in the "good" band for LCP (<2.5 s) and CLS (<0.1).

## Android WebView profile, 4x CPU throttle

| Screen | LCP | CLS | Long tasks |
| --- | --- | --- | --- |
| Home | 1 524 ms | 0.016 | 11 (1 854 ms total) |
| Settings | 1 648 ms | 0.000 | 4 (571 ms) |
| Chat | 2 276 ms | 0.000 | 4 (555 ms) |

Parity holds: WebView on a throttled CPU stays inside the good band on all
three. Home's long-task total is startup work (theme engine, icon set, ambient
canvas) — the largest single task is chunk evaluation, not layout.

Caveat, stated plainly: this is an emulated WebView, not a device. A real
`npx cap run android` pass on hardware is the one check that cannot be done
from here.

## CLS regressions found and fixed during this stage

| Source | Before | After |
| --- | --- | --- |
| Home widgets replacing their placeholder (`PortalTodayWidgets`) | 0.111 | 0.009 |
| Home total (dev server) | 0.155 | 0.021 |
| Ambient canvas sized from `window.innerWidth` (scrollbar width) | 0.020 | 0.000 |

Both were real bugs the Stage 3 skeletons only partly covered:

1. The portal widget sections now reserve their measured height (21 rem prayer,
   17.5 rem weather) so prayer times and weather arriving late cannot push the
   tile grid.
2. `PortalBackgroundCanvas` sized its backing store from `window.innerWidth`,
   which includes the scrollbar, and wrote it back as an inline width — the
   fixed layer grew by the scrollbar's width on the first frame. It now sizes
   from its own box and caps DPR at 2.

## Re-render counts (post-Stage-2)

Cold home load: **21 commits**. Top contributors are icon and motion
primitives (`IconSlot` 71, `AnimatePresence` 70, `motion.span` 57) — leaf
components, each render trivial. No page-level component re-renders per
unrelated state change.

Rapid navigation, 4 sections in and out, twice (8 route changes):
**16 commits total**, dominated by `Skeleton`/`SkeletonRow` (the shared
placeholders, expected) and `PageTransition` (18). The components Stage 1
flagged — chat message rows, fitness selectors, dictionary rows — do not appear
in the top-15 during navigation, which is the intended outcome of the Stage 2
memo boundaries and narrowed store subscriptions.

Structural (not numeric) comparison to Stage 1: `AppContext` is still a wide
context, so its consumers still re-render together on a context change. Stage 2
narrowed the Zustand subscriptions and memoized the flagged rows; splitting the
context remains open work and is the next real lever.

## Manual reproduction of the original complaints

- **Cold load on a multi-field screen** (Settings): CLS 0.013 production /
  0.000 throttled WebView. No flicker, no field jump.
- **Rapid in/out of 4 sections** (fitness → chat → dictionary → mihrab, twice):
  exactly **one** layout shift recorded, 0.0092, and it was flagged
  `hadRecentInput` (i.e. attributed to the tap, not counted against CLS). No
  overlap between nav, header, sheets, or section content in any screenshot.
- **No DOM accumulation**: the document returns to 981 elements after eight
  navigations, matching the first load — the persistent shell keeps tabs mounted
  without growing.
- Console: clean on home, settings, fitness, dictionary.

## Open items

- Real-device Android run (`npx cap run android`) — not possible from the build
  environment; needs a local machine with Android Studio.
- `AppContext` split (Stage 1 finding #1) — still outstanding.
- Web-font swap costs ~0.012 CLS on every route (Google Fonts `display=swap`
  with no metric-matched fallback). Fixing it means self-hosting the families
  with `size-adjust`/`ascent-override` fallbacks; deliberately not attempted
  here because it changes the typography pipeline.
