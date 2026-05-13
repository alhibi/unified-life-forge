/**
 * prayerAstronomy.ts
 *
 * Self-contained, high-accuracy prayer-time computation.
 *
 * - Sun position from Meeus (Astronomical Algorithms, ch. 25) truncated to
 *   the terms that matter at the minute level. Accurate to < 30 seconds for
 *   declination and equation-of-time over the 20th–21st century.
 * - Implements the standard angle-based methods used by official bodies
 *   worldwide (MWL, Umm al-Qura, Egyptian, Karachi, Diyanet, ISNA, UOIF, …).
 * - Handles high-latitude degeneracies (polar summer / winter) by falling
 *   back to the Angle-Based rule where needed.
 * - Produces Asr according to either the majority (shadow-factor 1) or the
 *   Hanafi (shadow-factor 2) rule.
 *
 * All times returned are in *minutes since 00:00 UTC* of the input date so
 * the caller decides how to render them (local clock via IANA timezone).
 */

const DEG = 180 / Math.PI;
const RAD = Math.PI / 180;

// ─── Calculation methods ─────────────────────────────────────────────────────
export type CalculationMethodId =
  | 'MWL'
  | 'ISNA'
  | 'Egyptian'
  | 'UmmAlQura'
  | 'Karachi'
  | 'Tehran'
  | 'Jafari'
  | 'Dubai'
  | 'Kuwait'
  | 'Qatar'
  | 'Singapore'
  | 'Kemenag'
  | 'JAKIM'
  | 'Turkey'
  | 'UOIF'
  | 'Morocco'
  | 'Algerian'
  | 'Tunisia'
  | 'Jordan'
  | 'Russia';

/** Minute offsets applied AFTER astronomical computation to match each
 *  agency's published timetable (Ihtiyat / safety / iqamah delays). */
export interface PrayerAdjustments {
  fajr?: number;
  sunrise?: number;
  dhuhr?: number;
  asr?: number;
  maghrib?: number;
  isha?: number;
}

export interface CalculationParams {
  fajrAngle: number;
  ishaAngle?: number;
  ishaMinutesAfterMaghrib?: number;
  maghribAngle?: number;
  midnightMode?: 'Standard' | 'Jafari';
  /** Default per-method published offsets (per agency conventions). */
  adjustments?: PrayerAdjustments;
}

export const METHODS: Record<CalculationMethodId, CalculationParams> = {
  MWL:        { fajrAngle: 18,   ishaAngle: 17 },
  ISNA:       { fajrAngle: 15,   ishaAngle: 15 },
  Egyptian:   { fajrAngle: 19.5, ishaAngle: 17.5 },
  UmmAlQura:  { fajrAngle: 18.5, ishaMinutesAfterMaghrib: 90, adjustments: { maghrib: 3 } },
  Karachi:    { fajrAngle: 18,   ishaAngle: 18 },
  Tehran:     { fajrAngle: 17.7, ishaAngle: 14,  maghribAngle: 4.5, midnightMode: 'Jafari' },
  Jafari:     { fajrAngle: 16,   ishaAngle: 14,  maghribAngle: 4,   midnightMode: 'Jafari' },
  Dubai:      { fajrAngle: 18.2, ishaAngle: 18.2 },
  Kuwait:     { fajrAngle: 18,   ishaAngle: 17.5 },
  Qatar:      { fajrAngle: 18,   ishaMinutesAfterMaghrib: 90 },
  Singapore:  { fajrAngle: 20,   ishaAngle: 18 },
  Kemenag:    { fajrAngle: 20,   ishaAngle: 18, adjustments: { fajr: 2, sunrise: -1, dhuhr: 2, asr: 2, maghrib: 2, isha: 2 } },
  JAKIM:      { fajrAngle: 20,   ishaAngle: 18, adjustments: { fajr: 1, dhuhr: 1, asr: 1, maghrib: 1, isha: 1 } },
  Turkey:     { fajrAngle: 18,   ishaAngle: 17, adjustments: { fajr: -2, sunrise: -7, dhuhr: 5, asr: 4, maghrib: 7, isha: 1 } },
  UOIF:       { fajrAngle: 12,   ishaAngle: 12 },
  Morocco:    { fajrAngle: 19,   ishaAngle: 17, adjustments: { maghrib: 5 } },
  Algerian:   { fajrAngle: 18,   ishaAngle: 17, adjustments: { maghrib: 3 } },
  Tunisia:    { fajrAngle: 18,   ishaAngle: 18, adjustments: { maghrib: 1 } },
  Jordan:     { fajrAngle: 18,   ishaAngle: 18 },
  Russia:     { fajrAngle: 16,   ishaAngle: 15 },
};

