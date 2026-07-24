import { Minus, Plus } from 'lucide-react';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

import {
  MAX_ZOOM,
  MIN_ZOOM,
  TILE_SIZE,
  fitBounds,
  isValidCoordinatePair,
  mergeBounds,
  projectLngLat,
  unprojectPoint,
  visibleTiles,
} from '../mapUtils';
import type { Coordinates, CountryBounds, PlaceCategory, TravelPlace } from '../types';

interface TravelAtlasMapProps {
  bounds: CountryBounds;
  places: TravelPlace[];
  language: 'ar' | 'de';
  onSelectPlace: (placeId: string) => void;
  onReady?: () => void;
  onError?: (message: string) => void;
}

interface ViewSize {
  width: number;
  height: number;
}

interface DragState {
  pointerId: number;
  startX: number;
  startY: number;
  center: Coordinates;
}

const TILE_URL = 'https://tile.openstreetmap.org/{z}/{x}/{y}.png';

export default function TravelAtlasMap({
  bounds,
  places,
  language,
  onSelectPlace,
  onReady,
  onError,
}: TravelAtlasMapProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const dragRef = useRef<DragState | null>(null);
  const [size, setSize] = useState<ViewSize>({ width: 960, height: 640 });
  const [center, setCenter] = useState<Coordinates>(() => [
    (bounds.sw[0] + bounds.ne[0]) / 2,
    (bounds.sw[1] + bounds.ne[1]) / 2,
  ]);
  const [zoom, setZoom] = useState(4);
  const [isDragging, setIsDragging] = useState(false);
  const [failedTile, setFailedTile] = useState(false);

  const validPlaces = useMemo(
    () => places.filter((place) => isValidCoordinatePair(place.coordinates)),
    [places],
  );

  const fitKey = useMemo(
    () => `${bounds.sw.join(',')}:${bounds.ne.join(',')}:${validPlaces.map((place) => `${place.id}:${place.coordinates.join(',')}`).join('|')}`,
    [bounds.ne, bounds.sw, validPlaces],
  );

  useEffect(() => {
    const node = containerRef.current;
    if (!node) return;

    const update = () => {
      const rect = node.getBoundingClientRect();
      setSize({ width: Math.max(320, rect.width), height: Math.max(320, rect.height) });
    };

    update();
    const observer = new ResizeObserver(update);
    observer.observe(node);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    const points = validPlaces.map((place) => place.coordinates);
    const next = fitBounds(mergeBounds(bounds, points), size.width, size.height, 12);
    setCenter(next.center);
    setZoom(next.zoom);
    const frame = requestAnimationFrame(() => onReady?.());
    return () => cancelAnimationFrame(frame);
  }, [bounds, fitKey, onReady, size.height, size.width, validPlaces]);

  const tileData = useMemo(() => visibleTiles(center, zoom, size.width, size.height), [center, size, zoom]);

  const zoomTo = useCallback(
    (nextZoom: number, anchor?: { x: number; y: number }) => {
      const clampedZoom = Math.max(MIN_ZOOM, Math.min(MAX_ZOOM, nextZoom));
      if (clampedZoom === zoom) return;

      if (!anchor) {
        setZoom(clampedZoom);
        return;
      }

      const beforeTopLeft = tileData.topLeft;
      const lngLatAtAnchor = unprojectPoint(
        { x: beforeTopLeft.x + anchor.x, y: beforeTopLeft.y + anchor.y },
        zoom,
      );
      const projectedAfter = projectLngLat(lngLatAtAnchor, clampedZoom);
      const nextCenterPx = {
        x: projectedAfter.x - anchor.x + size.width / 2,
        y: projectedAfter.y - anchor.y + size.height / 2,
      };
      setCenter(unprojectPoint(nextCenterPx, clampedZoom));
      setZoom(clampedZoom);
    },
    [size.height, size.width, tileData.topLeft, zoom],
  );

  const handlePointerDown = useCallback(
    (event: React.PointerEvent<HTMLDivElement>) => {
      if (event.button !== 0 && event.pointerType === 'mouse') return;
      event.currentTarget.setPointerCapture(event.pointerId);
      dragRef.current = {
        pointerId: event.pointerId,
        startX: event.clientX,
        startY: event.clientY,
        center,
      };
      setIsDragging(true);
    },
    [center],
  );

  const handlePointerMove = useCallback(
    (event: React.PointerEvent<HTMLDivElement>) => {
      const drag = dragRef.current;
      if (!drag || drag.pointerId !== event.pointerId) return;
      const startCenter = projectLngLat(drag.center, zoom);
      const nextCenter = {
        x: startCenter.x - (event.clientX - drag.startX),
        y: startCenter.y - (event.clientY - drag.startY),
      };
      setCenter(unprojectPoint(nextCenter, zoom));
    },
    [zoom],
  );

  const finishDrag = useCallback((event: React.PointerEvent<HTMLDivElement>) => {
    if (dragRef.current?.pointerId !== event.pointerId) return;
    dragRef.current = null;
    setIsDragging(false);
  }, []);

  const handleWheel = useCallback(
    (event: React.WheelEvent<HTMLDivElement>) => {
      event.preventDefault();
      const rect = event.currentTarget.getBoundingClientRect();
      const direction = event.deltaY > 0 ? -1 : 1;
      zoomTo(zoom + direction, { x: event.clientX - rect.left, y: event.clientY - rect.top });
    },
    [zoom, zoomTo],
  );

  const handleTileError = useCallback(() => {
    if (failedTile) return;
    setFailedTile(true);
    onError?.(
      language === 'ar'
        ? 'بعض مربعات الخريطة لم تُحمّل، لكن الأماكن ستبقى ظاهرة.'
        : 'Einige Kartenkacheln wurden nicht geladen, die Orte bleiben sichtbar.',
    );
  }, [failedTile, language, onError]);

  return (
    <div className="travel-atlas-map relative h-full w-full overflow-hidden bg-muted" dir="ltr">
      <div
        ref={containerRef}
        className={cn(
          'absolute inset-0 touch-none select-none overflow-hidden travel-raster-map',
          isDragging ? 'cursor-grabbing' : 'cursor-grab',
        )}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={finishDrag}
        onPointerCancel={finishDrag}
        onWheel={handleWheel}
        onDoubleClick={(event) => {
          const rect = event.currentTarget.getBoundingClientRect();
          zoomTo(zoom + 1, { x: event.clientX - rect.left, y: event.clientY - rect.top });
        }}
        role="application"
        aria-label={language === 'ar' ? 'خريطة الأماكن' : 'Ortskarte'}
      >
        <div className="absolute inset-0 travel-raster-map__tiles" aria-hidden="true">
          {tileData.tiles.map((tile) => (
            <img
              key={tile.key}
              src={tileUrl(zoom, tile.wrappedX, tile.y)}
              alt=""
              draggable={false}
              decoding="async"
              loading="eager"
              onError={handleTileError}
              className="absolute max-w-none travel-raster-map__tile"
              style={{
                width: TILE_SIZE,
                height: TILE_SIZE,
                transform: `translate3d(${Math.round(tile.left)}px, ${Math.round(tile.top)}px, 0)`,
              }}
            />
          ))}
        </div>

        <div className="absolute inset-0 travel-raster-map__shade" aria-hidden="true" />

        {validPlaces.map((place) => {
          const point = projectLngLat(place.coordinates, zoom);
          const left = point.x - tileData.topLeft.x;
          const top = point.y - tileData.topLeft.y;
          const visible = left > -80 && left < size.width + 80 && top > -80 && top < size.height + 80;
          if (!visible) return null;

          return (
            <button
              key={place.id}
              type="button"
              className="travel-photo-marker travel-photo-marker--react"
              data-visible="true"
              data-category={place.category}
              style={{
                transform: `translate3d(${left}px, ${top}px, 0) translate(-50%, -50%)`,
                '--marker-accent': categoryAccent(place.category),
              } as React.CSSProperties}
              onPointerDown={(event) => event.stopPropagation()}
              onClick={(event) => {
                event.preventDefault();
                event.stopPropagation();
                onSelectPlace(place.id);
              }}
              aria-label={language === 'ar' ? place.nameAr : (place.nameEn ?? place.nameAr)}
            >
              <span className="travel-photo-marker__fallback" aria-hidden="true" dangerouslySetInnerHTML={{ __html: categoryIcon(place.category) }} />
              {place.coverPhotoUrl && (
                <img
                  className="travel-photo-marker__image"
                  src={place.coverPhotoUrl}
                  alt=""
                  loading="lazy"
                  decoding="async"
                  onLoad={(event) => {
                    event.currentTarget.parentElement?.setAttribute('data-has-image', 'true');
                  }}
                  onError={(event) => {
                    event.currentTarget.remove();
                  }}
                />
              )}
            </button>
          );
        })}
      </div>

      <div className="absolute bottom-4 left-4 z-10 flex flex-col gap-2">
        <Button
          type="button"
          size="icon"
          variant="secondary"
          className="h-10 w-10 rounded-2xl border border-border/70 bg-background/90 shadow-depth backdrop-blur"
          onClick={() => zoomTo(zoom + 1)}
          aria-label={language === 'ar' ? 'تكبير الخريطة' : 'Karte vergrößern'}
        >
          <Plus className="h-4 w-4" aria-hidden="true" />
        </Button>
        <Button
          type="button"
          size="icon"
          variant="secondary"
          className="h-10 w-10 rounded-2xl border border-border/70 bg-background/90 shadow-depth backdrop-blur"
          onClick={() => zoomTo(zoom - 1)}
          aria-label={language === 'ar' ? 'تصغير الخريطة' : 'Karte verkleinern'}
        >
          <Minus className="h-4 w-4" aria-hidden="true" />
        </Button>
      </div>

      {validPlaces.length === 0 && (
        <div className="pointer-events-none absolute inset-x-4 top-4 z-10 rounded-2xl border border-border/70 bg-background/90 px-4 py-3 text-center text-body text-muted-foreground shadow-depth backdrop-blur">
          {language === 'ar' ? 'أضف مكانًا ليظهر على الخريطة.' : 'Füge einen Ort hinzu, damit er auf der Karte erscheint.'}
        </div>
      )}
    </div>
  );
}

