/**
 * Runtime motion controller — the bridge between "الحركة والأداء" and every
 * animation the app can produce.
 *
 * Design
 * ──────
 * There is exactly ONE recompute path. Each setter stores its value and calls
 * `recompute()`, which rebuilds every live token from the captured baselines in
 * a fixed order. The previous implementation had setters re-invoking each other
 * (speed re-applied bounce, which re-applied amplitude…), which meant the result
 * depended on the order the user happened to touch the sliders in. Now the
 * result is a pure function of the current state, so any sequence of changes
 * converges on the same values.
 *
 * What actually reaches the screen
 * ───────────────────────────────
 *  1. framer-motion — `MOTION`, `motionWeight`, `DURATION`, `pageStagger`,
 *     `fadeUp`, `pageItem` and `ACTIVE_EASE` are mutated IN PLACE. framer reads
 *     `.duration` / `.ease` from the same object reference every time a
 *     transition starts, so mutation takes effect on the next animation without
 *     re-rendering a single component.
 *  2. CSS — every multiplier and curve is mirrored onto `<html>` as a
 *     `--motion-*` custom property. `src/index.css` expresses ALL of its
 *     durations as `calc(<base> * var(--motion-scale))` and all of its easings
 *     as `var(--motion-ease-*)`, so Radix/tailwindcss-animate, vaul, sonner and
 *     the native press feedback obey the same settings as framer-motion.
 *  3. Data attributes — `data-nav-style`, `data-overlay-style`,
 *     `data-scroll-profile`, `data-reduced-motion`, `data-compositor-hints`
 *     let CSS switch whole behaviours without recompiling anything.
 *  4. requestAnimationFrame — the frame cap wraps the single function every
 *     rAF-driven animation in the app flows through.
 */

import {
  ACTIVE_EASE,
  ACTIVE_EASE_STATE,
  BASE_STAGGER_CHILDREN,
  DURATION,
  type EaseTuple,
  EASING_FAMILIES,
  type EasingProfileId,
  fadeUp,
  MOTION,
  motionWeight,
  type NavStyleId,
  pageItem,
  pageStagger,
} from './motion';
import type { OverlayStyle, ScrollProfile } from './motionPreferences';

/* ──────────────────────────────────────────────────────────────────────
 * Baselines — captured once on first use so repeated applies never
 * compound (apply 0.5x then 1.0x restores the originals, not 2.0x).
 * ────────────────────────────────────────────────────────────────────── */

type DurHolder = { duration?: number; delay?: number; ease?: unknown } & Record<string, unknown>;
type SpringHolder = {
  type?: string;
  stiffness?: number;
  damping?: number;
  mass?: number;
} & Record<string, unknown>;

interface Baseline {
  motionDuration: Record<string, number>;
  motionDelay: Record<string, number>;
  weight: Record<string, number>;
  duration: Record<string, number>;
  springs: Record<string, { stiffness: number; damping: number }>;
  amplitude: { pageItemY: number; fadeUpY: number; parallax: number };
}

let baseline: Baseline | null = null;

/**
 * Transitions that describe a SCREEN transition. The nav-duration preference
 * scales only these, so a user can make navigation deliberate while keeping
 * buttons and menus snappy — or the reverse.
 */
const NAV_KEYS = new Set([
  'push',
  'pop',
  'tab',
  'tabExit',
  'navSilkEnter',
  'navSilkExit',
  'navFadeEnter',
  'navFadeExit',
  'navFadeTabEnter',
  'navScale',
]);

/** Which curve of the active easing family each MOTION entry speaks. */
const EASE_ROLE: Record<string, keyof typeof ACTIVE_EASE> = {
  push: 'nav',
  pop: 'nav',
  tab: 'nav',
  tabExit: 'nav',
  navScale: 'nav',
  navSilkEnter: 'enter',
  navFadeEnter: 'enter',
  navFadeTabEnter: 'enter',
  modalIn: 'enter',
  overlayIn: 'enter',
  collapseOpen: 'enter',
  toast: 'enter',
  navSilkExit: 'exit',
  navFadeExit: 'exit',
  modalOut: 'exit',
  overlayOut: 'exit',
  collapseClose: 'exit',
  fade: 'inOut',
  pressIn: 'press',
};

function motionRecord(): Record<string, DurHolder> {
  return MOTION as unknown as Record<string, DurHolder>;
}

