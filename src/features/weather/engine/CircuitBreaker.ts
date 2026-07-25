// Per-source circuit breaker with persistent state.
//
// States: CLOSED → OPEN (after N failures) → HALF_OPEN (after cooldown) → CLOSED.
// Cooldown grows on each consecutive OPEN: 30s → 2m → 10m → 30m (capped).

import type { BreakerSnapshot, CircuitState, SourceId } from '../types/SourceRegistry';

const PERSIST_KEY = 'weather:breakers';
const FAILURE_THRESHOLD = 3;
const COOLDOWN_LADDER_MS = [30_000, 120_000, 600_000, 1_800_000];

interface InternalState {
  state: CircuitState;
  consecutiveFailures: number;
  openCycles: number;
  lastFailureUnix: number | null;
  lastSuccessUnix: number | null;
  cooldownUntilUnix: number | null;
  recentResponseMs: number[];   // ring buffer (last 20)
  failuresLast24h: number[];    // timestamps
  successesLast24h: number[];
}

function emptyState(): InternalState {
  return {
    state: 'closed',
    consecutiveFailures: 0,
    openCycles: 0,
    lastFailureUnix: null,
    lastSuccessUnix: null,
    cooldownUntilUnix: null,
    recentResponseMs: [],
    failuresLast24h: [],
    successesLast24h: [],
  };
}

function pruneWindow(arr: number[]): number[] {
  const cutoff = Date.now() - 24 * 3_600_000;
  return arr.filter(t => t > cutoff);
}

export class CircuitBreaker {
  private states: Record<string, InternalState> = {};

  constructor() {
    this.hydrate();
  }

  private hydrate() {
    try {
      const raw = localStorage.getItem(PERSIST_KEY);
      if (raw) this.states = JSON.parse(raw);
    } catch { /* noop */ }
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
    if (s.state === 'closed') return true;
    if (s.state === 'half_open') return true;
    // open
    if (s.cooldownUntilUnix && Date.now() >= s.cooldownUntilUnix) {
      s.state = 'half_open';
      this.persist();
      return true;
    }
    return false;
  }

  recordSuccess(id: SourceId, durationMs: number): void {
    const s = this.ensure(id);
    s.consecutiveFailures = 0;
    s.openCycles = 0;
    s.lastSuccessUnix = Date.now();
    s.state = 'closed';
    s.cooldownUntilUnix = null;
    s.recentResponseMs.push(durationMs);
    if (s.recentResponseMs.length > 20) s.recentResponseMs.shift();
    s.successesLast24h = pruneWindow([...s.successesLast24h, Date.now()]);
    s.failuresLast24h = pruneWindow(s.failuresLast24h);
    this.persist();
  }

  recordFailure(id: SourceId, durationMs: number): void {
    const s = this.ensure(id);
    s.consecutiveFailures += 1;
    s.lastFailureUnix = Date.now();
    s.recentResponseMs.push(durationMs);
    if (s.recentResponseMs.length > 20) s.recentResponseMs.shift();
    s.failuresLast24h = pruneWindow([...s.failuresLast24h, Date.now()]);
    s.successesLast24h = pruneWindow(s.successesLast24h);
    if (s.consecutiveFailures >= FAILURE_THRESHOLD) {
      const idx = Math.min(s.openCycles, COOLDOWN_LADDER_MS.length - 1);
      s.state = 'open';
      s.cooldownUntilUnix = Date.now() + COOLDOWN_LADDER_MS[idx];
      s.openCycles += 1;
    }
    this.persist();
  }

  snapshot(id: SourceId): BreakerSnapshot {
    const s = this.ensure(id);
    const totalAttempts = s.failuresLast24h.length + s.successesLast24h.length;
    const errorRate = totalAttempts === 0 ? 0
      : Math.round((s.failuresLast24h.length / totalAttempts) * 1000) / 10;
    const avg = s.recentResponseMs.length === 0 ? 0
      : Math.round(s.recentResponseMs.reduce((a, b) => a + b) / s.recentResponseMs.length);
    return {
      state: s.state,
      consecutiveFailures: s.consecutiveFailures,
      lastFailureUnix: s.lastFailureUnix,
      lastSuccessUnix: s.lastSuccessUnix,
      cooldownUntilUnix: s.cooldownUntilUnix,
      errorRate24h: errorRate,
      avgResponseMs: avg,
    };
  }

  resetAll() {
    this.states = {};
    this.persist();
  }
}

export const breaker = new CircuitBreaker();
