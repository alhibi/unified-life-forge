# Information Architecture

This document describes how amv.life is navigated today: the Portal launcher, the three
persistent tabs, the route-level hubs, and how deep routes and aliases resolve. Verify claims
here against `src/App.tsx` and `src/features/`; product truth lives in this folder, visual
authority lives in [DESIGN.md](../../DESIGN.md).

Current inventory: **26 feature domains**, **82 product route paths** at revision
`7e34f503`.

## The model: Portal + three persistent tabs

There is **no bottom navigation bar**. `BottomNav.tsx` was deleted, no route reserves bottom
padding for a nav bar, and the page shell owns the bottom gutter. The home destination is the
Portal launcher at `/`. Only three routes persist across navigation:

```
┌──────────────────────────────────────────────────────────────┐
│  Portal "/"        Games "/games"        Chat "/chat"         │
│  launcher          play surface          conversations        │
└──────────────────────────────────────────────────────────────┘
   every other destination is a normal lazy route with its own
   PageHeader / BackButton back flow
```

| Tab    | Path     | Import                 | Persistent? |
| ------ | -------- | ---------------------- | ----------- |
| Portal | `/`      | eager (`pages/Portal`) | yes         |
| Games  | `/games` | lazy (`loadGames`)     | yes         |
| Chat   | `/chat`  | lazy (`loadChatTab`)   | yes         |

### How persistent tabs behave

- `TAB_PATHS = ['/', '/games', '/chat']` in `src/App.tsx`. `activeTab` is an exact
  `location.pathname` match; any other path is a deep route.
- Each visited tab is rendered once inside the tab layer and then toggled with
  `display:block` / `display:none`. Inactive slots stay mounted, so returning to a tab
  restores scroll and in-flight state instead of remounting it.
- A slot renders `null` until its tab has been visited (`seen` set). Games and Chat are
  lazy chunks, so their code is fetched on first visit — or earlier from the idle prefetch.
- Every slot is wrapped in its own `ErrorBoundary` and `Suspense` with `SkeletonPage` as
  the fallback, so a failing or loading tab does not take down the layer.
- The tab layer is one `AnimatePresence` child with the constant key `"tab-layer"`. Tab →
  tab swaps do not animate horizontally; the newly shown slot plays the short
  `tab-zoom-in` keyframe. Pushing from a tab into a deep route slides the whole layer with
  the same push/pop variants as the incoming page, and `lastTabForExit` keeps the outgoing
  tab rendered during that exit.
- The persistent paths also appear in `<Routes>` with `element={null}`. That is deliberate:
  it prevents React Router from mounting a second copy while `<PersistentTabs/>` owns the
  page.
- Idle prefetch (`useIdlePrefetch`) warms one chunk at a time on `requestIdleCallback`,
  ordered by likely first tap. It skips entirely on save-data, 2G, or low-memory/low-core
  devices. Games and Chat are in that queue, so the first tab switch usually hits the module
  cache.

## Route-level hubs

These are ordinary routes, not tabs. They keep their internal state (usually in
`localStorage` and sometimes a `?tab=` query parameter) and have a real back target.

### `/` — Portal launcher

The first screen: identity and date, today's live widgets (prayer times, current sunnah,
weather, qibla), then the app grid under a category rail. Apps are ordered pinned-first;
focusing a tile previews it in the detail panel, and opening one records it in recents and
navigates. The Portal is the only eager page.

### `/games` — الألعاب

The persistent play surface. Sub-routes:

| Route                     | Surface          |
| ------------------------- | ---------------- |
| `/games/sudoku`           | Sudoku           |
| `/games/chess`            | Chess            |
| `/games/chess/puzzles`    | Chess puzzles    |
| `/games/chess/career`     | Chess career     |
| `/games/memory`           | Memory           |
| `/games/memory/adventure` | Memory adventure |

### `/chat` — محادثات

The persistent conversation surface. `/chat/groups` must be declared before
`/chat/g/:chatId` so the literal segment is not captured as a chat id.

| Route             | Surface                   |
| ----------------- | ------------------------- |
| `/chat`           | Direct conversations      |
| `/chat/groups`    | Groups and channels index |
| `/chat/g/:chatId` | One group chat            |
| `/chat/settings`  | Chat settings             |

