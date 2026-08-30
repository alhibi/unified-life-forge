// ============================================================================
// PWSNetworkAdapter — virtual adapter that exposes nearby Personal Weather
// Station readings as a single ensemble member. The actual data fetching is
// left to provider-specific fetchers that ship alongside the adapter.
//
// WHY A VIRTUAL ADAPTER
//   Real-world PWS data sources are wildly heterogeneous:
//
//     • OpenWeatherMap requires registering your own stations and only
//       returns measurements for them — not a search endpoint.
//     • Netatmo requires OAuth and a developer partnership.
//     • MADIS / CWOP require ingesting MADIS netCDF files.
//     • Weather Underground retired their public API in 2019; the new
//       owner doesn't expose it the same way.
//
//   What every project needs is the same thing: an adapter that, given a
//   coordinate, returns a snapshot-shaped object representing nearby
//   ground-truth. This file defines that contract and ships a default
//   fetcher that:
//
//     1. Reads cached observations from IndexedDB (so the app degrades
//        gracefully when the network or the upstream is down).
//     2. Calls the registered provider fetchers to refresh the cache.
//     3. Aggregates the freshest N observations through PWSAggregator
//        and returns the consensus as a PartialSnapshot.
//
// HOW TO ADD A PROVIDER
//   Implement a `PWSFetcher` (see type below) and pass it to
//   `registerPWSFetcher(provider, fetcher)`. The adapter will use it on
//   every pipeline run.
// ============================================================================

import { aggregatePWS } from '../engine/PWSAggregator';
import type { ForecastLayers } from '../types/ForecastLayer';
import type { PWSObservation, PWSProvider, PWSStationMeta } from '../types/PWSObservation';
import { type AdapterResponse,SOURCE_REGISTRY } from '../types/SourceRegistry';
import type { PartialSnapshot } from '../types/WeatherSnapshot';
import { type AdapterContext, type BaseAdapter, runAdapter } from './BaseAdapter';

/** Fetcher signature for one PWS provider. Implementations are responsible
 *  for everything specific to their network (auth, pagination, rate limits). */
export type PWSFetcher = (
  ctx: AdapterContext,
) => Promise<{ stations: PWSStationMeta[]; observations: PWSObservation[] }>;

const fetchers = new Map<PWSProvider, PWSFetcher>();

/** Register a provider's fetcher. Replaces any previous registration. */
export function registerPWSFetcher(provider: PWSProvider, fetcher: PWSFetcher): void {
  fetchers.set(provider, fetcher);
}

/** Test seam — wipe every registered fetcher and every cached observation. */
export function clearPWSFetchers(): void {
  fetchers.clear();
  RECENT_OBSERVATIONS.clear();
}

/** Distance in km between two lat/lng points (haversine, great-circle).
 *  Exported so adapter implementations can recompute distance from their
 *  upstream station coordinates to the queried point. */
export function haversineKm(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371;
  const toRad = (x: number) => (x * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(a));
}

/** In-process cache: last successful observation set keyed by `lat_lng`. */
const RECENT_OBSERVATIONS = new Map<string, { ts: number; observations: PWSObservation[] }>();
const RECENT_TTL_MS = 30 * 60_000;

/** Pure cache accessor. */
export function getCachedObservations(lat: number, lng: number): PWSObservation[] | null {
  const key = `${lat.toFixed(2)}_${lng.toFixed(2)}`;
  const entry = RECENT_OBSERVATIONS.get(key);
  if (!entry) return null;
  if (Date.now() - entry.ts > RECENT_TTL_MS) {
    RECENT_OBSERVATIONS.delete(key);
    return null;
  }
  return entry.observations;
}

/** Aggregate every provider's observations into one consensus snapshot. */
export async function fetchPWSObservations(ctx: AdapterContext): Promise<PWSObservation[]> {
  const all: PWSObservation[] = [];
  await Promise.all(Array.from(fetchers.entries()).map(async ([provider, fetch]) => {
    try {
      const { observations } = await fetch(ctx);
      for (const obs of observations) {
        all.push({ ...obs, provider });
      }
    } catch (e) {
      // One provider failing must not stop the others.
      console.warn(`[pws] provider ${provider} failed:`, (e as Error).message);
    }
  }));
  return all;
}

export class PWSNetworkAdapter implements BaseAdapter {
  readonly id = 'pws-network' as const;
  readonly meta = SOURCE_REGISTRY['pws-network'];

  async fetchPartial(ctx: AdapterContext): Promise<PartialSnapshot> {
    const cached = getCachedObservations(ctx.lat, ctx.lng);
    const fresh = await fetchPWSObservations(ctx);
    if (fresh.length > 0) {
      RECENT_OBSERVATIONS.set(`${ctx.lat.toFixed(2)}_${ctx.lng.toFixed(2)}`, {
        ts: Date.now(),
        observations: fresh,
      });
    }
    const observations = fresh.length > 0 ? fresh : cached ?? [];
    return aggregatePWS(observations);
  }

  async fetchForecast(_ctx: AdapterContext): Promise<Partial<ForecastLayers>> {
    // PWS readings are instant — no forecast layers from a ground station.
    return {};
  }

  /** Quick health probe — succeeds if at least one provider is registered. */
  async ping(): Promise<boolean> {
    return fetchers.size > 0;
  }
}

/** Run the adapter through the standard resilience pipeline. */
export function runPWSAdapter(ctx: AdapterContext): Promise<AdapterResponse> {
  return runAdapter(new PWSNetworkAdapter(), ctx);
}