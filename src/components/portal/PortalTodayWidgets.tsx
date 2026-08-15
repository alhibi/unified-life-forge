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
      <section aria-labelledby="portal-prayer-h">
        <h2 id="portal-prayer-h" className="sr-only">أوقات الصلاة وبوصلة القبلة</h2>
        <PrayerTimes />
      </section>

      <section aria-labelledby="portal-weather-h">
        <h2 id="portal-weather-h" className="sr-only">الطقس</h2>
        <WeatherWidget />
      </section>
    </div>
  );
}
