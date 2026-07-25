/**
 * MihrabHeader — the hub's masthead, now carrying state instead of decoration.
 *
 * The old header was a 1.75rem-radius plate with a `bg-primary/10` colour wash
 * behind a 28px title: it tinted chrome with the accent (which the design
 * system reserves for meaning, not for surfaces) and told the user nothing.
 *
 * This one answers the three questions that matter on opening the hub:
 * where am I in the day (Hijri date + next prayer), how much of today's
 * practice is done (ring), and am I keeping it up (streak + 28-day strip).
 */
import { memo } from 'react';

import { useNextPrayer } from '@/components/portal/useNextPrayer';
import ProgressRing from '@/components/ProgressRing';
import { AppCard } from '@/components/ui/app-shell';
import { formatHijriDate } from '@/features/calendar/data/islamicOccasions';
import { useLiveHijriDate } from '@/features/calendar/hooks/useLiveHijriDate';
import { Flame } from '@/lib/icons';
import { cn } from '@/lib/utils';

import { usePractice } from '../lib/usePractice';

function MihrabHeaderImpl() {
  const { hijri } = useLiveHijriDate();
  const { next } = useNextPrayer();
  const { progress, streak, recentDays } = usePractice();

  const percent = Math.round(progress.overall * 100);

  return (
    <AppCard as="header" aria-label="ملخص المحراب">
      <div className="flex items-start gap-4">
        <div className="min-w-0 flex-1">
          <p className="text-micro font-semibold uppercase tracking-[0.16em] text-muted-foreground">
            بوابة السكينة
          </p>
          <h1 className="mt-1 text-display font-semibold text-foreground">محراب</h1>
          <p className="mt-1 text-mini text-muted-foreground">{formatHijriDate(hijri)}</p>
          {next && (
            <p className="mt-2 text-meta text-foreground">
              {next.label} <span className="text-muted-foreground">{next.relative}</span>
            </p>
          )}
        </div>

        <ProgressRing
          progress={progress.overall}
          size={72}
          thickness={4}
          label={`تم إنجاز ${percent} بالمئة من ورد اليوم`}
        >
          <span className="text-meta font-semibold tabular-nums text-foreground" dir="ltr">
            {percent}%
          </span>
        </ProgressRing>
      </div>

      {/* Streak + 28-day activity strip. Each cell encodes one day's completion
          share — this is data, so it is allowed the accent colour. */}
      <div className="mt-4 flex items-center gap-3">
        <span
          className={cn(
            'flex shrink-0 items-center gap-1.5 rounded-sm border px-2 py-1 text-mini font-semibold tabular-nums',
            streak.current > 0 ? 'border-primary/60 text-foreground' : 'border-border text-muted-foreground',
          )}
        >
          <Flame className="h-3.5 w-3.5" aria-hidden />
          <span dir="ltr">{streak.current}</span> يوم متتابع
        </span>

        <div className="flex min-w-0 flex-1 items-end gap-[3px]" aria-hidden>
          {recentDays.map((day) => (
            <span
              key={day.key}
              className="h-6 flex-1 rounded-[2px] bg-muted"
              style={{
                // Opacity encodes completion; a flat token colour at varying
                // alpha keeps this inside the single-accent contract.
                backgroundColor: day.active
                  ? `hsl(var(--primary) / ${0.28 + Math.min(1, day.progress) * 0.72})`
                  : undefined,
              }}
            />
          ))}
        </div>
      </div>
      {/* Only claim a record once one exists — "أفضل تتابع ٠ يوم" is noise. */}
      {streak.total > 0 && (
        <p className="mt-2 text-micro tabular-nums text-muted-foreground">
          أفضل تتابع {streak.best} يوماً · {streak.total} يوماً نشِطاً في آخر ٤ أشهر
        </p>
      )}
    </AppCard>
  );
}

export const MihrabHeader = memo(MihrabHeaderImpl);
export default MihrabHeader;
