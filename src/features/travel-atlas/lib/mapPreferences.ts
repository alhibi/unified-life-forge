import { DEFAULT_MAP_STYLE_ID, isMapStyleId, type MapStyleId } from '../data/mapStyles';

/**
 * Map chrome the user set once and expects to find again — basemap, globe vs
 * flat, and whether the atlas opens on the map or the list. Kept in
 * localStorage rather than the database because it is device-shaped: the same
 * person wants satellite on a phone and the detailed street map on a laptop.
 */

const STYLE_KEY = 'travel-atlas:map-style';
const GLOBE_KEY = 'travel-atlas:globe';
const VIEW_KEY = 'travel-atlas:atlas-view';

export type AtlasView = 'map' | 'list';

function read(key: string): string | null {
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
}

function write(key: string, value: string): void {
  try {
    localStorage.setItem(key, value);
  } catch {
    // Private-mode storage denial is not worth surfacing — the map still works,
    // it just forgets the choice on reload.
  }
}

export function readMapStyleId(): MapStyleId {
  const stored = read(STYLE_KEY);
  return isMapStyleId(stored) ? stored : DEFAULT_MAP_STYLE_ID;
}

export function writeMapStyleId(id: MapStyleId): void {
  write(STYLE_KEY, id);
}

export function readGlobeEnabled(): boolean {
  return read(GLOBE_KEY) !== 'false';
}

export function writeGlobeEnabled(enabled: boolean): void {
  write(GLOBE_KEY, enabled ? 'true' : 'false');
}

const CAMERA_KEY = 'travel-atlas:explore-camera';

export interface StoredCamera {
  center: [number, number];
  zoom: number;
}

/**
 * The explore map reopens where it was left.
 *
 * A detailed map is a place you were working in — reopening it on the whole
 * planet throws away the navigation the user already did.
 */
export function readExploreCamera(): StoredCamera | null {
  const raw = read(CAMERA_KEY);
  if (!raw) return null;
  try {
    const parsed: unknown = JSON.parse(raw);
    if (!parsed || typeof parsed !== 'object') return null;
    const { center, zoom } = parsed as { center?: unknown; zoom?: unknown };
    if (
      Array.isArray(center) &&
      center.length === 2 &&
      center.every((value) => typeof value === 'number' && Number.isFinite(value)) &&
      typeof zoom === 'number' &&
      Number.isFinite(zoom)
    ) {
      return { center: [center[0], center[1]], zoom };
    }
  } catch {
    // Corrupt value: fall through to the default camera.
  }
  return null;
}

export function writeExploreCamera(camera: StoredCamera): void {
  write(CAMERA_KEY, JSON.stringify(camera));
}

export function readAtlasView(): AtlasView {
  return read(VIEW_KEY) === 'list' ? 'list' : 'map';
}

export function writeAtlasView(view: AtlasView): void {
  write(VIEW_KEY, view);
}
