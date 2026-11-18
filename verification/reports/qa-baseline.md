# QA baseline — independent defect report (Mission A)

- **Task:** task-8 · Agent H (independent QA) · **Branch:** `next-phase/visual-execution` @ /Users/amer/ulf-design (worktree dirty, integration in progress)
- **When:** 2026-11-18 18:27–19:25 +01:00 · **Environment:** Vite dev server http://127.0.0.1:5199 (shared) · Chromium via @playwright/test · dark/expressive/tonal/cozy/standard, locale ar, reduced motion, external origins blocked.
- **No feature or shared code was edited.** Only writes under `verification/reports/**` and `verification/design/qa/**`.
- **Important artefact note:** `verification/design/route-audit.json` is continuously overwritten by every agent's subset run. At 18:27 it held the full baseline (164 checks / 36 failures, mtime 17:23); by 18:29 it had been replaced by a 22-row subset. The 17:23 numbers were captured in `verification/design/qa/baseline/recovered-baseline-summary.md`; the authoritative independent baseline is the 17:33 run below (QA-local output path, never touching the shared file). Lead later added `--json-out` to the shared script; all later runs use it.

## 1. Method and commands

```bash
# 1) Independent strict baseline (fixed script, own output path)
node scripts/audit-routes.mjs --json-out verification/design/qa/baseline/run-2026-11-18T17-33-04/route-audit.json --workers 3 --no-shots
# 2) Rendered contrast, default 20 routes x dark/light
QA_CONTRAST_OUT=verification/design/qa/baseline/contrast-2026-11-18T17-37-40/contrast-audit.json \
  AUDIT_BASE=http://127.0.0.1:5199 node verification/design/qa/tools/check-contrast.qa.mjs
# 3) Contrast extended to 29 high-risk routes
... check-contrast.qa.mjs --routes /auth,/german-club,/german-club/dictionary,... (list in log)
# 4) Offline/loading/empty states probe (12 data routes, 8s wait)
node verification/design/qa/tools/probe-states.mjs
# 5) Interaction probes: dialogs, tab order, RTL, reduced motion
node verification/design/qa/tools/probe-interactions.mjs
# 6) Independent DOM spot-checks + P0 keyboard reproduction + retests
node verification/design/qa/tools/spotchecks.mjs ; repro-p0-keyboard.mjs ; measure-p0-keyboard.mjs ; retest*.mjs
```

QA-local copies (identical checks, only output path changed, provenance/sha256 in header): `verification/design/qa/tools/check-contrast.qa.mjs`; the strict audit now supports `--json-out` upstream so it is used directly.

## 2. Counts

| Artefact | Result |
|---|---|
| Strict baseline @17:33 (164 checks = 82 routes x 390/1440) | **34 failed**: small-targets 8 rows / 254 targets · clipped-headings 5 · float-overlap 16 · h1-count 6 rows (3 routes) · 0 overflow · 0 dir leaks · 0 page errors |
| Recovered 17:23 baseline (from earlier read) | 36/164 across the same check families |
| Contrast default matrix (20 routes x dark/light = 40 page audits) | **0 flagged pairs** |
| Contrast extended (29 routes x 2 modes) | 3 flagged: /auth dark "تم" 1.69 (keyboard key), /german-club/review dark "تم" 1.69 (same keyboard), /games light "مشاركة" 4.23 (+ later recheck: "بلا رتبة" 4.14) |
| Baseline screenshots inspected | 81 in `verification/design/baseline-390` (contact-sheet triage of all + full-size reads of 17 flagged/key screens) |
| Interactive probes | 3 dialogs/drawers, 3 tab orders (36 tab stops), RTL mixed text on 3 routes, reduced-motion in 2 OS modes + in-app switch + reload, 12 offline state probes, P0 keyboard repro at 390+1440, dock measurements |

## 3. Defect register (baseline and current status)

Status is re-checked on the live tree at ~19:20 (post shared-layer) where possible. "Fixed" means independently re-verified, not merely reported by an implementer.

