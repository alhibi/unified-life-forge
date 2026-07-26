import type { Map as MapLibreMap } from 'maplibre-gl';
import type { CSSProperties } from 'react';

import { Star } from '@/lib/icons';

import { categoryMeta, visitStatusMeta } from '../../data/categories';
import type { ClusterMarkerItem, MarkerItem } from '../../lib/clustering';
import type { TravelPlace } from '../../types';
import { useProjectedNodes } from './useProjectedNodes';

interface MarkerOverlayProps {
  map: MapLibreMap | null;
  /** Globe hides everything on the far side of the planet. */
  isGlobe?: boolean;
  items: MarkerItem[];
  activePlaceId?: string | null;
  /** Names appear once the map is close enough for them to fit. */
  showLabels?: boolean;
  onSelectPlace: (place: TravelPlace) => void;
  onExpandCluster: (cluster: ClusterMarkerItem) => void;
}

/**
 * The pins. A saved place renders as its own photograph inside a ring coloured
 * by visit status, which is what makes the map read as a personal atlas rather
 * than a generic set of markers.
 */
export default function MarkerOverlay({
  map,
  isGlobe = false,
  items,
  activePlaceId,
  showLabels = false,
  onSelectPlace,
  onExpandCluster,
}: MarkerOverlayProps) {
  const registerNode = useProjectedNodes(map, items, isGlobe);

  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden">
      {items.map((item) => (
        <div
          key={item.id}
          ref={(node) => registerNode(item.id, node)}
          className="travel-marker-anchor"
          style={{ visibility: 'hidden' }}
        >
          {item.kind === 'cluster' ? (
            <ClusterBubble cluster={item} onClick={() => onExpandCluster(item)} />
          ) : (
            <PlacePin
              place={item.place}
              isActive={activePlaceId === item.place.id}
              showLabel={showLabels}
              onClick={() => onSelectPlace(item.place)}
            />
          )}
        </div>
      ))}
    </div>
  );
}

function PlacePin({
  place,
  isActive,
  showLabel,
  onClick,
}: {
  place: TravelPlace;
  isActive: boolean;
  showLabel: boolean;
  onClick: () => void;
}) {
  const CategoryIcon = categoryMeta(place.category).icon;
  const status = visitStatusMeta(place.visitStatus);

  return (
    <div className="travel-marker">
      <button
        type="button"
        onClick={onClick}
        aria-label={place.nameAr}
        data-active={isActive || undefined}
        className="travel-marker__dot animate-scale-in"
        style={{ '--marker-accent': status.color } as CSSProperties}
      >
        {place.coverPhotoUrl ? (
          <img
            src={place.coverPhotoUrl}
            alt=""
            className="travel-marker__image"
            loading="lazy"
            decoding="async"
          />
        ) : (
          <CategoryIcon className="h-5 w-5" aria-hidden="true" />
        )}
        {place.isFavorite && (
          <span className="travel-marker__badge" aria-hidden="true">
            <Star className="h-2.5 w-2.5" fill="currentColor" />
          </span>
        )}
      </button>
      {showLabel && (
        <span className="travel-marker__label" dir="rtl">
          {place.nameAr}
        </span>
      )}
    </div>
  );
}

function ClusterBubble({ cluster, onClick }: { cluster: ClusterMarkerItem; onClick: () => void }) {
  // Size grows with the log of the count so a 200-place cluster stays a marker
  // instead of becoming a blob that covers the region it describes.
  const size = Math.round(38 + Math.min(Math.log2(cluster.count + 1) * 6, 26));

  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={`${cluster.count} مكانًا — اقترب لعرضها`}
      className="travel-cluster animate-scale-in"
      style={{ width: size, height: size }}
    >
      <span className="travel-cluster__count">{cluster.count}</span>
    </button>
  );
}
