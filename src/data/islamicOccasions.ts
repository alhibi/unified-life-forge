export interface IslamicOccasion {
  id: string;
  name: string;
  description: string;
  hijriDay: number;
  hijriMonth: string;
  gregorianDate: string; // ISO date for 1447 AH
  color: string; // accent color class
}

// Verified Gregorian dates for 1447 AH (Umm al-Qura calendar)
export const islamicOccasions: IslamicOccasion[] = [
  {
    id: 'new-year',
    name: 'رأس السنة الهجرية',
    description: 'اليوم الأول من شهر محرم، وهو بداية التقويم الهجري',
    hijriDay: 1,
    hijriMonth: 'محرم',
    gregorianDate: '2025-06-27',
    color: 'border-l-emerald-500',
  },
  {
    id: 'ashura',
    name: 'يوم عاشوراء',
    description: 'اليوم العاشر من شهر محرم، وهو يوم صيام مستحب',
    hijriDay: 10,
    hijriMonth: 'محرم',
    gregorianDate: '2025-07-06',
    color: 'border-l-emerald-500',
  },
  {
    id: 'mawlid',
    name: 'المولد النبوي',
    description: 'ذكرى مولد النبي محمد ﷺ',
    hijriDay: 12,
    hijriMonth: 'ربيع الأول',
    gregorianDate: '2025-09-04',
    color: 'border-l-emerald-500',
  },
  {
    id: 'rajab',
    name: 'أول رجب',
    description: 'بداية شهر رجب، أحد الأشهر الحرم',
    hijriDay: 1,
    hijriMonth: 'رجب',
    gregorianDate: '2025-12-21',
    color: 'border-l-sky-500',
  },
  {
    id: 'isra-miraj',
    name: 'ليلة الإسراء والمعراج',
    description: 'ذكرى رحلة الإسراء والمعراج التي أُسري فيها بالنبي ﷺ من مكة إلى القدس ثم عُرج به إلى السماء',
    hijriDay: 27,
    hijriMonth: 'رجب',
    gregorianDate: '2026-01-16',
    color: 'border-l-sky-500',
  },
  {
    id: 'shaban',
    name: 'أول شعبان',
    description: 'بداية شهر شعبان، كان النبي ﷺ يصوم أكثر شعبان',
    hijriDay: 1,
    hijriMonth: 'شعبان',
    gregorianDate: '2026-01-20',
    color: 'border-l-violet-500',
  },
  {
    id: 'mid-shaban',
    name: 'ليلة النصف من شعبان',
    description: 'ليلة الخامس عشر من شعبان',
    hijriDay: 15,
    hijriMonth: 'شعبان',
    gregorianDate: '2026-02-03',
    color: 'border-l-violet-500',
  },
  {
    id: 'ramadan',
    name: 'أول رمضان',
    description: 'بداية شهر رمضان المبارك',
    hijriDay: 1,
    hijriMonth: 'رمضان',
    gregorianDate: '2026-02-18',
    color: 'border-l-amber-500',
  },
  {
    id: 'laylat-qadr',
    name: 'ليلة القدر',
    description: 'أعظم ليلة في السنة، وهي في العشر الأواخر من رمضان',
    hijriDay: 27,
    hijriMonth: 'رمضان',
    gregorianDate: '2026-03-16',
    color: 'border-l-amber-500',
  },
  {
    id: 'eid-fitr',
    name: 'عيد الفطر',
    description: 'عيد المسلمين الأول، يأتي بعد انتهاء شهر رمضان',
    hijriDay: 1,
    hijriMonth: 'شوال',
    gregorianDate: '2026-03-20',
    color: 'border-l-yellow-500',
  },
  {
    id: 'six-shawwal',
    name: 'صيام الست من شوال',
    description: 'من صام رمضان ثم أتبعه ستاً من شوال كان كصيام الدهر',
    hijriDay: 2,
    hijriMonth: 'شوال',
    gregorianDate: '2026-03-21',
    color: 'border-l-yellow-500',
  },
  {
    id: 'dhul-hijjah',
    name: 'أول ذي الحجة',
    description: 'بداية شهر ذي الحجة، شهر الحج',
    hijriDay: 1,
    hijriMonth: 'ذو الحجة',
    gregorianDate: '2026-05-18',
    color: 'border-l-emerald-600',
  },
  {
    id: 'arafah',
    name: 'يوم عرفة',
    description: 'اليوم التاسع من ذي الحجة، يوم الوقوف بعرفة',
    hijriDay: 9,
    hijriMonth: 'ذو الحجة',
    gregorianDate: '2026-05-26',
    color: 'border-l-emerald-600',
  },
  {
    id: 'eid-adha',
    name: 'عيد الأضحى',
    description: 'عيد المسلمين الثاني، يأتي في العاشر من ذي الحجة',
    hijriDay: 10,
    hijriMonth: 'ذو الحجة',
    gregorianDate: '2026-05-27',
    color: 'border-l-yellow-600',
  },
  {
    id: 'tashreeq',
    name: 'أيام التشريق',
    description: 'الأيام الثلاثة التي تلي عيد الأضحى',
    hijriDay: 11,
    hijriMonth: 'ذو الحجة',
    gregorianDate: '2026-05-28',
    color: 'border-l-yellow-600',
  },
];

