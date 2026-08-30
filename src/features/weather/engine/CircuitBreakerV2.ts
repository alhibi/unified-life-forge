// ============================================================================
// CircuitBreakerV2 — replacement for the original CircuitBreaker, designed to
// be less trigger-happy and to coordinate with the retry layer.
//
// DIFFERENCES FROM V1
//   • Trip threshold counts failures in a TIME WINDOW, not just consecutive
//     failures. Three failures spread across an hour are nothing — three
//     failures in 90 seconds are an outage.
//   • Half-open requires MULTIPLE successes before fully closing. One lucky
//     retry should not restore full faith in a flaky source.
//   • Failures get classified by FailureClass: a 401 doesn't even count
//     toward the threshold (auth bugs are not reliability bugs).
//   • State is persisted to localStorage, but the keys are namespaced so the
//     v1 breaker and v2 can coexist during a migration.
//
// WHY COEXISTENCE
//   Some callers may still reference the old `breaker` singleton during the
//   migration. The new strategy uses this breaker; the old one is left
//   alone until a follow-up commit retires it.
// ============================================================================

import type { SourceId } from '../types/SourceRegistry';
import { classifyFailure, type FailureClass } from './RetryPolicy';

const PERSIST_KEY = 'weather:breakers:v2';
const FAILURE_WINDOW_MS = 5 * 60_000;      // 5 minutes
const FAILURE_THRESHOLD = 5;               // 5 failures inside the window trips
const HALF_OPEN_SUCCESS_NEEDED = 2;        // 2 clean calls re-close the breaker
const COOLDOWN_LADDER_MS = [60_000, 5 * 60_000, 30 * 60_000];

type CircuitState = 'closed' | 'open' | 'half_open';

interface FailureRecord {
  ts: number;
  status: number | null;
  message: string;
  class: FailureClass;
}

interface InternalState {
  state: CircuitState;
  failures: FailureRecord[];
  recentSuccesses: number;                 // successes since entering half_open
  cooldownUntilUnix: number | null;
  openCycles: number;
  lastSuccessUnix: number | null;
  recentResponseMs: number[];
  successesLast24h: number[];
  failuresLast24h: number[];
}

function emptyState(): InternalState {
  return {
    state: 'closed',
    failures: [],
    recentSuccesses: 0,
    cooldownUntilUnix: null,
    openCycles: 0,
    lastSuccessUnix: null,
    recentResponseMs: [],
    successesLast24h: [],
    failuresLast24h: [],
  };
}

function pruneFailures(arr: FailureRecord[]): FailureRecord[] {
  const cutoff = Date.now() - FAILURE_WINDOW_MS;
  return arr.filter((f) => f.ts > cutoff);
}

function pruneWindow(arr: number[]): number[] {
  const cutoff = Date.now() - 24 * 3_600_000;
  return arr.filter((t) => t > cutoff);
}

export class CircuitBreakerV2 {
  private states: Record<string, InternalState> = {};

  constructor() {
    this.hydrate();
  }

  private hydrate() {
    try {
      const raw = localStorage.getItem(PERSIST_KEY);
      if (raw) this.states = JSON.parse(raw);
    } catch {
      /* noop */
    }
  }

  private persist() {
    try { localStorage.setItem(PERSIST_KEY, JSON.stringify(this.states)); } catch { /* noop */ }
  }

  private ensure(id: SourceId): InternalState {
    if (!this.states[id]) this.states[id] = emptyState();
    return this.states[id];
  }

  /** Returns true if the source is allowed to be called right now. */
  allow(id: SourceId): boolean {
    const s = this.ensure(id);
    if (s.state === 'closed' || s.state === 'half_open') return true;
    // open
    if (s.cooldownUntilUnix && Date.now() >= s.cooldownUntilUnix) {
      s.state = 'half_open';
      s.recentSuccesses = 0;
      this.persist();
      return true;
    }
    return false;
  }

