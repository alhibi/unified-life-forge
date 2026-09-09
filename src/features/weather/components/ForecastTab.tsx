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

import type { DailyEntry, HourlyEntry } from '../types/ForecastLayer';
import { DailyRangeStrip } from './DailyRangeStrip';
import { HourlyRibbon } from './HourlyRibbon';
import HourlyTrendPanel from './HourlyTrendPanel';

interface ForecastTabProps {
  hourly: HourlyEntry[];
  daily: DailyEntry[];
  iconFor: (code: number, isDay: boolean) => React.ComponentType<{ className?: string; strokeWidth?: number }>;
  locale: string;
}

export function ForecastTab({ hourly, daily, iconFor, locale }: ForecastTabProps) {
  return (
    <section className="weather-forecast-layout">
      <div className="weather-chart-stage">
        <HourlyTrendPanel entries={hourly} />
      </div>
      <div className="weather-forecast-rail">
        <HourlyRibbon entries={hourly} iconFor={iconFor} locale={locale} />
        <DailyRangeStrip days={daily.slice(0, 7)} iconFor={iconFor} locale={locale} />
      </div>
    </section>
  );
}