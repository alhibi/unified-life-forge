import { CATEGORIES } from '../data/categories';
import { type Continent, findCatalogCountry } from '../data/countriesCatalog';
import type { Coordinates, PlaceCategory, TravelCountry, TravelPlace } from '../types';
import { boundsCenterOf, haversineMeters } from './geo';

/**
 * Derived views over the atlas. Everything here is a pure function of the two
 * arrays the feature already has in memory, so the world map, the country grid
 * and the passport screen all agree by construction instead of each running its
 * own aggregate query.
 */

export interface CountrySummary {
  country: TravelCountry;
  continent: Continent | null;
  /** Places the user saved here. */
  total: number;
  visited: number;
  planned: number;
  wishlist: number;
  favorites: number;
  /** Centroid of the saved places — a better map anchor than the country box. */
  anchor: Coordinates;
  /** Most recent `visitedOn`, for sorting by recency. */
  lastVisitedOn: string | null;
  /** Cover image for the country card: newest place photo. */
  coverPhotoUrl: string | null;
  topCategory: PlaceCategory | null;
}

export function buildCountrySummaries(
  countries: TravelCountry[],
  places: TravelPlace[],
): CountrySummary[] {
  const byCountry = new Map<string, TravelPlace[]>();
  for (const place of places) {
    const bucket = byCountry.get(place.countryId);
    if (bucket) bucket.push(place);
    else byCountry.set(place.countryId, [place]);
  }

  const summaries: CountrySummary[] = [];
  for (const country of countries) {
    const own = byCountry.get(country.id);
    if (!own || own.length === 0) continue;

    const categoryCounts = new Map<PlaceCategory, number>();
    let visited = 0;
    let planned = 0;
    let wishlist = 0;
    let favorites = 0;
    let lastVisitedOn: string | null = null;
    let sumLng = 0;
    let sumLat = 0;

    for (const place of own) {
      if (place.visitStatus === 'visited') visited += 1;
      else if (place.visitStatus === 'planned') planned += 1;
      else wishlist += 1;
      if (place.isFavorite) favorites += 1;
      if (place.visitedOn && (!lastVisitedOn || place.visitedOn > lastVisitedOn)) {
        lastVisitedOn = place.visitedOn;
      }
      categoryCounts.set(place.category, (categoryCounts.get(place.category) ?? 0) + 1);
      sumLng += place.coordinates[0];
      sumLat += place.coordinates[1];
    }

    let topCategory: PlaceCategory | null = null;
    let topCount = 0;
    for (const [category, count] of categoryCounts) {
      if (count > topCount) {
        topCount = count;
        topCategory = category;
      }
    }

    summaries.push({
      country,
      continent: findCatalogCountry(country.isoCode)?.continent ?? null,
      total: own.length,
      visited,
      planned,
      wishlist,
      favorites,
      anchor: [sumLng / own.length, sumLat / own.length],
      lastVisitedOn,
      coverPhotoUrl: own.find((place) => place.coverPhotoUrl)?.coverPhotoUrl ?? null,
      topCategory,
    });
  }

  return summaries.sort(
    (a, b) => b.total - a.total || a.country.nameAr.localeCompare(b.country.nameAr, 'ar'),
  );
}

export interface PassportStats {
  totalPlaces: number;
  visitedPlaces: number;
  plannedPlaces: number;
  wishlistPlaces: number;
  favoritePlaces: number;
  countriesTouched: number;
  countriesVisited: number;
  continentsTouched: number;
  citiesTouched: number;
  photosCount: number;
  /** Ratio 0–1 of places actually visited. */
  completion: number;
  /** Distance between the two furthest-apart saved places, in metres. */
  spanMeters: number;
  northernmost: TravelPlace | null;
  southernmost: TravelPlace | null;
  /** Counts per category, descending, zero-count categories dropped. */
  categoryBreakdown: { category: PlaceCategory; count: number }[];
  /** Visits per calendar month (index 0 = January). */
  monthHistogram: number[];
  /** Visits per year, most recent first. */
  yearHistogram: { year: number; count: number }[];
  firstVisitOn: string | null;
  lastVisitOn: string | null;
  averageRating: number | null;
}

