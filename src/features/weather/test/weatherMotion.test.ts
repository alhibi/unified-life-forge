// ============================================================================
// weather-motion tests — covers the count-up math, the magnetic tilt math,
// and the stagger delay helper. These are the units most likely to break
// if someone tweaks the curves; locking them down prevents regressions.
// ============================================================================

import { describe, expect, it } from 'vitest';

import {
  cascadeChild,
  countUpValue,
  formatCount,
  magneticTilt,
  staggerDelay,
} from '../lib/weather-motion';

describe('formatCount', () => {
  it('rounds to the nearest integer', () => {
    expect(formatCount(22.4)).toBe('22');
    expect(formatCount(22.6)).toBe('23');
  });

  it('pads with leading zeros', () => {
    expect(formatCount(7, 2)).toBe('07');
    expect(formatCount(7, 3)).toBe('007');
  });

  it('does not truncate numbers longer than the pad width', () => {
    expect(formatCount(1234, 2)).toBe('1234');
  });
});

describe('countUpValue', () => {
  it('returns the start value at t=0', () => {
    expect(countUpValue(0, 0, 100, 1000)).toBe(0);
  });
  it('returns the end value at t=total', () => {
    expect(countUpValue(1000, 0, 100, 1000)).toBeCloseTo(100, 5);
  });
  it('overshoots never happen — curve is ease-out', () => {
    // The expo ease-out asymptotes but never overshoots.
    expect(countUpValue(2000, 0, 100, 1000)).toBeLessThanOrEqual(100);
  });
  it('passes the midpoint roughly at the curve\'s natural inflection', () => {
    // At t=500ms (midpoint of 1000ms), the quartic ease-out is at 0.9375.
    // So countUpValue should be 0 + (100-0) * 0.9375 ≈ 93.75.
    const mid = countUpValue(500, 0, 100, 1000);
    expect(mid).toBeGreaterThan(85);
    expect(mid).toBeLessThan(100);
  });
});

describe('magneticTilt', () => {
  it('returns zero rotation at the centre', () => {
    const t = magneticTilt(0.5, 0.5);
    expect(t.rotateX).toBeCloseTo(0, 5);
    expect(t.rotateY).toBeCloseTo(0, 5);
  });
  it('tilts toward the right edge', () => {
    const t = magneticTilt(1, 0.5);
    expect(t.rotateY).toBeGreaterThan(0);
    expect(t.rotateX).toBeCloseTo(0, 5);
  });
  it('tilts away from the top edge', () => {
    // Top edge (y=0) → dy=-0.5 → rotateX = -dy*2*max = positive (away from viewer).
    // Bottom edge (y=1) → dy=+0.5 → rotateX = negative (toward viewer).
    const top = magneticTilt(0.5, 0);
    const bottom = magneticTilt(0.5, 1);
    expect(top.rotateX).toBeGreaterThan(0);
    expect(bottom.rotateX).toBeLessThan(0);
  });
  it('respects maxDeg', () => {
    const t = magneticTilt(1, 0, 3);
    expect(Math.abs(t.rotateY)).toBeLessThanOrEqual(3 + 1e-6);
    expect(Math.abs(t.rotateX)).toBeLessThanOrEqual(3 + 1e-6);
  });
});

describe('staggerDelay', () => {
  it('returns 0 for the first item', () => {
    expect(staggerDelay(0, 1000, 10)).toBe(0);
  });
  it('returns total for the last item', () => {
    expect(staggerDelay(9, 1000, 10)).toBeCloseTo(1000, 5);
  });
  it('handles single-item lists without division by zero', () => {
    expect(staggerDelay(0, 500, 1)).toBe(0);
  });
});

describe('cascadeChild variants', () => {
  it('has hidden and visible states', () => {
    expect(cascadeChild).toHaveProperty('hidden');
    expect(cascadeChild).toHaveProperty('visible');
  });
  it('hides by translating down', () => {
    expect(cascadeChild.hidden).toEqual(
      expect.objectContaining({ opacity: 0, y: expect.any(Number) }),
    );
  });
});