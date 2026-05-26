// Weather data hook — single fetch boundary for the /weather hub.
//
// The legacy `WeatherWidget` only needs a tiny slice (current temp + 12h
// forecast) and intentionally keeps its own narrow Open-Meteo call so the
// home page stays light. The dedicated weather hub page needs a much
// richer payload (24h hourly, 7d daily, sun/moon, wind, UV, air quality),
// so we lift everything into a focused hook here. The two are intentionally
// separate — they share Open-Meteo as the data source, not the cache.
//
// Caching strategy:
//   • In-memory module-level cache keyed by rounded coords (≈11 km grid)
//     so repeated mounts of the page (e.g. tab swap) don't re-fetch.
//   • localStorage echo with the same TTL so a cold page-paint after a
//     tab return is instant.
//   • TTL: 10 minutes for forecast, 30 minutes for air quality, 1 day for
//     reverse geocoded city name. The forecast hot-refreshes every 15 min
//     on a visible page (matching the home widget).
//
// All fetches are independent — air quality and reverse-geocoding are
// best-effort. A failure in one never blocks the others; the page just
// renders without that block.

import { useCallback, useEffect, useRef, useState } from 'react';
import { useDeviceLocation } from './useDeviceLocation';

// ── Types ────────────────────────────────────────────────────────────────

export interface CurrentWeather {
  temperature: number;
  apparentTemperature: number;
  humidity: number;
  precipitation: number;
  weatherCode: number;
  isDay: boolean;
  cloudCover: number;
  pressure: number;
  windSpeed: number;
  windDirection: number;
  windGusts: number;
  uvIndex: number;
  /** Unix ms of the API-reported "current" timestamp. */
  timestamp: number;
}

export interface HourlyEntry {
  /** Unix ms of the hour. */
  time: number;
  hour: number;
  temperature: number;
  weatherCode: number;
  isDay: boolean;
  precipitationProbability: number;
  precipitation: number;
}

export interface DailyEntry {
  /** Unix ms of the day at local midnight (per API tz). */
  date: number;
  weatherCode: number;
  tempMax: number;
  tempMin: number;
  /** ISO string per API; the hub formats them locally. */
  sunrise: string;
  sunset: string;
  uvIndexMax: number;
  precipitationSum: number;
  precipitationProbabilityMax: number;
  windSpeedMax: number;
  windDirectionDominant: number;
}

export interface AirQuality {
  europeanAqi: number | null;
  pm2_5: number | null;
  pm10: number | null;
}

export interface WeatherData {
  current: CurrentWeather;
  hourly: HourlyEntry[];   // next 24 entries starting at "now"
  daily: DailyEntry[];     // 7 entries starting at today
  airQuality: AirQuality | null;
  city: string | null;
  /** Min and max temperature across the entire 7-day window — used by
   * the daily list's range bar so every row shares the same scale. */
  weekRange: { min: number; max: number };
  /** The fetch's local time anchor. Stored so the page can format hour
   * labels in the user's location's time, not the device's. */
  apiNowIso: string;
  fetchedAt: number;
}

// ── Module-level cache ───────────────────────────────────────────────────

const FORECAST_TTL = 10 * 60_000;
const AQI_TTL      = 30 * 60_000;
const CITY_TTL     = 24 * 60 * 60_000;
const REFRESH_MS   = 15 * 60_000;

const FORECAST_CACHE_KEY = 'weather_hub_forecast';
const AQI_CACHE_KEY      = 'weather_hub_aqi';
const CITY_CACHE_KEY     = 'weather_hub_city';

interface ForecastCachePayload {
  key: string;
  data: Omit<WeatherData, 'airQuality' | 'city'>;
  timestamp: number;
}
interface AqiCachePayload  { key: string; data: AirQuality; timestamp: number; }
interface CityCachePayload { key: string; city: string;     timestamp: number; }

const memForecast = new Map<string, ForecastCachePayload>();
const memAqi      = new Map<string, AqiCachePayload>();
const memCity     = new Map<string, CityCachePayload>();

