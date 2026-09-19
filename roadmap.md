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
- [ ] Unified state system (idle/loading/partial/ready/empty/offline/error/unauthorized) via StateView.
- [ ] Mobile touch targets ≥44px audit and fixes.
- [x] Portal "متابعة" row: recents surfaced above the grid, hidden for new users.
- [x] Portal hierarchy: compact Today block — occasions strip merged into prayer card behind a disclosure (collapsed by default, like qibla), weather hourly rail sm+-only, reserves tightened to measured heights (15.5rem / 8.5→16.5rem).
- [ ] Chat stability pass on a real Android device.

### P1 — experience rebuild
- [ ] Portal recomposition and Continue section.
- [ ] Design tokens enforcement (raw hex, radius, durations, raw buttons).
- [ ] Typography roles (UI Arabic / Editorial Arabic / Latin UI / Mono).
- [ ] Settings IA with an Advanced tier and value validation.
- [ ] Wellness (hub) vs Fitness (execution) separation.
- [ ] Reading header simplification and scroll/state restore.
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
