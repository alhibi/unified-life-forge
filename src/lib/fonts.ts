/**
 * The typography system — single source of truth.
 *
 * This file defines the visual typography system of amv.life, which now enforces
 * "Inter Display" as the sole typeface across the app. Headings and body are
 * differentiated by weight/size, not by swapping families.
 */

export type FontId = 'ibm-plex' | 'cairo' | 'tajawal' | 'readex' | 'amiri' | 'plex-mono';

export interface FontOption {
  id: FontId;
  /** Arabic display name shown in the picker. */
  label: string;
  /** Full CSS font stack. */
  family: string;
  /** Short note about when this face is the right pick. */
  note: string;
  /** Suited to headings — high contrast, distinctive at large sizes. */
  display: boolean;
  /** Suited to long-form body text at 14–16px. */
  body: boolean;
}

const SANS_FALLBACK = "system-ui, -apple-system, 'Segoe UI', sans-serif";

// Inter Display is the sole typeface.
// We map all ID selections to this unified stack to guarantee its exclusive application.
const INTER_DISPLAY_STACK = `'Inter', 'Inter Display', 'IBM Plex Sans Arabic', ${SANS_FALLBACK}`;

export const FONT_OPTIONS: readonly FontOption[] = [
  {
    id: 'ibm-plex',
    label: 'إنتر ديسبلاي (الافتراضي)',
    family: INTER_DISPLAY_STACK,
    note: 'الخط الموحد للتطبيق بالكامل — يتميز بالوضوح والتناسق الفائق',
    display: true,
    body: true,
  },
] as const;

export const DEFAULT_FONT_ID: FontId = 'ibm-plex';
export const DEFAULT_DISPLAY_FONT_ID: FontId = 'ibm-plex';

/** Coerce any stored value to the unified Inter Display font id. */
export function resolveFontId(_value: string | null | undefined): FontId {
  return 'ibm-plex';
}

export function fontStackFor(_value: string | null | undefined): string {
  return INTER_DISPLAY_STACK;
}

export function fontOptionFor(_value: string | null | undefined): FontOption {
  return FONT_OPTIONS[0];
}

// ─── Pairings ───────────────────────────────────────────────
export interface FontPairing {
  id: string;
  label: string;
  note: string;
  display: FontId;
  body: FontId;
}

// One pairing: Inter Display exclusively
export const FONT_PAIRINGS: readonly FontPairing[] = [
  {
    id: 'unified',
    label: 'إنتر ديسبلاي الموحد',
    note: 'خط موحد للعناوين والنصوص — التزاماً بهوية التطبيق الأنيقة',
    display: 'ibm-plex',
    body: 'ibm-plex',
  },
] as const;

export function matchPairing(_display: string, _body: string): string | null {
  return 'unified';
}

// ─── Base size ──────────────────────────────────────────────
export const FONT_SIZE_STEPS = [
  { id: 'small', label: 'صغير', rootSize: '16px', base: 15, multiplier: 15 / 16 },
  { id: 'medium', label: 'متوسط', rootSize: '16px', base: 16, multiplier: 1 },
  { id: 'plus', label: 'مكبّر', rootSize: '16px', base: 17, multiplier: 17 / 16 },
  { id: 'large', label: 'كبير', rootSize: '16px', base: 18, multiplier: 18 / 16 },
  { id: 'xl', label: 'موسّع', rootSize: '16px', base: 19, multiplier: 19 / 16 },
] as const;

export type FontSizeId = (typeof FONT_SIZE_STEPS)[number]['id'];

export function resolveFontSize(value: string | null | undefined): FontSizeId {
  return FONT_SIZE_STEPS.some((s) => s.id === value) ? (value as FontSizeId) : 'medium';
}

export function fontSizeStepFor(value: string | null | undefined) {
  const id = resolveFontSize(value);
  return FONT_SIZE_STEPS.find((s) => s.id === id) ?? FONT_SIZE_STEPS[1];
}

// ─── Scale ratio ────────────────────────────────────────────
export const TYPE_RATIOS = [
  { id: 'compact', label: 'مضغوط', ratio: 1.125, note: 'فروق صغيرة — أكثر معلومات في الشاشة' },
  { id: 'balanced', label: 'متوازن', ratio: 1.2, note: 'المقياس المعتمد في التطبيق' },
  { id: 'airy', label: 'واضح', ratio: 1.28, note: 'تفاوت أوسع — عناوين أبرز' },
] as const;

