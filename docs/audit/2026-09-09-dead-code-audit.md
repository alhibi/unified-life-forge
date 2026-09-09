# Dead code, orphaned files & unreachable features — audit (2026-09-09)

Read-only audit. Method: `knip` static analysis over the whole repo (102 unused
files, 858 unused exports, 569 unused types, 43 duplicate exports, 22 unused
runtime dependencies), plus a manual reachability pass over `src/App.tsx`
routes vs `src/components/portal/apps.ts`, and per-edge-function reference
grep. Nothing was deleted or changed.

---

## 1. Whole features that are dead (highest impact)

### 1.1 The second, orphaned Fitness implementation — including Health Connect

`/fitness` is served by `src/pages/Fitness.tsx`, which imports only
`RouteThumbnail`, `useActivityTracking`, `FullActivityMap`. Everything else in
`src/features/fitness/` is unreachable:

| File | Notes |
|---|---|
| `src/features/fitness/index.tsx` | alternative fitness screen, never imported |
| `src/features/fitness/ui/pages/FitnessDashboardPage.tsx` | + `ui/pages/index.ts` |
| `src/features/fitness/model/useFitnessEngine.ts` | the engine the audit flagged for a GPS leak — dead |
| `src/features/fitness/HealthConnectCard.tsx` | the **only** consumer of Health Connect |
| `src/features/fitness/healthConnect.ts` | Android Health Connect bridge — never called |
| `src/features/fitness/StatsPanel.tsx`, `LiveSessionPanel.tsx` | dead panels |
| `src/features/fitness/ui/components/FitnessActivityChart.tsx` | dead (only `recharts` consumer besides StatsPanel) |
| `src/features/fitness/ui/components/FitnessDashboardSkeleton.tsx`, `FitnessErrorBoundary.tsx` | dead |

Consequence: **the Health Connect integration is shipped in the bundle but no
screen renders it**, and `@capgo/capacitor-health` is an unused dependency.
Either wire `HealthConnectCard` into `src/pages/Fitness.tsx` or delete the
branch.

### 1.2 Unreachable routes (no tile, link, or nav entry)

- `/german-club/wortliste` → `src/features/german-club/pages/WortlistePage.tsx`
  (registered at `App.tsx:892`, prefetched at `App.tsx:259`, but `apps.ts:223`
  lists only `/german-club`, `/dictionary`, `/grammar`). A finished page users
  cannot open.
- `/dev/material-preview` → `src/features/mind/pages/MaterialPreviewPage.tsx`
  — developer-only preview, intentionally unlinked.
- `/.lovable/oauth/consent` — reachable only as an external OAuth redirect.

### 1.3 Backend functions with no caller

- `supabase/functions/check-premium-entitlement/` — no client reference at all.
- `supabase/functions/german-club-entries-fetch/` — no client reference
  (the German Club uses `german-club-generate-content` only).
- Shared helpers with no importer: `_shared/rss-utils.ts`,
  `_shared/marginalia.ts`, `_shared/marginaliaPipeline.ts`,
  `_shared/atlasScoutPipeline.ts`, `_shared/ai-gateway.ts`.

All other functions (`atlas-scout`, `fetch-rss`, `fetch-rss-cron`,
`extract-article`, `discover-feed`, `search-articles`,
`check-keyword-alerts`, `mg-*`, `visual-crossing-proxy`, `dexscreener-proxy`,
`archive-generate`, `pkm-optimize`, `openrouter-list-models`, `mcp`) do have
callers.

### 1.4 The in-app MCP server

`src/lib/mcp/index.ts` and all four tools (`create-note`, `get-note`,
`list-notes`, `whoami`) are unreferenced from the app, as is
`src/integrations/lovable/index.ts`. `@lovable.dev/cloud-auth-js` is likewise
unused. This is a whole subsystem in the tree that nothing calls.

---

## 2. Orphaned component & module files (src only)

- `src/components/CurrentTimeSunnah.tsx` — superseded by the Sunnah widget.
- `src/components/SmartGreeting.tsx` — superseded by the Portal greeting.
- `src/components/MuscleBodyMap.tsx` — no consumer.
- `src/features/calendar/components/ReligiousOccasions.tsx` — the data file is
  used, the component is not.
- `src/features/profile/components/ProfileStatsDashboard.tsx`,
  `ProfileVisionCard.tsx`.
- `src/features/clipboard/api.ts`, `src/features/clipboard/components/LocationSaver.tsx`.
- `src/features/diwan/lib/bayanSchema.ts`, `src/features/diwan/lib/foldersStorage.ts`.
- `src/features/games/types.ts`, `src/features/games/hooks/queryKeys.ts`.
- `src/features/german-club/lib/shelfVisual/resolve.ts`, `lib/surgeAnimation.ts`.
- Weather leftovers from the redesign: `WeatherHero.tsx` (replaced by
  `WeatherHeroRefined`), `AmbientBackdrop.tsx`, `GaugeTileRefined.tsx`,
  `MagneticCard.tsx`, `SectionReveal.tsx`.
- `src/features/weather/sources/PWSNetworkAdapter.ts` — exports
  (`fetchPWSObservations`, `runPWSAdapter`) never called: the PWS "source"
  is documented but not part of the ensemble.
- Duplicated infra: `src/hooks/useDraftStorage.ts` + `src/lib/draftStorage.ts`
  (superseded by `usePersistentDraft`), `src/hooks/usePendingAction.ts`,
  `src/hooks/useSharedChannel.ts`, `src/lib/realtime/channelRegistry.ts`,
  `src/lib/debounce.ts`.
