import React, { useState, useMemo, useEffect } from 'react';
import { useApp } from '@/contexts/AppContext';
import { gregorianToHijri, getDaysInGregorianMonth, getFirstDayOfMonth } from '@/utils/hijri';
import { ChevronLeft, ChevronRight, ChevronDown } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

export default function DualCalendar() {
  const { t, dir } = useApp();
  const today = new Date();
  const [viewYear, setViewYear] = useState(today.getFullYear());
  const [viewMonth, setViewMonth] = useState(today.getMonth() + 1);
  const [currentTime, setCurrentTime] = useState(new Date());
  const [direction, setDirection] = useState(0);
  const [selectedDay, setSelectedDay] = useState<{ gDay: number; hDay: number; hMonth: number; hYear: number } | null>(null);
  const [expanded, setExpanded] = useState(false);

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const daysInMonth = getDaysInGregorianMonth(viewYear, viewMonth);
  const firstDay = getFirstDayOfMonth(viewYear, viewMonth);

  const calendarDays = useMemo(() => {
    const days: Array<{ gDay: number; hDay: number; hMonth: number; hYear: number; isToday: boolean }> = [];
    for (let d = 1; d <= daysInMonth; d++) {
      const h = gregorianToHijri(viewYear, viewMonth, d);
      const isToday = d === today.getDate() && viewMonth === today.getMonth() + 1 && viewYear === today.getFullYear();
      days.push({ gDay: d, hDay: h.day, hMonth: h.month, hYear: h.year, isToday });
    }
    return days;
  }, [viewYear, viewMonth, daysInMonth]);

  const hijriInfo = gregorianToHijri(viewYear, viewMonth, 1);

  const prevMonth = () => {
    setDirection(-1);
    if (viewMonth === 1) { setViewYear(y => y - 1); setViewMonth(12); }
    else setViewMonth(m => m - 1);
  };
  const nextMonth = () => {
    setDirection(1);
    if (viewMonth === 12) { setViewYear(y => y + 1); setViewMonth(1); }
    else setViewMonth(m => m + 1);
  };
  const goToday = () => { setDirection(0); setViewYear(today.getFullYear()); setViewMonth(today.getMonth() + 1); };

  const dayHeaders = Array.from({ length: 7 }, (_, i) => t(`daysShort.${i}`));
  const blanks = Array.from({ length: firstDay }, (_, i) => i);

  const isCurrentMonth = viewMonth === today.getMonth() + 1 && viewYear === today.getFullYear();

  // Live time line position: percentage of day passed
  const timeProgress = (currentTime.getHours() * 60 + currentTime.getMinutes()) / 1440;
  const timeString = currentTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });

  // Find today's row index for the live time line
  const todayCellIndex = isCurrentMonth ? (firstDay + today.getDate() - 1) : -1;
  const todayRow = todayCellIndex >= 0 ? Math.floor(todayCellIndex / 7) : -1;
  const totalRows = Math.ceil((firstDay + daysInMonth) / 7);

  const slideVariants = {
    enter: (d: number) => ({ opacity: 0, x: d === 0 ? 0 : d > 0 ? 60 : -60 }),
    center: { opacity: 1, x: 0 },
    exit: (d: number) => ({ opacity: 0, x: d === 0 ? 0 : d > 0 ? -60 : 60 }),
  };

  return (
    <div className="bg-card border border-border/40 rounded-2xl p-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        {expanded ? (
          <button
            onClick={dir === 'rtl' ? nextMonth : prevMonth}
            className="w-8 h-8 rounded-full flex items-center justify-center bg-secondary hover:bg-muted transition-colors active:scale-90 duration-150"
          >
            <ChevronLeft className="w-3.5 h-3.5 text-foreground" />
          </button>
        ) : <div className="w-8" />}
        <button onClick={() => setExpanded(e => !e)} className="text-center flex flex-col items-center gap-0.5">
          <div className="text-[15px] font-semibold text-foreground leading-snug">
            {t(`months.${viewMonth}`)} {viewYear}
          </div>
          <div className="flex items-center gap-1">
            <span className="text-[11px] text-primary font-medium">
              {t(`hijriMonths.${hijriInfo.month}`)} {hijriInfo.year}
            </span>
            <motion.div animate={{ rotate: expanded ? 180 : 0 }} transition={{ duration: 0.25 }}>
              <ChevronDown className="w-3 h-3 text-muted-foreground" />
            </motion.div>
          </div>
        </button>
        {expanded ? (
          <button
            onClick={dir === 'rtl' ? prevMonth : nextMonth}
            className="w-8 h-8 rounded-full flex items-center justify-center bg-secondary hover:bg-muted transition-colors active:scale-90 duration-150"
          >
            <ChevronRight className="w-3.5 h-3.5 text-foreground" />
          </button>
        ) : <div className="w-8" />}
      </div>

      <AnimatePresence initial={false}>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.3, ease: [0.25, 1, 0.5, 1] }}
            className="overflow-hidden"
          >
            <div className="mt-3">

      {/* Live time indicator */}
      {isCurrentMonth && (
        <div className="flex items-center gap-2 mb-2 px-1">
          <div className="relative flex-1 h-[2px] rounded-full bg-muted overflow-hidden">
            <motion.div
              className="absolute inset-y-0 left-0 bg-primary rounded-full"
              style={{ width: `${timeProgress * 100}%` }}
              layout
              transition={{ duration: 0.5, ease: 'linear' }}
            />
            <motion.div
              className="absolute top-1/2 -translate-y-1/2 w-[5px] h-[5px] rounded-full bg-primary"
              style={{ left: `${timeProgress * 100}%` }}
              animate={{ scale: [1, 1.3, 1] }}
              transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
            />
          </div>
          <span className="text-[9px] font-mono text-muted-foreground tabular-nums min-w-[52px] text-right">
            {timeString}
          </span>
        </div>
      )}

      {/* Day headers */}
      <div className="grid grid-cols-7 mb-0.5">
        {dayHeaders.map((d, i) => (
          <div key={i} className="text-center text-[10px] font-medium text-muted-foreground py-1">{d}</div>
        ))}
      </div>

      {/* Calendar grid */}
      <AnimatePresence mode="wait" custom={direction}>
        <motion.div
          key={`${viewYear}-${viewMonth}`}
          custom={direction}
          variants={slideVariants}
          initial="enter"
          animate="center"
          exit="exit"
          transition={{ duration: 0.3, ease: [0.25, 1, 0.5, 1] as const }}
          className="grid grid-cols-7 gap-y-0.5 relative"
        >
          {blanks.map(i => <div key={`b-${i}`} />)}
          {calendarDays.map((day, idx) => (
            <motion.div
              key={day.gDay}
              initial={{ opacity: 0, scale: 0.85 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{
                duration: 0.25,
                delay: idx * 0.008,
                ease: [0.25, 1, 0.5, 1] as const,
              }}
              onClick={() => setSelectedDay(selectedDay?.gDay === day.gDay ? null : day)}
              className={`relative flex flex-col items-center justify-center py-1.5 rounded-lg transition-colors duration-200 cursor-pointer ${
                day.isToday
                  ? ''
                  : selectedDay?.gDay === day.gDay
                    ? 'bg-primary/10 ring-1 ring-primary/30'
                    : 'hover:bg-secondary'
              }`}
            >
              {day.isToday && (
                <motion.div
                  className="absolute inset-0 rounded-lg bg-primary"
                  animate={{
                    boxShadow: [
                      '0 0 0 0px hsl(var(--primary) / 0.3)',
                      '0 0 0 3px hsl(var(--primary) / 0.08)',
                      '0 0 0 0px hsl(var(--primary) / 0.3)',
                    ],
                  }}
                  transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' }}
                />
              )}
              <span className={`relative z-10 text-[12px] font-semibold leading-none ${day.isToday ? 'text-primary-foreground' : 'text-foreground'}`}>
                {day.gDay}
              </span>
              <span className={`relative z-10 text-[8px] mt-0.5 leading-none font-medium ${
                day.isToday ? 'text-primary-foreground/70' : 'text-muted-foreground'
              }`}>
                {day.hDay}
              </span>
            </motion.div>
          ))}
        </motion.div>
      </AnimatePresence>

      {/* Countdown info */}
      <AnimatePresence>
        {selectedDay && (() => {
          const targetDate = new Date(viewYear, viewMonth - 1, selectedDay.gDay);
          const todayStart = new Date(today.getFullYear(), today.getMonth(), today.getDate());
          const diffTime = targetDate.getTime() - todayStart.getTime();
          const diffDays = Math.round(diffTime / (1000 * 60 * 60 * 24));
          const hijri = gregorianToHijri(viewYear, viewMonth, selectedDay.gDay);

          let label: string;
          if (diffDays === 0) label = t('calendar.isToday');
          else if (diffDays === 1) label = t('calendar.tomorrow');
          else if (diffDays === -1) label = t('calendar.yesterday');
          else if (diffDays > 0) label = `${diffDays} ${t('calendar.daysLeft')}`;
          else label = `${Math.abs(diffDays)} ${t('calendar.daysAgo')}`;

          return (
            <motion.div
              initial={{ opacity: 0, height: 0, marginTop: 0 }}
              animate={{ opacity: 1, height: 'auto', marginTop: 12 }}
              exit={{ opacity: 0, height: 0, marginTop: 0 }}
              transition={{ duration: 0.25, ease: [0.25, 1, 0.5, 1] as const }}
              className="overflow-hidden"
            >
              <div className="flex items-center justify-between rounded-xl bg-secondary/60 px-4 py-3">
                <div className="flex flex-col gap-0.5">
                  <span className="text-[13px] font-semibold text-foreground">
                    {selectedDay.gDay} {t(`months.${viewMonth}`)} {viewYear}
                  </span>
                  <span className="text-[11px] text-muted-foreground">
                    {hijri.day} {t(`hijriMonths.${hijri.month}`)} {hijri.year}
                  </span>
                </div>
                <div className={`text-[13px] font-bold px-3 py-1.5 rounded-lg ${
                  diffDays === 0
                    ? 'bg-primary text-primary-foreground'
                    : diffDays > 0
                      ? 'bg-primary/10 text-primary'
                      : 'bg-muted text-muted-foreground'
                }`}>
                  {label}
                </div>
              </div>
            </motion.div>
          );
        })()}
      </AnimatePresence>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
