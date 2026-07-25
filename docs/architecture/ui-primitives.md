# UI Primitives

SmartHub has two layers of UI building blocks:

1. **shadcn primitives** in `src/components/ui/*` (Radix + tailwind-variants).
2. **App primitives** in `src/components/ui/app-shell.tsx` — the SmartHub
   look-and-feel layer that every page and feature must reuse.

The visual language is deliberately restrained: warm semantic neutrals,
one controlled accent, opaque surfaces, hairline borders, no decorative
shadows, blur, gradients, glows, noise, or glass effects.

## The rule

> No page or feature may roll its own `bg-card rounded-2xl p-4` card,
> bespoke header pill, or hand-styled icon button. Compose from the
> primitives below.

If a primitive is missing for a need, **add it to `app-shell.tsx`** — do
not inline a one-off.

## App primitives (current)

### `<PageShell>`

The outer wrapper for every full-screen route. Owns:

- safe-area aware `pt-14` / `pb-page` and 16px inline gutters
- `min-height: 100dvh`
- max-width container (`max-w-lg mx-auto`)

Props:

- `flush` — removes only the standard top clearance when a page owns its header.
- `centered` — wraps content in the canonical centered max-width column.

```tsx
<PageShell>
  <Section label={t('home.greeting')}>…</Section>
</PageShell>
```

### `<AppCard>`

The only allowed card surface. 16px radius, p-4, neutral border, flat: no
shadows, blur, gradients, noise, or glow.

Props:

- `compact` — `p-3` instead of `p-4`.
- `flat` — no surface-depth chrome (truly minimal).
- `pressable` — scale(0.98) on press, for tap targets.
- `as` — render as `<button>` / `<a>` / `<Link>` instead of `<div>`.

### `<IconButton>`

Every header / toolbar / inline icon control. 44×44, 10px radius,
`bg-accent/50` with a restrained hover state and the global 0.98 press response.

### `<Section>`

Labeled vertical group (`app-stack` spacing).

Props:

- `label` — small 11px uppercase muted label above the group.
- `tight` — `app-stack-sm` (gap-3 / 12px) instead of `app-stack` (gap-6 / 24px).

### Controls and switching

- `<Button>` and `<IconButton>` are the only button chrome.
- `<Input>`, `<Textarea>`, and `<Select>` share `.app-control`.
- `<Switch>` owns boolean toggles.
- `<Tabs>`, `<TabsList>`, `<TabsTrigger>`, and `<TabsContent>` own segmented
  navigation and section switching.

### Transient surfaces

`Dialog`, `AlertDialog`, `Drawer`, `Sheet`, `ResponsiveDrawer`, menus,
popovers, and tooltips share `.app-scrim`, `.app-overlay-surface`, and
`.app-overlay-close`. They are opaque and border-defined; no caller may add
blur, shadows, or local scrim colours.

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
- Add `box-shadow`, `drop-shadow`, `text-shadow`, decorative blur/glass,
  glow/halo/noise, `linear-gradient`, `radial-gradient`, or `conic-gradient`.
  A gradient is allowed only inside a data visualization when it encodes data.
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
