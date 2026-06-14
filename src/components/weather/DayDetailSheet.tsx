/**
 * DayDetailSheet — full-screen overlay that opens when the user taps
 * a capsule in the 7-day forecast row. Matches the reference design:
 *
 *   • Back / share top bar.
 *   • Big day label + city subhead.
 *   • Centered toggle pill: Weather | Sun & Moon.
 *   • Weather view: condition card (icon + Max/Min temps), Summary
 *     paragraph with a "For You" badge, Conditions grid (UV, Clouds,
 *     Humidity, Pressure, Dew point), Precipitation + Wind blocks.
 *   • Sun & Moon view: reuses SunriseSunsetList / MoonPhasesList
 *     restricted to the selected day so the same drilldown surface
 *     stays consistent.
 */
import { useMemo, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ArrowLeft, Share2, Sparkles, Sun, CloudSun, Cloud, CloudFog, CloudRain,
  CloudDrizzle, CloudSnow, CloudLightning, CloudHail, MoonStar, Droplets,
  Droplet, Wind, Flag, Gauge, Navigation, Sparkle, type LucideIcon,
} from '@/lib/icons';
import type { DailyEntry, WeatherData } from '@/lib/weather/types';
import { describeWeatherCode } from '@/lib/weather/describe';
import { SunriseSunsetList, MoonPhasesList } from './SunMoonExpanded';

// ── Helpers ──────────────────────────────────────────────────────────────

const localeFor = (isAr: boolean) => (isAr ? 'ar' : 'en-US');

function dayHeading(d: DailyEntry, isAr: boolean): string {
  const dt = new Date(d.date);
  const weekday = new Intl.DateTimeFormat(localeFor(isAr), { weekday: 'long', timeZone: 'UTC' }).format(dt);
  const dom = new Intl.DateTimeFormat('en', { day: 'numeric', timeZone: 'UTC' }).format(dt);
  const month = new Intl.DateTimeFormat(localeFor(isAr), { month: 'short', timeZone: 'UTC' }).format(dt);
  if (isAr) return `${weekday}، ${dom} ${month}`;
  const ord = (n: number) => {
    const s = ['th','st','nd','rd'], v = n % 100;
    return s[(v - 20) % 10] || s[v] || s[0];
  };
  const n = parseInt(dom, 10);
  return `${weekday}, ${dom}${ord(n)} ${month}`;
}

const ICON_BY_CODE = (code: number, isDay = true): LucideIcon => {
  if (code === 0)                 return isDay ? Sun : MoonStar;
  if (code === 1 || code === 2)   return isDay ? CloudSun : MoonStar;
  if (code === 3)                 return Cloud;
  if (code === 45 || code === 48) return CloudFog;
  if (code >= 51 && code <= 57)   return CloudDrizzle;
  if (code >= 61 && code <= 67)   return CloudRain;
  if (code >= 71 && code <= 77)   return CloudSnow;
  if (code >= 80 && code <= 82)   return CloudRain;
  if (code >= 85 && code <= 86)   return CloudSnow;
  if (code === 96 || code === 99) return CloudHail;
  if (code >= 95)                 return CloudLightning;
  return Sun;
};

function compassDir(deg: number, isAr: boolean): string {
  const names = isAr
    ? ['شمال', 'شمال شرق', 'شرق', 'جنوب شرق', 'جنوب', 'جنوب غرب', 'غرب', 'شمال غرب']
    : ['North', 'Northeast', 'East', 'Southeast', 'South', 'Southwest', 'West', 'Northwest'];
  return names[Math.round((((deg % 360) + 360) % 360) / 45) % 8];
}

/** Magnus formula → dew point °C from temperature + RH. */
function dewPoint(tC: number, rh: number): number {
  if (!Number.isFinite(tC) || !Number.isFinite(rh) || rh <= 0) return tC;
  const a = 17.625, b = 243.04;
  const alpha = Math.log(rh / 100) + (a * tC) / (b + tC);
  return (b * alpha) / (a - alpha);
}

