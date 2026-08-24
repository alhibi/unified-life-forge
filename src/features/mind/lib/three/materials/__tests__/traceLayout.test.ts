import { describe, expect, it } from 'vitest';

import { buildTraceSegments } from '../technoMaterial';

describe('buildTraceSegments', () => {
  const size = 512;
  const segments = buildTraceSegments(size, 0xc17c71);

  it('emits lanes that wrap the tile horizontally', () => {
    // Every lane must start before x=0 and exit past x=size so horizontal
    // tiling continues seamlessly.
    const exits = segments.filter((s) => s.x1 > size && s.y0 === s.y1 && !s.via);
    expect(exits.length).toBeGreaterThanOrEqual(8);
    for (const s of exits) {
      expect(s.y1).toBeGreaterThan(0);
      expect(s.y1).toBeLessThan(size);
    }
  });

  it('is deterministic per seed', () => {
    const again = buildTraceSegments(size, 0xc17c71);
    expect(JSON.stringify(segments)).toBe(JSON.stringify(again));
  });

  it('keeps all geometry inside the vertical bounds', () => {
    for (const s of segments) {
      expect(s.y0).toBeGreaterThan(-1);
      expect(s.y0).toBeLessThan(size + 1);
      expect(s.y1).toBeGreaterThan(-1);
      expect(s.y1).toBeLessThan(size + 1);
    }
  });

  it('includes via markers on jog corners', () => {
    expect(segments.some((s) => s.via)).toBe(true);
    // Vias are slightly wider than their trace.
    for (const v of segments.filter((s) => s.via)) {
      expect(v.radius).toBeGreaterThan(0);
    }
  });
});
