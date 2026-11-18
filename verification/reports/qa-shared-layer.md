# QA — shared-layer verification (independent)

- **Task:** task-8 · Agent H (independent QA)
- **When:** 2026-11-18 19:06–19:13 +01:00
- **Repo:** /Users/amer/ulf-design · branch `next-phase/visual-execution` · worktree dirty (integration in progress)
- **Environment:** Vite dev server http://127.0.0.1:5199 (shared) · Chromium via @playwright/test · profile dark/expressive/tonal/cozy/standard, locale ar, reduced motion, external origins blocked
- **Caveat:** other agents were still editing feature pages until ~19:20. Anything caused by an in-flight compile error is labelled in-flight, not counted as a shared-layer defect. Commit/branch untouched; no feature code edited.

## 1. Scope and commands

Routes requested by lead: `/auth`, `/profile`, `/journal`, `/settings/theme`, `/settings/font`, `/games/memory`, `/games/sudoku`, `/german-club/grammar`, `/podcasts/1`, `/travel-atlas/place/1`.

```bash
# Strict browser gate, 10 routes x 390x844 + 1440x900 = 20 checks
node scripts/audit-routes.mjs --routes /auth,/profile,/journal,/settings/theme,/settings/font,/games/memory,/games/sudoku,/german-club/grammar,/podcasts/1,/travel-atlas/place/1 \
  --json-out verification/design/qa/shared-layer-2026-11-18T18-05-54/route-audit.json --workers 2 --no-shots
# -> 20 checks, 1 failed (small-targets: /games/sudoku only)

# Interactive: login keyboard/CTA, dock reveal, focus return, keyboard toggle
node verification/design/qa/tools/probe-shared-layer.mjs
node verification/design/qa/tools/probe-kb-auth.mjs
node verification/design/qa/tools/probe-kb-close.mjs
```

Evidence: `verification/design/qa/shared-layer-2026-11-18T18-05-54/`, `verification/design/qa/shared-layer/interactions/` (+ JSON dumps in the same folders).

## 2. Strict gate — PASS/FAIL

| # | Route | 390x844 | 1440x900 | Notes |
|---|---|---|---|---|
| 1 | /auth | PASS | PASS | 1 h1, no small targets, no clipped/overlap; keyboard does not auto-open |
| 2 | /profile | PASS | PASS | AuthGuard fallback page, 1 h1, StateView status |
| 3 | /journal | PASS | PASS | Gate StateView + CTA, 1 h1 |
| 4 | /settings/theme | PASS | PASS | redirects to /settings/appearance, 1 h1 |
| 5 | /settings/font | PASS | PASS | redirects to /settings/appearance, 1 h1 |
| 6 | /games/memory | PASS | PASS | h1 "أزواج الذاكرة" no longer clipped |
| 7 | /games/sudoku | **FAIL small-targets:81** | PASS | board cells 42x42 < 44 (77 rows? X9); see ticket QA-SL-2 |
| 8 | /german-club/grammar | PASS | PASS | h1 "زاوية القواعد" 292/292 no clip, 28px tall (1 line) |
| 9 | /podcasts/1 | PASS | PASS | one h1 (duplicate h1 fixed), error StateView alert present |
| 10 | /travel-atlas/place/1 | PASS | PASS | h1 exists visually hidden 1x1 (sr-only) "مكان في أطلس الرحلات" |

No overflow, no dir leaks, no page/console errors in these 20 checks. **The only red row is the documented X9 board-cell exception**, which is not present in `scripts/audit-allowlist.json` (file is `{"entries": []}`), so the strict gate cannot go green even though DESIGN.md §11 / visual-exceptions X9 allow sudoku/chess grids to be <44px.

## 3. Interactive verification

