import React, { useMemo, useState, useEffect } from 'react';
import {
  Cloud, Sun, CloudRain, CloudSnow, CloudLightning, CloudDrizzle, Cloudy, CloudFog, MoonStar,
  Droplets, Wind, Gauge, ThermometerSun, Sunrise, Sunset, Search, MapPin, AlertCircle,
  CloudHail, RefreshCw, ArrowUp, ArrowDown, Navigation2, Key, ExternalLink, Check, X,
  Bell, Leaf,
} from 'lucide-react';
import SEO from '@/components/SEO';
import PageHeader from '@/components/PageHeader';
import { useApp } from '@/contexts/AppContext';
import { useDeviceLocation, requestDeviceLocation } from '@/hooks/useDeviceLocation';
import { useWeatherData, type DailyEntry, type HourlyEntry, type WeatherData } from '@/hooks/useWeatherData';
import {
  listProviders, readOwmApiKey, writeOwmApiKey, writeProviderPref, type ProviderId,
} from '@/lib/weather';
import { getMoonPhase } from '@/lib/weather/moonPhase';

/**
 * /weather — full-screen weather hub redesigned to match the user's
 * reference mocks: hero (city / temp / feels / glyph / range chip),
 * map preview, hourly strip, 7-day vertical-bar forecast, environment
 * block (AQI donut + pollen grid) and a sun & moon section
 * (waxing-gibbous moon card + daytime progress).
 */

// ── Code → icon / label / palette ───────────────────────────────────────

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
  0:  { ar: 'صحو',                de: 'Klar' },
  1:  { ar: 'صافٍ في الغالب',      de: 'Überwiegend klar' },
  2:  { ar: 'غائم جزئياً',         de: 'Teilweise bewölkt' },
  3:  { ar: 'غائم',                de: 'Bewölkt' },
  45: { ar: 'ضباب',               de: 'Nebel' },
  48: { ar: 'ضباب متجمّد',         de: 'Reifnebel' },
  51: { ar: 'رذاذ خفيف',           de: 'Leichter Sprühregen' },
  53: { ar: 'رذاذ متوسط',          de: 'Mäßiger Sprühregen' },
  55: { ar: 'رذاذ كثيف',           de: 'Starker Sprühregen' },
  56: { ar: 'رذاذ متجمّد خفيف',     de: 'Leichter gefrierender Sprühregen' },
  57: { ar: 'رذاذ متجمّد كثيف',     de: 'Starker gefrierender Sprühregen' },
  61: { ar: 'مطر خفيف',            de: 'Leichter Regen' },
  63: { ar: 'مطر متوسط',           de: 'Mäßiger Regen' },
  65: { ar: 'مطر غزير',            de: 'Starker Regen' },
  66: { ar: 'مطر متجمّد خفيف',      de: 'Leichter gefrierender Regen' },
  67: { ar: 'مطر متجمّد غزير',      de: 'Starker gefrierender Regen' },
  71: { ar: 'ثلج خفيف',            de: 'Leichter Schneefall' },
  73: { ar: 'ثلج متوسط',           de: 'Mäßiger Schneefall' },
  75: { ar: 'ثلج كثيف',            de: 'Starker Schneefall' },
  77: { ar: 'حبيبات ثلجية',        de: 'Schneegriesel' },
  80: { ar: 'زخات مطر خفيفة',      de: 'Leichte Regenschauer' },
  81: { ar: 'زخات مطر متوسطة',     de: 'Mäßige Regenschauer' },
  82: { ar: 'زخات مطر غزيرة',      de: 'Starke Regenschauer' },
  85: { ar: 'زخات ثلج خفيفة',      de: 'Leichte Schneeschauer' },
  86: { ar: 'زخات ثلج كثيفة',      de: 'Starke Schneeschauer' },
  95: { ar: 'عاصفة رعدية',         de: 'Gewitter' },
  96: { ar: 'عاصفة رعدية مع برَد خفيف', de: 'Gewitter mit leichtem Hagel' },
  99: { ar: 'عاصفة رعدية مع برَد غزير', de: 'Gewitter mit starkem Hagel' },
};
const labelFor = (code: number, lang: 'ar' | 'de') =>
  CODE_LABELS[code]?.[lang] ?? (lang === 'ar' ? 'غير معروف' : 'Unbekannt');

// ── Formatting ──────────────────────────────────────────────────────────

const formatHour = (hour: number) => `${hour.toString().padStart(2, '0')}:00`;

const formatTimeFromIso = (iso: string) => {
  const [, time] = iso.split('T');
  if (!time) return '';
  const [h, m] = time.split(':');
  return `${h}:${m}`;
};

const compassDir = (deg: number, lang: 'ar' | 'de') => {
  const names = lang === 'ar'
    ? ['شمال', 'شمال شرق', 'شرق', 'جنوب شرق', 'جنوب', 'جنوب غرب', 'غرب', 'شمال غرب']
    : ['N', 'NO', 'O', 'SO', 'S', 'SW', 'W', 'NW'];
  return names[Math.round(((deg % 360) + 360) % 360 / 45) % 8];
};

