import {
  ADVANCED_INTERFACE_KEYS,
  clampBorderWidth,
  clampContentMeasure,
  clampSpacingScale,
  clampTapTarget,
  clampUiScale,
  DEFAULT_ADVANCED_INTERFACE_PREFERENCES,
  type DividerStyle,
  type InteractionStyle,
  MAX_SAFE_AREA_EXTRA,
  MIN_SAFE_AREA_EXTRA,
  type RadiusProfile,
  sanitizeDividerStyle,
  sanitizeInteractionStyle,
  sanitizeRadiusProfile,
  sanitizeScrollbarStyle,
  sanitizeSurfaceMaterial,
  type ScrollbarStyle,
  type SurfaceMaterial,
} from './appearancePreferences';
import { applyRootTokens } from './rootTokens';

export type {
  AdvancedInterfacePreferences,
  DividerStyle,
  InteractionStyle,
  RadiusProfile,
  ScrollbarStyle,
  SurfaceMaterial,
} from './appearancePreferences';
export {
  MAX_CONTENT_MEASURE,
  MAX_SPACING_SCALE,
  MAX_UI_SCALE,
  MIN_CONTENT_MEASURE,
  MIN_SPACING_SCALE,
  MIN_UI_SCALE,
} from './appearancePreferences';
export { applyRootTokens } from './rootTokens';

/* ─────────────────────────────────────────────────────────────────────
 * 1. CORNERS
 * ───────────────────────────────────────────────────────────────────── */

/**
 * The four steps of the radius ladder. The shipped values live in
 * `RADIUS_PROFILE_LADDERS.graded` below — 6 / 10 / 16 / 24 at softness 1.0.
 */
export type RadiusStep = 'xs' | 'sm' | 'md' | 'lg' | 'xl';

/**
 * A radius profile is a per-step multiplier on the shipped ladder. `graded` is
 * identity, so the default rendering is byte-for-byte what shipped before.
 */
const RADIUS_PROFILE_LADDERS: Record<RadiusProfile, Record<RadiusStep, number>> = {
  graded: { xs: 4, sm: 6, md: 10, lg: 16, xl: 24 },
  // One meaning for "rounded": every surface shares the mid radius.
  uniform: { xs: 12, sm: 12, md: 12, lg: 12, xl: 12 },
  // Crisp small controls, markedly softer large surfaces.
  expressive: { xs: 3, sm: 4, md: 9, lg: 20, xl: 34 },
};

export const RADIUS_PROFILE_OPTIONS = [
  { id: 'graded', label: 'متدرّج', note: '٦ · ١٠ · ١٦ · ٢٤ — العلاقة الأصلية' },
  { id: 'uniform', label: 'موحّد', note: 'نصف قطر واحد لكل الأسطح' },
  { id: 'expressive', label: 'مُعبّر', note: 'عناصر صغيرة حادّة وأسطح كبيرة ناعمة' },
] as const satisfies readonly { id: RadiusProfile; label: string; note: string }[];

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

/* ─────────────────────────────────────────────────────────────────────
 * 2. DENSITY
 *
 * Geometry is stored as numeric pixels. uiScale is applied only when tokens are
 * generated, so changing the typography base never moves shared interface
 * chrome. `spacingScale` multiplies the breathing room alone — paddings, gaps
 * and gutters — leaving control heights and tap targets exactly where the
 * density level put them.
 * ───────────────────────────────────────────────────────────────────── */

export interface DensityLevel {
  id: string;
  label: string;
  note: string;
  cardPadding: number;
  cardPaddingCompact: number;
  controlHeight: number;
  tapSize: number;
  stackGap: number;
  stackGapSmall: number;
  gutter: number;
  rowIcon: number;
}

