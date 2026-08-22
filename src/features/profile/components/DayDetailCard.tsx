import { AnimatePresence, motion } from 'framer-motion';
import React, { useMemo } from 'react';

import {
  Activity,
  Brain,
  Calendar,
  ChevronLeft,
  ChevronRight,
  Clock,
  Compass,
  Crown,
  Feather,
  Flame,
  Globe,
  HandHeart,
  Languages,
  Sparkles,
  TrendingUp,
} from '@/lib/icons';

import type { StreakSnapshot } from '../lib/streakEngine';
import { getModuleLabelAr } from '../lib/streakEngine';
import { toLocalDateISO } from '../lib/visitTracker';
import type {
  ContributionActivityEvent,
  DailyContribution,
} from '../types';

export interface DayDetailCardProps {
  day: DailyContribution;
  /** Full 365-day matrix for context (percentiles, neighbors). */
  allDays: readonly DailyContribution[];
  events: readonly ContributionActivityEvent[];
  streakSnapshot: StreakSnapshot | null;
  onSelectDay: (day: DailyContribution) => void;
  onClearSelection: () => void;
}

const MODULE_ICONS: Record<string, React.ComponentType<{ className?: string }>> = {
  visits: Globe,
  spiritual: HandHeart,
  german: Languages,
  fitness: Activity,
  diwan: Feather,
  pkm: Brain,
  atlas: Compass,
};

const DAY_NAMES_AR = ['الأحد', 'الاثنين', 'الثلاثاء', 'الأربعاء', 'الخميس', 'الجمعة', 'السبت'];

/** Human, non-generic part-of-day buckets in Arabic. */
const TIME_BUCKETS_AR: Array<{
  labelAr: string;
  from: number;
  to: number;
}> = [
  { labelAr: 'فجراً', from: 3, to: 6 },
  { labelAr: 'صباحاً', from: 6, to: 12 },
  { labelAr: 'ظهراً', from: 12, to: 16 },
  { labelAr: 'مساءً', from: 16, to: 20 },
  { labelAr: 'ليلاً', from: 20, to: 24 },
  { labelAr: 'سهراً', from: 0, to: 3 },
];

function getBucketForHour(hour: number): string {
  for (const b of TIME_BUCKETS_AR) {
    if (hour >= b.from && hour < b.to) return b.labelAr;
  }
  return 'خلال اليوم';
}

function formatClock(ts: number): string {
  const d = new Date(ts);
  const h = d.getHours();
  const m = String(d.getMinutes()).padStart(2, '0');
  const period = h < 12 ? 'ص' : 'م';
  const h12 = h % 12 === 0 ? 12 : h % 12;
  return `${h12}:${m} ${period}`;
}

interface ModuleSlice {
  category: string;
  count: number;
  sharePct: number;
}

