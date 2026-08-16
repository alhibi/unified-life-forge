/**
 * Key maps for the in-app soft keyboard.
 *
 * Rows are plain character arrays: the visual layout (widths, gaps) is derived
 * geometrically from the row length in the renderer. `alt` is the shifted / long-press character.
 * Popups provide expandable multi-character selection menus on long-press (like Gboard).
 */

export type LayoutId = 'ar' | 'en' | 'num' | 'sym' | 'harakat' | 'islamic';

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
 * Arabic — standard 3 balanced rows (11/11/11).
 * Enhanced with comprehensive long-press popup menus for Arabic character variants.
 */
export const AR_ROWS: KeyDef[][] = [
  [
    { ch: 'ض', alt: 'ض' },
    { ch: 'ص', alt: 'ص' },
    { ch: 'ث', alt: 'ث' },
    { ch: 'ق', alt: 'ق' },
    { ch: 'ف', alt: 'ف' },
    { ch: 'غ', alt: 'غ' },
    { ch: 'ع', alt: 'ع' },
    { ch: 'ه', alt: 'ة', popups: ['ه', 'ة', 'هـ', 'ـه'] },
    { ch: 'خ', alt: 'خ' },
    { ch: 'ح', alt: 'ح' },
    { ch: 'ج', alt: 'ج' },
    { ch: 'د', alt: 'ذ', popups: ['د', 'ذ'] },
  ],
  [
    { ch: 'ش', alt: 'ش' },
    { ch: 'س', alt: 'س' },
    { ch: 'ي', alt: 'ى', popups: ['ي', 'ى', 'ئ', 'يـ'] },
    { ch: 'ب', alt: 'ب' },
    { ch: 'ل', alt: 'ل', popups: ['ل', 'لا', 'لأ', 'لإ', 'لآ'] },
    { ch: 'ا', alt: 'أ', popups: ['ا', 'أ', 'إ', 'آ', 'ٱ', 'ء'] },
    { ch: 'ت', alt: 'ت', popups: ['ت', 'ة', 'ـة'] },
    { ch: 'ن', alt: 'ن' },
    { ch: 'م', alt: 'م' },
    { ch: 'ك', alt: 'ك' },
    { ch: 'ط', alt: 'ظ', popups: ['ط', 'ظ'] },
  ],
  [
    { ch: 'ذ', alt: 'ذ' },
    { ch: 'ئ', alt: 'ئ' },
    { ch: 'ء', alt: 'ء', popups: ['ء', 'أ', 'إ', 'ؤ', 'ئ'] },
    { ch: 'ؤ', alt: 'ؤ' },
    { ch: 'ر', alt: 'ر' },
    { ch: 'لا', alt: 'لآ', popups: ['لا', 'لأ', 'لإ', 'لآ'] },
    { ch: 'ى', alt: 'آ', popups: ['ى', 'ي', 'ئ'] },
    { ch: 'ة', alt: 'ة', popups: ['ة', 'ت', 'ه'] },
    { ch: 'و', alt: 'ؤ', popups: ['و', 'ؤ'] },
    { ch: 'ز', alt: 'ز' },
    { ch: 'ظ', alt: 'ظ' },
  ],
];

/** Dedicated Arabic/Western Top Number Row */
export const WESTERN_NUMBER_ROW: KeyDef[] = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '0'].map((num, i) => ({
  ch: num,
  alt: ['١', '٢', '٣', '٤', '٥', '٦', '٧', '٨', '٩', '٠'][i],
}));

export const EASTERN_NUMBER_ROW: KeyDef[] = ['١', '٢', '٣', '٤', '٥', '٦', '٧', '٨', '٩', '٠'].map((num, i) => ({
  ch: num,
  alt: ['1', '2', '3', '4', '5', '6', '7', '8', '9', '0'][i],
}));

/** Hamza / alef family quick strip page. */
export const ALEF_VARIANTS: readonly string[] = ['ا', 'أ', 'إ', 'آ', 'ء', 'ٱ', 'ى', 'ة', 'لا', 'لأ', 'لإ', 'لآ', 'ـ'];

/** Quick Tashkeel / Harakat strip for inline insertion */
export const HARAKAT_STRIP: readonly string[] = ['\u064E', '\u064F', '\u0650', '\u0652', '\u0651', '\u064B', '\u064C', '\u064D', '\u0640'];

/** Islamic and Quranic symbols page */
export const ISLAMIC_SYMBOLS: KeyDef[] = [
  { ch: 'ﷺ', label: 'ﷺ' },
  { ch: 'ﷻ', label: 'ﷻ' },
  { ch: 'ﷲ', label: 'ﷲ' },
  { ch: '﷽', label: '﷽' },
  { ch: 'رضي الله عنه', label: 'رضي الله عنه' },
  { ch: 'رضي الله عنها', label: 'رضي الله عنها' },
  { ch: 'رحمه الله', label: 'رحمه الله' },
  { ch: 'عليها السلام', label: 'عليها السلام' },
  { ch: 'عليه السلام', label: 'عليه السلام' },
  { ch: 'جزاك الله خيراً', label: 'جزاك الله خيراً' },
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
].map((ch) => ({ ch, label: ch === '\u0640' ? 'ـ (تطويل)' : `\u25CC${ch}` }));

export const LAYOUT_ROWS: Record<Exclude<LayoutId, 'harakat' | 'islamic'>, KeyDef[][]> = {
  ar: AR_ROWS,
  en: EN_ROWS,
  num: NUM_ROWS,
  sym: SYM_ROWS,
};

/** Quick-insert strip: punctuation used constantly while writing Arabic */
export const QUICK_PUNCTUATION: readonly string[] = ['\u060C', '.', '\u061F', '!', ':', '\u061B', '\u00AB', '\u00BB', '\u2026', '-'];

export const isRtlLayout = (id: LayoutId): boolean => id === 'ar' || id === 'harakat' || id === 'islamic';

/**
 * Caret nudges offset calculation.
 */
export const caretDelta = (layout: LayoutId, visual: 'left' | 'right'): number => {
  const forward = isRtlLayout(layout) ? visual === 'left' : visual === 'right';
  return forward ? 1 : -1;
};
