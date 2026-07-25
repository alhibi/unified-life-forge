/**
 * Runtime motion controller.
 *
 * Two knobs, both genuinely effective on the running app:
 *
 *   1. SPEED SCALE (0.5x → 1.5x) — multiplies every duration inside
 *      `MOTION`, `motionWeight`, `DURATION`. Because framer-motion reads
 *      `.duration` from the SAME object reference each time a
 *      transition starts, mutating the object in-place takes effect on
 *      every subsequent animation without re-rendering callers.
 *      We also mirror the multiplier as `--motion-scale` CSS var so
 *      utility CSS transitions can opt-in via
 *      `transition-duration: calc(<base> * var(--motion-scale))`.
 *
 *   2. FRAME-RATE CAP (60 / 90 / 120 Hz, or 'auto') — wraps
 *      `window.requestAnimationFrame` with a throttle that enforces a
 *      minimum delta between callbacks. Because framer-motion, our
 *      springs, the typing dots, the live ribbon, the qibla compass —
 *      every rAF-driven animation in the app — flows through that one
 *      function, capping it here is felt globally and immediately.
 *      Note: the cap cannot exceed the display's native refresh rate.
 *      On a 60Hz screen, picking 120 Hz is identical to 'auto'.
 */

import { DURATION, fadeUp,MOTION, motionWeight, pageItem } from './motion';

/* ──────────────────────────────────────────────────────────────────────
 * Baselines — captured once on first apply so repeated applies don't
 * compound (apply 0.5x then 1.0x should restore originals, not 2.0x).
 * ────────────────────────────────────────────────────────────────────── */
type DurHolder = { duration?: number } & Record<string, unknown>;
type SpringHolder = {
  type?: string;
  stiffness?: number;
  damping?: number;
  mass?: number;
} & Record<string, unknown>;
let baseline: {
  motion: Record<string, number | undefined>;
  weight: Record<string, number | undefined>;
  duration: Record<string, number>;
  springs: Record<string, { stiffness: number; damping: number }>;
  amplitude: { pageItemY: number; fadeUpY: number; parallax: number };
} | null = null;

function captureBaseline() {
  if (baseline) return;
  const m: Record<string, number | undefined> = {};
  const springs: Record<string, { stiffness: number; damping: number }> = {};
  for (const [k, v] of Object.entries(MOTION as Record<string, unknown>)) {
    if (!v || typeof v !== 'object') continue;
    if ('duration' in (v as DurHolder)) {
      m[k] = (v as DurHolder).duration;
    }
    const s = v as SpringHolder;
    if (s.type === 'spring' && typeof s.stiffness === 'number' && typeof s.damping === 'number') {
      springs[k] = { stiffness: s.stiffness, damping: s.damping };
    }
  }
  const w: Record<string, number | undefined> = {};
  for (const [k, v] of Object.entries(motionWeight as Record<string, unknown>)) {
    if (v && typeof v === 'object' && 'duration' in (v as DurHolder)) {
      w[k] = (v as DurHolder).duration;
    }
  }
  baseline = {
    motion: m,
    weight: w,
    duration: { ...DURATION },
    springs,
    amplitude: {
      pageItemY: (pageItem.hidden as { y?: number })?.y ?? 12,
      fadeUpY:   (fadeUp.hidden   as { y?: number })?.y ?? 12,
      parallax:  MOTION.parallax,
    },
  };
}

/**
 * Apply a global speed multiplier. `speed > 1` = faster animations,
 * `speed < 1` = slower (more deliberate) animations. `speed = 1` resets.
 *
 * Clamped to [0.25, 3] so a misuse cannot freeze the UI.
 */
