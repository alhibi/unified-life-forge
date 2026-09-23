# Roadmap

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
  - [ ] Deterministic refresh queue with per-source backoff and cancellation.
  - [ ] Cursor pagination beyond the initial 300 articles.
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
