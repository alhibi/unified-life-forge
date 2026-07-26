import { lazy, Suspense, useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { toast } from 'sonner';

import ImageLightbox from '@/components/ImageLightbox';
import PageHeader from '@/components/PageHeader';
import SEO from '@/components/SEO';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { AppCard } from '@/components/ui/app-shell';
import { Button } from '@/components/ui/button';
import {
  Carousel,
  type CarouselApi,
  CarouselContent,
  CarouselItem,
} from '@/components/ui/carousel';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  AlertCircle,
  Clock,
  ExternalLink,
  Heart,
  Luggage,
  Map as MapIcon,
  MoreVertical,
  Navigation,
  Pencil,
  PiggyBank,
  Share2,
  Trash2,
} from '@/lib/icons';
import { cn } from '@/lib/utils';

import RatingPicker from '../components/form/RatingPicker';
import SegmentedChoice from '../components/form/SegmentedChoice';
import PlaceMiniMap from '../components/PlaceMiniMap';
import PlaceRow from '../components/PlaceRow';
import {
  categoryMeta,
  formatDuration,
  formatMonths,
  MONTH_SHORT,
  priceLevelLabel,
  VISIT_STATUS_META,
  visitStatusMeta,
} from '../data/categories';
import { linkKindMeta } from '../data/linkKinds';
import {
  useDeletePlace,
  useNearbyPlaces,
  usePlace,
  useSetRating,
  useSetVisitStatus,
  useToggleFavorite,
  useTravelCountry,
} from '../hooks';
import { directionsUrl, formatCoordinates, haversineMeters, nativeMapsUrl } from '../lib/geo';

const PlaceFormSheet = lazy(() => import('../components/PlaceFormSheet'));
const AddToTripDialog = lazy(() => import('../components/AddToTripDialog'));

/**
 * The place, in full.
 *
 * A saved place is worth a page, not a popup: photographs at full width, the
 * practical facts as a scannable grid, the season as twelve cells, the notes and
 * links the owner collected, and what else is nearby — because the next question
 * after "tell me about this" is always "what can I combine it with".
 */
