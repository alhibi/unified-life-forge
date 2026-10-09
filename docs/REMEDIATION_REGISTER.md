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
| Backend reachability | DNS + REST probe | **Down** — NXDOMAIN, HTTP 000; migration tool: pooler 544 / ENOTFOUND | | Blocks SEC-001/002/003 |

## Issues

| ID | Sev | Status | Location | Evidence / root cause | Fix | Guard test |
|---|---|---|---|---|---|---|
| SEC-001 | P0 | **Blocked** | `supabase/migrations/20261005120000_close_anon_read_leaks.sql` | In Git; application to the live database cannot be confirmed — backend unreachable. RLS hostile-client suite fails on reachability, not on a policy | Apply forward-only when backend returns, then run the suite against anonymous / owner / other-user synthetic rows | `src/test/rlsHostileClient.test.ts` |
| SEC-002 | P1 | **Blocked** | `is_username_available` RPC | Written, client falls back to direct check; 7 apply attempts failed (ENOTFOUND) | Apply via migration tool when backend returns | — |
| SEC-003 | P1 | Open (design ready) | `conversationsQuery.ts:33`, `useChat.ts:1545`, `lib/chat/api.ts:449` | These read **other users'** rows from `profiles`. After SEC-001, new accounts default to private and RLS hides them; `profiles_public` is `security_invoker` so it hides them too. Result once SEC-001 lands: chat partner names/avatars disappear. Columns read are not privacy-filtered fields, so there is no leak today | SECURITY DEFINER RPC returning only username/display_name/avatar for users who share a conversation or block row with the caller; switch the three consumers | Planned arch test banning `.from('profiles')` outside owner modules |
| SEC-004 | P2 | Fixed-Verified | `ImageUploadContext.tsx`, `features/archive/api.ts` | Scattered `import.meta.env.VITE_SUPABASE_*` reads; archive hardcoded a fallback host, upload could send `undefined` apikey | Import `SUPABASE_URL` / `SUPABASE_PUBLISHABLE_KEY` from the generated client | `clientSecretExposure.test.ts` › "resolves Supabase URL/key only in the generated client module" (pass). Allowed exception: `lib/mcp/index.ts` (build-time manifest) |
| SEC-005 | P2 | Fixed-Verified | `services/supabase/profiles.ts` | `getProfile` had zero callers and queried the wrong column (`id`) with `select('*')` | Removed | typecheck pass |
| CHAT-001 | P1 | Fixed-in-code | `lib/chat/hooks/useChatMessages.ts` | Topic `chat:${chatId}` reused while previous `removeChannel` pending → "cannot add postgres_changes callbacks after subscribe()"; `viewerId` in deps re-subscribed on auth refresh | Unique topic per subscription, `viewerId` via ref, cleanup removes every channel | `useChatMessages.realtime.test.tsx` (pass). Live delivery check pending backend |
| READ-001 | P2 | Fixed-in-code | `features/reading/*` | Refresh queue + archive pagination | Per-source backoff, single-flight, abort on leave; keyset paging | `refreshQueue.test.ts` |
| PERF-001 | P2 | Open | `bundle-budget.json` | Over budget: Reading +1.1 KB (new refresh queue + pagination — intended), extractArticle +253 B, storage +104 B, AtlasScoutTab +197 B (not touched — chunk regrouping suspected) | Investigate chunk graph; shrink before any re-baseline; never raise silently | `bun run build:budget` |
| TST-001 | P3 | Open | SW + tokens tests | 7 skipped tests need a recorded reason | Audit skips | — |
| DOC-001 | P3 | Open | README, `.kiro/steering`, memory | Identity conflict: shipped default is `editorial` preset; docs still describe Obsidian/Copper | ADR + doc alignment (Phase E) | — |

## Next exact steps

1. When the backend resolves: apply SEC-001, SEC-002 → run `bun run test` without the offline flag → move to Fixed-Verified or record failures.
2. Implement SEC-003 RPC in the same migration window, then switch consumers.
3. PERF-001 chunk investigation.
4. Phase C auth/session flows; Phase E ADR.