### 3.1 Login sheet — no auto keyboard (PASS)
390x844: `/auth` mounts with keyboard **closed** (`data-soft-keyboard-open` absent, `--soft-keyboard-height` empty). One h1 "تسجيل الدخول"; username 296–342, password 420–466, submit "دخول" 486–538 — all inside the 844px viewport. Submit is `disabled` at start and becomes enabled after filling username+password (verified); focus is in the username field; no dialog; dock hidden on the auth surface.
1440x900: same, no keyboard, fields/submit visible. Screenshot: `shared-layer/interactions/_auth-390.png`, `auth-1440.png`.
The old P0 (auto keyboard covering password/submit) is **fixed by the explicit-opt-in policy**; the page itself documents it: "لا تفتح تلقائياً عند لمس حقل؛ تُفتح من زر اللوحة".

### 3.2 AuthGuard fallback pages (PASS)
- `/profile`: stays on `/profile`, h1 "الملف الشخصي", StateView(status) "سجّل الدخول إلى ملفك الشخصي" + CTA "تسجيل الدخول" 48px tall, no inputs, no keyboard.
- `/journal`: h1 "مذكرتي", StateView(status) "سجّل الدخول إلى مذكرتك" + CTA "تسجيل الدخول", no keyboard.

### 3.3 Redirects (PASS)
`/settings/theme` and `/settings/font` both resolve to `/settings/appearance` with exactly one h1 "المظهر".

### 3.4 Heading work (PASS)
- `/games/memory`, `/games/sudoku`: h1 210x28, `scrollWidth == clientWidth` (no truncation), line-clamp 2 available.
- `/german-club/grammar`: h1 292x28, no truncation; title shortened to "زاوية القواعد" (subtitle carries GRAMMATIK — DER CLUB).
- `/podcasts/1`: exactly 1 h1 now (the loading-skeleton h1 duplicate found in the baseline is gone).
- `/travel-atlas/place/1`: h1 exists but is a visually-hidden 1x1 (sr-only) semantic title. Passes DESIGN §8 ("h1 مخفي بصرياً عند غياب عنوان مرئي").

### 3.5 Dock (PASS)
Measured on `/journal` and `/settings/appearance`: first view → no `.portal-dock` element, `html[data-portal-dock="hidden"]`; after scrolling 900px → dock appears, exactly 44x44 at bottom-start (x=319, y=784 in RTL), `data-portal-dock="visible"`. Immersive routes `/games/memory`, `/chat`, `/travel-atlas`: hidden even after scroll (expected). Screenshots `shared-layer/interactions/dock-*.png`.

### 3.6 In-app keyboard toggle — open PASS / close **FAIL**
On `/settings/keyboard`:
1. Click "فتح لوحة المفاتيح للتجربة" → PASS: `data-soft-keyboard-open="true"`, `--soft-keyboard-height: 424px`, panel visible with keys and suggestions; toggle label flips to "إغلاق لوحة المفاتيح".
2. Click "إغلاق لوحة المفاتيح" → **FAIL**: after 1.7s the keyboard panel is still fully visible (see `keyboard-after-close.png`), `--soft-keyboard-height` is "0px" while the panel is on screen, `data-soft-keyboard-open` stays "true", and the toggle still reads "إغلاق لوحة المفاتيح". State, published height and rendered panel disagree.

Repro: open /settings/keyboard @390, click the keyboard-icon "فتح لوحة المفاتيح للتجربة", click the same control now labelled "إغلاق لوحة المفاتيح", wait 2s → panel remains.

### 3.7 Dialog / drawer focus return — PARTIAL
- Gallery dialog (uses `DialogTrigger asChild`, /dev/design-system): open via "افتح حواراً" → Escape → focus returns to the trigger. **PASS**.
- Real controlled dialogs (no DialogTrigger): `/travel-atlas/trips` "رحلة جديدة" → Escape closes and unlocks scroll (body overflow restored) but focus lands on `BODY`, not the "رحلة جديدة" trigger. Same failure earlier on `/german-club/dictionary` word dialog. **FAIL** — see ticket QA-SL-3.
- Drawer focus return on a real surface: not exercised (no reachable unauthenticated drawer); the primitive unit spec `overlayFocusReturn.test.tsx` covers trigger-based ResponsiveDrawer only. Marked Not verified, not failed.

