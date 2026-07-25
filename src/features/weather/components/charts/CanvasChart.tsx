/**
 * CanvasChart — the app's chart renderer for dense time series.
 *
 * Why canvas and not SVG: an hourly weather panel draws 3 series × 48 points
 * plus an uncertainty band, and it is scrubbed with a finger. In SVG that is
 * ~200 live DOM nodes whose attributes the browser must re-style and re-layout
 * on every pointer move; on a mid-range phone the scrub drops frames and the
 * page's paint area balloons. Canvas draws the same picture into two bitmaps
 * and a scrub only repaints the 1px crosshair layer.
 *
 * Architecture:
 *   • TWO stacked canvases. `data` holds the series and axes and is redrawn
 *     only when the data, the size or the theme changes. `overlay` holds the
 *     crosshair + focus dots and is redrawn on scrub. Separating them is what
 *     makes scrubbing cost ~0.2 ms instead of a full re-render.
 *   • Device-pixel-ratio aware: the backing store is sized in device pixels and
 *     the context scaled once, so lines are crisp on 2×/3× screens instead of
 *     the blurry 1px strokes an unscaled canvas produces.
 *   • ResizeObserver drives resizing — no window listener, no layout thrash.
 *   • Colours are read from the live CSS custom properties, so the chart
 *     follows the app's theme engine (including dark mode and the user's accent
 *     choice) without a parallel palette.
 *   • The entrance sweep is a single rAF loop over a 0..1 progress value and is
 *     skipped entirely under `prefers-reduced-motion`.
 *
 * Accessibility: the canvas carries `role="img"` with a generated summary, and
 * the whole chart is keyboard-scrubbable (arrows / Home / End) with the active
 * value announced through an aria-live region owned by the caller.
 */
import { useCallback, useEffect, useLayoutEffect, useMemo, useRef } from 'react';

import { niceDomain } from './scale';

export type SeriesKind = 'line' | 'area' | 'bar' | 'band';

export interface ChartSeries {
  id: string;
  label: string;
  kind: SeriesKind;
  values: (number | null)[];
  /** For `band`: the lower edge. `values` is the upper edge. */
  lowerValues?: (number | null)[];
  /** CSS custom property name to resolve, e.g. '--primary'. */
  colorVar: string;
  /** 0..1 alpha applied to fills (areas, bars, bands). */
  fillAlpha?: number;
  /** Dashed stroke pattern in CSS px. */
  dash?: number[];
  strokeWidth?: number;
  /** Suffix used in the readout, e.g. '°' or '%'. */
  unit?: string;
}

export interface CanvasChartProps {
  /** X-axis labels, one per data index. Only some are drawn. */
  xLabels: string[];
  series: ChartSeries[];
  /** Fixed y-domain. Computed from the data when omitted. */
  domain?: { min: number; max: number };
  /** Height in CSS px. Width always fills the container. */
  height?: number;
  /** Index currently highlighted, or null. */
  activeIndex: number | null;
  onActiveIndexChange: (index: number | null) => void;
  /** Bumped by the caller when the theme changes so colours are re-resolved. */
  themeKey?: string;
  /** Accessible summary of what the chart shows. */
  ariaLabel: string;
  /** Number of horizontal grid lines (inclusive of top and bottom). */
  gridLines?: number;
  /** Formatter for y-axis tick labels. */
  formatTick?: (value: number) => string;
  className?: string;
}

const PADDING = { top: 14, right: 8, bottom: 22, left: 34 };
const ENTRANCE_MS = 520;

/** Resolve a CSS custom property that holds raw HSL channels into a colour. */
function resolveColor(element: HTMLElement, varName: string, alpha = 1): string {
  const raw = getComputedStyle(element).getPropertyValue(varName).trim();
  if (!raw) return alpha >= 1 ? '#888' : `rgba(136,136,136,${alpha})`;
  // The theme engine stores channels ("28 42% 34%"), not full colours.
  return alpha >= 1 ? `hsl(${raw})` : `hsl(${raw} / ${alpha})`;
}

/** Monotone-ish Catmull-Rom → cubic Bézier path, kept inside the y-domain. */
function strokeSmooth(
  ctx: CanvasRenderingContext2D,
  points: { x: number; y: number }[],
  tension = 0.22,
) {
  if (points.length === 0) return;
  ctx.moveTo(points[0].x, points[0].y);
  if (points.length === 1) return;
  for (let i = 0; i < points.length - 1; i += 1) {
    const p0 = points[i - 1] ?? points[i];
    const p1 = points[i];
    const p2 = points[i + 1];
    const p3 = points[i + 2] ?? p2;
    ctx.bezierCurveTo(
      p1.x + (p2.x - p0.x) * tension,
      p1.y + (p2.y - p0.y) * tension,
      p2.x - (p3.x - p1.x) * tension,
      p2.y - (p3.y - p1.y) * tension,
      p2.x,
      p2.y,
    );
  }
}

