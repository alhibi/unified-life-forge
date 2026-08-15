import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import { cn } from '@/lib/utils';

import { cryptoApi } from '../api';
import {
  type Candle,
  type ChainId,
  CHART_RANGE_LABELS,
  CHART_RANGES,
  type ChartRange,
} from '../types';

interface PriceChartProps {
  chainId: ChainId;
  pairAddress: string;
  symbol: string;
  quoteSymbol: string;
  name: string;
  /** Live price coming from the watchlist feed, used as the trailing point. */
  livePriceUsd?: string;
}

type LoadState = 'idle' | 'loading' | 'success' | 'error';

const VIEW_W = 1000;
const VIEW_H = 340;
const PAD_TOP = 18;
const PAD_BOTTOM = 34;

function formatPrice(value: number): string {
  if (!Number.isFinite(value)) return '—';
  const abs = Math.abs(value);
  const digits = abs >= 1000 ? 2 : abs >= 1 ? 4 : abs >= 0.01 ? 6 : 8;
  return value.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: digits });
}

function splitPrice(value: number): { head: string; tail: string } {
  const text = formatPrice(value);
  const dot = text.indexOf('.');
  if (dot === -1) return { head: text, tail: '' };
  return { head: text.slice(0, dot), tail: text.slice(dot) };
}

function formatAxisTime(seconds: number, range: ChartRange): string {
  const date = new Date(seconds * 1000);
  if (range === '1D') {
    return date.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });
  }
  if (range === '5D' || range === '1M') {
    return date.toLocaleDateString('en-GB', { day: '2-digit', month: 'short' });
  }
  return date.toLocaleDateString('en-GB', { month: 'short', year: '2-digit' });
}

function formatTooltipTime(seconds: number, range: ChartRange): string {
  const date = new Date(seconds * 1000);
  if (range === '1D' || range === '5D') {
    return date.toLocaleString('en-GB', {
      day: '2-digit',
      month: 'short',
      hour: '2-digit',
      minute: '2-digit',
    });
  }
  return date.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
}

/** Builds a smoothed path (Catmull-Rom → cubic bézier) so the line reads modern, not jagged. */
function buildSmoothPath(points: { x: number; y: number }[]): string {
  if (points.length === 0) return '';
  if (points.length < 3) {
    return points.map((p, i) => `${i === 0 ? 'M' : 'L'}${p.x.toFixed(2)} ${p.y.toFixed(2)}`).join(' ');
  }

  let path = `M${points[0].x.toFixed(2)} ${points[0].y.toFixed(2)}`;
  for (let i = 0; i < points.length - 1; i += 1) {
    const p0 = points[i === 0 ? 0 : i - 1];
    const p1 = points[i];
    const p2 = points[i + 1];
    const p3 = points[i + 2] ?? p2;
    const c1x = p1.x + (p2.x - p0.x) / 6;
    const c1y = p1.y + (p2.y - p0.y) / 6;
    const c2x = p2.x - (p3.x - p1.x) / 6;
    const c2y = p2.y - (p3.y - p1.y) / 6;
    path += ` C${c1x.toFixed(2)} ${c1y.toFixed(2)}, ${c2x.toFixed(2)} ${c2y.toFixed(2)}, ${p2.x.toFixed(2)} ${p2.y.toFixed(2)}`;
  }
  return path;
}

