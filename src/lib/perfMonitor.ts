/**
 * Frame-health monitor and adaptive performance governor.
 *
 * ONE rAF loop, many readers. The settings screen's live HUD and the governor
 * that degrades motion under load both subscribe to the same measurement, so
 * opening the diagnostics panel does not itself add a second animation frame
 * loop and skew the numbers it is reporting.
 *
 * The loop is deliberately scheduled through `window.requestAnimationFrame`,
 * i.e. the WRAPPED one that the frame cap installs. That is the whole point:
 * the numbers must describe the cadence the user actually gets, including their
 * own cap, not the cadence the hardware could theoretically deliver.
 *
 * The loop only runs while something is listening. With the settings screen
 * closed and the governor off, the cost is exactly zero.
 */

export interface FrameStats {
  /** Frames delivered in the last one-second window. */
  fps: number;
  /** Exponential moving average of the inter-frame delta, in ms. */
  frameAvg: number;
  /** 95th percentile frame time over a rolling 120-frame window, in ms. */
  frameP95: number;
  /** Frames missed against the budget in the last second. */
  drops: number;
  /** Lifetime count of frames longer than 1.5× the budget. */
  jank: number;
  /** PerformanceObserver long-task count (>50ms of blocked main thread). */
  longTasks: number;
  /** Chromium-only JS heap reading, in MB. */
  heapMB: number | null;
  /** The per-frame budget in ms that `drops` and `jank` are measured against. */
  budget: number;
  /** The Hz the budget was derived from. */
  budgetHz: number;
  /** Health verdict, 0 (unusable) → 1 (perfect). */
  health: number;
}

export type PerfMode = 'normal' | 'saver';

const EMPTY_STATS: FrameStats = {
  fps: 0,
  frameAvg: 0,
  frameP95: 0,
  drops: 0,
  jank: 0,
  longTasks: 0,
  heapMB: null,
  budget: 1000 / 60,
  budgetHz: 60,
  health: 1,
};

type Listener = (stats: FrameStats) => void;

const listeners = new Set<Listener>();
const modeListeners = new Set<(mode: PerfMode) => void>();

let latest: FrameStats = { ...EMPTY_STATS };
let budgetHz = 60;
let rafHandle = 0;
let running = false;
let observer: PerformanceObserver | null = null;

/* ── Rolling measurement state ─────────────────────────────────────── */
let lastTs = 0;
let emaFrame = 0;
let framesInWindow = 0;
let windowStart = 0;
let jankLifetime = 0;
let longTaskCount = 0;
let samples: number[] = [];

/* ── Governor state ────────────────────────────────────────────────── */
let governorEnabled = false;
let mode: PerfMode = 'normal';
let unhealthySeconds = 0;
let healthySeconds = 0;

/** Consecutive bad seconds before we degrade. */
const DEGRADE_AFTER = 3;
/** Consecutive good seconds before we restore. */
const RESTORE_AFTER = 6;

function computeHealth(fps: number, p95: number, budget: number): number {
  if (fps === 0) return 1;
  const rate = Math.min(1, fps / budgetHz);
  const smoothness = Math.min(1, budget / Math.max(budget, p95));
  return Math.round(rate * 0.6 * 100 + smoothness * 0.4 * 100) / 100;
}

function setMode(next: PerfMode) {
  if (mode === next) return;
  mode = next;
  if (typeof document !== 'undefined') {
    try {
      document.documentElement.setAttribute('data-perf-mode', next);
    } catch {
      // A restricted DOM must not break measurement.
    }
  }
  modeListeners.forEach((listener) => listener(next));
}

function evaluateGovernor(stats: FrameStats) {
  if (!governorEnabled) {
    unhealthySeconds = 0;
    healthySeconds = 0;
    return;
  }
  // "Unhealthy" means the app is visibly missing its own target: either it is
  // delivering well under the budgeted rate, or the worst frames are taking
  // nearly twice as long as they should.
  const unhealthy =
    stats.fps > 0 && (stats.fps < budgetHz * 0.72 || stats.frameP95 > stats.budget * 1.8);

  if (unhealthy) {
    healthySeconds = 0;
    unhealthySeconds += 1;
    if (unhealthySeconds >= DEGRADE_AFTER) setMode('saver');
  } else {
    unhealthySeconds = 0;
    healthySeconds += 1;
    if (healthySeconds >= RESTORE_AFTER) setMode('normal');
  }
}

function resetWindow(ts: number) {
  windowStart = ts;
  framesInWindow = 0;
}