export const DayDetailCard: React.FC<DayDetailCardProps> = ({
  day,
  allDays,
  events,
  streakSnapshot,
  onSelectDay,
  onClearSelection,
}) => {
  /* ── Percentile context: how strong is this day vs the whole year? ── */
  const percentile = useMemo(() => {
    const activeDays = allDays.filter((d) => d.count > 0);
    if (activeDays.length === 0 || day.count === 0) return null;
    const belowOrEqual = activeDays.filter((d) => d.count <= day.count).length;
    return Math.round((belowOrEqual / activeDays.length) * 100);
  }, [allDays, day.count]);

  /* ── Neighbor days for prev/next navigation ── */
  const neighborIndex = useMemo(
    () => allDays.findIndex((d) => d.dateISO === day.dateISO),
    [allDays, day.dateISO]
  );
  const prevDay = neighborIndex > 0 ? allDays[neighborIndex - 1] : null;
  const nextDay =
    neighborIndex !== -1 && neighborIndex < allDays.length - 1
      ? allDays[neighborIndex + 1]
      : null;

  /* ── Module composition of this specific day ── */
  const slices: ModuleSlice[] = useMemo(() => {
    const entries = Object.entries(day.breakdown || {})
      .filter(([, c]) => (c || 0) > 0)
      .sort((a, b) => (b[1] || 0) - (a[1] || 0));
    const total = entries.reduce((acc, [, c]) => acc + (c || 0), 0) || 1;
    return entries.map(([category, count]) => ({
      category,
      count: count || 0,
      sharePct: Math.round(((count || 0) / total) * 100),
    }));
  }, [day.breakdown]);

  /* ── Chronological timeline with time-of-day insight ── */
  const sortedEvents = useMemo(
    () => [...events].sort((a, b) => a.timestamp - b.timestamp),
    [events]
  );

  const dominantBucket = useMemo<{ label: string; count: number } | null>(() => {
    if (sortedEvents.length === 0) return null;
    const bucketCounts = new Map<string, number>();
    sortedEvents.forEach((e) => {
      const bucket = getBucketForHour(new Date(e.timestamp).getHours());
      bucketCounts.set(bucket, (bucketCounts.get(bucket) || 0) + 1);
    });
    let best: { label: string; count: number } | null = null;
    bucketCounts.forEach((count, label) => {
      if (best === null || count > best.count) {
        best = { label, count };
      }
    });
    const resolved = best as { label: string; count: number } | null;
    return resolved && resolved.count > 0 && sortedEvents.length >= 2 ? resolved : null;
  }, [sortedEvents]);

  /* ── Streak context: was this day part of the record run? ── */
  const streakContext = useMemo(() => {
    if (!streakSnapshot || day.count === 0) return null;

    // Was this date inside the longest historical run? Walk back/forward
    // through the unified active-day set derived from allDays.
    const activeSet = new Set(allDays.filter((d) => d.count > 0).map((d) => d.dateISO));
    if (!activeSet.has(day.dateISO)) return null;

    let runLength = 1;
    const cursor = (delta: number) => {
      const c = new Date(`${day.dateISO}T00:00:00`);
      c.setDate(c.getDate() + delta);
      return toLocalDateISO(c);
    };
    let probe = -1;
    while (activeSet.has(cursor(probe))) {
      runLength++;
      probe--;
    }
    probe = 1;
    while (activeSet.has(cursor(probe))) {
      runLength++;
      probe++;
    }

    const isRecordRun = runLength >= streakSnapshot.unified.longestStreakDays;
    return { runLength, isRecordRun };
  }, [streakSnapshot, allDays, day.dateISO, day.count]);

  const dayDate = new Date(`${day.dateISO}T00:00:00`);
  const isToday = toLocalDateISO(dayDate) === toLocalDateISO(new Date());
  const isBestDay =
    streakSnapshot?.bestDay?.dateISO === day.dateISO && day.count > 0;

  const intensityLabelAr =
    day.intensity === 0
      ? 'يوم راحة'
      : day.intensity === 1
        ? 'نشاط خفيف'
        : day.intensity === 2
          ? 'يوم متوسط'
          : day.intensity === 3
            ? 'يوم قوي'
            : 'يوم استثنائي';

  return (
    <AnimatePresence mode="wait">
      <motion.section
        key={day.dateISO}
        initial={{ opacity: 0, y: 14 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -10 }}
        transition={{ duration: 0.28, ease: 'easeOut' }}
        className="surface-depth rounded-2xl p-5 space-y-5 relative overflow-hidden ring-1 ring-primary/15"
        dir="rtl"
      >
        {/* Golden aura when this is the best day */}
        {isBestDay && (
          <motion.div
            aria-hidden
            className="absolute -inset-12 pointer-events-none"
            style={{
              backgroundImage:
                'radial-gradient(circle at 50% 0%, rgba(245, 200, 60, 0.16), transparent 70%)',
            }}
            animate={{ opacity: [0.45, 0.8, 0.45] }}
            transition={{ duration: 6, repeat: Infinity, ease: 'easeInOut' }}
          />
        )}

        {/* ── Header: date identity + navigation ── */}
        <div className="relative flex items-start justify-between gap-3">
          <div className="flex items-center gap-3">
            <div
              className={`w-11 h-11 rounded-2xl flex items-center justify-center ${
                isBestDay
                  ? 'bg-amber-500/15 text-amber-400 border border-amber-500/30'
                  : day.count > 0
                    ? 'bg-primary/10 text-primary border border-primary/20'
                    : 'bg-muted/30 text-muted-foreground border border-border/40'
              }`}
            >
              {isBestDay ? (
                <Crown className="w-5 h-5" />
              ) : (
                <CalendarDaysIcon />
              )}
            </div>

            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="text-lead font-bold text-foreground">{day.dateFormattedAr}</h3>
                {isToday && (
                  <span className="px-2 py-0.5 rounded-full bg-primary/10 text-primary text-micro font-extrabold border border-primary/20">
                    اليوم
                  </span>
                )}
                {isBestDay && (
                  <span className="px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-400 text-micro font-extrabold border border-amber-500/30">
                    يومك الذهبي 👑
                  </span>
                )}
              </div>
              <p className="text-micro text-muted-foreground mt-0.5 flex items-center gap-1.5">
                {DAY_NAMES_AR[day.dayOfWeek]}
                <span className="text-border">•</span>
                <span
                  className={
                    day.count > 0 ? 'font-semibold text-foreground' : 'italic'
                  }
                >
                  {intensityLabelAr}
                </span>
              </p>
            </div>
          </div>

          {/* Prev / next / close controls */}
          <div className="flex items-center gap-1 shrink-0">
            <NavButton
              disabled={!nextDay}
              title="اليوم التالي"
              onClick={() => nextDay && onSelectDay(nextDay)}
            >
              <ChevronRight className="w-4 h-4" />
            </NavButton>
            <NavButton
              disabled={!prevDay}
              title="اليوم السابق"
              onClick={() => prevDay && onSelectDay(prevDay)}
            >
              <ChevronLeft className="w-4 h-4" />
            </NavButton>
            <NavButton title="إغلاق البطاقة" onClick={onClearSelection}>
              ✕
            </NavButton>
          </div>
        </div>

        {/* ── Empty day state — still meaningful, never blank ── */}
        {day.count === 0 ? (
          <EmptyDayBody percentile={percentile} />
        ) : (
          <>
            {/* ── Headline stats strip ── */}
            <div className="grid grid-cols-3 gap-2">
              <StatCell
                icon={<Sparkles className="w-4 h-4 text-primary" />}
                value={day.count}
                label="إجمالي الأنشطة"
              />
              <StatCell
                icon={<TrendingUp className="w-4 h-4 text-emerald-400" />}
                value={percentile !== null ? `${percentile}%` : '—'}
                label="أقوى من نسبة أيامك"
              />
              <StatCell
                icon={<Flame className={`w-4 h-4 ${streakContext ? 'text-amber-400' : 'text-muted-foreground'}`} />}
                value={streakContext ? `${streakContext.runLength}` : '—'}
                label="ضمن سلسلة يومية"
              />
            </div>

            {/* Record-run banner */}
            {streakContext?.isRecordRun && (
              <motion.div
                initial={{ opacity: 0, scale: 0.98 }}
                animate={{ opacity: 1, scale: 1 }}
                className="flex items-center gap-2 px-3.5 py-2.5 rounded-xl bg-amber-500/10 text-amber-400 ring-1 ring-amber-500/30"
              >
                <Crown className="w-4 h-4 shrink-0" />
                <span className="text-mini font-bold">
                  هذا اليوم جزء من أطول سلسلة في تاريخك ({streakContext.runLength} يوماً متتالياً)!
                </span>
              </motion.div>
            )}

            {/* ── Module composition bar ── */}
            {slices.length > 0 && (
              <div className="space-y-2.5">
                <span className="text-micro font-bold text-muted-foreground">
                  تكوين النشاط عبر الوحدات
                </span>
                {/* Segmented composition bar */}
                <div className="flex h-3 w-full rounded-full overflow-hidden border border-border/30">
                  {slices.map((s, i) => {
                    const Icon = MODULE_ICONS[s.category] || Sparkles;
                    void Icon;
                    return (
                      <motion.div
                        key={s.category}
                        initial={{ width: 0 }}
                        animate={{ width: `${s.sharePct}%` }}
                        transition={{ duration: 0.6, delay: i * 0.08, ease: 'easeOut' }}
                        className={COMPOSITION_COLORS[s.category] || 'bg-primary/50'}
                        title={`${getModuleLabelAr(s.category as never)}: ${s.count}`}
                      />
                    );
                  })}
                </div>
                {/* Legend chips */}
                <div className="flex flex-wrap gap-1.5">
                  {slices.map((s) => {
                    const Icon = MODULE_ICONS[s.category] || Sparkles;
                    return (
                      <span
                        key={s.category}
                        className="inline-flex items-center gap-1.5 px-2 py-1 rounded-lg bg-muted/20 border border-border/40 text-micro font-semibold text-foreground"
                      >
                        <Icon className="w-3 h-3 text-primary" />
                        {getModuleLabelAr(s.category as never)}
                        <span className="tabular-nums text-muted-foreground">
                          {s.count} ({s.sharePct}%)
                        </span>
                      </span>
                    );
                  })}
                </div>
              </div>
            )}

            {/* ── Chronological timeline of the day itself ── */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-micro font-bold text-muted-foreground flex items-center gap-1.5">
                  <Clock className="w-3 h-3" />
                  الخط الزمني لليوم ({sortedEvents.length})
                </span>
                {dominantBucket && (
                  <span className="text-micro font-semibold text-primary bg-primary/10 px-2 py-0.5 rounded-full">
                    ذروة نشاطك {dominantBucket.label}
                  </span>
                )}
              </div>

              {sortedEvents.length > 0 ? (
                <div className="space-y-1.5 max-h-64 overflow-y-auto pe-1">
                  {sortedEvents.map((evt) => {
                    const Icon = MODULE_ICONS[evt.category] || Sparkles;
                    return (
                      <motion.div
                        key={evt.id}
                        initial={{ opacity: 0, x: 8 }}
                        animate={{ opacity: 1, x: 0 }}
                        className="flex items-start justify-between gap-3 p-2.5 rounded-xl bg-muted/20 border border-border/30 hover:border-border/60 transition-colors"
                      >
                        <div className="flex items-start gap-2.5 min-w-0">
                          <div className="w-7 h-7 rounded-lg bg-muted/30 flex items-center justify-center shrink-0">
                            <Icon className="w-3.5 h-3.5 text-primary" />
                          </div>
                          <div className="min-w-0 space-y-0.5">
                            <p className="text-mini font-semibold text-foreground truncate">
                              {evt.titleAr}
                            </p>
                            {(evt.subtitleAr || evt.detailsAr) && (
                              <p className="text-micro text-muted-foreground truncate">
                                {evt.subtitleAr}
                                {evt.detailsAr ? ` — ${evt.detailsAr}` : ''}
                              </p>
                            )}
                          </div>
                        </div>
                        <span className="text-micro tabular-nums text-muted-foreground shrink-0">
                          {formatClock(evt.timestamp)}
                        </span>
                      </motion.div>
                    );
                  })}
                </div>
              ) : (
                <p className="text-micro text-muted-foreground italic p-3 rounded-xl bg-muted/20">
                  لا أحداث مفصّلة محفوظة لهذا اليوم — العدّاد مأخوذ من ملخص الوحدات.
                </p>
              )}
            </div>
          </>
        )}
      </motion.section>
    </AnimatePresence>
  );
};

/* ------------------------------------------------------------------ */
/* Sub-components                                                      */
/* ------------------------------------------------------------------ */

function CalendarDaysIcon() {
  return <Calendar className="w-5 h-5" />;
}

function NavButton({
  children,
  onClick,
  disabled,
  title,
}: {
  children: React.ReactNode;
  onClick: () => void;
  disabled?: boolean;
  title: string;
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      title={title}
      className={`w-8 h-8 rounded-xl flex items-center justify-center text-micro font-bold transition-all ${
        disabled
          ? 'bg-muted/20 text-muted-foreground/40 cursor-not-allowed'
          : 'bg-muted/20 border border-border/40 text-foreground hover:bg-muted/40 active:scale-95'
      }`}
    >
      {children}
    </button>
  );
}

function StatCell({
  icon,
  value,
  label,
}: {
  icon: React.ReactNode;
  value: number | string;
  label: string;
}) {
  return (
    <div className="p-3 rounded-xl bg-muted/20 border border-border/40 text-center space-y-0.5">
      <div className="flex justify-center">{icon}</div>
      <span className="block text-lead font-extrabold text-foreground tabular-nums">{value}</span>
      <span className="block text-micro text-muted-foreground leading-tight">{label}</span>
    </div>
  );
}

function EmptyDayBody({ percentile }: { percentile: number | null }) {
  return (
    <div className="rounded-xl bg-muted/20 border border-border/30 p-4 space-y-1.5">
      <p className="text-mini font-semibold text-foreground">
        لم تُسجَّل أنشطة في هذا اليوم 🌙
      </p>
      <p className="text-micro text-muted-foreground leading-relaxed">
        {percentile !== null
          ? 'أيام الراحة جزء طبيعي من الإيقاع الصحي — السلاسل الحقيقية تُبنى بالعودة، لا بلا انقطاع.'
          : 'افتتح وحدة واحدة وسيبدأ هذا اليوم رحلته في مصفوفتك.'}
      </p>
    </div>
  );
}

const COMPOSITION_COLORS: Record<string, string> = {
  visits: 'bg-sky-500/70',
  spiritual: 'bg-emerald-500/70',
  german: 'bg-amber-500/70',
  fitness: 'bg-lime-500/70',
  diwan: 'bg-indigo-500/70',
  pkm: 'bg-cyan-500/70',
  atlas: 'bg-orange-500/70',
};