export const DENSITY_LEVELS = [
  {
    id: 'compact',
    label: 'مضغوط',
    note: 'أكثر محتوى في الشاشة',
    cardPadding: 12,
    cardPaddingCompact: 8,
    controlHeight: 40,
    tapSize: 44,
    stackGap: 16,
    stackGapSmall: 8,
    gutter: 14,
    rowIcon: 28,
  },
  {
    id: 'cozy',
    label: 'متوازن',
    note: 'الافتراضي',
    cardPadding: 16,
    cardPaddingCompact: 12,
    controlHeight: 44,
    tapSize: 44,
    stackGap: 24,
    stackGapSmall: 12,
    gutter: 16,
    rowIcon: 32,
  },
  {
    id: 'comfortable',
    label: 'مريح',
    note: 'مساحات أوسع ولمس أسهل',
    cardPadding: 20,
    cardPaddingCompact: 16,
    controlHeight: 48,
    tapSize: 48,
    stackGap: 32,
    stackGapSmall: 16,
    gutter: 20,
    rowIcon: 36,
  },
] as const satisfies readonly DensityLevel[];

export type DensityId = (typeof DENSITY_LEVELS)[number]['id'];
export const DEFAULT_DENSITY: DensityId = 'cozy';

export function resolveDensity(value: string | null | undefined): DensityId {
  return DENSITY_LEVELS.some((density) => density.id === value)
    ? (value as DensityId)
    : DEFAULT_DENSITY;
}

/* ─────────────────────────────────────────────────────────────────────
 * 3. CONTENT MEASURE
 * ───────────────────────────────────────────────────────────────────── */

export interface WidthOption {
  id: string;
  label: string;
  note: string;
  /**
   * Numeric pixel measure, `null` when the content should fill its container,
   * or `'custom'` when the value comes from `contentWidthCustom`.
   */
  max: number | null | 'custom';
}

export const WIDTH_OPTIONS = [
  { id: 'narrow', label: 'ضيّق', note: 'عمود قراءة مركّز', max: 432 },
  { id: 'standard', label: 'قياسي', note: 'الافتراضي', max: 512 },
  { id: 'wide', label: 'واسع', note: 'مساحة أكبر للجداول والقوائم', max: 608 },
  { id: 'full', label: 'كامل', note: 'يستخدم كل عرض الشاشة', max: null },
  { id: 'custom', label: 'مخصص', note: 'مقاس بالبكسل تحدده بنفسك', max: 'custom' },
] as const satisfies readonly WidthOption[];

export type WidthId = (typeof WIDTH_OPTIONS)[number]['id'];
export const DEFAULT_WIDTH: WidthId = 'standard';

export function resolveWidth(value: string | null | undefined): WidthId {
  return WIDTH_OPTIONS.some((width) => width.id === value) ? (value as WidthId) : DEFAULT_WIDTH;
}

/* ─────────────────────────────────────────────────────────────────────
 * 4. EDGES
 * ───────────────────────────────────────────────────────────────────── */

export interface BorderOption {
  id: string;
  label: string;
  note: string;
  alpha: number;
}

export const BORDER_OPTIONS = [
  { id: 'subtle', label: 'خفيّة', note: 'فواصل شبه صامتة', alpha: 0.36 },
  { id: 'standard', label: 'قياسية', note: 'الافتراضي', alpha: 0.6 },
  { id: 'defined', label: 'واضحة', note: 'حدود صريحة لكل سطح', alpha: 0.92 },
] as const satisfies readonly BorderOption[];

export type BorderId = (typeof BORDER_OPTIONS)[number]['id'];
export const DEFAULT_BORDER: BorderId = 'standard';

export function resolveBorder(value: string | null | undefined): BorderId {
  return BORDER_OPTIONS.some((border) => border.id === value)
    ? (value as BorderId)
    : DEFAULT_BORDER;
}

export const BORDER_WIDTH_PRESETS = [
  { value: 1, label: 'شعري' },
  { value: 1.5, label: 'متوسط' },
  { value: 2, label: 'عريض' },
] as const;

/** Relative volume of an in-surface row divider, as a factor of the border alpha. */
const DIVIDER_FACTORS: Record<DividerStyle, number> = {
  hairline: 0.9,
  soft: 0.55,
  none: 0,
};

