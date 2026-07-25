import { describe, expect,it } from 'vitest';

import { dayQualityScore, outdoorHealthScore } from '../compute/ComfortScorer';
import { degreesToCardinal16, msToKph } from '../compute/UnitConverter';

describe('Advanced Comfort and Astronomy Scoring', () => {
  it('computes correct DayQuality score for perfect weather', () => {
    const perfectScore = dayQualityScore({
      sunshine_pct: 100,
      gusts_kph: 5,
      precip_prob_pct: 0,
      aqi_us: 15,
      temp_c: 22,
    });
    expect(perfectScore).toBeGreaterThan(80);
  });

  it('computes low DayQuality score for highly unpleasant weather', () => {
    const unpleasantScore = dayQualityScore({
      sunshine_pct: 0,
      gusts_kph: 85,
      precip_prob_pct: 95,
      aqi_us: 250,
      temp_c: 42,
    });
    expect(unpleasantScore).toBeLessThan(35);
  });

  it('computes high OutdoorHealth score under perfect clean conditions', () => {
    const health = outdoorHealthScore({
      aqi_us: 10,
      uv_index: 1,
      pollen_total: 0,
      apparent_c: 22,
    });
    expect(health).toBeGreaterThanOrEqual(95);
  });

  it('drops OutdoorHealth score heavily under dangerous extreme elements', () => {
    const riskyHealth = outdoorHealthScore({
      aqi_us: 280,
      uv_index: 11,
      pollen_total: 9,
      apparent_c: 44,
    });
    expect(riskyHealth).toBeLessThan(40);
  });
});

describe('Unit Converters and Meteorological Math', () => {
  it('correctly maps 16 cardinal wind vectors', () => {
    expect(degreesToCardinal16(0)).toBe('N');
    expect(degreesToCardinal16(90)).toBe('E');
    expect(degreesToCardinal16(180)).toBe('S');
    expect(degreesToCardinal16(270)).toBe('W');
    expect(degreesToCardinal16(22.5)).toBe('NNE');
    expect(degreesToCardinal16(45)).toBe('NE');
    expect(degreesToCardinal16(337.5)).toBe('NNW');
  });

  it('converts meters per second to kilometers per hour properly', () => {
    expect(msToKph(10)).toBe(36);
    expect(msToKph(0)).toBe(0);
  });
});
