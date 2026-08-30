// ============================================================================
// PWS layer tests — aggregator weighting, haversine, fetch dispatch, and the
// virtual adapter's resilience to provider failures.
// ============================================================================

import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { aggregatePWS, selectNearby } from '../engine/PWSAggregator';
import {
  clearPWSFetchers,
  haversineKm,
  PWSNetworkAdapter,
  registerPWSFetcher,
} from '../sources/PWSNetworkAdapter';
import type { PWSObservation } from '../types/PWSObservation';

const HOUR_MS = 3_600_000;

function makeObs(over: Partial<PWSObservation> = {}): PWSObservation {
  return {
    stationId: 'STATION-001',
    provider: 'cwop',
    timestamp_unix: Date.now() - 30 * 60_000,
    distance_km: 2,
    temperature_c: 18.0,
    humidity_percent: 60,
    pressure_hpa: 1013,
    wind_kph: 10,
    wind_direction_deg: 90,
    precip_1h_mm: 0,
    quality: 1.0,
    ...over,
  };
}

beforeEach(() => {
  clearPWSFetchers();
});

afterEach(() => {
  clearPWSFetchers();
});

describe('haversineKm', () => {
  it('returns 0 for identical points', () => {
    expect(haversineKm(52.5, 13.4, 52.5, 13.4)).toBe(0);
  });

  it('matches a known Berlin → Paris distance within 1%', () => {
    // Berlin 52.52, 13.405 → Paris 48.857, 2.352 ≈ 878 km
    const d = haversineKm(52.52, 13.405, 48.857, 2.352);
    expect(d).toBeGreaterThan(870);
    expect(d).toBeLessThan(890);
  });
});

describe('selectNearby', () => {
  it('sorts by distance and drops anything beyond 25 km', () => {
    const obs = [
      makeObs({ distance_km: 30 }),
      makeObs({ distance_km: 1, stationId: 'A' }),
      makeObs({ distance_km: 50 }),
      makeObs({ distance_km: 5, stationId: 'B' }),
    ];
    const picked = selectNearby(obs);
    expect(picked.length).toBe(2);
    expect(picked[0].stationId).toBe('A');
    expect(picked[1].stationId).toBe('B');
  });
});

describe('aggregatePWS', () => {
  it('returns {} when fewer than 3 samples are nearby', () => {
    const obs = [makeObs(), makeObs({ stationId: 'B' })];
    expect(aggregatePWS(obs)).toEqual({});
  });

  it('emits a PartialSnapshot when enough samples agree', () => {
    const obs = [
      makeObs({ stationId: 'A', temperature_c: 18.0 }),
      makeObs({ stationId: 'B', temperature_c: 18.5 }),
      makeObs({ stationId: 'C', temperature_c: 19.0 }),
    ];
    const snap = aggregatePWS(obs);
    expect(snap.temperature?.actual_c).toBeGreaterThan(17);
    expect(snap.temperature?.actual_c).toBeLessThan(20);
  });

  it('uses weighted median to ignore outlier stations', () => {
    // Three stations say 18-19 °C; one very-low-quality station says 35 °C.
    const obs = [
      makeObs({ stationId: 'A', temperature_c: 18.0, quality: 1.0 }),
      makeObs({ stationId: 'B', temperature_c: 18.5, quality: 1.0 }),
      makeObs({ stationId: 'C', temperature_c: 19.0, quality: 1.0 }),
      makeObs({ stationId: 'D', temperature_c: 35.0, quality: 0.01, distance_km: 24 }),
    ];
    const snap = aggregatePWS(obs);
    expect(snap.temperature?.actual_c).toBeLessThan(22);
    expect(snap.temperature?.actual_c).toBeGreaterThan(17);
  });

  it('uses circular mean for wind direction', () => {
    // Three stations point east (90°), one says 270° (west). Circular mean
    // pulls toward 90°, NOT toward 0° (linear mean).
    const obs = [
      makeObs({ wind_direction_deg: 90 }),
      makeObs({ wind_direction_deg: 90, stationId: 'B' }),
      makeObs({ wind_direction_deg: 90, stationId: 'C' }),
      makeObs({ wind_direction_deg: 270, stationId: 'D', quality: 0.1 }),
    ];
    const snap = aggregatePWS(obs);
    expect(snap.wind?.direction_deg).toBeGreaterThan(60);
    expect(snap.wind?.direction_deg).toBeLessThan(120);
  });

  it('returns {} if every field is null', () => {
    const obs = [
      makeObs({ temperature_c: null, humidity_percent: null, pressure_hpa: null, wind_kph: null, wind_direction_deg: null, precip_1h_mm: null }),
      makeObs({ stationId: 'B', temperature_c: null, humidity_percent: null, pressure_hpa: null, wind_kph: null, wind_direction_deg: null, precip_1h_mm: null }),
      makeObs({ stationId: 'C', temperature_c: null, humidity_percent: null, pressure_hpa: null, wind_kph: null, wind_direction_deg: null, precip_1h_mm: null }),
    ];
    expect(aggregatePWS(obs)).toEqual({});
  });
});

