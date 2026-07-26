import type { Map as MapLibreMap } from 'maplibre-gl';
import { useEffect, useMemo, useState } from 'react';

import type { MapStyleId } from '../data/mapStyles';
import { boundsFromPoints } from '../lib/geo';
import { readMapStyleId } from '../lib/mapPreferences';
import type { Coordinates, TravelPlace } from '../types';
import MapSurface from './map/MapSurface';
import { useMapController } from './map/useMapController';
import { useProjectedNodes } from './map/useProjectedNodes';

interface TripRouteMapProps {
  /** Ordered stops for one day. Order is the route. */
  places: TravelPlace[];
  className?: string;
}

const ROUTE_SOURCE = 'trip-route';

/**
 * A day, drawn.
 *
 * A numbered list tells you the order; it does not tell you that stop four is
 * across the city from stop three. Seeing the line is what makes someone move a
 * stop to another day, which is the entire reason the planner exists.
 *
 * The line is a real GeoJSON layer rather than SVG over the canvas, because it
 * has to stay glued to the map through every zoom and rotation — the markers can
 * be DOM (they carry photos and numbers), but the path cannot.
 */
export default function TripRouteMap({ places, className }: TripRouteMapProps) {
  const [styleId] = useState<MapStyleId>(readMapStyleId);

  const points = useMemo(() => places.map((place) => place.coordinates), [places]);

  const [initialCamera] = useState(() => ({
    initialBounds: boundsFromPoints(points, 0.35),
    initialCenter: (points[0] ?? [39.8262, 21.4225]) as Coordinates,
    initialZoom: 11,
    padding: { top: 32, bottom: 32, left: 32, right: 32 },
  }));
  const { controller, snapshot } = useMapController({ ...initialCamera, styleId, globe: false });

  const items = useMemo(
    () =>
      places.map((place, index) => ({
        id: `${place.id}:${index}`,
        coordinates: place.coordinates,
      })),
    [places],
  );
  const registerNode = useProjectedNodes(snapshot.map, items);

  // Re-frame whenever the day changes, so switching days never leaves the
  // camera pointing at yesterday.
  useEffect(() => {
    if (!snapshot.isReady) return;
    const fitted = boundsFromPoints(points, 0.35);
    if (fitted) controller.fitBounds(fitted, 15);
  }, [controller, points, snapshot.isReady]);

  useEffect(() => {
    const map = snapshot.map;
    if (!map || points.length < 2) return;
    let cancelled = false;

    const draw = () => {
      if (cancelled || !map.isStyleLoaded()) return;
      drawRoute(map, points);
    };

    draw();
    // A basemap switch wipes every custom source, so the line is re-added on
    // each style load rather than only once.
    map.on('styledata', draw);
    return () => {
      cancelled = true;
      map.off('styledata', draw);
    };
  }, [points, snapshot.map]);

  if (places.length === 0) return null;

  return (
    <div className={className ?? 'h-56 overflow-hidden rounded-card border border-border'}>
      <MapSurface
        controller={controller}
        snapshot={snapshot}
        unsupportedFallback={
          <div className="grid h-full place-items-center text-mini text-muted-foreground">
            الخريطة غير متاحة على هذا الجهاز
          </div>
        }
      >
        <div className="pointer-events-none absolute inset-0 overflow-hidden">
          {places.map((place, index) => (
            <div
              key={`${place.id}:${index}`}
              ref={(node) => registerNode(`${place.id}:${index}`, node)}
              className="travel-marker-anchor"
              style={{ visibility: 'hidden' }}
            >
              <span className="travel-route-stop">{index + 1}</span>
            </div>
          ))}
        </div>
      </MapSurface>
    </div>
  );
}

/** Adds or updates the day's path. Idempotent, so it is safe to call on redraw. */
function drawRoute(map: MapLibreMap, points: Coordinates[]): void {
  const data = {
    type: 'Feature' as const,
    properties: {},
    geometry: { type: 'LineString' as const, coordinates: points },
  };

  const existing = map.getSource(ROUTE_SOURCE);
  if (existing) {
    (existing as { setData?: (value: typeof data) => void }).setData?.(data);
    return;
  }

  map.addSource(ROUTE_SOURCE, { type: 'geojson', data });
  map.addLayer({
    id: `${ROUTE_SOURCE}-line`,
    type: 'line',
    source: ROUTE_SOURCE,
    layout: { 'line-cap': 'round', 'line-join': 'round' },
    paint: {
      // The app's single accent, read from the stylesheet so the line follows
      // the user's theme instead of hard-coding a colour.
      'line-color': readAccentColor(),
      'line-width': 3,
      // Dashed on purpose: this is the order of stops, not a driving route, and
      // a solid line would imply turn-by-turn guidance the app is not giving.
      'line-dasharray': [2, 1.5],
    },
  });
}

function readAccentColor(): string {
  if (typeof document === 'undefined') return '#c2410c';
  const live = getComputedStyle(document.documentElement).getPropertyValue('--live').trim();
  return live ? `hsl(${live})` : '#c2410c';
}
