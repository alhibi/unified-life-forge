import { useEffect, useState } from 'react';

import { Activity } from '@/lib/icons';
import {
  type FrameStats,
  getFrameStats,
  type PerfMode,
  resetPerfCounters,
  subscribeFrameStats,
  subscribePerfMode,
} from '@/lib/perfMonitor';

interface CellProps {
  label: string;
  value: string;
  unit?: string;
  hint?: string;
  tone?: 'default' | 'good' | 'warn' | 'bad';
}

function Cell({ label, value, unit, hint, tone = 'default' }: CellProps) {
  const toneClass =
    tone === 'good'
      ? 'text-success'
      : tone === 'warn'
        ? 'text-warning'
        : tone === 'bad'
          ? 'text-destructive'
          : 'text-foreground';
  return (
    <div className="rounded-md bg-secondary/60 px-3 py-2.5">
      <p className="text-micro font-medium uppercase tracking-wider text-muted-foreground/70">
        {label}
      </p>
      <p className={`mt-0.5 text-lead font-bold leading-tight tabular-nums ${toneClass}`}>
        {value}
        {unit ? (
          <span className="ms-0.5 text-mini font-normal text-muted-foreground">{unit}</span>
        ) : null}
      </p>
      {hint ? <p className="mt-0.5 font-mono text-micro text-muted-foreground/60">{hint}</p> : null}
    </div>
  );
}

/**
 * Live frame-health readout.
 *
 * Subscribes to the SHARED monitor in `src/lib/perfMonitor.ts` rather than
 * opening its own rAF loop, so the numbers describe the app rather than the
 * cost of measuring the app. It reads the wrapped `requestAnimationFrame`, i.e.
 * the same one every animation in the product flows through — including the
 * user's own frame cap. That is the point: this panel reports the cadence the
 * user actually receives, not the one the hardware could theoretically deliver.
 */
export default function PerformancePanel({ nativeHz }: { nativeHz: number | null }) {
  const [stats, setStats] = useState<FrameStats>(getFrameStats);
  const [mode, setMode] = useState<PerfMode>('normal');

  useEffect(() => subscribeFrameStats(setStats), []);
  useEffect(() => subscribePerfMode(setMode), []);

  const budgetHz = stats.budgetHz;
  const fpsTone: CellProps['tone'] =
    stats.fps === 0
      ? 'default'
      : stats.fps >= budgetHz - 4
        ? 'good'
        : stats.fps >= budgetHz * 0.8
          ? 'warn'
          : 'bad';
  const p95Tone: CellProps['tone'] =
    stats.frameP95 === 0
      ? 'default'
      : stats.frameP95 <= stats.budget * 1.2
        ? 'good'
        : stats.frameP95 <= stats.budget * 1.8
          ? 'warn'
          : 'bad';

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2 font-mono text-mini">
          <Activity className="h-3.5 w-3.5 text-muted-foreground" aria-hidden />
          <span className="tabular-nums text-muted-foreground">
            {stats.fps} / {budgetHz} Hz
          </span>
          {nativeHz !== null ? (
            <span className="text-muted-foreground/60">· الشاشة {nativeHz} Hz</span>
          ) : null}
        </div>
        {mode === 'saver' ? (
          <span className="rounded-sm bg-warning px-2 py-0.5 text-micro font-semibold text-warning-foreground">
            وضع التوفير نشط
          </span>
        ) : null}
      </div>

      <div className="grid grid-cols-3 gap-2">
        <Cell
          label="إطار/ث"
          value={String(stats.fps)}
          unit="hz"
          hint={`الهدف ${budgetHz}`}
          tone={fpsTone}
        />
        <Cell
          label="زمن الإطار"
          value={stats.frameAvg.toFixed(1)}
          unit="ms"
          hint={`ميزانية ${stats.budget.toFixed(1)}`}
        />
        <Cell
          label="أسوأ ٥٪"
          value={stats.frameP95.toFixed(1)}
          unit="ms"
          hint="p95"
          tone={p95Tone}
        />
        <Cell label="إطارات ساقطة" value={String(stats.drops)} unit="/ث" hint="مقابل الميزانية" />
        <Cell label="تأخّر" value={String(stats.jank)} hint="مدى الجلسة" />
        <Cell label="مهام طويلة" value={String(stats.longTasks)} hint=">50ms" />
      </div>

      <div className="grid grid-cols-2 gap-2">
        <Cell
          label="الصحة"
          value={String(Math.round(stats.health * 100))}
          unit="٪"
          hint="معدّل + انتظام"
          tone={stats.health >= 0.9 ? 'good' : stats.health >= 0.7 ? 'warn' : 'bad'}
        />
        <Cell
          label="الذاكرة"
          value={stats.heapMB === null ? '—' : stats.heapMB.toFixed(1)}
          unit={stats.heapMB === null ? '' : 'MB'}
          hint={stats.heapMB === null ? 'غير مدعوم' : 'JS heap'}
        />
      </div>

      <button
        type="button"
        onClick={resetPerfCounters}
        className="min-h-[var(--ui-touch-min)] w-full rounded-md bg-secondary text-meta font-medium text-muted-foreground transition-colors"
      >
        تصفير العدّادات التراكمية
      </button>
    </div>
  );
}
