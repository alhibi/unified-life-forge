---
name: Feature Isolation Architecture
description: Strict rules for feature folder structure, data layer chokepoints, and shared UI primitive reuse. Read before adding or refactoring any feature.
type: preference
---

SmartHub is organized for **feature isolation** so editing one feature never
breaks another and external contributors can add features safely.

## Target layout

```
src/features/<feature>/
  pages/ components/ hooks/
  api.ts types.ts queryKeys.ts index.ts
```

## Hard rules

1. **Only `features/*/api.ts` (and legacy `lib/chat/api.ts`) may import
   `@/integrations/supabase/client`.** Pages, components and hooks call typed
   functions from `./api`.
2. **No cross-feature imports.** `features/a` never imports from `features/b`.
   Share via `src/lib/` (pure) or `src/components/ui/` (primitives).
3. **External code imports the feature barrel** (`@/features/<x>`), not deep paths.
4. **No bespoke card / button / shell styles** in pages. Compose `<PageShell>`,
   `<AppCard>`, `<IconButton>`, `<Section>` from `@/components/ui/app-shell`.
5. **No shadows / gradients / hardcoded colors** (see `no-shadows-no-gradients`
   constraint). Use semantic tokens only.

## Reference

- `src/lib/chat/` is the canonical data-layer shape — copy it for new features.
- Docs: `docs/architecture/feature-structure.md`, `data-layer.md`,
  `ui-primitives.md`, `feature-map.md`.

## Migration order (7 phases)

1. Docs + rules (done)
2. Calendar, Duas, Knowledge
3. Weather, Clipboard
4. Games
5. Podcasts, Diwan
6. Mihrab / Prayer
7. Chat, Settings, Reading

After each phase: build passes, preview renders, no visual diff. Status lives
in `docs/architecture/feature-map.md`.