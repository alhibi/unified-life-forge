/**
 * Hybrid worldwide prayer-time calculation method picker.
 *
 * Picks the most authoritative *Sunni* calculation method per country/region
 * (Aladhan API IDs). When the API is unreachable we run the same parameters
 * locally with `adhan.js` so timings still resolve offline.
 *
 * Strictly excludes Shia/Jafari conventions (Aladhan methods 0 & 7).
 */

import {
  CalculationMethod,
  Coordinates,
  HighLatitudeRule,
  Madhab,
  PrayerTimes as AdhanPrayerTimes,
  SunnahTimes,
} from 'adhan';

/** Aladhan API method IDs we use. Shia methods (0, 7) are NEVER returned. */
export type AladhanMethod =
  | 1  | 2  | 3  | 4  | 5  | 8  | 9  | 10 | 11 | 12
  | 13 | 14 | 15 | 16 | 17 | 18 | 19 | 20 | 21 | 22 | 23;

export interface RegionMethod {
  /** Aladhan method id. */
  method: AladhanMethod;
  /** Short label for UI / diagnostics. */
  name: string;
}

/**
 * Country / region bounding boxes (lat range, lng range) → method.
 * Order matters: more specific boxes must come first.
 * Lat goes –90..90, Lng goes –180..180.
 */
interface Box {
  lat: [number, number];
  lng: [number, number];
  method: AladhanMethod;
  name: string;
}

