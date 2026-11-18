# QA closure-pass verification (independent)

- **Task:** task-8 · Agent H (independent QA) · **Branch:** `next-phase/closure-pass` @ /Users/amer/ulf-design · **HEAD:** `a75ff082649482219961a07325bb4442ff7c5c63` · **Dirty worktree:** 38 at start (closure changes uncommitted).
- **Environment:** dev server :5199 (shared) · production preview :4173 (started temporarily by me for item 4, then stopped; a lead e2e preview was later running on :4173 and was left untouched).
- **Report-only:** no product/script code edited. Writes under `verification/reports/**`, `verification/design/qa/closure/**`, `/tmp` only. A QA diagnostic *copy* of the audit script was created under my scope (clearly labelled; not the gate).
- **When:** 22:35–23:10 +0100.

## 0. Timeline-critical harness finding (resolved by lead)

The closure branch's first audit build (mtime 21:58:05) **crashed on every route, both sessions**:
`node scripts/audit-routes.mjs --session signed-in --workers 2 --no-shots --json-out /tmp/h-signedin.json` → exit 1, no JSON. Minimal repro `--routes /` (anonymous and signed-in) crashed identically. Stack:
`TypeError: Cannot read properties of undefined (reading 'length') at finishRow (scripts/audit-routes.mjs:294)` ← `auditRoute` line 405 (and the QA-F1 pre-check line 379).
Root cause: the new retry pre-check calls `finishRow({ ...row })` before `row.pageErrors`/`row.consoleErrors` were assigned (they were only set after the candidate check), so the first `finishRow` threw, was swallowed by the route try/catch, and the second `finishRow(row)` at line 405 threw uncaught. Lead's stored 21:46/21:50 signed-in artifacts predate the edit, which is why they looked fine.

**Lead fixed it during this verification** (script mtime **22:43:27**: `row.pageErrors/consoleErrors` are now assigned immediately after `measureRow` and before the candidate check). I re-read the fixed region and verified the ordering. My independent QA-diagnostic copy with the equivalent one-line guard produced **signed-in 164/164 checks · 0 failed · 0 stale allowlist**, which matches the fixed shipped-script claim.

## 1. NEW signed-in fixture harness — **PASS (harness + shipped-script 164/164 independently rerun)**

Design verified from source:
- `scripts/lib/session-fixture.mjs` seeds a synthetic Supabase session under `sb-<project-ref>-auth-token` (stable user `tester`, far-future expiry), stubs the project's REST (profiles → `null`, other tables → `[]`), auth user endpoint, and blocks every other origin. `installAuthFixture` + `installSignedInRoutes` are used by `audit-routes.mjs --session signed-in` and `capture-matrix.mjs --session signed-in`.
- **Limitation is stated in the source and spec** and must be reported as such: this proves **signed-in composition + real empty states**, **not** real authentication, RLS, or populated backend data. (Minor doc gap: `e2e/signed-in-states.spec.ts` points at `verification.md §6`, which does not exist in the repo.)
- `capture-matrix.mjs --session signed-in` independently exercised: 2/2 routes captured, manifest `session: "signed-in"`, profile screenshot shows the signed-in identity (**PASS**).
- `e2e/signed-in-states.spec.ts`: present, 10 surfaces + username + anonymous-control assertions; reviewed statically only (running e2e would rebuild/preview; contract forbids).

Browser spot-checks with the fixture @390 (Chromium, external origins blocked):
| surface | evidence | verdict |
|---|---|---|
| /profile | h1 `tester`, `@tester`, member-since, 23% completion, **no** "تسجيل الدخول" CTA, no auth-loading, overflow −11 | PASS |
| /journal | h1 "مذكرتي", real signed-in empty StateView "مذكرتك فارغة — بعدُ." + body, no login CTA | PASS |
| /chat | h1 "الرسائل", inbox empty state "لا توجد محادثات بعد ابدأ محادثة جديدة…", no login CTA | PASS |
Screenshots: `verification/design/qa/closure/shots/signedin-*.png`; data `.../interactions.json`.

**Audit claim (expect 164/164): PASS — independently rerun on the restarted dev server with the SHIPPED script** (§9): `node scripts/audit-routes.mjs --session signed-in --workers 2 --no-shots --json-out /tmp/h-signedin.json` at 23:13:43 → **164 checks · 0 failed · 0 stale allowlist · session signed-in · 0 retried**, artifact `/tmp/h-signedin.json` sha256 `13f752b02186bafe6b5174451e728d66368ea0d2f290b136652e635af949d449`; `/travel-atlas/trips` rows ok @390 and @1440 (h1 "رحلاتي").
- Corroboration retained: lead's shipped artifacts `verification/reports/route-audit-signedin.json` (22:50:26) and `route-audit-final.json` (22:46:51) are 164 rows / 0 failed / complete coverage; row-level comparison of lead's signed-in artifact vs my independent diagnostic run = **0 differences** on `ok`/`h1Count`/`overflow` (retry counts only).
- Note for reporting: this is a **synthetic-session + empty-PostgREST composition proof**, not real authentication/RLS/populated data.

