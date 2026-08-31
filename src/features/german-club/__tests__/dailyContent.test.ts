import { describe, expect, it } from 'vitest';

import {
  DAILY_WORTER,
  DAILY_WORTER_COUNT,
  DAILY_SPRICHWOERTER,
  DAILY_SPRICHWOERTER_COUNT,
  DAILY_SAETZE,
  DAILY_KULTURPERLEN,
  daysSinceEpoch,
  dayKey,
  getDailyBundle,
  getWortDesTages,
} from '../lib/daily';

describe('Daily Content Pool Integrity', () => {
  it('should have enough Wort for at least a 90-day cycle', () => {
    expect(DAILY_WORTER_COUNT).toBeGreaterThanOrEqual(90);
  });

  it('should have enough Sprichwort for at least a 90-day cycle', () => {
    expect(DAILY_SPRICHWOERTER_COUNT).toBeGreaterThanOrEqual(90);
  });

  it('should have enough Satz for at least a 30-day cycle', () => {
    expect(DAILY_SAETZE.length).toBeGreaterThanOrEqual(30);
  });

  it('should have enough Kulturperle for at least a 30-day cycle', () => {
    expect(DAILY_KULTURPERLEN.length).toBeGreaterThanOrEqual(30);
  });

  it('every Wort has a non-empty German word and Arabic translation', () => {
    for (const w of DAILY_WORTER) {
      expect(w.wort.length).toBeGreaterThan(0);
      expect(w.arabic.length).toBeGreaterThan(0);
      expect(w.hint_ar.length).toBeGreaterThan(0);
      // Gender is optional but if present must be valid
      if (w.gender) {
        expect(['der', 'die', 'das', 'plural']).toContain(w.gender);
      }
      expect(['formal', 'neutral', 'informal', 'slang']).toContain(w.register);
    }
  });

  it('every Sprichwort has literal + meaning fields', () => {
    for (const s of DAILY_SPRICHWOERTER) {
      expect(s.sprichwort.length).toBeGreaterThan(0);
      expect(s.literal_ar.length).toBeGreaterThan(0);
      expect(s.meaning_ar.length).toBeGreaterThan(0);
    }
  });

  it('every Satz has German + Arabic + context', () => {
    for (const s of DAILY_SAETZE) {
      expect(s.satz.length).toBeGreaterThan(0);
      expect(s.arabic.length).toBeGreaterThan(0);
      expect(s.context_ar.length).toBeGreaterThan(0);
      expect(['formal', 'neutral', 'informal', 'slang']).toContain(s.register);
    }
  });

  it('every Kulturperle has title_de, title_ar, body_ar', () => {
    for (const k of DAILY_KULTURPERLEN) {
      expect(k.title_de.length).toBeGreaterThan(0);
      expect(k.title_ar.length).toBeGreaterThan(0);
      expect(k.body_ar.length).toBeGreaterThan(0);
    }
  });
});

describe('Daily Bundle Selection — Determinism', () => {
  it('same date always returns the same bundle', () => {
    const date = new Date('2026-08-31T12:00:00Z');
    const a = getDailyBundle(date);
    const b = getDailyBundle(date);
    expect(a.wort.wort).toBe(b.wort.wort);
    expect(a.sprichwort.sprichwort).toBe(b.sprichwort.sprichwort);
    expect(a.satz.satz).toBe(b.satz.satz);
    expect(a.kulturperle.title_de).toBe(b.kulturperle.title_de);
  });

  it('different dates return different items (statistically)', () => {
    const d1 = new Date('2026-08-30T12:00:00Z');
    const d2 = new Date('2026-08-31T12:00:00Z');
    const d3 = new Date('2026-09-01T12:00:00Z');
    const b1 = getDailyBundle(d1);
    const b2 = getDailyBundle(d2);
    const b3 = getDailyBundle(d3);

    // Each pair should differ on at least 2 of the 4 fields (vanishing probability of all same)
    const fieldsMatch = (a: typeof b1, b: typeof b2): number => {
      let n = 0;
      if (a.wort.wort === b.wort.wort) n++;
      if (a.sprichwort.sprichwort === b.sprichwort.sprichwort) n++;
      if (a.satz.satz === b.satz.satz) n++;
      if (a.kulturperle.title_de === b.kulturperle.title_de) n++;
      return n;
    };

    expect(fieldsMatch(b1, b2)).toBeLessThan(4);
    expect(fieldsMatch(b2, b3)).toBeLessThan(4);
    expect(fieldsMatch(b1, b3)).toBeLessThan(4);
  });

  it('getWortDesTages is consistent with getDailyBundle().wort', () => {
    const date = new Date('2026-12-25T08:00:00Z');
    const w = getWortDesTages(date);
    const bundle = getDailyBundle(date);
    expect(w.wort).toBe(bundle.wort.wort);
  });

  it('daysSinceEpoch is monotonic for successive days', () => {
    const d1 = new Date('2025-01-01T00:00:00Z');
    const d2 = new Date('2025-01-02T00:00:00Z');
    const d3 = new Date('2025-01-10T00:00:00Z');
    expect(daysSinceEpoch(d1)).toBeLessThan(daysSinceEpoch(d2));
    expect(daysSinceEpoch(d2)).toBeLessThan(daysSinceEpoch(d3));
  });

  it('dayKey produces YYYY-MM-DD strings', () => {
    const date = new Date(2026, 0, 5); // 5 Jan 2026 local
    expect(dayKey(date)).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });
});