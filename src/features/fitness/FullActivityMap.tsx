import 'leaflet/dist/leaflet.css';

import L from 'leaflet';
import React, { useEffect, useRef, useState } from 'react';

import { StateView } from '@/components/ui/state-view';
import { MapPin } from '@/lib/icons';

import type { FitnessActivity, RoutePoint } from './types';

export interface FullActivityMapProps {
  activity?: FitnessActivity;
  route?: RoutePoint[] | null;
  className?: string;
  height?: number | string;
}

/**
 * Resolves a theme token (stored as bare HSL triples) to a concrete CSS
 * colour string. Leaflet paints SVG attributes, so `hsl(var(--…))` cannot
 * be used directly there — this reads the live token value instead, which
 * keeps the route/brand colour theme-aware without a raw hex. The literal
 * is only a last-resort fallback for environments without the tokens
 * (SSR/tests).
 */
function tokenColor(name: string, fallback = 'hsl(15 63% 45%)'): string {
  if (typeof window === 'undefined') return fallback;
  const v = getComputedStyle(document.documentElement).getPropertyValue(name).trim();
  return v ? `hsl(${v})` : fallback;
}

/**
 * FullActivityMap: An interactive, production-grade map component built on Leaflet
 * with OpenStreetMap tiles. It features auto-fitting bounds, custom SVG markers
 * for start/end positions, and an adaptive dark mode overlay.
 *
 * System-unification pass: decorative chrome around the map is gone — no
 * backdrop blur, no shadows, no raw hexes (route colour + markers read the
 * semantic tokens), and the no-route placeholder is the shared <StateView>.
 * The map itself is untouched.
 */
export function FullActivityMap({
  activity,
  route,
  className = '',
  height = 320,
}: FullActivityMapProps) {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const [isDark, setIsDark] = useState(false);

  // Extract route points from props
  const pts = route || activity?.route;

  // Track theme changes dynamically
  useEffect(() => {
    const checkTheme = () => {
      const isDarkTheme =
        document.documentElement.classList.contains('dark') ||
        document.documentElement.getAttribute('data-theme') === 'dark';
      setIsDark(isDarkTheme);
    };

    // Initial check
    checkTheme();

    // Setup MutationObserver to watch class/attribute changes on documentElement
    const observer = new MutationObserver(checkTheme);
    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ['class', 'data-theme'],
    });

    return () => observer.disconnect();
  }, []);

  // Initialize and update the Leaflet map instance
  useEffect(() => {
    if (!mapContainerRef.current) return;
    if (!pts || pts.length === 0) return;

    // Destroy existing map instance before re-initializing
    if (mapInstanceRef.current) {
      mapInstanceRef.current.remove();
      mapInstanceRef.current = null;
    }

    // Initialize map
    const map = L.map(mapContainerRef.current, {
      zoomControl: false, // We'll add our own zoom controller or positioned zoom control
      fadeAnimation: true,
      markerZoomAnimation: true,
    });
    mapInstanceRef.current = map;

    // Add minimal bottom-right zoom control
    L.control.zoom({ position: 'bottomright' }).addTo(map);

    // Load OpenStreetMap Tiles
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 19,
      attribution: '© OpenStreetMap contributors',
    }).addTo(map);

    // Convert RoutePoints to Leaflet LatLng coordinate tuples [number, number]
    const coordinates = pts.map((p) => [p.lat, p.lng] as L.LatLngTuple);

    // Draw the main route polyline (colour follows the live brand token)
    const polyline = L.polyline(coordinates, {
      color: tokenColor('--primary'),
      weight: 4,
      opacity: 0.85,
      lineCap: 'round',
      lineJoin: 'round',
    }).addTo(map);

    // Set custom SVG icons to avoid classic Leaflet asset loading failures
    const startIcon = L.divIcon({
      className: 'custom-gps-start-marker',
      html: `
        <div class="relative w-4 h-4 rounded-full bg-data-1 border-2 border-background flex items-center justify-center">
          <div class="w-1.5 h-1.5 rounded-full bg-background"></div>
        </div>
      `,
      iconSize: [16, 16],
      iconAnchor: [8, 8],
    });

    const endIcon = L.divIcon({
      className: 'custom-gps-end-marker',
      html: `
        <div class="relative w-5 h-5 flex items-center justify-center">
          <div class="absolute inset-0 rounded-full bg-primary/30 animate-ping"></div>
          <div class="relative w-4 h-4 rounded-full bg-primary border-2 border-background flex items-center justify-center animate-pulse">
            <div class="w-1.5 h-1.5 rounded-full bg-background"></div>
          </div>
        </div>
      `,
      iconSize: [20, 20],
      iconAnchor: [10, 10],
    });

    // Add Start Marker
    L.marker(coordinates[0], { icon: startIcon, title: 'البداية' }).addTo(map);

    // Add End Marker
    if (coordinates.length > 1) {
      L.marker(coordinates[coordinates.length - 1], {
        icon: endIcon,
        title: 'النهاية',
      }).addTo(map);
    }

    // Auto-fit bounds with visual padding
    map.fitBounds(polyline.getBounds(), {
      padding: [40, 40],
      maxZoom: 16,
      animate: true,
      duration: 1.2,
    });

    // Trigger map invalidation to ensure it resizes and renders tiles perfectly
    const invalidateTimer = setTimeout(() => {
      map.invalidateSize();
    }, 150);

    return () => {
      clearTimeout(invalidateTimer);
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }
    };
  }, [pts]);

  if (!pts || pts.length === 0) {
    return (
      <div style={{ height }} className={`flex ${className}`}>
        <StateView
          kind="empty"
          compact
          className="flex-1"
          title="لا توجد بيانات مسار لعرضها"
          body="سجّل نشاطاً مزوّداً بمسار GPS لعرضه هنا على الخريطة."
        />
      </div>
    );
  }

  return (
    <div className={`relative rounded-2xl overflow-hidden border border-border/40 ${className}`}>
      {/* Map Element with dynamic dark filter overlay */}
      <div
        ref={mapContainerRef}
        style={{
          height,
          filter: isDark
            ? 'invert(90%) hue-rotate(180deg) brightness(95%) contrast(110%) saturate(80%)'
            : 'none',
        }}
        className="w-full bg-background z-0"
      />

      {/* Floating coordinates badge */}
      <div className="absolute top-3 start-3 bg-background border border-border/40 px-2.5 py-1 rounded-lg pointer-events-none z-raised flex items-center gap-1.5">
        <MapPin className="w-3.5 h-3.5 text-primary" aria-hidden />
        <span className="font-bold text-micro text-foreground Montserrat tabular-nums">
          {pts[0].lat.toFixed(4)}, {pts[0].lng.toFixed(4)}
        </span>
      </div>
    </div>
  );
}

export default FullActivityMap;
