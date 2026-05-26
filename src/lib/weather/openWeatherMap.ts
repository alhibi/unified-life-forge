// OpenWeatherMap provider (free tier — Bring-Your-Own-Key).
//
// Uses three free endpoints:
//   • /data/2.5/weather       — current conditions, sunrise, sunset, tz
//   • /data/2.5/forecast      — 5 days × 3-hour steps (40 items)
//   • /data/2.5/air_pollution — current AQI + PM2.5/PM10
//
// Free tier limitations we handle:
//   • No UV index (the deprecated /uvi endpoint and One Call 3.0 are
//     paid-only). We surface this via meta.unsupportedFields=['uvIndex']
//     so the hub hides the UV tile.
//   • Only 5 days of daily forecast (Open-Meteo gives 7). We return what
//     we have and rely on `meta.dailyDays` if a future UI wants to label
//     it.
//   • Hourly granularity is 3 h — we linearly interpolate temperature
//     between adjacent buckets and snap categorical fields (weather code,
//     pop, isDay) to the nearest bucket. The result is a smooth-looking
//     24-cell strip rather than 8 stair-steps.
//
// All timestamps from OWM are UTC Unix seconds. We convert to local time
// using `city.timezone` (offset in seconds) by adding the offset to the
// epoch and reading UTC components — the standard trick that avoids
// pulling in a tz library.

import type {
  AirQuality, CurrentWeather, DailyEntry, HourlyEntry, ProviderDescriptor,
  WeatherData,
} from './types';

// ── OWM condition id → WMO code ──────────────────────────────────────────
//
// Everything in the rest of the app is keyed off WMO codes (icons,
// labels, hero gradient). Mapping at the source keeps that single
// vocabulary across providers.

function owmIdToWmo(id: number): number {
  if (id >= 200 && id < 233) {
    if (id === 202 || id === 212 || id === 221) return 99; // severe/hail
    return 95;                                              // thunderstorm
  }
  if (id >= 300 && id < 322) {
    if (id === 301 || id === 311 || id === 321) return 53; // moderate
    if (id === 302 || id === 312 || id === 314) return 55; // heavy
    return 51;                                              // light drizzle
  }
  if (id === 500) return 61;
  if (id === 501) return 63;
  if (id === 502 || id === 503 || id === 504) return 65;
  if (id === 511) return 67;
  if (id === 520) return 80;
  if (id === 521) return 81;
  if (id === 522 || id === 531) return 82;
  if (id === 600) return 71;
  if (id === 601 || id === 611 || id === 612 || id === 613 || id === 615 || id === 616) return 73;
  if (id === 602) return 75;
  if (id === 620) return 85;
  if (id === 621 || id === 622) return 86;
  if (id >= 700 && id < 800) {
    if (id === 781) return 99; // tornado → severe
    return 45;                  // mist/fog/haze/dust/smoke
  }
  if (id === 800) return 0;
  if (id === 801) return 1;
  if (id === 802) return 2;
  if (id === 803 || id === 804) return 3;
  return 0;
}

// ── Time helpers ─────────────────────────────────────────────────────────
//
// "Local ISO" means a "YYYY-MM-DDTHH:MM" string with no zone suffix,
// representing wall-clock time at the API's reported location. We never
// reinterpret these in the device's local zone — the hub formats them
// by string-splitting hours/minutes directly, so producing them right
// here is what keeps prayer-time-style accuracy.

