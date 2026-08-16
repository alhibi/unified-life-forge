/**
 * Key maps and geometric utilities for the in-app soft keyboard.
 *
 * Rows are key arrays ordered strictly from LEFT to RIGHT as seen on standard physical
 * and Gboard keyboards. `alt` is the shifted / long-press character. Popups provide
 * expandable multi-character selection menus on long-press (Gboard style).
 */

export type LayoutId = 'ar' | 'en' | 'num' | 'sym' | 'harakat' | 'islamic' | 'math';

export interface KeyDef {
  /** Character inserted on tap. */
  ch: string;
  /** Character inserted while shift is engaged (or on quick hold). */
  alt?: string;
  /** Array of multi-character popup options shown on long press. */
  popups?: string[];
  /** Visual label override (used for combining marks or symbols). */
  label?: string;
  /** Relative width, 1 = one unit of the row grid. */
  span?: number;
}

const row = (chars: string, alts?: string): KeyDef[] => {
  const list = [...chars.trim().split(/\s+/)];
  const altList = alts ? alts.trim().split(/\s+/) : [];
  return list.map((ch, i) => ({ ch, alt: altList[i] }));
};

/**
 * Arabic — standard balanced 3 rows matching physical & Gboard Arabic keyboards.
 * Visual ordering from LEFT to RIGHT:
 * Row 1: ض ص ث ق ف غ ع ه خ ح ج د
 * Row 2: ش س ي ب ل ا ت ن م ك ط
 * Row 3: ئ ء ؤ ر لا ى ة و ز ظ
 */
export const AR_ROWS: KeyDef[][] = [
  [
    { ch: 'ض', alt: '1', popups: ['ض', '1'] },
    { ch: 'ص', alt: '2', popups: ['ص', '2'] },
    { ch: 'ث', alt: '3', popups: ['ث', '3'] },
    { ch: 'ق', alt: '4', popups: ['ق', '4'] },
    { ch: 'ف', alt: '5', popups: ['ف', '5'] },
    { ch: 'غ', alt: '6', popups: ['غ', '6'] },
    { ch: 'ع', alt: '7', popups: ['ع', '7'] },
    { ch: 'ه', alt: '8', popups: ['ه', 'ة', 'هـ', 'ـه', '8'] },
    { ch: 'خ', alt: '9', popups: ['خ', '9'] },
    { ch: 'ح', alt: '0', popups: ['ح', '0'] },
    { ch: 'ج', alt: 'ج', popups: ['ج', 'چ'] },
    { ch: 'د', alt: 'ذ', popups: ['د', 'ذ'] },
  ],
  [
    { ch: 'ش', alt: 'ش' },
    { ch: 'س', alt: 'س' },
    { ch: 'ي', alt: 'ى', popups: ['ي', 'ى', 'ئ', 'يـ'] },
    { ch: 'ب', alt: 'ب', popups: ['ب', 'پ'] },
    { ch: 'ل', alt: 'ل', popups: ['ل', 'لا', 'لأ', 'لإ', 'لآ'] },
    { ch: 'ا', alt: 'أ', popups: ['ا', 'أ', 'إ', 'آ', 'ٱ', 'ء'] },
    { ch: 'ت', alt: 'ت', popups: ['ت', 'ة', 'ـة'] },
    { ch: 'ن', alt: 'ن' },
    { ch: 'م', alt: 'م' },
    { ch: 'ك', alt: 'ك', popups: ['ك', 'گ'] },
    { ch: 'ط', alt: 'ظ', popups: ['ط', 'ظ'] },
  ],
  [
    { ch: 'ئ', alt: 'ئ' },
    { ch: 'ء', alt: 'ء', popups: ['ء', 'أ', 'إ', 'ؤ', 'ئ'] },
    { ch: 'ؤ', alt: 'ؤ' },
    { ch: 'ر', alt: 'ر' },
    { ch: 'لا', alt: 'لآ', popups: ['لا', 'لأ', 'لإ', 'لآ'] },
    { ch: 'ى', alt: 'آ', popups: ['ى', 'ي', 'ئ'] },
    { ch: 'ة', alt: 'ة', popups: ['ة', 'ت', 'ه'] },
    { ch: 'و', alt: 'ؤ', popups: ['و', 'ؤ'] },
    { ch: 'ز', alt: 'ز', popups: ['ز', 'ژ'] },
    { ch: 'ظ', alt: 'ظ' },
  ],
];

/** Dedicated Western Number Row (1 2 3 4 5 6 7 8 9 0) */
export const WESTERN_NUMBER_ROW: KeyDef[] = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '0'].map((num, i) => ({
  ch: num,
  alt: ['١', '٢', '٣', '٤', '٥', '٦', '٧', '٨', '٩', '٠'][i],
}));

/** Dedicated Eastern Arabic Number Row (١ ٢ ٣ ٤ ٥ ٦ ٧ ٨ ٩ ٠) */
export const EASTERN_NUMBER_ROW: KeyDef[] = ['١', '٢', '٣', '٤', '٥', '٦', '٧', '٨', '٩', '٠'].map((num, i) => ({
  ch: num,
  alt: ['1', '2', '3', '4', '5', '6', '7', '8', '9', '0'][i],
}));

/** Quick Alef & Hamza family bar */
export const ALEF_VARIANTS: readonly string[] = ['ا', 'أ', 'إ', 'آ', 'ء', 'ٱ', 'ى', 'ة', 'لا', 'لأ', 'لإ', 'لآ', 'ـ'];

/** Quick Tashkeel / Harakat strip for inline insertion */
export const HARAKAT_STRIP: readonly string[] = ['\u064E', '\u064F', '\u0650', '\u0652', '\u0651', '\u064B', '\u064C', '\u064D', '\u0640'];

