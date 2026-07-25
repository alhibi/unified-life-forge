/**
 * The interface geometry system — everything about the shape of the UI that is
 * not colour and not type.
 *
 * The app is flat by contract: no shadows, no blur, no gradients. That leaves
 * exactly four instruments for building hierarchy, and until now all four were
 * hard-coded rem literals scattered through index.css:
 *
 *   • CORNERS   how soft every radius in the app is, from square to pill.
 *   • DENSITY   card padding, control heights, stack gaps, page gutters —
 *               how much air surrounds each element.
 *   • WIDTH     the measure of the single content column. A narrow column is
 *               easier to read; a wide one shows more at once.
 *   • BORDERS   how loudly the hairlines speak, since with no shadows the
 *               border *is* the edge of a surface.
 *
 * Each becomes a small set of CSS custom properties written on the document
 * root, and every shared utility in index.css reads them. Nothing here touches
 * a component: change a value and the whole app moves together.
 *
 * A fifth control, surface lift, lives in themeEngine.ts instead — it changes
 * the lightness of a surface, so it belongs to the palette, not the geometry.
 */

// ─── Corners ────────────────────────────────────────────────
/**
 * The canonical radius ladder, in px, at softness 1.0: 6 · 10 · 16 · 24.
 * Softness multiplies all four, so the *relationship* between a chip, a button,
 * a card and a sheet is preserved at every setting — only the character changes.
 */
const RADIUS_LADDER = { sm: 6, md: 10, lg: 16, xl: 24 } as const;

export const MIN_CORNER_SOFTNESS = 0;
export const MAX_CORNER_SOFTNESS = 1.6;
export const DEFAULT_CORNER_SOFTNESS = 1;

export const CORNER_PRESETS = [
  { value: 0, label: 'حاد', note: 'زوايا قائمة تماماً' },
  { value: 0.45, label: 'معتدل', note: 'انحناء طفيف' },
  { value: 1, label: 'متوازن', note: 'الافتراضي' },
  { value: 1.35, label: 'ناعم', note: 'حواف مستديرة واضحة' },
  { value: 1.6, label: 'دائري', note: 'أقصى نعومة' },
] as const;

export function clampCornerSoftness(value: number): number {
  if (!Number.isFinite(value)) return DEFAULT_CORNER_SOFTNESS;
  return Math.min(MAX_CORNER_SOFTNESS, Math.max(MIN_CORNER_SOFTNESS, value));
}

// ─── Density ────────────────────────────────────────────────
export interface DensityLevel {
  id: string;
  label: string;
  note: string;
  /** `.app-card` gutter. */
  cardPadding: string;
  /** `.app-card-compact` gutter — list rows. */
  cardPaddingCompact: string;
  /** Minimum height of inputs, selects and the icon button. */
  controlHeight: string;
  /** Minimum tap target for icon-only controls. Never goes below 2.5rem. */
  tapSize: string;
  /** `.app-stack` — the gap between sections. */
  stackGap: string;
  /** `.app-stack-sm` — the gap between rows inside a section. */
  stackGapSmall: string;
  /** Page edge gutter. */
  gutter: string;
  /** The tinted square behind a settings-row icon. */
  rowIcon: string;
}

export const DENSITY_LEVELS: readonly DensityLevel[] = [
  {
    id: 'compact',
    label: 'مضغوط',
    note: 'أكثر محتوى في الشاشة',
    cardPadding: '0.75rem',
    cardPaddingCompact: '0.5rem',
    controlHeight: '2.5rem',
    tapSize: '2.5rem',
    stackGap: '1rem',
    stackGapSmall: '0.5rem',
    gutter: '0.875rem',
    rowIcon: '1.75rem',
  },
  {
    id: 'cozy',
    label: 'متوازن',
    note: 'الافتراضي',
    cardPadding: '1rem',
    cardPaddingCompact: '0.75rem',
    controlHeight: '2.75rem',
    tapSize: '2.75rem',
    stackGap: '1.5rem',
    stackGapSmall: '0.75rem',
    gutter: '1rem',
    rowIcon: '2rem',
  },
  {
    id: 'comfortable',
    label: 'مريح',
    note: 'مساحات أوسع ولمس أسهل',
    cardPadding: '1.25rem',
    cardPaddingCompact: '1rem',
    controlHeight: '3rem',
    tapSize: '3rem',
    stackGap: '1.875rem',
    stackGapSmall: '1rem',
    gutter: '1.25rem',
    rowIcon: '2.25rem',
  },
] as const;

