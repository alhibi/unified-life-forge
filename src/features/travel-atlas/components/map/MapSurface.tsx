import { type ReactNode, useEffect, useRef, useState } from 'react';

import { cn } from '@/lib/utils';

import type { MapController, MapSnapshot } from '../../lib/mapController';
import { useMapAttach, useMapResize } from './useMapController';

/** What the designed fallback should say about why the live map is absent. */
export type MapSurfaceState = 'loading' | 'offline';

interface MapSurfaceProps {
  controller: MapController;
  snapshot: MapSnapshot;
  className?: string;
  /** Overlays (markers, controls, legends) — rendered above the canvas. */
  children?: ReactNode;
  /** Shown instead of the canvas when the device has no WebGL. */
  unsupportedFallback?: ReactNode;
  /**
   * A designed surface for the state the map is actually in while it cannot
   * paint: either it is still loading, or its tiles/style never arrived.
   * Rendered above the canvas so the map is never a bare grey rectangle with
   * floating controls over it.
   */
  fallback?: ReactNode | ((state: MapSurfaceState) => ReactNode);
  /** How long a supported map may stay not-ready before the fallback takes over. */
  fallbackAfterMs?: number;
  /** Reports whether the designed fallback is currently the visible surface. */
  onSurfaceStateChange?: (state: 'live' | 'fallback') => void;
}

/**
 * The canvas plus its overlay stack.
 *
 * Only the map's own projection box is forced LTR: east stays on the right even
 * though the app is right-to-left. The surrounding chrome (toolbar, legend,
 * place sheet) lives in the app's direction, so those controls mirror in RTL
 * instead of being pinned to the physical right edge.
 */
export default function MapSurface({
  controller,
  snapshot,
  className,
  children,
  unsupportedFallback,
  fallback,
  fallbackAfterMs = 1200,
  onSurfaceStateChange,
}: MapSurfaceProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  useMapAttach(controller, containerRef);
  useMapResize(controller, containerRef);

  const [stalled, setStalled] = useState(false);

  // A map that has not become ready has nothing to show. Waiting forever leaves
  // a grey slab under the floating controls — the exact state a first-time
  // visitor saw when the tile origins were unreachable.
  useEffect(() => {
    if (snapshot.isReady) return;
    // Only the timer callback flips state: a synchronous reset in the effect
    // body is what react-hooks/set-state-in-effect (and the render cascade it
    // describes) forbids. Once the surface is ready the flag is ignored by the
    // derivation below, so no reset is needed.
    const timer = window.setTimeout(() => setStalled(true), fallbackAfterMs);
    return () => window.clearTimeout(timer);
  }, [snapshot.isReady, fallbackAfterMs]);

  const showFallback =
    !snapshot.isSupported ? false : !snapshot.isReady && (stalled || snapshot.error !== null);

  useEffect(() => {
    onSurfaceStateChange?.(showFallback ? 'fallback' : 'live');
  }, [showFallback, onSurfaceStateChange]);

  if (!snapshot.isSupported) {
    return (
      <div className={cn('travel-map relative h-full w-full', className)}>
        {unsupportedFallback ?? fallbackNode(fallback, 'offline')}
      </div>
    );
  }

  return (
    <div className={cn('travel-map relative isolate h-full w-full overflow-hidden', className)}>
      {/*
        Sized with `h-full w-full`, NOT `absolute inset-0`.

        MapLibre adds a `.maplibregl-map` class to whatever element it is given,
        and its stylesheet declares `position: relative` on that class. That rule
        loads after Tailwind's utilities, so it beat `.absolute`: the insets
        stopped applying, this element collapsed to zero height, and the canvas
        fell back to its intrinsic 300 px with nothing painted in it. A
        percentage height cannot be overridden the same way.
      */}
      <div dir="ltr" className="absolute inset-0">
        <div ref={containerRef} className="h-full w-full" />
      </div>

      {showFallback ? (
        <div className="absolute inset-0" data-map-surface="fallback">
          {fallbackNode(fallback, snapshot.error ? 'offline' : 'loading')}
        </div>
      ) : null}

      {children}
    </div>
  );
}

function fallbackNode(
  fallback: MapSurfaceProps['fallback'],
  state: MapSurfaceState,
): ReactNode {
  if (!fallback) return null;
  return typeof fallback === 'function' ? fallback(state) : fallback;
}
