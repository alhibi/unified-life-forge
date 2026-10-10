# Color materiality verification — October 10, 2026

## Implemented
- All 14 live families retain independent identities and authored light/dark seeds. Stronger card/canvas separation is controlled perceptually per family, not by a universal saturation multiplier.
- Solid secondary and tertiary materials have family-specific weights; category content remains quieter than icon containers and primary actions. All four accent levels start with intentional colour body.
- OLED preserves the card's authored chroma, rather than capping it at 14% saturation. Canvas is actual black; cards remain themed and elevated.
- Canonical cards, lists, plates and modal surfaces are opaque. Saved solid/soft/airy controls interpolate solid elevation colours instead of leaking whatever is behind the surface. Reduced transparency still selects the solid endpoint.
- Confirmed structural alpha removed in qibla, weather metrics/planner/radar controls, Quran chips, calendar, reading controls, podcasts, profile filters, appearance and motion previews, and group search/filters. Scrims, media interaction layers, disabled states, skeleton animation and domain heatmaps remain intentional exceptions.
- Weather focus outline no longer relies on a shadow alone. Secondary weather text uses contrast-correct roles.

## Verification evidence
- 526 theme/material/elevation/button tests + 25 reader/settings tests passed (551 distinct tests). New material tests exercise all families, all strengths, light/dark/OLED and all surface-lift values, including category and selection inks.
- Expanded tests exposed four previously untested OLED material combinations below 4.5:1. Hue-preserving contrast correction now falls back to the higher-contrast neutral endpoint if the gamut/lightness walk cannot reach the requested ratio; all expanded cases pass.
- Browser: 168 theme/mode/strength/OLED cases, 24 route states, no document overflow or page errors. Generated 28 home and 28 tile captures, inspected light/dark catalogue contact sheets, Paper & Ink details/settings, and desktop views.
- Actual appearance controls: four distinct accent containers, persisted theme/mode/strength/black choices survive reload. OLED selected through UI reports zero-lightness canvas.
- Actual weather: city results selected with Enter; live weather displayed for the first matching Berlin result (US New Jersey, 39.79/-74.93). Light/dark weather captures verified real metrics and chart states, not fabricated data.
- Lint warning budget unchanged at 734. Architecture gate passed. Automatic preview build reported OK after edits.

## Limits — not a blanket sign-off
- Generated token contrast is not certification of every composited media/chart/message pixel. Remaining alpha uses include legacy content-dependent chrome and intentional disabled/media/scrim/domain visual states; these require contextual review, not blind global replacement.
- Physical OLED screens, touch/screen readers, folding posture and device GPU performance were not available. No claim of full WCAG 2.2 AA or complete device-performance verification.
- The full verify chain was not manually invoked because platform automation owns typechecks/builds; targeted tests, lint budget and architecture were run separately. No CI/bundle budget was raised.