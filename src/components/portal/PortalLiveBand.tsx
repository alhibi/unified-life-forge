/**
 * PortalLiveBand — the glanceable "state of the day" plate at the top of the
 * launcher: next prayer, live weather, and the dual (Gregorian + Hijri) date.
 *
 * Three design decisions worth keeping:
 *
 *  1. Every row is a real navigation target (44px+ tall), so the band is not
 *     decoration — it is the fastest path to /now, /weather and /occasions.
 *  2. The weather row mounts only after the browser goes idle. Weather costs a
 *     multi-source network round trip; the launcher must paint before it.
 *  3. Geolocation is never requested implicitly. With no cached position the
 *     prayer row degrades to an explicit, user-initiated button — a silent
 *     permission prompt on the first screen is rejected by most browsers and
 *     is hostile besides.
 */
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';

import ProgressRing from '@/components/ProgressRing';
import { AppCard } from '@/components/ui/app-shell';
import { formatHijriDate } from '@/features/calendar/data/islamicOccasions';
import { useLiveHijriDate } from '@/features/calendar/hooks/useLiveHijriDate';
import { useWeatherData } from '@/features/weather/hooks/useWeatherData';
import { describeWeatherCode } from '@/features/weather/lib/conditions';
import { useDeviceLocation } from '@/hooks/useDeviceLocation';
import { CalendarDays, ChevronLeft, Crosshair, Droplets, Wind } from '@/lib/icons';
import { MOTION } from '@/lib/motion';

import RollingDigits from './RollingDigits';
import { toArabicDigits, useNextPrayer } from './useNextPrayer';

/* ── shared row chrome ─────────────────────────────────────────────── */

interface RowProps {
  onClick: () => void;
  label: string;
  children: React.ReactNode;
  /** Removes the hairline above the row (first row only). */
  first?: boolean;
}

function LiveRow({ onClick, label, children, first }: RowProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      className={[
        'group flex w-full items-center gap-3 text-start active-tactile',
        'min-h-[56px] px-4 py-3',
        first ? '' : 'border-t border-border',
        'transition-[background-color,transform] duration-fast ease-out-expo hover:bg-muted/60',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-0',
      ].join(' ')}
    >
      {children}
      <ChevronLeft
        className="ms-auto h-4 w-4 shrink-0 text-muted-foreground rtl:rotate-180 transition-transform duration-normal ease-out-expo group-hover:-translate-x-0.5 rtl:group-hover:translate-x-0.5"
        aria-hidden
      />
    </button>
  );
}

/* ── prayer row ────────────────────────────────────────────────────── */

