// ============================================================================
// Verification report + panel tests.
//
// We exercise:
//   • judgeFieldTrust — sample-count and MAE-ratio gates
//   • aggregateSourceTrust — combines (source, field) rows into one verdict
//   • buildVerificationReport — integration with the tracker's skillReport
// ============================================================================

import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import {
  recordObservations,
  resetSkillStore,
  type SourceSkillReport,
} from '../engine/ConsensusSkillTracker';
import {
  aggregateSourceTrust,
  buildVerificationReport,
  judgeFieldTrust,
  type TrustLevel,
} from '../engine/VerificationReport';

const lat = 52.52;
const lng = 13.405;

beforeEach(() => {
  resetSkillStore();
  localStorage.clear();
});

afterEach(() => {
  resetSkillStore();
  localStorage.clear();
});

function pushObservation(value: number) {
  // Push enough observations that MIN_SAMPLES_TO_TRUST is met.
  for (let i = 0; i < 8; i += 1) {
    recordObservations(lat, lng, [
      { sourceId: 'open-meteo', field: 'temperature', memberValue: value, consensusValue: 0 },
    ]);
  }
}
void pushObservation;

describe('judgeFieldTrust', () => {
  it('returns unverified when samples are insufficient', () => {
    const j = judgeFieldTrust('temperature', 0.5, 3);
    expect(j.trust).toBe<TrustLevel>('unverified');
    expect(j.reason).toContain('عينات غير كافية');
  });

  it('returns verified when MAE is below half the natural scale', () => {
    const j = judgeFieldTrust('temperature', 0.5, 8);
    expect(j.trust).toBe<TrustLevel>('verified');
  });

  it('returns partial when MAE is between half and one natural scale', () => {
    const j = judgeFieldTrust('temperature', 1.0, 8);
    expect(j.trust).toBe<TrustLevel>('partial');
  });

  it('returns unverified when MAE exceeds the natural scale', () => {
    const j = judgeFieldTrust('temperature', 5.0, 8);
    expect(j.trust).toBe<TrustLevel>('unverified');
  });
});

describe('aggregateSourceTrust', () => {
  it('emits one row per field, all unverified when the source has no data', () => {
    const trust = aggregateSourceTrust('open-meteo', []);
    expect(trust.fields.length).toBe(5); // temperature, humidity, pressure, wind, cloud
    expect(trust.fields.every((f) => f.trust === 'unverified')).toBe(true);
    expect(trust.totalSamples).toBe(0);
    expect(trust.trust).toBe<TrustLevel>('unverified');
  });

  it('averages mae and bias across the rows the source actually has', () => {
    const rows: SourceSkillReport[] = [
      { sourceId: 'open-meteo', field: 'temperature', bias: 1.0, mae: 0.4, samples: 4, weightMultiplier: 0.9 },
      { sourceId: 'open-meteo', field: 'humidity',    bias: 0.0, mae: 4.0, samples: 4, weightMultiplier: 0.7 },
    ];
    const trust = aggregateSourceTrust('open-meteo', rows);
    expect(trust.bucketsWithData).toBe(2);
    expect(trust.totalSamples).toBe(8);
    expect(trust.weightedMae).toBeCloseTo((0.4 * 4 + 4.0 * 4) / 8, 5);
    expect(trust.weightedBias).toBeCloseTo((1.0 * 4 + 0.0 * 4) / 8, 5);
  });

  it('picks the worst field verdict as the overall verdict', () => {
    const rows: SourceSkillReport[] = [
      { sourceId: 'noaa', field: 'temperature', bias: 0.5, mae: 0.5, samples: 8, weightMultiplier: 1.0 },
      { sourceId: 'noaa', field: 'humidity',    bias: 5.0, mae: 8.0, samples: 8, weightMultiplier: 0.8 },
    ];
    const trust = aggregateSourceTrust('noaa', rows);
    expect(trust.trust).toBe<TrustLevel>('partial');
  });
});

describe('buildVerificationReport (integration)', () => {
  it('reads from the live tracker store', () => {
    // Push 8 observations for open-meteo's temperature, mean error 1.2 °C.
    // Temperature scale is 1.6, so 1.2 / 1.6 = 0.75 → partial.
    for (let i = 0; i < 8; i += 1) {
      recordObservations(lat, lng, [
        { sourceId: 'open-meteo', field: 'temperature', memberValue: 19, consensusValue: 17.8 },
      ]);
    }
    const report = buildVerificationReport(lat, lng, ['open-meteo']);
    expect(report.length).toBe(1);
    const om = report[0];
    const tempField = om.fields.find((f) => f.field === 'temperature')!;
    expect(tempField.samples).toBeGreaterThanOrEqual(6);
    expect(om.totalSamples).toBeGreaterThan(0);
  });

  it('returns one verdict per requested source', () => {
    const ids = ['open-meteo', 'met-norway', 'noaa', 'tomorrow', 'openweathermap'] as const;
    const report = buildVerificationReport(lat, lng, [...ids]);
    expect(report.length).toBe(5);
    expect(report.map((r) => r.sourceId).sort()).toEqual([...ids].sort());
  });

  it('accepts a pre-fetched rows array (no live tracker access)', () => {
    const fakeRows: SourceSkillReport[] = [
      { sourceId: 'waqi', field: 'temperature', bias: 0, mae: 0.1, samples: 10, weightMultiplier: 1 },
    ];
    const report = buildVerificationReport(lat, lng, ['waqi'], fakeRows);
    const waqi = report.find((r) => r.sourceId === 'waqi')!;
    expect(waqi.totalSamples).toBe(10);
  });
});

describe('Verification panel data shape', () => {
  it('produces a structured report the panel can iterate', () => {
    // No data — we just need the panel inputs to be well-shaped.
    const report = buildVerificationReport(lat, lng, ['open-meteo'], []);
    const [openMeteo] = report;
    expect(openMeteo).toBeDefined();
    expect(openMeteo.fields.length).toBe(5);
    expect(typeof openMeteo.label).toBe('string');
    expect(typeof openMeteo.domain).toBe('string');
  });
});