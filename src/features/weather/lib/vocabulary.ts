/**
 * Arabic vocabulary for the weather domain.
 *
 * The engine's enums stay in English on purpose — `'unhealthy_sensitive'` is a
 * stable data value that adapters, caches and tests compare against, and
 * translating it at the source would make the cache locale-dependent. What was
 * wrong is that the UI rendered those raw values: the weather screen showed
 * "low", "broken", "Near Gale" and "Air is healthy" in the middle of otherwise
 * Arabic copy, and the compass read "NNE".
 *
 * This module is the boundary: data in, Arabic out. Every lookup falls back to
 * a dash rather than to the English value, so a new enum member surfaces as a
 * visible gap during review instead of silently leaking English to users.
 */

const DASH = '—';

/* ── UV ─────────────────────────────────────────────────────────────── */
const UV_CATEGORY: Record<string, string> = {
  low: 'منخفض',
  moderate: 'متوسط',
  high: 'مرتفع',
  very_high: 'مرتفع جداً',
  extreme: 'شديد الخطورة',
};

export function uvCategoryLabel(value: string): string {
  return UV_CATEGORY[value] ?? DASH;
}

/* ── Air quality ────────────────────────────────────────────────────── */
const AQI_CATEGORY: Record<string, string> = {
  good: 'جيد',
  moderate: 'مقبول',
  unhealthy_sensitive: 'سيئ للفئات الحساسة',
  unhealthy: 'غير صحي',
  very_unhealthy: 'ضار جداً',
  hazardous: 'خطِر',
};

export function aqiCategoryLabel(value: string): string {
  return AQI_CATEGORY[value] ?? DASH;
}

/**
 * Health guidance for an AQI value. Replaces the engine's English
 * `health_advisory` string, which was assembled with two ternaries and could
 * never be localised.
 */
export function aqiAdvice(aqiUs: number): string {
  if (aqiUs <= 50) return 'الهواء نقي — لا قيود على النشاط في الخارج.';
  if (aqiUs <= 100) return 'مقبول عموماً؛ شديدو الحساسية قد يلاحظون تهيّجاً بسيطاً.';
  if (aqiUs <= 150) return 'أصحاب الربو والأمراض التنفسية: قلّلوا المجهود الطويل في الخارج.';
  if (aqiUs <= 200) return 'غير صحي — اجعل النشاط الخارجي قصيراً وخفيفاً.';
  if (aqiUs <= 300) return 'ضار جداً — الأفضل البقاء في الداخل وإغلاق النوافذ.';
  return 'خطِر — تجنّب الخروج، واستخدم تنقية الهواء إن توفّرت.';
}

/* ── Pollutants ─────────────────────────────────────────────────────── */
const POLLUTANT: Record<string, string> = {
  pm25: 'جسيمات ٢.٥',
  'pm2.5': 'جسيمات ٢.٥',
  pm10: 'جسيمات ١٠',
  o3: 'أوزون',
  no2: 'ثاني أكسيد النيتروجين',
  so2: 'ثاني أكسيد الكبريت',
  co: 'أول أكسيد الكربون',
  nh3: 'نشادر',
  unknown: 'غير محدد',
};

export function pollutantLabel(value: string): string {
  return POLLUTANT[value.toLowerCase()] ?? value.toUpperCase();
}

/* ── Sky / cloud cover ──────────────────────────────────────────────── */
const CLOUD_TYPE: Record<string, string> = {
  clear: 'صافٍ',
  few: 'سحب قليلة',
  scattered: 'سحب متفرقة',
  broken: 'سحب متقطعة',
  overcast: 'غيوم كثيفة',
};

export function cloudTypeLabel(value: string): string {
  return CLOUD_TYPE[value] ?? DASH;
}

/* ── Thermal comfort ────────────────────────────────────────────────── */
const COMFORT: Record<string, string> = {
  freezing: 'قارس',
  very_cold: 'بارد جداً',
  cold: 'بارد',
  cool: 'منعش',
  comfortable: 'مريح',
  warm: 'دافئ',
  hot: 'حار',
  very_hot: 'حار جداً',
  dangerous: 'خطِر',
  extreme: 'شديد',
};

export function comfortLabel(value: string): string {
  return COMFORT[value] ?? DASH;
}

