# Expressive design verification — October 10, 2026

## Verdict

The shared expressive identity renders consistently across the inspected light/dark entry screens. It is **not yet a complete accessibility or design sign-off**: small feature-specific targets, content-dependent detail views and physical-device testing remain.

## Rounds and evidence

1. Independent read-only reviews of theme generation, primitives and feature screens.
2. Initial browser sweep: 25 routes at 424×758 and 1280×1800 (50 captures).
3. Explicit mode selection and repeat sweep: 25 routes × 2 widths × 2 modes (100 captures). Zero document horizontal overflows, zero visible text-entry fields below 16px, zero incorrect mode classes. Browser run recorded no page errors. These are entry-state checks, not exhaustive interaction coverage; some screenshots include loading states.
4. Focused interactions: reader preferences, reader search, city autocomplete and settled portal. City search returned 10 options; reader search computed at 16px. The final city result panel has no overflow-hidden ancestor. The longest reader sort label fits its button (83px client and scroll width, 58px height).

Browser evidence: `/tmp/browser/design-audit/` (sandbox-only). Results: `results.jsonl`, `recheck.jsonl`, `final-visual.log`; final screenshots include `weather-search-fixed.png`, `reading-popover-fixed.png`, `portal-settled.png`.

## Verified corrections

- Text-entry controls have a global 16px floor without suppressing larger typography preferences. Range/checkbox/radio/color/hidden controls are excluded.
- Primary text now clears 4.5:1 on page and card surfaces. Regression assertions cover every preset, all four accent strengths, three surface lifts and light/dark/black modes. Preview swatches use the same contrast correction.
- Section headings consume the shared title size instead of an independent hardcoded size; retained the intended expressive heading hierarchy.
- Prayer captions no longer weaken primary text with 70%/75% opacity.
- Chat information/wallpaper/forwarding close actions use labelled shared icon controls. Forwarding search has an accessible name and sufficient container height.
- Reader header actions and filter chips use shared controls and touch sizing. Preferences switches have explicit labels; long sort text wraps instead of truncating.
- City combobox has an explicit accessible name. Weather shell no longer clips the suggestion panel.

## Test results

- 556 distinct targeted tests passed across seven files: theme integrity (394), muted contrast (112), data contrast (5), status wash contrast (28), button activation (1), reader UI safety (10), reader utilities (6).
- Lint budget passed: 734 warnings within the existing budget; no budget increased.
- Architecture gate passed.
- Latest observed automatic preview build: `build OK` at 14:56:31 UTC.
- Full suite was attempted but terminated by the command time limit. It did not produce a completed suite result; do not describe it as passing.

## Remaining findings and verification limits

- Feature-specific target-size candidates remain in podcasts, fitness, PKM, travel tabs, dhikr presets and reader folder actions. The sweep counts visual rectangles, not expanded pseudo-element hit areas; switch tracks and hidden folder-delete affordances must not automatically be classified as failures. Several ordinary compact buttons do remain below 44px. A full touch-target pass is still required.
- Low-opacity primary text elsewhere is not guaranteed by the new solid-primary contrast contract; rendered text contrast over mixed/photo/chart backgrounds still needs per-state checks.
- The current preview is signed out. Session minting for the requesting user failed because no matching account exists. Profile redirected to authentication; private chat sheets were inspected in source, not end-to-end with an authenticated conversation. Sign in in the preview to enable that verification.
- No service-worker registration/controller was present on localhost. Production worker coexistence and offline behavior were not verified by this browser run.
- Real Android/iOS touch, keyboard occlusion, TalkBack/VoiceOver, full content-dependent detail states and larger user typography settings remain unverified. City suggestions are no longer container-clipped, but the custom keyboard still occupies the lower viewport; full keyboard-aware result placement needs a separate focused check.

No backend changes, architecture restructuring or budget increases were made.