export const DIVIDER_STYLE_OPTIONS = [
  { id: 'hairline', label: 'صريح', note: 'خط واضح بين كل صفّين' },
  { id: 'soft', label: 'ناعم', note: 'الافتراضي — فاصل هادئ' },
  { id: 'none', label: 'بدون', note: 'المسافة وحدها هي الفاصل' },
] as const satisfies readonly { id: DividerStyle; label: string; note: string }[];

/* ─────────────────────────────────────────────────────────────────────
 * 5. SCALE, MATERIAL, INTERACTION
 * ───────────────────────────────────────────────────────────────────── */

export const UI_SCALE_OPTIONS = [
  { value: 0.85, label: 'صغير' },
  { value: 1, label: 'قياسي' },
  { value: 1.1, label: 'واسع' },
  { value: 1.2, label: 'كبير' },
  { value: 1.35, label: 'ضخم' },
] as const;

export const UI_SCALE_PRESETS = UI_SCALE_OPTIONS;

export const SPACING_SCALE_PRESETS = [
  { value: 0.8, label: 'ضيّق' },
  { value: 1, label: 'قياسي' },
  { value: 1.2, label: 'مريح' },
  { value: 1.45, label: 'فسيح' },
] as const;

export const ADAPTIVE_LAYOUT_OPTIONS = [
  { value: true, label: 'تلقائي' },
  { value: false, label: 'ثابت' },
] as const;

export const SURFACE_MATERIAL_OPTIONS = [
  { id: 'solid', label: 'مصمت', alpha: 1, overlayAlpha: 1 },
  { id: 'soft', label: 'ناعم', alpha: 0.96, overlayAlpha: 0.98 },
  { id: 'airy', label: 'خفيف', alpha: 0.9, overlayAlpha: 0.94 },
] as const satisfies readonly {
  id: SurfaceMaterial;
  label: string;
  alpha: number;
  overlayAlpha: number;
}[];

export const SURFACE_MATERIALS = SURFACE_MATERIAL_OPTIONS;

export const INTERACTION_STYLE_OPTIONS = [
  { id: 'calm', label: 'هادئ', pressScale: 0.995, offset: 1, iconStroke: 1.75, focusWidth: 2 },
  { id: 'balanced', label: 'متوازن', pressScale: 0.98, offset: 2, iconStroke: 2, focusWidth: 2 },
  { id: 'lively', label: 'نابض', pressScale: 0.96, offset: 3, iconStroke: 2.25, focusWidth: 2.5 },
] as const satisfies readonly {
  id: InteractionStyle;
  label: string;
  pressScale: number;
  offset: number;
  iconStroke: number;
  focusWidth: number;
}[];

export const INTERACTION_STYLES = INTERACTION_STYLE_OPTIONS;

export const SCROLLBAR_STYLE_OPTIONS = [
  { id: 'auto', label: 'كامل', note: 'شريط تمرير عريض وواضح' },
  { id: 'thin', label: 'رقيق', note: 'الافتراضي — ٦ بكسل' },
  { id: 'hidden', label: 'مخفي', note: 'بلا شريط تمرير مرئي' },
] as const satisfies readonly { id: ScrollbarStyle; label: string; note: string }[];

/** Track width in px and thumb alpha per scrollbar style. */
const SCROLLBAR_METRICS: Record<ScrollbarStyle, { size: number; alpha: number }> = {
  auto: { size: 10, alpha: 0.26 },
  thin: { size: 6, alpha: 0.18 },
  hidden: { size: 0, alpha: 0 },
};

/** The shared page/panel header height in px at scale 1. */
const BASE_HEADER_HEIGHT = 56;

/* ─────────────────────────────────────────────────────────────────────
 * 6. PRESETS — complete configurations, not single knobs.
 * ───────────────────────────────────────────────────────────────────── */

