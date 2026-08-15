/**
 * PortalTodayWidgets — "today" surface on the launcher: prayer times (with the
 * qibla/ummah compass folded in behind a small disclosure) and a compact
 * weather strip.
 *
 * Loaded lazily from `Portal.tsx` so the greeting paints first.
 */
import { lazy, Suspense, useState } from 'react';

import PrayerTimes from '@/components/PrayerTimes';
import WeatherWidget from '@/features/weather/components/WeatherWidget';
import { ChevronDown, Compass } from '@/lib/icons';

const UmmahPulse = lazy(() => import('@/components/UmmahPulse'));

export default function PortalTodayWidgets() {
  const [showCompass, setShowCompass] = useState(false);

  return (
    <div className="relative z-10 space-y-4">
      <section aria-labelledby="portal-prayer-h" className="space-y-2">
        <h2 id="portal-prayer-h" className="sr-only">أوقات الصلاة</h2>
        <PrayerTimes />

        <button
          type="button"
          onClick={() => setShowCompass((v) => !v)}
          aria-expanded={showCompass}
          aria-controls="portal-qibla-panel"
          className="flex h-9 items-center gap-2 rounded-full border border-border/60 bg-card/50 px-3 text-mini font-medium text-muted-foreground backdrop-blur-sm transition-colors duration-fast hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          <Compass className="h-3.5 w-3.5" aria-hidden />
          بوصلة القبلة
          <ChevronDown
            className={`h-3.5 w-3.5 transition-transform duration-normal ${showCompass ? 'rotate-180' : ''}`}
            aria-hidden
          />
        </button>

        {showCompass && (
          <div id="portal-qibla-panel">
            <Suspense fallback={null}>
              <UmmahPulse />
            </Suspense>
          </div>
        )}
      </section>

      <section aria-labelledby="portal-weather-h">
        <h2 id="portal-weather-h" className="sr-only">الطقس</h2>
        <WeatherWidget />
      </section>
    </div>
  );
}