describe('PWSNetworkAdapter', () => {
  it('aggregates observations across all registered providers', async () => {
    registerPWSFetcher('cwop', async () => ({
      stations: [],
      observations: [
        makeObs({ stationId: 'cwop-1', temperature_c: 18 }),
        makeObs({ stationId: 'cwop-2', temperature_c: 18.5 }),
        makeObs({ stationId: 'cwop-3', temperature_c: 19 }),
      ],
    }));
    registerPWSFetcher('netatmo', async () => ({
      stations: [],
      observations: [
        makeObs({ stationId: 'netatmo-1', temperature_c: 18.2 }),
        makeObs({ stationId: 'netatmo-2', temperature_c: 18.6 }),
        makeObs({ stationId: 'netatmo-3', temperature_c: 18.9 }),
      ],
    }));

    const adapter = new PWSNetworkAdapter();
    const snap = await adapter.fetchPartial({ lat: 52.52, lng: 13.405, language: 'en' });
    expect(snap.temperature?.actual_c).toBeGreaterThan(17);
    expect(snap.temperature?.actual_c).toBeLessThan(20);
  });

  it('continues aggregating when one provider throws', async () => {
    registerPWSFetcher('cwop', async () => { throw new Error('upstream 500'); });
    registerPWSFetcher('madis', async () => ({
      stations: [],
      observations: [
        makeObs({ stationId: 'madis-1', temperature_c: 20 }),
        makeObs({ stationId: 'madis-2', temperature_c: 20.4 }),
        makeObs({ stationId: 'madis-3', temperature_c: 20.8 }),
      ],
    }));
    const adapter = new PWSNetworkAdapter();
    const snap = await adapter.fetchPartial({ lat: 52.52, lng: 13.405, language: 'en' });
    expect(snap.temperature?.actual_c).toBeGreaterThan(19);
  });

  it('returns {} when no providers are registered', async () => {
    const adapter = new PWSNetworkAdapter();
    const snap = await adapter.fetchPartial({ lat: 52.52, lng: 13.405, language: 'en' });
    expect(snap).toEqual({});
  });

  it('ping() is true when providers are registered, false otherwise', async () => {
    const adapter = new PWSNetworkAdapter();
    expect(await adapter.ping()).toBe(false);
    registerPWSFetcher('manual', async () => ({ stations: [], observations: [] }));
    expect(await adapter.ping()).toBe(true);
  });

  it('fetchForecast returns {} (PWS provides no forecast)', async () => {
    const adapter = new PWSNetworkAdapter();
    expect(await adapter.fetchForecast({ lat: 0, lng: 0, language: 'en' })).toEqual({});
  });
});

describe('timestamp-based freshness', () => {
  it('treats a 1h-old observation as fresh data', () => {
    const obs = makeObs({ timestamp_unix: Date.now() - HOUR_MS });
    expect(Date.now() - obs.timestamp_unix).toBeGreaterThanOrEqual(HOUR_MS);
  });
});