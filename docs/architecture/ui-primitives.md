# UI Primitives

SmartHub has two layers of UI building blocks:

1. **shadcn primitives** in `src/components/ui/*` (Radix + tailwind-variants).
2. **App primitives** in `src/components/ui/app-shell.tsx` — the SmartHub
   look-and-feel layer that every page and feature must reuse.

## The rule

> No page or feature may roll its own `bg-card rounded-2xl p-4` card,
> bespoke header pill, or hand-styled icon button. Compose from the
> primitives below.

If a primitive is missing for a need, **add it to `app-shell.tsx`** — do
not inline a one-off.

## App primitives (current)

### `<PageShell>`

The outer wrapper for every full-screen route. Owns:
- `pt-14 pb-28 px-5`
- `min-h-100dvh`
- max-width container (`max-w-lg mx-auto`)

Props:
- `flush` — no horizontal padding (for edge-to-edge tab dock pages like Mihrab).
- `centered` — vertical center the content (auth, empty states).

```tsx
<PageShell>
  <Section label={t('home.greeting')}>
    …
  </Section>
</PageShell>
```

### `<AppCard>`

The only allowed card surface. 16px radius, p-4, neutral border, flat (no
shadows, no gradients — see `mem/constraints/no-shadows-no-gradients.md`).

Props:
- `compact` — `p-3` instead of `p-4`.
- `flat` — no surface-depth chrome (truly minimal).
- `pressable` — scale(0.98) on press, for tap targets.
- `as` — render as `<button>` / `<a>` / `<Link>` instead of `<div>`.

### `<IconButton>`

Every header / toolbar / inline icon control. 40×40, rounded-xl,
`bg-accent/50` on hover, scale(0.96) on press.

### `<Section>`

Labeled vertical group (`app-stack` spacing).

Props:
- `label` — small 11px uppercase muted label above the group.
- `tight` — `app-stack-sm` (gap-3) instead of `app-stack` (gap-5).

## CSS utilities (from `index.css`)

These class-based utilities back the React primitives. Use them only when
composing inside `app-shell.tsx` or another primitive — not in pages.

- `.page-shell`, `.page-shell-inner`
- `.app-card`, `.app-card-compact`, `.app-card-flat`, `.app-card-pressable`
- `.app-icon-btn`
- `.app-stack`, `.app-stack-sm`
- `.app-section-label`
- `.surface-depth`, `.surface-depth-pressable` (Obsidian Depth chrome)

## What pages must NOT do

- Write `bg-card rounded-2xl border border-border p-4` by hand.
- Add `box-shadow`, `drop-shadow`, `linear-gradient`, `radial-gradient`,
  `text-shadow` (see `no-shadows-no-gradients` constraint).
- Hardcode colors (`#0a0a0a`, `text-white`, `bg-[#1a1a1e]`). Use semantic
  tokens: `bg-background`, `text-foreground`, `bg-card`, `text-muted-foreground`,
  `border-border`, `bg-accent`, `text-primary`.
- Hardcode font families per-page. Typography is governed centrally by
  `FontSettings` and `IBM Plex Sans Arabic + System UI`.

## Migration checklist for a page

1. Wrap the route in `<PageShell>`.
2. Replace each card `<div class="bg-card rounded-2xl …">` with `<AppCard>`.
3. Replace each header icon `<button class="rounded-xl bg-accent/50 …">`
   with `<IconButton>`.
4. Group sections with `<Section label="…">`.
5. Delete any leftover `bg-*` / `rounded-*` / `border-*` that the primitive
   already provides.