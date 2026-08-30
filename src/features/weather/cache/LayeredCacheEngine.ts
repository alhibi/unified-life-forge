// ============================================================================
// LayeredCacheEngine — bridges CacheResilience and WeatherEngine so the SWR
// semantics per layer become the source of truth for "do we need a network
// round-trip?".
//
// TWO RESPONSIBILITIES
//   1. Decide which layers need a fresh fetch based on the freshness of the
//      data we already have. The engine calls `planRefresh(layers)` after a
//      cache read; layers marked `fresh` are skipped, layers marked `stale`
//      trigger a background refresh, layers marked `miss` or `expired`
//      trigger a foreground refresh (we have nothing to show).
//
//   2. Persist freshly-fetched layers back into CacheResilience so the next
//      visit enjoys sub-100ms warm reads.
//
// WHY A SEPARATE MODULE
//   The engine already does too much (cache reads, aggregation, broadcast,
//   verification side effects). Splitting cache choreography out keeps each
//   piece under ~200 lines and lets the next stage add per-source prefetch
//   without further bloating the engine.
// ============================================================================

import type { ForecastLayers } from '../types/ForecastLayer';
import type { WeatherSnapshot } from '../types/WeatherSnapshot';
import { cacheResilience, type Freshness, type LayerName, readLayer } from './CacheResilience';

export interface LayeredRead<T> {
  value: T;
  freshness: Freshness;
  writtenAt: number;
}

/**
 * Read what we have for every layer. Returns `null` for layers that have
 * nothing at all (miss, or expired and caller didn't accept emergency).
 *
 * The caller can decide what to do with stale entries; the helper exists
 * so the engine doesn't have to know about L1/L2/L3 plumbing.
 */
export async function readAllLayers(
  key: string,
  opts: { acceptEmergency?: boolean } = {},
): Promise<{
  current:    LayeredRead<WeatherSnapshot>  | null;
  hourly:     LayeredRead<ForecastLayers>   | null;
  daily:      LayeredRead<ForecastLayers>   | null;
  radar:      LayeredRead<ForecastLayers['minutely']> | null;
  airquality: LayeredRead<WeatherSnapshot['airQuality']> | null;
}> {
  const [current, hourly, daily, radar, airquality] = await Promise.all([
    readLayer<WeatherSnapshot>('current', key, opts),
    readLayer<ForecastLayers>('hourly', key, opts),
    readLayer<ForecastLayers>('daily', key, opts),
    readLayer<ForecastLayers['minutely']>('radar', key, opts),
    readLayer<WeatherSnapshot['airQuality']>('airquality', key, opts),
  ]);

  function lift<T>(hit: Awaited<ReturnType<typeof readLayer<T>>>): LayeredRead<T> | null {
    if (!hit) return null;
    return { value: hit.value, freshness: hit.freshness, writtenAt: hit.writtenAt };
  }

  return {
    current:    lift<WeatherSnapshot>(current),
    hourly:     lift<ForecastLayers>(hourly),
    daily:      lift<ForecastLayers>(daily),
    radar:      lift<ForecastLayers['minutely']>(radar),
    airquality: lift<WeatherSnapshot['airQuality']>(airquality),
  };
}

export interface LayerRefreshPlan {
  /** Layers whose fresh fetch must run in the foreground (we have nothing). */
  foreground: LayerName[];
  /** Layers whose stale data is good enough — fire a background fetch only. */
  background: LayerName[];
  /** Layers we already have fresh data for — skip entirely. */
  skip: LayerName[];
}

/**
 * Inspect the layered cache read and emit a refresh plan. Pure: easy to test.
 *
 * Rules
 *   miss/expired → foreground (no data, or unusable data)
 *   stale        → background (good data, refresh quietly)
 *   fresh        → skip (no work needed)
 */
export function planRefresh(read: Awaited<ReturnType<typeof readAllLayers>>): LayerRefreshPlan {
  const fg: LayerName[] = [];
  const bg: LayerName[] = [];
  const sk: LayerName[] = [];

  function classify(name: LayerName, hit: LayeredRead<unknown> | null) {
    if (!hit || hit.freshness === 'expired') {
      fg.push(name);
    } else if (hit.freshness === 'stale') {
      bg.push(name);
    } else {
      sk.push(name);
    }
  }

  classify('current',    read.current    as LayeredRead<unknown> | null);
  classify('hourly',     read.hourly     as LayeredRead<unknown> | null);
  classify('daily',      read.daily      as LayeredRead<unknown> | null);
  classify('radar',      read.radar      as LayeredRead<unknown> | null);
  classify('airquality', read.airquality as LayeredRead<unknown> | null);

  return { foreground: fg, background: bg, skip: sk };
}

/**
 * Persist a freshly-built snapshot/forecast into the appropriate layers.
 * `current` and `airquality` share TTL buckets but different value shapes, so
 * they go to different layers. `hourly` and `daily` both hold a full
 * ForecastLayers payload (cheap; cache cost is bounded by grace window).
 */
export async function persistLayers(
  key: string,
  snapshot: WeatherSnapshot,
  forecast: ForecastLayers,
): Promise<void> {
  await Promise.all([
    cacheResilience.layer<WeatherSnapshot>('current').write(key, snapshot),
    cacheResilience.layer<WeatherSnapshot['airQuality']>('airquality').write(key, snapshot.airQuality),
    cacheResilience.layer<ForecastLayers>('hourly').write(key, forecast),
    cacheResilience.layer<ForecastLayers>('daily').write(key, forecast),
    cacheResilience.layer<ForecastLayers['minutely']>('radar').write(key, forecast.minutely),
  ]);
}