function PrayerRow() {
  const navigate = useNavigate();
  const { next, loading } = useNextPrayer();
  const { location, status, requestLocation } = useDeviceLocation();
  const reduce = useReducedMotion();

  if (!location) {
    return (
      <div className="flex min-h-[56px] items-center gap-3 px-4 py-3">
        <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-md border border-border text-muted-foreground">
          <Crosshair className="h-5 w-5" aria-hidden />
        </span>
        <span className="min-w-0 flex-1">
          <span className="block text-body font-semibold text-foreground">مواقيت الصلاة</span>
          <span className="block text-mini text-muted-foreground">
            {status === 'requesting' ? 'جارٍ تحديد الموقع…' : 'نحتاج موقعك لحساب المواقيت بدقة'}
          </span>
        </span>
        <button
          type="button"
          onClick={() => void requestLocation()}
          disabled={status === 'requesting'}
          className="shrink-0 rounded-button border border-border px-3 py-2 text-mini font-semibold text-foreground transition-colors duration-fast hover:bg-muted disabled:opacity-50"
        >
          تحديد الموقع
        </button>
      </div>
    );
  }

  if (loading || !next) {
    return (
      <div className="flex min-h-[56px] items-center gap-3 px-4 py-3" aria-busy="true">
        <span className="skeleton h-11 w-11 rounded-full" />
        <span className="min-w-0 flex-1 space-y-2">
          <span className="skeleton block h-3.5 w-24 rounded-sm" />
          <span className="skeleton block h-3 w-32 rounded-sm" />
        </span>
      </div>
    );
  }

  const percent = Math.round(next.progress * 100);

  return (
    <LiveRow first onClick={() => navigate('/now')} label={`الصلاة القادمة ${next.label} ${next.relative}`}>
      <ProgressRing
        progress={next.progress}
        size={44}
        thickness={3}
        label={`مضى ${toArabicDigits(percent)}٪ من الوقت الحالي`}
      >
        <span className="live-dot h-1.5 w-1.5 rounded-full bg-[hsl(var(--live))]" aria-hidden />
      </ProgressRing>

      <span className="min-w-0 flex-1">
        <span className="flex items-baseline gap-2">
          <AnimatePresence mode="wait" initial={false}>
            <motion.span
              key={next.id}
              initial={reduce ? { opacity: 0 } : { opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={reduce ? { opacity: 0 } : { opacity: 0, y: -6 }}
              transition={MOTION.fade}
              className="text-body font-semibold text-foreground"
            >
              {next.label}
            </motion.span>
          </AnimatePresence>
          <span className="text-mini font-plex-mono tabular-nums text-muted-foreground" dir="ltr">
            {next.clock}
          </span>
        </span>
        <span className="mt-0.5 block text-mini text-muted-foreground">
          الصلاة القادمة · {next.relative}
        </span>
      </span>
    </LiveRow>
  );
}

/* ── weather row (idle-mounted) ────────────────────────────────────── */

function WeatherRow() {
  const navigate = useNavigate();
  const { data } = useWeatherData('ar');
  const { location } = useDeviceLocation();

  // With no coordinates the engine never resolves, so a skeleton here would
  // spin forever. The prayer row above already carries the single location
  // prompt — two prompts for the same permission is noise.
  if (!location) return null;

  if (!data) {
    return (
      <div className="flex min-h-[56px] items-center gap-3 border-t border-border px-4 py-3" aria-busy="true">
        <span className="skeleton h-11 w-11 rounded-md" />
        <span className="min-w-0 flex-1 space-y-2">
          <span className="skeleton block h-3.5 w-20 rounded-sm" />
          <span className="skeleton block h-3 w-28 rounded-sm" />
        </span>
      </div>
    );
  }

  const { current, daily } = data;
  const condition = describeWeatherCode(current.weatherCode, current.isDay);
  const Icon = condition.icon;
  const temp = Math.round(current.temperature);
  const hi = Math.round(daily[0]?.tempMax ?? temp);
  const lo = Math.round(daily[0]?.tempMin ?? temp);

  return (
    <LiveRow onClick={() => navigate('/weather')} label={`الطقس الآن ${temp} درجة ${condition.label}`}>
      <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-md bg-secondary text-foreground">
        <Icon className="h-5 w-5 text-[hsl(var(--live))]" aria-hidden />
      </span>

      <span className="min-w-0 flex-1">
        <span className="flex items-baseline gap-2">
          <span className="text-title font-semibold font-plex-mono tabular-nums text-foreground" dir="ltr">
            {temp}°
          </span>
          <span className="truncate text-mini text-muted-foreground">{condition.label}</span>
        </span>
        <span className="mt-0.5 flex items-center gap-3 text-mini font-plex-mono tabular-nums text-muted-foreground" dir="ltr">
          <span>
            H {hi}° · L {lo}°
          </span>
          <span className="inline-flex items-center gap-1">
            <Droplets className="h-3.5 w-3.5" aria-hidden />
            {Math.round(current.humidity)}%
          </span>
          <span className="inline-flex items-center gap-1">
            <Wind className="h-3.5 w-3.5" aria-hidden />
            {Math.round(current.windSpeed)} km/h
          </span>
        </span>
      </span>
    </LiveRow>
  );
}

/* ── date row ──────────────────────────────────────────────────────── */

const WEEKDAY_FORMAT = new Intl.DateTimeFormat('ar', { weekday: 'long' });
const DATE_FORMAT = new Intl.DateTimeFormat('ar', { day: 'numeric', month: 'long' });

function DateRow({ now }: { now: Date }) {
  const navigate = useNavigate();
  const { hijri } = useLiveHijriDate();
  const clock = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;

  return (
    <LiveRow onClick={() => navigate('/occasions')} label="التقويم والمناسبات">
      <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-md border border-border text-muted-foreground">
        <CalendarDays className="h-5 w-5" aria-hidden />
      </span>

      <span className="min-w-0 flex-1">
        <span className="block truncate text-body font-semibold text-foreground">
          {WEEKDAY_FORMAT.format(now)} · {DATE_FORMAT.format(now)}
        </span>
        <span className="mt-0.5 block truncate text-mini text-muted-foreground">{formatHijriDate(hijri)}</span>
      </span>

      <RollingDigits
        value={clock}
        className="text-title font-semibold font-plex-mono tabular-nums text-foreground"
        aria-label={`الساعة ${clock}`}
      />
    </LiveRow>
  );
}

/* ── band ──────────────────────────────────────────────────────────── */

export default function PortalLiveBand() {
  const [now, setNow] = useState(() => new Date());
  const [weatherReady, setWeatherReady] = useState(false);

  // Minute-resolution clock. A 1 Hz tick would re-render the band 60× more
  // often for a readout that only shows hours and minutes.
  useEffect(() => {
    let id: number | null = null;
    const schedule = () => {
      const msToNextMinute = 60_000 - (Date.now() % 60_000) + 50;
      id = window.setTimeout(() => {
        setNow(new Date());
        schedule();
      }, msToNextMinute);
    };
    schedule();
    return () => {
      if (id !== null) window.clearTimeout(id);
    };
  }, []);

  // Defer the weather network cost until the launcher has painted.
  useEffect(() => {
    const ric: (cb: () => void) => number =
      (window as unknown as { requestIdleCallback?: (cb: () => void) => number }).requestIdleCallback ??
      ((cb) => window.setTimeout(cb, 900));
    const id = ric(() => setWeatherReady(true));
    return () => {
      const cic = (window as unknown as { cancelIdleCallback?: (id: number) => void }).cancelIdleCallback;
      if (cic) cic(id);
      else window.clearTimeout(id);
    };
  }, []);

  return (
    <AppCard as="section" className="overflow-hidden p-0" aria-label="حالة اليوم">
      <PrayerRow />
      {weatherReady && <WeatherRow />}
      <DateRow now={now} />
    </AppCard>
  );
}