function captureBaseline(): Baseline {
  if (baseline) return baseline;

  const motionDuration: Record<string, number> = {};
  const motionDelay: Record<string, number> = {};
  const springs: Record<string, { stiffness: number; damping: number }> = {};

  for (const [key, value] of Object.entries(MOTION as Record<string, unknown>)) {
    if (!value || typeof value !== 'object') continue;
    const holder = value as DurHolder;
    if (typeof holder.duration === 'number') motionDuration[key] = holder.duration;
    if (typeof holder.delay === 'number') motionDelay[key] = holder.delay;
    const spring = value as SpringHolder;
    if (
      spring.type === 'spring' &&
      typeof spring.stiffness === 'number' &&
      typeof spring.damping === 'number'
    ) {
      springs[key] = { stiffness: spring.stiffness, damping: spring.damping };
    }
  }

  const weight: Record<string, number> = {};
  for (const [key, value] of Object.entries(motionWeight as Record<string, unknown>)) {
    if (value && typeof value === 'object' && typeof (value as DurHolder).duration === 'number') {
      weight[key] = (value as DurHolder).duration as number;
    }
  }

  baseline = {
    motionDuration,
    motionDelay,
    weight,
    duration: { ...DURATION },
    springs,
    amplitude: {
      pageItemY: (pageItem.hidden as { y?: number })?.y ?? 12,
      fadeUpY: (fadeUp.hidden as { y?: number })?.y ?? 12,
      parallax: MOTION.parallax,
    },
  };
  return baseline;
}

/* ──────────────────────────────────────────────────────────────────────
 * Live state
 * ────────────────────────────────────────────────────────────────────── */

interface RuntimeState {
  speed: number;
  navDuration: number;
  amplitude: number;
  bounce: number;
  stagger: number;
  pressStrength: number;
  easingProfile: EasingProfileId;
  navStyle: NavStyleId;
  overlayStyle: OverlayStyle;
  scrollProfile: ScrollProfile;
  reduceMotion: boolean;
  compositorHints: boolean;
  fpsCap: number | null;
  nativeHz: number | null;
}

const state: RuntimeState = {
  speed: 1,
  navDuration: 1,
  amplitude: 1,
  bounce: 0,
  stagger: 1,
  pressStrength: 1,
  easingProfile: 'silk',
  navStyle: 'silk',
  overlayStyle: 'fade',
  scrollProfile: 'silk',
  reduceMotion: false,
  compositorHints: true,
  fpsCap: null,
  nativeHz: null,
};

/** A read-only snapshot for the settings screen's diagnostics panel. */
export function getMotionRuntimeState(): Readonly<RuntimeState> {
  return { ...state };
}

/* ──────────────────────────────────────────────────────────────────────
 * Change notification
 *
 * The runtime mutates `MOTION` from inside an effect, which means any component
 * that READS `MOTION` during render is one commit behind: React renders with the
 * old values, then the effect rewrites them, and nothing tells the component to
 * look again. The diagnostics readout on the settings screen hit exactly that —
 * it reported the previous spring's coefficients.
 *
 * Effect ordering cannot fix it (React runs child effects before parent ones, so
 * a child cannot wait for the provider's effect), so the runtime publishes a
 * revision instead. `useMotionRuntimeRevision` subscribes through
 * `useSyncExternalStore`, which is the one mechanism guaranteed to re-render
 * after an external mutation, whoever caused it.
 * ────────────────────────────────────────────────────────────────────── */

let runtimeRevision = 0;
const runtimeListeners = new Set<() => void>();

function notifyRuntimeChange(): void {
  runtimeRevision += 1;
  runtimeListeners.forEach((listener) => listener());
}

/** Subscribe to every recompute. Returns an unsubscribe. */
export function subscribeMotionRuntime(listener: () => void): () => void {
  runtimeListeners.add(listener);
  return () => {
    runtimeListeners.delete(listener);
  };
}

/** A monotonically increasing counter, bumped on every applied change. */
export function getMotionRuntimeRevision(): number {
  return runtimeRevision;
}

const clamp = (value: number, min: number, max: number, fallback: number) =>
  Number.isFinite(value) ? Math.min(max, Math.max(min, value)) : fallback;

function setVar(name: string, value: string) {
  if (typeof document === 'undefined') return;
  try {
    document.documentElement.style.setProperty(name, value);
  } catch {
    // A restricted DOM must never make a preference change fatal.
  }
}

function setAttr(name: string, value: string) {
  if (typeof document === 'undefined') return;
  try {
    document.documentElement.setAttribute(name, value);
  } catch {
    // Same rationale as setVar.
  }
}

