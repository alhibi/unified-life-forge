# UI Primitives

The app has two layers of UI building blocks:

1. **shadcn/Radix primitives** in `src/components/ui/*` (Radix + `class-variance-authority`).
2. **App primitives** in `src/components/ui/app-shell.tsx` — the product layer every page
   and domain must reuse.

The visual contract is [DESIGN.md](../../DESIGN.md) (§9 lists the component roles); the
prop-level catalogue with A/B/C states is
[docs/design-system/component-catalog.md](../design-system/component-catalog.md). This file
explains the primitives and the rules that keep screens consistent; where it disagrees with
`DESIGN.md`, `DESIGN.md` wins.

The visual language is deliberately restrained: fourteen theme families over one semantic
contract, solid or bounded-alpha surfaces without backdrop effects, hairline borders, and no
decorative shadows, blur, gradients, glows, noise or glass. The `reducedTransparency`
preference forces every governed surface back to alpha 1. See
[Colour: fourteen families](#colour-fourteen-families-one-contract).

## The rule

> No page or feature may roll its own `bg-card rounded-2xl p-4` card,
> bespoke header pill, or hand-styled icon button. Compose from the
> primitives below.

If a primitive is missing for a need, **add it to `app-shell.tsx`** — do
not inline a one-off.

## App primitives (current)

### `<PageShell>`

The outer wrapper for standard full-screen routes. Owns the page background, safe-area aware
clearance, preference-driven gutters and the published content frame. Surfaces that own their
own frame — the chat conversation, the map, a game board — are the documented exceptions.

Props:

- `flush` — removes the standard top clearance when a page owns its header.
- `centered` — wraps content in the canonical centred column (default `true`).
- `width` — `'content'` (default, `--ui-content-max`: reading, forms, lists) or
  `'workspace'` (`--ui-workspace-max`: dashboards, tables, maps).
- `header` — renders the page header above the content and drops the top padding so a sticky
  header owns the top edge.

```tsx
<PageShell width="workspace" header={<PageHeader title="الطقس" />}>
  <Section label="اليوم">…</Section>
</PageShell>
```

### `<PageHeader>`

The single source of truth for page headers (`src/components/PageHeader.tsx`), used directly
or through `PageShell`'s `header` slot. Two registers:

- `compact` (default) — one row: back, optional icon, title/subtitle, right-side actions.
- `display` — hub register: large centred title with optional eyebrow, subtitle, icon and a
  chip-rail `children` slot.

Props include `sticky`, `hideBack`, `backTo`, `backFallback` and `right`. Never build a
local `sticky top-0` header or hand-rolled blur.

### `<AppCard>`

The only allowed card surface. Its radius, padding, border volume and material alpha are
token-driven. It stays flat: no shadows, blur, gradients, noise or glow.

Props:

- `tone` — `1..6`, a coordinated coloured widget body from the `--data-*` families.
- `compact` — tighter padding for list-like cards.
- `flat` — no inset chrome, for nested cards.
- `pressable` — the shared press response, for cards that are buttons.
- `as` — render as `<button>`, `<a>`, `<section>`, etc.

### `<AppList>` + `<AppRow>` + `<IconChip>`

The grouped list is the surface; the row is the unit. Rows stack inside one `AppList` and
share one hairline divider, one press language and one geometry.

```tsx
<AppList>
  <AppRow
    leading={
      <IconChip>
        <BookOpen />
      </IconChip>
    }
    title="القرآن"
    chevron
  />
  <AppRow
    leading={
      <IconChip tone="plain">
        <Moon />
      </IconChip>
    }
    title="السنّة"
    value="12"
  />
</AppList>
```

- `AppRow` props: `leading`, `title`, `subtitle`, `value`, `chevron`, `tone`
  (`default`/`danger`), `as` (`button`/`a`/`div`).
- `IconChip` sizes: `sm` 32, `md` 44 (default), `xl` 56; tones: `accent`, `plain`,
  `danger`, `success`.

### `<StatGrid>` + `<Stat>`

Metric clusters: `StatGrid` takes `cols` (`2`/`3`/`4`, default 3); each `Stat` renders a
large tabular value over a quiet label. Use it for stats strips, not for numbers inside a
sentence.

### `<IconButton>`

Every header, toolbar and inline icon control. The canonical 44×44 circular button; size,
tap target, radius, icon weight and press response come from the interface tokens.

### `<Section>`

Labelled vertical group (`app-stack` spacing).

Props:

- `label` — small muted label above the group.
- `tight` — `app-stack-sm` (12px) instead of `app-stack` (24px).

### `<StateView>`

The one surface for every screen with nothing to show (`src/components/ui/state-view.tsx`).
Four kinds — `empty`, `search`, `offline`, `error` — and every use requires a specific
`title` and `body`; there is no default “لا توجد بيانات” copy. Optional `action`
(`{ label, onClick, pending }`), `secondary`, `actions`, `icon`, `compact` and `bare`.
A state view reserves its own height so swapping it with a skeleton does not shift the page.

### Controls and switching

- `<Button>` and `<IconButton>` are the only button chrome. `Button` variants:
  `default`, `secondary`, `outline`, `tonal`, `ghost`, `link`, `destructive`; sizes
  `xs`, `sm`, `default`, `lg`, `icon`, `icon-sm`.
- `<Input>`, `<Textarea>` and `<Select>` share the control chrome/radius.
- `<Switch>` owns boolean toggles; `<Slider>` owns numeric ranges.
- `<Tabs>`, `<TabsList>`, `<TabsTrigger>` and `<TabsContent>` own in-page segmented
  navigation and section switching. Route-to-route navigation uses React Router, not Tabs.

### Transient surfaces

`Dialog`, `AlertDialog`, `Drawer`, `Sheet`, `ResponsiveDrawer`, menus, popovers and
tooltips share `.app-scrim`, `.app-overlay-surface` and `.app-overlay-close`. They are
opaque and border-defined; no caller may add blur, shadows or local scrim colours. Toasts use
`sonner` only.

## CSS utilities (from `index.css`)

These class-based utilities back the React primitives. Use them only when
composing inside `app-shell.tsx` or another primitive — not in pages.

- `.page-shell`, `.page-shell-inner`, `.page-shell-flush`, `.page-shell-workspace`
- `.app-card`, `.app-card-compact`, `.app-card-flat`, `.app-card-pressable`, `.rich-widget`
- `.app-list`, `.app-list-compact`, `.app-row`, `.app-row-interactive`, `.app-row-danger`
- `.row-icon`, `.row-icon-md`, `.row-icon-xl`, `.row-icon-plain`/`-danger`/`-success`
- `.app-stat-grid`, `.app-stat`, `.app-stat-value`, `.app-stat-label`
- `.app-icon-btn`, `.app-pressable`, `.app-focus-ring`
- `.app-stack`, `.app-stack-sm`, `.app-section-label`
- `.app-page-header`, `.app-sticky-header`
- `.surface-depth`, `.surface-depth-pressable` (named elevation chrome)
- `.pb-page` (the only page-bottom padding; there is no bottom nav)

## What pages must NOT do

- Write `bg-card rounded-2xl border border-border p-4` by hand.
- Add `box-shadow`, `drop-shadow`, `text-shadow`, decorative blur/glass,
  glow/halo/noise, `linear-gradient`, `radial-gradient`, or `conic-gradient`.
  A gradient is allowed only inside a data visualization when it encodes data.
- Hardcode colors (`#0a0a0a`, `text-white`, `bg-[#1a1a1e]`). Use semantic
  tokens: `bg-background`, `text-foreground`, `bg-card`, `text-muted-foreground`,
  `border-border`, `bg-accent`, `text-primary`.
- Hardcode font families per page. Typography is governed centrally by
  `src/lib/fonts.ts` and the runtime stack is `IBM Plex Sans Arabic + Inter Tight`.

## Migration checklist for a page

1. Wrap the route in `<PageShell>` (or `<PageShell width="workspace">` for a dashboard).
2. Replace each card `<div class="bg-card rounded-2xl …">` with `<AppCard>`.
3. Replace repeated hairline cards with `<AppList>` + `<AppRow>`.
4. Replace header icon buttons with `<IconButton>` and the page header with `<PageHeader>`.
5. Group sections with `<Section label="…">`; render empty/error/offline states with
   `<StateView>`.
6. Delete any leftover `bg-*` / `rounded-*` / `border-*` that the primitive already provides.

## Colour: fourteen families, one contract

Read [DESIGN.md](../../DESIGN.md) §3 (semantic roles) and §4 (theme families) before choosing
a colour. The engine is `src/utils/themeEngine.ts`; the material recipes are in
`src/utils/themeArtDirections.ts`.

There are **fourteen families** — expressive, editorial, copper, paper, mono, obsidian, clay,
gold, moss, ocean, arctic, midnight, nebula, rose — plus `dynamic` derived from a user image.
Each family authors its own light/dark seeds (`bg`, `surface`, `ink`, `accent`) and an art
direction. A component consumes roles, never the family id.

### The tone ladder

Every family publishes an **11-step perceptual ladder** —
`25 · 50 · 100 · 200 · 300 · 400 · 500 · 600 · 700 · 800 · 900` — with a fixed contract:

- `50` = page background
- `100` = card surface
- `400` = primary accent

The other steps are planes, accent weights and ink weights. `toneAt()` interpolates between
neighbouring steps for the many surfaces the UI needs (a card above 50, a hairline between 50
and 100), so no colour is foreign to its palette. `readableTone()` walks text tones along the
family's own curve until they clear the WCAG target — text contrast is measured, not guessed.
Palette style (`neutral` / `tonal` / `vibrant` / `expressive`) changes chroma and presence,
not the ladder's lightness.

### Surface lift and ink

The app is flat by contract, so the lightness gap between a card and the page is the main
depth cue. That gap is the user's `flat` / `subtle` / `lifted` preference, applied by
`generateThemeTokens(…, lift)`; it belongs to the palette, not to a page.

Each family also publishes its own ink role and a scrim derived from its palette. Overlays,
full-bleed media and OLED mode need a surface that reads as "the app stepped back", so they
use `.app-scrim` / `--scrim` rather than an invented black. Never hardcode `#000`.

### Using it from a component

Reach for a **semantic token** first — it carries meaning and follows light/dark automatically:

```tsx
<div className="bg-card text-foreground border-border">
  <p className="text-muted-foreground">…</p>
</div>
```

Use a **numbered tone** only when a feature genuinely needs a specific position on the ramp —
a tiered legend, a heat scale, a palette swatch:

```tsx
<span className="bg-theme-100" />
```

Never hardcode a hex. A hardcoded colour cannot follow fourteen families, two modes, OLED and
the user's surface-lift preference, and it is the one thing that makes a screen look like it
belongs to a different app. Status colours are not themed: destructive must look destructive
in every family.

## Typography: derived, not fixed

`src/lib/fonts.ts` owns the type system. The runtime family is **one** stack — IBM Plex
Sans Arabic for Arabic and Inter Tight for Latin — and every legacy font id resolves to it.
Amiri and Tajawal are editorial material for Quran, poetry and Diwan; they are not interface
fonts.

| dimension | control                                               | tokens written                           |
| --------- | ----------------------------------------------------- | ---------------------------------------- |
| family    | one unified stack: IBM Plex Sans Arabic + Inter Tight | `--font-display`, `--font-body`          |
| base size | 5 steps, 15 → 19px                                    | `--type-base-scale`, `--fs-*`            |
| ratio     | `compact` 1.125 · `balanced` 1.2 · `airy` 1.28        | `--fs-micro` … `--fs-hero`               |
| leading   | `tight` 1.45 · `normal` 1.6 · `relaxed` 1.78          | `--type-leading`, `--type-leading-tight` |
| weight    | 400–700, clamped                                      | `--font-weight`                          |

The document root stays fixed at **16px**. The ladder is
`size(n) = base × ratio^n` over eight steps (micro · mini · meta · body · lead · title ·
display · hero), clamped to 12–34px, so no size in the app can be "almost" another size.
Canonical type tokens include the base-size multiplier; only typography moves while cards,
tap targets and gutters stay under `--ui-scale`.

New code uses the canonical `text-*` / `type-*` steps. Raw `text-[Npx]` is forbidden, and
so are weight 300 (not loaded for Arabic) and negative tracking on connected Arabic script.

## Geometry: the shape of the interface

`src/lib/interfaceScale.ts` owns everything about interface shape, material and
interaction that is not colour and not type. The system has 26 independent,
composable instruments:

| instrument       | control                                  | principal tokens                                                                |
| ---------------- | ---------------------------------------- | ------------------------------------------------------------------------------- |
| scale            | `0.80 → 1.35`                            | every `--ui-*` geometry token, emitted as px                                    |
| spacing          | `0.70 → 1.45`, independent of scale      | `--ui-spacing-scale`, card padding, stack gaps, page gutter                     |
| corners          | one softness multiplier, `0 → 1.6`       | `--r-sm/md/lg/xl`, `--radius`                                                   |
| radius profile   | graded / uniform / expressive            | the ratios between the four radius steps                                        |
| density          | compact / cozy / comfortable             | card, control, tap, stack, gutter and row-icon tokens                           |
| width            | narrow / standard / wide / full / custom | `--ui-content-max`                                                              |
| custom measure   | `320 → 960px`                            | `--ui-content-max` when width is `custom`                                       |
| borders          | subtle / standard / defined              | `--ui-border-*`                                                                 |
| border width     | `1 → 2px`                                | `--ui-border-width` on every governed surface edge                              |
| dividers         | hairline / soft / none                   | `--ui-divider-alpha`, `--ui-divider-width`                                      |
| adaptation       | automatic / fixed                        | adaptive clamp for page gutters                                                 |
| material         | solid / soft / airy                      | `--ui-material-alpha`, `--ui-material-overlay-alpha`                            |
| lift             | flat / subtle / lifted                   | surface lightness (owned by the palette — see Surface lift)                     |
| interaction      | calm / balanced / lively                 | press scale/offset, icon stroke and focus width                                 |
| press depth      | `0 → 1.6`                                | `--ui-interaction-scale`, `--ui-interaction-offset`                             |
| tap floor        | `40 → 64px`                              | `--ui-tap`, `--ui-touch-min`                                                    |
| icon weight      | `0.70 → 1.40`                            | `--ui-icon-stroke`                                                              |
| row-icon size    | `0.80 → 1.40`                            | `--ui-row-icon`                                                                 |
| header height    | `0.85 → 1.35`                            | `--ui-header-h`, and `scroll-padding-block-start`                               |
| focus offset     | `0 → 6px`                                | `--ui-focus-offset`                                                             |
| scrollbar        | full / thin / hidden                     | `--ui-scrollbar-size`, `--ui-scrollbar-ff`, `--ui-scrollbar-alpha`              |
| bottom clearance | `0 → 40px`                               | `--ui-safe-extra`, added on top of the device inset                             |
| access           | four independent switches                | opacity override, stronger edges, 52px touch targets and clearer keyboard focus |

Geometry is authored as numeric pixels and multiplied by `uiScale` only when
tokens are compiled. It never depends on `html { font-size }`. The radius
ladder is multiplied rather than replaced, so a chip, button, card and sheet
keep their relationship at every setting. `--ui-content-max` also backs
Tailwind's `max-w-lg`, so existing centered routes participate automatically,
and `--ui-border-width` backs Tailwind's default `border` width so a surface
cannot opt out of the edge preference by accident.

`spacingScale` and `uiScale` are deliberately separate: scale grows _everything_
including control heights and tap targets, while spacing grows only the air
between things. A user who wants a denser screen without smaller touch targets
needs both knobs, not one.

`resolveInterfaceGeometry()` returns the exact numbers the tokens carry. The
settings screen renders it twice — once as the per-control "resolved" readout and
once as the token inspector — so a control never reports a percentage the user
cannot translate into pixels.

Ten designed presets ship as complete configurations: signature, reading,
precision, soft, pulse, studio, focus, OLED, accessible and dense. Pulse and
studio provide more expressive characters without breaking the flat-surface
contract; focus, OLED, accessible and dense are functional configurations rather
than mere colour skins.

Motion is the sibling platform and lives in
[`motion-system.md`](./motion-system.md). The two compose in exactly one place:
the press response. The interface platform owns its _shape_
(`--ui-interaction-scale` / `-offset`), the motion platform owns _how much of it
is expressed_ (`--motion-press-strength`), and `--ui-press-scale` in `index.css`
is the composition. At strength 0 nothing moves but the colour feedback still
fires — which is what users who disable motion actually want.

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

## Persistence, profiles and cold boot

Appearance platform state is versioned by
`src/lib/appearancePreferences.ts` (`APPEARANCE_SCHEMA_VERSION = 3`). Reads are
sanitized; v2 documents and the pre-v2 independent `app-*` keys both upgrade in
place, with the fields they lack resolving to their defaults — which is exactly
the geometry the user already had. Writes keep a complete v3 value and cloud
persistence in sync. `AppContext` listens for `storage` events, so another tab
updates without reloading and without saving the same value back to the cloud.

Every compiled theme, typography and interface token is merged by
`src/lib/rootTokens.ts` into `app-root-tokens-v1`. The bounded inline boot
script in `index.html` validates and replays that exact token map before React,
preventing theme flash and geometry jumps without duplicating token-generation
logic in HTML.

Users can keep up to eight named interface profiles. A profile contains only
the 26 interface settings, is sanitized on import, and can be exported as a
versioned JSON document (`INTERFACE_PROFILES_VERSION = 2`; v1 documents still
import). It never contains identity, account or feature data.

## Where the settings live

Three screens, split by what they change rather than by which file they came
from:

- `/settings/appearance` — mode, palette, accent strength, ink/black mode,
  typography, prayer-clock themes. (`src/pages/AppearanceSettings.tsx`)
- `/settings/interface` — **الواجهة والأبعاد**, the interface platform: scale,
  spacing, corners and radius profile, density, width and custom measure, edges
  and dividers, surface material and lift, interaction and touch, icons and
  headers, focus and accessibility, scrollbar and bottom clearance, a live token
  inspector, ten complete presets and portable saved profiles.
  (`src/pages/InterfaceSettings.tsx` → `InterfaceSection.tsx`)
- `/settings/motion` — **الحركة والأداء**, the motion platform. See
  [`motion-system.md`](./motion-system.md). (`src/pages/MotionSettings.tsx` →
  `src/features/motion/`)

All three are assembled from the atoms in
`src/features/appearance/components/AppearancePrimitives.tsx` — `SettingsSection`,
`SegmentedControl`, `ChoiceRow`, `SliderRow`, `ToggleRow`, `OptionCard`,
`TokenInspector`, `FeedbackLine` — so a section about colour, a section about
corner radius and a section about frame pacing read as the same product.
`/settings/theme` and `/settings/font` redirect to the appearance screen — both
paths are in the wild.

### Every control shows its resolved value

`SliderRow` takes a `resolved` prop and a `note`. A slider that reads
`110٪ · 48px عنصر` tells the user what they are getting; one that reads `110٪`
does not. With 26 instruments, that readout is the difference between a settings
screen a power user can reason about and one they have to guess at.
