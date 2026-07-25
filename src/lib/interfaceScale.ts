import {
  clampUiScale,
  DEFAULT_ADVANCED_INTERFACE_PREFERENCES,
  type InteractionStyle,
  sanitizeInteractionStyle,
  sanitizeSurfaceMaterial,
  type SurfaceMaterial,
} from './appearancePreferences';
import { applyRootTokens } from './rootTokens';

export type {
  AdvancedInterfacePreferences,
  InteractionStyle,
  SurfaceMaterial,
} from './appearancePreferences';
export { applyRootTokens } from './rootTokens';

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

// Geometry is stored as numeric pixels. uiScale is applied only when tokens are
// generated, so changing the typography base never moves shared interface chrome.
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

export interface WidthOption {
  id: string;
  label: string;
  note: string;
  /** Numeric pixel measure, or null when the content should fill its container. */
  max: number | null;
}

export const WIDTH_OPTIONS = [
  { id: 'narrow', label: 'ضيّق', note: 'عمود قراءة مركّز', max: 432 },
  { id: 'standard', label: 'قياسي', note: 'الافتراضي', max: 512 },
  { id: 'wide', label: 'واسع', note: 'مساحة أكبر للجداول والقوائم', max: 608 },
  { id: 'full', label: 'كامل', note: 'يستخدم كل عرض الشاشة', max: null },
] as const satisfies readonly WidthOption[];

export type WidthId = (typeof WIDTH_OPTIONS)[number]['id'];
export const DEFAULT_WIDTH: WidthId = 'standard';

export function resolveWidth(value: string | null | undefined): WidthId {
  return WIDTH_OPTIONS.some((width) => width.id === value) ? (value as WidthId) : DEFAULT_WIDTH;
}

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

export const UI_SCALE_OPTIONS = [
  { value: 0.85, label: 'صغير' },
  { value: 1, label: 'قياسي' },
  { value: 1.1, label: 'واسع' },
  { value: 1.2, label: 'كبير' },
] as const;

export const UI_SCALE_PRESETS = UI_SCALE_OPTIONS;

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
  },
  {
    id: 'studio',
    label: 'استوديو',
    note: 'مساحة عمل واسعة ومصقولة لصناعة المحتوى',
    cornerSoftness: 0.8,
    density: 'comfortable',
    width: 'wide',
    border: 'standard',
    surfaceLift: 'subtle',
    ...DEFAULT_ADVANCED,
    surfaceMaterial: 'soft',
    adaptiveLayout: true,
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
}

const advancedKeys: readonly (keyof typeof DEFAULT_ADVANCED)[] = [
  'uiScale',
  'adaptiveLayout',
  'surfaceMaterial',
  'interactionStyle',
  'reducedTransparency',
  'strongerContrast',
  'largeTouchTargets',
  'clearerFocus',
];

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

      return advancedKeys.every((key) => prefs[key] === undefined || preset[key] === prefs[key]);
    })?.id ?? null
  );
}

function px(value: number, scale: number): string {
  return `${Math.round(value * scale * 100) / 100}px`;
}

/** Resolve interface preferences into data-friendly root custom properties. */
export function interfaceTokens(prefs: InterfacePrefs): Record<string, string> {
  const uiScale = clampUiScale(prefs.uiScale ?? DEFAULT_ADVANCED.uiScale);
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
  const borderAlpha = Math.min(1, border.alpha * (strongerContrast ? 1.3 : 1));
  const radius = (base: number) => px(base * clampCornerSoftness(prefs.cornerSoftness), uiScale);
  const touchSize = largeTouchTargets ? Math.max(density.tapSize, 52) : density.tapSize;
  const controlHeight = largeTouchTargets
    ? Math.max(density.controlHeight, touchSize)
    : density.controlHeight;
  const materialAlpha = reducedTransparency ? 1 : material.alpha;
  const overlayAlpha = reducedTransparency ? 1 : material.overlayAlpha;

  return {
    '--ui-scale': String(uiScale),
    '--r-sm': radius(RADIUS_LADDER.sm),
    '--r-md': radius(RADIUS_LADDER.md),
    '--r-lg': radius(RADIUS_LADDER.lg),
    '--r-xl': radius(RADIUS_LADDER.xl),
    '--radius': radius(RADIUS_LADDER.lg),
    '--ui-pad-card': px(density.cardPadding, uiScale),
    '--ui-pad-card-compact': px(density.cardPaddingCompact, uiScale),
    '--ui-control-h': px(controlHeight, uiScale),
    '--ui-button-sm-h': px(40, uiScale),
    '--ui-button-h': px(44, uiScale),
    '--ui-button-lg-h': px(48, uiScale),
    '--ui-tap': px(touchSize, uiScale),
    '--ui-touch-min': px(touchSize, uiScale),
    '--ui-stack-gap': px(density.stackGap, uiScale),
    '--ui-stack-gap-sm': px(density.stackGapSmall, uiScale),
    '--ui-gutter': adaptiveLayout
      ? `clamp(${px(density.gutter * 0.75, uiScale)}, 4vw, ${px(density.gutter * 1.5, uiScale)})`
      : px(density.gutter, uiScale),
    '--ui-row-icon': px(density.rowIcon, uiScale),
    '--ui-content-max': width.max === null ? '100%' : px(width.max, uiScale),
    '--ui-border-alpha': String(Math.round(borderAlpha * 1000) / 1000),
    '--ui-border-soft-alpha': String(Math.round(borderAlpha * 0.73 * 1000) / 1000),
    '--ui-divider-alpha': String(Math.round(borderAlpha * 0.55 * 1000) / 1000),
    '--ui-border-strong-alpha': String(Math.min(1, Math.round(borderAlpha * 1.45 * 1000) / 1000)),
    '--ui-material-alpha': String(materialAlpha),
    '--ui-surface-alpha': String(materialAlpha),
    '--ui-material-overlay-alpha': String(overlayAlpha),
    '--ui-interaction-scale': String(interaction.pressScale),
    '--ui-interaction-offset': px(interaction.offset, uiScale),
    '--ui-icon-stroke': String(interaction.iconStroke),
    '--ui-focus-width': px(
      clearerFocus ? Math.max(3, interaction.focusWidth) : interaction.focusWidth,
      uiScale,
    ),
    '--ui-adaptive-layout': adaptiveLayout ? '1' : '0',
    '--ui-adaptive-gutter-factor': adaptiveLayout ? '1' : '0',
    '--ui-reduced-transparency': reducedTransparency ? '1' : '0',
    '--ui-stronger-contrast': strongerContrast ? '1' : '0',
    '--ui-large-touch-targets': largeTouchTargets ? '1' : '0',
    '--ui-clearer-focus': clearerFocus ? '1' : '0',
  };
}

/** Backward-compatible name; all writes now go through the persistent root cache. */
export const applyCssVars = applyRootTokens;
