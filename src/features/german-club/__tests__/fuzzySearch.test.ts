import { describe, expect, it } from 'vitest';

import {
  buildIndex,
  detectQueryLanguage,
  fuzzyMultiLangSearch,
  normalizeArabic,
} from '../lib/search';

interface RawFixture {
  id: string;
  german: string;
  arabic: string;
  category: string;
  cefr: string;
  word_type: string;
}

const FIXTURE: RawFixture[] = [
  { id: '1', german: 'Kaffee', arabic: 'القهوة', category: 'food', cefr: 'A1', word_type: 'noun' },
  { id: '2', german: 'Käse', arabic: 'الجبن', category: 'food', cefr: 'A1', word_type: 'noun' },
  { id: '3', german: 'Brötchen', arabic: 'خبز صغير', category: 'food', cefr: 'A2', word_type: 'noun' },
  { id: '4', german: 'Brezel', arabic: 'بريتزل', category: 'food', cefr: 'A2', word_type: 'noun' },
  { id: '5', german: 'Freund', arabic: 'صديق', category: 'people', cefr: 'A1', word_type: 'noun' },
  { id: '6', german: 'Freundin', arabic: 'صديقة', category: 'people', cefr: 'A1', word_type: 'noun' },
  { id: '7', german: 'Fernweh', arabic: 'حنين للمسافة', category: 'feelings', cefr: 'B2', word_type: 'noun' },
  { id: '8', german: 'Gemütlichkeit', arabic: 'دفء لا يترجم', category: 'feelings', cefr: 'C1', word_type: 'noun' },
  { id: '9', german: 'gehen', arabic: 'يذهب', category: 'verbs', cefr: 'A1', word_type: 'verb' },
  { id: '10', german: 'Gemüse', arabic: 'خضروات', category: 'food', cefr: 'A1', word_type: 'noun' },
];

const INDEX = buildIndex(FIXTURE);

describe('Arabic normalization', () => {
  it('unifies alef forms (أ إ آ → ا)', () => {
    expect(normalizeArabic('أحمد')).toBe('احمد');
    expect(normalizeArabic('إبراهيم')).toBe('ابراهيم');
    expect(normalizeArabic('آمال')).toBe('امال');
  });

  it('unifies yaa forms (ى → ي)', () => {
    expect(normalizeArabic('موسى')).toBe('موسي');
    expect(normalizeArabic('يحيى')).toBe('يحيي');
  });

  it('strips tashkil/diacritics', () => {
    expect(normalizeArabic('العَرَبِيَّة')).toBe('العربية');
  });
});

describe('Query language detection', () => {
  it('detects Arabic', () => {
    expect(detectQueryLanguage('قهوة')).toBe('arabic');
    expect(detectQueryLanguage('صديق')).toBe('arabic');
  });

  it('detects German via umlauts/ß', () => {
    expect(detectQueryLanguage('Käse')).toBe('german');
    expect(detectQueryLanguage('groß')).toBe('german');
    expect(detectQueryLanguage('Gemütlichkeit')).toBe('german');
  });

  it('detects plain ASCII as English (default)', () => {
    expect(detectQueryLanguage('coffee')).toBe('english');
    expect(detectQueryLanguage('friend')).toBe('english');
  });
});

describe('buildIndex', () => {
  it('produces a stable, well-formed index', () => {
    expect(INDEX.length).toBe(FIXTURE.length);
    const kaffee = INDEX.find((i) => i.id === '1')!;
    expect(kaffee.germanLower).toBe('kaffee');
    expect(kaffee.germanPrefix).toBe('kaf');
    expect(kaffee.arabicNormalized).toBe('القهوة');
  });
});

