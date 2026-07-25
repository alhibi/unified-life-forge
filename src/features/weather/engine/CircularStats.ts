/**
 * Circular statistics for directional quantities (wind direction, wave
 * direction, solar azimuth).
 *
 * Why this file exists: the engine used to average wind direction with the
 * same linear weighted mean it uses for temperature. That is wrong at the
 * 0°/360° discontinuity — two sources reporting 350° and 10° (a 20° spread
 * around due north) averaged to 180°, i.e. due south. The bug is invisible in
 * a code review and glaring on a compass rose.
 *
 * The correct treatment converts each bearing to a unit vector, averages the
 * vectors, and converts back. The magnitude of the resultant vector doubles as
 * a natural agreement metric: R = 1 means perfect agreement, R = 0 means the
 * members point in every direction and no mean bearing is meaningful.
 */

export interface CircularSample {
  /** Bearing in degrees. Any real number; normalised internally. */
  degrees: number;
  weight: number;
}

export interface CircularResult {
  /** Weighted mean bearing, 0..360. */
  degrees: number;
  /** Resultant length R, 0..1. High = members agree on a direction. */
  concentration: number;
  /**
   * Circular standard deviation in degrees, derived from R:
   *   σ = sqrt(-2 · ln R) (radians)
   * Returns 180 when R → 0 (no meaningful direction).
   */
  stddev_deg: number;
}

const DEG = Math.PI / 180;

export function normalizeDegrees(deg: number): number {
  return ((deg % 360) + 360) % 360;
}

export function circularMean(samples: CircularSample[]): CircularResult {
  const valid = samples.filter((s) => Number.isFinite(s.degrees) && s.weight > 0);
  if (valid.length === 0) return { degrees: 0, concentration: 0, stddev_deg: 180 };
  if (valid.length === 1) {
    return { degrees: normalizeDegrees(valid[0].degrees), concentration: 1, stddev_deg: 0 };
  }

  let sumX = 0;
  let sumY = 0;
  let sumW = 0;
  for (const s of valid) {
    const rad = normalizeDegrees(s.degrees) * DEG;
    sumX += Math.cos(rad) * s.weight;
    sumY += Math.sin(rad) * s.weight;
    sumW += s.weight;
  }

  const meanX = sumX / sumW;
  const meanY = sumY / sumW;
  const concentration = Math.min(1, Math.sqrt(meanX * meanX + meanY * meanY));

  // atan2(0, 0) is 0, which would silently claim "due north" for a fully
  // dispersed set. Guard on R instead of trusting the angle.
  if (concentration < 1e-6) return { degrees: 0, concentration: 0, stddev_deg: 180 };

  const degrees = normalizeDegrees(Math.atan2(meanY, meanX) / DEG);
  const stddev = Math.sqrt(-2 * Math.log(concentration)) / DEG;

  return {
    degrees: Number(degrees.toFixed(1)),
    concentration: Number(concentration.toFixed(4)),
    stddev_deg: Number(Math.min(180, stddev).toFixed(1)),
  };
}

/** Smallest signed angular difference a − b, in (−180, 180]. */
export function angularDifference(a: number, b: number): number {
  let diff = normalizeDegrees(a) - normalizeDegrees(b);
  if (diff > 180) diff -= 360;
  if (diff <= -180) diff += 360;
  return diff;
}
