import * as maplibregl from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';
import { AnimatePresence, motion } from 'framer-motion';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Minus, Plus } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

import type { CountryBounds, PlaceCategory, TravelPlace } from '../types';

const MAP_STYLE = 'https://tiles.openfreemap.org/styles/positron';
const CLUSTER_RADIUS = 50;
const CLUSTER_MAX_ZOOM = 14;

// Cluster size tiers
const CLUSTER_TIERS = {
  small: { minCount: 2, maxCount: 9, size: 36, color: 'hsl(var(--muted-foreground))' },
  medium: { minCount: 10, maxCount: 49, size: 44, color: 'hsl(var(--live-soft))' },
  large: { minCount: 50, maxCount: Infinity, size: 52, color: 'hsl(var(--live))' },
};

interface ClusteredMapProps {
  bounds: CountryBounds;
  places: TravelPlace[];
  language: 'ar';
  onSelectPlace: (placeId: string) => void;
  onReady?: () => void;
  onError?: (message: string) => void;
}

interface MarkerData {
  id: string;
  type: 'cluster' | 'place';
  coordinates: [number, number];
  clusterId?: number;
  pointCount?: number;
  place?: TravelPlace;
}

export default function ClusteredMap({
  bounds,
  places,
  language,
  onSelectPlace,
  onReady,
  onError,
}: ClusteredMapProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<maplibregl.Map | null>(null);
  const [markers, setMarkers] = useState<MarkerData[]>([]);
  const [zoom, setZoom] = useState(4);
  const [isTransitioning, setIsTransitioning] = useState(false);

  const geojson = useMemo(() => ({
    type: 'FeatureCollection' as const,
    features: places.map((place) => ({
      type: 'Feature' as const,
      properties: {
        id: place.id,
        nameAr: place.nameAr,
        nameEn: place.nameEn,
        category: place.category,
        coverPhotoUrl: place.coverPhotoUrl,
      },
      geometry: {
        type: 'Point' as const,
        coordinates: place.coordinates,
      },
    })),
  }), [places]);

  const placeMap = useMemo(
    () => new Map(places.map((p) => [p.id, p])),
    [places],
  );

  const updateMarkers = useCallback(() => {
    const map = mapRef.current;
    if (!map) return;

    const source = map.getSource('places') as maplibregl.GeoJSONSource | undefined;
    if (!source) return;

    const features = map.querySourceFeatures('places');
    const newMarkers: MarkerData[] = [];
    const seenClusters = new Set<number>();
    const seenPlaces = new Set<string>();

    for (const feature of features) {
      const coords = (feature.geometry as { type: 'Point'; coordinates: [number, number] })
        .coordinates as [number, number];
      const props = feature.properties;

      if (props?.cluster) {
        const clusterId = props.cluster_id as number;
        if (seenClusters.has(clusterId)) continue;
        seenClusters.add(clusterId);
        newMarkers.push({
          id: `cluster-${clusterId}`,
          type: 'cluster',
          coordinates: coords,
          clusterId,
          pointCount: props.point_count as number,
        });
      } else if (props?.id) {
        const placeId = props.id as string;
        if (seenPlaces.has(placeId)) continue;
        seenPlaces.add(placeId);
        const place = placeMap.get(placeId);
        if (place) {
          newMarkers.push({
            id: placeId,
            type: 'place',
            coordinates: coords,
            place,
          });
        }
      }
    }

    setMarkers(newMarkers);
  }, [placeMap]);

  const flyToCluster = useCallback((clusterId: number, coordinates: [number, number]) => {
    const map = mapRef.current;
    if (!map) return;

    const source = map.getSource('places') as maplibregl.GeoJSONSource;
    if (!source) return;

    setIsTransitioning(true);

    Promise.resolve(source.getClusterExpansionZoom(clusterId))
      .then((expansionZoom: number) => {
        map.flyTo({
          center: coordinates,
          zoom: Math.min(expansionZoom ?? 14, 16),
          duration: 500,
          essential: true,
        });
        setTimeout(() => setIsTransitioning(false), 600);
      })
      .catch(() => {
        setIsTransitioning(false);
      });
  }, []);

  useEffect(() => {
    if (!containerRef.current) return;

    const map = new maplibregl.Map({
      container: containerRef.current,
      style: MAP_STYLE,
      bounds: [bounds.sw, bounds.ne],
      fitBoundsOptions: { padding: 48 },
      maxZoom: 18,
      minZoom: 2,
      attributionControl: false,
    });

    mapRef.current = map;

    map.on('load', () => {
      map.addSource('places', {
        type: 'geojson',
        data: geojson,
        cluster: true,
        clusterRadius: CLUSTER_RADIUS,
        clusterMaxZoom: CLUSTER_MAX_ZOOM,
      });

      // Invisible layer for querying (we render custom markers via React)
      map.addLayer({
        id: 'places-layer',
        type: 'circle',
        source: 'places',
        paint: {
          'circle-radius': 0,
          'circle-opacity': 0,
        },
      });

      updateMarkers();
      setZoom(map.getZoom());
      onReady?.();
    });

    map.on('move', updateMarkers);
    map.on('moveend', updateMarkers);
    map.on('zoom', () => setZoom(map.getZoom()));
    map.on('error', (e) => {
      onError?.('حدث خطأ في تحميل الخريطة');
      console.error('Map error:', e);
    });

    return () => {
      map.remove();
      mapRef.current = null;
    };
  }, [bounds, geojson, language, onError, onReady, updateMarkers]);

  // Update GeoJSON source when places change
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !map.isStyleLoaded()) return;

    const source = map.getSource('places') as maplibregl.GeoJSONSource | undefined;
    if (source) {
      source.setData(geojson);
      updateMarkers();
    }
  }, [geojson, updateMarkers]);

  const zoomIn = useCallback(() => {
    mapRef.current?.zoomIn({ duration: 300 });
  }, []);

  const zoomOut = useCallback(() => {
    mapRef.current?.zoomOut({ duration: 300 });
  }, []);

  const projectToScreen = useCallback((lngLat: [number, number]): { x: number; y: number } | null => {
    const map = mapRef.current;
    if (!map) return null;
    const point = map.project(lngLat);
    return { x: point.x, y: point.y };
  }, []);

  return (
    <div className="clustered-map relative h-full w-full overflow-hidden bg-muted" dir="ltr">
      <div ref={containerRef} className="absolute inset-0" />

      {/* Marker overlay */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <AnimatePresence mode="popLayout">
          {markers.map((marker) => {
            const pos = projectToScreen(marker.coordinates);
            if (!pos) return null;

            // Skip markers outside viewport with padding
            if (pos.x < -60 || pos.x > window.innerWidth + 60 || pos.y < -60 || pos.y > window.innerHeight + 60) {
              return null;
            }

            if (marker.type === 'cluster') {
              return (
                <ClusterMarker
                  key={marker.id}
                  x={pos.x}
                  y={pos.y}
                  count={marker.pointCount ?? 0}
                  isTransitioning={isTransitioning}
                  onClick={() => flyToCluster(marker.clusterId!, marker.coordinates)}
                />
              );
            }

            return (
              <PhotoMarker
                key={marker.id}
                x={pos.x}
                y={pos.y}
                place={marker.place!}
                language={language}
                isTransitioning={isTransitioning}
                onClick={() => onSelectPlace(marker.place!.id)}
              />
            );
          })}
        </AnimatePresence>
      </div>

      {/* Zoom controls */}
      <div className="absolute bottom-4 start-4 z-10 flex flex-col gap-2">
        <Button
          type="button"
          size="icon"
          variant="secondary"
          className="h-10 w-10 rounded-2xl border border-border/70 bg-background/90 backdrop-blur"
          onClick={zoomIn}
          aria-label={'تكبير الخريطة'}
        >
          <Plus className="h-4 w-4" aria-hidden="true" />
        </Button>
        <Button
          type="button"
          size="icon"
          variant="secondary"
          className="h-10 w-10 rounded-2xl border border-border/70 bg-background/90 backdrop-blur"
          onClick={zoomOut}
          aria-label={'تصغير الخريطة'}
        >
          <Minus className="h-4 w-4" aria-hidden="true" />
        </Button>
      </div>

      {/* Empty state */}
      {places.length === 0 && (
        <div className="pointer-events-none absolute inset-x-4 top-4 z-10 rounded-2xl border border-border/70 bg-background/90 px-4 py-3 text-center text-body text-muted-foreground backdrop-blur">
          {'أضف مكانًا ليظهر على الخريطة.'}
        </div>
      )}
    </div>
  );
}

