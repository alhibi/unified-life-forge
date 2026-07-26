import { lazy, Suspense, useCallback, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';

import PageHeader from '@/components/PageHeader';
import SEO from '@/components/SEO';
import { Button } from '@/components/ui/button';
import { AlertCircle, Info, List, Map as MapIcon, MapPinned, Plus } from '@/lib/icons';
import { cn } from '@/lib/utils';

import CountryFactsPanel from '../components/CountryFactsPanel';
import PlaceFilterBar from '../components/PlaceFilterBar';
import PlacePeekCard from '../components/PlacePeekCard';
import PlaceRow from '../components/PlaceRow';
import { useCountryPlaces, useToggleFavorite, useTravelCountry } from '../hooks';
import { DEFAULT_FILTERS, filterPlaces, hasActiveFilters } from '../lib/filtering';
import type { Coordinates, TravelPlace } from '../types';

// The map engine and the form are the two heavy chunks in the feature; neither
// is needed to render the header and the list.
const CountryAtlasMap = lazy(() => import('../components/CountryAtlasMap'));
const PlaceFormSheet = lazy(() => import('../components/PlaceFormSheet'));

type CountryView = 'map' | 'list' | 'guide';

/**
 * One country, three ways to read it: the map, the list, and the country
 * briefing. Filters are shared — narrowing to "cafés I have not visited yet"
 * narrows the MAP too, which is what makes the filter worth having.
 */
export default function CountryMapPage() {
  const { countryId } = useParams<{ countryId: string }>();
  const navigate = useNavigate();
  const country = useTravelCountry(countryId);
  const { places: countryPlaces, isLoading, isError } = useCountryPlaces(countryId);
  const toggleFavorite = useToggleFavorite();

  const [view, setView] = useState<CountryView>('map');
  const [filters, setFilters] = useState(DEFAULT_FILTERS);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [focusCoordinates, setFocusCoordinates] = useState<Coordinates | null>(null);
  const [formOpen, setFormOpen] = useState(false);

  const places = useMemo(() => filterPlaces(countryPlaces, filters), [countryPlaces, filters]);
  const selected = useMemo(
    () => places.find((place) => place.id === selectedId) ?? null,
    [places, selectedId],
  );

  const openDetails = useCallback(
    (place: TravelPlace) => {
      navigate(`/travel-atlas/place/${place.id}`, { state: { place } });
    },
    [navigate],
  );

  const selectFromList = useCallback((place: TravelPlace) => {
    setSelectedId(place.id);
    setFocusCoordinates(place.coordinates);
    setView('map');
  }, []);

  if (!country && isLoading) return <CountryMapSkeleton />;

  if (!country) {
    return (
      <div className="page-shell page-shell-flush">
        <PageHeader title="أطلس الرحلات" backTo="/travel-atlas" sticky />
        <div className="empty-state empty-state-surface min-h-[70dvh]" role="alert">
          <AlertCircle data-empty-icon aria-hidden="true" />
          <strong>تعذّر العثور على هذه الدولة</strong>
          <span>ربما حُذفت آخر أماكنها. ارجع إلى الأطلس واختر دولة أخرى.</span>
        </div>
      </div>
    );
  }

  const showFilters = view !== 'guide';

  return (
    <div className="flex h-[100dvh] min-h-0 flex-col overflow-hidden bg-background">
      <SEO
        title={`${country.nameAr} — أطلس الرحلات`}
        description={`خريطة الأماكن المحفوظة في ${country.nameAr}: ${countryPlaces.length} مكانًا.`}
        path={`/travel-atlas/${country.id}`}
      />

      <PageHeader
        title={country.nameAr}
        subtitle={`${countryPlaces.length} مكانًا · ${country.nameEn}`}
        backTo="/travel-atlas"
        sticky
        className="shrink-0 border-b border-border"
        right={
          <div className="flex items-center gap-1" role="group" aria-label="طريقة العرض">
            <ViewButton
              label="خريطة"
              icon={<MapIcon className="h-4 w-4" aria-hidden="true" />}
              isActive={view === 'map'}
              onClick={() => setView('map')}
            />
            <ViewButton
              label="قائمة"
              icon={<List className="h-4 w-4" aria-hidden="true" />}
              isActive={view === 'list'}
              onClick={() => setView('list')}
            />
            <ViewButton
              label="دليل الدولة"
              icon={<Info className="h-4 w-4" aria-hidden="true" />}
              isActive={view === 'guide'}
              onClick={() => setView('guide')}
            />
          </div>
        }
      />

      {showFilters && countryPlaces.length > 0 && (
        <div className="shrink-0 border-b border-border px-4 py-2">
          <PlaceFilterBar filters={filters} onChange={setFilters} resultCount={places.length} />
        </div>
      )}

      <main className="relative min-h-0 flex-1">
        {/* The map stays mounted across view switches so the camera survives. */}
        <div className={cn('absolute inset-0', view !== 'map' && 'hidden')}>
          <Suspense fallback={<MapLoading />}>
            <CountryAtlasMap
              places={places}
              bounds={country.bounds}
              activePlaceId={selectedId}
              focusCoordinates={focusCoordinates}
              onSelectPlace={(place) => setSelectedId(place.id)}
              unsupportedFallback={
                <div className="grid h-full place-items-center px-6 text-center">
                  <p className="text-body text-muted-foreground">
                    الخريطة غير مدعومة على هذا الجهاز — استعرض أماكنك من تبويب القائمة.
                  </p>
                </div>
              }
            />
          </Suspense>

          {selected && (
            <PlacePeekCard
              place={selected}
              onOpenDetails={() => openDetails(selected)}
              onToggleFavorite={() =>
                toggleFavorite.mutate({ placeId: selected.id, isFavorite: !selected.isFavorite })
              }
              onClose={() => setSelectedId(null)}
            />
          )}

          {!selected && (
            <Button
              type="button"
              size="lg"
              className="absolute bottom-4 start-4 gap-2"
              onClick={() => setFormOpen(true)}
            >
              <Plus className="h-4 w-4" aria-hidden="true" />
              أضف مكانًا
            </Button>
          )}
        </div>

        {view === 'list' && (
          <div className="absolute inset-0 overflow-y-auto px-4 pb-page">
            {places.length === 0 ? (
              <EmptyList
                hasFilters={hasActiveFilters(filters)}
                onClear={() => setFilters(DEFAULT_FILTERS)}
                onAdd={() => setFormOpen(true)}
              />
            ) : (
              <ul>
                {places.map((place) => (
                  <li key={place.id}>
                    <PlaceRow
                      place={place}
                      onOpen={() => openDetails(place)}
                      onToggleFavorite={() =>
                        toggleFavorite.mutate({
                          placeId: place.id,
                          isFavorite: !place.isFavorite,
                        })
                      }
                      showLocation
                    />
                  </li>
                ))}
              </ul>
            )}

            {places.length > 0 && (
              <div className="mt-6 flex flex-wrap gap-2">
                <Button
                  type="button"
                  variant="outline"
                  className="gap-2"
                  onClick={() => setFormOpen(true)}
                >
                  <Plus className="h-4 w-4" aria-hidden="true" />
                  أضف مكانًا
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  className="gap-2"
                  onClick={() => selectFromList(places[0])}
                >
                  <MapIcon className="h-4 w-4" aria-hidden="true" />
                  اعرضها على الخريطة
                </Button>
              </div>
            )}
          </div>
        )}

        {view === 'guide' && (
          <div className="absolute inset-0 overflow-y-auto px-4 py-4 pb-page">
            <div className="mx-auto w-full max-w-lg">
              <CountryFactsPanel country={country} places={countryPlaces} />
            </div>
          </div>
        )}

        {isError && view !== 'guide' && (
          <p
            className="absolute inset-x-4 top-4 mx-auto max-w-sm rounded-card border border-border bg-background px-3 py-2 text-center text-mini text-foreground"
            role="alert"
          >
            تعذّر تحميل الأماكن — نعرض آخر نسخة محفوظة على جهازك.
          </p>
        )}
      </main>

      {formOpen && (
        <Suspense fallback={null}>
          <PlaceFormSheet
            open={formOpen}
            onOpenChange={setFormOpen}
            defaultCountryIso={country.isoCode}
            onSaved={(place) => {
              setSelectedId(place.id);
              setFocusCoordinates(place.coordinates);
              setView('map');
            }}
          />
        </Suspense>
      )}
    </div>
  );
}

function ViewButton({
  label,
  icon,
  isActive,
  onClick,
}: {
  label: string;
  icon: React.ReactNode;
  isActive: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={isActive}
      aria-label={label}
      className={cn('app-icon-btn', isActive ? 'text-[hsl(var(--live))]' : 'text-muted-foreground')}
    >
      {icon}
    </button>
  );
}

function EmptyList({
  hasFilters,
  onClear,
  onAdd,
}: {
  hasFilters: boolean;
  onClear: () => void;
  onAdd: () => void;
}) {
  return (
    <div className="empty-state empty-state-surface min-h-[50dvh]">
      <MapPinned data-empty-icon aria-hidden="true" />
      <strong>{hasFilters ? 'لا مكان يطابق التصفية' : 'لا أماكن في هذه الدولة بعد'}</strong>
      <span>
        {hasFilters ? 'وسّع نطاق البحث أو ألغِ التصفية.' : 'أضف أول مكان لتبدأ خريطتك هنا.'}
      </span>
      <Button type="button" className="mt-6 gap-2" onClick={hasFilters ? onClear : onAdd}>
        {hasFilters ? (
          'إلغاء التصفية'
        ) : (
          <>
            <Plus className="h-4 w-4" aria-hidden="true" />
            أضف مكانًا
          </>
        )}
      </Button>
    </div>
  );
}

function MapLoading() {
  return (
    <div className="grid h-full place-items-center bg-muted">
      <div className="flex flex-col items-center gap-3 text-muted-foreground">
        <span
          className="h-8 w-8 animate-spin rounded-full border-2 border-current border-t-transparent"
          aria-hidden="true"
        />
        <span className="text-mini">نحضّر الخريطة…</span>
      </div>
    </div>
  );
}

function CountryMapSkeleton() {
  return (
    <div className="flex h-[100dvh] flex-col bg-background">
      <div className="flex h-[var(--ui-header-h)] shrink-0 items-center gap-3 border-b border-border px-4">
        <div className="skeleton h-11 w-11 rounded-md" />
        <div className="min-w-0 flex-1">
          <div className="skeleton h-5 w-36" />
          <div className="skeleton mt-1 h-3 w-24" />
        </div>
      </div>
      <div className="skeleton min-h-0 flex-1 rounded-none" />
    </div>
  );
}
