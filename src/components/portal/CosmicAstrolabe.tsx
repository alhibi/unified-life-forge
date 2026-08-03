import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';

import ProgressRing from '@/components/ProgressRing';
import { formatHijriDate } from '@/features/calendar/data/islamicOccasions';
import { useLiveHijriDate } from '@/features/calendar/hooks/useLiveHijriDate';
import { useWeatherData } from '@/features/weather/hooks/useWeatherData';
import { describeWeatherCode } from '@/features/weather/lib/conditions';
import { useDeviceLocation } from '@/hooks/useDeviceLocation';
import { CalendarDays, Compass, Crosshair, Droplets, Sun, Wind } from '@/lib/icons';
import { MOTION } from '@/lib/motion';

import RollingDigits from './RollingDigits';
import { toArabicDigits, useNextPrayer } from './useNextPrayer';

const WEEKDAY_FORMAT = new Intl.DateTimeFormat('ar', { weekday: 'long' });
const DATE_FORMAT = new Intl.DateTimeFormat('ar', { day: 'numeric', month: 'long' });

/**
 * CosmicAstrolabe — A magnificent high-density visualizer merging next prayer times,
 * live weather metrics, Gregorian/Hijri date, and a rolling clock into an interactive,
 * circular, instrument-inspired astronomical dial dashboard.
 */
