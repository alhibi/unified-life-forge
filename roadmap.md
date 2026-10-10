# Roadmap

## Reference-widget continuation — October 10, 2026
- [ ] Inspect remaining detail/overlay tone inheritance and reader density states; repair verified defects without changing content or business rules.
- [ ] Verify affected interactions, theme contrast tests and light/dark mobile and desktop views; record concrete evidence and external-device limits.

## Reference-led widget redesign — October 10, 2026
- [x] Recompose the shared color/material contract with multicolor widgets and calm canvases, retaining all theme choices.
- [x] Rebuild launcher composition, prayer/weather widgets and shared feature cards/statistics around the supplied references.
- [x] Verify 168 computed browser theme/mode/strength/OLED cases, 22 feature route states, live prayer/weather, paper theme persistence and keyboard/counter actions; 716 targeted tests pass, lint budget unchanged, architecture and automatic build pass.
- [ ] Exhaustive account-content and physical-device visual sign-off for every detail/overlay — blocked on representative private content and physical devices; current checks are not full-product accessibility certification.

## Color materiality overhaul — October 10, 2026
- [x] Audit surface dilution and author richer solid material roles for all 14 themes, retaining independent mode/OLED/strength preferences.
- [x] Replace confirmed translucent structural surfaces in shared cards/lists/overlays, weather, qibla, Quran chips, reader, podcasts, profile and appearance controls; preserve purposeful media/scrim behavior.
- [x] Verify 168 theme/mode/strength/OLED browser cases + 24 feature route states, 28 home and 28 tile captures, desktop views, live weather and actual OLED selection; 551 targeted tests pass, lint budget 734 unchanged, architecture and automatic build pass.
- [ ] Exhaustive remaining content-dependent alpha/contrast checks and physical-device performance/accessibility — requires representative account/media/game content and physical devices; do not claim full product AA certification.

## Full theme identity overhaul — October 10, 2026
- [x] Inventory all 14 live themes and implement independent material recipes with central semantic roles.
- [x] Correct OLED, accent presence, preview measurements and saved-choice preservation.
- [x] Repair confirmed home/weather/game/training chrome bypasses; preserve content, interactions and independent gameplay/media materials.
- [x] Verify 168 generated mobile theme/mode/strength/OLED combinations, 28 home captures, 24 route states and saved settings; 754 distinct targeted tests, lint budget and architecture pass, automatic build OK.
- [ ] Exhaustive content-dependent visual/accessibility sign-off across every detail, chart, media overlay and folding posture — requires representative content and physical devices; no blanket all-product compliance claim.

## Harmonized color hierarchy — October 10, 2026
- [x] Rebalance shared surface tones and coordinated primary/secondary/tertiary roles without changing user appearance choices.
- [x] Apply purposeful category color hierarchy to portal tiles and shared controls.
- [x] Verify 442 targeted tests (including solid category on-colors across every preset/mode), lint budget (734 unchanged), architecture and 28 browser captures at 424px/1280px in light/dark; no overflow, mode mismatch or page errors. Inspect portal/category and settings/reader captures; real-device and content-dependent checks remain separate below.

## Mobile accessibility and visual follow-up — October 10, 2026
- [x] Measure touch targets, accessible names, focus and RTL across mobile light/dark entry pages; repair confirmed defects, retaining character-key/game-cell geometry.
- [x] Exercise city suggestions with the custom keyboard and physical-keyboard navigation; verify Enter insertion, physical typing and Tab progression.
- [x] Capture 61 static routes in both modes, review screenshots and recheck signed-in profile/chat/wellness; document content-dependent and physical-device limits.

## Design verification rounds — October 10, 2026
- [x] Inspect 25 entry screens in light/dark at 424px and 1280px (100 repeat captures); no document overflow, undersized text-entry fields or mode mismatches in the repeat sweep.
- [x] Investigate shared controls and feature screens; repair primary contrast, input sizing, reader controls/labels, chat close labels and clipped weather suggestions without budget increases.
- [x] Recheck reader search/preferences and city autocomplete; 556 distinct targeted tests pass. Record remaining touch-target, authenticated, keyboard, offline and real-device limitations in `docs/audit/2026-10-10-expressive-design-verification.md`. Full-suite attempt timed out; not a passing full-suite result.

## Expressive tactile redesign — October 10, 2026
- [x] Replace copper default with a contrasted, multi-role expressive palette in both modes and migrate the old default.
- [x] Rebuild shared typography, geometry, surfaces, controls, headers and overlays with tactile tonal depth.
- [x] Apply shared treatment across applications, including portal, weather, game shells and wellness encyclopedia category colours. Preserve reader paper modes, media artwork and gameplay materials.
- [x] Verify theme contracts and 1923 passing tests; inspect 25 public/account screens in light mode and 25 initial screens plus 9 explicitly selected dark-mode screens. No horizontal overflow or runtime errors observed.
- [ ] Physical-device validation of touch, screen-reader and all content-dependent detail states — requires real device and representative content.

- [x] Stop repeated unread/message-list requests while chat is open.
- [x] Restore the missing public-key directory used by encrypted chat.
- [x] Prevent file drops from navigating away from the app.
- [x] Make voice pointer lifecycle deterministic and clean delayed timers.
- [x] Serialize generic file uploads to avoid mobile memory/network spikes.
- [x] Validate the repaired chat in the signed-in preview without sending private test content to a real contact.

