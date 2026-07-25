/**
 * SURAH_INDEX — the 114 sūrahs with ayah counts and revelation place.
 *
 * Lives here as the single source of truth: the Quran tab previously carried a
 * bare 114-name array inline (names only, no counts, no place), and the reader
 * fetched its own list over the network just to render a picker. This is static,
 * tiny, and offline-safe.
 *
 * The total ayah count across the table is 6236, which is the standard Kufan
 * count used by the Madani muṣḥaf — a unit test asserts it, so a typo in any
 * single row is caught rather than silently shipped.
 */

export type RevelationPlace = 'makkah' | 'madinah';

export interface SurahMeta {
  /** 1-based sūrah number as printed in the muṣḥaf. */
  number: number;
  name: string;
  ayahs: number;
  place: RevelationPlace;
}

/** Standard Kufan total, asserted in tests. */
export const TOTAL_AYAHS = 6236;

export const SURAH_INDEX: readonly SurahMeta[] = [
  { number: 1, name: 'الفاتحة', ayahs: 7, place: 'makkah' },
  { number: 2, name: 'البقرة', ayahs: 286, place: 'madinah' },
  { number: 3, name: 'آل عمران', ayahs: 200, place: 'madinah' },
  { number: 4, name: 'النساء', ayahs: 176, place: 'madinah' },
  { number: 5, name: 'المائدة', ayahs: 120, place: 'madinah' },
  { number: 6, name: 'الأنعام', ayahs: 165, place: 'makkah' },
  { number: 7, name: 'الأعراف', ayahs: 206, place: 'makkah' },
  { number: 8, name: 'الأنفال', ayahs: 75, place: 'madinah' },
  { number: 9, name: 'التوبة', ayahs: 129, place: 'madinah' },
  { number: 10, name: 'يونس', ayahs: 109, place: 'makkah' },
  { number: 11, name: 'هود', ayahs: 123, place: 'makkah' },
  { number: 12, name: 'يوسف', ayahs: 111, place: 'makkah' },
  { number: 13, name: 'الرعد', ayahs: 43, place: 'madinah' },
  { number: 14, name: 'إبراهيم', ayahs: 52, place: 'makkah' },
  { number: 15, name: 'الحجر', ayahs: 99, place: 'makkah' },
  { number: 16, name: 'النحل', ayahs: 128, place: 'makkah' },
  { number: 17, name: 'الإسراء', ayahs: 111, place: 'makkah' },
  { number: 18, name: 'الكهف', ayahs: 110, place: 'makkah' },
  { number: 19, name: 'مريم', ayahs: 98, place: 'makkah' },
  { number: 20, name: 'طه', ayahs: 135, place: 'makkah' },
  { number: 21, name: 'الأنبياء', ayahs: 112, place: 'makkah' },
  { number: 22, name: 'الحج', ayahs: 78, place: 'madinah' },
  { number: 23, name: 'المؤمنون', ayahs: 118, place: 'makkah' },
  { number: 24, name: 'النور', ayahs: 64, place: 'madinah' },
  { number: 25, name: 'الفرقان', ayahs: 77, place: 'makkah' },
  { number: 26, name: 'الشعراء', ayahs: 227, place: 'makkah' },
  { number: 27, name: 'النمل', ayahs: 93, place: 'makkah' },
  { number: 28, name: 'القصص', ayahs: 88, place: 'makkah' },
  { number: 29, name: 'العنكبوت', ayahs: 69, place: 'makkah' },
  { number: 30, name: 'الروم', ayahs: 60, place: 'makkah' },
  { number: 31, name: 'لقمان', ayahs: 34, place: 'makkah' },
  { number: 32, name: 'السجدة', ayahs: 30, place: 'makkah' },
  { number: 33, name: 'الأحزاب', ayahs: 73, place: 'madinah' },
  { number: 34, name: 'سبأ', ayahs: 54, place: 'makkah' },
  { number: 35, name: 'فاطر', ayahs: 45, place: 'makkah' },
  { number: 36, name: 'يس', ayahs: 83, place: 'makkah' },
  { number: 37, name: 'الصافات', ayahs: 182, place: 'makkah' },
  { number: 38, name: 'ص', ayahs: 88, place: 'makkah' },
  { number: 39, name: 'الزمر', ayahs: 75, place: 'makkah' },
  { number: 40, name: 'غافر', ayahs: 85, place: 'makkah' },
  { number: 41, name: 'فصلت', ayahs: 54, place: 'makkah' },
  { number: 42, name: 'الشورى', ayahs: 53, place: 'makkah' },
  { number: 43, name: 'الزخرف', ayahs: 89, place: 'makkah' },
  { number: 44, name: 'الدخان', ayahs: 59, place: 'makkah' },
  { number: 45, name: 'الجاثية', ayahs: 37, place: 'makkah' },
  { number: 46, name: 'الأحقاف', ayahs: 35, place: 'makkah' },
  { number: 47, name: 'محمد', ayahs: 38, place: 'madinah' },
  { number: 48, name: 'الفتح', ayahs: 29, place: 'madinah' },
  { number: 49, name: 'الحجرات', ayahs: 18, place: 'madinah' },
  { number: 50, name: 'ق', ayahs: 45, place: 'makkah' },
  { number: 51, name: 'الذاريات', ayahs: 60, place: 'makkah' },
  { number: 52, name: 'الطور', ayahs: 49, place: 'makkah' },
  { number: 53, name: 'النجم', ayahs: 62, place: 'makkah' },
  { number: 54, name: 'القمر', ayahs: 55, place: 'makkah' },
  { number: 55, name: 'الرحمن', ayahs: 78, place: 'madinah' },
  { number: 56, name: 'الواقعة', ayahs: 96, place: 'makkah' },
  { number: 57, name: 'الحديد', ayahs: 29, place: 'madinah' },
  { number: 58, name: 'المجادلة', ayahs: 22, place: 'madinah' },
  { number: 59, name: 'الحشر', ayahs: 24, place: 'madinah' },
  { number: 60, name: 'الممتحنة', ayahs: 13, place: 'madinah' },
  { number: 61, name: 'الصف', ayahs: 14, place: 'madinah' },
  { number: 62, name: 'الجمعة', ayahs: 11, place: 'madinah' },
  { number: 63, name: 'المنافقون', ayahs: 11, place: 'madinah' },
  { number: 64, name: 'التغابن', ayahs: 18, place: 'madinah' },
  { number: 65, name: 'الطلاق', ayahs: 12, place: 'madinah' },
  { number: 66, name: 'التحريم', ayahs: 12, place: 'madinah' },
  { number: 67, name: 'الملك', ayahs: 30, place: 'makkah' },
  { number: 68, name: 'القلم', ayahs: 52, place: 'makkah' },
  { number: 69, name: 'الحاقة', ayahs: 52, place: 'makkah' },
  { number: 70, name: 'المعارج', ayahs: 44, place: 'makkah' },
  { number: 71, name: 'نوح', ayahs: 28, place: 'makkah' },
  { number: 72, name: 'الجن', ayahs: 28, place: 'makkah' },
  { number: 73, name: 'المزمل', ayahs: 20, place: 'makkah' },
  { number: 74, name: 'المدثر', ayahs: 56, place: 'makkah' },
  { number: 75, name: 'القيامة', ayahs: 40, place: 'makkah' },
  { number: 76, name: 'الإنسان', ayahs: 31, place: 'madinah' },
  { number: 77, name: 'المرسلات', ayahs: 50, place: 'makkah' },
  { number: 78, name: 'النبأ', ayahs: 40, place: 'makkah' },
  { number: 79, name: 'النازعات', ayahs: 46, place: 'makkah' },
  { number: 80, name: 'عبس', ayahs: 42, place: 'makkah' },
  { number: 81, name: 'التكوير', ayahs: 29, place: 'makkah' },
  { number: 82, name: 'الانفطار', ayahs: 19, place: 'makkah' },
  { number: 83, name: 'المطففين', ayahs: 36, place: 'makkah' },
  { number: 84, name: 'الانشقاق', ayahs: 25, place: 'makkah' },
  { number: 85, name: 'البروج', ayahs: 22, place: 'makkah' },
  { number: 86, name: 'الطارق', ayahs: 17, place: 'makkah' },
  { number: 87, name: 'الأعلى', ayahs: 19, place: 'makkah' },
  { number: 88, name: 'الغاشية', ayahs: 26, place: 'makkah' },
  { number: 89, name: 'الفجر', ayahs: 30, place: 'makkah' },
  { number: 90, name: 'البلد', ayahs: 20, place: 'makkah' },
  { number: 91, name: 'الشمس', ayahs: 15, place: 'makkah' },
  { number: 92, name: 'الليل', ayahs: 21, place: 'makkah' },
  { number: 93, name: 'الضحى', ayahs: 11, place: 'makkah' },
  { number: 94, name: 'الشرح', ayahs: 8, place: 'makkah' },
  { number: 95, name: 'التين', ayahs: 8, place: 'makkah' },
  { number: 96, name: 'العلق', ayahs: 19, place: 'makkah' },
  { number: 97, name: 'القدر', ayahs: 5, place: 'makkah' },
  { number: 98, name: 'البينة', ayahs: 8, place: 'madinah' },
  { number: 99, name: 'الزلزلة', ayahs: 8, place: 'madinah' },
  { number: 100, name: 'العاديات', ayahs: 11, place: 'makkah' },
  { number: 101, name: 'القارعة', ayahs: 11, place: 'makkah' },
  { number: 102, name: 'التكاثر', ayahs: 8, place: 'makkah' },
  { number: 103, name: 'العصر', ayahs: 3, place: 'makkah' },
  { number: 104, name: 'الهمزة', ayahs: 9, place: 'makkah' },
  { number: 105, name: 'الفيل', ayahs: 5, place: 'makkah' },
  { number: 106, name: 'قريش', ayahs: 4, place: 'makkah' },
  { number: 107, name: 'الماعون', ayahs: 7, place: 'makkah' },
  { number: 108, name: 'الكوثر', ayahs: 3, place: 'makkah' },
  { number: 109, name: 'الكافرون', ayahs: 6, place: 'makkah' },
  { number: 110, name: 'النصر', ayahs: 3, place: 'madinah' },
  { number: 111, name: 'المسد', ayahs: 5, place: 'makkah' },
  { number: 112, name: 'الإخلاص', ayahs: 4, place: 'makkah' },
  { number: 113, name: 'الفلق', ayahs: 5, place: 'makkah' },
  { number: 114, name: 'الناس', ayahs: 6, place: 'makkah' },
] as const;

export function findSurah(number: number): SurahMeta | undefined {
  return SURAH_INDEX.find((s) => s.number === number);
}

/** Sūrah names only — for call sites that just need a label by index. */
export const SURAH_NAMES: readonly string[] = SURAH_INDEX.map((s) => s.name);