function cssEase(tuple: EaseTuple): string {
  return `cubic-bezier(${tuple[0]}, ${tuple[1]}, ${tuple[2]}, ${tuple[3]})`;
}

/* ──────────────────────────────────────────────────────────────────────
 * The one recompute path
 * ────────────────────────────────────────────────────────────────────── */

function recompute(): void {
  const base = captureBaseline();
  const speed = state.speed;
  /** Duration multiplier: a faster speed means a shorter duration. */
  const durationScale = 1 / speed;
  const family = EASING_FAMILIES[state.easingProfile];

  // 1 ── Easing family. Copy into the live object so variant factories and
  //      anything holding a reference to ACTIVE_EASE see the new curves.
  ACTIVE_EASE.nav = family.nav;
  ACTIVE_EASE.enter = family.enter;
  ACTIVE_EASE.exit = family.exit;
  ACTIVE_EASE.inOut = family.inOut;
  ACTIVE_EASE.press = family.press;
  ACTIVE_EASE.allowsOvershoot = family.allowsOvershoot;
  ACTIVE_EASE_STATE.profile = state.easingProfile;

  const motion = motionRecord();

  // 2 ── Durations, delays and curves on every MOTION entry.
  for (const [key, value] of Object.entries(base.motionDuration)) {
    const navFactor = NAV_KEYS.has(key) ? state.navDuration : 1;
    motion[key].duration = value * durationScale * navFactor;
  }
  for (const [key, value] of Object.entries(base.motionDelay)) {
    const navFactor = NAV_KEYS.has(key) ? state.navDuration : 1;
    motion[key].delay = value * durationScale * navFactor;
  }
  for (const [key, role] of Object.entries(EASE_ROLE)) {
    const holder = motion[key];
    if (holder && typeof holder === 'object' && !('type' in holder)) {
      holder.ease = ACTIVE_EASE[role] as unknown;
    }
  }

  // 3 ── Weight scale + primitive durations.
  const weight = motionWeight as unknown as Record<string, DurHolder>;
  for (const [key, value] of Object.entries(base.weight)) {
    weight[key].duration = value * durationScale;
    weight[key].ease = ACTIVE_EASE.enter as unknown;
  }
  const durations = DURATION as unknown as Record<string, number>;
  for (const [key, value] of Object.entries(base.duration)) {
    durations[key] = value * durationScale;
  }

  // 4 ── Springs. Natural frequency ω = √(k/m): scaling stiffness by s² and
  //      damping by s makes a spring resolve `s` times faster while keeping
  //      its damping ratio ζ = c / (2√(km)) — so speed changes the duration
  //      and bounce changes the character, independently.
  //
  //      Bounce lerps ζ from its own baseline down toward 0.25 (a visible
  //      overshoot). An easing family that forbids overshoot clamps ζ at 1,
  //      which is what makes "حرير" genuinely bounce-free even if the bounce
  //      slider is not at zero.
  for (const [key, spring] of Object.entries(base.springs)) {
    const target = motion[key] as SpringHolder;
    if (!target || target.type !== 'spring') continue;
    const liveStiffness = spring.stiffness * speed * speed;
    const mass = typeof target.mass === 'number' ? target.mass : 1;
    const critical = 2 * Math.sqrt(liveStiffness * mass);
    const baseRatio = spring.damping / (2 * Math.sqrt(spring.stiffness * mass));
    let ratio = baseRatio * (1 - state.bounce) + 0.25 * state.bounce;
    if (!family.allowsOvershoot) ratio = Math.max(ratio, 1);
    target.stiffness = liveStiffness;
    target.damping = critical * ratio;
  }

  // 5 ── Amplitude: how far things travel.
  (pageItem.hidden as { y?: number }).y = base.amplitude.pageItemY * state.amplitude;
  (fadeUp.hidden as { y?: number }).y = base.amplitude.fadeUpY * state.amplitude;
  (MOTION as unknown as { parallax: number }).parallax = base.amplitude.parallax * state.amplitude;

  // 6 ── List cadence.
  const staggerTransition = (pageStagger.show as { transition?: Record<string, unknown> })
    .transition;
  if (staggerTransition) {
    staggerTransition.staggerChildren = BASE_STAGGER_CHILDREN * state.stagger * durationScale;
  }

  // 7 ── Mirror everything to CSS.
  setVar('--motion-scale', String(round(durationScale)));
  setVar('--motion-speed', String(round(speed)));
  setVar('--motion-nav-scale', String(round(state.navDuration)));
  setVar('--motion-amp', String(round(state.amplitude)));
  setVar('--motion-bounce', String(round(state.bounce)));
  setVar('--motion-stagger', String(round(state.stagger)));
  setVar('--motion-press-strength', String(round(state.pressStrength)));
  setVar('--motion-ease-nav', cssEase(family.nav));
  setVar('--motion-ease-enter', cssEase(family.enter));
  setVar('--motion-ease-exit', cssEase(family.exit));
  setVar('--motion-ease-in-out', cssEase(family.inOut));
  setVar('--motion-ease-press', cssEase(family.press));

  // 8 ── Tell anything rendering the live values that they have moved.
  notifyRuntimeChange();
}