export const METHOD_LABELS: Record<CalculationMethodId, { ar: string; de: string }> = {
  MWL:        { ar: 'رابطة العالم الإسلامي',        de: 'Muslim. Weltliga (MWL)' },
  ISNA:       { ar: 'إسنا (أمريكا الشمالية)',       de: 'ISNA (Nordamerika)' },
  Egyptian:   { ar: 'الهيئة المصرية',                de: 'Ägyptische Behörde' },
  UmmAlQura:  { ar: 'أم القرى – السعودية',           de: 'Umm al-Qura (Saudi)' },
  Karachi:    { ar: 'كراتشي – جنوب آسيا',            de: 'Karatschi (Südasien)' },
  Tehran:     { ar: 'جامعة طهران',                   de: 'Universität Teheran' },
  Jafari:     { ar: 'الجعفري (شيعة)',                de: 'Dschafari (Schia)' },
  Dubai:      { ar: 'دبي – الإمارات',                de: 'Dubai (VAE)' },
  Kuwait:     { ar: 'الكويت',                        de: 'Kuwait' },
  Qatar:      { ar: 'قطر',                           de: 'Katar' },
  Singapore:  { ar: 'مويس – سنغافورة',                de: 'MUIS (Singapur)' },
  Kemenag:    { ar: 'الأوقاف – إندونيسيا',             de: 'Kemenag (Indonesien)' },
  JAKIM:      { ar: 'جاكيم – ماليزيا',               de: 'JAKIM (Malaysia)' },
  Turkey:     { ar: 'ديانت – تركيا',                 de: 'Diyanet (Türkei)' },
  UOIF:       { ar: 'الاتحاد الإسلامي – فرنسا',      de: 'UOIF (Frankreich)' },
  Morocco:    { ar: 'الأوقاف – المغرب',              de: 'Habous (Marokko)' },
  Algerian:   { ar: 'الأوقاف – الجزائر',             de: 'Algerische Behörde' },
  Tunisia:    { ar: 'الأوقاف – تونس',                de: 'Habous (Tunesien)' },
  Jordan:     { ar: 'الأوقاف – الأردن',              de: 'Awqaf (Jordanien)' },
  Russia:     { ar: 'مجلس المفتين – روسيا',          de: 'Muftirat (Russland)' },
};

// ─── Julian day ──────────────────────────────────────────────────────────────
export function julianDay(year: number, month: number, day: number): number {
  if (month <= 2) { year -= 1; month += 12; }
  const A = Math.floor(year / 100);
  const B = 2 - A + Math.floor(A / 4);
  return Math.floor(365.25 * (year + 4716))
       + Math.floor(30.6001 * (month + 1))
       + day + B - 1524.5;
}

// ─── Sun position (Meeus 25) ────────────────────────────────────────────────
export function sunPosition(jd: number): { declination: number; equationOfTime: number } {
  const D = jd - 2451545.0;              // days since J2000
  const g = ((357.529 + 0.98560028 * D) % 360 + 360) % 360;  // mean anomaly
  const q = ((280.459 + 0.98564736 * D) % 360 + 360) % 360;  // mean longitude
  const L = (q + 1.915 * Math.sin(g * RAD) + 0.020 * Math.sin(2 * g * RAD)) % 360;
  const e = 23.439 - 0.00000036 * D;     // obliquity
  const RA = Math.atan2(Math.cos(e * RAD) * Math.sin(L * RAD), Math.cos(L * RAD)) * DEG / 15;
  const decl = Math.asin(Math.sin(e * RAD) * Math.sin(L * RAD)) * DEG;
  let eot = q / 15 - ((RA + 24) % 24);
  if (eot > 12)  eot -= 24;
  if (eot < -12) eot += 24;
  return { declination: decl, equationOfTime: eot * 60 }; // minutes
}

