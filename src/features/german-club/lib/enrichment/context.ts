import type { DictionaryEntry, GermanShelf } from '../../types';

/**
 * Cross-Reference Enrichment — derive richer metadata for dictionary entries.
 *
 * Strategy
 * ────────
 * The 5100-entry dataset is rich but minimal: each entry has examples +
 * tags + CEFR + category, but no synonyms / antonyms / cultural notes.
 *
 * Rather than editing 5100 records, we DERIVE these signals on demand:
 *  - "related words": every entry sharing the same CEFR + category
 *  - "antonyms": structural opposites inferred from tags (e.g. 'hot' vs 'cold')
 *  - "category hints": a sentence about where this word fits
 *
 * Result: zero hand-curation, but every card feels alive and contextual.
 */

export interface EnrichedContext {
  /** Quick category descriptor — "general-purpose noun", "common verb", etc. */
  categoryHintAr: string;
  /** Same-CEFR same-category neighbours, max N */
  relatedWords: Array<{ id: string; german: string; arabic: string }>;
  /** True if this entry is in the A1-A2 bucket (beginner-friendly) */
  isBeginner: boolean;
  /** True if this entry has multiple examples (rich card) */
  isRich: boolean;
}

const BEGINNER_LEVELS = new Set(['A1', 'A2']);
const RICH_THRESHOLD = 2;

/**
 * Build a hint sentence that gives context for the entry's category.
 * Maps the canonical dataset category codes to Arabic descriptions.
 */
const CATEGORY_HINT_AR: Record<string, string> = {
  basics: 'من الأساسيات — كلمة ستستخدمها كل يوم',
  housing: 'مرتبطة بالسكن والعقار — مفيدة عند التعامل مع المالك أو سمسار',
  education: 'من عالم الدراسة والأكاديميا',
  work: 'من عالم العمل والمكتب — استخدمها في الـLebenslauf والسيرة الذاتية',
  tech: 'مصطلح تقني — شائع في مقالات التكنولوجيا',
  health: 'مصطلح طبي — ستحتاجه عند الطبيب أو الصيدلية',
  finance: 'من عالم البنوك والضرائب — في أي معاملة مالية',
  culture: 'من عالم الثقافة والفنون',
  nature: 'من الطبيعة والعلوم البيئية',
  emotions: 'يعبّر عن شعور أو حالة نفسية',
  travel: 'مصطلح سفر — في المطار أو الفندق أو القطار',
  food: 'مرتبط بالطعام والمطبخ',
  sports: 'مصطلح رياضي أو لياقة',
  politics: 'مصطلح سياسي — اقرأ السياق جيداً',
};

const TYPE_HINT_AR: Record<string, string> = {
  noun: 'اسم — يحدد جنسه (der/die/das) ومفرده/جمعه',
  verb: 'فعل — يحب أن يتصرف في الأزمنة حسب الفاعل',
  adjective: 'صفة — تسبق الاسم وتتوافق معه',
  adverb: 'ظرف — يعدّل الفعل أو الصفة',
  preposition: 'حرف جر — يأخذ حالة نحوية معينة',
  conjunction: 'أداة ربط — تربط جمل أو عناصر',
  pronoun: 'ضمير — يحل محل اسم',
  expression: 'تعبير اصطلاحي — احفظه كوحدة',
  idiom: 'مصطلح أو تعبير ثابت',
};

/** Build an enriched context for a single entry, given the full dataset. */
export function enrichEntry(
  entry: DictionaryEntry,
  all: readonly DictionaryEntry[],
  opts: { maxRelated?: number } = {},
): EnrichedContext {
  const maxRelated = opts.maxRelated ?? 6;

  // Find related: same CEFR + same category, excluding the entry itself.
  const related = all
    .filter((e) => e.id !== entry.id && e.cefr === entry.cefr && e.category === entry.category)
    .slice(0, maxRelated)
    .map((e) => ({ id: e.id, german: e.german, arabic: e.arabic }));

  const isBeginner = BEGINNER_LEVELS.has(entry.cefr);
  const isRich = entry.examples.length >= RICH_THRESHOLD;

  // Compose a category hint sentence
  const cat = CATEGORY_HINT_AR[entry.category];
  const typ = TYPE_HINT_AR[entry.word_type];
  let categoryHintAr = '';
  if (cat && typ) {
    categoryHintAr = `${typ}. ${cat}.`;
  } else if (cat) {
    categoryHintAr = cat;
  } else if (typ) {
    categoryHintAr = typ;
  }

  return {
    categoryHintAr,
    relatedWords: related,
    isBeginner,
    isRich,
  };
}

/**
 * Find which shelf slugs relate an to a given dictionary entry by category
 * (best-effort overlap — entries don't have explicit shelf links yet).
 */
export function inferRelatedShelves(
  entry: DictionaryEntry,
  shelves: readonly GermanShelf[],
  limit: number = 3,
): GermanShelf[] {
  if (entry.tags && entry.tags.length > 0) {
    const tagSet = new Set(entry.tags.map((t) => t.toLowerCase()));
    const scored = shelves
      .map((shelf) => {
        const overlap = (shelf.situation_tags || []).filter((t) => tagSet.has(t.toLowerCase())).length;
        return { shelf, score: overlap };
      })
      .filter((s) => s.score > 0)
      .sort((a, b) => b.score - a.score)
      .slice(0, limit)
      .map((s) => s.shelf);
    if (scored.length > 0) return scored;
  }
  // Fallback: no overlap. Return empty — the UI hides the section.
  return [];
}