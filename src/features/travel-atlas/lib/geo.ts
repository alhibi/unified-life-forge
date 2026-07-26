import type { Coordinates, CountryBounds } from '../types';

/**
 * Pure geodesy for the atlas. No MapLibre import here on purpose — these
 * helpers run in the form validator, the itinerary planner and the stats
 * screen, none of which should pull a 900 kB map engine into their chunk.
 */

export const MIN_ZOOM = 1.4;
export const MAX_ZOOM = 18;
const EARTH_RADIUS_M = 6_371_008.8;

export function isValidCoordinatePair(value: Coordinates | null | undefined): value is Coordinates {
  if (!value) return false;
  const [lng, lat] = value;
  return (
    Number.isFinite(lng) &&
    Number.isFinite(lat) &&
    lat >= -85 &&
    lat <= 85 &&
    lng >= -180 &&
    lng <= 180
  );
}

export function clampLatitude(lat: number): number {
  return Math.max(-85.05112878, Math.min(85.05112878, lat));
}

export function wrapLongitude(lng: number): number {
  if (!Number.isFinite(lng)) return 0;
  return ((((lng + 180) % 360) + 360) % 360) - 180;
}

export function boundsCenterOf(bounds: CountryBounds): Coordinates {
  return [(bounds.sw[0] + bounds.ne[0]) / 2, (bounds.sw[1] + bounds.ne[1]) / 2];
}

/** Generous containment test — country boxes are approximate by design. */
export function containsPoint(
  bounds: CountryBounds,
  [lng, lat]: Coordinates,
  tolerance = 0.25,
): boolean {
  return (
    lng >= bounds.sw[0] - tolerance &&
    lng <= bounds.ne[0] + tolerance &&
    lat >= bounds.sw[1] - tolerance &&
    lat <= bounds.ne[1] + tolerance
  );
}

export function mergeBounds(bounds: CountryBounds, points: Coordinates[]): CountryBounds {
  let minLng = bounds.sw[0];
  let minLat = bounds.sw[1];
  let maxLng = bounds.ne[0];
  let maxLat = bounds.ne[1];

  for (const point of points) {
    if (!isValidCoordinatePair(point)) continue;
    const [lng, lat] = point;
    if (lng === 0 && lat === 0) continue;
    minLng = Math.min(minLng, lng);
    minLat = Math.min(minLat, lat);
    maxLng = Math.max(maxLng, lng);
    maxLat = Math.max(maxLat, lat);
  }

  return { sw: [minLng, minLat], ne: [maxLng, maxLat] };
}

/** Tight box around a set of points, or null when there is nothing to frame. */
export function boundsFromPoints(points: Coordinates[], padding = 0.08): CountryBounds | null {
  const valid = points.filter(isValidCoordinatePair);
  if (valid.length === 0) return null;

  let minLng = Number.POSITIVE_INFINITY;
  let minLat = Number.POSITIVE_INFINITY;
  let maxLng = Number.NEGATIVE_INFINITY;
  let maxLat = Number.NEGATIVE_INFINITY;

  for (const [lng, lat] of valid) {
    minLng = Math.min(minLng, lng);
    minLat = Math.min(minLat, lat);
    maxLng = Math.max(maxLng, lng);
    maxLat = Math.max(maxLat, lat);
  }

  // A single point has zero extent; give it a small window so fitBounds does
  // not zoom to the maximum level and lose all context.
  const spanLng = Math.max(maxLng - minLng, 0.02);
  const spanLat = Math.max(maxLat - minLat, 0.02);
  const padLng = spanLng * padding;
  const padLat = spanLat * padding;

  return {
    sw: [clampLng(minLng - padLng), clampLat(minLat - padLat)],
    ne: [clampLng(maxLng + padLng), clampLat(maxLat + padLat)],
  };
}

/** Great-circle distance in metres. */
export function haversineMeters(a: Coordinates, b: Coordinates): number {
  const [lng1, lat1] = a;
  const [lng2, lat2] = b;
  const φ1 = (lat1 * Math.PI) / 180;
  const φ2 = (lat2 * Math.PI) / 180;
  const Δφ = φ2 - φ1;
  const Δλ = ((lng2 - lng1) * Math.PI) / 180;
  const h = Math.sin(Δφ / 2) ** 2 + Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) ** 2;
  return 2 * EARTH_RADIUS_M * Math.asin(Math.min(1, Math.sqrt(h)));
}

/** "٤٥٠ م" / "١٢٫٣ كم" — distances read at the precision that matters. */
export function formatDistance(meters: number): string {
  if (!Number.isFinite(meters) || meters < 0) return '—';
  if (meters < 950) return `${Math.round(meters / 10) * 10} م`;
  const km = meters / 1000;
  if (km < 10) return `${(Math.round(km * 10) / 10).toLocaleString('ar-EG')} كم`;
  return `${Math.round(km).toLocaleString('ar-EG')} كم`;
}

/**
 * Orders stops into a short walking/driving chain with a nearest-neighbour
 * pass. Not the optimal tour — that is NP-hard and a day plan has under a
 * dozen stops — but it reliably removes the zig-zag of insertion order, which
 * is the actual complaint about hand-built itineraries.
 */
export function orderByNearestNeighbour<T extends { coordinates: Coordinates }>(
  stops: T[],
  start?: Coordinates,
): T[] {
  if (stops.length < 3) return [...stops];
  const remaining = [...stops];
  const ordered: T[] = [];
  let cursor: Coordinates = start ?? remaining[0].coordinates;

  while (remaining.length > 0) {
    let bestIndex = 0;
    let bestDistance = Number.POSITIVE_INFINITY;
    for (let i = 0; i < remaining.length; i += 1) {
      const distance = haversineMeters(cursor, remaining[i].coordinates);
      if (distance < bestDistance) {
        bestDistance = distance;
        bestIndex = i;
      }
    }
    const [next] = remaining.splice(bestIndex, 1);
    ordered.push(next);
    cursor = next.coordinates;
  }

  return ordered;
}

/** Total path length of an ordered chain of stops, in metres. */
export function routeLength(points: Coordinates[]): number {
  let total = 0;
  for (let i = 1; i < points.length; i += 1) {
    total += haversineMeters(points[i - 1], points[i]);
  }
  return total;
}

/** Deep link that opens the point in whichever maps app the device prefers. */
export function nativeMapsUrl(coordinates: Coordinates, label: string): string {
  const [longitude, latitude] = coordinates;
  const encoded = encodeURIComponent(label);
  const userAgent = typeof navigator === 'undefined' ? '' : navigator.userAgent;
  if (/iPad|iPhone|iPod/i.test(userAgent)) {
    return `maps://?q=${encoded}&ll=${latitude},${longitude}`;
  }
  if (/Android/i.test(userAgent)) {
    return `geo:${latitude},${longitude}?q=${latitude},${longitude}(${encoded})`;
  }
  return `https://www.google.com/maps/search/?api=1&query=${latitude},${longitude}`;
}

/** Turn-by-turn directions to the point from wherever the user is. */
export function directionsUrl(coordinates: Coordinates): string {
  const [longitude, latitude] = coordinates;
  return `https://www.google.com/maps/dir/?api=1&destination=${latitude},${longitude}`;
}

/** `24.7136, 46.6753` — the copy/paste form of a location. */
export function formatCoordinates([lng, lat]: Coordinates): string {
  return `${lat.toFixed(5)}, ${lng.toFixed(5)}`;
}

function clampLng(value: number): number {
  return Math.max(-180, Math.min(180, value));
}

function clampLat(value: number): number {
  return Math.max(-85, Math.min(85, value));
}
