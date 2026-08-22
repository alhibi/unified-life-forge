import { describe, expect, it } from 'vitest';

import type { DossierLike } from '../promotion';
import { canPromoteDossier, dossierToPlaceFields, safeCategory, SCOUT_VIBE_LABELS } from '../promotion';

const BASE: DossierLike = {
  nameAr: 'بوابة براندنبورغ',
  nameEn: 'Brandenburger Tor',
  category: 'historic',
  coordinates: { lng: 13.3777, lat: 52.5163 },
  city: 'برلين',
  addressLine: 'Brandenburger Tor, Berlin',
  descriptionAr: 'رمز الوحدة الألمانية.',
  atmosphereAr: 'مهيب نهاراً حيّ ليلًا',
  tipsAr: 'زُره فجراً لتتفادى الزحام',
  signatureDish: null,
  bestMonths: [5, 6, 9],
  priceLevel: 0,
  durationMinutes: 60,
  vibe: 'culture',
};

describe('safeCategory — the vocabulary guard', () => {
  it('passes every real atlas category through untouched', () => {
    for (const cat of ['food', 'park', 'museum', 'beach', 'adventure']) {
      expect(safeCategory(cat)).toBe(cat);
    }
  });

  it('folds unknown scout categories to other instead of exploding', () => {
    expect(safeCategory('shopping-mall')).toBe('other');
    expect(safeCategory('')).toBe('other');
    // A model hallucination that is NOT even a string-typed category.
    expect(safeCategory('nightclub' as string)).toBe('other');
  });
});

describe('canPromoteDossier', () => {
  it('accepts a complete dossier', () => {
    expect(canPromoteDossier(BASE)).toBe(true);
  });

  it('refuses dossiers without coordinates', () => {
    expect(canPromoteDossier({ ...BASE, coordinates: null })).toBe(false);
  });

  it('refuses non-finite coordinates', () => {
    expect(canPromoteDossier({ ...BASE, coordinates: { lng: NaN, lat: 52 } })).toBe(false);
  });

  it('refuses empty descriptions', () => {
    expect(canPromoteDossier({ ...BASE, descriptionAr: '   ' })).toBe(false);
  });
});

describe('dossierToPlaceFields', () => {
  it('maps the full dossier into createPlace input', () => {
    const got = dossierToPlaceFields({ ...BASE, coordinates: BASE.coordinates! });
    expect(got.nameAr).toBe('بوابة براندنبورغ');
    expect(got.category).toBe('historic');
    expect(got.coordinates).toEqual([13.3777, 52.5163]); // GeoJSON order
    expect(got.visitStatus).toBe('wishlist');
    expect(got.tags).toContain('استكشاف ذكي');
    expect(got.tags).toContain('ثقافة'); // vibe translated
    expect(got.descriptionAr).toContain('رمز الوحدة');
    expect(got.descriptionAr).toContain('الأجواء: مهيب');
    expect(got.descriptionAr).toContain('نصائح: زُره');
  });

  it('falls back to the English name when no Arabic name exists', () => {
    const got = dossierToPlaceFields({ ...BASE, nameAr: null, coordinates: BASE.coordinates! });
    expect(got.nameAr).toBe('Brandenburger Tor');
  });

  it('keeps the scout provenance tag even when the vibe is unknown', () => {
    const got = dossierToPlaceFields({
      ...BASE,
      vibe: 'haunted',
      coordinates: BASE.coordinates!,
    });
    expect(got.tags).toEqual(['استكشاف ذكي']);
  });

  it('every emitted tag label has an Arabic meaning', () => {
    for (const label of Object.values(SCOUT_VIBE_LABELS)) {
      expect(label.length).toBeGreaterThan(1);
      expect(label).not.toMatch(/[a-z]/i);
    }
  });
});
