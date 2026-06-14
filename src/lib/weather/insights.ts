/**
 * Smart weather insights — Phase A.
 *
 * Pure functions that turn the normalised `WeatherData` (and optional
 * prayer timings) into human-readable suggestions for:
 *
 *   1. Best outdoor moments today (`bestMoments`)
 *      — scans the next 24 hourly entries, scores each on temperature
 *        comfort, precipitation probability and UV index, returns up
 *        to 2 contiguous windows.
 *
 *   2. Outfit recommendation (`outfitForNow`)
 *      — translates current temp/wind/precip/UV into a short message
 *        plus a small list of items (coat, umbrella, shades, hat).
 *
 *   3. Health & prayer tips (`healthTips`)
 *      — at most 3 short bullets: hydration on hot days, UV avoidance
 *        window, "Fajr is cold" when next Fajr is < 5°C, "windy night
 *        prayer", etc.
 *
 * Each function returns plain data so the component layer can render
 * it in either language without re-running the logic.
 */

import type { WeatherData, HourlyEntry } from './types';

// ── Types ────────────────────────────────────────────────────────────────

export interface BestMoment {
  /** Unix ms — start of the window (inclusive). */
  start: number;
  /** Unix ms — end of the window (exclusive). */
  end: number;
  /** Average temperature inside the window, °C. */
  temperature: number;
  /** Highest precipitation probability across the window, %. */
  maxPrecipProb: number;
  /** Headline reason: 'mild', 'evening-cool', 'sunny-warm', 'crisp'. */
  tone: 'mild' | 'evening-cool' | 'sunny-warm' | 'crisp';
}

export interface OutfitAdvice {
  /** One short sentence describing what to wear. */
  headline: { ar: string; de: string };
  /** Sub-line with the rationale (temp / feels-like / wind / rain). */
  detail: { ar: string; de: string };
  /** Small list of item flags. UI maps each to an icon. */
  items: OutfitItem[];
}

export type OutfitItem =
  | 'coat'           // < 10°
  | 'jacket'         // 10–17°
  | 'long-sleeves'   // 17–22°
  | 'tshirt'         // > 22°
  | 'umbrella'       // precip prob ≥ 60% next 6h
  | 'sunglasses'     // UV ≥ 5 daytime
  | 'hat'            // UV ≥ 7 OR temp > 32
  | 'scarf'          // feels-like < 0
  | 'windbreaker';   // wind > 30 km/h

export interface HealthTip {
  id: string;
  /** Lucide/Phosphor icon name as a string — the UI maps it. */
  icon:
    | 'droplets'
    | 'sun'
    | 'snowflake'
    | 'wind'
    | 'sunrise'
    | 'moon'
    | 'thermometer'
    | 'shield';
  tone: 'amber' | 'sky' | 'rose' | 'emerald' | 'violet' | 'neutral';
  title: { ar: string; de: string };
  body:  { ar: string; de: string };
}

// ── Helpers ──────────────────────────────────────────────────────────────

/** Comfort score for a single hour: 0..1 (1 = perfect outdoor weather). */
function hourScore(h: HourlyEntry): number {
  // Temperature comfort — peak at 21°C, drop linearly outside [12, 28].
  const t = h.temperature;
  let tempScore = 1;
  if (t < 12)      tempScore = Math.max(0, 1 - (12 - t) / 14);   // 0 at -2°
  else if (t > 28) tempScore = Math.max(0, 1 - (t - 28) / 12);   // 0 at 40°

  // Rain — heavy penalty.
  const rainPenalty = (h.precipitationProbability ?? 0) / 100;

  // Cloud / day code — light penalty for thunder/snow.
  let codePenalty = 0;
  if (h.weatherCode >= 95) codePenalty = 0.4;      // thunder
  else if (h.weatherCode >= 71 && h.weatherCode <= 77) codePenalty = 0.35;
  else if (h.weatherCode >= 61 && h.weatherCode <= 67) codePenalty = 0.3;
  else if (h.weatherCode >= 51 && h.weatherCode <= 57) codePenalty = 0.15;

  const score = tempScore * (1 - rainPenalty * 0.7) - codePenalty;
  return Math.max(0, Math.min(1, score));
}

