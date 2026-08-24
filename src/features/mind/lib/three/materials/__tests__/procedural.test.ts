import { describe, expect, it } from 'vitest';

import { fbm2, makeValueNoise2 } from '../procedural';

describe('makeValueNoise2', () => {
  it('is deterministic for the same seed', () => {
    const a = makeValueNoise2(42);
    const b = makeValueNoise2(42);
    for (let i = 0; i < 100; i++) {
      const x = i * 0.713;
      const y = i * 0.337;
      expect(a(x, y)).toBe(b(x, y));
    }
  });

  it('tiles seamlessly at the lattice period', () => {
    const n = makeValueNoise2(7);
    // Value at (x) must equal value at (x + PERIOD) — wrap contract.
    for (let i = 0; i < 50; i++) {
      const x = i * 1.31;
      const y = i * 0.97;
      expect(n(x, y)).toBeCloseTo(n(x + 64, y), 10);
      expect(n(x, y)).toBeCloseTo(n(x, y + 64), 10);
    }
  });

  it('stays within [0,1] and varies spatially', () => {
    const n = makeValueNoise2(99);
    let min = Infinity;
    let max = -Infinity;
    for (let i = 0; i < 500; i++) {
      const v = n(i * 0.53, i * 1.19);
      min = Math.min(min, v);
      max = Math.max(max, v);
      expect(v).toBeGreaterThanOrEqual(0);
      expect(v).toBeLessThanOrEqual(1);
    }
    expect(max - min).toBeGreaterThan(0.2); // actually varies
  });
});

describe('fbm2', () => {
  it('stays in [0,1] across octaves', () => {
    const n = makeValueNoise2(11);
    for (let i = 0; i < 200; i++) {
      const v = fbm2(n, i * 0.41, i * 0.23, 4);
      expect(v).toBeGreaterThanOrEqual(0);
      expect(v).toBeLessThanOrEqual(1);
    }
  });

  it('is continuous between neighboring samples', () => {
    const n = makeValueNoise2(5);
    const a = fbm2(n, 10, 20, 3);
    const b = fbm2(n, 10.01, 20.01, 3);
    expect(Math.abs(a - b)).toBeLessThan(0.05);
  });
});
