import type { Map as MapLibreMap, StyleSpecification } from 'maplibre-gl';

import { mapStyleEntry, type MapStyleId } from '../data/mapStyles';
import type { Coordinates, CountryBounds } from '../types';
import { MAX_ZOOM, MIN_ZOOM } from './geo';

/**
 * Owns the MapLibre instance outside React.
 *
 * A map is a long-lived imperative object with its own animation loop; trying to
 * express it as render output means either re-creating it on every prop change
 * (a white flash and a lost camera position) or storing it in state from an
 * effect. Instead the controller is a plain observable that React reads through
 * `useSyncExternalStore`, and every camera command is a method call.
 */

export interface MapControllerOptions {
  styleId: MapStyleId;
  globe: boolean;
  initialBounds?: CountryBounds | null;
  initialCenter?: Coordinates;
  initialZoom?: number;
  minZoom?: number;
  maxZoom?: number;
  interactive?: boolean;
  /** Reserve space so pins never sit under the header or the bottom sheet. */
  padding?: { top: number; bottom: number; left: number; right: number };
}

export interface MapSnapshot {
  map: MapLibreMap | null;
  isReady: boolean;
  /** Arabic, user-facing. Null while healthy. */
  error: string | null;
  isSupported: boolean;
}

type Listener = () => void;

/**
 * WebGL is unavailable on locked-down corporate browsers and on some low-memory
 * Android devices. The atlas must fall back to its list view rather than render
 * a blank rectangle, so support is probed before a map is ever constructed.
 */
export function isWebglAvailable(): boolean {
  if (typeof document === 'undefined') return false;
  try {
    const canvas = document.createElement('canvas');
    return Boolean(
      canvas.getContext('webgl2') ??
      canvas.getContext('webgl') ??
      canvas.getContext('experimental-webgl'),
    );
  } catch {
    return false;
  }
}

export class MapController {
  private options: MapControllerOptions;
  private instance: MapLibreMap | null = null;
  private listeners = new Set<Listener>();
  private snapshot: MapSnapshot;
  private container: HTMLElement | null = null;
  private disposed = false;
  private styleReloadTimer: number | null = null;

  constructor(options: MapControllerOptions) {
    this.options = options;
    this.snapshot = {
      map: null,
      isReady: false,
      error: null,
      isSupported: isWebglAvailable(),
    };
  }

  subscribe = (listener: Listener): (() => void) => {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  };

  getSnapshot = (): MapSnapshot => this.snapshot;

  get map(): MapLibreMap | null {
    return this.instance;
  }

  /** Creates the map on first attach; re-attaching after HMR is a no-op. */
  async attach(container: HTMLElement): Promise<void> {
    if (this.disposed || this.instance || !this.snapshot.isSupported) return;
    this.container = container;

    // MapLibre is ~950 kB parsed and its stylesheet is another 40 kB. Loading
    // both here keeps them out of every chunk that merely imports the atlas
    // types — and out of the bundle entirely for visitors who never open a map.
    // The stylesheet is required, not optional: without it the attribution and
    // canvas sizing rules are missing.
    const [maplibre] = await Promise.all([
      import('maplibre-gl'),
      import('maplibre-gl/dist/maplibre-gl.css'),
    ]);
    if (this.disposed || !this.container) return;

    const entry = mapStyleEntry(this.options.styleId);
    const map = new maplibre.Map({
      container,
      style: entry.style as string | StyleSpecification,
      minZoom: this.options.minZoom ?? MIN_ZOOM,
      maxZoom: this.options.maxZoom ?? MAX_ZOOM,
      interactive: this.options.interactive ?? true,
      attributionControl: false,
      // The atlas is a reading surface: an accidental two-finger rotate leaves
      // people lost with no obvious way back to north.
      pitchWithRotate: false,
      dragRotate: false,
      touchZoomRotate: true,
      ...(this.options.initialBounds
        ? {
            bounds: [this.options.initialBounds.sw, this.options.initialBounds.ne],
            fitBoundsOptions: { padding: this.fitPadding(), maxZoom: 12 },
          }
        : {
            center: this.options.initialCenter ?? [20, 25],
            zoom: this.options.initialZoom ?? 1.6,
          }),
    });

    this.instance = map;
    map.addControl(new maplibre.AttributionControl({ compact: true }), 'bottom-right');
    if (this.options.globe) this.applyProjection(true);

    map.on('load', () => this.patch({ map, isReady: true, error: null }));
    map.on('error', (event: { error?: { message?: string; status?: number } }) => {
      // Individual tile 404s are normal at the edge of coverage and must not
      // put an error banner over a working map.
      const status = event?.error?.status;
      if (status === 404 || status === 403) return;
      console.warn('[TravelAtlas] map error', event?.error);
      this.patch({ error: 'تعذّر تحميل الخريطة بالكامل' });
    });

    this.publish();
  }

  detach(): void {
    this.disposed = true;
    if (this.styleReloadTimer !== null) {
      clearTimeout(this.styleReloadTimer);
      this.styleReloadTimer = null;
    }
    this.instance?.remove();
    this.instance = null;
    this.container = null;
    this.listeners.clear();
  }

  setStyleId(styleId: MapStyleId): void {
    if (this.options.styleId === styleId) return;
    this.options = { ...this.options, styleId };
    const map = this.instance;
    if (!map) return;
    const entry = mapStyleEntry(styleId);
    this.patch({ error: null });
    map.setStyle(entry.style as string | StyleSpecification);
    // Globe survives a style swap in MapLibre, but a style that declares its own
    // projection would override it — re-assert after the new style settles.
    if (this.options.globe) {
      this.styleReloadTimer = window.setTimeout(() => this.applyProjection(true), 60);
    }
  }

  setGlobe(globe: boolean): void {
    if (this.options.globe === globe) return;
    this.options = { ...this.options, globe };
    this.applyProjection(globe);
  }

  get styleId(): MapStyleId {
    return this.options.styleId;
  }

  get isGlobe(): boolean {
    return this.options.globe;
  }

  fitBounds(bounds: CountryBounds, maxZoom = 14): void {
    this.instance?.fitBounds([bounds.sw, bounds.ne], {
      padding: this.fitPadding(),
      maxZoom,
      duration: 650,
    });
  }

  flyTo(center: Coordinates, zoom?: number): void {
    this.instance?.flyTo({
      center,
      zoom: zoom ?? Math.max(this.instance.getZoom(), 12),
      duration: 700,
      essential: true,
    });
  }

  easeTo(center: Coordinates, zoom?: number): void {
    this.instance?.easeTo({ center, zoom, duration: 380 });
  }

  zoomBy(delta: number): void {
    const map = this.instance;
    if (!map) return;
    map.easeTo({ zoom: map.getZoom() + delta, duration: 260 });
  }

  resize(): void {
    this.instance?.resize();
  }

  private applyProjection(globe: boolean): void {
    const map = this.instance;
    if (!map) return;
    try {
      map.setProjection({ type: globe ? 'globe' : 'mercator' });
    } catch (error) {
      // Older WebGL stacks reject the globe shader; flat is a fine fallback.
      console.warn('[TravelAtlas] projection unsupported', error);
    }
  }

  private fitPadding() {
    const { padding } = this.options;
    return padding ?? { top: 48, bottom: 48, left: 48, right: 48 };
  }

  private patch(next: Partial<MapSnapshot>): void {
    this.snapshot = { ...this.snapshot, ...next };
    this.publish();
  }

  private publish(): void {
    for (const listener of this.listeners) listener();
  }
}
