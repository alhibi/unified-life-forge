import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { motion } from 'framer-motion';
import { WORLD_LAND_PATH } from './UmmahPulse.worldPath';

/**
 * UmmahGlobe — Apple‑Maps‑style interactive 3D globe.
 *
 * Pure SVG implementation, no Three.js / d3‑geo / WebGL dependencies.
 *
 * What it does
 * ─────────────────────────────────────────────────────────────
 *  • Orthographic projection of the world onto a sphere.
 *  • Drag in any direction (yaw + pitch) with momentum/inertia
 *    after release — feels just like iOS Earth.
 *  • Auto‑rotate slowly when idle.
 *  • Wheel + pinch zoom (radius scaling).
 *  • Day/night terminator from the real sub‑solar point.
 *  • Glowing atmosphere ring & inner shading for depth.
 *  • Land masses re-projected per frame from the existing
 *    equirectangular world path (parsed once).
 */

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────
export interface GlobeCity {
  name: string;
  nameAr: string;
  lat: number;
  lng: number;
  flag: string;
  pop: number;
  /** color for the city dot (slot color) */
  color: string;
  /** is this an active prayer (fajr/maghrib/isha) ? animates a halo */
  active?: boolean;
  /** is this Mecca? extra golden treatment */
  qibla?: boolean;
}

export interface UmmahGlobeProps {
  cities: GlobeCity[];
  /** sub-solar point in degrees, for day/night shading */
  subSolarLng: number;
  subSolarLat: number;
  /** language for accessibility label */
  language: 'ar' | 'de';
  /** name of currently selected city (or null) */
  selectedCity?: string | null;
  /** clicked on globe background (deselect) */
  onBackgroundClick?: () => void;
  /** clicked on a city dot */
  onCityClick?: (name: string) => void;
  /** initial view (lng, lat). Defaults to Mecca. */
  initialLng?: number;
  initialLat?: number;
  /** disable interactions (read-only preview) */
  readOnly?: boolean;
  /** auto-rotate speed in degrees per second when idle. 0 = off. */
  idleRotate?: number;
}

// ─────────────────────────────────────────────────────────────────────────────
// Constants & math helpers
// ─────────────────────────────────────────────────────────────────────────────
const RAD = Math.PI / 180;

// SVG viewport
const VIEW = 400;
const VIEW_CX = VIEW / 2;
const VIEW_CY = VIEW / 2;
const BASE_R = 178; // base radius before zoom
const MIN_ZOOM = 0.6;
const MAX_ZOOM = 3;

// ─────────────────────────────────────────────────────────────────────────────
// World path parser → polygons of (lng, lat)
//
// The existing path is on an equirectangular grid where x ∈ [0..360]
// maps to lng ∈ [-180..180] and y ∈ [0..180] maps to lat ∈ [90..-90].
// We parse `M x,y L x,y L x,y ... Z` chains into closed polygons.
// ─────────────────────────────────────────────────────────────────────────────
type LngLat = readonly [number, number];

function parseWorldPolys(d: string): LngLat[][] {
  const polys: LngLat[][] = [];
  let cur: LngLat[] = [];
  // Match each command + its single coordinate pair (path uses M, L, Z only)
  const re = /([MLZ])([^MLZ]*)/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(d))) {
    const cmd = m[1];
    const args = m[2].trim();
    if (cmd === 'Z') {
      if (cur.length >= 3) polys.push(cur);
      cur = [];
      continue;
    }
    if (!args) continue;
    const parts = args.split(/[ ,]+/).filter(Boolean);
    for (let i = 0; i < parts.length; i += 2) {
      const x = parseFloat(parts[i]);
      const y = parseFloat(parts[i + 1]);
      if (Number.isNaN(x) || Number.isNaN(y)) continue;
      const lng = x - 180;
      const lat = 90 - y;
      if (cmd === 'M' && i === 0 && cur.length >= 3) {
        polys.push(cur);
        cur = [];
      }
      cur.push([lng, lat]);
    }
  }
  if (cur.length >= 3) polys.push(cur);
  return polys;
}

const WORLD_POLYS = parseWorldPolys(WORLD_LAND_PATH);

// ─────────────────────────────────────────────────────────────────────────────
// Orthographic projection
// ─────────────────────────────────────────────────────────────────────────────
interface ProjState {
  rotLng: number; // λ0 (yaw) in degrees
  rotLat: number; // φ0 (pitch) in degrees, clamped [-90,90]
  R: number;      // sphere radius in viewport units
}