/** Comprehensive Islamic and Quranic symbols page */
export const ISLAMIC_SYMBOLS: KeyDef[] = [
  { ch: 'ﷺ', label: 'ﷺ (صلى الله عليه وسلم)' },
  { ch: 'ﷻ', label: 'ﷻ (جل جلاله)' },
  { ch: 'ﷲ', label: 'ﷲ (الله)' },
  { ch: '﷽', label: '﷽ (البسملة)' },
  { ch: 'رضي الله عنه', label: 'رضي الله عنه' },
  { ch: 'رضي الله عنها', label: 'رضي الله عنها' },
  { ch: 'رضي الله عنهم', label: 'رضي الله عنهم' },
  { ch: 'رحمه الله', label: 'رحمه الله' },
  { ch: 'عليها السلام', label: 'عليها السلام' },
  { ch: 'عليه السلام', label: 'عليه السلام' },
  { ch: 'جزاك الله خيراً', label: 'جزاك الله خيراً' },
  { ch: 'السلام عليكم ورحمة الله وبركاته', label: 'السلام عليكم ورحمة الله وبركاته' },
  { ch: 'وعليكم السلام ورحمة الله وبركاته', label: 'وعليكم السلام ورحمة الله وبركاته' },
  { ch: 'إن شاء الله', label: 'إن شاء الله' },
  { ch: 'الحمد لله', label: 'الحمد لله' },
  { ch: 'سبحان الله', label: 'سبحان الله' },
  { ch: 'الله أكبر', label: 'الله أكبر' },
  { ch: 'لا إله إلا الله', label: 'لا إله إلا الله' },
  { ch: 'أستغفر الله', label: 'أستغفر الله' },
  { ch: 'لا حول ولا قوة إلا بالله', label: 'لا حول ولا قوة إلا بالله' },
  { ch: 'صلى الله عليه وسلم', label: 'صلى الله عليه وسلم' },
  { ch: 'بارك الله فيك', label: 'بارك الله فيك' },
];

/** Latin — QWERTY */
export const EN_ROWS: KeyDef[][] = [
  row('q w e r t y u i o p', '1 2 3 4 5 6 7 8 9 0'),
  row('a s d f g h j k l', '@ # $ & * ( ) - +'),
  row('z x c v b n m', '! " \' : ; / ?'),
];

/** Western / Eastern Numbers and Arabic Punctuation */
export const NUM_ROWS: KeyDef[][] = [
  row('1 2 3 4 5 6 7 8 9 0', '١ ٢ ٣ ٤ ٥ ٦ ٧ ٨ ٩ ٠'),
  row('- / : ؛ ( ) ﷼ & @ "', '_ \\ ; : { } $ § ^ \u2019'),
  row('. ، ؟ ! \u2019 %', '\u2026 : \u061F ! \u201D \u2030'),
];

/** Symbols page */
export const SYM_ROWS: KeyDef[][] = [
  row('[ ] { } # % ^ * + ='),
  row('_ \\ | ~ < > $ \u20AC \u00A3 \u00A5'),
  row('\u00AB \u00BB \u201C \u201D \u2022 \u00B7 \u2026 \u2013'),
];

/** Math & Currency Symbols page */
export const MATH_ROWS: KeyDef[][] = [
  row('+ - \u00D7 \u00F7 = \u2260 \u00B1 < > \u221E'),
  row('\u221A % \u2030 \u00B0 \u03C0 \u2211 \u220F \u222B \u2206 \u2248'),
  row('\uFDFC \u0024 \u20AC \u00A3 \u00A5 \u20B9 \u20BD \u20BA \u20A1 \u20B1'),
];

/** Harakat (combining marks) grid */
export const HARAKAT: KeyDef[] = [
  '\u064E', // fatha
  '\u064B', // fathatan
  '\u064F', // damma
  '\u064C', // dammatan
  '\u0650', // kasra
  '\u064D', // kasratan
  '\u0652', // sukun
  '\u0651', // shadda
  '\u0640', // tatweel
  '\u0653', // madda
  '\u0670', // dagger alef
  '\u0654', // hamza above
].map((ch) => ({ ch, label: ch === '\u0640' ? 'ـ (تطويل)' : `\u25CC${ch}` }));

export const LAYOUT_ROWS: Record<Exclude<LayoutId, 'harakat' | 'islamic'>, KeyDef[][]> = {
  ar: AR_ROWS,
  en: EN_ROWS,
  num: NUM_ROWS,
  sym: SYM_ROWS,
  math: MATH_ROWS,
};

/** Quick-insert strip: punctuation used constantly while writing Arabic */
export const QUICK_PUNCTUATION: readonly string[] = ['\u060C', '.', '\u061F', '!', ':', '\u061B', '\u00AB', '\u00BB', '\u2026', '-'];

export const isRtlLayout = (id: LayoutId): boolean => id === 'ar' || id === 'harakat' || id === 'islamic';

/**
 * Caret nudges offset calculation.
 * In RTL text:
 * - Visually moving 'right' moves towards index 0 (start of string, delta = -1).
 * - Visually moving 'left' moves towards string end (delta = +1).
 * In LTR text:
 * - Visually moving 'right' moves towards string end (delta = +1).
 * - Visually moving 'left' moves towards start of string (delta = -1).
 */
export const caretDelta = (layout: LayoutId, visual: 'left' | 'right'): number => {
  const rtl = isRtlLayout(layout);
  if (visual === 'right') {
    return rtl ? -1 : 1;
  }
  return rtl ? 1 : -1;
};