## 4. Tickets

| id | severity | route/selector | repro | expected | owner |
|---|---|---|---|---|---|
| QA-SL-1 | P1 | /settings/keyboard · button[aria-label="إغلاق لوحة المفاتيح"] (SoftKeyboardToggle) | open toggle, click close, wait 2s | panel unmounts, height 0, attr removed, label back to "فتح…" | F (keyboard) |
| QA-SL-2 | P1 (gate) | /games/sudoku (81 cells 42px); /games/chess/puzzles (64 cells 41px, earlier run) | strict audit at 390 | documented X9 exception must be an allowlist entry with selector/reason/owner/doc ref, so the gate can pass legitimately | a-systems (allowlist) + g-spatial (selectors) |
| QA-SL-3 | P1 | /travel-atlas/trips · "رحلة جديدة"; /german-club/dictionary word dialog | open, Escape | focus returns to opener (DESIGN §10 C); currently BODY | a-systems (Dialog contract) |
| QA-SL-4 | P2 | dock vs keyboard-hide rule | — | no non-immersive surface currently hosts a SoftKeyboardToggle, so "dock hides while keyboard open" cannot be observed end-to-end; add a toggle next to one real field (or remove the rule claim) | F/a-systems |
| QA-SL-5 | P3 observation | /auth, /chat, dictionary search | — | in-app keyboard is now only reachable from /settings/keyboard; confirm this is the intended product scope | F/lead |

## 5. What automated checks miss (seen in this batch)
- Focus return after a controlled overlay closes (audit cannot see focus).
- Published keyboard state vs rendered keyboard vs ARIA labels (height 0 / attr true / panel visible).
- Whether an h1 is *visually* hidden on purpose (sr-only) vs missing.
- A gate that can never go green because a documented exception has no allowlist entry.
- Loading skeletons vs stuck error states (the earlier baseline "stuck skeleton" suspicion was refuted: most data routes reach a real error StateView in ~1–3s; the capture matrix just shot them at 650ms).

## 6. Not verified / limitations
- Full 82-route strict audit was re-run after the shared layer; see §7. Feature pages were still being edited (118 dirty files when the run started), so transient compile errors are in-flight, not defects.
- 768x1024 viewport not exercised in this batch.
- Real login/signup network path not exercised (external origins blocked by design).
- Keyboard close root cause not diagnosed (UI evidence only).


---

## 7. Full 82-route strict run after the shared layer (19:11:40, in-flight edits)

Command: `node scripts/audit-routes.mjs --json-out verification/design/qa/full-after-shared-2026-11-18T18-11-40/route-audit.json --workers 3 --no-shots`
Result: **164 checks · 11 failed** (`small-targets 10 · error-boundary 1 · h1-count 1`). Classification of all 11:

| Class | Rows | Detail |
|---|---|---|
| Tooling false positive (switch hit area) | 8 routes @390 | `button.peer.relative.inline-flex` 44x28 visual box on /settings/appearance(2), /settings/font(2), /settings/interface(5), /settings/keyboard(3), /settings/motion(4), /settings/prayer(1), /settings/theme(2), /dev/design-system(1). **Verified not a real touch defect:** the shared Switch renders a 48x48 `::after` hit area (`--ui-touch-min`); a click 8px above the 28px track toggles the control (synthetic click test, state unchecked→checked). The audit measures the visual rect only. See ticket QA-SL-6. |
| Documented X9 exception | /games/sudoku 81 cells 41px; /games/chess/puzzles 64 cells 42px | **Resolved + verified:** `scripts/audit-allowlist.json` now contains `X9-sudoku-board-cells` (selector `button[data-touch-exempt="board-cell"]`, owner g-spatial, doc ref); rerun of both routes = 4/4 checks green, no stale allowlist entries. QA-SL-2 closed. |
| In-flight feature edit | /marginalia @390 | error boundary + h1 0, console `ReferenceError: AppCard is not defined` (Marginalia.tsx:176). Re-probe ~10 min later: page renders h1 "الهوامش" with no error → in-flight while c-editorial edited, not a shared-layer defect. |