## 2. TripsPage rewrite — A/B/C drawer contract — **PASS**

Interactive @390 (anonymous session; `verification/design/qa/closure/interactions.json`, `shots/trips-*.png`):
- **Open:** header icon `aria-label="رحلة جديدة"` 48×48 at y=8 opens a drawer with role=dialog; `#new-trip-title` receives autoFocus; background scroll locked (`body overflow: hidden`).
- **B (empty submit):** submit → inline `role=alert` "اكتب عنوان الرحلة أولاً." — no native browser bubble (form has `noValidate`), no fake optimistic row.
- **B (out-of-order dates):** title + start 2026-12-10 / end 2026-12-01 → inline `role=alert` "تاريخ النهاية قبل تاريخ البداية."; drawer stays open with typed values.
- **C (Escape):** drawer closes, body unlocks, focus returns **exactly to the opener** (verified by DOM identity, `focusOnOpenerEsc: true`).
- **C (Cancel):** closes, focus returns to opener (`true`).
- **Audit:** my diagnostic signed-in run has `/travel-atlas/trips` @390 and @1440 `ok:true` (h1 "رحلاتي", overflow −11, no retries); lead's validated shipped artifacts are 164/0 for both sessions, so the "0 failures both sessions" claim is corroborated (direct shipped rerun blocked by §6).

## 3. QA fixes

### 3a. Chess primary action @360×640 — **PASS**
`/games/chess`, viewport 360×640: "لعبة جديدة" rect **y=302, h=44, bottom=346** (inside the 640 viewport), **above** the board canvas (y=354), no horizontal overflow. Screenshot `shots/chess-360-closure.png`.

### 3b. Mihrab tabpanel focus ring — **PASS**
- Global rule present: `src/index.css` `[role='tabpanel']:focus-visible { outline: var(--ui-focus-width) solid hsl(var(--ring)); outline-offset: var(--ui-focus-offset); border-radius: var(--r-lg) }`.
- Reached the tabpanel with real keyboard Tab on /mihrab: `:focus-visible` true; computed **outlineStyle solid, width 2px, color rgb(138,213,202), offset 2px**.`boxShadow none` (outline is the ring). Screenshot `shots/mihrab-tabpanel-focus-ring.png`.
- Root-cause claim: current file has **no duplicate JSX attributes** and the new guard `node scripts/check-jsx-duplicates.mjs` reports "no duplicate JSX attributes in 458 TSX files"; the diff removes the old `className="focus-visible:outline-none"` from the panel. Caveat: my static scan of the committed HEAD version of `MihrabTabs.tsx` finds one `style` and one `className` on the panel (no duplicate attributes at HEAD), so the "old duplicate" was likely a transient working-tree state rather than something visible in HEAD — the outcome (ring visible, suppressing class removed, guard added) is verified.

### 3c. Audit determinism (QA-F1) — **PASS (shipped script, two independent runs, zero row differences)**
- Fixed script (mtime 22:43:27) now settles with `document.fonts.ready` + two rAFs and retries a failed row once; the pageErrors ordering bug (above) is fixed. Lead's fixed shipped artifacts show retries actually occurring (anonymous: 4 retried rows; signed-in: 1) while finishing 164/0 — consistent with timing artifacts being absorbed.
- **Independent two-run comparison executed on the restarted server with the shipped script** (§9):
  - Run 1 (`anon-shipped-run1.json`, 23:13:43): **164/164 · 0 failed · 0 retried**, sha256 `619ce09ac1db6301a5e851df2680af66149bc6ac975d9a04a6d8fe1d95ebe5dd`.
  - Run 2 (`anon-shipped-run2.json`, 23:18:45): **164/164 · 0 failed · 2 retried** (journal@390, occasions@1440 — retry absorbed the settle artifact), sha256 `42fdba9165de1efbe1dbd545962652005a3e4412cd3e09d5eba6eef159664331`.
  - **Row-by-row diff: 0 differences** on `status / ok / h1Count / h1 / overflow` across all 164 rows; the only deltas are the two `retried` flags (false→true), i.e. exactly the flake class QA-F1 was added to absorb. **No non-reproducible failure rows.**

## 4. Fitness Simulation Console build gating — **PASS**
- Dev :5199 `/fitness` contains the console (`Simulation Console` / "لوحة التحكم والمحاكاة للياقة البدنية") in both anonymous and signed-in contexts; source guard `{import.meta.env.DEV && ...}`.
- Production: :4173 was **not running** when I started (curl 000, no vite preview process), so I served the existing dist myself (`bunx vite preview --port 4173 --strictPort`, dist built 22:32:14, newer than `src/pages/Fitness.tsx` 22:18:06) and stopped it afterwards. Result: /fitness renders h1 "اللياقة النخبوية", **console absent**, no page errors. Static corroboration: `dist/assets/Fitness-*.js` contains the page's control string but **not** "Simulation Console"/Arabic console label. Screenshot `shots/fitness-prod-4173.png`.

