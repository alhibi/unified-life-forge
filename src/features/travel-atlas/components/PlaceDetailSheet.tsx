import { Clock3, Heart, Map, MapPinned, Star } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';

import {
  Carousel,
  type CarouselApi,
  CarouselContent,
  CarouselItem,
} from '@/components/ui/carousel';
import { Dialog, DialogContent, DialogDescription, DialogTitle } from '@/components/ui/dialog';
import { Drawer, DrawerContent, DrawerDescription, DrawerTitle } from '@/components/ui/drawer';
import { useIsMobile } from '@/hooks/use-mobile';
import { cn } from '@/lib/utils';

import type { PlaceCategory, TravelPlace } from '../types';

const FAVORITES_KEY = 'travel-atlas:favorites';

interface PlaceDetailSheetProps {
  place: TravelPlace | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  language: 'ar' | 'de';
}

export default function PlaceDetailSheet({
  place,
  open,
  onOpenChange,
  language,
}: PlaceDetailSheetProps) {
  const isMobile = useIsMobile();
  if (!place) return null;

  const title = place.nameAr;
  const description = language === 'ar' ? 'تفاصيل المكان' : 'Ortsdetails';
  const content = <PlaceDetailContent key={place.id} place={place} language={language} />;

  if (isMobile) {
    return (
      <Drawer open={open} onOpenChange={onOpenChange} shouldScaleBackground={false}>
        <DrawerContent
          className="max-h-[92dvh] overflow-hidden border-border p-0"
          autoFocus={false}
        >
          <DrawerTitle className="sr-only">{title}</DrawerTitle>
          <DrawerDescription className="sr-only">{description}</DrawerDescription>
          <div className="overflow-y-auto overscroll-contain">{content}</div>
        </DrawerContent>
      </Drawer>
    );
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="max-h-[88dvh] overflow-hidden border-border p-0 sm:max-w-2xl"
        autoFocus={false}
      >
        <DialogTitle className="sr-only">{title}</DialogTitle>
        <DialogDescription className="sr-only">{description}</DialogDescription>
        <div className="overflow-y-auto overscroll-contain">{content}</div>
      </DialogContent>
    </Dialog>
  );
}