interface ProjPoint {
  x: number;
  y: number;
  /** cos(c) — visibility test. >= 0 ⇒ on the visible hemisphere. */
  z: number;
}

function project(lng: number, lat: number, p: ProjState): ProjPoint {
  const phi0 = p.rotLat * RAD;
  const dlam = (lng - p.rotLng) * RAD;
  const phi = lat * RAD;
  const cphi = Math.cos(phi);
  const sphi = Math.sin(phi);
  const cphi0 = Math.cos(phi0);
  const sphi0 = Math.sin(phi0);
  const cdlam = Math.cos(dlam);
  const cosc = sphi0 * sphi + cphi0 * cphi * cdlam;
  const x = cphi * Math.sin(dlam);
  const y = cphi0 * sphi - sphi0 * cphi * cdlam;
  return {
    x: VIEW_CX + p.R * x,
    y: VIEW_CY - p.R * y,
    z: cosc,
  };
}

/** Bisection for the horizon‑crossing point between two consecutive vertices. */
function horizonInterp(a: LngLat, b: LngLat, p: ProjState): { lng: number; lat: number } {
  const phi0 = p.rotLat * RAD;
  const cphi0 = Math.cos(phi0);
  const sphi0 = Math.sin(phi0);
  const cosc = (lng: number, lat: number) => {
    const dl = (lng - p.rotLng) * RAD;
    const ph = lat * RAD;
    return sphi0 * Math.sin(ph) + cphi0 * Math.cos(ph) * Math.cos(dl);
  };
  const fa = cosc(a[0], a[1]);
  let lo = 0,
    hi = 1;
  for (let i = 0; i < 14; i++) {
    const mid = (lo + hi) / 2;
    const lng = a[0] + (b[0] - a[0]) * mid;
    const lat = a[1] + (b[1] - a[1]) * mid;
    const fm = cosc(lng, lat);
    if (fa > 0 === fm > 0) lo = mid;
    else hi = mid;
  }
  const t = (lo + hi) / 2;
  return {
    lng: a[0] + (b[0] - a[0]) * t,
    lat: a[1] + (b[1] - a[1]) * t,
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// Build SVG path for a single polygon, handling visible runs + horizon arcs.
//
// For each contiguous run of visible vertices we emit one closed sub-path:
//    M entry  L v0 L v1 ... L vn  L exit  A R R 0 large sweep entry  Z
// The arc closes the visible shape along the globe's silhouette.
// ─────────────────────────────────────────────────────────────────────────────
function buildPolyPath(poly: LngLat[], p: ProjState): string {
  const n = poly.length;
  if (n < 3) return '';
  const projs: ProjPoint[] = new Array(n);
  for (let i = 0; i < n; i++) projs[i] = project(poly[i][0], poly[i][1], p);

  // Quick reject: bounding sphere check via polygon centroid
  // (skipped for correctness — can be added if perf-needed).

  // Visibility flags
  let visCount = 0;
  const vis = new Array<boolean>(n);
  for (let i = 0; i < n; i++) {
    vis[i] = projs[i].z > 0;
    if (vis[i]) visCount++;
  }
  if (visCount === 0) return '';

  // Simple case: entirely visible → straight closed polygon
  if (visCount === n) {
    let s = `M${projs[0].x.toFixed(2)},${projs[0].y.toFixed(2)}`;
    for (let i = 1; i < n; i++) s += `L${projs[i].x.toFixed(2)},${projs[i].y.toFixed(2)}`;
    return s + 'Z';
  }

  // Find each visible run: a maximal sequence of consecutive visible vertices
  // (wrapping around the polygon). Strategy: rotate so vis[0] is hidden,
  // then a single forward sweep collects runs cleanly.
  let pivot = 0;
  while (pivot < n && vis[pivot]) pivot++;
  if (pivot === n) return ''; // visCount < n guarantees at least one hidden vertex

  const idxAt = (k: number) => (k + pivot) % n;
  const visRot = (k: number) => vis[idxAt(k)];

  const runs: { startV: number; endV: number }[] = [];
  let k = 0;
  while (k < n) {
    while (k < n && !visRot(k)) k++;
    if (k >= n) break;
    const startK = k;
    while (k < n && visRot(k)) k++;
    const endK = k - 1;
    runs.push({ startV: idxAt(startK), endV: idxAt(endK) });
  }

  if (runs.length === 0) return '';

  let path = '';
  for (const run of runs) {
    const before = (run.startV - 1 + n) % n;
    const after = (run.endV + 1) % n;
    const entryLL = horizonInterp(poly[before], poly[run.startV], p);
    const exitLL = horizonInterp(poly[run.endV], poly[after], p);
    const E1 = project(entryLL.lng, entryLL.lat, p);
    const E2 = project(exitLL.lng, exitLL.lat, p);

    let s = `M${E1.x.toFixed(2)},${E1.y.toFixed(2)}`;
    let idx = run.startV;
    while (true) {
      s += `L${projs[idx].x.toFixed(2)},${projs[idx].y.toFixed(2)}`;
      if (idx === run.endV) break;
      idx = (idx + 1) % n;
    }
    s += `L${E2.x.toFixed(2)},${E2.y.toFixed(2)}`;

    // Close along the silhouette circle. We choose the arc whose midpoint
    // lies on the SAME side of the chord as the run's projected centroid:
    // that's the arc that bulges "outward" away from the visible interior,
    // matching the true silhouette of the back-hidden polygon edge.
    const a1 = Math.atan2(E1.y - VIEW_CY, E1.x - VIEW_CX);
    const a2 = Math.atan2(E2.y - VIEW_CY, E2.x - VIEW_CX);

    // run centroid (in screen space)
    let cxR = 0,
      cyR = 0,
      cnt = 0;
    let k = run.startV;
    while (true) {
      cxR += projs[k].x;
      cyR += projs[k].y;
      cnt++;
      if (k === run.endV) break;
      k = (k + 1) % n;
    }
    cxR /= cnt;
    cyR /= cnt;

    // Two candidate arcs from E2 → E1: one short, one long.
    let dA = a1 - a2;
    while (dA > Math.PI) dA -= 2 * Math.PI;
    while (dA < -Math.PI) dA += 2 * Math.PI;
    const midShortAng = a2 + dA / 2;
    const midLargeAng = midShortAng + Math.PI;
    const mShort = {
      x: VIEW_CX + p.R * Math.cos(midShortAng),
      y: VIEW_CY + p.R * Math.sin(midShortAng),
    };
    const mLarge = {
      x: VIEW_CX + p.R * Math.cos(midLargeAng),
      y: VIEW_CY + p.R * Math.sin(midLargeAng),
    };
    // pick the arc whose midpoint is closer to the run centroid (same side)
    const dShort = (mShort.x - cxR) ** 2 + (mShort.y - cyR) ** 2;
    const dLarge = (mLarge.x - cxR) ** 2 + (mLarge.y - cyR) ** 2;
    const useShort = dShort <= dLarge;

    const largeArcFlag: 0 | 1 = useShort ? 0 : 1;
    // sweep flag:
    //   short arc: dA > 0 ⇒ sweep=1, dA < 0 ⇒ sweep=0
    //   long  arc: opposite
    const sweepFlag: 0 | 1 = useShort
      ? dA >= 0
        ? 1
        : 0
      : dA >= 0
      ? 0
      : 1;

    s += `A${p.R.toFixed(2)},${p.R.toFixed(2)} 0 ${largeArcFlag} ${sweepFlag} ${E1.x.toFixed(2)},${E1.y.toFixed(2)}`;
    s += 'Z';
    path += s;
  }
  return path;
}

// ─────────────────────────────────────────────────────────────────────────────
// Graticule (longitude/latitude lines, projected to current orientation)
// ─────────────────────────────────────────────────────────────────────────────
function buildGraticule(p: ProjState): string {
  const SEG = 60;
  let path = '';
  // meridians every 30°
  for (let lng = -180; lng < 180; lng += 30) {
    let inSeg = false;
    for (let s = 0; s <= SEG; s++) {
      const lat = -90 + (180 * s) / SEG;
      const pp = project(lng, lat, p);
      if (pp.z > 0) {
        if (!inSeg) {
          path += `M${pp.x.toFixed(2)},${pp.y.toFixed(2)}`;
          inSeg = true;
        } else {
          path += `L${pp.x.toFixed(2)},${pp.y.toFixed(2)}`;
        }
      } else {
        inSeg = false;
      }
    }
  }
  // parallels every 20°
  for (let lat = -80; lat <= 80; lat += 20) {
    let inSeg = false;
    for (let s = 0; s <= SEG; s++) {
      const lng = -180 + (360 * s) / SEG;
      const pp = project(lng, lat, p);
      if (pp.z > 0) {
        if (!inSeg) {
          path += `M${pp.x.toFixed(2)},${pp.y.toFixed(2)}`;
          inSeg = true;
        } else {
          path += `L${pp.x.toFixed(2)},${pp.y.toFixed(2)}`;
        }
      } else {
        inSeg = false;
      }
    }
  }
  return path;
}

// ─────────────────────────────────────────────────────────────────────────────
// Component
// ─────────────────────────────────────────────────────────────────────────────
export function UmmahGlobe({
  cities,
  subSolarLng,
  subSolarLat,
  language,
  selectedCity,
  onBackgroundClick,
  onCityClick,
  initialLng = 39.8262, // Mecca
  initialLat = 21.4225,
  readOnly = false,
  idleRotate = 0,
}: UmmahGlobeProps) {
  // Rotation + zoom state. φ (pitch) is clamped so the user can't flip past poles.
  const [rotLng, setRotLng] = useState(initialLng);
  const [rotLat, setRotLat] = useState(initialLat);
  const [zoom, setZoom] = useState(1);
  const [hoverCity, setHoverCity] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);

  // Drag bookkeeping — pointer events + multi-touch pinch.
  const svgRef = useRef<SVGSVGElement | null>(null);
  const pointers = useRef<Map<number, { x: number; y: number }>>(new Map());
  const dragStart = useRef<{
    pointerId: number;
    lng: number;
    lat: number;
    x: number;
    y: number;
    moved: boolean;
  } | null>(null);
  const lastDragMoved = useRef(false);
  const pinchStart = useRef<{ dist: number; zoom: number } | null>(null);

  // Velocity for inertia (deg per ms).
  const velocity = useRef({ vLng: 0, vLat: 0 });
  const lastMove = useRef<{ x: number; y: number; t: number } | null>(null);
  const lastInteractionAt = useRef<number>(performance.now());
  const rafRef = useRef<number | null>(null);

  const R = BASE_R * zoom;

  // ── Inertia + idle-rotate animation loop ────────────────────────────────
  useEffect(() => {
    let prev = performance.now();
    const tick = (now: number) => {
      const dt = Math.min(64, now - prev);
      prev = now;

      // Inertia decay
      const v = velocity.current;
      const speed2 = v.vLng * v.vLng + v.vLat * v.vLat;
      let didMove = false;
      if (speed2 > 1e-6) {
        // Apply velocity
        setRotLng((l) => normLng(l + v.vLng * dt));
        setRotLat((l) => clampLat(l + v.vLat * dt));
        // Decay (~0.93 per 16ms ≈ 0.0045 per ms)
        const decay = Math.pow(0.94, dt / 16);
        v.vLng *= decay;
        v.vLat *= decay;
        if (v.vLng * v.vLng + v.vLat * v.vLat < 1e-6) {
          v.vLng = 0;
          v.vLat = 0;
        }
        didMove = true;
      }

      // Auto-rotate when truly idle (no inertia, no drag, no recent interaction)
      if (
        !didMove &&
        !dragStart.current &&
        idleRotate > 0 &&
        now - lastInteractionAt.current > 1200
      ) {
        setRotLng((l) => normLng(l + (idleRotate * dt) / 1000));
      }

      rafRef.current = requestAnimationFrame(tick);
    };
    rafRef.current = requestAnimationFrame(tick);
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, [idleRotate]);

  // ── Pointer event handlers ──────────────────────────────────────────────
  const onPointerDown = useCallback(
    (e: React.PointerEvent<SVGSVGElement>) => {
      if (readOnly) return;
      (e.target as Element).setPointerCapture?.(e.pointerId);
      pointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
      lastInteractionAt.current = performance.now();

      // Stop inertia immediately
      velocity.current.vLng = 0;
      velocity.current.vLat = 0;

      if (pointers.current.size === 1) {
        dragStart.current = {
          pointerId: e.pointerId,
          lng: rotLng,
          lat: rotLat,
          x: e.clientX,
          y: e.clientY,
          moved: false,
        };
        lastDragMoved.current = false;
        lastMove.current = { x: e.clientX, y: e.clientY, t: performance.now() };
        setIsDragging(true);
      } else if (pointers.current.size === 2) {
        // Start pinch
        const pts = Array.from(pointers.current.values());
        const dx = pts[0].x - pts[1].x;
        const dy = pts[0].y - pts[1].y;
        pinchStart.current = {
          dist: Math.hypot(dx, dy),
          zoom,
        };
        dragStart.current = null;
      }
    },
    [rotLng, rotLat, zoom, readOnly]
  );

  const onPointerMove = useCallback(
    (e: React.PointerEvent<SVGSVGElement>) => {
      if (readOnly) return;
      if (!pointers.current.has(e.pointerId)) return;
      pointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
      lastInteractionAt.current = performance.now();

      if (pointers.current.size === 2 && pinchStart.current) {
        const pts = Array.from(pointers.current.values());
        const dx = pts[0].x - pts[1].x;
        const dy = pts[0].y - pts[1].y;
        const dist = Math.hypot(dx, dy);
        const factor = dist / pinchStart.current.dist;
        const next = clampZoom(pinchStart.current.zoom * factor);
        setZoom(next);
        return;
      }

      const ds = dragStart.current;
      if (!ds || ds.pointerId !== e.pointerId) return;

      // Convert pixel delta to degrees. Use SVG-pixel rate based on R.
      // We want one full revolution to take roughly 2π·R pixels of horizontal drag.
      const rect = svgRef.current?.getBoundingClientRect();
      const pxPerSvg = rect ? rect.width / VIEW : 1;
      const Reff = R * pxPerSvg;
      const dxPx = e.clientX - ds.x;
      const dyPx = e.clientY - ds.y;
      // Sensitivity: 1 px ≈ 1/Reff radians ≈ (180/π/Reff) degrees
      const degPerPx = 180 / Math.PI / Math.max(40, Reff);

      const newLng = normLng(ds.lng - dxPx * degPerPx);
      const newLat = clampLat(ds.lat + dyPx * degPerPx);
      setRotLng(newLng);
      setRotLat(newLat);

      if (Math.abs(dxPx) + Math.abs(dyPx) > 3) {
        ds.moved = true;
        lastDragMoved.current = true;
      }

      // Track velocity for inertia: deg per ms (positive is right/up drag)
      const now = performance.now();
      const last = lastMove.current;
      if (last) {
        const dt = Math.max(1, now - last.t);
        const vDxPx = e.clientX - last.x;
        const vDyPx = e.clientY - last.y;
        // average with previous velocity for smoothness
        velocity.current.vLng = velocity.current.vLng * 0.3 + (-vDxPx * degPerPx) / dt * 0.7;
        velocity.current.vLat = velocity.current.vLat * 0.3 + (vDyPx * degPerPx) / dt * 0.7;
      }
      lastMove.current = { x: e.clientX, y: e.clientY, t: now };
    },
    [R, readOnly]
  );

  const onPointerUp = useCallback(
    (e: React.PointerEvent<SVGSVGElement>) => {
      if (readOnly) return;
      pointers.current.delete(e.pointerId);
      lastInteractionAt.current = performance.now();
      if (pointers.current.size < 2) pinchStart.current = null;
      const ds = dragStart.current;
      if (ds && ds.pointerId === e.pointerId) {
        dragStart.current = null;
        setIsDragging(false);
        // Cap inertia speed
        const cap = 0.012; // deg/ms
        if (Math.abs(velocity.current.vLng) > cap)
          velocity.current.vLng = Math.sign(velocity.current.vLng) * cap;
        if (Math.abs(velocity.current.vLat) > cap)
          velocity.current.vLat = Math.sign(velocity.current.vLat) * cap;
        // If user barely moved, treat as a tap → don't apply inertia
        if (!ds.moved) {
          velocity.current.vLng = 0;
          velocity.current.vLat = 0;
        }
      }
    },
    [readOnly]
  );

  const onWheel = useCallback(
    (e: React.WheelEvent<SVGSVGElement>) => {
      if (readOnly) return;
      e.preventDefault();
      lastInteractionAt.current = performance.now();
      const factor = Math.exp(-e.deltaY * 0.0015);
      setZoom((z) => clampZoom(z * factor));
    },
    [readOnly]
  );

  // ── Memoised projection state + path strings ────────────────────────────
  const proj: ProjState = useMemo(
    () => ({ rotLng, rotLat, R }),
    [rotLng, rotLat, R]
  );

  const landPath = useMemo(() => {
    let s = '';
    for (const poly of WORLD_POLYS) s += buildPolyPath(poly, proj);
    return s;
  }, [proj]);

  const graticulePath = useMemo(() => buildGraticule(proj), [proj]);

  const sun = useMemo(() => project(subSolarLng, subSolarLat, proj), [
    subSolarLng,
    subSolarLat,
    proj,
  ]);

  // visible cities
  const cityPositions = useMemo(
    () =>
      cities.map((c) => {
        const pp = project(c.lng, c.lat, proj);
        return { ...c, ...pp, visible: pp.z > 0 };
      }),
    [cities, proj]
  );

  // Day-shading center (sub-solar projected) + radial fall-off radius
  const sunVisible = sun.z > 0;
  const dayCx = sunVisible ? sun.x : VIEW_CX;
  const dayCy = sunVisible ? sun.y : VIEW_CY;

  // ── Render ───────────────────────────────────────────────────────────────
  return (
    <svg
      ref={svgRef}
      viewBox={`0 0 ${VIEW} ${VIEW}`}
      preserveAspectRatio="xMidYMid meet"
      className="w-full h-auto block select-none touch-none"
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onPointerCancel={onPointerUp}
      onWheel={onWheel}
      style={{ cursor: readOnly ? 'default' : isDragging ? 'grabbing' : 'grab' }}
      onClick={(e) => {
        // Background tap deselects only if it's not a drag
        if (lastDragMoved.current) {
          lastDragMoved.current = false;
          return;
        }
        if (e.target === svgRef.current) onBackgroundClick?.();
      }}
      role="img"
      aria-label={
        language === 'ar'
          ? 'كرة أرضية تفاعلية لمواقيت الصلاة في العالم'
          : 'Interaktive Erdkugel mit Gebetszeiten weltweit'
      }
    >
      <defs>
        {/* Outer atmosphere glow */}
        <radialGradient id="globeAtmo" cx="50%" cy="50%" r="50%">
          <stop offset="55%" stopColor="hsl(200, 90%, 70%)" stopOpacity="0" />
          <stop offset="92%" stopColor="hsl(200, 90%, 70%)" stopOpacity="0.18" />
          <stop offset="100%" stopColor="hsl(200, 90%, 70%)" stopOpacity="0" />
        </radialGradient>

        {/* Ocean — subtle radial darker centre → lighter edge */}
        <radialGradient id="globeOcean" cx="50%" cy="50%" r="55%">
          <stop offset="0%" stopColor="hsl(218, 60%, 22%)" />
          <stop offset="60%" stopColor="hsl(220, 65%, 14%)" />
          <stop offset="100%" stopColor="hsl(225, 75%, 8%)" />
        </radialGradient>

        {/* Land fill — emerald gradient */}
        <linearGradient id="globeLandFill" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="hsl(165, 42%, 42%)" />
          <stop offset="55%" stopColor="hsl(170, 45%, 32%)" />
          <stop offset="100%" stopColor="hsl(175, 55%, 22%)" />
        </linearGradient>

        {/* Day-light — bright disc that follows the sub-solar point */}
        <radialGradient
          id="dayLight"
          gradientUnits="userSpaceOnUse"
          fx={dayCx}
          fy={dayCy}
          cx={dayCx}
          cy={dayCy}
          r={R * 1.05}
        >
          <stop offset="0%" stopColor="hsl(45, 100%, 92%)" stopOpacity="0.42" />
          <stop offset="40%" stopColor="hsl(38, 100%, 70%)" stopOpacity="0.18" />
          <stop offset="80%" stopColor="hsl(220, 80%, 10%)" stopOpacity="0.0" />
          <stop offset="100%" stopColor="hsl(225, 80%, 4%)" stopOpacity="0.55" />
        </radialGradient>

        {/* Specular highlight — top-left */}
        <radialGradient
          id="globeSpecular"
          gradientUnits="userSpaceOnUse"
          cx={VIEW_CX - R * 0.45}
          cy={VIEW_CY - R * 0.45}
          r={R * 0.55}
        >
          <stop offset="0%" stopColor="hsl(0, 0%, 100%)" stopOpacity="0.22" />
          <stop offset="60%" stopColor="hsl(0, 0%, 100%)" stopOpacity="0.04" />
          <stop offset="100%" stopColor="hsl(0, 0%, 100%)" stopOpacity="0" />
        </radialGradient>

        {/* Inner shadow — terminator side falloff */}
        <radialGradient
          id="globeInnerShadow"
          gradientUnits="userSpaceOnUse"
          cx={VIEW_CX}
          cy={VIEW_CY}
          r={R}
        >
          <stop offset="80%" stopColor="hsl(225, 80%, 4%)" stopOpacity="0" />
          <stop offset="100%" stopColor="hsl(225, 80%, 4%)" stopOpacity="0.55" />
        </radialGradient>

        {/* Mecca pulse */}
        <radialGradient id="meccaGlow" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="hsl(48, 100%, 88%)" stopOpacity="1" />
          <stop offset="60%" stopColor="hsl(45, 100%, 60%)" stopOpacity="0.3" />
          <stop offset="100%" stopColor="hsl(40, 100%, 50%)" stopOpacity="0" />
        </radialGradient>

        {/* Clip everything to globe disc */}
        <clipPath id="globeClip">
          <circle cx={VIEW_CX} cy={VIEW_CY} r={R} />
        </clipPath>
      </defs>

      {/* Outer atmosphere halo */}
      <circle
        cx={VIEW_CX}
        cy={VIEW_CY}
        r={R + 14}
        fill="url(#globeAtmo)"
        pointerEvents="none"
      />

      {/* Ocean disc */}
      <circle cx={VIEW_CX} cy={VIEW_CY} r={R} fill="url(#globeOcean)" />

      {/* Everything below clipped to disc */}
      <g clipPath="url(#globeClip)">
        {/* Graticule — soft */}
        <path
          d={graticulePath}
          stroke="hsl(200, 50%, 70%)"
          strokeOpacity="0.12"
          strokeWidth="0.5"
          fill="none"
          pointerEvents="none"
        />

        {/* Land masses */}
        <path
          d={landPath}
          fill="url(#globeLandFill)"
          fillRule="evenodd"
          stroke="hsl(170, 45%, 60%)"
          strokeOpacity="0.45"
          strokeWidth="0.4"
          pointerEvents="none"
        />

        {/* Day-side bright wash that tracks the sun. Blends additively on top of land+ocean. */}
        <circle
          cx={VIEW_CX}
          cy={VIEW_CY}
          r={R}
          fill="url(#dayLight)"
          pointerEvents="none"
          style={{ mixBlendMode: 'screen' }}
        />

        {/* Inner shadow at horizon for depth */}
        <circle
          cx={VIEW_CX}
          cy={VIEW_CY}
          r={R}
          fill="url(#globeInnerShadow)"
          pointerEvents="none"
        />

        {/* Specular highlight */}
        <circle
          cx={VIEW_CX}
          cy={VIEW_CY}
          r={R}
          fill="url(#globeSpecular)"
          pointerEvents="none"
        />
      </g>

      {/* Crisp silhouette ring */}
      <circle
        cx={VIEW_CX}
        cy={VIEW_CY}
        r={R}
        fill="none"
        stroke="hsl(200, 80%, 75%)"
        strokeOpacity="0.35"
        strokeWidth="0.8"
        pointerEvents="none"
      />

      {/* Sun glyph (only when on visible hemisphere) */}
      {sunVisible && (
        <g pointerEvents="none">
          <motion.circle
            cx={sun.x}
            cy={sun.y}
            r={9}
            fill="hsl(48, 100%, 80%)"
            fillOpacity={0.35}
            animate={{ scale: [1, 1.18, 1] }}
            transition={{ duration: 3.5, repeat: Infinity, ease: 'easeInOut' }}
            style={{ transformOrigin: `${sun.x}px ${sun.y}px` }}
          />
          <circle cx={sun.x} cy={sun.y} r={3.2} fill="hsl(48, 100%, 96%)" />
          <circle cx={sun.x} cy={sun.y} r={1.4} fill="#fff" />
        </g>
      )}

      {/* City dots */}
      {cityPositions.map((c) => {
        if (!c.visible) return null;
        const isSelected = c.name === selectedCity;
        const isHover = c.name === hoverCity;
        const baseR = c.qibla ? 4 : c.active ? 3.2 : 2.4;
        return (
          <g
            key={c.name}
            style={{ cursor: 'pointer' }}
            onClick={(e) => {
              e.stopPropagation();
              // Suppress click if user was actually dragging (small move tolerance).
              if (lastDragMoved.current) {
                lastDragMoved.current = false;
                return;
              }
              onCityClick?.(c.name);
            }}
            onPointerEnter={() => setHoverCity(c.name)}
            onPointerLeave={() => setHoverCity((h) => (h === c.name ? null : h))}
          >
            <circle cx={c.x} cy={c.y} r={Math.max(8, baseR + 5)} fill="transparent" />
            {c.qibla && (
              <>
                <motion.circle
                  cx={c.x}
                  cy={c.y}
                  r={baseR + 2}
                  fill="url(#meccaGlow)"
                  animate={{
                    r: [baseR + 1.5, baseR + 8, baseR + 1.5],
                    opacity: [0.85, 0, 0.85],
                  }}
                  transition={{ duration: 2.4, repeat: Infinity, ease: 'easeOut' }}
                />
                <motion.circle
                  cx={c.x}
                  cy={c.y}
                  r={baseR + 4}
                  fill="none"
                  stroke="hsl(48, 100%, 72%)"
                  strokeWidth="0.6"
                  strokeDasharray="2 1.5"
                  animate={{ rotate: 360 }}
                  transition={{ duration: 18, repeat: Infinity, ease: 'linear' }}
                  style={{ transformOrigin: `${c.x}px ${c.y}px` }}
                />
              </>
            )}
            {c.active && !c.qibla && (
              <motion.circle
                cx={c.x}
                cy={c.y}
                r={baseR + 1.5}
                fill={c.color}
                fillOpacity={0.2}
                animate={{
                  r: [baseR + 1, baseR + 5, baseR + 1],
                  opacity: [0.45, 0, 0.45],
                }}
                transition={{
                  duration: 2.6,
                  repeat: Infinity,
                  ease: 'easeInOut',
                  delay: (c.name.charCodeAt(0) % 5) * 0.18,
                }}
              />
            )}
            <circle
              cx={c.x}
              cy={c.y}
              r={baseR}
              fill={c.qibla ? 'hsl(48, 100%, 70%)' : c.color}
              stroke={
                isSelected || isHover
                  ? 'hsl(0, 0%, 100%)'
                  : c.qibla
                  ? 'hsl(48, 100%, 92%)'
                  : 'hsl(0, 0%, 100%)'
              }
              strokeOpacity={isSelected ? 1 : isHover ? 0.85 : c.qibla ? 0.9 : 0.5}
              strokeWidth={isSelected ? 1.2 : 0.6}
            />
            {(isSelected || isHover) && (
              <text
                x={c.x + baseR + 3}
                y={c.y - baseR - 3}
                fontSize="9"
                fontWeight="700"
                fill="hsl(0, 0%, 100%)"
                style={{
                  paintOrder: 'stroke',
                  stroke: 'hsl(225, 60%, 6%)',
                  strokeWidth: 3,
                  strokeLinejoin: 'round',
                }}
                pointerEvents="none"
              >
                {c.flag} {language === 'ar' ? c.nameAr : c.name}
              </text>
            )}
          </g>
        );
      })}

      {/* Compass cardinals on outer ring */}
      <g
        pointerEvents="none"
        fill="hsl(200, 30%, 95%)"
        fillOpacity="0.45"
        fontSize="9"
        fontWeight="700"
        fontFamily="ui-sans-serif, system-ui"
      >
        <text x={VIEW_CX} y={VIEW_CY - R - 3} textAnchor="middle">
          N
        </text>
        <text x={VIEW_CX} y={VIEW_CY + R + 10} textAnchor="middle">
          S
        </text>
        <text x={VIEW_CX - R - 8} y={VIEW_CY + 3} textAnchor="middle">
          W
        </text>
        <text x={VIEW_CX + R + 8} y={VIEW_CY + 3} textAnchor="middle">
          E
        </text>
      </g>
    </svg>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────
function normLng(lng: number) {
  return ((((lng + 180) % 360) + 360) % 360) - 180;
}
function clampLat(lat: number) {
  return Math.max(-85, Math.min(85, lat));
}
function clampZoom(z: number) {
  return Math.max(MIN_ZOOM, Math.min(MAX_ZOOM, z));
}
