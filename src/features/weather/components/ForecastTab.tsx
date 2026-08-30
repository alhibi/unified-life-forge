// ============================================================================
// ForecastTab — three forecast views (hourly / daily / charts) with a
// pill-style sub-tab switcher.
//
// WHY A SLIDING SUB-TAB
//   The previous version had a flat three-button bar; the active button
//   was just a coloured rectangle. This version renders a sliding pill
//   that animates between the three states. Combined with the
//   TabNavigation outside, the user always knows where they are.
// ============================================================================

import { AnimatePresence, motion } from 'framer-motion';
import { useState } from 'react';

import { cn } from '@/lib/utils';

import { duration, easing } from '../lib/weather-motion';
import { DailyRangeStrip } from './DailyRangeStrip';
import { HourlyRibbon } from './HourlyRibbon';
import HourlyTrendPanel from './HourlyTrendPanel';

interface ForecastTabProps {
  hourly: any[];
  daily: any[];
  iconFor: (code: number, isDay: boolean) => React.ComponentType<{ className?: string; strokeWidth?: number }>;
  locale: string;
}

const SUB_TABS = [
  { id: 'hourly', label: 'ساعات' },
  { id: 'daily',  label: 'أيام'  },
  { id: 'charts', label: 'رسوم'  },
] as const;

type SubId = typeof SUB_TABS[number]['id'];

export function ForecastTab({ hourly, daily, iconFor, locale }: ForecastTabProps) {
  const [sub, setSub] = useState<SubId>('hourly');
  const activeIndex = SUB_TABS.findIndex((t) => t.id === sub);

  return (
    <section className="space-y-4">
      {/* Sub-tab switcher */}
      <nav
        role="tablist"
        aria-label="عرض التوقع"
        className="relative grid grid-cols-3 p-1 rounded-2xl border border-border/40 surface-depth bg-background/70 backdrop-blur-sm"
      >
        <motion.div
          aria-hidden
          layoutId="forecast-sub-pill"
          className="absolute inset-y-1 rounded-xl bg-primary shadow-[0_2px_8px_hsl(var(--primary)/0.25)]"
          initial={false}
          animate={{
            left: `${(activeIndex * 100) / 3}%`,
            width: `${100 / 3}%`,
          }}
          transition={{ duration: duration.reveal, ease: easing.standard }}
        />
        {SUB_TABS.map((t) => {
          const active = sub === t.id;
          return (
            <button
              key={t.id}
              role="tab"
              aria-selected={active}
              onClick={() => setSub(t.id)}
              className={cn(
                'relative z-10 px-2 py-2 rounded-xl text-mini font-bold transition-colors duration-200 active:scale-[0.97]',
                active ? 'text-primary-foreground' : 'text-muted-foreground hover:text-foreground',
              )}
            >
              {t.label}
            </button>
          );
        })}
      </nav>

      <AnimatePresence mode="wait">
        {sub === 'hourly' && (
          <motion.div
            key="hourly"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: duration.reveal, ease: easing.standard }}
            className="space-y-4"
          >
            <HourlyRibbon entries={hourly} iconFor={iconFor} locale={locale} />
            <HourlyTrendPanel entries={hourly} />
          </motion.div>
        )}

        {sub === 'daily' && (
          <motion.div
            key="daily"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: duration.reveal, ease: easing.standard }}
          >
            <DailyRangeStrip days={daily.slice(0, 7)} iconFor={iconFor} locale={locale} />
          </motion.div>
        )}

        {sub === 'charts' && (
          <motion.div
            key="charts"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: duration.reveal, ease: easing.standard }}
            className="space-y-4"
          >
            <HourlyTrendPanel entries={hourly} />
            <DailyRangeStrip days={daily.slice(0, 7)} iconFor={iconFor} locale={locale} />
          </motion.div>
        )}
      </AnimatePresence>
    </section>
  );
}