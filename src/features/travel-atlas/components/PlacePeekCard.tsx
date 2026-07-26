import { ChevronLeft, Heart, MapPin, Navigation, Star, X } from '@/lib/icons';
import { cn } from '@/lib/utils';

import { categoryMeta, formatDuration, priceLevelLabel, visitStatusMeta } from '../data/categories';
import { directionsUrl } from '../lib/geo';
import type { TravelPlace } from '../types';

interface PlacePeekCardProps {
  place: TravelPlace;
  onOpenDetails: () => void;
  onToggleFavorite: () => void;
  onClose: () => void;
}

/**
 * The card that appears when a pin is tapped.
 *
 * Deliberately NOT a modal sheet: a modal would block the map behind it, and the
 * whole point of tapping a pin is to keep looking around. It sits over the map,
 * dismissible, with the map still pannable beside it.
 */
export default function PlacePeekCard({
  place,
  onOpenDetails,
  onToggleFavorite,
  onClose,
}: PlacePeekCardProps) {
  const category = categoryMeta(place.category);
  const CategoryIcon = category.icon;
  const status = visitStatusMeta(place.visitStatus);
  const duration = formatDuration(place.durationMinutes);
  const price = priceLevelLabel(place.priceLevel);

  return (
    <aside
      className="pointer-events-auto absolute inset-x-3 bottom-3 mx-auto max-w-md overflow-hidden rounded-section border border-border bg-background animate-slide-up"
      dir="rtl"
      aria-label={`ملخّص ${place.nameAr}`}
    >
      <div className="flex items-start gap-3 p-3">
        <span
          className="grid h-20 w-20 shrink-0 place-items-center overflow-hidden rounded-card border-2 bg-muted text-muted-foreground"
          style={{ borderColor: status.color }}
        >
          {place.coverPhotoUrl ? (
            <img
              src={place.coverPhotoUrl}
              alt=""
              className="h-full w-full object-cover"
              loading="lazy"
            />
          ) : (
            <CategoryIcon className="h-6 w-6" aria-hidden="true" />
          )}
        </span>

        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-2">
            <h2 className="min-w-0 truncate text-lead font-semibold text-foreground">
              {place.nameAr}
            </h2>
            <button
              type="button"
              onClick={onClose}
              aria-label="إغلاق"
              className="-me-1 -mt-1 grid h-8 w-8 shrink-0 place-items-center rounded-button text-muted-foreground hover:text-foreground"
            >
              <X className="h-4 w-4" aria-hidden="true" />
            </button>
          </div>

          <p className="mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-micro text-muted-foreground">
            <span>{category.label}</span>
            <span aria-hidden="true">·</span>
            <span style={{ color: status.color }}>{status.label}</span>
            {place.city && (
              <>
                <span aria-hidden="true">·</span>
                <span className="inline-flex items-center gap-1">
                  <MapPin className="h-3 w-3" aria-hidden="true" />
                  {place.city}
                </span>
              </>
            )}
            {duration && (
              <>
                <span aria-hidden="true">·</span>
                <span>{duration}</span>
              </>
            )}
            {price && (
              <>
                <span aria-hidden="true">·</span>
                <span>{price}</span>
              </>
            )}
            {place.rating !== null && (
              <>
                <span aria-hidden="true">·</span>
                <span className="inline-flex items-center gap-0.5 font-mono tabular-nums">
                  <Star className="h-3 w-3 text-[hsl(var(--live))]" fill="currentColor" />
                  {place.rating.toFixed(1)}
                </span>
              </>
            )}
          </p>

          {place.descriptionAr && (
            <p className="mt-1.5 line-clamp-2 text-mini text-foreground/90">
              {place.descriptionAr}
            </p>
          )}
        </div>
      </div>

      <div className="flex items-center gap-2 border-t border-border p-2">
        <button
          type="button"
          onClick={onOpenDetails}
          className="inline-flex h-11 min-w-0 flex-1 items-center justify-center gap-1.5 rounded-button bg-primary px-3 text-body font-semibold text-primary-foreground"
        >
          التفاصيل
          <ChevronLeft className="h-4 w-4" aria-hidden="true" />
        </button>
        <a
          href={directionsUrl(place.coordinates)}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex h-11 items-center justify-center gap-1.5 rounded-button border border-border px-3 text-mini text-foreground"
        >
          <Navigation className="h-4 w-4" aria-hidden="true" />
          الاتجاهات
        </a>
        <button
          type="button"
          onClick={onToggleFavorite}
          aria-pressed={place.isFavorite}
          aria-label={place.isFavorite ? 'إزالة من المفضّلة' : 'أضف إلى المفضّلة'}
          className={cn(
            'grid h-11 w-11 shrink-0 place-items-center rounded-button border border-border',
            place.isFavorite ? 'text-[hsl(var(--live))]' : 'text-muted-foreground',
          )}
        >
          <Heart className="h-5 w-5" fill={place.isFavorite ? 'currentColor' : undefined} />
        </button>
      </div>
    </aside>
  );
}
