import type { Coordinates, CountryBounds } from './types';

export const TILE_SIZE = 256;
export const MIN_ZOOM = 2;
export const MAX_ZOOM = 16;

export interface PixelPoint {
  x: number;
  y: number;
}

export interface ViewportState {
  center: Coordinates;
  zoom: number;
}

export function isValidCoordinatePair(value: Coordinates | null | undefined): value is Coordinates {
  if (!value) return false;
  const [lng, lat] = value;
  return Number.isFinite(lng) && Number.isFinite(lat) && lat >= -85 && lat <= 85 && lng >= -180 && lng <= 180;
}

export function clampLatitude(lat: number): number {
  return Math.max(-85.05112878, Math.min(85.05112878, lat));
}

export function wrapLongitude(lng: number): number {
  if (!Number.isFinite(lng)) return 0;
  return ((((lng + 180) % 360) + 360) % 360) - 180;
}

export function projectLngLat([lng, lat]: Coordinates, zoom: number): PixelPoint {
  const scale = TILE_SIZE * 2 ** zoom;
  const clampedLat = clampLatitude(lat);
  const sin = Math.sin((clampedLat * Math.PI) / 180);
  return {
    x: ((wrapLongitude(lng) + 180) / 360) * scale,
    y: (0.5 - Math.log((1 + sin) / (1 - sin)) / (4 * Math.PI)) * scale,
  };
}

export function unprojectPoint(point: PixelPoint, zoom: number): Coordinates {
  const scale = TILE_SIZE * 2 ** zoom;
  const lng = (point.x / scale) * 360 - 180;
  const n = Math.PI - (2 * Math.PI * point.y) / scale;
  const lat = (180 / Math.PI) * Math.atan(0.5 * (Math.exp(n) - Math.exp(-n)));
  return [wrapLongitude(lng), clampLatitude(lat)];
}

export function containsPoint(bounds: CountryBounds, [lng, lat]: Coordinates, tolerance = 0.25): boolean {
  return (
    lng >= bounds.sw[0] - tolerance &&
    lng <= bounds.ne[0] + tolerance &&
    lat >= bounds.sw[1] - tolerance &&
    lat <= bounds.ne[1] + tolerance
  );
}

export function fitBounds(bounds: CountryBounds, width: number, height: number, maxZoom = 12): ViewportState {
  const safeWidth = Math.max(width, 320);
  const safeHeight = Math.max(height, 320);
  const padding = Math.min(96, Math.max(34, Math.min(safeWidth, safeHeight) * 0.12));
  const center: Coordinates = [
    (bounds.sw[0] + bounds.ne[0]) / 2,
    (bounds.sw[1] + bounds.ne[1]) / 2,
  ];

  for (let zoom = maxZoom; zoom >= MIN_ZOOM; zoom -= 1) {
    const sw = projectLngLat(bounds.sw, zoom);
    const ne = projectLngLat(bounds.ne, zoom);
    const boundsWidth = Math.abs(ne.x - sw.x);
    const boundsHeight = Math.abs(sw.y - ne.y);
    if (boundsWidth <= safeWidth - padding * 2 && boundsHeight <= safeHeight - padding * 2) {
      return { center, zoom };
    }
  }

  return { center, zoom: MIN_ZOOM };
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

export function visibleTiles(center: Coordinates, zoom: number, width: number, height: number) {
  const scaleTiles = 2 ** zoom;
  const centerPx = projectLngLat(center, zoom);
  const topLeft = { x: centerPx.x - width / 2, y: centerPx.y - height / 2 };
  const startX = Math.floor(topLeft.x / TILE_SIZE) - 1;
  const endX = Math.floor((topLeft.x + width) / TILE_SIZE) + 1;
  const startY = Math.max(0, Math.floor(topLeft.y / TILE_SIZE) - 1);
  const endY = Math.min(scaleTiles - 1, Math.floor((topLeft.y + height) / TILE_SIZE) + 1);
  const tiles: { key: string; x: number; y: number; wrappedX: number; left: number; top: number }[] = [];

  for (let x = startX; x <= endX; x += 1) {
    const wrappedX = ((x % scaleTiles) + scaleTiles) % scaleTiles;
    for (let y = startY; y <= endY; y += 1) {
      tiles.push({
        key: `${zoom}-${x}-${y}`,
        x,
        y,
        wrappedX,
        left: x * TILE_SIZE - topLeft.x,
        top: y * TILE_SIZE - topLeft.y,
      });
    }
  }
  return { tiles, topLeft };
}