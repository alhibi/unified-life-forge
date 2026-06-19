// Weighted ensemble averaging with Grubbs outlier rejection.
//
// Formula:
//   ensemble = Σ(value_i × weight_i) / Σ(weight_i)
//   coefficient of variation: σ / μ → confidence proxy
//   Grubbs G_i = |value_i − μ| / σ; reject if G_i > G_critical(n, α=0.05)

import type { SourceId } from '../types/SourceRegistry';

export interface NumericSample {
  sourceId: SourceId;
  value: number;
  weight: number;
}

export interface EnsembleResult {
  value: number;
  range: { min: number; max: number };
  stddev: number;
  cv_percent: number;                 // coefficient of variation × 100
  confidence_percent: number;
  models_in_agreement: SourceId[];
  models_outlier: SourceId[];
}

// Two-sided Grubbs critical values for α = 0.05. Index = n (sample count).
// Source: NIST/SEMATECH e-Handbook of Statistical Methods.
const GRUBBS_CRITICAL: Record<number, number> = {
  3: 1.155, 4: 1.481, 5: 1.715, 6: 1.887, 7: 2.020, 8: 2.126,
  9: 2.215, 10: 2.290, 11: 2.355, 12: 2.412,
};

function mean(arr: number[]): number {
  return arr.reduce((a, b) => a + b, 0) / arr.length;
}

function stddev(arr: number[], mu: number): number {
  if (arr.length < 2) return 0;
  const sumSq = arr.reduce((acc, v) => acc + (v - mu) ** 2, 0);
  return Math.sqrt(sumSq / (arr.length - 1));
}

function grubbsCritical(n: number): number {
  if (n < 3) return Infinity;
  return GRUBBS_CRITICAL[n] ?? 2.5;   // safe upper bound for larger n
}

/** Weighted average with Grubbs outlier rejection. */
export function aggregate(samples: NumericSample[]): EnsembleResult {
  const valid = samples.filter(s => Number.isFinite(s.value) && s.weight > 0);
  if (valid.length === 0) {
    return { value: 0, range: { min: 0, max: 0 }, stddev: 0, cv_percent: 0, confidence_percent: 0, models_in_agreement: [], models_outlier: [] };
  }
  if (valid.length === 1) {
    const s = valid[0];
    return {
      value: s.value,
      range: { min: s.value, max: s.value },
      stddev: 0,
      cv_percent: 0,
      confidence_percent: 70,         // single source: middling confidence
      models_in_agreement: [s.sourceId],
      models_outlier: [],
    };
  }

  // Pass 1 — compute mean/std, identify outliers.
  const rawValues = valid.map(s => s.value);
  const mu = mean(rawValues);
  const sigma = stddev(rawValues, mu);
  const outliers: SourceId[] = [];

  if (sigma > 0) {
    const critical = grubbsCritical(valid.length);
    for (const s of valid) {
      const G = Math.abs(s.value - mu) / sigma;
      if (G > critical) outliers.push(s.sourceId);
    }
  }

  const kept = valid.filter(s => !outliers.includes(s.sourceId));
  const keptValues = kept.map(s => s.value);
  const totalWeight = kept.reduce((a, s) => a + s.weight, 0);
  const weighted = kept.reduce((a, s) => a + s.value * s.weight, 0);
  const ensembleValue = totalWeight > 0 ? weighted / totalWeight : mu;
  const finalMu = mean(keptValues);
  const finalSigma = stddev(keptValues, finalMu);
  const cv = finalMu !== 0 ? Math.abs(finalSigma / finalMu) * 100 : 0;
  const confidence = Math.max(0, Math.min(100, 100 - cv * 1.2));

  return {
    value: Number(ensembleValue.toFixed(2)),
    range: { min: Math.min(...keptValues), max: Math.max(...keptValues) },
    stddev: Number(finalSigma.toFixed(3)),
    cv_percent: Number(cv.toFixed(2)),
    confidence_percent: Number(confidence.toFixed(1)),
    models_in_agreement: kept.map(s => s.sourceId),
    models_outlier: outliers,
  };
}
