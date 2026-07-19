# Local → Cloud Migration Brief (SmartHub / amv.life)

> **Temporary file for Jules.** Delete this file after all 10 features are migrated to Lovable Cloud (Supabase). Do not commit long-term.

## Context

- Stack: React 18 + Vite + TypeScript, Tailwind v3, shadcn/ui.
- Backend: **Lovable Cloud** (managed Supabase). Client is at `@/integrations/supabase/client` — never edit that file. Auth is username/password only (no Google/Apple).
- Data layer rule (see `docs/architecture/data-layer.md`): No file outside a feature's `api.ts` may import `@/integrations/supabase/client`. Pages/components/hooks call typed functions from `api.ts`. React Query wraps them in `hooks/` with a typed `queryKeys.ts`.
- Every new `public.<table>` migration MUST include, in order: `CREATE TABLE` → `GRANT` (to `authenticated` and `service_role`; `anon` only if a policy allows) → `ALTER TABLE ... ENABLE ROW LEVEL SECURITY` → `CREATE POLICY`. RLS scopes to `auth.uid()`.
- User roles must live in a separate `user_roles` table with a `has_role()` SECURITY DEFINER function. Never store roles on `profiles`.
- Use JSONB liberally where schemas are flexible (see the existing `wellness_records` pattern).
- Follow the reference implementation in `src/lib/chat/` (api.ts, hooks/, types.ts, queryKeys.ts, errors.ts).
- Sync policy: latest `updated_at` wins. Optional local-first Dexie + outbox pattern is fine (see `src/features/pkm/hooks/useSyncEngine.ts`), but the **cloud must be the source of truth** for every item below.
- Auth-gated: nothing is anonymous. If the user is signed out, features fall back to read-only local state.

## The 10 features to cloudify

### 1. Games — 7 games, per-user progress
**Files:** `src/features/games/pages/{Chess,ChessCareer,ChessPuzzle,Sudoku,MemoryGame,FocusGame,FocusDecathlon,DiceGame,Games}.tsx`, `src/features/games/utils/gameFeedback.ts`, data under `src/features/games/data/`.
**Currently:** All stats, unlocked levels, best times, chess career progression, puzzle streaks, memory adventure state, dice tournament state — in `localStorage` per browser.
**Target schema (suggested):** `game_progress(user_id uuid, game text, state jsonb, updated_at timestamptz)` unique on `(user_id, game)`. JSONB per game, keyed by game slug (`chess-career`, `sudoku`, `memory`, `focus`, `focus-decathlon`, `dice`, `chess-puzzle`).
**Notes:** Do NOT change gameplay logic or UI. Only swap the storage layer to `api.ts` + React Query. Debounce writes (games mutate state often — batch every 1–2s or on unmount).

### 2. Podcasts — library, history, queue, playback position
**Files:** `src/features/podcasts/lib/store.ts`, `src/features/podcasts/contexts/PodcastPlayerContext.tsx`, `src/features/podcasts/pages/{Podcasts,PodcastLibrary,PodcastDetail,History}.tsx`, `src/features/podcasts/components/{PlayerSheet,PodcastMiniPlayer,QueueSheet}.tsx`.
**Currently:** Subscribed feeds, listening history, queue, per-episode playback position, playback rate — all `localStorage`.
**Target schema:**
- `podcast_subscriptions(user_id, feed_url, title, image, added_at)` unique on `(user_id, feed_url)`.
- `podcast_episode_state(user_id, episode_guid, feed_url, position_sec int, duration_sec int, completed bool, played_at timestamptz)` unique on `(user_id, episode_guid)`.
- `podcast_queue(user_id, episode_guid, feed_url, position int, added_at)`.
- `podcast_prefs(user_id, prefs jsonb)` for playback rate, sleep timer defaults.
**Notes:** MiniPlayer must NOT change visually or in behavior. Position updates: throttle to every ~5s + on pause/seek/close.

### 3. Mind — memory anchors + growth state
**Files:** `src/features/mind/hooks/useMindState.ts`, `src/features/mind/hooks/useMemoryAnchor.ts`, `src/features/mind/lib/growth.ts`, `src/features/mind/components/{MindScene,MindFallback2D,MemoryTimelineRail}.tsx`, `src/features/mind/pages/Mind.tsx`.
**Currently:** All memory anchors, timeline events, mind-growth counters in `localStorage`.
**Target schema:** reuse `pkm_mind_events` if suitable, or add `mind_state(user_id, state jsonb, updated_at)` singleton + `mind_anchors(id uuid, user_id, kind, payload jsonb, created_at)`.

### 4. Clipboard / Location Saver
**Files:** `src/features/clipboard/components/LocationSaver.tsx`, `src/features/clipboard/index.ts`.
**Currently:** Uses `clipboard_items` table already? Verify — if `LocationSaver` still writes `localStorage`, migrate to the existing `clipboard_items` table (already in the schema). Confirm columns cover: label, lat, lng, address, note, color, created_at.

