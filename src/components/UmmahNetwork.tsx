import {
  forwardRef,
  useCallback,
  useEffect,
  useImperativeHandle,
  useMemo,
  useRef,
  useState,
} from 'react';
import { motion } from 'framer-motion';

/**
 * UmmahNetwork — a "living constellation" view of the global ummah.
 *
 * Instead of a literal 3D globe, every city is a pulsing node in a
 * neural-style network. Makkah anchors the field at centre; thin
 * ambient threads connect each city to its nearest neighbours and
 * Makkah-bound rays trace the qibla for cities currently in an
 * active prayer window (Fajr / Maghrib / Isha).
 *
 * The component keeps the same shape as the previous UmmahGlobe so
 * UmmahPulse can swap it in without changing call-sites:
 *   – `cities` carries pre-computed prayer-slot colours + active flag
 *   – `subSolarLng`/`subSolarLat` drive an ambient "dawn glow" that
 *     follows the sun across the canvas
 *   – `selectedCity` / `onCityClick` / `onBackgroundClick` mirror the
 *     old globe API
 *   – the imperative handle exposes `flyTo` (pan/zoom) and `zoomBy`
 *     so the existing zoom buttons keep working.
 */

// ─── Types (kept identical to UmmahGlobe for drop-in swap) ────────────
export interface NetworkCity {
  name: string;
  nameAr: string;
  lat: number;
  lng: number;
  flag: string;
  pop: number;
  color: string;
  active?: boolean;
  qibla?: boolean;
}

export interface UmmahNetworkProps {
  cities: NetworkCity[];
  subSolarLng: number;
  subSolarLat: number;
  language: 'ar' | 'de';
  selectedCity?: string | null;
  onBackgroundClick?: () => void;
  onCityClick?: (name: string) => void;
}

export interface UmmahNetworkHandle {
  flyTo: (opts: { lng?: number; lat?: number; zoom?: number; duration?: number }) => void;
  zoomBy: (factor: number) => void;
}

// ─── Canvas / projection ──────────────────────────────────────────────
const W = 400;
const H = 220;
const MIN_ZOOM = 0.7;
const MAX_ZOOM = 3;

const project = (lat: number, lng: number) => ({
  x: ((lng + 180) / 360) * W,
  y: ((90 - lat) / 180) * H,
});

const clamp = (v: number, lo: number, hi: number) =>
  Math.max(lo, Math.min(hi, v));

// Stable ambient dust particles — generated once, deterministic.
function makeDust(seed: number, count: number) {
  let s = seed >>> 0;
  const rand = () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 0xffffffff;
  };
  return Array.from({ length: count }, () => ({
    x: rand() * W,
    y: rand() * H,
    r: 0.25 + rand() * 0.55,
    o: 0.18 + rand() * 0.45,
    d: 2.4 + rand() * 3.6,
  }));
}
const DUST = makeDust(0x5e7f93, 90);

