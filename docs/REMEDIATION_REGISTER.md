# Remediation Register

Single source of truth for the master remediation program. A row is only
`Fixed-Verified` when the cited command output proves it. `Fixed-in-code`
means the change is in Git but the live service has not confirmed it.

Statuses: Open · In Progress · Fixed-in-code · Fixed-Verified · Blocked · Stale

## Baseline — 2026-10-09 (HEAD 6b123c81, Bun 1.3.3)

| Gate | Command | Result | Duration | Notes |
|---|---|---|---|---|
| Typecheck | `bun run typecheck` | Pass (0 errors) | 60s | |
| Lint budget | `bun run lint:budget` | Pass — 827 warnings → **826** after this slice (ratcheted down) | 84s | The earlier CI overflow (`simple-import-sort` 13 > 12) no longer reproduces: count is 10 |
| Architecture | `bun run arch` | Pass | <1s | |
| Unit/integration | `bun run test` | **Fail** — 130 files pass, 1 file fails (30 tests), 1 file skipped | 232s | Only failure is `src/test/rlsHostileClient.test.ts`: backend host is NXDOMAIN, suite fails loudly by design (SEC-001). `appShellServiceWorker.test.ts` 6 skipped, `tailwindTokens.test.ts` 1 skipped — reasons to audit (TST-001) |
| Build | `bun run build` | Pass | 11s | Chunk-size advisory only |
| Bundle budget | `bun run build:budget` | **Fail** — 4 chunks over | <5s | PERF-001 |
| E2E | `bun run e2e` | Not run this slice | | Phase G |
| Smoke | `bun run test:smoke` | Not run this slice | | Phase G |
| Backend reachability | DNS + REST probe | Root cause: hosted backend was **paused**. Resumed 2026-10-09 22:30 UTC; auth health 401 (reachable) | | |
| RLS suite (live) | `bunx vitest run src/test/rlsHostileClient.test.ts` | **Pass 30/30** against live backend, no offline flag | 1.8s | anonymous read/write/RPC all denied |

## Issues

| ID | Sev | Status | Location | Evidence / root cause | Fix | Guard test |
|---|---|---|---|---|---|---|
| SEC-001 | P0 | Fixed-Verified (live) | `20261005120000_close_anon_read_leaks.sql` | Live inspection: `public read places` policy absent; places/place_photos/place_links owner-only; anon holds no grants on profiles/places/messages/conversations; profiles SELECT = owner OR conversation partner. The live state is already **stricter** than the Git file (which would allow any signed-in user to read `is_public` profiles), so the file must NOT be applied as-is | No apply. Reconcile Git with live via a forward-only migration in a later slice | RLS suite 30/30 live |
| SEC-002 | P1 | Fixed-Verified (live) | `is_username_available` | Applied (drizzle 0002). Anonymous REST call returns `true` for an unused name | — | live curl |
| SEC-003 | P2 | Fixed-Verified (live: anon RPC → 401; typecheck 0; 1,881 tests pass) | chat profile reads | Live policy already lets conversation partners read each other, so chat names will not disappear. Residual: blocked-users list and forwarded-from names for non-partners may show blank | `get_related_profile_cards` SECURITY DEFINER (drizzle 0003): card fields only, caller must have blocked or share a conversation; anon revoked; max 200 ids. Wired in `lib/chat/api.ts` + `useChat.ts` | anon curl 401 |
| SEC-004 | P2 | Fixed-Verified | `ImageUploadContext.tsx`, `features/archive/api.ts` | Scattered `import.meta.env.VITE_SUPABASE_*` reads; archive hardcoded a fallback host, upload could send `undefined` apikey | Import `SUPABASE_URL` / `SUPABASE_PUBLISHABLE_KEY` from the generated client | `clientSecretExposure.test.ts` › "resolves Supabase URL/key only in the generated client module" (pass). Allowed exception: `lib/mcp/index.ts` (build-time manifest) |
| SEC-005 | P2 | Fixed-Verified | `services/supabase/profiles.ts` | `getProfile` had zero callers and queried the wrong column (`id`) with `select('*')` | Removed | typecheck pass |
| CHAT-001 | P1 | Fixed-in-code | `lib/chat/hooks/useChatMessages.ts` | Topic `chat:${chatId}` reused while previous `removeChannel` pending → "cannot add postgres_changes callbacks after subscribe()"; `viewerId` in deps re-subscribed on auth refresh | Unique topic per subscription, `viewerId` via ref, cleanup removes every channel | `useChatMessages.realtime.test.tsx` (pass). Live delivery check pending backend |
| READ-001 | P2 | Fixed-in-code | `features/reading/*` | Refresh queue + archive pagination | Per-source backoff, single-flight, abort on leave; keyset paging | `refreshQueue.test.ts` |
| PERF-001 | P2 | Open | `bundle-budget.json` | Over budget: Reading +1.1 KB (new refresh queue + pagination — intended), extractArticle +253 B, storage +104 B, AtlasScoutTab +197 B (not touched — chunk regrouping suspected) | Investigate chunk graph; shrink before any re-baseline; never raise silently | `bun run build:budget` |
| TST-001 | P3 | Open | SW + tokens tests | 7 skipped tests need a recorded reason | Audit skips | — |
| DOC-001 | P3 | Open | README, `.kiro/steering`, memory | Identity conflict: shipped default is `editorial` preset; docs still describe Obsidian/Copper | ADR + doc alignment (Phase E) | — |

## Next exact steps

1. Reconcile `close_anon_read_leaks.sql` with the live (stricter) policies; drop the CI offline-RLS flag once backend stays up.
2. ~~SEC-003 residual~~ — closed.
3. PERF-001 chunk investigation.
4. Phase C auth/session flows; Phase E ADR.
