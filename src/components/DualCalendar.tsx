import React, { useState, useMemo } from 'react';
import { useApp } from '@/contexts/AppContext';
import { gregorianToHijri, getDaysInGregorianMonth, getFirstDayOfMonth } from '@/utils/hijri';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

export default function DualCalendar() {
  const { t, dir } = useApp();
  const today = new Date();
  const [viewYear, setViewYear] = useState(today.getFullYear());
  const [viewMonth, setViewMonth] = useState(today.getMonth() + 1);

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
    if (viewMonth === 1) { setViewYear(y => y - 1); setViewMonth(12); }
    else setViewMonth(m => m - 1);
  };
  const nextMonth = () => {
    if (viewMonth === 12) { setViewYear(y => y + 1); setViewMonth(1); }
    else setViewMonth(m => m + 1);
  };
  const goToday = () => { setViewYear(today.getFullYear()); setViewMonth(today.getMonth() + 1); };

  const dayHeaders = Array.from({ length: 7 }, (_, i) => t(`daysShort.${i}`));
  const blanks = Array.from({ length: firstDay }, (_, i) => i);

  return (
    <div className="premium-card-intense p-5">
      {/* Header */}
      <div className="flex items-center justify-between mb-5">
        <button
          onClick={dir === 'rtl' ? nextMonth : prevMonth}
          className="w-9 h-9 rounded-full flex items-center justify-center bg-secondary hover:bg-muted transition-colors"
        >
          <ChevronLeft className="w-4 h-4 text-foreground" />
        </button>
        <button onClick={goToday} className="text-center">
          <div className="text-[17px] font-semibold text-foreground leading-snug">
            {t(`months.${viewMonth}`)} {viewYear}
          </div>
          <div className="text-xs text-primary font-medium mt-0.5">
            {t(`hijriMonths.${hijriInfo.month}`)} {hijriInfo.year}
          </div>
        </button>
        <button
          onClick={dir === 'rtl' ? prevMonth : nextMonth}
          className="w-9 h-9 rounded-full flex items-center justify-center bg-secondary hover:bg-muted transition-colors"
        >
          <ChevronRight className="w-4 h-4 text-foreground" />
        </button>
      </div>

      {/* Day headers */}
      <div className="grid grid-cols-7 mb-1">
        {dayHeaders.map((d, i) => (
          <div key={i} className="text-center text-[11px] font-medium text-muted-foreground py-1.5">{d}</div>
        ))}
      </div>

      {/* Calendar grid */}
      <AnimatePresence mode="wait">
        <motion.div
          key={`${viewYear}-${viewMonth}`}
          initial={{ opacity: 0, x: 16 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -16 }}
          transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
          className="grid grid-cols-7 gap-y-0.5"
        >
          {blanks.map(i => <div key={`b-${i}`} />)}
          {calendarDays.map(day => (
            <div
              key={day.gDay}
              className={`relative flex flex-col items-center justify-center py-2 rounded-xl transition-all duration-200 ${
                day.isToday
                  ? 'bg-primary text-primary-foreground shadow-md'
                  : 'hover:bg-secondary'
              }`}
            >
              <span className={`text-[13px] font-semibold leading-none ${day.isToday ? 'text-primary-foreground' : 'text-foreground'}`}>
                {day.gDay}
              </span>
              <span className={`text-[9px] mt-0.5 leading-none font-medium ${
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
