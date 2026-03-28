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
    <div className="glass-card-elevated p-4 animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <button onClick={dir === 'rtl' ? nextMonth : prevMonth} className="p-2 rounded-lg hover:bg-secondary transition-colors">
          <ChevronLeft className="w-5 h-5 text-foreground" />
        </button>
        <div className="text-center">
          <div className="text-lg font-bold font-display text-foreground">
            {t(`months.${viewMonth}`)} {viewYear}
          </div>
          <div className="text-sm text-primary font-medium">
            {t(`hijriMonths.${hijriInfo.month}`)} {hijriInfo.year}
          </div>
        </div>
        <button onClick={dir === 'rtl' ? prevMonth : nextMonth} className="p-2 rounded-lg hover:bg-secondary transition-colors">
          <ChevronRight className="w-5 h-5 text-foreground" />
        </button>
      </div>

      {/* Today button */}
      <div className="flex justify-center mb-3">
        <button onClick={goToday} className="text-xs gradient-primary text-primary-foreground px-3 py-1 rounded-full font-medium">
          {t('calendar.today')}
        </button>
      </div>

      {/* Day headers */}
      <div className="grid grid-cols-7 gap-1 mb-1">
        {dayHeaders.map((d, i) => (
          <div key={i} className="text-center text-xs font-medium text-muted-foreground py-1">{d}</div>
        ))}
      </div>

      {/* Calendar grid */}
      <AnimatePresence mode="wait">
        <motion.div
          key={`${viewYear}-${viewMonth}`}
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -20 }}
          transition={{ duration: 0.2 }}
          className="grid grid-cols-7 gap-1"
        >
          {blanks.map(i => <div key={`b-${i}`} />)}
          {calendarDays.map(day => (
            <div
              key={day.gDay}
              className={`relative flex flex-col items-center justify-center py-1.5 rounded-lg transition-all duration-200 ${
                day.isToday
                  ? 'gradient-primary text-primary-foreground shadow-lg animate-pulse-glow'
                  : 'hover:bg-secondary'
              }`}
            >
              <span className={`text-sm font-semibold ${day.isToday ? 'text-primary-foreground' : 'text-foreground'}`}>
                {day.gDay}
              </span>
              <span className={`text-[10px] leading-none ${day.isToday ? 'text-primary-foreground/80' : 'text-primary'}`}>
                {day.hDay}
              </span>
            </div>
          ))}
        </motion.div>
      </AnimatePresence>
    </div>
  );
}