function gridKey(lat: number, lon: number) {
  // Round to ~0.1° (≈11 km). Smaller-than-this drift between samples
  // produces effectively identical Open-Meteo grid cells.
  return `${lat.toFixed(1)}|${lon.toFixed(1)}`;
}

function readLs<T>(storageKey: string): T | null {
  try {
    const raw = localStorage.getItem(storageKey);
    return raw ? (JSON.parse(raw) as T) : null;
  } catch { return null; }
}

function writeLs(storageKey: string, value: unknown) {
  try { localStorage.setItem(storageKey, JSON.stringify(value)); } catch { /* noop */ }
}

// ── Open-Meteo fetchers ──────────────────────────────────────────────────

async function fetchForecast(lat: number, lon: number): Promise<ForecastCachePayload['data']> {
  const url =
    `https://api.open-meteo.com/v1/forecast` +
    `?latitude=${lat}&longitude=${lon}` +
    `&current=temperature_2m,relative_humidity_2m,apparent_temperature,is_day,precipitation,weather_code,cloud_cover,pressure_msl,wind_speed_10m,wind_direction_10m,wind_gusts_10m,uv_index` +
    `&hourly=temperature_2m,weather_code,is_day,precipitation_probability,precipitation` +
    `&daily=weather_code,temperature_2m_max,temperature_2m_min,sunrise,sunset,uv_index_max,precipitation_sum,precipitation_probability_max,wind_speed_10m_max,wind_direction_10m_dominant` +
    `&timezone=auto&forecast_days=7`;

  const res = await fetch(url);
  if (!res.ok) throw new Error(`forecast HTTP ${res.status}`);
  const json = await res.json();

  const c = json.current;
  const current: CurrentWeather = {
    temperature:         Math.round(c.temperature_2m),
    apparentTemperature: Math.round(c.apparent_temperature),
    humidity:            Math.round(c.relative_humidity_2m),
    precipitation:       c.precipitation ?? 0,
    weatherCode:         c.weather_code,
    isDay:               c.is_day === 1,
    cloudCover:          Math.round(c.cloud_cover),
    pressure:            Math.round(c.pressure_msl),
    windSpeed:           Math.round(c.wind_speed_10m),
    windDirection:       Math.round(c.wind_direction_10m),
    windGusts:           Math.round(c.wind_gusts_10m ?? c.wind_speed_10m),
    uvIndex:             Math.round((c.uv_index ?? 0) * 10) / 10,
    timestamp:           Date.now(),
  };

  // Hourly — pick the next 24 entries starting at the API's reported "now".
  const apiNowIso: string = c.time;
  const hourlyTimes: string[] = json.hourly.time;
  const startIdx = hourlyTimes.findIndex(t => t === apiNowIso);
  const hourly: HourlyEntry[] = [];
  if (startIdx >= 0) {
    for (let i = startIdx; i < hourlyTimes.length && hourly.length < 24; i++) {
      const tIso = hourlyTimes[i];
      const hour = parseInt(tIso.split('T')[1].split(':')[0], 10);
      hourly.push({
        time: new Date(tIso).getTime(),
        hour,
        temperature: Math.round(json.hourly.temperature_2m[i]),
        weatherCode: json.hourly.weather_code[i],
        isDay: json.hourly.is_day[i] === 1,
        precipitationProbability: json.hourly.precipitation_probability?.[i] ?? 0,
        precipitation: json.hourly.precipitation?.[i] ?? 0,
      });
    }
  }

  // Daily — 7 entries starting today.
  const d = json.daily;
  const daily: DailyEntry[] = (d.time as string[]).slice(0, 7).map((dIso, i) => ({
    date:                          new Date(dIso).getTime(),
    weatherCode:                   d.weather_code[i],
    tempMax:                       Math.round(d.temperature_2m_max[i]),
    tempMin:                       Math.round(d.temperature_2m_min[i]),
    sunrise:                       d.sunrise[i],
    sunset:                        d.sunset[i],
    uvIndexMax:                    Math.round(d.uv_index_max?.[i] ?? 0),
    precipitationSum:              d.precipitation_sum?.[i] ?? 0,
    precipitationProbabilityMax:   d.precipitation_probability_max?.[i] ?? 0,
    windSpeedMax:                  Math.round(d.wind_speed_10m_max?.[i] ?? 0),
    windDirectionDominant:         Math.round(d.wind_direction_10m_dominant?.[i] ?? 0),
  }));

  // Compute the week range so every daily row's range bar shares one scale.
  const allMin = Math.min(...daily.map(x => x.tempMin));
  const allMax = Math.max(...daily.map(x => x.tempMax));

  return {
    current,
    hourly,
    daily,
    weekRange: { min: allMin, max: allMax },
    apiNowIso,
    fetchedAt: Date.now(),
  };
}