export interface InterfacePreset {
  id: string;
  label: string;
  note: string;
  cornerSoftness: number;
  density: DensityId;
  width: WidthId;
  border: BorderId;
  surfaceLift: 'flat' | 'subtle' | 'lifted';
  uiScale: number;
  adaptiveLayout: boolean;
  surfaceMaterial: SurfaceMaterial;
  interactionStyle: InteractionStyle;
  reducedTransparency: boolean;
  strongerContrast: boolean;
  largeTouchTargets: boolean;
  clearerFocus: boolean;
  spacingScale: number;
  radiusProfile: RadiusProfile;
  borderWidth: number;
  dividerStyle: DividerStyle;
  iconWeightScale: number;
  rowIconScale: number;
  focusOffset: number;
  pressDepth: number;
  tapTargetMin: number;
  contentWidthCustom: number;
  headerScale: number;
  scrollbarStyle: ScrollbarStyle;
  safeAreaExtra: number;
}

const DEFAULT_ADVANCED = DEFAULT_ADVANCED_INTERFACE_PREFERENCES;

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
    ...DEFAULT_ADVANCED,
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
    ...DEFAULT_ADVANCED,
    spacingScale: 1.2,
    dividerStyle: 'none',
    headerScale: 1.05,
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
    ...DEFAULT_ADVANCED,
    spacingScale: 0.88,
    dividerStyle: 'hairline',
    borderWidth: 1,
    headerScale: 0.92,
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
    ...DEFAULT_ADVANCED,
    radiusProfile: 'uniform',
    iconWeightScale: 0.9,
  },
  {
    id: 'pulse',
    label: 'نبض',
    note: 'واجهة مرحة سريعة الاستجابة بلمسات جريئة',
    cornerSoftness: 1.35,
    density: 'cozy',
    width: 'standard',
    border: 'standard',
    surfaceLift: 'lifted',
    ...DEFAULT_ADVANCED,
    interactionStyle: 'lively',
    surfaceMaterial: 'airy',
    uiScale: 1.05,
    radiusProfile: 'expressive',
    pressDepth: 1.3,
    iconWeightScale: 1.15,
    rowIconScale: 1.12,
  },
  {
    id: 'studio',
    label: 'استوديو',
    note: 'مساحة عمل واسعة ومصقولة لصناعة المحتوى',
    cornerSoftness: 0.8,
    density: 'comfortable',
    width: 'custom',
    border: 'standard',
    surfaceLift: 'subtle',
    ...DEFAULT_ADVANCED,
    surfaceMaterial: 'soft',
    adaptiveLayout: true,
    contentWidthCustom: 720,
    spacingScale: 1.1,
    scrollbarStyle: 'auto',
    headerScale: 1.1,
  },
  {
    id: 'focus',
    label: 'تركيز',
    note: 'تباين ولمس وتركيز أوضح مع حركة هادئة',
    cornerSoftness: 0.65,
    density: 'comfortable',
    width: 'narrow',
    border: 'defined',
    surfaceLift: 'flat',
    ...DEFAULT_ADVANCED,
    interactionStyle: 'calm',
    surfaceMaterial: 'solid',
    strongerContrast: true,
    largeTouchTargets: true,
    clearerFocus: true,
    reducedTransparency: true,
    uiScale: 1.1,
    borderWidth: 1.5,
    dividerStyle: 'hairline',
    focusOffset: 4,
    tapTargetMin: 52,
    iconWeightScale: 1.15,
  },
  {
    id: 'oled',
    label: 'أوليد',
    note: 'أسطح مصمتة وحدود واضحة للشاشات الداكنة',
    cornerSoftness: 1,
    density: 'compact',
    width: 'standard',
    border: 'defined',
    surfaceLift: 'flat',
    ...DEFAULT_ADVANCED,
    surfaceMaterial: 'solid',
    reducedTransparency: true,
    strongerContrast: true,
    dividerStyle: 'hairline',
    scrollbarStyle: 'hidden',
  },
  {
    id: 'accessible',
    label: 'إتاحة',
    note: 'أكبر مقاس وأوسع لمس وأقوى تركيز في التطبيق',
    cornerSoftness: 1,
    density: 'comfortable',
    width: 'standard',
    border: 'defined',
    surfaceLift: 'subtle',
    ...DEFAULT_ADVANCED,
    uiScale: 1.2,
    spacingScale: 1.2,
    strongerContrast: true,
    largeTouchTargets: true,
    clearerFocus: true,
    reducedTransparency: true,
    borderWidth: 2,
    dividerStyle: 'hairline',
    focusOffset: 5,
    pressDepth: 0.6,
    tapTargetMin: 60,
    iconWeightScale: 1.25,
    rowIconScale: 1.25,
    headerScale: 1.2,
    scrollbarStyle: 'auto',
    safeAreaExtra: 12,
  },
  {
    id: 'dense',
    label: 'كثيف',
    note: 'أقصى محتوى ممكن — للشاشات الكبيرة والقوائم الطويلة',
    cornerSoftness: 0.6,
    density: 'compact',
    width: 'custom',
    border: 'subtle',
    surfaceLift: 'flat',
    ...DEFAULT_ADVANCED,
    uiScale: 0.9,
    spacingScale: 0.75,
    contentWidthCustom: 860,
    dividerStyle: 'soft',
    rowIconScale: 0.85,
    headerScale: 0.88,
    scrollbarStyle: 'thin',
  },
];

