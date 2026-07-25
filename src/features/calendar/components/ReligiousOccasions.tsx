import React from 'react';
import { useNavigate } from 'react-router-dom';

import { useApp } from '@/contexts/AppContext';
import type { IslamicOccasion } from '@/features/calendar/data/islamicOccasions';
import { formatGregorianDate,getDaysUntil, getUpcomingOccasions } from '@/features/calendar/data/islamicOccasions';
import { CalendarDays, ChevronLeft, ChevronRight } from '@/lib/icons';

function OccasionCard({ occasion, t }: { occasion: IslamicOccasion; t: (key: string) => string }) {
  const daysLeft = getDaysUntil(occasion.gregorianDate);
  const isToday = daysLeft === 0;

  return (
    <div
      className={`relative rounded-xl bg-card/80 border border-border/60 p-4 flex items-center gap-4 border-y-0 border-e-0 border-s-[3px] ${occasion.color}`}
    >
      {/* Date badge */}
      <div className="flex flex-col items-center justify-center min-w-[52px] rounded-lg bg-muted/60 py-2 px-2">
        <span className="text-2xl font-bold text-primary leading-none">{occasion.hijriDay}</span>
        <span className="text-[10px] text-muted-foreground mt-0.5 leading-tight">{occasion.hijriMonth}</span>
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <h3 className="text-sm font-bold text-foreground leading-snug">{occasion.name}</h3>
        <p className="text-[11px] text-muted-foreground mt-0.5 line-clamp-2 leading-relaxed">{occasion.description}</p>
        <p className="text-[10px] text-muted-foreground mt-1">
          {formatGregorianDate(occasion.gregorianDate)}
          {' · '}
          {isToday ? (
            <span className="text-primary font-semibold">{t('occasions.today')}</span>
          ) : (
            <span>{t('occasions.after')} {daysLeft} {t('occasions.day')}</span>
          )}
        </p>
      </div>
    </div>
  );
}

export default function ReligiousOccasions() {
  const navigate = useNavigate();
  const { t, dir } = useApp();
  const upcoming = getUpcomingOccasions(4);
  const Arrow = dir === 'rtl' ? ChevronLeft : ChevronRight;

  if (upcoming.length === 0) return null;

  return (
    <div className="space-y-3">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="p-1.5 rounded-lg bg-primary/10">
            <CalendarDays className="w-4 h-4 text-primary" />
          </div>
          <h2 className="text-[15px] font-bold text-foreground">{t('occasions.title')}</h2>
        </div>
        <button
          onClick={() => navigate('/occasions')}
          className="flex items-center gap-1 text-[12px] text-primary font-medium hover:underline"
        >
          {t('occasions.showAll')}
          <Arrow className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* Cards */}
      <div className="space-y-2.5">
        {upcoming.map(o => (
          <OccasionCard key={o.id} occasion={o} t={t} />
        ))}
      </div>
    </div>
  );
}