export function applyMotionSpeed(speed: number): void {
  captureBaseline();
  const s = Math.max(0.25, Math.min(3, Number.isFinite(speed) ? speed : 1));
  const inv = 1 / s; // duration multiplier (faster speed → shorter dur)

  // Mutate MOTION durations in place — framer-motion picks them up on
  // the next animation start because variants hold references to these
  // sub-objects, not copies.
  if (baseline) {
    for (const [k, base] of Object.entries(baseline.motion)) {
      if (typeof base === 'number') {
        ((MOTION as unknown as Record<string, DurHolder>)[k]).duration = base * inv;
      }
    }
    for (const [k, base] of Object.entries(baseline.weight)) {
      if (typeof base === 'number') {
        ((motionWeight as unknown as Record<string, DurHolder>)[k]).duration = base * inv;
      }
    }
    for (const [k, base] of Object.entries(baseline.duration)) {
      (DURATION as unknown as Record<string, number>)[k] = base * inv;
    }
    // Springs: natural frequency ω = √(k/m). To make a spring resolve
    // `s` times faster we scale stiffness by s² and damping by s so the
    // damping ratio ζ = c / (2√(km)) stays constant — the bounce
    // character is preserved, only the duration changes.
    for (const [k, base] of Object.entries(baseline.springs)) {
      const target = (MOTION as unknown as Record<string, SpringHolder>)[k];
      if (target && target.type === 'spring') {
        target.stiffness = base.stiffness * s * s;
        target.damping   = base.damping * s;
      }
    }
  }

  // Expose to CSS for utilities that opt-in.
  if (typeof document !== 'undefined') {
    document.documentElement.style.setProperty('--motion-scale', String(inv));
    document.documentElement.style.setProperty('--motion-speed', String(s));
  }
  // Re-apply bounce / amplitude after speed changes, because both
  // mutate the same spring + variant objects this function touches.
  applyMotionBounce(currentBounce);
  applyMotionAmplitude(currentAmplitude);
}

/* ──────────────────────────────────────────────────────────────────────
 * AMPLITUDE — how far things travel.
 *
 * Multiplies the translate offsets on pageItem / fadeUp variants and
 * the global push/pop parallax ratio. Distances are mutated in place
 * so framer-motion reads the new values the next time it constructs
 * a tween from `hidden → show`.
 *
 * amp = 1 → spec defaults. amp = 0 → no translate (pure cross-fade,
 * great on slow devices). amp = 1.5 → exaggerated cinematic depth.
 * ──────────────────────────────────────────────────────────────────── */
let currentAmplitude = 1;
export function applyMotionAmplitude(amp: number): void {
  captureBaseline();
  const a = Math.max(0, Math.min(1.5, Number.isFinite(amp) ? amp : 1));
  currentAmplitude = a;
  if (!baseline) return;
  (pageItem.hidden as { y?: number }).y = baseline.amplitude.pageItemY * a;
  (fadeUp.hidden   as { y?: number }).y = baseline.amplitude.fadeUpY   * a;
  // MOTION is `as const` at the type level but mutable at runtime; the
  // parallax field drives push/pop depth across the whole nav system.
  (MOTION as unknown as { parallax: number }).parallax = baseline.amplitude.parallax * a;
  if (typeof document !== 'undefined') {
    document.documentElement.style.setProperty('--motion-amp', String(a));
  }
}

/* ──────────────────────────────────────────────────────────────────────
 * BOUNCE — spring damping ratio.
 *
 * `bounce = 0` keeps the spec's damping (critically-damped feel, no
 * overshoot). `bounce = 1` lowers damping aggressively, producing a
 * pronounced overshoot/oscillation. Damping ratio ζ = c / (2√(km));
 * we lerp ζ from its baseline down toward 0.25 as bounce grows.
 * ──────────────────────────────────────────────────────────────────── */
let currentBounce = 0;
export function applyMotionBounce(bounce: number): void {
  captureBaseline();
  const b = Math.max(0, Math.min(1, Number.isFinite(bounce) ? bounce : 0));
  currentBounce = b;
  if (!baseline) return;
  for (const [k, base] of Object.entries(baseline.springs)) {
    const target = (MOTION as unknown as Record<string, SpringHolder>)[k];
    if (!target || target.type !== 'spring') continue;
    // Current live stiffness already reflects the speed multiplier; we
    // recompute damping against THAT stiffness so the bounce ratio is
    // honored regardless of how fast the spring is running.
    const liveK = typeof target.stiffness === 'number' ? target.stiffness : base.stiffness;
    const m     = typeof target.mass === 'number' ? target.mass : 1;
    const critical = 2 * Math.sqrt(liveK * m);
    // Baseline damping ratio (relative to its own critical at baseline k).
    const baseRatio = base.damping / (2 * Math.sqrt(base.stiffness * m));
    const targetRatio = baseRatio * (1 - b) + 0.25 * b;
    target.damping = critical * targetRatio;
  }
  if (typeof document !== 'undefined') {
    document.documentElement.style.setProperty('--motion-bounce', String(b));
  }
}

