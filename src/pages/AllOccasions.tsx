import React, { useMemo, useState } from 'react';
import SEO from '@/components/SEO';
import BackButton from '@/components/BackButton';
import { useApp } from '@/contexts/AppContext';
import { motion, AnimatePresence } from 'framer-motion';
import {
  islamicOccasions,
  getTodayHijri,
  HIJRI_MONTHS,
  toHijri,
  getDaysUntil,
  formatGregorianDate,
} from '@/data/islamicOccasions';
import type { IslamicOccasion } from '@/data/islamicOccasions';

// English month names for bilingual display
const HIJRI_MONTHS_EN = [
  'Muharram', 'Safar', "Rabi' al-Awwal", "Rabi' al-Thani",
  'Jumada al-Awwal', 'Jumada al-Thani', 'Rajab', "Sha'ban",
  'Ramadan', 'Shawwal', 'Dhu al-Qidah', 'Dhu al-Hijjah',
];

// Accent palette for occasion cards
const ACCENT: Record<string, string> = {
  'border-l-emerald-500': '#10b981',
  'border-l-emerald-600': '#059669',
  'border-l-sky-500': '#0ea5e9',
  'border-l-violet-500': '#8b5cf6',
  'border-l-amber-500': '#f59e0b',
  'border-l-yellow-500': '#eab308',
  'border-l-yellow-600': '#ca8a04',
};

// Build a map: hijri month index (1-12) → IslamicOccasion[]
function groupOccasionsByMonth(): Record<number, IslamicOccasion[]> {
  const map: Record<number, IslamicOccasion[]> = {};
  for (let m = 1; m <= 12; m++) map[m] = [];
  for (const occ of islamicOccasions) {
    // Use the toHijri conversion for accuracy
    const h = toHijri(new Date(occ.gregorianDate));
    map[h.month] = map[h.month] || [];
    map[h.month].push(occ);
  }
  // sort each month by day
  for (const m of Object.keys(map)) {
    map[+m].sort((a, b) => {
      const ha = toHijri(new Date(a.gregorianDate)).day;
      const hb = toHijri(new Date(b.gregorianDate)).day;
      return ha - hb;
    });
  }
  return map;
}