export default function PlaceDetailPage() {
  const { placeId } = useParams<{ placeId: string }>();
  const navigate = useNavigate();
  const { place, isLoading } = usePlace(placeId);
  const country = useTravelCountry(place?.countryId);

  const toggleFavorite = useToggleFavorite();
  const setStatus = useSetVisitStatus();
  const setRating = useSetRating();
  const deletePlace = useDeletePlace();
  const { data: nearby = [] } = useNearbyPlaces(place ?? null);

  const [editOpen, setEditOpen] = useState(false);
  const [tripOpen, setTripOpen] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);
  const [carouselApi, setCarouselApi] = useState<CarouselApi>();
  const [activePhoto, setActivePhoto] = useState(0);

  const photos = useMemo(() => {
    if (!place) return [];
    const urls = place.photos.map((photo) => photo.url).filter(Boolean);
    if (place.coverPhotoUrl && !urls.includes(place.coverPhotoUrl))
      urls.unshift(place.coverPhotoUrl);
    return urls;
  }, [place]);

  // Embla is imperative; mirror its selection into state for the dot row.
  useEffect(() => {
    if (!carouselApi) return;
    const sync = () => setActivePhoto(carouselApi.selectedScrollSnap());
    carouselApi.on('select', sync);
    carouselApi.on('reInit', sync);
    return () => {
      carouselApi.off('select', sync);
      carouselApi.off('reInit', sync);
    };
  }, [carouselApi]);

  if (isLoading) return <DetailSkeleton />;

  if (!place) {
    return (
      <div className="page-shell page-shell-flush">
        <PageHeader title="أطلس الرحلات" backTo="/travel-atlas" sticky />
        <div className="empty-state empty-state-surface min-h-[70dvh]" role="alert">
          <AlertCircle data-empty-icon aria-hidden="true" />
          <strong>لم نجد هذا المكان</strong>
          <span>قد يكون حُذف، أو أن الرابط لم يعد صحيحًا.</span>
        </div>
      </div>
    );
  }

  const category = categoryMeta(place.category);
  const CategoryIcon = category.icon;
  const status = visitStatusMeta(place.visitStatus);
  const duration = formatDuration(place.durationMinutes);
  const price = priceLevelLabel(place.priceLevel);
  const monthsLabel = formatMonths(place.bestMonths);
  const selectedMonths = new Set(place.bestMonths);

  const share = async () => {
    const url = `${window.location.origin}/travel-atlas/place/${place.id}`;
    const payload = { title: place.nameAr, text: place.descriptionAr ?? place.nameAr, url };
    try {
      if (navigator.share) await navigator.share(payload);
      else {
        await navigator.clipboard.writeText(url);
        toast.success('تم نسخ الرابط');
      }
    } catch {
      // A cancelled share sheet is not an error worth reporting.
    }
  };

  const remove = async () => {
    try {
      await deletePlace.mutateAsync(place.id);
      toast.success('حُذف المكان');
      navigate(country ? `/travel-atlas/${country.id}` : '/travel-atlas', { replace: true });
    } catch (error) {
      toast.error('تعذّر الحذف', { description: (error as Error)?.message });
    }
  };

  return (
    <div className="page-shell page-shell-flush">
      <SEO
        title={`${place.nameAr} — أطلس الرحلات`}
        description={
          place.descriptionAr ??
          `${category.label} في ${place.city ?? country?.nameAr ?? 'الأطلس'}.`
        }
        path={`/travel-atlas/place/${place.id}`}
        type="article"
        jsonLd={{
          '@context': 'https://schema.org',
          '@type': 'TouristAttraction',
          name: place.nameAr,
          alternateName: place.nameEn ?? undefined,
          description: place.descriptionAr ?? undefined,
          image: photos[0],
          geo: {
            '@type': 'GeoCoordinates',
            latitude: place.coordinates[1],
            longitude: place.coordinates[0],
          },
          address: {
            '@type': 'PostalAddress',
            addressLocality: place.city ?? undefined,
            addressCountry: country?.isoCode ?? undefined,
          },
        }}
      />

      <PageHeader
        title={place.nameAr}
        subtitle={[category.label, place.city, country?.nameAr].filter(Boolean).join(' · ')}
        backTo={country ? `/travel-atlas/${country.id}` : '/travel-atlas'}
        sticky
        right={
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button type="button" className="app-icon-btn" aria-label="خيارات المكان">
                <MoreVertical className="h-5 w-5" aria-hidden="true" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="min-w-44">
              <DropdownMenuItem onSelect={() => setEditOpen(true)} className="gap-2">
                <Pencil className="h-4 w-4" aria-hidden="true" />
                تعديل
              </DropdownMenuItem>
              <DropdownMenuItem onSelect={() => setTripOpen(true)} className="gap-2">
                <Luggage className="h-4 w-4" aria-hidden="true" />
                أضف إلى رحلة
              </DropdownMenuItem>
              <DropdownMenuItem onSelect={share} className="gap-2">
                <Share2 className="h-4 w-4" aria-hidden="true" />
                مشاركة
              </DropdownMenuItem>
              <DropdownMenuItem
                onSelect={() => setConfirmDelete(true)}
                className="gap-2 text-destructive"
              >
                <Trash2 className="h-4 w-4" aria-hidden="true" />
                حذف
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        }
      />

      <main className="mx-auto w-full max-w-lg pb-page">
        {photos.length > 0 ? (
          <figure className="relative -mx-4 mb-5 bg-muted">
            <Carousel setApi={setCarouselApi} opts={{ direction: 'rtl', loop: photos.length > 1 }}>
              <CarouselContent className="ms-0">
                {photos.map((url, index) => (
                  <CarouselItem key={`${url}-${index}`} className="ps-0">
                    <button
                      type="button"
                      onClick={() => setLightboxIndex(index)}
                      className="block w-full"
                      aria-label={`تكبير الصورة ${index + 1}`}
                    >
                      <img
                        src={url}
                        alt={`${place.nameAr} — صورة ${index + 1}`}
                        className="h-64 w-full object-cover sm:h-80"
                        loading={index === 0 ? 'eager' : 'lazy'}
                        decoding="async"
                      />
                    </button>
                  </CarouselItem>
                ))}
              </CarouselContent>
            </Carousel>

            {photos.length > 1 && (
              <div
                className="absolute bottom-3 left-1/2 flex -translate-x-1/2 gap-1.5"
                aria-hidden="true"
              >
                {photos.map((url, index) => (
                  <button
                    key={`dot-${url}-${index}`}
                    type="button"
                    onClick={() => carouselApi?.scrollTo(index)}
                    className={cn(
                      'h-1.5 rounded-full border border-background/60 transition-[width]',
                      index === activePhoto ? 'w-5 bg-background' : 'w-1.5 bg-background/50',
                    )}
                    tabIndex={-1}
                  />
                ))}
              </div>
            )}
          </figure>
        ) : (
          <div className="-mx-4 mb-5 grid h-40 place-items-center bg-muted text-muted-foreground">
            <CategoryIcon className="h-8 w-8" aria-hidden="true" />
          </div>
        )}

        <div className="app-stack">
          <header>
            <div className="mb-2 flex flex-wrap items-center gap-2">
              <span className="inline-flex items-center gap-1.5 rounded-full border border-border px-2.5 py-1 text-micro text-muted-foreground">
                <CategoryIcon className="h-3.5 w-3.5" aria-hidden="true" />
                {category.label}
              </span>
              <span
                className="inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-micro"
                style={{ borderColor: status.color, color: status.color }}
              >
                {status.label}
              </span>
              {place.visitedOn && (
                <span className="font-mono text-micro tabular-nums text-muted-foreground" dir="ltr">
                  {place.visitedOn}
                </span>
              )}
            </div>
            <h2 className="text-display font-semibold text-foreground">{place.nameAr}</h2>
            {place.nameEn && (
              <p className="mt-1 text-meta text-muted-foreground" dir="ltr">
                {place.nameEn}
              </p>
            )}
            {place.address && (
              <p className="mt-1 text-mini text-muted-foreground">{place.address}</p>
            )}
          </header>

          <section className="flex flex-wrap gap-2">
            <a
              href={directionsUrl(place.coordinates)}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex h-11 min-w-0 flex-1 items-center justify-center gap-2 rounded-button bg-primary px-4 text-body font-semibold text-primary-foreground"
            >
              <Navigation className="h-4 w-4" aria-hidden="true" />
              الاتجاهات
            </a>
            <a
              href={nativeMapsUrl(place.coordinates, place.nameEn ?? place.nameAr)}
              className="inline-flex h-11 items-center justify-center gap-2 rounded-button border border-border px-4 text-mini text-foreground"
            >
              <MapIcon className="h-4 w-4" aria-hidden="true" />
              افتح في الخرائط
            </a>
            <button
              type="button"
              onClick={() =>
                toggleFavorite.mutate({ placeId: place.id, isFavorite: !place.isFavorite })
              }
              aria-pressed={place.isFavorite}
              aria-label={place.isFavorite ? 'إزالة من المفضّلة' : 'أضف إلى المفضّلة'}
              className={cn(
                'grid h-11 w-11 shrink-0 place-items-center rounded-button border border-border',
                place.isFavorite ? 'text-[hsl(var(--live))]' : 'text-muted-foreground',
              )}
            >
              <Heart className="h-5 w-5" fill={place.isFavorite ? 'currentColor' : undefined} />
            </button>
          </section>

          <section>
            <h3 className="app-section-label">حالتك مع هذا المكان</h3>
            <AppCard className="space-y-4">
              <SegmentedChoice
                ariaLabel="حالة الزيارة"
                value={place.visitStatus}
                options={VISIT_STATUS_META.map((entry) => ({
                  value: entry.value,
                  label: entry.action,
                  icon: entry.icon,
                }))}
                onChange={(next) => setStatus.mutate({ placeId: place.id, status: next })}
              />
              <div>
                <p className="mb-1 text-micro text-muted-foreground">تقييمك</p>
                <RatingPicker
                  value={place.rating}
                  onChange={(rating) => setRating.mutate({ placeId: place.id, rating })}
                />
              </div>
            </AppCard>
          </section>

          {(duration || price || monthsLabel || place.bestTimeToVisit) && (
            <section>
              <h3 className="app-section-label">قبل أن تذهب</h3>
              <AppCard className="p-0">
                <ul className="divide-y divide-border">
                  {monthsLabel && (
                    <li className="px-4 py-3">
                      <p className="text-micro uppercase tracking-[0.08em] text-muted-foreground">
                        أفضل الأشهر
                      </p>
                      {/* Twelve cells, one boolean each — a data encoding, not decor. */}
                      <ul
                        className="mt-2 grid grid-cols-6 gap-1.5 sm:grid-cols-12"
                        aria-label="أشهر الزيارة"
                      >
                        {MONTH_SHORT.map((short, index) => (
                          <li
                            key={short}
                            className="travel-month-cell"
                            data-selected={selectedMonths.has(index + 1)}
                          >
                            {short}
                          </li>
                        ))}
                      </ul>
                      <p className="mt-2 text-body text-foreground">{monthsLabel}</p>
                    </li>
                  )}
                  {place.bestTimeToVisit && (
                    <FactRow icon={Clock} label="توقيت الزيارة" value={place.bestTimeToVisit} />
                  )}
                  {duration && <FactRow icon={Clock} label="المدة المناسبة" value={duration} />}
                  {price && <FactRow icon={PiggyBank} label="التكلفة" value={price} />}
                </ul>
              </AppCard>
            </section>
          )}

          {place.descriptionAr && (
            <section>
              <h3 className="app-section-label">عن المكان</h3>
              <p className="text-body leading-7 text-foreground/90">{place.descriptionAr}</p>
            </section>
          )}

          {place.tipsAr && (
            <section>
              <h3 className="app-section-label">نصائح عملية</h3>
              <AppCard>
                <p className="whitespace-pre-line text-body leading-7 text-foreground/90">
                  {place.tipsAr}
                </p>
              </AppCard>
            </section>
          )}

          {place.tags.length > 0 && (
            <section>
              <h3 className="app-section-label">وسوم</h3>
              <ul className="flex flex-wrap gap-2">
                {place.tags.map((tag) => (
                  <li
                    key={tag}
                    className="rounded-full border border-border px-2.5 py-1 text-micro text-muted-foreground"
                  >
                    {tag}
                  </li>
                ))}
              </ul>
            </section>
          )}

          {place.links.length > 0 && (
            <section>
              <h3 className="app-section-label">روابط</h3>
              <AppCard className="p-0">
                <ul className="divide-y divide-border">
                  {place.links.map((link) => {
                    const meta = linkKindMeta(link.kind);
                    const LinkIcon = meta.icon;
                    return (
                      <li key={link.id}>
                        <a
                          href={link.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center gap-3 px-4 py-3 hover:bg-accent"
                        >
                          <LinkIcon
                            className="h-4 w-4 shrink-0 text-muted-foreground"
                            aria-hidden="true"
                          />
                          <span className="min-w-0 flex-1">
                            <span className="block truncate text-body text-foreground">
                              {link.label || meta.label}
                            </span>
                            <span
                              className="block truncate text-micro text-muted-foreground"
                              dir="ltr"
                            >
                              {link.url}
                            </span>
                          </span>
                          <ExternalLink
                            className="h-4 w-4 shrink-0 text-muted-foreground"
                            aria-hidden="true"
                          />
                        </a>
                      </li>
                    );
                  })}
                </ul>
              </AppCard>
            </section>
          )}

          <section>
            <h3 className="app-section-label">الموقع</h3>
            <PlaceMiniMap coordinates={place.coordinates} label={place.nameAr} />
            <p className="mt-2 font-mono text-micro tabular-nums text-muted-foreground" dir="ltr">
              {formatCoordinates(place.coordinates)}
            </p>
          </section>

          {nearby.length > 0 && (
            <section>
              <h3 className="app-section-label">أماكن قريبة</h3>
              <ul>
                {nearby.slice(0, 6).map((other) => (
                  <li key={other.id}>
                    <PlaceRow
                      place={other}
                      distanceMeters={haversineMeters(place.coordinates, other.coordinates)}
                      onOpen={() => navigate(`/travel-atlas/place/${other.id}`)}
                    />
                  </li>
                ))}
              </ul>
            </section>
          )}

          <section className="flex flex-wrap gap-2">
            <Button
              type="button"
              variant="outline"
              className="gap-2"
              onClick={() => setEditOpen(true)}
            >
              <Pencil className="h-4 w-4" aria-hidden="true" />
              تعديل المكان
            </Button>
            <Button
              type="button"
              variant="outline"
              className="gap-2"
              onClick={() => setTripOpen(true)}
            >
              <Luggage className="h-4 w-4" aria-hidden="true" />
              أضف إلى رحلة
            </Button>
          </section>
        </div>
      </main>

      {lightboxIndex !== null && photos[lightboxIndex] && (
        <ImageLightbox
          src={photos[lightboxIndex]}
          alt={place.nameAr}
          open
          onClose={() => setLightboxIndex(null)}
        />
      )}

      {editOpen && (
        <Suspense fallback={null}>
          <PlaceFormSheet
            open={editOpen}
            onOpenChange={setEditOpen}
            place={place}
            defaultCountryIso={country?.isoCode ?? null}
          />
        </Suspense>
      )}

      {tripOpen && (
        <Suspense fallback={null}>
          <AddToTripDialog open={tripOpen} onOpenChange={setTripOpen} place={place} />
        </Suspense>
      )}

      <AlertDialog open={confirmDelete} onOpenChange={setConfirmDelete}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>حذف {place.nameAr}؟</AlertDialogTitle>
            <AlertDialogDescription>
              سيُحذف المكان وصوره وملاحظاتك عنه نهائيًا. لا يمكن التراجع.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>إلغاء</AlertDialogCancel>
            <AlertDialogAction onClick={remove}>حذف</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

function FactRow({
  icon: Icon,
  label,
  value,
}: {
  icon: typeof Clock;
  label: string;
  value: string;
}) {
  return (
    <li className="flex items-start gap-3 px-4 py-3">
      <Icon className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" aria-hidden="true" />
      <span className="min-w-0 flex-1">
        <span className="block text-micro uppercase tracking-[0.08em] text-muted-foreground">
          {label}
        </span>
        <span className="mt-0.5 block text-body text-foreground">{value}</span>
      </span>
    </li>
  );
}

function DetailSkeleton() {
  return (
    <div className="page-shell page-shell-flush">
      <div className="flex h-[var(--ui-header-h)] items-center gap-3 border-b border-border px-4">
        <div className="skeleton h-11 w-11 rounded-md" />
        <div className="skeleton h-5 w-40" />
      </div>
      <div className="mx-auto w-full max-w-lg">
        <div className="skeleton -mx-4 h-64 rounded-none" />
        <div className="mt-5 space-y-3">
          <div className="skeleton h-7 w-2/3" />
          <div className="skeleton h-4 w-1/3" />
          <div className="skeleton h-24 w-full" />
          <div className="skeleton h-40 w-full" />
        </div>
      </div>
    </div>
  );
}