function ClusterMarker({
  x,
  y,
  count,
  isTransitioning,
  onClick,
}: {
  x: number;
  y: number;
  count: number;
  isTransitioning: boolean;
  onClick: () => void;
}) {
  const tier = count >= 50 ? CLUSTER_TIERS.large : count >= 10 ? CLUSTER_TIERS.medium : CLUSTER_TIERS.small;

  return (
    <motion.button
      type="button"
      className="pointer-events-auto absolute flex items-center justify-center rounded-full border-2 font-mono text-sm font-semibold tabular-nums"
      style={{
        width: tier.size,
        height: tier.size,
        backgroundColor: 'hsl(var(--background))',
        borderColor: tier.color,
        color: tier.color,
      }}
      initial={{ opacity: 0, scale: 0.6 }}
      animate={{
        opacity: isTransitioning ? 0.5 : 1,
        scale: 1,
        x: x - tier.size / 2,
        y: y - tier.size / 2,
      }}
      exit={{ opacity: 0, scale: 0.6 }}
      transition={{
        type: 'spring',
        stiffness: 400,
        damping: 30,
        opacity: { duration: 0.15 },
      }}
      onClick={onClick}
      aria-label={`Cluster with ${count} places`}
    >
      {count}
    </motion.button>
  );
}

function PhotoMarker({
  x,
  y,
  place,
  language,
  isTransitioning,
  onClick,
}: {
  x: number;
  y: number;
  place: TravelPlace;
  language: 'ar';
  isTransitioning: boolean;
  onClick: () => void;
}) {
  const [imageLoaded, setImageLoaded] = useState(false);
  const [imageError, setImageError] = useState(false);
  const showPhoto = place.coverPhotoUrl && imageLoaded && !imageError;
  const accentColor = categoryAccent(place.category);
  const size = 44;

  return (
    <motion.button
      type="button"
      className={cn(
        'pointer-events-auto absolute flex items-center justify-center overflow-hidden rounded-full border-2',
        showPhoto ? 'bg-muted' : 'bg-background',
      )}
      style={{
        width: size,
        height: size,
        borderColor: accentColor,
      }}
      initial={{ opacity: 0, scale: 0.4 }}
      animate={{
        opacity: isTransitioning ? 0.7 : 1,
        scale: 1,
        x: x - size / 2,
        y: y - size / 2,
      }}
      exit={{ opacity: 0, scale: 0.4 }}
      transition={{
        type: 'spring',
        stiffness: 500,
        damping: 35,
        opacity: { duration: 0.2 },
      }}
      onClick={onClick}
      aria-label={place.nameAr}
    >
      {place.coverPhotoUrl && (
        <img
          src={place.coverPhotoUrl}
          alt=""
          className={cn(
            'h-full w-full object-cover transition-opacity duration-200',
            imageLoaded && !imageError ? 'opacity-100' : 'opacity-0',
          )}
          loading="lazy"
          decoding="async"
          onLoad={() => setImageLoaded(true)}
          onError={() => setImageError(true)}
        />
      )}
      {!showPhoto && (
        <span
          className="flex h-full w-full items-center justify-center"
          style={{ color: accentColor }}
          dangerouslySetInnerHTML={{ __html: categoryIcon(place.category) }}
        />
      )}
    </motion.button>
  );
}

