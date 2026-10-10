# Theme identity overhaul — October 10, 2026

## Implemented

The existing central theme engine now consumes independent material recipes; no parallel theme system was introduced. Actual inventory: classical (expressive, editorial, copper, paper, mono, obsidian), earthy (clay, gold, moss, ocean), deep (arctic, midnight, nebula, rose). Each recipe includes companion/tertiary roles, categorical chroma/presence, corner and icon geometry, edge strength, shadows, rim and elevation. Light/dark base colors remain deliberately authored per preset.

OLED sets the application background to zero lightness without flattening card/overlay layers or changing the selected theme. Four accent strengths affect selected/container presence; ordinary text, selected text, input outlines and primary actions receive contrast correction. Theme settings no longer force-migrate a saved choice. Live preview uses the actual AppTile/Button components, current strength/mode/OLED/surface lift and computed contrast measurements, not a blanket accessibility badge.

Shared cards/buttons consume material geometry and depth. Home descriptions wrap; prayer timeline labels/trail are clearer; disclosures use the shared control. Weather chrome, radar canvas, price trends, prayer-time colors and game/training neutral surfaces now consume semantic roles. Decorative portal dust/glow was removed. Gameplay boards, artwork and explicit media viewing contexts retain their own meaningful materials.

## Evidence

- 754 distinct targeted tests passed: theme contracts, data/status/muted contrast, elevation, settings, prayer integrity, button activation and weather engine/motion.
- 168 mobile combinations: 14 presets × four strengths × light/dark/dark OLED; no horizontal overflow or page errors. These exercise generated tokens, not 168 manual settings selections.
- 28 home screenshots (14 × two modes) inspected as contact sheets; focused full-size paper/mono/obsidian views inspected.
- 24 additional route entry states (12 routes × two modes), plus desktop and final home captures with settled weather data. Not exhaustive detail-state coverage.
- Actual settings interactions: all four strengths report selected state, paper theme selection and mode changes work, reload retains theme/strength/mode/OLED; preview navigation opens /quran. Both home qibla and occasions disclosures open/close.
- Lint budget: 734 unchanged. Architecture: cycles 2, orphans 25, cross-feature imports 4; passed. Latest observed automatic build: OK at 16:14:42 UTC.
- Sandbox evidence: /tmp/browser/theme-overhaul/ and final/. Early loading screenshots are not treated as settled data evidence.

## Limits — not a complete product sign-off

The checks do not prove WCAG compliance for every rendered pixel, all translucent media overlays, every chart annotation or every populated detail/modal state. Token tests establish the tested solid foreground/background pairs only. Browser emulation does not establish physical foldable posture, TalkBack/VoiceOver or real touch performance. Full verify chain was not run manually (automatic preview manages builds/type checks); targeted tests and independent gates are reported instead. Remaining legacy local visual palettes require context-specific review rather than indiscriminate replacement. No claim is made that every component in the entire product has been visually signed off.
