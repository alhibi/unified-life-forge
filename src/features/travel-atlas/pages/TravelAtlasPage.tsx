import { lazy, Suspense, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';

import PageHeader from '@/components/PageHeader';
import SEO from '@/components/SEO';
import { AppCard } from '@/components/ui/app-shell';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useAuth } from '@/hooks/useAuth';
import { Download, Globe, Heart, LogIn, Luggage, MapPinned, MoreVertical, Plus } from '@/lib/icons';
import { cn } from '@/lib/utils';

import PassportPanel from '../components/PassportPanel';
import PlaceFilterBar from '../components/PlaceFilterBar';
import PlaceRow from '../components/PlaceRow';
import { categoryMeta } from '../data/categories';
import { continentLabel } from '../data/countriesCatalog';
import { useAtlas, useToggleFavorite } from '../hooks';
import { downloadGeoJson } from '../lib/exportAtlas';
import { DEFAULT_FILTERS, filterPlaces, hasActiveFilters } from '../lib/filtering';
import type { CountrySummary } from '../lib/stats';
import type { TravelPlace } from '../types';

const WorldAtlasMap = lazy(() => import('../components/WorldAtlasMap'));
const PlaceFormSheet = lazy(() => import('../components/PlaceFormSheet'));

type AtlasTab = 'world' | 'places' | 'passport';

/**
 * The atlas entry point.
 *
 * It opens on a MAP, not a list of country names — the whole promise of the
 * feature is that your travelling has a shape, and a globe with your countries
 * on it says that in one glance. The list and the record are there for the two
 * other real questions: "find that place I saved" and "what does my travelling
 * look like".
 */