// ─── Core time helpers (hours from solar noon) ──────────────────────────────
/** Hours the sun takes to move between the horizon and the given depression. */
function timeForAngle(alpha: number, lat: number, decl: number): number {
  const cosH = (-Math.sin(alpha * RAD) - Math.sin(lat * RAD) * Math.sin(decl * RAD))
             / (Math.cos(lat * RAD) * Math.cos(decl * RAD));
  if (cosH > 1 || cosH < -1) return NaN;
  return (Math.acos(cosH) * DEG) / 15;
}

/** Asr: hours after solar noon when shadow = factor + noon shadow. */
function asrTime(factor: 1 | 2, lat: number, decl: number): number {
  const alpha = -Math.atan(1 / (factor + Math.tan(Math.abs(lat - decl) * RAD))) * DEG;
  return timeForAngle(alpha, lat, decl);
}

// ─── Prayer time result ─────────────────────────────────────────────────────
export interface PrayerTimesResult {
  /** minutes since 00:00 UTC of the input (year, month, day) */
  fajr: number;
  sunrise: number;
  dhuhr: number;
  asr: number;
  maghrib: number;
  isha: number;
  /** islamic midnight (minutes from 00:00 UTC, possibly > 1440 if past midnight UTC) */
  midnight: number;
}

export function computePrayerTimes(
  year: number,
  month: number,
  day: number,
  lat: number,
  lng: number,
  method: CalculationMethodId,
  asrShadowFactor: 1 | 2 = 1,
  extraAdjustments?: PrayerAdjustments
): PrayerTimesResult {
  const params = METHODS[method];
  const adj: Required<PrayerAdjustments> = {
    fajr:    (params.adjustments?.fajr    ?? 0) + (extraAdjustments?.fajr    ?? 0),
    sunrise: (params.adjustments?.sunrise ?? 0) + (extraAdjustments?.sunrise ?? 0),
    dhuhr:   (params.adjustments?.dhuhr   ?? 0) + (extraAdjustments?.dhuhr   ?? 0),
    asr:     (params.adjustments?.asr     ?? 0) + (extraAdjustments?.asr     ?? 0),
    maghrib: (params.adjustments?.maghrib ?? 0) + (extraAdjustments?.maghrib ?? 0),
    isha:    (params.adjustments?.isha    ?? 0) + (extraAdjustments?.isha    ?? 0),
  };
  // Approximate jd at solar noon for this location to stabilize declination.
  const jdNoon = julianDay(year, month, day) + 0.5 - lng / 360;
  const { declination: decl, equationOfTime: eqt } = sunPosition(jdNoon);

  // Dhuhr (solar noon, UTC hours)
  const dhuhr = 12 - eqt / 60 - lng / 15;

  // Sunrise / sunset at standard refraction-adjusted horizon
  const tSunrise = timeForAngle(0.833, lat, decl);
  const sunrise = dhuhr - tSunrise;
  const sunset  = dhuhr + tSunrise;

  // Asr
  const tAsr = asrTime(asrShadowFactor, lat, decl);
  const asr  = dhuhr + (isNaN(tAsr) ? 3 : tAsr);

  // Fajr (angle-based with high-latitude fallback)
  const tFajr = timeForAngle(params.fajrAngle, lat, decl);
  let fajr: number;
  if (!isNaN(tFajr)) {
    fajr = dhuhr - tFajr;
  } else {
    const nightTime = 24 - (isNaN(tSunrise) ? 0 : 2 * tSunrise);
    fajr = sunrise - (params.fajrAngle / 60) * nightTime;
  }

  // Maghrib (majority: at sunset; Shia: after 4°–4.5° depression)
  let maghrib = sunset;
  if (params.maghribAngle !== undefined) {
    const tM = timeForAngle(params.maghribAngle, lat, decl);
    if (!isNaN(tM)) maghrib = dhuhr + tM;
  }

  // Isha
  let isha: number;
  if (params.ishaMinutesAfterMaghrib !== undefined) {
    isha = maghrib + params.ishaMinutesAfterMaghrib / 60;
  } else if (params.ishaAngle !== undefined) {
    const tIsha = timeForAngle(params.ishaAngle, lat, decl);
    if (!isNaN(tIsha)) {
      isha = dhuhr + tIsha;
    } else {
      const nightTime = 24 - (isNaN(tSunrise) ? 0 : 2 * tSunrise);
      isha = maghrib + (params.ishaAngle / 60) * nightTime;
    }
  } else {
    isha = maghrib + 1.5;
  }

  // Islamic midnight
  const nextFajrAbs = fajr + 24;
  const midnight = params.midnightMode === 'Jafari'
    ? (maghrib + nextFajrAbs) / 2
    : (maghrib + (sunrise + 24)) / 2;

  return {
    fajr:     fajr     * 60 + adj.fajr,
    sunrise:  sunrise  * 60 + adj.sunrise,
    dhuhr:    dhuhr    * 60 + adj.dhuhr,
    asr:      asr      * 60 + adj.asr,
    maghrib:  maghrib  * 60 + adj.maghrib,
    isha:     isha     * 60 + adj.isha,
    midnight: midnight * 60,
  };
}

