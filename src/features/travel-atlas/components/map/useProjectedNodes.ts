import type { Map as MapLibreMap } from 'maplibre-gl';
import { useCallback, useEffect, useRef } from 'react';

import type { Coordinates } from '../../types';

export interface ProjectedItem {
  id: string;
  coordinates: Coordinates;
}

/** Keeps a pin alive slightly outside the viewport so panning feels seamless. */
const VIEWPORT_MARGIN_PX = 96;
/** Past this angle from the map centre, a point is behind the globe. */
const GLOBE_HORIZON_DEG = 74;

/**
 * Glues absolutely-positioned DOM overlays to map coordinates.
 *
 * Positions are written straight to `style.transform` inside a
 * requestAnimationFrame driven by the map's own render loop — never through
 * React state. Re-rendering dozens of components per frame drops a phone to
 * single-digit FPS; this keeps overlays locked to the map at 60.
 */
export function useProjectedNodes(
  map: MapLibreMap | null,
  items: ProjectedItem[],
  isGlobe = false,
): (id: string, node: HTMLElement | null) => void {
  const nodesRef = useRef(new Map<string, HTMLElement>());
  const itemsRef = useRef<ProjectedItem[]>(items);

  const registerNode = useCallback((id: string, node: HTMLElement | null) => {
    if (node) nodesRef.current.set(id, node);
    else nodesRef.current.delete(id);
  }, []);

  useEffect(() => {
    itemsRef.current = items;
  }, [items]);

  useEffect(() => {
    if (!map) return;
    let frame = 0;

    const position = () => {
      const canvas = map.getCanvas();
      const width = canvas.clientWidth;
      const height = canvas.clientHeight;
      const center = map.getCenter();
      const centerCoords: Coordinates = [center.lng, center.lat];

      for (const item of itemsRef.current) {
        const node = nodesRef.current.get(item.id);
        if (!node) continue;

        const point = map.project(item.coordinates);
        const outside =
          point.x < -VIEWPORT_MARGIN_PX ||
          point.y < -VIEWPORT_MARGIN_PX ||
          point.x > width + VIEWPORT_MARGIN_PX ||
          point.y > height + VIEWPORT_MARGIN_PX;
        const behindGlobe =
          isGlobe && angularDistanceDeg(centerCoords, item.coordinates) > GLOBE_HORIZON_DEG;

        if (outside || behindGlobe) {
          node.style.visibility = 'hidden';
          continue;
        }

        node.style.visibility = 'visible';
        node.style.transform = `translate3d(${Math.round(point.x)}px, ${Math.round(point.y)}px, 0)`;
      }
    };

    const schedule = () => {
      if (frame !== 0) return;
      frame = requestAnimationFrame(() => {
        frame = 0;
        position();
      });
    };

    schedule();
    map.on('move', schedule);
    map.on('zoom', schedule);
    map.on('resize', schedule);
    map.on('render', schedule);

    return () => {
      if (frame !== 0) cancelAnimationFrame(frame);
      map.off('move', schedule);
      map.off('zoom', schedule);
      map.off('resize', schedule);
      map.off('render', schedule);
    };
  }, [isGlobe, items, map]);

  return registerNode;
}

/** Great-circle separation in degrees — a cheap globe back-face test. */
function angularDistanceDeg(a: Coordinates, b: Coordinates): number {
  const toRad = Math.PI / 180;
  const [lng1, lat1] = a;
  const [lng2, lat2] = b;
  const cosine =
    Math.sin(lat1 * toRad) * Math.sin(lat2 * toRad) +
    Math.cos(lat1 * toRad) * Math.cos(lat2 * toRad) * Math.cos((lng2 - lng1) * toRad);
  return Math.acos(Math.max(-1, Math.min(1, cosine))) / toRad;
}
