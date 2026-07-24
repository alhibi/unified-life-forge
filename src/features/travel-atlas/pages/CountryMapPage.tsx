import { AlertCircle, MapPinned, Plus, RefreshCw } from 'lucide-react';
import { lazy, Suspense, useCallback, useMemo, useState } from 'react';
import { useLocation, useParams } from 'react-router-dom';

import PageHeader from '@/components/PageHeader';
import SEO from '@/components/SEO';
import { useApp } from '@/contexts/AppContext';

import AddPlaceSheet from '../components/AddPlaceSheet';
import PlaceDetailSheet from '../components/PlaceDetailSheet';
import { useCountryPlaces, useTravelCountry } from '../hooks';
import type { TravelMapRouteState } from '../types';

// Lazy load the MapLibre-based clustered map to avoid blocking initial render
const ClusteredMap = lazy(() => import('../components/ClusteredMap'));

// Fallback to raster map if MapLibre fails to load
const TravelAtlasMap = lazy(() => import('../components/TravelAtlasMap'));

export default function CountryMapPage() {
  const { countryId } = useParams<{ countryId: string }>();
  const location = useLocation();
  const { language } = useApp();
  const isAr = language === 'ar';
  const routeState = location.state as TravelMapRouteState | null;
  const routedCountry = routeState?.country?.id === countryId ? routeState?.country : undefined;
  const countryQuery = useTravelCountry(countryId);
  const placesQuery = useCountryPlaces(countryId);
  const country = routedCountry ?? countryQuery.data;
  const places = useMemo(() => placesQuery.data ?? [], [placesQuery.data]);
  const [selectedPlaceId, setSelectedPlaceId] = useState<string | null>(null);
  const [mapError, setMapError] = useState<string | null>(null);
  const [mapInstanceKey, setMapInstanceKey] = useState(0);
  const [addOpen, setAddOpen] = useState(false);
  const [useRasterFallback, setUseRasterFallback] = useState(false);
  const selectedPlace = useMemo(
    () => places.find((place) => place.id === selectedPlaceId) ?? null,
    [places, selectedPlaceId],
  );

  const selectPlace = useCallback((placeId: string) => {
    setSelectedPlaceId(placeId);
  }, []);

  const changeDetailOpen = useCallback((open: boolean) => {
    if (!open) setSelectedPlaceId(null);
  }, []);

  const handleMapError = useCallback((message: string) => {
    setMapError(message);
    // Fallback to raster map if MapLibre fails
    setUseRasterFallback(true);
  }, []);

  if (!country && countryQuery.isLoading) {
    return <MapPageSkeleton />;
  }

  if (!country || countryQuery.error) {
    return (
      <div className="page-shell page-shell-flush">
        <PageHeader title={isAr ? 'أطلس الرحلات' : 'Reiseatlas'} backTo="/travel-atlas" sticky />
        <div className="empty-state empty-state-surface min-h-[70dvh]" role="alert">
          <AlertCircle data-empty-icon aria-hidden="true" />
          <strong>
            {isAr ? 'تعذّر العثور على هذه الدولة' : 'Dieses Land wurde nicht gefunden'}
          </strong>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-[100dvh] min-h-0 flex-col overflow-hidden bg-background">
      <SEO
        title={`${isAr ? country.nameAr : country.nameEn} — ${isAr ? 'أطلس الرحلات' : 'Reiseatlas'}`}
        description={isAr ? `خريطة أماكن ${country.nameAr}` : `Ortskarte für ${country.nameEn}`}
        path={`/travel-atlas/${country.id}`}
      />
      <PageHeader
        title={isAr ? country.nameAr : country.nameEn}
        subtitle={
          isAr ? `${places.length} مكانًا على الخريطة` : `${places.length} Orte auf der Karte`
        }
        backTo="/travel-atlas"
        className="relative z-20 shrink-0 border-b border-border bg-background"
        right={
          <span className="inline-flex h-8 min-w-8 items-center justify-center rounded-full border border-border px-2 font-mono text-micro tabular-nums text-muted-foreground">
            {places.length}
          </span>
        }
      />

      <main className="relative min-h-0 flex-1">
        <Suspense fallback={<MapSkeleton />}>
          {useRasterFallback ? (
            <TravelAtlasMap
              key={mapInstanceKey}
              bounds={country.bounds}
              places={places}
              language={language}
              onSelectPlace={selectPlace}
              onReady={() => setMapError(null)}
              onError={setMapError}
            />
          ) : (
            <ClusteredMap
              key={mapInstanceKey}
              bounds={country.bounds}
              places={places}
              language={language}
              onSelectPlace={selectPlace}
              onReady={() => setMapError(null)}
              onError={handleMapError}
            />
          )}
        </Suspense>

        <button
          type="button"
          onClick={() => setAddOpen(true)}
          aria-label={isAr ? 'إضافة مكان' : 'Ort hinzufügen'}
          className="absolute bottom-6 end-4 z-10 inline-flex h-12 items-center gap-2 rounded-full border border-border bg-background/95 px-4 text-body font-semibold text-foreground shadow-lg backdrop-blur transition-transform hover:scale-[1.02] active:scale-[0.98]"
        >
          <Plus className="h-4 w-4 text-[hsl(var(--live))]" aria-hidden="true" />
          {isAr ? 'إضافة مكان' : 'Ort hinzufügen'}
        </button>

        {mapError && (
          <div
            className="absolute inset-x-4 top-4 mx-auto flex max-w-sm items-center gap-3 rounded-lg border border-border bg-background px-3 py-2 text-mini text-foreground"
            role="alert"
          >
            <AlertCircle className="h-4 w-4 shrink-0 text-destructive" aria-hidden="true" />
            <span className="min-w-0 flex-1 truncate">{mapError}</span>
            <button
              type="button"
              onClick={() => {
                setMapError(null);
                setMapInstanceKey((key) => key + 1);
              }}
              className="inline-flex h-9 shrink-0 items-center gap-1.5 rounded-button border border-border px-2.5 font-semibold"
            >
              <RefreshCw className="h-3.5 w-3.5" aria-hidden="true" />
              {isAr ? 'إعادة' : 'Erneut'}
            </button>
          </div>
        )}

        {placesQuery.isLoading && !mapError && (
          <div className="pointer-events-none absolute inset-x-4 top-4 mx-auto max-w-xs rounded-lg border border-border bg-background px-3 py-2 text-center text-mini text-muted-foreground">
            {isAr ? 'نرتّب الأماكن على الخريطة…' : 'Orte werden auf der Karte angeordnet…'}
          </div>
        )}

        {placesQuery.error && !mapError && (
          <div
            className="absolute inset-x-4 top-4 mx-auto flex max-w-sm items-center gap-2 rounded-lg border border-border bg-background px-3 py-2 text-mini text-foreground"
            role="alert"
          >
            <AlertCircle className="h-4 w-4 shrink-0 text-destructive" aria-hidden="true" />
            {isAr ? 'تعذّر تحميل الأماكن.' : 'Orte konnten nicht geladen werden.'}
          </div>
        )}

        {!placesQuery.isLoading && !placesQuery.error && places.length === 0 && (
          <div className="pointer-events-none absolute inset-x-4 bottom-6 mx-auto flex max-w-xs items-center justify-center gap-2 rounded-lg border border-border bg-background px-3 py-2 text-mini text-muted-foreground">
            <MapPinned className="h-4 w-4" aria-hidden="true" />
            {isAr ? 'لا أماكن في هذه الخريطة بعد.' : 'Noch keine Orte auf dieser Karte.'}
          </div>
        )}
      </main>

      <PlaceDetailSheet
        place={selectedPlace}
        open={Boolean(selectedPlace)}
        onOpenChange={changeDetailOpen}
        language={language}
      />

      <AddPlaceSheet
        open={addOpen}
        onOpenChange={setAddOpen}
        defaultCountryIso={country.isoCode}
      />
    </div>
  );
}

function MapPageSkeleton() {
  return (
    <div className="flex h-[100dvh] flex-col bg-background">
      <div className="flex h-[68px] shrink-0 items-center gap-3 border-b border-border px-4">
        <div className="skeleton h-11 w-11 rounded-2xl" />
        <div className="min-w-0 flex-1">
          <div className="skeleton h-5 w-36" />
          <div className="skeleton mt-1 h-3 w-24" />
        </div>
      </div>
      <div className="skeleton min-h-0 flex-1 rounded-none" />
    </div>
  );
}

function MapSkeleton() {
  return (
    <div className="flex h-full w-full items-center justify-center bg-muted">
      <div className="flex flex-col items-center gap-3 text-muted-foreground">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-current border-t-transparent" />
        <span className="text-mini">Loading map...</span>
      </div>
    </div>
  );
}
