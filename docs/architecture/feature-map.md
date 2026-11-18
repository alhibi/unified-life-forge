# Feature Map

Living index of the 26 feature domains in `src/features/` and the route or settings surface
that mounts each one. Architecture facts only; visual authority is
[DESIGN.md](../../DESIGN.md), and the route-by-route matrix is
[docs/design-system/route-coverage.md](../design-system/route-coverage.md).

Verified against `src/App.tsx` and `src/features/` at revision `7e34f503`.

## Domains

| #   | Domain           | Entry point / hub                                                      | Routes                                                                 | Data layer                                                             |
| --- | ---------------- | ---------------------------------------------------------------------- | ---------------------------------------------------------------------- | ---------------------------------------------------------------------- |
| 1   | **account**      | `features/account/components/AccountPrivacySection`                    | embedded in `/settings`                                                | `features/account/api.ts`                                              |
| 2   | **appearance**   | `pages/AppearanceSettings.tsx`, `pages/InterfaceSettings.tsx`          | `/settings/appearance`, `/settings/interface`                          | `contexts/AppContext.tsx` + `lib/appearancePreferences.ts`             |
| 3   | **archive**      | `features/archive/pages/ArchiveHome`, `ArchiveNew`, `ArchiveReader`    | `/archive`, `/archive/new`, `/archive/:id`                             | `features/archive/api.ts`                                              |
| 4   | **calendar**     | `features/calendar/pages/AllOccasions.tsx`                             | `/occasions`                                                           | `features/calendar/data/islamicOccasions.ts`, `hooks/useLiveHijriDate` |
| 5   | **chat**         | `features/chat/pages/Chat`, `GroupsIndex`, `GroupChat`, `ChatSettings` | `/chat`, `/chat/groups`, `/chat/g/:chatId`, `/chat/settings`           | `src/lib/chat/` (shared client) + feature components                   |
| 6   | **crypto**       | `features/crypto/pages/CryptoWatchlist.tsx`                            | `/crypto`, `/crypto/`                                                  | `features/crypto/api.ts`                                               |
| 7   | **diwan**        | `features/diwan/pages/Diwan` + library pages (7)                       | `/diwan`, `/diwan/library/**`, `/diwan/bayan`                          | `features/diwan/data`, `features/diwan/lib`                            |
| 8   | **duas**         | `features/duas/pages/Duas.tsx`                                         | `/duas`                                                                | `features/duas/data/duas.ts`                                           |
| 9   | **fitness**      | `pages/Fitness.tsx` → `features/fitness/index.tsx`                     | `/fitness`                                                             | `features/fitness/api.ts`, `healthConnect.ts`, `metrics.ts`            |
| 10  | **games**        | `features/games/pages/Games` + 6 game pages                            | `/games` and 6 sub-routes                                              | `features/games/api.ts`, `data`, `lib`                                 |
| 11  | **german-club**  | `features/german-club/pages/GermanClubHome` + 5 pages                  | `/german-club/**` (6 routes)                                           | `features/german-club/lib` + local stores                              |
| 12  | **journal**      | `features/journal/pages/JournalHome.tsx`                               | `/journal`                                                             | `features/journal/api.ts`, `queryKeys.ts`                              |
| 13  | **keyboard**     | `features/keyboard/KeyboardProvider` + `pages/KeyboardSettings`        | `/settings/keyboard`                                                   | `features/keyboard/lib/preference.ts`                                  |
| 14  | **knowledge**    | `features/knowledge/pages/Knowledge.tsx`                               | `/knowledge`                                                           | embedded static catalog                                                |
| 15  | **marginalia**   | `features/marginalia/pages/Marginalia.tsx`                             | `/marginalia`                                                          | `features/marginalia/api.ts`                                           |
| 16  | **mihrab**       | `pages/Mihrab.tsx` + `pages/mihrab/{Quran,Dhikr,Sunnah,Literature}Tab` | `/mihrab` (`?tab=`)                                                    | `features/mihrab/data`, `lib/usePractice`                              |
| 17  | **mind**         | `features/mind/pages/Mind`, `MaterialPreviewPage`                      | `/pkm/mind`, `/dev/material-preview`                                   | feature hooks/lib                                                      |
| 18  | **motion**       | `pages/MotionSettings.tsx` → `features/motion/components`              | `/settings/motion`                                                     | `lib/motionPreferences.ts`                                             |
| 19  | **pkm**          | `features/pkm/pages/PKM.tsx`                                           | `/pkm`                                                                 | feature hooks/lib (local-first)                                        |
| 20  | **podcasts**     | `features/podcasts/pages/Podcasts` + 3 pages                           | `/podcasts`, `/podcasts/library`, `/podcasts/history`, `/podcasts/:id` | `features/podcasts/lib`, `contexts/PodcastPlayerContext`               |
| 21  | **profile**      | `pages/ProfileEdit.tsx` + `features/profile/components`                | `/profile`, `/settings/profile`                                        | `features/profile/lib`, `data`                                         |
| 22  | **reading**      | `pages/Reading.tsx` + `features/reading/*`                             | `/reading`                                                             | `features/reading/api.ts`                                              |
| 23  | **time-ledger**  | `features/time-ledger/pages/TimeLedger.tsx`                            | `/time-ledger`                                                         | `features/time-ledger/api.ts`, `hooks/useTimeLedger`                   |
| 24  | **travel-atlas** | `features/travel-atlas/pages/` (7 pages)                               | `/travel-atlas/**` (7 routes)                                          | `features/travel-atlas/api.ts`, `scoutApi.ts`, `offlineCache.ts`       |
| 25  | **weather**      | `features/weather/pages/Weather.tsx`                                   | `/weather`                                                             | `features/weather/hooks/useWeatherData.ts`, `lib`                      |
| 26  | **wellness**     | `pages/Wellness.tsx` + `features/wellness/*`                           | `/wellness` (`?tab=`)                                                  | `features/wellness/wellnessDb.ts` (Supabase, RLS)                      |