function round(value: number, precision = 4): number {
  const factor = 10 ** precision;
  return Math.round(value * factor) / factor;
}

/* ──────────────────────────────────────────────────────────────────────
 * Public setters
 * ────────────────────────────────────────────────────────────────────── */

/**
 * Global speed multiplier. `speed > 1` = faster animations, `speed < 1` = more
 * deliberate ones, `1` = the shipped timings. Clamped to [0.25, 3] so a misuse
 * can never freeze the UI.
 */
export function applyMotionSpeed(speed: number): void {
  state.speed = clamp(speed, 0.25, 3, 1);
  recompute();
}

/**
 * Multiplier applied to SCREEN transitions only. Lets navigation be slower or
 * faster than the rest of the interface.
 */
export function applyNavDuration(multiplier: number): void {
  state.navDuration = clamp(multiplier, 0.4, 2, 1);
  recompute();
}

/**
 * How far things travel. `0` = pure cross-fade (excellent on slow devices),
 * `1` = the shipped distances, `1.5` = exaggerated cinematic depth.
 */
export function applyMotionAmplitude(amplitude: number): void {
  state.amplitude = clamp(amplitude, 0, 1.5, 1);
  recompute();
}

/**
 * Spring overshoot. `0` = settles dry with no rebound, `1` = a pronounced
 * bounce (ζ ≈ 0.25). Ignored while the easing profile forbids overshoot.
 */
export function applyMotionBounce(bounce: number): void {
  state.bounce = clamp(bounce, 0, 1, 0);
  recompute();
}

/** Cadence of page/list entrance staggering. `0` = every child at once. */
export function applyListStagger(multiplier: number): void {
  state.stagger = clamp(multiplier, 0, 2.5, 1);
  recompute();
}

/**
 * How much of the press response actually moves. Composed with the interface
 * platform's press character: the interface decides the shape of the press,
 * this decides how much of it is expressed. `0` removes press movement while
 * keeping the colour change, which some users need.
 */
export function applyPressFeedback(strength: number): void {
  state.pressStrength = clamp(strength, 0, 1.6, 1);
  recompute();
}

/** Install a complete easing family. */
export function applyEasingProfile(profile: EasingProfileId): void {
  state.easingProfile = EASING_FAMILIES[profile] ? profile : 'silk';
  recompute();
}

/**
 * Record the navigation character. The variants themselves are built by
 * `buildNavVariants`; this publishes the choice so CSS can react too (the
 * `slide` style, for example, needs the route container to clip differently).
 */
export function applyNavStyle(style: NavStyleId): void {
  state.navStyle = style;
  setAttr('data-nav-style', style);
  notifyRuntimeChange();
}

/**
 * Record how transient surfaces appear. `index.css` reads
 * `html[data-overlay-style]` and neutralises the scale/translate legs of the
 * tailwindcss-animate keyframes accordingly, which is what removes the
 * "pop" from menus and dialogs without touching a single call site.
 */
export function applyOverlayStyle(style: OverlayStyle): void {
  state.overlayStyle = style;
  setAttr('data-overlay-style', style);
  notifyRuntimeChange();
}

/** Record the scroll character. Behaviour lives in `scrollRuntime.ts`. */
export function applyScrollProfileAttribute(profile: ScrollProfile): void {
  state.scrollProfile = profile;
  setAttr('data-scroll-profile', profile);
  notifyRuntimeChange();
}

/**
 * In-app reduced motion. ORed with the OS preference — a user who asked the
 * system for less motion can never be given more of it by an app setting.
 */
