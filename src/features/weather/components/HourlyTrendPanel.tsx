/**
 * HourlyTrendPanel — the interactive 48-hour panel.
 *
 * Replaces the previous `InteractiveCharts`, which drew ~200 SVG nodes and
 * re-styled all of them on every pointer move, and — more importantly — drew a
 * single confident line through numbers that came from a *single* model (see
 * ForecastEnsemble.ts). This panel renders the ensemble honestly:
 *
 *   • the blended line is what we believe,
 *   • the shaded band is the spread between the models that voted,
 *   • the readout states how many models voted and how far apart they were.
 *
 * A forecast that hides its own uncertainty is a worse forecast, and the band
 * costs nothing to draw once the data carries it.
 */
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import { useMemo, useState } from 'react';

import { AppCard } from '@/components/ui/app-shell';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useApp } from '@/contexts/AppContext';
import { Droplets, Thermometer, Wind } from '@/lib/icons';

import type { HourlyEntry } from '../types/ForecastLayer';
import CanvasChart, { type ChartSeries } from './charts/CanvasChart';

type MetricId = 'temperature' | 'precipitation' | 'wind';

const METRICS: { id: MetricId; label: string; icon: typeof Thermometer }[] = [
  { id: 'temperature', label: 'الحرارة', icon: Thermometer },
  { id: 'precipitation', label: 'الهطول', icon: Droplets },
  { id: 'wind', label: 'الريح والرطوبة', icon: Wind },
];

const HOURS_SHOWN = 24;

interface Props {
  entries: HourlyEntry[];
}

function hourLabel(unix: number): string {
  const d = new Date(unix);
  return `${String(d.getHours()).padStart(2, '0')}`;
}

