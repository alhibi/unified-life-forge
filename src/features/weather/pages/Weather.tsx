import React, { useMemo, useState, useEffect, useCallback } from 'react';
import {
  Cloud, Sun, CloudRain, CloudSnow, CloudLightning, CloudDrizzle, CloudFog,
  CloudHail, CloudSun, MoonStar, Moon, Droplet, Droplets, Wind, Flag, Gauge,
  Sunrise, Sunset, MapPin, AlertCircle, RefreshCw, Share2, CalendarDays, ChevronRight,
  Key, ExternalLink, Contrast, type LucideIcon,
} from '@/lib/icons';
import SEO from '@/components/SEO';
import { Drawer, DrawerContent, DrawerTitle } from '@/components/ui/drawer';
import * as VisuallyHidden from '@radix-ui/react-visually-hidden';
import { useApp } from '@/contexts/AppContext';
import { useDeviceLocation, requestDeviceLocation } from '@/hooks/useDeviceLocation';
import { useWeatherData, type DailyEntry, type WeatherData } from '@/features/weather/hooks/useWeatherData';
import {
  listProviders, readOwmApiKey, writeOwmApiKey, writeProviderPref,
} from '@/features/weather/lib';
import { getMoonPhase } from '@/features/weather/lib/moonPhase';
import { describeWeatherCode } from '@/features/weather/lib/describe';

/**
 * /weather — Forecast view designed to mirror the reference design 1:1:
 *
 *   • a minimal header (a single share affordance, then a calendar tile +
 *     "Forecast" title + city in the accent colour + a location pin);
 *   • a horizontally-scrollable row of vertical temperature capsules with
 *     a continuous warm→cool colour scale on the high/low numbers, weekend
 *     columns subtly highlighted, a weather glyph and precipitation %;
 *   • a "Next 7 days" grid of insight chips (UV / rain / gusts / wind /
 *     humidity / pressure / cloudiness) with the exact fill + accent
 *     treatment from the reference;
 *   • a "Sun & Moon" block with two expandable rows.
 *
 * Data still comes from the provider-agnostic `useWeatherData` hook
 * (Open-Meteo by default, OpenWeatherMap as an optional BYOK source).
 */

// ── WMO code → icon ───────────────────────────────────────────────────────

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

/** Sunny/partly-cloudy glyphs keep a warm tint; everything else is the
 *  neutral grey used across the reference's forecast row. */
const iconColorForCode = (code: number) =>
  code <= 2 ? 'text-amber-400' : 'text-foreground/55';

// ── Continuous temperature colour scale ──────────────────────────────────
//
// Matches the reference: deep red for hot highs, sliding through orange /
// amber to green for mild values and blue for the coldest lows.

const tempColorClass = (t: number): string => {
  if (t >= 28) return 'text-red-500';
  if (t >= 23) return 'text-orange-500';
  if (t >= 20) return 'text-orange-400';
  if (t >= 16) return 'text-amber-400';
  if (t >= 11) return 'text-emerald-400';
  if (t >= 6)  return 'text-sky-400';
  return 'text-sky-300';
};

const precipColorClass = (p: number): string => {
  if (p <= 0)  return 'text-foreground/55';
  if (p < 50)  return 'text-sky-400/90';
  return 'text-sky-400';
};

// ── Formatting helpers ────────────────────────────────────────────────────
//
// Daily `date` values are UTC-midnight markers, so every formatter reads
// the UTC calendar fields to avoid off-by-one drift near midnight.

const localeFor = (isAr: boolean) => (isAr ? 'ar' : 'en-US');

const weekdayShort = (ms: number, isAr: boolean) =>
  new Intl.DateTimeFormat(localeFor(isAr), { weekday: 'short', timeZone: 'UTC' }).format(new Date(ms));

const weekdayLong = (ms: number, isAr: boolean) =>
  new Intl.DateTimeFormat(localeFor(isAr), { weekday: 'long', timeZone: 'UTC' }).format(new Date(ms));

const dateShort = (ms: number) => {
  const d = new Date(ms);
  return `${d.getUTCMonth() + 1}/${d.getUTCDate()}`;
};

const isWeekend = (ms: number) => {
  const day = new Date(ms).getUTCDay();
  return day === 0 || day === 6;
};

const formatTimeFromIso = (iso: string) => {
  const [, time] = iso.split('T');
  if (!time) return '';
  const [h, m] = time.split(':');
  return `${h}:${m}`;
};

const compassDir = (deg: number, isAr: boolean) => {
  const names = isAr
    ? ['شمال', 'شمال شرق', 'شرق', 'جنوب شرق', 'جنوب', 'جنوب غرب', 'غرب', 'شمال غرب']
    : ['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW'];
  return names[Math.round(((deg % 360) + 360) % 360 / 45) % 8];
};

// ── Header ────────────────────────────────────────────────────────────────

function ForecastHeader({ isAr, city, onShare, onLocate }: {
  isAr: boolean; city: string | null; onShare: () => void; onLocate: () => void;
}) {
  return (
    <header className="pt-3 pb-1">
      <div className="flex items-center mb-4">
        <button
          type="button"
          onClick={onShare}
          aria-label={isAr ? 'مشاركة' : 'Share'}
          className="w-9 h-9 -ms-1 inline-flex items-center justify-center text-foreground/80 active:scale-95 transition-transform"
        >
          <Share2 className="w-[18px] h-[18px]" />
        </button>
      </div>

      <div className="flex items-center gap-3">
        <div className="w-12 h-12 rounded-2xl bg-muted/50 border border-border/40 inline-flex items-center justify-center shrink-0">
          <CalendarDays className="w-5 h-5 text-foreground/80" />
        </div>
        <div className="flex-1 min-w-0">
          <h1 className="text-[28px] font-semibold text-foreground leading-tight">
            {isAr ? 'التوقّع' : 'Forecast'}
          </h1>
          <p className="text-[14px] text-primary truncate">
            {city || (isAr ? 'موقعك' : 'Your location')}
          </p>
        </div>
        <button
          type="button"
          onClick={onLocate}
          aria-label={isAr ? 'تحديث الموقع' : 'Update location'}
          className="w-9 h-9 inline-flex items-center justify-center text-primary active:scale-95 transition-transform"
        >
          <MapPin className="w-5 h-5" />
        </button>
      </div>
    </header>
  );
}

