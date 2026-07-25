/**
 * PressureHistory — the 3-hour barometric tendency, computed from real samples.
 *
 * The engine previously reported `tendency_hpa_per_3hr: 0` and called
 * `classifyPressureTendency(0)`, i.e. every location on earth was permanently
 * "steady". Pressure tendency is one of the few genuinely predictive signals a
 * client can derive locally (a fall of more than ~2 hPa in three hours is the
 * classic short-term deterioration cue, and it is what a barometer-reading
 * sailor actually acts on), so it is worth storing the series.
 *
 * Implementation notes:
 *   • Samples are kept per ~25 km cell, so moving between cities does not mix
 *     two different barometric histories.
 *   • The tendency is a least-squares slope over the retained window rather
 *     than a naive (last − first) difference: the slope is far less sensitive
 *     to one noisy reading, and we get an R² we can use to suppress a
 *     "trend" that is really scatter.
 *   • Samples older than the window are dropped on every write, so the store
 *     is bounded without a separate sweep.
 */

const STORAGE_KEY = 'weather:pressure-history:v1';
/** Retained window. Longer than 3 h so the regression has context. */
const WINDOW_MS = 6 * 60 * 60 * 1000;
/** Minimum spacing between stored samples — refreshes can be minutes apart. */
const MIN_SPACING_MS = 8 * 60 * 1000;
const MIN_SAMPLES_FOR_TREND = 3;
/** Minimum elapsed span before a slope is meaningful. */
const MIN_SPAN_MS = 45 * 60 * 1000;
const MAX_CELLS = 8;

interface Sample {
  t: number;
  hpa: number;
}

type Store = Record<string, Sample[]>;

let store: Store | null = null;

function cellKey(lat: number, lng: number): string {
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
    const keys = Object.keys(store);
    if (keys.length > MAX_CELLS) {
      const newest = (samples: Sample[]) => samples[samples.length - 1]?.t ?? 0;
      const sorted = keys.sort((a, b) => newest(store![b]) - newest(store![a]));
      for (const key of sorted.slice(MAX_CELLS)) delete store![key];
    }
    localStorage.setItem(STORAGE_KEY, JSON.stringify(store));
  } catch {
    /* storage unavailable — tendency degrades to "unknown" */
  }
}

export interface PressureTendency {
  /** hPa change per 3 hours. Positive = rising. */
  hpaPer3h: number;
  /** Number of samples backing the slope. */
  samples: number;
  /** Span covered by those samples, in hours. */
  spanHours: number;
  /** Goodness of fit, 0..1. Below ~0.35 the "trend" is mostly scatter. */
  rSquared: number;
  /** True when there is not enough history yet to claim a direction. */
  insufficientData: boolean;
}

const UNKNOWN: PressureTendency = {
  hpaPer3h: 0,
  samples: 0,
  spanHours: 0,
  rSquared: 0,
  insufficientData: true,
};

/**
 * Append a reading and return the tendency implied by the retained window.
 * Safe to call on every refresh; readings closer together than MIN_SPACING_MS
 * update the newest sample in place instead of inflating the series.
 */
export function recordPressure(lat: number, lng: number, hpa: number, now = Date.now()): PressureTendency {
  if (!Number.isFinite(hpa) || hpa < 800 || hpa > 1100) return computeTendency(lat, lng, now);

  const key = cellKey(lat, lng);
  const s = load();
  const series = (s[key] ?? []).filter((sample) => now - sample.t <= WINDOW_MS);
  const last = series[series.length - 1];

  if (last && now - last.t < MIN_SPACING_MS) {
    series[series.length - 1] = { t: now, hpa };
  } else {
    series.push({ t: now, hpa });
  }

  s[key] = series;
  store = s;
  persist();
  return computeTendency(lat, lng, now);
}

export function computeTendency(lat: number, lng: number, now = Date.now()): PressureTendency {
  const series = (load()[cellKey(lat, lng)] ?? []).filter((sample) => now - sample.t <= WINDOW_MS);
  if (series.length < MIN_SAMPLES_FOR_TREND) return { ...UNKNOWN, samples: series.length };

  const spanMs = series[series.length - 1].t - series[0].t;
  if (spanMs < MIN_SPAN_MS) {
    return { ...UNKNOWN, samples: series.length, spanHours: Number((spanMs / 3_600_000).toFixed(2)) };
  }

  // Least-squares slope of hPa against hours, then scaled to a 3-hour rate.
  const xs = series.map((sample) => (sample.t - series[0].t) / 3_600_000);
  const ys = series.map((sample) => sample.hpa);
  const n = xs.length;
  const meanX = xs.reduce((a, b) => a + b, 0) / n;
  const meanY = ys.reduce((a, b) => a + b, 0) / n;

  let sxy = 0;
  let sxx = 0;
  for (let i = 0; i < n; i += 1) {
    sxy += (xs[i] - meanX) * (ys[i] - meanY);
    sxx += (xs[i] - meanX) ** 2;
  }
  if (sxx === 0) return { ...UNKNOWN, samples: n };

  const slopePerHour = sxy / sxx;

  let ssRes = 0;
  let ssTot = 0;
  for (let i = 0; i < n; i += 1) {
    const predicted = meanY + slopePerHour * (xs[i] - meanX);
    ssRes += (ys[i] - predicted) ** 2;
    ssTot += (ys[i] - meanY) ** 2;
  }
  const rSquared = ssTot > 0 ? Math.max(0, 1 - ssRes / ssTot) : 1;

  return {
    hpaPer3h: Number((slopePerHour * 3).toFixed(2)),
    samples: n,
    spanHours: Number((spanMs / 3_600_000).toFixed(2)),
    rSquared: Number(rSquared.toFixed(3)),
    insufficientData: false,
  };
}

/** Series for the pressure sparkline in the meteorology console. */
export function pressureSeries(lat: number, lng: number, now = Date.now()): Sample[] {
  return (load()[cellKey(lat, lng)] ?? []).filter((sample) => now - sample.t <= WINDOW_MS);
}

export function resetPressureHistory(): void {
  store = {};
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch {
    /* ignore */
  }
}
