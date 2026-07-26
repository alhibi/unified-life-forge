import { lazy, Suspense, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { toast } from 'sonner';

import SEO from '@/components/SEO';
import { Input } from '@/components/ui/input';
import { ArrowRight, Copy, Loader2, MapPin, Navigation, Plus, Search, X } from '@/lib/icons';

import MapControls from '../components/map/MapControls';
import MapSurface from '../components/map/MapSurface';
import MarkerOverlay from '../components/map/MarkerOverlay';
import { useMapController } from '../components/map/useMapController';
import { useVisibleMarkers } from '../components/map/useVisibleMarkers';
import PlacePeekCard from '../components/PlacePeekCard';
import { catalogCountryAt } from '../data/countriesCatalog';
import type { MapStyleId } from '../data/mapStyles';
import { useMyPlaces, useToggleFavorite } from '../hooks';
import { directionsUrl, formatCoordinates } from '../lib/geo';
import { type GeocodeResult, reverseGeocode, searchPlaces } from '../lib/geocoding';
import {
  readExploreCamera,
  readMapStyleId,
  writeExploreCamera,
  writeMapStyleId,
} from '../lib/mapPreferences';
import type { Coordinates } from '../types';

const PlaceFormSheet = lazy(() => import('../components/PlaceFormSheet'));

const SEARCH_DEBOUNCE_MS = 550;
/** Street level. Anything closer is a floor plan. */
const MAX_ZOOM = 19;

/**
 * The detailed map — the atlas's "explore" surface.
 *
 * This is the screen that behaves like a maps app: full street and POI detail,
 * search, satellite, current location, and street-level zoom. It exists
 * alongside the dotted country map because the two answer opposite questions,
 * and trying to serve both from one map produced something that was bad at each.
 *
 * Everything already saved shows as a pin, so exploring and recalling are the
 * same gesture, and a tap on empty ground is an offer to save what is there.
 */
export default function ExploreMapPage() {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const { data: places = [] } = useMyPlaces();
  const toggleFavorite = useToggleFavorite();

  const [styleId, setStyleId] = useState<MapStyleId>(() => {
    // Explore defaults to the detailed basemap even when the atlas is set to the
    // quiet one — detail is the entire point of this screen.
    const stored = readMapStyleId();
    return stored === 'calm' ? 'detailed' : stored;
  });

  const [initialCamera] = useState(() => {
    const focusLng = Number(params.get('lng'));
    const focusLat = Number(params.get('lat'));
    const deepLinked =
      Number.isFinite(focusLng) && Number.isFinite(focusLat) && (focusLng !== 0 || focusLat !== 0);
    const stored = readExploreCamera();
    return {
      initialCenter: (deepLinked
        ? [focusLng, focusLat]
        : (stored?.center ?? [39.8262, 21.4225])) as Coordinates,
      initialZoom: deepLinked ? 16 : (stored?.zoom ?? 5),
      maxZoom: MAX_ZOOM,
      padding: { top: 88, bottom: 120, left: 32, right: 32 },
    };
  });
  const { controller, snapshot } = useMapController({ ...initialCamera, styleId, globe: false });

  const { items, showLabels } = useVisibleMarkers(snapshot.map, places);

  const [selectedPlaceId, setSelectedPlaceId] = useState<string | null>(null);
  const [dropped, setDropped] = useState<Coordinates | null>(null);
  const [droppedLabel, setDroppedLabel] = useState<string | null>(null);
  const [isResolving, setIsResolving] = useState(false);
  const [formOpen, setFormOpen] = useState(false);

  const [query, setQuery] = useState('');
  const [results, setResults] = useState<GeocodeResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);

  const selectedPlace = useMemo(
    () => places.find((place) => place.id === selectedPlaceId) ?? null,
    [places, selectedPlaceId],
  );

  // Remember the camera. Written on `moveend` rather than on unmount so a
  // hard reload or a killed tab still returns to where the user was.
  useEffect(() => {
    const map = snapshot.map;
    if (!map) return;
    const persist = () => {
      const center = map.getCenter();
      writeExploreCamera({ center: [center.lng, center.lat], zoom: map.getZoom() });
    };
    map.on('moveend', persist);
    return () => {
      map.off('moveend', persist);
    };
  }, [snapshot.map]);

  // Tapping empty ground drops a pin and asks what it is.
  const droppedRef = useRef<Coordinates | null>(null);
  useEffect(() => {
    const map = snapshot.map;
    if (!map) return;
    const onClick = (event: { lngLat: { lng: number; lat: number } }) => {
      const point: Coordinates = [
        Number(event.lngLat.lng.toFixed(6)),
        Number(event.lngLat.lat.toFixed(6)),
      ];
      droppedRef.current = point;
      setDropped(point);
      setSelectedPlaceId(null);
      setDroppedLabel(null);
      setIsResolving(true);
      reverseGeocode(point)
        .then((result) => {
          // A slower lookup for an older tap must not overwrite a newer one.
          if (droppedRef.current !== point) return;
          setIsResolving(false);
          setDroppedLabel(
            result ? [result.title, result.subtitle].filter(Boolean).join(' · ') : null,
          );
        })
        .catch(() => {
          if (droppedRef.current === point) setIsResolving(false);
        });
    };
    map.on('click', onClick);
    return () => {
      map.off('click', onClick);
    };
  }, [snapshot.map]);

  useEffect(() => {
    const trimmed = query.trim();
    if (trimmed.length < 3) return;
    const abort = new AbortController();
    const timer = setTimeout(() => {
      setIsSearching(true);
      searchPlaces(trimmed, { signal: abort.signal, limit: 8 })
        .then((found) => {
          setIsSearching(false);
          setResults(found);
        })
        .catch((error: unknown) => {
          setIsSearching(false);
          if ((error as Error)?.name !== 'AbortError') setResults([]);
        });
    }, SEARCH_DEBOUNCE_MS);
    return () => {
      clearTimeout(timer);
      abort.abort();
    };
  }, [query]);

  const visibleResults = query.trim().length >= 3 ? results : [];

  const chooseResult = useCallback(
    (result: GeocodeResult) => {
      setQuery('');
      setResults([]);
      droppedRef.current = result.coordinates;
      setDropped(result.coordinates);
      setDroppedLabel([result.title, result.subtitle].filter(Boolean).join(' · '));
      setSelectedPlaceId(null);
      controller.flyTo(result.coordinates, 16);
    },
    [controller],
  );

  const copyDropped = async () => {
    if (!dropped) return;
    try {
      await navigator.clipboard.writeText(formatCoordinates(dropped));
      toast.success('تم نسخ الإحداثيات');
    } catch {
      toast.error('تعذّر النسخ');
    }
  };

  const droppedCountry = dropped ? catalogCountryAt(dropped) : undefined;

  return (
    <div className="flex h-[100dvh] min-h-0 flex-col overflow-hidden bg-background">
      <SEO
        title="استكشف — أطلس الرحلات"
        description="خريطة تفصيلية كاملة: ابحث، تنقّل، وأضف أي مكان إلى أطلسك."
        path="/travel-atlas/explore"
      />

      <main className="relative min-h-0 flex-1">
        <MapSurface
          controller={controller}
          snapshot={snapshot}
          unsupportedFallback={
            <div className="grid h-full place-items-center px-6 text-center">
              <p className="text-body text-muted-foreground">
                هذا الجهاز لا يدعم الخرائط التفاعلية.
              </p>
            </div>
          }
        >
          <MarkerOverlay
            map={snapshot.map}
            items={items}
            activePlaceId={selectedPlaceId}
            showLabels={showLabels}
            onSelectPlace={(place) => {
              setDropped(null);
              droppedRef.current = null;
              setSelectedPlaceId(place.id);
            }}
            onExpandCluster={(cluster) => controller.fitBounds(cluster.bounds, 16)}
          />

          <MapControls
            controller={controller}
            styleId={styleId}
            onStyleChange={(next) => {
              setStyleId(next);
              writeMapStyleId(next);
            }}
            className="travel-map-controls--below-search"
          />
        </MapSurface>

        {/* Search sits over the canvas: this screen has no page header, so the
            map keeps the whole viewport the way a maps app does. */}
        <div className="travel-explore-search">
          <div className="relative">
            <button
              type="button"
              onClick={() => navigate('/travel-atlas')}
              aria-label="رجوع إلى الأطلس"
              className="absolute start-1 top-1/2 grid h-10 w-10 -translate-y-1/2 place-items-center rounded-button text-muted-foreground hover:text-foreground"
            >
              <ArrowRight className="h-5 w-5" aria-hidden="true" />
            </button>
            <Input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="ابحث عن مدينة، معلم، أو عنوان…"
              className="h-12 border-border bg-background ps-12 pe-11 text-body"
              aria-label="البحث في الخريطة"
            />
            <span className="absolute end-3 top-1/2 -translate-y-1/2">
              {isSearching ? (
                <Loader2
                  className="h-4 w-4 animate-spin text-muted-foreground"
                  aria-hidden="true"
                />
              ) : query ? (
                <button
                  type="button"
                  onClick={() => setQuery('')}
                  aria-label="إفراغ البحث"
                  className="text-muted-foreground hover:text-foreground"
                >
                  <X className="h-4 w-4" aria-hidden="true" />
                </button>
              ) : (
                <Search className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
              )}
            </span>
          </div>

          {visibleResults.length > 0 && (
            <ul className="mt-2 max-h-64 divide-y divide-border overflow-y-auto rounded-card border border-border bg-background">
              {visibleResults.map((result) => (
                <li key={result.id}>
                  <button
                    type="button"
                    onClick={() => chooseResult(result)}
                    className="flex w-full items-start gap-2 px-3 py-2.5 text-start hover:bg-accent"
                  >
                    <MapPin
                      className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground"
                      aria-hidden="true"
                    />
                    <span className="min-w-0">
                      <span className="block truncate text-body text-foreground">
                        {result.title}
                      </span>
                      {result.subtitle && (
                        <span className="block truncate text-micro text-muted-foreground">
                          {result.subtitle}
                        </span>
                      )}
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>

        {selectedPlace && (
          <PlacePeekCard
            place={selectedPlace}
            onOpenDetails={() => navigate(`/travel-atlas/place/${selectedPlace.id}`)}
            onToggleFavorite={() =>
              toggleFavorite.mutate({
                placeId: selectedPlace.id,
                isFavorite: !selectedPlace.isFavorite,
              })
            }
            onClose={() => setSelectedPlaceId(null)}
          />
        )}

        {dropped && !selectedPlace && (
          <aside
            className="absolute inset-x-3 bottom-3 mx-auto max-w-md overflow-hidden rounded-section border border-border bg-background animate-slide-up"
            dir="rtl"
            aria-label="النقطة المحدّدة"
          >
            <div className="flex items-start gap-3 p-3">
              <span className="grid h-11 w-11 shrink-0 place-items-center rounded-full border-2 border-[hsl(var(--live))] text-[hsl(var(--live))]">
                <MapPin className="h-5 w-5" aria-hidden="true" />
              </span>
              <div className="min-w-0 flex-1">
                <p className="truncate text-body font-semibold text-foreground">
                  {isResolving ? 'نتعرّف على الموقع…' : (droppedLabel ?? 'نقطة على الخريطة')}
                </p>
                <p
                  className="mt-0.5 font-mono text-micro tabular-nums text-muted-foreground"
                  dir="ltr"
                >
                  {formatCoordinates(dropped)}
                </p>
                {droppedCountry && (
                  <p className="mt-0.5 text-micro text-muted-foreground">{droppedCountry.nameAr}</p>
                )}
              </div>
              <button
                type="button"
                onClick={() => {
                  setDropped(null);
                  droppedRef.current = null;
                }}
                aria-label="إغلاق"
                className="grid h-8 w-8 shrink-0 place-items-center rounded-button text-muted-foreground hover:text-foreground"
              >
                <X className="h-4 w-4" aria-hidden="true" />
              </button>
            </div>

            <div className="flex items-center gap-2 border-t border-border p-2">
              <button
                type="button"
                onClick={() => setFormOpen(true)}
                className="inline-flex h-11 min-w-0 flex-1 items-center justify-center gap-1.5 rounded-button bg-primary px-3 text-body font-semibold text-primary-foreground"
              >
                <Plus className="h-4 w-4" aria-hidden="true" />
                أضف إلى أطلسي
              </button>
              <a
                href={directionsUrl(dropped)}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex h-11 items-center justify-center gap-1.5 rounded-button border border-border px-3 text-mini text-foreground"
              >
                <Navigation className="h-4 w-4" aria-hidden="true" />
                الاتجاهات
              </a>
              <button
                type="button"
                onClick={copyDropped}
                aria-label="نسخ الإحداثيات"
                className="grid h-11 w-11 shrink-0 place-items-center rounded-button border border-border text-muted-foreground"
              >
                <Copy className="h-4 w-4" aria-hidden="true" />
              </button>
            </div>
          </aside>
        )}

        {!dropped && !selectedPlace && (
          <p
            className="pointer-events-none absolute inset-x-3 bottom-3 mx-auto max-w-xs rounded-card border border-border bg-background/95 px-3 py-2 text-center text-micro text-muted-foreground"
            dir="rtl"
          >
            انقر على الخريطة لتحديد نقطة وإضافتها
          </p>
        )}
      </main>

      {formOpen && dropped && (
        <Suspense fallback={null}>
          <PlaceFormSheet
            open={formOpen}
            onOpenChange={setFormOpen}
            defaultCoordinates={dropped}
            defaultCountryIso={droppedCountry?.isoCode ?? null}
            onSaved={(place) => {
              setDropped(null);
              droppedRef.current = null;
              navigate(`/travel-atlas/place/${place.id}`);
            }}
          />
        </Suspense>
      )}
    </div>
  );
}