export type DensityId = (typeof DENSITY_LEVELS)[number]['id'];
export const DEFAULT_DENSITY: DensityId = 'cozy';

export function resolveDensity(value: string | null | undefined): DensityId {
  return DENSITY_LEVELS.some((d) => d.id === value) ? (value as DensityId) : DEFAULT_DENSITY;
}

// ─── Content width ──────────────────────────────────────────
export interface WidthOption {
  id: string;
  label: string;
  note: string;
  /** Applied to `.page-shell-inner` and to Tailwind's `max-w-lg`. */
  max: string;
}

export const WIDTH_OPTIONS: readonly WidthOption[] = [
  { id: 'narrow', label: 'ضيّق', note: 'عمود قراءة مركّز', max: '27rem' },
  { id: 'standard', label: 'قياسي', note: 'الافتراضي', max: '32rem' },
  { id: 'wide', label: 'واسع', note: 'مساحة أكبر للجداول والقوائم', max: '38rem' },
  { id: 'full', label: 'كامل', note: 'يستخدم كل عرض الشاشة', max: '100%' },
] as const;

export type WidthId = (typeof WIDTH_OPTIONS)[number]['id'];
export const DEFAULT_WIDTH: WidthId = 'standard';

export function resolveWidth(value: string | null | undefined): WidthId {
  return WIDTH_OPTIONS.some((w) => w.id === value) ? (value as WidthId) : DEFAULT_WIDTH;
}

// ─── Border strength ────────────────────────────────────────
export interface BorderOption {
  id: string;
  label: string;
  note: string;
  /** Alpha of a standard hairline. */
  alpha: number;
}

export const BORDER_OPTIONS: readonly BorderOption[] = [
  { id: 'subtle', label: 'خفيّة', note: 'فواصل شبه صامتة', alpha: 0.36 },
  { id: 'standard', label: 'قياسية', note: 'الافتراضي', alpha: 0.6 },
  { id: 'defined', label: 'واضحة', note: 'حدود صريحة لكل سطح', alpha: 0.92 },
] as const;

export type BorderId = (typeof BORDER_OPTIONS)[number]['id'];
export const DEFAULT_BORDER: BorderId = 'standard';

export function resolveBorder(value: string | null | undefined): BorderId {
  return BORDER_OPTIONS.some((b) => b.id === value) ? (value as BorderId) : DEFAULT_BORDER;
}

// ─── Composite presets ──────────────────────────────────────
/**
 * Whole-interface characters. Five independent knobs is a lot to ask of
 * anyone, so the combinations that were actually designed ship as one tap —
 * the individual controls stay underneath for tuning.
 */
export interface InterfacePreset {
  id: string;
  label: string;
  note: string;
  cornerSoftness: number;
  density: DensityId;
  width: WidthId;
  border: BorderId;
  /** Kept in sync with SurfaceLift in themeEngine.ts. */
  surfaceLift: 'flat' | 'subtle' | 'lifted';
}

