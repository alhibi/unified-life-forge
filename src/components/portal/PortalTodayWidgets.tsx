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
      {/* Both sections reserve their measured height so the tile grid below
          does not jump when the async data lands (CLS guard). The occasions
          strip now lives behind a disclosure inside the prayer card, and the
          weather hourly rail is sm+-only, so the reserves are much tighter
          than the old 21rem / 17.5rem. */}
      <section aria-labelledby="portal-prayer-h" className="min-h-[15.5rem]">
        <h2 id="portal-prayer-h" className="sr-only">أوقات الصلاة وبوصلة القبلة</h2>
        <PrayerTimes />
      </section>

      <section aria-labelledby="portal-weather-h" className="min-h-[8.5rem] sm:min-h-[16.5rem]">
        <h2 id="portal-weather-h" className="sr-only">الطقس</h2>
        <WeatherWidget />
      </section>
    </div>
  );
}
