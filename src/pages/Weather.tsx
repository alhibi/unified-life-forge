import React, { useMemo } from 'react';
import {
  Cloud, Sun, CloudRain, CloudSnow, CloudLightning, CloudDrizzle, Cloudy, CloudFog, MoonStar,
  Droplets, Wind, Gauge, Eye, ThermometerSun, Sunrise, Sunset, Compass,
  RefreshCw, MapPin, AlertCircle, CloudOff, Activity, CloudHail,
} from 'lucide-react';
import SEO from '@/components/SEO';
import PageHeader from '@/components/PageHeader';
import { useApp } from '@/contexts/AppContext';
import { useDeviceLocation, requestDeviceLocation } from '@/hooks/useDeviceLocation';
import { useWeatherData, type DailyEntry, type HourlyEntry, type WeatherData } from '@/hooks/useWeatherData';

/**
 * /weather — comprehensive weather hub.
 *
 * The home page already shows a tiny inline `WeatherWidget` (current temp +
 * 12h scroll). That widget is intentionally narrow because it lives in a
 * dense grid alongside prayer times, occasions, and Ummah pulse.
 *
 * This hub is the inverse: a full destination accessible from the bottom
 * nav that surfaces every dimension Open-Meteo exposes — hourly &
 * 7-day forecasts, sun timings, wind, UV, humidity, pressure, visibility,
 * cloud cover, dew point, and air quality — laid out so the user can scan
 * the day at a glance and drill into any block.
 *
 * Design language:
 *   • Card → grid → list cadence matches the Wellness and Mihrab hubs so
 *     the visual style is consistent across the bottom-nav tabs.
 *   • Bilingual (ar/de) like the rest of the app, using the AppContext
 *     `language` flag rather than the `t()` table — each component renders
 *     long localized strings inline because translation keys would balloon
 *     the i18n JSON for a single page.
 *   • RTL is implicit (the app sets `dir` on the root). Anything we lay
 *     out horizontally that has a logical "before/after" direction (e.g.
 *     the daily range bar) is rendered with `dir="ltr"` so it always
 *     reads cold→hot left-to-right regardless of language.
 */

// ────────────────────────────────────────────────────────────────────────
// WMO weather code → presentation primitives
// ────────────────────────────────────────────────────────────────────────

const ICON_BY_CODE = (code: number, isDay: boolean) => {
  if (code === 0 || code === 1) return isDay ? Sun : MoonStar;
  if (code === 2)                return Cloudy;
  if (code === 3)                return Cloud;
  if (code === 45 || code === 48) return CloudFog;
  if (code >= 51 && code <= 57)  return CloudDrizzle;
  if (code >= 61 && code <= 67)  return CloudRain;
  if (code >= 71 && code <= 77)  return CloudSnow;
  if (code >= 80 && code <= 82)  return CloudRain;
  if (code >= 85 && code <= 86)  return CloudSnow;
  if (code === 96 || code === 99) return CloudHail;
  if (code >= 95)                return CloudLightning;
  return isDay ? Sun : MoonStar;
};

interface CodeLabel { ar: string; de: string; }
const CODE_LABELS: Record<number, CodeLabel> = {
  0:  { ar: 'صحو',                   de: 'Klar' },
  1:  { ar: 'صافٍ في الغالب',         de: 'Überwiegend klar' },
  2:  { ar: 'غائم جزئياً',            de: 'Teilweise bewölkt' },
  3:  { ar: 'غائم',                  de: 'Bewölkt' },
  45: { ar: 'ضباب',                 de: 'Nebel' },
  48: { ar: 'ضباب متجمّد',           de: 'Reifnebel' },
  51: { ar: 'رذاذ خفيف',             de: 'Leichter Sprühregen' },
  53: { ar: 'رذاذ متوسط',            de: 'Mäßiger Sprühregen' },
  55: { ar: 'رذاذ كثيف',             de: 'Starker Sprühregen' },
  56: { ar: 'رذاذ متجمّد خفيف',       de: 'Leichter gefrierender Sprühregen' },
  57: { ar: 'رذاذ متجمّد كثيف',       de: 'Starker gefrierender Sprühregen' },
  61: { ar: 'مطر خفيف',              de: 'Leichter Regen' },
  63: { ar: 'مطر متوسط',             de: 'Mäßiger Regen' },
  65: { ar: 'مطر غزير',              de: 'Starker Regen' },
  66: { ar: 'مطر متجمّد خفيف',        de: 'Leichter gefrierender Regen' },
  67: { ar: 'مطر متجمّد غزير',        de: 'Starker gefrierender Regen' },
  71: { ar: 'ثلج خفيف',              de: 'Leichter Schneefall' },
  73: { ar: 'ثلج متوسط',             de: 'Mäßiger Schneefall' },
  75: { ar: 'ثلج كثيف',              de: 'Starker Schneefall' },
  77: { ar: 'حبيبات ثلجية',          de: 'Schneegriesel' },
  80: { ar: 'زخات مطر خفيفة',        de: 'Leichte Regenschauer' },
  81: { ar: 'زخات مطر متوسطة',       de: 'Mäßige Regenschauer' },
  82: { ar: 'زخات مطر غزيرة',        de: 'Starke Regenschauer' },
  85: { ar: 'زخات ثلج خفيفة',        de: 'Leichte Schneeschauer' },
  86: { ar: 'زخات ثلج كثيفة',        de: 'Starke Schneeschauer' },
  95: { ar: 'عاصفة رعدية',           de: 'Gewitter' },
  96: { ar: 'عاصفة رعدية مع برَد خفيف', de: 'Gewitter mit leichtem Hagel' },
  99: { ar: 'عاصفة رعدية مع برَد غزير', de: 'Gewitter mit starkem Hagel' },
};