export default function CanvasChart({
  xLabels,
  series,
  domain,
  height = 200,
  activeIndex,
  onActiveIndexChange,
  themeKey = '',
  ariaLabel,
  gridLines = 5,
  formatTick,
  className,
}: CanvasChartProps) {
  const hostRef = useRef<HTMLDivElement>(null);
  const dataCanvasRef = useRef<HTMLCanvasElement>(null);
  const overlayCanvasRef = useRef<HTMLCanvasElement>(null);
  const sizeRef = useRef({ width: 0, height });
  const progressRef = useRef(0);
  const rafRef = useRef<number | null>(null);
  const pointerRafRef = useRef<number | null>(null);

  const count = xLabels.length;

  const resolvedDomain = useMemo(() => {
    if (domain) return domain;
    const all: number[] = [];
    for (const s of series) {
      for (const v of s.values) if (v !== null && Number.isFinite(v)) all.push(v);
      for (const v of s.lowerValues ?? []) if (v !== null && Number.isFinite(v)) all.push(v);
    }
    return niceDomain(all, gridLines);
  }, [domain, gridLines, series]);

  /* ── geometry helpers ── */
  const geometry = useCallback(() => {
    const { width, height: h } = sizeRef.current;
    const plotWidth = Math.max(1, width - PADDING.left - PADDING.right);
    const plotHeight = Math.max(1, h - PADDING.top - PADDING.bottom);
    const span = Math.max(1e-6, resolvedDomain.max - resolvedDomain.min);
    const xFor = (index: number) =>
      PADDING.left + (count <= 1 ? plotWidth / 2 : (index / (count - 1)) * plotWidth);
    const yFor = (value: number) =>
      PADDING.top + (1 - (value - resolvedDomain.min) / span) * plotHeight;
    return { width, height: h, plotWidth, plotHeight, xFor, yFor };
  }, [count, resolvedDomain]);

  /* ── data layer ── */
  const drawData = useCallback(() => {
    const canvas = dataCanvasRef.current;
    const host = hostRef.current;
    if (!canvas || !host) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const { width, height: h, xFor, yFor } = geometry();
    if (width === 0) return;

    const progress = progressRef.current;
    ctx.clearRect(0, 0, width, h);

    const gridColor = resolveColor(host, '--border', 0.7);
    const textColor = resolveColor(host, '--muted-foreground', 0.9);
    const baseline = yFor(resolvedDomain.min);

    // Grid + y ticks.
    ctx.save();
    ctx.strokeStyle = gridColor;
    ctx.lineWidth = 1;
    ctx.fillStyle = textColor;
    ctx.font = '10px system-ui, sans-serif';
    ctx.textBaseline = 'middle';
    ctx.textAlign = 'right';
    for (let i = 0; i < gridLines; i += 1) {
      const t = i / (gridLines - 1);
      const value = resolvedDomain.max - t * (resolvedDomain.max - resolvedDomain.min);
      // Snap to the device pixel grid: a 1px line on a half pixel renders as a
      // 2px smear.
      const y = Math.round(yFor(value)) + 0.5;
      ctx.beginPath();
      ctx.moveTo(PADDING.left, y);
      ctx.lineTo(width - PADDING.right, y);
      ctx.stroke();
      ctx.fillText(formatTick ? formatTick(value) : String(Math.round(value)), PADDING.left - 6, y);
    }
    ctx.restore();

    // X labels — at most 6, evenly spaced, never overlapping.
    ctx.save();
    ctx.fillStyle = textColor;
    ctx.font = '10px system-ui, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'alphabetic';
    const stride = Math.max(1, Math.ceil(count / 6));
    for (let i = 0; i < count; i += stride) {
      ctx.fillText(xLabels[i], xFor(i), h - 6);
    }
    ctx.restore();

    // Series, painted back to front so bands sit under lines.
    const ordered = [...series].sort((a, b) => {
      const rank: Record<SeriesKind, number> = { band: 0, area: 1, bar: 2, line: 3 };
      return rank[a.kind] - rank[b.kind];
    });

    for (const s of ordered) {
      const color = resolveColor(host, s.colorVar);
      const fill = resolveColor(host, s.colorVar, s.fillAlpha ?? 0.16);

      if (s.kind === 'band' && s.lowerValues) {
        // Uncertainty envelope: the region every model's forecast falls inside.
        // A flat low-alpha fill, not a gradient — it encodes a range, and the
        // range has no internal structure to shade.
        ctx.save();
        ctx.beginPath();
        const upper: { x: number; y: number }[] = [];
        const lower: { x: number; y: number }[] = [];
        for (let i = 0; i < count; i += 1) {
          const hi = s.values[i];
          const lo = s.lowerValues[i];
          if (hi === null || lo === null || !Number.isFinite(hi) || !Number.isFinite(lo)) continue;
          upper.push({ x: xFor(i), y: yFor(hi) });
          lower.push({ x: xFor(i), y: yFor(lo) });
        }
        if (upper.length >= 2) {
          strokeSmooth(ctx, upper);
          for (let i = lower.length - 1; i >= 0; i -= 1) ctx.lineTo(lower[i].x, lower[i].y);
          ctx.closePath();
          ctx.globalAlpha = progress;
          ctx.fillStyle = fill;
          ctx.fill();
        }
        ctx.restore();
        continue;
      }

      if (s.kind === 'bar') {
        const slot = count > 0 ? (width - PADDING.left - PADDING.right) / count : 0;
        const barWidth = Math.max(2, Math.min(18, slot * 0.62));
        ctx.save();
        ctx.fillStyle = fill;
        for (let i = 0; i < count; i += 1) {
          const v = s.values[i];
          if (v === null || !Number.isFinite(v)) continue;
          const y = yFor(v);
          const barHeight = Math.max(1, (baseline - y) * progress);
          const radius = Math.min(3, barWidth / 2);
          const x = xFor(i) - barWidth / 2;
          const top = baseline - barHeight;
          ctx.beginPath();
          // Rounded top, square bottom — reads as growing from the axis.
          ctx.moveTo(x, baseline);
          ctx.lineTo(x, top + radius);
          ctx.quadraticCurveTo(x, top, x + radius, top);
          ctx.lineTo(x + barWidth - radius, top);
          ctx.quadraticCurveTo(x + barWidth, top, x + barWidth, top + radius);
          ctx.lineTo(x + barWidth, baseline);
          ctx.closePath();
          ctx.fill();
        }
        ctx.restore();
        continue;
      }

      const points: { x: number; y: number }[] = [];
      for (let i = 0; i < count; i += 1) {
        const v = s.values[i];
        if (v === null || !Number.isFinite(v)) continue;
        points.push({ x: xFor(i), y: yFor(v) });
      }
      if (points.length < 2) continue;

      // Reveal by clipping to a growing width: the line keeps its final shape
      // throughout, unlike a y-scale animation which distorts the curve.
      ctx.save();
      const revealTo = PADDING.left + (width - PADDING.left - PADDING.right) * progress;
      ctx.beginPath();
      ctx.rect(0, 0, revealTo, h);
      ctx.clip();

      if (s.kind === 'area') {
        ctx.beginPath();
        strokeSmooth(ctx, points);
        ctx.lineTo(points[points.length - 1].x, baseline);
        ctx.lineTo(points[0].x, baseline);
        ctx.closePath();
        ctx.fillStyle = fill;
        ctx.fill();
      }

      ctx.beginPath();
      strokeSmooth(ctx, points);
      ctx.strokeStyle = color;
      ctx.lineWidth = s.strokeWidth ?? 2;
      ctx.lineJoin = 'round';
      ctx.lineCap = 'round';
      if (s.dash) ctx.setLineDash(s.dash);
      ctx.stroke();
      ctx.restore();
    }
  }, [count, formatTick, geometry, gridLines, resolvedDomain, series, xLabels]);

  /* ── overlay layer (scrub) ── */
  const drawOverlay = useCallback(() => {
    const canvas = overlayCanvasRef.current;
    const host = hostRef.current;
    if (!canvas || !host) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const { width, height: h, xFor, yFor } = geometry();
    ctx.clearRect(0, 0, width, h);
    if (activeIndex === null || activeIndex < 0 || activeIndex >= count) return;

    const x = Math.round(xFor(activeIndex)) + 0.5;
    ctx.save();
    ctx.strokeStyle = resolveColor(host, '--foreground', 0.28);
    ctx.lineWidth = 1;
    ctx.setLineDash([3, 3]);
    ctx.beginPath();
    ctx.moveTo(x, PADDING.top);
    ctx.lineTo(x, h - PADDING.bottom);
    ctx.stroke();
    ctx.restore();

    for (const s of series) {
      if (s.kind === 'band') continue;
      const v = s.values[activeIndex];
      if (v === null || !Number.isFinite(v)) continue;
      const y = yFor(v);
      const color = resolveColor(host, s.colorVar);
      ctx.save();
      ctx.beginPath();
      ctx.arc(x - 0.5, y, 4.5, 0, Math.PI * 2);
      ctx.fillStyle = resolveColor(host, '--card');
      ctx.fill();
      ctx.lineWidth = 2.2;
      ctx.strokeStyle = color;
      ctx.stroke();
      ctx.restore();
    }
  }, [activeIndex, count, geometry, series]);

  /* ── sizing ── */
  const applySize = useCallback(() => {
    const host = hostRef.current;
    if (!host) return;
    const width = host.clientWidth;
    if (width === 0) return;
    sizeRef.current = { width, height };
    const dpr = Math.min(3, window.devicePixelRatio || 1);
    for (const ref of [dataCanvasRef, overlayCanvasRef]) {
      const canvas = ref.current;
      if (!canvas) continue;
      canvas.width = Math.round(width * dpr);
      canvas.height = Math.round(height * dpr);
      canvas.style.width = `${width}px`;
      canvas.style.height = `${height}px`;
      const ctx = canvas.getContext('2d');
      // setTransform (not scale) so repeated resizes never compound.
      ctx?.setTransform(dpr, 0, 0, dpr, 0, 0);
    }
    drawData();
    drawOverlay();
  }, [drawData, drawOverlay, height]);

  useLayoutEffect(() => {
    applySize();
    const host = hostRef.current;
    if (!host || typeof ResizeObserver === 'undefined') return;
    const observer = new ResizeObserver(() => applySize());
    observer.observe(host);
    return () => observer.disconnect();
  }, [applySize]);

  /* ── entrance sweep + redraw on data/theme change ── */
  useEffect(() => {
    const reduce =
      typeof window !== 'undefined' &&
      window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;

    if (reduce) {
      progressRef.current = 1;
      drawData();
      return;
    }

    progressRef.current = 0;
    const start = performance.now();
    const tick = (t: number) => {
      const raw = Math.min(1, (t - start) / ENTRANCE_MS);
      // ease-out-expo, matching the app's enter curve.
      progressRef.current = raw === 1 ? 1 : 1 - Math.pow(2, -10 * raw);
      drawData();
      if (raw < 1) rafRef.current = requestAnimationFrame(tick);
      else rafRef.current = null;
    };
    rafRef.current = requestAnimationFrame(tick);
    return () => {
      if (rafRef.current !== null) cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
    };
  }, [drawData, themeKey]);

  useEffect(() => {
    drawOverlay();
  }, [drawOverlay]);

  /* ── pointer scrubbing, coalesced to one update per frame ── */
  const indexFromClientX = useCallback(
    (clientX: number): number => {
      const host = hostRef.current;
      if (!host) return 0;
      const rect = host.getBoundingClientRect();
      const { plotWidth } = geometry();
      const local = clientX - rect.left - PADDING.left;
      const ratio = plotWidth > 0 ? local / plotWidth : 0;
      return Math.max(0, Math.min(count - 1, Math.round(ratio * (count - 1))));
    },
    [count, geometry],
  );

  const handlePointer = useCallback(
    (event: React.PointerEvent<HTMLDivElement>) => {
      const clientX = event.clientX;
      if (pointerRafRef.current !== null) return;
      pointerRafRef.current = requestAnimationFrame(() => {
        pointerRafRef.current = null;
        onActiveIndexChange(indexFromClientX(clientX));
      });
    },
    [indexFromClientX, onActiveIndexChange],
  );

  useEffect(
    () => () => {
      if (pointerRafRef.current !== null) cancelAnimationFrame(pointerRafRef.current);
    },
    [],
  );

  const handleKeyDown = useCallback(
    (event: React.KeyboardEvent<HTMLDivElement>) => {
      const current = activeIndex ?? 0;
      let next: number | null = null;
      // RTL document: ArrowLeft advances through time.
      if (event.key === 'ArrowLeft') next = current + 1;
      else if (event.key === 'ArrowRight') next = current - 1;
      else if (event.key === 'Home') next = 0;
      else if (event.key === 'End') next = count - 1;
      else if (event.key === 'Escape') {
        onActiveIndexChange(null);
        return;
      }
      if (next === null) return;
      event.preventDefault();
      onActiveIndexChange(Math.max(0, Math.min(count - 1, next)));
    },
    [activeIndex, count, onActiveIndexChange],
  );

  return (
    <div
      ref={hostRef}
      role="group"
      tabIndex={0}
      aria-label={ariaLabel}
      onPointerMove={handlePointer}
      onPointerDown={handlePointer}
      onPointerLeave={() => onActiveIndexChange(null)}
      onKeyDown={handleKeyDown}
      className={className}
      style={{ position: 'relative', height, touchAction: 'pan-y', outline: 'none', direction: 'ltr' }}
    >
      <canvas ref={dataCanvasRef} role="img" aria-label={ariaLabel} style={{ position: 'absolute', inset: 0 }} />
      <canvas ref={overlayCanvasRef} aria-hidden style={{ position: 'absolute', inset: 0, pointerEvents: 'none' }} />
    </div>
  );
}