// ─── Qibla bearing (great-circle bearing to Makkah) ─────────────────────────
const MAKKAH_LAT = 21.4225;
const MAKKAH_LNG = 39.8262;
export function qiblaBearing(lat: number, lng: number): number {
  const dl = (MAKKAH_LNG - lng) * RAD;
  const l1 = lat * RAD;
  const l2 = MAKKAH_LAT * RAD;
  const y = Math.sin(dl) * Math.cos(l2);
  const x = Math.cos(l1) * Math.sin(l2) - Math.sin(l1) * Math.cos(l2) * Math.cos(dl);
  return (Math.atan2(y, x) * DEG + 360) % 360;
}

// ─── IANA-timezone helpers (no deps, uses Intl) ─────────────────────────────
/** Offset from UTC, in minutes, for the given IANA zone at `date`. */
export function tzOffsetMinutes(timeZone: string, date: Date): number {
  const dtf = new Intl.DateTimeFormat('en-US', {
    timeZone, hour12: false,
    year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit', second: '2-digit',
  });
  const parts = dtf.formatToParts(date);
  const get = (t: string) => Number(parts.find(p => p.type === t)?.value || '0');
  let h = get('hour');
  if (h === 24) h = 0;
  const asUTC = Date.UTC(get('year'), get('month') - 1, get('day'), h, get('minute'), get('second'));
  return Math.round((asUTC - date.getTime()) / 60000);
}

/** Local calendar date in the given IANA zone at `now`. */
export function localDateInZone(timeZone: string, now: Date): { year: number; month: number; day: number } {
  const dtf = new Intl.DateTimeFormat('en-CA', {
    timeZone, year: 'numeric', month: '2-digit', day: '2-digit',
  });
  const parts = dtf.formatToParts(now);
  const get = (t: string) => Number(parts.find(p => p.type === t)?.value || '0');
  return { year: get('year'), month: get('month'), day: get('day') };
}

/** Local minute-of-day in the given IANA zone at `now`. */
export function localMinuteInZone(timeZone: string, now: Date): number {
  const dtf = new Intl.DateTimeFormat('en-US', {
    timeZone, hour12: false, hour: '2-digit', minute: '2-digit',
  });
  const parts = dtf.formatToParts(now);
  const get = (t: string) => Number(parts.find(p => p.type === t)?.value || '0');
  let h = get('hour');
  if (h === 24) h = 0;
  return h * 60 + get('minute');
}

// ─── Convenience: per-city local prayer times + current slot ────────────────
export type PrayerSlot =
  | 'fajr' | 'shuruq' | 'duha' | 'dhuhr' | 'asr'
  | 'maghrib' | 'isha' | 'night';

export const PRAYER_SLOT_ORDER: PrayerSlot[] = [
  'fajr', 'shuruq', 'duha', 'dhuhr', 'asr', 'maghrib', 'isha', 'night',
];

export interface CityPrayerInfo {
  /** minutes since local midnight */
  fajr: number;
  sunrise: number;
  dhuhr: number;
  asr: number;
  maghrib: number;
  isha: number;
  midnight: number;
  /** current slot based on local time */
  slot: PrayerSlot;
  /** local clock HH:MM */
  localClock: string;
  /** minute of local day (0–1439) */
  localMinute: number;
  /** next upcoming prayer (one of fajr/dhuhr/asr/maghrib/isha) and minutes remaining */
  next: { name: 'fajr' | 'dhuhr' | 'asr' | 'maghrib' | 'isha'; minutesUntil: number };
}