const labelFor = (code: number, lang: 'ar' | 'de') =>
  CODE_LABELS[code]?.[lang] ?? (lang === 'ar' ? 'غير معروف' : 'Unbekannt');

// ────────────────────────────────────────────────────────────────────────
// Formatting helpers
// ────────────────────────────────────────────────────────────────────────

const formatHour12 = (hour: number, lang: 'ar' | 'de') => {
  if (lang === 'de') return `${hour.toString().padStart(2, '0')}:00`;
  const period = hour < 12 ? 'ص' : 'م';
  const display = hour === 0 ? 12 : hour > 12 ? hour - 12 : hour;
  return `${display}${period}`;
};

const formatTimeFromIso = (iso: string, lang: 'ar' | 'de') => {
  // Open-Meteo returns ISO strings in the location's local time, no zone
  // suffix. Parse the H:M directly so we don't accidentally shift through
  // the device's timezone.
  const [, time] = iso.split('T');
  if (!time) return '';
  const [hStr, mStr] = time.split(':');
  const hour = parseInt(hStr, 10);
  if (lang === 'de') return `${hStr}:${mStr}`;
  const period = hour < 12 ? 'ص' : 'م';
  const display = hour === 0 ? 12 : hour > 12 ? hour - 12 : hour;
  return `${display}:${mStr}${period}`;
};

const dayLengthFromIsos = (sunrise: string, sunset: string, lang: 'ar' | 'de') => {
  const toMin = (iso: string) => {
    const [, time] = iso.split('T');
    const [h, m] = (time ?? '0:0').split(':').map(Number);
    return h * 60 + m;
  };
  const diff = Math.max(0, toMin(sunset) - toMin(sunrise));
  const h = Math.floor(diff / 60);
  const m = diff % 60;
  if (lang === 'de') return `${h} Std. ${m} Min.`;
  return `${h} س ${m} د`;
};

const dayName = (dateMs: number, lang: 'ar' | 'de', isToday: boolean) => {
  if (isToday) return lang === 'ar' ? 'اليوم' : 'Heute';
  const d = new Date(dateMs);
  const locale = lang === 'ar' ? 'ar' : 'de-DE';
  return new Intl.DateTimeFormat(locale, { weekday: 'short' }).format(d);
};

const dateLabel = (dateMs: number, lang: 'ar' | 'de') => {
  const d = new Date(dateMs);
  const locale = lang === 'ar' ? 'ar' : 'de-DE';
  return new Intl.DateTimeFormat(locale, { day: '2-digit', month: 'short' }).format(d);
};

const compassDir = (deg: number, lang: 'ar' | 'de') => {
  // 8-point compass, RTL-safe label set.
  const names = lang === 'ar'
    ? ['شمال', 'شمال شرق', 'شرق', 'جنوب شرق', 'جنوب', 'جنوب غرب', 'غرب', 'شمال غرب']
    : ['N', 'NO', 'O', 'SO', 'S', 'SW', 'W', 'NW'];
  return names[Math.round(((deg % 360) + 360) % 360 / 45) % 8];
};

interface UvLevel { ar: string; de: string; tone: string; }
const uvLevel = (uv: number): UvLevel => {
  if (uv < 3)  return { ar: 'منخفض',     de: 'Niedrig',    tone: 'text-emerald-400' };
  if (uv < 6)  return { ar: 'متوسط',     de: 'Mäßig',      tone: 'text-yellow-400'  };
  if (uv < 8)  return { ar: 'مرتفع',     de: 'Hoch',       tone: 'text-orange-400'  };
  if (uv < 11) return { ar: 'مرتفع جداً',  de: 'Sehr hoch',  tone: 'text-red-400'     };
  return         { ar: 'بالغ الخطورة',    de: 'Extrem',     tone: 'text-fuchsia-400' };
};