function toneFor(hours: HourlyEntry[]): BestMoment['tone'] {
  const avgT = hours.reduce((s, h) => s + h.temperature, 0) / hours.length;
  const dayHours = hours.filter(h => h.isDay).length;
  const isMostlyNight = dayHours <= Math.floor(hours.length / 2);
  if (avgT < 10) return 'crisp';
  if (isMostlyNight) return 'evening-cool';
  if (avgT >= 22) return 'sunny-warm';
  return 'mild';
}

// ── 1. Best moments today (next 24h) ─────────────────────────────────────

export function bestMoments(data: WeatherData, now: number = Date.now()): BestMoment[] {
  const window = data.hourly.filter(h => h.time >= now && h.time <= now + 24 * 60 * 60_000);
  if (window.length < 3) return [];

  // Mark each hour as "good" when its score crosses 0.6.
  const flags = window.map(h => hourScore(h) >= 0.6);

  // Collapse contiguous good runs ≥ 2h.
  const runs: BestMoment[] = [];
  let runStart = -1;
  for (let i = 0; i < flags.length; i++) {
    if (flags[i] && runStart === -1) runStart = i;
    if ((!flags[i] || i === flags.length - 1) && runStart !== -1) {
      const end = flags[i] ? i + 1 : i;
      if (end - runStart >= 2) {
        const slice = window.slice(runStart, end);
        runs.push({
          start: slice[0].time,
          end: slice[slice.length - 1].time + 60 * 60_000,
          temperature: slice.reduce((s, h) => s + h.temperature, 0) / slice.length,
          maxPrecipProb: Math.max(...slice.map(h => h.precipitationProbability ?? 0)),
          tone: toneFor(slice),
        });
      }
      runStart = -1;
    }
  }

  // Cap the longest 2 runs.
  runs.sort((a, b) => (b.end - b.start) - (a.end - a.start));
  return runs.slice(0, 2).sort((a, b) => a.start - b.start);
}

// ── 2. Outfit recommendation ─────────────────────────────────────────────

export function outfitForNow(data: WeatherData, now: number = Date.now()): OutfitAdvice {
  const c = data.current;
  const t = c.temperature;
  const feels = c.apparentTemperature ?? t;
  const wind = c.windSpeed ?? 0;

  // Look ahead 6h for rain so the user grabs the umbrella before leaving.
  const next6 = data.hourly.filter(h => h.time >= now && h.time <= now + 6 * 60 * 60_000);
  const maxPop = next6.reduce((m, h) => Math.max(m, h.precipitationProbability ?? 0), 0);

  const todayUv = data.daily[0]?.uvIndexMax ?? c.uvIndex ?? 0;

  const items: OutfitItem[] = [];
  // Layer
  if (t < 10)        items.push('coat');
  else if (t < 17)   items.push('jacket');
  else if (t < 22)   items.push('long-sleeves');
  else               items.push('tshirt');
  // Accessories
  if (maxPop >= 60)  items.push('umbrella');
  if (todayUv >= 5 && c.isDay) items.push('sunglasses');
  if (todayUv >= 7 || t > 32) items.push('hat');
  if (feels < 0)     items.push('scarf');
  if (wind > 30 && !items.includes('coat')) items.push('windbreaker');

  // Headline + detail
  let headline = { ar: '', de: '' };
  if (t < 5) {
    headline = { ar: 'البس طبقات دافئة', de: 'Warm anziehen, mehrere Schichten' };
  } else if (t < 12) {
    headline = { ar: 'معطف خفيف يكفي', de: 'Ein leichter Mantel reicht' };
  } else if (t < 20) {
    headline = { ar: 'سترة خفيفة مناسبة', de: 'Eine leichte Jacke passt' };
  } else if (t < 27) {
    headline = { ar: 'ملابس صيفية مريحة', de: 'Leichte Sommerkleidung' };
  } else {
    headline = { ar: 'ملابس خفيفة وفاتحة', de: 'Leichte, helle Kleidung' };
  }

  const rainNote = maxPop >= 60
    ? { ar: ' • احمل المظلة', de: ' • Regenschirm mitnehmen' }
    : { ar: '', de: '' };
  const windNote = wind > 30
    ? { ar: ' • رياح قوية', de: ' • starker Wind' }
    : { ar: '', de: '' };

  const detail = {
    ar: `${Math.round(t)}° • إحساس ${Math.round(feels)}°${rainNote.ar}${windNote.ar}`,
    de: `${Math.round(t)}° • gefühlt ${Math.round(feels)}°${rainNote.de}${windNote.de}`,
  };

  return { headline, detail, items };
}

