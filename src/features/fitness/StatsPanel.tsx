/**
 * StatsPanel — analytics surface for the fitness feature.
 *
 * Merges Health Connect daily metrics with GPS sessions across a selectable
 * range (7 / 30 / 90 days) and renders the summary, trend, streaks and
 * personal records. Pure presentation: all math lives in `stats.ts`.
 */
import { memo, useMemo, useState } from 'react';
import { Area, AreaChart, ResponsiveContainer, Tooltip, XAxis } from 'recharts';

import { Flame, Gauge, Mountain, Timer, TrendingUp, Trophy } from '@/lib/icons';

import { formatDuration, formatPace } from './metrics';
import {
  buildDailySeries,
  computeRecords,
  computeStreaks,
  type DailyMetric,
  summarizeRange,
} from './stats';
import type { FitnessActivity } from './types';

const RANGES = [
  { days: 7, label: '٧ أيام' },
  { days: 30, label: '٣٠ يوم' },
  { days: 90, label: '٩٠ يوم' },
] as const;

type MetricKey = 'steps' | 'calories' | 'distanceKm';

const METRICS: Array<{ key: MetricKey; label: string; unit: string }> = [
  { key: 'steps', label: 'الخطوات', unit: 'خطوة' },
  { key: 'calories', label: 'السعرات', unit: 'سعرة' },
  { key: 'distanceKm', label: 'المسافة', unit: 'كم' },
];

interface TooltipProps {
  active?: boolean;
  payload?: Array<{ value: number }>;
  label?: string;
  unit?: string;
}

function ChartTip({ active, payload, label, unit = '' }: TooltipProps) {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-background/95 border border-border/40 px-3 py-1.5 rounded-xl shadow-lg backdrop-blur-md">
      <p className="text-micro text-muted-foreground/80 mb-0.5 font-bold">{label}</p>
      <p className="text-mini font-bold text-foreground tabular-nums">
        {Number(payload[0].value).toLocaleString('en-US')}
        <span className="text-micro text-muted-foreground/80 font-normal ms-1">{unit}</span>
      </p>
    </div>
  );
}

function Stat({ value, label }: { value: string; label: string }) {
  return (
    <div className="flex flex-col text-start">
      <span className="text-lead font-extrabold text-foreground tabular-nums leading-none">{value}</span>
      <span className="text-micro text-muted-foreground/80 mt-1">{label}</span>
    </div>
  );
}

interface Props {
  activities: FitnessActivity[];
  metrics: DailyMetric[];
  accent: string;
}

