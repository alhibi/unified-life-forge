import { type ReactNode, useRef } from 'react';

import { cn } from '@/lib/utils';

import type { MapController, MapSnapshot } from '../../lib/mapController';
import { useMapAttach, useMapResize } from './useMapController';

interface MapSurfaceProps {
  controller: MapController;
  snapshot: MapSnapshot;
  className?: string;
  /** Overlays (markers, controls, legends) — rendered above the canvas. */
  children?: ReactNode;
  /** Shown instead of the canvas when the device has no WebGL. */
  unsupportedFallback?: ReactNode;
}

/**
 * The canvas plus its overlay stack.
 *
 * `dir="ltr"` is forced: a map is physical geography, so east must stay on the
 * right even though the surrounding app is right-to-left. Text inside overlays
 * opts back into RTL where it needs to.
 */
export default function MapSurface({
  controller,
  snapshot,
  className,
  children,
  unsupportedFallback,
}: MapSurfaceProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  useMapAttach(controller, containerRef);
  useMapResize(controller, containerRef);

  if (!snapshot.isSupported) {
    return (
      <div className={cn('travel-map relative h-full w-full', className)}>
        {unsupportedFallback}
      </div>
    );
  }

  return (
    <div
      className={cn('travel-map relative isolate h-full w-full overflow-hidden', className)}
      dir="ltr"
    >
      <div ref={containerRef} className="absolute inset-0" />
      {children}
    </div>
  );
}