export function applyReduceMotion(enabled: boolean): void {
  state.reduceMotion = enabled;
  const osPrefers =
    typeof window !== 'undefined' && typeof window.matchMedia === 'function'
      ? window.matchMedia('(prefers-reduced-motion: reduce)').matches
      : false;
  setAttr('data-reduced-motion', String(enabled || osPrefers));
  setAttr(
    'data-reduced-motion-source',
    enabled ? (osPrefers ? 'both' : 'app') : osPrefers ? 'os' : 'none',
  );
  notifyRuntimeChange();
}

/** Whether the app is currently running reduced motion, for any reason. */
export function isReducedMotionActive(): boolean {
  if (state.reduceMotion) return true;
  if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') return false;
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

/**
 * GPU layer promotion for animated surfaces.
 *
 * Promotion is not free: every promoted layer costs video memory and forces the
 * compositor to keep a texture alive. On low-memory devices, turning it OFF can
 * genuinely be smoother, which is why it is a user-visible switch rather than a
 * hardcoded optimisation.
 */
export function applyCompositorHints(enabled: boolean): void {
  state.compositorHints = enabled;
  setAttr('data-compositor-hints', String(enabled));
  notifyRuntimeChange();
}

/* ──────────────────────────────────────────────────────────────────────
 * Frame-rate cap — global rAF throttle
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
 * Install or remove a hard cap on the rAF cadence. `hz = null` restores the
 * browser-native scheduler.
 *
 * The cap is enforced by deferring callbacks whose timestamp is less than
 * `1000/hz` ms after the previous delivered frame. Pending callbacks are still
 * scheduled through the real rAF, so we never burn CPU in a spin loop.
 *
 * A cap at or above the measured native refresh rate is installed as a no-op
 * (the native scheduler is restored) — wrapping rAF to enforce a limit the
 * hardware already enforces would only add per-frame overhead.
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

  const effective =
    !hz || hz <= 0 || (state.nativeHz !== null && hz >= state.nativeHz - 2) ? null : hz;

  state.fpsCap = hz && hz > 0 ? hz : null;
  setVar('--motion-fps-cap', state.fpsCap === null ? '0' : String(state.fpsCap));

  if (effective === null) {
    g.__fpsCapHz = null;
    window.requestAnimationFrame = origRaf;
    window.cancelAnimationFrame = origCaf;
    return;
  }

  g.__fpsCapHz = effective;
  const minDelta = 1000 / effective;
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
      // Could be a handle from the native rAF (if the cap was off when issued).
      origCaf(handle);
    }
  };

  window.requestAnimationFrame = wrappedRaf;
  window.cancelAnimationFrame = wrappedCaf;
}

/** The un-wrapped scheduler, for measurement that must not be throttled. */
export function nativeRaf(): RafFn {
  if (typeof window === 'undefined')
    return (cb) => setTimeout(() => cb(0), 16) as unknown as number;
  const g = window as unknown as Window & RafGlobal;
  return (g.__origRaf ?? window.requestAnimationFrame.bind(window)) as RafFn;
}

let measuredHz: number | null = null;
let measurement: Promise<number> | null = null;

/**
 * Best-effort detection of the display's native refresh rate. Measured against
 * the UN-capped scheduler so the answer describes the hardware rather than the
 * user's own cap. Cached: the panel does not change mid-session.
 */
export function measureDisplayHz(timeoutMs = 300): Promise<number> {
  if (measuredHz !== null) return Promise.resolve(measuredHz);
  if (measurement) return measurement;

  measurement = new Promise<number>((resolve) => {
    if (typeof window === 'undefined') return resolve(60);
    const raf = nativeRaf();
    let frames = 0;
    let start = 0;
    const tick = (ts: number) => {
      if (!start) start = ts;
      frames++;
      if (ts - start >= timeoutMs) {
        // Snap to the common panel rates so a 119.4 measurement reads as 120.
        const raw = (frames * 1000) / (ts - start);
        const snapped = [60, 75, 90, 100, 120, 144, 165, 240].find(
          (candidate) => Math.abs(raw - candidate) <= 6,
        );
        resolve(snapped ?? Math.round(raw));
      } else {
        raf(tick);
      }
    };
    raf(tick);
  }).then((hz) => {
    measuredHz = hz;
    state.nativeHz = hz;
    setVar('--motion-hz', String(hz));
    // Re-evaluate the cap now that we know the panel: a 120 Hz cap on a 60 Hz
    // screen should stop paying the wrapper cost.
    if (state.fpsCap !== null) installFpsCap(state.fpsCap);
    return hz;
  });

  return measurement;
}

/** The measured native rate, or null before the first measurement resolves. */
export function getNativeHz(): number | null {
  return measuredHz;
}
