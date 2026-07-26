import { Heart, MapPin, Star } from '@/lib/icons';
import { cn } from '@/lib/utils';

import { categoryMeta, formatDuration, visitStatusMeta } from '../data/categories';
import { formatDistance } from '../lib/geo';
import type { TravelPlace } from '../types';

interface PlaceRowProps {
  place: TravelPlace;
  onOpen: () => void;
  onToggleFavorite?: () => void;
  /** Distance from a reference point, in metres (nearby lists). */
  distanceMeters?: number;
  /** Shows the country/city line — off inside a single country. */
  showLocation?: boolean;
  isActive?: boolean;
}

/**
 * One place as a list row.
 *
 * The thumbnail carries the recognition, so it is the largest element; the status
 * ring repeats the map's colour key so the same place looks the same in both
 * views.
 */
export default function PlaceRow({
  place,
  onOpen,
  onToggleFavorite,
  distanceMeters,
  showLocation = true,
  isActive = false,
}: PlaceRowProps) {
  const category = categoryMeta(place.category);
  const CategoryIcon = category.icon;
  const status = visitStatusMeta(place.visitStatus);
  const duration = formatDuration(place.durationMinutes);

  return (
    <div
      className={cn(
        'flex items-center gap-3 border-b border-border px-1 py-3 transition-colors',
        isActive && 'bg-accent/50',
      )}
    >
      <button
        type="button"
        onClick={onOpen}
        className="flex min-w-0 flex-1 items-center gap-3 text-start"
      >
        <span
          className="grid h-14 w-14 shrink-0 place-items-center overflow-hidden rounded-card border-2 bg-muted text-muted-foreground"
          style={{ borderColor: status.color }}
        >
          {place.coverPhotoUrl ? (
            <img
              src={place.coverPhotoUrl}
              alt=""
              className="h-full w-full object-cover"
              loading="lazy"
              decoding="async"
            />
          ) : (
            <CategoryIcon className="h-5 w-5" aria-hidden="true" />
          )}
        </span>

        <span className="min-w-0 flex-1">
          <span className="flex items-center gap-1.5">
            <span className="min-w-0 truncate text-body font-semibold text-foreground">
              {place.nameAr}
            </span>
            {place.rating !== null && (
              <span className="inline-flex shrink-0 items-center gap-0.5 font-mono text-micro tabular-nums text-muted-foreground">
                <Star className="h-3 w-3 text-[hsl(var(--live))]" fill="currentColor" />
                {place.rating.toFixed(1)}
              </span>
            )}
          </span>

          <span className="mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-micro text-muted-foreground">
            <span>{category.label}</span>
            {showLocation && place.city && (
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
            {distanceMeters !== undefined && (
              <>
                <span aria-hidden="true">·</span>
                <span className="font-mono tabular-nums">{formatDistance(distanceMeters)}</span>
              </>
            )}
          </span>
        </span>
      </button>

      {onToggleFavorite && (
        <button
          type="button"
          onClick={onToggleFavorite}
          aria-pressed={place.isFavorite}
          aria-label={place.isFavorite ? 'إزالة من المفضّلة' : 'أضف إلى المفضّلة'}
          className={cn(
            'app-icon-btn shrink-0',
            place.isFavorite ? 'text-[hsl(var(--live))]' : 'text-muted-foreground',
          )}
        >
          <Heart className="h-4 w-4" fill={place.isFavorite ? 'currentColor' : undefined} />
        </button>
      )}
    </div>
  );
}
