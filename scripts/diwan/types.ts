/**
 * أنواع البيانات المتبادلة بين الـ scraper وسكريبت الـ ingestion.
 * نخزّن JSONL — كل سطر سجل مستقل — ليتسنّى الاستئناف بعد أيّ انقطاع.
 *
 * الثوابت الأدبية (KNOWN_METERS / KNOWN_KINDS) مُعرَّفة مرّة واحدة في
 * `src/lib/diwan/constants.ts` ونُعيد تصديرها هنا لتجنّب الـ drift —
 * كانت قبل ذلك مكرَّرة بنُسختين قد تختلفان مع الزمن.
 */

export {
  type Kind,
  KNOWN_KINDS,
  KNOWN_METERS,
  type Meter,
} from '../../src/lib/diwan/constants.ts';

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