export interface InterfacePrefs {
  cornerSoftness: number;
  density: string;
  width: string;
  border: string;
  surfaceLift: string;
  uiScale?: number;
  adaptiveLayout?: boolean;
  surfaceMaterial?: SurfaceMaterial;
  interactionStyle?: InteractionStyle;
  reducedTransparency?: boolean;
  strongerContrast?: boolean;
  largeTouchTargets?: boolean;
  clearerFocus?: boolean;
  spacingScale?: number;
  radiusProfile?: RadiusProfile;
  borderWidth?: number;
  dividerStyle?: DividerStyle;
  iconWeightScale?: number;
  rowIconScale?: number;
  focusOffset?: number;
  pressDepth?: number;
  tapTargetMin?: number;
  contentWidthCustom?: number;
  headerScale?: number;
  scrollbarStyle?: ScrollbarStyle;
  safeAreaExtra?: number;
}

/** The preset id matching the current settings exactly, or null if tuned. */
export function matchInterfacePreset(prefs: InterfacePrefs): string | null {
  return (
    INTERFACE_PRESETS.find((preset) => {
      const geometryMatches =
        Math.abs(preset.cornerSoftness - clampCornerSoftness(prefs.cornerSoftness)) < 0.02 &&
        preset.density === resolveDensity(prefs.density) &&
        preset.width === resolveWidth(prefs.width) &&
        preset.border === resolveBorder(prefs.border) &&
        preset.surfaceLift === prefs.surfaceLift;
      if (!geometryMatches) return false;

      return ADVANCED_INTERFACE_KEYS.every((key) => {
        const value = prefs[key];
        if (value === undefined) return true;
        const target = preset[key];
        if (typeof value === 'number' && typeof target === 'number') {
          return Math.abs(value - target) < 0.005;
        }
        return value === target;
      });
    })?.id ?? null
  );
}

/* ─────────────────────────────────────────────────────────────────────
 * 7. TOKEN COMPILATION
 * ───────────────────────────────────────────────────────────────────── */

function round(value: number, precision = 2): number {
  const factor = 10 ** precision;
  return Math.round(value * factor) / factor;
}

function px(value: number, scale: number): string {
  return `${round(value * scale)}px`;
}

function alpha(value: number): string {
  return String(round(value, 3));
}

/**
 * The fully-resolved geometry of the interface, in the same units the tokens
 * are emitted in. The settings screen renders this so the user can read the
 * exact px value every control produces instead of guessing from a percentage.
 */
export interface ResolvedInterfaceGeometry {
  uiScale: number;
  spacingScale: number;
  radius: Record<RadiusStep, number>;
  cardPadding: number;
  cardPaddingCompact: number;
  controlHeight: number;
  tapSize: number;
  stackGap: number;
  stackGapSmall: number;
  gutter: number;
  rowIcon: number;
  headerHeight: number;
  contentMax: number | null;
  borderWidth: number;
  borderAlpha: number;
  dividerAlpha: number;
  materialAlpha: number;
  overlayAlpha: number;
  pressScale: number;
  pressOffset: number;
  iconStroke: number;
  focusWidth: number;
  focusOffset: number;
  scrollbarSize: number;
  safeAreaExtra: number;
  adaptiveLayout: boolean;
}

