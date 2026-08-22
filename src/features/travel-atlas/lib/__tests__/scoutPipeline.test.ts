import { describe, expect, it } from 'vitest';

import {
  clampInt,
  cleanText,
  DEPTH_POLICY,
  discoverySystemPrompt,
  dossierSystemPrompt,
  isFulfillable,
  isScoutCategory,
  normalizeBestMonths,
  normalizeLngLat,
  parseDiscoveryItem,
  parseDossier,
  placeKey,
  scopeNoteFor,
} from '../scoutPipeline';

describe('cleanText', () => {
  it('trims and keeps real strings', () => {
    expect(cleanText('  مرحبا  ')).toBe('مرحبا');
  });

  it('rejects non-strings and placeholders', () => {
    expect(cleanText(42)).toBeNull();
    expect(cleanText(null)).toBeNull();
    expect(cleanText('null')).toBeNull();
    expect(cleanText('غير متوفر')).toBeNull();
    expect(cleanText('   ')).toBeNull();
  });

  it('caps runaway prose', () => {
    expect(cleanText('ا'.repeat(9000))?.length).toBe(4000);
  });
});

describe('clampInt', () => {
  it('rounds in-range values', () => {
    expect(clampInt(3.2, 0, 4)).toBe(3);
    expect(clampInt(0, 0, 4)).toBe(0);
    expect(clampInt(4, 0, 4)).toBe(4);
  });

  it('rejects out-of-range instead of pulling to the boundary', () => {
    expect(clampInt(7.6, 0, 4)).toBeNull();
    expect(clampInt(-2, 0, 4)).toBeNull();
  });

  it('returns null for garbage', () => {
    expect(clampInt(NaN, 0, 4)).toBeNull();
    expect(clampInt('abc', 0, 4)).toBeNull();
    expect(clampInt(undefined, 0, 4)).toBeNull();
  });
});

describe('normalizeBestMonths', () => {
  it('keeps valid months sorted and unique', () => {
    expect(normalizeBestMonths([12, 1, 3, 1])).toEqual([1, 3, 12]);
  });

  it('drops invalid entries entirely', () => {
    expect(normalizeBestMonths([0, 13, 'x', null, 6])).toEqual([6]);
    expect(normalizeBestMonths('summer')).toEqual([]);
  });
});

describe('normalizeLngLat', () => {
  it('accepts GeoJSON pairs', () => {
    expect(normalizeLngLat([13.405, 52.52])).toEqual([13.405, 52.52]);
  });

  it('accepts object forms in either order', () => {
    expect(normalizeLngLat({ lng: 13.4, lat: 52.5 })).toEqual([13.4, 52.5]);
    expect(normalizeLngLat({ lat: 52.5, lon: 13.4 })).toEqual([13.4, 52.5]);
  });

  it('parses numeric strings (models love quoting coordinates)', () => {
    expect(normalizeLngLat({ lng: '13.4', lat: '52.5' })).toEqual([13.4, 52.5]);
  });

  it('rejects out-of-range and degenerate zeros', () => {
    expect(normalizeLngLat([200, 10])).toBeNull();
    expect(normalizeLngLat([10, 91])).toBeNull();
    expect(normalizeLngLat([0, 0])).toBeNull();
    expect(normalizeLngLat(null)).toBeNull();
    expect(normalizeLngLat({ lng: NaN, lat: NaN })).toBeNull();
  });
});

describe('placeKey — cross-script identity', () => {
  it('folds latin case and diacritics', () => {
    expect(placeKey('Café Einstein')).toBe(placeKey('cafe einstein'));
    expect(placeKey('CAFE EINSTEIN')).toBe(placeKey('Café Einstein'));
  });

  it('folds arabic alef/teh-marbuta/diacritics variants', () => {
    expect(placeKey('مقهى أينشتاين')).toBe(placeKey('مقهى اينشتاين'));
    expect(placeKey('حَدِيقَةُ الْأَزْهَار')).toBe(placeKey('حديقة الازهار'));
    expect(placeKey('جامعة النور')).toBe(placeKey('جامعه النور'));
  });

  it('gives different places different keys', () => {
    expect(placeKey('Tiergarten')).not.toBe(placeKey('Tempelhof'));
  });

  it('collapses punctuation noise', () => {
    expect(placeKey('St. Hedwig – Kathedrale')).toBe(placeKey('st hedwig kathedrale'));
  });
});

