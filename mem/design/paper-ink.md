---
name: Paper & Ink design system
description: Curium-inspired paper/ink visual system replaces previous Obsidian Depth + Live Pulse. Default theme.
type: design
---
# Paper & Ink (Curium-inspired)

Replaced the previous "Neutral with Live Pulse" + "Obsidian Depth" identity.

- Default `colorTheme` is `paper`. Default `fontFamily` is `plex-mono`.
- Light: paper canvas `#f5f0e8` (34 33% 93%), ink text `#1a1a1f` (240 8% 11%), surface `#fbf8f3`, border `#d6cfc1`.
- Dark: black canvas `#0d0d0f` (240 6% 6%), paper text `#f5f0e8`, surface `#161618`, border `#2a2a2e`. AMOLED uses bg `#000000`.
- Primary accent is ink on light, paper on dark — NEVER a saturated hue.
- Tokens are hard-coded inside `generateThemeTokens` when `preset.id === 'paper'` (style modifiers ignored).
- Font stack: `'IBM Plex Mono', 'IBM Plex Sans Arabic', 'Noto Sans Arabic', system-ui, monospace` — Latin chars render Mono, Arabic chars fall back to Plex Sans Arabic per-glyph.
- `--live` copper accent token is still defined globally but no longer the primary identity; use sparingly only for true "now" hotspots.
- Radius shrunk to `0.625rem` for paper-notebook feel.