export default function CosmicAstrolabe() {
  const navigate = useNavigate();
  const reduce = useReducedMotion();
  const { next, loading: prayerLoading } = useNextPrayer();
  const { location, status, requestLocation } = useDeviceLocation();
  const { data: weatherData } = useWeatherData('ar');
  const { hijri } = useLiveHijriDate();
  const [now, setNow] = useState(() => new Date());
  const [weatherMounted, setWeatherMounted] = useState(false);

  // Time tracker for clock
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

  // Idle-mount weather
  useEffect(() => {
    const ric =
      (window as any).requestIdleCallback ??
      ((cb: () => void) => window.setTimeout(cb, 800));
    const id = ric(() => setWeatherMounted(true));
    return () => {
      const cic = (window as any).cancelIdleCallback;
      if (cic) cic(id);
      else window.clearTimeout(id);
    };
  }, []);

  const clockTime = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;

  // Next prayer calculations
  const prayerPercent = next ? Math.round(next.progress * 100) : 0;

  // Weather processing
  const weatherResolved = weatherMounted && weatherData && location;
  let temp = 0;
  let weatherCondition: any = null;
  let hi = 0;
  let lo = 0;
  let humidity = 0;
  let windSpeed = 0;

  if (weatherResolved && weatherData) {
    const { current, daily } = weatherData;
    weatherCondition = describeWeatherCode(current.weatherCode, current.isDay);
    temp = Math.round(current.temperature);
    hi = Math.round(daily[0]?.tempMax ?? temp);
    lo = Math.round(daily[0]?.tempMin ?? temp);
    humidity = Math.round(current.humidity);
    windSpeed = Math.round(current.windSpeed);
  }

  return (
    <div className="relative overflow-hidden rounded-xl border border-border bg-card/60 p-5 md:p-6 transition-all duration-normal hover:border-border/80">
      {/* Decorative Blueprint Corner Markings */}
      <span className="absolute top-1 start-1 font-mono text-mini opacity-25 text-muted-foreground select-none">LAT.31.2</span>
      <span className="absolute top-1 end-1 font-mono text-mini opacity-25 text-muted-foreground select-none">DEC.23.4</span>
      <span className="absolute bottom-1 start-1 font-mono text-mini opacity-25 text-muted-foreground select-none">ASC.12.8</span>
      <span className="absolute bottom-1 end-1 font-mono text-mini opacity-25 text-muted-foreground select-none">ALM.94</span>

      {/* Main Astrolabe Responsive Grid */}
      <div className="grid gap-6 md:grid-cols-[160px_1fr] items-center">

        {/* Astrolabe Circular Dial */}
        <div className="flex justify-center">
          <div className="relative h-40 w-40 flex items-center justify-center">
            {/* Ambient Rotational Background Rings */}
            <motion.div
              animate={{ rotate: 360 }}
              transition={{ duration: 45, repeat: Number.POSITIVE_INFINITY, ease: 'linear' }}
              className="absolute inset-0 rounded-full border border-dashed border-border/60"
            />
            <motion.div
              animate={{ rotate: -360 }}
              transition={{ duration: 75, repeat: Number.POSITIVE_INFINITY, ease: 'linear' }}
              className="absolute inset-2 rounded-full border border-dotted border-[hsl(var(--live))]/15"
            />
            <div className="absolute inset-4 rounded-full border border-border/30" />

            {/* Prayer time progress indicator inside the astrolabe */}
            {location ? (
              prayerLoading || !next ? (
                <div className="animate-pulse flex h-16 w-16 items-center justify-center rounded-full border border-border bg-secondary/20">
                  <Compass className="h-6 w-6 text-muted-foreground" />
                </div>
              ) : (
                <ProgressRing
                  progress={next.progress}
                  size={120}
                  thickness={3}
                  label={`مضى ${toArabicDigits(prayerPercent)}٪ من الوقت الحالي`}
                >
                  <div className="flex flex-col items-center justify-center text-center">
                    <span className="text-micro font-bold tracking-widest text-[hsl(var(--live))] uppercase">
                      الآذان التالي
                    </span>
                    <AnimatePresence mode="wait" initial={false}>
                      <motion.span
                        key={next.id}
                        initial={reduce ? { opacity: 0 } : { opacity: 0, y: 4 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={reduce ? { opacity: 0 } : { opacity: 0, y: -4 }}
                        transition={MOTION.fade}
                        className="text-body font-bold text-foreground mt-0.5"
                      >
                        {next.label}
                      </motion.span>
                    </AnimatePresence>
                    <span className="text-micro font-plex-mono tabular-nums text-muted-foreground mt-0.5">
                      {next.clock}
                    </span>
                  </div>
                </ProgressRing>
              )
            ) : (
              <button
                type="button"
                onClick={() => void requestLocation()}
                className="group flex flex-col items-center justify-center text-center rounded-full border border-border bg-secondary/20 hover:bg-secondary/40 h-28 w-28 transition-colors p-3"
              >
                <Crosshair className="h-5 w-5 text-muted-foreground group-hover:text-[hsl(var(--live))] transition-colors" />
                <span className="text-micro font-bold text-foreground mt-1 leading-[1.3]">
                  انقر لتحديد مواقيت الصلاة
                </span>
              </button>
            )}

            {/* Small active copper compass hand aligned mathematically to prayer progress */}
            {next && location && (
              <motion.div
                style={{ originX: '50%', originY: '100%' }}
                animate={{ rotate: next.progress * 360 }}
                transition={{ duration: 1.2, ease: 'easeOut' }}
                className="absolute top-[20px] left-[50%] -translate-x-1/2 h-[60px] w-[2px] pointer-events-none"
              >
                <div className="w-2 h-2 rounded-full bg-[hsl(var(--live))] -translate-x-[3px] -translate-y-1 shadow-[0_0_8px_hsl(var(--live))]" />
              </motion.div>
            )}
          </div>
        </div>

        {/* Informational Astrolabe Readouts */}
        <div className="space-y-4">

          {/* Header Row: Gregorian and Hijri Intertwined */}
          <div
            onClick={() => navigate('/occasions')}
            className="group flex items-start gap-3 cursor-pointer select-none rounded-lg p-2 hover:bg-secondary/20 transition-colors"
          >
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md border border-border text-muted-foreground bg-secondary/10">
              <CalendarDays className="h-4 w-4 text-[hsl(var(--live))]" />
            </div>
            <div className="min-w-0 flex-1">
              <span className="block text-body font-bold text-foreground transition-colors group-hover:text-[hsl(var(--live))]">
                {WEEKDAY_FORMAT.format(now)} · {DATE_FORMAT.format(now)}
              </span>
              <span className="block text-mini text-muted-foreground/80 font-amiri mt-0.5">
                {formatHijriDate(hijri)}
              </span>
            </div>
            {/* Tabular Modern Rolling Clock */}
            <div className="text-end">
              <RollingDigits
                value={clockTime}
                className="text-title font-bold font-plex-mono tabular-nums text-foreground"
                aria-label={`الساعة ${clockTime}`}
              />
              <span className="block text-micro text-muted-foreground mt-0.5 font-mono uppercase tracking-widest">GMT+3</span>
            </div>
          </div>

          <hr className="border-border/40" />

          {/* Bottom Grid: Navigation, Prayer countdown and Weather */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">

            {/* Prayer Detailed Indicator */}
            <div
              onClick={() => navigate('/now')}
              className="group cursor-pointer rounded-lg border border-border/30 bg-secondary/5 p-3 hover:bg-secondary/20 transition-all hover:border-[hsl(var(--live))]/20"
            >
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-micro font-semibold text-muted-foreground uppercase tracking-wider">لوحة الآن</span>
                <span className="live-dot h-1.5 w-1.5 rounded-full" />
              </div>
              {next && location ? (
                <div>
                  <div className="text-mini font-bold text-foreground transition-colors group-hover:text-[hsl(var(--live))]">
                    تبقّى على {next.label}
                  </div>
                  <div className="text-mini text-muted-foreground mt-0.5">
                    {next.relative}
                  </div>
                </div>
              ) : (
                <div className="text-mini text-muted-foreground">
                  مواقيت الصلاة تتطلب تفعيل الموقع لتنهمر تفاصيل اليوم.
                </div>
              )}
            </div>

            {/* Dynamic Weather Dashboard Plate */}
            <div
              onClick={() => navigate('/weather')}
              className="group cursor-pointer rounded-lg border border-border/30 bg-secondary/5 p-3 hover:bg-secondary/20 transition-all hover:border-[hsl(var(--live))]/20"
            >
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-micro font-semibold text-muted-foreground uppercase tracking-wider">الطقس الحركي</span>
                {weatherResolved && weatherCondition ? (
                  <weatherCondition.icon className="h-4 w-4 text-[hsl(var(--live))]" />
                ) : (
                  <Sun className="h-4 w-4 text-muted-foreground animate-spin-slow" />
                )}
              </div>

              {location ? (
                weatherResolved ? (
                  <div className="space-y-1">
                    <div className="flex items-baseline gap-1.5">
                      <span className="text-title font-bold font-plex-mono tabular-nums text-foreground group-hover:text-[hsl(var(--live))] transition-colors" dir="ltr">
                        {temp}°
                      </span>
                      <span className="text-micro text-muted-foreground truncate">{weatherCondition.label}</span>
                    </div>
                    <div className="flex items-center gap-2 text-micro font-plex-mono tabular-nums text-muted-foreground/80" dir="ltr">
                      <span>H {hi}° · L {lo}°</span>
                      <span className="inline-flex items-center gap-0.5">
                        <Droplets className="h-3 w-3" />
                        {humidity}%
                      </span>
                      <span className="inline-flex items-center gap-0.5">
                        <Wind className="h-3 w-3" />
                        {windSpeed}k
                      </span>
                    </div>
                  </div>
                ) : (
                  <div className="animate-pulse space-y-1">
                    <div className="h-4 w-12 bg-muted rounded" />
                    <div className="h-3 w-20 bg-muted rounded" />
                  </div>
                )
              ) : (
                <span className="text-mini text-muted-foreground block">
                  في انتظار تحديد الموقع لعرض تفاصيل المناخ الحية.
                </span>
              )}
            </div>

          </div>

        </div>
      </div>
    </div>
  );
}
