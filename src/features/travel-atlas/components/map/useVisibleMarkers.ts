import type { Map as MapLibreMap } from 'maplibre-gl';
import { useEffect, useState } from 'react';

import { buildMarkers, type MarkerItem } from '../../lib/clustering';
import type { TravelPlace } from '../../types';

interface VisibleMarkers {
  items: MarkerItem[];
  zoom: number;
  /** True while pins are still grouped, so the UI can invite a closer look. */
  isClustered: boolean;
  showLabels: boolean;
}

/** Below this zoom the viewport covers so much of the world that culling is moot. */
const CULL_FROM_ZOOM = 4;
/** Names only fit once places are meaningfully separated. */
const LABEL_ZOOM = 12.5;

/**
 * The marker set for the current camera.
 *
 * Recomputed on `moveend` / `zoomend` rather than every frame: the overlay keeps
 * existing pins glued to the map continuously, so re-deriving the SET mid-gesture
 * buys nothing and costs a full React reconciliation per frame. The first pass is
 * scheduled in a frame callback so the canvas has its real size by then.
 */
export function useVisibleMarkers(map: MapLibreMap | null, places: TravelPlace[]): VisibleMarkers {
  const [state, setState] = useState<VisibleMarkers>({
    items: [],
    zoom: 0,
    isClustered: false,
    showLabels: false,
  });

  useEffect(() => {
    if (!map) return;
    let frame = 0;

    const recompute = () => {
      const zoom = map.getZoom();
      const all = buildMarkers(places, roundZoom(zoom));
      const items = zoom < CULL_FROM_ZOOM ? all : cullToViewport(map, all);
      setState({
        items,
        zoom,
        isClustered: items.some((item) => item.kind === 'cluster'),
        showLabels: zoom >= LABEL_ZOOM,
      });
    };

    const schedule = () => {
      if (frame !== 0) return;
      frame = requestAnimationFrame(() => {
        frame = 0;
        recompute();
      });
    };

    schedule();
    map.on('load', schedule);
    map.on('moveend', schedule);
    map.on('zoomend', schedule);

    return () => {
      if (frame !== 0) cancelAnimationFrame(frame);
      map.off('load', schedule);
      map.off('moveend', schedule);
      map.off('zoomend', schedule);
    };
  }, [map, places]);

  return state;
}

/** Half-zoom granularity: enough to break clusters apart smoothly, few enough
 *  distinct values that panning around a city never re-clusters needlessly. */
function roundZoom(zoom: number): number {
  return Math.round(zoom * 2) / 2;
}

function cullToViewport(map: MapLibreMap, items: MarkerItem[]): MarkerItem[] {
  let west: number;
  let east: number;
  let south: number;
  let north: number;
  try {
    const bounds = map.getBounds();
    west = bounds.getWest();
    east = bounds.getEast();
    south = bounds.getSouth();
    north = bounds.getNorth();
  } catch {
    // Globe projection can refuse to answer near the poles; showing everything
    // is the safe direction to fail in.
    return items;
  }

  const padLng = Math.max((east - west) * 0.25, 0.01);
  const padLat = Math.max((north - south) * 0.25, 0.01);
  // A viewport crossing the antimeridian reports west > east; culling there
  // would hide half the pins, so it is skipped.
  if (west > east) return items;

  return items.filter((item) => {
    const [lng, lat] = item.coordinates;
    return (
      lng >= west - padLng && lng <= east + padLng && lat >= south - padLat && lat <= north + padLat
    );
  });
}
