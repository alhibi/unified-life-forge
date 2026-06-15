# Feature Map

Living index of SmartHub features and their migration state to the
`src/features/<feature>/` structure defined in `feature-structure.md`.

Legend: ✅ done · 🟡 partial · 🔴 not started · ⚪ N/A

| Feature | Pages | UI | Data | Status |
|---|---|---|---|---|
| **Chat / Messaging** | `pages/Chat.tsx`, `GroupChat.tsx`, `GroupsIndex.tsx`, `ChatSettings.tsx` | `components/chat/` + `ChatDrawer.tsx` | `lib/chat/` (canonical) + leak in `components/chat/useChat.ts` | 🟡 |
| **Reading (RSS)** | `pages/Reading.tsx` | `features/reading/` | hooks colocated; page imports `supabase` directly | 🟡 |
| **Wellness** | `pages/Wellness.tsx` | `features/wellness/` | local IndexedDB only | ✅ |
| **Diwan (Poetry)** | `features/diwan/pages/` | `features/diwan/components/` | `features/diwan/lib/` + `features/diwan/data/` | ✅ |
| **Podcasts** | `features/podcasts/pages/` | `features/podcasts/components/` | `features/podcasts/lib/` + colocated context | ✅ |
| **Weather** | `features/weather/pages/Weather.tsx` | `features/weather/components/` | `features/weather/lib/` + `features/weather/hooks/useWeatherData.ts` | ✅ |
| **Calendar / Occasions** | `features/calendar/pages/AllOccasions.tsx` | `features/calendar/components/ReligiousOccasions.tsx` | `features/calendar/data/` | ✅ |
| **Duas** | `features/duas/pages/Duas.tsx` | — | `features/duas/data/duas.ts` | ✅ |
| **Knowledge** | `features/knowledge/pages/Knowledge.tsx` | embedded | embedded | ✅ |
| **Settings** | `Settings.tsx`, `ThemeSettings.tsx`, `FontSettings.tsx`, `PrayerSettings.tsx`, `ProfileEdit.tsx` | embedded | `contexts/AppContext.tsx` (god-context) + raw Supabase in `ProfileEdit` | 🔴 |
| **Games** | `features/games/pages/` (11 pages) | `features/games/components/GameShell.tsx` | `features/games/data/` + `features/games/utils/` | ✅ |
| **Mihrab / Prayer Practice** | `pages/Mihrab.tsx`, `pages/mihrab/*` | `components/PrayerTimes.tsx` (1253 lines, root), `CurrentTimeSunnah.tsx` (root) | `lib/prayerTimes.ts`, `utils/prayerAstronomy.ts`, `hooks/usePrayerTimesCache.ts`, `useAutoPrayerTheme.ts` | 🔴 |
| **Prayer Guide / Sunnah** | `PrayerGuide.tsx`, `PropheticDay.tsx`, `TimedSunnah.tsx`, `UntimedSunnah.tsx`, `SunnahDetail.tsx` | embedded | `data/sunnahDetailData.ts`, `untimedSunnahData.ts`, `nawawiHadiths.ts` | 🔴 |
| **Clipboard / Locations** | inline in `Index.tsx` | `features/clipboard/components/LocationSaver.tsx` | `features/clipboard/hooks/useClipboard.ts` (api.ts pending) | 🟡 |
| **Home Dashboard** | `pages/Index.tsx` | `UmmahPulse.tsx`, `UmmahGlobe.tsx`, `LivingRibbon.tsx`, `SmartGreeting.tsx` (all root, 1363+1208+ lines) | — | 🔴 |
| **Auth** | `pages/Auth.tsx` | — | `hooks/useAuth.tsx`, `lib/auth/localAuthStore.ts` | 🟡 |
| **Tafsir / QuranVirtues** | `pages/Tafsir.tsx`, `QuranVirtues.tsx` | embedded | embedded | 🔴 |
| **Browse** | `pages/Browse.tsx`, `pages/browse/*` | — | shell for Reading + Podcasts | ⚪ |

## Phased migration order

| Phase | Scope | Risk |
|---|---|---|
| 1 | Docs only (this file + 3 siblings) + memory rules | none |
| 2 | Calendar, Duas, Knowledge | low |
| 3 | Weather, Clipboard | low |
| 4 | Games (large surface, no server data) | medium |
| 5 | Podcasts, Diwan | medium |
| 6 | Mihrab / Prayer (big god-component) | high |
| 7 | Chat, Settings, Reading | high |

After each phase: build passes, preview renders, no visual diff.

## How to update this map

When you migrate or add a feature, flip the row's status and adjust the
columns. This file is the source of truth for "what lives where".