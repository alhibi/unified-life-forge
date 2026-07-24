import 'maplibre-gl/dist/maplibre-gl.css';

import type { GeoJSONSource, Map as MapLibreMap, MapGeoJSONFeature } from 'maplibre-gl';
import * as maplibregl from 'maplibre-gl';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import MapGL, {
  Layer,
  type LayerProps,
  type MapLayerMouseEvent,
  type MapRef,
  NavigationControl,
  Source,
} from 'react-map-gl/maplibre';

import type { CountryBounds, PlaceCategory, TravelPlace } from '../types';

const SOURCE_ID = 'travel-atlas-places';
const CLUSTER_LAYER_ID = 'travel-atlas-clusters';
const CLUSTER_COUNT_LAYER_ID = 'travel-atlas-cluster-count';
const OPEN_FREE_MAP_STYLE = 'https://tiles.openfreemap.org/styles/positron';

const clusterLayer: LayerProps = {
  id: CLUSTER_LAYER_ID,
  type: 'circle',
  source: SOURCE_ID,
  filter: ['has', 'point_count'],
  paint: {
    'circle-color': [
      'step',
      ['get', 'point_count'],
      'hsla(32, 58%, 62%, 0.76)',
      10,
      'hsla(32, 58%, 62%, 0.9)',
      50,
      'hsl(32, 58%, 62%)',
    ],
    'circle-radius': ['step', ['get', 'point_count'], 18, 10, 24, 50, 31],
    'circle-stroke-width': 1,
    'circle-stroke-color': 'rgba(255, 255, 255, 0.74)',
    'circle-opacity': 1,
    'circle-stroke-opacity': 0.86,
  },
};

const clusterCountLayer: LayerProps = {
  id: CLUSTER_COUNT_LAYER_ID,
  type: 'symbol',
  source: SOURCE_ID,
  filter: ['has', 'point_count'],
  layout: {
    'text-field': ['get', 'point_count_abbreviated'],
    'text-font': ['Noto Sans Regular'],
    'text-size': 12,
  },
  paint: {
    'text-color': '#17130f',
    'text-opacity': 1,
  },
};

interface TravelAtlasMapProps {
  bounds: CountryBounds;
  places: TravelPlace[];
  language: 'ar' | 'de';
  onSelectPlace: (placeId: string) => void;
  onReady?: () => void;
  onError?: (message: string) => void;
}

interface MarkerRecord {
  marker: maplibregl.Marker;
  element: HTMLButtonElement;
  removalTimer?: number;
}