function PlaceDetailContent({ place, language }: { place: TravelPlace; language: 'ar' | 'de' }) {
  const isAr = language === 'ar';
  const [carouselApi, setCarouselApi] = useState<CarouselApi>();
  const [activePhoto, setActivePhoto] = useState(0);
  const [favorite, setFavorite] = useState(() => readFavorites().has(place.id));

  const photoUrls = useMemo(() => {
    const urls = place.photos.map((photo) => photo.url).filter(Boolean);
    if (place.coverPhotoUrl && !urls.includes(place.coverPhotoUrl))
      urls.unshift(place.coverPhotoUrl);
    return urls;
  }, [place.coverPhotoUrl, place.photos]);

  useEffect(() => {
    if (!carouselApi) return;
    const update = () => setActivePhoto(carouselApi.selectedScrollSnap());
    update();
    carouselApi.on('select', update);
    carouselApi.on('reInit', update);
    return () => {
      carouselApi.off('select', update);
      carouselApi.off('reInit', update);
    };
  }, [carouselApi]);

  const toggleFavorite = () => {
    const favorites = readFavorites();
    if (favorites.has(place.id)) favorites.delete(place.id);
    else favorites.add(place.id);
    writeFavorites(favorites);
    setFavorite(favorites.has(place.id));
  };

  const openMaps = () => {
    window.location.href = nativeMapsUrl(place);
  };

  return (
    <article className="bg-background">
      <div className="relative bg-muted">
        {photoUrls.length > 0 ? (
          <Carousel setApi={setCarouselApi} opts={{ direction: 'rtl', loop: photoUrls.length > 1 }}>
            <CarouselContent className="ml-0">
              {photoUrls.map((url, index) => (
                <CarouselItem key={`${url}-${index}`} className="pl-0">
                  <img
                    src={url}
                    alt={
                      isAr
                        ? `صورة ${index + 1} من ${place.nameAr}`
                        : `Bild ${index + 1} von ${place.nameAr}`
                    }
                    className="h-60 w-full object-cover sm:h-80"
                    loading={index === 0 ? 'eager' : 'lazy'}
                  />
                </CarouselItem>
              ))}
            </CarouselContent>
          </Carousel>
        ) : (
          <div className="grid h-52 place-items-center text-muted-foreground sm:h-72">
            <MapPinned className="h-9 w-9" strokeWidth={1.4} aria-hidden="true" />
          </div>
        )}

        {photoUrls.length > 1 && (
          <div
            className="absolute bottom-3 left-1/2 flex -translate-x-1/2 gap-1.5"
            aria-label={isAr ? 'موضع الصورة' : 'Bildposition'}
          >
            {photoUrls.map((_, index) => (
              <span
                key={index}
                className={cn(
                  'h-1.5 rounded-full border border-background/60 transition-[width,background-color] duration-fast',
                  index === activePhoto ? 'w-5 bg-background' : 'w-1.5 bg-background/45',
                )}
              />
            ))}
          </div>
        )}
      </div>

      <div className="space-y-5 px-5 py-5 sm:px-6">
        <header className="border-b border-border pb-4" dir="rtl">
          <div className="mb-2 flex flex-wrap items-center gap-2">
            <span className="text-micro font-semibold uppercase tracking-[0.12em] text-[hsl(var(--live))]">
              {categoryLabel(place.category, language)}
            </span>
            {place.rating !== null && (
              <span className="inline-flex items-center gap-1 font-mono text-micro tabular-nums text-muted-foreground">
                <Star
                  className="h-3.5 w-3.5 fill-[hsl(var(--live))] text-[hsl(var(--live))]"
                  aria-hidden="true"
                />
                {place.rating.toFixed(1)}
              </span>
            )}
          </div>
          <h2 className="text-display font-semibold text-foreground">{place.nameAr}</h2>
          {place.nameEn && (
            <p className="mt-1 text-meta text-muted-foreground" dir="ltr">
              {place.nameEn}
            </p>
          )}
        </header>

        {place.bestTimeToVisit && (
          <section className="flex items-start gap-3 border-b border-border pb-4">
            <Clock3
              className="mt-0.5 h-4 w-4 shrink-0 text-[hsl(var(--live))]"
              aria-hidden="true"
            />
            <div className="min-w-0">
              <h3 className="text-micro font-semibold uppercase tracking-[0.1em] text-muted-foreground">
                {isAr ? 'أفضل وقت للزيارة' : 'Beste Reisezeit'}
              </h3>
              <p className="mt-1 text-body text-foreground" dir={isAr ? 'rtl' : 'ltr'}>
                {place.bestTimeToVisit}
              </p>
            </div>
          </section>
        )}

        {place.descriptionAr && (
          <p className="text-body leading-7 text-foreground/90" dir="rtl">
            {place.descriptionAr}
          </p>
        )}

        {place.tags.length > 0 && (
          <ul className="flex flex-wrap gap-2" aria-label={isAr ? 'الوسوم' : 'Tags'} dir="rtl">
            {place.tags.map((tag) => (
              <li
                key={tag}
                className="rounded-full border border-border px-2.5 py-1 text-micro text-muted-foreground"
              >
                {tag}
              </li>
            ))}
          </ul>
        )}
      </div>

      <footer className="sticky bottom-0 flex gap-2 border-t border-border bg-background px-5 py-4 pb-[max(1rem,env(safe-area-inset-bottom))] sm:px-6">
        <button
          type="button"
          onClick={openMaps}
          className="inline-flex h-11 flex-1 items-center justify-center gap-2 rounded-button bg-primary px-4 text-body font-semibold text-primary-foreground"
        >
          <Map className="h-4 w-4" aria-hidden="true" />
          {isAr ? 'افتح في الخرائط' : 'In Karten öffnen'}
        </button>
        <button
          type="button"
          onClick={toggleFavorite}
          aria-pressed={favorite}
          aria-label={
            isAr
              ? favorite
                ? 'إزالة من المحفوظات'
                : 'حفظ المكان'
              : favorite
                ? 'Aus Favoriten entfernen'
                : 'Ort speichern'
          }
          className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-button border border-border text-foreground hover:bg-accent"
        >
          <Heart
            className={cn('h-5 w-5', favorite && 'fill-[hsl(var(--live))] text-[hsl(var(--live))]')}
            aria-hidden="true"
          />
        </button>
      </footer>
    </article>
  );
}

function categoryLabel(category: PlaceCategory, language: 'ar' | 'de'): string {
  const labels: Record<PlaceCategory, { ar: string; de: string }> = {
    nature: { ar: 'طبيعة', de: 'Natur' },
    historic: { ar: 'تاريخ', de: 'Historisch' },
    food: { ar: 'طعام', de: 'Kulinarik' },
    city: { ar: 'مدينة', de: 'Stadt' },
    religious: { ar: 'روحاني', de: 'Religiös' },
    adventure: { ar: 'مغامرة', de: 'Abenteuer' },
    other: { ar: 'مكان', de: 'Ort' },
  };
  return labels[category][language];
}

function nativeMapsUrl(place: TravelPlace): string {
  const [longitude, latitude] = place.coordinates;
  const label = encodeURIComponent(place.nameEn ?? place.nameAr);
  const userAgent = navigator.userAgent;
  if (/iPad|iPhone|iPod/i.test(userAgent)) {
    return `maps://?q=${label}&ll=${latitude},${longitude}`;
  }
  if (/Android/i.test(userAgent)) {
    return `geo:${latitude},${longitude}?q=${latitude},${longitude}(${label})`;
  }
  return `https://www.google.com/maps/search/?api=1&query=${latitude},${longitude}`;
}

function readFavorites(): Set<string> {
  try {
    const parsed: unknown = JSON.parse(localStorage.getItem(FAVORITES_KEY) ?? '[]');
    return new Set(
      Array.isArray(parsed) ? parsed.filter((id): id is string => typeof id === 'string') : [],
    );
  } catch {
    return new Set();
  }
}

function writeFavorites(favorites: Set<string>) {
  try {
    localStorage.setItem(FAVORITES_KEY, JSON.stringify([...favorites]));
  } catch {
    // The favorite control remains a session-level stub when storage is unavailable.
  }
}