export function computePassport(places: TravelPlace[], summaries: CountrySummary[]): PassportStats {
  const categoryCounts = new Map<PlaceCategory, number>();
  const monthHistogram = new Array<number>(12).fill(0);
  const yearCounts = new Map<number, number>();
  const cities = new Set<string>();
  const continents = new Set<Continent>();

  let visited = 0;
  let planned = 0;
  let wishlist = 0;
  let favorites = 0;
  let photos = 0;
  let ratingSum = 0;
  let ratingCount = 0;
  let firstVisitOn: string | null = null;
  let lastVisitOn: string | null = null;
  let northernmost: TravelPlace | null = null;
  let southernmost: TravelPlace | null = null;

  for (const place of places) {
    if (place.visitStatus === 'visited') visited += 1;
    else if (place.visitStatus === 'planned') planned += 1;
    else wishlist += 1;
    if (place.isFavorite) favorites += 1;
    photos += place.photos.length;
    if (place.city) cities.add(place.city.trim());
    if (place.rating !== null) {
      ratingSum += place.rating;
      ratingCount += 1;
    }
    categoryCounts.set(place.category, (categoryCounts.get(place.category) ?? 0) + 1);

    if (place.visitedOn) {
      const date = new Date(`${place.visitedOn}T00:00:00Z`);
      if (!Number.isNaN(date.getTime())) {
        monthHistogram[date.getUTCMonth()] += 1;
        const year = date.getUTCFullYear();
        yearCounts.set(year, (yearCounts.get(year) ?? 0) + 1);
      }
      if (!firstVisitOn || place.visitedOn < firstVisitOn) firstVisitOn = place.visitedOn;
      if (!lastVisitOn || place.visitedOn > lastVisitOn) lastVisitOn = place.visitedOn;
    }

    if (!northernmost || place.coordinates[1] > northernmost.coordinates[1]) northernmost = place;
    if (!southernmost || place.coordinates[1] < southernmost.coordinates[1]) southernmost = place;
  }

  for (const summary of summaries) {
    if (summary.continent) continents.add(summary.continent);
  }

  return {
    totalPlaces: places.length,
    visitedPlaces: visited,
    plannedPlaces: planned,
    wishlistPlaces: wishlist,
    favoritePlaces: favorites,
    countriesTouched: summaries.length,
    countriesVisited: summaries.filter((summary) => summary.visited > 0).length,
    continentsTouched: continents.size,
    citiesTouched: cities.size,
    photosCount: photos,
    completion: places.length === 0 ? 0 : visited / places.length,
    spanMeters: widestSpan(places),
    northernmost,
    southernmost,
    categoryBreakdown: [...categoryCounts.entries()]
      .map(([category, count]) => ({ category, count }))
      .sort((a, b) => b.count - a.count || categoryOrder(a.category) - categoryOrder(b.category)),
    monthHistogram,
    yearHistogram: [...yearCounts.entries()]
      .map(([year, count]) => ({ year, count }))
      .sort((a, b) => b.year - a.year),
    firstVisitOn,
    lastVisitOn,
    averageRating: ratingCount === 0 ? null : Math.round((ratingSum / ratingCount) * 10) / 10,
  };
}

/**
 * How far apart the atlas reaches. Compared against a coarse sample rather than
 * every pair: an O(n²) scan over a few hundred places would be fine, but this
 * runs on every render of the passport screen, so the candidate set is reduced
 * to the four compass extremes first.
 */
function widestSpan(places: TravelPlace[]): number {
  if (places.length < 2) return 0;
  let west = places[0];
  let east = places[0];
  let north = places[0];
  let south = places[0];
  for (const place of places) {
    if (place.coordinates[0] < west.coordinates[0]) west = place;
    if (place.coordinates[0] > east.coordinates[0]) east = place;
    if (place.coordinates[1] > north.coordinates[1]) north = place;
    if (place.coordinates[1] < south.coordinates[1]) south = place;
  }
  const candidates: Coordinates[] = [
    west.coordinates,
    east.coordinates,
    north.coordinates,
    south.coordinates,
  ];
  let widest = 0;
  for (let i = 0; i < candidates.length; i += 1) {
    for (let j = i + 1; j < candidates.length; j += 1) {
      widest = Math.max(widest, haversineMeters(candidates[i], candidates[j]));
    }
  }
  return widest;
}

function categoryOrder(category: PlaceCategory): number {
  const index = CATEGORIES.findIndex((entry) => entry.value === category);
  return index === -1 ? CATEGORIES.length : index;
}

/** Map anchor for a country card — saved places if any, else the country box. */
export function summaryAnchor(summary: CountrySummary): Coordinates {
  return summary.total > 0 ? summary.anchor : boundsCenterOf(summary.country.bounds);
}

/**
 * "أفضل شهر للسفر" across the atlas: sums the `bestMonths` a traveller recorded
 * on their own wishlist, so the recommendation reflects their taste rather than
 * a generic tourism calendar.
 */
export function bestMonthsAcross(places: TravelPlace[]): number[] {
  const counts = new Array<number>(12).fill(0);
  for (const place of places) {
    for (const month of place.bestMonths) counts[month - 1] += 1;
  }
  const peak = Math.max(...counts);
  if (peak === 0) return [];
  return counts
    .map((count, index) => ({ count, month: index + 1 }))
    .filter((entry) => entry.count >= peak * 0.75)
    .map((entry) => entry.month);
}