interface AqiLevel { ar: string; de: string; tone: string; bg: string; }
const aqiLevel = (aqi: number | null): AqiLevel | null => {
  if (aqi == null) return null;
  // European AQI bands (Open-Meteo): 0–20 good, 20–40 fair, 40–60
  // moderate, 60–80 poor, 80–100 very poor, >100 extremely poor.
  if (aqi < 20)  return { ar: 'جيّد جداً',     de: 'Sehr gut',          tone: 'text-emerald-400', bg: 'bg-emerald-500/10' };
  if (aqi < 40)  return { ar: 'جيّد',          de: 'Gut',               tone: 'text-lime-400',    bg: 'bg-lime-500/10'    };
  if (aqi < 60)  return { ar: 'متوسط',        de: 'Mäßig',             tone: 'text-yellow-400',  bg: 'bg-yellow-500/10'  };
  if (aqi < 80)  return { ar: 'سيّئ',          de: 'Schlecht',          tone: 'text-orange-400',  bg: 'bg-orange-500/10'  };
  if (aqi < 100) return { ar: 'سيّئ جداً',      de: 'Sehr schlecht',     tone: 'text-red-400',     bg: 'bg-red-500/10'     };
  return            { ar: 'خطير',          de: 'Extrem schlecht',   tone: 'text-fuchsia-400', bg: 'bg-fuchsia-500/10' };
};

// Colour gradient for the hero card driven by the WMO code & day/night.
// We pick from a curated palette rather than computing from hue so that
// dark/light theme contrast stays predictable.
const heroGradient = (code: number, isDay: boolean): string => {
  if (!isDay) return 'from-indigo-900/50 via-slate-900/40 to-slate-950/30';
  if (code === 0 || code === 1) return 'from-amber-400/35 via-orange-400/25 to-sky-400/20';
  if (code === 2)                return 'from-sky-400/30 via-sky-300/20 to-slate-200/10';
  if (code === 3)                return 'from-slate-400/30 via-slate-500/20 to-slate-700/15';
  if (code >= 45 && code <= 48)  return 'from-slate-300/30 via-slate-400/20 to-slate-600/15';
  if (code >= 51 && code <= 67)  return 'from-blue-500/35 via-sky-600/25 to-slate-800/15';
  if (code >= 71 && code <= 86)  return 'from-sky-200/40 via-sky-300/25 to-slate-300/15';
  if (code >= 95)                return 'from-violet-700/45 via-purple-800/30 to-slate-900/20';
  return 'from-sky-400/30 via-sky-500/20 to-slate-700/15';
};

// ────────────────────────────────────────────────────────────────────────
// Building blocks
// ────────────────────────────────────────────────────────────────────────

