import React, { useMemo, useState, useEffect } from 'react';
import {
  Cloud, Sun, CloudRain, CloudSnow, CloudLightning, CloudDrizzle, Cloudy, CloudFog,
  Droplets, Wind, Gauge, Sunrise, Sunset, MapPin, AlertCircle, CloudHail, RefreshCw,
  Share2, CalendarDays, ChevronDown, Key, ExternalLink, Check, ThermometerSun, MoonStar,
} from 'lucide-react';
import SEO from '@/components/SEO';
import { useApp } from '@/contexts/AppContext';
import { useDeviceLocation, requestDeviceLocation } from '@/hooks/useDeviceLocation';
import { useWeatherData, type DailyEntry, type WeatherData } from '@/hooks/useWeatherData';
import {
  listProviders, readOwmApiKey, writeOwmApiKey, writeProviderPref, type ProviderId,
} from '@/lib/weather';
import { getMoonPhase } from '@/lib/weather/moonPhase';

/**
 * /weather — Forecast view designed to mirror the user's reference exactly:
 * compact header (share + calendar tile + "Forecast" + city + pin), a row
 * of vertical-capsule temperature bars with weather glyphs & precipitation,
 * a "Next 7 days" grid of colored insight chips, and a "Sun & Moon" block
 * with two expandable rows (Sunrise & Sunset + Moon Phases).
 */

// ── Code → icon ─────────────────────────────────────────────────────────

const ICON_BY_CODE = (code: number, isDay = true) => {
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
  return Sun;
};

const isCloudyCode = (code: number) =>
  code === 2 || code === 3 || code === 45 || code === 48;

// ── Formatting ──────────────────────────────────────────────────────────

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

// ── Header ──────────────────────────────────────────────────────────────

function ForecastHeader({ lang, city, lastUpdatedLabel }: {
  lang: 'ar' | 'de'; city: string | null; lastUpdatedLabel: string | null;
}) {
  return (
    <header className="pt-2 pb-1">
      <div className="flex items-center justify-start mb-5">
        <button
          type="button"
          aria-label={lang === 'ar' ? 'مشاركة' : 'Teilen'}
          className="w-9 h-9 -ms-1 inline-flex items-center justify-center text-foreground/80"
        >
          <Share2 className="w-4 h-4" />
        </button>
      </div>

      <div className="flex items-center gap-3">
        <div className="w-12 h-12 rounded-2xl bg-foreground/[0.08] border border-border/40 inline-flex items-center justify-center shrink-0">
          <CalendarDays className="w-5 h-5 text-foreground/85" />
        </div>
        <div className="flex-1 min-w-0">
          <h1 className="text-[28px] font-semibold text-foreground leading-tight">
            {lang === 'ar' ? 'التوقّع' : 'Forecast'}
          </h1>
          <p className="text-[14px] text-primary truncate">
            {city || (lang === 'ar' ? 'موقعك' : 'Standort')}
          </p>
        </div>
        <button
          type="button"
          aria-label={lang === 'ar' ? 'الموقع' : 'Standort'}
          className="w-9 h-9 inline-flex items-center justify-center text-primary"
        >
          <MapPin className="w-5 h-5" />
        </button>
      </div>

      {lastUpdatedLabel && (
        <p className="text-[10.5px] text-muted-foreground mt-2 ms-15 ps-15" style={{ paddingInlineStart: 60 }}>
          {lastUpdatedLabel}
        </p>
      )}
    </header>
  );
}

// ── Forecast bars ───────────────────────────────────────────────────────