### `/mihrab` — محراب

Four internal tabs, persisted in `localStorage` under `mihrab:lastTab` and addressable with
`?tab=` (`quran` · `dhikr` · `sunnah` · `literature`). The tab bodies lazy-load; the heavy
Diwan library only loads if Literature is opened.

The deep pages keep their own routes and back flows: `/quran`, `/tafsir`, `/dhikr`,
`/sunnah`, `/duas`, `/section/*`, `/mihrab/prayer-guide`, `/diwan/library/**`.

### `/browse` — اطلاع

Two internal tabs, persisted under `browse:lastTab`:

| Tab        | Renders                                                      |
| ---------- | ------------------------------------------------------------ |
| `podcasts` | Podcast teaser and links to `/podcasts`, `/podcasts/library` |
| `articles` | Entry to `/reading` and its secondary reading tools          |

### `/wellness` — العافية

Eight internal tabs persisted under `wellness:lastTab` and addressable with `?tab=`:
workouts, calisthenics, activity, nutrition, diet, insights, atlas, encyclopedia. The Fitness
GPS dashboard is a separate route (`/fitness`) and a separate feature domain.

### Settings tree

| Route                                | Screen                                                     |
| ------------------------------------ | ---------------------------------------------------------- |
| `/settings`                          | Settings index                                             |
| `/settings/appearance`               | Mode, palette, accent strength, typography                 |
| `/settings/interface`                | Scale, spacing, corners, density, width, material, presets |
| `/settings/motion`                   | Motion and performance                                     |
| `/settings/prayer`                   | Prayer and location settings                               |
| `/settings/keyboard`                 | In-app keyboard                                            |
| `/settings/profile` · `/profile`     | Profile and account                                        |
| `/settings/theme` · `/settings/font` | Redirect to `/settings/appearance`                         |

## Routing and aliases

`src/App.tsx` declares 82 product paths at this revision. Only these are redirects or
compatibility aliases:

| Path              | Behaviour                                                                                 |
| ----------------- | ----------------------------------------------------------------------------------------- |
| `/index`          | `<Navigate to="/" replace />`                                                             |
| `/now`            | `<Navigate to="/" replace />` — the retired "الرئيسي" app; its widgets live on the Portal |
| `/settings/theme` | `<Navigate to="/settings/appearance" replace />`                                          |
| `/settings/font`  | `<Navigate to="/settings/appearance" replace />`                                          |
| `/crypto/`        | Same element as `/crypto` (trailing-slash compatibility)                                  |
| `*`               | `NotFound`                                                                                |

Every other path is a real route; `/duas`, `/dhikr`, `/sunnah`, `/diwan`, `/podcasts*`,
`/reading`, `/section/*` and `/diwan/library/*` are **not** redirects. They remain
page-mode destinations with their own `PageHeader`/`BackButton`.

Route guards are applied at the route, not inside pages:

- `/journal` is wrapped in `AuthGuard` because the journal is account-backed.
- `/german-club/review` is wrapped in `AdminRoute` (role checked server-side too).
- `/dev/material-preview` is wrapped in `DevelopmentRoute` and is unreachable in production.
- `/.lovable/oauth/consent` serves external MCP/agent clients.

Two ordering rules are load-bearing: `/chat/groups` before `/chat/g/:chatId`, and every
literal `/travel-atlas/*` segment (`explore`, `countries`, `place`, `trips`) before
`/travel-atlas/:countryId`. Same for `/archive/new` before `/archive/:id`.

## Mental model

Navigation answers "where am I?" with two levels only:

1. **Persistent surfaces** — Portal (what can I open?), Games (what can I play?), Chat (who
   am I talking to?). These are the three places the user returns to constantly.
2. **Everything else** — a destination reached from the Portal, from one of the tab pages,
   or by deep link, with a single back gesture/control to where it came from.

When adding a destination, add a route and a Portal entry. Do **not** add a bottom nav item,
and do not add to `TAB_PATHS` unless the surface is small, hot, and worth keeping mounted for
the whole session. Heavier destinations stay lazy routes, like Wellness, Browse and Mihrab.
