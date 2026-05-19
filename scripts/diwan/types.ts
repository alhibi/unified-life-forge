/**
 * أنواع البيانات المتبادلة بين الـ scraper وسكريبت الـ ingestion.
 * نخزّن JSONL — كل سطر سجل مستقل — ليتسنّى الاستئناف بعد أيّ انقطاع.
 */

export interface RawEra {
  id: string;            // 'jahili'
  external_id?: string;  // المعرّف الأصلي على المصدر (cat=N)
  name_ar: string;
  name_en?: string;
  period_label?: string; // "500-622م"
  start_year?: number;
  end_year?: number;
  color?: string;
  sort_order: number;
  description?: string;
}

export interface RawPoet {
  slug: string;          // مفتاح ثابت يُولَّد من name_ar + external_id
  external_id?: string;
  source: string;        // 'adab' | 'ashaar' | 'aldiwan' | 'seed'
  source_url?: string;
  era_id?: string;
  name_ar: string;
  name_en?: string;
  title?: string;
  bio?: string;
  birth_year?: number;
  death_year?: number;
  birth_city?: string;
  death_city?: string;
  image_url?: string;
}

export interface RawVerse {
  position: number;
  hemistich1: string;
  hemistich2?: string;
}

export interface RawPoem {
  slug: string;
  external_id?: string;
  source: string;
  source_url?: string;
  poet_slug: string;     // ربط بالشاعر عبر slug (سيُحَوَّل إلى poet_id)
  era_id?: string;
  title: string;
  kind?: string;         // مديح/رثاء/غزل/فخر/حماسة/زهد…
  meter?: string;        // البحر
  rhyme?: string;        // حرف الروي
  opening?: string;      // أول شطر
  tags?: string[];
  verses: RawVerse[];
}

/** قائمة البحور المعتمَدة عند عزل الموسيقى من القصيدة. */
export const KNOWN_METERS = [
  'الطويل', 'البسيط', 'الكامل', 'الوافر', 'الهزج', 'الرجز',
  'الرمل', 'السريع', 'المنسرح', 'الخفيف', 'المضارع', 'المقتضب',
  'المجتث', 'المتقارب', 'المتدارك',
] as const;

export type Meter = (typeof KNOWN_METERS)[number];

/** أنواع القصائد الشائعة. */
export const KNOWN_KINDS = [
  'مديح', 'رثاء', 'غزل', 'فخر', 'حماسة', 'هجاء', 'زهد', 'حكمة',
  'وصف', 'خمريات', 'طرديات', 'إخوانيات', 'اعتذار', 'مناجاة',
] as const;

export type Kind = (typeof KNOWN_KINDS)[number];
