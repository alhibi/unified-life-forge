import { AnimatePresence, motion } from 'framer-motion';
import React, { useMemo, useState } from 'react';

import PageHeader from '@/components/PageHeader';
import SEO from '@/components/SEO';
import { PageShell } from '@/components/ui/app-shell';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { StateView } from '@/components/ui/state-view';
import {
  formatGregorianDate,
  getEventsForMonth,
  HIJRI_MONTHS,
  type ResolvedIslamicEvent,
} from '@/features/calendar/data/islamicOccasions';
import { useLiveHijriDate } from '@/features/calendar/hooks/useLiveHijriDate';
import { CalendarDays } from '@/lib/icons';
import { cn } from '@/lib/utils';

const GREGORIAN_TODAY = new Intl.DateTimeFormat('ar', {
  weekday: 'long',
  day: 'numeric',
  month: 'long',
});

// Accent palette for occasion cards (mirrors PrayerTimes.tsx accents).
const ACCENT: Record<string, string> = {
  'border-s-data-1': 'hsl(var(--data-1))',
  'border-s-data-4': 'hsl(var(--data-4))',
  'border-s-data-6': 'hsl(var(--data-6))',
  'border-s-data-5': 'hsl(var(--data-5))',
  'border-s-signal': 'hsl(var(--signal))',
  'border-s-[hsl(var(--track))]': 'hsl(var(--muted-foreground))',
};
const OCCASION_TONE: Record<string, 1 | 2 | 3 | 4 | 5 | 6> = {
  'border-s-data-1': 1, 'border-s-data-4': 4, 'border-s-data-6': 6,
  'border-s-data-5': 5, 'border-s-signal': 2,
};