export default function TravelAtlasPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { countries, places, summaries, passport, isLoading, isError } = useAtlas();
  const toggleFavorite = useToggleFavorite();

  const [tab, setTab] = useState<AtlasTab>('world');
  const [filters, setFilters] = useState(DEFAULT_FILTERS);
  const [formOpen, setFormOpen] = useState(false);

  const filtered = useMemo(() => filterPlaces(places, filters), [places, filters]);

  const openCountry = (summary: CountrySummary) => {
    navigate(`/travel-atlas/${summary.country.id}`, { state: { country: summary.country } });
  };

  const openPlace = (place: TravelPlace) => {
    navigate(`/travel-atlas/place/${place.id}`, { state: { place } });
  };

  const exportAtlas = () => {
    if (places.length === 0) {
      toast.error('لا أماكن للتصدير بعد');
      return;
    }
    downloadGeoJson(places, countries);
    toast.success('تم تصدير أطلسك بصيغة GeoJSON');
  };

  return (
    <div className="flex h-[100dvh] min-h-0 flex-col overflow-hidden bg-background">
      <SEO
        title="أطلس الرحلات — amv.life"
        description="دليلك السياحي الشخصي: خريطة الأماكن التي تستحق الرحلة، بصورها وتفاصيلها ومواسمها."
        path="/travel-atlas"
      />

      <PageHeader
        title="أطلس الرحلات"
        subtitle={
          passport.totalPlaces > 0
            ? `${passport.totalPlaces} مكانًا في ${passport.countriesTouched} دولة`
            : 'دليلك السياحي الشخصي'
        }
        icon={<MapPinned className="h-5 w-5 text-[hsl(var(--live))]" aria-hidden="true" />}
        sticky
        className="shrink-0 border-b border-border"
        right={
          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={() => setFormOpen(true)}
              className="app-icon-btn text-[hsl(var(--live))]"
              aria-label="أضف مكانًا"
            >
              <Plus className="h-5 w-5" aria-hidden="true" />
            </button>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button type="button" className="app-icon-btn" aria-label="خيارات الأطلس">
                  <MoreVertical className="h-5 w-5" aria-hidden="true" />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="min-w-48">
                <DropdownMenuItem
                  onSelect={() => navigate('/travel-atlas/trips')}
                  className="gap-2"
                >
                  <Luggage className="h-4 w-4" aria-hidden="true" />
                  رحلاتي
                </DropdownMenuItem>
                <DropdownMenuItem onSelect={exportAtlas} className="gap-2">
                  <Download className="h-4 w-4" aria-hidden="true" />
                  تصدير GeoJSON
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        }
      />

      <Tabs
        value={tab}
        onValueChange={(value) => setTab(value as AtlasTab)}
        className="flex min-h-0 flex-1 flex-col"
      >
        <TabsList className="mx-4 mt-3 shrink-0 self-start">
          <TabsTrigger value="world">الخريطة</TabsTrigger>
          <TabsTrigger value="places">الأماكن</TabsTrigger>
          <TabsTrigger value="passport">سجلّي</TabsTrigger>
        </TabsList>

        {/* The map stays mounted so the camera and the globe spin survive a tab
            switch; Radix would otherwise unmount and rebuild it. */}
        <div className={cn('relative mt-3 min-h-0 flex-1', tab !== 'world' && 'hidden')}>
          {isLoading ? (
            <div className="skeleton h-full rounded-none" />
          ) : places.length === 0 ? (
            <EmptyAtlas isSignedIn={Boolean(user)} onAdd={() => setFormOpen(true)} />
          ) : (
            <Suspense fallback={<div className="skeleton h-full rounded-none" />}>
              <WorldAtlasMap
                summaries={summaries}
                places={places}
                onSelectCountry={openCountry}
                onSelectPlace={openPlace}
                unsupportedFallback={
                  <div className="grid h-full place-items-center px-6 text-center">
                    <p className="text-body text-muted-foreground">
                      الخريطة غير مدعومة على هذا الجهاز — استعرض أماكنك من تبويب «الأماكن».
                    </p>
                  </div>
                }
              />
            </Suspense>
          )}
        </div>

        <TabsContent value="places" className="min-h-0 flex-1 overflow-y-auto px-4 pb-page">
          {places.length === 0 ? (
            <EmptyAtlas isSignedIn={Boolean(user)} onAdd={() => setFormOpen(true)} inline />
          ) : (
            <div className="mx-auto w-full max-w-lg">
              <div className="sticky top-0 z-sticky -mx-1 bg-background px-1 pt-3 pb-2">
                <PlaceFilterBar
                  filters={filters}
                  onChange={setFilters}
                  resultCount={filtered.length}
                />
              </div>

              {summaries.length > 1 && !hasActiveFilters(filters) && (
                <section className="mb-5">
                  <h3 className="app-section-label">حسب الدولة</h3>
                  <ul className="grid grid-cols-2 gap-3">
                    {summaries.map((summary) => (
                      <li key={summary.country.id}>
                        <CountryCard summary={summary} onOpen={() => openCountry(summary)} />
                      </li>
                    ))}
                  </ul>
                </section>
              )}

              <section>
                <h3 className="app-section-label">
                  {hasActiveFilters(filters) ? 'النتائج' : 'كل الأماكن'}
                </h3>
                {filtered.length === 0 ? (
                  <div className="empty-state empty-state-surface min-h-[30dvh]">
                    <MapPinned data-empty-icon aria-hidden="true" />
                    <strong>لا مكان يطابق التصفية</strong>
                    <Button
                      type="button"
                      variant="outline"
                      className="mt-4"
                      onClick={() => setFilters(DEFAULT_FILTERS)}
                    >
                      إلغاء التصفية
                    </Button>
                  </div>
                ) : (
                  <ul>
                    {filtered.map((place) => (
                      <li key={place.id}>
                        <PlaceRow
                          place={place}
                          onOpen={() => openPlace(place)}
                          onToggleFavorite={() =>
                            toggleFavorite.mutate({
                              placeId: place.id,
                              isFavorite: !place.isFavorite,
                            })
                          }
                        />
                      </li>
                    ))}
                  </ul>
                )}
              </section>
            </div>
          )}
        </TabsContent>

        <TabsContent value="passport" className="min-h-0 flex-1 overflow-y-auto px-4 pb-page">
          <div className="mx-auto w-full max-w-lg pt-3">
            <PassportPanel passport={passport} summaries={summaries} />
          </div>
        </TabsContent>
      </Tabs>

      {isError && (
        <p
          className="shrink-0 border-t border-border px-4 py-2 text-center text-micro text-muted-foreground"
          role="status"
        >
          تعذّر الاتصال — نعرض آخر نسخة محفوظة على جهازك.
        </p>
      )}

      {formOpen && (
        <Suspense fallback={null}>
          <PlaceFormSheet
            open={formOpen}
            onOpenChange={setFormOpen}
            onSaved={(place) => navigate(`/travel-atlas/place/${place.id}`)}
          />
        </Suspense>
      )}
    </div>
  );
}