/* ──────────────────────────────────────────────────────────────────────
 * FPS cap — global rAF throttle.
 * ────────────────────────────────────────────────────────────────────── */
type RafFn = (cb: FrameRequestCallback) => number;
type CafFn = (handle: number) => void;

interface RafGlobal {
  __origRaf?: RafFn;
  __origCaf?: CafFn;
  __fpsCapHz?: number | null;
}

let installed = false;

/**
 * Install/uninstall a hard cap on rAF cadence. `hz = null` removes the
 * cap and restores the browser-native scheduler.
 *
 * The cap is enforced by deferring callbacks whose timestamp is less
 * than `1000/hz` ms after the previous delivered frame. Pending
 * callbacks are still scheduled via the real rAF — we never burn CPU.
 */
export function installFpsCap(hz: number | null): void {
  if (typeof window === 'undefined') return;
  const g = window as unknown as Window & RafGlobal;

  // First call ever — stash the originals.
  if (!installed) {
    g.__origRaf = window.requestAnimationFrame.bind(window) as RafFn;
    g.__origCaf = window.cancelAnimationFrame.bind(window) as CafFn;
    installed = true;
  }

  const origRaf = g.__origRaf as RafFn;
  const origCaf = g.__origCaf as CafFn;

  // Null / non-positive → uncapped (native scheduler).
  if (!hz || hz <= 0) {
    g.__fpsCapHz = null;
    window.requestAnimationFrame = origRaf;
    window.cancelAnimationFrame = origCaf;
    return;
  }

  g.__fpsCapHz = hz;
  const minDelta = 1000 / hz;
  let lastTs = 0;

  // Map our returned handle → underlying rAF handle so cancel works.
  const handleMap = new Map<number, number>();
  let nextHandle = 1;

  const wrappedRaf: RafFn = (cb) => {
    const handle = nextHandle++;
    const tick: FrameRequestCallback = (ts) => {
      const cap = g.__fpsCapHz;
      // Cap was lifted mid-flight — deliver immediately.
      if (!cap) {
        handleMap.delete(handle);
        cb(ts);
        return;
      }
      if (ts - lastTs >= minDelta - 0.5) {
        lastTs = ts;
        handleMap.delete(handle);
        cb(ts);
      } else {
        // Re-queue on the next vsync until we've waited long enough.
        const next = origRaf(tick);
        handleMap.set(handle, next);
      }
    };
    const underlying = origRaf(tick);
    handleMap.set(handle, underlying);
    return handle;
  };

  const wrappedCaf: CafFn = (handle) => {
    const underlying = handleMap.get(handle);
    if (underlying !== undefined) {
      handleMap.delete(handle);
      origCaf(underlying);
    } else {
      // Could be a handle from the native rAF (if cap was off when issued).
      origCaf(handle);
    }
  };

  window.requestAnimationFrame = wrappedRaf;
  window.cancelAnimationFrame = wrappedCaf;
}

/**
 * Best-effort detection of the display's native refresh rate.
 * Measures over ~250ms and returns the rounded Hz. Resolves to 60 on
 * environments where rAF is throttled (background tabs, jsdom).
 */
export function measureDisplayHz(timeoutMs = 250): Promise<number> {
  return new Promise((resolve) => {
    if (typeof window === 'undefined') return resolve(60);
    const g = window as unknown as Window & RafGlobal;
    const raf = (g.__origRaf ?? window.requestAnimationFrame.bind(window)) as RafFn;
    let frames = 0;
    let start = 0;
    const tick = (ts: number) => {
      if (!start) start = ts;
      frames++;
      if (ts - start >= timeoutMs) {
        const hz = Math.round((frames * 1000) / (ts - start));
        resolve(hz);
      } else {
        raf(tick);
      }
    };
    raf(tick);
  });
}