export default function AllOccasions() {
  const { hijri: today, todayISO, offset } = useLiveHijriDate();

  const [selectedMonth, setSelectedMonth] = useState<number>(today.month);
  const [selectedDay, setSelectedDay] = useState<number>(today.day);
  const [selectedEvent, setSelectedEvent] = useState<ResolvedIslamicEvent | null>(null);

  // Recompute when the day flips or the Saudi offset changes: the shared
  // resolver anchors events to the current Hijri year by reading the live
  // offset and the clock through its module state, so these deps are real
  // even though the closure below does not name them.
  const byMonth = useMemo(() => {
    const map: Record<number, ResolvedIslamicEvent[]> = {};
    for (let m = 1; m <= 12; m++) map[m] = getEventsForMonth(m);
    return map;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [todayISO, offset]);

  const monthEvents = useMemo(() => byMonth[selectedMonth] || [], [byMonth, selectedMonth]);
  const daysWithEvents = useMemo(() => {
    const set = new Set<number>();
    for (const ev of monthEvents) {
      for (let d = ev.day; d <= ev.endDay; d++) set.add(d);
    }
    return set;
  }, [monthEvents]);

  const dayEvents = monthEvents.filter(
    (ev) => selectedDay >= ev.day && selectedDay <= ev.endDay,
  );

  const days = Array.from({ length: 30 }, (_, i) => i + 1);

  const monthName = (idx: number) =>
    HIJRI_MONTHS[idx - 1];

  return (
    <PageShell flush centered={false} className="px-4 pt-2">
      <SEO
        title={'التقويم الهجري — SmartHub'}
        description={
          'تصفح المناسبات الإسلامية حسب الشهر الهجري.'
        }
        path="/occasions"
      />
      <div className="mx-auto flex w-full max-w-[var(--ui-content-max)] flex-col gap-5 pb-page">
        {/* ── Header ──────────────────────────────────────────────── */}
        <PageHeader sticky title={'التقويم الهجري'} subtitle={'تصفح المناسبات حسب الشهر الهجري'} />

        {/* ── Today: the page's anchor. One date read at a glance, with the
            Gregorian line underneath; no decorative colour fill. ── */}
        <div className="flex items-end justify-between gap-4 border-b border-border pb-4">
          <div className="min-w-0">
            <p className="text-micro font-semibold text-muted-foreground">اليوم</p>
            <p className="mt-1 text-title font-bold tabular-nums text-foreground">
              {today.day} {monthName(today.month)} {today.year}
            </p>
            <p className="mt-1 text-mini text-muted-foreground">
              <span dir="rtl">{GREGORIAN_TODAY.format(new Date())}</span>
            </p>
          </div>
          <span className="row-icon shrink-0" aria-hidden>
            <CalendarDays className="h-5 w-5" />
          </span>
        </div>

        {/* ── Months grid ────────────────────────────────────────── */}
        <div className="grid grid-cols-3 gap-2">
          {HIJRI_MONTHS.map((_, i) => {
            const monthIdx = i + 1;
            const count = (byMonth[monthIdx] || []).length;
            const active = monthIdx === selectedMonth;
            const isCurrent = monthIdx === today.month;
            return (
              <button
                key={monthIdx}
                onClick={() => {
                  setSelectedMonth(monthIdx);
                  setSelectedDay(monthIdx === today.month ? today.day : 1);
                }}
                className={cn(
                  'relative rounded-lg border px-2.5 py-2 text-start transition-motion',
                  active
                    ? 'bg-primary/15 border-primary/40'
                    : 'bg-secondary border-border/60 hover:bg-accent',
                )}
              >
                <div className="flex items-baseline justify-between mb-0.5">
                  <p
                    className={cn(
                      'text-mini font-bold leading-tight truncate',
                      active ? 'text-primary' : 'text-foreground',
                    )}
                  >
                    {monthName(monthIdx)}
                  </p>
                  <span className="text-micro font-bold text-secondary-muted tabular-nums shrink-0">
                    {monthIdx}
                  </span>
                </div>
                <div className="flex items-center gap-1">
                  <span className="text-micro text-secondary-muted tabular-nums">
                    {count}
                  </span>
                  <span className="text-micro text-secondary-muted">
                    {'مناسبة'}
                  </span>
                  {isCurrent && (
                    <span className="ms-auto w-1.5 h-1.5 rounded-full bg-primary" aria-hidden />
                  )}
                </div>
              </button>
            );
          })}
        </div>

        {/* ── Selected month header ─────────────────────────────── */}
        <div className="flex items-baseline justify-between pt-1">
          <h2 className="text-body font-bold text-foreground">
            {monthName(selectedMonth)}
          </h2>
          <span className="text-micro font-medium text-secondary-muted tabular-nums">
            {`${monthEvents.length} مناسبة`}
          </span>
        </div>

        {/* ── Days grid (compact: 6 cols × 5 rows = 30 days) ────── */}
        <div className="grid grid-cols-6 gap-1.5">
          {days.map((d) => {
            const hasEvent = daysWithEvents.has(d);
            const isToday = selectedMonth === today.month && d === today.day;
            const isSelected = d === selectedDay;
            return (
              <button
                key={d}
                onClick={() => setSelectedDay(d)}
                aria-pressed={isSelected}
                aria-label={isToday ? `${d} — اليوم` : `${d}`}
                className={cn(
                  'relative flex aspect-square items-center justify-center rounded-lg border transition-motion focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
                  isSelected
                    ? 'border-primary bg-primary'
                    : isToday
                      ? 'border-primary bg-primary/10'
                      : hasEvent
                        ? 'border-border/60 bg-secondary'
                        : 'border-border/30 bg-muted',
                )}
              >
                <span
                  className={cn(
                    'text-mini tabular-nums',
                    isSelected
                      ? 'font-bold text-primary-foreground'
                      : isToday
                        ? 'font-bold text-primary'
                        : hasEvent
                          ? 'font-semibold text-foreground'
                          : 'font-light text-muted-foreground/55',
                  )}
                >
                  {d}
                </span>
                {hasEvent && (
                  <span
                    className={cn(
                      'absolute bottom-1 left-1/2 h-1 w-1 -translate-x-1/2 rounded-full',
                      isSelected ? 'bg-primary-foreground' : 'bg-primary/70',
                    )}
                    aria-hidden
                  />
                )}
              </button>
            );
          })}
        </div>

        {/* Legend — the grid encodes three states; name them instead of
            leaving the dots unexplained. */}
        <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 px-1 text-micro text-muted-foreground">
          <span className="flex items-center gap-1.5">
            <span className="h-4 w-4 rounded-full border-2 border-primary" aria-hidden />
            اليوم
          </span>
          <span className="flex items-center gap-1.5">
            <span className="h-1 w-1 rounded-full bg-primary" aria-hidden />
            مناسبة
          </span>
          <span className="flex items-center gap-1.5">
            <span className="h-4 w-4 rounded bg-primary" aria-hidden />
            اليوم المحدد
          </span>
        </div>

        {/* ── Events for selected day ───────────────────────────── */}
        <div className="space-y-2.5 pt-2">
          <h3 className="text-meta font-semibold text-foreground">
            {`مناسبات ${selectedDay} ${HIJRI_MONTHS[selectedMonth - 1]}`}
          </h3>

          <AnimatePresence mode="popLayout">
            {dayEvents.length === 0 ? (
              <motion.div
                key="empty"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
              >
                <StateView
                  kind="empty"
                  compact
                  bare
                  title="لا مناسبات في هذا اليوم"
                  body="لا يوجد حدث مسجَّل لهذا اليوم من الشهر الهجري. اختر يوماً آخر من الشبكة، أو تنقّل بين الأشهر لترى المناسبات القادمة."
                />
              </motion.div>
            ) : (
              dayEvents.map((ev) => (
                <EventListCard
                  key={ev.id}
                  event={ev}
                  onOpen={() => setSelectedEvent(ev)}
                />
              ))
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* ── Event details dialog ─────────────────────────────── */}
      <EventDetailDialog
        event={selectedEvent}
        onClose={() => setSelectedEvent(null)}
      />
    </PageShell>
  );
}

// ───────────────────────────────────────────────────────────────────────────
// Subcomponents
// ───────────────────────────────────────────────────────────────────────────

function EventListCard({
  event,
  onOpen,
}: {
  event: ResolvedIslamicEvent;
  onOpen: () => void;
}) {
  const tone = OCCASION_TONE[event.color] ?? 3;
  const monthLabel = HIJRI_MONTHS[event.month - 1];
  const dayLabel =
    event.day === event.endDay ? `${event.day}` : `${event.day}-${event.endDay}`;
  const title = event.titleAr;
  const description = event.descriptionAr;

  return (
    <motion.button
      layout
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -8 }}
      transition={{ duration: 0.25 }}
      onClick={onOpen}
      data-tile-tone={tone}
      className="rich-widget w-full text-start rounded-card p-5 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
    >
      <div className="flex items-center justify-between mb-1">
        <span className="text-micro font-semibold text-muted-foreground">
          {monthLabel} {dayLabel}
        </span>
        {event.isMajorHoliday && (
          <span
            className="widget-icon-well text-micro font-bold px-2 py-1 rounded-button"
          >
            {'عيد'}
          </span>
        )}
      </div>
      <h4 className="text-meta font-bold text-foreground leading-snug mb-1">
        {title}
      </h4>
      <p className="text-micro text-muted-foreground leading-relaxed line-clamp-2">
        {description}
      </p>
      <p className="text-micro text-secondary-muted mt-1.5 tabular-nums">
        {formatGregorianDate(event.gregorianDate, 'ar')}
      </p>
    </motion.button>
  );
}

