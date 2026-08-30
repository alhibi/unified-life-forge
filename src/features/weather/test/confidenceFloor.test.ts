// ============================================================================
// Confidence floor + banner tests.
//
// We exercise:
//   • evaluateConfidenceFloor severity ladder for every realistic input
//   • Stale-data flag always surfaces as a reason, regardless of severity
//   • Severity label + ring/bg maps return non-empty Arabic strings
// ============================================================================

import { describe, expect, it } from 'vitest';

import {
  evaluateConfidenceFloor,
  SEVERITY_BG,
  SEVERITY_LABEL_AR,
  SEVERITY_RING,
  THRESHOLDS,
} from '../engine/ConfidenceFloor';
import type { WeatherSnapshot } from '../types/WeatherSnapshot';

function makeSnapshot(over: Partial<WeatherSnapshot['meta']> = {}): WeatherSnapshot {
  const meta = {
    timestamp_unix: 0,
    location: { lat: 0, lng: 0, elevation_m: 0, timezone: 'UTC' },
    sources_queried: 6,
    sources_responded: 4,
    ensemble_confidence_percent: 80,
    disagreement_score_percent: 5,
    models_in_agreement: [],
    models_outlier: [],
    last_updated_unix: 0,
    data_age_minutes: 0,
    is_stale: false,
    fetch_duration_ms: 0,
    ...over,
  };
  // We only need meta to test the floor; the rest is placeholder.
  return { meta } as WeatherSnapshot;
}

describe('evaluateConfidenceFloor', () => {
  it('returns healthy when ≥4 sources responded AND confidence ≥70% AND fresh', () => {
    const r = evaluateConfidenceFloor(makeSnapshot({
      sources_responded: 5, ensemble_confidence_percent: 80, is_stale: false,
    }));
    expect(r.severity).toBe('healthy');
    expect(r.isOk).toBe(true);
    expect(r.reasons.length).toBe(0);
  });

  it('returns degraded when only 3 sources responded', () => {
    const r = evaluateConfidenceFloor(makeSnapshot({
      sources_responded: 3, ensemble_confidence_percent: 85,
    }));
    expect(r.severity).toBe('degraded');
    expect(r.isOk).toBe(false);
    expect(r.reasons.join(' ')).toContain('3');
  });

  it('returns degraded when confidence is between 50% and 70%', () => {
    const r = evaluateConfidenceFloor(makeSnapshot({
      sources_responded: 5, ensemble_confidence_percent: 60,
    }));
    expect(r.severity).toBe('degraded');
    expect(r.reasons.join(' ')).toContain('60');
  });

  it('returns degraded when data is stale (even with strong sources)', () => {
    const r = evaluateConfidenceFloor(makeSnapshot({
      sources_responded: 5, ensemble_confidence_percent: 80, is_stale: true, data_age_minutes: 30,
    }));
    expect(r.severity).toBe('degraded');
    expect(r.reasons.join(' ')).toContain('قديمة');
  });

  it('returns unreliable when only 1 source responded', () => {
    const r = evaluateConfidenceFloor(makeSnapshot({
      sources_responded: 1, ensemble_confidence_percent: 100,
    }));
    expect(r.severity).toBe('unreliable');
    expect(r.isOk).toBe(false);
    expect(r.reasons.join(' ')).toContain('مصادر قليلة');
  });

  it('returns unreliable when confidence is below 50% (regardless of source count)', () => {
    const r = evaluateConfidenceFloor(makeSnapshot({
      sources_responded: 5, ensemble_confidence_percent: 40,
    }));
    expect(r.severity).toBe('unreliable');
    expect(r.reasons.join(' ')).toContain('40');
  });

  it('returns failed when 0 sources responded', () => {
    const r = evaluateConfidenceFloor(makeSnapshot({
      sources_responded: 0,
    }));
    expect(r.severity).toBe('failed');
    expect(r.isOk).toBe(false);
    expect(r.reasons.join(' ')).toContain('لا توجد مصادر');
  });

  it('surfaces stale data even when other reasons would have failed it anyway', () => {
    // Stale + only 1 source → unreliable, but the stale reason still appears.
    const r = evaluateConfidenceFloor(makeSnapshot({
      sources_responded: 1, ensemble_confidence_percent: 80, is_stale: true, data_age_minutes: 12,
    }));
    expect(r.severity).toBe('unreliable');
    expect(r.reasons.some((reason) => reason.includes('قديمة'))).toBe(true);
  });
});

describe('Severity label maps', () => {
  it('Arabic label is non-empty for every severity', () => {
    for (const severity of ['healthy', 'degraded', 'unreliable', 'failed'] as const) {
      expect(SEVERITY_LABEL_AR[severity].length).toBeGreaterThan(0);
    }
  });

  it('Ring class is non-empty for every severity', () => {
    for (const severity of ['healthy', 'degraded', 'unreliable', 'failed'] as const) {
      expect(SEVERITY_RING[severity].length).toBeGreaterThan(0);
      expect(SEVERITY_BG[severity].length).toBeGreaterThan(0);
    }
  });
});

describe('Thresholds', () => {
  it('exposes the four tunables the UI depends on', () => {
    expect(THRESHOLDS.HEALTHY_MIN_SOURCES).toBe(4);
    expect(THRESHOLDS.HEALTHY_MIN_CONFIDENCE).toBe(70);
    expect(THRESHOLDS.UNRELIABLE_CONFIDENCE).toBe(50);
    expect(THRESHOLDS.UNRELIABLE_MIN_SOURCES).toBe(2);
  });
});