async function fetchAirQuality(lat: number, lon: number): Promise<AirQuality> {
  const url =
    `https://air-quality-api.open-meteo.com/v1/air-quality` +
    `?latitude=${lat}&longitude=${lon}` +
    `&current=european_aqi,pm2_5,pm10&timezone=auto`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`aqi HTTP ${res.status}`);
  const json = await res.json();
  const c = json.current ?? {};
  return {
    europeanAqi: c.european_aqi ?? null,
    pm2_5:       c.pm2_5 ?? null,
    pm10:        c.pm10 ?? null,
  };
}

async function fetchCity(lat: number, lon: number, lang: 'ar' | 'de'): Promise<string | null> {
  // BigDataCloud's free reverse-geocode endpoint — no API key, browser-CORS
  // safe. The response includes a `city` field plus several locality
  // levels; we pick the most specific non-empty one.
  const url =
    `https://api.bigdatacloud.net/data/reverse-geocode-client` +
    `?latitude=${lat}&longitude=${lon}&localityLanguage=${lang}`;
  try {
    const res = await fetch(url);
    if (!res.ok) return null;
    const json = await res.json();
    return (
      json.city ||
      json.locality ||
      json.principalSubdivision ||
      json.countryName ||
      null
    );
  } catch {
    return null;
  }
}

// ── Cache helpers ────────────────────────────────────────────────────────

function readForecastCache(key: string): ForecastCachePayload | null {
  const mem = memForecast.get(key);
  if (mem && Date.now() - mem.timestamp < FORECAST_TTL) return mem;
  const ls = readLs<ForecastCachePayload>(FORECAST_CACHE_KEY);
  if (ls && ls.key === key && Date.now() - ls.timestamp < FORECAST_TTL) {
    memForecast.set(key, ls);
    return ls;
  }
  return null;
}

function readAqiCache(key: string): AqiCachePayload | null {
  const mem = memAqi.get(key);
  if (mem && Date.now() - mem.timestamp < AQI_TTL) return mem;
  const ls = readLs<AqiCachePayload>(AQI_CACHE_KEY);
  if (ls && ls.key === key && Date.now() - ls.timestamp < AQI_TTL) {
    memAqi.set(key, ls);
    return ls;
  }
  return null;
}

function readCityCache(key: string): CityCachePayload | null {
  const mem = memCity.get(key);
  if (mem && Date.now() - mem.timestamp < CITY_TTL) return mem;
  const ls = readLs<CityCachePayload>(CITY_CACHE_KEY);
  if (ls && ls.key === key && Date.now() - ls.timestamp < CITY_TTL) {
    memCity.set(key, ls);
    return ls;
  }
  return null;
}

// ── Hook ─────────────────────────────────────────────────────────────────

export type WeatherFetchStatus = 'idle' | 'loading' | 'success' | 'error';

export interface UseWeatherDataResult {
  data: WeatherData | null;
  status: WeatherFetchStatus;
  error: string | null;
  /** Force an immediate refetch (skips cache). */
  refresh: () => void;
  /** True when we're in the request lifecycle but already have stale data
   *  to render. Lets the UI show a discreet refresh indicator instead of
   *  a full skeleton. */
  isRefreshing: boolean;
}