| id | sev | route / viewport | selector / repro | expected | status @19:20 | owner |
|---|---|---|---|---|---|---|
| **QA-B01** | **P0** | /auth, /profile @390 (+1440) | On mount at 250ms the username field is focused → in-app keyboard auto-opens; keyboard top 420px covers password (432–478) and submit "دخول" (506–554); at 1440 keyboard top 478 covers submit (545–593). Repro script `repro-p0-keyboard.mjs` | Login fields + primary CTA visible and operable; keyboard only on explicit request | **Fixed** — explicit-opt-in policy; /auth 390/1440 keyboard closed, fields 296–466, submit 486–538 visible, disabled→enabled after fill. Evidence `shared-layer/interactions/_auth-390.png` | F (keyboard) / B (auth) |
| **QA-B02** | P1 | 16 rows @390: /games, /diwan, /diwan/library, /diwan/library/poets, /dhikr, /knowledge, /mihrab, /reading, /settings/appearance, /settings/font, /settings/motion, /settings/prayer, /settings/theme, /tafsir, /german-club/dictionary, /dev/design-system | `button.fixed.right-4.z-float` (portal dock 44x44) intersects enabled rows/cards; overlap area 558–1936px² (e.g. dock fully covers the "حريري" option on /settings/motion) | Navigation chrome never sits on an enabled control at rest | **Fixed** — dock now scroll-revealed, 44x44, hidden on immersive routes + while keyboard open; 0 float-overlap findings in full run; scroll test shows 44x44 with no overlaps | a-systems |
| **QA-B03** | P1 | /crypto, /crypto/, /games/memory, /games/sudoku, /german-club/grammar @390 | h1 `scrollWidth > clientWidth+2` (e.g. crypto 126/93, memory 109/54, sudoku 70/25, grammar 312/194); screenshots show "قائمة ال…", "سودوكو" clipped | Page identity h1 fully readable, wraps up to 2 lines | **Fixed** — PageHeader heading wrap; all four now scrollWidth==clientWidth; grammar title shortened | a-systems + domain owners |
| **QA-B04** | P1 (gate) | /games/sudoku (81 cells 38→41/42px), /games/chess/puzzles (64 cells 41/42px) @390 | Board cells measured as touch targets <44 | Documented X9 exception must be an allowlist entry so the strict gate is green *and* guarded | **Fixed** — `X9-sudoku-board-cells` entry added; independent rerun 4/4 green, no stale entries | g-spatial + a-systems |
| **QA-B05** | P2 | /podcasts/1 @390+1440 | two h1: visible "بودكاست" + a second h1 wrapping a loading skeleton | exactly one h1 per page | **Fixed** (single h1) | c-editorial |
| **QA-B06** | P2 | /travel-atlas/place/1 @390+1440 | h1Count 0 | hidden semantic h1 for full-bleed/empty detail surfaces | **Fixed** (sr-only h1 "مكان في أطلس الرحلات") | g-spatial |
| **QA-B07** | P2 | /dev/material-preview @390+1440 | h1Count 0 (dev surface) | one semantic heading even on dev/reference surfaces | **Fixed** in 19:11 full run (no h1 failure) | g-spatial/a-systems |
| **QA-B08** | P2 | /chat/groups, /chat/g/:chatId @390 | CTA renders raw i18n key `auth.signIn` | translated Arabic label | **Fixed** (Arabic CTAs, no raw key) | f-comms |
| **QA-B09** | P2 | /archive/1 @390 | error StateView body exposes `TypeError: Failed to fetch` | user-facing error copy, no stack strings | **Fixed** (no raw error text) | c-editorial |
| **QA-B10** | P2 | /mihrab/prayer-guide @390 | standalone link "إعدادات الصلاة ←" 87x19, not inside a paragraph (outside X9) | ≥44px target for a standalone link | **Fixed** (155x48) | d-spiritual |
| **QA-B11** | P2 | /games @light 390 | `span.shrink-0.rounded-full` "بلا رتبة" ratio 4.14; `span.shrink-0.rounded-sm` "مشاركة" 4.23 (AA 4.5) | AA on tinted badges in light mode | **Open** — to be confirmed in final contrast matrix | g-spatial (or shared token) |
| **QA-B12** | P1 (a11y) | /travel-atlas/trips · "رحلة جديدة"; /german-club/dictionary word modal | open dialog: focus moves inside + scroll lock works; Escape/Cancel closes and restores body overflow but focus lands on BODY, not the opener | focus returns to the logical opener (DESIGN §10 C) | **Open** — dispatched to A; trigger-based (DialogTrigger) overlays pass | a-systems |
| **QA-B13** | P2 (a11y) | /mihrab @390 | `[role=tabpanel]` tabindex=0, `:focus-visible` true, outline none, box-shadow none | visible focus indicator on every focusable | **Open** | d-spiritual |
| **QA-B14** | P2 | /time-ledger @390 | StateView rendered with empty h3 title (body "السجل الزمني فارغ") | non-empty title/body per StateView contract | **Not re-verified** after shared-layer StateView change | e-data |
| **QA-B15** | P2 (tooling) | 8 routes @390 (settings pages, /dev/design-system) | strict audit flags shared `Switch` (44x28 visual) as small target; actual hit area is 48x48 via `::after` — synthetic click 8px above the track toggles it | audit should measure effective target or allowlist the pattern with doc/reason | **Open** — tooling false positive, reported to lead | lead/scripts |
| **QA-B16** | P3 | /settings/motion | exposes raw spring readout "spring k=300 · c=34.6 · nav=0.220s" in the settings UI | decide: intentional advanced readout or hide behind a details disclosure | **Observation** (unverified intent) | a-systems |
| **QA-B17** | P3 | /pkm/mind @390 | large white rectangle in place of the 3D scene under headless/blocked env | not verified as product defect (WebGL/canvas in headless + blocked origins) | Unverified | g-spatial |
| **QA-B18** | P3 | /german-club, /diwan | pure-Latin editorial headings inherit RTL ("DER CLUB — AMV", "Heute im Club") | Latin runs wrapped dir=ltr when punctuation/ordering needs it | **Observation** — visually readable in tested cases, no dir leaks reported by audit | d-spiritual/c-editorial |

