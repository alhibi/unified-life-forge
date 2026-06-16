import React, { useMemo, useState } from 'react';
import SEO from '@/components/SEO';
import BackButton from '@/components/BackButton';
import { useApp } from '@/contexts/AppContext';
import { motion, AnimatePresence } from 'framer-motion';
import {
  getEventsForMonth,
  getTodayHijri,
  formatGregorianDate,
  HIJRI_MONTHS,
  HIJRI_MONTHS_EN,
  type ResolvedIslamicEvent,
} from '@/features/calendar/data/islamicOccasions';

// Accent palette for occasion cards (mirrors PrayerTimes.tsx accents).
const ACCENT: Record<string, string> = {
  'border-l-emerald-500': '#10b981',
  'border-l-emerald-600': '#059669',
  'border-l-sky-500': '#0ea5e9',
  'border-l-violet-500': '#8b5cf6',
  'border-l-amber-500': '#f59e0b',
  'border-l-yellow-500': '#eab308',
  'border-l-yellow-600': '#ca8a04',
  'border-l-rose-500': '#f43f5e',
  'border-l-slate-500': '#64748b',
};

export default function AllOccasions() {
  const { language } = useApp();
  const isAr = language === 'ar';
  const today = useMemo(() => getTodayHijri(), []);

  const [selectedMonth, setSelectedMonth] = useState<number>(today.month);
  const [selectedDay, setSelectedDay] = useState<number>(today.day);
  const [selectedEvent, setSelectedEvent] = useState<ResolvedIslamicEvent | null>(null);

  // Each month's events, sorted by day. Stable across re-renders.
  const byMonth = useMemo(() => {
    const map: Record<number, ResolvedIslamicEvent[]> = {};
    for (let m = 1; m <= 12; m++) map[m] = getEventsForMonth(m);
    return map;
  }, []);

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
    isAr ? HIJRI_MONTHS[idx - 1] : HIJRI_MONTHS_EN[idx - 1];

  return (
    <div
      className="min-h-screen bg-background pb-28 px-4 pt-6"
      dir={isAr ? 'rtl' : 'ltr'}
    >
      <SEO
        title={isAr ? 'التقويم الهجري — SmartHub' : 'Hijri Calendar — SmartHub'}
        description={
          isAr
            ? 'تصفح المناسبات الإسلامية حسب الشهر الهجري.'
            : 'Browse Islamic occasions by Hijri month.'
        }
        path="/occasions"
      />
      <div className="max-w-lg mx-auto space-y-5">
        {/* ── Header ──────────────────────────────────────────────── */}
        <div className="flex items-center gap-3">
          <BackButton />
          <div className="flex-1 min-w-0 text-end">
            <h1 className="text-[22px] font-black text-foreground leading-tight">
              {isAr ? 'التقويم الهجري' : 'Hijri Calendar'}
            </h1>
            <p className="text-[12px] text-muted-foreground">
              {isAr ? 'تصفح المناسبات حسب الشهر الهجري' : 'Browse events by Hijri month'}
            </p>
          </div>
        </div>

        {/* ── Today indicator ────────────────────────────────────── */}
        <div className="rounded-2xl bg-primary/5 border border-primary/15 px-4 py-2.5 flex items-center justify-between">
          <span className="text-[10px] font-bold uppercase tracking-wider text-primary/70">
            {isAr ? 'اليوم' : 'Today'}
          </span>
          <span className="text-[13px] font-semibold text-foreground">
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
                    ? 'bg-primary/15 border-primary/40 shadow-sm'
                    : 'bg-card/60 border-border/50 hover:bg-card'
                }`}
              >
                <div className="flex items-baseline justify-between mb-0.5">
                  <p
                    className={`text-[12px] font-bold leading-tight truncate ${
                      active ? 'text-primary' : 'text-foreground'
                    }`}
                  >
                    {monthName(monthIdx)}
                  </p>
                  <span className="text-[10px] font-bold text-muted-foreground/60 tabular-nums shrink-0">
                    {monthIdx}
                  </span>
                </div>
                <div className="flex items-center gap-1">
                  <span className="text-[9px] text-muted-foreground tabular-nums">
                    {count}
                  </span>
                  <span className="text-[9px] text-muted-foreground/70">
                    {isAr ? 'مناسبة' : count === 1 ? 'event' : 'events'}
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
          <h2 className="text-[16px] font-black text-foreground">
            {monthName(selectedMonth)}
          </h2>
          <span className="text-[11px] font-medium text-muted-foreground/70">
            {isAr
              ? `${monthEvents.length} مناسبة`
              : `${monthEvents.length} ${monthEvents.length === 1 ? 'event' : 'events'}`}
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
                    ? 'bg-primary/20 border-primary/50 shadow-sm'
                    : isToday
                      ? 'bg-primary/8 border-primary/30'
                      : hasEvent
                        ? 'bg-card/70 border-border/60'
                        : 'bg-card/30 border-border/25'
                }`}
              >
                <span
                  className={`text-[12px] tabular-nums ${
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
                  <span className="absolute bottom-0.5 start-1/2 -translate-x-1/2 w-1 h-1 rounded-full bg-primary/60" />
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
          <h3 className="text-[12px] font-bold text-muted-foreground/80 uppercase tracking-wider">
            {isAr
              ? `مناسبات ${selectedDay} ${HIJRI_MONTHS[selectedMonth - 1]}`
              : `Events on ${selectedDay} ${HIJRI_MONTHS_EN[selectedMonth - 1]}`}
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
                <p className="text-[12px] text-muted-foreground">
                  {isAr ? 'لا توجد مناسبات في هذا اليوم' : 'No events on this day'}
                </p>
              </motion.div>
            ) : (
              dayEvents.map((ev) => (
                <EventListCard
                  key={ev.id}
                  event={ev}
                  isAr={isAr}
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
        isAr={isAr}
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
  isAr,
  onOpen,
}: {
  event: ResolvedIslamicEvent;
  isAr: boolean;
  onOpen: () => void;
}) {
  const accent = ACCENT[event.color] ?? '#10b981';
  const monthLabel = isAr
    ? HIJRI_MONTHS[event.month - 1]
    : HIJRI_MONTHS_EN[event.month - 1];
  const dayLabel =
    event.day === event.endDay ? `${event.day}` : `${event.day}-${event.endDay}`;
  const title = isAr ? event.titleAr : event.title;
  const description = isAr ? event.descriptionAr : event.description;

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
          className="text-[9px] font-bold uppercase tracking-wider"
          style={{ color: accent }}
        >
          {monthLabel} {dayLabel}
        </span>
        {event.isMajorHoliday && (
          <span
            className="text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded"
            style={{ background: `${accent}26`, color: accent }}
          >
            {isAr ? 'عيد' : 'Holiday'}
          </span>
        )}
      </div>
      <h4 className="text-[14px] font-bold text-foreground leading-snug mb-1">
        {title}
      </h4>
      <p className="text-[11px] text-muted-foreground leading-relaxed line-clamp-2">
        {description}
      </p>
      <p className="text-[10px] text-muted-foreground/60 mt-1.5">
        {formatGregorianDate(event.gregorianDate, isAr ? 'ar' : 'en')}
      </p>
    </motion.button>
  );
}

function EventDetailDialog({
  event,
  isAr,
  onClose,
}: {
  event: ResolvedIslamicEvent | null;
  isAr: boolean;
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
          className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-end sm:items-center justify-center p-4"
          onClick={onClose}
        >
          <motion.div
            initial={{ y: 24, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 24, opacity: 0 }}
            transition={{ type: 'spring', damping: 24, stiffness: 260 }}
 onClick={(e) => e.stopPropagation()}
 className="relative w-full max-w-md rounded-3xl bg-card border border-border/60 p-6 max-h-[85vh] overflow-y-auto"
 dir={isAr ? 'rtl' : 'ltr'}
          >
            <DetailContent event={event} isAr={isAr} />
            <button
              onClick={onClose}
              className="mt-5 w-full rounded-xl bg-primary/10 hover:bg-primary/15 text-primary font-semibold text-[13px] py-2.5 transition-colors"
            >
              {isAr ? 'إغلاق' : 'Close'}
            </button>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

function DetailContent({
  event,
  isAr,
}: {
  event: ResolvedIslamicEvent;
  isAr: boolean;
}) {
  const accent = ACCENT[event.color] ?? '#10b981';
  const monthLabel = isAr
    ? HIJRI_MONTHS[event.month - 1]
    : HIJRI_MONTHS_EN[event.month - 1];
  const dayLabel =
    event.day === event.endDay ? `${event.day}` : `${event.day}-${event.endDay}`;
  const title = isAr ? event.titleAr : event.title;
  const description = isAr ? event.descriptionAr : event.description;
  const notes = isAr ? event.notesAr : event.notes;

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
    return isAr ? ar[event.type] : en[event.type];
  })();

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2 flex-wrap">
        <span
          className="text-[10px] font-bold uppercase tracking-wider"
          style={{ color: accent }}
        >
          {dayLabel} {monthLabel} {event.hijriYear}
        </span>
        <span className="text-[10px] font-semibold text-muted-foreground/70 px-2 py-0.5 rounded bg-muted/40">
          {typeLabel}
        </span>
        {event.isMajorHoliday && (
          <span
            className="text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded"
            style={{ background: `${accent}26`, color: accent }}
          >
            {isAr ? 'عيد كبير' : 'Major'}
          </span>
        )}
      </div>

      <h3 className="text-[18px] font-black text-foreground leading-tight">
        {title}
      </h3>

      <p className="text-[13px] text-foreground/85 leading-relaxed whitespace-pre-line">
        {description}
      </p>

      {notes && (
        <div className="rounded-xl border border-border/50 bg-muted/30 p-3">
          <p className="text-[11px] font-bold text-muted-foreground uppercase tracking-wide mb-1">
            {isAr ? 'ملاحظة' : 'Note'}
          </p>
          <p className="text-[12px] text-muted-foreground leading-relaxed">
            {notes}
          </p>
        </div>
      )}

      {event.yearAh !== undefined && (
        <p className="text-[11px] text-muted-foreground/70">
          {isAr
            ? `السنة الهجرية: ${
                event.yearAh > 0 ? event.yearAh : Math.abs(event.yearAh)
              }${event.yearAh < 0 ? ' قبل الهجرة' : ' هـ'}`
            : `Year: ${
                event.yearAh > 0
                  ? `${event.yearAh} AH`
                  : `${Math.abs(event.yearAh)} BH`
              }`}
        </p>
      )}

      <p className="text-[11px] text-muted-foreground/60 border-t border-border/40 pt-2">
        {formatGregorianDate(event.gregorianDate, isAr ? 'ar' : 'en')}
      </p>
    </div>
  );
}
