import { useState } from 'react';
import { toast } from 'sonner';

import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Check, Loader2, Luggage, Plus } from '@/lib/icons';
import { cn } from '@/lib/utils';

import { useAddTripStop, useCreateTrip, useTrips } from '../hooks';
import type { TravelPlace } from '../types';

interface AddToTripDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  place: TravelPlace;
}

/**
 * Send a place to an itinerary.
 *
 * Creating a trip is offered inline: the moment someone wants to plan is when
 * they are looking at a place, not when they remember to open a planner first.
 */
export default function AddToTripDialog({ open, onOpenChange, place }: AddToTripDialogProps) {
  const { data: trips = [], isLoading } = useTrips();
  const createTrip = useCreateTrip();
  const addStop = useAddTripStop();

  const [selectedTripId, setSelectedTripId] = useState<string | null>(null);
  const [newTitle, setNewTitle] = useState('');
  const [dayIndex, setDayIndex] = useState('1');

  const isBusy = createTrip.isPending || addStop.isPending;

  const submit = async () => {
    const day = Math.max(1, Math.min(365, Number(dayIndex) || 1));

    try {
      let tripId = selectedTripId;
      if (!tripId) {
        const title = newTitle.trim();
        if (title.length === 0) {
          toast.error('اكتب عنوان الرحلة أو اختر رحلة قائمة');
          return;
        }
        const trip = await createTrip.mutateAsync({
          title,
          countryId: place.countryId,
          status: 'draft',
        });
        tripId = trip.id;
      }

      await addStop.mutateAsync({ tripId, placeId: place.id, dayIndex: day });
      toast.success('أُضيف المكان إلى الرحلة');
      onOpenChange(false);
      setNewTitle('');
      setSelectedTripId(null);
    } catch (error) {
      const message = (error as Error)?.message;
      toast.error('تعذّرت الإضافة', {
        description: message === 'not_authenticated' ? 'سجّل الدخول أولًا.' : message,
      });
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>أضف إلى رحلة</DialogTitle>
          <DialogDescription>{place.nameAr}</DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {isLoading ? (
            <div className="space-y-2" aria-hidden="true">
              <div className="skeleton h-12 w-full" />
              <div className="skeleton h-12 w-full" />
            </div>
          ) : (
            trips.length > 0 && (
              <div className="space-y-2">
                <Label>رحلاتك</Label>
                <ul className="max-h-48 space-y-1.5 overflow-y-auto">
                  {trips.map((trip) => {
                    const isActive = selectedTripId === trip.id;
                    return (
                      <li key={trip.id}>
                        <button
                          type="button"
                          onClick={() => setSelectedTripId(isActive ? null : trip.id)}
                          aria-pressed={isActive}
                          className={cn(
                            'flex w-full items-center gap-2 rounded-card border px-3 py-2.5 text-start transition-colors',
                            isActive
                              ? 'border-[hsl(var(--live))] bg-[hsl(var(--live)/0.1)]'
                              : 'border-border hover:bg-accent',
                          )}
                        >
                          <Luggage
                            className="h-4 w-4 shrink-0 text-muted-foreground"
                            aria-hidden="true"
                          />
                          <span className="min-w-0 flex-1 truncate text-body text-foreground">
                            {trip.title}
                          </span>
                          <span className="shrink-0 font-mono text-micro tabular-nums text-muted-foreground">
                            {trip.stops.length}
                          </span>
                          {isActive && (
                            <Check
                              className="h-4 w-4 shrink-0 text-[hsl(var(--live))]"
                              aria-hidden="true"
                            />
                          )}
                        </button>
                      </li>
                    );
                  })}
                </ul>
              </div>
            )
          )}

          {!selectedTripId && (
            <div className="space-y-2">
              <Label htmlFor="trip-title">
                {trips.length > 0 ? 'أو أنشئ رحلة جديدة' : 'أنشئ رحلة'}
              </Label>
              <Input
                id="trip-title"
                value={newTitle}
                onChange={(event) => setNewTitle(event.target.value)}
                placeholder="مثال: شتاء الشمال"
              />
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="trip-day">اليوم</Label>
            <Input
              id="trip-day"
              inputMode="numeric"
              value={dayIndex}
              onChange={(event) => setDayIndex(event.target.value.replace(/[^\d]/g, ''))}
              className="w-24"
            />
          </div>
        </div>

        <DialogFooter className="flex-row gap-2">
          <Button
            type="button"
            variant="outline"
            className="flex-1"
            onClick={() => onOpenChange(false)}
            disabled={isBusy}
          >
            إلغاء
          </Button>
          <Button type="button" className="flex-1 gap-2" onClick={submit} disabled={isBusy}>
            {isBusy ? (
              <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
            ) : (
              <Plus className="h-4 w-4" aria-hidden="true" />
            )}
            أضف
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
