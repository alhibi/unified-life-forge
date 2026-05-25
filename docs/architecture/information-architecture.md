# Information Architecture

This document captures the bottom-nav layout, hub structure, and the
reasoning behind the May 2026 reorganisation. Read this before adding
a new top-level destination or moving a feature between hubs.

## Bottom navigation (6 tabs)

```
┌──────────────────────────────────────────────────────────────────────┐
│  🎲 الألعاب  │ 💬 محادثات │ 💪 عافية │ 🏠 الرئيسية │ 🧭 اطلاع │ 📖 محراب │
└──────────────────────────────────────────────────────────────────────┘
        games     chat       wellness   home          browse    mihrab
```

Visual order in code is left → right (`tabs[]` in `BottomNav.tsx`).
RTL viewers see `mihrab` first (right edge) and `games` last (left
edge). `home` sits one slot left of centre as the route anchor.

Per-tab accent colours drive the wave fill, crest glow, top hairline,
icon and label colours:

| Tab      | Path        | Icon            | Colour     |
| -------- | ----------- | --------------- | ---------- |
| Games    | `/games`    | `Dices`         | `#fb923c`  |
| Chat     | `/chat`     | `MessageCircle` | `#7dd3fc`  |
| Wellness | `/wellness` | `HeartPulse`    | `#34d399`  |
| Home     | `/`         | `House`         | `#c4b5fd`  |
| Browse   | `/browse`   | `Compass`       | `#a78bfa`  |
| Mihrab   | `/mihrab`   | `BookOpen`      | `#fcd34d`  |

`/settings` is no longer a top-level tab. It is reached from the
avatar shortcut in the top-right of the home page.

## Hub structure

### `/` — الرئيسية / Home

Answers the single question "what should I do right now?". Contents:

- Greeting + (Clipboard | Chat | Avatar/Settings) buttons
- Weather widget
- Prayer times
- Current-time sunnah
- Ummah pulse
- Saved locations
- Made-by-Amer footer
- Clipboard drawer (portal)

Removed in the reorg: Tafsir feature card, `IslamicSections` grid, the
header Newspaper button. All of those entries now live under the
appropriate hub below.

### `/mihrab` — محراب / Mihrab

Four horizontal sub-tabs, persisted in `localStorage` under
`mihrab:lastTab`:

| Sub-tab      | Renders                                                 |
| ------------ | ------------------------------------------------------- |
| `quran`      | Continue-reading card (from `tafsir-state`) + Tafsir + Quran Virtues cards |
| `dhikr`      | Embeds `<DhikrTab />` — Nawawi 40, Frequent Duas, Categories with modals |
| `sunnah`     | Cards: Timed Sunnah, Untimed Sunnah, Prophetic Day, Badges (soon) |
| `literature` | Selections (soon) card + embedded `<DiwanLibraryPage tab />` |

Heavy sub-pages (`/tafsir`, `/section/*`, `/diwan/library/*`) keep
their own routes and `BackButton` flows; Mihrab is a thin landing
on top of them. The Dhikr and Literature tabs embed their content
inline because that content is already structured as tab bodies.

### `/browse` — اطلاع / Browse

Two horizontal sub-tabs, persisted under `browse:lastTab`:

| Sub-tab    | Renders                                                  |
| ---------- | -------------------------------------------------------- |
| `podcasts` | Hero teaser + cards: Discover (`/podcasts`), My Library (`/podcasts/library`) |
| `articles` | Primary card → `/reading` + 5 secondary cards (bookmarks, search, reader, alerts, manage) |

### `/wellness` — العافية / Wellness

Unchanged. Six internal tabs (Workouts, Calisthenics, Diet, Insights,
Atlas, Encyclopedia) under `wellness:lastTab`.

### `/games` — الألعاب / Games

Unchanged. Six games (Sudoku, Chess, Memory, Dice, Focus, Chess
Puzzles) plus four "worlds" (Chess Career, Memory Adventure, Dice
Tournament, Focus Decathlon).

### `/chat` — محادثات / Chat

Unchanged.

## Routing & redirects

Old URLs from external links continue to work:

| Old route          | Behaviour                                          |
| ------------------ | -------------------------------------------------- |
| `/duas`            | `<Navigate to="/mihrab" replace />` after writing `mihrab:lastTab=dhikr` |
| `/diwan`           | `<Navigate to="/mihrab" replace />` after writing `mihrab:lastTab=literature` |
| `/tafsir`          | Unchanged — page-mode with own `BackButton`        |
| `/podcasts*`       | Unchanged — page-mode with own `BackButton`        |
| `/reading`         | Unchanged — page-mode with own `BackButton`        |
| `/section/*`       | Unchanged — page-mode with own `BackButton`        |
| `/diwan/library/*` | Unchanged — page-mode with own `BackButton`        |
| `/settings*`       | Unchanged — page-mode with own `BackButton`        |

## Persistence model

Persistent (eager, mounted once) tabs in `<PersistentTabs/>`:

```
TAB_PATHS = ['/', '/games', '/chat']
```

These three are small and hot — the user touches them all the time
and remount cost is visible. Wellness, Browse, and Mihrab are
heavier (lazy data modules) and are routed through `<Routes>` with
`React.lazy` chunks. The first tap pays a brief skeleton; subsequent
taps hit the module cache.

## Mental model — why this layout?

The reorg groups features by **mental mode**, not by topic, so the
user's cognitive map shrinks from ~12 separate destinations to 6:

- **Now**         → Home (prayer times, weather, current sunnah)
- **Reflect**     → Mihrab (everything that asks the user to slow
                    down and read: Quran, Dhikr, Sunnah, Literature)
- **Discover**    → Browse (everything to skim or listen to:
                    Podcasts, Articles)
- **Body**        → Wellness
- **Play**        → Games
- **Connect**     → Chat
- **Self**        → Settings (off-tab, via avatar)

When adding a new feature, ask "which mental mode is the user in?"
and place it in the matching hub rather than promoting it to a new
top-level tab.
