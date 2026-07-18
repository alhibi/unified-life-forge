/**
 * تطبيع النصّ العربي + توليد slugs + استخراج بيانات أدبية من النصّ.
 * متطابق مع normalize_arabic في Postgres لضمان توافق الفهارس.
 */

const TASHKEEL = /[\u0610-\u061A\u064B-\u065F\u0670\u06D6-\u06ED\u0640]/g;
const HAMZAS   = /[إأآا]/g;
const ALIF_MAQ = /ى/g;
const TA_MARB  = /ة/g;

export function normalizeArabic(s: string | null | undefined): string {
  if (!s) return '';
  return s
    .replace(TASHKEEL, '')
    .replace(HAMZAS, 'ا')
    .replace(ALIF_MAQ, 'ي')
    .replace(TA_MARB, 'ه')
    .toLowerCase()
    .trim();
}

const TRANSLIT: Record<string, string> = {
  ا: 'a', أ: 'a', إ: 'i', آ: 'a', ب: 'b', ت: 't', ث: 'th',
  ج: 'j', ح: 'h', خ: 'kh', د: 'd', ذ: 'dh', ر: 'r', ز: 'z',
  س: 's', ش: 'sh', ص: 's', ض: 'd', ط: 't', ظ: 'z', ع: 'a',
  غ: 'gh', ف: 'f', ق: 'q', ك: 'k', ل: 'l', م: 'm', ن: 'n',
  ه: 'h', و: 'w', ي: 'y', ى: 'a', ة: 'h', ء: '', ' ': '-',
};

/**
 * يُنتج slug ASCII قصير ومستقر من أيّ نصّ عربي.
 * يضيف external_id لو وُجد لتجنّب التصادمات.
 */
export function buildSlug(arabicName: string, externalId?: string | number): string {
  const cleaned = normalizeArabic(arabicName)
    .replace(/[^\u0621-\u064A\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
  let slug = '';
  for (const ch of cleaned) slug += TRANSLIT[ch] ?? '';
  slug = slug.replace(/-+/g, '-').replace(/^-|-$/g, '');
  if (!slug) slug = 'item';
  if (externalId !== undefined && externalId !== null) {
    slug = `${slug}-${String(externalId)}`;
  }
  // قصّ الحدّ الأعلى
  return slug.length > 96 ? slug.slice(0, 96) : slug;
}

/**
 * يحاول استخراج البحر من نصّ معلوماتي (مثل: "البحر: الطويل").
 * يُرجع null لو لم يُعثر.
 */
const METER_NAMES = [
  'الطويل', 'البسيط', 'الكامل', 'الوافر', 'الهزج', 'الرجز',
  'الرمل', 'السريع', 'المنسرح', 'الخفيف', 'المضارع', 'المقتضب',
  'المجتث', 'المتقارب', 'المتدارك',
];

export function extractMeter(text: string): string | undefined {
  if (!text) return undefined;
  const norm = normalizeArabic(text);
  for (const m of METER_NAMES) {
    if (norm.includes(normalizeArabic(m))) return m;
  }
  return undefined;
}

/**
 * استخراج حرف الروي (آخر حرف صحيح من العجز، تجاهل التشكيل والصلة).
 * تقريب جيّد دون محرّك عَروض كامل — كافٍ للفلترة.
 */
export function extractRhyme(lastHemistich: string): string | undefined {
  if (!lastHemistich) return undefined;
  const cleaned = lastHemistich
    .replace(TASHKEEL, '')
    .replace(/[^\u0621-\u064A]/g, '')
    .trim();
  if (!cleaned) return undefined;
  // تجاهل هاء الضمير وألف/ياء الصلة
  let i = cleaned.length - 1;
  while (i >= 0 && /[هويا]/.test(cleaned[i])) i--;
  return i >= 0 ? cleaned[i] : cleaned[cleaned.length - 1];
}

/**
 * يحوّل بيتًا أدبيًا واحدًا (سطر فيه " — " أو tabs أو فراغ متعدّد بين الشطرين)
 * إلى صدر/عجز.
 */
const HEMI_SPLIT = /\s{3,}|\s*[—–-]\s+|\s*\*\s*/;
export function splitVerse(line: string): { h1: string; h2?: string } {
  if (!line) return { h1: '' };
  const trimmed = line.trim();
  const parts = trimmed.split(HEMI_SPLIT).filter(Boolean);
  if (parts.length >= 2) {
    return {
      h1: parts[0].replace(/\s+/g, ' ').trim(),
      h2: parts.slice(1).join(' ').replace(/\s+/g, ' ').trim(),
    };
  }
  return { h1: trimmed.replace(/\s+/g, ' ') };
}

/** تستخرج سنة ميلادية من عبارات مثل "(915-965م)" أو "915 م". */
export function extractYears(s?: string): { birth?: number; death?: number } {
  if (!s) return {};
  const m = s.match(/(\d{2,4})\s*[-–]\s*(\d{2,4})/);
  if (m) return { birth: +m[1], death: +m[2] };
  const single = s.match(/(\d{2,4})\s*م/);
  if (single) return { death: +single[1] };
  return {};
}