const dayShort = (dateMs: number, lang: 'ar' | 'de') => {
  const d = new Date(dateMs);
  const locale = lang === 'ar' ? 'ar' : 'de-DE';
  return new Intl.DateTimeFormat(locale, { weekday: 'short' }).format(d);
};
const dateShort = (dateMs: number) => {
  const d = new Date(dateMs);
  return `${d.getMonth() + 1}/${d.getDate()}`;
};

// AQI band — matches the European AQI colour scale used by Open-Meteo.
interface AqiBand { ar: string; de: string; tone: string; stroke: string; }
const aqiBand = (aqi: number): AqiBand => {
  if (aqi < 20)  return { ar: 'جيّد جداً', de: 'Sehr gut',  tone: 'text-emerald-400', stroke: '#34d399' };
  if (aqi < 40)  return { ar: 'جيّد',      de: 'Gut',       tone: 'text-lime-400',    stroke: '#a3e635' };
  if (aqi < 60)  return { ar: 'متوسط',    de: 'Mäßig',     tone: 'text-amber-400',   stroke: '#fbbf24' };
  if (aqi < 80)  return { ar: 'سيّئ',      de: 'Schlecht',  tone: 'text-orange-400',  stroke: '#fb923c' };
  if (aqi < 100) return { ar: 'سيّئ جداً',  de: 'Sehr schlecht', tone: 'text-red-400', stroke: '#f87171' };
  return            { ar: 'خطير',      de: 'Extrem',     tone: 'text-fuchsia-400', stroke: '#e879f9' };
};

const pollenLevel = (grains: number | null | undefined): { color: string; high: boolean } => {
  if (grains == null) return { color: 'bg-muted-foreground/40', high: false };
  if (grains < 1)   return { color: 'bg-emerald-500',  high: false };
  if (grains < 5)   return { color: 'bg-lime-500',     high: false };
  if (grains < 20)  return { color: 'bg-amber-500',    high: true };
  if (grains < 50)  return { color: 'bg-orange-500',   high: true };
  return                  { color: 'bg-red-500',       high: true };
};

// ── Hero ────────────────────────────────────────────────────────────────

function HeroCard({ data, lang, city, onRefresh, isRefreshing }: {
  data: WeatherData; lang: 'ar' | 'de'; city: string | null;
  onRefresh: () => void; isRefreshing: boolean;
}) {
  const c = data.current;
  const today = data.daily[0];
  const Icon = ICON_BY_CODE(c.weatherCode, c.isDay);

  return (
    <section className="px-1 pt-1">
      <div className="flex items-start justify-between gap-3 mb-4">
        <div className="flex items-center gap-2">
          <button
            type="button"
            aria-label={lang === 'ar' ? 'بحث' : 'Suche'}
            className="w-11 h-11 rounded-2xl bg-card border border-border/40 inline-flex items-center justify-center text-foreground/80"
          >
            <Search className="w-4 h-4" />
          </button>
          <h1 className="text-[26px] font-bold leading-tight text-foreground truncate max-w-[200px]">
            {city || (lang === 'ar' ? 'موقعك' : 'Standort')}
          </h1>
        </div>
        <button
          type="button"
          onClick={onRefresh}
          className="inline-flex items-center gap-1 text-[11px] text-primary/90 hover:text-primary mt-3"
        >
          <Navigation2 className={`w-3 h-3 ${isRefreshing ? 'animate-spin' : ''}`} />
          {lang === 'ar' ? 'الآن' : 'Currently'}
        </button>
      </div>

      <div className="flex items-center justify-center gap-6 mb-2">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-full bg-primary/15 border border-primary/30 inline-flex items-center justify-center">
            <Cloud className="w-4 h-4 text-primary" />
          </div>
          <div className="flex flex-col items-start">
            <span dir="ltr" className="text-[68px] font-bold leading-none text-foreground tracking-tight">
              {c.temperature}°
            </span>
            <span className="text-[11.5px] text-muted-foreground mt-1">
              {lang === 'ar' ? `تشعر ${c.apparentTemperature}°` : `Gefühlt ${c.apparentTemperature}°`}
            </span>
          </div>
        </div>
        <Icon className="w-24 h-24 stroke-[1.3] text-muted-foreground/80 shrink-0" />
      </div>

      <p className="text-center text-[15px] text-foreground/85 mb-3">
        {labelFor(c.weatherCode, lang)}
      </p>

      {today && (
        <div className="mx-auto inline-flex items-center gap-3 px-4 py-1.5 rounded-full bg-card border border-border/40 text-[12px] text-foreground/85 w-fit">
          <span className="inline-flex items-center gap-1">
            <span dir="ltr">{(c.precipitation ?? 0).toFixed(0)} mm</span>
            <Droplets className="w-3 h-3 text-sky-400" />
          </span>
          <span className="inline-flex items-center gap-0.5">
            <span dir="ltr">{today.tempMin}°</span>
            <ArrowDown className="w-3 h-3 text-sky-400" />
          </span>
          <span className="inline-flex items-center gap-0.5">
            <span dir="ltr">{today.tempMax}°</span>
            <ArrowUp className="w-3 h-3 text-rose-400" />
          </span>
        </div>
      )}
    </section>
  );
}

