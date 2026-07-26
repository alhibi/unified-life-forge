import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';

import PageHeader from '@/components/PageHeader';
import SEO from '@/components/SEO';
import { AppCard } from '@/components/ui/app-shell';
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
import { CalendarDays, Luggage, Plus } from '@/lib/icons';

import { useCreateTrip, useMyPlaces, useTravelCountries, useTrips } from '../hooks';
import { formatDistance, haversineMeters } from '../lib/geo';
import type { TripWithStops } from '../types';

/**
 * Trips list.
 *
 * A trip is a container for places plus dates, and the list only has to answer
 * "which trip do I open" — so each row leads with the dates and the number of
 * stops rather than a cover image that would just repeat the places inside.
 */
export default function TripsPage() {
  const navigate = useNavigate();
  const { data: trips = [], isLoading } = useTrips();
  const { data: places = [] } = useMyPlaces();
  const { data: countries = [] } = useTravelCountries();
  const createTrip = useCreateTrip();

  const [dialogOpen, setDialogOpen] = useState(false);
  const [title, setTitle] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  const placeIndex = useMemo(() => new Map(places.map((place) => [place.id, place])), [places]);
  const countryNames = useMemo(
    () => new Map(countries.map((country) => [country.id, country.nameAr])),
    [countries],
  );

  const create = async () => {
    const trimmed = title.trim();
    if (trimmed.length === 0) {
      toast.error('اكتب عنوان الرحلة');
      return;
    }
    if (startDate && endDate && endDate < startDate) {
      toast.error('تاريخ النهاية قبل البداية');
      return;
    }
    try {
      const trip = await createTrip.mutateAsync({
        title: trimmed,
        startDate: startDate || null,
        endDate: endDate || null,
        status: 'planned',
      });
      setDialogOpen(false);
      setTitle('');
      setStartDate('');
      setEndDate('');
      navigate(`/travel-atlas/trips/${trip.id}`);
    } catch (error) {
      const message = (error as Error)?.message;
      toast.error('تعذّر إنشاء الرحلة', {
        description: message === 'not_authenticated' ? 'سجّل الدخول أولًا.' : message,
      });
    }
  };

  return (
    <div className="page-shell page-shell-flush">
      <SEO
        title="رحلاتي — أطلس الرحلات"
        description="خطّط رحلاتك يومًا بيوم من الأماكن التي حفظتها."
        path="/travel-atlas/trips"
      />
      <PageHeader
        title="رحلاتي"
        subtitle={trips.length > 0 ? `${trips.length} رحلة` : 'خطّط من أماكنك المحفوظة'}
        icon={<Luggage className="h-5 w-5 text-[hsl(var(--live))]" aria-hidden="true" />}
        backTo="/travel-atlas"
        sticky
        right={
          <button
            type="button"
            onClick={() => setDialogOpen(true)}
            className="app-icon-btn text-[hsl(var(--live))]"
            aria-label="رحلة جديدة"
          >
            <Plus className="h-5 w-5" aria-hidden="true" />
          </button>
        }
      />

      <main className="mx-auto w-full max-w-lg pb-page pt-4">
        {isLoading ? (
          <div className="app-stack" aria-hidden="true">
            <div className="skeleton h-24 w-full" />
            <div className="skeleton h-24 w-full" />
          </div>
        ) : trips.length === 0 ? (
          <div className="empty-state empty-state-surface min-h-[55dvh]">
            <Luggage data-empty-icon aria-hidden="true" />
            <strong>لا رحلات بعد</strong>
            <span>أنشئ رحلة، ثم أضف إليها الأماكن من صفحاتها.</span>
            <Button
              type="button"
              className="mt-6 gap-2"
              size="lg"
              onClick={() => setDialogOpen(true)}
            >
              <Plus className="h-4 w-4" aria-hidden="true" />
              رحلة جديدة
            </Button>
          </div>
        ) : (
          <ul className="app-stack">
            {trips.map((trip) => (
              <li key={trip.id}>
                <TripCard
                  trip={trip}
                  countryName={trip.countryId ? (countryNames.get(trip.countryId) ?? null) : null}
                  totalDistance={tripDistance(trip, placeIndex)}
                  onOpen={() => navigate(`/travel-atlas/trips/${trip.id}`)}
                />
              </li>
            ))}
          </ul>
        )}
      </main>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>رحلة جديدة</DialogTitle>
            <DialogDescription>التواريخ اختيارية — يمكن إضافتها لاحقًا.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="new-trip-title">العنوان</Label>
              <Input
                id="new-trip-title"
                value={title}
                onChange={(event) => setTitle(event.target.value)}
                placeholder="مثال: أسبوع في جورجيا"
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label htmlFor="new-trip-start">البداية</Label>
                <Input
                  id="new-trip-start"
                  type="date"
                  value={startDate}
                  onChange={(event) => setStartDate(event.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="new-trip-end">النهاية</Label>
                <Input
                  id="new-trip-end"
                  type="date"
                  value={endDate}
                  min={startDate || undefined}
                  onChange={(event) => setEndDate(event.target.value)}
                />
              </div>
            </div>
          </div>
          <DialogFooter className="flex-row gap-2">
            <Button
              type="button"
              variant="outline"
              className="flex-1"
              onClick={() => setDialogOpen(false)}
            >
              إلغاء
            </Button>
            <Button
              type="button"
              className="flex-1"
              onClick={create}
              disabled={createTrip.isPending}
            >
              أنشئ
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function TripCard({
  trip,
  countryName,
  totalDistance,
  onOpen,
}: {
  trip: TripWithStops;
  countryName: string | null;
  totalDistance: number;
  onOpen: () => void;
}) {
  const days = trip.stops.reduce((max, stop) => Math.max(max, stop.dayIndex), 0);

  return (
    <AppCard as="button" pressable onClick={onOpen} className="w-full text-start">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="truncate text-lead font-semibold text-foreground">{trip.title}</p>
          <p className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-micro text-muted-foreground">
            {countryName && <span>{countryName}</span>}
            {trip.startDate && (
              <span className="inline-flex items-center gap-1 font-mono tabular-nums" dir="ltr">
                <CalendarDays className="h-3 w-3" aria-hidden="true" />
                {trip.startDate}
                {trip.endDate ? ` → ${trip.endDate}` : ''}
              </span>
            )}
          </p>
        </div>
        <span className="shrink-0 rounded-full border border-border px-2 py-0.5 font-mono text-micro tabular-nums text-muted-foreground">
          {trip.stops.length}
        </span>
      </div>

      <p className="mt-3 flex flex-wrap items-center gap-x-3 text-micro text-muted-foreground">
        {days > 0 && <span>{days} يوم</span>}
        {totalDistance > 0 && (
          <span className="font-mono tabular-nums">{formatDistance(totalDistance)}</span>
        )}
      </p>
    </AppCard>
  );
}

/** Sum of consecutive hops inside each day — a plan's real walking distance. */
function tripDistance(
  trip: TripWithStops,
  placeIndex: Map<string, { coordinates: [number, number] }>,
): number {
  const byDay = new Map<number, [number, number][]>();
  for (const stop of trip.stops) {
    const place = placeIndex.get(stop.placeId);
    if (!place) continue;
    const bucket = byDay.get(stop.dayIndex);
    if (bucket) bucket.push(place.coordinates);
    else byDay.set(stop.dayIndex, [place.coordinates]);
  }

  let total = 0;
  for (const points of byDay.values()) {
    for (let i = 1; i < points.length; i += 1) {
      total += haversineMeters(points[i - 1], points[i]);
    }
  }
  return total;
}
