# Gate 0 — Baseline evidence (before any UI edit)

- Date: 2026-11-18
- Worktree: /Users/amer/ulf-design
- Base revision: 22fa7b2c (design-refoundation), execution branch next-phase/visual-execution
- Runner: Bun 1.4.0, Node 26.13.1, Chromium via Playwright, Vite 8.2.0, Tailwind 4.3.3

## Commands actually run

| Command | Result |
|---|---|
| bun run verify (typecheck + lint + lint:budget + arch + test + build) | exit 0 — chain completed, build 1.83s |
| bun run e2e (build + vite preview, chromium desktop + Pixel 7) | exit 0 — 126 passed, 0 failed, 54.4s |
| node scripts/audit-routes.mjs --workers 5 (82 routes x 390/1440, strict v2) | exit 1 — 164 checks, 36 failed |
| AUDIT_BASE=http://127.0.0.1:5199 node scripts/check-contrast.mjs (20 routes x dark/light) | exit 0 — 0 flagged pairs |
| node scripts/capture-matrix.mjs --routes all --viewports 390x844,1440x900 | 164 captures (full page + viewport), 0 failures after resilience patch |

## Strict audit baseline failures (before edits)

| Check | Failed rows |
|---|---|
| small-targets | 10 routes: /auth 55, /games/chess/puzzles 64, /games/sudoku 81, /german-club/review 50, /diwan 1, /dhikr 1, /games/memory/adventure 1, /mihrab/prayer-guide 1, /podcasts 1, /settings/profile 1 — total 256 below 44px |
| float-overlap | 22 rows (18 mobile, 2 desktop); mostly the global floating return dock (button.fixed.right-4.z-float, 40px) over controls; 2 were pointer-events:none keyboard spacers (false positives, fixed in audit) |
| clipped-headings | 5: /crypto + /crypto/ "قائمة العملات" 93/126px; /games/memory 54/109; /games/sudoku 25/70; /german-club/grammar 194/312 |
| h1-count | /podcasts/1 has 2; /travel-atlas/place/1 has 0; /dev/material-preview has 0 |
| dir-leaks / page-errors / console-errors | 0 / 0 / 0 |

Note: audit output was later overwritten by a concurrent subset run; the preserved 164-row snapshot lives at verification/reports/route-audit-baseline.json (also verification/design/qa/baseline/route-audit-snapshot-182936.json). The audit script now supports --json-out.

## Screenshot matrix

- verification/design/phase2-before/390x844/expressive-dark (82 viewport + 82 full-page)
- verification/design/phase2-before/1440x900/expressive-dark (82 viewport + 82 full-page)
- Deterministic profile: dark/expressive/tonal/cozy/standard/reduced-motion; external data origins blocked, Google Fonts allowed; ar locale, Asia/Riyadh.
- 4 capture warnings: /german-club/dictionary full-page screenshot refused by Chromium (extreme virtualised height, now handled per-route), /dev/material-preview missing h1 (real defect, owner E).

## Baseline visual review (lead, full-page inspection)

Systemic findings recorded before implementation:
1. Global floating return dock (40px) overlaps controls on 18 mobile routes; also duplicate of the in-header back affordance and below the 44px floor.
2. Empty/gated states are ad-hoc: huge dashed-border cards centred in a void with no page identity (/archive, /journal, /marginalia, /pkm, /occasions, /time-ledger, /wellness, /chat, /bayan).
3. /auth and /profile auto-open the in-app Arabic keyboard over the login sheet, hiding the password field and CTA (P0).
4. Header titles clip under flex constraints (/crypto, /games/sudoku, /games/memory, /german-club/grammar); /podcasts detail has two h1s, travel place has none.
5. /settings/interface exposes 13,968px of developer controls including a raw CSS token inspector and JSON import/export inside user settings; /settings/appearance ~9,500px; /settings/prayer 5,322px of flat radio lists.
6. Data dashboards are not recomposed: /weather empty state is a huge card + void; /crypto empty state is 4 skeleton rows + void; /fitness mixes loud non-semantic colour blocks; /wellness gated state is a lone card.
7. /travel-atlas and /travel-atlas/explore map surfaces are an undifferentiated grey void offline with floating controls and no designed fallback state; bottom instruction pill clipped by the dock.
8. /quran duplicates the mihrab Quran tab instead of being a reading entry surface (no surah index); /mihrab top composition has excessive dead space and competing masthead elements.
9. /games/sudoku board area is a huge empty placeholder with a scattered control row; number strip targets are 38px.
10. Catalog-documented violations still present: GroupComposer raw textarea/no loading spinner; ArchiveNew raw select/manual pill/raw font size; TripsPage manual page-shell/old empty-state classes/no submit spinner.