- `src/components/ui/accordion.tsx`, `src/components/ui/separator.tsx` — unused
  shadcn primitives.
- `src/App.css` — leftover from the Vite template.
- Barrel files nothing imports: `src/features/{archive,calendar,chat,diwan,duas,games,journal,knowledge,marginalia,podcasts,travel-atlas}/index.ts`,
  `src/features/chat/components/groups/index.ts`, `src/stores/index.ts`,
  `src/utils/{helpers,validation}/index.ts`, `src/utils/helpers/text.ts`.
- `public/reading-sw.js` and `build/swTemplate.js` — service-worker template no
  longer wired into the build.
- One-off migration scripts still in the tree: `scripts/codemod-*.mjs` (6),
  `scripts/prune-unused-locals.mjs`, `scripts/diwan/*` (4), `scripts/travel/*` (2).

---

## 3. Padded / duplicated code inside live files

**Largest concentrations of unused exports** (dead API surface behind files
that *are* used):

| Unused exports | File |
|---|---|
| 51 | `src/features/wellness/nutrition/index.ts` |
| 44 | `src/features/games/progression/index.ts` |
| 35 | `src/features/wellness/athleticEngine.ts` (BMI, Navy body-fat, TDEE, 1RM, Karvonen zones, ACWR… all computed, none rendered) |
| 31 | `src/lib/motion.ts` |
| 29 | `src/features/podcasts/lib/store.ts` |
| 28 | `src/utils/validation/schemas.ts` |
| 27 | `src/features/wellness/premium/surfaces.tsx`, `training/progressionEngine.ts` |
| 26 | `src/lib/chat/hooks/index.ts` |
| 25 | `src/lib/interfaceScale.ts`, `src/lib/chat/crypto/index.ts` |
| 15 | `src/features/weather/lib/utils.ts`, `weather-motion.ts` |

The whole wellness "nutrition" component set is exported but not mounted:
`CategoryGrid`, `FoodCard`, `FoodDetailSheet`, `MealTracker`,
`NutritionExplorer`, `NutritionInsights`, `SmartFilters`, `NutritionTab`.

**Aliases pointing at the same value** (one concept, two names — pick one):

- `src/lib/appearancePreferences.ts`: `DEFAULT_ADVANCED_INTERFACE_PREFERENCES`
  = `DEFAULT_ADVANCED_INTERFACE_PREFS`, `DEFAULT_APPEARANCE_PROFILE` =
  `DEFAULT_APPEARANCE_PREFERENCES`, `sanitizeAppearanceProfile` =
  `sanitizeAppearancePreferences`.
- `src/lib/interfaceScale.ts`: `UI_SCALE_OPTIONS`/`UI_SCALE_PRESETS`,
  `SURFACE_MATERIAL_OPTIONS`/`SURFACE_MATERIALS`,
  `INTERACTION_STYLE_OPTIONS`/`INTERACTION_STYLES`.
- `src/lib/motion.ts`: `EASE_SPRING`=`SPRING_SNAPPY`=`SPRING_IOS`,
  `EASE_OUT_EXPO`=`EASE_OUT`=`SPRING_ENTER`=`BOUNCE_OPEN`,
  `EASE_IN`=`SPRING_EXIT`=`BOUNCE_CLOSE` — three physical curves behind ten
  names, which is why motion drifts between screens.
- `src/features/weather/lib/weather-motion.ts`:
  `heroRevealTransition`=`heroSpringTransition`=`heroSpringTransition2`,
  `tabCinematicTransition`=`tabTransition`.
- ~25 components export both a named and a default binding of the same symbol.

---

## 4. Unused dependencies (bundle / install weight)

Runtime: `@capgo/capacitor-health`, `recharts`, `react-hook-form`,
`@hookform/resolvers`, `input-otp`, `@emoji-mart/react`,
`@lovable.dev/cloud-auth-js`, `@types/dompurify`, and 11 Radix packages
(`accordion`, `aspect-ratio`, `checkbox`, `hover-card`, `icons`, `menubar`,
`navigation-menu`, `progress`, `radio-group`, `scroll-area`, `separator`,
`toast`, `toggle`, `toggle-group`).

Dev: `@types/suncalc`, `@typescript-eslint/parser`, `eslint-plugin-prettier`,
`autoprefixer`, `postcss` (the last two only if the Tailwind pipeline no longer
reads them — verify before removing).

Declared nowhere but imported: `@capacitor/cli`,
`@radix-ui/react-visually-hidden`.

---

## 5. Present-but-inert UI

- `src/features/chat/pages/ChatSettings.tsx:487` — "استيراد (قريباً)" row whose
  handler only shows a toast.
- `src/features/time-ledger/components/LayerToggleBar.tsx:44` — `onClick={() => {}}`.
- No `{false && …}` gates, no always-off feature flags, no unset `VITE_*`
  feature toggles were found.

---

## 6. Suggested order of cleanup

1. Decide the fate of `src/features/fitness/` (Health Connect) — behaviour
   decision, not a cleanup.
2. Link or delete `/german-club/wortliste`.
3. Delete the confirmed orphan files in §2 (mechanical, zero behaviour risk).
4. Collapse the alias sets in §3 to one name each (motion first — it has a
   visible effect on consistency).
5. Remove unused deps in §4 after §1–§3, then re-run `knip`.