export default function TravelAtlasMap({
  bounds,
  places,
  language,
  onSelectPlace,
  onReady,
  onError,
}: TravelAtlasMapProps) {
  const mapRef = useRef<MapRef>(null);
  const markersRef = useRef<Map<string, MarkerRecord>>(new Map());
  const syncFrameRef = useRef<number | null>(null);
  const [mapLoaded, setMapLoaded] = useState(false);

  const geoJson = useMemo(
    () => ({
      type: 'FeatureCollection' as const,
      features: places.map((place) => ({
        type: 'Feature' as const,
        id: place.id,
        geometry: {
          type: 'Point' as const,
          coordinates: place.coordinates,
        },
        properties: {
          id: place.id,
          category: place.category,
          cover_photo_url: place.coverPhotoUrl,
        },
      })),
    }),
    [places],
  );

  const placesById = useMemo(() => new Map(places.map((place) => [place.id, place])), [places]);

  const fitCountry = useCallback(
    (map: MapLibreMap) => {
      const compact = window.matchMedia('(max-width: 640px)').matches;
      map.fitBounds([bounds.sw, bounds.ne], {
        padding: compact ? 42 : 72,
        duration: 0,
        maxZoom: 11,
      });
    },
    [bounds],
  );

  const handleLoad = useCallback(() => {
    const map = mapRef.current?.getMap();
    if (!map) return;
    fitCountry(map);
    setMapLoaded(true);
    onReady?.();
  }, [fitCountry, onReady]);

  const handleClusterClick = useCallback(
    async (event: MapLayerMouseEvent) => {
      const map = mapRef.current?.getMap();
      const feature = event.features?.find((item) => item.layer.id === CLUSTER_LAYER_ID);
      if (!map || !feature || feature.geometry.type !== 'Point') return;

      const properties = feature.properties as Record<string, unknown> | null;
      const clusterId = Number(properties?.cluster_id);
      const source = map.getSource(SOURCE_ID) as GeoJSONSource | undefined;
      if (!source || !Number.isFinite(clusterId)) return;

      try {
        const zoom = await source.getClusterExpansionZoom(clusterId);
        if (mapRef.current?.getMap() !== map || !map.getLayer(CLUSTER_LAYER_ID)) return;
        const coordinates = feature.geometry.coordinates as [number, number];

        map.setPaintProperty(CLUSTER_LAYER_ID, 'circle-opacity-transition', { duration: 180 });
        map.setPaintProperty(CLUSTER_COUNT_LAYER_ID, 'text-opacity-transition', { duration: 180 });
        map.setPaintProperty(CLUSTER_LAYER_ID, 'circle-opacity', 0.18);
        map.setPaintProperty(CLUSTER_COUNT_LAYER_ID, 'text-opacity', 0);
        map.easeTo({
          center: coordinates,
          zoom,
          duration: 620,
          essential: true,
        });

        map.once('moveend', () => {
          if (!map.getLayer(CLUSTER_LAYER_ID)) return;
          map.setPaintProperty(CLUSTER_LAYER_ID, 'circle-opacity', 1);
          map.setPaintProperty(CLUSTER_COUNT_LAYER_ID, 'text-opacity', 1);
        });
      } catch {
        onError?.(
          language === 'ar'
            ? 'تعذّر توسيع مجموعة الأماكن.'
            : 'Die Ortsgruppe konnte nicht geöffnet werden.',
        );
      }
    },
    [language, onError],
  );

  useEffect(() => {
    const map = mapRef.current?.getMap();
    if (!map || !mapLoaded) return;
    const markers = markersRef.current;

    const removeMarker = (id: string, record: MarkerRecord) => {
      if (record.removalTimer !== undefined) return;
      record.element.dataset.visible = 'false';
      record.removalTimer = window.setTimeout(() => {
        if (markers.get(id) !== record) return;
        record.marker.remove();
        markers.delete(id);
      }, 180);
    };

    const syncMarkers = () => {
      syncFrameRef.current = null;
      if (!map.isStyleLoaded() || !map.getSource(SOURCE_ID)) return;

      const visibleIds = new Set<string>();
      const features = map.querySourceFeatures(SOURCE_ID);
      for (const feature of features) {
        const placeId = getUnclusteredPlaceId(feature as unknown as MapGeoJSONFeature);
        if (!placeId || visibleIds.has(placeId)) continue;
        const place = placesById.get(placeId);
        if (!place || feature.geometry.type !== 'Point') continue;

        const coordinates = feature.geometry.coordinates as [number, number];
        if (!map.getBounds().contains(coordinates)) continue;
        visibleIds.add(placeId);
        const current = markers.get(placeId);
        if (current) {
          if (current.removalTimer !== undefined) {
            clearTimeout(current.removalTimer);
            current.removalTimer = undefined;
          }
          current.marker.setLngLat(coordinates);
          current.element.dataset.visible = 'true';
          continue;
        }

        const element = createPhotoMarker(place, language, () => onSelectPlace(place.id));
        const marker = new maplibregl.Marker({ element, anchor: 'center' })
          .setLngLat(coordinates)
          .addTo(map);
        const record = { marker, element };
        markers.set(placeId, record);
        requestAnimationFrame(() => {
          if (markers.get(placeId) === record) element.dataset.visible = 'true';
        });
      }

      for (const [id, record] of markers) {
        if (!visibleIds.has(id)) removeMarker(id, record);
      }
    };

    const scheduleSync = () => {
      if (syncFrameRef.current !== null) return;
      syncFrameRef.current = requestAnimationFrame(syncMarkers);
    };

    map.on('sourcedata', scheduleSync);
    map.on('zoom', scheduleSync);
    map.on('moveend', scheduleSync);
    scheduleSync();

    return () => {
      map.off('sourcedata', scheduleSync);
      map.off('zoom', scheduleSync);
      map.off('moveend', scheduleSync);
      if (syncFrameRef.current !== null) cancelAnimationFrame(syncFrameRef.current);
      for (const record of markers.values()) {
        if (record.removalTimer !== undefined) clearTimeout(record.removalTimer);
        record.marker.remove();
      }
      markers.clear();
    };
  }, [language, mapLoaded, onSelectPlace, placesById]);

  return (
    <div className="travel-atlas-map h-full w-full" dir="ltr">
      <MapGL
        ref={mapRef}
        mapLib={maplibregl}
        mapStyle={OPEN_FREE_MAP_STYLE}
        initialViewState={{
          longitude: (bounds.sw[0] + bounds.ne[0]) / 2,
          latitude: (bounds.sw[1] + bounds.ne[1]) / 2,
          zoom: 4,
        }}
        interactiveLayerIds={[CLUSTER_LAYER_ID]}
        onClick={handleClusterClick}
        onLoad={handleLoad}
        onError={(event) => {
          onError?.(
            event.error?.message ??
              (language === 'ar'
                ? 'تعذّر تحميل الخريطة.'
                : 'Die Karte konnte nicht geladen werden.'),
          );
        }}
        attributionControl={{}}
        dragRotate={false}
        pitchWithRotate={false}
        touchPitch={false}
        touchZoomRotate
        cooperativeGestures={false}
        reuseMaps
        style={{ width: '100%', height: '100%', touchAction: 'none' }}
      >
        <Source
          id={SOURCE_ID}
          type="geojson"
          data={geoJson}
          cluster
          clusterRadius={50}
          clusterMaxZoom={14}
        >
          <Layer {...clusterLayer} />
          <Layer {...clusterCountLayer} />
        </Source>
        <NavigationControl position="bottom-left" showCompass={false} visualizePitch={false} />
      </Map>
    </div>
  );
}

