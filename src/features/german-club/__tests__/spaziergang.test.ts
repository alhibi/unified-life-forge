import { describe, expect, it } from 'vitest';

import { buildSpaziergang, SPAZIERGANG_LENGTH } from '../lib/spaziergang';

describe('Wortspaziergang builder', () => {
  it('produces exactly 7 stops with distinct entries', () => {
    const stops = buildSpaziergang(null);
    expect(stops.length).toBe(SPAZIERGANG_LENGTH);
    expect(stops.length).toBe(7);
    const ids = stops.map((s) => s.entry.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('numbers steps 1..7 in order', () => {
    const stops = buildSpaziergang(null);
    expect(stops.map((s) => s.step)).toEqual([1, 2, 3, 4, 5, 6, 7]);
  });

  it('every stop has a non-empty German + Arabic + reason + emoji', () => {
    const stops = buildSpaziergang(null);
    for (const s of stops) {
      expect(s.entry.german.length).toBeGreaterThan(0);
      expect(s.entry.arabic.length).toBeGreaterThan(0);
      expect(s.reason.length).toBeGreaterThan(0);
      expect(s.emoji.length).toBeGreaterThan(0);
    }
  });

  it('honours a custom seed entry id when given', () => {
    // Find a real id
    const stops = buildSpaziergang(null);
    const realId = stops[0].entry.id;
    const stopsWithSeed = buildSpaziergang(realId);
    expect(stopsWithSeed[0].entry.id).toBe(realId);
  });

  it('produces different walks across runs (statistically)', () => {
    const walks = new Set<string>();
    for (let i = 0; i < 20; i++) {
      const s = buildSpaziergang(null);
      walks.add(s.map((stop) => stop.entry.id).join('|'));
    }
    // With a 5000-entry pool and curated seed, walks should diverge
    expect(walks.size).toBeGreaterThanOrEqual(10);
  });

  it('survives 100 walks without crashing', () => {
    for (let i = 0; i < 100; i++) buildSpaziergang(null);
  });
});