import React from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowRight, CalendarDays, Clock } from 'lucide-react';
import { getUpcomingOccasions, getPastOccasions, getDaysUntil, formatGregorianDate } from '@/data/islamicOccasions';
import type { IslamicOccasion } from '@/data/islamicOccasions';

function OccasionCard({ occasion, isPast }: { occasion: IslamicOccasion; isPast?: boolean }) {
  const daysLeft = getDaysUntil(occasion.gregorianDate);
  const isToday = daysLeft === 0;

  return (
    <div
      className={`relative rounded-xl bg-card/80 border border-border/60 p-4 flex items-center gap-4 rtl:flex-row-reverse border-r-0 border-t-0 border-b-0 border-l-[3px] ${occasion.color} ${isPast ? 'opacity-70' : ''}`}
    >
      <div className="flex flex-col items-center justify-center min-w-[52px] rounded-lg bg-muted/60 py-2 px-2">
        <span className="text-2xl font-bold text-primary leading-none">{occasion.hijriDay}</span>
        <span className="text-[10px] text-muted-foreground mt-0.5 leading-tight">{occasion.hijriMonth}</span>
      </div>
      <div className="flex-1 min-w-0 text-right">
        <h3 className="text-sm font-bold text-foreground leading-snug">{occasion.name}</h3>
        <p className="text-[11px] text-muted-foreground mt-0.5 line-clamp-2 leading-relaxed">{occasion.description}</p>
        <p className="text-[10px] text-muted-foreground/70 mt-1">
          {formatGregorianDate(occasion.gregorianDate)}
          {isPast ? (
            <span> · مضت</span>
          ) : isToday ? (
            <span> · <span className="text-primary font-semibold">اليوم</span></span>
          ) : (
            <span> · بعد {daysLeft} يوم</span>
          )}
        </p>
      </div>
    </div>
  );
}

export default function AllOccasions() {
  const navigate = useNavigate();
  const upcoming = getUpcomingOccasions();
  const past = getPastOccasions();

  return (
    <div className="min-h-screen bg-background pb-28 px-5 pt-6">
      <div className="max-w-lg mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center gap-3">
          <button onClick={() => navigate(-1)} className="p-2 rounded-xl bg-card border border-border/60 hover:bg-muted transition-colors">
            <ArrowRight className="w-5 h-5 text-foreground" />
          </button>
          <h1 className="text-lg font-bold text-foreground">المناسبات الدينية</h1>
        </div>

        {/* Upcoming */}
        {upcoming.length > 0 && (
          <section className="space-y-3">
            <div className="flex items-center gap-2">
              <CalendarDays className="w-4 h-4 text-primary" />
              <h2 className="text-[14px] font-bold text-foreground">المناسبات القادمة</h2>
            </div>
            <div className="space-y-2.5">
              {upcoming.map(o => <OccasionCard key={o.id} occasion={o} />)}
            </div>
          </section>
        )}

        {/* Past */}
        {past.length > 0 && (
          <section className="space-y-3">
            <div className="flex items-center gap-2">
              <Clock className="w-4 h-4 text-muted-foreground" />
              <h2 className="text-[14px] font-bold text-foreground">المناسبات الماضية</h2>
            </div>
            <div className="space-y-2.5">
              {past.map(o => <OccasionCard key={o.id} occasion={o} isPast />)}
            </div>
          </section>
        )}
      </div>
    </div>
  );
}
