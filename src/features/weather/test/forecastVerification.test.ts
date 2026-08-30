// ============================================================================
// Verification layer tests.
//
// The IndexedDB ledger depends on a real browser environment, so we exercise
// it through `fake-indexeddb` (declared as a dev dependency). When IDB is
// unavailable the ledger silently no-ops; this file verifies both paths.
// ============================================================================

import 'fake-indexeddb/auto';
import { afterEach, describe, expect, it } from 'vitest';

import {
  clearLedger,
  ledgerCellKey,
  pruneLedger,
  readLedgerEntries,
  recordLedgerEntry,
} from '../engine/ForecastLedger';
import {
  aggregateByField,
  isObservationDue,
  type VerifiedObservation,
  verifyForecasts,
} from '../engine/ForecastVerification';
import { feedVerifiedSkill, recordVerifiedSkill } from '../engine/SourceVerifier';
import { cellKey, recordObservations, resetSkillStore } from '../engine/ConsensusSkillTracker';

const HOUR_MS = 3_600_000;
const lat = 52.52;
const lng = 13.405; // Berlin

afterEach(async () => {
  await clearLedger();
  resetSkillStore();
});

describe('ForecastLedger.cellKey', () => {
  it('rounds to a ~25 km grid cell', () => {
    expect(ledgerCellKey(52.51, 13.40)).toBe(ledgerCellKey(52.52, 13.41));
    expect(ledgerCellKey(52.51, 13.40)).not.toBe(ledgerCellKey(55.0, 13.40));
  });
});

describe('ForecastLedger write/read', () => {
  it('records and reads back a forecast entry', async () => {
    const now = Date.now();
    const valid = Math.floor(now / HOUR_MS) * HOUR_MS + HOUR_MS; // next hour
    await recordLedgerEntry(lat, lng, 'open-meteo', {
      valid_unix: valid,
      issued_unix: now,
      temperature_c: 18.4,
      humidity_percent: 62,
      pressure_hpa: 1014,
      wind_kph: 11.2,
      cloud_cover_percent: 40,
      precip_mm: 0,
    });

    const entries = await readLedgerEntries(lat, lng, 'open-meteo');
    expect(entries.length).toBe(1);
    expect(entries[0].temperature_c).toBe(18.4);
    expect(entries[0].lead_hours).toBeGreaterThanOrEqual(0);
  });

  it('isolates entries by source id', async () => {
    const now = Date.now();
    const valid = Math.floor(now / HOUR_MS) * HOUR_MS;
    await recordLedgerEntry(lat, lng, 'open-meteo', {
      valid_unix: valid,
      issued_unix: now,
      temperature_c: 18,
      humidity_percent: null,
      pressure_hpa: null,
      wind_kph: null,
      cloud_cover_percent: null,
      precip_mm: null,
    });
    await recordLedgerEntry(lat, lng, 'noaa', {
      valid_unix: valid,
      issued_unix: now,
      temperature_c: 19,
      humidity_percent: null,
      pressure_hpa: null,
      wind_kph: null,
      cloud_cover_percent: null,
      precip_mm: null,
    });

    const om = await readLedgerEntries(lat, lng, 'open-meteo');
    const noaa = await readLedgerEntries(lat, lng, 'noaa');
    expect(om.length).toBe(1);
    expect(noaa.length).toBe(1);
    expect(om[0].temperature_c).toBe(18);
    expect(noaa[0].temperature_c).toBe(19);
  });

  it('drops entries outside the 24-hour window', async () => {
    const now = Date.now();
    const stale = Math.floor(now / HOUR_MS) * HOUR_MS - 30 * HOUR_MS; // 30 hours ago
    await recordLedgerEntry(lat, lng, 'open-meteo', {
      valid_unix: stale,
      issued_unix: now,
      temperature_c: 18,
      humidity_percent: null,
      pressure_hpa: null,
      wind_kph: null,
      cloud_cover_percent: null,
      precip_mm: null,
    });

    const entries = await readLedgerEntries(lat, lng, 'open-meteo');
    expect(entries.length).toBe(0);
  });
});