  /** Report a successful call. Only meaningful when in half_open or closed. */
  recordSuccess(id: SourceId, durationMs: number): void {
    const s = this.ensure(id);
    s.lastSuccessUnix = Date.now();
    s.recentResponseMs.push(durationMs);
    if (s.recentResponseMs.length > 20) s.recentResponseMs.shift();
    s.successesLast24h = pruneWindow([...s.successesLast24h, Date.now()]);
    s.failuresLast24h = pruneWindow(s.failuresLast24h);

    if (s.state === 'half_open') {
      s.recentSuccesses += 1;
      if (s.recentSuccesses >= HALF_OPEN_SUCCESS_NEEDED) {
        s.state = 'closed';
        s.cooldownUntilUnix = null;
        s.openCycles = 0;
        s.failures = [];
      }
    } else if (s.state === 'closed') {
      // A clean call gently clears old failures — without this, three
      // failures from 6 minutes ago could still be counted if the window
      // rolled forward.
      s.failures = pruneFailures(s.failures);
    }
    this.persist();
  }

  /**
   * Report a failure. Terminal errors (auth, 4xx) don't count toward the
   * window — they're bugs, not reliability problems.
   */
  recordFailure(id: SourceId, status: number | undefined, message: string, durationMs: number): void {
    const s = this.ensure(id);
    const cls = classifyFailure({ status, message });
    if (cls === 'terminal') {
      // Terminal failures don't earn the breaker any cooldown — they just
      // get logged for diagnostics.
      s.recentResponseMs.push(durationMs);
      if (s.recentResponseMs.length > 20) s.recentResponseMs.shift();
      s.failuresLast24h = pruneWindow([...s.failuresLast24h, Date.now()]);
      this.persist();
      return;
    }

    s.failures.push({ ts: Date.now(), status: status ?? null, message, class: cls });
    s.failures = pruneFailures(s.failures);
    s.recentResponseMs.push(durationMs);
    if (s.recentResponseMs.length > 20) s.recentResponseMs.shift();
    s.failuresLast24h = pruneWindow([...s.failuresLast24h, Date.now()]);
    s.successesLast24h = pruneWindow(s.successesLast24h);

    if (s.state === 'half_open') {
      // Any retryable failure reopens the breaker immediately.
      this.trip(s);
      return;
    }
    if (s.state === 'closed' && s.failures.length >= FAILURE_THRESHOLD) {
      this.trip(s);
    }
    this.persist();
  }

  private trip(s: InternalState): void {
    const idx = Math.min(s.openCycles, COOLDOWN_LADDER_MS.length - 1);
    s.state = 'open';
    s.cooldownUntilUnix = Date.now() + COOLDOWN_LADDER_MS[idx];
    s.openCycles += 1;
    s.recentSuccesses = 0;
    this.persist();
  }

  /** Read-only diagnostics. */
  snapshot(id: SourceId): {
    state: CircuitState;
    failuresInWindow: number;
    errorRate24h: number;
    avgResponseMs: number;
    cooldownRemainingMs: number;
  } {
    const s = this.ensure(id);
    const totalAttempts = s.failuresLast24h.length + s.successesLast24h.length;
    const errorRate = totalAttempts === 0
      ? 0
      : Math.round((s.failuresLast24h.length / totalAttempts) * 1000) / 10;
    const avg = s.recentResponseMs.length === 0
      ? 0
      : Math.round(s.recentResponseMs.reduce((a, b) => a + b, 0) / s.recentResponseMs.length);
    const cooldownRemaining = s.cooldownUntilUnix ? Math.max(0, s.cooldownUntilUnix - Date.now()) : 0;
    return {
      state: s.state,
      failuresInWindow: s.failures.length,
      errorRate24h: errorRate,
      avgResponseMs: avg,
      cooldownRemainingMs: cooldownRemaining,
    };
  }

  resetAll(): void {
    this.states = {};
    this.persist();
  }
}

export const breakerV2 = new CircuitBreakerV2();