---
name: Weather Smart Insights
description: Phase A weather extension — best outdoor windows, outfit recommendation, health/prayer tips
type: feature
---

Smart Insights card sits between ForecastBars and NextSevenDays on `/weather`.

Logic in `src/lib/weather/insights.ts` (pure functions, no React):
- `bestMoments(data, now)` — scans next 24h hourly entries, scores each by temp (peak 21°C, drop outside 12–28°), precip probability, and weather code; collapses contiguous good runs (score ≥ 0.6) of ≥ 2h; returns up to 2 windows tagged `mild | evening-cool | sunny-warm | crisp`.
- `outfitForNow(data, now)` — translates current temp/feels-like/wind plus next-6h max precip prob and today's UV max into a headline + detail string and a list of `OutfitItem` flags.
- `healthTips(data, prayerTimings, now)` — produces up to 3 short bullets covering hydration on hot days, cold-day warnings, high UV avoidance window, cold Fajr alert, windy Isha, and pleasant evening for walks. Prayer-aware tips read `prayerTimings.Fajr` / `prayerTimings.Isha` via `fetchPrayerTimings`.

UI in `src/components/weather/SmartInsightsCard.tsx`:
- Three stacked `SectionShell` panels (Sparkles, Shirt, Shield icons) with Obsidian Depth styling (inset shadows, gradient bg, border-border/40).
- Times rendered LTR with `bdi` + `numberingSystem: 'latn'` so Arabic users still see `14:00–17:00`.
- All copy bilingual via `{ ar, de }` objects on every label.

Constraints:
- No new APIs, no new keys — uses existing `useWeatherData` + `usePrayerTimesCache`.
- Prayer fetch is best-effort; tips silently drop the prayer entries if it fails.
- Outfit items deduped before render; `Shirt` icon stands in for all clothing layers (Phosphor lacks Coat/Snowflake/Umbrella/Sunglasses).