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
import { WORLD_LAND_PATH } from './UmmahPulse.worldPath';

/**
 * UmmahGlobe — Apple‑Earth‑style interactive 3D globe (pure SVG).
 *
 *  Highlights of this version
 *  ──────────────────────────────────────────────────────────────
 *  • Land is now drawn in *latitude bands* (polar / boreal /
 *    temperate / tropical) so the planet actually looks like Earth
 *    rather than a uniform green ball.
 *  • Asymmetric atmosphere: the bluish glow tracks the sub‑solar
 *    point, day side bright, night side dark – like the real limb.
 *  • A bright sub‑solar specular hot‑spot and a soft anti‑solar
 *     mat together give the surface a real "lit sphere" feel.
 *  • Distant star field around the globe (clipped *outside* the
 *    silhouette) for a sense of being in space.
 *  • Smoother momentum: cubic decay, capped speed, snappier stop.
 *  • Imperative API exposed via ref:
 *        globe.flyTo({ lng, lat, zoom, duration })   – animated
 *        globe.zoomBy(factor)                        – instant
 *  • Double‑click / double‑tap = zoom in.
 *  • Pinch zoom + multi‑pointer drag still work as before.
 */

// ─────────────────────────────────────────────────────────────────────────────
// Public types
// ─────────────────────────────────────────────────────────────────────────────
export interface GlobeCity {
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

export interface UmmahGlobeProps {
  cities: GlobeCity[];
  subSolarLng: number;
  subSolarLat: number;
  language: 'ar' | 'de';
  selectedCity?: string | null;
  onBackgroundClick?: () => void;
  onCityClick?: (name: string) => void;
  initialLng?: number;
  initialLat?: number;
  readOnly?: boolean;
  /** auto-rotate speed (deg/s) when idle. 0 = off. */
  idleRotate?: number;
}

export interface UmmahGlobeHandle {
  /** Smoothly fly to a target view. */
  flyTo: (opts: {
    lng?: number;
    lat?: number;
    zoom?: number;
    duration?: number;
  }) => void;
  /** Multiply current zoom by `factor` (instant). */
  zoomBy: (factor: number) => void;
}

// ─────────────────────────────────────────────────────────────────────────────
// Constants
// ─────────────────────────────────────────────────────────────────────────────
const RAD = Math.PI / 180;
const VIEW = 400;
const VIEW_CX = VIEW / 2;
const VIEW_CY = VIEW / 2;
const BASE_R = 178;
const MIN_ZOOM = 0.6;
const MAX_ZOOM = 4;

// ─────────────────────────────────────────────────────────────────────────────
// Math helpers
// ─────────────────────────────────────────────────────────────────────────────
const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
function lerpAngle(a: number, b: number, t: number) {
  let d = b - a;
  while (d > 180) d -= 360;
  while (d < -180) d += 360;
  return a + d * t;
}
const easeOutCubic = (t: number) => 1 - Math.pow(1 - t, 3);
function normLng(lng: number) {
  return ((((lng + 180) % 360) + 360) % 360) - 180;
}
function clampLat(lat: number) {
  return Math.max(-85, Math.min(85, lat));
}
function clampZoom(z: number) {
  return Math.max(MIN_ZOOM, Math.min(MAX_ZOOM, z));
}

// ─────────────────────────────────────────────────────────────────────────────
// World path → polygons
// ─────────────────────────────────────────────────────────────────────────────
type LngLat = readonly [number, number];

function parseWorldPolys(d: string): LngLat[][] {
  const polys: LngLat[][] = [];
  let cur: LngLat[] = [];
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
// Latitude bands — group polygons by centroid latitude so each big chunk of
// land gets a tint that loosely matches its biome.
// ─────────────────────────────────────────────────────────────────────────────
type LandBand = 'polar' | 'boreal' | 'temperate' | 'tropical';
const BAND_ORDER: LandBand[] = ['tropical', 'temperate', 'boreal', 'polar'];

function bandFor(lat: number): LandBand {
  const a = Math.abs(lat);
  if (a > 60) return 'polar';
  if (a > 45) return 'boreal';
  if (a > 23) return 'temperate';
  return 'tropical';
}

const POLYS_BY_BAND: Record<LandBand, LngLat[][]> = {
  polar: [],
  boreal: [],
  temperate: [],
  tropical: [],
};
for (const poly of WORLD_POLYS) {
  let cy = 0;
  for (const v of poly) cy += v[1];
  cy /= poly.length;
  POLYS_BY_BAND[bandFor(cy)].push(poly);
}

// ─────────────────────────────────────────────────────────────────────────────
// Star field — fixed in screen space (camera doesn't rotate; the globe does).
// ─────────────────────────────────────────────────────────────────────────────
function makeStars(seed: number, count: number) {
  let s = seed >>> 0;
  const rand = () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 0xffffffff;
  };
  const stars: { x: number; y: number; r: number; o: number; tw: boolean }[] = [];
  for (let i = 0; i < count; i++) {
    // Spread stars across the full square, then drop ones that fall too close
    // to the disc centre (where the planet would obscure them anyway).
    const x = rand() * VIEW;
    const y = rand() * VIEW;
    const dx = x - VIEW_CX;
    const dy = y - VIEW_CY;
    const dist = Math.hypot(dx, dy);
    if (dist < BASE_R * 1.05) continue; // skip — globe will hide it
    stars.push({
      x,
      y,
      r: 0.25 + rand() * 0.6,
      o: 0.45 + rand() * 0.5,
      tw: i % 4 === 0,
    });
  }
  return stars;
}
const STARS = makeStars(0xfeed42, 280);

// ─────────────────────────────────────────────────────────────────────────────
// Orthographic projection
// ─────────────────────────────────────────────────────────────────────────────
interface ProjState {
  rotLng: number;
  rotLat: number;
  R: number;
}
interface ProjPoint {
  x: number;
  y: number;
  z: number; // cos(c) — visibility (≥ 0 ⇒ on visible hemisphere)
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
  return {
    x: VIEW_CX + p.R * (cphi * Math.sin(dlam)),
    y: VIEW_CY - p.R * (cphi0 * sphi - sphi0 * cphi * cdlam),
    z: cosc,
  };
}

function horizonInterp(
  a: LngLat,
  b: LngLat,
  p: ProjState
): { lng: number; lat: number } {
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

function buildPolyPath(poly: LngLat[], p: ProjState): string {
  const n = poly.length;
  if (n < 3) return '';
  const projs: ProjPoint[] = new Array(n);
  for (let i = 0; i < n; i++) projs[i] = project(poly[i][0], poly[i][1], p);

  let visCount = 0;
  const vis = new Array<boolean>(n);
  for (let i = 0; i < n; i++) {
    vis[i] = projs[i].z > 0;
    if (vis[i]) visCount++;
  }
  if (visCount === 0) return '';
  if (visCount === n) {
    let s = `M${projs[0].x.toFixed(2)},${projs[0].y.toFixed(2)}`;
    for (let i = 1; i < n; i++)
      s += `L${projs[i].x.toFixed(2)},${projs[i].y.toFixed(2)}`;
    return s + 'Z';
  }

  // Rotate so vis[0] is hidden, then a single forward sweep finds runs.
  let pivot = 0;
  while (pivot < n && vis[pivot]) pivot++;
  if (pivot === n) return '';

  const idxAt = (k: number) => (k + pivot) % n;
  const visRot = (k: number) => vis[idxAt(k)];

  const runs: { startV: number; endV: number }[] = [];
  let k = 0;
  while (k < n) {
    while (k < n && !visRot(k)) k++;
    if (k >= n) break;
    const startK = k;
    while (k < n && visRot(k)) k++;
    runs.push({ startV: idxAt(startK), endV: idxAt(k - 1) });
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
    s += `L${E2.x.toFixed(2)},${E2.y.toFixed(2)}Z`;
    path += s;
  }
  return path;
}

function buildGraticule(p: ProjState): string {
  const SEG = 60;
  let path = '';
  for (let lng = -180; lng < 180; lng += 30) {
    let inSeg = false;
    for (let s = 0; s <= SEG; s++) {
      const lat = -90 + (180 * s) / SEG;
      const pp = project(lng, lat, p);
      if (pp.z > 0) {
        path += inSeg
          ? `L${pp.x.toFixed(2)},${pp.y.toFixed(2)}`
          : `M${pp.x.toFixed(2)},${pp.y.toFixed(2)}`;
        inSeg = true;
      } else {
        inSeg = false;
      }
    }
  }
  for (let lat = -80; lat <= 80; lat += 20) {
    let inSeg = false;
    for (let s = 0; s <= SEG; s++) {
      const lng = -180 + (360 * s) / SEG;
      const pp = project(lng, lat, p);
      if (pp.z > 0) {
        path += inSeg
          ? `L${pp.x.toFixed(2)},${pp.y.toFixed(2)}`
          : `M${pp.x.toFixed(2)},${pp.y.toFixed(2)}`;
        inSeg = true;
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
export const UmmahGlobe = forwardRef<UmmahGlobeHandle, UmmahGlobeProps>(
  function UmmahGlobeImpl(
    {
      cities,
      subSolarLng,
      subSolarLat,
      language,
      selectedCity,
      onBackgroundClick,
      onCityClick,
      initialLng = 39.8262,
      initialLat = 21.4225,
      readOnly = false,
      idleRotate = 0,
    },
    ref
  ) {
    // ── State ───────────────────────────────────────────────────────────────
    const [rotLng, setRotLng] = useState(initialLng);
    const [rotLat, setRotLat] = useState(initialLat);
    const [zoom, setZoom] = useState(1);
    const [hoverCity, setHoverCity] = useState<string | null>(null);
    const [isDragging, setIsDragging] = useState(false);

    // ── Refs ────────────────────────────────────────────────────────────────
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
    const velocity = useRef({ vLng: 0, vLat: 0 });
    const lastMove = useRef<{ x: number; y: number; t: number } | null>(null);
    const lastInteractionAt = useRef(performance.now());
    const flyAnim = useRef<{
      fromLng: number;
      fromLat: number;
      fromZoom: number;
      toLng: number;
      toLat: number;
      toZoom: number;
      start: number;
      duration: number;
    } | null>(null);
    const rafRef = useRef<number | null>(null);

    // Track latest values for fly-from
    const liveRot = useRef({ rotLng, rotLat, zoom });
    liveRot.current = { rotLng, rotLat, zoom };

    const R = BASE_R * zoom;

    // ── Imperative API ─────────────────────────────────────────────────────
    useImperativeHandle(
      ref,
      () => ({
        flyTo: ({ lng, lat, zoom: targetZoom, duration = 700 }) => {
          velocity.current.vLng = 0;
          velocity.current.vLat = 0;
          flyAnim.current = {
            fromLng: liveRot.current.rotLng,
            fromLat: liveRot.current.rotLat,
            fromZoom: liveRot.current.zoom,
            toLng: lng !== undefined ? lng : liveRot.current.rotLng,
            toLat:
              lat !== undefined
                ? clampLat(lat)
                : liveRot.current.rotLat,
            toZoom:
              targetZoom !== undefined
                ? clampZoom(targetZoom)
                : liveRot.current.zoom,
            start: performance.now(),
            duration: Math.max(80, duration),
          };
          lastInteractionAt.current = performance.now();
        },
        zoomBy: (factor: number) => {
          velocity.current.vLng = 0;
          velocity.current.vLat = 0;
          setZoom((z) => clampZoom(z * factor));
          lastInteractionAt.current = performance.now();
        },
      }),
      []
    );

    // ── Single rAF loop: fly-to ▸ inertia ▸ idle-rotate ───────────────────
    useEffect(() => {
      let prev = performance.now();
      const tick = (now: number) => {
        const dt = Math.min(64, now - prev);
        prev = now;

        const fly = flyAnim.current;
        if (fly) {
          const t = Math.min(1, (now - fly.start) / fly.duration);
          const e = easeOutCubic(t);
          setRotLng(normLng(lerpAngle(fly.fromLng, fly.toLng, e)));
          setRotLat(clampLat(lerp(fly.fromLat, fly.toLat, e)));
          setZoom(clampZoom(lerp(fly.fromZoom, fly.toZoom, e)));
          if (t >= 1) flyAnim.current = null;
        } else {
          const v = velocity.current;
          const speed = Math.abs(v.vLng) + Math.abs(v.vLat);
          if (speed > 0.0004) {
            setRotLng((l) => normLng(l + v.vLng * dt));
            setRotLat((l) => clampLat(l + v.vLat * dt));
            // Slightly stronger decay than Apple's classic 0.95/16 — feels
            // crisp without dragging too long.
            const decay = Math.pow(0.93, dt / 16);
            v.vLng *= decay;
            v.vLat *= decay;
            if (Math.abs(v.vLng) + Math.abs(v.vLat) < 0.0004) {
              v.vLng = 0;
              v.vLat = 0;
            }
          } else if (
            !dragStart.current &&
            idleRotate > 0 &&
            now - lastInteractionAt.current > 1500
          ) {
            setRotLng((l) => normLng(l + (idleRotate * dt) / 1000));
          }
        }

        rafRef.current = requestAnimationFrame(tick);
      };
      rafRef.current = requestAnimationFrame(tick);
      return () => {
        if (rafRef.current) cancelAnimationFrame(rafRef.current);
      };
    }, [idleRotate]);

    // ── Pointer / wheel handlers ───────────────────────────────────────────
    const onPointerDown = useCallback(
      (e: React.PointerEvent<SVGSVGElement>) => {
        if (readOnly) return;
        (e.target as Element).setPointerCapture?.(e.pointerId);
        pointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
        lastInteractionAt.current = performance.now();

        // Stop any in-flight animation
        velocity.current.vLng = 0;
        velocity.current.vLat = 0;
        flyAnim.current = null;

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
          lastMove.current = {
            x: e.clientX,
            y: e.clientY,
            t: performance.now(),
          };
          setIsDragging(true);
        } else if (pointers.current.size === 2) {
          const pts = Array.from(pointers.current.values());
          const dx = pts[0].x - pts[1].x;
          const dy = pts[0].y - pts[1].y;
          pinchStart.current = { dist: Math.hypot(dx, dy), zoom };
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
          setZoom(clampZoom(pinchStart.current.zoom * factor));
          return;
        }

        const ds = dragStart.current;
        if (!ds || ds.pointerId !== e.pointerId) return;

        const rect = svgRef.current?.getBoundingClientRect();
        const pxPerSvg = rect ? rect.width / VIEW : 1;
        const Reff = R * pxPerSvg;
        const dxPx = e.clientX - ds.x;
        const dyPx = e.clientY - ds.y;
        const degPerPx = 180 / Math.PI / Math.max(40, Reff);

        setRotLng(normLng(ds.lng - dxPx * degPerPx));
        setRotLat(clampLat(ds.lat + dyPx * degPerPx));

        if (Math.abs(dxPx) + Math.abs(dyPx) > 3) {
          ds.moved = true;
          lastDragMoved.current = true;
        }

        const now = performance.now();
        const last = lastMove.current;
        if (last) {
          const dt = Math.max(1, now - last.t);
          const vDxPx = e.clientX - last.x;
          const vDyPx = e.clientY - last.y;
          // Smooth velocity with EMA so a single jittery sample doesn't
          // launch the globe wildly.
          velocity.current.vLng =
            velocity.current.vLng * 0.3 + (-vDxPx * degPerPx) / dt * 0.7;
          velocity.current.vLat =
            velocity.current.vLat * 0.3 + (vDyPx * degPerPx) / dt * 0.7;
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
          // Cap inertia so a fast flick doesn't whip the globe past usability.
          const cap = 0.013;
          if (Math.abs(velocity.current.vLng) > cap)
            velocity.current.vLng = Math.sign(velocity.current.vLng) * cap;
          if (Math.abs(velocity.current.vLat) > cap)
            velocity.current.vLat = Math.sign(velocity.current.vLat) * cap;
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
        const factor = Math.exp(-e.deltaY * 0.0018);
        setZoom((z) => clampZoom(z * factor));
      },
      [readOnly]
    );

    const onDoubleClick = useCallback(
      (e: React.MouseEvent<SVGSVGElement>) => {
        if (readOnly) return;
        e.preventDefault();
        velocity.current.vLng = 0;
        velocity.current.vLat = 0;
        flyAnim.current = {
          fromLng: liveRot.current.rotLng,
          fromLat: liveRot.current.rotLat,
          fromZoom: liveRot.current.zoom,
          toLng: liveRot.current.rotLng,
          toLat: liveRot.current.rotLat,
          toZoom: clampZoom(liveRot.current.zoom * 1.6),
          start: performance.now(),
          duration: 350,
        };
        lastInteractionAt.current = performance.now();
      },
      [readOnly]
    );

    // ── Memoised projections / paths ───────────────────────────────────────
    const proj: ProjState = useMemo(
      () => ({ rotLng, rotLat, R }),
      [rotLng, rotLat, R]
    );

    const landByBand = useMemo(() => {
      const result: Record<LandBand, string> = {
        polar: '',
        boreal: '',
        temperate: '',
        tropical: '',
      };
      for (const band of BAND_ORDER) {
        let s = '';
        for (const poly of POLYS_BY_BAND[band]) s += buildPolyPath(poly, proj);
        result[band] = s;
      }
      return result;
    }, [proj]);

    const graticulePath = useMemo(() => buildGraticule(proj), [proj]);

    const sun = useMemo(
      () => project(subSolarLng, subSolarLat, proj),
      [subSolarLng, subSolarLat, proj]
    );
    const antiSun = useMemo(() => {
      const aLng = ((subSolarLng + 180 + 540) % 360) - 180;
      const aLat = -subSolarLat;
      return project(aLng, aLat, proj);
    }, [subSolarLng, subSolarLat, proj]);

    const cityPositions = useMemo(
      () =>
        cities.map((c) => {
          const pp = project(c.lng, c.lat, proj);
          return { ...c, ...pp, visible: pp.z > 0 };
        }),
      [cities, proj]
    );

    // ── Lighting anchors ───────────────────────────────────────────────────
    const sunVisible = sun.z > 0;
    const dayCx = sunVisible ? sun.x : VIEW_CX;
    const dayCy = sunVisible ? sun.y : VIEW_CY;
    const nightCx = antiSun.z > 0 ? antiSun.x : VIEW_CX;
    const nightCy = antiSun.z > 0 ? antiSun.y : VIEW_CY;

    // ── Render ────────────────────────────────────────────────────────────
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
        onDoubleClick={onDoubleClick}
        style={{
          cursor: readOnly ? 'default' : isDragging ? 'grabbing' : 'grab',
        }}
        onClick={(e) => {
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
          {/* Outer atmosphere — anchored at the sun, day side glows */}
          <radialGradient
            id="dayAtmo"
            gradientUnits="userSpaceOnUse"
            cx={dayCx}
            cy={dayCy}
            r={R * 1.5}
          >
            <stop offset="55%" stopColor="hsl(200, 90%, 75%)" stopOpacity="0" />
            <stop
              offset="78%"
              stopColor="hsl(205, 80%, 68%)"
              stopOpacity="0.28"
            />
            <stop
              offset="92%"
              stopColor="hsl(215, 70%, 50%)"
              stopOpacity="0.08"
            />
            <stop
              offset="100%"
              stopColor="hsl(225, 70%, 40%)"
              stopOpacity="0"
            />
          </radialGradient>

          {/* Ocean — Google-Maps-Dark navy graphite */}
          <radialGradient id="oceanGrad" cx="50%" cy="48%" r="58%">
            <stop offset="0%" stopColor="hsl(216, 38%, 13%)" />
            <stop offset="55%" stopColor="hsl(220, 46%, 8%)" />
            <stop offset="100%" stopColor="hsl(225, 56%, 4%)" />
          </radialGradient>

          {/* Land — refined dark slate, very subtle band variation */}
          <linearGradient id="bandPolar" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="hsl(214, 14%, 36%)" />
            <stop offset="100%" stopColor="hsl(216, 16%, 28%)" />
          </linearGradient>
          <linearGradient id="bandBoreal" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="hsl(214, 16%, 30%)" />
            <stop offset="60%" stopColor="hsl(216, 18%, 25%)" />
            <stop offset="100%" stopColor="hsl(220, 20%, 20%)" />
          </linearGradient>
          <linearGradient id="bandTemperate" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="hsl(214, 16%, 28%)" />
            <stop offset="50%" stopColor="hsl(216, 18%, 23%)" />
            <stop offset="100%" stopColor="hsl(220, 20%, 18%)" />
          </linearGradient>
          <linearGradient id="bandTropical" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="hsl(214, 16%, 26%)" />
            <stop offset="60%" stopColor="hsl(216, 18%, 21%)" />
            <stop offset="100%" stopColor="hsl(220, 20%, 17%)" />
          </linearGradient>

          {/* Bright wash that follows the sub-solar point */}
          <radialGradient
            id="dayLight"
            gradientUnits="userSpaceOnUse"
            cx={dayCx}
            cy={dayCy}
            r={R * 1.1}
          >
            <stop
              offset="0%"
              stopColor="hsl(48, 100%, 92%)"
              stopOpacity="0.35"
            />
            <stop
              offset="35%"
              stopColor="hsl(40, 100%, 75%)"
              stopOpacity="0.16"
            />
            <stop
              offset="70%"
              stopColor="hsl(30, 80%, 30%)"
              stopOpacity="0.0"
            />
            <stop
              offset="100%"
              stopColor="hsl(220, 80%, 4%)"
              stopOpacity="0.45"
            />
          </radialGradient>

          {/* Anti-solar darkening — softens the night hemisphere */}
          <radialGradient
            id="nightDark"
            gradientUnits="userSpaceOnUse"
            cx={nightCx}
            cy={nightCy}
            r={R * 1.0}
          >
            <stop
              offset="0%"
              stopColor="hsl(225, 90%, 3%)"
              stopOpacity="0.6"
            />
            <stop
              offset="55%"
              stopColor="hsl(225, 80%, 5%)"
              stopOpacity="0.2"
            />
            <stop
              offset="100%"
              stopColor="hsl(225, 80%, 6%)"
              stopOpacity="0"
            />
          </radialGradient>

          {/* Specular hot-spot at the sub-solar point */}
          <radialGradient
            id="specular"
            gradientUnits="userSpaceOnUse"
            cx={dayCx}
            cy={dayCy}
            r={R * 0.45}
          >
            <stop offset="0%" stopColor="white" stopOpacity="0.18" />
            <stop offset="40%" stopColor="white" stopOpacity="0.06" />
            <stop offset="100%" stopColor="white" stopOpacity="0" />
          </radialGradient>

          {/* Inner rim  gives the disc its 3D bulge */}
          <radialGradient
            id="innerShadow"
            gradientUnits="userSpaceOnUse"
            cx={VIEW_CX}
            cy={VIEW_CY}
            r={R}
          >
            <stop
              offset="78%"
              stopColor="hsl(225, 80%, 3%)"
              stopOpacity="0"
            />
            <stop
              offset="100%"
              stopColor="hsl(225, 80%, 3%)"
              stopOpacity="0.65"
            />
          </radialGradient>

          <radialGradient id="meccaGlow" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="hsl(48, 100%, 88%)" stopOpacity="1" />
            <stop offset="60%" stopColor="hsl(45, 100%, 60%)" stopOpacity="0.3" />
            <stop offset="100%" stopColor="hsl(40, 100%, 50%)" stopOpacity="0" />
          </radialGradient>

          <clipPath id="globeClip">
            <circle cx={VIEW_CX} cy={VIEW_CY} r={R} />
          </clipPath>
        </defs>

        {/* Stars in deep space (only visible outside the globe disc) */}
        <g pointerEvents="none">
          {STARS.map((s, i) =>
            s.tw ? (
              <motion.circle
                key={i}
                cx={s.x}
                cy={s.y}
                r={s.r}
                fill="hsl(220, 30%, 96%)"
                fillOpacity={s.o}
                animate={{ opacity: [s.o, s.o * 0.25, s.o] }}
                transition={{
                  duration: 2 + (i % 5) * 0.6,
                  repeat: Infinity,
                  ease: 'easeInOut',
                  delay: (i % 11) * 0.17,
                }}
              />
            ) : (
              <circle
                key={i}
                cx={s.x}
                cy={s.y}
                r={s.r}
                fill="hsl(220, 30%, 96%)"
                fillOpacity={s.o}
              />
            )
          )}
        </g>

        {/* Asymmetric outer atmosphere (brighter on day side) */}
        <circle
          cx={VIEW_CX}
          cy={VIEW_CY}
          r={R + 22}
          fill="url(#dayAtmo)"
          pointerEvents="none"
        />

        {/* Ocean disc */}
        <circle cx={VIEW_CX} cy={VIEW_CY} r={R} fill="url(#oceanGrad)" />

        {/* Globe contents — clipped to the disc */}
        <g clipPath="url(#globeClip)">
          {/* Graticule — paper-thin, Google-Maps-dark vibe */}
          <path
            d={graticulePath}
            stroke="hsl(214, 28%, 50%)"
            strokeOpacity="0.08"
            strokeWidth="0.35"
            fill="none"
            pointerEvents="none"
          />

          {/* Land — drawn back- so polar ice caps sit on top */}
          <path
            d={landByBand.tropical}
            fill="url(#bandTropical)"
            fillRule="evenodd"
            stroke="hsl(214, 22%, 44%)"
            strokeOpacity="0.45"
            strokeWidth="0.28"
            pointerEvents="none"
          />
          <path
            d={landByBand.temperate}
            fill="url(#bandTemperate)"
            fillRule="evenodd"
            stroke="hsl(214, 22%, 46%)"
            strokeOpacity="0.5"
            strokeWidth="0.28"
            pointerEvents="none"
          />
          <path
            d={landByBand.boreal}
            fill="url(#bandBoreal)"
            fillRule="evenodd"
            stroke="hsl(214, 22%, 48%)"
            strokeOpacity="0.5"
            strokeWidth="0.28"
            pointerEvents="none"
          />
          <path
            d={landByBand.polar}
            fill="url(#bandPolar)"
            fillRule="evenodd"
            stroke="hsl(210, 22%, 60%)"
            strokeOpacity="0.55"
            strokeWidth="0.28"
            pointerEvents="none"
          />

          {/* Day-side bright wash */}
          <circle
            cx={VIEW_CX}
            cy={VIEW_CY}
            r={R}
            fill="url(#dayLight)"
            pointerEvents="none"
            style={{ mixBlendMode: 'overlay' }}
          />

          {/* Night-side darkening */}
          <circle
            cx={VIEW_CX}
            cy={VIEW_CY}
            r={R}
            fill="url(#nightDark)"
            pointerEvents="none"
          />

          {/* Specular hot-spot */}
          {sunVisible && (
            <circle
              cx={VIEW_CX}
              cy={VIEW_CY}
              r={R}
              fill="url(#specular)"
              pointerEvents="none"
              style={{ mixBlendMode: 'screen' }}
            />
          )}

          {/* Inner rim  (depth) */}
          <circle
            cx={VIEW_CX}
            cy={VIEW_CY}
            r={R}
            fill="url(#innerShadow)"
            pointerEvents="none"
          />
        </g>

        {/* Crisp silhouette ring */}
        <circle
          cx={VIEW_CX}
          cy={VIEW_CY}
          r={R}
          fill="none"
          stroke="hsl(205, 70%, 78%)"
          strokeOpacity="0.32"
          strokeWidth="0.6"
          pointerEvents="none"
        />

        {/* Sun — pulsing corona only when on visible hemisphere */}
        {sunVisible && (
          <g pointerEvents="none">
            <motion.circle
              cx={sun.x}
              cy={sun.y}
              r={11}
              fill="hsl(48, 100%, 80%)"
              fillOpacity={0.32}
              animate={{ scale: [1, 1.18, 1] }}
              transition={{
                duration: 3.5,
                repeat: Infinity,
                ease: 'easeInOut',
              }}
              style={{ transformOrigin: `${sun.x}px ${sun.y}px` }}
            />
            <circle cx={sun.x} cy={sun.y} r={3.4} fill="hsl(48, 100%, 96%)" />
            <circle cx={sun.x} cy={sun.y} r={1.6} fill="#fff" />
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
                if (lastDragMoved.current) {
                  lastDragMoved.current = false;
                  return;
                }
                onCityClick?.(c.name);
              }}
              onPointerEnter={() => setHoverCity(c.name)}
              onPointerLeave={() =>
                setHoverCity((h) => (h === c.name ? null : h))
              }
            >
              <circle
                cx={c.x}
                cy={c.y}
                r={Math.max(8, baseR + 5)}
                fill="transparent"
              />
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
                    transition={{
                      duration: 2.4,
                      repeat: Infinity,
                      ease: 'easeOut',
                    }}
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
                    transition={{
                      duration: 18,
                      repeat: Infinity,
                      ease: 'linear',
                    }}
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
                strokeOpacity={
                  isSelected ? 1 : isHover ? 0.85 : c.qibla ? 0.9 : 0.5
                }
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

        {/* Cardinal compass labels */}
        <g
          pointerEvents="none"
          fill="hsl(200, 30%, 95%)"
          fillOpacity="0.5"
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
);