function getUnclusteredPlaceId(feature: MapGeoJSONFeature): string | null {
  const properties = feature.properties as Record<string, unknown> | null;
  if (!properties || properties.cluster || properties.point_count) return null;
  const id = properties.id ?? feature.id;
  return typeof id === 'string' || typeof id === 'number' ? String(id) : null;
}

function createPhotoMarker(
  place: TravelPlace,
  language: 'ar' | 'de',
  onSelect: () => void,
): HTMLButtonElement {
  const element = document.createElement('button');
  element.type = 'button';
  element.className = 'travel-photo-marker';
  element.dataset.visible = 'false';
  element.dataset.category = place.category;
  element.setAttribute(
    'aria-label',
    language === 'ar' ? place.nameAr : (place.nameEn ?? place.nameAr),
  );
  element.style.setProperty('--marker-accent', categoryAccent(place.category));

  const fallback = document.createElement('span');
  fallback.className = 'travel-photo-marker__fallback';
  fallback.innerHTML = categoryIcon(place.category);
  fallback.setAttribute('aria-hidden', 'true');
  element.appendChild(fallback);

  if (place.coverPhotoUrl) {
    const image = document.createElement('img');
    image.className = 'travel-photo-marker__image';
    image.src = place.coverPhotoUrl;
    image.alt = '';
    image.loading = 'lazy';
    image.decoding = 'async';
    image.addEventListener('load', () => {
      element.dataset.hasImage = 'true';
    });
    image.addEventListener('error', () => {
      image.remove();
      element.dataset.hasImage = 'false';
    });
    element.appendChild(image);
  }

  element.addEventListener('click', (event) => {
    event.preventDefault();
    event.stopPropagation();
    onSelect();
  });

  return element;
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
  return `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">${paths[category]}</svg>`;
}
