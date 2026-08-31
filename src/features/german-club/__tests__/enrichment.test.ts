import { describe, expect, it } from 'vitest';

import { GERMAN_DICTIONARY_DATA } from '../lib/dictionaryData';
import { enrichEntry, inferRelatedShelves } from '../lib/enrichment';

describe('Entry Enrichment', () => {
  const all = GERMAN_DICTIONARY_DATA;

  it('returns a category hint for known categories', () => {
    const abend = all.find((e) => e.german === 'Abend');
    expect(abend).toBeDefined();
    const ctx = enrichEntry(abend!, all);
    expect(ctx.categoryHintAr.length).toBeGreaterThan(0);
  });

  it('flags beginner entries correctly (A1/A2)', () => {
    const a1 = all.find((e) => e.cefr === 'A1');
    const c1 = all.find((e) => e.cefr === 'C1');
    expect(a1).toBeDefined();
    expect(c1).toBeDefined();
    expect(enrichEntry(a1!, all).isBeginner).toBe(true);
    expect(enrichEntry(c1!, all).isBeginner).toBe(false);
  });

  it('returns related words in same CEFR + category', () => {
    const abend = all.find((e) => e.german === 'Abend')!;
    const ctx = enrichEntry(abend, all, { maxRelated: 6 });
    expect(ctx.relatedWords.length).toBeLessThanOrEqual(6);
    expect(ctx.relatedWords.length).toBeGreaterThan(0);
    // No entry should be itself
    for (const r of ctx.relatedWords) {
      expect(r.id).not.toBe(abend.id);
      expect(r.german).not.toBe(abend.german);
    }
  });

  it('marks rich entries (≥2 examples)', () => {
    const rich = all.find((e) => e.examples.length >= 2);
    const poor = all.find((e) => e.examples.length === 0);
    if (rich) expect(enrichEntry(rich, all).isRich).toBe(true);
    if (poor) expect(enrichEntry(poor, all).isRich).toBe(false);
  });
});

describe('Shelf Inference', () => {
  it('returns no shelves for entry with no tag overlap', () => {
    const a1 = GERMAN_DICTIONARY_DATA.find((e) => e.cefr === 'A1' && e.tags && e.tags.length > 0);
    expect(a1).toBeDefined();
    // Construct a totally unrelated shelf
    const unrelated = [
      {
        id: 'fake',
        slug: 'fake',
        title_ar: 'x',
        title_de: null,
        description_ar: null,
        situation_tags: ['absolutely-unrelated-tag-99999'],
        icon: null,
        sort_order: 0,
        is_premium: false,
        created_at: '2024-01-01',
      },
    ];
    const result = inferRelatedShelves(a1!, unrelated as never, 3);
    expect(result.length).toBe(0);
  });

  it('returns matched shelves when tags overlap', () => {
    const a1 = GERMAN_DICTIONARY_DATA.find((e) => e.cefr === 'A1' && e.tags && e.tags.includes('coffee'));
    if (!a1) {
      // Skip — fixture may not have a coffee-tagged entry at A1
      return;
    }
    // Use a synthesized shelf list with overlapping tags
    const shelvesWithOverlap = [
      {
        id: 's1',
        slug: 'coffee-bakery',
        title_ar: 'في المقهى',
        title_de: null,
        description_ar: null,
        situation_tags: ['coffee', 'bakery'],
        icon: null,
        sort_order: 0,
        is_premium: false,
        created_at: '2024-01-01',
      },
      {
        id: 's2',
        slug: 'restaurant',
        title_ar: 'في المطعم',
        title_de: null,
        description_ar: null,
        situation_tags: ['restaurant'],
        icon: null,
        sort_order: 0,
        is_premium: false,
        created_at: '2024-01-01',
      },
    ];
    const result = inferRelatedShelves(a1, shelvesWithOverlap as never, 3);
    expect(result.length).toBeGreaterThan(0);
    expect(result[0].slug).toBe('coffee-bakery');
  });
});