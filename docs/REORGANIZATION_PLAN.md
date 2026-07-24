# Project Reorganization Plan

A phased, low-risk plan to bring the entire codebase to the standard
described in `docs/CONTRIBUTING.md`. Each phase is a **separate, isolated
pass**: build must stay green, preview must render, no visual diff.

> **How to use this file.** Any agent (human or AI) picks the *next
> unchecked phase*, executes it in one PR-sized change, ticks the box,
> and updates `docs/architecture/feature-map.md`. Never skip ahead —
> later phases assume earlier ones landed.

---

## Guiding constraints

- One phase = one atomic change. No mixing phases.
- No behavior changes unless the phase title says "behavior".
- After every phase: `bun run build` passes, no new console errors on
  `/`, `/mihrab`, `/reading`, `/chat`, `/wellness`, `/travel-atlas`.
- Update `feature-map.md` status column when a feature moves.
- If a phase touches ≥ 15 files, split it in half and re-list.

---

## Phase 0 — Guardrails (foundation) ✅

- [x] `docs/CONTRIBUTING.md` — the single onboarding doc.
- [x] `docs/REORGANIZATION_PLAN.md` — this file.
- [x] Runtime fix: `supabase.rpc(...).catch` → `.then(undefined, …)`
      in `src/components/chat/useChat.ts` (PostgrestBuilder is thenable,
      not a Promise).
- [ ] Add an ESLint rule that forbids importing `@/integrations/supabase/client`
      outside `src/features/*/api.ts` and `src/services/supabase/`.
      *(Follow-up — needs an eslint plugin config change.)*
- [ ] Add an ESLint rule that forbids `features/a` → `features/b` imports.

## Phase 1 — Root chrome cleanup

Move root-level page components into their feature folders. Each move
is: (1) create the file in `features/<x>/pages/`, (2) update `App.tsx`
import, (3) re-export from `features/<x>/index.ts`, (4) delete old
`src/pages/*.tsx`.

- [ ] `pages/Mihrab.tsx` + `pages/mihrab/*` → `features/prayer-practice/pages/`
- [ ] `pages/PrayerGuide.tsx`, `PropheticDay.tsx`, `TimedSunnah.tsx`,
      `UntimedSunnah.tsx`, `SunnahDetail.tsx` → `features/prayer-practice/pages/`
- [ ] `pages/Tafsir.tsx`, `pages/QuranVirtues.tsx` → `features/quran/pages/`
      (new feature folder).
- [ ] `pages/Chat.tsx`, `pages/GroupChat.tsx`, `pages/GroupsIndex.tsx` →
      `features/chat/pages/`.
- [ ] `pages/Reading.tsx` → `features/reading/pages/`.
- [ ] `pages/Wellness.tsx` → `features/wellness/pages/`.
- [ ] `pages/Settings.tsx`, `ThemeSettings.tsx`, `FontSettings.tsx`,
      `MotionSettings.tsx`, `PrayerSettings.tsx` → `features/settings/pages/`.
- [ ] `pages/Browse.tsx` + `pages/browse/*` → `features/browse/pages/`.
- [ ] `pages/Auth.tsx`, `pages/OAuthConsent.tsx` → `features/auth/pages/`.
- [ ] `pages/Index.tsx` → `features/home/pages/Home.tsx`.
- [ ] `pages/NotFound.tsx` stays under `src/pages/` (app-level).

## Phase 2 — Chat consolidation

There are two chat data layers today: `src/lib/chat/` (canonical) and
`src/components/chat/` (legacy leak). Merge into one.

- [ ] Move `src/components/chat/internal/` hooks into `src/lib/chat/hooks/`.
- [ ] Move `src/components/chat/useChat.ts` logic into
      `features/chat/hooks/useChat.ts`; keep the React component split.
- [ ] Move visual components (`MessageBubble`, `ChatImage`, `EmojiPicker`,
      …) into `features/chat/components/`.
- [ ] Delete `src/components/chat/` and `src/components/ChatDrawer.tsx`
      once nothing imports them.
- [ ] `features/chat/api.ts` becomes the ONLY file importing `supabase`
      for chat.

## Phase 3 — Root components diet

