import React, { useMemo, useState, useEffect, useCallback } from 'react';
import {
  Cloud, Sun, CloudRain, CloudSnow, CloudLightning, CloudDrizzle, CloudFog,
  CloudHail, CloudSun, MoonStar, Moon, Droplet, Droplets, Wind, Flag, Gauge,
  Sunrise, Sunset, MapPin, AlertCircle, RefreshCw, Share2, CalendarDays, ChevronRight,
  Key, ExternalLink, Contrast, type LucideIcon,
} from 'lucide-react';
import SEO from '@/components/SEO';
import { Drawer, DrawerContent, DrawerTitle } from '@/components/ui/drawer';
import * as VisuallyHidden from '@radix-ui/react-visually-hidden';
import { useApp } from '@/contexts/AppContext';
import { useDeviceLocation, requestDeviceLocation } from '@/hooks/useDeviceLocation';
import { useWeatherData, type DailyEntry, type WeatherData } from '@/hooks/useWeatherData';
import {
  listProviders, readOwmApiKey, writeOwmApiKey, writeProviderPref,
} from '@/lib/weather';
import { getMoonPhase } from '@/lib/weather/moonPhase';
import { describeWeatherCode } from '@/lib/weather/describe';

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
        <div className="w-12 h-12 rounded-2xl bg-indigo-400/15 border border-indigo-300/20 inline-flex items-center justify-center shrink-0">
          <CalendarDays className="w-5 h-5 text-indigo-200/90" />
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

function NextSevenDays({ data, isAr }: { data: WeatherData; isAr: boolean }) {
  const insights = useMemo(() => buildInsights(data, isAr), [data, isAr]);
  if (!insights.length) return null;
  return (
    <section className="pt-5 mt-2 border-t border-border/40">
      <h2 className="text-[22px] font-semibold text-foreground mb-4">
        {isAr ? 'الأيام السبعة القادمة' : 'Next 7 days'}
      </h2>
      <div className="grid grid-cols-2 gap-3">
        {insights.map(i => (
          <div
            key={i.key}
            className={`flex items-start justify-between gap-2 rounded-3xl border px-4 py-3.5 ${i.style.card} ${i.colStart2 ? 'col-start-2' : ''}`}
          >
            <span className={`text-[13.5px] font-medium leading-snug flex-1 ${i.style.text}`}>
              {i.label}
            </span>
            <i.Icon className={`w-5 h-5 mt-0.5 shrink-0 ${i.iconColor}`} strokeWidth={1.8} />
          </div>
        ))}
      </div>
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
