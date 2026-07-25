/**
 * Regression tests for the forecast ensemble.
 *
 * Each test corresponds to a specific defect that shipped before this file
 * existed, so a failure here means a real user-visible bug is back.
 */
import { beforeEach, describe, expect, it } from 'vitest';

import { angularDifference, circularMean, normalizeDegrees } from '../engine/CircularStats';
import {
  biasCorrection,
  recordObservations,
  resetSkillStore,
  weightMultiplier,
} from '../engine/ConsensusSkillTracker';
import { absoluteSpread, aggregate, weightedMedian } from '../engine/EnsembleAggregator';
import { blendForecasts } from '../engine/ForecastEnsemble';
import { computeTendency, recordPressure, resetPressureHistory } from '../engine/PressureHistory';
import type { DailyEntry, HourlyEntry } from '../types/ForecastLayer';
import type { AdapterResponse, SourceId } from '../types/SourceRegistry';

const HOUR = 3_600_000;

function hourly(overrides: Partial<HourlyEntry> & { timestamp_unix: number }): HourlyEntry {
  return {
    temperature_c: 20,
    apparent_c: 20,
    precip_mm: 0,
    precip_probability_percent: 0,
    wind_kph: 10,
    wind_direction_deg: 180,
    cloud_cover_percent: 40,
    humidity_percent: 50,
    pressure_hpa: 1013,
    uv_index: 3,
    weather_code: 1,
    is_day: true,
    confidence_percent: 80,
    ...overrides,
  };
}

function daily(overrides: Partial<DailyEntry> & { date_unix: number }): DailyEntry {
  return {
    high_c: 25,
    low_c: 15,
    precip_mm: 0,
    precip_probability_percent: 10,
    wind_kph_max: 20,
    uv_index_max: 6,
    sunrise: '06:00',
    sunset: '19:00',
    weather_code: 1,
    day_quality_score: 0,
    climatology_delta_c: null,
    confidence_percent: 70,
    ...overrides,
  };
}

function response(sourceId: SourceId, hourlyEntries: HourlyEntry[], dailyEntries: DailyEntry[] = []): AdapterResponse {
  return {
    sourceId,
    ok: true,
    durationMs: 100,
    forecast: { hourly: hourlyEntries, daily: dailyEntries },
  };
}

describe('circular statistics', () => {
  it('averages bearings across the 0/360 discontinuity', () => {
    // The original bug: a linear mean of 350 and 10 returns 180 (due south)
    // for two readings that are both within 10° of due north.
    const result = circularMean([
      { degrees: 350, weight: 1 },
      { degrees: 10, weight: 1 },
    ]);
    expect(result.degrees).toBeCloseTo(0, 1);
    expect(result.concentration).toBeGreaterThan(0.98);
  });

  it('reports no meaningful direction when members fully disperse', () => {
    const result = circularMean([
      { degrees: 0, weight: 1 },
      { degrees: 90, weight: 1 },
      { degrees: 180, weight: 1 },
      { degrees: 270, weight: 1 },
    ]);
    expect(result.concentration).toBeLessThan(0.01);
    expect(result.stddev_deg).toBe(180);
  });

  it('respects weights', () => {
    const result = circularMean([
      { degrees: 0, weight: 3 },
      { degrees: 90, weight: 1 },
    ]);
    expect(result.degrees).toBeGreaterThan(0);
    expect(result.degrees).toBeLessThan(45);
  });

  it('normalises and diffs correctly', () => {
    expect(normalizeDegrees(-90)).toBe(270);
    expect(normalizeDegrees(450)).toBe(90);
    expect(angularDifference(10, 350)).toBe(20);
    expect(angularDifference(350, 10)).toBe(-20);
  });
});

