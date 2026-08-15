import { AnimatePresence,motion } from 'framer-motion';
import React, { useMemo, useState } from 'react';

import BackButton from '@/components/BackButton';
import SEO from '@/components/SEO';
import {
  formatGregorianDate,
  getEventsForMonth,
  HIJRI_MONTHS,
  type ResolvedIslamicEvent,
} from '@/features/calendar/data/islamicOccasions';
import { useLiveHijriDate } from '@/features/calendar/hooks/useLiveHijriDate';
import { MOTION } from '@/lib/motion';

// Accent palette for occasion cards (mirrors PrayerTimes.tsx accents).
const ACCENT: Record<string, string> = {
  'border-s-emerald-500': '#10b981',
  'border-s-emerald-600': '#059669',
  'border-s-sky-500': '#0ea5e9',
  'border-s-violet-500': '#8b5cf6',
  'border-s-amber-500': '#f59e0b',
  'border-s-yellow-500': '#eab308',
  'border-s-yellow-600': '#ca8a04',
  'border-s-rose-500': '#f43f5e',
  'border-s-slate-500': '#64748b',
};

export default function AllOccasions() {
  const { hijri: today, todayISO, offset } = useLiveHijriDate();

  const [selectedMonth, setSelectedMonth] = useState<number>(today.month);
  const [selectedDay, setSelectedDay] = useState<number>(today.day);
  const [selectedEvent, setSelectedEvent] = useState<ResolvedIslamicEvent | null>(null);

  // Recompute when the day flips or the Saudi offset changes.
  const byMonth = useMemo(() => {
    const map: Record<number, ResolvedIslamicEvent[]> = {};
    for (let m = 1; m <= 12; m++) map[m] = getEventsForMonth(m);
    return map;
  }, [todayISO, offset]);

  const monthEvents = byMonth[selectedMonth] || [];
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
    <div
      className="min-h-screen bg-background pb-page px-4 pt-6"
      dir={'rtl'}
    >
      <SEO
        title={'التقويم الهجري — SmartHub'}
        description={
          'تصفح المناسبات الإسلامية حسب الشهر الهجري.'
        }
        path="/occasions"
      />
      <div className="max-w-lg mx-auto space-y-5">
        {/* ── Header ──────────────────────────────────────────────── */}
        <div className="flex items-center gap-3">
          <BackButton />
          <div className="flex-1 min-w-0 text-end">
            <h1 className="text-display font-black text-foreground leading-tight">
              {'التقويم الهجري'}
            </h1>
            <p className="text-mini text-muted-foreground">
              {'تصفح المناسبات حسب الشهر الهجري'}
            </p>
          </div>
        </div>

        {/* ── Today indicator ────────────────────────────────────── */}
        <div className="rounded-2xl bg-primary/5 border border-primary/15 px-4 py-2.5 flex items-center justify-between">
          <span className="text-micro font-bold uppercase tracking-wider text-primary/70">
            {'اليوم'}
          </span>
          <span className="text-mini font-semibold text-foreground">
            {today.day} {monthName(today.month)} {today.year}
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
              <motion.button
                key={monthIdx}
                onClick={() => {
                  setSelectedMonth(monthIdx);
                  setSelectedDay(monthIdx === today.month ? today.day : 1);
                }}
                whileTap={{ scale: 0.96 }}
                className={`relative rounded-xl border px-2.5 py-2 text-start transition-all ${
                  active
                    ? 'bg-primary/15 border-primary/40 '
                    : 'bg-card/60 border-border/50 hover:bg-card'
                }`}
              >
                <div className="flex items-baseline justify-between mb-0.5">
                  <p
                    className={`text-mini font-bold leading-tight truncate ${
                      active ? 'text-primary' : 'text-foreground'
                    }`}
                  >
                    {monthName(monthIdx)}
                  </p>
                  <span className="text-micro font-bold text-muted-foreground/60 tabular-nums shrink-0">
                    {monthIdx}
                  </span>
                </div>
                <div className="flex items-center gap-1">
                  <span className="text-micro text-muted-foreground tabular-nums">
                    {count}
                  </span>
                  <span className="text-micro text-muted-foreground/70">
                    {'مناسبة'}
                  </span>
                  {isCurrent && (
                    <span className="ms-auto w-1.5 h-1.5 rounded-full bg-primary" />
                  )}
                </div>
              </motion.button>
            );
          })}
        </div>

        {/* ── Selected month header ─────────────────────────────── */}
        <div className="flex items-baseline justify-between pt-1">
          <h2 className="text-body font-black text-foreground">
            {monthName(selectedMonth)}
          </h2>
          <span className="text-micro font-medium text-muted-foreground/70">
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
              <motion.button
                key={d}
                whileTap={{ scale: 0.92 }}
                onClick={() => setSelectedDay(d)}
                className={`relative aspect-square rounded-lg border flex items-center justify-center transition-all ${
                  isSelected
                    ? 'bg-primary/20 border-primary/50 '
                    : isToday
                      ? 'bg-primary/8 border-primary/30'
                      : hasEvent
                        ? 'bg-card/70 border-border/60'
                        : 'bg-card/30 border-border/25'
                }`}
              >
                <span
                  className={`text-mini tabular-nums ${
                    isSelected
                      ? 'font-bold text-primary'
                      : hasEvent
                        ? 'font-semibold text-foreground'
                        : 'font-light text-muted-foreground/55'
                  }`}
                >
                  {d}
                </span>
                {hasEvent && !isSelected && (
                  <span className="absolute bottom-0.5 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full bg-primary/60" />
                )}
                {isToday && !isSelected && (
                  <span className="absolute top-0.5 end-0.5 w-1 h-1 rounded-full bg-primary" />
                )}
              </motion.button>
            );
          })}
        </div>

        {/* ── Events for selected day ───────────────────────────── */}
        <div className="space-y-2.5 pt-2">
          <h3 className="text-mini font-bold text-muted-foreground/80 uppercase tracking-wider">
            {`مناسبات ${selectedDay} ${HIJRI_MONTHS[selectedMonth - 1]}`}
          </h3>

          <AnimatePresence mode="popLayout">
            {dayEvents.length === 0 ? (
              <motion.div
                key="empty"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="rounded-xl border border-border/40 bg-card/40 px-4 py-5 text-center"
              >
                <p className="text-mini text-muted-foreground">
                  {'لا توجد مناسبات في هذا اليوم'}
                </p>
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

      {/* ── Event details modal ─────────────────────────────── */}
      <EventDetailDialog
        event={selectedEvent}
        onClose={() => setSelectedEvent(null)}
      />
    </div>
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
  const accent = ACCENT[event.color] ?? '#10b981';
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
      className="w-full text-start rounded-xl border p-3.5 transition-colors"
      style={{ background: `${accent}10`, borderColor: `${accent}33` }}
    >
      <div className="flex items-center justify-between mb-1">
        <span
          className="text-micro font-bold uppercase tracking-wider"
          style={{ color: accent }}
        >
          {monthLabel} {dayLabel}
        </span>
        {event.isMajorHoliday && (
          <span
            className="text-micro font-bold uppercase tracking-wider px-1.5 py-0.5 rounded"
            style={{ background: `${accent}26`, color: accent }}
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
      <p className="text-micro text-muted-foreground/60 mt-1.5">
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
    <AnimatePresence>
      {event && (
        <motion.div
          key="backdrop"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-drawer bg-black/60 flex items-end sm:items-center justify-center p-4"
          onClick={onClose}
        >
          <motion.div
            initial={{ y: 24, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 24, opacity: 0 }}
            transition={MOTION.spring}
 onClick={(e) => e.stopPropagation()}
 className="relative w-full max-w-md rounded-3xl bg-card border border-border/60 p-6 max-h-[85vh] overflow-y-auto"
 dir={'rtl'}
          >
            <DetailContent event={event} />
            <button
              onClick={onClose}
              className="mt-5 w-full rounded-xl bg-primary/10 hover:bg-primary/15 text-primary font-semibold text-mini py-2.5 transition-colors"
            >
              {'إغلاق'}
            </button>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

function DetailContent({
  event,
}: {
  event: ResolvedIslamicEvent;
}) {
  const accent = ACCENT[event.color] ?? '#10b981';
  const monthLabel = HIJRI_MONTHS[event.month - 1];
  const dayLabel =
    event.day === event.endDay ? `${event.day}` : `${event.day}-${event.endDay}`;
  const title = event.titleAr;
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
    const en: Record<string, string> = {
      HISTORICAL: 'Historical',
      RELIGIOUS: 'Religious',
      RECURRING_RITUAL: 'Recurring',
      BIRTH: 'Birth',
      DEATH: 'Death',
    };
    return ar[event.type];
  })();

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2 flex-wrap">
        <span
          className="text-micro font-bold uppercase tracking-wider"
          style={{ color: accent }}
        >
          {dayLabel} {monthLabel} {event.hijriYear}
        </span>
        <span className="text-micro font-semibold text-muted-foreground/70 px-2 py-0.5 rounded bg-muted/40">
          {typeLabel}
        </span>
        {event.isMajorHoliday && (
          <span
            className="text-micro font-bold uppercase tracking-wider px-1.5 py-0.5 rounded"
            style={{ background: `${accent}26`, color: accent }}
          >
            {'عيد كبير'}
          </span>
        )}
      </div>

      <h3 className="text-lead font-black text-foreground leading-tight">
        {title}
      </h3>

      <p className="text-mini text-foreground/85 leading-relaxed whitespace-pre-line">
        {description}
      </p>

      {notes && (
        <div className="rounded-xl border border-border/50 bg-muted/30 p-3">
          <p className="text-micro font-bold text-muted-foreground uppercase tracking-wide mb-1">
            {'ملاحظة'}
          </p>
          <p className="text-mini text-muted-foreground leading-relaxed">
            {notes}
          </p>
        </div>
      )}

      {event.yearAh !== undefined && (
        <p className="text-micro text-muted-foreground/70">
          {`السنة الهجرية: ${
                event.yearAh > 0 ? event.yearAh : Math.abs(event.yearAh)
              }${event.yearAh < 0 ? ' قبل الهجرة' : ' هـ'}`}
        </p>
      )}

      <p className="text-micro text-muted-foreground/60 border-t border-border/40 pt-2">
        {formatGregorianDate(event.gregorianDate, 'ar')}
      </p>
    </div>
  );
}