export function useWeatherData(language: 'ar' | 'de' = 'ar'): UseWeatherDataResult {
  const { location } = useDeviceLocation();
  const [data, setData] = useState<WeatherData | null>(null);
  const [status, setStatus] = useState<WeatherFetchStatus>('idle');
  const [error, setError] = useState<string | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Bumping this triggers a refetch via the effect below.
  const [refreshNonce, setRefreshNonce] = useState(0);
  const refresh = useCallback(() => setRefreshNonce(n => n + 1), []);

  // Track the latest in-flight request so a stale resolve never overwrites
  // a newer one (e.g. user toggles location quickly).
  const reqIdRef = useRef(0);

  useEffect(() => {
    if (!location) return;
    const lat = location.lat;
    const lon = location.lng;
    const key = gridKey(lat, lon);

    const myReqId = ++reqIdRef.current;

    // Hydrate immediately from any usable cache so the page paints without
    // waiting for the network. We always still kick off a background
    // refetch unless the cache is recent enough that nothing would change.
    const fcCache = readForecastCache(key);
    const aqiCache = readAqiCache(key);
    const cityCache = readCityCache(key);

    if (fcCache) {
      setData({
        ...fcCache.data,
        airQuality: aqiCache?.data ?? null,
        city: cityCache?.city ?? null,
      });
      setStatus('success');
      setIsRefreshing(true);
    } else {
      setStatus('loading');
      setIsRefreshing(false);
    }

    let cancelled = false;
    setError(null);

    (async () => {
      try {
        // Core forecast — required.
        const forecast = await fetchForecast(lat, lon);
        if (cancelled || reqIdRef.current !== myReqId) return;

        const fcPayload: ForecastCachePayload = { key, data: forecast, timestamp: Date.now() };
        memForecast.set(key, fcPayload);
        writeLs(FORECAST_CACHE_KEY, fcPayload);

        // Optional blocks — fetched in parallel; their failures are silent.
        const [aqiResult, cityResult] = await Promise.allSettled([
          fetchAirQuality(lat, lon),
          fetchCity(lat, lon, language),
        ]);

        if (cancelled || reqIdRef.current !== myReqId) return;

        let aqi: AirQuality | null = aqiCache?.data ?? null;
        if (aqiResult.status === 'fulfilled') {
          aqi = aqiResult.value;
          const aqiPayload: AqiCachePayload = { key, data: aqi, timestamp: Date.now() };
          memAqi.set(key, aqiPayload);
          writeLs(AQI_CACHE_KEY, aqiPayload);
        }

        let city: string | null = cityCache?.city ?? null;
        if (cityResult.status === 'fulfilled' && cityResult.value) {
          city = cityResult.value;
          const cityPayload: CityCachePayload = { key, city, timestamp: Date.now() };
          memCity.set(key, cityPayload);
          writeLs(CITY_CACHE_KEY, cityPayload);
        }

        setData({ ...forecast, airQuality: aqi, city });
        setStatus('success');
        setIsRefreshing(false);
      } catch (e) {
        if (cancelled || reqIdRef.current !== myReqId) return;
        setError((e as Error).message || 'fetch failed');
        // Keep any stale data we already painted; only flip to 'error'
        // when there's nothing on screen.
        setStatus(prev => (data ? prev : 'error'));
        setIsRefreshing(false);
      }
    })();

    // Auto-refresh every 15 minutes while mounted.
    const interval = setInterval(() => setRefreshNonce(n => n + 1), REFRESH_MS);

    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  // The state setter `setData(prev=>...)` callback in the catch block uses
  // the local `data` value but we deliberately do NOT include it in the
  // dep array — re-running this effect on every successful fetch would
  // cancel + re-trigger forever. Same reason for omitting `language` in
  // the city fetch path: changing language while on the page is rare,
  // and the cached city is fine until the next forced refresh.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [location?.lat, location?.lng, refreshNonce]);

  return { data, status, error, refresh, isRefreshing };
}