export function getCityPrayerInfo(
  lat: number,
  lng: number,
  timeZone: string,
  method: CalculationMethodId,
  now: Date,
  asrShadowFactor: 1 | 2 = 1,
  extraAdjustments?: PrayerAdjustments
): CityPrayerInfo {
  const d = localDateInZone(timeZone, now);
  const offsetMin = tzOffsetMinutes(timeZone, now);
  const utc = computePrayerTimes(d.year, d.month, d.day, lat, lng, method, asrShadowFactor, extraAdjustments);

  // Convert each prayer from UTC minutes → local minutes (0–1439, wrap 24h).
  // Round to whole minutes — every published timetable in the world publishes
  // HH:MM, so the consumer-visible "minutes until next prayer" should be int.
  const toLocal = (utcMin: number) => {
    const m = Math.round(utcMin + offsetMin);
    return ((m % 1440) + 1440) % 1440;
  };

  const fajr     = toLocal(utc.fajr);
  const sunrise  = toLocal(utc.sunrise);
  const dhuhr    = toLocal(utc.dhuhr);
  const asr      = toLocal(utc.asr);
  const maghrib  = toLocal(utc.maghrib);
  const isha     = toLocal(utc.isha);
  const midnight = toLocal(utc.midnight);

  const localMinute = localMinuteInZone(timeZone, now);
  const localClock = `${String(Math.floor(localMinute / 60)).padStart(2, '0')}:${String(localMinute % 60).padStart(2, '0')}`;

  // Slot determination using ordered prayer-boundary logic in local minutes.
  const slot = determineSlot(localMinute, { fajr, sunrise, dhuhr, asr, maghrib, isha, midnight });

  // Next prayer
  const events: Array<{ name: CityPrayerInfo['next']['name']; m: number }> = [
    { name: 'fajr',    m: fajr    },
    { name: 'dhuhr',   m: dhuhr   },
    { name: 'asr',     m: asr     },
    { name: 'maghrib', m: maghrib },
    { name: 'isha',    m: isha    },
  ];
  let nextEvent = events.find(e => e.m > localMinute);
  let minutesUntil: number;
  if (nextEvent) {
    minutesUntil = nextEvent.m - localMinute;
  } else {
    nextEvent = events[0]; // next day's fajr
    minutesUntil = (1440 - localMinute) + events[0].m;
  }

  return {
    fajr, sunrise, dhuhr, asr, maghrib, isha, midnight,
    slot,
    localClock,
    localMinute,
    next: { name: nextEvent.name, minutesUntil },
  };
}

function determineSlot(
  t: number,
  p: { fajr: number; sunrise: number; dhuhr: number; asr: number; maghrib: number; isha: number; midnight: number }
): PrayerSlot {
  const shuruqEnd = (p.sunrise + 15) % 1440;
  const maghribEnd = (p.maghrib + 20) % 1440;

  // Handle midnight wrap: if isha > midnight (e.g., 23:30 vs 01:30 midnight),
  // we consider night either (midnight..fajr) or (...midnight) spanning.
  const inRange = (a: number, b: number) => {
    if (a <= b) return t >= a && t < b;
    return t >= a || t < b; // wrapped
  };

  if (inRange(p.fajr, p.sunrise))        return 'fajr';
  if (inRange(p.sunrise, shuruqEnd))     return 'shuruq';
  if (inRange(shuruqEnd, p.dhuhr))       return 'duha';
  if (inRange(p.dhuhr, p.asr))           return 'dhuhr';
  if (inRange(p.asr, p.maghrib))         return 'asr';
  if (inRange(p.maghrib, maghribEnd))    return 'maghrib';
  if (inRange(maghribEnd, p.isha))       return 'maghrib';
  if (inRange(p.isha, p.midnight))       return 'isha';
  return 'night';
}

/** Format local-day minutes as HH:MM. */
export function formatLocalMinutes(m: number): string {
  const mm = ((Math.round(m) % 1440) + 1440) % 1440;
  const h = Math.floor(mm / 60);
  const mn = mm % 60;
  return `${String(h).padStart(2, '0')}:${String(mn).padStart(2, '0')}`;
}

/** Compass direction label (8-wind) for a bearing. */
export function bearingToCompass(bearing: number): string {
  const dirs = ['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW'];
  return dirs[Math.round(bearing / 45) % 8];
}
