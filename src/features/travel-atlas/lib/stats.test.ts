import { describe, expect, it } from 'vitest';

import type { Coordinates, CountryStamp, TravelCountry, TravelPlace, VisitStatus } from '../types';
import { bestMonthsAcross, buildCountrySummaries, computePassport } from './stats';

function country(id: string, isoCode: string, nameAr: string): TravelCountry {
  return {
    id,
    isoCode,
    nameAr,
    nameEn: isoCode,
    bounds: { sw: [0, 0], ne: [10, 10] },
    placesCount: 0,
    coverImageUrl: null,
  };
}

function place(id: string, countryId: string, overrides: Partial<TravelPlace> = {}): TravelPlace {
  return {
    id,
    countryId,
    userId: 'user',
    nameAr: id,
    nameEn: null,
    category: 'nature',
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

const SA = country('sa', 'SA', 'السعودية');
const JO = country('jo', 'JO', 'الأردن');

describe('buildCountrySummaries', () => {
  it('omits countries with no saved places', () => {
    const summaries = buildCountrySummaries([SA, JO], [place('a', 'sa')]);
    expect(summaries.map((summary) => summary.country.id)).toEqual(['sa']);
  });

  it('counts each visit status separately', () => {
    const summaries = buildCountrySummaries(
      [SA],
      [
        place('a', 'sa', { visitStatus: 'visited' }),
        place('b', 'sa', { visitStatus: 'planned' }),
        place('c', 'sa', { visitStatus: 'wishlist', isFavorite: true }),
      ],
    );
    expect(summaries[0]).toMatchObject({
      total: 3,
      visited: 1,
      planned: 1,
      wishlist: 1,
      favorites: 1,
    });
  });

  it('anchors a country on the centroid of its places, not its bounding box', () => {
    const summaries = buildCountrySummaries(
      [SA],
      [place('a', 'sa', { coordinates: [40, 20] }), place('b', 'sa', { coordinates: [42, 22] })],
    );
    expect(summaries[0].anchor[0]).toBeCloseTo(41);
    expect(summaries[0].anchor[1]).toBeCloseTo(21);
  });

  it('sorts by number of places, descending', () => {
    const summaries = buildCountrySummaries(
      [SA, JO],
      [place('a', 'sa'), place('b', 'jo'), place('c', 'jo')],
    );
    expect(summaries.map((summary) => summary.country.id)).toEqual(['jo', 'sa']);
  });

  it('resolves the continent from the catalog', () => {
    const summaries = buildCountrySummaries([SA], [place('a', 'sa')]);
    expect(summaries[0].continent).toBe('gulf');
  });
});

describe('computePassport', () => {
  it('reports zeroes for an empty atlas without dividing by zero', () => {
    const passport = computePassport([], []);
    expect(passport.totalPlaces).toBe(0);
    expect(passport.completion).toBe(0);
    expect(passport.spanMeters).toBe(0);
    expect(passport.averageRating).toBeNull();
  });

  it('derives completion from visited over total', () => {
    const places = [
      place('a', 'sa', { visitStatus: 'visited' }),
      place('b', 'sa', { visitStatus: 'visited' }),
      place('c', 'sa'),
      place('d', 'sa'),
    ];
    expect(computePassport(places, []).completion).toBeCloseTo(0.5);
  });

  it('buckets visits by calendar month and year', () => {
    const places = [
      place('a', 'sa', { visitStatus: 'visited', visitedOn: '2024-03-10' }),
      place('b', 'sa', { visitStatus: 'visited', visitedOn: '2025-03-02' }),
      place('c', 'sa', { visitStatus: 'visited', visitedOn: '2025-11-20' }),
    ];
    const passport = computePassport(places, []);
    expect(passport.monthHistogram[2]).toBe(2);
    expect(passport.monthHistogram[10]).toBe(1);
    expect(passport.yearHistogram).toEqual([
      { year: 2025, count: 2 },
      { year: 2024, count: 1 },
    ]);
    expect(passport.firstVisitOn).toBe('2024-03-10');
    expect(passport.lastVisitOn).toBe('2025-11-20');
  });

  it('finds the compass extremes and a non-zero span', () => {
    const places = [
      place('north', 'sa', { coordinates: [10, 60] }),
      place('south', 'sa', { coordinates: [10, -30] }),
    ];
    const passport = computePassport(places, []);
    expect(passport.northernmost?.id).toBe('north');
    expect(passport.southernmost?.id).toBe('south');
    expect(passport.spanMeters).toBeGreaterThan(1_000_000);
  });

  it('averages only the places that were actually rated', () => {
    const places = [
      place('a', 'sa', { rating: 5 }),
      place('b', 'sa'),
      place('c', 'sa', { rating: 4 }),
    ];
    expect(computePassport(places, []).averageRating).toBeCloseTo(4.5);
  });

  it('counts distinct cities, ignoring blanks', () => {
    const places = [
      place('a', 'sa', { city: 'جدة' }),
      place('b', 'sa', { city: 'جدة' }),
      place('c', 'sa', { city: 'تبوك' }),
      place('d', 'sa'),
    ];
    expect(computePassport(places, []).citiesTouched).toBe(2);
  });
});

describe('computePassport with country stamps', () => {
  function stamp(isoCode: string, status: CountryStamp['status'] = 'visited'): CountryStamp {
    return { id: isoCode, isoCode, status, firstYear: null, visitCount: 1, noteAr: null };
  }

  it('counts a stamped country that holds no saved place', () => {
    // The whole point of the stamp map: a country can be recorded without
    // pinning anything inside it. Counting only countries that contain places
    // would under-report the record and contradict the map.
    const passport = computePassport([], [], [stamp('JP'), stamp('IT')]);
    expect(passport.countriesTouched).toBe(2);
    expect(passport.countriesVisited).toBe(2);
    expect(passport.continentsTouched).toBe(2);
  });

  it('does not double-count a country that is both stamped and holds places', () => {
    const summaries = buildCountrySummaries([SA], [place('a', 'sa', { visitStatus: 'visited' })]);
    const passport = computePassport([place('a', 'sa', { visitStatus: 'visited' })], summaries, [
      stamp('SA'),
    ]);
    expect(passport.countriesTouched).toBe(1);
    expect(passport.countriesVisited).toBe(1);
  });

  it('treats a wish as touched but not visited', () => {
    const passport = computePassport([], [], [stamp('PE', 'wishlist')]);
    expect(passport.countriesTouched).toBe(1);
    expect(passport.countriesVisited).toBe(0);
  });

  it('counts living somewhere as having visited it', () => {
    const passport = computePassport([], [], [stamp('DE', 'lived')]);
    expect(passport.countriesVisited).toBe(1);
  });

  it('is unchanged when no stamps are passed', () => {
    const summaries = buildCountrySummaries([SA, JO], [place('a', 'sa'), place('b', 'jo')]);
    const withoutArg = computePassport([place('a', 'sa'), place('b', 'jo')], summaries);
    expect(withoutArg.countriesTouched).toBe(2);
    expect(withoutArg.countriesVisited).toBe(0);
  });
});

describe('bestMonthsAcross', () => {
  it('returns nothing when no place recorded a season', () => {
    expect(bestMonthsAcross([place('a', 'sa')])).toEqual([]);
  });

  it('surfaces the months that dominate the wishlist', () => {
    const places = [
      place('a', 'sa', { bestMonths: [3, 4] }),
      place('b', 'sa', { bestMonths: [3, 4] }),
      place('c', 'sa', { bestMonths: [11] }),
    ];
    expect(bestMonthsAcross(places)).toEqual([3, 4]);
  });
});