export type TypeRatioId = (typeof TYPE_RATIOS)[number]['id'];

export function resolveTypeRatio(value: string | null | undefined): TypeRatioId {
  return TYPE_RATIOS.some((r) => r.id === value) ? (value as TypeRatioId) : 'balanced';
}

// ─── Leading ────────────────────────────────────────────────
export const TYPE_LEADINGS = [
  { id: 'tight', label: 'مضغوط', leading: 1.45, note: 'أسطر متقاربة' },
  { id: 'normal', label: 'عادي', leading: 1.6, note: 'الافتراضي — مناسب للعربية' },
  { id: 'relaxed', label: 'مريح', leading: 1.78, note: 'أوسع تنفّساً للقراءة الطويلة' },
] as const;

export type TypeLeadingId = (typeof TYPE_LEADINGS)[number]['id'];

export function resolveTypeLeading(value: string | null | undefined): TypeLeadingId {
  return TYPE_LEADINGS.some((l) => l.id === value) ? (value as TypeLeadingId) : 'normal';
}

// ─── Weight ─────────────────────────────────────────────────
export const FONT_WEIGHTS = [
  { value: 400, label: 'عادي' },
  { value: 500, label: 'متوسط' },
  { value: 600, label: 'نصف سميك' },
  { value: 700, label: 'سميك' },
] as const;

export const MIN_FONT_WEIGHT = 400;
export const MAX_FONT_WEIGHT = 700;

export function clampFontWeight(value: number): number {
  if (!Number.isFinite(value)) return MIN_FONT_WEIGHT;
  return Math.min(MAX_FONT_WEIGHT, Math.max(MIN_FONT_WEIGHT, Math.round(value / 100) * 100));
}

// ─── The scale itself ───────────────────────────────────────
const TYPE_STEPS = [
  { name: 'micro', exponent: -2.055 },
  { name: 'mini', exponent: -1.578 },
  { name: 'meta', exponent: -1.139 },
  { name: 'body', exponent: -0.732 },
  { name: 'lead', exponent: 0 },
  { name: 'title', exponent: 0.646 },
  { name: 'display', exponent: 2.224 },
] as const;

export type TypeStepName = (typeof TYPE_STEPS)[number]['name'];

export function computeTypeScale(
  ratioId: TypeRatioId,
  baseSize: FontSizeId | number = 16,
): Record<TypeStepName, string> {
  const ratio = TYPE_RATIOS.find((r) => r.id === resolveTypeRatio(ratioId))?.ratio ?? 1.2;
  const requestedBase = typeof baseSize === 'number' ? baseSize : fontSizeStepFor(baseSize).base;
  const multiplier = Number.isFinite(requestedBase) ? requestedBase / 16 : 1;
  const out = {} as Record<TypeStepName, string>;
  for (const step of TYPE_STEPS) {
    const rem = Math.round(ratio ** step.exponent * multiplier * 10000) / 10000;
    out[step.name] = `${rem}rem`;
  }
  return out;
}

export interface TypographyPrefs {
  bodyFont: string;
  displayFont: string;
  size: string;
  ratio: string;
  leading: string;
  weight: number;
  opacity: number;
}

export interface TypographyApplication {
  vars: Record<string, string>;
  rootSize: string;
  rootWeight: string;
}

export function typographyTokens(prefs: TypographyPrefs): TypographyApplication {
  const sizeStep = fontSizeStepFor(resolveFontSize(prefs.size));
  const scale = computeTypeScale(resolveTypeRatio(prefs.ratio), sizeStep.id);
  const leading =
    TYPE_LEADINGS.find((l) => l.id === resolveTypeLeading(prefs.leading))?.leading ?? 1.6;

  const vars: Record<string, string> = {
    '--font-body': INTER_DISPLAY_STACK,
    '--font-display': INTER_DISPLAY_STACK,
    '--font-weight': String(clampFontWeight(prefs.weight)),
    '--type-base-scale': String(Math.round(sizeStep.multiplier * 10000) / 10000),
    '--type-leading': String(leading),
    '--type-leading-tight': String(Math.round(leading * 0.75 * 1000) / 1000),
    '--text-opacity': String(prefs.opacity),
  };
  for (const [name, value] of Object.entries(scale)) vars[`--fs-${name}`] = value;

  return {
    vars,
    rootSize: '16px',
    rootWeight: String(clampFontWeight(prefs.weight)),
  };
}