function utcSecondsToLocalIso(utcSec: number, offsetSec: number): string {
  const ms = (utcSec + offsetSec) * 1000;
  const d = new Date(ms);
  const yyyy = d.getUTCFullYear();
  const mm = String(d.getUTCMonth() + 1).padStart(2, '0');
  const dd = String(d.getUTCDate()).padStart(2, '0');
  const hh = String(d.getUTCHours()).padStart(2, '0');
  const mi = String(d.getUTCMinutes()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}T${hh}:${mi}`;
}

// ── Endpoints ────────────────────────────────────────────────────────────

const OWM_BASE = 'https://api.openweathermap.org/data/2.5';

interface OwmCurrentResponse {
  main: {
    temp: number; feels_like: number; humidity: number; pressure: number;
    temp_min?: number; temp_max?: number;
  };
  weather: { id: number; icon: string }[];
  wind: { speed: number; deg: number; gust?: number };
  clouds: { all: number };
  rain?: { '1h'?: number; '3h'?: number };
  snow?: { '1h'?: number; '3h'?: number };
  sys: { sunrise: number; sunset: number };
  dt: number;
  timezone: number; // offset in seconds
}

interface OwmForecastItem {
  dt: number;                    // UTC unix sec
  main: {
    temp: number; feels_like: number; temp_min: number; temp_max: number;
    pressure: number; humidity: number;
  };
  weather: { id: number; icon: string }[];
  clouds: { all: number };
  wind: { speed: number; deg: number; gust?: number };
  pop: number;
  rain?: { '3h'?: number };
  snow?: { '3h'?: number };
  sys?: { pod?: 'd' | 'n' };
}

interface OwmForecastResponse {
  list: OwmForecastItem[];
  city: {
    name: string;
    timezone: number;            // offset in seconds
    sunrise: number;             // UTC unix sec
    sunset: number;
  };
}

interface OwmAirPollutionResponse {
  list: { main: { aqi: 1 | 2 | 3 | 4 | 5 }; components: Record<string, number> }[];
}

async function getJson<T>(url: string): Promise<T> {
  const res = await fetch(url);
  if (!res.ok) {
    if (res.status === 401) throw new Error('OpenWeatherMap: مفتاح API غير صحيح / Ungültiger API-Key');
    if (res.status === 429) throw new Error('OpenWeatherMap: تم تجاوز حد الطلبات / Rate-Limit überschritten');
    throw new Error(`OpenWeatherMap HTTP ${res.status}`);
  }
  return res.json() as Promise<T>;
}

// ── Aggregation helpers ──────────────────────────────────────────────────

function buildHourlyFromForecast(
  list: OwmForecastItem[], offsetSec: number, currentTempC: number, currentDt: number,
): HourlyEntry[] {
  // Anchor at the first whole hour at or after "now" (API local time).
  // We then produce 24 hourly entries by interpolating between adjacent
  // 3-hour buckets in the forecast list.
  if (list.length === 0) return [];

  const nowLocalMs = (currentDt + offsetSec) * 1000;
  const startLocalMs = Math.ceil(nowLocalMs / 3_600_000) * 3_600_000;

  // Convert forecast list to local-ms keys for interpolation.
  const buckets = list.map(it => ({
    localMs: (it.dt + offsetSec) * 1000,
    temp: it.main.temp,
    code: owmIdToWmo(it.weather[0]?.id ?? 800),
    icon: it.weather[0]?.icon ?? '01d',
    pop: it.pop ?? 0,
    rain: (it.rain?.['3h'] ?? 0) + (it.snow?.['3h'] ?? 0),
  }));

  // Insert a synthetic "now" bucket at the front so interpolation early
  // in the window doesn't extrapolate from far in the future.
  const firstFutureIdx = buckets.findIndex(b => b.localMs >= startLocalMs);
  if (firstFutureIdx > 0) buckets.splice(0, firstFutureIdx);
  buckets.unshift({
    localMs: nowLocalMs,
    temp: currentTempC,
    code: buckets[0]?.code ?? 0,
    icon: buckets[0]?.icon ?? '01d',
    pop: 0,
    rain: 0,
  });

  const out: HourlyEntry[] = [];
  for (let i = 0; i < 24; i++) {
    const target = startLocalMs + i * 3_600_000;
    // Find prev and next buckets enclosing target.
    let prev = buckets[0];
    let next = buckets[buckets.length - 1];
    for (let k = 0; k < buckets.length - 1; k++) {
      if (buckets[k].localMs <= target && buckets[k + 1].localMs >= target) {
        prev = buckets[k];
        next = buckets[k + 1];
        break;
      }
    }
    const span = Math.max(1, next.localMs - prev.localMs);
    const t = Math.max(0, Math.min(1, (target - prev.localMs) / span));
    const temp = prev.temp + (next.temp - prev.temp) * t;

    // Categorical fields snap to the nearest bucket.
    const nearest = (target - prev.localMs) <= (next.localMs - target) ? prev : next;

    const date = new Date(target);
    out.push({
      time: target,
      hour: date.getUTCHours(),
      temperature: Math.round(temp),
      weatherCode: nearest.code,
      isDay: nearest.icon.endsWith('d'),
      precipitationProbability: Math.round((nearest.pop ?? 0) * 100),
      precipitation: nearest.rain ?? 0,
    });
  }
  return out;
}

function buildDailyFromForecast(
  list: OwmForecastItem[], offsetSec: number,
  todaySunriseLocalIso: string, todaySunsetLocalIso: string,
): DailyEntry[] {
  // Group forecast items by local YYYY-MM-DD.
  const groups = new Map<string, OwmForecastItem[]>();
  for (const it of list) {
    const localIso = utcSecondsToLocalIso(it.dt, offsetSec);
    const day = localIso.split('T')[0];
    const arr = groups.get(day) ?? [];
    arr.push(it);
    groups.set(day, arr);
  }

  const days = [...groups.entries()]
    .map(([day, items]) => ({ day, items }))
    .sort((a, b) => a.day.localeCompare(b.day))
    .slice(0, 5);

  return days.map(({ day, items }, idx) => {
    const tempMax = Math.round(Math.max(...items.map(i => i.main.temp_max ?? i.main.temp)));
    const tempMin = Math.round(Math.min(...items.map(i => i.main.temp_min ?? i.main.temp)));

    // Pick the noon-ish entry to represent the day visually. If absent
    // (the first day's earliest entry is often after noon), fall back to
    // the entry with the highest precipitation probability — that is the
    // most interesting weather to surface.
    const noonItem = items.reduce<OwmForecastItem | null>((best, it) => {
      const localHour = parseInt(utcSecondsToLocalIso(it.dt, offsetSec).split('T')[1].split(':')[0], 10);
      const score = -Math.abs(localHour - 12);
      const bestHour = best ? parseInt(utcSecondsToLocalIso(best.dt, offsetSec).split('T')[1].split(':')[0], 10) : -99;
      const bestScore = best ? -Math.abs(bestHour - 12) : -Infinity;
      return score > bestScore ? it : best;
    }, null) ?? items[0];

    const popMax = Math.round(items.reduce((m, it) => Math.max(m, it.pop ?? 0), 0) * 100);
    const precipSum =
      items.reduce((sum, it) => sum + (it.rain?.['3h'] ?? 0) + (it.snow?.['3h'] ?? 0), 0);
    const windMaxMs = items.reduce((m, it) => Math.max(m, it.wind?.speed ?? 0), 0);
    const windDeg = noonItem.wind?.deg ?? 0;

    // Convert "YYYY-MM-DD" to Unix-ms at local midnight. We use
    // `Date.UTC(...)` for the date marker because the hub formats
    // daily entries via `Intl.DateTimeFormat({ weekday, day, month })`
    // which only cares about the calendar date, not the wall clock.
    const [yyyy, mm, dd] = day.split('-').map(Number);
    const localDateMs = Date.UTC(yyyy, mm - 1, dd);

    return {
      date: localDateMs,
      weatherCode: owmIdToWmo(noonItem.weather[0]?.id ?? 800),
      tempMax,
      tempMin,
      // Sunrise/sunset are only available for "today" via /weather. Other
      // days are left empty — the hub's SunCard reads daily[0] only.
      sunrise: idx === 0 ? todaySunriseLocalIso : '',
      sunset:  idx === 0 ? todaySunsetLocalIso  : '',
      uvIndexMax: 0,                                 // not in free tier
      precipitationSum: Math.round(precipSum * 10) / 10,
      precipitationProbabilityMax: popMax,
      windSpeedMax: Math.round(windMaxMs * 3.6),     // m/s → km/h
      windDirectionDominant: Math.round(windDeg),
    };
  });
}

// ── Public adapter ───────────────────────────────────────────────────────

async function fetchWeather({
  lat, lon, language, apiKey,
}: { lat: number; lon: number; language: 'ar' | 'de'; apiKey?: string }): Promise<Omit<WeatherData, 'airQuality' | 'city'>> {
  if (!apiKey) throw new Error('OpenWeatherMap API key required');

  const params = `lat=${lat}&lon=${lon}&appid=${encodeURIComponent(apiKey)}&units=metric&lang=${language}`;
  const [cur, fc] = await Promise.all([
    getJson<OwmCurrentResponse>(`${OWM_BASE}/weather?${params}`),
    getJson<OwmForecastResponse>(`${OWM_BASE}/forecast?${params}`),
  ]);

  const offsetSec = cur.timezone;
  const sunriseIso = utcSecondsToLocalIso(cur.sys.sunrise, offsetSec);
  const sunsetIso  = utcSecondsToLocalIso(cur.sys.sunset,  offsetSec);

  const isDay = cur.dt >= cur.sys.sunrise && cur.dt < cur.sys.sunset;

  const current: CurrentWeather = {
    temperature:         Math.round(cur.main.temp),
    apparentTemperature: Math.round(cur.main.feels_like),
    humidity:            Math.round(cur.main.humidity),
    precipitation:       (cur.rain?.['1h'] ?? 0) + (cur.snow?.['1h'] ?? 0),
    weatherCode:         owmIdToWmo(cur.weather[0]?.id ?? 800),
    isDay,
    cloudCover:          Math.round(cur.clouds?.all ?? 0),
    pressure:            Math.round(cur.main.pressure),
    windSpeed:           Math.round((cur.wind?.speed ?? 0) * 3.6),     // m/s → km/h
    windDirection:       Math.round(cur.wind?.deg ?? 0),
    windGusts:           Math.round((cur.wind?.gust ?? cur.wind?.speed ?? 0) * 3.6),
    uvIndex:             0,                                            // unsupported
    timestamp:           Date.now(),
  };

  const hourly = buildHourlyFromForecast(fc.list, offsetSec, cur.main.temp, cur.dt);
  const daily  = buildDailyFromForecast(fc.list, offsetSec, sunriseIso, sunsetIso);

  // Backfill day 0's tempMin/tempMax with current temperature when only
  // a partial day is in the forecast (early morning fetches sometimes
  // produce a one-entry first day with min === max).
  if (daily[0]) {
    daily[0].tempMax = Math.max(daily[0].tempMax, Math.round(cur.main.temp));
    daily[0].tempMin = Math.min(daily[0].tempMin, Math.round(cur.main.temp));
  }

  const allMin = daily.length ? Math.min(...daily.map(x => x.tempMin)) : current.temperature;
  const allMax = daily.length ? Math.max(...daily.map(x => x.tempMax)) : current.temperature;

  return {
    current,
    hourly,
    daily,
    weekRange: { min: allMin, max: allMax },
    fetchedAt: Date.now(),
    meta: {
      provider: 'openweathermap',
      unsupportedFields: ['uvIndex'],
      dailyDays: daily.length,
    },
  };
}

async function fetchAirQuality({
  lat, lon, apiKey,
}: { lat: number; lon: number; apiKey?: string }): Promise<AirQuality | null> {
  if (!apiKey) return null;
  try {
    const url = `${OWM_BASE}/air_pollution?lat=${lat}&lon=${lon}&appid=${encodeURIComponent(apiKey)}`;
    const json = await getJson<OwmAirPollutionResponse>(url);
    const item = json.list?.[0];
    if (!item) return null;
    // Map US-EPA 1..5 → European 0..100 visual range so the existing
    // band colours stay consistent. Boundaries chosen so each US band
    // lands inside the matching European band.
    const usToEuropean: Record<1 | 2 | 3 | 4 | 5, number> = {
      1: 10, 2: 30, 3: 50, 4: 70, 5: 90,
    };
    return {
      europeanAqi: usToEuropean[item.main.aqi] ?? null,
      pm2_5:       item.components.pm2_5 ?? null,
      pm10:        item.components.pm10  ?? null,
    };
  } catch {
    return null;
  }
}

export const openWeatherMapProvider: ProviderDescriptor = {
  id: 'openweathermap',
  name: { ar: 'OpenWeatherMap', de: 'OpenWeatherMap' },
  requiresApiKey: true,
  signupUrl: 'https://home.openweathermap.org/users/sign_up',
  attribution: { label: 'OpenWeatherMap', url: 'https://openweathermap.org/' },
  notes: {
    ar: 'يحتاج إلى مفتاح مجاني خاص بك. الباقة المجانية: 5 أيام بفاصل 3 ساعات، بدون فهرس الأشعة فوق البنفسجية.',
    de: 'Benötigt einen eigenen, kostenlosen API-Key. Free-Tier: 5 Tage in 3-h-Schritten, kein UV-Index.',
  },
  fetchWeather,
  fetchAirQuality,
};