/** Short, neutral paragraph summarizing the day. */
function summaryFor(d: DailyEntry, isAr: boolean): string {
  const cond = describeWeatherCode(d.weatherCode, isAr ? 'ar' : 'de');
  const max = Math.round(d.tempMax), min = Math.round(d.tempMin);
  const pop = Math.round(d.precipitationProbabilityMax ?? 0);
  const wind = Math.round(d.windSpeedMax ?? 0);
  const uv = (d.uvIndexMax ?? 0).toFixed(1);
  if (isAr) {
    const rainBit = pop >= 50 ? ` احتمال هطول ${pop}٪.` : pop >= 20 ? ` احتمال ضعيف للهطول ${pop}٪.` : '';
    return `${cond} على مدار اليوم، تتراوح الحرارة بين ${min}° و${max}°.${rainBit} رياح تصل إلى ${wind} كم/س، ومؤشر UV الأعلى ${uv}.`;
  }
  const rainBit = pop >= 50 ? ` Niederschlagswahrscheinlichkeit ${pop}%.` : pop >= 20 ? ` Geringe Regenwahrscheinlichkeit ${pop}%.` : '';
  return `${cond}, Temperaturen zwischen ${min}° und ${max}°.${rainBit} Wind bis ${wind} km/h, höchster UV-Index ${uv}.`;
}

// ── Tiny presentational atoms ────────────────────────────────────────────

function MetricCell({
  Icon, label, value, accent, iconBg,
}: {
  Icon: LucideIcon; label: string; value: string;
  accent?: string; iconBg?: string;
}) {
  return (
    <div className="flex items-center gap-3">
      <span
        className={`w-9 h-9 rounded-full inline-flex items-center justify-center shrink-0 ${iconBg ?? 'bg-foreground/[0.06] border border-border/30'}`}
      >
        <Icon className={`w-[18px] h-[18px] ${accent ?? 'text-foreground/75'}`} strokeWidth={1.8} />
      </span>
      <div className="min-w-0">
        <p className="text-[12px] text-muted-foreground leading-tight">{label}</p>
        <p className={`text-[15px] font-semibold leading-tight mt-0.5 tabular-nums ${accent ?? 'text-foreground'}`}>
          {value}
        </p>
      </div>
    </div>
  );
}

function BlockCard({ children }: { children: React.ReactNode }) {
  return (
    <div
      className="rounded-3xl border border-border/40 bg-card/80
                 shadow-[inset_0_1px_0_hsl(0_0%_100%/0.04),inset_0_-1px_0_hsl(0_0%_0%/0.4)]
                 px-4 py-4"
    >
      {children}
    </div>
  );
}

// ── Weather body ─────────────────────────────────────────────────────────