export default function HourlyTrendPanel({ entries }: Props) {
  const { theme, colorTheme } = useApp();
  const reduce = useReducedMotion();
  const [metric, setMetric] = useState<MetricId>('temperature');
  const [activeIndex, setActiveIndex] = useState<number | null>(null);

  const slice = useMemo(() => entries.slice(0, HOURS_SHOWN), [entries]);
  const xLabels = useMemo(() => slice.map((e) => hourLabel(e.timestamp_unix)), [slice]);

  const series = useMemo<ChartSeries[]>(() => {
    if (slice.length === 0) return [];
    switch (metric) {
      case 'temperature': {
        const hasBand = slice.some(
          (e) => e.temperature_min_c !== undefined && e.temperature_max_c !== undefined,
        );
        const out: ChartSeries[] = [];
        if (hasBand) {
          out.push({
            id: 'band',
            label: 'نطاق النماذج',
            kind: 'band',
            values: slice.map((e) => e.temperature_max_c ?? e.temperature_c),
            lowerValues: slice.map((e) => e.temperature_min_c ?? e.temperature_c),
            colorVar: '--primary',
            fillAlpha: 0.14,
            unit: '°',
          });
        }
        out.push(
          {
            id: 'actual',
            label: 'الحرارة',
            kind: 'line',
            values: slice.map((e) => e.temperature_c),
            colorVar: '--primary',
            strokeWidth: 2.2,
            unit: '°',
          },
          {
            id: 'apparent',
            label: 'المحسوسة',
            kind: 'line',
            values: slice.map((e) => e.apparent_c),
            colorVar: '--muted-foreground',
            dash: [4, 3],
            strokeWidth: 1.6,
            unit: '°',
          },
        );
        return out;
      }
      case 'precipitation':
        return [
          {
            id: 'probability',
            label: 'احتمال الهطول',
            kind: 'bar',
            values: slice.map((e) => e.precip_probability_percent),
            colorVar: '--primary',
            fillAlpha: 0.55,
            unit: '%',
          },
        ];
      case 'wind':
        return [
          {
            id: 'wind',
            label: 'سرعة الريح',
            kind: 'area',
            values: slice.map((e) => e.wind_kph),
            colorVar: '--primary',
            fillAlpha: 0.14,
            strokeWidth: 2,
            unit: ' كم/س',
          },
          {
            id: 'humidity',
            label: 'الرطوبة',
            kind: 'line',
            values: slice.map((e) => e.humidity_percent),
            colorVar: '--muted-foreground',
            dash: [4, 3],
            strokeWidth: 1.6,
            unit: '%',
          },
        ];
    }
  }, [metric, slice]);

  // Probability is a 0..100 quantity: letting it auto-scale would turn a 4%
  // chance of rain into a full-height bar.
  const domain = metric === 'precipitation' ? { min: 0, max: 100 } : undefined;

  if (slice.length < 2) return null;

  const active = activeIndex !== null ? slice[activeIndex] : null;
  const readoutTime = active
    ? new Date(active.timestamp_unix).toLocaleTimeString('ar', {
        hour: '2-digit',
        minute: '2-digit',
        hour12: false,
      })
    : null;

  return (
    <AppCard as="section" aria-label="منحنى الساعات القادمة التفاعلي">
      <header className="mb-3 flex items-baseline justify-between gap-3">
        <h2 className="text-title font-semibold text-foreground">منحنى ٢٤ ساعة</h2>
        <p className="text-mini text-muted-foreground">مزيج المصادر</p>
      </header>

      <Tabs value={metric} onValueChange={(v) => setMetric(v as MetricId)}>
        <TabsList>
          {METRICS.map((m) => {
            const Icon = m.icon;
            return (
              <TabsTrigger key={m.id} value={m.id} className="gap-1.5 text-meta">
                <Icon className="h-4 w-4" aria-hidden />
                <span className="truncate">{m.label}</span>
              </TabsTrigger>
            );
          })}
        </TabsList>
      </Tabs>

      <div className="mt-4">
        <CanvasChart
          key={metric}
          xLabels={xLabels}
          series={series}
          domain={domain}
          height={196}
          activeIndex={activeIndex}
          onActiveIndexChange={setActiveIndex}
          themeKey={`${theme}-${colorTheme}-${metric}`}
          ariaLabel={`منحنى ${METRICS.find((m) => m.id === metric)?.label} لأربع وعشرين ساعة`}
          formatTick={(v) => `${Math.round(v)}`}
        />
      </div>

      {/* Legend */}
      <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1.5">
        {series
          .filter((s) => s.kind !== 'band')
          .map((s) => (
            <span key={s.id} className="flex items-center gap-1.5 text-mini text-muted-foreground">
              <span
                className="h-0.5 w-4 rounded-full"
                style={{ backgroundColor: `hsl(var(${s.colorVar}))` }}
                aria-hidden
              />
              {s.label}
            </span>
          ))}
        {series.some((s) => s.kind === 'band') && (
          <span className="flex items-center gap-1.5 text-mini text-muted-foreground">
            <span className="h-2.5 w-4 rounded-sm bg-primary/15" aria-hidden />
            نطاق تباعد النماذج
          </span>
        )}
      </div>

      {/* Readout. aria-live so keyboard scrubbing is announced. */}
      <div className="mt-3 min-h-[64px] rounded-md border border-border p-3" aria-live="polite">
        <AnimatePresence mode="wait" initial={false}>
          {active ? (
            <motion.div
              key={activeIndex}
              initial={reduce ? { opacity: 0 } : { opacity: 0, y: 4 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.14, ease: [0.16, 1, 0.3, 1] }}
              className="flex flex-wrap items-center justify-between gap-3"
            >
              <span>
                <span className="block text-micro uppercase tracking-[0.14em] text-muted-foreground">الساعة</span>
                <span className="block text-body font-semibold tabular-nums text-foreground" dir="ltr">
                  {readoutTime}
                </span>
              </span>

              <span className="flex flex-wrap items-center gap-x-4 gap-y-1">
                {metric === 'temperature' && (
                  <>
                    <Readout label="الحرارة" value={`${Math.round(active.temperature_c)}°`} />
                    <Readout label="المحسوسة" value={`${Math.round(active.apparent_c)}°`} />
                  </>
                )}
                {metric === 'precipitation' && (
                  <>
                    <Readout label="الاحتمال" value={`${active.precip_probability_percent}%`} />
                    <Readout label="الكمية" value={`${active.precip_mm.toFixed(1)} مم`} />
                  </>
                )}
                {metric === 'wind' && (
                  <>
                    <Readout label="الريح" value={`${Math.round(active.wind_kph)} كم/س`} />
                    <Readout label="الرطوبة" value={`${active.humidity_percent}%`} />
                  </>
                )}
                <Readout label="الثقة" value={`${active.confidence_percent}%`} />
                {active.sources_count !== undefined && (
                  <Readout
                    label="المصادر"
                    value={
                      active.spread_c !== undefined && active.spread_c > 0
                        ? `${active.sources_count} · ±${active.spread_c.toFixed(1)}°`
                        : String(active.sources_count)
                    }
                  />
                )}
              </span>
            </motion.div>
          ) : (
            <motion.p
              key="hint"
              initial={reduce ? { opacity: 0 } : { opacity: 0, y: 4 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.14, ease: [0.16, 1, 0.3, 1] }}
              className="text-mini text-muted-foreground"
            >
              مرّر إصبعك أو المؤشر على المنحنى لقراءة كل ساعة — والأسهم تعمل أيضاً بعد تحديد المنحنى.
            </motion.p>
          )}
        </AnimatePresence>
      </div>
    </AppCard>
  );
}

function Readout({ label, value }: { label: string; value: string }) {
  return (
    <span className="text-end">
      <span className="block text-micro uppercase tracking-[0.14em] text-muted-foreground">{label}</span>
      <span className="block text-meta font-semibold tabular-nums text-foreground" dir="ltr">
        {value}
      </span>
    </span>
  );
}
