import { lazy, Suspense, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { toast } from 'sonner';

import PageHeader from '@/components/PageHeader';
import SEO from '@/components/SEO';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { AppCard } from '@/components/ui/app-shell';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import { Textarea } from '@/components/ui/textarea';
import {
  AlertCircle,
  CheckCheck,
  ChevronDown,
  ChevronUp,
  Clock,
  Map as MapIcon,
  MoreVertical,
  Navigation,
  Pencil,
  Route,
  Trash2,
} from '@/lib/icons';
import { cn } from '@/lib/utils';

import TripChecklist from '../components/TripChecklist';
import TripEditSheet from '../components/TripEditSheet';

// The map engine is the heaviest dependency in the app; a trip page opened only
// to tick a packing list must not pay for it.
const TripRouteMap = lazy(() => import('../components/TripRouteMap'));
import { categoryMeta } from '../data/categories';
import {
  useDeleteTrip,
  useMyPlaces,
  useRemoveTripStop,
  useSaveTripStopOrder,
  useTrip,
  useUpdateTripStop,
} from '../hooks';
import { formatDistance, haversineMeters, orderByNearestNeighbour } from '../lib/geo';
import type { TravelPlace, TripStop } from '../types';

interface DayPlan {
  dayIndex: number;
  entries: { stop: TripStop; place: TravelPlace }[];
  distanceMeters: number;
}

/**
 * The itinerary.
 *
 * Stops are grouped into days, and each day can be re-ordered by hand or sorted
 * into a short chain with one tap. The distance line is the honest part: it shows
 * what a plan actually costs in travel, which is the number that makes people
 * move a stop to another day.
 */
export default function TripDetailPage() {
  const { tripId } = useParams<{ tripId: string }>();
  const navigate = useNavigate();
  const { trip, isLoading } = useTrip(tripId);
  const { data: places = [] } = useMyPlaces();
  const removeStop = useRemoveTripStop();
  const saveOrder = useSaveTripStopOrder();
  const updateStop = useUpdateTripStop();
  const deleteTrip = useDeleteTrip();

  const [confirmDelete, setConfirmDelete] = useState(false);
  const [editingStop, setEditingStop] = useState<{ stop: TripStop; place: TravelPlace } | null>(
    null,
  );
  const [panel, setPanel] = useState<'itinerary' | 'checklist'>('itinerary');
  const [editing, setEditing] = useState(false);
  /** Which day's route is shown on the map; null hides it. */
  const [mappedDay, setMappedDay] = useState<number | null>(null);

  const placeIndex = useMemo(() => new Map(places.map((place) => [place.id, place])), [places]);

  const days: DayPlan[] = useMemo(() => {
    if (!trip) return [];
    const grouped = new Map<number, { stop: TripStop; place: TravelPlace }[]>();
    for (const stop of trip.stops) {
      const place = placeIndex.get(stop.placeId);
      if (!place) continue;
      const bucket = grouped.get(stop.dayIndex);
      if (bucket) bucket.push({ stop, place });
      else grouped.set(stop.dayIndex, [{ stop, place }]);
    }

    return [...grouped.entries()]
      .sort(([a], [b]) => a - b)
      .map(([dayIndex, entries]) => {
        const ordered = entries.sort((a, b) => a.stop.sortOrder - b.stop.sortOrder);
        let distance = 0;
        for (let i = 1; i < ordered.length; i += 1) {
          distance += haversineMeters(
            ordered[i - 1].place.coordinates,
            ordered[i].place.coordinates,
          );
        }
        return { dayIndex, entries: ordered, distanceMeters: distance };
      });
  }, [placeIndex, trip]);

  const totalDistance = days.reduce((sum, day) => sum + day.distanceMeters, 0);

  const moveStop = (day: DayPlan, index: number, direction: -1 | 1) => {
    const target = index + direction;
    if (target < 0 || target >= day.entries.length) return;
    const reordered = [...day.entries];
    [reordered[index], reordered[target]] = [reordered[target], reordered[index]];
    saveOrder.mutate(
      reordered.map((entry, position) => ({
        id: entry.stop.id,
        dayIndex: day.dayIndex,
        sortOrder: position,
      })),
    );
  };

  const optimiseDay = (day: DayPlan) => {
    if (day.entries.length < 3) return;
    const ordered = orderByNearestNeighbour(
      day.entries.map((entry) => ({ ...entry, coordinates: entry.place.coordinates })),
    );
    saveOrder.mutate(
      ordered.map((entry, position) => ({
        id: entry.stop.id,
        dayIndex: day.dayIndex,
        sortOrder: position,
      })),
    );
    toast.success('رُتّب اليوم بأقصر تنقّل');
  };

  const moveToDay = (stop: TripStop, dayIndex: number) => {
    saveOrder.mutate([{ id: stop.id, dayIndex, sortOrder: 999 }]);
  };

  const remove = async () => {
    if (!trip) return;
    try {
      await deleteTrip.mutateAsync(trip.id);
      toast.success('حُذفت الرحلة');
      navigate('/travel-atlas/trips', { replace: true });
    } catch (error) {
      toast.error('تعذّر الحذف', { description: (error as Error)?.message });
    }
  };

  if (isLoading && !trip) return <TripSkeleton />;

  if (!trip) {
    return (
      <div className="page-shell page-shell-flush">
        <PageHeader title="رحلاتي" backTo="/travel-atlas/trips" sticky />
        <div className="empty-state empty-state-surface min-h-[60dvh]" role="alert">
          <AlertCircle data-empty-icon aria-hidden="true" />
          <strong>لم نجد هذه الرحلة</strong>
        </div>
      </div>
    );
  }

  const maxDay = Math.max(1, ...days.map((day) => day.dayIndex));

  return (
    <div className="page-shell page-shell-flush">
      <SEO
        title={`${trip.title} — أطلس الرحلات`}
        description={`خطة رحلة تحتوي ${trip.stops.length} مكانًا.`}
        path={`/travel-atlas/trips/${trip.id}`}
      />
      <PageHeader
        title={trip.title}
        subtitle={[
          trip.startDate ? `${trip.startDate}${trip.endDate ? ` → ${trip.endDate}` : ''}` : null,
          `${trip.stops.length} مكانًا`,
          totalDistance > 0 ? formatDistance(totalDistance) : null,
        ]
          .filter(Boolean)
          .join(' · ')}
        backTo="/travel-atlas/trips"
        sticky
        right={
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button type="button" className="app-icon-btn" aria-label="خيارات الرحلة">
                <MoreVertical className="h-5 w-5" aria-hidden="true" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onSelect={() => setEditing(true)} className="gap-2">
                <Pencil className="h-4 w-4" aria-hidden="true" />
                تعديل الرحلة
              </DropdownMenuItem>
              <DropdownMenuItem
                onSelect={() => setConfirmDelete(true)}
                className="gap-2 text-destructive"
              >
                <Trash2 className="h-4 w-4" aria-hidden="true" />
                حذف الرحلة
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        }
      />

      <main className="mx-auto w-full max-w-lg pb-page pt-4">
        {trip.notesAr && (
          <AppCard className="mb-5">
            <p className="whitespace-pre-line text-body leading-7 text-foreground/90">
              {trip.notesAr}
            </p>
          </AppCard>
        )}

        <div className="mb-5">
          <div
            className="inline-flex gap-1 rounded-button border border-border p-1"
            role="group"
            aria-label="لوحة الرحلة"
          >
            <button
              type="button"
              onClick={() => setPanel('itinerary')}
              aria-pressed={panel === 'itinerary'}
              className={cn(
                'inline-flex min-h-11 items-center gap-1.5 rounded-button px-3 text-mini',
                panel === 'itinerary'
                  ? 'bg-[hsl(var(--live)/0.1)] text-foreground'
                  : 'text-muted-foreground',
              )}
            >
              <Route className="h-4 w-4" aria-hidden="true" />
              الخطة
            </button>
            <button
              type="button"
              onClick={() => setPanel('checklist')}
              aria-pressed={panel === 'checklist'}
              className={cn(
                'inline-flex min-h-11 items-center gap-1.5 rounded-button px-3 text-mini',
                panel === 'checklist'
                  ? 'bg-[hsl(var(--live)/0.1)] text-foreground'
                  : 'text-muted-foreground',
              )}
            >
              <CheckCheck className="h-4 w-4" aria-hidden="true" />
              الحاجيات
              {trip.checklist.length > 0 && (
                <span className="font-mono tabular-nums">
                  {trip.checklist.filter((item) => item.isDone).length}/{trip.checklist.length}
                </span>
              )}
            </button>
          </div>
        </div>

        {panel === 'checklist' ? (
          <TripChecklist tripId={trip.id} items={trip.checklist} />
        ) : days.length === 0 ? (
          <div className="empty-state empty-state-surface min-h-[45dvh]">
            <Route data-empty-icon aria-hidden="true" />
            <strong>لا محطات في هذه الرحلة</strong>
            <span>افتح أي مكان في أطلسك واختر «أضف إلى رحلة».</span>
            <Button type="button" className="mt-6" onClick={() => navigate('/travel-atlas')}>
              تصفّح الأطلس
            </Button>
          </div>
        ) : (
          <div className="app-stack">
            {days.map((day) => (
              <section key={day.dayIndex}>
                <div className="mb-2 flex items-center justify-between gap-2">
                  <h3 className="app-section-label mb-0">اليوم {day.dayIndex}</h3>
                  <span className="flex items-center gap-2 text-micro text-muted-foreground">
                    {day.distanceMeters > 0 && (
                      <span className="font-mono tabular-nums">
                        {formatDistance(day.distanceMeters)}
                      </span>
                    )}
                    {day.entries.length >= 2 && (
                      <button
                        type="button"
                        onClick={() =>
                          setMappedDay(mappedDay === day.dayIndex ? null : day.dayIndex)
                        }
                        aria-pressed={mappedDay === day.dayIndex}
                        className="inline-flex items-center gap-1 hover:text-foreground"
                      >
                        <MapIcon className="h-3.5 w-3.5" aria-hidden="true" />
                        {mappedDay === day.dayIndex ? 'أخفِ الخريطة' : 'على الخريطة'}
                      </button>
                    )}
                    {day.entries.length >= 3 && (
                      <button
                        type="button"
                        onClick={() => optimiseDay(day)}
                        className="inline-flex items-center gap-1 hover:text-foreground"
                      >
                        <Route className="h-3.5 w-3.5" aria-hidden="true" />
                        أقصر مسار
                      </button>
                    )}
                  </span>
                </div>

                {mappedDay === day.dayIndex && (
                  <Suspense
                    fallback={<div className="skeleton mb-2 h-56 w-full" aria-hidden="true" />}
                  >
                    <TripRouteMap
                      places={day.entries.map((entry) => entry.place)}
                      className="mb-2 h-56 overflow-hidden rounded-card border border-border"
                    />
                  </Suspense>
                )}

                <AppCard className="p-0">
                  <ol className="divide-y divide-border">
                    {day.entries.map((entry, index) => {
                      const CategoryIcon = categoryMeta(entry.place.category).icon;
                      return (
                        <li key={entry.stop.id} className="flex items-center gap-2 px-3 py-2.5">
                          <span className="grid h-7 w-7 shrink-0 place-items-center rounded-full border border-border font-mono text-micro tabular-nums text-muted-foreground">
                            {index + 1}
                          </span>

                          <button
                            type="button"
                            onClick={() => navigate(`/travel-atlas/place/${entry.place.id}`)}
                            className="flex min-w-0 flex-1 items-center gap-2 text-start"
                          >
                            <CategoryIcon
                              className="h-4 w-4 shrink-0 text-muted-foreground"
                              aria-hidden="true"
                            />
                            <span className="min-w-0">
                              <span className="block truncate text-body text-foreground">
                                {entry.place.nameAr}
                              </span>
                              {entry.place.city && (
                                <span className="block truncate text-micro text-muted-foreground">
                                  {entry.place.city}
                                </span>
                              )}
                            </span>
                          </button>

                          {entry.stop.startTime && (
                            <span
                              className="shrink-0 font-mono text-mini tabular-nums text-muted-foreground"
                              dir="ltr"
                            >
                              {entry.stop.startTime}
                            </span>
                          )}

                          <div className="flex shrink-0 items-center">
                            <button
                              type="button"
                              onClick={() => setEditingStop(entry)}
                              aria-label="وقت المحطة وملاحظتها"
                              className="grid h-9 w-9 place-items-center rounded-button text-muted-foreground hover:text-foreground"
                            >
                              <Clock className="h-4 w-4" aria-hidden="true" />
                            </button>
                            <button
                              type="button"
                              onClick={() => moveStop(day, index, -1)}
                              disabled={index === 0}
                              aria-label="تقديم"
                              className={cn(
                                'grid h-9 w-9 place-items-center rounded-button text-muted-foreground',
                                index === 0 ? 'opacity-40' : 'hover:text-foreground',
                              )}
                            >
                              <ChevronUp className="h-4 w-4" aria-hidden="true" />
                            </button>
                            <button
                              type="button"
                              onClick={() => moveStop(day, index, 1)}
                              disabled={index === day.entries.length - 1}
                              aria-label="تأخير"
                              className={cn(
                                'grid h-9 w-9 place-items-center rounded-button text-muted-foreground',
                                index === day.entries.length - 1
                                  ? 'opacity-40'
                                  : 'hover:text-foreground',
                              )}
                            >
                              <ChevronDown className="h-4 w-4" aria-hidden="true" />
                            </button>
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <button
                                  type="button"
                                  className="grid h-9 w-9 place-items-center rounded-button text-muted-foreground hover:text-foreground"
                                  aria-label="خيارات المحطة"
                                >
                                  <MoreVertical className="h-4 w-4" aria-hidden="true" />
                                </button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end" className="min-w-44">
                                {Array.from({ length: maxDay + 1 }, (_, i) => i + 1)
                                  .filter((dayNumber) => dayNumber !== day.dayIndex)
                                  .map((dayNumber) => (
                                    <DropdownMenuItem
                                      key={dayNumber}
                                      onSelect={() => moveToDay(entry.stop, dayNumber)}
                                    >
                                      انقل إلى اليوم {dayNumber}
                                    </DropdownMenuItem>
                                  ))}
                                <DropdownMenuItem
                                  onSelect={() => removeStop.mutate(entry.stop.id)}
                                  className="gap-2 text-destructive"
                                >
                                  <Trash2 className="h-4 w-4" aria-hidden="true" />
                                  أزل من الرحلة
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </div>
                        </li>
                      );
                    })}
                  </ol>
                </AppCard>

                {day.entries.length > 1 && (
                  <a
                    href={multiStopDirectionsUrl(day.entries.map((entry) => entry.place))}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="mt-2 inline-flex items-center gap-1.5 text-mini text-muted-foreground hover:text-foreground"
                  >
                    <Navigation className="h-3.5 w-3.5" aria-hidden="true" />
                    افتح مسار اليوم في الخرائط
                  </a>
                )}
              </section>
            ))}
          </div>
        )}
      </main>

      {editingStop && (
        <StopEditSheet
          key={editingStop.stop.id}
          stop={editingStop.stop}
          place={editingStop.place}
          onClose={() => setEditingStop(null)}
          onSave={(fields) => {
            updateStop.mutate({ stopId: editingStop.stop.id, fields });
            setEditingStop(null);
          }}
        />
      )}

      {editing && <TripEditSheet trip={trip} onOpenChange={setEditing} />}

      <AlertDialog open={confirmDelete} onOpenChange={setConfirmDelete}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>حذف {trip.title}؟</AlertDialogTitle>
            <AlertDialogDescription>
              تُحذف الخطة ومحطاتها. الأماكن نفسها تبقى في أطلسك.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>إلغاء</AlertDialogCancel>
            <AlertDialogAction onClick={remove}>حذف</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

/**
 * Time, length and note for one stop.
 *
 * A clock time is what turns a list of places into a plan you can follow, and it
 * also re-sorts the day automatically — timed stops rise above untimed ones.
 */
function StopEditSheet({
  stop,
  place,
  onClose,
  onSave,
}: {
  stop: TripStop;
  place: TravelPlace;
  onClose: () => void;
  onSave: (fields: {
    startTime: string | null;
    durationMinutes: number | null;
    noteAr: string | null;
  }) => void;
}) {
  const [time, setTime] = useState(stop.startTime ?? '');
  const [duration, setDuration] = useState(
    stop.durationMinutes === null ? '' : String(stop.durationMinutes),
  );
  const [note, setNote] = useState(stop.noteAr ?? '');

  return (
    <Sheet open onOpenChange={(open) => !open && onClose()}>
      <SheetContent side="bottom" className="max-h-[80dvh] overflow-y-auto rounded-t-3xl">
        <SheetHeader className="text-start">
          <SheetTitle>{place.nameAr}</SheetTitle>
          <SheetDescription>وقت المحطة في الخطة</SheetDescription>
        </SheetHeader>

        <div className="mt-6 space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label htmlFor="stop-time">الوقت</Label>
              <Input
                id="stop-time"
                type="time"
                value={time}
                onChange={(event) => setTime(event.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="stop-duration">المدة (دقائق)</Label>
              <Input
                id="stop-duration"
                inputMode="numeric"
                value={duration}
                placeholder={place.durationMinutes ? String(place.durationMinutes) : '60'}
                onChange={(event) => setDuration(event.target.value.replace(/[^\d]/g, ''))}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="stop-note">ملاحظة</Label>
            <Textarea
              id="stop-note"
              rows={3}
              value={note}
              onChange={(event) => setNote(event.target.value)}
              placeholder="حجز، تذكرة، أو تنبيه لنفسك"
            />
          </div>
        </div>

        <SheetFooter className="mt-6 flex-row gap-2">
          <Button type="button" variant="outline" className="flex-1" onClick={onClose}>
            إلغاء
          </Button>
          <Button
            type="button"
            className="flex-1"
            onClick={() => {
              const minutes = Number(duration);
              onSave({
                startTime: time || null,
                durationMinutes:
                  Number.isFinite(minutes) && minutes >= 5 && minutes <= 1440 ? minutes : null,
                noteAr: note.trim() || null,
              });
            }}
          >
            حفظ
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}

/**
 * Google Maps takes an origin, a destination and intermediate waypoints; a day
 * with five stops becomes one navigable route instead of five separate lookups.
 */
function multiStopDirectionsUrl(places: TravelPlace[]): string {
  const points = places.map((place) => `${place.coordinates[1]},${place.coordinates[0]}`);
  const origin = points[0];
  const destination = points[points.length - 1];
  const waypoints = points.slice(1, -1).join('|');
  const params = new URLSearchParams({ api: '1', origin, destination });
  if (waypoints) params.set('waypoints', waypoints);
  return `https://www.google.com/maps/dir/?${params.toString()}`;
}

function TripSkeleton() {
  return (
    <div className="page-shell page-shell-flush">
      <div className="flex h-[var(--ui-header-h)] items-center gap-3 border-b border-border px-4">
        <div className="skeleton h-11 w-11 rounded-md" />
        <div className="skeleton h-5 w-40" />
      </div>
      <div className="mx-auto w-full max-w-lg space-y-3 pt-4">
        <div className="skeleton h-32 w-full" />
        <div className="skeleton h-32 w-full" />
      </div>
    </div>
  );
}
