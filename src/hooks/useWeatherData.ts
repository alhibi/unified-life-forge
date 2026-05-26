// Weather data hook — single fetch boundary for the /weather hub.
//
// The legacy `WeatherWidget` only needs a tiny slice (current temp + 12h
// forecast) and intentionally keeps its own narrow Open-Meteo call so
// the home page stays light. The dedicated weather hub page needs a
// much richer payload (24h hourly, 7d daily, sun/moon, wind, UV, air
// quality) and now supports two interchangeable data sources, so we
// lift everything into a focused hook here.
//
// Provider abstraction (see `src/lib/weather/`):
//   • Open-Meteo (default, no key) and OpenWeatherMap (BYOK) both
//     normalise into the same `WeatherData` shape via adapters.
//   • Provider preference and OWM API key live in localStorage.
//   • Switching provider/key triggers an immediate refetch via the
//     `subscribeWeatherPrefs` event bus.
//
// Caching strategy:
//   • In-memory module-level cache keyed by (providerId, ~11 km grid).
//     Switching provider therefore swaps caches cleanly and never mixes
//     data from different sources.
//   • localStorage echo with the same TTLs so a cold paint after a tab
//     return is instant.
//   • TTL: 10 min forecast, 30 min AQI, 1 day reverse-geocoded city.
//   • Auto refresh every 15 min on a visible page.
//
// All fetches are independent — air quality and reverse-geocoding are
// best-effort. A failure in either never blocks the rest; the page just
// renders without that block.

import { useCallback, useEffect, useRef, useState } from 'react';
import { useDeviceLocation } from './useDeviceLocation';
import {
  getProvider, readOwmApiKey, readProviderPref, subscribeWeatherPrefs,
} from '@/lib/weather';
import type {
  AirQuality, ProviderId, WeatherData,
} from '@/lib/weather/types';

// Re-export the data shapes so existing imports from this module keep
// working. Weather.tsx imports `HourlyEntry`, `DailyEntry`, `WeatherData`
// from here.
export type {
  AirQuality, CurrentWeather, DailyEntry, HourlyEntry,
  ProviderId, UnsupportedField, WeatherData, WeatherDataMeta,
} from '@/lib/weather/types';

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