function HeroCard({ data, lang, city, onRefresh, isRefreshing }: {
  data: WeatherData; lang: 'ar' | 'de'; city: string | null;
  onRefresh: () => void; isRefreshing: boolean;
}) {
  const c = data.current;
  const today = data.daily[0];
  const Icon = ICON_BY_CODE(c.weatherCode, c.isDay);
  const grad = heroGradient(c.weatherCode, c.isDay);

  return (
    <div className={`relative overflow-hidden rounded-3xl border border-border/40 p-5 bg-gradient-to-br ${grad}`}>
      {/* Decorative blurred orb to give the hero some depth without
          loading a real image. */}
      <div
        aria-hidden
        className="absolute -top-12 -right-10 w-48 h-48 rounded-full bg-white/10 blur-3xl pointer-events-none"
      />
      <div className="relative">
        {/* Top row: location + refresh */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-1.5 min-w-0">
            <MapPin className="w-3.5 h-3.5 shrink-0 text-foreground/70" />
            <span className="text-[12px] font-medium text-foreground/85 truncate">
              {city || (lang === 'ar' ? 'موقعك الحالي' : 'Aktueller Standort')}
            </span>
          </div>
          <button
            type="button"
            onClick={onRefresh}
            aria-label={lang === 'ar' ? 'تحديث' : 'Aktualisieren'}
            className="inline-flex items-center justify-center w-8 h-8 rounded-lg bg-foreground/[0.06] text-foreground/75 hover:bg-foreground/[0.12] transition"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin' : ''}`} />
          </button>
        </div>

        {/* Big temp + icon */}
        <div className="flex items-end justify-between gap-4">
          <div className="min-w-0">
            <div className="text-[64px] font-bold tracking-tight leading-none text-foreground">
              {c.temperature}°
            </div>
            <div className="mt-1.5 text-[14px] font-medium text-foreground/90 truncate">
              {labelFor(c.weatherCode, lang)}
            </div>
            <div className="mt-0.5 text-[11.5px] text-foreground/70">
              {lang === 'ar' ? 'تشعر بـ' : 'Gefühlt'} {c.apparentTemperature}°
            </div>
          </div>
          <Icon className="w-20 h-20 stroke-[1.4] text-foreground/85 shrink-0" />
        </div>

        {/* High / Low for today */}
        {today && (
          <div className="mt-4 flex items-center gap-3 text-[12px] text-foreground/85">
            <span className="inline-flex items-center gap-1">
              <span className="text-foreground/55">{lang === 'ar' ? 'العظمى' : 'Höchst'}</span>
              <span className="font-semibold">{today.tempMax}°</span>
            </span>
            <span className="text-foreground/30">•</span>
            <span className="inline-flex items-center gap-1">
              <span className="text-foreground/55">{lang === 'ar' ? 'الصغرى' : 'Tiefst'}</span>
              <span className="font-semibold">{today.tempMin}°</span>
            </span>
          </div>
        )}
      </div>
    </div>
  );
}

function HourlyStrip({ hourly, lang }: { hourly: HourlyEntry[]; lang: 'ar' | 'de' }) {
  if (!hourly.length) return null;
  // Range used to draw the temperature curve markers.
  const min = Math.min(...hourly.map(h => h.temperature));
  const max = Math.max(...hourly.map(h => h.temperature));

  return (
    <section className="rounded-2xl bg-card border border-border/40 p-4">
      <h2 className="text-[13px] font-semibold text-foreground mb-3">
        {lang === 'ar' ? 'الـ 24 ساعة القادمة' : 'Nächste 24 Stunden'}
      </h2>
      <div className="overflow-x-auto no-scrollbar -mx-1" dir="ltr">
        <div className="flex items-stretch gap-2 px-1 min-w-fit">
          {hourly.map((h, i) => {
            const Icon = ICON_BY_CODE(h.weatherCode, h.isDay);
            const isNow = i === 0;
            // Normalised position (0..1) for a tiny inline indicator bar
            // under each hour — gives the curve a sense without a chart.
            const pct = max === min ? 0.5 : (h.temperature - min) / (max - min);
            const dotColor = isNow ? 'hsl(var(--primary))' : 'hsl(var(--muted-foreground) / 0.5)';
            return (
              <div
                key={h.time}
                className={`flex flex-col items-center gap-1.5 min-w-[44px] rounded-xl py-2 px-1 ${
                  isNow ? 'bg-primary/10' : ''
                }`}
              >
                <span className={`text-[10px] font-medium ${
                  isNow ? 'text-primary font-bold' : 'text-muted-foreground'
                }`}>
                  {isNow ? (lang === 'ar' ? 'الآن' : 'Jetzt') : formatHour12(h.hour, lang)}
                </span>
                <Icon className="w-4 h-4 stroke-[1.7] text-foreground/80" />
                {h.precipitationProbability > 10 && (
                  <span className="flex items-center gap-0.5 text-[9px] text-sky-400/90 leading-none">
                    <Droplets className="w-2.5 h-2.5" />
                    {h.precipitationProbability}%
                  </span>
                )}
                <span className={`text-[12px] font-semibold ${
                  isNow ? 'text-foreground' : 'text-foreground/85'
                }`}>
                  {h.temperature}°
                </span>
                {/* Range marker dot — 28px tall track with a dot at pct */}
                <div className="relative w-1 h-7 rounded-full bg-foreground/[0.06] mt-0.5">
                  <span
                    aria-hidden
                    className="absolute -translate-x-1/2 left-1/2 w-1.5 h-1.5 rounded-full"
                    style={{ bottom: `${pct * 100}%`, background: dotColor }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}

function DailyList({ daily, weekRange, lang }: {
  daily: DailyEntry[]; weekRange: { min: number; max: number }; lang: 'ar' | 'de';
}) {
  if (!daily.length) return null;
  const span = Math.max(1, weekRange.max - weekRange.min);

  return (
    <section className="rounded-2xl bg-card border border-border/40 p-4">
      <h2 className="text-[13px] font-semibold text-foreground mb-3">
        {lang === 'ar' ? 'الأيام السبعة القادمة' : 'Nächste 7 Tage'}
      </h2>
      <div className="space-y-1">
        {daily.map((d, i) => {
          const Icon = ICON_BY_CODE(d.weatherCode, true);
          const leftPct  = ((d.tempMin - weekRange.min) / span) * 100;
          const rightPct = ((d.tempMax - weekRange.min) / span) * 100;
          return (
            <div
              key={d.date}
              className="grid grid-cols-[64px_28px_1fr_72px] items-center gap-2 py-2 border-b border-border/20 last:border-b-0"
            >
              {/* Day name */}
              <div className="min-w-0">
                <div className="text-[12.5px] font-semibold text-foreground truncate">
                  {dayName(d.date, lang, i === 0)}
                </div>
                <div className="text-[10px] text-muted-foreground truncate">
                  {dateLabel(d.date, lang)}
                </div>
              </div>

              {/* Icon + precip prob below */}
              <div className="flex flex-col items-center gap-0.5">
                <Icon className="w-4 h-4 stroke-[1.7] text-foreground/80" />
                {d.precipitationProbabilityMax > 10 && (
                  <span className="text-[8.5px] text-sky-400/90 leading-none">
                    {d.precipitationProbabilityMax}%
                  </span>
                )}
              </div>

              {/* Range bar — always LTR so cold→hot flows the same way for
                  both Arabic and German. */}
              <div dir="ltr" className="relative h-1.5 rounded-full bg-foreground/[0.06] mx-1">
                <div
                  className="absolute h-full rounded-full"
                  style={{
                    left: `${leftPct}%`,
                    width: `${Math.max(2, rightPct - leftPct)}%`,
                    background: 'linear-gradient(90deg, #38bdf8 0%, #fbbf24 60%, #fb7185 100%)',
                  }}
                />
              </div>

              {/* Min / Max */}
              <div dir="ltr" className="text-right">
                <span className="text-[12px] text-muted-foreground">{d.tempMin}°</span>
                <span className="mx-1.5 text-foreground/30">·</span>
                <span className="text-[12.5px] font-semibold text-foreground">{d.tempMax}°</span>
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}

function MetricTile({
  icon: Icon, label, value, hint, accent,
}: {
  icon: typeof Wind;
  label: string;
  value: React.ReactNode;
  hint?: React.ReactNode;
  accent?: string;
}) {
  return (
    <div className="rounded-2xl bg-card border border-border/40 p-3.5">
      <div className="flex items-center gap-1.5 text-muted-foreground mb-2">
        <Icon className="w-3.5 h-3.5" />
        <span className="text-[10.5px] font-medium uppercase tracking-wide">{label}</span>
      </div>
      <div className={`text-[20px] font-bold leading-none ${accent ?? 'text-foreground'}`}>{value}</div>
      {hint && <div className="mt-1.5 text-[10.5px] text-muted-foreground leading-tight">{hint}</div>}
    </div>
  );
}

function DetailsGrid({ data, lang }: { data: WeatherData; lang: 'ar' | 'de' }) {
  const c = data.current;
  const uv = uvLevel(c.uvIndex);
  const rotateDeg = c.windDirection; // meteorological "from" — we point the
                                     // arrow IN that direction so it visually
                                     // shows where the wind is coming from.
  const pressureHint = c.pressure < 1000
    ? (lang === 'ar' ? 'منخفض جوي' : 'Tiefdruck')
    : c.pressure > 1020
    ? (lang === 'ar' ? 'مرتفع جوي' : 'Hochdruck')
    : (lang === 'ar' ? 'معتدل' : 'Normal');

  return (
    <section className="grid grid-cols-2 gap-2.5">
      {/* UV Index */}
      <MetricTile
        icon={ThermometerSun}
        label={lang === 'ar' ? 'الأشعة فوق البنفسجية' : 'UV-Index'}
        value={<span className={uv.tone}>{c.uvIndex}</span>}
        hint={uv[lang]}
      />

      {/* Humidity */}
      <MetricTile
        icon={Droplets}
        label={lang === 'ar' ? 'الرطوبة' : 'Luftfeuchte'}
        value={<>{c.humidity}<span className="text-[14px] text-muted-foreground">%</span></>}
        hint={
          c.humidity > 70 ? (lang === 'ar' ? 'مرتفعة' : 'Hoch')
          : c.humidity < 30 ? (lang === 'ar' ? 'منخفضة' : 'Niedrig')
          : (lang === 'ar' ? 'مريحة' : 'Angenehm')
        }
      />

      {/* Wind — with directional compass */}
      <div className="rounded-2xl bg-card border border-border/40 p-3.5">
        <div className="flex items-center gap-1.5 text-muted-foreground mb-2">
          <Wind className="w-3.5 h-3.5" />
          <span className="text-[10.5px] font-medium uppercase tracking-wide">
            {lang === 'ar' ? 'الرياح' : 'Wind'}
          </span>
        </div>
        <div className="flex items-center gap-2.5">
          <div
            className="relative w-9 h-9 rounded-full bg-foreground/[0.05] border border-border/40 shrink-0"
            aria-hidden
          >
            <Compass className="absolute inset-0 m-auto w-3.5 h-3.5 text-muted-foreground/40" />
            <div
              className="absolute inset-0 flex items-center justify-center"
              style={{ transform: `rotate(${rotateDeg}deg)` }}
            >
              <div className="w-0.5 h-3 rounded-full bg-primary -translate-y-1.5" />
            </div>
          </div>
          <div className="min-w-0">
            <div dir="ltr" className="text-[18px] font-bold leading-none text-foreground">
              {c.windSpeed}
              <span className="text-[11px] text-muted-foreground ms-1">km/h</span>
            </div>
            <div className="mt-1 text-[10.5px] text-muted-foreground">
              {compassDir(c.windDirection, lang)}
            </div>
          </div>
        </div>
      </div>

      {/* Pressure */}
      <MetricTile
        icon={Gauge}
        label={lang === 'ar' ? 'الضغط الجوي' : 'Luftdruck'}
        value={<>{c.pressure}<span className="text-[12px] text-muted-foreground ms-1">hPa</span></>}
        hint={pressureHint}
      />

      {/* Cloud cover */}
      <MetricTile
        icon={CloudOff}
        label={lang === 'ar' ? 'الغطاء السحابي' : 'Bewölkung'}
        value={<>{c.cloudCover}<span className="text-[14px] text-muted-foreground">%</span></>}
        hint={
          c.cloudCover > 75 ? (lang === 'ar' ? 'غائم بشدة' : 'Stark bewölkt')
          : c.cloudCover > 35 ? (lang === 'ar' ? 'متوسط' : 'Mäßig')
          : (lang === 'ar' ? 'صافٍ' : 'Klar')
        }
      />

      {/* Wind gusts */}
      <MetricTile
        icon={Activity}
        label={lang === 'ar' ? 'هبّات الرياح' : 'Windböen'}
        value={<>{c.windGusts}<span className="text-[12px] text-muted-foreground ms-1">km/h</span></>}
        hint={
          c.windGusts > 60 ? (lang === 'ar' ? 'قوية جداً' : 'Sehr stark')
          : c.windGusts > 30 ? (lang === 'ar' ? 'قوية' : 'Stark')
          : (lang === 'ar' ? 'هادئة' : 'Schwach')
        }
      />
    </section>
  );
}

function SunCard({ daily, lang }: { daily: DailyEntry[]; lang: 'ar' | 'de' }) {
  const today = daily[0];
  if (!today) return null;
  // Convert sunrise/sunset to position along a day-progress arc.
  const isoToMin = (iso: string) => {
    const [, time] = iso.split('T');
    const [h, m] = (time ?? '0:0').split(':').map(Number);
    return h * 60 + m;
  };
  const sunriseMin = isoToMin(today.sunrise);
  const sunsetMin  = isoToMin(today.sunset);
  const now = new Date();
  const nowMin = now.getHours() * 60 + now.getMinutes();
  // Progress within the daylight window. Clamp outside the window so the
  // marker rests at the edge instead of looping around.
  const progress = sunsetMin <= sunriseMin
    ? 0
    : Math.min(1, Math.max(0, (nowMin - sunriseMin) / (sunsetMin - sunriseMin)));

  return (
    <section className="rounded-2xl bg-card border border-border/40 p-4">
      <h2 className="text-[13px] font-semibold text-foreground mb-3">
        {lang === 'ar' ? 'الشمس' : 'Sonne'}
      </h2>

      {/* Arc */}
      <div className="relative h-20 mb-3" dir="ltr">
        <svg
          viewBox="0 0 200 100"
          preserveAspectRatio="none"
          className="absolute inset-0 w-full h-full"
        >
          <path
            d="M 10 90 Q 100 -10 190 90"
            fill="none"
            stroke="hsl(var(--border))"
            strokeWidth="1.5"
            strokeDasharray="3 3"
          />
          <path
            d="M 10 90 Q 100 -10 190 90"
            fill="none"
            stroke="url(#sunGrad)"
            strokeWidth="2"
            strokeDasharray="600"
            strokeDashoffset={600 - progress * 600}
            strokeLinecap="round"
          />
          <defs>
            <linearGradient id="sunGrad" x1="0" y1="0" x2="1" y2="0">
              <stop offset="0%"  stopColor="#fbbf24" />
              <stop offset="100%" stopColor="#fb923c" />
            </linearGradient>
          </defs>
        </svg>
        {/* Sun marker — quadratic bezier sample at t = progress */}
        {(() => {
          const t = progress;
          const x = (1 - t) * (1 - t) * 10 + 2 * (1 - t) * t * 100 + t * t * 190;
          const y = (1 - t) * (1 - t) * 90 + 2 * (1 - t) * t * (-10) + t * t * 90;
          return (
            <div
              className="absolute w-3 h-3 rounded-full bg-amber-400 shadow-lg shadow-amber-400/40 -translate-x-1/2 -translate-y-1/2"
              style={{ left: `${(x / 200) * 100}%`, top: `${(y / 100) * 100}%` }}
              aria-hidden
            />
          );
        })()}
      </div>

      <div className="grid grid-cols-3 text-center" dir="ltr">
        <div>
          <Sunrise className="w-4 h-4 text-amber-400 mx-auto mb-1" />
          <div className="text-[11.5px] text-muted-foreground">{lang === 'ar' ? 'الشروق' : 'Aufgang'}</div>
          <div className="text-[13px] font-semibold text-foreground">
            {formatTimeFromIso(today.sunrise, lang)}
          </div>
        </div>
        <div>
          <Sun className="w-4 h-4 text-orange-400 mx-auto mb-1" />
          <div className="text-[11.5px] text-muted-foreground">{lang === 'ar' ? 'مدة النهار' : 'Tageslänge'}</div>
          <div className="text-[13px] font-semibold text-foreground">
            {dayLengthFromIsos(today.sunrise, today.sunset, lang)}
          </div>
        </div>
        <div>
          <Sunset className="w-4 h-4 text-orange-500 mx-auto mb-1" />
          <div className="text-[11.5px] text-muted-foreground">{lang === 'ar' ? 'الغروب' : 'Untergang'}</div>
          <div className="text-[13px] font-semibold text-foreground">
            {formatTimeFromIso(today.sunset, lang)}
          </div>
        </div>
      </div>
    </section>
  );
}

function AirQualityCard({ data, lang }: { data: WeatherData; lang: 'ar' | 'de' }) {
  if (!data.airQuality || data.airQuality.europeanAqi == null) return null;
  const aqi = Math.round(data.airQuality.europeanAqi);
  const level = aqiLevel(aqi);
  if (!level) return null;
  // The AQI bar caps at 100 visually — values above 100 simply pin to the
  // far end with the most severe colour, which already communicates
  // "off the chart bad" without making the meter unreadable.
  const pct = Math.min(100, aqi);

  return (
    <section className={`rounded-2xl border border-border/40 p-4 ${level.bg}`}>
      <div className="flex items-center justify-between mb-2">
        <h2 className="text-[13px] font-semibold text-foreground">
          {lang === 'ar' ? 'جودة الهواء' : 'Luftqualität'}
        </h2>
        <span className={`text-[11px] font-semibold ${level.tone}`}>{level[lang]}</span>
      </div>
      <div className="flex items-end gap-2 mb-2">
        <div className={`text-[28px] font-bold leading-none ${level.tone}`}>{aqi}</div>
        <div className="text-[11px] text-muted-foreground mb-0.5">AQI</div>
      </div>
      <div className="h-1.5 rounded-full bg-foreground/[0.06] overflow-hidden mb-2.5" dir="ltr">
        <div
          className="h-full rounded-full transition-all"
          style={{
            width: `${pct}%`,
            background: 'linear-gradient(90deg, #34d399 0%, #fbbf24 40%, #fb7185 70%, #c026d3 100%)',
          }}
        />
      </div>
      <div className="flex items-center gap-3 text-[10.5px] text-muted-foreground">
        {data.airQuality.pm2_5 != null && (
          <span>PM2.5 <span className="text-foreground/85 font-medium">{data.airQuality.pm2_5.toFixed(1)}</span></span>
        )}
        {data.airQuality.pm10 != null && (
          <span>PM10 <span className="text-foreground/85 font-medium">{data.airQuality.pm10.toFixed(1)}</span></span>
        )}
      </div>
    </section>
  );
}

// ────────────────────────────────────────────────────────────────────────
// Skeleton + states
// ────────────────────────────────────────────────────────────────────────

function WeatherSkeleton() {
  return (
    <div className="space-y-3">
      <div className="h-44 rounded-3xl bg-muted/30 animate-pulse" />
      <div className="h-32 rounded-2xl bg-muted/25 animate-pulse" />
      <div className="h-64 rounded-2xl bg-muted/20 animate-pulse" />
      <div className="grid grid-cols-2 gap-2.5">
        <div className="h-24 rounded-2xl bg-muted/25 animate-pulse" />
        <div className="h-24 rounded-2xl bg-muted/25 animate-pulse" />
        <div className="h-24 rounded-2xl bg-muted/25 animate-pulse" />
        <div className="h-24 rounded-2xl bg-muted/25 animate-pulse" />
      </div>
    </div>
  );
}

function NoLocationCard({ lang }: { lang: 'ar' | 'de' }) {
  return (
    <div className="rounded-2xl bg-card border border-border/40 p-6 text-center">
      <MapPin className="w-8 h-8 mx-auto mb-3 text-muted-foreground" />
      <h2 className="text-[14px] font-semibold text-foreground mb-1.5">
        {lang === 'ar' ? 'يحتاج إلى موقعك' : 'Standort benötigt'}
      </h2>
      <p className="text-[12px] text-muted-foreground mb-4 leading-relaxed">
        {lang === 'ar'
          ? 'لتقديم طقسٍ دقيق، نحتاج إلى الوصول لموقعك الحالي.'
          : 'Für genaue Wetterdaten benötigen wir Zugriff auf deinen Standort.'}
      </p>
      <button
        type="button"
        onClick={() => requestDeviceLocation()}
        className="inline-flex items-center justify-center gap-1.5 px-4 h-9 rounded-xl bg-primary text-primary-foreground text-[12.5px] font-semibold hover:opacity-90 transition"
      >
        <MapPin className="w-3.5 h-3.5" />
        {lang === 'ar' ? 'مشاركة الموقع' : 'Standort freigeben'}
      </button>
    </div>
  );
}

function ErrorCard({ lang, onRetry }: { lang: 'ar' | 'de'; onRetry: () => void }) {
  return (
    <div className="rounded-2xl bg-card border border-border/40 p-6 text-center">
      <AlertCircle className="w-8 h-8 mx-auto mb-3 text-destructive" />
      <h2 className="text-[14px] font-semibold text-foreground mb-1.5">
        {lang === 'ar' ? 'تعذّر جلب الطقس' : 'Wetter nicht verfügbar'}
      </h2>
      <p className="text-[12px] text-muted-foreground mb-4 leading-relaxed">
        {lang === 'ar'
          ? 'تأكّد من اتصالك بالإنترنت وحاول مرّة أخرى.'
          : 'Prüfe deine Internetverbindung und versuche es erneut.'}
      </p>
      <button
        type="button"
        onClick={onRetry}
        className="inline-flex items-center justify-center gap-1.5 px-4 h-9 rounded-xl bg-foreground/[0.08] text-foreground text-[12.5px] font-semibold hover:bg-foreground/[0.14] transition"
      >
        <RefreshCw className="w-3.5 h-3.5" />
        {lang === 'ar' ? 'إعادة المحاولة' : 'Erneut versuchen'}
      </button>
    </div>
  );
}

// ────────────────────────────────────────────────────────────────────────
// Page
// ────────────────────────────────────────────────────────────────────────

export default function WeatherPage() {
  const { language } = useApp();
  const lang: 'ar' | 'de' = language === 'ar' ? 'ar' : 'de';
  const { location, status: locStatus } = useDeviceLocation();
  const { data, status, error, refresh, isRefreshing } = useWeatherData(lang);

  const lastUpdatedLabel = useMemo(() => {
    if (!data?.fetchedAt) return null;
    const d = new Date(data.fetchedAt);
    const locale = lang === 'ar' ? 'ar' : 'de-DE';
    const time = new Intl.DateTimeFormat(locale, { hour: '2-digit', minute: '2-digit' }).format(d);
    return lang === 'ar' ? `آخر تحديث ${time}` : `Aktualisiert ${time}`;
  }, [data?.fetchedAt, lang]);

  const showNoLocation =
    !location && (locStatus === 'idle' || locStatus === 'denied' || locStatus === 'unavailable');

  return (
    <div className="min-h-screen bg-background pb-28">
      <SEO
        title={lang === 'ar' ? 'الطقس — SmartHub' : 'Wetter — SmartHub'}
        description={lang === 'ar'
          ? 'حالة الطقس الحالية، التوقعات الساعية والأسبوعية، وجودة الهواء.'
          : 'Aktuelles Wetter, stündliche und 7-Tage-Vorhersage, Luftqualität.'}
        path="/weather"
      />

      <PageHeader
        title={lang === 'ar' ? 'الطقس' : 'Wetter'}
        subtitle={lastUpdatedLabel ?? undefined}
        sticky
      />

      <div className="max-w-lg mx-auto px-4 pt-3 space-y-3">
        {showNoLocation ? (
          <NoLocationCard lang={lang} />
        ) : status === 'loading' && !data ? (
          <WeatherSkeleton />
        ) : status === 'error' && !data ? (
          <ErrorCard lang={lang} onRetry={refresh} />
        ) : data ? (
          <>
            <HeroCard data={data} lang={lang} city={data.city} onRefresh={refresh} isRefreshing={isRefreshing} />
            <HourlyStrip hourly={data.hourly} lang={lang} />
            <DailyList daily={data.daily} weekRange={data.weekRange} lang={lang} />
            <DetailsGrid data={data} lang={lang} />
            <SunCard daily={data.daily} lang={lang} />
            <AirQualityCard data={data} lang={lang} />

            {/* Attribution — Open-Meteo's free tier requires it. */}
            <p className="text-center text-[10px] text-muted-foreground/70 pt-1">
              {lang === 'ar' ? 'البيانات من ' : 'Daten von '}
              <a
                href="https://open-meteo.com/"
                target="_blank"
                rel="noopener noreferrer"
                className="underline hover:text-muted-foreground"
              >
                Open-Meteo
              </a>
              {error && (
                <>
                  {' • '}
                  <span className="text-destructive/70">
                    {lang === 'ar' ? 'تحديث جزئي فشل' : 'Teilweises Update fehlgeschlagen'}
                  </span>
                </>
              )}
            </p>
          </>
        ) : (
          <WeatherSkeleton />
        )}
      </div>
    </div>
  );
}
