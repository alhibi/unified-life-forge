// ============================================================================
// PWSAggregator — combines PWS observations into a single consensus reading
// per metric, then emits a "pws consensus" PartialSnapshot that the engine
// can fold into the ensemble as one additional member.
//
// WEIGHTING
//   weight(d) = quality × (1 / (1 + d / D_HALF_KM))
//   where D_HALF_KM is the distance at which weight halves. We use 5 km:
//   inside a neighbourhood the differences are mostly microclimate, beyond
//   it they're increasingly the macroscale weather that the NWP models
//   already capture. The hard cap at 25 km drops stations so far that
//   they'd just be measuring somewhere else's weather.
//
// ROBUSTNESS
//   Temperature and humidity: weighted median (resistant to outlier stations).
//   Pressure: weighted mean (continuous, no outliers expected).
//   Wind direction: circular vector mean (350° + 10° ≠ 180°).
//   Precipitation: weighted median (3/4 say dry, one says 12 mm → 0, not 3).
//
// OUTPUT
//   Returns a PartialSnapshot shaped exactly like the partial snapshot any
//   other adapter would produce, but tagged in `meta.sources_responded`
//   logic via the engine. We don't touch the meta block — the engine merges
//   us in like any other member.
// ============================================================================

import type { PWSObservation, PWSProvider } from '../types/PWSObservation';
import type { PartialSnapshot } from '../types/WeatherSnapshot';
import { circularMean } from './CircularStats';
import { weightedMedian } from './EnsembleAggregator';

const D_HALF_KM = 5;
const MAX_DISTANCE_KM = 25;
const MIN_SAMPLES = 3;

/** Provider quality priors. Quality-controlled networks come first. */
const PROVIDER_QUALITY: Record<PWSProvider, number> = {
  madis:          0.95,
  cwop:           0.90,
  'open-meteo':   0.85,
  tempest:        0.80,
  'wu':           0.75,
  netatmo:        0.70,
  'owm-stations': 0.70,
  manual:         0.50,
};

interface FieldSample {
  value: number;
  weight: number;
}

function weightFor(obs: PWSObservation): number {
  const distancePenalty = 1 / (1 + obs.distance_km / D_HALF_KM);
  return PROVIDER_QUALITY[obs.provider] * obs.quality * distancePenalty;
}

function nonNull<T>(v: T | null): T | undefined { return v === null ? undefined : v; }

/** A nullable + Number.isFinite value is a sample; null/undefined/NaN skips it. */
function toField(v: number | null | undefined): number | null {
  if (v === null || v === undefined) return null;
  if (!Number.isFinite(v)) return null;
  return v;
}

/** Pick the n closest stations; drop anything past MAX_DISTANCE_KM. */
export function selectNearby(observations: PWSObservation[], maxCount = 8): PWSObservation[] {
  return [...observations]
    .filter((o) => o.distance_km <= MAX_DISTANCE_KM)
    .sort((a, b) => a.distance_km - b.distance_km)
    .slice(0, maxCount);
}

/** Aggregate one metric across the observation list, ignoring nulls. */
function aggregateField(
  observations: PWSObservation[],
  pick: (o: PWSObservation) => number | null | undefined,
): number | null {
  const samples: FieldSample[] = [];
  for (const o of observations) {
    const v = toField(pick(o));
    if (v === null) continue;
    samples.push({ value: v, weight: weightFor(o) });
  }
  if (samples.length < MIN_SAMPLES) return null;
  return weightedMedian(samples);
}

/** Wind direction is angular — circular mean, then wrap to [0, 360). */
function aggregateDirection(observations: PWSObservation[]): number | null {
  const samples = [];
  for (const o of observations) {
    const d = o.wind_direction_deg;
    if (d === null || !Number.isFinite(d)) continue;
    samples.push({ degrees: d, weight: weightFor(o) });
  }
  if (samples.length < MIN_SAMPLES) return null;
  const mean = circularMean(samples);
  return ((mean.degrees % 360) + 360) % 360;
}

/**
 * Fold the observations into a PartialSnapshot. Returns `{}` if there aren't
 * enough samples to trust any field — better to admit ignorance than to
 * surface a single-station reading as "the consensus".
 */
export function aggregatePWS(observations: PWSObservation[]): PartialSnapshot {
  const nearby = selectNearby(observations);
  if (nearby.length < MIN_SAMPLES) return {};

  const temperature_c = aggregateField(nearby, (o) => nonNull(o.temperature_c));
  const humidity_percent = aggregateField(nearby, (o) => nonNull(o.humidity_percent));
  const pressure_hpa = aggregateField(nearby, (o) => nonNull(o.pressure_hpa));
  const wind_kph = aggregateField(nearby, (o) => nonNull(o.wind_kph));
  const precip_mm = aggregateField(nearby, (o) => nonNull(o.precip_1h_mm));
  const wind_direction_deg = aggregateDirection(nearby);

  // Don't emit a snapshot unless at least one field is actually populated —
  // otherwise we'd be claiming "the PWS agree on nothing".
  if (
    temperature_c === null && humidity_percent === null && pressure_hpa === null
    && wind_kph === null && precip_mm === null && wind_direction_deg === null
  ) {
    return {};
  }

  return {
    moisture: {
      relative_humidity_percent: humidity_percent !== null ? Math.round(humidity_percent) : 0,
    },
    temperature: {
      actual_c: temperature_c ?? 0,
    },
    pressure: {
      msl_hpa: pressure_hpa ?? 0,
    },
    wind: {
      speed_kph: wind_kph ?? 0,
      direction_deg: wind_direction_deg !== null ? Math.round(wind_direction_deg) : 0,
    },
    precipitation: {
      intensity_mm_hr: precip_mm ?? 0,
    },
  };
}