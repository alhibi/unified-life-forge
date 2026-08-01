import 'leaflet/dist/leaflet.css';

import L from 'leaflet';
import React, { useEffect, useRef, useState } from 'react';

import { MapPin } from '@/lib/icons';

import type { FitnessActivity, RoutePoint } from './types';

export interface FullActivityMapProps {
  activity?: FitnessActivity;
  route?: RoutePoint[] | null;
  className?: string;
  height?: number | string;
}

/**
 * FullActivityMap: An interactive, production-grade map component built on Leaflet
 * with OpenStreetMap tiles. It features auto-fitting bounds, premium custom SVG markers
 * for start/end positions, and an adaptive dark mode overlay aligned with the Zen Elite style.
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

    // Draw the main route polyline
    const polyline = L.polyline(coordinates, {
      color: '#B8492E', // Live copper/olive accent color
      weight: 4,
      opacity: 0.85,
      lineCap: 'round',
      lineJoin: 'round',
    }).addTo(map);

    // Set custom SVG icons to avoid classic Leaflet asset loading failures
    const startIcon = L.divIcon({
      className: 'custom-gps-start-marker',
      html: `
        <div class="relative w-4 h-4 rounded-full bg-emerald-500 border-2 border-white shadow-md flex items-center justify-center">
          <div class="w-1.5 h-1.5 rounded-full bg-white"></div>
        </div>
      `,
      iconSize: [16, 16],
      iconAnchor: [8, 8],
    });

    const endIcon = L.divIcon({
      className: 'custom-gps-end-marker',
      html: `
        <div class="relative w-5 h-5 flex items-center justify-center">
          <div class="absolute inset-0 rounded-full bg-[#B8492E]/30 animate-ping"></div>
          <div class="relative w-4 h-4 rounded-full bg-[#B8492E] border-2 border-white shadow-md flex items-center justify-center animate-pulse">
            <div class="w-1.5 h-1.5 rounded-full bg-white"></div>
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
    setTimeout(() => {
      map.invalidateSize();
    }, 150);

    return () => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }
    };
  }, [pts]);

  if (!pts || pts.length === 0) {
    return (
      <div
        style={{ height }}
        className={`flex flex-col items-center justify-center rounded-2xl border border-dashed border-border/40 bg-muted/5 text-muted-foreground ${className}`}
      >
        <MapPin className="w-8 h-8 text-muted-foreground/40 mb-2 animate-bounce" />
        <span className="text-xs font-medium">لا توجد بيانات مسار لعرضها</span>
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
      <div className="absolute top-3 left-3 bg-background/80 backdrop-blur-md border border-border/40 px-2.5 py-1 rounded-xl pointer-events-none z-10 flex items-center gap-1.5 shadow-sm">
        <MapPin className="w-3.5 h-3.5 text-primary" />
        <span className="font-bold text-[0.625rem] text-foreground Montserrat tabular-nums">
          {pts[0].lat.toFixed(4)}, {pts[0].lng.toFixed(4)}
        </span>
      </div>
    </div>
  );
}

export default FullActivityMap;
