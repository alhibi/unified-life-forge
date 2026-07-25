/**
 * The typography system — single source of truth.
 *
 * This file used to describe six typefaces and three "sizes". The sizes barely
 * worked: they only set `html { font-size }`, while every type token in
 * tailwind.config.ts was a fixed pixel value, so choosing "كبير" moved almost
 * nothing on screen. Typography is now a real system with four independent
 * dimensions, all of which actually reach the pixels:
 *
 *   • PAIRING   a display face for headings and a separate body face for text.
 *               One typeface doing both jobs is the exception, not the rule.
 *   • SIZE      the base size, in px, that every other size is derived from.
 *   • RATIO     how fast the scale grows from caption to display. A compact
 *               ratio suits dense data screens; an airy one suits reading.
 *   • LEADING   line height, expressed as a multiplier — the single most
 *               important comfort control for Arabic, whose ascenders and
 *               descenders collide long before Latin's do.
 *
 * Every family listed here is actually requested by index.html (or self-hosted
 * through @fontsource). Do not add an entry without loading it.
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

export const FONT_OPTIONS: readonly FontOption[] = [
  {
    id: 'ibm-plex',
    label: 'آي بي إم بلكس عربي',
    family: `'IBM Plex Sans Arabic', ${SANS_FALLBACK}`,
    note: 'واضح ومحايد — الأفضل للقراءة الطويلة',
    display: true,
    body: true,
  },
  {
    id: 'cairo',
    label: 'القاهرة',
    family: `'Cairo', 'IBM Plex Sans Arabic', ${SANS_FALLBACK}`,
    note: 'حروف عريضة ومريحة على الشاشات الصغيرة',
    display: true,
    body: true,
  },
  {
    id: 'tajawal',
    label: 'تجوال',
    family: `'Tajawal', 'IBM Plex Sans Arabic', ${SANS_FALLBACK}`,
    note: 'هندسي وحديث — قويّ في العناوين',
    display: true,
    body: true,
  },
  {
    id: 'readex',
    label: 'ريدكس برو',
    family: `'Readex Pro', 'IBM Plex Sans Arabic', ${SANS_FALLBACK}`,
    note: 'فراغات واسعة تريح العين',
    display: true,
    body: true,
  },
  {
    id: 'amiri',
    label: 'أميري',
    family: "'Amiri', 'Scheherazade New', serif",
    note: 'نسخ تقليدي — رائع للعناوين والشعر، ثقيل للمتون الطويلة',
    display: true,
    body: true,
  },
  {
    id: 'plex-mono',
    label: 'بلكس مونو',
    family: `'IBM Plex Mono', 'IBM Plex Sans Arabic', ${SANS_FALLBACK}, monospace`,
    note: 'أرقام ثابتة العرض — للأوقات والجداول',
    display: false,
    body: true,
  },
] as const;

export const DEFAULT_FONT_ID: FontId = 'ibm-plex';
export const DEFAULT_DISPLAY_FONT_ID: FontId = 'ibm-plex';

/** Font ids that shipped in earlier builds and must keep resolving. */
const LEGACY_ALIASES: Record<string, FontId> = {
  default: 'ibm-plex',
  inter: 'ibm-plex',
  noto: 'ibm-plex',
  'noto-arabic': 'ibm-plex',
};

/** Coerce any stored value (including retired ids) to a valid font id. */
export function resolveFontId(value: string | null | undefined): FontId {
  if (!value) return DEFAULT_FONT_ID;
  if (FONT_OPTIONS.some((f) => f.id === value)) return value as FontId;
  return LEGACY_ALIASES[value] ?? DEFAULT_FONT_ID;
}

export function fontStackFor(value: string | null | undefined): string {
  const id = resolveFontId(value);
  return (FONT_OPTIONS.find((f) => f.id === id) ?? FONT_OPTIONS[0]).family;
}

export function fontOptionFor(value: string | null | undefined): FontOption {
  const id = resolveFontId(value);
  return FONT_OPTIONS.find((f) => f.id === id) ?? FONT_OPTIONS[0];
}

// ─── Pairings ───────────────────────────────────────────────
/**
 * Curated display/body combinations. Choosing two faces well is a design
 * decision most people should not have to make, so the good answers ship —
 * while the two pickers stay available underneath for anyone who wants them.
 */
export interface FontPairing {
  id: string;
  label: string;
  note: string;
  display: FontId;
  body: FontId;
}

export const FONT_PAIRINGS: readonly FontPairing[] = [
  {
    id: 'unified',
    label: 'نسق واحد',
    note: 'خط واحد للعناوين والنصوص — أهدأ خيار',
    display: 'ibm-plex',
    body: 'ibm-plex',
  },
  {
    id: 'editorial',
    label: 'تحريري',
    note: 'عناوين بأميري النسخي على متن واضح',
    display: 'amiri',
    body: 'ibm-plex',
  },
  {
    id: 'modern',
    label: 'حديث',
    note: 'عناوين هندسية حادّة على متن محايد',
    display: 'tajawal',
    body: 'ibm-plex',
  },
  {
    id: 'gentle',
    label: 'هادئ',
    note: 'عناوين عريضة على متن واسع الفراغات',
    display: 'cairo',
    body: 'readex',
  },
] as const;

/** The pairing id matching the current pair, or `null` for a custom pair. */
export function matchPairing(display: string, body: string): string | null {
  const d = resolveFontId(display);
  const b = resolveFontId(body);
  return FONT_PAIRINGS.find((p) => p.display === d && p.body === b)?.id ?? null;
}

// ─── Base size ──────────────────────────────────────────────
/**
 * The base size scales only the canonical type tokens. The document root stays
 * at 16px so rem-based interface geometry does not move with text preferences.
 * `rootSize` remains on each option as a compatibility field.
 */
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
/**
 * Selectable weights. 300 was removed deliberately: light Arabic strokes at
 * the app's body sizes render too thin to read comfortably, and no requested
 * family ships a 300 Arabic face (the browser was faking it).
 */
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
/**
 * The seven canonical type steps, as exponents of the chosen ratio.
 *
 * These exponents are not invented: they are the app's existing pixel scale
 * (11 · 12 · 13 · 14 · 16 · 18 · 24 at a 16px base) expressed as powers of
 * 1.2. So at the default ratio and base the rendered sizes are *identical* to
 * what shipped before — changing the ratio then compresses or expands the
 * spread around `lead`, which stays anchored at 1× the base.
 */
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

/** Compute the scale in rem against a fixed 16px document root. */
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
  /** CSS custom properties to write on the document root. */
  vars: Record<string, string>;
  /** Compatibility field. Always 16px so typography cannot resize geometry. */
  rootSize: string;
  /** `html { font-weight }` — inherited by everything that does not override it. */
  rootWeight: string;
}

/**
 * Resolve a full set of typography preferences into the tokens that render it.
 * Pure — the DOM write lives in AppContext, so this stays testable.
 */
export function typographyTokens(prefs: TypographyPrefs): TypographyApplication {
  const scale = computeTypeScale(resolveTypeRatio(prefs.ratio), resolveFontSize(prefs.size));
  const leading =
    TYPE_LEADINGS.find((l) => l.id === resolveTypeLeading(prefs.leading))?.leading ?? 1.6;

  const vars: Record<string, string> = {
    '--font-body': fontStackFor(prefs.bodyFont),
    '--font-display': fontStackFor(prefs.displayFont),
    '--type-leading': String(leading),
    // Headings take three quarters of the body leading. At the default 1.6 that
    // is exactly the 1.2 the type scale shipped with, and it keeps the
    // relationship intact when the user asks for roomier text.
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
