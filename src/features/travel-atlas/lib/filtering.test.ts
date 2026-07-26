import { describe, expect, it } from 'vitest';

import type { Coordinates, PlaceCategory, TravelPlace, VisitStatus } from '../types';
import {
  activeFilterCount,
  DEFAULT_FILTERS,
  filterPlaces,
  hasActiveFilters,
  normalizeArabic,
  sortPlaces,
} from './filtering';

function place(overrides: Partial<TravelPlace> & { id: string }): TravelPlace {
  return {
    countryId: 'country',
    userId: 'user',
    nameAr: 'مكان',
    nameEn: null,
    category: 'nature' as PlaceCategory,
    coordinates: [46, 24] as Coordinates,
    city: null,
    address: null,
    descriptionAr: null,
    tipsAr: null,
    bestTimeToVisit: null,
    bestMonths: [],
    visitStatus: 'wishlist' as VisitStatus,
    visitedOn: null,
    priceLevel: null,
    durationMinutes: null,
    tags: [],
    rating: null,
    isFavorite: false,
    coverPhotoUrl: null,
    photos: [],
    links: [],
    createdAt: null,
    updatedAt: null,
    ...overrides,
  };
}

describe('normalizeArabic', () => {
  it('unifies the letter forms people type interchangeably', () => {
    // Without this, searching "الاردن" would never find "الأردن".
    expect(normalizeArabic('الأردن')).toBe(normalizeArabic('الاردن'));
    expect(normalizeArabic('مقهى')).toBe(normalizeArabic('مقهي'));
    expect(normalizeArabic('قَلْعَة')).toBe(normalizeArabic('قلعه'));
  });
});

describe('filterPlaces', () => {
  const places = [
    place({
      id: 'a',
      nameAr: 'وادي الديسة',
      category: 'nature',
      visitStatus: 'visited',
      rating: 5,
      bestMonths: [3, 4],
    }),
    place({
      id: 'b',
      nameAr: 'مقهى الصفا',
      category: 'cafe',
      city: 'جدة',
      isFavorite: true,
      rating: 4,
    }),
    place({
      id: 'c',
      nameAr: 'قلعة تبوك',
      category: 'historic',
      visitStatus: 'planned',
      tags: ['أثر'],
    }),
  ];

  it('returns everything by default', () => {
    expect(filterPlaces(places, DEFAULT_FILTERS)).toHaveLength(3);
  });

  it('searches names, cities and tags with Arabic normalisation', () => {
    expect(filterPlaces(places, { ...DEFAULT_FILTERS, query: 'الديسه' }).map((p) => p.id)).toEqual([
      'a',
    ]);
    expect(filterPlaces(places, { ...DEFAULT_FILTERS, query: 'جده' }).map((p) => p.id)).toEqual([
      'b',
    ]);
    expect(filterPlaces(places, { ...DEFAULT_FILTERS, query: 'اثر' }).map((p) => p.id)).toEqual([
      'c',
    ]);
  });

  it('requires every search token to match', () => {
    expect(
      filterPlaces(places, { ...DEFAULT_FILTERS, query: 'قلعة تبوك' }).map((p) => p.id),
    ).toEqual(['c']);
    expect(filterPlaces(places, { ...DEFAULT_FILTERS, query: 'قلعة جدة' })).toHaveLength(0);
  });

  it('filters by visit status, favourites, group and month', () => {
    expect(
      filterPlaces(places, { ...DEFAULT_FILTERS, status: 'visited' }).map((p) => p.id),
    ).toEqual(['a']);
    expect(
      filterPlaces(places, { ...DEFAULT_FILTERS, favoritesOnly: true }).map((p) => p.id),
    ).toEqual(['b']);
    expect(filterPlaces(places, { ...DEFAULT_FILTERS, group: 'taste' }).map((p) => p.id)).toEqual([
      'b',
    ]);
    expect(filterPlaces(places, { ...DEFAULT_FILTERS, month: 3 }).map((p) => p.id)).toEqual(['a']);
    expect(filterPlaces(places, { ...DEFAULT_FILTERS, month: 9 })).toHaveLength(0);
  });

  it('combines filters conjunctively', () => {
    const result = filterPlaces(places, {
      ...DEFAULT_FILTERS,
      status: 'visited',
      favoritesOnly: true,
    });
    expect(result).toHaveLength(0);
  });
});

describe('sortPlaces', () => {
  it('sinks unrated places instead of treating them as zero', () => {
    const sorted = sortPlaces(
      [place({ id: 'unrated' }), place({ id: 'low', rating: 1 })],
      'rating',
    );
    expect(sorted.map((p) => p.id)).toEqual(['low', 'unrated']);
  });

  it('sorts alphabetically in Arabic collation', () => {
    const sorted = sortPlaces(
      [place({ id: 'b', nameAr: 'بيت' }), place({ id: 'a', nameAr: 'أثر' })],
      'name',
    );
    expect(sorted[0].id).toBe('a');
  });
});

describe('filter counters', () => {
  it('counts only the narrowing filters, not the sort', () => {
    expect(activeFilterCount(DEFAULT_FILTERS)).toBe(0);
    expect(activeFilterCount({ ...DEFAULT_FILTERS, sort: 'name' })).toBe(0);
    expect(activeFilterCount({ ...DEFAULT_FILTERS, status: 'visited', month: 1 })).toBe(2);
  });

  it('treats a search query as an active filter', () => {
    expect(hasActiveFilters(DEFAULT_FILTERS)).toBe(false);
    expect(hasActiveFilters({ ...DEFAULT_FILTERS, query: 'وادي' })).toBe(true);
  });
});