### Refuted / not defects
- **"Stuck skeletons" on /reading, /crypto, /podcasts, /podcasts/1, /archive/1, /german-club/shelf, /german-club/grammar**: after 8s with blocked external origins each reaches a real StateView (error/empty) with a retry, or real content; the capture matrix had only waited 650ms. /travel-atlas shows an explicit "الخريطة في وضع مبسّط — بلاطات الخريطة المباشرة لم تصل" fallback. **Not a defect.**
- **/profile + /settings/profile dock 40x40**: measured during the entry animation (scale 0.9); settled control is 44x44 (and now hidden until scroll). **False positive.**
- **Float-overlap on /auth and /german-club/review from a fixed keyboard spacer**: script bug fixed by lead (pointer-events:none excluded) before the authoritative run. **False positive.**
- **Contrast "تم" 1.69 on /auth, /german-club/review**: it was the in-app keyboard Enter key; after the auto-open removal the keyboard is no longer on those pages at rest, so the pair is not part of the rendered baseline. Keyboard key contrast should be checked in the explicit-open state (residual).

## 4. Interactive findings (cross-cutting)

- **Tab order + focus-visible (PASS):** /, /settings/appearance, /mihrab — every stop visible, teal 2px outline present, logical order; only exception QA-B13.
- **Dialogs/drawers:** Radix-based primitive gives focus trap + scroll lock + Escape (verified on trip dialog: `body overflow hidden / pointer-events none` while open, restored on close). Focus **return** fails for state-controlled dialogs (QA-B12).
- **RTL (PASS):** html dir=rtl/lang=ar; no audit dir leaks; German/Latin runs that need it are wrapped `dir=ltr` in the dictionary and card titles; only P3 observation above.
- **Reduced motion (PASS):** OS reduce → `html[data-reduced-motion=true][data-reduced-motion-source=os]`, transition-duration 0.001s; OS none → false/none, 0.12s; in-app "تقليل الحركة" switch flips attr to true/source app and persists across reload in `app-motion-preferences-v1`.
- **Empty/loading/error states:** data routes use StateView (role=status/alert) with specific copy + retry; unauthenticated gates use StateView-ish auth states after shared-layer (journal/profile). G1-G7 grammar holds on the screens read at full size; biggest hierarchy observations were the clipped h1s (fixed) and the loading→error timing (not a defect).

