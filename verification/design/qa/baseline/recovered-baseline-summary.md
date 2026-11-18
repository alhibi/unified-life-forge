# Recovered strict-audit baseline summary (read 2026-11-18T18:27+01:00)

Source: verification/design/route-audit.json at 18:27 (mtime 17:23:01Z). That file was
overwritten by another agent's subset audit at 18:29; this summary is the evidence retained
from an independent read before the overwrite. An independent re-run is in progress under
run-<timestamp>/; that run is the authoritative QA baseline.

Rows: 164 (82 routes x 390x844,1440x900) — failed rows: 36.
Failed by check: small-targets 10, float-overlap 20, clipped-headings 5, h1-count 6.
No overflow, no dir-leaks, no status failures, no page errors in that snapshot.

## Failed rows (route => viewport:checks)
- /auth => 390x844:small-targets:55,float-overlap:3 | 1440x900:float-overlap:3
- /crypto => 390x844:clipped-headings:1
- /crypto/ => 390x844:clipped-headings:1
- /dev/design-system => 390x844:float-overlap:1
- /diwan => 390x844:small-targets:1,float-overlap:1
- /dhikr => 390x844:small-targets:1,float-overlap:1
- /diwan/library => 390x844:float-overlap:1
- /diwan/library/poets => 390x844:float-overlap:1
- /games => 390x844:float-overlap:1
- /games/memory/adventure => 390x844:small-targets:1
- /games/chess/puzzles => 390x844:small-targets:64
- /games/memory => 390x844:clipped-headings:1
- /games/sudoku => 390x844:small-targets:81,clipped-headings:1
- /german-club/dictionary => 390x844:float-overlap:1
- /german-club/grammar => 390x844:clipped-headings:1
- /german-club/review => 390x844:small-targets:50,float-overlap:3
- /knowledge => 390x844:float-overlap:1
- /mihrab => 390x844:float-overlap:1
- /mihrab/prayer-guide => 390x844:small-targets:1
- /podcasts => 390x844:small-targets:1
- /podcasts/1 => 390x844:h1-count:2 | 1440x900:h1-count:2
- /reading => 390x844:float-overlap:1
- /settings/appearance => 390x844:float-overlap:1
- /settings/font => 390x844:float-overlap:1
- /settings/motion => 390x844:float-overlap:1
- /settings/prayer => 390x844:float-overlap:1
- /settings/profile => 390x844:small-targets:1
- /settings/theme => 390x844:float-overlap:1
- /tafsir => 390x844:float-overlap:1
- /dev/material-preview => 390x844:h1-count:0 | 1440x900:h1-count:0
- /travel-atlas/place/1 => 390x844:h1-count:0 | 1440x900:h1-count:0

Note: /settings/font and /settings/theme are redirect aliases (no page of their own); their
float-overlap rows reuse the destination page and were reported under the alias route.

Observed sample details in that read (games family):
- /games/sudoku 390: h1 "سودوكو" clipped scrollWidth 70 / clientWidth 25; 81 board buttons 38x38.
- /games/chess/puzzles 390: 64 board buttons 41x41.
- /games/memory 390: h1 "أزواج الذاكرة" clipped 109/54.
- /games 390: fixed bottom button (button.fixed.right-4.z-float) overlaps button.app-row "…أنماط في أزواج الذاكرة…" by 1936px^2.
- /settings/motion 390: same fixed button overlaps segmented control "حريري" by 558px^2.
