import { motion } from 'framer-motion';
import { useMemo } from 'react';

import { WeatherPanel } from './WeatherPanels';

export interface AQIGaugeProps {
  caqi: number;
  pm25: number;
  pm10: number;
  o3: number;
  no2: number;
  so2: number;
  co: number;
  advisory: string;
  healthScore: number;
  source: string | null;
}

export function AQIGauge({
  caqi,
  pm25,
  pm10,
  o3,
  no2,
  so2,
  co,
  advisory,
  healthScore,
  source,
}: AQIGaugeProps) {
  const bands = useMemo(
    () => [
      { to: 25, color: 'hsl(150 55% 45%)', label: 'ممتاز' },
      { to: 50, color: 'hsl(90 55% 48%)', label: 'جيد' },
      { to: 75, color: 'hsl(45 85% 55%)', label: 'متوسط' },
      { to: 100, color: 'hsl(20 80% 55%)', label: 'ضعيف' },
      { to: 150, color: 'hsl(0 70% 52%)', label: 'رديء جداً' },
    ],
    []
  );

  const clamped = Math.max(0, Math.min(150, caqi));
  const arcLen = Math.PI; // half circle 0..150 mapped
  const R = 62;
  const cx = 80,
    cy = 78;
  const angleFor = (v: number) => Math.PI + (Math.max(0, Math.min(150, v)) / 150) * arcLen;
  const pointFor = (v: number, r = R) => {
    const a = angleFor(v);
    return { x: cx + Math.cos(a) * r, y: cy + Math.sin(a) * r };
  };
  const needle = pointFor(clamped, R - 6);
  const activeBand = bands.find((b) => clamped <= b.to) ?? bands[bands.length - 1];
  
  const pollutants = useMemo(
    () => [
      { label: 'PM2.5', value: pm25, unit: 'µg', limit: 25 },
      { label: 'PM10', value: pm10, unit: 'µg', limit: 50 },
      { label: 'O₃', value: o3, unit: 'µg', limit: 120 },
      { label: 'NO₂', value: no2, unit: 'µg', limit: 40 },
      { label: 'SO₂', value: so2, unit: 'µg', limit: 40 },
      { label: 'CO', value: co, unit: 'mg', limit: 10 },
    ],
    [pm25, pm10, o3, no2, so2, co]
  );

  return (
    <WeatherPanel title="جودة الهواء والغبار" subtitle={source ?? 'نموذج'}>
      <div className="flex items-end gap-4" dir="ltr">
        <div className="relative shrink-0">
          <svg viewBox="0 0 160 92" className="w-[160px] h-[92px]">
            {bands.map((b, i) => {
              const from = i === 0 ? 0 : bands[i - 1].to;
              const a1 = angleFor(from);
              const a2 = angleFor(b.to);
              const p1 = { x: cx + Math.cos(a1) * R, y: cy + Math.sin(a1) * R };
              const p2 = { x: cx + Math.cos(a2) * R, y: cy + Math.sin(a2) * R };
              return (
                <path
                  key={i}
                  d={`M ${p1.x} ${p1.y} A ${R} ${R} 0 0 1 ${p2.x} ${p2.y}`}
                  stroke={b.color}
                  strokeOpacity="0.85"
                  strokeWidth="8"
                  fill="none"
                  strokeLinecap="butt"
                />
              );
            })}
            <motion.line
              x1={cx}
              y1={cy}
              x2={needle.x}
              y2={needle.y}
              stroke="hsl(var(--foreground))"
              strokeWidth="2"
              strokeLinecap="round"
              initial={{ pathLength: 0, opacity: 0 }}
              animate={{ pathLength: 1, opacity: 1 }}
              transition={{ duration: 0.9, ease: [0.16, 1, 0.3, 1] }}
            />
            <circle cx={cx} cy={cy} r="4" fill="hsl(var(--foreground))" />
          </svg>
          <div className="absolute inset-x-0 -bottom-1 text-center">
            <div className="font-bold text-display leading-none text-foreground tabular-nums">
              {Math.round(caqi)}
            </div>
            <div className="text-micro tracking-[0.12em] uppercase font-bold" style={{ color: activeBand.color }}>
              {activeBand.label}
            </div>
          </div>
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-micro leading-relaxed text-muted-foreground line-clamp-3">
            {advisory}
          </p>
          <div className="mt-2 flex items-center gap-2 text-micro tracking-[0.16em] uppercase text-primary/80">
            <span>{'مؤشر الصحة البشري'}</span>
            <span className="tabular-nums text-foreground font-semibold">{healthScore}/100</span>
          </div>
        </div>
      </div>
      <div className="mt-4 grid grid-cols-3 gap-2">
        {pollutants.map((p) => {
          const ratio = Math.max(0, Math.min(1.5, p.value / p.limit));
          const color =
            ratio < 0.5 ? 'hsl(150 55% 45%)' : ratio < 1 ? 'hsl(45 85% 55%)' : 'hsl(0 70% 52%)';
          return (
            <div key={p.label} className="rounded-xl border border-border/40 bg-background/30 px-2 py-2 min-w-0">
              <div className="flex items-center justify-between text-micro tracking-[0.12em] uppercase text-muted-foreground">
                <span>{p.label}</span>
                <span className="tabular-nums font-semibold" style={{ color }}>
                  {p.value.toFixed(p.label === 'CO' ? 2 : 1)}
                  <span className="text-muted-foreground/70 ms-0.5">{p.unit}</span>
                </span>
              </div>
              <div className="mt-1.5 h-1 rounded-full bg-foreground/8 overflow-hidden">
                <motion.div
                  className="h-full w-full origin-left rounded-full"
                  style={{ background: color }}
                  initial={{ scaleX: 0 }}
                  animate={{ scaleX: Math.min(1, ratio) }}
                  transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
                />
              </div>
            </div>
          );
        })}
      </div>
    </WeatherPanel>
  );
}