// ── Map preview ─────────────────────────────────────────────────────────

function MapCard({ lat, lon, lang, precipMm }: {
  lat: number; lon: number; lang: 'ar' | 'de'; precipMm: number;
}) {
  // Lightweight OSM embed — no extra dependency. Bbox = ±0.3° around the
  // location for a city-region view similar to the reference.
  const d = 0.3;
  const bbox = `${lon - d},${lat - d},${lon + d},${lat + d}`;
  const src = `https://www.openstreetmap.org/export/embed.html?bbox=${bbox}&layer=mapnik&marker=${lat},${lon}`;
  const noPrecip = (precipMm ?? 0) < 0.1;

  return (
    <section className="relative h-44 rounded-2xl overflow-hidden border border-border/40 bg-card">
      <iframe
        title="map"
        src={src}
        className="absolute inset-0 w-full h-full grayscale-[0.3] contrast-[0.9] brightness-[0.85]"
        loading="lazy"
        referrerPolicy="no-referrer-when-downgrade"
      />
      <div className="absolute inset-0 pointer-events-none bg-gradient-to-t from-background/40 via-transparent to-transparent" />
      <div className="absolute bottom-3 left-3 right-3 flex items-end justify-between gap-2 pointer-events-none">
        <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-background/85 backdrop-blur text-[11px] font-medium text-foreground border border-border/40">
          <Droplets className="w-3 h-3 text-sky-400" />
          {noPrecip
            ? (lang === 'ar' ? 'لا أمطار متوقعة' : 'Kein Niederschlag erwartet')
            : (lang === 'ar' ? `هطول ${precipMm.toFixed(1)} مم` : `${precipMm.toFixed(1)} mm Niederschlag`)}
        </span>
      </div>
    </section>
  );
}

// ── Hourly strip ────────────────────────────────────────────────────────