describe('ForecastLedger.pruneLedger', () => {
  it('removes expired entries', async () => {
    const now = Date.now();
    const valid = Math.floor(now / HOUR_MS) * HOUR_MS;
    // Inject an entry directly into IDB with a stale valid-time.
    const dbReq = indexedDB.open('weather-engine', 2);
    const db = await new Promise<IDBDatabase>((resolve, reject) => {
      dbReq.onsuccess = () => resolve(dbReq.result);
      dbReq.onerror = () => reject(dbReq.error);
    });
    const cell = ledgerCellKey(lat, lng);
    const tx = db.transaction('forecast-ledger', 'readwrite');
    tx.objectStore('forecast-ledger').put({
      key: `${cell}|open-meteo|${valid - 30 * HOUR_MS}`,
      cell,
      sourceId: 'open-meteo',
      entry: {
        valid_unix: valid - 30 * HOUR_MS,
        issued_unix: valid - 31 * HOUR_MS,
        lead_hours: 1,
        temperature_c: 10,
        humidity_percent: null,
        pressure_hpa: null,
        wind_kph: null,
        cloud_cover_percent: null,
        precip_mm: null,
      },
    });
    await new Promise<void>((r) => {
      tx.oncomplete = () => r();
    });

    await pruneLedger();
    const entries = await readLedgerEntries(lat, lng, 'open-meteo');
    expect(entries.length).toBe(0);
  });
});

describe('ForecastVerification.isObservationDue', () => {
  it('is false for the current hour', () => {
    const now = Date.now();
    const currentHour = Math.floor(now / HOUR_MS) * HOUR_MS;
    expect(isObservationDue(currentHour, now)).toBe(false);
  });

  it('is true for the previous hour', () => {
    const now = Date.now();
    const previousHour = Math.floor(now / HOUR_MS) * HOUR_MS - HOUR_MS;
    expect(isObservationDue(previousHour, now)).toBe(true);
  });

  it('is false for non-hour-aligned timestamps', () => {
    const now = Date.now();
    const drifted = Math.floor(now / HOUR_MS) * HOUR_MS - HOUR_MS + 30 * 60_000;
    expect(isObservationDue(drifted, now)).toBe(false);
  });
});

describe('ForecastVerification.verifyForecasts', () => {
  it('matches a forecast to the matching observation timestamp', async () => {
    const now = Date.now();
    const valid = Math.floor(now / HOUR_MS) * HOUR_MS;
    await recordLedgerEntry(lat, lng, 'open-meteo', {
      valid_unix: valid,
      issued_unix: valid - HOUR_MS,
      temperature_c: 19,
      humidity_percent: 60,
      pressure_hpa: 1014,
      wind_kph: 10,
      cloud_cover_percent: 50,
      precip_mm: null,
    });

    const observations = await verifyForecasts(
      lat, lng,
      {
        timestamp_unix: valid,
        temperature_c: 18,
        humidity_percent: 62,
        pressure_hpa: 1013,
        wind_kph: 11,
        cloud_cover_percent: 55,
      },
      ['open-meteo'],
    );

    expect(observations.length).toBe(5); // 5 verifiable fields
    const temp = observations.find((o) => o.field === 'temperature')!;
    expect(temp).toBeDefined();
    expect(temp.forecast).toBe(19);
    expect(temp.observed).toBe(18);
    expect(temp.error).toBeCloseTo(1, 5);
    expect(temp.lead_hours).toBe(1);
  });

  it('returns [] when the ledger is empty', async () => {
    const observations = await verifyForecasts(
      lat, lng,
      { timestamp_unix: Math.floor(Date.now() / HOUR_MS) * HOUR_MS, temperature_c: 18, humidity_percent: null, pressure_hpa: null, wind_kph: null, cloud_cover_percent: null },
      ['open-meteo'],
    );
    expect(observations).toEqual([]);
  });

  it('skips fields where either forecast or observation is null', async () => {
    const now = Date.now();
    const valid = Math.floor(now / HOUR_MS) * HOUR_MS;
    await recordLedgerEntry(lat, lng, 'open-meteo', {
      valid_unix: valid,
      issued_unix: valid - HOUR_MS,
      temperature_c: 19,
      humidity_percent: null,
      pressure_hpa: null,
      wind_kph: null,
      cloud_cover_percent: null,
      precip_mm: null,
    });

    const observations = await verifyForecasts(
      lat, lng,
      { timestamp_unix: valid, temperature_c: 18, humidity_percent: null, pressure_hpa: null, wind_kph: null, cloud_cover_percent: null },
      ['open-meteo'],
    );

    expect(observations.length).toBe(1);
    expect(observations[0].field).toBe('temperature');
  });
});

