# SmartHub Master Remediation Program — Phased Execution

## Constraints of this environment (stated up front)

- **Git:** Branches, commits and PRs are managed by the platform here; I cannot run `git checkout -b`, commit, or open PRs. Every change becomes its own reversible version in the project history. Working tree is clean at HEAD `6b123c81`. Branch/PR workflow must be done from GitHub if required.
- **Live backend is currently unreachable** (pooler error 544 / ENOTFOUND on every migration attempt this session). Anything needing the live database (applying migrations, RLS proof tests with anonymous/owner/other user) stays **Blocked** until it returns. I will not retry blindly or claim success.
- No production writes for exploration; synthetic test data only.

## Verified at HEAD (pre-plan reads)

| Claim | Status |
|---|---|
| Stack is React 19.2.8, Vite 8.2, Tailwind 4.3.3 | Confirmed (AGENTS.md stack table is stale → fix) |
| `ImageUploadContext.tsx`, `features/archive/api.ts`, `lib/mcp/index.ts` read `import.meta.env.VITE_SUPABASE_*` directly | Confirmed |
| `profiles_public` has **0** consumers in `src/`; 7 direct `from('profiles')` reads | Confirmed |
| `20261005120000_close_anon_read_leaks.sql` exists in Git | Confirmed; live application **unverifiable** |
| CI sets an offline-RLS opt-out env flag in `verify.yml` | Confirmed (flag name appears mangled to `VITE_` — must re-check) |
| Chat channel named `chat:${chatId}` in `useChatMessages.ts:133` | Confirmed; lifecycle bug not yet reproduced |
| `App.tsx` 1,433 lines, `AppContext.tsx` 2,200 lines | Confirmed |
| Username-availability RPC written, not applied | Confirmed (Blocked: backend) |

## Phase A — Baseline and blockers

1. Run every gate with Bun and record real output: install (frozen), typecheck, lint, lint:budget, arch, test, build, build:budget, e2e, test:smoke (per slice via `scripts/smoke-routes.mjs`), plus dependency/security scans.
2. Produce a baseline table (command, result, duration, errors/warnings/skips, failure cause) in a single central log `docs/REMEDIATION_REGISTER.md`.
3. Re-verify each claim in AGENTS.md, BLUEPRINT_MEMORY.md, roadmap.md, ENGINEERING_TRANSFORMATION_PLAN.md, PHASE0_LOG.md, FORENSIC_AUDIT, design audit, `.kiro` steering and CI files; classify as Confirmed / Fixed-with-evidence / Stale / Unverifiable.
4. Fix the real cause of any lint-budget overflow (never raise budgets). Inspect the mangled CI env flag.
5. Probe backend reachability (read-only). If still down, record Blocked with exact recovery commands.

## Phase B — P0 security and privacy

1. Route every public profile read through `profiles_public` (or a narrow RPC); owner reads keep full access. Add a test that fails if public paths query `profiles` directly.
2. Centralise Supabase URL/key usage on the generated client; remove the three scattered `import.meta.env` reads; add an automated guard (extend `clientSecretExposure.test.ts`/arch rule) rejecting new env reads.
3. Static RLS/policy review of all migrations: `USING (true)` policies, permissive-OR overlaps, SECURITY DEFINER functions without `search_path`, role source (`user_roles` only), storage path rules, chat membership RPCs, location/presence privacy, default-private new accounts.
4. Client review: service-role leakage, token/location/message logging, unsanitised HTML, RSS/URL SSRF limits in edge functions, upload validation, rate limits.
5. When backend returns: apply pending migrations (close_anon_read_leaks if absent, username RPC) forward-only, then run the hostile-client RLS suite (anonymous / owner / other user, synthetic rows). Until then these stay **Blocked**, not Fixed.

## Phase C — Critical user flows

1. Reproduce the Realtime "callbacks after subscribe()" failure under Strict Mode and rapid navigation; fix channel lifecycle (unique per-mount channel, await removal, no resubscribe on unrelated deps); test for no duplicate messages or leaked channels.
2. Auth: sign-in, sign-out (local cache wipe without losing unsynced data), expired session, password recovery, username flow.
3. Network recovery: timeouts/abort, visible error + safe retry, no infinite loading, no setState after unmount.

## Phase D — Domain correctness

Coverage matrix per feature (positive / negative / edge) with regression tests before fixes: prayer and qibla (timezone, DST, denied location, high latitude), religious content integrity (no text changes), reader/RSS/podcast/archive/PKM (offline, import/export, sanitisation), travel/GPS/fitness (permissions, units, duplicates), weather/crypto (stale, rate limit, malformed responses, precision), and a sweep for inert buttons.

## Phase E — Visual system and accessibility

1. Settle one identity. Evidence shows the shipped default is now the `editorial` preset (warm paper / warm graphite), while README, memory and some screens still describe Obsidian/Copper. Write a short ADR, update README, `.kiro` steering and project memory so they agree.
2. Playwright baseline screenshots (mobile 390, tablet 768, desktop 1280) for every primary route before and after.
3. Remove off-identity gradients/glows/local durations (starting with `ProfilePrivacySettingsTab.tsx`), measure WCAG 2.2 AA contrast automatically, check RTL logical properties, 44px touch targets, focus-visible, reduced motion, and no horizontal overflow.

## Phase F — Performance and structural debt

Brotli bundle measurement, icon/font/map weight, rerender and leak audit (listeners, timers, subscriptions, polling, unbounded caches), incremental extraction from `App.tsx`/`AppContext.tsx` only where behaviour or ownership justifies it, with parity tests. Budgets can only go down. Dependency updates in small, fully tested batches.

## Phase G — Release hardening

Run all gates from scratch, verify preview, update runbook and rollback notes, and write a final report that separates "fixed in code" from "verified on live service", listing open release blockers.

## Execution style

One slice per turn where possible: failing test first, smallest root-cause fix, targeted test, then the gates that matter. Each closed item in the register cites the command output that proves it. No large redesign while a data leak or broken core flow remains open.

## Technical details

- Register columns: ID, severity (P0–P3), status (Open / In Progress / Fixed-Verified / Blocked / Stale), path:line, repro evidence, root cause, impact, fix, guard test, dependencies, verification.
- Profile privacy guard: an arch/vitest rule scanning `src/` for `.from('profiles')` outside the owner-scoped API module.
- Env guard: allow `import.meta.env.VITE_SUPABASE_*` only in `src/integrations/supabase/*`.
- Realtime fix direction: channel name `chat:${chatId}:${instanceId}`, register all `.on()` before `.subscribe()`, cleanup awaits `removeChannel`, dependency array limited to `chatId`.
