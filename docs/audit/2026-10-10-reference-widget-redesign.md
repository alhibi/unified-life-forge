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