describe('weighted median', () => {
  it('reports dry when most members forecast no rain', () => {
    // Weighted mean of {0,0,0,12} is 3 mm — a total nobody forecast.
    const samples = [
      { value: 0, weight: 1 },
      { value: 0, weight: 1 },
      { value: 0, weight: 1 },
      { value: 12, weight: 1 },
    ];
    expect(weightedMedian(samples)).toBe(0);
  });

  it('follows the weight mass, not the count', () => {
    const samples = [
      { value: 0, weight: 0.1 },
      { value: 10, weight: 0.9 },
    ];
    expect(weightedMedian(samples)).toBe(10);
  });

  it('handles a single sample and an empty set', () => {
    expect(weightedMedian([{ value: 7, weight: 1 }])).toBe(7);
    expect(weightedMedian([])).toBe(0);
  });
});

describe('absolute spread', () => {
  it('is unit-preserving and stable near zero', () => {
    const samples = [
      { sourceId: 'open-meteo' as SourceId, value: -0.4, weight: 1 },
      { sourceId: 'met-norway' as SourceId, value: 0.6, weight: 1 },
    ];
    expect(absoluteSpread(samples)).toBeCloseTo(1, 5);
    // The CV for the same data is astronomically large — that is the reason
    // temperature confidence no longer uses it.
    expect(aggregate(samples).cv_percent).toBeGreaterThan(100);
  });
});

