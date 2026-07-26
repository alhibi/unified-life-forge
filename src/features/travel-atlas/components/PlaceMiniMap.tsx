import { useMemo, useState } from 'react';

import { MapPin } from '@/lib/icons';

import type { MapStyleId } from '../data/mapStyles';
import { readMapStyleId } from '../lib/mapPreferences';
import type { Coordinates } from '../types';
import MapSurface from './map/MapSurface';
import { useMapController } from './map/useMapController';
import { useProjectedNodes } from './map/useProjectedNodes';

interface PlaceMiniMapProps {
  coordinates: Coordinates;
  label: string;
  zoom?: number;
}

/**
 * Context map on a place page: where this is, and roughly what is around it.
 *
 * Interactive rather than a static image, because the first question after
 * "where" is "what else is near" — but it never steals the page scroll, so
 * dragging vertically still scrolls the article.
 */
export default function PlaceMiniMap({ coordinates, label, zoom = 13 }: PlaceMiniMapProps) {
  const [styleId] = useState<MapStyleId>(readMapStyleId);
  const [initialCamera] = useState(() => ({
    initialCenter: coordinates,
    initialZoom: zoom,
    padding: { top: 24, bottom: 24, left: 24, right: 24 },
  }));
  const { controller, snapshot } = useMapController({ ...initialCamera, styleId, globe: false });

  const items = useMemo(() => [{ id: 'self', coordinates }], [coordinates]);
  const registerNode = useProjectedNodes(snapshot.map, items);

  return (
    <div className="h-52 overflow-hidden rounded-card border border-border">
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
          <div
            ref={(node) => registerNode('self', node)}
            className="travel-marker-anchor"
            style={{ visibility: 'hidden' }}
          >
            <span className="travel-marker">
              <MapPin
                className="h-8 w-8 text-[hsl(var(--live))]"
                fill="currentColor"
                aria-label={label}
              />
            </span>
          </div>
        </div>
      </MapSurface>
    </div>
  );
}
