import { type RefObject, useEffect, useRef, useState, useSyncExternalStore } from 'react';

import {
  MapController,
  type MapControllerOptions,
  type MapSnapshot,
} from '../../lib/mapController';

/**
 * Binds a `MapController` to a component's lifetime.
 *
 * The controller is built by a lazy state initialiser so it is created exactly
 * once and never rebuilt: a map that gets re-created on a prop change loses the
 * camera position and flashes white. Reactive props (basemap, projection) are
 * pushed into it imperatively.
 *
 * `useSyncExternalStore` is deliberate too — readiness lives outside React, and
 * reading it this way avoids setting state from an effect on mount.
 */
export function useMapController(options: MapControllerOptions): {
  controller: MapController;
  snapshot: MapSnapshot;
} {
  const [controller] = useState(() => new MapController(options));
  const snapshot = useSyncExternalStore(controller.subscribe, controller.getSnapshot);

  useEffect(() => () => controller.detach(), [controller]);
  useEffect(() => {
    controller.setStyleId(options.styleId);
  }, [controller, options.styleId]);
  useEffect(() => {
    controller.setGlobe(options.globe);
  }, [controller, options.globe]);

  return { controller, snapshot };
}

/** Attaches the map to its container once the element exists. */
export function useMapAttach(
  controller: MapController,
  containerRef: RefObject<HTMLDivElement>,
): void {
  const attachedRef = useRef(false);
  useEffect(() => {
    const node = containerRef.current;
    if (!node || attachedRef.current) return;
    attachedRef.current = true;
    void controller.attach(node);
  }, [containerRef, controller]);
}

/**
 * Keeps the canvas sized to its box. A map inside a flex column keeps rendering
 * at its creation size otherwise — which is how map surfaces end up with a grey
 * strip after a sheet expands or the mobile keyboard closes.
 */
export function useMapResize(
  controller: MapController,
  containerRef: RefObject<HTMLElement>,
): void {
  useEffect(() => {
    const node = containerRef.current;
    if (!node) return;
    const observer = new ResizeObserver(() => controller.resize());
    observer.observe(node);
    return () => observer.disconnect();
  }, [containerRef, controller]);
}