## Weather redesign

- [x] Build the selected Atmospheric Scene dashboard with real weather data.
- [x] Refine hourly, daily, metrics, navigation, loading, and responsive states.
- [x] Verify the weather page on mobile and desktop.
- [x] Rebuild weather as the selected premium radar-cinematic magazine interface.
- [x] Separate every main tab into focused, non-duplicated content.
- [x] Verify type safety, weather tests, and horizontal layout constraints.
- [ ] Validate live-data visuals on a physical Android device.

## UX/UI program (P0 → P3)

### P0 — foundations
- [x] Fix the icon-library switch failing to load (Tabler/Lucide dynamic import).
- [x] Route guards: PublicRoute / AuthenticatedRoute / AdminRoute / DevelopmentRoute.
- [x] Protect `/german-club/review` (admin) and `/dev/material-preview` (dev only).
- [x] Back button climbs to the parent path on deep-link entry instead of jumping home.
- [ ] Full route audit table (auth, network, persisted state, loading/error/empty/offline, back behaviour).
- [ ] Deep-link contract per route (entry, parent, fallback, restore).
- [x] Unified state system via StateView: PKM notes (empty vs filtered), Archive home (empty vs no-match), Marginalia pinboard and sources.
- [ ] Mobile touch targets ≥44px audit and fixes.
- [x] Portal "متابعة" row: recents surfaced above the grid, hidden for new users.
- [x] Portal hierarchy: compact Today block — occasions strip merged into prayer card behind a disclosure (collapsed by default, like qibla), weather hourly rail sm+-only, reserves tightened to measured heights (15.5rem / 8.5→16.5rem).
- [ ] Chat stability pass on a real Android device.

### Editorial design system (new default)
- [x] Foundation: `editorial` palette (warm off-white / warm graphite, graphite controls), Inter Tight + IBM Plex Sans Arabic, corner ladder 6·8·12·16·20, two-layer ambient+contact shadows, `--signal` orange for data/change only, `--track` divider token, `type-title/section/body/label/meta` roles, `rule-x/rule-y`.
- [x] Portal: retired per-app colored glows/gradients (tiles, motifs, filter rail, continue chips, realm section headers are neutral-tonal; icon + unread badge carry the only colour).
- [x] Bottom nav: n/a — the app has no bottom bar (Portal + floating home button).
- [x] Cards & lists foundation: borderless tonal surfaces, layered ambient/contact depth, track-only dividers, compact typography roles.
- [x] Controls foundation: 38–46px heights, circular icon actions, inset highlight + soft elevation, pressed depth reduction.
- [x] Inputs & controls: quiet tonal surfaces with hairline inset, accent focus ring (input/tabs/switch/slider).
- [x] Palette sweep: 118 files moved off hardcoded Tailwind/hex colours onto --data-1..6 / signal / track tokens (german-club, games, time-ledger, profile, wellness, calendar).
- [ ] Charts & heatmaps: thin strokes, track grid, signal accent only.
- [ ] Per-app sweep across all 20 apps + empty/loading/error/sheet/modal states.

## P1 — experience rebuild
- [ ] Portal recomposition and Continue section.
- [ ] Design tokens enforcement (raw hex, radius, durations, raw buttons).
- [ ] Typography roles (UI Arabic / Editorial Arabic / Latin UI / Mono).
- [ ] Settings IA with an Advanced tier and value validation.
- [ ] Wellness (hub) vs Fitness (execution) separation.
- [ ] Reading header simplification and scroll/state restore.
- [ ] Reading reliability rebuild informed by ReadYou and Capy Reader: local-first article cache, deterministic refresh queue, source identity, pagination, feed discovery, and end-to-end failure states.
  - [x] Account-isolated IndexedDB article cache with richer-content preservation and reconciliation.
  - [x] Bounded article-image caching integrated into the app-wide offline worker without route conflicts.
  - [x] Central article/refresh API contracts with Zod validation and no direct reader-hook data calls.
  - [x] Persist client-fetched and newly stored source articles into the local cache.
  - [x] Deterministic refresh queue with per-source backoff and cancellation.
  - [x] Apply username-availability database function.
  - [x] Cursor pagination beyond the initial 300 articles.
  - [ ] Multi-stage feed discovery and typed per-source failure reporting.
- [ ] Reading parity pass: folders/tags, per-feed retention and refresh controls, mark-read gestures, OPML fidelity, article extraction, image handling, and offline verification.
- [ ] Weather progressive disclosure and a useful no-location state.
- [ ] Podcast player moved into the app shell.

### P2 — system unification
- [ ] Games first-run guidance instead of zeroed stats.
- [ ] German Club: make Wortliste discoverable.
- [ ] Knowledge / PKM / Archive / Marginalia taxonomy.
- [ ] Crypto taxonomy review.
- [ ] Remaining spiritual apps de-duplicated (Quran/Dhikr/Sunnah vs Mihrab).

### P3 — polish
- [ ] Motion tokens enforced by a static check.
- [ ] Desktop composition (content + contextual rail).
- [ ] Accessibility sweep (TalkBack Arabic, focus order, RTL keys).
- [ ] Performance budgets and real-device measurement.