function WeatherBody({ day, isAr }: { day: DailyEntry; isAr: boolean }) {
  const Icon = ICON_BY_CODE(day.weatherCode, true);
  const condition = describeWeatherCode(day.weatherCode, isAr ? 'ar' : 'de');
  const uv = day.uvIndexMax ?? 0;
  const uvAccent = uv >= 8 ? 'text-red-400' : uv >= 6 ? 'text-orange-400' : uv >= 3 ? 'text-amber-300' : 'text-emerald-300';
  const uvBg = uv >= 6 ? 'bg-orange-500/15 border border-orange-400/30' : 'bg-foreground/[0.06] border border-border/30';

  const cloudAvg = Math.round(day.cloudCoverMean ?? 0);
  const humid = Math.round(day.humidityMax ?? 0);
  // Open-Meteo daily doesn't expose pressure — use a flat "—" rather than
  // fake values. Caller fills with current pressure for today; deeper
  // historical/future days simply show a dash.
  const dew = humid > 0 ? Math.round(dewPoint((day.tempMax + day.tempMin) / 2, humid)) : null;
  const pop = Math.round(day.precipitationProbabilityMax ?? 0);
  const rain = (day.precipitationSum ?? 0);
  const wind = Math.round(day.windSpeedMax ?? 0);
  const gust = Math.round(day.windGustsMax ?? 0);
  const dir = compassDir(day.windDirectionDominant ?? 0, isAr);

  return (
    <div className="space-y-4">
      {/* Condition card — big icon + max/min */}
      <BlockCard>
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <span className="relative">
              <Icon className="w-12 h-12 text-foreground/85" strokeWidth={1.6} />
              {uv >= 6 && (
                <span className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-orange-500/95 inline-flex items-center justify-center" aria-hidden>
                  <Sun className="w-3 h-3 text-neutral-900" strokeWidth={2.2} />
                </span>
              )}
            </span>
            <p className="text-[15px] font-medium text-foreground/90 leading-tight truncate">
              {condition}
            </p>
          </div>
          <div className="flex items-end gap-3 shrink-0">
            <div className="text-right">
              <p className="text-[28px] font-bold text-red-500 leading-none tabular-nums">{Math.round(day.tempMax)}°</p>
              <p className="text-[11px] text-muted-foreground mt-1">{isAr ? 'الأعلى' : 'Max'}</p>
            </div>
            <div className="text-right">
              <p className="text-[28px] font-bold text-foreground leading-none tabular-nums">{Math.round(day.tempMin)}°</p>
              <p className="text-[11px] text-muted-foreground mt-1">{isAr ? 'الأدنى' : 'Min'}</p>
            </div>
          </div>
        </div>
      </BlockCard>

      {/* Summary — "For You" pill on the start side */}
      <BlockCard>
        <div className="flex items-center justify-between mb-2">
          <h3 className="inline-flex items-center gap-2 text-[14px] font-semibold text-foreground">
            <Sparkle className="w-4 h-4 text-foreground/70" />
            {isAr ? 'الملخّص' : 'Summary'}
          </h3>
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-violet-400/15 text-violet-200 text-[10.5px] font-semibold">
            <Sparkles className="w-3 h-3" />
            {isAr ? 'لك' : 'For You'}
          </span>
        </div>
        <p className="text-[13px] text-foreground/85 leading-relaxed">
          {summaryFor(day, isAr)}
        </p>
      </BlockCard>

      {/* Conditions section */}
      <div>
        <h2 className="text-[20px] font-semibold text-foreground mb-3 pt-1">
          {isAr ? 'الحالة' : 'Conditions'}
        </h2>
        <BlockCard>
          <div className="grid grid-cols-2 gap-y-4 gap-x-3">
            <MetricCell
              Icon={Sun}
              label={isAr ? 'مؤشر UV' : 'UV index'}
              value={uv.toFixed(1)}
              accent={uvAccent}
              iconBg={uvBg}
            />
            <MetricCell
              Icon={Cloud}
              label={isAr ? 'الغيوم' : 'Clouds'}
              value={`${cloudAvg}%`}
            />
            <MetricCell
              Icon={Droplets}
              label={isAr ? 'الرطوبة' : 'Humidity'}
              value={humid > 0 ? `${humid}%` : '—'}
            />
            <MetricCell
              Icon={Gauge}
              label={isAr ? 'الضغط' : 'Pressure'}
              value={day.date && (day as { pressure?: number }).pressure
                ? `${Math.round((day as { pressure?: number }).pressure!)} hPa`
                : '—'}
            />
            <MetricCell
              Icon={Sparkle}
              label={isAr ? 'نقطة الندى' : 'Dew point'}
              value={dew != null ? `${dew}°` : '—'}
            />
          </div>
        </BlockCard>
      </div>

      {/* Precipitation */}
      <BlockCard>
        <div className="grid grid-cols-2 gap-y-4 gap-x-3">
          <MetricCell
            Icon={Droplet}
            label={isAr ? 'الهطول' : 'Precipitation'}
            value={`${pop}%`}
            accent="text-sky-300"
            iconBg="bg-sky-400/15 border border-sky-400/30"
          />
          <MetricCell
            Icon={Droplet}
            label={isAr ? 'حجم المطر' : 'Rain volume'}
            value={`${rain.toFixed(rain < 10 ? 1 : 0)} mm`}
          />
        </div>
      </BlockCard>

      {/* Wind */}
      <BlockCard>
        <div className="grid grid-cols-2 gap-y-4 gap-x-3">
          <MetricCell
            Icon={Wind}
            label={isAr ? 'الرياح' : 'Wind'}
            value={`${wind} km/h`}
          />
          <MetricCell
            Icon={Flag}
            label={isAr ? 'الهبّات' : 'Gusts'}
            value={`${gust} km/h`}
          />
          <MetricCell
            Icon={Navigation}
            label={isAr ? 'اتجاه الرياح' : 'Wind direction'}
            value={dir}
          />
        </div>
      </BlockCard>
    </div>
  );
}

