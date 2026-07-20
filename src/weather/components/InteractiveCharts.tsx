import { motion } from 'framer-motion';
import React, { useState } from 'react';

import { Activity, CloudSun, Sparkles, Thermometer, Wind } from '@/lib/icons';

interface ChartEntry {
  timestamp_unix: number;
  temperature_c: number;
  apparent_c?: number;
  precip_probability_percent?: number;
  wind_kph?: number;
  humidity_percent?: number;
}

interface InteractiveChartsProps {
  entries: ChartEntry[];
  ar: boolean;
}

type TabType = 'temp' | 'precip' | 'wind_humidity';

export default function InteractiveCharts({ entries, ar }: InteractiveChartsProps) {
  const [activeTab, setActiveTab] = useState<TabType>('temp');
  const [hoveredIdx, setHoveredIdx] = useState<number | null>(null);

  const slice = entries.slice(0, 24);
  if (slice.length < 2) return null;

  const W = 500;
  const H = 220;
  const padX = 24;
  const padY = 24;

  const getDataForTab = () => {
    switch (activeTab) {
      case 'temp': {
        const temps = slice.map((e) => e.temperature_c);
        const apparents = slice.map((e) => e.apparent_c ?? e.temperature_c);
        const min = Math.min(...temps, ...apparents);
        const max = Math.max(...temps, ...apparents);
        return {
          series: [
            {
              label: ar ? 'الفعلي' : 'Tatsächlich',
              values: temps,
              color: 'hsl(var(--primary))',
              isLine: true,
              fill: true,
            },
            {
              label: ar ? 'المحسوس' : 'Gefühlt',
              values: apparents,
              color: 'hsl(var(--live))',
              isLine: true,
              isDashed: true,
            },
          ],
          min,
          max,
          unit: '°C',
        };
      }
      case 'precip': {
        const precips = slice.map((e) => e.precip_probability_percent ?? 0);
        return {
          series: [
            {
              label: ar ? 'احتمالية الهطول' : 'Regenwahrscheinlichkeit',
              values: precips,
              color: 'hsl(200 80% 55%)',
              isBar: true,
            },
          ],
          min: 0,
          max: 100,
          unit: '%',
        };
      }
      case 'wind_humidity': {
        const winds = slice.map((e) => e.wind_kph ?? 0);
        const hums = slice.map((e) => e.humidity_percent ?? 0);
        const min = 0;
        const max = Math.max(...winds, ...hums, 40);
        return {
          series: [
            {
              label: ar ? 'الرياح' : 'Wind',
              values: winds,
              color: 'hsl(var(--primary))',
              isLine: true,
            },
            {
              label: ar ? 'الرطوبة' : 'Feuchtigkeit',
              values: hums,
              color: 'hsl(var(--live))',
              isLine: true,
            },
          ],
          min,
          max,
          unit: '',
        };
      }
    }
  };

  const { series, min, max, unit } = getDataForTab();
  const span = Math.max(1, max - min);

  const toPoint = (value: number, i: number) => ({
    x: padX + (i / (slice.length - 1)) * (W - padX * 2),
    y: padY + (1 - (value - min) / span) * (H - padY * 2),
  });

  const smoothPath = (points: Array<{ x: number; y: number }>, tension = 0.25) => {
    if (points.length < 2) return '';
    let d = `M ${points[0].x} ${points[0].y}`;
    for (let i = 0; i < points.length - 1; i++) {
      const p0 = points[i - 1] ?? points[i];
      const p1 = points[i];
      const p2 = points[i + 1];
      const p3 = points[i + 2] ?? p2;
      d += ` C ${p1.x + (p2.x - p0.x) * tension} ${p1.y + (p2.y - p0.y) * tension}, ${p2.x - (p3.x - p1.x) * tension} ${p2.y - (p3.y - p1.y) * tension}, ${p2.x} ${p2.y}`;
    }
    return d;
  };

  const tabs = [
    { id: 'temp', label: ar ? 'درجة الحرارة' : 'Temperatur', icon: Thermometer },
    { id: 'precip', label: ar ? 'احتمالية الهطول' : 'Niederschlag', icon: CloudSun },
    { id: 'wind_humidity', label: ar ? 'الرياح والرطوبة' : 'Wind & Feuchte', icon: Wind },
  ] as const;

  return (
    <section className="relative rounded-[22px] surface-depth overflow-hidden p-4">
      <span
        aria-hidden
        className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-primary/40 to-transparent"
      />

      <header className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 mb-4">
        <h2 className="font-montserrat font-semibold text-[20px] leading-none text-foreground flex items-center gap-2">
          <Activity className="w-5 h-5 text-primary" />
          {ar ? 'المنحنيات التفاعلية' : 'Interaktive Kurven'}
        </h2>

        <div className="flex bg-background/50 border border-border/40 p-1 rounded-xl gap-1">
          {tabs.map((t) => {
            const Icon = t.icon;
            const active = activeTab === t.id;
            return (
              <button
                key={t.id}
                onClick={() => {
                  setActiveTab(t.id);
                  setHoveredIdx(null);
                }}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                  active
                    ? 'bg-primary text-primary-foreground shadow-sm'
                    : 'text-muted-foreground hover:bg-muted/30 hover:text-foreground'
                }`}
              >
                <Icon className="w-3.5 h-3.5" />
                <span>{t.label}</span>
              </button>
            );
          })}
        </div>
      </header>

      <div className="relative w-full" style={{ aspectRatio: `${W} / ${H}` }} dir="ltr">
        <svg
          viewBox={`0 0 ${W} ${H}`}
          preserveAspectRatio="none"
          className="absolute inset-0 h-full w-full overflow-visible select-none"
          onMouseMove={(e) => {
            const rect = e.currentTarget.getBoundingClientRect();
            const mouseX = e.clientX - rect.left;
            const pct = (mouseX - padX) / (rect.width * ((W - padX * 2) / W));
            const idx = Math.max(
              0,
              Math.min(slice.length - 1, Math.round(pct * (slice.length - 1))),
            );
            setHoveredIdx(idx);
          }}
          onMouseLeave={() => setHoveredIdx(null)}
          onTouchMove={(e) => {
            if (e.touches.length === 0) return;
            const rect = e.currentTarget.getBoundingClientRect();
            const mouseX = e.touches[0].clientX - rect.left;
            const pct = (mouseX - padX) / (rect.width * ((W - padX * 2) / W));
            const idx = Math.max(
              0,
              Math.min(slice.length - 1, Math.round(pct * (slice.length - 1))),
            );
            setHoveredIdx(idx);
          }}
          onTouchEnd={() => setHoveredIdx(null)}
        >
          <defs>
            <linearGradient id="chart-area-grad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="hsl(var(--primary))" stopOpacity="0.22" />
              <stop offset="100%" stopColor="hsl(var(--primary))" stopOpacity="0" />
            </linearGradient>
            <linearGradient id="chart-live-grad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="hsl(var(--live))" stopOpacity="0.18" />
              <stop offset="100%" stopColor="hsl(var(--live))" stopOpacity="0" />
            </linearGradient>
          </defs>

          {/* Grid lines */}
          {[0, 0.25, 0.5, 0.75, 1].map((f, idx) => {
            const y = padY + f * (H - padY * 2);
            const val = max - f * span;
            return (
              <g key={idx}>
                <line
                  x1={padX}
                  x2={W - padX}
                  y1={y}
                  y2={y}
                  stroke="hsl(var(--foreground))"
                  strokeOpacity="0.06"
                  strokeWidth="0.75"
                />
                <text
                  x={padX - 6}
                  y={y + 3}
                  textAnchor="end"
                  fontSize="8"
                  fill="hsl(var(--muted-foreground))"
                  opacity="0.75"
                >
                  {Math.round(val)}
                  {unit}
                </text>
              </g>
            );
          })}

          {/* Time ticks */}
          {[0, 4, 8, 12, 16, 20, slice.length - 1].map((i) => {
            const p = toPoint(min, i);
            const time = new Date(slice[i].timestamp_unix);
            const label = time.getHours() + ':00';
            return (
              <text
                key={i}
                x={p.x}
                y={H - 4}
                textAnchor="middle"
                fontSize="8"
                fill="hsl(var(--muted-foreground))"
                opacity="0.8"
              >
                {label}
              </text>
            );
          })}

          {/* Interactive cursor line */}
          {hoveredIdx !== null && (
            <line
              x1={toPoint(min, hoveredIdx).x}
              x2={toPoint(min, hoveredIdx).x}
              y1={padY}
              y2={H - padY}
              stroke="hsl(var(--live))"
              strokeOpacity="0.35"
              strokeWidth="1.25"
              strokeDasharray="3 3"
            />
          )}

          {/* Plotting series */}
          {series.map((s, sIdx) => {
            if (s.isLine) {
              const points = s.values.map(toPoint);
              const path = smoothPath(points);
              const areaPath = s.fill
                ? `${path} L ${points[points.length - 1].x} ${H - padY} L ${points[0].x} ${H - padY} Z`
                : '';

              return (
                <g key={sIdx}>
                  {s.fill && (
                    <path
                      d={areaPath}
                      fill={
                        s.color.includes('live') ? 'url(#chart-live-grad)' : 'url(#chart-area-grad)'
                      }
                    />
                  )}
                  <motion.path
                    d={path}
                    fill="none"
                    stroke={s.color}
                    strokeWidth="2.2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeDasharray={s.isDashed ? '4 3' : 'none'}
                    initial={{ pathLength: 0 }}
                    animate={{ pathLength: 1 }}
                    transition={{ duration: 0.8, ease: 'easeOut' }}
                  />
                  {/* Subtle dots for vertices */}
                  {points.map((p, pIdx) => {
                    const isHovered = hoveredIdx === pIdx;
                    return (
                      <circle
                        key={pIdx}
                        cx={p.x}
                        cy={p.y}
                        r={isHovered ? 4.5 : 1.5}
                        fill={isHovered ? 'hsl(var(--background))' : s.color}
                        stroke={s.color}
                        strokeWidth={isHovered ? 2.5 : 0}
                        style={{ transition: 'r 0.15s ease, stroke-width 0.15s ease' }}
                      />
                    );
                  })}
                </g>
              );
            }

            if (s.isBar) {
              const colWidth = (W - padX * 2) / slice.length;
              return (
                <g key={sIdx}>
                  {s.values.map((v, i) => {
                    const p = toPoint(v, i);
                    const isHovered = hoveredIdx === i;
                    const barH = Math.max(2, H - padY - p.y);
                    return (
                      <rect
                        key={i}
                        x={p.x - colWidth * 0.35}
                        y={p.y}
                        width={colWidth * 0.7}
                        height={barH}
                        rx="3"
                        fill={isHovered ? 'hsl(var(--live))' : s.color}
                        fillOpacity={isHovered ? 0.95 : 0.65}
                        style={{ transition: 'fill 0.15s ease, fill-opacity 0.15s ease' }}
                      />
                    );
                  })}
                </g>
              );
            }

            return null;
          })}
        </svg>
      </div>

      {/* Floating interactive tooltip */}
      <div className="mt-4 min-h-[58px] rounded-xl border border-border/40 bg-secondary/30 p-2.5 flex items-center justify-between gap-4">
        {hoveredIdx !== null ? (
          <motion.div
            initial={{ opacity: 0, y: 4 }}
            animate={{ opacity: 1, y: 0 }}
            className="w-full flex items-center justify-between"
          >
            <div className="flex flex-col">
              <span className="text-[10px] uppercase tracking-wider text-muted-foreground">
                {ar ? 'الوقت المستهدف' : 'Zielzeit'}
              </span>
              <span className="text-sm font-semibold font-montserrat text-foreground tabular-nums">
                {new Date(slice[hoveredIdx].timestamp_unix).toLocaleTimeString(
                  ar ? 'en-US' : 'de-DE',
                  { hour: '2-digit', minute: '2-digit', hour12: false },
                )}
              </span>
            </div>

            <div className="flex gap-4">
              {series.map((s, idx) => (
                <div key={idx} className="flex flex-col items-end">
                  <span className="text-[10px] uppercase tracking-wider text-foreground flex items-center gap-1.5 font-semibold">
                    <span
                      className="w-1.5 h-1.5 rounded-full"
                      style={{ backgroundColor: s.color }}
                    />
                    {s.label}
                  </span>
                  <span className="text-sm font-semibold text-foreground font-montserrat tabular-nums">
                    {Math.round(s.values[hoveredIdx])}
                    {activeTab === 'temp'
                      ? '°C'
                      : activeTab === 'precip'
                        ? '%'
                        : idx === 0
                          ? ' km/h'
                          : '%'}
                  </span>
                </div>
              ))}
            </div>
          </motion.div>
        ) : (
          <div className="w-full text-center text-xs text-muted-foreground flex items-center justify-center gap-1.5 py-1">
            <Sparkles className="w-3.5 h-3.5 text-primary" />
            <span>
              {ar
                ? 'مرر الفأرة أو المس المنحنى لعرض التفاصيل الدقيقة للساعات'
                : 'Fahre über die Kurve, um stündliche Details anzuzeigen'}
            </span>
          </div>
        )}
      </div>
    </section>
  );
}
