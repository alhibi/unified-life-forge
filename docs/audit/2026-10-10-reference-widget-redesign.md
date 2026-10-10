# Reference-led widget redesign

## Reference anatomy
Uploaded references use calm canvases, independently coloured solid widgets, varied footprints, clear typography and real metrics. The implementation uses the references as compositional direction, not copied artwork, identities or invented measurements.

## Implemented
- Central theme-derived six-tone widget material families with contrast-corrected body and secondary ink and authored interaction states; Mono remains neutral and OLED retains a true-black canvas.
- Asymmetric launcher grid, sculpted icon wells, prayer current/next surfaces and weather metric composition.
- Shared optional card tone and statistics treatment used in Quran, dhikr, sunnah, games, fitness, calendar, knowledge, reading and crypto detail metrics. Existing reader densities, settings, forms, gameplay and media are preserved.
- Launcher shortcuts now have explicit 44px targets and the correct ink during hover.

## Defects corrected during review
- Secondary ink and muted surface roles formerly inherited incompatible global tokens in coloured widgets.
- Press/hover states lost widget identity or did not visibly change.
- Weather text facts needed wrapping and more room on narrow screens.
- Ring/input/divider roles needed local contrast-safe widget ink.

## Verification and limits
- 716 targeted tests across 12 files passed, including full theme catalogue, mode/OLED/strength/lift combinations and widget body/secondary/state contrast.
- Lint budget remains 734; architecture gate passed; automatic preview build passed.
- Browser measured 168 theme/mode/strength/OLED computed states and captured 22 entry-page states across light/dark at 424px; no horizontal document overflow or page errors observed.
- Inspected real prayer/weather on desktop and phone using Berlin as a verification location, not a new user default. Inspected persisted paper/light mode and keyboard opening Quran; dhikr target selection updates its pressed state.
- Screenshots cover representative pages and six sampled theme families, not every theme/state/content combination. Authenticated private content, every chart/detail/media overlay, physical-device performance and screen readers remain unverified. No blanket WCAG certification or claim of exact reference reproduction.

## Continuation review
- Reader source badges formerly used hardcoded translucent HSL colours outside the theme contract. Badges and coloured article cards now use the same deterministic, null-safe source material; neutral Mono and mode-specific ink remain theme-owned.
- Compact rows no longer fade all content after reading, and comfortable titles/excerpts retain contrast-safe semantic ink. Bookmark actions are visible, separate from content and measured at 48×48px, rather than a hidden 28px overlay covering article text.
- Reader rows use shared buttons with release activation so pointerdown cannot open an article before a swipe; four new action regression tests pass. Card entry uses the shared motion token rather than per-row hardcoded stagger.
- Weather high/low facts wrap in inherited RTL; only numeric fragments are isolated LTR. Metric values and units use independent bidi boundaries, and the hourly progression starts at the Arabic leading edge.
- Verified the live `/reading` page, then a browser-local article fixture in all three densities × light/dark × 424/1280px. All 12 keyboard opens and four independent bookmark actions worked without page errors or horizontal document overflow; compact action heights measured 44px. Fixtures never write account content.
- Inspected live weather at 424/1280px in light/dark with Berlin as the verification location; all four captures were free of document overflow, and Enter opened `/weather` without page errors.
- 739 targeted tests across 16 files passed; lint budget passed with 734 warnings, architecture passed and the latest automatic build was OK. The first combined quality command exceeded its timeout after tests; the lint/architecture gates were rerun to completion. This is not a full `verify` run.
- Rejected unmeasured suggestions to fade widget metadata, change crypto numerals to system locale or weaken chart ink: they conflict with proven contrast targets and the required global digit convention.
- Remaining exhaustive private-content overlays, physical-device performance and screen-reader checks require representative account content and real devices. They remain open rather than being reported as completed.