// ============================================================================
// ForecastVerification — the layer that finally tells us whether we were
// right. Once an observation timestamp passes, we look up the per-source
// forecasts that targeted it, compare them with the actual ensemble reading,
// and emit a per-(source, field) error that the adaptive tracker can fold in.
//
// WHY THIS IS DIFFERENT FROM ConsensusSkillTracker
//   The existing tracker measures a source's bias *relative to the consensus*
//   at the same instant. That captures systematic model drift — useful, but
//   circular when the consensus itself is made of the same biased members.
//   Here, the reference is the *next-hour observation*, which is independent
//   of any one source. A 1.8 °C warm bias against the observation is a real
//   bias, not a self-fulfilling artefact.
//
// USAGE
//   The engine calls `verifyForecasts(lat, lng, observed)` after every
//   successful pipeline run. The result feeds `recordVerifiedSkill` which
//   patches ConsensusSkillTracker with ground-truth evidence.
// ============================================================================

import type { SourceId } from '../types/SourceRegistry';
import { readLedgerEntries, type LedgerEntry } from './ForecastLedger';

/** Fields the verifier scores — subset of `SkillField` plus precipitation. */
export type VerifiableField = 'temperature' | 'humidity' | 'pressure' | 'wind' | 'cloud';

interface Observation {
  timestamp_unix: number;
  temperature_c: number | null;
  humidity_percent: number | null;
  pressure_hpa: number | null;
  wind_kph: number | null;
  cloud_cover_percent: number | null;
}

export interface VerifiedObservation {
  sourceId: SourceId;
  field: VerifiableField;
  /** Forecast value (after bias correction is *not* applied — raw member value). */
  forecast: number;
  /** Observation value the forecast was scored against. */
  observed: number;
  /** Simple signed error: forecast − observed. */
  error: number;
  /** Lead-time in hours at issue. */
  lead_hours: number;
  /** When the forecast was issued, in epoch ms. */
  issued_unix: number;
  /** When the forecast targeted, in epoch ms. */
  valid_unix: number;
}

const HOUR_MS = 3_600_000;

/**
 * Tolerance for matching a forecast entry to an observation timestamp.
 * Sources round to the hour differently; ±15 minutes catches the boundary
 * cases without letting a 2-hour-stale forecast through.
 */
const TIMESTAMP_TOLERANCE_MS = 15 * 60_000;

const FIELD_PREDICATE: Record<VerifiableField, (e: LedgerEntry, o: Observation) => number | null> = {
  temperature: (e, o) => (e.temperature_c !== null && o.temperature_c !== null ? o.temperature_c : null),
  humidity:    (e, o) => (e.humidity_percent !== null && o.humidity_percent !== null ? o.humidity_percent : null),
  pressure:    (e, o) => (e.pressure_hpa !== null && o.pressure_hpa !== null ? o.pressure_hpa : null),
  wind:        (e, o) => (e.wind_kph !== null && o.wind_kph !== null ? o.wind_kph : null),
  cloud:       (e, o) => (e.cloud_cover_percent !== null && o.cloud_cover_percent !== null ? o.cloud_cover_percent : null),
};

const FIELD_FORECAST: Record<VerifiableField, (e: LedgerEntry) => number | null> = {
  temperature: (e) => e.temperature_c,
  humidity:    (e) => e.humidity_percent,
  pressure:    (e) => e.pressure_hpa,
  wind:        (e) => e.wind_kph,
  cloud:       (e) => e.cloud_cover_percent,
};

/**
 * For one observation, walk the per-source ledger and emit a `VerifiedObservation`
 * for every (source, field) that has both a forecast AND a matching observation
 * timestamp. Returns an empty array if the ledger is empty or unavailable — the
 * adaptive tracker simply keeps using its existing skill stats.
 *
 * `sources` constrains the read to the atmospheric members that actually vote
 * in the ensemble — domain-specialist sources have no per-hour forecast.
 */
export async function verifyForecasts(
  lat: number,
  lng: number,
  observation: Observation,
  sources: SourceId[],
): Promise<VerifiedObservation[]> {
  const observations: VerifiedObservation[] = [];
  // Parallel reads beat sequential: with up to 6 sources and an IDB roundtrip
  // each, latency is IDB-bound and concurrency is cheap.
  const ledgers = await Promise.all(
    sources.map(async (sourceId) => ({ sourceId, entries: await readLedgerEntries(lat, lng, sourceId) })),
  );

  for (const { sourceId, entries } of ledgers) {
    const match = entries.find((e) => Math.abs(e.valid_unix - observation.timestamp_unix) <= TIMESTAMP_TOLERANCE_MS);
    if (!match) continue;
    for (const field of Object.keys(FIELD_PREDICATE) as VerifiableField[]) {
      const forecast = FIELD_FORECAST[field](match);
      const observed = FIELD_PREDICATE[field](match, observation);
      if (forecast === null || observed === null) continue;
      if (!Number.isFinite(forecast) || !Number.isFinite(observed)) continue;
      observations.push({
        sourceId,
        field,
        forecast,
        observed,
        error: forecast - observed,
        lead_hours: match.lead_hours,
        issued_unix: match.issued_unix,
        valid_unix: match.valid_unix,
      });
    }
  }
  return observations;
}

/**
 * True iff the timestamp is at least one hour old and hour-aligned, the two
 * conditions that make verification meaningful. Earlier than one hour we
 * still have live members voting on the same instant — adding the bias from
 * a previous observation would double-count.
 */
export function isObservationDue(timestamp_unix: number, now = Date.now()): boolean {
  if (timestamp_unix % HOUR_MS !== 0) return false;
  const ageMs = now - timestamp_unix;
  return ageMs >= HOUR_MS && ageMs <= 2 * HOUR_MS;
}

/**
 * Aggregate verified observations by (source, field) so the adaptive tracker
 * can fold them into EWMA statistics the same way it folds member-vs-consensus
 * deviations. Returns `null` for empty buckets so the caller can skip.
 */
export interface VerifiedSkill {
  sourceId: SourceId;
  field: VerifiableField;
  error: number;
  absError: number;
  lead_hours: number;
  samples: number;
}

export function aggregateByField(observations: VerifiedObservation[]): VerifiedSkill[] {
  type Bucket = { sumErr: number; sumAbs: number; lead: number; samples: number };
  const buckets = new Map<string, { sourceId: SourceId; field: VerifiableField; bucket: Bucket }>();
  for (const o of observations) {
    const key = `${o.sourceId}|${o.field}`;
    let entry = buckets.get(key);
    if (!entry) {
      entry = { sourceId: o.sourceId, field: o.field, bucket: { sumErr: 0, sumAbs: 0, lead: 0, samples: 0 } };
      buckets.set(key, entry);
    }
    entry.bucket.sumErr += o.error;
    entry.bucket.sumAbs += Math.abs(o.error);
    entry.bucket.lead += o.lead_hours;
    entry.bucket.samples += 1;
  }
  const out: VerifiedSkill[] = [];
  for (const { sourceId, field, bucket } of buckets.values()) {
    if (bucket.samples === 0) continue;
    out.push({
      sourceId,
      field,
      error: bucket.sumErr / bucket.samples,
      absError: bucket.sumAbs / bucket.samples,
      lead_hours: bucket.lead / bucket.samples,
      samples: bucket.samples,
    });
  }
  return out;
}