// ─── Component ────────────────────────────────────────────────────────
export const UmmahNetwork = forwardRef<UmmahNetworkHandle, UmmahNetworkProps>(
  function UmmahNetworkImpl(
    {
      cities,
      subSolarLng,
      language,
      selectedCity,
      onBackgroundClick,
      onCityClick,
    },
    ref,
  ) {
    const [zoom, setZoom] = useState(1);
    const [pan, setPan] = useState({ x: 0, y: 0 });
    const animRef = useRef<number | null>(null);

    // Imperative API — keeps the old zoom buttons + "back to Makkah"
    // button working without UmmahPulse needing changes.
    useImperativeHandle(
      ref,
      () => ({
        zoomBy: (factor: number) =>
          setZoom((z) => clamp(z * factor, MIN_ZOOM, MAX_ZOOM)),
        flyTo: ({ lng, lat, zoom: targetZoom, duration = 600 }) => {
          const from = { zoom, pan: { ...pan } };
          const targetPan =
            lat !== undefined && lng !== undefined
              ? (() => {
                  const p = project(lat, lng);
                  return { x: W / 2 - p.x, y: H / 2 - p.y };
                })()
              : pan;
          const targetZ =
            targetZoom !== undefined
              ? clamp(targetZoom, MIN_ZOOM, MAX_ZOOM)
              : zoom;
          const t0 = performance.now();
          if (animRef.current) cancelAnimationFrame(animRef.current);
          const tick = (now: number) => {
            const t = Math.min(1, (now - t0) / Math.max(80, duration));
            const e = 1 - Math.pow(1 - t, 3);
            setZoom(from.zoom + (targetZ - from.zoom) * e);
            setPan({
              x: from.pan.x + (targetPan.x - from.pan.x) * e,
              y: from.pan.y + (targetPan.y - from.pan.y) * e,
            });
            if (t < 1) animRef.current = requestAnimationFrame(tick);
          };
          animRef.current = requestAnimationFrame(tick);
        },
      }),
      [zoom, pan],
    );

    useEffect(
      () => () => {
        if (animRef.current) cancelAnimationFrame(animRef.current);
      },
      [],
    );

    // Project every city once per render.
    const nodes = useMemo(
      () =>
        cities.map((c) => {
          const { x, y } = project(c.lat, c.lng);
          return { ...c, x, y };
        }),
      [cities],
    );

    const makkah = useMemo(
      () => nodes.find((n) => n.qibla) ?? nodes[0],
      [nodes],
    );

    // Build the ambient thread network: each city links to its 2-3
    // geographic neighbours. Sorted index pair de-dupes mirrored
    // edges and keeps the render-set small (cheap, no DOM blow-up).
    const threads = useMemo(() => {
      const edges: Array<{
        i: number;
        j: number;
        x1: number;
        y1: number;
        x2: number;
        y2: number;
        c1: string;
        c2: string;
        d: number;
      }> = [];
      const seen = new Set<string>();
      nodes.forEach((a, i) => {
        const dists = nodes
          .map((b, j) => ({
            j,
            d: i === j ? Infinity : Math.hypot(a.x - b.x, a.y - b.y),
          }))
          .sort((p, q) => p.d - q.d)
          .slice(0, 3);
        dists.forEach(({ j, d }) => {
          if (d > 95) return; // skip cross-ocean spaghetti
          const key = i < j ? `${i}-${j}` : `${j}-${i}`;
          if (seen.has(key)) return;
          seen.add(key);
          const b = nodes[j];
          edges.push({
            i,
            j,
            x1: a.x,
            y1: a.y,
            x2: b.x,
            y2: b.y,
            c1: a.color,
            c2: b.color,
            d,
          });
        });
      });
      return edges;
    }, [nodes]);

    // Qibla rays — Makkah-anchored beams from currently-active cities.
    const qiblaRays = useMemo(
      () =>
        makkah
          ? nodes
              .filter((n) => n.active && n.name !== makkah.name)
              .sort((a, b) => b.pop - a.pop)
              .slice(0, 10)
          : [],
      [nodes, makkah],
    );

    // Ambient sun glow follows the sub-solar longitude.
    const sunX = ((subSolarLng + 180) / 360) * W;

    const handleBgClick = useCallback(() => {
      onBackgroundClick?.();
    }, [onBackgroundClick]);

    return (
      <svg
        viewBox={`0 0 ${W} ${H}`}
        className="w-full h-auto block select-none"
        preserveAspectRatio="xMidYMid meet"
        onClick={handleBgClick}
        aria-label={
          language === 'ar'
            ? 'شبكة مدن الأمة الحية مع نبض أوقات الصلاة'
            : 'Lebendiges Städte-Netzwerk der Ummah mit Gebets-Puls'
        }
      >
        <defs>
          {/* Deep space ground */}
          <radialGradient id="netSpace" cx="50%" cy="50%" r="80%">
            <stop offset="0%" stopColor="hsl(220, 38%, 10%)" />
            <stop offset="60%" stopColor="hsl(224, 44%, 6%)" />
            <stop offset="100%" stopColor="hsl(228, 52%, 3%)" />
          </radialGradient>

          {/* Drifting sun-side warmth */}
          <radialGradient id="netSun" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="hsl(38, 95%, 62%)" stopOpacity="0.32" />
            <stop offset="55%" stopColor="hsl(28, 82%, 50%)" stopOpacity="0.10" />
            <stop offset="100%" stopColor="hsl(20, 70%, 30%)" stopOpacity="0" />
          </radialGradient>

          {/* Makkah anchor glow */}
          <radialGradient id="netMakkah" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="hsl(45, 100%, 88%)" stopOpacity="1" />
            <stop offset="40%" stopColor="hsl(38, 95%, 62%)" stopOpacity="0.5" />
            <stop offset="100%" stopColor="hsl(28, 88%, 48%)" stopOpacity="0" />
          </radialGradient>

          {/* Soft node halo */}
          <filter id="netSoft" x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur stdDeviation="0.9" />
          </filter>
          <filter id="netBig" x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur stdDeviation="2.4" />
          </filter>

          {/* 8-pointed Makkah sparkle */}
          <symbol id="netSpark" viewBox="-4 -4 8 8">
            <path
              d="M0,-4 L0.6,-0.6 L4,0 L0.6,0.6 L0,4 L-0.6,0.6 L-4,0 L-0.6,-0.6 Z"
              fill="hsl(45, 100%, 92%)"
            />
          </symbol>
        </defs>

        {/* 1 — Space backdrop */}
        <rect width={W} height={H} fill="url(#netSpace)" />

        {/* 2 — Ambient drifting sun-warmth (follows subsolar lng) */}
        <motion.ellipse
          cx={sunX}
          cy={H / 2}
          rx={W * 0.45}
          ry={H * 0.7}
          fill="url(#netSun)"
          filter="url(#netBig)"
          animate={{ opacity: [0.7, 1, 0.7] }}
          transition={{ duration: 8, repeat: Infinity, ease: 'easeInOut' }}
        />
        {/* wrap copy for horizontal edges */}
        {sunX < 40 && (
          <ellipse
            cx={sunX + W}
            cy={H / 2}
            rx={W * 0.45}
            ry={H * 0.7}
            fill="url(#netSun)"
            filter="url(#netBig)"
            opacity={0.8}
          />
        )}
        {sunX > W - 40 && (
          <ellipse
            cx={sunX - W}
            cy={H / 2}
            rx={W * 0.45}
            ry={H * 0.7}
            fill="url(#netSun)"
            filter="url(#netBig)"
            opacity={0.8}
          />
        )}

        {/* 3 — Drifting cosmic dust */}
        <g>
          {DUST.map((d, i) => (
            <motion.circle
              key={i}
              cx={d.x}
              cy={d.y}
              r={d.r}
              fill="hsl(220, 30%, 88%)"
              fillOpacity={d.o}
              animate={{ opacity: [d.o, d.o * 0.25, d.o] }}
              transition={{
                duration: d.d,
                repeat: Infinity,
                ease: 'easeInOut',
                delay: (i % 7) * 0.3,
              }}
            />
          ))}
        </g>

        {/* Pan/zoom group — everything below transforms together */}
        <g
          transform={`translate(${W / 2} ${H / 2}) scale(${zoom}) translate(${-W / 2 + pan.x} ${-H / 2 + pan.y})`}
        >
          {/* 4 — Ambient threads between neighbour cities */}
          <g>
            {threads.map((t, i) => {
              const gradId = `gradThr${i}`;
              return (
                <g key={i}>
                  <defs>
                    <linearGradient
                      id={gradId}
                      x1={t.x1}
                      y1={t.y1}
                      x2={t.x2}
                      y2={t.y2}
                      gradientUnits="userSpaceOnUse"
                    >
                      <stop offset="0%" stopColor={t.c1} stopOpacity="0.55" />
                      <stop offset="100%" stopColor={t.c2} stopOpacity="0.55" />
                    </linearGradient>
                  </defs>
                  <line
                    x1={t.x1}
                    y1={t.y1}
                    x2={t.x2}
                    y2={t.y2}
                    stroke={`url(#${gradId})`}
                    strokeWidth={Math.max(0.18, 0.55 - t.d / 280)}
                    strokeOpacity={Math.max(0.18, 0.55 - t.d / 220)}
                  />
                </g>
              );
            })}
          </g>

          {/* 5 — Qibla rays from active cities to Makkah */}
          {makkah && (
            <g>
              {qiblaRays.map((c, i) => (
                <g key={`ray-${c.name}`}>
                  <motion.line
                    x1={c.x}
                    y1={c.y}
                    x2={makkah.x}
                    y2={makkah.y}
                    stroke="hsl(45, 100%, 70%)"
                    strokeWidth="0.35"
                    strokeOpacity="0.5"
                    strokeDasharray="2 3"
                    animate={{ strokeDashoffset: [0, -10] }}
                    transition={{
                      duration: 2.4 + (i % 3) * 0.6,
                      repeat: Infinity,
                      ease: 'linear',
                    }}
                  />
                  <motion.circle
                    r={0.9}
                    fill="hsl(45, 100%, 80%)"
                    initial={false}
                    animate={{
                      cx: [c.x, makkah.x],
                      cy: [c.y, makkah.y],
                      opacity: [0, 1, 0],
                    }}
                    transition={{
                      duration: 3.2 + (i % 4) * 0.4,
                      repeat: Infinity,
                      ease: 'easeInOut',
                      delay: i * 0.25,
                    }}
                  />
                </g>
              ))}
            </g>
          )}

          {/* 6 — Makkah anchor */}
          {makkah && (
            <g>
              <motion.circle
                cx={makkah.x}
                cy={makkah.y}
                r={14}
                fill="url(#netMakkah)"
                animate={{ opacity: [0.55, 0.9, 0.55] }}
                transition={{ duration: 3.4, repeat: Infinity, ease: 'easeInOut' }}
              />
              <motion.use
                href="#netSpark"
                x={makkah.x - 4}
                y={makkah.y - 4}
                width={8}
                height={8}
                animate={{ rotate: 360, opacity: [0.85, 1, 0.85] }}
                transition={{
                  rotate: { duration: 28, repeat: Infinity, ease: 'linear' },
                  opacity: { duration: 3, repeat: Infinity, ease: 'easeInOut' },
                }}
                style={{ transformOrigin: `${makkah.x}px ${makkah.y}px` }}
              />
              <circle
                cx={makkah.x}
                cy={makkah.y}
                r={1.7}
                fill="hsl(45, 100%, 96%)"
              />
            </g>
          )}

          {/* 7 — City nodes */}
          {nodes.map((n) => {
            if (n.qibla) return null;
            const isSelected = n.name === selectedCity;
            const r = Math.max(1.2, Math.min(2.6, 1 + Math.log10(n.pop + 1) * 0.55));
            const ringR = r + (isSelected ? 4 : 2.2);
            return (
              <g
                key={n.name}
                onClick={(e) => {
                  e.stopPropagation();
                  onCityClick?.(n.name);
                }}
                className="cursor-pointer"
              >
                {/* tap target — invisible but generous */}
                <circle
                  cx={n.x}
                  cy={n.y}
                  r={Math.max(5, ringR + 2)}
                  fill="transparent"
                />
                {/* outer halo */}
                <circle
                  cx={n.x}
                  cy={n.y}
                  r={ringR}
                  fill={n.color}
                  fillOpacity={isSelected ? 0.28 : 0.14}
                  filter="url(#netSoft)"
                />
                {/* active pulse */}
                {n.active && (
                  <motion.circle
                    cx={n.x}
                    cy={n.y}
                    r={r}
                    fill="none"
                    stroke={n.color}
                    strokeWidth="0.4"
                    animate={{
                      r: [r, r + 5, r],
                      opacity: [0.85, 0, 0.85],
                    }}
                    transition={{
                      duration: 2.4,
                      repeat: Infinity,
                      ease: 'easeOut',
                    }}
                  />
                )}
                {/* core */}
                <circle cx={n.x} cy={n.y} r={r} fill={n.color} />
                <circle
                  cx={n.x - r * 0.3}
                  cy={n.y - r * 0.3}
                  r={r * 0.4}
                  fill="hsl(0, 0%, 100%)"
                  fillOpacity="0.55"
                />

                {isSelected && (
                  <g pointerEvents="none">
                    <rect
                      x={n.x + 4}
                      y={n.y - 7}
                      width={Math.max(28, (language === 'ar' ? n.nameAr : n.name).length * 2.6 + 6)}
                      height={9}
                      rx={2}
                      fill="hsl(220, 36%, 6%)"
                      fillOpacity="0.92"
                      stroke={n.color}
                      strokeOpacity="0.7"
                      strokeWidth="0.35"
                    />
                    <text
                      x={n.x + 7}
                      y={n.y - 0.5}
                      fontSize="5"
                      fill="hsl(0, 0%, 98%)"
                      fontWeight="700"
                    >
                      {language === 'ar' ? n.nameAr : n.name}
                    </text>
                  </g>
                )}
              </g>
            );
          })}
        </g>
      </svg>
    );
  },
);

export default UmmahNetwork;