### 5. Audio Storage (custom uploaded audio)
**Files:** `src/utils/audioStorage.ts`, consumers under Mihrab/QuranTab audio player.
**Currently:** IndexedDB blobs for user-uploaded local audio files.
**Target:** Upload to a private `audio` Storage bucket (create it via `supabase--storage_create_bucket`), plus `audio_files(user_id, name, storage_path, duration_sec, size_bytes, created_at)`. Stream with signed URLs. Keep an in-memory LRU for the current session so playback stays instant.

### 6. Diwan folders (dawāwīn library)
**Files:** `src/features/diwan/lib/foldersStorage.ts` (currently in `src/features/reading/foldersStorage.ts` — verify path), `src/features/diwan/pages/{Diwan,LibrarySearch}.tsx`.
**Currently:** User's folders/collections of poems in `localStorage`.
**Target schema:** `diwan_folders(id uuid, user_id, name, color, order_index int, created_at)` + `diwan_folder_items(folder_id, poem_id, added_at)`. RLS: user owns folder → can CRUD items.

### 7. Message drafts
**Files:** `src/lib/chat/hooks/useDraft.ts`.
**Currently:** Per-conversation text drafts in `localStorage`.
**Target schema:** `message_drafts(user_id, conversation_id, body text, updated_at)` unique on `(user_id, conversation_id)`. Debounce writes at 400–600ms while typing. Keep an optimistic local cache so keystrokes never wait on the network.

### 8. Reading list prefs & keyword-alert local state
**Files:** `src/features/reading/listPrefs.ts`, `src/features/reading/useNotifications.ts`, `src/features/reading/KeywordAlertsView.tsx`.
**Currently:** Sort order, filters, per-feed collapse state, "seen alerts" cursor in `localStorage`. Articles/bookmarks themselves are already cloud.
**Target schema:** extend existing `reading_prefs.settings` JSONB with: `listSort`, `listFilter`, `collapsedFeeds[]`, `mutedSources[]`, `alertsSeenAt` timestamp. Keep purely-ephemeral UI state (scroll position) local.

### 9. Calisthenics progress (Wellness → Premium)
**Files:** `src/features/wellness/premium/CalisthenicsTab.tsx`, `src/features/wellness/training/types.ts`.
**Currently:** Some progression rows are cloud (via `wellness_records`), others (last-viewed exercise, per-exercise best set, unlocked variations) still `localStorage`.
**Target:** move remaining keys into `wellness_records` as new `kind` values: `calisthenics_progress`, `calisthenics_ui`. Use the flexible JSONB shape already in place.

### 10. In-preview UI state that should follow the account
**Files:** `src/pages/Mihrab.tsx` (last selected tab), `src/pages/Tafsir.tsx`, `src/features/duas/pages/Duas.tsx`, `src/pages/QuranVirtues.tsx`, `src/pages/Browse.tsx` (last sub-tab).
**Currently:** "Last-open tab", "read Duas", "collapsed sections" in `localStorage`.
**Target:** add to `user_settings.settings` JSONB (table already exists). Namespaces per page: `settings.mihrab`, `settings.tafsir`, `settings.duas`, `settings.browse`. Read-through cache in memory for instant paint.

## Explicitly NOT for migration (stay local)

These are legitimately per-device and must remain in `localStorage`:
- Theme choice, font, prayer calculation prefs (`ThemeSettings.tsx`, `FontSettings.tsx`, `PrayerSettings.tsx`, `MotionSettings.tsx`) — the account already syncs the "chosen" values via `user_settings`; the local copy is just the first-paint cache.
- Weather cache tiers (`src/weather/cache/*`) — designed as a 3-tier ephemeral cache; do not touch.
- PWA/service-worker cleanup flags, last device location, "boot motion" flag.
- Chat wallpaper picks, message search history, chat scroll position (`useChatScroll`, `useChatPrefs`).
- Reverse-geocode cache (`src/lib/reverseGeocode.ts`).
- `localAuthStore.ts` — legacy fallback path; leave in place.

## Deliverable per feature

For each of the 10 items:
1. Add a migration under `supabase/migrations/` following the GRANT-then-RLS order above.
2. Create `api.ts` in the feature folder (or extend the existing one) with typed CRUD.
3. Add `queryKeys.ts` and React Query hooks in a `hooks/` subfolder.
4. Replace all `localStorage.*` reads/writes in the feature with the hook.
5. Keep an in-memory first-paint cache seeded from the last known cloud value (mirroring how `user_settings` works today), so there is zero visible delay when opening a page.
6. Do NOT introduce Realtime subscriptions for these — polling + invalidateQueries on mutations is enough and cheaper.
7. Do NOT change any UI, animation, copy, or ordering. Storage swap only.

## When done

- Verify: `rg "localStorage|indexedDB" src/features/{games,podcasts,mind,clipboard,diwan}` returns nothing for the migrated features (except the first-paint cache mirrors).
- Delete this file (`docs/tmp/local-to-cloud-migration.md`) in the same PR as the last migration.