function cacheKey(provider: ProviderId, lat: number, lon: number) {
  // Round to ~0.1° (≈11 km). Smaller-than-this drift produces effectively
  // identical grid cells. Provider is part of the key so switching
  // providers never serves cached data from the previous one.
  return `${provider}|${lat.toFixed(1)}|${lon.toFixed(1)}`;
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

// ── Reverse geocoding ────────────────────────────────────────────────────
//
// Both providers use the same city-name service (BigDataCloud, no key).
// Cached separately from the forecast so changing provider doesn't
// invalidate the geocoded city.

async function fetchCity(lat: number, lon: number, lang: 'ar' | 'de'): Promise<string | null> {
  const url =
    `https://api.bigdatacloud.net/data/reverse-geocode-client` +
    `?latitude=${lat}&longitude=${lon}&localityLanguage=${lang}`;
  try {
    const res = await fetch(url);
    if (!res.ok) return null;
    const json = await res.json();
    return json.city || json.locality || json.principalSubdivision || json.countryName || null;
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
  /** True when the active provider is OWM and no API key is configured.
   *  The page uses this to show the API-key prompt instead of a generic
   *  error card. */
  needsApiKey: boolean;
  /** Currently active provider (live from prefs). */
  providerId: ProviderId;
  /** Force an immediate refetch (skips cache). */
  refresh: () => void;
  /** Stale-while-revalidate flag — true when we're refetching but
   *  already have data on screen. */
  isRefreshing: boolean;
}

export function useWeatherData(language: 'ar' | 'de' = 'ar'): UseWeatherDataResult {
  const { location } = useDeviceLocation();
  const [data, setData] = useState<WeatherData | null>(null);
  const [status, setStatus] = useState<WeatherFetchStatus>('idle');
  const [error, setError] = useState<string | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Live provider/key prefs. The subscribe path bumps `prefsRev` whenever
  // the user picks a different provider or saves a new API key.
  const [providerId, setProviderId]   = useState<ProviderId>(() => readProviderPref());
  const [owmApiKey, setOwmApiKey]     = useState<string>(() => readOwmApiKey());
  const [, setPrefsRev]               = useState(0);

  useEffect(() => {
    const unsubscribe = subscribeWeatherPrefs(() => {
      setProviderId(readProviderPref());
      setOwmApiKey(readOwmApiKey());
      setPrefsRev(n => n + 1);
    });
    return unsubscribe;
  }, []);

  // Bumping this triggers a refetch via the effect below.
  const [refreshNonce, setRefreshNonce] = useState(0);
  const refresh = useCallback(() => setRefreshNonce(n => n + 1), []);

  // Track the latest in-flight request so a stale resolve never overwrites
  // a newer one (e.g. user toggles provider quickly).
  const reqIdRef = useRef(0);

  const provider = getProvider(providerId);
  const needsApiKey = provider.requiresApiKey && !owmApiKey;

  useEffect(() => {
    if (!location) return;
    if (needsApiKey) {
      // Don't even attempt — the page surfaces an inline prompt instead.
      setStatus('idle');
      setIsRefreshing(false);
      // Keep `data` so the user still sees the previous source's last
      // payload while they enter the new key. Clearing here would
      // produce a jarring flash to the prompt.
      return;
    }

    const lat = location.lat;
    const lon = location.lng;
    const key = cacheKey(providerId, lat, lon);
    const myReqId = ++reqIdRef.current;

    // Hydrate from any usable cache first so the page paints immediately.
    const fcCache  = readForecastCache(key);
    const aqiCache = readAqiCache(key);
    const cityCache = readCityCache(`geo|${lat.toFixed(1)}|${lon.toFixed(1)}`);

    if (fcCache) {
      setData({
        ...fcCache.data,
        airQuality: aqiCache?.data ?? null,
        city: cityCache?.city ?? null,
      });
      setStatus('success');
      setIsRefreshing(true);
    } else {
      // Don't wipe data on a provider switch — keep the previous source's
      // data on screen until the new fetch resolves so the UI doesn't
      // snap to a skeleton on every toggle. We *do* show the skeleton on
      // a true cold start.
      setStatus(prev => (prev === 'success' ? 'success' : 'loading'));
      setIsRefreshing(true);
    }

    let cancelled = false;
    setError(null);

    (async () => {
      try {
        const forecast = await provider.fetchWeather({
          lat, lon, language, apiKey: owmApiKey || undefined,
        });
        if (cancelled || reqIdRef.current !== myReqId) return;

        const fcPayload: ForecastCachePayload = { key, data: forecast, timestamp: Date.now() };
        memForecast.set(key, fcPayload);
        writeLs(FORECAST_CACHE_KEY, fcPayload);

        // Optional blocks — fetched in parallel; their failures are silent.
        const aqiPromise = provider.fetchAirQuality
          ? provider.fetchAirQuality({ lat, lon, language, apiKey: owmApiKey || undefined })
          : Promise.resolve<AirQuality | null>(null);

        const [aqiResult, cityResult] = await Promise.allSettled([
          aqiPromise,
          fetchCity(lat, lon, language),
        ]);

        if (cancelled || reqIdRef.current !== myReqId) return;

        let aqi: AirQuality | null = aqiCache?.data ?? null;
        if (aqiResult.status === 'fulfilled' && aqiResult.value) {
          aqi = aqiResult.value;
          const aqiPayload: AqiCachePayload = { key, data: aqi, timestamp: Date.now() };
          memAqi.set(key, aqiPayload);
          writeLs(AQI_CACHE_KEY, aqiPayload);
        }

        let city: string | null = cityCache?.city ?? null;
        if (cityResult.status === 'fulfilled' && cityResult.value) {
          city = cityResult.value;
          // Geocoding is provider-independent — key it on coords only.
          const geoKey = `geo|${lat.toFixed(1)}|${lon.toFixed(1)}`;
          const cityPayload: CityCachePayload = { key: geoKey, city, timestamp: Date.now() };
          memCity.set(geoKey, cityPayload);
          writeLs(CITY_CACHE_KEY, cityPayload);
        }

        setData({ ...forecast, airQuality: aqi, city });
        setStatus('success');
        setIsRefreshing(false);
      } catch (e) {
        if (cancelled || reqIdRef.current !== myReqId) return;
        setError((e as Error).message || 'fetch failed');
        // Keep stale data when present; only flip to error on cold start.
        setStatus(prev => (prev === 'success' ? 'success' : 'error'));
        setIsRefreshing(false);
      }
    })();

    const interval = setInterval(() => setRefreshNonce(n => n + 1), REFRESH_MS);
    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  // We intentionally exclude `provider` and `language` from deps. The
  // provider is derived from `providerId` (covered) and changing
  // language while on the page is rare — the cached city stays usable
  // until next forced refresh. `data` is read inside the catch's
  // setStatus callback only; including it would loop the effect.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [location?.lat, location?.lng, providerId, owmApiKey, refreshNonce, needsApiKey]);

  return { data, status, error, needsApiKey, providerId, refresh, isRefreshing };
}
