// أنواع المكتبة الكبرى — ما تستهلكه واجهة المستخدم.
// هذه ليست أنواع DB raw، بل نسخة مُنظَّفة لاستخدام الـ UI.

export interface DiwanEra {
  id: string;
  name_ar: string;
  name_en: string | null;
  period_label: string | null;
  start_year: number | null;
  end_year: number | null;
  color: string | null;
  sort_order: number;
  description: string | null;
  /**
   * Number of poets in the era. Supplied only by the local fallback
   * (`localEras()`); the remote `diwan_eras` table has no such column, so
   * consumers must treat it as optional and hide the affordance when absent.
   */
  poets_count?: number;
}

export interface DiwanPoetSummary {
  id: string;
  slug: string;
  era_id: string | null;
  name_ar: string;
  title: string | null;
  bio: string | null;
  birth_year: number | null;
  death_year: number | null;
  poems_count: number;
  verses_count: number;
  rank?: number;
}

export interface DiwanPoemSummary {
  id: string;
  slug: string;
  title: string;
  opening: string | null;
  meter: string | null;
  rhyme: string | null;
  kind: string | null;
  tags: string[];
  verses_count: number;
  rank?: number;
}

export interface DiwanPoemSearchResult extends DiwanPoemSummary {
  poet_id: string;
  poet_slug: string;
  poet_name: string;
  era_id: string | null;
}

export interface DiwanVerseSearchResult {
  verse_id: number;
  poem_id: string;
  poem_slug: string;
  poem_title: string;
  poet_id: string;
  poet_slug: string;
  poet_name: string;
  era_id: string | null;
  position: number;
  hemistich1: string;
  hemistich2: string | null;
  rank: number;
}

export interface DiwanVerse {
  position: number;
  hemistich1: string;
  hemistich2: string | null;
  /** نسخة بكامل التشكيل — اختيارية. تُستخدم حين يُفعّل المستخدم زرّ التشكيل. */
  hemistich1_diacritized?: string | null;
  hemistich2_diacritized?: string | null;
}

export interface DiwanPoemDetail {
  id: string;
  slug: string;
  title: string;
  opening: string | null;
  meter: string | null;
  rhyme: string | null;
  kind: string | null;
  tags: string[];
  verses_count: number;
  source_url: string | null;
  poet_id: string;
  poet_slug: string;
  poet_name: string;
  poet_title: string | null;
  era_id: string | null;
  era_name: string | null;
  verses: DiwanVerse[];
}

export interface DiwanLibraryStats {
  poets_count: number;
  poems_count: number;
  verses_count: number;
  eras_count: number;
}

export interface PoemSearchFilters {
  q?: string | null;
  era?: string | null;
  poet_slug?: string | null;
  meter?: string | null;
  rhyme?: string | null;
  kind?: string | null;
  tag?: string | null;
}

export interface DiwanSimilarPoem extends DiwanPoemSearchResult {
  score: number;
}

export type DiwanSuggestKind = 'poet' | 'poem';

export interface DiwanSuggestItem {
  kind: DiwanSuggestKind;
  slug: string;
  label: string;        // poet name OR poem title
  sub: string | null;   // lifespan / poet name
  rank: number;
}

export interface DiwanGlossaryEntry {
  word: string;
  word_normalized: string;
  meaning: string;
  verse_position: number | null;
}

/**
 * نتيجة موحّدة من diwan_smart_search — تمزج الشعراء والقصائد والأبيات
 * في مصفوفة واحدة. مفيدة لشريط بحث Universal مستقبلًا.
 */
export type DiwanSmartKind = 'poet' | 'poem' | 'verse';

export interface DiwanSmartSearchItem {
  kind: DiwanSmartKind;
  slug: string;            // poet slug / poem slug / poem slug (للأبيات)
  label: string;           // اسم الشاعر / عنوان القصيدة / صدر البيت
  sub: string | null;      // لقب / اسم الشاعر / عجز البيت
  poem_slug: string | null;
  poet_slug: string;
  poet_name: string;
  era_id: string | null;
  rank: number;
}
