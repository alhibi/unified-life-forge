---
name: Unified Design Primitives
description: Canonical PageShell, AppCard, IconButton, Section primitives — every page/card must compose from these
type: design
---
Phase-1 foundation of the app-wide unification.

CSS (src/index.css):
- .page-shell — bg-background, min-h-100dvh, pt-14 pb-28 px-5. Add .page-shell-flush when the page has its own sticky header.
- .page-shell-inner — max-w-lg mx-auto column.
- .app-stack (gap-5) / .app-stack-sm (gap-3) — canonical vertical stacks.
- .app-card — rounded-2xl (16px), p-4, surface-depth chrome. Variants: .app-card-compact (p-3), .app-card-flat (no inset chrome), .app-card-pressable (scale(0.98) on press).
- .app-icon-btn — 40x40 rounded-xl bg-accent/50 hover:bg-accent, the canonical toolbar icon button.
- .app-section-label — 11px uppercase muted tracking label.

React primitives (src/components/ui/app-shell.tsx):
- PageShell(flush?, centered?) — every full-screen route.
- AppCard(compact?, flat?, pressable?, as?) — every card surface.
- IconButton — every header/toolbar icon control.
- Section(label?, tight?) — labeled vertical group.

Rules:
- Do NOT add bespoke bg-card/rounded-xl/rounded-2xl/border-border/p-3/p-4 combos in pages. Compose from these.
- Card radius is always 16px. Pill/icon-btn is always 12px. Full-pill buttons use rounded-full.
- Section gap is always 20px for hero stacks, 12px for list rows.
- Reference implementation: src/pages/Index.tsx.