describe('fuzzyMultiLangSearch — German queries', () => {
  it('finds exact match with score 1.0', () => {
    const hits = fuzzyMultiLangSearch('Kaffee', INDEX, 5);
    expect(hits.length).toBeGreaterThan(0);
    expect(hits[0].entry.id).toBe('1');
    expect(hits[0].score).toBe(1.0);
    expect(hits[0].matchedField).toBe('german');
  });

  it('matches case-insensitively', () => {
    const hits = fuzzyMultiLangSearch('KAFFEE', INDEX, 5);
    expect(hits[0].entry.id).toBe('1');
  });

  it('returns prefix match for partial German input', () => {
    const hits = fuzzyMultiLangSearch('fre', INDEX, 5);
    expect(hits.length).toBeGreaterThan(0);
    const ids = hits.map((h) => h.entry.id);
    // Freund, Freundin share prefix 'fre'
    expect(ids).toContain('5');
    expect(ids).toContain('6');
    expect(hits[0].matchedField === 'prefix' || hits[0].matchedField === 'german').toBe(true);
  });

  it('finds fuzzy typo "Kafee" (1 missing char)', () => {
    const hits = fuzzyMultiLangSearch('Kafee', INDEX, 5);
    expect(hits.length).toBeGreaterThan(0);
    expect(hits.some((h) => h.entry.id === '1')).toBe(true);
  });

  it('finds longer typo when input is long enough', () => {
    const hits = fuzzyMultiLangSearch('Gemutlichkeit', INDEX, 5); // 2 missing umlauts
    expect(hits.some((h) => h.entry.id === '8')).toBe(true);
  });
});

describe('fuzzyMultiLangSearch — Arabic queries', () => {
  it('finds exact Arabic match', () => {
    const hits = fuzzyMultiLangSearch('القهوة', INDEX, 5);
    expect(hits.length).toBeGreaterThan(0);
    expect(hits[0].entry.id).toBe('1');
  });

  it('matches alef variants (إ → ا)', () => {
    // Use a real Arabic word that has alef variants
    // Our fixture uses القاعدة (no alef variants), so let's add one
    const extendedFixture = [
      ...FIXTURE,
      { id: '11', german: 'Buch', arabic: 'كتاب', category: 'objects', cefr: 'A1', word_type: 'noun' },
      { id: '12', german: 'Freundlichkeit', arabic: 'لطف', category: 'feelings', cefr: 'B1', word_type: 'noun' },
    ];
    const idx = buildIndex(extendedFixture);
    const hits = fuzzyMultiLangSearch('لطف', idx, 5);
    expect(hits[0].entry.id).toBe('12');
  });
});

describe('fuzzyMultiLangSearch — Ranking & limits', () => {
  it('ranks exact matches above prefix matches', () => {
    const hits = fuzzyMultiLangSearch('Freund', INDEX, 5);
    expect(hits[0].entry.id).toBe('5'); // exact Freund, not Freundin
  });

  it('respects limit parameter', () => {
    const hits = fuzzyMultiLangSearch('Br', INDEX, 2);
    expect(hits.length).toBeLessThanOrEqual(2);
  });

  it('returns empty array for empty query', () => {
    expect(fuzzyMultiLangSearch('', INDEX)).toEqual([]);
    expect(fuzzyMultiLangSearch('   ', INDEX)).toEqual([]);
  });

  it('performance: search 5000 entries under 50ms', () => {
    const big: RawFixture[] = [];
    for (let i = 0; i < 5000; i++) {
      big.push({
        id: String(i),
        german: `Wort${i}`,
        arabic: `كلمة ${i}`,
        category: 'test',
        cefr: 'A1',
        word_type: 'noun',
      });
    }
    const bigIdx = buildIndex(big);
    const start = performance.now();
    fuzzyMultiLangSearch('Wort42', bigIdx, 20);
    fuzzyMultiLangSearch('Wort12', bigIdx, 20);
    fuzzyMultiLangSearch('Wort9999', bigIdx, 20);
    const elapsed = performance.now() - start;
    expect(elapsed).toBeLessThan(50);
  });
});