/** Resolve interface preferences into the exact numbers the tokens carry. */
export function resolveInterfaceGeometry(prefs: InterfacePrefs): ResolvedInterfaceGeometry {
  const uiScale = clampUiScale(prefs.uiScale ?? DEFAULT_ADVANCED.uiScale);
  const spacingScale = clampSpacingScale(prefs.spacingScale ?? DEFAULT_ADVANCED.spacingScale);
  const density = DENSITY_LEVELS.find((item) => item.id === resolveDensity(prefs.density))!;
  const width = WIDTH_OPTIONS.find((item) => item.id === resolveWidth(prefs.width))!;
  const border = BORDER_OPTIONS.find((item) => item.id === resolveBorder(prefs.border))!;

  const surfaceMaterial = sanitizeSurfaceMaterial(
    prefs.surfaceMaterial ?? DEFAULT_ADVANCED.surfaceMaterial,
  );
  const interactionStyle = sanitizeInteractionStyle(
    prefs.interactionStyle ?? DEFAULT_ADVANCED.interactionStyle,
  );
  const material = SURFACE_MATERIAL_OPTIONS.find((item) => item.id === surfaceMaterial)!;
  const interaction = INTERACTION_STYLE_OPTIONS.find((item) => item.id === interactionStyle)!;

  const adaptiveLayout = prefs.adaptiveLayout ?? DEFAULT_ADVANCED.adaptiveLayout;
  const reducedTransparency = prefs.reducedTransparency ?? DEFAULT_ADVANCED.reducedTransparency;
  const strongerContrast = prefs.strongerContrast ?? DEFAULT_ADVANCED.strongerContrast;
  const largeTouchTargets = prefs.largeTouchTargets ?? DEFAULT_ADVANCED.largeTouchTargets;
  const clearerFocus = prefs.clearerFocus ?? DEFAULT_ADVANCED.clearerFocus;

  const radiusProfile = sanitizeRadiusProfile(
    prefs.radiusProfile ?? DEFAULT_ADVANCED.radiusProfile,
  );
  const dividerStyle = sanitizeDividerStyle(prefs.dividerStyle ?? DEFAULT_ADVANCED.dividerStyle);
  const scrollbarStyle = sanitizeScrollbarStyle(
    prefs.scrollbarStyle ?? DEFAULT_ADVANCED.scrollbarStyle,
  );

  const borderWidth = clampBorderWidth(prefs.borderWidth ?? DEFAULT_ADVANCED.borderWidth);
  const iconWeightScale = prefs.iconWeightScale ?? DEFAULT_ADVANCED.iconWeightScale;
  const rowIconScale = prefs.rowIconScale ?? DEFAULT_ADVANCED.rowIconScale;
  const focusOffset = prefs.focusOffset ?? DEFAULT_ADVANCED.focusOffset;
  const pressDepth = prefs.pressDepth ?? DEFAULT_ADVANCED.pressDepth;
  const tapTargetMin = clampTapTarget(prefs.tapTargetMin ?? DEFAULT_ADVANCED.tapTargetMin);
  const contentWidthCustom = clampContentMeasure(
    prefs.contentWidthCustom ?? DEFAULT_ADVANCED.contentWidthCustom,
  );
  const headerScale = prefs.headerScale ?? DEFAULT_ADVANCED.headerScale;

  const softness = clampCornerSoftness(prefs.cornerSoftness);
  const ladder = RADIUS_PROFILE_LADDERS[radiusProfile];

  const borderAlpha = Math.min(1, border.alpha * (strongerContrast ? 1.3 : 1));

  // Touch floor: the explicit minimum, the density's own tap size, and the
  // accessibility switch's 52px floor all compete — the largest wins.
  const touchSize = Math.max(density.tapSize, tapTargetMin, largeTouchTargets ? 52 : 0);
  const controlHeight = Math.max(density.controlHeight, largeTouchTargets ? touchSize : 0);

  // Press physics: `pressScale` is expressed as a depth away from 1 so the
  // multiplier behaves linearly and 0 means "no movement at all".
  const pressScale = round(1 - (1 - interaction.pressScale) * pressDepth, 4);
  const pressOffset = round(interaction.offset * pressDepth, 2);

  const focusWidth = clearerFocus ? Math.max(3, interaction.focusWidth) : interaction.focusWidth;

  const contentMax =
    width.max === null ? null : width.max === 'custom' ? contentWidthCustom : width.max;

  return {
    uiScale,
    spacingScale,
    radius: {
      xs: round(ladder.xs * softness * uiScale),
      sm: round(ladder.sm * softness * uiScale),
      md: round(ladder.md * softness * uiScale),
      lg: round(ladder.lg * softness * uiScale),
      xl: round(ladder.xl * softness * uiScale),
    },
    cardPadding: round(density.cardPadding * spacingScale * uiScale),
    cardPaddingCompact: round(density.cardPaddingCompact * spacingScale * uiScale),
    controlHeight: round(controlHeight * uiScale),
    tapSize: round(touchSize * uiScale),
    stackGap: round(density.stackGap * spacingScale * uiScale),
    stackGapSmall: round(density.stackGapSmall * spacingScale * uiScale),
    gutter: round(density.gutter * spacingScale * uiScale),
    rowIcon: round(density.rowIcon * rowIconScale * uiScale),
    headerHeight: round(BASE_HEADER_HEIGHT * headerScale * uiScale),
    contentMax: contentMax === null ? null : round(contentMax * uiScale, 0),
    borderWidth: round(borderWidth, 2),
    borderAlpha: round(borderAlpha, 3),
    dividerAlpha: round(borderAlpha * DIVIDER_FACTORS[dividerStyle], 3),
    materialAlpha: reducedTransparency ? 1 : material.alpha,
    overlayAlpha: reducedTransparency ? 1 : material.overlayAlpha,
    pressScale,
    pressOffset,
    iconStroke: round(interaction.iconStroke * iconWeightScale, 2),
    focusWidth: round(focusWidth * uiScale, 2),
    focusOffset: round(focusOffset, 1),
    scrollbarSize: SCROLLBAR_METRICS[scrollbarStyle].size,
    // Defensive clamp: `resolveInterfaceGeometry` is public and may be handed a
    // raw object that never passed through the preference sanitizer.
    safeAreaExtra: Math.min(
      MAX_SAFE_AREA_EXTRA,
      Math.max(
        MIN_SAFE_AREA_EXTRA,
        Math.round(prefs.safeAreaExtra ?? DEFAULT_ADVANCED.safeAreaExtra),
      ),
    ),
    adaptiveLayout,
  };
}

