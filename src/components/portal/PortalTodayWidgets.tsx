/**
 * PortalTodayWidgets — the launcher's "today" surface: the prayer card (which
 * now carries the qibla compass behind its own disclosure) and a compact
 * weather strip. Loaded lazily from `Portal.tsx`.
 */
import PrayerTimes from '@/components/PrayerTimes';
import WeatherWidget from '@/features/weather/components/WeatherWidget';

export default function PortalTodayWidgets() {
  return (
    <div className="relative z-10 space-y-4">
      {/* Both sections reserve their measured height (21rem / 16.5rem at phone
          width). Prayer times and weather both resolve asynchronously, and
          without a reserve the tile grid below them jumped ~110px of CLS the
          moment the data landed. */}
      <section aria-labelledby="portal-prayer-h" className="min-h-[21rem] sm:min-h-[19rem]">
        <h2 id="portal-prayer-h" className="sr-only">أوقات الصلاة وبوصلة القبلة</h2>
        <PrayerTimes />
      </section>

      <section aria-labelledby="portal-weather-h" className="min-h-[16.5rem]">
        <h2 id="portal-weather-h" className="sr-only">الطقس</h2>
        <WeatherWidget />
      </section>
    </div>
  );
}