const REGION_BOXES: Box[] = [
  // ── Gulf & Arabian Peninsula ──────────────────────────────────────────
  { lat: [25.5, 26.4], lng: [50.3, 50.8], method: 8,  name: 'Bahrain (Gulf)' },
  { lat: [28.5, 30.2], lng: [46.5, 48.5], method: 9,  name: 'Kuwait' },
  { lat: [24.4, 26.4], lng: [50.7, 51.7], method: 10, name: 'Qatar' },
  { lat: [22.5, 26.1], lng: [51.5, 56.4], method: 16, name: 'UAE (Dubai)' },
  { lat: [16.6, 26.4], lng: [51.8, 60.0], method: 8,  name: 'Oman (Gulf)' },
  { lat: [12.0, 19.0], lng: [42.5, 53.5], method: 4,  name: 'Yemen (Umm al-Qura)' },
  { lat: [15.6, 32.5], lng: [34.4, 55.7], method: 4,  name: 'Saudi Arabia (Umm al-Qura)' },

  // ── Levant & Iraq ─────────────────────────────────────────────────────
  { lat: [29.0, 33.5], lng: [34.9, 39.5], method: 23, name: 'Jordan' },
  { lat: [33.0, 34.7], lng: [35.0, 36.7], method: 3,  name: 'Lebanon (MWL)' },
  { lat: [32.3, 37.4], lng: [35.6, 42.4], method: 3,  name: 'Syria (MWL)' },
  { lat: [29.0, 37.4], lng: [38.7, 48.6], method: 3,  name: 'Iraq (MWL)' },
  { lat: [29.4, 33.4], lng: [34.2, 35.9], method: 3,  name: 'Palestine (MWL)' },

  // ── North & East Africa ───────────────────────────────────────────────
  { lat: [22.0, 31.7], lng: [24.6, 37.0], method: 5,  name: 'Egypt' },
  { lat: [ 8.6, 22.3], lng: [21.7, 38.7], method: 5,  name: 'Sudan' },
  { lat: [19.0, 33.2], lng: [ 9.3, 25.2], method: 5,  name: 'Libya' },
  { lat: [30.2, 37.4], lng: [ 7.5, 11.6], method: 18, name: 'Tunisia' },
  { lat: [18.9, 37.1], lng: [-8.7, 12.0], method: 19, name: 'Algeria' },
  { lat: [20.7, 36.0], lng: [-17.1, -1.0],method: 21, name: 'Morocco' },
  { lat: [14.7, 27.3], lng: [-17.1, -4.8],method: 21, name: 'Mauritania' },
  { lat: [-1.7, 12.5], lng: [40.0, 51.4], method: 5,  name: 'Somalia' },
  { lat: [ 3.4, 15.0], lng: [32.0, 47.8], method: 5,  name: 'Ethiopia / Horn' },
  { lat: [-4.7,  5.5], lng: [33.9, 42.0], method: 5,  name: 'Kenya / Tanzania N.' },
  { lat: [-34.9,-22.1],lng: [16.4, 32.9], method: 3,  name: 'Southern Africa' },

  // ── West & Central Africa ─────────────────────────────────────────────
  { lat: [ 4.0, 14.0], lng: [ 2.6, 14.7], method: 3,  name: 'Nigeria & W. Africa' },
  { lat: [ 8.0, 17.0], lng: [-12.5,  2.4],method: 3,  name: 'Sahel' },
  { lat: [-13.4, 5.5], lng: [11.7, 31.4], method: 3,  name: 'Central Africa' },

  // ── Turkey / Iran / Caucasus ──────────────────────────────────────────
  { lat: [35.7, 42.2], lng: [25.6, 44.9], method: 13, name: 'Turkey (Diyanet)' },
  { lat: [38.3, 41.9], lng: [38.4, 50.5], method: 13, name: 'Caucasus' },
  // Iran — use MWL deliberately to keep Sunni convention.
  { lat: [24.8, 39.8], lng: [44.0, 63.4], method: 3,  name: 'Iran (MWL)' },

  // ── South Asia ────────────────────────────────────────────────────────
  { lat: [29.3, 38.5], lng: [60.4, 75.0], method: 1,  name: 'Afghanistan (Karachi)' },
  { lat: [23.6, 37.1], lng: [60.8, 77.9], method: 1,  name: 'Pakistan (Karachi)' },
  { lat: [ 6.7, 35.7], lng: [68.1, 97.5], method: 1,  name: 'India (Karachi)' },
  { lat: [20.5, 26.7], lng: [88.0, 92.7], method: 1,  name: 'Bangladesh (Karachi)' },
  { lat: [ 5.8, 10.0], lng: [79.6, 81.9], method: 1,  name: 'Sri Lanka' },
  { lat: [26.3, 30.5], lng: [80.0, 88.3], method: 1,  name: 'Nepal' },
  { lat: [-0.8, 7.2],  lng: [72.6, 73.8], method: 1,  name: 'Maldives' },

  // ── Southeast Asia ────────────────────────────────────────────────────
  { lat: [ 1.2,  1.5], lng: [103.6,104.0],method: 11, name: 'Singapore (MUIS)' },
  { lat: [ 0.8,  7.5], lng: [99.5,119.5], method: 17, name: 'Malaysia (JAKIM)' },
  { lat: [ 4.0,  5.5], lng: [113.5,115.4],method: 17, name: 'Brunei (JAKIM)' },
  { lat: [-11.0, 6.5], lng: [94.5,141.5], method: 20, name: 'Indonesia (KEMENAG)' },
  { lat: [ 4.5, 21.5], lng: [116.5,127.0],method: 17, name: 'Philippines' },
  { lat: [ 5.0, 21.0], lng: [97.0,106.0], method: 3,  name: 'Thailand / Myanmar' },
  { lat: [ 8.0, 24.0], lng: [101.5,110.0],method: 3,  name: 'Vietnam / Laos / Cambodia' },

  // ── East Asia / Far East ──────────────────────────────────────────────
  { lat: [17.5, 54.0], lng: [73.0,135.5], method: 3,  name: 'China' },
  { lat: [30.0, 46.0], lng: [128.5,146.5],method: 3,  name: 'Japan' },
  { lat: [33.0, 43.5], lng: [124.0,132.0],method: 3,  name: 'Korea' },
  { lat: [40.5, 52.5], lng: [87.0,120.0], method: 3,  name: 'Mongolia' },

  // ── Central Asia / Russia ─────────────────────────────────────────────
  { lat: [35.0, 56.5], lng: [46.0, 88.5], method: 14, name: 'Central Asia (Russia)' },
  { lat: [41.0, 82.0], lng: [19.0,180.0], method: 14, name: 'Russia' },

  // ── Europe ────────────────────────────────────────────────────────────
  { lat: [41.0, 51.5], lng: [-5.5, 10.0], method: 12, name: 'France (UOIF)' },
  { lat: [49.0, 61.0], lng: [-11.0, 2.5], method: 15, name: 'UK / Ireland (Moonsighting)' },
  { lat: [35.5, 44.0], lng: [-9.7,  4.5], method: 22, name: 'Iberia (Lisboa)' },
  { lat: [44.5, 56.0], lng: [ 5.5, 17.5], method: 3,  name: 'DACH / Benelux (MWL)' },
  { lat: [35.0, 48.0], lng: [ 5.5, 19.5], method: 3,  name: 'Italy (MWL)' },
  { lat: [34.5, 55.5], lng: [13.5, 30.5], method: 3,  name: 'Balkans / E. Europe (MWL)' },
  { lat: [54.0, 72.0], lng: [ 4.0, 31.5], method: 15, name: 'Scandinavia (Moonsighting)' },

  // ── Americas ──────────────────────────────────────────────────────────
  { lat: [24.0, 72.0], lng: [-170.0,-50.0],method: 2, name: 'USA / Canada (ISNA)' },
  { lat: [ 7.0, 33.0], lng: [-120.0,-77.0],method: 2, name: 'Mexico / C. America' },
  { lat: [ 9.5, 27.5], lng: [-86.0,-59.0], method: 2, name: 'Caribbean' },
  { lat: [-56.0, 13.5],lng: [-82.0,-34.0], method: 3, name: 'South America (MWL)' },

  // ── Oceania ───────────────────────────────────────────────────────────
  { lat: [-48.0,-9.5], lng: [110.0,180.0], method: 3, name: 'Australia / NZ (MWL)' },
];

