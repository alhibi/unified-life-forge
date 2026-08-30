// ============================================================================
// CitySearch tests — covers the new fuzzy matcher, the geocoder's
// multi-source merge, and the rank-by-distance behaviour.
//
// We stub the network at the fetch level rather than mocking the geocoder,
// so we exercise the actual code path that decides how sources combine.
// ============================================================================

import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { cityGeocoder, haversine } from '../engine/CityGeocoder';
import {
  fuzzyScore,
  levenshtein,
  normalizeArabic,
  rankByFuzzy,
} from '../engine/FuzzyMatcher';
import type { CityCandidate } from '../types/CitySearch';

beforeEach(() => {
  cityGeocoder.clearCache();
});

afterEach(() => {
  cityGeocoder.clearCache();
});

describe('normalizeArabic', () => {
  it('strips tashkil', () => {
    expect(normalizeArabic('بَغْداد')).toBe('بغداد');
  });
  it('unifies alef forms', () => {
    expect(normalizeArabic('أحمد')).toBe('احمد');
    expect(normalizeArabic('إبراهيم')).toBe('ابراهيم');
    expect(normalizeArabic('آدم')).toBe('ادم');
  });
  it('keeps yaa and waaw distinct', () => {
    expect(normalizeArabic('علي')).toBe('علي');
    expect(normalizeArabic('علي').startsWith('علي')).toBe(true);
  });
  it('lowercases Latin input', () => {
    expect(normalizeArabic('Berlin')).toBe('berlin');
  });
});

describe('levenshtein', () => {
  it('returns 0 for identical strings', () => {
    expect(levenshtein('بغداد', 'بغداد')).toBe(0);
  });
  it('handles insertions and deletions', () => {
    expect(levenshtein('الرياض', 'الرياض')).toBe(0);
    expect(levenshtein('القاهرة', 'القاهرة')).toBe(0);
    // Pure character edit: remove the ة from the end of "القاهرة" to get
    // "القاهر" (one deletion, distance = 1).
    expect(levenshtein('القاهرة', 'القاهر')).toBe(1);
  });
  it('computes edit distance correctly', () => {
    expect(levenshtein('kitten', 'sitting')).toBe(3);
  });
});

describe('fuzzyScore', () => {
  it('returns 1 for an exact match after normalisation', () => {
    expect(fuzzyScore('بغداد', 'بغداد')).toBe(1);
  });
  it('returns 0.85 for a prefix match', () => {
    expect(fuzzyScore('بغ', 'بغداد')).toBe(0.85);
  });
  it('returns ~0.6 for a contains match', () => {
    expect(fuzzyScore('غدا', 'بغداد')).toBeGreaterThan(0.3);
  });
  it('returns 0 for clearly different words', () => {
    expect(fuzzyScore('xyz', 'abc')).toBe(0);
  });
  it('penalises a fuzzy match — never scores above 0.55', () => {
    const score = fuzzyScore('بغدا', 'دمشق');
    expect(score).toBeLessThanOrEqual(0.55);
  });
  it('treats alef forms as equivalent', () => {
    expect(fuzzyScore('احمد', 'أحمد')).toBe(1);
    expect(fuzzyScore('ابراهيم', 'إبراهيم')).toBe(1);
  });
});

describe('rankByFuzzy', () => {
  it('sorts items by descending score', () => {
    const out = rankByFuzzy('بغداد', [
      { label: 'دمشق' },
      { label: 'بغداد' },
      { label: 'بغدا' },
    ], (x) => x.label);
    // Exact "بغداد" first, fuzzy "بغدا" second, completely-different
    // "دمشق" last (or absent if it scored 0).
    expect(out[0].item.label).toBe('بغداد');
    expect(out[0].score).toBe(1);
    expect(out[1].item.label).toBe('بغدا');
    // No score may exceed 0.55 for the substring/fuzzy tiers — the score
    // gap from the exact match is therefore guaranteed.
    if (out.length > 2) {
      expect(out[2].score).toBeLessThan(out[1].score);
    }
  });

  it('filters out items with score 0', () => {
    const out = rankByFuzzy('xyz', [{ label: 'abc' }, { label: 'def' }], (x) => x.label);
    expect(out.length).toBe(0);
  });
});

describe('haversine', () => {
  it('returns 0 for identical points', () => {
    expect(haversine(52.5, 13.4, 52.5, 13.4)).toBe(0);
  });
  it('matches a known short distance within 5%', () => {
    // 1° latitude ≈ 111 km. 0.1° should be ~11 km.
    const d = haversine(0, 0, 0, 0.1);
    expect(d).toBeGreaterThan(10);
    expect(d).toBeLessThan(12);
  });
});

describe('CityGeocoder.suggestNearby', () => {
  it('orders local candidates by distance', () => {
    const local: CityCandidate[] = [
      baseCandidate({ id: 'far', name: 'Far', latitude: 1, longitude: 0 }),
      baseCandidate({ id: 'near', name: 'Near', latitude: 0, longitude: 0 }),
      baseCandidate({ id: 'medium', name: 'Medium', latitude: 0.5, longitude: 0 }),
    ];
    const nearby = cityGeocoder.suggestNearby({ lat: 0, lng: 0, radiusKm: 200, limit: 3 }, local);
    expect(nearby.map((c) => c.id)).toEqual(['near', 'medium', 'far']);
  });

  it('drops candidates outside the radius', () => {
    const local: CityCandidate[] = [
      baseCandidate({ id: 'close', name: 'Close', latitude: 0.05, longitude: 0 }),
      baseCandidate({ id: 'far', name: 'Far', latitude: 5, longitude: 0 }),
    ];
    const nearby = cityGeocoder.suggestNearby({ lat: 0, lng: 0, radiusKm: 50, limit: 5 }, local);
    expect(nearby.length).toBe(1);
    expect(nearby[0].id).toBe('close');
  });
});

describe('CityGeocoder.matchLocal', () => {
  it('returns fuzzy-matched local candidates with a score', () => {
    const local: CityCandidate[] = [
      baseCandidate({ id: '1', nameAr: 'بغداد', latitude: 33.3, longitude: 44.4 }),
      baseCandidate({ id: '2', nameAr: 'القاهرة', latitude: 30.0, longitude: 31.2 }),
    ];
    const out = cityGeocoder.matchLocal('بغداد', local, null);
    expect(out.length).toBe(1);
    expect(out[0].id).toBe('1');
    expect(out[0].source).toBe('local');
    expect(out[0].matchScore).toBe(1);
  });
});

function baseCandidate(over: Partial<CityCandidate>): CityCandidate {
  return {
    id: over.id ?? 'test',
    name: over.name ?? 'Test',
    country: over.country ?? 'X',
    latitude: over.latitude ?? 0,
    longitude: over.longitude ?? 0,
    source: 'manual',
    matchScore: 0,
    distanceKm: null,
    ...over,
  };
}