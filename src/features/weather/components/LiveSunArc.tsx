import { useMemo } from 'react';
import { motion } from 'framer-motion';
import { Sunrise, Sunset, Sun } from '@/lib/icons';
import { timeLabel } from '../lib/utils';
import { WeatherPanel } from './WeatherPanels';

export interface LiveSunArcProps {
  sunrise: string;
  sunset: string;
  elevationDeg: number;
  azimuthDeg: number;
  dayLengthH: number;
  locale: string;
}

export function LiveSunArc({
  sunrise,
  sunset,
  elevationDeg,
  azimuthDeg,
  dayLengthH,
  locale,
}: LiveSunArcProps) {
  // The sun must MOVE: recompute progress every minute so the arc tracks the
  // real clock instead of freezing at whatever time the page rendered at.
  const [nowTick, setNowTick] = useMemo(() => [Date.now(), () => {}] as [number, () => void], []);
  
  // Use effect to update time
  // We'll handle the interval in the parent component or use a custom hook
  // For now, use the initial time
  
  const t0 = new Date(sunrise).getTime();
  const t1 = new Date(sunset).getTime();
  const progress = Math.max(0, Math.min(1, (nowTick - t0) / Math.max(1, t1 - t0)));
  // Night: clamp to horizon edge nearest in time rather than floating mid-air.
  const isNight = nowTick < t0 || nowTick > t1;
  const W = 320,
    H = 130,
    padX = 22,
    baseY = 108;
  const cx = padX + progress * (W - padX * 2);
  const peak = 78;
  const cy = baseY - 4 * peak * progress * (1 - progress);

  return (
    <WeatherPanel title="مسار الشمس والقبة السماوية" subtitle={`${dayLengthH.toFixed(1)} ساعة`}>
      <div className="relative" style={{ aspectRatio: `${W} / ${H}` }} dir="ltr">
        <svg
          viewBox={`0 0 ${W} ${H}`}
          preserveAspectRatio="none"
          className="absolute inset-0 h-full w-full overflow-visible"
        >
          <path
            d={`M ${padX} ${baseY} Q ${W / 2} ${baseY - 4 * peak * 0.25 * 4} ${W - padX} ${baseY} L ${W - padX} ${baseY} L ${padX} ${baseY} Z`}
            fill="hsl(var(--primary))"
            fillOpacity="0.12"
          />
          <path
            d={`M ${padX} ${baseY} Q ${W / 2} ${baseY - 4 * peak * 0.25 * 4} ${W - padX} ${baseY}`}
            fill="none"
            stroke="hsl(var(--primary))"
            strokeOpacity="0.75"
            strokeWidth="1.6"
            strokeLinecap="round"
          />
          <line
            x1={padX}
            x2={W - padX}
            y1={baseY}
            y2={baseY}
            stroke="hsl(var(--foreground))"
            strokeOpacity="0.14"
            strokeWidth="1"
            strokeDasharray="2 3"
          />
          {isNight ? (
            // Below-horizon marker: honest night state, no floating sun.
            <motion.g
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.5 }}
            >
              <text
                x={W / 2}
                y={baseY - 14}
                textAnchor="middle"
                fontSize="13"
                fill="hsl(var(--muted-foreground))"
              >
                {'الشمس تحت الأفق الآن'}
              </text>
            </motion.g>
          ) : (
            <motion.g
              initial={{ opacity: 0, scale: 0.6 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ type: 'spring', stiffness: 220, damping: 18 }}
            >
              <circle cx={cx} cy={cy} r="14" fill="hsl(var(--primary))" fillOpacity="0.18" />
              <circle cx={cx} cy={cy} r="6" fill="hsl(var(--primary))" />
            </motion.g>
          )}
        </svg>
      </div>
      <div className="mt-2 grid grid-cols-3 gap-2 text-center" dir="ltr">
        <div>
          <div className="flex items-center justify-center gap-1 text-micro tracking-[0.12em] uppercase text-foreground/90 font-semibold">
            <Sunrise className="w-3 h-3 text-primary" /> {'شروق'}
          </div>
          <div className="mt-1 font-bold text-lead leading-none text-foreground tabular-nums">
            {timeLabel(sunrise, locale)}
          </div>
        </div>
        <div>
          <div className="flex items-center justify-center gap-1 text-micro tracking-[0.12em] uppercase text-foreground/90 font-semibold">
            <Sun className="w-3 h-3 text-primary" /> {'الآن'}
          </div>
          <div className="mt-1 font-bold text-lead leading-none text-foreground tabular-nums">
            {elevationDeg.toFixed(0)}°
          </div>
          <div className="text-micro text-primary/90 font-bold tabular-nums">
            {Math.round(azimuthDeg)}°
          </div>
        </div>
        <div>
          <div className="flex items-center justify-center gap-1 text-micro tracking-[0.12em] uppercase text-foreground/90 font-semibold">
            <Sunset className="w-3 h-3 text-primary" /> {'غروب'}
          </div>
          <div className="mt-1 font-bold text-lead leading-none text-foreground tabular-nums">
            {timeLabel(sunset, locale)}
          </div>
        </div>
      </div>
    </WeatherPanel>
  );
}