function CountryCard({ summary, onOpen }: { summary: CountrySummary; onOpen: () => void }) {
  const top = summary.topCategory ? categoryMeta(summary.topCategory) : null;
  const TopIcon = top?.icon;

  return (
    <AppCard
      as="button"
      pressable
      onClick={onOpen}
      className="w-full overflow-hidden p-0 text-start"
    >
      {summary.coverPhotoUrl ? (
        <img
          src={summary.coverPhotoUrl}
          alt=""
          className="h-24 w-full object-cover"
          loading="lazy"
          decoding="async"
        />
      ) : (
        <div className="grid h-24 place-items-center bg-muted text-muted-foreground">
          <Globe className="h-6 w-6" aria-hidden="true" />
        </div>
      )}
      <div className="p-3">
        <p className="truncate text-body font-semibold text-foreground">{summary.country.nameAr}</p>
        <p className="mt-0.5 truncate text-micro text-muted-foreground">
          {summary.continent ? continentLabel(summary.continent) : summary.country.nameEn}
        </p>
        <p className="mt-2 flex items-center gap-2 text-micro text-muted-foreground">
          <span className="font-mono tabular-nums">
            {summary.visited}/{summary.total}
          </span>
          {TopIcon && <TopIcon className="h-3.5 w-3.5" aria-hidden="true" />}
          {summary.favorites > 0 && (
            <span className="inline-flex items-center gap-0.5">
              <Heart className="h-3 w-3 text-[hsl(var(--live))]" fill="currentColor" />
              {summary.favorites}
            </span>
          )}
        </p>
      </div>
    </AppCard>
  );
}

function EmptyAtlas({
  isSignedIn,
  onAdd,
  inline = false,
}: {
  isSignedIn: boolean;
  onAdd: () => void;
  inline?: boolean;
}) {
  if (!isSignedIn) {
    return (
      <div className={cn('empty-state empty-state-surface', inline ? 'min-h-[40dvh]' : 'h-full')}>
        <LogIn data-empty-icon aria-hidden="true" />
        <strong>سجّل الدخول ليكون لك أطلس</strong>
        <span>أماكنك وصورها ورحلاتك تُحفظ في حسابك وتتزامن بين أجهزتك.</span>
        <Button asChild className="mt-6">
          <a href="/auth">تسجيل الدخول</a>
        </Button>
      </div>
    );
  }

  return (
    <div className={cn('empty-state empty-state-surface', inline ? 'min-h-[40dvh]' : 'h-full')}>
      <MapPinned data-empty-icon aria-hidden="true" />
      <strong>أضف مكانك الأول ولتبدأ الخريطة</strong>
      <span>مقهى تحبه، وادٍ زرته، أو مكان تنوي الوصول إليه يومًا.</span>
      <Button type="button" className="mt-6 gap-2" size="lg" onClick={onAdd}>
        <Plus className="h-4 w-4" aria-hidden="true" />
        أضف مكانًا
      </Button>
    </div>
  );
}
