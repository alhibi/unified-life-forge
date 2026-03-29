import React, { useState, useMemo } from 'react';
import { useApp } from '@/contexts/AppContext';
import { gregorianToHijri, getDaysInGregorianMonth, getFirstDayOfMonth } from '@/utils/hijri';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { AnimatePresence, motion } from 'framer-motion';

export default function DualCalendar() {
  const { t, dir } = useApp();
  const today = new Date();
  const [viewYear, setViewYear] = useState(today.getFullYear());
  const [viewMonth, setViewMonth] = useState(today.getMonth() + 1);
  const [direction, setDirection] = useState(0);

  const daysInMonth = getDaysInGregorianMonth(viewYear, viewMonth);
  const firstDay = getFirstDayOfMonth(viewYear, viewMonth);

  const calendarDays = useMemo(() => {
    const days: Array<{ gDay: number; hDay: number; isToday: boolean }> = [];
    for (let d = 1; d <= daysInMonth; d++) {
      const h = gregorianToHijri(viewYear, viewMonth, d);
      const isToday = d === today.getDate() && viewMonth === today.getMonth() + 1 && viewYear === today.getFullYear();
      days.push({ gDay: d, hDay: h.day, isToday });
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

  const dayHeaders = Array.from({ length: 7 }, (_, i) => t(`daysShort.${i}`));
  const blanks = Array.from({ length: firstDay }, (_, i) => i);

  const slideVariants = {
    enter: (d: number) => ({ opacity: 0, x: d === 0 ? 0 : d > 0 ? 40 : -40 }),
    center: { opacity: 1, x: 0 },
    exit: (d: number) => ({ opacity: 0, x: d === 0 ? 0 : d > 0 ? -40 : 40 }),
  };

  return (
    <div className="bg-card border border-border/40 rounded-2xl px-3 py-3">
      {/* Header */}
      <div className="flex items-center justify-between mb-2">
        <button
          onClick={dir === 'rtl' ? nextMonth : prevMonth}
          className="w-7 h-7 rounded-full flex items-center justify-center bg-secondary hover:bg-muted transition-colors active:scale-90"
        >
          <ChevronLeft className="w-3 h-3 text-foreground" />
        </button>
        <div className="text-center">
          <div className="text-[13px] font-semibold text-foreground leading-snug">
            {t(`months.${viewMonth}`)} {viewYear}
          </div>
          <div className="text-[10px] text-primary font-medium leading-tight">
            {t(`hijriMonths.${hijriInfo.month}`)} {hijriInfo.year}
          </div>
        </div>
        <button
          onClick={dir === 'rtl' ? prevMonth : nextMonth}
          className="w-7 h-7 rounded-full flex items-center justify-center bg-secondary hover:bg-muted transition-colors active:scale-90"
        >
          <ChevronRight className="w-3 h-3 text-foreground" />
        </button>
      </div>

      {/* Day headers */}
      <div className="grid grid-cols-7">
        {dayHeaders.map((d, i) => (
          <div key={i} className="text-center text-[9px] font-medium text-muted-foreground py-0.5">{d}</div>
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
          transition={{ duration: 0.25, ease: [0.25, 1, 0.5, 1] }}
          className="grid grid-cols-7"
        >
          {blanks.map(i => <div key={`b-${i}`} />)}
          {calendarDays.map((day) => (
            <div
              key={day.gDay}
              className={`relative flex flex-col items-center justify-center py-[3px] rounded-md ${
                day.isToday ? 'bg-primary shadow-sm' : ''
              }`}
            >
              <span className={`text-[11px] font-semibold leading-none ${day.isToday ? 'text-primary-foreground' : 'text-foreground'}`}>
                {day.gDay}
              </span>
              <span className={`text-[7px] mt-[1px] leading-none font-medium ${
                day.isToday ? 'text-primary-foreground/70' : 'text-muted-foreground'
              }`}>
                {day.hDay}
              </span>
            </div>
          ))}
        </motion.div>
      </AnimatePresence>
    </div>
  );
}