/* ── Wind ───────────────────────────────────────────────────────────── */
/** Beaufort force 0–12 in Arabic, indexed by force number. */
const BEAUFORT_AR = [
  'سكون',
  'هواء خفيف',
  'نسيم خفيف',
  'نسيم لطيف',
  'نسيم معتدل',
  'نسيم منعش',
  'نسيم قوي',
  'ريح شديدة',
  'عاصفة خفيفة',
  'عاصفة قوية',
  'عاصفة',
  'عاصفة عنيفة',
  'إعصار',
];

export function beaufortLabel(scale: number): string {
  return BEAUFORT_AR[Math.max(0, Math.min(12, Math.round(scale)))] ?? DASH;
}

/** Sea state 0–9 in Arabic. */
const SEA_STATE_AR = [
  'هادئ كالمرآة',
  'هادئ متموّج',
  'ناعم',
  'خفيف',
  'معتدل',
  'مضطرب',
  'مضطرب جداً',
  'عالٍ',
  'عالٍ جداً',
  'استثنائي',
];

export function seaStateLabel(state: number): string {
  return SEA_STATE_AR[Math.max(0, Math.min(9, Math.round(state)))] ?? DASH;
}

/**
 * 16-point compass in Arabic. The engine stores the latin abbreviation
 * ('NNE'); this maps it for display.
 */
const COMPASS_AR: Record<string, string> = {
  N: 'شمال',
  NNE: 'شمال شمال شرق',
  NE: 'شمال شرق',
  ENE: 'شرق شمال شرق',
  E: 'شرق',
  ESE: 'شرق جنوب شرق',
  SE: 'جنوب شرق',
  SSE: 'جنوب جنوب شرق',
  S: 'جنوب',
  SSW: 'جنوب جنوب غرب',
  SW: 'جنوب غرب',
  WSW: 'غرب جنوب غرب',
  W: 'غرب',
  WNW: 'غرب شمال غرب',
  NW: 'شمال غرب',
  NNW: 'شمال شمال غرب',
};

/** Compact form — the long names do not fit a metric tile. */
const COMPASS_AR_SHORT: Record<string, string> = {
  N: 'شمال',
  NNE: 'ش ش شرق',
  NE: 'ش شرق',
  ENE: 'شرق ش شرق',
  E: 'شرق',
  ESE: 'شرق ج شرق',
  SE: 'ج شرق',
  SSE: 'ج ج شرق',
  S: 'جنوب',
  SSW: 'ج ج غرب',
  SW: 'ج غرب',
  WSW: 'غرب ج غرب',
  W: 'غرب',
  WNW: 'غرب ش غرب',
  NW: 'ش غرب',
  NNW: 'ش ش غرب',
};

export function compassLabel(value: string, short = false): string {
  const table = short ? COMPASS_AR_SHORT : COMPASS_AR;
  return table[value?.toUpperCase()] ?? DASH;
}

/* ── Precipitation type ─────────────────────────────────────────────── */
const PRECIP_TYPE: Record<string, string> = {
  none: 'لا هطول',
  rain: 'مطر',
  snow: 'ثلج',
  sleet: 'مطر ثلجي',
  freezing_rain: 'مطر متجمد',
  hail: 'برد',
  drizzle: 'رذاذ',
};

export function precipTypeLabel(value: string): string {
  return PRECIP_TYPE[value] ?? DASH;
}

/* ── Pollen / severe weather risk ───────────────────────────────────── */
const RISK: Record<string, string> = {
  none: 'لا يوجد',
  low: 'منخفض',
  moderate: 'متوسط',
  high: 'مرتفع',
  very_high: 'مرتفع جداً',
  extreme: 'شديد',
};

export function riskLabel(value: string): string {
  return RISK[value] ?? DASH;
}

/* ── Ensemble confidence ────────────────────────────────────────────── */
/** Plain-language reading of an ensemble confidence percentage. */
export function confidenceLabel(percent: number): string {
  if (percent >= 85) return 'اتفاق عالٍ بين النماذج';
  if (percent >= 70) return 'اتفاق جيد';
  if (percent >= 50) return 'اتفاق جزئي';
  if (percent >= 30) return 'تباعد ملحوظ';
  return 'تباعد كبير — تعامل بحذر';
}

export { DASH as VOCABULARY_DASH };
