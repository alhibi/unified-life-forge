import { type CategoryGroup, categoryMeta } from '../data/categories';
import type { TravelPlace, VisitStatus } from '../types';

/**
 * Search and filtering over the atlas.
 *
 * Pure functions on an in-memory array, which is what makes the country screen
 * feel instant: typing filters without a round trip, and the map and the list
 * always show the same set because they are handed the same result.
 */

export type PlaceSort = 'recent' | 'name' | 'rating' | 'visited';

export interface PlaceFilters {
  query: string;
  status: VisitStatus | 'all';
  group: CategoryGroup | 'all';
  favoritesOnly: boolean;
  /** Keep only places whose best months include this one. */
  month: number | null;
  sort: PlaceSort;
}

export const DEFAULT_FILTERS: PlaceFilters = {
  query: '',
  status: 'all',
  group: 'all',
  favoritesOnly: false,
  month: null,
  sort: 'recent',
};

/**
 * Arabic-aware normaliser: strips tashkeel and unifies the letter forms people
 * type interchangeably. Without it, searching "الاردن" never finds "الأردن".
 */
export function normalizeArabic(input: string): string {
  return input
    .replace(/[\u064B-\u0652\u0670\u0640]/g, '')
    .replace(/[\u0623\u0625\u0622]/g, '\u0627')
    .replace(/\u0649/g, '\u064A')
    .replace(/\u0629/g, '\u0647')
    .toLowerCase()
    .trim();
}

function haystackFor(place: TravelPlace): string {
  return normalizeArabic(
    [
      place.nameAr,
      place.nameEn ?? '',
      place.city ?? '',
      place.address ?? '',
      place.descriptionAr ?? '',
      place.tipsAr ?? '',
      categoryMeta(place.category).label,
      ...place.tags,
    ].join(' '),
  );
}

export function filterPlaces(places: TravelPlace[], filters: PlaceFilters): TravelPlace[] {
  const tokens = normalizeArabic(filters.query).split(/\s+/).filter(Boolean);

  const matched = places.filter((place) => {
    if (filters.status !== 'all' && place.visitStatus !== filters.status) return false;
    if (filters.favoritesOnly && !place.isFavorite) return false;
    if (filters.group !== 'all' && categoryMeta(place.category).group !== filters.group) {
      return false;
    }
    if (filters.month !== null && !place.bestMonths.includes(filters.month)) return false;
    if (tokens.length === 0) return true;
    const haystack = haystackFor(place);
    return tokens.every((token) => haystack.includes(token));
  });

  return sortPlaces(matched, filters.sort);
}

export function sortPlaces(places: TravelPlace[], sort: PlaceSort): TravelPlace[] {
  const sorted = [...places];
  switch (sort) {
    case 'name':
      return sorted.sort((a, b) => a.nameAr.localeCompare(b.nameAr, 'ar'));
    case 'rating':
      // Unrated places sink rather than sorting as zero — "not judged yet" is not
      // the same as "bad".
      return sorted.sort((a, b) => (b.rating ?? -1) - (a.rating ?? -1));
    case 'visited':
      return sorted.sort((a, b) => (b.visitedOn ?? '').localeCompare(a.visitedOn ?? ''));
    case 'recent':
    default:
      return sorted.sort((a, b) => (b.createdAt ?? '').localeCompare(a.createdAt ?? ''));
  }
}

export function activeFilterCount(filters: PlaceFilters): number {
  let count = 0;
  if (filters.status !== 'all') count += 1;
  if (filters.group !== 'all') count += 1;
  if (filters.favoritesOnly) count += 1;
  if (filters.month !== null) count += 1;
  return count;
}

export function hasActiveFilters(filters: PlaceFilters): boolean {
  return activeFilterCount(filters) > 0 || filters.query.trim().length > 0;
}