export const INTERFACE_PRESETS: readonly InterfacePreset[] = [
  {
    id: 'signature',
    label: 'التوقيع',
    note: 'الهوية الافتراضية للتطبيق',
    cornerSoftness: 1,
    density: 'cozy',
    width: 'standard',
    border: 'standard',
    surfaceLift: 'subtle',
  },
  {
    id: 'editorial',
    label: 'قراءة',
    note: 'عمود واسع، مساحات مريحة، فواصل خفيفة',
    cornerSoftness: 1.35,
    density: 'comfortable',
    width: 'wide',
    border: 'subtle',
    surfaceLift: 'flat',
  },
  {
    id: 'precision',
    label: 'دقيق',
    note: 'زوايا حادّة، كثافة عالية، حدود واضحة',
    cornerSoftness: 0.45,
    density: 'compact',
    width: 'standard',
    border: 'defined',
    surfaceLift: 'lifted',
  },
  {
    id: 'soft',
    label: 'ناعم',
    note: 'حواف مستديرة وأسطح بارزة',
    cornerSoftness: 1.6,
    density: 'cozy',
    width: 'narrow',
    border: 'subtle',
    surfaceLift: 'lifted',
  },
] as const;

export interface InterfacePrefs {
  cornerSoftness: number;
  density: string;
  width: string;
  border: string;
  surfaceLift: string;
}

/** The preset id matching the current settings exactly, or `null` if tuned. */
export function matchInterfacePreset(prefs: InterfacePrefs): string | null {
  return (
    INTERFACE_PRESETS.find(
      (p) =>
        Math.abs(p.cornerSoftness - clampCornerSoftness(prefs.cornerSoftness)) < 0.02 &&
        p.density === resolveDensity(prefs.density) &&
        p.width === resolveWidth(prefs.width) &&
        p.border === resolveBorder(prefs.border) &&
        p.surfaceLift === prefs.surfaceLift,
    )?.id ?? null
  );
}

// ─── Tokens ─────────────────────────────────────────────────
/**
 * Resolve interface preferences into CSS custom properties.
 * Pure, so the settings screen can render a live preview from the same numbers
 * the document root will get.
 */
export function interfaceTokens(prefs: InterfacePrefs): Record<string, string> {
  const softness = clampCornerSoftness(prefs.cornerSoftness);
  const density = DENSITY_LEVELS.find((d) => d.id === resolveDensity(prefs.density))!;
  const width = WIDTH_OPTIONS.find((w) => w.id === resolveWidth(prefs.width))!;
  const border = BORDER_OPTIONS.find((b) => b.id === resolveBorder(prefs.border))!;

  const radius = (base: number) => `${Math.round(base * softness * 10) / 10}px`;

  return {
    '--r-sm': radius(RADIUS_LADDER.sm),
    '--r-md': radius(RADIUS_LADDER.md),
    '--r-lg': radius(RADIUS_LADDER.lg),
    '--r-xl': radius(RADIUS_LADDER.xl),
    // Legacy alias: shadcn primitives and a few call sites read `--radius`.
    '--radius': radius(RADIUS_LADDER.lg),

    '--ui-pad-card': density.cardPadding,
    '--ui-pad-card-compact': density.cardPaddingCompact,
    '--ui-control-h': density.controlHeight,
    '--ui-tap': density.tapSize,
    '--ui-stack-gap': density.stackGap,
    '--ui-stack-gap-sm': density.stackGapSmall,
    '--ui-gutter': density.gutter,
    '--ui-row-icon': density.rowIcon,

    '--ui-content-max': width.max,

    '--ui-border-alpha': String(border.alpha),
    // Dividers inside a surface sit quieter than the surface's own edge.
    '--ui-divider-alpha': String(Math.round(border.alpha * 0.55 * 100) / 100),
    // Emphasis edges (focused control, selected row) sit louder.
    '--ui-border-strong-alpha': String(Math.min(1, Math.round(border.alpha * 145) / 100)),
  };
}

/** Write a token map onto the document root. */
export function applyCssVars(vars: Record<string, string>) {
  const root = document.documentElement;
  for (const [key, value] of Object.entries(vars)) root.style.setProperty(key, value);
}