export default function PriceChart({
  chainId,
  pairAddress,
  symbol,
  quoteSymbol,
  name,
  livePriceUsd,
}: PriceChartProps) {
  const [range, setRange] = useState<ChartRange>('1D');
  const [candles, setCandles] = useState<Candle[]>([]);
  const [state, setState] = useState<LoadState>('idle');
  const [hoverIndex, setHoverIndex] = useState<number | null>(null);
  const svgRef = useRef<SVGSVGElement | null>(null);
  const cacheRef = useRef<Map<ChartRange, Candle[]>>(new Map());

  useEffect(() => {
    cacheRef.current.clear();
  }, [chainId, pairAddress]);

  useEffect(() => {
    let cancelled = false;

    const cached = cacheRef.current.get(range);
    if (cached) {
      setCandles(cached);
      setState('success');
    } else {
      setState('loading');
    }

    (async () => {
      try {
        const series = await cryptoApi.getCandles(chainId, pairAddress, range);
        if (cancelled) return;
        cacheRef.current.set(range, series.candles);
        setCandles(series.candles);
        setState(series.candles.length > 0 ? 'success' : 'error');
      } catch {
        if (!cancelled) setState(cached ? 'success' : 'error');
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [chainId, pairAddress, range]);

  const series = useMemo(() => {
    const values = candles.map((c) => Number.parseFloat(c.c)).filter((v) => Number.isFinite(v));
    if (values.length === 0) return null;

    // Blend the live price into the trailing point so header and chart never disagree.
    const live = livePriceUsd ? Number.parseFloat(livePriceUsd) : NaN;
    if (Number.isFinite(live) && live > 0) values[values.length - 1] = live;

    const baseline = values[0];
    const min = Math.min(...values, baseline);
    const max = Math.max(...values, baseline);
    const span = max - min || Math.max(max * 0.001, 1e-9);
    const usableH = VIEW_H - PAD_TOP - PAD_BOTTOM;

    const toY = (value: number) => PAD_TOP + (1 - (value - min) / span) * usableH;
    const stepX = values.length > 1 ? VIEW_W / (values.length - 1) : 0;

    const points = values.map((value, i) => ({ x: i * stepX, y: toY(value), value, t: candles[i].t }));

    return {
      points,
      min,
      max,
      baseline,
      baselineY: toY(baseline),
      last: values[values.length - 1],
      linePath: buildSmoothPath(points),
      areaPath: `${buildSmoothPath(points)} L${VIEW_W} ${VIEW_H - PAD_BOTTOM} L0 ${VIEW_H - PAD_BOTTOM} Z`,
    };
  }, [candles, livePriceUsd]);

  const isUp = series ? series.last >= series.baseline : true;
  const trendColor = isUp ? 'hsl(160 84% 42%)' : 'hsl(350 80% 58%)';
  const gradientId = `chart-grad-${isUp ? 'up' : 'down'}`;

  const activePoint = series
    ? series.points[hoverIndex ?? series.points.length - 1] ?? null
    : null;

  const displayValue = activePoint?.value ?? series?.last ?? Number.parseFloat(livePriceUsd ?? '0');
  const delta = series ? displayValue - series.baseline : 0;
  const deltaPct = series && series.baseline !== 0 ? (delta / series.baseline) * 100 : 0;
  const deltaUp = delta >= 0;
  const { head, tail } = splitPrice(displayValue);

  const handlePointer = useCallback(
    (event: React.PointerEvent<SVGSVGElement>) => {
      if (!series || !svgRef.current) return;
      const rect = svgRef.current.getBoundingClientRect();
      const ratio = (event.clientX - rect.left) / rect.width;
      const clamped = Math.min(Math.max(ratio, 0), 1);
      setHoverIndex(Math.round(clamped * (series.points.length - 1)));
    },
    [series]
  );

  const axisTicks = useMemo(() => {
    if (!series || series.points.length < 2) return [];
    const count = 4;
    return Array.from({ length: count }, (_, i) => {
      const idx = Math.round((i / (count - 1)) * (series.points.length - 1));
      return { x: series.points[idx].x, label: formatAxisTime(series.points[idx].t, range) };
    });
  }, [series, range]);

  const priceTicks = useMemo(() => {
    if (!series) return [];
    const count = 4;
    return Array.from({ length: count }, (_, i) => {
      const value = series.min + ((series.max - series.min) * i) / (count - 1);
      const y = PAD_TOP + (1 - i / (count - 1)) * (VIEW_H - PAD_TOP - PAD_BOTTOM);
      return { value, y };
    });
  }, [series]);

  return (
    <section className="relative overflow-hidden rounded-3xl border border-border/10 bg-gradient-to-b from-muted/10 to-transparent">
      {/* Header — identity, live price and delta */}
      <header className="px-4 pt-4 text-end" dir="rtl">
        <p className="text-[0.6875rem] font-semibold tracking-wide text-muted-foreground">
          {symbol} / {quoteSymbol}
        </p>
        <p className="mt-0.5 text-xs text-muted-foreground/70">{name}</p>

        <div className="mt-2 flex items-baseline justify-end gap-1 font-plex-mono tabular-nums" dir="ltr">
          <span className="text-[2.25rem] font-semibold leading-none tracking-tight text-foreground">{head}</span>
          <span className="text-lg font-medium leading-none text-muted-foreground">{tail}</span>
        </div>

        <div className="mt-2 flex items-center justify-end gap-2">
          <span className="text-[0.6875rem] text-muted-foreground">{CHART_RANGE_LABELS[range]}</span>
          <span
            className="font-plex-mono text-[0.6875rem] tabular-nums text-muted-foreground"
            dir="ltr"
          >
            ({deltaUp ? '+' : ''}
            {formatPrice(delta)})
          </span>
          <span
            className={cn(
              'flex items-center gap-1 rounded-full px-2 py-0.5 font-plex-mono text-[0.6875rem] font-bold tabular-nums',
              deltaUp ? 'bg-emerald-500/12 text-emerald-500' : 'bg-rose-500/12 text-rose-500'
            )}
            dir="ltr"
          >
            {deltaUp ? '▲' : '▼'} {Math.abs(deltaPct).toFixed(2)}%
          </span>
        </div>
      </header>

      {/* Plot */}
      <div className="relative mt-3 h-56 w-full">
        {state === 'loading' && !series && (
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="h-28 w-full animate-pulse rounded-2xl bg-muted/20" />
          </div>
        )}

        {state === 'error' && !series && (
          <div className="absolute inset-0 flex items-center justify-center px-6 text-center">
            <p className="text-xs text-muted-foreground">
              لا تتوفر بيانات رسم بياني لهذا الزوج حالياً.
            </p>
          </div>
        )}

        {series && (
          <>
            {/* Price scale */}
            <div className="pointer-events-none absolute inset-y-0 start-0 z-10 w-16">
              {priceTicks.map((tick) => (
                <span
                  key={tick.y}
                  className="absolute -translate-y-1/2 font-plex-mono text-[0.5625rem] tabular-nums text-muted-foreground/60"
                  style={{ top: `${(tick.y / VIEW_H) * 100}%`, left: 0 }}
                >
                  {formatPrice(tick.value)}
                </span>
              ))}
            </div>

            <svg
              ref={svgRef}
              viewBox={`0 0 ${VIEW_W} ${VIEW_H}`}
              preserveAspectRatio="none"
              className="h-full w-full touch-pan-y ps-16"
              onPointerMove={handlePointer}
              onPointerDown={handlePointer}
              onPointerLeave={() => setHoverIndex(null)}
              role="img"
              aria-label={`الرسم البياني لسعر ${symbol} خلال ${CHART_RANGE_LABELS[range]}`}
            >
              <defs>
                <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor={trendColor} stopOpacity="0.28" />
                  <stop offset="60%" stopColor={trendColor} stopOpacity="0.06" />
                  <stop offset="100%" stopColor={trendColor} stopOpacity="0" />
                </linearGradient>
              </defs>

              {/* Vertical time gridlines */}
              {axisTicks.map((tick) => (
                <line
                  key={`grid-${tick.x}`}
                  x1={tick.x}
                  x2={tick.x}
                  y1={PAD_TOP}
                  y2={VIEW_H - PAD_BOTTOM}
                  stroke="currentColor"
                  className="text-border/20"
                  strokeWidth="1"
                  vectorEffect="non-scaling-stroke"
                />
              ))}

              {/* Previous close baseline */}
              <line
                x1="0"
                x2={VIEW_W}
                y1={series.baselineY}
                y2={series.baselineY}
                stroke="currentColor"
                className="text-muted-foreground/50"
                strokeWidth="1"
                strokeDasharray="2 5"
                vectorEffect="non-scaling-stroke"
              />

              <path d={series.areaPath} fill={`url(#${gradientId})`} />
              <path
                d={series.linePath}
                fill="none"
                stroke={trendColor}
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                vectorEffect="non-scaling-stroke"
              />

              {activePoint && (
                <>
                  {hoverIndex !== null && (
                    <line
                      x1={activePoint.x}
                      x2={activePoint.x}
                      y1={PAD_TOP}
                      y2={VIEW_H - PAD_BOTTOM}
                      stroke={trendColor}
                      strokeOpacity="0.4"
                      strokeWidth="1"
                      vectorEffect="non-scaling-stroke"
                    />
                  )}
                  <circle cx={activePoint.x} cy={activePoint.y} r="14" fill={trendColor} fillOpacity="0.16" />
                  <circle
                    cx={activePoint.x}
                    cy={activePoint.y}
                    r="4.5"
                    fill={trendColor}
                    stroke="hsl(var(--background))"
                    strokeWidth="2"
                    vectorEffect="non-scaling-stroke"
                  />
                </>
              )}
            </svg>

            {/* Time axis */}
            <div className="pointer-events-none absolute bottom-0 start-16 end-0 h-5">
              {axisTicks.map((tick) => (
                <span
                  key={`label-${tick.x}`}
                  className="absolute -translate-x-1/2 font-plex-mono text-[0.5625rem] tabular-nums text-muted-foreground/60"
                  style={{ left: `${(tick.x / VIEW_W) * 100}%` }}
                >
                  {tick.label}
                </span>
              ))}
            </div>

            {/* Hover readout */}
            {hoverIndex !== null && activePoint && (
              <div
                className="pointer-events-none absolute top-1 z-20 -translate-x-1/2 rounded-xl border border-border/20 bg-background/90 px-2.5 py-1.5 text-center shadow-lg backdrop-blur"
                style={{
                  left: `calc(4rem + ${(activePoint.x / VIEW_W) * 100}% * (1 - 4rem / 100%))`,
                }}
              >
                <p className="font-plex-mono text-[0.6875rem] font-bold tabular-nums text-foreground" dir="ltr">
                  ${formatPrice(activePoint.value)}
                </p>
                <p className="font-plex-mono text-[0.5625rem] tabular-nums text-muted-foreground" dir="ltr">
                  {formatTooltipTime(activePoint.t, range)}
                </p>
              </div>
            )}
          </>
        )}
      </div>

      {/* Range switcher */}
      <div className="flex items-center justify-between gap-1 px-3 pb-3 pt-1" dir="rtl">
        {CHART_RANGES.map((option) => (
          <button
            key={option}
            type="button"
            onClick={() => {
              setHoverIndex(null);
              setRange(option);
            }}
            className={cn(
              'flex-1 rounded-full px-2 py-1.5 text-[0.6875rem] font-semibold transition-colors duration-normal active:scale-95',
              range === option
                ? isUp
                  ? 'bg-emerald-500/12 text-emerald-500'
                  : 'bg-rose-500/12 text-rose-500'
                : 'text-muted-foreground hover:bg-muted/20 hover:text-foreground'
            )}
            aria-pressed={range === option}
          >
            {CHART_RANGE_LABELS[option]}
          </button>
        ))}
      </div>
    </section>
  );
}