No other routes failed: overflow, direction leaks, clipped headings, floating overlaps and page errors are zero across the remaining 154 checks in this run. Note the workspace was still churning during this run (118 dirty files, compile errors seen earlier on /section/timed-sunnah and /settings/motion), so this is a status snapshot, not the freeze gate.

### Ticket status (updated 19:22)
- **QA-SL-1** keyboard toggle close state — open, dispatched to F. Repro/evidence unchanged (`shared-layer/interactions/keyboard-after-close.png`, height var 0px + attr true + panel visible + label stale).
- **QA-SL-2** X9 allowlist — **closed**, independently verified green.
- **QA-SL-3** controlled-overlay focus return — open, dispatched to A. Trigger-based Dialog/Sheet/ResponsiveDrawer pass; state-controlled dialogs (trip dialog, dictionary modal) drop focus to BODY.
- **QA-SL-4/5** — accepted as observations by lead, no code change.
- **QA-SL-6** (new, P2 tooling) — audit small-target check compares the visual bounding box; controls whose hit area comes from a ≥44px pseudo-element (shared Switch, 48x48) are false positives on 8 routes. Options: measure the `::after` hit area, or allowlist `button[role="switch"]` globally with the same doc/reason pattern. Owner: lead/scripts, shared with a-systems.

## 8. Mission-A tickets re-checked on the current tree (before freeze)

Checks run at ~19:20 against the live tree:

| Ticket from baseline | Status now | Evidence |
|---|---|---|
| P0 keyboard auto-open covers /auth password+submit | **Fixed** (no auto-open; /auth fields+CTA fully visible at 390 and 1440; submit disabled→enabled after fill) | `shared-layer/interactions/_auth-390.png`, `auth-filled.png` |
| Floating portal dock covers rows/actions (16 rows) | **Fixed** (hidden on first view; 44x44 after scroll; hidden on immersive routes; 0 float-overlap findings in full run) | `dock-*.png` |
| H1 clipped (crypto, memory, sudoku, grammar) | **Fixed** (scrollWidth==clientWidth: crypto 292/292, memory 210/210, sudoku 210/210, grammar 292/292) | spot-check JSON `verification/design/qa/baseline/spotchecks/spotchecks.json` |
| Raw i18n key `auth.signIn` on /chat/groups + /chat/g/:id | **Fixed** (no key text; Arabic CTAs) | probe-status JSON |
| /archive/1 exposes raw "TypeError: Failed to fetch" | **Fixed** (no raw error text; normal reader shell) | probe-status JSON |
| /mihrab/prayer-guide 87x19 standalone link | **Fixed** (link now 155x48) | probe-status JSON |
| /podcasts/1 duplicate h1 | **Fixed** (exactly 1 h1) | shared-layer interactions JSON |
| /travel-atlas/place/1 missing h1 | **Fixed** (sr-only h1 present) | shared-layer interactions JSON |
| Mihrab tabpanel has no visible focus ring (`tabindex=0`, outline none) | **Still open** P2 | probe-status JSON |
| /time-ledger StateView h3 empty | Not re-verified in this pass | earlier states probe |
| /games@390 clipped "أزواج الذاكرة" row (seen in 18:57 recheck) | Not reproduced in 19:11 full run (games green) | full-after-shared JSON |
| Contrast: /games light badges "بلا رتبة" 4.14 / "مشاركة" 4.23 | Unchanged / to confirm in final matrix | `baseline/contrast-recheck/` |

## 9. Standing by for freeze
Final pass (planned once lead signals FREEZE): full 82-route strict audit 390+1440, contrast full matrix (dark+light, all routes + high-risk additions), interaction spot-checks (login sheet, journal gate, portal first viewport, crypto/weather empty states, travel-atlas fallback, chess @360x640), then `verification/reports/qa-final.md`. Nothing in §7/§8 should be re-used as the freeze result.