## 5. What automated checks miss (from this baseline)

1. Focus return after overlay close (audit sees nothing; only keyboard tests catch it).
2. Published component state vs rendered state (keyboard close: height 0 / panel visible / attr true / label stale — all mutually inconsistent).
3. Pseudo-element hit areas (Switch 48x48 ::after) — visual box ≠ effective target.
4. Raw i18n keys and raw error strings in user-facing copy.
5. sr-only vs missing headings (both pass/fail the same h1-count check).
6. Mobile viewport + soft-keyboard coverage: a keyboard that auto-opens changes the whole page's measurable state; determinism requires an explicit profile key.
7. Light-mode and data-tinted container contrast — 0 flagged on default 20 routes, but the extended set found real 4.1–4.2:1 badges.
8. Bidi ordering for pure-Latin headings inheriting RTL (no computed-style leak, still a reading-order risk).

## 6. Highest-risk items (Top 5 for the lead)
1. **QA-SL-1 / keyboard close state inconsistency** (P1, F): toggle says "إغلاق" but panel stays visible with height 0 and attr true — an explicit keyboard user cannot reliably dismiss it, and the attribute drives other chrome.
2. **QA-B12 / controlled-overlay focus return** (P1 a11y, A): real dialogs drop focus to body; trigger-based ones pass, so the fix is likely centralising the opener ref/restore.
3. **Light-mode badge contrast + light-mode coverage** (P2, g-spatial/shared tokens): /games 4.14–4.23:1; the full light matrix is still unmeasured.
4. **Strict-gate fidelity** (P2 tooling, lead/scripts): switch pseudo hit areas create 8 false red rows while X9 now relies on allowlist; without fixing measurement the gate can hide real regressions behind allowlist culture.
5. **Mihrab tabpanel focus indicator** (P2 a11y, d-spiritual): focusable region with no visible focus — keyboard users lose position in the central spiritual surface.

## 7. Evidence paths
- Baseline audit JSON: `verification/design/qa/baseline/run-2026-11-18T17-33-04/route-audit.json` (+ `audit-run.log`); recovered summary: `verification/design/qa/baseline/recovered-baseline-summary.md`.
- Contrast: `verification/design/qa/baseline/contrast-2026-11-18T17-37-40/contrast-audit.json`, `.../contrast-extended-2026-11-18T17-40-19/contrast-audit.json`, `.../contrast-recheck/contrast-audit.json`.
- Screenshots: `verification/design/qa/baseline/contact-sheets/` (all 81 baseline shots triaged, 8 per sheet + manifest), `.../spotchecks/`, `.../p0/`, `.../states/`, `.../interactions/`, `.../retest/`, `.../retest2/`.
- Probe data: `states/states-probe.json`, `interactions/interactions.json`, `retest/retest.json`, `retest2/retest2.json`, `spotchecks/spotchecks.json`.
- Recheck/full runs: `verification/design/qa/baseline/recheck-2026-11-18T17-57-52/`, `verification/design/qa/full-after-shared-2026-11-18T18-11-40/`.
- Shared-layer batch report: `verification/reports/qa-shared-layer.md`.

## 8. Not verified / limitations
- 768x1024 and 360x800 not exercised in Mission A (390/1440 only); chess at 360x640 is planned for the freeze pass.
- Real network/auth/data paths are out of scope by contract (external origins blocked to get deterministic fails); states are the app's genuine offline/error behaviour, not mocked.
- 14-theme × 2-mode visual matrix not re-shot (reused the lead's baseline-390, expressive/dark only).
- The workspace was being edited during most measurements; statuses above are timestamped. The freeze pass will be the gate.