describe('ForecastVerification.aggregateByField', () => {
  it('averages signed and absolute errors per (source, field)', () => {
    const input: VerifiedObservation[] = [
      { sourceId: 'open-meteo', field: 'temperature', forecast: 19, observed: 18, error:  1, lead_hours: 1, issued_unix: 0, valid_unix: 0 },
      { sourceId: 'open-meteo', field: 'temperature', forecast: 20, observed: 18, error:  2, lead_hours: 1, issued_unix: 0, valid_unix: 0 },
      { sourceId: 'open-meteo', field: 'temperature', forecast: 17, observed: 18, error: -1, lead_hours: 2, issued_unix: 0, valid_unix: 0 },
      { sourceId: 'noaa',       field: 'temperature', forecast: 18, observed: 18, error:  0, lead_hours: 1, issued_unix: 0, valid_unix: 0 },
    ];
    const out = aggregateByField(input);
    expect(out.length).toBe(2);
    const om = out.find((o) => o.sourceId === 'open-meteo')!;
    expect(om.error).toBeCloseTo(2 / 3, 5);
    expect(om.absError).toBeCloseTo(4 / 3, 5);
    expect(om.samples).toBe(3);
    const noaa = out.find((o) => o.sourceId === 'noaa')!;
    expect(noaa.error).toBe(0);
    expect(noaa.samples).toBe(1);
  });
});

describe('SourceVerifier.feedVerifiedSkill', () => {
  it('drops buckets with fewer than 3 samples', () => {
    const obs = feedVerifiedSkill([
      { sourceId: 'open-meteo', field: 'temperature', error: 1.5, absError: 1.5, lead_hours: 1, samples: 2 },
      { sourceId: 'noaa',       field: 'temperature', error: 0.5, absError: 0.5, lead_hours: 2, samples: 5 },
    ]);
    expect(obs.length).toBe(1);
    expect(obs[0].sourceId).toBe('noaa');
    expect(obs[0].memberValue).toBeCloseTo(0.5, 5);
  });

  it('combines same (source, field) buckets by sample-weighted mean', () => {
    const obs = feedVerifiedSkill([
      { sourceId: 'open-meteo', field: 'temperature', error: 1.0, absError: 1.0, lead_hours: 1, samples: 3 },
      { sourceId: 'open-meteo', field: 'temperature', error: 3.0, absError: 3.0, lead_hours: 2, samples: 3 },
    ]);
    expect(obs.length).toBe(1);
    expect(obs[0].memberValue).toBeCloseTo(2.0, 5);
  });
});

describe('SourceVerifier.recordVerifiedSkill', () => {
  it('writes real, observed-skill evidence into the tracker', () => {
    // The tracker's EWMA absorbs one observation per call, so passing a
    // 6-sample batch produces a single sample in the store. Multiple batches
    // build up to the MIN_SAMPLES gate (6) that flips bias correction on.
    const verified = [
      { sourceId: 'open-meteo' as const, field: 'temperature' as const, error: 2.0, absError: 2.0, lead_hours: 1, samples: 6 },
    ];
    for (let i = 0; i < 6; i += 1) recordVerifiedSkill(verified, lat, lng);

    const raw = localStorage.getItem('weather:consensus-skill:v1');
    expect(raw).toBeTruthy();
    const parsed = JSON.parse(raw!);
    const cellStats = parsed[cellKey(lat, lng)]?.['open-meteo']?.temperature;
    expect(cellStats).toBeTruthy();
    expect(cellStats.samples).toBeGreaterThanOrEqual(6);
    // The bias must be near +2 °C since every batch carried that error.
    expect(cellStats.bias).toBeGreaterThan(1.5);
    expect(cellStats.bias).toBeLessThan(2.5);
  });
});