function categoryAccent(category: PlaceCategory): string {
  const accents: Record<PlaceCategory, string> = {
    nature: 'hsl(var(--success))',
    historic: 'hsl(var(--live))',
    food: 'hsl(var(--warning))',
    city: 'hsl(var(--primary))',
    religious: 'hsl(var(--live-soft))',
    adventure: 'hsl(var(--foreground))',
    other: 'hsl(var(--muted-foreground))',
  };
  return accents[category];
}

function categoryIcon(category: PlaceCategory): string {
  const paths: Record<PlaceCategory, string> = {
    nature: '<path d="M19 3C10 4 5 9 5 16c4 0 8-2 10-6-1 4-4 7-8 9"/>',
    historic: '<path d="M3 21h18M5 18h14M6 18V9m4 9V9m4 9V9m4 9V9M4 9h16L12 3 4 9Z"/>',
    food: '<path d="M7 3v8m-3-8v5a3 3 0 0 0 6 0V3m-3 8v10m8-18v18m0-18c3 2 4 6 0 10"/>',
    city: '<path d="M4 21V7l8-4v18M12 9h8v12M8 8v1m0 4v1m0 4v1m8-6v1m0 4v1"/>',
    religious: '<path d="M20 15.5A8.5 8.5 0 1 1 12.5 4 7 7 0 0 0 20 15.5Z"/>',
    adventure: '<path d="m3 20 6-10 4 6 2-3 6 7H3Zm10-12 2-4 2 4"/>',
    other:
      '<circle cx="12" cy="12" r="3"/><path d="M12 3v2m0 14v2M3 12h2m14 0h2m-3.6-6.4-1.4 1.4M8 16l-1.4 1.4M6.6 5.6 8 7m8 9 1.4 1.4"/>',
  };
  return `<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">${paths[category]}</svg>`;
}
