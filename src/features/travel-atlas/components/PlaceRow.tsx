import { AppRow } from '@/components/ui/app-shell';
import { Heart, Star } from '@/lib/icons';
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
 * One place as a grouped-list row.
 *
 * The thumbnail carries the recognition, so it is the largest element; the
 * status ring repeats the map's colour key so the same place looks the same in
 * both views. The row itself opens the place (role=button so the nested
 * favourite toggle stays valid markup).
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

  const meta = [
    category.label,
    showLocation ? place.city : null,
    duration,
    distanceMeters !== undefined ? formatDistance(distanceMeters) : null,
  ]
    .filter(Boolean)
    .join(' · ');

  return (
    <AppRow
      as="div"
      onClick={onOpen}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onOpen();
        }
      }}
      className={cn(isActive && 'bg-accent/50')}
      leading={
        <span
          className="grid h-14 w-14 place-items-center overflow-hidden rounded-lg border-2 bg-muted text-muted-foreground"
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
      }
      title={
        <span className="flex items-center gap-1.5">
          <span className="min-w-0 truncate">{place.nameAr}</span>
          {place.rating !== null && (
            <span className="inline-flex shrink-0 items-center gap-0.5 font-mono text-micro tabular-nums text-muted-foreground">
              <Star className="h-3 w-3 text-[hsl(var(--live))]" fill="currentColor" />
              {place.rating.toFixed(1)}
            </span>
          )}
        </span>
      }
      subtitle={meta}
    >
      {onToggleFavorite && (
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onToggleFavorite();
          }}
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
    </AppRow>
  );
}
