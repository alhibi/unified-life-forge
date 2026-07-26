import { describe, expect, it } from 'vitest';

import type { Coordinates, TravelPlace } from '../types';
import { buildMarkers, INDIVIDUAL_ZOOM } from './clustering';

function place(
  id: string,
  coordinates: Coordinates,
  overrides: Partial<TravelPlace> = {},
): TravelPlace {
  return {
    id,
    countryId: 'country',
    userId: 'user',
    nameAr: id,
    nameEn: null,
    category: 'nature',
    coordinates,
    city: null,
    address: null,
    descriptionAr: null,
    tipsAr: null,
    bestTimeToVisit: null,
    bestMonths: [],
    visitStatus: 'wishlist',
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

describe('buildMarkers', () => {
  it('shows every place individually once zoomed in', () => {
    const places = [place('a', [46.0, 24.0]), place('b', [46.0001, 24.0001])];
    const items = buildMarkers(places, INDIVIDUAL_ZOOM);
    expect(items).toHaveLength(2);
    expect(items.every((item) => item.kind === 'place')).toBe(true);
  });

  it('groups neighbours into one bubble when zoomed out', () => {
    const places = [
      place('a', [46.0, 24.0]),
      place('b', [46.01, 24.01]),
      place('c', [46.02, 24.02]),
    ];
    const items = buildMarkers(places, 4);
    expect(items).toHaveLength(1);
    const [cluster] = items;
    expect(cluster.kind).toBe('cluster');
    if (cluster.kind !== 'cluster') return;
    expect(cluster.count).toBe(3);
    expect(cluster.placeIds).toEqual(expect.arrayContaining(['a', 'b', 'c']));
  });

  it('gives a cluster a bounding box that contains its members', () => {
    const places = [place('a', [10, 10]), place('b', [10.05, 10.05])];
    const [item] = buildMarkers(places, 6);
    expect(item.kind).toBe('cluster');
    if (item.kind !== 'cluster') return;
    expect(item.bounds.sw[0]).toBeLessThanOrEqual(10);
    expect(item.bounds.ne[0]).toBeGreaterThanOrEqual(10.05);
  });

  it('keeps far-apart places separate at the same zoom', () => {
    const places = [place('riyadh', [46.6753, 24.7136]), place('sydney', [151.2, -33.86])];
    const items = buildMarkers(places, 4);
    expect(items).toHaveLength(2);
    expect(items.every((item) => item.kind === 'place')).toBe(true);
  });

  it('handles an empty atlas', () => {
    expect(buildMarkers([], 3)).toEqual([]);
  });

  it('carries a cover photo onto the bubble when a member has one', () => {
    const places = [
      place('a', [30, 30]),
      place('b', [30.01, 30.01], { coverPhotoUrl: 'https://example.test/a.jpg' }),
    ];
    const [item] = buildMarkers(places, 5);
    if (item.kind !== 'cluster') throw new Error('expected a cluster');
    expect(item.coverPhotoUrl).toBe('https://example.test/a.jpg');
  });
});
