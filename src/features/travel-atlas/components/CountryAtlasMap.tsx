import { type ReactNode, useCallback, useEffect, useState } from 'react';

import { MapPin } from '@/lib/icons';

import { VISIT_STATUS_META } from '../data/categories';
import { type MapStyleId } from '../data/mapStyles';
import { boundsFromPoints } from '../lib/geo';
import { readMapStyleId, writeMapStyleId } from '../lib/mapPreferences';
import type { Coordinates, CountryBounds, TravelPlace } from '../types';
import MapControls from './map/MapControls';
import MapSurface from './map/MapSurface';
import MarkerOverlay from './map/MarkerOverlay';
import { useMapController } from './map/useMapController';
import { useVisibleMarkers } from './map/useVisibleMarkers';

interface CountryAtlasMapProps {
  places: TravelPlace[];
  bounds: CountryBounds;
  activePlaceId?: string | null;
  /** Changing this flies the camera — used when a list row is tapped. */
  focusCoordinates?: Coordinates | null;
  onSelectPlace: (place: TravelPlace) => void;
  /** Rendered in place of the canvas when the device has no WebGL. */
  unsupportedFallback?: ReactNode;
}

/**
 * The country map: the screen the whole feature exists for.
 *
 * Zooming in walks the disclosure ladder — grouped counts, then separated
 * groups, then every place as its own photo pin with a name. Clicking a group
 * frames exactly its members rather than guessing a zoom level, so two taps
 * reliably get from "twelve places in this region" to the one you meant.
 */
export default function CountryAtlasMap({
  places,
  bounds,
  activePlaceId,
  focusCoordinates,
  onSelectPlace,
  unsupportedFallback,
}: CountryAtlasMapProps) {
  const [styleId, setStyleId] = useState<MapStyleId>(readMapStyleId);

  // Camera setup is read once, at construction. Everything reactive (basemap,
  // projection) is pushed into the controller by `useMapController`.
  const [initialCamera] = useState(() => ({
    initialBounds: bounds,
    // Leaves room for the toolbar above and the peek sheet below.
    padding: { top: 72, bottom: 120, left: 40, right: 40 },
  }));
  const { controller, snapshot } = useMapController({
    ...initialCamera,
    styleId,
    globe: false,
  });

  const { items, isClustered, showLabels } = useVisibleMarkers(snapshot.map, places);

  const changeStyle = useCallback((next: MapStyleId) => {
    setStyleId(next);
    writeMapStyleId(next);
  }, []);

  const frameAll = useCallback(() => {
    const fitted = boundsFromPoints(
      places.map((place) => place.coordinates),
      0.15,
    );
    controller.fitBounds(fitted ?? bounds, 13);
  }, [bounds, controller, places]);

  useEffect(() => {
    if (focusCoordinates) controller.flyTo(focusCoordinates, 14);
  }, [controller, focusCoordinates]);

  return (
    <MapSurface
      controller={controller}
      snapshot={snapshot}
      unsupportedFallback={unsupportedFallback}
    >
      <MarkerOverlay
        map={snapshot.map}
        items={items}
        activePlaceId={activePlaceId}
        showLabels={showLabels}
        onSelectPlace={onSelectPlace}
        onExpandCluster={(cluster) => controller.fitBounds(cluster.bounds, 15)}
      />

      <MapControls
        controller={controller}
        styleId={styleId}
        onStyleChange={changeStyle}
        onFrameAll={places.length > 0 ? frameAll : undefined}
      />

      {places.length === 0 ? (
        <p
          className="pointer-events-none absolute inset-x-4 top-4 mx-auto max-w-xs rounded-card border border-border bg-background px-4 py-3 text-center text-body text-muted-foreground"
          dir="rtl"
        >
          لا أماكن على هذه الخريطة بعد.
        </p>
      ) : (
        <div
          className="pointer-events-none absolute inset-x-3 bottom-3 flex flex-wrap items-center justify-between gap-2"
          dir="rtl"
        >
          <ul className="flex items-center gap-3 rounded-card border border-border bg-background/95 px-3 py-2">
            {VISIT_STATUS_META.map((status) => (
              <li
                key={status.value}
                className="flex items-center gap-1.5 text-micro text-muted-foreground"
              >
                <span
                  className="inline-block h-2.5 w-2.5 rounded-full border-2"
                  style={{ borderColor: status.color }}
                  aria-hidden="true"
                />
                {status.label}
              </li>
            ))}
          </ul>
          {isClustered && (
            <p className="flex items-center gap-1.5 rounded-card border border-border bg-background/95 px-3 py-2 text-micro text-muted-foreground">
              <MapPin className="h-3.5 w-3.5" aria-hidden="true" />
              اقترب أكثر لتظهر الأماكن بصورها
            </p>
          )}
        </div>
      )}

      {snapshot.error && (
        <p
          className="absolute inset-x-4 top-4 mx-auto max-w-sm rounded-card border border-border bg-background px-3 py-2 text-center text-mini text-foreground"
          role="status"
          dir="rtl"
        >
          {snapshot.error}
        </p>
      )}
    </MapSurface>
  );
}