function tick(ts: number) {
  if (!running) return;

  const delta = lastTs === 0 ? 1000 / budgetHz : ts - lastTs;
  lastTs = ts;
  if (windowStart === 0) windowStart = ts;

  framesInWindow += 1;
  emaFrame = emaFrame === 0 ? delta : emaFrame * 0.9 + delta * 0.1;
  samples.push(delta);
  if (samples.length > 120) samples.shift();

  const budget = 1000 / budgetHz;
  if (delta > budget * 1.5) jankLifetime += 1;

  const elapsed = ts - windowStart;
  if (elapsed >= 1000) {
    const fps = Math.round((framesInWindow * 1000) / elapsed);
    const expected = Math.round(elapsed / budget);
    const sorted = [...samples].sort((a, b) => a - b);
    const p95 = sorted[Math.floor(sorted.length * 0.95)] ?? emaFrame;
    const memory = (performance as unknown as { memory?: { usedJSHeapSize: number } }).memory;

    latest = {
      fps,
      frameAvg: emaFrame,
      frameP95: p95,
      drops: Math.max(0, expected - framesInWindow),
      jank: jankLifetime,
      longTasks: longTaskCount,
      heapMB: memory ? memory.usedJSHeapSize / 1024 / 1024 : null,
      budget,
      budgetHz,
      health: computeHealth(fps, p95, budget),
    };

    resetWindow(ts);
    evaluateGovernor(latest);
    listeners.forEach((listener) => listener(latest));
  }

  rafHandle = requestAnimationFrame(tick);
}

function start() {
  if (running || typeof window === 'undefined') return;
  running = true;
  lastTs = 0;
  windowStart = 0;
  emaFrame = 0;
  framesInWindow = 0;
  samples = [];

  try {
    observer = new PerformanceObserver((list) => {
      longTaskCount += list.getEntries().length;
    });
    observer.observe({ entryTypes: ['longtask'] });
  } catch {
    // `longtask` is unsupported in Safari. The rest of the stats still work.
    observer = null;
  }

  rafHandle = requestAnimationFrame(tick);
}

function stop() {
  if (!running) return;
  running = false;
  if (rafHandle) cancelAnimationFrame(rafHandle);
  rafHandle = 0;
  observer?.disconnect();
  observer = null;
}

function syncRunning() {
  if (listeners.size > 0 || governorEnabled) start();
  else stop();
}

/** The per-frame budget every measurement is compared against. */
export function setFrameBudgetHz(hz: number): void {
  const next = Number.isFinite(hz) && hz > 0 ? Math.round(hz) : 60;
  if (next === budgetHz) return;
  budgetHz = next;
  samples = [];
  lastTs = 0;
  windowStart = 0;
}

export function getFrameBudgetHz(): number {
  return budgetHz;
}

/** Subscribe to once-per-second frame statistics. Returns an unsubscribe. */
export function subscribeFrameStats(listener: Listener): () => void {
  listeners.add(listener);
  syncRunning();
  // Hand the newest known value over immediately so a freshly-mounted HUD is
  // never blank for a whole second.
  if (latest.fps > 0) listener(latest);
  return () => {
    listeners.delete(listener);
    syncRunning();
  };
}

export function getFrameStats(): FrameStats {
  return latest;
}

/**
 * Enable or disable the adaptive governor.
 *
 * When enabled and the app sustains missed frames, `<html data-perf-mode>`
 * flips to `saver`; `src/index.css` reads that attribute and cuts travel
 * distances, suppresses decorative animation and drops layer promotion. It
 * restores itself once frames are healthy again, so a heavy screen does not
 * permanently downgrade the whole app.
 */
export function installPerfGovernor(enabled: boolean): void {
  governorEnabled = enabled;
  unhealthySeconds = 0;
  healthySeconds = 0;
  if (!enabled) setMode('normal');
  syncRunning();
}

export function getPerfMode(): PerfMode {
  return mode;
}

/** Subscribe to governor transitions (for the settings screen's badge). */
export function subscribePerfMode(listener: (mode: PerfMode) => void): () => void {
  modeListeners.add(listener);
  listener(mode);
  return () => {
    modeListeners.delete(listener);
  };
}

/** Reset the lifetime counters (jank, long tasks). */
export function resetPerfCounters(): void {
  jankLifetime = 0;
  longTaskCount = 0;
  samples = [];
  latest = { ...latest, jank: 0, longTasks: 0 };
}