// ── Sheet ────────────────────────────────────────────────────────────────

type ViewKind = 'weather' | 'sunmoon';

export default function DayDetailSheet({
  open, onClose, data, dayIndex, isAr,
}: {
  open: boolean;
  onClose: () => void;
  data: WeatherData;
  dayIndex: number;
  isAr: boolean;
}) {
  const [view, setView] = useState<ViewKind>('weather');
  const day = data.daily[dayIndex];
  const sunMoonDays = useMemo(
    () => (day ? [day] : []),
    [day],
  );

  return (
    <AnimatePresence>
      {open && day && (
        <motion.div
          key="day-detail"
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 8, transition: { duration: 0.18 } }}
          transition={{ duration: 0.32, ease: [0.16, 1, 0.3, 1] }}
          className="fixed inset-0 z-[60] bg-background overflow-y-auto"
          role="dialog"
          aria-modal="true"
        >
          <div className="max-w-lg mx-auto px-4 pb-24">
            {/* Top bar */}
            <header className="pt-3 pb-2 flex items-center justify-between">
              <button
                type="button"
                onClick={onClose}
                aria-label={isAr ? 'رجوع' : 'Back'}
                className="w-9 h-9 -ms-1 inline-flex items-center justify-center text-foreground/80 active:scale-95 transition-transform"
              >
                <ArrowLeft className="w-5 h-5 rtl:rotate-180" />
              </button>
              <button
                type="button"
                aria-label={isAr ? 'مشاركة' : 'Share'}
                className="w-9 h-9 -me-1 inline-flex items-center justify-center text-foreground/80 active:scale-95 transition-transform"
              >
                <Share2 className="w-[18px] h-[18px]" />
              </button>
            </header>

            {/* Title */}
            <h1 className="text-[28px] font-semibold text-foreground leading-tight tracking-tight">
              {dayHeading(day, isAr)}
            </h1>
            <p className="text-[14px] text-primary truncate mt-0.5 inline-flex items-center gap-1">
              <span className="inline-block w-3.5 h-3.5">
                {/* tiny pin glyph — kept inline to match the city subhead exactly */}
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
                     strokeLinecap="round" strokeLinejoin="round" className="w-3.5 h-3.5">
                  <path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 1 1 16 0z" />
                  <circle cx="12" cy="10" r="3" />
                </svg>
              </span>
              {data.city || (isAr ? 'موقعك' : 'Your location')}
            </p>

            {/* Toggle pill */}
            <div className="flex justify-center mt-4 mb-4">
              <div className="inline-flex p-1 rounded-full border border-border/45 bg-foreground/[0.04]">
                {(['weather', 'sunmoon'] as const).map((k) => {
                  const active = view === k;
                  return (
                    <button
                      key={k}
                      type="button"
                      onClick={() => setView(k)}
                      className={`px-4 h-9 rounded-full text-[13px] font-semibold transition-colors ${
                        active
                          ? 'bg-indigo-400/20 text-foreground border border-indigo-300/30'
                          : 'text-muted-foreground'
                      }`}
                    >
                      {k === 'weather'
                        ? (isAr ? 'الطقس' : 'Weather')
                        : (isAr ? 'الشمس والقمر' : 'Sun & Moon')}
                    </button>
                  );
                })}
              </div>
            </div>

            {view === 'weather' ? (
              <WeatherBody day={day} isAr={isAr} />
            ) : (
              <div className="space-y-4">
                <h2 className="text-[18px] font-semibold text-foreground">
                  {isAr ? 'الشروق والغروب' : 'Sunrise & Sunset'}
                </h2>
                <SunriseSunsetList daily={sunMoonDays} isAr={isAr} />
                <h2 className="text-[18px] font-semibold text-foreground pt-2">
                  {isAr ? 'أطوار القمر' : 'Moon Phases'}
                </h2>
                <MoonPhasesList daily={sunMoonDays} isAr={isAr} />
              </div>
            )}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}