// Human-readable, localized descriptions + band classifiers for the
// weather hub.
//
// Everything in the app speaks WMO weather codes (both providers
// normalise to them — see openWeatherMap.ts `owmIdToWmo`). This module
// turns those raw numbers, plus UV / AQI / pollen values, into the short
// Arabic + German strings and colour tokens the UI renders. Keeping it
// in one place means the hero card, hourly strip, insight pills, and air
// quality card all share a single vocabulary.

export type Lang = 'ar' | 'de';

// ── WMO code → condition text ────────────────────────────────────────────
//
// Codes follow the WMO 4677 present-weather table as exposed by
// Open-Meteo. Day/night doesn't change the wording (only the glyph), so
// the description is a pure function of the code.

const WMO_TEXT: Record<number, { ar: string; de: string }> = {
  0:  { ar: 'صحو',                       de: 'Klar' },
  1:  { ar: 'صحو غالباً',                de: 'Überwiegend klar' },
  2:  { ar: 'غائم جزئياً',               de: 'Teilweise bewölkt' },
  3:  { ar: 'غائم',                      de: 'Bedeckt' },
  45: { ar: 'ضباب',                      de: 'Nebel' },
  48: { ar: 'ضباب صقيعي',                de: 'Reifnebel' },
  51: { ar: 'رذاذ خفيف',                 de: 'Leichter Nieselregen' },
  53: { ar: 'رذاذ معتدل',                de: 'Mäßiger Nieselregen' },
  55: { ar: 'رذاذ كثيف',                 de: 'Dichter Nieselregen' },
  56: { ar: 'رذاذ متجمّد خفيف',          de: 'Leichter gefrierender Niesel' },
  57: { ar: 'رذاذ متجمّد كثيف',          de: 'Dichter gefrierender Niesel' },
  61: { ar: 'مطر خفيف',                  de: 'Leichter Regen' },
  63: { ar: 'مطر معتدل',                 de: 'Mäßiger Regen' },
  65: { ar: 'مطر غزير',                  de: 'Starker Regen' },
  66: { ar: 'مطر متجمّد خفيف',           de: 'Leichter gefrierender Regen' },
  67: { ar: 'مطر متجمّد غزير',           de: 'Starker gefrierender Regen' },
  71: { ar: 'ثلج خفيف',                  de: 'Leichter Schneefall' },
  73: { ar: 'ثلج معتدل',                 de: 'Mäßiger Schneefall' },
  75: { ar: 'ثلج كثيف',                  de: 'Starker Schneefall' },
  77: { ar: 'حبيبات ثلجية',              de: 'Schneegriesel' },
  80: { ar: 'زخّات مطر خفيفة',           de: 'Leichte Regenschauer' },
  81: { ar: 'زخّات مطر معتدلة',          de: 'Mäßige Regenschauer' },
  82: { ar: 'زخّات مطر عنيفة',           de: 'Heftige Regenschauer' },
  85: { ar: 'زخّات ثلج خفيفة',           de: 'Leichte Schneeschauer' },
  86: { ar: 'زخّات ثلج كثيفة',           de: 'Starke Schneeschauer' },
  95: { ar: 'عاصفة رعدية',               de: 'Gewitter' },
  96: { ar: 'عاصفة رعدية مع بَرَد',      de: 'Gewitter mit Hagel' },
  99: { ar: 'عاصفة رعدية مع بَرَد غزير', de: 'Gewitter mit starkem Hagel' },
};

export function describeWeatherCode(code: number, lang: Lang): string {
  const entry = WMO_TEXT[code];
  if (entry) return entry[lang];
  // Unknown codes degrade to the closest family rather than an empty
  // string so the hero never renders a blank line.
  if (code >= 95) return lang === 'ar' ? 'عاصفة رعدية' : 'Gewitter';
  if (code >= 71) return lang === 'ar' ? 'ثلج' : 'Schnee';
  if (code >= 51) return lang === 'ar' ? 'مطر' : 'Regen';
  if (code >= 45) return lang === 'ar' ? 'ضباب' : 'Nebel';
  if (code >= 2)  return lang === 'ar' ? 'غائم' : 'Bewölkt';
  return lang === 'ar' ? 'صحو' : 'Klar';
}

// ── UV index band ────────────────────────────────────────────────────────
//
// WHO standard bands. `textClass` / `barClass` are Tailwind tokens so the
// hero metric tile can tint itself by severity.

export interface Band {
  label: string;
  /** Tailwind text colour utility — routed through --sev-* tokens. */
  textClass: string;
  /** Tailwind background utility — routed through --sev-* tokens. */
  barClass: string;
  /** Raw CSS colour expression for inline styling, e.g. SVG strokes
   *  where Tailwind's JIT can't see a dynamically-built class name.
   *  Resolves the matching --sev-* token at use site. */
  hex: string;
  /** 0..1 position used to fill a linear meter. */
  fill: number;
}

// Severity slot → matching --sev-* token. Each slot has a fixed literal
// Tailwind class so JIT can pick it up at build time.
const SEV = {
  good:      { text: 'text-[hsl(var(--sev-good))]',      bg: 'bg-[hsl(var(--sev-good))]',      hex: 'hsl(var(--sev-good))' },
  low:       { text: 'text-[hsl(var(--sev-low))]',       bg: 'bg-[hsl(var(--sev-low))]',       hex: 'hsl(var(--sev-low))' },
  moderate:  { text: 'text-[hsl(var(--sev-moderate))]',  bg: 'bg-[hsl(var(--sev-moderate))]',  hex: 'hsl(var(--sev-moderate))' },
  high:      { text: 'text-[hsl(var(--sev-high))]',      bg: 'bg-[hsl(var(--sev-high))]',      hex: 'hsl(var(--sev-high))' },
  veryHigh:  { text: 'text-[hsl(var(--sev-very-high))]', bg: 'bg-[hsl(var(--sev-very-high))]', hex: 'hsl(var(--sev-very-high))' },
  extreme:   { text: 'text-[hsl(var(--sev-extreme))]',   bg: 'bg-[hsl(var(--sev-extreme))]',   hex: 'hsl(var(--sev-extreme))' },
} as const;