export default function AllOccasions() {
  const { language } = useApp();
  const today = useMemo(() => getTodayHijri(), []);
  const byMonth = useMemo(() => groupOccasionsByMonth(), []);
  const isAr = language === 'ar';

  const [selectedMonth, setSelectedMonth] = useState<number>(today.month);
  const [selectedDay, setSelectedDay] = useState<number>(today.day);

  // Reset selected day when month changes (don't auto-pick)
  const monthOccasions = byMonth[selectedMonth] || [];
  const daysWithEvents = useMemo(() => {
    const set = new Set<number>();
    for (const occ of monthOccasions) {
      set.add(toHijri(new Date(occ.gregorianDate)).day);
    }
    return set;
  }, [monthOccasions]);

  const dayOccasions = monthOccasions.filter(
    (occ) => toHijri(new Date(occ.gregorianDate)).day === selectedDay
  );

  // Show 30 days per Hijri month (visual grid — actual lengths vary 29/30)
  const days = Array.from({ length: 30 }, (_, i) => i + 1);

  return (
    <div className="min-h-screen bg-background pb-app px-4 pt-6" dir={isAr ? 'rtl' : 'ltr'}>
      <SEO
        title={isAr ? 'التقويم الهجري — SmartHub' : 'Hijri Calendar — SmartHub'}
        description={isAr ? 'تصفح المناسبات الإسلامية حسب الشهر الهجري.' : 'Browse Islamic occasions by Hijri month.'}
        path="/occasions"
      />
      <div className="max-w-lg mx-auto space-y-6">
        {/* Header */}
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

        {/* ── Months grid (4 rows × 3 cols) ────────────────────────── */}
        <div className="grid grid-cols-3 gap-2.5">
          {HIJRI_MONTHS.map((name, i) => {
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
                className={`relative rounded-2xl border p-3 text-start transition-all ${
                  active
                    ? 'bg-primary/15 border-primary/40 shadow-sm'
                    : 'bg-card/60 border-border/50 hover:bg-card'
                }`}
              >
                <span className="absolute top-2 end-2 text-[11px] font-bold text-muted-foreground/70 tabular-nums">
                  {monthIdx}
                </span>
                <p className={`text-[13px] font-bold leading-tight mt-3 ${active ? 'text-primary' : 'text-foreground'}`}>
                  {isAr ? name : HIJRI_MONTHS_EN[i]}
                </p>
                <p className="text-[10px] text-muted-foreground mt-1">
                  {isAr ? `${count} مناسبة` : `${count} event${count === 1 ? '' : 's'}`}
                </p>
                {isCurrent && (
                  <span className="absolute bottom-2 end-2 w-1.5 h-1.5 rounded-full bg-primary" />
                )}
              </motion.button>
            );
          })}
        </div>

        {/* ── Selected month header ────────────────────────────────── */}
        <div className="flex items-baseline justify-between pt-1">
          <h2 className="text-[18px] font-black text-foreground">
            {isAr ? HIJRI_MONTHS[selectedMonth - 1] : HIJRI_MONTHS_EN[selectedMonth - 1]}
          </h2>
          <span className="text-[14px] font-bold text-muted-foreground/70 tabular-nums">
            {selectedMonth}
          </span>
        </div>

        {/* ── Days grid (5 cols × 6 rows) ──────────────────────────── */}
        <div className="grid grid-cols-5 gap-2">
          {days.map((d) => {
            const hasEvent = daysWithEvents.has(d);
            const isToday = selectedMonth === today.month && d === today.day;
            const isSelected = d === selectedDay;
            return (
              <motion.button
                key={d}
                whileTap={{ scale: 0.92 }}
                onClick={() => setSelectedDay(d)}
                className={`relative aspect-square rounded-2xl border flex items-start justify-end p-2 transition-all ${
                  isSelected
                    ? 'bg-primary/20 border-primary/50'
                    : hasEvent
                      ? 'bg-card/70 border-border/60'
                      : 'bg-card/30 border-border/30'
                }`}
              >
                <span
                  className={`text-[14px] tabular-nums ${
                    isSelected ? 'font-bold text-primary' : hasEvent ? 'font-semibold text-foreground' : 'font-light text-muted-foreground/60'
                  }`}
                >
                  {d}
                </span>
                {isToday && (
                  <span className="absolute top-1.5 start-1.5 text-[7px] font-bold uppercase text-primary tracking-wide">
                    {isAr ? 'اليوم' : 'today'}
                  </span>
                )}
                {hasEvent && (
                  <span className="absolute bottom-2 start-1/2 -translate-x-1/2 w-1.5 h-1.5 rounded-full bg-primary/70" />
                )}
              </motion.button>
            );
          })}
        </div>

        {/* ── Events for selected day ──────────────────────────────── */}
        <div className="space-y-3 pt-2">
          <h3 className="text-[13px] font-bold text-muted-foreground">
            {isAr
              ? `مناسبات ${selectedDay} ${HIJRI_MONTHS[selectedMonth - 1]}`
              : `Events on ${selectedDay} ${HIJRI_MONTHS_EN[selectedMonth - 1]}`}
          </h3>

          <AnimatePresence mode="popLayout">
            {dayOccasions.length === 0 ? (
              <motion.div
                key="empty"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="rounded-2xl border border-border/40 bg-card/40 px-4 py-6 text-center"
              >
                <p className="text-[12px] text-muted-foreground">
                  {isAr ? 'لا توجد مناسبات في هذا اليوم' : 'No events on this day'}
                </p>
              </motion.div>
            ) : (
              dayOccasions.map((occ) => {
                const accent = ACCENT[occ.color] ?? '#10b981';
                const daysLeft = getDaysUntil(occ.gregorianDate);
                return (
                  <motion.div
                    key={occ.id}
                    layout
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -8 }}
                    transition={{ duration: 0.25 }}
                    className="rounded-2xl border border-border/50 p-4"
                    style={{ background: `${accent}14`, borderColor: `${accent}40` }}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span
                        className="text-[9px] font-bold uppercase tracking-wider"
                        style={{ color: accent }}
                      >
                        {isAr
                          ? `${HIJRI_MONTHS[selectedMonth - 1]} ${selectedDay}`
                          : `${HIJRI_MONTHS_EN[selectedMonth - 1]} ${selectedDay}`}
                      </span>
                      <span className="text-[9px] font-semibold text-muted-foreground tabular-nums">
                        {daysLeft > 0
                          ? isAr ? `بعد ${daysLeft} يوم` : `in ${daysLeft}d`
                          : daysLeft === 0
                            ? isAr ? 'اليوم' : 'today'
                            : isAr ? 'مضى' : 'past'}
                      </span>
                    </div>
                    <h4 className="text-[15px] font-bold text-foreground leading-snug mb-1">
                      {occ.name}
                    </h4>
                    <p className="text-[11px] text-muted-foreground leading-relaxed line-clamp-3">
                      {occ.description}
                    </p>
                    <p className="text-[10px] text-muted-foreground/60 mt-1.5">
                      {formatGregorianDate(occ.gregorianDate)}
                    </p>
                  </motion.div>
                );
              })
            )}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}