/** Resolve interface preferences into data-friendly root custom properties. */
export function interfaceTokens(prefs: InterfacePrefs): Record<string, string> {
  const g = resolveInterfaceGeometry(prefs);
  const scrollbarStyle = sanitizeScrollbarStyle(
    prefs.scrollbarStyle ?? DEFAULT_ADVANCED.scrollbarStyle,
  );
  const dividerStyle = sanitizeDividerStyle(prefs.dividerStyle ?? DEFAULT_ADVANCED.dividerStyle);
  const radiusProfile = sanitizeRadiusProfile(
    prefs.radiusProfile ?? DEFAULT_ADVANCED.radiusProfile,
  );
  const reducedTransparency = prefs.reducedTransparency ?? DEFAULT_ADVANCED.reducedTransparency;
  const strongerContrast = prefs.strongerContrast ?? DEFAULT_ADVANCED.strongerContrast;
  const largeTouchTargets = prefs.largeTouchTargets ?? DEFAULT_ADVANCED.largeTouchTargets;
  const clearerFocus = prefs.clearerFocus ?? DEFAULT_ADVANCED.clearerFocus;
  const metrics = SCROLLBAR_METRICS[scrollbarStyle];

  return {
    '--ui-scale': String(g.uiScale),
    '--ui-spacing-scale': String(g.spacingScale),

    '--r-xs': `${g.radius.xs}px`,
    '--r-sm': `${g.radius.sm}px`,
    '--r-md': `${g.radius.md}px`,
    '--r-lg': `${g.radius.lg}px`,
    '--r-xl': `${g.radius.xl}px`,
    '--radius': `${g.radius.lg}px`,
    '--ui-radius-profile':
      radiusProfile === 'graded' ? '0' : radiusProfile === 'uniform' ? '1' : '2',

    '--ui-pad-card': `${g.cardPadding}px`,
    '--ui-pad-card-compact': `${g.cardPaddingCompact}px`,
    '--ui-control-h': `${g.controlHeight}px`,
    '--ui-button-sm-h': px(40, g.uiScale),
    '--ui-button-h': px(44, g.uiScale),
    '--ui-button-lg-h': px(48, g.uiScale),
    '--ui-tap': `${g.tapSize}px`,
    '--ui-touch-min': `${g.tapSize}px`,
    '--ui-stack-gap': `${g.stackGap}px`,
    '--ui-stack-gap-sm': `${g.stackGapSmall}px`,
    '--ui-gutter': g.adaptiveLayout
      ? `clamp(${round(g.gutter * 0.75)}px, 4vw, ${round(g.gutter * 1.5)}px)`
      : `${g.gutter}px`,
    '--ui-row-icon': `${g.rowIcon}px`,
    '--ui-header-h': `${g.headerHeight}px`,
    '--ui-content-max': g.contentMax === null ? '100%' : `${g.contentMax}px`,
    '--ui-safe-extra': `${g.safeAreaExtra}px`,

    '--ui-border-width': `${g.borderWidth}px`,
    '--ui-border-alpha': alpha(g.borderAlpha),
    '--ui-border-soft-alpha': alpha(g.borderAlpha * 0.73),
    '--ui-divider-alpha': alpha(g.dividerAlpha),
    '--ui-divider-width': dividerStyle === 'none' ? '0px' : `${g.borderWidth}px`,
    '--ui-border-strong-alpha': alpha(Math.min(1, g.borderAlpha * 1.45)),

    '--ui-material-alpha': String(g.materialAlpha),
    '--ui-surface-alpha': String(g.materialAlpha),
    '--ui-material-overlay-alpha': String(g.overlayAlpha),

    '--ui-interaction-scale': String(g.pressScale),
    '--ui-interaction-offset': `${g.pressOffset}px`,
    '--ui-icon-stroke': String(g.iconStroke),
    '--ui-focus-width': `${g.focusWidth}px`,
    '--ui-focus-offset': `${g.focusOffset}px`,

    '--ui-scrollbar-size': `${metrics.size}px`,
    '--ui-scrollbar-alpha': alpha(metrics.alpha),
    '--ui-scrollbar-hover-alpha': alpha(Math.min(1, metrics.alpha * 1.8)),
    // Firefox only accepts the keywords, so the keyword itself travels as a
    // custom property: `scrollbar-width: var(--ui-scrollbar-ff)`.
    '--ui-scrollbar-ff':
      scrollbarStyle === 'hidden' ? 'none' : scrollbarStyle === 'auto' ? 'auto' : 'thin',

    '--ui-adaptive-layout': g.adaptiveLayout ? '1' : '0',
    '--ui-adaptive-gutter-factor': g.adaptiveLayout ? '1' : '0',
    '--ui-reduced-transparency': reducedTransparency ? '1' : '0',
    '--ui-stronger-contrast': strongerContrast ? '1' : '0',
    '--ui-large-touch-targets': largeTouchTargets ? '1' : '0',
    '--ui-clearer-focus': clearerFocus ? '1' : '0',
  };
}

/** Backward-compatible name; all writes now go through the persistent root cache. */
export const applyCssVars = applyRootTokens;