/** Pick the most appropriate Sunni Aladhan method for a coordinate. */
export function pickMethodForLocation(lat: number, lng: number): RegionMethod {
  for (const b of REGION_BOXES) {
    if (lat >= b.lat[0] && lat <= b.lat[1] && lng >= b.lng[0] && lng <= b.lng[1]) {
      return { method: b.method, name: b.name };
    }
  }
  // Default: Muslim World League (broadest worldwide Sunni convention).
  return { method: 3, name: 'Muslim World League (default)' };
}

/** Map an Aladhan method id → adhan.js CalculationParameters for hybrid fallback. */
function adhanParamsFor(method: AladhanMethod) {
  switch (method) {
    case 1:  return CalculationMethod.Karachi();
    case 2:  return CalculationMethod.NorthAmerica();
    case 4:  return CalculationMethod.UmmAlQura();
    case 5:  return CalculationMethod.Egyptian();
    case 8:  return CalculationMethod.Dubai();          // closest available
    case 9:  return CalculationMethod.Kuwait();
    case 10: return CalculationMethod.Qatar();
    case 11: return CalculationMethod.Singapore();
    case 12: return CalculationMethod.MuslimWorldLeague(); // UOIF ~ MWL angles
    case 13: return CalculationMethod.Turkey();
    case 14: return CalculationMethod.MuslimWorldLeague();
    case 15: return CalculationMethod.MoonsightingCommittee();
    case 16: return CalculationMethod.Dubai();
    case 17: return CalculationMethod.MuslimWorldLeague();
    case 18: return CalculationMethod.MuslimWorldLeague();
    case 19: return CalculationMethod.MuslimWorldLeague();
    case 20: return CalculationMethod.MuslimWorldLeague();
    case 21: return CalculationMethod.MuslimWorldLeague();
    case 22: return CalculationMethod.MuslimWorldLeague();
    case 23: return CalculationMethod.MuslimWorldLeague();
    case 3:
    default: return CalculationMethod.MuslimWorldLeague();
  }
}

/**
 * How a set of timings was reached. Surfaced so the UI can be honest about a
 * result that is a jurisprudential approximation rather than a direct
 * calculation.
 */
export type LatitudeFallback =
  /** Direct calculation — the sun actually crossed every required angle. */
  | 'none'
  /** Twilight could not be found; night was divided into sevenths. */
  | 'seventh-of-night'
  /**
   * Polar day or polar night: the sun never crossed the horizon at all, so
   * there is no local sunset to anchor Maghrib to. Timings are computed for
   * the nearest latitude at which the day still resolves — the classical
   * *Aqrab al-Bilad* ("nearest locality") position — keeping the caller's
   * longitude so the clock stays local.
   */
  | 'nearest-latitude';

export interface LocalTimingsResult {
  timings: Record<string, string>;
  fallback: LatitudeFallback;
  /** Latitude the timings were actually computed at (differs under Aqrab al-Bilad). */
  effectiveLatitude: number;
}

/**
 * Latitude the *Aqrab al-Bilad* fallback clamps to.
 *
 * 48.5° is the highest latitude at which astronomical twilight still resolves
 * on every day of the year, which is what makes it the conventional choice:
 * below it a real Fajr and Isha always exist.
 */
const NEAREST_LATITUDE = 48.5;

function isValidTime(d: Date | null | undefined): d is Date {
  return d instanceof Date && !Number.isNaN(d.getTime());
}

