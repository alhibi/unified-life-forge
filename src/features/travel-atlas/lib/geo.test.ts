import { describe, expect, it } from 'vitest';

import type { Coordinates } from '../types';
import {
  boundsFromPoints,
  containsPoint,
  formatDistance,
  haversineMeters,
  isValidCoordinatePair,
  orderByNearestNeighbour,
  routeLength,
  wrapLongitude,
} from './geo';

const RIYADH: Coordinates = [46.6753, 24.7136];
const JEDDAH: Coordinates = [39.1925, 21.4858];

describe('coordinate validation', () => {
  it('rejects the pairs that break a map', () => {
    expect(isValidCoordinatePair(null)).toBe(false);
    expect(isValidCoordinatePair([Number.NaN, 10])).toBe(false);
    // Web Mercator cannot represent the poles.
    expect(isValidCoordinatePair([0, 89])).toBe(false);
    expect(isValidCoordinatePair([181, 0])).toBe(false);
    expect(isValidCoordinatePair(RIYADH)).toBe(true);
  });

  it('wraps longitude into the -180..180 window', () => {
    expect(wrapLongitude(190)).toBeCloseTo(-170);
    expect(wrapLongitude(-190)).toBeCloseTo(170);
    expect(wrapLongitude(45)).toBeCloseTo(45);
  });
});

describe('haversineMeters', () => {
  it('matches the known Riyadh–Jeddah great-circle distance', () => {
    // Roughly 850 km; allow 10 km of slack for the spherical model.
    const distance = haversineMeters(RIYADH, JEDDAH);
    expect(distance).toBeGreaterThan(840_000);
    expect(distance).toBeLessThan(860_000);
  });

  it('is zero for the same point and symmetric', () => {
    expect(haversineMeters(RIYADH, RIYADH)).toBe(0);
    expect(haversineMeters(RIYADH, JEDDAH)).toBeCloseTo(haversineMeters(JEDDAH, RIYADH), 6);
  });
});

describe('formatDistance', () => {
  it('switches units at the point where precision stops mattering', () => {
    expect(formatDistance(430)).toBe('430 م');
    expect(formatDistance(1500)).toContain('كم');
    expect(formatDistance(-1)).toBe('—');
  });
});

describe('boundsFromPoints', () => {
  it('returns null when there is nothing to frame', () => {
    expect(boundsFromPoints([])).toBeNull();
    expect(boundsFromPoints([[Number.NaN, 0]])).toBeNull();
  });

  it('gives a single point a usable window instead of zero extent', () => {
    const bounds = boundsFromPoints([RIYADH]);
    expect(bounds).not.toBeNull();
    expect(bounds!.ne[0]).toBeGreaterThan(bounds!.sw[0]);
    expect(bounds!.ne[1]).toBeGreaterThan(bounds!.sw[1]);
  });

  it('contains every input point', () => {
    const bounds = boundsFromPoints([RIYADH, JEDDAH])!;
    expect(containsPoint(bounds, RIYADH, 0)).toBe(true);
    expect(containsPoint(bounds, JEDDAH, 0)).toBe(true);
  });

  it('never produces coordinates outside the projectable world', () => {
    const bounds = boundsFromPoints([
      [-179.9, -84.9],
      [179.9, 84.9],
    ])!;
    expect(bounds.sw[0]).toBeGreaterThanOrEqual(-180);
    expect(bounds.ne[0]).toBeLessThanOrEqual(180);
    expect(bounds.sw[1]).toBeGreaterThanOrEqual(-85);
    expect(bounds.ne[1]).toBeLessThanOrEqual(85);
  });
});

describe('orderByNearestNeighbour', () => {
  it('removes the zig-zag of insertion order', () => {
    // Four stops along a line, deliberately shuffled.
    const stops = [
      { id: 'c', coordinates: [2, 0] as Coordinates },
      { id: 'a', coordinates: [0, 0] as Coordinates },
      { id: 'd', coordinates: [3, 0] as Coordinates },
      { id: 'b', coordinates: [1, 0] as Coordinates },
    ];
    const orderedFromA = orderByNearestNeighbour(stops, [0, 0]);
    expect(orderedFromA.map((stop) => stop.id)).toEqual(['a', 'b', 'c', 'd']);

    const before = routeLength(stops.map((stop) => stop.coordinates));
    const after = routeLength(orderedFromA.map((stop) => stop.coordinates));
    expect(after).toBeLessThan(before);
  });

  it('leaves trivial itineraries untouched', () => {
    const stops = [
      { id: 'x', coordinates: RIYADH },
      { id: 'y', coordinates: JEDDAH },
    ];
    expect(orderByNearestNeighbour(stops).map((stop) => stop.id)).toEqual(['x', 'y']);
  });
});
