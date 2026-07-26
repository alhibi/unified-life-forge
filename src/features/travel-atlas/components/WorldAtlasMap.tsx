import { type ReactNode, useCallback, useEffect, useState } from 'react';

import type { MapStyleId } from '../data/mapStyles';
import { boundsFromPoints } from '../lib/geo';
import {
  readGlobeEnabled,
  readMapStyleId,
  writeGlobeEnabled,
  writeMapStyleId,
} from '../lib/mapPreferences';
import type { CountrySummary } from '../lib/stats';
import type { Coordinates, TravelPlace } from '../types';
import CountryBubbleOverlay from './map/CountryBubbleOverlay';
import MapControls from './map/MapControls';
import MapSurface from './map/MapSurface';
import MarkerOverlay from './map/MarkerOverlay';
import { useMapController } from './map/useMapController';
import { useVisibleMarkers } from './map/useVisibleMarkers';

interface WorldAtlasMapProps {
  summaries: CountrySummary[];
  places: TravelPlace[];
  onSelectCountry: (summary: CountrySummary) => void;
  onSelectPlace: (place: TravelPlace) => void;
  unsupportedFallback?: ReactNode;
}

/**
 * Below this zoom the world reads as countries; above it, as individual places.
 * One continuous gesture therefore takes the user from a globe to a single café.
 */
const COUNTRY_VIEW_MAX_ZOOM = 4.6;

/**
 * The atlas overview — a globe you can spin, with one bubble per country you have
 * saved something in. Keeping it a real map rather than a list of names is the
 * point: the shape of someone's travelling shows up immediately.
 */
export default function WorldAtlasMap({
  summaries,
  places,
  onSelectCountry,
  onSelectPlace,
  unsupportedFallback,
}: WorldAtlasMapProps) {
  const [styleId, setStyleId] = useState<MapStyleId>(readMapStyleId);
  const [globe, setGlobe] = useState<boolean>(readGlobeEnabled);

  const [initialCamera] = useState(() => ({
    initialCenter: [30, 22] as Coordinates,
    initialZoom: 1.7,
    minZoom: 1.2,
    padding: { top: 72, bottom: 96, left: 32, right: 32 },
  }));
  const { controller, snapshot } = useMapController({ ...initialCamera, styleId, globe });

  const { items, zoom, showLabels } = useVisibleMarkers(snapshot.map, places);
  const showCountries = zoom < COUNTRY_VIEW_MAX_ZOOM;

  const changeStyle = useCallback((next: MapStyleId) => {
    setStyleId(next);
    writeMapStyleId(next);
  }, []);

  const toggleGlobe = useCallback((next: boolean) => {
    setGlobe(next);
    writeGlobeEnabled(next);
  }, []);

  const frameAll = useCallback(() => {
    const fitted = boundsFromPoints(
      places.map((place) => place.coordinates),
      0.2,
    );
    if (fitted) controller.fitBounds(fitted, 6);
  }, [controller, places]);

  // A first-time atlas has one country; opening on the whole globe would show a
  // lone dot. Frame what exists as soon as the map is live.
  useEffect(() => {
    if (!snapshot.isReady || places.length === 0) return;
    const fitted = boundsFromPoints(
      places.map((place) => place.coordinates),
      0.6,
    );
    if (fitted) controller.fitBounds(fitted, 5);
  }, [controller, places, snapshot.isReady]);

  return (
    <MapSurface
      controller={controller}
      snapshot={snapshot}
      unsupportedFallback={unsupportedFallback}
    >
      {showCountries ? (
        <CountryBubbleOverlay
          map={snapshot.map}
          isGlobe={globe}
          summaries={summaries}
          onSelect={onSelectCountry}
        />
      ) : (
        <MarkerOverlay
          map={snapshot.map}
          isGlobe={globe}
          items={items}
          showLabels={showLabels}
          onSelectPlace={onSelectPlace}
          onExpandCluster={(cluster) => controller.fitBounds(cluster.bounds, 15)}
        />
      )}

      <MapControls
        controller={controller}
        styleId={styleId}
        onStyleChange={changeStyle}
        globe={{ enabled: globe, onToggle: toggleGlobe }}
        onFrameAll={places.length > 0 ? frameAll : undefined}
      />

      {showCountries && summaries.length > 0 && (
        <p
          className="pointer-events-none absolute inset-x-3 bottom-3 mx-auto max-w-xs rounded-card border border-border bg-background/95 px-3 py-2 text-center text-micro text-muted-foreground"
          dir="rtl"
        >
          حجم الدائرة يعبّر عن عدد الأماكن — اقترب لتظهر الأماكن نفسها
        </p>
      )}
    </MapSurface>
  );
}
