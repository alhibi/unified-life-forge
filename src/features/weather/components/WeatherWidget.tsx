import { useNavigate } from 'react-router-dom';

import { useWeatherData } from '@/features/weather/hooks/useWeatherData';
// One WMO code vocabulary for the whole app — see features/weather/lib/conditions.
import { iconForWeatherCode, labelForWeatherCode } from '@/features/weather/lib/conditions';
import { ChevronLeft, Droplets, Wind as WindIcon } from '@/lib/icons';

/**
 * WeatherWidget — compact one-line "now" strip on the launcher. The full
 * dashboard lives at /weather; this only carries temperature, condition and two
 * secondary readings so the first screen stays light.
 */
export default function WeatherWidget() {
  const navigate = useNavigate();
  const { data } = useWeatherData('ar');

  if (!data) {
    return (
      <div
        className="w-full rounded-2xl border border-border/60 bg-card animate-pulse"
        style={{ minHeight: 62 }}
        aria-label={'جارٍ تحميل الطقس'}
      />
    );
  }

  const { current } = data;
  const Icon = iconForWeatherCode(current.weatherCode, current.isDay);
  const temp = Math.round(current.temperature);
  const apparent = Math.round(current.apparentTemperature);
  const hi = Math.round(data.daily[0]?.tempMax ?? temp);
  const lo = Math.round(data.daily[0]?.tempMin ?? temp);
  const cond = labelForWeatherCode(current.weatherCode);

  return (
    <button
      onClick={() => navigate('/weather')}
      dir="rtl"
      className="w-full text-start rounded-2xl border border-border/60 bg-card overflow-hidden surface-depth-pressable active:scale-[0.98]"
      aria-label={'فتح تفاصيل الطقس'}
    >
      <div className="flex items-center gap-3 px-3.5 py-2.5">
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-primary/10">
          <Icon className="h-4 w-4 text-primary" strokeWidth={1.55} />
        </span>

        <span className="flex min-w-0 items-baseline gap-2">
          <span
            className="text-hero font-extralight leading-none tracking-tight text-foreground tabular-nums"
            dir="ltr"
          >
            {temp}°
          </span>
          <span className="truncate text-mini text-muted-foreground">{cond}</span>
        </span>

        <span className="ms-auto flex shrink-0 items-center gap-2.5 text-micro text-muted-foreground tabular-nums">
          <span className="flex items-center gap-1" dir="ltr">
            <Droplets className="h-3 w-3 text-primary" />
            {Math.round(current.humidity)}%
          </span>
          <span className="flex items-center gap-1" dir="ltr">
            <WindIcon className="h-3 w-3 text-primary" />
            {Math.round(current.windSpeed)}
          </span>
          <span className="hidden sm:inline" dir="ltr">
            {apparent}° · H {hi}° L {lo}°
          </span>
          <ChevronLeft className="h-4 w-4 rtl:rotate-180" />
        </span>
      </div>
    </button>
  );
}