// ── Forecast capsules ─────────────────────────────────────────────────────

function ForecastBars({ daily, weekRange, isAr }: {
  daily: DailyEntry[]; weekRange: { min: number; max: number }; isAr: boolean;
}) {
  if (!daily.length) return null;
  const span = Math.max(1, weekRange.max - weekRange.min);
  const BAR_PX = 150;
  const BAR_W = 24;

  return (
    <section className="pt-5 pb-6">
      <div className="overflow-x-auto no-scrollbar -mx-4 px-4">
        <div className="flex items-stretch gap-1.5 min-w-fit">
          {daily.map((d) => {
            const Icon = ICON_BY_CODE(d.weatherCode, true);
            const topPct    = (weekRange.max - d.tempMax) / span;
            const bottomPct = (d.tempMin - weekRange.min) / span;
            const top    = topPct    * (BAR_PX - 14);
            const bottom = bottomPct * (BAR_PX - 14);
            const weekend = isWeekend(d.date);
            const pop = d.precipitationProbabilityMax ?? 0;
            return (
              <div
                key={d.date}
                className={`flex flex-col items-center min-w-[46px] rounded-2xl px-1 pt-2 pb-2.5 ${
                  weekend ? 'bg-foreground/[0.05]' : ''
                }`}
              >
                <span className="text-[14px] font-semibold text-foreground leading-tight">
                  {weekdayShort(d.date, isAr)}
                </span>
                <span className="text-[11px] text-muted-foreground mb-2.5">
                  {dateShort(d.date)}
                </span>

                <span className={`text-[15px] font-bold mb-1.5 tabular-nums ${tempColorClass(d.tempMax)}`}>
                  {Math.round(d.tempMax)}°
                </span>

                <div className="relative" style={{ width: BAR_W, height: BAR_PX }}>
                  <div
                    className="absolute left-0 right-0 rounded-full bg-foreground/35"
                    style={{ top, bottom }}
                  />
                </div>

                <span className={`text-[15px] font-bold mt-1.5 tabular-nums ${tempColorClass(d.tempMin)}`}>
                  {Math.round(d.tempMin)}°
                </span>

                <Icon className={`w-7 h-7 mt-3.5 ${iconColorForCode(d.weatherCode)}`} strokeWidth={1.6} />
                <span className={`text-[12px] mt-1.5 tabular-nums ${precipColorClass(pop)}`}>
                  {pop}%
                </span>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}

// ── "Next 7 days" insight chips ───────────────────────────────────────────

interface ChipStyle { card: string; text: string; }
const STYLE_UV:    ChipStyle = { card: 'bg-orange-500 border-transparent',  text: 'text-neutral-900' };
const STYLE_RAIN:  ChipStyle = { card: 'bg-sky-300 border-transparent',     text: 'text-neutral-900' };
const STYLE_CLOUD: ChipStyle = { card: 'bg-slate-300 border-transparent',   text: 'text-neutral-900' };
const STYLE_DARK:  ChipStyle = { card: 'bg-foreground/[0.06] border-border/30', text: 'text-foreground' };

interface Insight {
  key: string;
  label: string;
  Icon: LucideIcon;
  style: ChipStyle;
  iconColor: string;
  colStart2?: boolean;
}

function buildInsights(data: WeatherData, isAr: boolean): Insight[] {
  const ins: Insight[] = [];
  const daily = data.daily;
  const c = data.current;
  if (!daily.length) return ins;

  // 1 ─ UV index (highlighted orange when high)
  let maxUv = 0, uvDay = 0;
  for (const d of daily) {
    if ((d.uvIndexMax ?? 0) > maxUv) { maxUv = d.uvIndexMax ?? 0; uvDay = d.date; }
  }
  if (maxUv > 0) {
    const high = maxUv >= 6;
    const head = isAr ? (high ? 'مؤشر UV مرتفع' : 'مؤشر UV') : (high ? 'High UV index' : 'UV index');
    ins.push({
      key: 'uv',
      label: `${head} (${maxUv.toFixed(1)}) ${weekdayLong(uvDay, isAr)}`,
      Icon: Sun,
      style: STYLE_UV,
      iconColor: 'text-neutral-900',
    });
  }

  // 2 ─ Total rain expected (light blue)
  const totalRain = daily.reduce((s, d) => s + (d.precipitationSum ?? 0), 0);
  ins.push({
    key: 'rain',
    label: totalRain >= 0.5
      ? (isAr ? `${Math.round(totalRain)} مم أمطار متوقّعة` : `${Math.round(totalRain)} mm rain expected`)
      : (isAr ? 'لا أمطار متوقّعة' : 'No rain expected'),
    Icon: Droplet,
    style: STYLE_RAIN,
    iconColor: 'text-neutral-900',
  });

  // 3 ─ Wind gusts (dark, green accent)
  let gustVal = 0, gustDay = 0;
  for (const d of daily) {
    if ((d.windGustsMax ?? 0) > gustVal) { gustVal = d.windGustsMax ?? 0; gustDay = d.date; }
  }
  if (gustVal >= 20) {
    ins.push({
      key: 'gusts',
      label: isAr
        ? `هبّات ${Math.round(gustVal)} كم/س ${weekdayLong(gustDay, isAr)}`
        : `${Math.round(gustVal)} km/h gusts ${weekdayLong(gustDay, isAr)}`,
      Icon: Flag,
      style: STYLE_DARK,
      iconColor: 'text-emerald-400',
    });
  }

  // 4 ─ Strongest wind (dark, violet accent)
  let windVal = 0; let windDayEntry: DailyEntry | null = null;
  for (const d of daily) {
    if ((d.windSpeedMax ?? 0) > windVal) { windVal = d.windSpeedMax ?? 0; windDayEntry = d; }
  }
  if (windDayEntry && windVal > 0) {
    const dir = compassDir(windDayEntry.windDirectionDominant ?? 0, isAr);
    ins.push({
      key: 'wind',
      label: isAr
        ? `رياح ${Math.round(windVal)} كم/س ${weekdayLong(windDayEntry.date, isAr)} (${dir})`
        : `${Math.round(windVal)} km/h wind ${weekdayLong(windDayEntry.date, isAr)} (${dir})`,
      Icon: Wind,
      style: STYLE_DARK,
      iconColor: 'text-violet-400',
    });
  }

  // 5 ─ High humidity (dark, teal accent)
  let humVal = 0, humDay = 0;
  for (const d of daily) {
    if ((d.humidityMax ?? 0) > humVal) { humVal = d.humidityMax ?? 0; humDay = d.date; }
  }
  if (humVal >= 60) {
    ins.push({
      key: 'humidity',
      label: isAr
        ? `رطوبة عالية ${weekdayShort(humDay, isAr)} (${Math.round(humVal)}%)`
        : `High humidity ${weekdayShort(humDay, isAr)} (${Math.round(humVal)}%)`,
      Icon: Droplets,
      style: STYLE_DARK,
      iconColor: 'text-teal-400',
    });
  }

  // 6 ─ Air pressure (dark, amber accent)
  if (c.pressure) {
    let label: string;
    if (c.pressure >= 1023) {
      label = isAr ? `ضغط مرتفع (${c.pressure} هـ.ب)` : `High air pressure (${c.pressure} hPa)`;
    } else if (c.pressure <= 1005) {
      label = isAr ? `ضغط منخفض (${c.pressure} هـ.ب)` : `Low air pressure (${c.pressure} hPa)`;
    } else {
      label = isAr ? 'ضغط الهواء ضمن المعدّل' : 'Air pressure in normal range';
    }
    ins.push({
      key: 'pressure',
      label,
      Icon: Gauge,
      style: STYLE_DARK,
      iconColor: 'text-orange-300',
    });
  }

  // 7 ─ Heavily cloudy (light grey, alone in the right column)
  let cloudVal = 0, cloudDay = 0;
  for (const d of daily) {
    if ((d.cloudCoverMean ?? 0) > cloudVal) { cloudVal = d.cloudCoverMean ?? 0; cloudDay = d.date; }
  }
  if (cloudVal >= 70) {
    ins.push({
      key: 'cloud',
      label: isAr
        ? `غائم بكثافة ${weekdayLong(cloudDay, isAr)} (${Math.round(cloudVal)}%)`
        : `Heavily cloudy ${weekdayLong(cloudDay, isAr)} (${Math.round(cloudVal)}%)`,
      Icon: Cloud,
      style: STYLE_CLOUD,
      iconColor: 'text-neutral-900',
      colStart2: true,
    });
  }

  return ins;
}

// ── Metric detail definitions for the drawer ───────────────────────────────

type MetricKey = 'uv' | 'rain' | 'gusts' | 'wind' | 'humidity' | 'pressure' | 'cloud';

interface MetricSeriesPoint { date: number; value: number; }

interface MetricDef {
  key: MetricKey;
  chipLabel: string;
  chipIcon: LucideIcon;
  banner: { label: string; style: ChipStyle; iconColor: string; Icon: LucideIcon };
  chart: 'bar' | 'line';
  series: MetricSeriesPoint[];
  format: (v: number) => string;
  unit: string;
  yAxisFmt: (v: number) => string;
  yMax?: number;
  yMin?: number;
  yStep?: number;
  /** Optional per-value bar colour (UV's graded colour scale). */
  barColor?: (v: number) => string;
  /** Tailwind text colour for value labels above bars / points. */
  valueColor?: (v: number) => string;
  /** Fixed line/point colour. */
  lineColor?: string;
  /** Dashed threshold reference line value, e.g. peak. */
  threshold?: number;
}

function uvBarColor(v: number): string {
  if (v >= 8) return 'bg-red-500';
  if (v >= 6) return 'bg-orange-500';
  if (v >= 3) return 'bg-amber-400';
  return 'bg-emerald-400';
}
function uvValueColor(v: number): string {
  if (v >= 8) return 'text-red-500';
  if (v >= 6) return 'text-orange-500';
  if (v >= 3) return 'text-amber-400';
  return 'text-emerald-400';
}

function buildMetricDefs(data: WeatherData, isAr: boolean): MetricDef[] {
  const daily = data.daily;
  const defs: MetricDef[] = [];
  if (!daily.length) return defs;

  // helper: max + day
  const peak = (sel: (d: DailyEntry) => number) => {
    let v = -Infinity, day = daily[0].date;
    for (const d of daily) { const x = sel(d); if (x > v) { v = x; day = d.date; } }
    return { value: v, day };
  };

  // ── UV ─────────────────────────────────────────────────────
  const uvSeries = daily.map(d => ({ date: d.date, value: d.uvIndexMax ?? 0 }));
  const uvPeak = peak(d => d.uvIndexMax ?? 0);
  if (uvPeak.value > 0) {
    defs.push({
      key: 'uv',
      chipLabel: isAr ? 'مؤشر UV' : 'UV index',
      chipIcon: Sun,
      banner: {
        label: isAr
          ? `مؤشر UV يصل إلى ${uvPeak.value.toFixed(1)} (${uvPeak.value >= 6 ? 'مرتفع' : 'متوسّط'}) ${weekdayLong(uvPeak.day, isAr)}`
          : `UV index up to ${uvPeak.value.toFixed(1)} (${uvPeak.value >= 6 ? 'high' : 'moderate'}) on ${weekdayLong(uvPeak.day, isAr)}`,
        style: STYLE_UV, iconColor: 'text-neutral-900', Icon: Sun,
      },
      chart: 'bar',
      series: uvSeries,
      format: v => v.toFixed(1),
      unit: '',
      yAxisFmt: v => (isAr ? ['منخفض', 'متوسّط', 'مرتفع', 'مرتفع جداً', 'متطرّف'] : ['Low','Medium','High','Very high','Extreme'])[Math.min(4, Math.max(0, Math.round(v)))],
      yMax: 11, yMin: 0,
      barColor: uvBarColor,
      valueColor: uvValueColor,
    });
  }

  // ── Precipitation ─────────────────────────────────────────
  const rainSeries = daily.map(d => ({ date: d.date, value: d.precipitationSum ?? 0 }));
  const totalRain = daily.reduce((s, d) => s + (d.precipitationSum ?? 0), 0);
  defs.push({
    key: 'rain',
    chipLabel: isAr ? 'الهطول' : 'Precipitation',
    chipIcon: Droplet,
    banner: {
      label: totalRain >= 0.5
        ? (isAr ? `${Math.round(totalRain)} مم أمطار متوقّعة` : `${Math.round(totalRain)} mm rain expected`)
        : (isAr ? 'لا أمطار متوقّعة' : 'No rain expected'),
      style: STYLE_RAIN, iconColor: 'text-neutral-900', Icon: Droplet,
    },
    chart: 'bar',
    series: rainSeries,
    format: v => `${v.toFixed(v < 10 ? 1 : 0)}`,
    unit: 'mm',
    yAxisFmt: v => `${Math.round(v)} mm`,
    yMin: 0,
    barColor: () => 'bg-sky-300',
    valueColor: () => 'text-foreground/75',
  });

  // ── Wind (line) ───────────────────────────────────────────
  const windSeries = daily.map(d => ({ date: d.date, value: d.windSpeedMax ?? 0 }));
  const windPeak = peak(d => d.windSpeedMax ?? 0);
  if (windPeak.value > 0) {
    const dir = compassDir(daily.find(d => d.date === windPeak.day)?.windDirectionDominant ?? 0, isAr);
    defs.push({
      key: 'wind',
      chipLabel: isAr ? 'الرياح (كم/س)' : 'Wind (km/h)',
      chipIcon: Wind,
      banner: {
        label: isAr
          ? `الرياح حتى ${Math.round(windPeak.value)} كم/س من ${dir} ${weekdayLong(windPeak.day, isAr)}`
          : `Wind speed up to ${Math.round(windPeak.value)} km/h from ${dir} on ${weekdayLong(windPeak.day, isAr)}`,
        style: STYLE_DARK, iconColor: 'text-violet-400', Icon: Wind,
      },
      chart: 'line',
      series: windSeries,
      format: v => `${Math.round(v)}`,
      unit: 'km/h',
      yAxisFmt: v => `${Math.round(v)}`,
      yMin: 0,
      lineColor: 'hsl(258 90% 80%)',
      threshold: windPeak.value,
      valueColor: () => 'text-foreground/85',
    });
  }

  // ── Gusts (line) ──────────────────────────────────────────
  const gustSeries = daily.map(d => ({ date: d.date, value: d.windGustsMax ?? 0 }));
  const gustPeak = peak(d => d.windGustsMax ?? 0);
  if (gustPeak.value > 0) {
    defs.push({
      key: 'gusts',
      chipLabel: isAr ? 'الهبّات (كم/س)' : 'Gusts (km/h)',
      chipIcon: Flag,
      banner: {
        label: isAr
          ? `هبّات حتى ${Math.round(gustPeak.value)} كم/س ${weekdayLong(gustPeak.day, isAr)}`
          : `Gusts up to ${Math.round(gustPeak.value)} km/h on ${weekdayLong(gustPeak.day, isAr)}`,
        style: STYLE_DARK, iconColor: 'text-emerald-400', Icon: Flag,
      },
      chart: 'line',
      series: gustSeries,
      format: v => `${Math.round(v)}`,
      unit: 'km/h',
      yAxisFmt: v => `${Math.round(v)}`,
      yMin: 0,
      lineColor: 'hsl(258 90% 80%)',
      threshold: gustPeak.value,
      valueColor: () => 'text-foreground/85',
    });
  }

  // ── Humidity (bar) ────────────────────────────────────────
  const humSeries = daily.map(d => ({ date: d.date, value: d.humidityMax ?? 0 }));
  const humPeak = peak(d => d.humidityMax ?? 0);
  if (humPeak.value > 0) {
    defs.push({
      key: 'humidity',
      chipLabel: isAr ? 'الرطوبة' : 'Humidity',
      chipIcon: Droplets,
      banner: {
        label: isAr
          ? `رطوبة عالية ${weekdayLong(humPeak.day, isAr)} حتى ${Math.round(humPeak.value)}٪`
          : `High humidity on ${weekdayLong(humPeak.day, isAr)} up to ${Math.round(humPeak.value)}%`,
        style: STYLE_DARK, iconColor: 'text-teal-400', Icon: Droplets,
      },
      chart: 'bar',
      series: humSeries,
      format: v => `${Math.round(v)}%`,
      unit: '%',
      yAxisFmt: v => `${Math.round(v)} %`,
      yMin: 0, yMax: 100, yStep: 20,
      barColor: () => 'bg-teal-400',
      valueColor: () => 'text-teal-300',
    });
  }

  // ── Pressure (line) ───────────────────────────────────────
  if (data.current.pressure) {
    // Open-Meteo daily doesn't carry pressure; use current as flat reference
    const pSeries = daily.map(d => ({ date: d.date, value: data.current.pressure }));
    defs.push({
      key: 'pressure',
      chipLabel: isAr ? 'الضغط (هـ.ب)' : 'Pressure (hPa)',
      chipIcon: Gauge,
      banner: {
        label: data.current.pressure >= 1023
          ? (isAr ? `ضغط مرتفع (${data.current.pressure} هـ.ب)` : `High air pressure (${data.current.pressure} hPa)`)
          : data.current.pressure <= 1005
            ? (isAr ? `ضغط منخفض (${data.current.pressure} هـ.ب)` : `Low air pressure (${data.current.pressure} hPa)`)
            : (isAr ? 'ضغط الهواء ضمن المعدّل' : 'Air pressure in normal range'),
        style: STYLE_DARK, iconColor: 'text-orange-300', Icon: Gauge,
      },
      chart: 'line',
      series: pSeries,
      format: v => `${Math.round(v)}`,
      unit: 'hPa',
      yAxisFmt: v => `${Math.round(v)}`,
      lineColor: 'hsl(28 90% 70%)',
      valueColor: () => 'text-foreground/85',
    });
  }

  // ── Cloudiness (bar) ──────────────────────────────────────
  const cloudSeries = daily.map(d => ({ date: d.date, value: d.cloudCoverMean ?? 0 }));
  const cloudPeak = peak(d => d.cloudCoverMean ?? 0);
  if (cloudPeak.value > 0) {
    defs.push({
      key: 'cloud',
      chipLabel: isAr ? 'الغيوم' : 'Cloudiness',
      chipIcon: Cloud,
      banner: {
        label: isAr
          ? `غائم بكثافة ${weekdayLong(cloudPeak.day, isAr)} حتى ${Math.round(cloudPeak.value)}٪`
          : `Heavily cloudy on ${weekdayLong(cloudPeak.day, isAr)} with up to ${Math.round(cloudPeak.value)}% coverage`,
        style: STYLE_CLOUD, iconColor: 'text-neutral-900', Icon: Cloud,
      },
      chart: 'bar',
      series: cloudSeries,
      format: v => `${Math.round(v)}%`,
      unit: '%',
      yAxisFmt: v => `${Math.round(v)} %`,
      yMin: 0, yMax: 100, yStep: 20,
      barColor: () => 'bg-foreground/30',
      valueColor: () => 'text-foreground/70',
    });
  }

  return defs;
}

// ── Bar / line chart renderers ─────────────────────────────────────────────

function niceMax(raw: number, fixedMax?: number, step = 10): number {
  if (fixedMax != null) return fixedMax;
  if (raw <= 0) return step;
  return Math.ceil(raw / step) * step;
}

function BarChart({ def, isAr }: { def: MetricDef; isAr: boolean }) {
  const max = niceMax(Math.max(...def.series.map(p => p.value), 1), def.yMax, def.yStep ?? 10);
  const step = def.yStep ?? Math.max(1, Math.round(max / 5));
  const ticks: number[] = [];
  for (let v = max; v >= 0; v -= step) ticks.push(v);
  return (
    <div className="relative pl-12 pr-2 pt-4 pb-7 h-[260px]" dir="ltr">
      {/* grid */}
      <div className="absolute inset-y-4 left-12 right-2 bottom-7 top-4 flex flex-col justify-between pointer-events-none">
        {ticks.map((t, i) => (
          <div key={i} className="flex items-center gap-2">
            <span className="text-[10px] text-muted-foreground/70 -ml-12 w-10 text-right tabular-nums">
              {def.yAxisFmt(t)}
            </span>
            <div className="flex-1 border-t border-border/30" />
          </div>
        ))}
      </div>
      {/* bars */}
      <div className="relative h-full flex items-end gap-1.5">
        {def.series.map(p => {
          const h = Math.max(2, (p.value / max) * 100);
          const showVal = p.value > 0 || def.key === 'humidity' || def.key === 'cloud';
          return (
            <div key={p.date} className="flex-1 flex flex-col items-center justify-end h-full relative">
              {showVal && (
                <span className={`absolute text-[10.5px] font-medium tabular-nums ${def.valueColor?.(p.value) ?? 'text-foreground/75'}`}
                      style={{ bottom: `calc(${h}% + 4px)` }}>
                  {def.format(p.value)}
                </span>
              )}
              <div
                className={`w-full max-w-[26px] rounded-t-md ${def.barColor?.(p.value) ?? 'bg-primary'}`}
                style={{ height: `${h}%` }}
              />
              <span className="absolute -bottom-6 text-[10.5px] text-muted-foreground">
                {weekdayShort(p.date, isAr)}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function LineChart({ def, isAr }: { def: MetricDef; isAr: boolean }) {
  const vals = def.series.map(p => p.value);
  const rawMax = Math.max(...vals, 1);
  const rawMin = Math.min(...vals, 0);
  const max = def.yMax ?? Math.ceil(rawMax / 10) * 10;
  const min = def.yMin ?? Math.floor(rawMin / 10) * 10;
  const step = def.yStep ?? Math.max(1, Math.round((max - min) / 5));
  const ticks: number[] = [];
  for (let v = max; v >= min; v -= step) ticks.push(v);
  const W = 320, H = 200;
  const padX = 16;
  const innerW = W - padX * 2;
  const innerH = H;
  const n = def.series.length;
  const xFor = (i: number) => padX + (n <= 1 ? innerW / 2 : (i * innerW) / (n - 1));
  const yFor = (v: number) => ((max - v) / (max - min)) * innerH;
  const path = def.series.map((p, i) => `${i === 0 ? 'M' : 'L'} ${xFor(i)} ${yFor(p.value)}`).join(' ');
  const stroke = def.lineColor ?? 'hsl(var(--primary))';
  return (
    <div className="relative pl-12 pr-2 pt-4 pb-7 h-[260px]" dir="ltr">
      <div className="absolute inset-y-4 left-12 right-2 bottom-7 top-4 flex flex-col justify-between pointer-events-none">
        {ticks.map((t, i) => (
          <div key={i} className="flex items-center gap-2">
            <span className="text-[10px] text-muted-foreground/70 -ml-12 w-10 text-right tabular-nums">
              {def.yAxisFmt(t)}
            </span>
            <div className="flex-1 border-t border-border/30" />
          </div>
        ))}
      </div>
      <div className="relative h-full">
        <svg viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none" className="w-full h-full overflow-visible">
          {def.threshold != null && (
            <line
              x1={padX} x2={W - padX}
              y1={yFor(def.threshold)} y2={yFor(def.threshold)}
              stroke={stroke} strokeDasharray="4 4" strokeOpacity="0.5" strokeWidth={1}
            />
          )}
          <path d={path} fill="none" stroke={stroke} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
          {def.series.map((p, i) => (
            <g key={p.date}>
              <circle cx={xFor(i)} cy={yFor(p.value)} r={5} fill="hsl(var(--background))" stroke={stroke} strokeWidth={2} />
              <text x={xFor(i)} y={yFor(p.value) - 10} textAnchor="middle" className="fill-foreground" fontSize="11" fontWeight="500">
                {def.format(p.value)}
              </text>
            </g>
          ))}
        </svg>
        <div className="absolute left-0 right-0 -bottom-6 flex justify-between px-3">
          {def.series.map(p => (
            <span key={p.date} className="text-[10.5px] text-muted-foreground flex-1 text-center">
              {weekdayShort(p.date, isAr)}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}

// ── Detail drawer ──────────────────────────────────────────────────────────

function MetricDetailDrawer({
  open, onOpenChange, defs, activeKey, setActiveKey, city, isAr,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  defs: MetricDef[];
  activeKey: MetricKey | null;
  setActiveKey: (k: MetricKey) => void;
  city: string | null;
  isAr: boolean;
}) {
  const def = defs.find(d => d.key === activeKey) ?? defs[0];
  if (!def) return null;
  return (
    <Drawer open={open} onOpenChange={onOpenChange}>
      <DrawerContent className="max-h-[92vh]">
        <VisuallyHidden.Root>
          <DrawerTitle>{def.chipLabel}</DrawerTitle>
        </VisuallyHidden.Root>
        <div className="px-4 pb-6 overflow-y-auto">
          <header className="pt-1 pb-4">
            <h2 className="text-[26px] font-semibold text-foreground leading-tight">
              {isAr ? 'الأيام السبعة القادمة' : 'Next 7 days'}
            </h2>
            <div className="flex items-center justify-between gap-2 mt-1">
              <p className="text-[14px] text-primary truncate">
                {city || (isAr ? 'موقعك' : 'Your location')}
              </p>
              <MapPin className="w-5 h-5 text-primary shrink-0" />
            </div>
          </header>

          {/* Chip selector */}
          <div className="overflow-x-auto no-scrollbar -mx-4 px-4 mb-4">
            <div className="flex items-center gap-2 min-w-fit">
              {defs.map(d => {
                const active = d.key === def.key;
                return (
                  <button
                    key={d.key}
                    type="button"
                    onClick={() => setActiveKey(d.key)}
                    className={`inline-flex items-center gap-1.5 h-9 px-3 rounded-xl border text-[12.5px] font-medium whitespace-nowrap transition-colors ${
                      active
                        ? 'bg-indigo-400/20 border-indigo-300/40 text-foreground'
                        : 'bg-transparent border-border/50 text-muted-foreground'
                    }`}
                  >
                    <span>{d.chipLabel}</span>
                    <d.chipIcon className={`w-4 h-4 ${active ? 'text-indigo-300' : 'text-muted-foreground'}`} strokeWidth={1.8} />
                  </button>
                );
              })}
            </div>
          </div>

          {/* Banner */}
          <div className={`flex items-center justify-between gap-2 rounded-3xl border px-4 py-3.5 mb-4 ${def.banner.style.card}`}>
            <span className={`text-[13.5px] font-medium leading-snug flex-1 ${def.banner.style.text}`}>
              {def.banner.label}
            </span>
            <def.banner.Icon className={`w-5 h-5 shrink-0 ${def.banner.iconColor}`} strokeWidth={1.8} />
          </div>

          {/* Chart card */}
          <div className="rounded-3xl bg-foreground/[0.04] border border-border/30 p-3">
            {def.chart === 'bar'
              ? <BarChart def={def} isAr={isAr} />
              : <LineChart def={def} isAr={isAr} />}
          </div>
        </div>
      </DrawerContent>
    </Drawer>
  );
}

function NextSevenDays({ data, isAr }: { data: WeatherData; isAr: boolean }) {
  const insights = useMemo(() => buildInsights(data, isAr), [data, isAr]);
  const defs = useMemo(() => buildMetricDefs(data, isAr), [data, isAr]);
  const [open, setOpen] = useState(false);
  const [activeKey, setActiveKey] = useState<MetricKey | null>(null);

  if (!insights.length) return null;

  // Map insight chip key → metric key (same vocab).
  const openMetric = (k: string) => {
    const has = defs.find(d => d.key === (k as MetricKey));
    setActiveKey((has?.key ?? defs[0]?.key) ?? null);
    setOpen(true);
  };

  return (
    <section className="pt-5 mt-2 border-t border-border/40">
      <h2 className="text-[22px] font-semibold text-foreground mb-4">
        {isAr ? 'الأيام السبعة القادمة' : 'Next 7 days'}
      </h2>
      <div className="grid grid-cols-2 gap-3">
        {insights.map(i => (
          <button
            type="button"
            key={i.key}
            onClick={() => openMetric(i.key)}
            className={`flex items-start justify-between gap-2 rounded-3xl border px-4 py-3.5 text-start active:scale-[0.98] transition-transform ${i.style.card} ${i.colStart2 ? 'col-start-2' : ''}`}
          >
            <span className={`text-[13.5px] font-medium leading-snug flex-1 ${i.style.text}`}>
              {i.label}
            </span>
            <i.Icon className={`w-5 h-5 mt-0.5 shrink-0 ${i.iconColor}`} strokeWidth={1.8} />
          </button>
        ))}
      </div>

      <MetricDetailDrawer
        open={open}
        onOpenChange={setOpen}
        defs={defs}
        activeKey={activeKey}
        setActiveKey={setActiveKey}
        city={data.city}
        isAr={isAr}
      />
    </section>
  );
}

// ── Sun & Moon ─────────────────────────────────────────────────────────────

function CollapsibleRow({ open, onToggle, label, icon: Icon, children }: {
  open: boolean; onToggle: () => void; label: string; icon: LucideIcon; children: React.ReactNode;
}) {
  return (
    <div className="rounded-2xl border border-border/40 bg-card overflow-hidden">
      <button
        type="button"
        onClick={onToggle}
        aria-expanded={open}
        className="w-full flex items-center justify-between gap-3 px-4 py-4 text-start"
      >
        <span className="inline-flex items-center gap-3 flex-1 min-w-0">
          <ChevronRight
            className={`w-4 h-4 text-muted-foreground transition-transform ${open ? 'rotate-90' : 'rtl:rotate-180'}`}
          />
          <span className="text-[16px] font-medium text-foreground">{label}</span>
        </span>
        <span className="w-10 h-10 rounded-full bg-indigo-200 inline-flex items-center justify-center shrink-0">
          <Icon className="w-[18px] h-[18px] text-indigo-950" strokeWidth={2} />
        </span>
      </button>
      {open && <div className="px-4 pb-4 pt-1">{children}</div>}
    </div>
  );
}

function SunriseSunsetBody({ today, isAr }: { today: DailyEntry; isAr: boolean }) {
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
    <div className="space-y-3" dir="ltr">
      <div className="grid grid-cols-2 gap-3">
        <div className="flex items-center gap-2.5">
          <Sunrise className="w-5 h-5 text-amber-400" />
          <div>
            <p className="text-[10.5px] text-muted-foreground">{isAr ? 'الشروق' : 'Sunrise'}</p>
            <p className="text-[14px] font-semibold text-foreground tabular-nums">
              {formatTimeFromIso(today.sunrise)}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2.5">
          <Sunset className="w-5 h-5 text-orange-500" />
          <div>
            <p className="text-[10.5px] text-muted-foreground">{isAr ? 'الغروب' : 'Sunset'}</p>
            <p className="text-[14px] font-semibold text-foreground tabular-nums">
              {formatTimeFromIso(today.sunset)}
            </p>
          </div>
        </div>
      </div>
      <div className="h-1.5 rounded-full bg-foreground/[0.08] overflow-hidden">
        <div
          className="h-full rounded-full bg-gradient-to-r from-amber-400 to-orange-400 transition-all"
          style={{ width: `${progress * 100}%` }}
        />
      </div>
      <p className="text-[11px] text-muted-foreground">
        <span className="tabular-nums">{hh}:{mm}</span>{' '}
        {isAr ? 'متبقّية حتى الغروب' : 'remaining until sunset'}
      </p>
    </div>
  );
}

function MoonBody({ isAr }: { isAr: boolean }) {
  const m = getMoonPhase();
  const pct = Math.round(m.illumination * 100);
  const k = Math.cos(2 * Math.PI * m.phase);
  const offset = k * 22;
  return (
    <div className="flex items-center gap-4">
      <div className="w-14 h-14 rounded-full bg-slate-900 border border-border/40 relative overflow-hidden shrink-0" aria-hidden>
        <div className="absolute inset-0 rounded-full bg-amber-100" />
        <div
          className="absolute inset-0 rounded-full bg-slate-900"
          style={{ transform: `translateX(${offset}px)` }}
        />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-[15px] font-semibold text-foreground">{m.name[isAr ? 'ar' : 'de']}</p>
        <p className="text-[11.5px] text-muted-foreground mt-0.5">
          {isAr
            ? `${pct}٪ مضاءة · ${m.waxing ? 'متزايد' : 'متناقص'}`
            : `${pct}% illuminated · ${m.waxing ? 'waxing' : 'waning'}`}
        </p>
      </div>
    </div>
  );
}

function SunMoon({ data, isAr }: { data: WeatherData; isAr: boolean }) {
  const today = data.daily[0];
  const [openSun, setOpenSun] = useState(false);
  const [openMoon, setOpenMoon] = useState(false);
  return (
    <section className="pt-7">
      <h2 className="text-[22px] font-semibold text-foreground mb-4">
        {isAr ? 'الشمس والقمر' : 'Sun & Moon'}
      </h2>
      <div className="space-y-3">
        {today?.sunrise && today?.sunset && (
          <CollapsibleRow
            open={openSun}
            onToggle={() => setOpenSun(o => !o)}
            label={isAr ? 'الشروق والغروب' : 'Sunrise & Sunset'}
            icon={Contrast}
          >
            <SunriseSunsetBody today={today} isAr={isAr} />
          </CollapsibleRow>
        )}
        <CollapsibleRow
          open={openMoon}
          onToggle={() => setOpenMoon(o => !o)}
          label={isAr ? 'أطوار القمر' : 'Moon Phases'}
          icon={Moon}
        >
          <MoonBody isAr={isAr} />
        </CollapsibleRow>
      </div>
    </section>
  );
}

// ── OWM API-key prompt (only surfaced when the user opted into OWM) ────────

function ApiKeyPrompt({ isAr, hasExistingKey }: { isAr: boolean; hasExistingKey: boolean }) {
  const [value, setValue] = useState('');
  return (
    <section className="rounded-2xl border border-amber-500/30 bg-amber-500/5 p-4">
      <div className="flex items-start gap-2.5 mb-3">
        <Key className="w-4 h-4 mt-0.5 text-amber-400 shrink-0" />
        <div className="min-w-0">
          <h2 className="text-[14px] font-semibold text-foreground">
            {isAr ? 'مفتاح OpenWeatherMap' : 'OpenWeatherMap key'}
          </h2>
          <p className="mt-1 text-[11.5px] text-muted-foreground leading-relaxed">
            {isAr ? 'يخزَّن محلياً على جهازك فقط.' : 'Stored locally on your device only.'}
          </p>
        </div>
      </div>
      <div className="flex items-stretch gap-2">
        <input
          type="text"
          value={value}
          onChange={e => setValue(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter') { writeOwmApiKey(value.trim()); setValue(''); } }}
          placeholder={hasExistingKey ? (isAr ? 'تحديث…' : 'Update …') : 'API key'}
          dir="ltr"
          className="flex-1 min-w-0 h-10 rounded-xl bg-background border border-border/50 px-3 text-[16px] font-mono text-foreground"
        />
        <button
          type="button"
          onClick={() => { writeOwmApiKey(value.trim()); setValue(''); }}
          disabled={!value.trim()}
          className="px-3 h-10 rounded-xl bg-primary text-primary-foreground text-[12.5px] font-semibold disabled:opacity-50"
        >
          {isAr ? 'حفظ' : 'Save'}
        </button>
      </div>
      <div className="mt-3 flex items-center gap-3 text-[11px]">
        <a href="https://home.openweathermap.org/users/sign_up" target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-primary hover:underline">
          <ExternalLink className="w-3 h-3" />
          {isAr ? 'تسجيل مجاني' : 'Sign up free'}
        </a>
        <button type="button" onClick={() => writeProviderPref('open-meteo')} className="ms-auto text-muted-foreground hover:text-foreground">
          {isAr ? 'العودة إلى Open-Meteo' : 'Back to Open-Meteo'}
        </button>
      </div>
    </section>
  );
}

// ── Loading / empty / error states ─────────────────────────────────────────

function WeatherSkeleton() {
  return (
    <div className="space-y-4">
      <div className="h-14 rounded-2xl bg-muted/30 animate-pulse" />
      <div className="h-52 rounded-2xl bg-muted/25 animate-pulse" />
      <div className="h-40 rounded-2xl bg-muted/25 animate-pulse" />
      <div className="h-36 rounded-2xl bg-muted/25 animate-pulse" />
    </div>
  );
}

function NoLocationCard({ isAr }: { isAr: boolean }) {
  return (
    <div className="rounded-2xl bg-card border border-border/40 p-6 text-center">
      <MapPin className="w-8 h-8 mx-auto mb-3 text-muted-foreground" />
      <h2 className="text-[14px] font-semibold text-foreground mb-1.5">
        {isAr ? 'يحتاج إلى موقعك' : 'Location needed'}
      </h2>
      <p className="text-[12px] text-muted-foreground mb-4 leading-relaxed">
        {isAr
          ? 'لتقديم طقسٍ دقيق، نحتاج إلى الوصول لموقعك الحالي.'
          : 'We need access to your location for an accurate forecast.'}
      </p>
      <button
        type="button"
        onClick={() => requestDeviceLocation()}
        className="inline-flex items-center justify-center gap-1.5 px-4 h-9 rounded-xl bg-primary text-primary-foreground text-[12.5px] font-semibold"
      >
        <MapPin className="w-3.5 h-3.5" />
        {isAr ? 'مشاركة الموقع' : 'Share location'}
      </button>
    </div>
  );
}

function ErrorCard({ isAr, error, onRetry }: { isAr: boolean; error: string | null; onRetry: () => void }) {
  return (
    <div className="rounded-2xl bg-card border border-border/40 p-6 text-center">
      <AlertCircle className="w-8 h-8 mx-auto mb-3 text-destructive" />
      <h2 className="text-[14px] font-semibold text-foreground mb-1.5">
        {isAr ? 'تعذّر جلب الطقس' : 'Weather unavailable'}
      </h2>
      <p className="text-[12px] text-muted-foreground mb-4 leading-relaxed">
        {error || (isAr ? 'تأكّد من اتصالك.' : 'Check your connection.')}
      </p>
      <button type="button" onClick={onRetry} className="inline-flex items-center gap-1.5 px-4 h-9 rounded-xl bg-foreground/[0.08] text-foreground text-[12.5px] font-semibold">
        <RefreshCw className="w-3.5 h-3.5" />
        {isAr ? 'إعادة المحاولة' : 'Retry'}
      </button>
    </div>
  );
}

// ── Page ────────────────────────────────────────────────────────────────────

export default function WeatherPage() {
  const { language } = useApp();
  const isAr = language === 'ar';
  const dataLang: 'ar' | 'de' = isAr ? 'ar' : 'de';
  const { location, status: locStatus } = useDeviceLocation();
  const { data, status, error, needsApiKey, providerId, refresh } = useWeatherData(dataLang);

  const [hasExistingKey, setHasExistingKey] = useState(() => !!readOwmApiKey());
  useEffect(() => {
    const sync = () => setHasExistingKey(!!readOwmApiKey());
    sync();
    window.addEventListener('storage', sync);
    return () => window.removeEventListener('storage', sync);
  }, [providerId, needsApiKey]);

  const handleShare = useCallback(async () => {
    if (!data) return;
    const c = data.current;
    const place = data.city ?? (isAr ? 'موقعي' : 'my location');
    const cond = describeWeatherCode(c.weatherCode, dataLang);
    const text = isAr
      ? `الطقس في ${place}: ${c.temperature}° (${cond})، الإحساس ${c.apparentTemperature}°، الرطوبة ${c.humidity}٪، الرياح ${c.windSpeed} كم/س.`
      : `Weather in ${place}: ${c.temperature}° (${cond}), feels like ${c.apparentTemperature}°, humidity ${c.humidity}%, wind ${c.windSpeed} km/h.`;
    try {
      if (typeof navigator !== 'undefined' && navigator.share) {
        await navigator.share({ title: isAr ? 'الطقس' : 'Weather', text });
      } else if (typeof navigator !== 'undefined' && navigator.clipboard) {
        await navigator.clipboard.writeText(text);
      }
    } catch { /* user cancelled or unsupported — silent */ }
  }, [data, isAr, dataLang]);

  const handleLocate = useCallback(() => { void requestDeviceLocation(); }, []);

  const showNoLocation =
    !location && (locStatus === 'idle' || locStatus === 'denied' || locStatus === 'unavailable');

  const attribution = listProviders().find(p => p.id === providerId)?.attribution
    ?? { label: 'Open-Meteo', url: 'https://open-meteo.com/' };

  return (
    <div className="min-h-screen bg-background pb-28">
      <SEO
        title={isAr ? 'الطقس — SmartHub' : 'Weather — SmartHub'}
        description={isAr
          ? 'توقّعات الطقس لسبعة أيام، الشروق والغروب وأطوار القمر.'
          : '7-day weather forecast, sunrise/sunset and moon phases.'}
        path="/weather"
      />

      <div className="max-w-lg mx-auto px-4">
        {showNoLocation ? (
          <div className="pt-6"><NoLocationCard isAr={isAr} /></div>
        ) : needsApiKey ? (
          <div className="pt-6"><ApiKeyPrompt isAr={isAr} hasExistingKey={hasExistingKey} /></div>
        ) : status === 'loading' && !data ? (
          <div className="pt-6"><WeatherSkeleton /></div>
        ) : status === 'error' && !data ? (
          <div className="pt-6"><ErrorCard isAr={isAr} error={error} onRetry={refresh} /></div>
        ) : data ? (
          <>
            <ForecastHeader
              isAr={isAr}
              city={data.city}
              onShare={handleShare}
              onLocate={handleLocate}
            />
            <ForecastBars daily={data.daily} weekRange={data.weekRange} isAr={isAr} />
            <NextSevenDays data={data} isAr={isAr} />
            <SunMoon data={data} isAr={isAr} />

            <p className="text-center text-[10px] text-muted-foreground/60 pt-8 pb-2">
              {isAr ? 'البيانات من ' : 'Weather data by '}
              <a href={attribution.url} target="_blank" rel="noopener noreferrer" className="underline hover:text-muted-foreground">
                {attribution.label}
              </a>
            </p>
          </>
        ) : (
          <div className="pt-6"><WeatherSkeleton /></div>
        )}
      </div>
    </div>
  );
}
