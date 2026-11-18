import { useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';

import PageHeader from '@/components/PageHeader';
import SEO from '@/components/SEO';
import { AppList, AppRow, IconButton, IconChip, PageShell } from '@/components/ui/app-shell';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import ResponsiveDrawer from '@/components/ui/ResponsiveDrawer';
import { SkeletonList } from '@/components/ui/skeleton';
import { StateView } from '@/components/ui/state-view';
import { CalendarDays, Luggage, Plus } from '@/lib/icons';

import { useCreateTrip, useMyPlaces, useTravelCountries, useTrips } from '../hooks';
import { formatDistance, haversineMeters } from '../lib/geo';
import type { TripWithStops } from '../types';

/**
 * Trips list — G4 list/collection surface.
 *
 * A trip is a container for places plus dates, and the list only has to answer
 * "which trip do I open", so rows lead with the dates and the number of stops
 * instead of a cover image that would repeat the places inside.
 *
 * States (A/B/C, catalog §5.6):
 *   A — page identity, one primary action, empty state with a real CTA.
 *   B — the create drawer keeps its values, disables the submit and shows a
 *       specific inline error; the list never shows a fake optimistic row.
 *   C — success closes the drawer, clears the fields and opens the new trip;
 *       failure keeps the drawer open with the typed values intact.
 */
export default function TripsPage() {
  const navigate = useNavigate();
  const { data: trips = [], isLoading, isError, refetch } = useTrips();
  const { data: places = [] } = useMyPlaces();
  const { data: countries = [] } = useTravelCountries();
  const createTrip = useCreateTrip();

  const [dialogOpen, setDialogOpen] = useState(false);
  const [title, setTitle] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [formError, setFormError] = useState<string | null>(null);
  // The create drawer is controlled, so the shared focus-return hook cannot
  // always see the opener (vaul's Drawer does not forward onOpenAutoFocus).
  // Keep the exact button that opened it and hand focus back on every close
  // path: Escape, overlay click, cancel, or a successful create.
  const openerRef = useRef<HTMLButtonElement | null>(null);

  const closeDialog = () => {
    setDialogOpen(false);
    setFormError(null);
    const opener = openerRef.current;
    if (opener?.isConnected) {
      requestAnimationFrame(() => opener.focus({ preventScroll: true }));
    }
  };

  const placeIndex = useMemo(() => new Map(places.map((place) => [place.id, place])), [places]);
  const countryNames = useMemo(
    () => new Map(countries.map((country) => [country.id, country.nameAr])),
    [countries],
  );

  const openDialog = () => {
    setFormError(null);
    setDialogOpen(true);
  };

  const submit = async () => {
    const trimmed = title.trim();
    if (trimmed.length === 0) {
      setFormError('اكتب عنوان الرحلة أولاً.');
      return;
    }
    if (startDate && endDate && endDate < startDate) {
      setFormError('تاريخ النهاية قبل تاريخ البداية.');
      return;
    }
    setFormError(null);
    try {
      const trip = await createTrip.mutateAsync({
        title: trimmed,
        startDate: startDate || null,
        endDate: endDate || null,
        status: 'planned',
      });
      // A response without an id means the write did not land; navigating to
      // /trips/undefined would replace a clear failure with a confusing
      // "trip not found". Keep the drawer open with the typed values instead.
      if (!trip?.id) {
        setFormError('لم تُحفظ الرحلة. تحقّق من الاتصال وأعد المحاولة.');
        return;
      }
      setDialogOpen(false);
      setTitle('');
      setStartDate('');
      setEndDate('');
      navigate(`/travel-atlas/trips/${trip.id}`);
    } catch (error) {
      const message = (error as Error)?.message;
      setFormError(
        message === 'not_authenticated'
          ? 'سجّل الدخول أولاً لإنشاء رحلة ومزامنتها.'
          : 'تعذّر إنشاء الرحلة. تحقّق من الاتصال وأعد المحاولة.',
      );
    }
  };

  return (
    <PageShell
      header={
        <PageHeader
          title="رحلاتي"
          subtitle={trips.length > 0 ? `${trips.length} رحلة` : 'خطّط من أماكنك المحفوظة'}
          icon={<Luggage className="h-5 w-5 text-primary" aria-hidden="true" />}
          backTo="/travel-atlas"
          sticky
          right={
            <IconButton
              type="button"
              aria-label="رحلة جديدة"
              onClick={(event) => {
                openerRef.current = event.currentTarget;
                openDialog();
              }}
            >
              <Plus className="h-5 w-5" aria-hidden="true" />
            </IconButton>
          }
        />
      }
    >
      <SEO
        title="رحلاتي — أطلس الرحلات"
        description="خطّط رحلاتك يومًا بيوم من الأماكن التي حفظتها."
        path="/travel-atlas/trips"
      />

      {isLoading ? (
        <SkeletonList rows={3} avatar />
      ) : isError ? (
        <StateView
          kind="error"
          title="تعذّر تحميل رحلاتك"
          body="لم نتمكّن من قراءة قائمة الرحلات. بياناتك المحفوظة على هذا الجهاز سليمة، ويمكنك إعادة المحاولة."
          action={{ label: 'أعد المحاولة', onClick: () => void refetch() }}
        />
      ) : trips.length === 0 ? (
        <StateView
          kind="empty"
          icon={<Luggage className="h-5 w-5" aria-hidden />}
          title="لا رحلات بعد"
          body="أنشئ رحلة، ثم أضف إليها الأماكن من صفحاتها. التواريخ اختيارية وتستطيع إضافتها لاحقًا."
          action={{ label: 'رحلة جديدة', onClick: openDialog, icon: <Plus className="h-4 w-4" aria-hidden /> }}
        />
      ) : (
        <AppList>
          {trips.map((trip) => (
            <TripRow
              key={trip.id}
              trip={trip}
              countryName={trip.countryId ? (countryNames.get(trip.countryId) ?? null) : null}
              totalDistance={tripDistance(trip, placeIndex)}
              onOpen={() => navigate(`/travel-atlas/trips/${trip.id}`)}
            />
          ))}
        </AppList>
      )}

      <ResponsiveDrawer
        open={dialogOpen}
        onOpenChange={(open) => {
          if (open) {
            setDialogOpen(true);
            return;
          }
          closeDialog();
        }}
        title="رحلة جديدة"
        description="التواريخ اختيارية — يمكن إضافتها لاحقًا."
      >
        <form
          className="flex flex-col gap-4"
          // Native constraint bubbles are skipped so validation is always the
          // product's own inline, specific message (and so a keyboard/screen
          // reader user hears it instead of a browser popup).
          noValidate
          onSubmit={(event) => {
            event.preventDefault();
            void submit();
          }}
        >
          <div className="flex flex-col gap-2">
            <Label htmlFor="new-trip-title">العنوان</Label>
            <Input
              id="new-trip-title"
              value={title}
              onChange={(event) => setTitle(event.target.value)}
              placeholder="مثال: أسبوع في جورجيا"
              aria-invalid={formError !== null && title.trim().length === 0 ? true : undefined}
              disabled={createTrip.isPending}
              autoFocus
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-2">
              <Label htmlFor="new-trip-start">البداية</Label>
              <Input
                id="new-trip-start"
                type="date"
                value={startDate}
                onChange={(event) => setStartDate(event.target.value)}
                disabled={createTrip.isPending}
              />
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="new-trip-end">النهاية</Label>
              <Input
                id="new-trip-end"
                type="date"
                value={endDate}
                onChange={(event) => setEndDate(event.target.value)}
                disabled={createTrip.isPending}
              />
            </div>
          </div>

          {formError && (
            <p role="alert" className="text-meta leading-relaxed text-destructive">
              {formError}
            </p>
          )}

          <div className="mt-1 flex flex-row gap-2">
            <Button
              type="button"
              variant="outline"
              className="flex-1"
              onClick={closeDialog}
            >
              إلغاء
            </Button>
            <Button type="submit" className="flex-1" isLoading={createTrip.isPending} loadingText="جارٍ الإنشاء…">
              أنشئ
            </Button>
          </div>
        </form>
      </ResponsiveDrawer>
    </PageShell>
  );
}

function TripRow({
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

  const meta = [
    countryName,
    trip.stops.length ? trip.stops.length + ' توقف' : '',
    days > 0 ? days + ' يوم' : '',
    totalDistance > 0 ? formatDistance(totalDistance) : '',
  ]
    .filter(Boolean)
    .join(' · ');

  return (
    <AppRow
      onClick={onOpen}
      leading={
        <IconChip tone="accent">
          <Luggage className="h-4 w-4" aria-hidden />
        </IconChip>
      }
      title={trip.title}
      subtitle={
        <span className="flex flex-wrap items-center gap-x-2 gap-y-0.5">
          {trip.startDate && (
            <bdi dir="ltr" className="inline-flex items-center gap-1 font-mono tabular-nums">
              <CalendarDays className="h-3 w-3" aria-hidden />
              {trip.startDate}
              {trip.endDate ? ` → ${trip.endDate}` : ''}
            </bdi>
          )}
          {meta && <span>{meta}</span>}
        </span>
      }
      chevron
    />
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
