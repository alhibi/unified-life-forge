import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import { cn } from '@/lib/utils';

import { buildCellIndex, type DotCountry, loadWorldDots, type WorldDots } from '../data/worldDots';
import type { CountryStamp, StampStatus } from '../types';

interface CountryStampMapProps {
  stamps: CountryStamp[];
  /** Highlighted while its sheet is open. */
  selectedIso?: string | null;
  onSelectCountry: (country: DotCountry) => void;
  className?: string;
}

/**
 * The world as a field of dots — a printed poster you can tap.
 *
 * No tiles, no roads, no labels: at country granularity a street map is noise,
 * and the whole appeal of this view is that a life of travelling reads as one
 * quiet image. Which is also why it is drawn on a CANVAS rather than as 6,800
 * SVG circles: the poster has to repaint in a single frame when a country fills
 * in, and 6,800 DOM nodes cannot promise that on a phone.
 *
 * Canvas is invisible to assistive technology, so this component is never the
 * only way to stamp a country — the page pairs it with a searchable list, which
 * is both the accessible path and the faster one once the map is crowded.
 */
export default function CountryStampMap({
  stamps,
  selectedIso,
  onSelectCountry,
  className,
}: CountryStampMapProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const wrapperRef = useRef<HTMLDivElement>(null);
  const [world, setWorld] = useState<WorldDots | null>(null);
  const [error, setError] = useState(false);
  const [hoverIso, setHoverIso] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    loadWorldDots().then(
      (data) => {
        if (!cancelled) setWorld(data);
      },
      () => {
        if (!cancelled) setError(true);
      },
    );
    return () => {
      cancelled = true;
    };
  }, []);

  const statusByIso = useMemo(() => {
    const map = new Map<string, StampStatus>();
    for (const stamp of stamps) map.set(stamp.isoCode, stamp.status);
    return map;
  }, [stamps]);

  const cellIndex = useMemo(() => (world ? buildCellIndex(world) : null), [world]);

  /** Canvas pixel geometry for the current element size. */
  const geometryRef = useRef({ scale: 1, offsetX: 0, offsetY: 0 });

  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas || !world) return;
    const context = canvas.getContext('2d');
    if (!context) return;

    const ratio = Math.min(window.devicePixelRatio || 1, 2);
    const width = canvas.clientWidth;
    const height = canvas.clientHeight;
    canvas.width = Math.round(width * ratio);
    canvas.height = Math.round(height * ratio);
    context.setTransform(ratio, 0, 0, ratio, 0, 0);
    context.clearRect(0, 0, width, height);

    // Fit the grid inside the box, preserving the poster's aspect ratio.
    const scale = Math.min(width / world.cols, height / world.rows);
    const offsetX = (width - world.cols * scale) / 2;
    const offsetY = (height - world.rows * scale) / 2;
    geometryRef.current = { scale, offsetX, offsetY };

    const styles = getComputedStyle(canvas);
    const palette: Record<StampStatus | 'blank', string> = {
      // Read from the live theme so the poster follows light/dark and the
      // user's accent, instead of pinning its own colours.
      blank: styles.getPropertyValue('--dot-blank').trim() || 'rgba(120,120,120,0.35)',
      visited: styles.getPropertyValue('--dot-visited').trim() || 'orange',
      lived: styles.getPropertyValue('--dot-lived').trim() || 'black',
      wishlist: styles.getPropertyValue('--dot-wishlist').trim() || 'gray',
    };

    const radius = Math.max(0.9, scale * 0.34);
    const selectedRadius = Math.max(1.4, scale * 0.46);

    for (const country of world.countries) {
      const status = statusByIso.get(country.iso);
      const isEmphasised = country.iso === selectedIso || country.iso === hoverIso;
      context.fillStyle = status ? palette[status] : palette.blank;
      const r = isEmphasised ? selectedRadius : radius;

      context.beginPath();
      for (const [col, row] of country.dots) {
        const x = offsetX + (col + 0.5) * scale;
        const y = offsetY + (row + 0.5) * scale;
        context.moveTo(x + r, y);
        context.arc(x, y, r, 0, Math.PI * 2);
      }
      context.fill();
    }
  }, [hoverIso, selectedIso, statusByIso, world]);

  useEffect(() => {
    draw();
  }, [draw]);

  useEffect(() => {
    const node = wrapperRef.current;
    if (!node) return;
    const observer = new ResizeObserver(() => draw());
    observer.observe(node);
    return () => observer.disconnect();
  }, [draw]);

  /** Pointer position → the country under it, if any. */
  const countryAt = useCallback(
    (clientX: number, clientY: number): DotCountry | null => {
      const canvas = canvasRef.current;
      if (!canvas || !world || !cellIndex) return null;
      const rect = canvas.getBoundingClientRect();
      const { scale, offsetX, offsetY } = geometryRef.current;
      const col = Math.floor((clientX - rect.left - offsetX) / scale);
      const row = Math.floor((clientY - rect.top - offsetY) / scale);

      // A fingertip is bigger than a 1.5° dot, so a miss searches outward one
      // ring before giving up. Without this, tapping Lebanon is luck.
      for (let radius = 0; radius <= 2; radius += 1) {
        for (let dRow = -radius; dRow <= radius; dRow += 1) {
          for (let dCol = -radius; dCol <= radius; dCol += 1) {
            if (Math.max(Math.abs(dRow), Math.abs(dCol)) !== radius) continue;
            const iso = cellIndex.get((row + dRow) * world.cols + (col + dCol));
            if (iso) return world.countries.find((entry) => entry.iso === iso) ?? null;
          }
        }
      }
      return null;
    },
    [cellIndex, world],
  );

  if (error) {
    return (
      <div className={cn('grid place-items-center px-6 text-center', className)}>
        <p className="text-body text-muted-foreground">
          تعذّر تحميل خريطة البلدان. استخدم القائمة أدناه لتسجيل الدول.
        </p>
      </div>
    );
  }

  return (
    <div ref={wrapperRef} className={cn('travel-dot-map relative', className)}>
      <canvas
        ref={canvasRef}
        className="h-full w-full"
        onPointerMove={(event) => {
          if (event.pointerType !== 'mouse') return;
          setHoverIso(countryAt(event.clientX, event.clientY)?.iso ?? null);
        }}
        onPointerLeave={() => setHoverIso(null)}
        onClick={(event) => {
          const country = countryAt(event.clientX, event.clientY);
          if (country) onSelectCountry(country);
        }}
        role="img"
        aria-label={`خريطة العالم منقّطة، ${stamps.length} دولة مسجّلة`}
      />

      {hoverIso && (
        <p className="pointer-events-none absolute inset-x-0 bottom-0 text-center text-mini text-foreground">
          {world?.countries.find((country) => country.iso === hoverIso)?.ar}
        </p>
      )}

      {!world && (
        <div className="absolute inset-0 grid place-items-center">
          <span className="text-mini text-muted-foreground">نرسم العالم…</span>
        </div>
      )}
    </div>
  );
}
