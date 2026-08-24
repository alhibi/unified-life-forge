import { motion } from 'framer-motion';

import { WeatherPanel } from './WeatherPanels';

export interface WindCompassProps {
  speed: number;
  gusts: number;
  dirDeg: number;
  cardinal: string;
  beaufort: string;
}

export function WindCompass({
  speed,
  gusts,
  dirDeg,
  cardinal,
  beaufort,
}: WindCompassProps) {
  const cardinals = ['N', 'E', 'S', 'W'];

  return (
    <WeatherPanel title="الرياح وحركتها الجوية" subtitle="بوصلة حية">
      <div className="flex items-center gap-4">
        <div className="relative w-[120px] h-[120px] shrink-0" dir="ltr">
          <svg viewBox="0 0 120 120" className="absolute inset-0 w-full h-full">
            <circle
              cx="60"
              cy="60"
              r="54"
              fill="none"
              stroke="hsl(var(--foreground))"
              strokeOpacity="0.08"
              strokeWidth="1"
            />
            <circle
              cx="60"
              cy="60"
              r="46"
              fill="none"
              stroke="hsl(var(--foreground))"
              strokeOpacity="0.05"
              strokeWidth="1"
            />
            {Array.from({ length: 4 }).map((_, i) => {
              const a = (i / 4) * Math.PI * 2 - Math.PI / 2;
              const r1 = 44;
              const r2 = 50;
              return (
                <line
                  key={i}
                  x1={60 + Math.cos(a) * r1}
                  y1={60 + Math.sin(a) * r1}
                  x2={60 + Math.cos(a) * r2}
                  y2={60 + Math.sin(a) * r2}
                  stroke="hsl(var(--foreground))"
                  strokeOpacity="0.22"
                  strokeWidth="1.2"
                  strokeLinecap="round"
                />
              );
            })}
            {cardinals.map((c, i) => {
              const a = (i / 4) * Math.PI * 2 - Math.PI / 2;
              return (
                <text
                  key={c}
                  x={60 + Math.cos(a) * 36}
                  y={60 + Math.sin(a) * 36 + 3}
                  textAnchor="middle"
                  fontSize="9"
                  fill="hsl(var(--muted-foreground))"
                  letterSpacing="1"
                >
                  {c}
                </text>
              );
            })}
          </svg>
          <motion.div
            className="absolute inset-0 flex items-center justify-center"
            initial={{ rotate: 0 }}
            animate={{ rotate: dirDeg }}
            transition={{ type: 'spring', stiffness: 60, damping: 14 }}
          >
            <svg viewBox="0 0 120 120" className="w-full h-full">
              <path
                d="M60 18 C 68 40, 68 52, 60 58 C 52 52, 52 40, 60 18 Z"
                fill="hsl(var(--primary))"
                fillOpacity="0.75"
              />
              <path
                d="M60 102 C 65 84, 65 74, 60 68 C 55 74, 55 84, 60 102 Z"
                fill="hsl(var(--foreground))"
                fillOpacity="0.22"
              />
              <circle cx="60" cy="60" r="4" fill="hsl(var(--primary))" />
            </svg>
          </motion.div>
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-baseline gap-1 tabular-nums" dir="ltr">
            <span className="font-extrabold text-hero leading-none text-foreground">
              {Math.round(speed)}
            </span>
            <span className="text-mini text-primary/90 font-bold">km/h</span>
          </div>
          <p className="mt-1 text-micro text-muted-foreground">
            {cardinal} · {Math.round(dirDeg)}°
          </p>
          <p className="mt-2 text-micro text-foreground/80 leading-snug">{beaufort}</p>
          <p className="mt-1 text-micro text-primary/80 tabular-nums" dir="ltr">
            {'هبات'} {Math.round(gusts)} km/h
          </p>
        </div>
      </div>
    </WeatherPanel>
  );
}