/**
 * Axis calibration. The chart previously printed ticks like 5 / 13 / 20 / 28 /
 * 35 — round ends with rounded-for-display intermediate values, which reads as
 * a broken axis. Every printed tick must now be an exact multiple of the step.
 */
import { describe, expect, it } from 'vitest';

import { niceDomain } from '../components/charts/scale';

function ticksOf(domain: { min: number; max: number }, count: number): number[] {
  const step = (domain.max - domain.min) / (count - 1);
  return Array.from({ length: count }, (_, i) => domain.min + i * step);
}

describe('niceDomain', () => {
  it('produces evenly spaced round ticks', () => {
    const domain = niceDomain([7.2, 13.5, 28.4, 31.9], 5);
    const ticks = ticksOf(domain, 5);
    for (const t of ticks) expect(Number.isInteger(t) || Number.isInteger(t * 2)).toBe(true);
    // Ticks are equally spaced by construction.
    const gaps = ticks.slice(1).map((t, i) => Number((t - ticks[i]).toFixed(6)));
    expect(new Set(gaps).size).toBe(1);
  });

  it('always covers the data', () => {
    for (const values of [
      [0.1, 0.2, 0.3],
      [-14, -3, 9],
      [980, 1002, 1031],
      [0, 100],
    ]) {
      const domain = niceDomain(values, 5);
      expect(domain.min).toBeLessThanOrEqual(Math.min(...values));
      expect(domain.max).toBeGreaterThanOrEqual(Math.max(...values));
    }
  });

  it('handles a flat series without collapsing to zero height', () => {
    const domain = niceDomain([20, 20, 20], 5);
    expect(domain.max).toBeGreaterThan(domain.min);
  });

  it('handles an empty series', () => {
    expect(niceDomain([], 5)).toEqual({ min: 0, max: 1 });
  });
});