function HourlyStrip({ hourly, lang, windSpeed, windDirection }: {
  hourly: HourlyEntry[]; lang: 'ar' | 'de'; windSpeed: number; windDirection: number;
}) {
  if (!hourly.length) return null;
  return (
    <section>
      <div className="flex items-center gap-2 mb-3">
        <div className="w-8 h-8 rounded-xl bg-primary/15 border border-primary/30 inline-flex items-center justify-center">
          <Cloud className="w-4 h-4 text-primary" />
        </div>
        <div>
          <h2 className="text-[15px] font-semibold text-foreground leading-tight">
            {lang === 'ar' ? 'التوقّع الساعي' : 'Hourly forecast'}
          </h2>
          <p className="text-[11px] text-muted-foreground">
            {lang === 'ar' ? 'الـ 24 ساعة القادمة' : 'Next 24 hours'}
          </p>
        </div>
      </div>
      <div className="overflow-x-auto no-scrollbar -mx-4 px-4" dir="ltr">
        <div className="flex items-stretch gap-2 min-w-fit">
          {hourly.map((h, i) => {
            const Icon = ICON_BY_CODE(h.weatherCode, h.isDay);
            return (
              <div
                key={h.time}
                className="flex flex-col items-center gap-2 min-w-[68px] rounded-2xl border border-border/40 bg-card py-3 px-2"
              >
                <span className="text-[11px] text-muted-foreground font-medium">
                  {i === 0 ? (lang === 'ar' ? 'الآن' : 'Now') : formatHour(h.hour)}
                </span>
                <Icon className={`w-7 h-7 stroke-[1.5] ${h.isDay ? 'text-amber-400' : 'text-amber-300/90'}`} />
                <span className="text-[18px] font-bold text-rose-400 leading-none">{h.temperature}°</span>
                <div className="w-full border-t border-border/30 my-0.5" />
                <span className="inline-flex items-center gap-1 text-[10.5px] text-muted-foreground">
                  <Droplets className="w-2.5 h-2.5" />
                  {h.precipitationProbability}%
                </span>
                <span className="inline-flex items-center gap-1 text-[10.5px] text-muted-foreground">
                  <Navigation2
                    className="w-2.5 h-2.5"
                    style={{ transform: `rotate(${windDirection}deg)` }}
                  />
                  <span dir="ltr">{windSpeed}</span>
                </span>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}

// ── 7-day vertical bars forecast ────────────────────────────────────────

function ForecastBars({ daily, weekRange, lang }: {
  daily: DailyEntry[]; weekRange: { min: number; max: number }; lang: 'ar' | 'de';
}) {
  if (!daily.length) return null;
  const span = Math.max(1, weekRange.max - weekRange.min);
  const BAR_PX = 110;

  return (
    <section>
      <div className="flex items-center gap-2 mb-3">
        <div className="w-8 h-8 rounded-xl bg-primary/15 border border-primary/30 inline-flex items-center justify-center">
          <Sun className="w-4 h-4 text-primary" />
        </div>
        <div>
          <h2 className="text-[15px] font-semibold text-foreground leading-tight">
            {lang === 'ar' ? 'التوقّع الأسبوعي' : 'Forecast'}
          </h2>
          <p className="text-[11px] text-muted-foreground">
            {lang === 'ar' ? 'الأيام السبعة القادمة' : 'Next 7 days'}
          </p>
        </div>
      </div>

      <div className="rounded-2xl bg-card border border-border/40 p-4">
        <div className="overflow-x-auto no-scrollbar -mx-2 px-2" dir="ltr">
          <div className="flex items-end gap-4 min-w-fit pb-1">
            {daily.map((d, i) => {
              const Icon = ICON_BY_CODE(d.weatherCode, true);
              const top = ((weekRange.max - d.tempMax) / span) * (BAR_PX - 20);
              const bottom = ((d.tempMin - weekRange.min) / span) * (BAR_PX - 20);
              return (
                <div key={d.date} className="flex flex-col items-center gap-2 min-w-[44px]">
                  <span className="text-[11.5px] font-semibold text-foreground/90">
                    {i === 0 ? (lang === 'ar' ? 'اليوم' : (lang === 'de' ? 'Heute' : 'Today')) : dayShort(d.date, lang)}
                  </span>
                  <span className="text-[10px] text-muted-foreground">{dateShort(d.date)}</span>
                  <div className="relative" style={{ width: 10, height: BAR_PX }}>
                    <div
                      className="absolute left-0 right-0 rounded-full bg-gradient-to-b from-rose-400/80 via-amber-400/60 to-sky-400/80"
                      style={{ top, bottom }}
                    />
                    <span className="absolute -top-5 left-1/2 -translate-x-1/2 text-[11px] font-semibold text-rose-400">
                      {d.tempMax}°
                    </span>
                    <span className="absolute -bottom-5 left-1/2 -translate-x-1/2 text-[11px] font-semibold text-sky-400">
                      {d.tempMin}°
                    </span>
                  </div>
                  <Icon className="w-5 h-5 text-amber-400 mt-3" />
                  <span className="text-[10px] text-muted-foreground">
                    {d.precipitationProbabilityMax}%
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </section>
  );
}

// ── Environment ─────────────────────────────────────────────────────────

function AirQualityCard({ data, lang }: { data: WeatherData; lang: 'ar' | 'de' }) {
  if (!data.airQuality || data.airQuality.europeanAqi == null) return null;
  const aqi = Math.round(data.airQuality.europeanAqi);
  const band = aqiBand(aqi);

  // Critical component: highest sub-index.
  const sub = data.airQuality.subIndices ?? {};
  const labels: Record<string, { ar: string; de: string }> = {
    pm2_5: { ar: 'PM2.5', de: 'PM2,5' },
    pm10:  { ar: 'PM10',  de: 'PM10' },
    no2:   { ar: 'NO₂',   de: 'NO₂' },
    o3:    { ar: 'الأوزون', de: 'Ozon' },
    so2:   { ar: 'SO₂',   de: 'SO₂' },
  };
  let critKey: string | null = null;
  let critVal = -Infinity;
  for (const [k, v] of Object.entries(sub)) {
    if (typeof v === 'number' && v > critVal) { critKey = k; critVal = v; }
  }

  // Half-donut: 180° arc, fill proportional to AQI/100.
  const pct = Math.min(1, aqi / 100);
  const radius = 50;
  const circumference = Math.PI * radius;       // half circle
  const dash = circumference * pct;

  return (
    <div className="rounded-2xl bg-card border border-border/40 p-4">
      <div className="flex items-center gap-2 mb-3">
        <div className="w-8 h-8 rounded-xl bg-primary/15 border border-primary/30 inline-flex items-center justify-center">
          <Wind className="w-4 h-4 text-primary" />
        </div>
        <h3 className="text-[14px] font-semibold text-foreground">
          {lang === 'ar' ? 'جودة الهواء' : 'Air quality'}
        </h3>
      </div>

      <div className="grid grid-cols-[1fr_auto] items-center gap-3">
        <div className="space-y-3">
          <div>
            <p className="text-[10.5px] uppercase tracking-wide text-muted-foreground mb-0.5">
              {lang === 'ar' ? 'التقييم' : 'Rating'}
            </p>
            <p className={`text-[18px] font-bold ${band.tone}`}>{band[lang]}</p>
          </div>
          {critKey && (
            <div>
              <p className="text-[10.5px] uppercase tracking-wide text-muted-foreground mb-1.5">
                {lang === 'ar' ? 'مكوّن حرج' : 'Critical components'}
              </p>
              <span className={`inline-flex items-center px-3 py-1 rounded-full text-[11.5px] font-semibold bg-rose-500/15 ${band.tone}`}>
                {labels[critKey][lang]}
              </span>
            </div>
          )}
        </div>

        <div className="relative w-[130px] h-[80px]" dir="ltr">
          <svg viewBox="0 0 120 70" className="absolute inset-0 w-full h-full">
            <path
              d="M 10 60 A 50 50 0 0 1 110 60"
              fill="none"
              stroke="hsl(var(--muted) / 0.6)"
              strokeWidth="10"
              strokeLinecap="round"
            />
            <path
              d="M 10 60 A 50 50 0 0 1 110 60"
              fill="none"
              stroke={band.stroke}
              strokeWidth="10"
              strokeLinecap="round"
              strokeDasharray={`${dash} ${circumference}`}
            />
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-end pb-1">
            <span className="text-[22px] font-bold text-foreground leading-none">{aqi}</span>
            <span className="text-[8.5px] text-muted-foreground text-center leading-tight">
              {lang === 'ar' ? 'مؤشر جودة الهواء' : 'Air Quality Index'}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}

function PollenCard({ data, lang }: { data: WeatherData; lang: 'ar' | 'de' }) {
  const pollen = data.airQuality?.pollen;
  if (!pollen) return null;
  const labels = {
    birch:   { ar: 'البتولا',   de: 'Birke' },
    grass:   { ar: 'الأعشاب',   de: 'Gräser' },
    alder:   { ar: 'الجار',     de: 'Erle' },
    mugwort: { ar: 'الشيح',     de: 'Beifuß' },
    olive:   { ar: 'الزيتون',   de: 'Olive' },
    ragweed: { ar: 'الرَّجيد',   de: 'Ragweed' },
  } as const;
  const order: (keyof typeof labels)[] = ['birch', 'grass', 'alder', 'mugwort', 'olive', 'ragweed'];
  // Only render if at least one value is non-null.
  if (!order.some(k => pollen[k] != null)) return null;

  return (
    <div className="rounded-2xl bg-card border border-border/40 p-4">
      <div className="flex items-center gap-2 mb-3">
        <div className="w-8 h-8 rounded-xl bg-primary/15 border border-primary/30 inline-flex items-center justify-center">
          <Leaf className="w-4 h-4 text-primary" />
        </div>
        <h3 className="text-[14px] font-semibold text-foreground">
          {lang === 'ar' ? 'حبوب اللقاح' : 'Pollen'}
        </h3>
      </div>
      <div className="grid grid-cols-2 gap-2">
        {order.map(k => {
          const v = pollen[k];
          const level = pollenLevel(v);
          return (
            <div key={k} className="flex items-center justify-between gap-2 px-3 py-2.5 rounded-xl border border-border/30 bg-foreground/[0.02]">
              <span className="inline-flex items-center gap-2 min-w-0">
                <span className={`w-2.5 h-2.5 rounded-full shrink-0 ${level.color}`} />
                <span className="text-[12px] text-foreground/90 truncate">{labels[k][lang]}</span>
              </span>
              {level.high ? (
                <Leaf className="w-3 h-3 text-amber-400 shrink-0" />
              ) : (
                <Bell className="w-3 h-3 text-muted-foreground/60 shrink-0" />
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ── Sun & Moon ──────────────────────────────────────────────────────────

function MoonCard({ lang }: { lang: 'ar' | 'de' }) {
  const m = getMoonPhase();
  const pct = Math.round(m.illumination * 100);

  // Render the moon as two overlapping circles for an accurate crescent
  // approximation. The offset comes from |cos(2π·phase)|.
  const k = Math.cos(2 * Math.PI * m.phase); // -1..1
  const offset = k * 22; // px, shifts shadow disc horizontally

  return (
    <div className="rounded-2xl bg-card border border-border/40 p-4">
      <div className="flex items-center justify-between mb-3">
        <span className="text-[12px] text-muted-foreground">
          {lang === 'ar' ? 'طور القمر' : 'Moon phase'}
        </span>
        <div className="w-9 h-9 rounded-full bg-slate-900 border border-border/40 relative overflow-hidden" aria-hidden>
          <div className="absolute inset-0 rounded-full bg-amber-100" />
          <div
            className="absolute inset-0 rounded-full bg-slate-900"
            style={{ transform: `translateX(${offset}px)` }}
          />
        </div>
      </div>
      <p className="text-[15px] font-semibold text-foreground mb-3">{m.name[lang]}</p>
      <div className="flex items-center justify-between text-[11px] text-muted-foreground">
        <span>{lang === 'ar' ? `${pct}٪ مضاءة` : `${pct}% Beleuchtung`}</span>
        <span className="text-foreground/70">{m.waxing ? '↗' : '↘'}</span>
      </div>
    </div>
  );
}

function DaytimeCard({ daily, lang }: { daily: DailyEntry[]; lang: 'ar' | 'de' }) {
  const today = daily[0];
  if (!today?.sunrise || !today?.sunset) return null;
  const isoMin = (iso: string) => {
    const [, t] = iso.split('T');
    const [h, m] = (t ?? '0:0').split(':').map(Number);
    return h * 60 + m;
  };
  const sr = isoMin(today.sunrise);
  const ss = isoMin(today.sunset);
  const now = new Date();
  const nowMin = now.getHours() * 60 + now.getMinutes();
  const total = Math.max(1, ss - sr);
  const progress = Math.min(1, Math.max(0, (nowMin - sr) / total));
  const remaining = Math.max(0, ss - nowMin);
  const hh = Math.floor(remaining / 60).toString().padStart(2, '0');
  const mm = (remaining % 60).toString().padStart(2, '0');

  return (
    <div className="rounded-2xl bg-card border border-border/40 p-4">
      <div className="flex items-center justify-between mb-3">
        <span className="text-[12px] text-muted-foreground">
          {lang === 'ar' ? 'النهار' : 'Daytime'}
        </span>
        <div className="w-9 h-9 rounded-full bg-primary/15 border border-primary/30 inline-flex items-center justify-center">
          <Sun className="w-4 h-4 text-primary" />
        </div>
      </div>
      <p dir="ltr" className="text-[15px] font-semibold text-foreground mb-3 tabular-nums">
        {formatTimeFromIso(today.sunrise)} – {formatTimeFromIso(today.sunset)}
      </p>
      <div className="h-1.5 rounded-full bg-foreground/[0.08] overflow-hidden mb-2" dir="ltr">
        <div
          className="h-full rounded-full bg-gradient-to-r from-amber-400 to-orange-400 transition-all"
          style={{ width: `${progress * 100}%` }}
        />
      </div>
      <p className="text-[11px] text-muted-foreground">
        <span dir="ltr" className="tabular-nums">{hh}:{mm}</span>{' '}
        {lang === 'ar' ? 'متبقّية' : 'verbleibend'}
      </p>
    </div>
  );
}

function SunriseSunsetCard({ daily, lang }: { daily: DailyEntry[]; lang: 'ar' | 'de' }) {
  const today = daily[0];
  if (!today?.sunrise || !today?.sunset) return null;
  return (
    <div className="rounded-2xl bg-card border border-border/40 p-4 col-span-2 grid grid-cols-2 gap-4" dir="ltr">
      <div className="flex items-center gap-3">
        <Sunrise className="w-5 h-5 text-amber-400" />
        <div>
          <p className="text-[10.5px] text-muted-foreground">
            {lang === 'ar' ? 'الشروق' : 'Sunrise'}
          </p>
          <p className="text-[14px] font-semibold text-foreground tabular-nums">
            {formatTimeFromIso(today.sunrise)}
          </p>
        </div>
      </div>
      <div className="flex items-center gap-3">
        <Sunset className="w-5 h-5 text-orange-500" />
        <div>
          <p className="text-[10.5px] text-muted-foreground">
            {lang === 'ar' ? 'الغروب' : 'Sunset'}
          </p>
          <p className="text-[14px] font-semibold text-foreground tabular-nums">
            {formatTimeFromIso(today.sunset)}
          </p>
        </div>
      </div>
    </div>
  );
}

// ── Details (compact) ───────────────────────────────────────────────────

function ConditionsGrid({ data, lang }: { data: WeatherData; lang: 'ar' | 'de' }) {
  const c = data.current;
  const unsupported = new Set(data.meta.unsupportedFields ?? []);
  const tiles: { icon: typeof Wind; label: string; value: React.ReactNode }[] = [
    { icon: Droplets, label: lang === 'ar' ? 'الرطوبة' : 'Luftfeuchte', value: <>{c.humidity}<span className="text-muted-foreground text-[12px]">%</span></> },
    { icon: Wind,     label: lang === 'ar' ? 'الرياح'  : 'Wind',        value: <span dir="ltr">{c.windSpeed} <span className="text-muted-foreground text-[11px]">km/h {compassDir(c.windDirection, lang)}</span></span> },
    { icon: Gauge,    label: lang === 'ar' ? 'الضغط'   : 'Luftdruck',   value: <span dir="ltr">{c.pressure} <span className="text-muted-foreground text-[11px]">hPa</span></span> },
  ];
  if (!unsupported.has('uvIndex')) {
    tiles.unshift({ icon: ThermometerSun, label: 'UV', value: <>{c.uvIndex}</> });
  }
  return (
    <div className="grid grid-cols-2 gap-2.5">
      {tiles.map(t => (
        <div key={t.label} className="rounded-2xl bg-card border border-border/40 p-3.5">
          <div className="flex items-center gap-1.5 text-muted-foreground mb-2">
            <t.icon className="w-3.5 h-3.5" />
            <span className="text-[10.5px] font-medium uppercase tracking-wide">{t.label}</span>
          </div>
          <div className="text-[18px] font-bold text-foreground leading-none">{t.value}</div>
        </div>
      ))}
    </div>
  );
}

// ── Section label ───────────────────────────────────────────────────────

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <h2 className="text-[20px] font-bold text-foreground mt-2 mb-1">{children}</h2>
  );
}

// ── Provider switcher / OWM key ─────────────────────────────────────────

function ProviderSwitcher({ activeId, lang }: { activeId: ProviderId; lang: 'ar' | 'de' }) {
  const providers = listProviders();
  return (
    <section className="rounded-2xl bg-card border border-border/40 p-3">
      <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wide block mb-2.5">
        {lang === 'ar' ? 'مصدر البيانات' : 'Datenquelle'}
      </span>
      <div className="grid grid-cols-2 gap-2">
        {providers.map(p => {
          const active = p.id === activeId;
          return (
            <button
              key={p.id}
              type="button"
              onClick={() => writeProviderPref(p.id)}
              aria-pressed={active}
              className={`relative rounded-xl border px-3 py-2.5 text-start transition ${
                active ? 'border-primary/60 bg-primary/10' : 'border-border/40 bg-foreground/[0.02]'
              }`}
            >
              <div className="flex items-center gap-1.5">
                {active && <Check className="w-3 h-3 text-primary shrink-0" />}
                <span className={`text-[12.5px] font-semibold ${active ? 'text-primary' : 'text-foreground'}`}>
                  {p.name[lang]}
                </span>
              </div>
              {p.requiresApiKey && (
                <span className="mt-1.5 inline-flex items-center gap-1 text-[9.5px] text-amber-400/90">
                  <Key className="w-2.5 h-2.5" />
                  {lang === 'ar' ? 'يتطلّب مفتاحاً' : 'API-Key erforderlich'}
                </span>
              )}
            </button>
          );
        })}
      </div>
    </section>
  );
}

function ApiKeyPrompt({ lang, hasExistingKey }: { lang: 'ar' | 'de'; hasExistingKey: boolean }) {
  const [value, setValue] = useState('');
  return (
    <section className="rounded-2xl border border-amber-500/30 bg-amber-500/5 p-4">
      <div className="flex items-start gap-2.5 mb-3">
        <Key className="w-4 h-4 mt-0.5 text-amber-400 shrink-0" />
        <div className="min-w-0">
          <h2 className="text-[14px] font-semibold text-foreground">
            {lang === 'ar' ? 'مفتاح OpenWeatherMap' : 'OpenWeatherMap-Key'}
          </h2>
          <p className="mt-1 text-[11.5px] text-muted-foreground leading-relaxed">
            {lang === 'ar'
              ? 'يخزَّن محلياً على جهازك فقط.'
              : 'Wird ausschließlich lokal gespeichert.'}
          </p>
        </div>
      </div>
      <div className="flex items-stretch gap-2">
        <input
          type="text"
          value={value}
          onChange={e => setValue(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter') { writeOwmApiKey(value.trim()); setValue(''); } }}
          placeholder={hasExistingKey ? (lang === 'ar' ? 'تحديث…' : 'Aktualisieren …') : 'API key'}
          dir="ltr"
          className="flex-1 min-w-0 h-10 rounded-xl bg-background border border-border/50 px-3 text-[16px] font-mono text-foreground"
        />
        <button
          type="button"
          onClick={() => { writeOwmApiKey(value.trim()); setValue(''); }}
          disabled={!value.trim()}
          className="px-3 h-10 rounded-xl bg-primary text-primary-foreground text-[12.5px] font-semibold disabled:opacity-50"
        >
          {lang === 'ar' ? 'حفظ' : 'Speichern'}
        </button>
      </div>
      <div className="mt-3 flex items-center gap-3 text-[11px]">
        <a href="https://home.openweathermap.org/users/sign_up" target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-primary hover:underline">
          <ExternalLink className="w-3 h-3" />
          {lang === 'ar' ? 'تسجيل مجاني' : 'Kostenlos registrieren'}
        </a>
        <button type="button" onClick={() => writeProviderPref('open-meteo')} className="ms-auto text-muted-foreground hover:text-foreground">
          {lang === 'ar' ? 'العودة إلى Open-Meteo' : 'Zurück zu Open-Meteo'}
        </button>
      </div>
    </section>
  );
}

// ── States ──────────────────────────────────────────────────────────────

function WeatherSkeleton() {
  return (
    <div className="space-y-4">
      <div className="h-52 rounded-2xl bg-muted/30 animate-pulse" />
      <div className="h-44 rounded-2xl bg-muted/25 animate-pulse" />
      <div className="h-32 rounded-2xl bg-muted/25 animate-pulse" />
      <div className="h-56 rounded-2xl bg-muted/25 animate-pulse" />
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
        className="inline-flex items-center justify-center gap-1.5 px-4 h-9 rounded-xl bg-primary text-primary-foreground text-[12.5px] font-semibold"
      >
        <MapPin className="w-3.5 h-3.5" />
        {lang === 'ar' ? 'مشاركة الموقع' : 'Standort freigeben'}
      </button>
    </div>
  );
}

function ErrorCard({ lang, error, onRetry }: { lang: 'ar' | 'de'; error: string | null; onRetry: () => void }) {
  return (
    <div className="rounded-2xl bg-card border border-border/40 p-6 text-center">
      <AlertCircle className="w-8 h-8 mx-auto mb-3 text-destructive" />
      <h2 className="text-[14px] font-semibold text-foreground mb-1.5">
        {lang === 'ar' ? 'تعذّر جلب الطقس' : 'Wetter nicht verfügbar'}
      </h2>
      <p className="text-[12px] text-muted-foreground mb-4 leading-relaxed">
        {error || (lang === 'ar' ? 'تأكّد من اتصالك.' : 'Internetverbindung prüfen.')}
      </p>
      <button type="button" onClick={onRetry} className="inline-flex items-center gap-1.5 px-4 h-9 rounded-xl bg-foreground/[0.08] text-foreground text-[12.5px] font-semibold">
        <RefreshCw className="w-3.5 h-3.5" />
        {lang === 'ar' ? 'إعادة المحاولة' : 'Erneut versuchen'}
      </button>
    </div>
  );
}

// ── Page ────────────────────────────────────────────────────────────────

export default function WeatherPage() {
  const { language } = useApp();
  const lang: 'ar' | 'de' = language === 'ar' ? 'ar' : 'de';
  const { location, status: locStatus } = useDeviceLocation();
  const { data, status, error, needsApiKey, providerId, refresh, isRefreshing } = useWeatherData(lang);

  const [hasExistingKey, setHasExistingKey] = useState(() => !!readOwmApiKey());
  useEffect(() => {
    const sync = () => setHasExistingKey(!!readOwmApiKey());
    sync();
    window.addEventListener('storage', sync);
    return () => window.removeEventListener('storage', sync);
  }, [providerId, needsApiKey]);

  const lastUpdatedLabel = useMemo(() => {
    if (!data?.fetchedAt) return null;
    const d = new Date(data.fetchedAt);
    const locale = lang === 'ar' ? 'ar' : 'de-DE';
    const time = new Intl.DateTimeFormat(locale, { hour: '2-digit', minute: '2-digit' }).format(d);
    return lang === 'ar' ? `آخر تحديث ${time}` : `Aktualisiert ${time}`;
  }, [data?.fetchedAt, lang]);

  const showNoLocation =
    !location && (locStatus === 'idle' || locStatus === 'denied' || locStatus === 'unavailable');

  const attribution = listProviders().find(p => p.id === providerId)?.attribution
    ?? { label: 'Open-Meteo', url: 'https://open-meteo.com/' };

  return (
    <div className="min-h-screen bg-background pb-28">
      <SEO
        title={lang === 'ar' ? 'الطقس — SmartHub' : 'Wetter — SmartHub'}
        description={lang === 'ar'
          ? 'حالة الطقس الحالية، التوقعات الساعية والأسبوعية، جودة الهواء وحبوب اللقاح.'
          : 'Aktuelles Wetter, stündliche und 7-Tage-Vorhersage, Luftqualität und Pollen.'}
        path="/weather"
      />

      <PageHeader title={lang === 'ar' ? 'الطقس' : 'Wetter'} subtitle={lastUpdatedLabel ?? undefined} sticky />

      <div className="max-w-lg mx-auto px-4 pt-3 space-y-5">
        {showNoLocation ? (
          <NoLocationCard lang={lang} />
        ) : needsApiKey ? (
          <>
            <ProviderSwitcher activeId={providerId} lang={lang} />
            <ApiKeyPrompt lang={lang} hasExistingKey={hasExistingKey} />
          </>
        ) : status === 'loading' && !data ? (
          <WeatherSkeleton />
        ) : status === 'error' && !data ? (
          <ErrorCard lang={lang} error={error} onRetry={refresh} />
        ) : data && location ? (
          <>
            <HeroCard data={data} lang={lang} city={data.city} onRefresh={refresh} isRefreshing={isRefreshing} />
            <MapCard lat={location.lat} lon={location.lng} lang={lang} precipMm={data.current.precipitation ?? 0} />
            <HourlyStrip
              hourly={data.hourly}
              lang={lang}
              windSpeed={data.current.windSpeed}
              windDirection={data.current.windDirection}
            />
            <ForecastBars daily={data.daily} weekRange={data.weekRange} lang={lang} />

            <SectionLabel>{lang === 'ar' ? 'البيئة' : 'Environment'}</SectionLabel>
            <AirQualityCard data={data} lang={lang} />
            <PollenCard data={data} lang={lang} />

            <SectionLabel>{lang === 'ar' ? 'الشمس والقمر' : 'Sun & Moon'}</SectionLabel>
            <div className="grid grid-cols-2 gap-2.5">
              <MoonCard lang={lang} />
              <DaytimeCard daily={data.daily} lang={lang} />
              <SunriseSunsetCard daily={data.daily} lang={lang} />
            </div>

            <ConditionsGrid data={data} lang={lang} />

            <ProviderSwitcher activeId={providerId} lang={lang} />
            {providerId === 'openweathermap' && (
              <ApiKeyPrompt lang={lang} hasExistingKey={hasExistingKey} />
            )}

            <p className="text-center text-[10px] text-muted-foreground/70 pt-1">
              {lang === 'ar' ? 'البيانات من ' : 'Daten von '}
              <a href={attribution.url} target="_blank" rel="noopener noreferrer" className="underline hover:text-muted-foreground">
                {attribution.label}
              </a>
            </p>
          </>
        ) : (
          <WeatherSkeleton />
        )}
      </div>
    </div>
  );
}
