/**
 * PortalTodayWidgets — "today" surface that used to live inside the standalone
 * «الرئيسي» app (/now). Prayer times, the current sunnah, weather and the
 * qibla/ummah compass now belong to the launcher itself, so the first screen
 * answers "what is happening right now?" without opening an app first.
 *
 * Loaded lazily from `Portal.tsx` so the greeting/pulse bar still paint first.
 */
import { Link } from 'react-router-dom';

import CurrentTimeSunnah from '@/components/CurrentTimeSunnah';
import PrayerTimes from '@/components/PrayerTimes';
import UmmahPulse from '@/components/UmmahPulse';
import WeatherWidget from '@/features/weather/components/WeatherWidget';
import { Calendar, ChevronLeft, CloudSun } from '@/lib/icons';

const DEEP_LINKS = [
  { path: '/weather', label: 'الطقس المفصّل', icon: CloudSun },
  { path: '/occasions', label: 'المناسبات والتقويم', icon: Calendar },
] as const;

export default function PortalTodayWidgets() {
  return (
    <div className="relative z-10 space-y-4">
      <section aria-labelledby="portal-prayer-h">
        <h2 id="portal-prayer-h" className="sr-only">أوقات الصلاة</h2>
        <PrayerTimes />
      </section>

      <section aria-labelledby="portal-sunnah-h">
        <h2 id="portal-sunnah-h" className="sr-only">سنة الوقت الحالي</h2>
        <CurrentTimeSunnah />
      </section>

      <section aria-labelledby="portal-weather-h">
        <h2 id="portal-weather-h" className="sr-only">الطقس</h2>
        <WeatherWidget />
      </section>

      <section aria-labelledby="portal-ummah-h">
        <h2 id="portal-ummah-h" className="sr-only">بوصلة القبلة ومواقيت الصلاة حول العالم</h2>
        <UmmahPulse />
      </section>

      <nav aria-label="تفاصيل اليوم" className="flex flex-wrap gap-2">
        {DEEP_LINKS.map(({ path, label, icon: Icon }) => (
          <Link
            key={path}
            to={path}
            className="flex h-11 items-center gap-2 rounded-md border border-border bg-card/40 px-3 text-meta font-medium text-foreground backdrop-blur-sm transition-[transform,background-color] duration-normal ease-out-expo hover:-translate-y-0.5 hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            <Icon className="h-4 w-4 text-muted-foreground" aria-hidden />
            {label}
            <ChevronLeft className="h-3.5 w-3.5 text-muted-foreground rtl:rotate-180" aria-hidden />
          </Link>
        ))}
      </nav>
    </div>
  );
}
