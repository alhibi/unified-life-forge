/**
 * ConsensusSkillTracker — adaptive per-source weights and bias correction.
 *
 * HONEST SCOPE. This does not measure true forecast skill: verifying against
 * observations would require storing every past forecast and re-scoring it once
 * the valid time arrives, which a client-side app has no business doing. What
 * it measures is each source's *systematic deviation from the multi-source
 * consensus* for the same instant and location, tracked as an exponentially
 * weighted moving average.
 *
 * That signal is still worth a lot, for two reasons:
 *
 *  1. Bias correction. If OpenWeatherMap reads 1.8 °C warmer than the
 *     consensus at this location on every single refresh, that is a
 *     reproducible offset (typically a model grid-cell / elevation mismatch,
 *     not noise). Removing half of it before blending measurably tightens the
 *     ensemble. Only half, because the consensus is itself partly made of the
 *     biased member — a full correction would over-fit.
 *
 *  2. Performance weighting. A member that scatters far from consensus every
 *     time contributes noise; down-weighting it (never to zero) is the
 *     standard performance-weighted ensemble treatment.
 *
 * Invariants that keep this safe:
 *   • A member is never removed, only attenuated to at most 45% of its prior.
 *   • Nothing is applied until MIN_SAMPLES observations exist for that
 *     (source, field, location-cell) triple.
 *   • Statistics are per ~25 km location cell: a model's bias in a coastal
 *     city says nothing about its bias in a desert.
 *   • Records expire after STALE_MS so a model upgrade is not punished
 *     forever.
 */
import type { SourceId } from '../types/SourceRegistry';

/** Fields we track. Each has its own natural error scale. */
export type SkillField = 'temperature' | 'humidity' | 'pressure' | 'wind' | 'cloud';

/** Error magnitude (in the field's own unit) that halves the skill factor. */
const ERROR_SCALE: Record<SkillField, number> = {
  temperature: 1.6, // °C
  humidity: 8, // %
  pressure: 1.4, // hPa
  wind: 6, // km/h
  cloud: 18, // %
};

/** Largest bias we are willing to attribute to a source, per field. */
const MAX_BIAS: Record<SkillField, number> = {
  temperature: 4,
  humidity: 20,
  pressure: 5,
  wind: 15,
  cloud: 35,
};

const STORAGE_KEY = 'weather:consensus-skill:v1';
const EWMA_ALPHA = 0.18;
const MIN_SAMPLES = 6;
/** Fraction of the observed bias actually removed. See note (1) above. */
const BIAS_CORRECTION_FACTOR = 0.5;
/** Weight floor as a share of the registry prior. */
const MIN_WEIGHT_SHARE = 0.45;
const STALE_MS = 21 * 24 * 60 * 60 * 1000;
/** Cap on stored cells so localStorage cannot grow without bound. */
const MAX_CELLS = 24;

interface FieldStat {
  /** EWMA of (member − consensus). Signed. */
  bias: number;
  /** EWMA of |member − consensus|. */
  mae: number;
  samples: number;
  updatedAt: number;
}

type CellStats = Partial<Record<SourceId, Partial<Record<SkillField, FieldStat>>>>;
type Store = Record<string, CellStats>;

let store: Store | null = null;

/** ~25 km grid cell key. Coarse on purpose: finer cells never accumulate samples. */
export function cellKey(lat: number, lng: number): string {
  return `${(Math.round(lat / 0.25) * 0.25).toFixed(2)},${(Math.round(lng / 0.25) * 0.25).toFixed(2)}`;
}

function load(): Store {
  if (store) return store;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    store = raw ? (JSON.parse(raw) as Store) : {};
  } catch {
    store = {};
  }
  return store;
}

function persist() {
  if (!store) return;
  try {
    // Evict the least-recently-touched cells before writing.
    const keys = Object.keys(store);
    if (keys.length > MAX_CELLS) {
      const lastTouch = (cell: CellStats): number => {
        let max = 0;
        for (const fields of Object.values(cell)) {
          for (const stat of Object.values(fields ?? {})) {
            if (stat && stat.updatedAt > max) max = stat.updatedAt;
          }
        }
        return max;
      };
      const sorted = keys.sort((a, b) => lastTouch(store![b]) - lastTouch(store![a]));
      for (const key of sorted.slice(MAX_CELLS)) delete store![key];
    }
    localStorage.setItem(STORAGE_KEY, JSON.stringify(store));
  } catch {
    /* quota or privacy mode — adaptive weighting degrades to the priors */
  }
}

