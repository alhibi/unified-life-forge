# UI Primitives

SmartHub has two layers of UI building blocks:

1. **shadcn primitives** in `src/components/ui/*` (Radix + tailwind-variants).
2. **App primitives** in `src/components/ui/app-shell.tsx` — the SmartHub
   look-and-feel layer that every page and feature must reuse.

The visual language is deliberately restrained: one 7-step tonal scale per
theme, opaque surfaces, hairline borders, no decorative shadows, blur,
gradients, glows, noise, or glass effects. See
[Colour: one scale per theme](#colour-one-scale-per-theme).

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

## Colour: one scale per theme

A theme is not a background colour plus an accent. Every theme publishes a
**7-step tonal scale** — `50 · 100 · 200 · 300 · 400 · 500 · 600` — and every
semantic token in the app is sampled from that one curve.

The default palette is the reference:

| step | hex       | light mode          | dark mode             |
| ---- | --------- | ------------------- | --------------------- |
| 50   | `#f1f0f4` | page background     | primary / accent text |
| 100  | `#bebacd` | input borders       | secondary text        |
| 200  | `#a49db8` | soft accent surface | accent text           |
| 300  | `#756b92` | accent, live states | accent, live states   |
| 400  | `#4b4262` | primary actions     | muted surfaces        |
| 500  | `#373049` | strong accent text  | cards, muted, borders |
| 600  | `#1c1827` | body text           | page background       |

Dark mode is the same ladder read from the other end, which is why a theme keeps
its identity across modes instead of turning into a different colour.

### The eighth tone: ink

One tone is **identical in all 31 themes**: `--theme-ink`, a soft matte black
(`#111113`). A palette needs one colour it does not own — overlays, full-bleed
media and the OLED canvas have to read as "the app stepped back", and a themed
scrim would tint every photo, video and map underneath it.

It is deliberately not `#000`. Pure black against a lit panel produces a hard
edge and the eye reads the _screen_ rather than a surface.

Ink is used by:

- `--scrim` — every modal, drawer and sheet backdrop, in every theme and mode
- the **black mode** surface ladder (measured up from ink, not from the theme,
  while the theme still owns every accent, border and glyph on top of it)
- full-bleed media chrome — the lightbox backdrop, the 3D mind scene

Reach for it as `hsl(var(--theme-ink))`, or `INK_HEX` for the few consumers that
cannot read a CSS variable (WebGL materials, `<meta name="theme-color">`).

### Surface lift

The app is flat by contract, so the lightness gap between a card and the page is
the _only_ depth cue available. That gap is a preference —
`flat` / `subtle` / `lifted` — applied by `generateThemeTokens(…, lift)`. It
changes the lightness of a surface, which is why it lives with the palette
rather than with the geometry.

### How it is built — `src/utils/themeEngine.ts`

- **One lightness ladder for all 31 themes** (`95 → 77 → 67 → 50 → 32 → 24 → 12`),
  so the distance between a card and its background, or between text and its
  surface, is identical in every theme. A theme chooses only _where on the
  colour wheel_ that ladder sits (`hue`), how much chroma it carries
  (`satBase`), and how far the hue drifts from its lightest to its darkest tone
  (`hueDrift`). That is the whole definition of a theme — one line each.
- **Saturation rises toward the dark end** (≈1.55×). Dark tones need more chroma
  or they read as dead grey.
- **In-between surfaces stay on the curve.** The UI needs more than seven
  surfaces (a card sits above step 50; a hairline border sits between 50 and
  100), so `toneAt()` interpolates hue and saturation between the two
  neighbouring steps. No colour in the app is foreign to its palette.
- **Text tones are measured, not guessed.** HSL lightness is not perceived
  brightness — a green at 41% lightness is far brighter than a violet at 41%.
  `readableTone()` walks a text tone along the theme's own curve until it
  actually clears its WCAG target (4.5:1 body/secondary, 7:1 primary text).
  Every theme × palette-style × mode combination is guaranteed AA.
- **Palette style changes chroma only, never lightness.** Contrast is therefore
  a property of the ladder, not of the user's taste. `neutral` is 1.0 — the
  shipped palette renders exactly as published.
- **Status colours are not themed.** Destructive must look destructive in all 31
  palettes.

### Using it from a component

Reach for a **semantic token** first — it carries meaning and follows light/dark
automatically:

```tsx
<div className="bg-card text-foreground border-border">
  <p className="text-muted-foreground">…</p>
</div>
```

Use a **numbered tone** only when a feature genuinely needs a specific position
on the ramp — a tiered legend, a heat scale, a palette swatch:

```tsx
<span className="bg-theme-100" /> // or primary-100, same tone
```

Never hardcode a hex. A hardcoded colour cannot follow 31 themes, two modes and
black mode, and it is the one thing that makes a screen look like it belongs to
a different app.

## Typography: derived, not fixed

`src/lib/fonts.ts` owns the type system. It has four independent dimensions,
and — unlike the version before it — all four reach the pixels:

| dimension | control                                                      | tokens written                           |
| --------- | ------------------------------------------------------------ | ---------------------------------------- |
| pairing   | display face + body face, or a curated `FONT_PAIRINGS` entry | `--font-display`, `--font-body`          |
| base size | 5 steps, 15 → 19px                                           | `html { font-size }`                     |
| ratio     | `compact` 1.125 · `balanced` 1.2 · `airy` 1.28               | `--fs-micro` … `--fs-display`            |
| leading   | `tight` 1.45 · `normal` 1.6 · `relaxed` 1.78                 | `--type-leading`, `--type-leading-tight` |

The seven steps are powers of the ratio, with exponents derived from the app's
original pixel scale (11 · 12 · 13 · 14 · 16 · 18 · 24 at a 16px base). At the
default ratio and base, the rendered sizes are therefore **identical** to what
shipped before — the ratio then compresses or expands the spread around `lead`,
which stays anchored at 1× the base.

Sizes are in **rem**, never px. That is what makes the base size a single number
that moves the whole system. It is also why
`scripts/codemod-type-rem.mjs` converted the 1,719 arbitrary `text-[13px]`
literals in the app to `text-[0.8125rem]`: a pixel font size silently opts out
of the user's preference, which is how the app ended up half-scaling. A test
now fails on any new px type size.

Line heights are derived in Tailwind, not authored:
`lineHeight: 'calc(var(--fs-body) * var(--type-leading))'`.

## Geometry: the shape of the interface

`src/lib/interfaceScale.ts` owns everything about shape that is not colour and
not type. Four instruments, because a flat design has no others:

| instrument | control                                 | tokens                                                                                                                                        |
| ---------- | --------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------- |
| corners    | one softness multiplier, 0 → 1.6        | `--r-sm/md/lg/xl`, `--radius`                                                                                                                 |
| density    | `compact` / `cozy` / `comfortable`      | `--ui-pad-card`, `--ui-pad-card-compact`, `--ui-control-h`, `--ui-tap`, `--ui-stack-gap`, `--ui-stack-gap-sm`, `--ui-gutter`, `--ui-row-icon` |
| width      | `narrow` / `standard` / `wide` / `full` | `--ui-content-max`                                                                                                                            |
| borders    | `subtle` / `standard` / `defined`       | `--ui-border-alpha`, `--ui-border-soft-alpha`, `--ui-border-strong-alpha`, `--ui-divider-alpha`                                               |

The radius ladder is multiplied, never replaced, so a chip, a button, a card and
a sheet keep their relationship at every setting. `--ui-content-max` also backs
Tailwind's `max-w-lg`, which is this app's content-column convention, so the 40+
screens that centre themselves with that class follow the width preference too.

### The rule for new CSS

Shared utilities in `index.css` must read these variables — **never a raw rem or
px literal** for a radius, a gutter, a control height, a gap or a border alpha.
A literal is a value the user's preferences cannot reach, and it will be the one
element on the screen that refuses to move with the rest.

```css
/* wrong */
.my-thing {
  padding: 1rem;
  border-radius: 16px;
  border: 1px solid hsl(var(--border) / 0.6);
}
/* right */
.my-thing {
  padding: var(--ui-pad-card);
  border-radius: var(--r-lg);
  border: 1px solid hsl(var(--border) / var(--ui-border-alpha));
}
```

## Where the settings live

Two screens, split by what they change rather than by which file they came from:

- `/settings/appearance` — mode, palette, accent strength, ink/black mode,
  typography, prayer-clock themes. (`src/pages/AppearanceSettings.tsx`)
- `/settings/interface` — corners, density, width, borders, surface lift.
  (`src/pages/InterfaceSettings.tsx`)

Both are assembled from `src/features/appearance/components/*`, which share the
atoms in `AppearancePrimitives.tsx`. `/settings/theme` and `/settings/font`
redirect to the appearance screen — both paths are in the wild.