function EventDetailDialog({
  event,
  onClose,
}: {
  event: ResolvedIslamicEvent | null;
  onClose: () => void;
}) {
  return (
    <Dialog open={event !== null} onOpenChange={(open) => { if (!open) onClose(); }}>
      <DialogContent className="max-h-[85dvh] overflow-y-auto" onClose={onClose}>
        {event && (
          <>
            <DialogHeader>
              <DialogTitle>{event.titleAr}</DialogTitle>
            </DialogHeader>
            <DetailContent event={event} />
            <button
              onClick={onClose}
              className="w-full rounded-lg border border-border bg-background py-2.5 text-mini font-semibold text-foreground transition-colors hover:border-primary/60 hover:text-primary"
            >
              {'إغلاق'}
            </button>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}

function DetailContent({
  event,
}: {
  event: ResolvedIslamicEvent;
}) {
  const accent = ACCENT[event.color] ?? 'hsl(var(--success))';
  const monthLabel = HIJRI_MONTHS[event.month - 1];
  const dayLabel =
    event.day === event.endDay ? `${event.day}` : `${event.day}-${event.endDay}`;
  const description = event.descriptionAr;
  const notes = event.notesAr;

  const typeLabel = (() => {
    const ar: Record<string, string> = {
      HISTORICAL: 'تاريخي',
      RELIGIOUS: 'ديني',
      RECURRING_RITUAL: 'عبادة دورية',
      BIRTH: 'مولد',
      DEATH: 'وفاة',
    };
    return ar[event.type];
  })();

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2 flex-wrap">
        <span className="text-micro font-semibold" style={{ color: accent }}>
          {dayLabel} {monthLabel} {event.hijriYear}
        </span>
        <span className="text-micro font-semibold text-secondary-muted px-2 py-0.5 rounded bg-muted/40">
          {typeLabel}
        </span>
        {event.isMajorHoliday && (
          <span
            className="rounded px-1.5 py-0.5 text-micro font-semibold"
            style={{ background: 'hsl(var(--secondary))', color: accent }}
          >
            عيد كبير
          </span>
        )}
      </div>

      <p className="text-mini text-foreground/85 leading-relaxed whitespace-pre-line">
        {description}
      </p>

      {notes && (
        <div className="rounded-xl border border-border/50 bg-muted p-3">
          <p className="text-micro font-bold text-muted-foreground uppercase tracking-wide mb-1">
            {'ملاحظة'}
          </p>
          <p className="text-mini text-muted-foreground leading-relaxed">
            {notes}
          </p>
        </div>
      )}

      {event.yearAh !== undefined && (
        <p className="text-micro text-secondary-muted tabular-nums">
          {`السنة الهجرية: ${
                event.yearAh > 0 ? event.yearAh : Math.abs(event.yearAh)
              }${event.yearAh < 0 ? ' قبل الهجرة' : ' هـ'}`}
        </p>
      )}

      <p className="text-micro text-secondary-muted border-t border-border/40 pt-2 tabular-nums">
        {formatGregorianDate(event.gregorianDate, 'ar')}
      </p>
    </div>
  );
}