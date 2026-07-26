import type { StyleSpecification } from 'maplibre-gl';

/**
 * Basemap catalog.
 *
 * Four looks, each earning its place: a quiet light base for reading pins, a
 * detailed one for actually navigating a city, a dark one that stops the map
 * from being the brightest object on screen in the dark theme, and satellite
 * for recognising terrain. All are key-free endpoints.
 */

export type MapStyleId = 'calm' | 'detailed' | 'night' | 'satellite';

export interface MapStyleEntry {
  id: MapStyleId;
  label: string;
  hint: string;
  /** Vector styles are URLs; satellite is an inline raster style. */
  style: string | StyleSpecification;
  /** Drives the marker contrast treatment (light rings on dark basemaps). */
  tone: 'light' | 'dark';
  attribution: string;
}

const SATELLITE_ATTRIBUTION = 'Esri, Maxar, Earthstar Geographics';

/**
 * Esri World Imagery as a plain raster source. MapLibre needs a full style
 * object for raster-only basemaps — there is no hosted style JSON for it.
 */
const SATELLITE_STYLE: StyleSpecification = {
  version: 8,
  sources: {
    'esri-imagery': {
      type: 'raster',
      tiles: [
        'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
      ],
      tileSize: 256,
      maxzoom: 18,
      attribution: SATELLITE_ATTRIBUTION,
    },
  },
  layers: [
    {
      id: 'esri-imagery',
      type: 'raster',
      source: 'esri-imagery',
    },
  ],
};

export const MAP_STYLES: readonly MapStyleEntry[] = [
  {
    id: 'calm',
    label: 'هادئ',
    hint: 'خريطة فاتحة تُبرز الأماكن',
    style: 'https://tiles.openfreemap.org/styles/positron',
    tone: 'light',
    attribution: 'OpenFreeMap · OpenMapTiles · OpenStreetMap',
  },
  {
    id: 'detailed',
    label: 'مفصّل',
    hint: 'شوارع ومعالم وأسماء',
    style: 'https://tiles.openfreemap.org/styles/liberty',
    tone: 'light',
    attribution: 'OpenFreeMap · OpenMapTiles · OpenStreetMap',
  },
  {
    id: 'night',
    label: 'ليلي',
    hint: 'يناسب الوضع الداكن',
    style: 'https://tiles.openfreemap.org/styles/dark',
    tone: 'dark',
    attribution: 'OpenFreeMap · OpenMapTiles · OpenStreetMap',
  },
  {
    id: 'satellite',
    label: 'أقمار صناعية',
    hint: 'صور جوية للتضاريس',
    style: SATELLITE_STYLE,
    tone: 'dark',
    attribution: SATELLITE_ATTRIBUTION,
  },
] as const;

export const DEFAULT_MAP_STYLE_ID: MapStyleId = 'calm';

export function mapStyleEntry(id: MapStyleId): MapStyleEntry {
  return MAP_STYLES.find((entry) => entry.id === id) ?? MAP_STYLES[0];
}

export function isMapStyleId(value: unknown): value is MapStyleId {
  return MAP_STYLES.some((entry) => entry.id === value);
}
