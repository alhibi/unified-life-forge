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
import {
  Download,
  Globe,
  Heart,
  LogIn,
  Luggage,
  MapPinned,
  MoreVertical,
  Plus,
  Search,
  Sparkles,
} from '@/lib/icons';
import { cn } from '@/lib/utils';

const AtlasScoutTab = lazy(() => import('../components/AtlasScoutTab'));

import { createPlace } from '../api';
import PassportPanel from '../components/PassportPanel';
import PlaceFilterBar from '../components/PlaceFilterBar';
import PlaceRow from '../components/PlaceRow';
import { categoryMeta } from '../data/categories';
import { continentLabel } from '../data/countriesCatalog';
import { useAtlas, useToggleFavorite } from '../hooks';
import { downloadGeoJson } from '../lib/exportAtlas';
import { DEFAULT_FILTERS, filterPlaces, hasActiveFilters } from '../lib/filtering';
import type { CountrySummary } from '../lib/stats';
import type { ScoutPlace } from '../scoutApi';
import type { TravelPlace } from '../types';

const WorldAtlasMap = lazy(() => import('../components/WorldAtlasMap'));
const PlaceFormSheet = lazy(() => import('../components/PlaceFormSheet'));

type AtlasTab = 'world' | 'places' | 'passport' | 'scout';

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
  const { countries, places, stamps, summaries, passport, isLoading, isError } = useAtlas();
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

  /** Promotes an AI-scouted dossier into a real atlas place. */
  const promoteScoutedPlace = async (scouted: ScoutPlace): Promise<string> => {
    const coords = scouted.coordinates;
    if (!coords) {
      throw new Error('لا إحداثيات لهذا المكان — احفظه يدوياً من النموذج');
    }

    // Find the containing catalog country (registry has a point lookup).
    const { atlasCountryAt } = await import('../data/countryRegistry');
    const host = atlasCountryAt([coords.lng, coords.lat]);
    if (!host) throw new Error('تعذر تحديد الدولة — جرّب مكاناً آخر');

    const created = await createPlace({
      nameAr: scouted.nameAr || scouted.nameEn,
      nameEn: scouted.nameEn,
      category: (scouted.category as TravelPlace['category']) || 'other',
      coordinates: [coords.lng, coords.lat],
      city: scouted.city,
      address: scouted.addressLine,
      descriptionAr: [
        scouted.descriptionAr,
        scouted.atmosphereAr ? `الأجواء: ${scouted.atmosphereAr}` : null,
        scouted.tipsAr ? `نصائح: ${scouted.tipsAr}` : null,
        scouted.signatureDish ? `طبق مميز: ${scouted.signatureDish}` : null,
      ]
        .filter(Boolean)
        .join('\n\n'),
      bestMonths: scouted.bestMonths,
      visitStatus: 'wishlist',
      priceLevel: scouted.priceLevel,
      durationMinutes: scouted.durationMinutes,
      tags: ['استكشاف ذكي', ...(scouted.vibe ? [scouted.vibe] : [])],
      country: host,
    });
    return created.id;
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
                  onSelect={() => navigate('/travel-atlas/explore')}
                  className="gap-2"
                >
                  <Search className="h-4 w-4" aria-hidden="true" />
                  خريطة تفصيلية
                </DropdownMenuItem>
                <DropdownMenuItem
                  onSelect={() => navigate('/travel-atlas/countries')}
                  className="gap-2"
                >
                  <Globe className="h-4 w-4" aria-hidden="true" />
                  خريطة البلدان
                </DropdownMenuItem>
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
          <TabsTrigger value="scout" className="gap-1">
            <Sparkles className="h-3.5 w-3.5 text-primary" aria-hidden="true" />
            الاستكشاف الذكي
          </TabsTrigger>
          <TabsTrigger value="passport">سجلّي</TabsTrigger>
        </TabsList>

        {/* The map is ALWAYS mounted.
            It used to be replaced by the empty state whenever the atlas had no
            places, which meant a new or signed-out visitor opened "أطلس الرحلات"
            and found no map at all — the feature looked broken because its
            centrepiece was missing. A globe with nothing on it is still the
            invitation; the prompt now floats over it.
            Keeping it mounted across tab switches also preserves the camera,
            which Radix would otherwise discard by unmounting the panel. */}
        <div className={cn('relative mt-3 min-h-0 flex-1', tab !== 'world' && 'hidden')}>
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

          {!isLoading && places.length === 0 && (
            <FirstRunPrompt isSignedIn={Boolean(user)} onAdd={() => setFormOpen(true)} />
          )}

          <nav
            className="absolute inset-x-3 bottom-3 flex items-center justify-center gap-2"
            aria-label="خرائط أخرى"
          >
            <button
              type="button"
              onClick={() => navigate('/travel-atlas/explore')}
              className="inline-flex h-11 items-center gap-1.5 rounded-button border border-border bg-background px-3 text-mini text-foreground"
            >
              <Search className="h-4 w-4" aria-hidden="true" />
              خريطة تفصيلية
            </button>
            <button
              type="button"
              onClick={() => navigate('/travel-atlas/countries')}
              className="inline-flex h-11 items-center gap-1.5 rounded-button border border-border bg-background px-3 text-mini text-foreground"
            >
              <Globe className="h-4 w-4" aria-hidden="true" />
              خريطة البلدان
            </button>
          </nav>
        </div>

        <TabsContent value="places" className="min-h-0 flex-1 overflow-y-auto px-4 pb-page">
          {places.length === 0 ? (
            <EmptyAtlas isSignedIn={Boolean(user)} onAdd={() => setFormOpen(true)} />
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

        <TabsContent value="scout" className="min-h-0 flex-1 overflow-y-auto px-4 pb-page">
          <div className="mx-auto w-full max-w-3xl pt-3">
            <Suspense fallback={<div className="skeleton h-64 rounded-2xl" />}>
              <AtlasScoutTab onPromoteToAtlas={promoteScoutedPlace} />
            </Suspense>
          </div>
        </TabsContent>

        <TabsContent value="passport" className="min-h-0 flex-1 overflow-y-auto px-4 pb-page">
          <div className="mx-auto w-full max-w-lg pt-3">
            <PassportPanel passport={passport} summaries={summaries} stampCount={stamps.length} />
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

/**
 * Floats over the map on a first run instead of replacing it. The globe is the
 * product's promise; hiding it behind a sign-in wall was the reason the feature
 * read as broken.
 */
function FirstRunPrompt({ isSignedIn, onAdd }: { isSignedIn: boolean; onAdd: () => void }) {
  return (
    // Sits above the map-switch buttons, clear of the toolbar in the top corner.
    <div className="pointer-events-none absolute inset-x-3 bottom-20 flex justify-center">
      <AppCard className="pointer-events-auto max-w-sm text-center">
        {isSignedIn ? (
          <>
            <MapPinned className="mx-auto h-6 w-6 text-[hsl(var(--live))]" aria-hidden="true" />
            <p className="mt-2 text-body font-semibold text-foreground">
              أضف مكانك الأول ولتبدأ الخريطة
            </p>
            <p className="mt-1 text-mini text-muted-foreground">
              مقهى تحبه، وادٍ زرته، أو مكان تنوي الوصول إليه يومًا.
            </p>
            <Button type="button" className="mt-4 gap-2" onClick={onAdd}>
              <Plus className="h-4 w-4" aria-hidden="true" />
              أضف مكانًا
            </Button>
          </>
        ) : (
          <>
            <LogIn className="mx-auto h-6 w-6 text-[hsl(var(--live))]" aria-hidden="true" />
            <p className="mt-2 text-body font-semibold text-foreground">
              سجّل الدخول ليكون لك أطلس
            </p>
            <p className="mt-1 text-mini text-muted-foreground">
              أماكنك وصورها ورحلاتك تُحفظ في حسابك وتتزامن بين أجهزتك.
            </p>
            <Button asChild className="mt-4">
              <a href="/auth">تسجيل الدخول</a>
            </Button>
          </>
        )}
      </AppCard>
    </div>
  );
}

/** The list and record tabs still need a full-height empty state. */
function EmptyAtlas({ isSignedIn, onAdd }: { isSignedIn: boolean; onAdd: () => void }) {
  if (!isSignedIn) {
    return (
      <div className="empty-state empty-state-surface min-h-[40dvh]">
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
    <div className="empty-state empty-state-surface min-h-[40dvh]">
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