function band(label: string, slot: keyof typeof SEV, fill: number): Band {
  const s = SEV[slot];
  return { label, textClass: s.text, barClass: s.bg, hex: s.hex, fill };
}

export function uvBand(uv: number, lang: Lang): Band {
  const fill = Math.max(0, Math.min(1, uv / 11));
  if (uv < 3)  return band(lang === 'ar' ? 'منخفض'    : 'Niedrig',  'good',     fill);
  if (uv < 6)  return band(lang === 'ar' ? 'معتدل'    : 'Mäßig',    'moderate', fill);
  if (uv < 8)  return band(lang === 'ar' ? 'مرتفع'    : 'Hoch',     'high',     fill);
  if (uv < 11) return band(lang === 'ar' ? 'مرتفع جداً' : 'Sehr hoch', 'veryHigh', fill);
  return band(lang === 'ar' ? 'شديد' : 'Extrem', 'extreme', fill);
}

// ── European Air Quality Index band ──────────────────────────────────────
//
// Open-Meteo's `european_aqi` runs 0..100+ across six bands. The OWM
// adapter maps its 1–5 US scale onto the same range (see
// openWeatherMap.ts) so these bands stay consistent across providers.

export function aqiBand(aqi: number, lang: Lang): Band {
  const fill = Math.max(0, Math.min(1, aqi / 100));
  if (aqi <= 20)  return band(lang === 'ar' ? 'جيّد'     : 'Gut',          'good',     fill);
  if (aqi <= 40)  return band(lang === 'ar' ? 'مقبول'    : 'Akzeptabel',   'low',      fill);
  if (aqi <= 60)  return band(lang === 'ar' ? 'متوسّط'   : 'Mäßig',        'moderate', fill);
  if (aqi <= 80)  return band(lang === 'ar' ? 'سيّئ'     : 'Schlecht',     'high',     fill);
  if (aqi <= 100) return band(lang === 'ar' ? 'سيّئ جداً' : 'Sehr schlecht', 'veryHigh', fill);
  return band(lang === 'ar' ? 'خطير' : 'Extrem', 'extreme', fill);
}

// ── Critical pollutant ───────────────────────────────────────────────────
//
// The European AQI is a max-of-sub-indices. Surfacing *which* pollutant
// drives the current value is far more actionable than the bare number,
// so we pick the highest sub-index and return its display label.

const POLLUTANT_LABEL: Record<string, { ar: string; de: string }> = {
  pm2_5: { ar: 'جسيمات 2.5', de: 'Feinstaub 2,5' },
  pm10:  { ar: 'جسيمات 10',  de: 'Feinstaub 10' },
  no2:   { ar: 'ثاني أكسيد النيتروجين', de: 'Stickstoffdioxid' },
  o3:    { ar: 'الأوزون',     de: 'Ozon' },
  so2:   { ar: 'ثاني أكسيد الكبريت',   de: 'Schwefeldioxid' },
};

export function criticalPollutant(
  sub: Record<string, number | null | undefined> | undefined,
  lang: Lang,
): { key: string; label: string; value: number } | null {
  if (!sub) return null;
  let best: { key: string; value: number } | null = null;
  for (const [key, value] of Object.entries(sub)) {
    if (typeof value !== 'number') continue;
    if (!best || value > best.value) best = { key, value };
  }
  if (!best) return null;
  const label = POLLUTANT_LABEL[best.key]?.[lang] ?? best.key.toUpperCase();
  return { key: best.key, label, value: Math.round(best.value) };
}

// ── Pollen ───────────────────────────────────────────────────────────────
//
// Open-Meteo reports pollen in grains/m³. Thresholds differ slightly per
// species in clinical sources, but a single general scale is accurate
// enough for an at-a-glance allergy heads-up and keeps the card simple.

export const POLLEN_LABEL: Record<string, { ar: string; de: string }> = {
  alder:   { ar: 'حور (جار الماء)', de: 'Erle' },
  birch:   { ar: 'البتولا',          de: 'Birke' },
  grass:   { ar: 'الأعشاب',          de: 'Gräser' },
  mugwort: { ar: 'الشيح',            de: 'Beifuß' },
  olive:   { ar: 'الزيتون',          de: 'Olive' },
  ragweed: { ar: 'عشبة الرعوة',      de: 'Ambrosia' },
};

export function pollenLevel(value: number, lang: Lang): Band {
  const fill = Math.max(0, Math.min(1, value / 100));
  if (value <= 0)  return {
    label: lang === 'ar' ? 'لا يوجد' : 'Keine',
    textClass: 'text-muted-foreground',
    barClass: 'bg-muted-foreground/40',
    hex: 'hsl(var(--muted-foreground))',
    fill,
  };
  if (value < 20)  return band(lang === 'ar' ? 'منخفض'   : 'Niedrig',  'good',     fill);
  if (value < 50)  return band(lang === 'ar' ? 'معتدل'   : 'Mäßig',    'moderate', fill);
  if (value < 100) return band(lang === 'ar' ? 'مرتفع'   : 'Hoch',     'high',     fill);
  return band(lang === 'ar' ? 'مرتفع جداً' : 'Sehr hoch', 'veryHigh', fill);
}
