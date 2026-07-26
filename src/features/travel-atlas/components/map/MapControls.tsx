import { useState } from 'react';
import { toast } from 'sonner';

import { IconButton } from '@/components/ui/app-shell';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Check, Globe, Layers, Maximize2, Minus, Navigation, Plus } from '@/lib/icons';
import { cn } from '@/lib/utils';

import { MAP_STYLES, type MapStyleId } from '../../data/mapStyles';
import type { MapController } from '../../lib/mapController';
import type { Coordinates } from '../../types';

interface MapControlsProps {
  controller: MapController;
  styleId: MapStyleId;
  onStyleChange: (id: MapStyleId) => void;
  /** Omit to hide the projection toggle (country maps are always flat). */
  globe?: { enabled: boolean; onToggle: (enabled: boolean) => void };
  /** Frames everything the map is currently about. */
  onFrameAll?: () => void;
  /** Called with the device position once granted. */
  onLocated?: (coordinates: Coordinates) => void;
  className?: string;
}

/**
 * The map's own toolbar. Every button is a 44 px target because these are used
 * one-handed on a phone, often while walking.
 */
export default function MapControls({
  controller,
  styleId,
  onStyleChange,
  globe,
  onFrameAll,
  onLocated,
  className,
}: MapControlsProps) {
  const [isLocating, setIsLocating] = useState(false);

  const locate = () => {
    if (!('geolocation' in navigator)) {
      toast.error('جهازك لا يدعم تحديد الموقع');
      return;
    }
    setIsLocating(true);
    navigator.geolocation.getCurrentPosition(
      (position) => {
        setIsLocating(false);
        const coordinates: Coordinates = [position.coords.longitude, position.coords.latitude];
        controller.flyTo(coordinates, 13);
        onLocated?.(coordinates);
      },
      () => {
        setIsLocating(false);
        toast.error('تعذّر تحديد موقعك', { description: 'تحقّق من إذن الموقع في المتصفح.' });
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 60000 },
    );
  };

  return (
    <div className={cn('travel-map-controls', className)}>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <IconButton className="travel-map-control" aria-label="نمط الخريطة">
            <Layers className="h-5 w-5" aria-hidden="true" />
          </IconButton>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="min-w-56">
          <DropdownMenuLabel>نمط الخريطة</DropdownMenuLabel>
          <DropdownMenuSeparator />
          {MAP_STYLES.map((entry) => (
            <DropdownMenuItem
              key={entry.id}
              onSelect={() => onStyleChange(entry.id)}
              className="gap-2"
            >
              <span className="flex h-4 w-4 items-center justify-center">
                {entry.id === styleId && <Check className="h-4 w-4" aria-hidden="true" />}
              </span>
              <span className="min-w-0 flex-1">
                <span className="block text-body text-foreground">{entry.label}</span>
                <span className="block text-micro text-muted-foreground">{entry.hint}</span>
              </span>
            </DropdownMenuItem>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>

      {globe && (
        <IconButton
          className="travel-map-control"
          onClick={() => globe.onToggle(!globe.enabled)}
          aria-pressed={globe.enabled}
          aria-label={globe.enabled ? 'عرض مسطّح' : 'عرض كُرَوي'}
        >
          <Globe
            className="h-5 w-5"
            aria-hidden="true"
            fill={globe.enabled ? 'currentColor' : undefined}
          />
        </IconButton>
      )}

      {onFrameAll && (
        <IconButton
          className="travel-map-control"
          onClick={onFrameAll}
          aria-label="إطار يجمع كل الأماكن"
        >
          <Maximize2 className="h-5 w-5" aria-hidden="true" />
        </IconButton>
      )}

      <IconButton
        className="travel-map-control"
        onClick={locate}
        disabled={isLocating}
        aria-label="موقعي الحالي"
      >
        <Navigation className={cn('h-5 w-5', isLocating && 'animate-pulse')} aria-hidden="true" />
      </IconButton>

      <div className="travel-map-control-group">
        <IconButton
          className="travel-map-control travel-map-control--stacked"
          onClick={() => controller.zoomBy(1)}
          aria-label="تكبير"
        >
          <Plus className="h-5 w-5" aria-hidden="true" />
        </IconButton>
        <IconButton
          className="travel-map-control travel-map-control--stacked"
          onClick={() => controller.zoomBy(-1)}
          aria-label="تصغير"
        >
          <Minus className="h-5 w-5" aria-hidden="true" />
        </IconButton>
      </div>
    </div>
  );
}
