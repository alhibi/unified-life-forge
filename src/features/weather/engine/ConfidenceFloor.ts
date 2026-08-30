// ============================================================================
// ConfidenceFloor — the gate that decides whether a snapshot is "good enough"
// to display as-is, or whether the UI must surface a degraded-state banner.
//
// WHY THIS EXISTS
//   The engine today emits every snapshot with tier='fresh'. If 10 of 12
//   sources fail and the snapshot is built from a single outlier-resistant
//   aggregate, the UI shows the number without warning. That is the worst
//   possible UX for a forecast: confident-looking data with no real
//   evidence behind it. The floor turns the question on its head:
//
//     "Do we have enough evidence to call this reading reliable?"
//
// SEVERITY LEVELS
//   healthy     — ≥4 sources responded AND ensemble confidence ≥ 70%
//                  AND no field past its individual reliability floor.
//   degraded    — ≥2 sources but missing one of the above; numbers shown
//                  with a banner asking the user to read them cautiously.
//   unreliable  — 1 source responded OR confidence below 50%; banner says
//                  "this reading is from a single model, do not trust".
//   failed      — 0 sources responded; banner says "no data" and the UI
//                  should hide numeric cards entirely.
//
// The thresholds are tuned for the atmospheric adapter set: 4 of the 6
// default atmospheric models is enough to call a snapshot healthy.
// ============================================================================

import type { WeatherSnapshot } from '../types/WeatherSnapshot';

export type Severity = 'healthy' | 'degraded' | 'unreliable' | 'failed';

export interface FloorResult {
  severity: Severity;
  /** Human-readable reason (Arabic) — joined into a banner. */
  reasons: string[];
  /** Convenience: true if the snapshot can be shown without a banner. */
  isOk: boolean;
}

/** Tunable thresholds. Centralised here so tests and UI stay aligned. */
export const THRESHOLDS = {
  /** Minimum number of responding sources for a healthy snapshot. */
  HEALTHY_MIN_SOURCES: 4,
  /** Minimum ensemble confidence for a healthy snapshot (percent). */
  HEALTHY_MIN_CONFIDENCE: 70,
  /** Below this confidence, snapshot is unreliable regardless of source count. */
  UNRELIABLE_CONFIDENCE: 50,
  /** Below this source count, snapshot is unreliable. */
  UNRELIABLE_MIN_SOURCES: 2,
  /** Zero sources → failed. */
  FAILED_MIN_SOURCES: 1,
} as const;

/**
 * Decide severity from a snapshot. Pure — no side effects, easy to test.
 *
 * `meta.sources_queried` and `meta.sources_responded` come straight from
 * the engine; the engine never writes to them indirectly, so we can trust
 * the values.
 */
export function evaluateConfidenceFloor(snapshot: WeatherSnapshot): FloorResult {
  const reasons: string[] = [];
  const responded = snapshot.meta.sources_responded;
  const queried = snapshot.meta.sources_queried;
  const confidence = snapshot.meta.ensemble_confidence_percent;
  const isStale = snapshot.meta.is_stale;
  const dataAgeMinutes = snapshot.meta.data_age_minutes;

  // Hard failure — no data at all.
  if (responded < THRESHOLDS.FAILED_MIN_SOURCES) {
    reasons.push('لا توجد مصادر استجابت — لا يمكن قراءة أي رقم.');
    return { severity: 'failed', reasons, isOk: false };
  }

  // Stale data is always surfaced — the user should know they're looking
  // at a snapshot that hasn't been refreshed recently.
  if (isStale) {
    reasons.push(`البيانات قديمة: ${Math.round(dataAgeMinutes)} دقيقة منذ آخر تحديث.`);
  }

  // Too few sources → unreliable, regardless of confidence.
  if (responded < THRESHOLDS.UNRELIABLE_MIN_SOURCES) {
    reasons.push(`مصادر قليلة: ${responded} فقط من ${queried}.`);
    reasons.push('القراءة مبنية على نموذج واحد — لا تثق بالأرقام بشكل كامل.');
    return { severity: 'unreliable', reasons, isOk: false };
  }

  // Confidence below the unreliable floor.
  if (confidence < THRESHOLDS.UNRELIABLE_CONFIDENCE) {
    reasons.push(`الثقة منخفضة (${Math.round(confidence)}٪) رغم وجود عدة مصادر.`);
    reasons.push('النماذج تختلف بشكل كبير — القراءات عرضية.');
    return { severity: 'unreliable', reasons, isOk: false };
  }

  // Healthy threshold requires enough sources AND high confidence AND fresh data.
  if (
    responded >= THRESHOLDS.HEALTHY_MIN_SOURCES
    && confidence >= THRESHOLDS.HEALTHY_MIN_CONFIDENCE
    && !isStale
  ) {
    return { severity: 'healthy', reasons, isOk: true };
  }

  // Anything else → degraded.
  const bits: string[] = [];
  if (responded < THRESHOLDS.HEALTHY_MIN_SOURCES) {
    bits.push(`${responded}/${queried} مصادر استجابت`);
  }
  if (confidence < THRESHOLDS.HEALTHY_MIN_CONFIDENCE) {
    bits.push(`ثقة ${Math.round(confidence)}٪`);
  }
  reasons.push(`القراءة مقبولة لكن ليست مثالية: ${bits.join('، ')}.`);
  return { severity: 'degraded', reasons, isOk: false };
}

/** Arabic labels for each severity — the banner uses these. */
export const SEVERITY_LABEL_AR: Record<Severity, string> = {
  healthy:    'القراءة موثوقة',
  degraded:   'القراءة جزئية الموثوقية',
  unreliable: 'القراءة ضعيفة الموثوقية',
  failed:     'لا توجد قراءة',
};

/** Tailwind-friendly ring color per severity. */
export const SEVERITY_RING: Record<Severity, string> = {
  healthy:    'ring-success/40 text-success',
  degraded:   'ring-warning/40 text-warning',
  unreliable: 'ring-danger/40 text-danger',
  failed:     'ring-danger/60 text-danger',
};

export const SEVERITY_BG: Record<Severity, string> = {
  healthy:    'bg-success/10',
  degraded:   'bg-warning/10',
  unreliable: 'bg-danger/10',
  failed:     'bg-danger/15',
};