// ── 3. Health & prayer tips ──────────────────────────────────────────────

/** "HH:MM" → today epoch ms (local). */
function todayAt(hhmm: string): number | null {
  const [h, m] = hhmm.split(':').map(Number);
  if (Number.isNaN(h) || Number.isNaN(m)) return null;
  const d = new Date();
  d.setHours(h, m, 0, 0);
  return d.getTime();
}

function hourAt(targetMs: number, hourly: HourlyEntry[]): HourlyEntry | null {
  if (!hourly.length) return null;
  let best = hourly[0];
  let bestDelta = Math.abs(hourly[0].time - targetMs);
  for (const h of hourly) {
    const d = Math.abs(h.time - targetMs);
    if (d < bestDelta) { best = h; bestDelta = d; }
  }
  return best;
}

export function healthTips(
  data: WeatherData,
  prayerTimings: Record<string, string> | null,
  now: number = Date.now(),
): HealthTip[] {
  const tips: HealthTip[] = [];
  const c = data.current;
  const today = data.daily[0];
  const uv = today?.uvIndexMax ?? c.uvIndex ?? 0;

  // 1. Hot day → hydration.
  if (c.temperature >= 30 || (today && today.tempMax >= 32)) {
    tips.push({
      id: 'hydrate',
      icon: 'droplets',
      tone: 'rose',
      title: { ar: 'اشرب الماء بانتظام', de: 'Trink regelmäßig Wasser' },
      body: {
        ar: `الحرارة ${Math.round(today?.tempMax ?? c.temperature)}° اليوم — لتر إضافي على الأقل.`,
        de: `Tagesmax ${Math.round(today?.tempMax ?? c.temperature)}° — mindestens ein Liter extra.`,
      },
    });
  }

  // 2. Cold day → warm clothing.
  if (c.temperature < 3 || (today && today.tempMin < -2)) {
    tips.push({
      id: 'cold',
      icon: 'snowflake',
      tone: 'sky',
      title: { ar: 'برد قارس — تدفّأ جيداً', de: 'Eisig kalt — gut einpacken' },
      body: {
        ar: `أدنى درجة اليوم ${Math.round(today?.tempMin ?? c.temperature)}°. غطّ الرأس واليدين.`,
        de: `Tiefstwert ${Math.round(today?.tempMin ?? c.temperature)}°. Kopf und Hände bedecken.`,
      },
    });
  }

  // 3. High UV → avoidance window 11..15 if midday UV is peak.
  if (uv >= 6) {
    tips.push({
      id: 'uv',
      icon: 'sun',
      tone: 'amber',
      title: { ar: 'مؤشر UV مرتفع', de: 'Hoher UV-Index' },
      body: {
        ar: `تجنّب الشمس بين 12:00 و15:00 (UV ${uv.toFixed(1)}). ضع واقي شمس.`,
        de: `Sonne meiden zwischen 12:00 und 15:00 (UV ${uv.toFixed(1)}). Sonnencreme auftragen.`,
      },
    });
  }

  // 4. Cold Fajr — when Fajr is upcoming today and forecast is < 5°C.
  if (prayerTimings?.Fajr) {
    const fajrMs = todayAt(prayerTimings.Fajr.slice(0, 5));
    if (fajrMs != null) {
      // Only when Fajr is still ahead (else look at tomorrow's Fajr approximated by same time +24h).
      const targetMs = fajrMs > now ? fajrMs : fajrMs + 24 * 60 * 60_000;
      const h = hourAt(targetMs, data.hourly);
      if (h && h.temperature < 5) {
        tips.push({
          id: 'fajr-cold',
          icon: 'sunrise',
          tone: 'sky',
          title: { ar: 'الفجر بارد', de: 'Fajr ist kalt' },
          body: {
            ar: `الحرارة قرب الفجر ${Math.round(h.temperature)}°. البس دافئاً قبل الخروج.`,
            de: `Temperatur um Fajr ${Math.round(h.temperature)}°. Warm anziehen vor dem Hinausgehen.`,
          },
        });
      }
    }
  }

  // 5. Windy Isha — if next Isha hour wind > 35 km/h.
  if (prayerTimings?.Isha) {
    const ishaMs = todayAt(prayerTimings.Isha.slice(0, 5));
    if (ishaMs != null) {
      const targetMs = ishaMs > now ? ishaMs : ishaMs + 24 * 60 * 60_000;
      const h = hourAt(targetMs, data.hourly);
      // hourly doesn't carry wind; fall back to current windSpeed for tonight.
      const windNow = c.windSpeed ?? 0;
      if (h && windNow >= 35) {
        tips.push({
          id: 'isha-wind',
          icon: 'wind',
          tone: 'violet',
          title: { ar: 'رياح قوية ليلاً', de: 'Starker Wind heute Nacht' },
          body: {
            ar: `سرعة الرياح حوالي ${Math.round(windNow)} كم/س — ثبّت الأشياء الخفيفة.`,
            de: `Windgeschwindigkeit ca. ${Math.round(windNow)} km/h — leichte Objekte sichern.`,
          },
        });
      }
    }
  }

  // 6. Pleasant evening — when 18..21 has score ≥ 0.7 and not too hot.
  const evening = data.hourly.filter(h => {
    const d = new Date(h.time);
    const hr = d.getHours();
    return h.time > now && hr >= 18 && hr <= 21 && h.time <= now + 24 * 60 * 60_000;
  });
  if (evening.length >= 2) {
    const avg = evening.reduce((s, h) => s + hourScore(h), 0) / evening.length;
    if (avg >= 0.7 && tips.length < 3) {
      const t = evening.reduce((s, h) => s + h.temperature, 0) / evening.length;
      tips.push({
        id: 'pleasant-eve',
        icon: 'moon',
        tone: 'emerald',
        title: { ar: 'مساء لطيف للمشي', de: 'Angenehmer Abend für einen Spaziergang' },
        body: {
          ar: `الحرارة قرب ${Math.round(t)}° مساءً — وقت ممتاز للخارج.`,
          de: `Abendtemperatur um ${Math.round(t)}° — ideale Zeit draußen.`,
        },
      });
    }
  }

  return tips.slice(0, 3);
}

// ── Public bundle ────────────────────────────────────────────────────────

export interface WeatherInsights {
  moments: BestMoment[];
  outfit: OutfitAdvice;
  tips: HealthTip[];
}

export function computeInsights(
  data: WeatherData,
  prayerTimings: Record<string, string> | null,
  now: number = Date.now(),
): WeatherInsights {
  return {
    moments: bestMoments(data, now),
    outfit: outfitForNow(data, now),
    tips: healthTips(data, prayerTimings, now),
  };
}