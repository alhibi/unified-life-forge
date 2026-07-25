/**
 * Single source of truth for the app's selectable typefaces.
 *
 * Before this file there were two competing definitions:
 *   • `AppContext`'s `fontMap` (7 ids, `default` → IBM Plex Sans Arabic)
 *   • `FontSettings`'s `FONTS` array (5 ids, `default` → Inter)
 * …and the shipped default (`plex-mono`) was not even present in the
 * picker, so the font settings screen opened with nothing selected.
 *
 * Every family listed here is actually requested by index.html (or
 * self-hosted through @fontsource). Do not add an entry without loading it.
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
}

const SANS_FALLBACK = "system-ui, -apple-system, 'Segoe UI', sans-serif";

export const FONT_OPTIONS: readonly FontOption[] = [
  {
    id: 'ibm-plex',
    label: 'آي بي إم بلكس عربي',
    family: `'IBM Plex Sans Arabic', ${SANS_FALLBACK}`,
    note: 'واضح ومحايد — الأفضل للقراءة الطويلة',
  },
  {
    id: 'cairo',
    label: 'القاهرة',
    family: `'Cairo', 'IBM Plex Sans Arabic', ${SANS_FALLBACK}`,
    note: 'حروف عريضة ومريحة على الشاشات الصغيرة',
  },
  {
    id: 'tajawal',
    label: 'تجوال',
    family: `'Tajawal', 'IBM Plex Sans Arabic', ${SANS_FALLBACK}`,
    note: 'هندسي وحديث',
  },
  {
    id: 'readex',
    label: 'ريدكس برو',
    family: `'Readex Pro', 'IBM Plex Sans Arabic', ${SANS_FALLBACK}`,
    note: 'فراغات واسعة تريح العين',
  },
  {
    id: 'amiri',
    label: 'أميري',
    family: "'Amiri', 'Scheherazade New', serif",
    note: 'نسخ تقليدي — مناسب للقرآن والشعر',
  },
  {
    id: 'plex-mono',
    label: 'بلكس مونو',
    family: `'IBM Plex Mono', 'IBM Plex Sans Arabic', ${SANS_FALLBACK}, monospace`,
    note: 'أرقام ثابتة العرض — للأوقات والجداول',
  },
] as const;

export const DEFAULT_FONT_ID: FontId = 'ibm-plex';

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

/** Root font sizes for the three size steps. */
export const FONT_SIZE_STEPS = [
  { id: 'small', label: 'صغير', rootSize: '15px', scale: 0.94 },
  { id: 'medium', label: 'متوسط', rootSize: '16px', scale: 1 },
  { id: 'large', label: 'كبير', rootSize: '18px', scale: 1.12 },
] as const;

export type FontSizeId = (typeof FONT_SIZE_STEPS)[number]['id'];

export function resolveFontSize(value: string | null | undefined): FontSizeId {
  return FONT_SIZE_STEPS.some((s) => s.id === value) ? (value as FontSizeId) : 'medium';
}

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