describe('parseDiscoveryItem', () => {
  it('keeps a well-formed candidate', () => {
    const got = parseDiscoveryItem({
      name_en: 'Tempelhofer Freiheit',
      name_ar: 'تمبلهوف',
      category: 'park',
      hint_ar: 'حديقة سابقة للطائرات',
    });
    expect(got).toEqual({
      name_en: 'Tempelhofer Freiheit',
      name_ar: 'تمبلهوف',
      category: 'park',
      hint_ar: 'حديقة سابقة للطائرات',
    });
  });

  it('falls back to other for unknown categories', () => {
    const got = parseDiscoveryItem({ name_en: 'X', category: 'shopping-mall' });
    expect(got?.category).toBe('other');
    expect(isScoutCategory(got?.category)).toBe(true);
  });

  it('rejects nameless entries', () => {
    expect(parseDiscoveryItem({ name_en: '', category: 'food' })).toBeNull();
    expect(parseDiscoveryItem(null)).toBeNull();
    expect(parseDiscoveryItem('Brandenburg Gate')).toBeNull();
  });
});

describe('parseDossier', () => {
  const fallback = 'Brandenburger Tor';

  it('normalises a full dossier', () => {
    const got = parseDossier(
      {
        description_ar: 'بوابة عظيمة.',
        atmosphere_ar: 'هادئة',
        tips_ar: 'اصعد الفجراً',
        best_months: [5, 5, 9],
        duration_minutes: '45',
        price_level: 0,
        vibe: 'culture',
        signature_dish: null,
        photo_query_en: 'Brandenburg Gate night',
        coordinates: { lng: '13.3777', lat: '52.5163' },
        sources: ['ويكيبيديا', 'ويكيبيديا', 42],
      },
      fallback,
    );
    expect(got.descriptionAr).toBe('بوابة عظيمة.');
    expect(got.bestMonths).toEqual([5, 9]);
    expect(got.durationMinutes).toBe(45);
    expect(got.priceLevel).toBe(0);
    expect(got.vibe).toBe('culture');
    expect(got.signatureDish).toBeNull();
    expect(got.coordinates).toEqual([13.3777, 52.5163]);
    expect(got.sources).toEqual(['ويكيبيديا']);
  });

  it('survives a totally off-script response', () => {
    const got = parseDossier('النموذج تجاهل التعليمات', fallback);
    expect(got.descriptionAr).toBeNull();
    expect(got.bestMonths).toEqual([]);
    expect(got.photoQueryEn).toBe(fallback);
    expect(got.coordinates).toBeNull();
    expect(isFulfillable(got)).toBe(false);
  });

  it('isFulfillable gates on description only', () => {
    expect(isFulfillable(parseDossier({ description_ar: 'وصف' }, fallback))).toBe(true);
    expect(isFulfillable(parseDossier({}, fallback))).toBe(false);
  });

  it('duration outside sane bounds is rejected, not pulled to the edge', () => {
    expect(parseDossier({ duration_minutes: 99999 }, fallback).durationMinutes).toBeNull();
    expect(parseDossier({ duration_minutes: -5 }, fallback).durationMinutes).toBeNull();
    expect(parseDossier({ duration_minutes: '90' }, fallback).durationMinutes).toBe(90);
  });
});

describe('policy & prompts contract', () => {
  it('every depth has positive concurrency and place counts', () => {
    for (const policy of Object.values(DEPTH_POLICY)) {
      expect(policy.places).toBeGreaterThan(0);
      expect(policy.concurrency).toBeGreaterThan(0);
      expect(policy.perPlaceWords).toBeGreaterThan(50);
    }
    // Deepest is the most thorough but stays rate-limit polite.
    expect(DEPTH_POLICY.deepest.places).toBeGreaterThan(DEPTH_POLICY.standard.places);
    expect(DEPTH_POLICY.deepest.concurrency).toBeLessThanOrEqual(DEPTH_POLICY.deep.concurrency);
  });

  it('prompts pin the exact vocabularies the schema enforces', () => {
    const d = discoverySystemPrompt();
    expect(d).toContain('name_en');
    expect(d).toContain('category');

    const w = dossierSystemPrompt();
    for (const field of ['description_ar', 'atmosphere_ar', 'tips_ar', 'best_months', 'price_level', 'coordinates']) {
      expect(w).toContain(field);
    }
  });

  it('scope note adapts to city vs country', () => {
    expect(scopeNoteFor('country', 'اليابان')).toContain('الدولة');
    expect(scopeNoteFor('city', 'برلين', 'Berlin')).toContain('Berlin');
    expect(scopeNoteFor('city', 'برلين')).toContain('المدينة');
  });
});