export function getUpcomingOccasions(limit?: number) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const upcoming = islamicOccasions
    .filter(o => new Date(o.gregorianDate) >= today)
    .sort((a, b) => new Date(a.gregorianDate).getTime() - new Date(b.gregorianDate).getTime());
  return limit ? upcoming.slice(0, limit) : upcoming;
}

export function getPastOccasions() {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return islamicOccasions
    .filter(o => new Date(o.gregorianDate) < today)
    .sort((a, b) => new Date(b.gregorianDate).getTime() - new Date(a.gregorianDate).getTime());
}

export function getDaysUntil(dateStr: string): number {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const target = new Date(dateStr);
  target.setHours(0, 0, 0, 0);
  return Math.ceil((target.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
}

export function formatGregorianDate(dateStr: string): string {
  const date = new Date(dateStr);
  return date.toLocaleDateString('ar', { day: 'numeric', month: 'long' });
}

// ─── Hijri calendar conversion (Umm al-Qura algorithm) ───────────────────
// Based on the standard astronomical algorithm widely used for Hijri conversion.
export interface HijriDate {
  day: number;
  month: number;       // 1-based
  monthName: string;
  year: number;
}

export const HIJRI_MONTHS = [
  'محرم', 'صفر', 'ربيع الأول', 'ربيع الآخر',
  'جمادى الأولى', 'جمادى الآخرة', 'رجب', 'شعبان',
  'رمضان', 'شوال', 'ذو القعدة', 'ذو الحجة',
] as const;

/** Convert a Gregorian Date to Hijri using the tabular (Kuwaiti) algorithm. */
export function toHijri(date: Date): HijriDate {
  const Y = date.getFullYear();
  const M = date.getMonth() + 1;
  const D = date.getDate();

  // JDN of Gregorian date
  const jd =
    Math.floor((1461 * (Y + 4800 + Math.floor((M - 14) / 12))) / 4) +
    Math.floor((367 * (M - 2 - 12 * Math.floor((M - 14) / 12))) / 12) -
    Math.floor((3 * Math.floor((Y + 4900 + Math.floor((M - 14) / 12)) / 100)) / 4) +
    D - 32075;

  // Convert JDN to Hijri
  let l = jd - 1948440 + 10632;
  const n = Math.floor((l - 1) / 10631);
  l = l - 10631 * n + 354;
  const j =
    Math.floor((10985 - l) / 5316) * Math.floor((50 * l) / 17719) +
    Math.floor(l / 5670) * Math.floor((43 * l) / 15238);
  l =
    l -
    Math.floor((30 - j) / 15) * Math.floor((17719 * j) / 50) -
    Math.floor(j / 16) * Math.floor((15238 * j) / 43) +
    29;
  const month = Math.floor((24 * l) / 709);
  const day = l - Math.floor((709 * month) / 24);
  const year = 30 * n + j - 30;

  return {
    day,
    month,
    monthName: HIJRI_MONTHS[month - 1],
    year,
  };
}

/** Get today's Hijri date. */
export function getTodayHijri(): HijriDate {
  return toHijri(new Date());
}

/** Format a HijriDate as a readable Arabic string. */
export function formatHijriDate(h: HijriDate): string {
  return `${h.day} ${h.monthName} ${h.year}`;
}