/**
 * Compute prayer timings locally with adhan.js — used as a hybrid fallback
 * when the Aladhan API is unreachable, and the sole source offline.
 *
 * Above roughly 65° latitude the sun does not cross the horizon for weeks at a
 * time, and adhan.js correctly reports `Invalid Date` for prayers that have no
 * astronomical event to anchor them. Formatting that straight to `HH:MM`
 * produced literal `NaN:NaN` on screen in Tromsø and Utqiaġvik, so this walks
 * an explicit fallback chain — sevenths of the night, then *Aqrab al-Bilad* —
 * and reports which rung it landed on.
 */
export function computeLocalTimingsDetailed(
  lat: number,
  lng: number,
  method: AladhanMethod,
  school: 0 | 1,
  latAdj: 1 | 2 | 3,
  date: Date = new Date(),
): LocalTimingsResult {
  const attempt = (
    atLat: number,
    rule: 1 | 2 | 3,
  ): { timings: Record<string, string>; complete: boolean } => {
    const coords = new Coordinates(atLat, lng);
    const params = adhanParamsFor(method);
    params.madhab = school === 1 ? Madhab.Hanafi : Madhab.Shafi;
    params.highLatitudeRule =
      rule === 1 ? HighLatitudeRule.MiddleOfTheNight
      : rule === 2 ? HighLatitudeRule.SeventhOfTheNight
      : HighLatitudeRule.TwilightAngle;

    const pt = new AdhanPrayerTimes(coords, date, params);
    const sn = new SunnahTimes(pt);

    // Every value the UI reads. `complete` is false if any single one is
    // missing, because a screen showing four prayers and one NaN is worse than
    // a screen showing five approximated prayers.
    const required: Array<[string, Date]> = [
      ['Fajr', pt.fajr],
      ['Sunrise', pt.sunrise],
      ['Dhuhr', pt.dhuhr],
      ['Asr', pt.asr],
      ['Maghrib', pt.maghrib],
      ['Isha', pt.isha],
    ];
    const complete =
      required.every(([, d]) => isValidTime(d)) &&
      isValidTime(sn.middleOfTheNight) &&
      isValidTime(sn.lastThirdOfTheNight);

    const fmt = (d: Date) => {
      if (!isValidTime(d)) return '';
      const h = d.getHours().toString().padStart(2, '0');
      const m = d.getMinutes().toString().padStart(2, '0');
      return `${h}:${m}`;
    };

    return {
      complete,
      timings: {
        Fajr: fmt(pt.fajr),
        Sunrise: fmt(pt.sunrise),
        Dhuhr: fmt(pt.dhuhr),
        Asr: fmt(pt.asr),
        Sunset: fmt(pt.maghrib),
        Maghrib: fmt(pt.maghrib),
        Isha: fmt(pt.isha),
        Imsak: isValidTime(pt.fajr) ? fmt(new Date(pt.fajr.getTime() - 10 * 60_000)) : '',
        Midnight: fmt(sn.middleOfTheNight),
        Firstthird: fmt(sn.middleOfTheNight),
        Lastthird: fmt(sn.lastThirdOfTheNight),
      },
    };
  };

  const direct = attempt(lat, latAdj);
  if (direct.complete) {
    return { timings: direct.timings, fallback: 'none', effectiveLatitude: lat };
  }

  // Rung 2: divide the night into sevenths. Resolves the shoulder latitudes
  // (~55–65°) where only twilight is missing but sunset still happens.
  if (latAdj !== 2) {
    const seventh = attempt(lat, 2);
    if (seventh.complete) {
      return { timings: seventh.timings, fallback: 'seventh-of-night', effectiveLatitude: lat };
    }
  }

  // Rung 3: polar day/night — there is no local sunset at all. Compute at the
  // nearest latitude where the day resolves, keeping longitude so the clock
  // remains the user's own.
  const clamped = Math.sign(lat || 1) * NEAREST_LATITUDE;
  const nearest = attempt(clamped, 2);
  return {
    timings: nearest.timings,
    fallback: 'nearest-latitude',
    effectiveLatitude: clamped,
  };
}

/**
 * Back-compatible wrapper returning just the `HH:MM` map, matching the Aladhan
 * API response shape. Prefer `computeLocalTimingsDetailed` where the UI can
 * disclose that a latitude fallback was applied.
 */
export function computeLocalTimings(
  lat: number,
  lng: number,
  method: AladhanMethod,
  school: 0 | 1,
  latAdj: 1 | 2 | 3,
  date: Date = new Date(),
): Record<string, string> {
  return computeLocalTimingsDetailed(lat, lng, method, school, latAdj, date).timings;
}