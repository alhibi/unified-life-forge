import { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';

import { useWeatherData } from '@/features/weather/hooks/useWeatherData';
// One WMO code vocabulary for the whole app — see features/weather/lib/conditions.
import { iconForWeatherCode, labelForWeatherCode } from '@/features/weather/lib/conditions';
import { ChevronLeft, Droplets, Gauge, Sun, Thermometer, Wind as WindIcon } from '@/lib/icons';

const HOURS_AHEAD = 8;

/**
 * WeatherWidget — the launcher's "now + next" weather plate.
 *
 * Layout is intentionally two-tier: a headline row (temperature, condition,
 * high/low) over a compact metric rail, then an hourly rail for the next
 * `HOURS_AHEAD` hours. The hourly row plots each temperature on a normalised
 * vertical track so the shape of the next few hours reads at a glance without
 * drawing a chart — the full charts live at /weather.
 */
export default function WeatherWidget() {
  const navigate = useNavigate();
  const { data } = useWeatherData('ar');

  const hours = useMemo(() => {
    if (!data) return [];
    const now = Date.now();
    const upcoming = data.hourly.filter((h) => h.time >= now - 30 * 60 * 1000).slice(0, HOURS_AHEAD);
    if (upcoming.length === 0) return [];
    const temps = upcoming.map((h) => h.temperature);
    const min = Math.min(...temps);
    const max = Math.max(...temps);
    const span = max - min || 1;
    return upcoming.map((h, i) => ({
      ...h,
      // 0 = coldest hour in the window, 1 = warmest.
      level: (h.temperature - min) / span,
      isNow: i === 0,
    }));
  }, [data]);

  if (!data) {
    return (
      <div
        className="w-full rounded-2xl border border-border/60 bg-card animate-pulse"
        style={{ minHeight: 168 }}
        aria-label="جارٍ تحميل الطقس"
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
      className="w-full overflow-hidden rounded-2xl border border-border/60 bg-card text-start surface-depth-pressable active:scale-[0.99]"
      aria-label="فتح تفاصيل الطقس"
    >
      {/* Headline */}
      <div className="flex items-start gap-3 px-3.5 pt-3">
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-primary/20 bg-primary/10">
          <Icon className="h-5 w-5 text-primary" strokeWidth={1.5} />
        </span>

        <span className="min-w-0 flex-1">
          <span className="flex items-baseline gap-2">
            <span
              className="text-hero font-extralight leading-none tracking-tight text-foreground tabular-nums"
              dir="ltr"
            >
              {temp}°
            </span>
            <span className="truncate text-mini text-muted-foreground">{cond}</span>
          </span>
          <span className="mt-1 flex items-center gap-2 text-micro text-muted-foreground tabular-nums" dir="ltr">
            <span>H {hi}°</span>
            <span className="opacity-40">·</span>
            <span>L {lo}°</span>
            <span className="opacity-40">·</span>
            <span className="flex items-center gap-1">
              <Thermometer className="h-3 w-3 text-primary" aria-hidden />
              {apparent}°
            </span>
          </span>
        </span>

        <ChevronLeft className="mt-1 h-4 w-4 shrink-0 text-muted-foreground rtl:rotate-180" aria-hidden />
      </div>

      {/* Metric rail */}
      <div className="mt-3 grid grid-cols-4 divide-x divide-border/50 border-y border-border/50 rtl:divide-x-reverse">
        <Metric icon={Droplets} label="الرطوبة" value={`${Math.round(current.humidity)}%`} />
        <Metric icon={WindIcon} label="الريح" value={`${Math.round(current.windSpeed)}`} unit="كم/س" />
        <Metric icon={Sun} label="الأشعة" value={`${Math.round(current.uvIndex)}`} />
        <Metric icon={Gauge} label="الضغط" value={`${Math.round(current.pressure)}`} unit="hPa" />
      </div>

      {/* Hourly rail */}
      {hours.length > 1 && (
        <div className="flex justify-between gap-1 px-2.5 py-2.5" dir="ltr">
          {hours.map((h) => {
            const HourIcon = iconForWeatherCode(h.weatherCode, h.isDay);
            return (
              <span key={h.time} className="flex min-w-0 flex-1 flex-col items-center gap-1">
                <span
                  className={`text-micro tabular-nums ${h.isNow ? 'font-semibold text-foreground' : 'text-muted-foreground'}`}
                >
                  {Math.round(h.temperature)}°
                </span>
                {/* Normalised temperature track: dot height encodes the hour's
                    warmth relative to the window. */}
                <span className="relative h-7 w-full">
                  <span className="absolute inset-x-0 top-1/2 h-px -translate-y-1/2 bg-border/50" aria-hidden />
                  <span
                    className={`absolute left-1/2 h-1.5 w-1.5 -translate-x-1/2 -translate-y-1/2 rounded-full ${
                      h.isNow ? 'bg-primary ring-2 ring-primary/25' : 'bg-primary/60'
                    }`}
                    style={{ top: `${(1 - h.level) * 80 + 10}%` }}
                    aria-hidden
                  />
                </span>
                <HourIcon className="h-3.5 w-3.5 text-muted-foreground" strokeWidth={1.5} aria-hidden />
                <span className="text-micro tabular-nums text-muted-foreground/80">
                  {h.precipitationProbability >= 10 ? `${h.precipitationProbability}%` : '—'}
                </span>
                <span
                  className={`text-micro tabular-nums ${h.isNow ? 'font-semibold text-foreground' : 'text-muted-foreground'}`}
                >
                  {h.isNow ? 'الآن' : String(h.hour).padStart(2, '0')}
                </span>
              </span>
            );
          })}
        </div>
      )}
    </button>
  );
}

function Metric({
  icon: Icon,
  label,
  value,
  unit,
}: {
  icon: typeof Droplets;
  label: string;
  value: string;
  unit?: string;
}) {
  return (
    <span className="flex flex-col items-center gap-0.5 py-2">
      <span className="flex items-center gap-1 text-micro text-muted-foreground">
        <Icon className="h-3 w-3 text-primary" aria-hidden />
        {label}
      </span>
      <span className="text-mini font-semibold tabular-nums text-foreground" dir="ltr">
        {value}
        {unit && <span className="ms-0.5 text-micro font-normal text-muted-foreground">{unit}</span>}
      </span>
    </span>
  );
}