function readStat(cell: string, sourceId: SourceId, field: SkillField): FieldStat | null {
  const stat = load()[cell]?.[sourceId]?.[field];
  if (!stat) return null;
  if (Date.now() - stat.updatedAt > STALE_MS) return null;
  if (!Number.isFinite(stat.bias) || !Number.isFinite(stat.mae)) return null;
  return stat;
}

export interface Observation {
  sourceId: SourceId;
  field: SkillField;
  /** Value the source reported (already unit-normalised). */
  memberValue: number;
  /** Consensus for the same instant. */
  consensusValue: number;
}

/**
 * Fold a batch of member-vs-consensus deviations into the store.
 * Called once per successful pipeline run.
 */
export function recordObservations(lat: number, lng: number, observations: Observation[]): void {
  if (observations.length === 0) return;
  const cell = cellKey(lat, lng);
  const s = load();
  const cellStats: CellStats = s[cell] ?? {};

  for (const obs of observations) {
    if (!Number.isFinite(obs.memberValue) || !Number.isFinite(obs.consensusValue)) continue;
    const error = obs.memberValue - obs.consensusValue;
    // A wild single reading (sensor glitch, unit mix-up) must not poison the
    // EWMA; the aggregator already rejected it as an outlier for this run.
    if (Math.abs(error) > MAX_BIAS[obs.field] * 3) continue;

    const bySource = cellStats[obs.sourceId] ?? {};
    const prev = bySource[obs.field];
    const next: FieldStat = prev
      ? {
          bias: prev.bias + EWMA_ALPHA * (error - prev.bias),
          mae: prev.mae + EWMA_ALPHA * (Math.abs(error) - prev.mae),
          samples: Math.min(prev.samples + 1, 10_000),
          updatedAt: Date.now(),
        }
      : { bias: error, mae: Math.abs(error), samples: 1, updatedAt: Date.now() };

    bySource[obs.field] = next;
    cellStats[obs.sourceId] = bySource;
  }

  s[cell] = cellStats;
  store = s;
  persist();
}

/**
 * Additive correction to apply to a member's raw value before blending.
 * Returns 0 whenever we lack the evidence to justify touching the number.
 */
export function biasCorrection(lat: number, lng: number, sourceId: SourceId, field: SkillField): number {
  const stat = readStat(cellKey(lat, lng), sourceId, field);
  if (!stat || stat.samples < MIN_SAMPLES) return 0;
  const clamped = Math.max(-MAX_BIAS[field], Math.min(MAX_BIAS[field], stat.bias));
  return -clamped * BIAS_CORRECTION_FACTOR;
}

/**
 * Multiplier on the registry prior weight, in [MIN_WEIGHT_SHARE, 1].
 * A source whose MAE equals the field's error scale keeps ~72% of its prior.
 */
export function weightMultiplier(lat: number, lng: number, sourceId: SourceId, field: SkillField): number {
  const stat = readStat(cellKey(lat, lng), sourceId, field);
  if (!stat || stat.samples < MIN_SAMPLES) return 1;
  const skill = 1 / (1 + stat.mae / ERROR_SCALE[field]);
  const multiplier = MIN_WEIGHT_SHARE + (1 - MIN_WEIGHT_SHARE) * skill;
  return Number(Math.max(MIN_WEIGHT_SHARE, Math.min(1, multiplier)).toFixed(4));
}

export interface SourceSkillReport {
  sourceId: SourceId;
  field: SkillField;
  bias: number;
  mae: number;
  samples: number;
  weightMultiplier: number;
}

/** Diagnostics for the meteorology console. */
export function skillReport(lat: number, lng: number): SourceSkillReport[] {
  const cell = cellKey(lat, lng);
  const cellStats = load()[cell];
  if (!cellStats) return [];
  const out: SourceSkillReport[] = [];
  for (const [sourceId, fields] of Object.entries(cellStats) as [SourceId, Partial<Record<SkillField, FieldStat>>][]) {
    for (const [field, stat] of Object.entries(fields ?? {}) as [SkillField, FieldStat][]) {
      if (!stat) continue;
      out.push({
        sourceId,
        field,
        bias: Number(stat.bias.toFixed(2)),
        mae: Number(stat.mae.toFixed(2)),
        samples: stat.samples,
        weightMultiplier: weightMultiplier(lat, lng, sourceId, field),
      });
    }
  }
  return out.sort((a, b) => a.mae - b.mae);
}

/** Test seam / user-facing reset. */
export function resetSkillStore(): void {
  store = {};
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch {
    /* ignore */
  }
}
