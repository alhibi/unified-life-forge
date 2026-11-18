/**
 * PortalTodayWidgets — the launcher's "today" console.
 *
 * The launcher used to stack the prayer card and the weather plate down one
 * narrow column, which made the first screen read as a list of widgets rather
 * than a day. The console is now a three-zone band: the prayer card is the
 * primary zone (a little over half the width), the weather plate and the day's
 * four real tools are the two supporting zones. All three land within a few
 * dozen pixels of each other in height, so the band has no hollow side; on wide
 * screens it ends before the launcher headline — the first viewport shows both
 * "what is today" and the beginning of "where can I go".
 *
 * On phones the same order stacks: prayer, weather, tools. Nothing is imported
 * from the weather feature beyond its public widget, and no height is forced
 * here — the sections size to their content and the suspense skeleton mirrors
 * this exact grid.
 */
import PrayerTimes from '@/components/PrayerTimes';
import WeatherWidget from '@/features/weather/components/WeatherWidget';

import PortalDayTools from './PortalDayTools';

export default function PortalTodayWidgets() {
  return (
    <div className="grid items-start gap-6 md:grid-cols-2 lg:grid-cols-[minmax(0,1fr)_clamp(17rem,23vw,20rem)_clamp(15rem,21vw,18rem)] lg:gap-6">
      {/* Primary zone: prayer status, day arc and the two disclosures. */}
      <section
        aria-labelledby="portal-prayer-h"
        className="min-w-0 md:col-span-2 lg:col-span-1"
      >
        <h2
          id="portal-prayer-h"
          className="mb-3 text-meta font-semibold text-muted-foreground"
        >
          الصلاة
        </h2>
        <PrayerTimes />
      </section>

      {/* Supporting zone: weather now. */}
      <section aria-labelledby="portal-weather-h" className="min-w-0">
        <h2
          id="portal-weather-h"
          className="mb-3 text-meta font-semibold text-muted-foreground"
        >
          الطقس
        </h2>
        <WeatherWidget />
      </section>

      {/* Supporting zone: the day's four real actions. */}
      <PortalDayTools className="min-w-0" />
    </div>
  );
}