function ForecastBars({ daily, weekRange, lang }: {
  daily: DailyEntry[]; weekRange: { min: number; max: number }; lang: 'ar' | 'de';
}) {
  if (!daily.length) return null;
  const span = Math.max(1, weekRange.max - weekRange.min);
  const BAR_PX = 150;
  const BAR_W = 14;

  return (
    <section className="pt-2 pb-6">
      <div className="overflow-x-auto no-scrollbar -mx-4 px-4" dir="ltr">
        <div className="flex items-stretch gap-3 min-w-fit">
          {daily.map((d) => {
            const Icon = ICON_BY_CODE(d.weatherCode, true);
            const topPct    = (weekRange.max - d.tempMax) / span;
            const bottomPct = (d.tempMin - weekRange.min) / span;
            const top    = topPct    * (BAR_PX - 14);
            const bottom = bottomPct * (BAR_PX - 14);
            const iconCloudy = isCloudyCode(d.weatherCode);
            return (
              <div key={d.date} className="flex flex-col items-center min-w-[44px]">
                <span className="text-[11.5px] font-medium text-foreground/85 leading-tight">
                  {dayShort(d.date, lang)}
                </span>
                <span className="text-[10px] text-muted-foreground mb-3">
                  {dateShort(d.date)}
                </span>

                <span className="text-[13px] font-semibold text-rose-400 mb-1 tabular-nums">
                  {Math.round(d.tempMax)}°
                </span>

                <div className="relative" style={{ width: BAR_W, height: BAR_PX }}>
                  <div
                    className="absolute left-0 right-0 rounded-full bg-foreground/30"
                    style={{ top, bottom }}
                  />
                </div>

                <span className="text-[13px] font-semibold text-sky-400 mt-1 tabular-nums">
                  {Math.round(d.tempMin)}°
                </span>

                <Icon className={`w-6 h-6 mt-4 ${iconCloudy ? 'text-foreground/55' : 'text-amber-400'}`} strokeWidth={1.6} />
                <span className="text-[10.5px] text-muted-foreground mt-1 tabular-nums">
                  {d.precipitationProbabilityMax ?? 0}%
                </span>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}

// ── Insight pills ───────────────────────────────────────────────────────

type Tone = 'neutral' | 'warm' | 'hot' | 'cool';
const toneClasses: Record<Tone, string> = {
  neutral: 'bg-foreground/[0.06] text-foreground/90 border-border/30',
  warm:    'bg-amber-200/15 text-amber-100 border-amber-300/20',
  hot:     'bg-orange-500/90 text-white border-transparent shadow-sm',
  cool:    'bg-foreground/[0.06] text-foreground/90 border-border/30',
};

interface Insight {
  key: string;
  text: string;
  icon: typeof Wind;
  tone: Tone;
}

function buildInsights(data: WeatherData, lang: 'ar' | 'de'): Insight[] {
  const ins: Insight[] = [];
  const daily = data.daily;
  const c = data.current;

  // UV
  let maxUv = 0, uvDayMs = 0;
  for (const d of daily) {
    if ((d.uvIndexMax ?? 0) > maxUv) { maxUv = d.uvIndexMax ?? 0; uvDayMs = d.date; }
  }
  if (maxUv > 0) {
    const dayName = uvDayMs ? dayShort(uvDayMs, lang) : '';
    const isHigh = maxUv >= 6;
    ins.push({
      key: 'uv',
      text: lang === 'ar'
        ? `${isHigh ? 'مؤشر UV مرتفع' : 'مؤشر UV'} (${maxUv.toFixed(1)}) ${dayName}`
        : `${isHigh ? 'Hoher UV-Index' : 'UV-Index'} (${maxUv.toFixed(1)}) ${dayName}`,
      icon: ThermometerSun,
      tone: isHigh ? 'hot' : 'warm',
    });
  }

  // Rain
  const totalRain = daily.reduce((s, d) => s + (d.precipitationSum ?? 0), 0);
  if (totalRain < 0.5) {
    ins.push({
      key: 'rain',
      text: lang === 'ar' ? 'لا أمطار متوقّعة' : 'Kein Regen erwartet',
      icon: Droplets,
      tone: 'cool',
    });
  } else {
    let maxDay = daily[0];
    for (const d of daily) if ((d.precipitationSum ?? 0) > (maxDay.precipitationSum ?? 0)) maxDay = d;
    ins.push({
      key: 'rain',
      text: lang === 'ar'
        ? `أمطار ${(maxDay.precipitationSum ?? 0).toFixed(1)} مم ${dayShort(maxDay.date, lang)}`
        : `${(maxDay.precipitationSum ?? 0).toFixed(1)} mm Regen ${dayShort(maxDay.date, lang)}`,
      icon: Droplets,
      tone: 'cool',
    });
  }

  // Wind
  let maxWindDay = daily[0];
  for (const d of daily) if ((d.windSpeedMax ?? 0) > (maxWindDay.windSpeedMax ?? 0)) maxWindDay = d;
  if (maxWindDay && maxWindDay.windSpeedMax) {
    const dir = compassDir(maxWindDay.windDirectionDominant ?? 0, lang);
    ins.push({
      key: 'wind',
      text: lang === 'ar'
        ? `${Math.round(maxWindDay.windSpeedMax)} كم/س رياح ${dayShort(maxWindDay.date, lang)} (${dir})`
        : `${Math.round(maxWindDay.windSpeedMax)} km/h Wind ${dayShort(maxWindDay.date, lang)} (${dir})`,
      icon: Wind,
      tone: 'neutral',
    });
  }

  // Gusts — derived from current windGusts; if missing, skip
  if (c.windGusts && c.windGusts > 5) {
    ins.push({
      key: 'gusts',
      text: lang === 'ar'
        ? `${Math.round(c.windGusts)} كم/س عواصف`
        : `${Math.round(c.windGusts)} km/h Böen`,
      icon: Wind,
      tone: 'neutral',
    });
  }

  // Pressure
  if (c.pressure) {
    const high = c.pressure >= 1020;
    ins.push({
      key: 'pressure',
      text: lang === 'ar'
        ? `${high ? 'ضغط مرتفع' : 'الضغط'} (${Math.round(c.pressure)} هـ.ب)`
        : `${high ? 'Hoher Luftdruck' : 'Luftdruck'} (${Math.round(c.pressure)} hPa)`,
      icon: Gauge,
      tone: 'warm',
    });
  }

  return ins;
}

function NextSevenDays({ data, lang }: { data: WeatherData; lang: 'ar' | 'de' }) {
  const insights = useMemo(() => buildInsights(data, lang), [data, lang]);
  if (!insights.length) return null;
  return (
    <section className="pt-5 border-t border-border/30">
      <h2 className="text-[18px] font-semibold text-foreground mb-3">
        {lang === 'ar' ? 'الأيام السبعة القادمة' : 'Next 7 days'}
      </h2>
      <div className="grid grid-cols-2 gap-2.5">
        {insights.map(i => (
          <div
            key={i.key}
            className={`flex items-start justify-between gap-2 rounded-2xl border px-3.5 py-3 ${toneClasses[i.tone]}`}
          >
            <span className="text-[12.5px] font-medium leading-snug flex-1">{i.text}</span>
            <i.icon className="w-4 h-4 mt-0.5 shrink-0 opacity-90" />
          </div>
        ))}
      </div>
    </section>
  );
}

// ── Sun & Moon collapsibles ─────────────────────────────────────────────

function CollapsibleRow({ open, onToggle, label, icon: Icon, children }: {
  open: boolean; onToggle: () => void;
  label: string; icon: typeof Sun; children: React.ReactNode;
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
          <ChevronDown
            className={`w-4 h-4 text-muted-foreground transition-transform ${open ? 'rotate-180' : '-rotate-90 rtl:rotate-90'}`}
          />
          <span className="text-[15px] font-medium text-foreground">{label}</span>
        </span>
        <span className="w-9 h-9 rounded-full bg-primary/15 border border-primary/30 inline-flex items-center justify-center shrink-0">
          <Icon className="w-4 h-4 text-primary" />
        </span>
      </button>
      {open && <div className="px-4 pb-4 pt-1">{children}</div>}
    </div>
  );
}

function SunriseSunsetBody({ today, lang }: { today: DailyEntry; lang: 'ar' | 'de' }) {
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
            <p className="text-[10.5px] text-muted-foreground">
              {lang === 'ar' ? 'الشروق' : 'Sunrise'}
            </p>
            <p className="text-[14px] font-semibold text-foreground tabular-nums">
              {formatTimeFromIso(today.sunrise)}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2.5">
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
      <div className="h-1.5 rounded-full bg-foreground/[0.08] overflow-hidden">
        <div
          className="h-full rounded-full bg-gradient-to-r from-amber-400 to-orange-400 transition-all"
          style={{ width: `${progress * 100}%` }}
        />
      </div>
      <p className="text-[11px] text-muted-foreground">
        <span className="tabular-nums">{hh}:{mm}</span>{' '}
        {lang === 'ar' ? 'متبقّية حتى الغروب' : 'verbleibend bis Sonnenuntergang'}
      </p>
    </div>
  );
}

function MoonBody({ lang }: { lang: 'ar' | 'de' }) {
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
        <p className="text-[15px] font-semibold text-foreground">{m.name[lang]}</p>
        <p className="text-[11.5px] text-muted-foreground mt-0.5">
          {lang === 'ar' ? `${pct}٪ مضاءة · ${m.waxing ? 'متزايد' : 'متناقص'}` : `${pct}% Beleuchtung · ${m.waxing ? 'zunehmend' : 'abnehmend'}`}
        </p>
      </div>
    </div>
  );
}

function SunMoon({ data, lang }: { data: WeatherData; lang: 'ar' | 'de' }) {
  const today = data.daily[0];
  const [openSun, setOpenSun] = useState(false);
  const [openMoon, setOpenMoon] = useState(false);
  return (
    <section className="pt-6">
      <h2 className="text-[18px] font-semibold text-foreground mb-3">
        {lang === 'ar' ? 'الشمس والقمر' : 'Sun & Moon'}
      </h2>
      <div className="space-y-3">
        {today?.sunrise && today?.sunset && (
          <CollapsibleRow
            open={openSun}
            onToggle={() => setOpenSun(o => !o)}
            label={lang === 'ar' ? 'الشروق والغروب' : 'Sunrise & Sunset'}
            icon={Sun}
          >
            <SunriseSunsetBody today={today} lang={lang} />
          </CollapsibleRow>
        )}
        <CollapsibleRow
          open={openMoon}
          onToggle={() => setOpenMoon(o => !o)}
          label={lang === 'ar' ? 'أطوار القمر' : 'Moon Phases'}
          icon={MoonStar}
        >
          <MoonBody lang={lang} />
        </CollapsibleRow>
      </div>
    </section>
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
            {lang === 'ar' ? 'يخزَّن محلياً على جهازك فقط.' : 'Wird ausschließlich lokal gespeichert.'}
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
      <div className="h-14 rounded-2xl bg-muted/30 animate-pulse" />
      <div className="h-56 rounded-2xl bg-muted/25 animate-pulse" />
      <div className="h-40 rounded-2xl bg-muted/25 animate-pulse" />
      <div className="h-36 rounded-2xl bg-muted/25 animate-pulse" />
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
  const { data, status, error, needsApiKey, providerId, refresh } = useWeatherData(lang);

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
          ? 'توقّعات الطقس لسبعة أيام، الشروق والغروب وأطوار القمر.'
          : '7-Tage-Wettervorhersage, Sonnenauf-/-untergang und Mondphasen.'}
        path="/weather"
      />

      <div className="max-w-lg mx-auto px-4">
        {showNoLocation ? (
          <div className="pt-6"><NoLocationCard lang={lang} /></div>
        ) : needsApiKey ? (
          <div className="pt-6 space-y-4">
            <ProviderSwitcher activeId={providerId} lang={lang} />
            <ApiKeyPrompt lang={lang} hasExistingKey={hasExistingKey} />
          </div>
        ) : status === 'loading' && !data ? (
          <div className="pt-6"><WeatherSkeleton /></div>
        ) : status === 'error' && !data ? (
          <div className="pt-6"><ErrorCard lang={lang} error={error} onRetry={refresh} /></div>
        ) : data ? (
          <>
            <ForecastHeader lang={lang} city={data.city} lastUpdatedLabel={lastUpdatedLabel} />
            <ForecastBars daily={data.daily} weekRange={data.weekRange} lang={lang} />
            <NextSevenDays data={data} lang={lang} />
            <SunMoon data={data} lang={lang} />

            <div className="pt-6 space-y-3">
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
            </div>
          </>
        ) : (
          <div className="pt-6"><WeatherSkeleton /></div>
        )}
      </div>
    </div>
  );
}