## Route shells in `src/pages`

Some domains are mounted through a thin shell in `src/pages/` rather than a feature-owned
page. These are real route components, not duplicates of feature logic:

```
src/pages/
  Portal.tsx                 "/"          (persistent tab)
  Browse.tsx                 "/browse"    + browse/{Podcasts,Articles}Tab
  Mihrab.tsx                 "/mihrab"    + mihrab/{Quran,Dhikr,Sunnah,Literature}Tab
  Wellness.tsx               "/wellness"
  Fitness.tsx                "/fitness"
  Reading.tsx                "/reading"
  ProfileEdit.tsx            "/profile", "/settings/profile"
  AppearanceSettings.tsx     "/settings/appearance"
  InterfaceSettings.tsx      "/settings/interface"
  MotionSettings.tsx         "/settings/motion"
  KeyboardSettings.tsx       "/settings/keyboard"
  PrayerSettings.tsx         "/settings/prayer"
  Settings.tsx               "/settings"
  Quran.tsx, Dhikr.tsx, Sunnah.tsx, Duas.tsx (feature), Tafsir.tsx,
  TimedSunnah.tsx, UntimedSunnah.tsx, PropheticDay.tsx,
  SunnahDetail.tsx, QuranVirtues.tsx, PrayerGuide.tsx
```

There is **no `src/pages/Index.tsx`** and **no `src/features/clipboard/`**. The home screen
is `Portal.tsx`, and the retired `/now` route redirects to `/`. Clipboard actions that
survived live in the in-app keyboard (`features/keyboard/components/ClipboardPanel.tsx`) and
in the pages that copy content; saved places belong to `features/travel-atlas/`.

## Rules the architecture gate enforces

`bun run arch` builds the real import graph and measures:

- import cycles;
- orphan production modules;
- cross-feature imports (only `features/<domain>/index.ts` is a legal target);
- Supabase client imports outside a feature's `api.ts`;
- direct `import.meta.env.VITE_SUPABASE_*` reads outside the client module.

Each count is compared with a frozen budget in `arch-budget.json`; exceeding the budget fails
the gate. Budgets may only go down — an existing exception is not permission for a new one.

## How to update this map

When a domain gains, loses or moves a page, update its row here and the corresponding entry
in `docs/design-system/route-coverage.md`. When a route is added to `src/App.tsx`, add it to
both. This file is the source of truth for "what lives where"; `src/App.tsx` is the source of
truth for "what is routed".
