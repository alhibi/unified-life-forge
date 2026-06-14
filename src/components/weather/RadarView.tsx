/**
 * RadarView — minimalist precipitation radar surface for the Weather
 * hub. We don't ship a full tile-based map (no Leaflet/Mapbox in the
 * bundle), so this view distills the existing hourly Open-Meteo data
 * into the two questions the reference radar UX answers:
 *
 *   1. Is it going to rain near me in the next few hours? (timeline)
 *   2. How heavy will it get, and when?  (mini ribbon viz)
 *
 * The result is a vertical timeline of the next 12 hours with a
 * mini precipitation bar per row — readable at a glance, no
 * external map dependency, fully bilingual + RTL-safe.
 */
import { useMemo } from 'react';
import { CloudRain, MapPin } from '@/lib/icons';
import type { WeatherData } from '@/lib/weather/types';

interface Row {
  time: number;
  hour: number;
  pop: number;       // probability of precip %
  mm: number;        // expected precipitation mm
}

function fmtHour(ms: number, isAr: boolean): string {
  return new Intl.DateTimeFormat(isAr ? 'ar' : 'en', {
    hour: '2-digit', minute: '2-digit', hour12: false, numberingSystem: 'latn',
  }).format(new Date(ms));
}

export default function RadarView({ data, isAr }: { data: WeatherData; isAr: boolean }) {
  const rows: Row[] = useMemo(() => {
    const now = Date.now();
    return data.hourly
      .filter(h => h.time >= now && h.time <= now + 12 * 60 * 60_000)
      .slice(0, 12)
      .map(h => ({
        time: h.time,
        hour: h.hour,
        pop: h.precipitationProbability ?? 0,
        mm:  h.precipitation ?? 0,
      }));
  }, [data]);

  const maxMm = Math.max(0.5, ...rows.map(r => r.mm));
  const totalMm = rows.reduce((s, r) => s + r.mm, 0);
  const peakHour = rows.reduce<Row | null>((best, r) => (r.pop > (best?.pop ?? -1) ? r : best), null);

  return (
    <section className="pt-1 space-y-4">
      {/* Header — mirrors the Forecast header for visual continuity. */}
      <header className="pt-2 pb-1">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-sky-400/15 border border-sky-300/20 inline-flex items-center justify-center shrink-0">
            <CloudRain className="w-5 h-5 text-sky-200" />
          </div>
          <div className="flex-1 min-w-0">
            <h1 className="text-[28px] font-semibold text-foreground leading-tight tracking-tight">
              {isAr ? 'الرادار' : 'Radar'}
            </h1>
            <p className="text-[14px] text-primary truncate inline-flex items-center gap-1">
              <MapPin className="w-3.5 h-3.5" />
              {data.city || (isAr ? 'موقعك' : 'Your location')}
            </p>
          </div>
        </div>
      </header>

      {/* Summary banner */}
      <div
        className="rounded-3xl border border-border/40 bg-card/80
                   shadow-[inset_0_1px_0_hsl(0_0%_100%/0.04),inset_0_-1px_0_hsl(0_0%_0%/0.4)]
                   px-4 py-4"
      >
        <p className="text-[15px] font-semibold text-foreground leading-tight">
          {totalMm < 0.5
            ? (isAr ? 'لا أمطار خلال 12 ساعة القادمة' : 'No rain in the next 12 hours')
            : (isAr
                ? `${totalMm.toFixed(totalMm < 10 ? 1 : 0)} مم متوقّعة خلال 12 ساعة`
                : `${totalMm.toFixed(totalMm < 10 ? 1 : 0)} mm expected over 12 h`)}
        </p>
        {peakHour && peakHour.pop >= 20 && (
          <p className="text-[12px] text-muted-foreground mt-1">
            {isAr
              ? `الذروة قرب ${fmtHour(peakHour.time, isAr)} (${peakHour.pop}٪)`
              : `Peak around ${fmtHour(peakHour.time, isAr)} (${peakHour.pop}%)`}
          </p>
        )}
      </div>

      {/* Hourly timeline */}
      <div
        className="rounded-3xl border border-border/40 bg-card/60
                   shadow-[inset_0_1px_0_hsl(0_0%_100%/0.04),inset_0_-1px_0_hsl(0_0%_0%/0.4)]
                   p-3"
      >
        <ul className="space-y-1.5">
          {rows.map(r => {
            const intensity = Math.max(0.04, Math.min(1, r.mm / maxMm));
            return (
              <li key={r.time} className="flex items-center gap-3 px-2 py-2 rounded-2xl">
                <span className="text-[12px] font-medium text-foreground/85 tabular-nums w-12 shrink-0" dir="ltr">
                  {fmtHour(r.time, isAr)}
                </span>
                <div className="flex-1 h-2 rounded-full bg-foreground/[0.05] overflow-hidden">
                  <div
                    className="h-full rounded-full"
                    style={{
                      width: `${intensity * 100}%`,
                      background: r.mm > 0
                        ? 'linear-gradient(90deg, hsl(200 90% 60% / 0.85), hsl(220 90% 55% / 0.95))'
                        : 'hsl(var(--muted) / 0.4)',
                    }}
                  />
                </div>
                <span className={`text-[11.5px] font-semibold tabular-nums w-10 text-end shrink-0 ${r.pop >= 50 ? 'text-sky-300' : 'text-muted-foreground'}`}>
                  {r.pop}%
                </span>
              </li>
            );
          })}
        </ul>
      </div>

      <p className="text-[10.5px] text-muted-foreground/70 text-center px-4 leading-relaxed">
        {isAr
          ? 'يستند الرادار إلى توقّعات Open-Meteo الساعية. خريطة بثّ حيّ قريباً.'
          : 'Radar based on Open-Meteo hourly forecasts. Live map view coming soon.'}
      </p>
    </section>
  );
}