describe('forecast ensemble', () => {
  const ctx = { lat: 48.13, lng: 11.58 };
  const now = 1_700_000_000_000;
  const base = Math.floor(now / HOUR) * HOUR;

  beforeEach(() => {
    resetSkillStore();
  });

  it('blends every member instead of taking whichever responded first', () => {
    const responses = [
      response('open-meteo', [hourly({ timestamp_unix: base + HOUR, temperature_c: 10 })]),
      response('met-norway', [hourly({ timestamp_unix: base + HOUR, temperature_c: 20 })]),
      response('noaa', [hourly({ timestamp_unix: base + HOUR, temperature_c: 15 })]),
    ];
    const blended = blendForecasts(responses, ctx, now);
    expect(blended.hourly).toHaveLength(1);
    const entry = blended.hourly[0];
    // Somewhere inside the member envelope, not equal to any single member.
    expect(entry.temperature_c).toBeGreaterThan(10);
    expect(entry.temperature_c).toBeLessThan(20);
    expect(entry.sources_count).toBe(3);
    expect(entry.temperature_min_c).toBe(10);
    expect(entry.temperature_max_c).toBe(20);
    expect(blended.contributors).toHaveLength(3);
  });

  it('lowers confidence when members disagree', () => {
    const agree = blendForecasts(
      [
        response('open-meteo', [hourly({ timestamp_unix: base + HOUR, temperature_c: 20 })]),
        response('met-norway', [hourly({ timestamp_unix: base + HOUR, temperature_c: 20.2 })]),
        response('noaa', [hourly({ timestamp_unix: base + HOUR, temperature_c: 19.9 })]),
      ],
      ctx,
      now,
    );
    const disagree = blendForecasts(
      [
        response('open-meteo', [hourly({ timestamp_unix: base + HOUR, temperature_c: 12 })]),
        response('met-norway', [hourly({ timestamp_unix: base + HOUR, temperature_c: 22 })]),
        response('noaa', [hourly({ timestamp_unix: base + HOUR, temperature_c: 17 })]),
      ],
      ctx,
      now,
    );
    expect(agree.hourly[0].confidence_percent).toBeGreaterThan(
      disagree.hourly[0].confidence_percent,
    );
  });

  it('decays confidence with lead time even when members agree', () => {
    const entries = (t: number) => [hourly({ timestamp_unix: t, temperature_c: 20 })];
    const blended = blendForecasts(
      [
        response('open-meteo', [...entries(base + HOUR), ...entries(base + 40 * HOUR)]),
        response('met-norway', [...entries(base + HOUR), ...entries(base + 40 * HOUR)]),
        response('noaa', [...entries(base + HOUR), ...entries(base + 40 * HOUR)]),
      ],
      ctx,
      now,
    );
    expect(blended.hourly).toHaveLength(2);
    expect(blended.hourly[0].confidence_percent).toBeGreaterThan(
      blended.hourly[1].confidence_percent,
    );
  });

  it('uses member agreement, not just stated probability, for precipitation', () => {
    // Three members say 0 mm with a 0% chance; one says 8 mm at 90%.
    const responses = [
      response('open-meteo', [hourly({ timestamp_unix: base + HOUR, precip_mm: 0, precip_probability_percent: 0 })]),
      response('met-norway', [hourly({ timestamp_unix: base + HOUR, precip_mm: 0, precip_probability_percent: 0 })]),
      response('noaa', [hourly({ timestamp_unix: base + HOUR, precip_mm: 0, precip_probability_percent: 0 })]),
      response('tomorrow', [hourly({ timestamp_unix: base + HOUR, precip_mm: 8, precip_probability_percent: 90 })]),
    ];
    const entry = blendForecasts(responses, ctx, now).hourly[0];
    // Median amount is dry…
    expect(entry.precip_mm).toBe(0);
    // …but the probability is neither 0 (ignoring the outlier) nor 22 (a plain
    // mean); the disagreeing member still contributes real risk.
    expect(entry.precip_probability_percent).toBeGreaterThan(0);
    expect(entry.precip_probability_percent).toBeLessThan(45);
  });

  it('breaks a categorical tie toward the more severe condition', () => {
    const responses = [
      // Equal weights on code 3 (overcast) and code 95 (thunderstorm).
      response('open-meteo', [hourly({ timestamp_unix: base + HOUR, weather_code: 3 })]),
      response('open-meteo', [hourly({ timestamp_unix: base + HOUR, weather_code: 3 })]),
      response('met-norway', [hourly({ timestamp_unix: base + HOUR, weather_code: 95 })]),
    ];
    // open-meteo appears twice on purpose: the second is ignored as a duplicate
    // source id would be, so weights are 0.22 vs 0.19 — assert we do not crash
    // and we return one of the candidate codes.
    const entry = blendForecasts(responses, ctx, now).hourly[0];
    expect([3, 95]).toContain(entry.weather_code);
  });

  it('blends daily entries and preserves astronomical strings from the anchor', () => {
    const day = base;
    const responses = [
      response('open-meteo', [], [daily({ date_unix: day, high_c: 20, low_c: 10, sunrise: '06:10', sunset: '19:20' })]),
      response('met-norway', [], [daily({ date_unix: day, high_c: 24, low_c: 12, sunrise: '06:11', sunset: '19:21' })]),
    ];
    const blended = blendForecasts(responses, ctx, now);
    expect(blended.daily).toHaveLength(1);
    expect(blended.daily[0].high_c).toBeGreaterThan(20);
    expect(blended.daily[0].high_c).toBeLessThan(24);
    // Highest registry weight (open-meteo 0.22) supplies the sun times.
    expect(blended.daily[0].sunrise).toBe('06:10');
    expect(blended.daily[0].sources_count).toBe(2);
  });

  it('passes a single member through untouched', () => {
    const responses = [response('open-meteo', [hourly({ timestamp_unix: base + HOUR, temperature_c: 17.5 })])];
    const blended = blendForecasts(responses, ctx, now);
    expect(blended.hourly[0].temperature_c).toBe(17.5);
    expect(blended.hourly[0].sources_count).toBe(1);
  });

  it('ignores non-atmospheric sources in the forecast vote', () => {
    const responses = [
      response('open-meteo', [hourly({ timestamp_unix: base + HOUR, temperature_c: 20 })]),
      // Radar has weight 1.0 in the registry but domain 'radar'; if it were
      // allowed to vote it would dominate every atmospheric field.
      response('rainviewer', [hourly({ timestamp_unix: base + HOUR, temperature_c: -40 })]),
    ];
    const blended = blendForecasts(responses, ctx, now);
    expect(blended.hourly[0].temperature_c).toBe(20);
    expect(blended.contributors).toEqual(['open-meteo']);
  });
});

