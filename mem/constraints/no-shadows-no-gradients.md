---
name: No shadows, no color gradients
description: Hard rule across the entire app — flat surfaces only, no box-shadows, no inset highlights, no linear/radial/conic color gradients on any surface, card, button, glow, or ambient layer. Borders only.
type: constraint
---
The user explicitly hates shadows and color gradients. Apply globally:

- No `box-shadow` on cards, buttons, surfaces, popovers, sheets, drawers, modals.
- No inset shadows for "depth" / skeuomorphic chrome.
- No `linear-gradient` / `radial-gradient` / `conic-gradient` used as fill or tint on surfaces, headers, hero areas, ambient backgrounds, or card backgrounds.
- No `drop-shadow` filters and no `text-shadow`.
- No glow halos around the `--live` accent (use solid color only).
- Skeleton loaders use opacity pulse, not gradient shimmer.
- Depth is expressed via **borders, contrast of solid bg tokens, and spacing** — never via shadow or gradient.
- Exception: `outline` on `:focus-visible` (accessibility) is allowed.

**Why:** explicit user preference, stated in the Phase 2 design unification request. Do not re-introduce shadows or gradients in any future component, even if a popular pattern (e.g. shadcn defaults, neumorphism, glassmorphism) would suggest them.