## 5. Podcasts offline — **PASS**
`/podcasts` @390 with all external origins blocked, sampled after **7 s**: `role=alert` StateView "تعذّر تحميل البودكاست" + "إعادة المحاولة"; **0 skeletons, 0 spinners, no loading copy**. Screenshot `shots/podcasts-offline-7s.png`.

## 6. Environment outage recorded (resolved before final runs)

At **22:58** the shared dev server :5199 stopped responding (curl exit 28/timeout; vite PID at 100% CPU for ~58 min from a 22:07 restart). My first shipped signed-in attempt (22:52:32) stalled with `status:0 / h1-count:0` goto-timeout rows and was killed; no artifact. Lead killed and restarted the server; verified healthy at **23:13:41** (`5199: 200 in 0.0029 s`). All final runs in §1/§2/§3c were executed on the restarted server. Historical note only — not an open blocker.

## 7. Evidence index
- `verification/design/qa/closure/interactions.json` + `shots/` (signed-in ×3, trips ×3, chess, mihrab, podcasts, fitness-prod)
- `verification/design/qa/closure/signedin-audit.log` (crashed shipped run), `signedin-audit-fixed.log` (diagnostic: 164/0), `anon-run1/2.log` (shipped crash, identical), `shipped-signedin.log` (server-hang run)
- `verification/design/qa/closure/capture-check/` (signed-in capture harness)
- `verification/design/qa/closure/crash-bisect/` (crash chunks, all failed identically)
- QA diagnostic copy: `verification/design/qa/tools/audit-routes.closure-diag.mjs` (one-line guard; NOT the gate)

## 8. Verdict summary
| # | item | verdict |
|---|---|---|
| 1 | signed-in fixture harness (composition/empty states, synthetic-not-real-auth/RLS) | **PASS** — shipped signed-in audit independently rerun: 164/164 · 0 failed · 0 stale; capture harness PASS; limitation documented (doc-gap now fixed in docs/design-system/verification.md §6/§9) |
| 2 | TripsPage A/B/C + audit 0 both sessions | **PASS** — interactive A/B/C verified; targeted audit on final tree: anonymous 2/2 and signed-in 2/2 checks, 0 failed (re-run after the late 23:17:59 refactor) |
| 3a | chess CTA @360×640 above board, 44px | **PASS** |
| 3b | mihrab tabpanel focus ring + duplicate-attr root cause | **PASS** (outcome + guard); historical duplicate only partially corroborated |
| 3c | audit determinism QA-F1 | **PASS** — shipped anonymous full ×2: 164/0 both, 0 non-retry row differences; 2 retried rows absorbed the only settle deltas |
| 4 | fitness console dev-only | **PASS** |
| 5 | podcasts offline StateView | **PASS** |


## 9. Final shipped-script runs (restarted :5199, 23:13–23:22)

Environment/tree: HEAD `a75ff082`, dirty worktree grew during the session (363 → 526, almost entirely verification evidence); script mtime 22:43:27 (fix present); newest runtime src at run start = `src/features/weather/pages/Weather.tsx` 23:00:15 (post-snapshot padding-parity fix, treated as final per lead). A small behavioural-neutral refactor of `TripsPage.tsx` landed at **23:17:59** during the runs (inlined `restoreOpenerFocus` into `closeDialog`); `/travel-atlas/trips` was re-audited after it in both sessions: 0 failures.

| run | command | result | artifact sha256 |
|---|---|---|---|
| signed-in | `node scripts/audit-routes.mjs --session signed-in --workers 2 --no-shots --json-out /tmp/h-signedin.json` | **164 checks · 0 failed · 0 stale · 0 retried** | `13f752b02186bafe6b5174451e728d66368ea0d2f290b136652e635af949d449` |
| anonymous #1 | `node scripts/audit-routes.mjs --workers 2 --no-shots --json-out …/anon-shipped-run1.json` | **164 checks · 0 failed · 0 retried** | `619ce09ac1db6301a5e851df2680af66149bc6ac975d9a04a6d8fe1d95ebe5dd` |
| anonymous #2 | `… --json-out …/anon-shipped-run2.json` | **164 checks · 0 failed · 2 retried** | `42fdba9165de1efbe1dbd545962652005a3e4412cd3e09d5eba6eef159664331` |
| trips (anon, final tree) | `--routes /travel-atlas/trips` | 2/2 checks · 0 failed | `/tmp/h-trips-anon.json` |
| trips (signed-in, final tree) | `--session signed-in --routes /travel-atlas/trips` | 2/2 checks · 0 failed | `/tmp/h-trips-signedin.json` |

Row-by-row anonymous diff: 0 differences on status/ok/h1Count/h1/overflow; only `retried` false→true on /journal@390 and /occasions@1440 in run 2 (retry absorbed). Docs: the `verification.md §6` reference now resolves to `docs/design-system/verification.md` — §6 "what was not verified" and §9 "closure pass" both present.

**Final closure verdict: all five requested items PASS**, with the harness-crash finding recorded as PASS-after-fix (root cause found by this QA pass, fixed by lead at 22:43:27) and the synthetic-session limitation explicitly carried in this report.