function StatsPanelImpl({ activities, metrics, accent }: Props) {
  const [days, setDays] = useState<number>(7);
  const [metricKey, setMetricKey] = useState<MetricKey>('steps');

  const series = useMemo(
    () => buildDailySeries(activities, metrics, days),
    [activities, metrics, days]
  );
  const summary = useMemo(
    () => summarizeRange(activities, metrics, days),
    [activities, metrics, days]
  );
  const streaks = useMemo(() => computeStreaks(activities, metrics), [activities, metrics]);
  const records = useMemo(() => computeRecords(activities, metrics), [activities, metrics]);

  const activeMetric = METRICS.find((m) => m.key === metricKey) ?? METRICS[0];

  return (
    <section className="space-y-4 text-start">
      <div className="flex items-center justify-between gap-2">
        <h3 className="text-mini font-bold text-foreground inline-flex items-center gap-1.5">
          <TrendingUp className="w-3.5 h-3.5" style={{ color: accent }} />
          التحليلات
        </h3>
        <div className="inline-flex rounded-full border border-border/40 bg-card/30 p-0.5">
          {RANGES.map((r) => (
            <button
              key={r.days}
              onClick={() => setDays(r.days)}
              className={`px-2.5 py-1 rounded-full text-micro font-bold transition-colors ${
                days === r.days ? 'text-primary-foreground' : 'text-muted-foreground'
              }`}
              style={days === r.days ? { background: accent } : undefined}
            >
              {r.label}
            </button>
          ))}
        </div>
      </div>

      {/* Range summary */}
      <div className="grid grid-cols-4 gap-2 border-y border-border/30 py-3">
        <Stat value={summary.steps.toLocaleString('en-US')} label="خطوة" />
        <Stat value={(summary.distanceMeters / 1000).toFixed(1)} label="كم" />
        <Stat value={summary.calories.toLocaleString('en-US')} label="سعرة" />
        <Stat value={formatDuration(summary.seconds)} label="زمن الحركة" />
      </div>

      {/* Metric switcher + trend */}
      <div className="space-y-2">
        <div className="inline-flex gap-1.5">
          {METRICS.map((m) => (
            <button
              key={m.key}
              onClick={() => setMetricKey(m.key)}
              className={`px-2.5 py-1 rounded-full text-micro font-bold border transition-colors ${
                metricKey === m.key
                  ? 'border-transparent text-primary-foreground'
                  : 'border-border/40 text-muted-foreground'
              }`}
              style={metricKey === m.key ? { background: accent } : undefined}
            >
              {m.label}
            </button>
          ))}
        </div>
        <div className="h-32 w-full border border-border/20 bg-card/10 rounded-xl p-1.5">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={series} margin={{ top: 4, right: 4, left: 4, bottom: 2 }}>
              <defs>
                <linearGradient id="statsGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor={accent} stopOpacity={0.22} />
                  <stop offset="95%" stopColor={accent} stopOpacity={0} />
                </linearGradient>
              </defs>
              <XAxis
                dataKey="label"
                axisLine={false}
                tickLine={false}
                interval="preserveStartEnd"
                minTickGap={16}
                tick={{ fontSize: 8, fill: 'currentColor', opacity: 0.4 }}
              />
              <Tooltip content={<ChartTip unit={activeMetric.unit} />} cursor={false} />
              <Area
                type="monotone"
                dataKey={metricKey}
                stroke={accent}
                strokeWidth={1.5}
                fillOpacity={1}
                fill="url(#statsGradient)"
                isAnimationActive={false}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Streaks */}
      <div className="grid grid-cols-3 gap-2">
        <div className="rounded-xl border border-border/30 bg-card/25 p-3">
          <span className="text-micro text-muted-foreground block">سلسلة حالية</span>
          <span className="text-body font-extrabold tabular-nums text-foreground">
            {streaks.current}
            <span className="text-micro font-normal text-muted-foreground ms-1">يوم</span>
          </span>
        </div>
        <div className="rounded-xl border border-border/30 bg-card/25 p-3">
          <span className="text-micro text-muted-foreground block">أطول سلسلة</span>
          <span className="text-body font-extrabold tabular-nums text-foreground">
            {streaks.longest}
            <span className="text-micro font-normal text-muted-foreground ms-1">يوم</span>
          </span>
        </div>
        <div className="rounded-xl border border-border/30 bg-card/25 p-3">
          <span className="text-micro text-muted-foreground block">أيام نشطة</span>
          <span className="text-body font-extrabold tabular-nums text-foreground">
            {summary.activeDays}
            <span className="text-micro font-normal text-muted-foreground ms-1">/{days}</span>
          </span>
        </div>
      </div>

      {/* Personal records */}
      <div className="rounded-section border border-border/30 bg-card/25 p-4 space-y-3">
        <h4 className="text-micro font-bold text-foreground inline-flex items-center gap-1.5">
          <Trophy className="w-3.5 h-3.5" style={{ color: accent }} />
          أرقامك القياسية
        </h4>
        <div className="grid grid-cols-2 gap-3">
          <div className="flex items-center gap-2">
            <Mountain className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
            <div>
              <p className="text-micro text-muted-foreground">أطول مسافة</p>
              <p className="text-mini font-bold tabular-nums text-foreground">
                {(records.longestDistanceMeters / 1000).toFixed(2)} كم
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Timer className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
            <div>
              <p className="text-micro text-muted-foreground">أطول جلسة</p>
              <p className="text-mini font-bold tabular-nums text-foreground">
                {formatDuration(records.longestDurationSeconds)}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Gauge className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
            <div>
              <p className="text-micro text-muted-foreground">أسرع إيقاع</p>
              <p className="text-mini font-bold tabular-nums text-foreground">
                {formatPace(records.fastestPaceSecPerKm)} /كم
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Flame className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
            <div>
              <p className="text-micro text-muted-foreground">أعلى حرق</p>
              <p className="text-mini font-bold tabular-nums text-foreground">
                {records.mostCalories.toLocaleString('en-US')} سعرة
              </p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

export const StatsPanel = memo(StatsPanelImpl);
export default StatsPanel;