Move feature-specific chrome out of `src/components/`:

- [ ] `UmmahPulse.tsx`, `UmmahGlobe.tsx`, `LivingRibbon.tsx`,
      `SmartGreeting.tsx`, `CurrentTimeSunnah.tsx`, `QiblaCompass.tsx`,
      `PrayerTimes.tsx` → their owning features.
- [ ] `MuscleBodyMap.tsx`, `ExerciseDetailSheet.tsx` → `features/wellness/`.
- [ ] Keep in `src/components/`: `BottomNav`, `BackButton`,
      `PageTransition`, `ScrollToTop`, `EdgeSwipeBack`, `ErrorBoundary`,
      `SEO`, `NavLink`, `PageHeader`, `ImageLightbox`, `AuthGuard`,
      `CommandPalette`.

## Phase 4 — Data + hooks lift

- [ ] `src/data/sunnahDetailData.ts`, `nawawiHadiths.ts` →
      `features/prayer-practice/data/`.
- [ ] `src/hooks/useAutoPrayerTheme.ts`, `usePrayerTimesCache.ts` →
      `features/prayer-practice/hooks/`.
- [ ] `src/lib/prayerTimes.ts`, `prayerCalculationMethod.ts` →
      `features/prayer-practice/lib/`.
- [ ] `src/utils/hijri.ts`, `prayerAstronomy.ts` →
      `features/prayer-practice/utils/`.
- [ ] `src/hooks/useUnreadMessages.ts`, `usePresence.ts` →
      `features/chat/hooks/`.

## Phase 5 — Contexts split

`src/contexts/AppContext.tsx` is a god-context. Split by concern:

- [ ] `ThemeContext` — theme, dark/light/true-black.
- [ ] `LocaleContext` — language + direction (RTL/LTR).
- [ ] `PreferencesContext` — user settings that sync to
      `user_settings` via `features/settings/api.ts`.
- [ ] Delete `AppContext.tsx` once every consumer is migrated.

## Phase 6 — Supabase call audit

- [ ] Grep for `from '@/integrations/supabase/client'` outside
      `features/*/api.ts` and `services/supabase/`. For every hit,
      move the call into the owning feature's `api.ts`.
- [ ] Every `api.ts` returns a typed result or throws a typed error
      from `features/<x>/errors.ts` — no bare `Error`s.
- [ ] Enable the ESLint guard from Phase 0.

## Phase 7 — Types & queryKeys

- [ ] Every feature has a `queryKeys.ts` factory used by every hook.
- [ ] Every feature has a `types.ts` — no domain types inline in
      components.
- [ ] Remove unused `any` and `@ts-ignore`. Target: zero `any` in
      `features/**/api.ts` and `features/**/hooks/**`.

## Phase 8 — Test coverage floor

- [ ] Every `api.ts` has a companion `api.test.ts` (mocked supabase).
- [ ] Every non-trivial hook has a `.test.ts`.
- [ ] Vitest passes with zero skipped tests.

## Phase 9 — Public barrels

- [ ] Every `features/<x>/index.ts` re-exports ONLY the public surface
      (pages + a handful of components). Everything else stays private.
- [ ] Every route import in `App.tsx` uses `@/features/<x>` — no deep
      paths.

## Phase 10 — Docs sync

- [ ] `docs/architecture/feature-map.md`: every row is ✅.
- [ ] `docs/architecture/information-architecture.md`: routes match
      reality.
- [ ] `public/sitemap.xml` includes every public route.
- [ ] Add a `docs/architecture/testing.md` with the testing conventions
      used by Phase 8.

---

## Execution rules for the assisting agent

1. Read `docs/CONTRIBUTING.md` first, then this file.
2. Pick the next unchecked bullet in the earliest incomplete phase.
3. Do **only that bullet**. Do not touch anything else.
4. Update `feature-map.md` if the bullet moves a feature between
   statuses.
5. Tick the bullet in this file in the same change.
6. Verify: `bun run build`, preview loads `/`, no new console errors.
7. Stop. Wait for the user to invite the next bullet.

If a bullet is blocked (missing type, unclear owner, ambiguous scope),
do not improvise — leave it unchecked and add a `> Note:` line under it
explaining what is blocking.