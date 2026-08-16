/**
 * Key maps for the in-app soft keyboard.
 *
 * Rows are plain character arrays: the visual layout (widths, gaps) is derived
 * geometrically from the row length in the renderer, so a layout never carries
 * pixel decisions. `alt` is the shifted / long-press character.
 */

export type LayoutId = 'ar' | 'en' | 'num' | 'sym' | 'harakat';

export interface KeyDef {
  /** Character inserted on tap. */
  ch: string;
  /** Character inserted while shift is engaged (or on long press). */
  alt?: string;
  /** Visual label override (used for combining marks). */
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
 * Arabic — the standard (Windows/Gboard) ordering Arabic typists already know,
 * three balanced rows of 11/11/11. Long press (or shift) gives the linguistic
 * variant of the same letter: hamza forms on alef, ta marbuta on ha, alef
 * maqsura on ya, lam-alef ligatures on lam-alef. No Unicode presentation forms
 * are used — every key inserts the canonical character (لا is لـ+ا), so search,
 * Zod validation and database comparisons keep working on normal text.
 */
export const AR_ROWS: KeyDef[][] = [
  row('ض ص ث ق ف غ ع ه خ ح ج د', '\u0651 \u064B \u064C \u064D ف غ ع ة خ ح ج ذ'),
  row('ش س ي ب ل ا ت ن م ك ط', 'ش س ى ب ل أ ت ن م ك ظ'),
  row('ذ ئ ء ؤ ر لا ى ة و ز ظ', 'ذ ئ ء ؤ ر لآ آ ة و ز ظ'),
];

/** Hamza / alef family, exposed as its own quick strip page. */
export const ALEF_VARIANTS: readonly string[] = ['ا', 'أ', 'إ', 'آ', 'ء', 'ٱ', 'ى', 'ة', 'لا', 'لأ', 'لإ', 'لآ'];

/** Latin — QWERTY, so English/German words and URLs stay typable. */
export const EN_ROWS: KeyDef[][] = [
  row('q w e r t y u i o p', 'Q W E R T Y U I O P'),
  row('a s d f g h j k l', 'A S D F G H J K L'),
  row('z x c v b n m', 'Z X C V B N M'),
];

/** Digits and the punctuation an Arabic writer actually reaches for. */
export const NUM_ROWS: KeyDef[][] = [
  row('1 2 3 4 5 6 7 8 9 0'),
  row('- / : ؛ ( ) ﷼ & @ "', '_ \\ ; : { } $ § ^ \u2019'),
  row('. ، ؟ ! \u2019 %', '\u2026 : \u061F ! \u201D \u2030'),
];

/** Second symbol page — maths, currency, brackets, quotes. */
export const SYM_ROWS: KeyDef[][] = [
  row('[ ] { } # % ^ * + ='),
  row('_ \\ | ~ < > $ \u20AC \u00A3 \u00A5'),
  row('\u00AB \u00BB \u201C \u201D \u2022 \u00B7 \u2026 \u2013'),
];

/**
 * Arabic diacritics. They are combining marks, so each label is rendered on a
 * dotted circle carrier (\u25CC) to stay legible on its own key.
 */
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
].map((ch) => ({ ch, label: ch === '\u0640' ? '\u0640\u0640' : `\u25CC${ch}` }));

export const LAYOUT_ROWS: Record<Exclude<LayoutId, 'harakat'>, KeyDef[][]> = {
  ar: AR_ROWS,
  en: EN_ROWS,
  num: NUM_ROWS,
  sym: SYM_ROWS,
};

/** Quick-insert strip: the punctuation used constantly while writing Arabic. */
export const QUICK_PUNCTUATION: readonly string[] = ['\u060C', '.', '\u061F', '!', ':', '\u061B', '\u00AB', '\u00BB', '\u2026', '-'];

export const isRtlLayout = (id: LayoutId): boolean => id === 'ar' || id === 'harakat';

/**
 * Caret nudges are visual, not logical: in RTL text the key that points right
 * must walk the string backwards. Callers pass a visual direction and get the
 * logical offset for the active layout.
 */
export const caretDelta = (layout: LayoutId, visual: 'left' | 'right'): number => {
  const forward = isRtlLayout(layout) ? visual === 'left' : visual === 'right';
  return forward ? 1 : -1;
};