import type { Coordinates, TravelPlace } from '../types';
import type { CountryBounds } from '../types';
import { boundsFromPoints, clampLatitude, wrapLongitude } from './geo';

/**
 * Screen-space grid clustering.
 *
 * MapLibre can cluster a GeoJSON source itself, but the atlas needs the marker
 * SET to be React state (each pin is a photo avatar with its own image loading
 * and press behaviour), and `querySourceFeatures` only answers for tiles that
 * happen to be loaded — which made pins blink in and out while panning. Since
 * the whole atlas is already in memory, clustering it directly is both cheaper
 * and deterministic: the same viewport always produces the same pins.
 *
 * The zoom ladder this implements is the feature's core interaction:
 *   • far out   → few big count bubbles (a country reads as one dot)
 *   • mid zoom  → tighter bubbles as regions separate
 *   • close in  → every place as its own circular photo marker
 */

/** At and above this zoom every place gets its own marker. */
export const INDIVIDUAL_ZOOM = 10.5;

/** MapLibre's internal tile size — the unit `project()` works in. */
const WORLD_TILE_SIZE = 512;

export interface PlaceMarkerItem {
  kind: 'place';
  id: string;
  coordinates: Coordinates;
  place: TravelPlace;
}

export interface ClusterMarkerItem {
  kind: 'cluster';
  id: string;
  coordinates: Coordinates;
  count: number;
  placeIds: string[];
  /** Box containing every member — clicking zooms to exactly this. */
  bounds: CountryBounds;
  /** Cover photo of a member, so a bubble is not just a number. */
  coverPhotoUrl: string | null;
}

export type MarkerItem = PlaceMarkerItem | ClusterMarkerItem;

/**
 * Cell size shrinks as the map zooms in, so bubbles break apart gradually
 * instead of all at once. 92 px at world view keeps continents readable; 56 px
 * near the individual threshold means a bubble only survives when pins would
 * genuinely overlap.
 */
function cellSizeFor(zoom: number): number {
  if (zoom < 3) return 92;
  if (zoom < 5) return 84;
  if (zoom < 7) return 72;
  if (zoom < 9) return 64;
  return 56;
}

export function buildMarkers(places: TravelPlace[], zoom: number): MarkerItem[] {
  if (places.length === 0) return [];
  if (zoom >= INDIVIDUAL_ZOOM) {
    return places.map((place) => ({
      kind: 'place' as const,
      id: place.id,
      coordinates: place.coordinates,
      place,
    }));
  }

  const worldSize = WORLD_TILE_SIZE * 2 ** zoom;
  const cell = cellSizeFor(zoom);
  const buckets = new Map<string, TravelPlace[]>();

  for (const place of places) {
    const { x, y } = projectNormalized(place.coordinates);
    const key = `${Math.floor((x * worldSize) / cell)}:${Math.floor((y * worldSize) / cell)}`;
    const bucket = buckets.get(key);
    if (bucket) bucket.push(place);
    else buckets.set(key, [place]);
  }

  const items: MarkerItem[] = [];
  for (const [key, bucket] of buckets) {
    if (bucket.length === 1) {
      const place = bucket[0];
      items.push({ kind: 'place', id: place.id, coordinates: place.coordinates, place });
      continue;
    }

    let sumLng = 0;
    let sumLat = 0;
    for (const place of bucket) {
      sumLng += place.coordinates[0];
      sumLat += place.coordinates[1];
    }

    const memberPoints = bucket.map((place) => place.coordinates);
    items.push({
      kind: 'cluster',
      // Keyed by cell so the same bubble keeps its React identity across pans
      // and animates in place rather than remounting.
      id: `cluster:${zoom.toFixed(1)}:${key}`,
      coordinates: [sumLng / bucket.length, sumLat / bucket.length],
      count: bucket.length,
      placeIds: bucket.map((place) => place.id),
      bounds: boundsFromPoints(memberPoints, 0.25) ?? {
        sw: memberPoints[0],
        ne: memberPoints[0],
      },
      coverPhotoUrl: bucket.find((place) => place.coverPhotoUrl)?.coverPhotoUrl ?? null,
    });
  }

  // Southern markers paint last so a pin never hides the one in front of it.
  return items.sort((a, b) => b.coordinates[1] - a.coordinates[1]);
}

/** Web-Mercator unit square (0–1). */
function projectNormalized([lng, lat]: Coordinates): { x: number; y: number } {
  const clampedLat = clampLatitude(lat);
  const sin = Math.sin((clampedLat * Math.PI) / 180);
  return {
    x: (wrapLongitude(lng) + 180) / 360,
    y: 0.5 - Math.log((1 + sin) / (1 - sin)) / (4 * Math.PI),
  };
}
