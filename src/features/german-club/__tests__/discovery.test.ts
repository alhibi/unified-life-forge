import { describe, expect, it } from 'vitest';

import { discoverMany, discoverRandom } from '../lib/discovery';

describe('Random Discovery', () => {
  it('returns a valid entry on first call (no seed)', () => {
    const r = discoverRandom(null);
    expect(r).not.toBeNull();
    expect(r!.entry.id).toBeTruthy();
    expect(r!.entry.german.length).toBeGreaterThan(0);
    expect(r!.entry.arabic.length).toBeGreaterThan(0);
    expect(r!.reason).toBe('fresh');
  });

  it('returns different reasons across many rolls (with real seeds)', () => {
    // First, pick a real seed from the dataset
    const firstRoll = discoverRandom(null);
    expect(firstRoll).not.toBeNull();
    const realSeed = firstRoll!.entry.id;

    const reasons = new Set<string>();
    for (let i = 0; i < 200; i++) {
      const r = discoverRandom(realSeed);
      if (r) reasons.add(r.reason);
    }
    // With a real seed we expect at least 'fresh' + 'mixed' + maybe same-category/level
    expect(reasons.size).toBeGreaterThanOrEqual(2);
  });

  it('excludes specified categories', () => {
    for (let i = 0; i < 50; i++) {
      const r = discoverRandom(null, { excludeCategories: ['food'] });
      if (r) {
        expect(r.entry.category).not.toBe('food');
      }
    }
  });

  it('never returns the same entry twice in a row when fresh', () => {
    // discoverMany uses fresh seeds, so consecutive ids should be unique
    const results = discoverMany(20);
    const ids = results.map((r) => r.id);
    const set = new Set(ids);
    expect(set.size).toBe(ids.length);
  });

  it('survives 1000 rolls without crashing', () => {
    for (let i = 0; i < 1000; i++) {
      discoverRandom(i % 2 === 0 ? 'dict-00001' : null);
    }
  });
});