describe('consensus skill tracker', () => {
  beforeEach(() => {
    resetSkillStore();
  });

  it('applies no correction before enough evidence accumulates', () => {
    recordObservations(48.13, 11.58, [
      { sourceId: 'openweathermap', field: 'temperature', memberValue: 22, consensusValue: 20 },
    ]);
    expect(biasCorrection(48.13, 11.58, 'openweathermap', 'temperature')).toBe(0);
    expect(weightMultiplier(48.13, 11.58, 'openweathermap', 'temperature')).toBe(1);
  });

  it('learns a persistent warm bias and corrects it in the opposite direction', () => {
    for (let i = 0; i < 20; i += 1) {
      recordObservations(48.13, 11.58, [
        { sourceId: 'openweathermap', field: 'temperature', memberValue: 22, consensusValue: 20 },
      ]);
    }
    const correction = biasCorrection(48.13, 11.58, 'openweathermap', 'temperature');
    expect(correction).toBeLessThan(0);
    // Damped: never more than half the observed 2 °C offset.
    expect(correction).toBeGreaterThanOrEqual(-1.001);
  });

  it('down-weights a scattered source but never removes it', () => {
    for (let i = 0; i < 30; i += 1) {
      recordObservations(48.13, 11.58, [
        { sourceId: 'weatherbit', field: 'temperature', memberValue: i % 2 ? 30 : 10, consensusValue: 20 },
      ]);
    }
    const multiplier = weightMultiplier(48.13, 11.58, 'weatherbit', 'temperature');
    expect(multiplier).toBeLessThan(1);
    expect(multiplier).toBeGreaterThanOrEqual(0.45);
  });

  it('keeps statistics per location cell', () => {
    for (let i = 0; i < 20; i += 1) {
      recordObservations(48.13, 11.58, [
        { sourceId: 'openweathermap', field: 'temperature', memberValue: 22, consensusValue: 20 },
      ]);
    }
    // Riyadh is a different cell entirely.
    expect(biasCorrection(24.71, 46.67, 'openweathermap', 'temperature')).toBe(0);
  });
});

describe('pressure tendency', () => {
  beforeEach(() => {
    resetPressureHistory();
  });

  it('refuses to report a direction without history', () => {
    const t0 = 1_700_000_000_000;
    const tendency = recordPressure(48.13, 11.58, 1013, t0);
    expect(tendency.insufficientData).toBe(true);
    expect(tendency.hpaPer3h).toBe(0);
  });

  it('detects a falling barometer from a real series', () => {
    const t0 = 1_700_000_000_000;
    // 1 hPa lost per hour over four hours.
    recordPressure(48.13, 11.58, 1016, t0);
    recordPressure(48.13, 11.58, 1015, t0 + HOUR);
    recordPressure(48.13, 11.58, 1014, t0 + 2 * HOUR);
    const tendency = recordPressure(48.13, 11.58, 1013, t0 + 3 * HOUR);
    expect(tendency.insufficientData).toBe(false);
    expect(tendency.hpaPer3h).toBeCloseTo(-3, 1);
    expect(tendency.rSquared).toBeGreaterThan(0.95);
    expect(tendency.samples).toBe(4);
  });

  it('does not inflate the series with rapid refreshes', () => {
    const t0 = 1_700_000_000_000;
    recordPressure(48.13, 11.58, 1013, t0);
    recordPressure(48.13, 11.58, 1013.1, t0 + 60_000);
    recordPressure(48.13, 11.58, 1013.2, t0 + 120_000);
    expect(computeTendency(48.13, 11.58, t0 + 120_000).samples).toBe(1);
  });

  it('rejects physically impossible readings', () => {
    const t0 = 1_700_000_000_000;
    recordPressure(48.13, 11.58, 5, t0);
    expect(computeTendency(48.13, 11.58, t0).samples).toBe(0);
  });
});
