import { useState } from 'react';

import { DailyRangeStrip } from './DailyRangeStrip';
import { HourlyRibbon } from './HourlyRibbon';
import HourlyTrendPanel from './HourlyTrendPanel';
import { WeatherPanel, WeatherSection } from './WeatherPanels';

export interface ForecastTabProps {
  hourly: any[];
  daily: any[];
  iconFor: (code: number, isDay: boolean) => any;
  locale: string;
}

export function ForecastTab({ hourly, daily, iconFor, locale }: ForecastTabProps) {
  const [subTab, setSubTab] = useState<'hourly' | 'daily' | 'charts'>('hourly');

  const subTabs = [
    { id: 'hourly', label: 'الساعات', icon: null },
    { id: 'daily', label: 'الأيام', icon: null },
    { id: 'charts', label: 'الرسوم البيانية', icon: null },
  ] as const;

  return (
    <div className="space-y-5">
      {/* Sub-tab navigation */}
      <div className="flex bg-background border border-border p-1 rounded-xl gap-1">
        {subTabs.map((t) => (
          <button
            key={t.id}
            onClick={() => setSubTab(t.id)}
            className={`flex-1 flex flex-col items-center justify-center gap-1 py-2 px-1 rounded-lg font-bold transition-all ${
              subTab === t.id
                ? 'bg-primary text-primary-foreground shadow-sm'
                : 'text-muted-foreground hover:bg-muted/30 hover:text-foreground'
            }`}
          >
            <span className="text-micro leading-tight text-center truncate max-w-full">{t.label}</span>
          </button>
        ))}
      </div>

      {/* Sub-tab content */}
      <div className="space-y-5">
        {subTab === 'hourly' && (
          <>
            <HourlyRibbon entries={hourly} iconFor={iconFor} locale={locale} />
            <HourlyTrendPanel entries={hourly} />
          </>
        )}
        {subTab === 'daily' && (
          <DailyRangeStrip days={daily.slice(0, 7)} iconFor={iconFor} locale={locale} />
        )}
        {subTab === 'charts' && (
          <WeatherPanel title="الرسوم البيانية المتقدمة" subtitle="تحليل بصري">
            <WeatherSection title="مخطط الحرارة" subtitle="24 ساعة">
              <HourlyTrendPanel entries={hourly} />
            </WeatherSection>
            <WeatherSection title="مخطط الأيام السبعة" subtitle="7 أيام">
              <DailyRangeStrip days={daily.slice(0, 7)} iconFor={iconFor} locale={locale} />
            </WeatherSection>
          </WeatherPanel>
        )}
      </div>
    </div>
  );
}