function tileUrl(zoom: number, x: number, y: number): string {
  return TILE_URL.replace('{z}', String(zoom)).replace('{x}', String(x)).replace('{y}', String(y));
}

function categoryAccent(category: PlaceCategory): string {
  const accents: Record<PlaceCategory, string> = {
    nature: 'hsl(var(--success))',
    historic: 'hsl(var(--live))',
    food: 'hsl(var(--warning))',
    city: 'hsl(var(--primary))',
    religious: 'hsl(var(--live-soft))',
    adventure: 'hsl(var(--foreground))',
    other: 'hsl(var(--muted-foreground))',
  };
  return accents[category];
}

function categoryIcon(category: PlaceCategory): string {
  const paths: Record<PlaceCategory, string> = {
    nature: '<path d="M19 3C10 4 5 9 5 16c4 0 8-2 10-6-1 4-4 7-8 9"/>',
    historic: '<path d="M3 21h18M5 18h14M6 18V9m4 9V9m4 9V9m4 9V9M4 9h16L12 3 4 9Z"/>',
    food: '<path d="M7 3v8m-3-8v5a3 3 0 0 0 6 0V3m-3 8v10m8-18v18m0-18c3 2 4 6 0 10"/>',
    city: '<path d="M4 21V7l8-4v18M12 9h8v12M8 8v1m0 4v1m0 4v1m8-6v1m0 4v1"/>',
    religious: '<path d="M20 15.5A8.5 8.5 0 1 1 12.5 4 7 7 0 0 0 20 15.5Z"/>',
    adventure: '<path d="m3 20 6-10 4 6 2-3 6 7H3Zm10-12 2-4 2 4"/>',
    other:
      '<circle cx="12" cy="12" r="3"/><path d="M12 3v2m0 14v2M3 12h2m14 0h2m-3.6-6.4-1.4 1.4M8 16l-1.4 1.4M6.6 5.6 8 7m8 9 1.4 1.4"/>',
  };
  return `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">${paths[category]}</svg>`;
}