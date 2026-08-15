/**
 * PortalPulseBar — the live strip: next prayer, the clock, and the weather.
 *
 * This is the compact successor to the "cosmic astrolabe": a 160px dial with
 * two infinite rotations, a sweeping hand, four blueprint corner labels and a
 * two-column readout, all above the fold. The information people came for was
 * three values; this renders exactly those three, in one row, with no
 *always-running animation.
 */
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';

import { useWeatherData } from '@/features/weather/hooks/useWeatherData';
import { describeWeatherCode } from '@/features/weather/lib/conditions';
import { useDeviceLocation } from '@/hooks/useDeviceLocation';
import { CloudSun, Crosshair, Sun } from '@/lib/icons';
import { cn } from '@/lib/utils';

import { useNextPrayer } from './useNextPrayer';
import { PulseBarSkeleton } from './PortalSkeletons';

function Cell({
  label,
  onClick,
  children,
  className,
}: {
  label: string;
  onClick: () => void;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'flex min-w-0 flex-1 items-center gap-2.5 rounded-md px-3 py-2 text-start',
        'transition-colors duration-fast hover:bg-muted/60',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
        className,
      )}
      aria-label={label}
    >
      {children}
    </button>
  );
}

export default function PortalPulseBar() {
  const navigate = useNavigate();
  const { next, loading } = useNextPrayer();
  const { location, requestLocation } = useDeviceLocation();
  const { data: weather } = useWeatherData('ar');
  const [now, setNow] = useState(() => new Date());

  /* Tick on the minute boundary, not every second. */
  useEffect(() => {
    let id: number | null = null;
    const schedule = () => {
      id = window.setTimeout(() => {
        setNow(new Date());
        schedule();
      }, 60_000 - (Date.now() % 60_000) + 50);
    };
    schedule();
    return () => {
      if (id !== null) window.clearTimeout(id);
    };
  }, []);

  const clock = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
  const condition = weather ? describeWeatherCode(weather.current.weatherCode, weather.current.isDay) : null;
  const WeatherIcon = condition?.icon ?? CloudSun;

  if (!location) {
    return (
      <button
        type="button"
        onClick={() => void requestLocation()}
        className="app-card-bare flex w-full items-center gap-3 p-3 text-start transition-colors duration-fast hover:bg-muted/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      >
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md border border-border text-[hsl(var(--live))]">
          <Crosshair className="h-4 w-4" aria-hidden />
        </span>
        <span className="min-w-0">
          <span className="block text-meta font-semibold text-foreground">فعّل الموقع</span>
          <span className="block text-mini text-muted-foreground">لعرض مواقيت الصلاة والطقس مباشرة</span>
        </span>
        <span className="ms-auto font-plex-mono text-title font-bold tabular-nums text-foreground" dir="ltr">
          {clock}
        </span>
      </button>
    );
  }

  /* Location granted but neither prayer times nor weather have landed yet:
     show the bar's own shape instead of three em-dashes. */
  if ((loading || !next) && !weather) {
    return <PulseBarSkeleton />;
  }

  return (
    <div className="app-card-bare flex flex-wrap items-stretch gap-1 p-1.5" aria-label="نبض اليوم">
      <Cell label="مواقيت الصلاة" onClick={() => navigate('/settings/prayer')}>
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md border border-border text-[hsl(var(--live))]">
          <Sun className="h-4 w-4" aria-hidden />
        </span>
        <span className="min-w-0">
          <span className="block truncate text-meta font-semibold text-foreground">
            {loading || !next ? 'جارٍ الحساب…' : next.label}
          </span>
          <span className="block truncate text-mini text-muted-foreground">{next ? next.relative : '—'}</span>
        </span>
        {next && (
          <span className="ms-auto shrink-0 font-plex-mono text-meta tabular-nums text-muted-foreground" dir="ltr">
            {next.clock}
          </span>
        )}
      </Cell>

      <span className="hidden w-px self-stretch bg-border sm:block" aria-hidden />

      <Cell label="تفاصيل الطقس" onClick={() => navigate('/weather')}>
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md border border-border text-[hsl(var(--live))]">
          <WeatherIcon className="h-4 w-4" aria-hidden />
        </span>
        <span className="min-w-0">
          <span className="block truncate text-meta font-semibold text-foreground" dir="ltr">
            {weather ? `${Math.round(weather.current.temperature)}°` : '—'}
          </span>
          <span className="block truncate text-mini text-muted-foreground">{condition?.label ?? 'الطقس'}</span>
        </span>
        <span className="ms-auto shrink-0 font-plex-mono text-meta font-bold tabular-nums text-foreground" dir="ltr">
          {clock}
        </span>
      </Cell>
    </div>
  );
}
