/**
 * Circuit breaker — one implementation, used for every external endpoint.
 *
 * The app talks to five networks it does not control: Supabase (Data API,
 * RPC, Edge Functions), the AI gateway, Open-Meteo, the Aladhan prayer-time
 * API and the reverse-geocoder. Before this file, each of them was retried
 * independently, which meant that when one went down the app produced a
 * retry storm: every mounted component re-firing the same failing request
 * every few seconds, burning battery and quota and delaying recovery for
 * everyone else hitting the same upstream.
 *
 * A breaker per endpoint key fixes the category:
 *
 *   closed    → calls pass through. Consecutive failures are counted.
 *   open      → after `threshold` consecutive failures the endpoint is
 *               considered down. Calls fail FAST (no socket opened) for
 *               `cooldownMs`, which grows exponentially per consecutive
 *               open, capped at `maxCooldownMs`.
 *   half-open → after the cooldown exactly ONE probe call is allowed
 *               through. Success closes the breaker and resets the
 *               backoff; failure re-opens it with a longer cooldown.
 *
 * `withBreaker` never invents data. When the breaker is open it either
 * resolves with the caller's `fallback()` (usually a cache read) or throws
 * `CircuitOpenError`, so a live surface — a chat message, a chess move —
 * can refuse to render stale state as if it were fresh. That is a decision
 * only the call site can make, so it is a required-by-shape option rather
 * than a default.
 *
 * Deliberately framework-agnostic and synchronous in its bookkeeping: the
 * state lives in a module-level map so every caller of a given key shares
 * one breaker, including callers in different React trees.
 */

export type BreakerState = 'closed' | 'open' | 'half-open';

export class CircuitOpenError extends Error {
  constructor(
    readonly key: string,
    readonly retryInMs: number,
  ) {
    super(`Circuit "${key}" is open — retry in ${Math.round(retryInMs)}ms`);
    this.name = 'CircuitOpenError';
  }
}

export interface BreakerOptions {
  /** Consecutive failures before the breaker opens. Default 4. */
  threshold?: number;
  /** First cooldown after opening, in ms. Default 8_000. */
  cooldownMs?: number;
  /** Upper bound for the exponential cooldown. Default 5 minutes. */
  maxCooldownMs?: number;
  /**
   * Classifier: does this error mean the ENDPOINT is unhealthy? A 404 or a
   * validation 400 is a healthy server rejecting one request and must not
   * count toward opening the breaker, or a single bad row would take the
   * whole feature offline.
   */
  isEndpointFailure?: (err: unknown) => boolean;
}

interface Breaker {
  state: BreakerState;
  failures: number;
  /** Consecutive opens — drives the exponential cooldown. */
  opens: number;
  openedAt: number;
  cooldownMs: number;
  /** Set while a half-open probe is in flight so only one is allowed. */
  probing: boolean;
  lastError?: string;
}

const DEFAULTS = {
  threshold: 4,
  cooldownMs: 8_000,
  maxCooldownMs: 5 * 60_000,
};

const breakers = new Map<string, Breaker>();
const listeners = new Set<(key: string, state: BreakerState) => void>();

function get(key: string): Breaker {
  let b = breakers.get(key);
  if (!b) {
    b = {
      state: 'closed',
      failures: 0,
      opens: 0,
      openedAt: 0,
      cooldownMs: DEFAULTS.cooldownMs,
      probing: false,
    };
    breakers.set(key, b);
  }
  return b;
}

function transition(key: string, b: Breaker, state: BreakerState): void {
  if (b.state === state) return;
  b.state = state;
  for (const cb of listeners) {
    try {
      cb(key, state);
    } catch {
      /* a listener must never break the caller */
    }
  }
}

/** A 4xx (other than 408/429) is the server working correctly. */
function defaultIsEndpointFailure(err: unknown): boolean {
  const e = err as { status?: number; code?: number | string; name?: string } | null;
  if (!e) return true;
  if (e.name === 'AbortError') return false; // user navigated away
  const status = typeof e.status === 'number' ? e.status : Number(e.code);
  if (Number.isFinite(status) && status >= 400 && status < 500) {
    return status === 408 || status === 429;
  }
  return true;
}

export interface WithBreakerOptions<T> extends BreakerOptions {
  /**
   * Value to resolve with while the breaker is open. Omit to make an open
   * breaker throw `CircuitOpenError` — the correct choice for live data
   * (chat, chess, spot prices) where stale is worse than absent.
   */
  fallback?: () => T | Promise<T>;
}

/**
 * Runs `fn` through the breaker registered under `key`.
 *
 * Composes with `withRetry` from `fetchRetry.ts`: put the retry INSIDE the
 * breaker (`withBreaker(k, () => withRetry(fn))`) so a burst of retries
 * counts as one endpoint failure rather than instantly tripping it.
 */
export async function withBreaker<T>(
  key: string,
  fn: () => Promise<T>,
  opts: WithBreakerOptions<T> = {},
): Promise<T> {
  const threshold = opts.threshold ?? DEFAULTS.threshold;
  const maxCooldown = opts.maxCooldownMs ?? DEFAULTS.maxCooldownMs;
  const isFailure = opts.isEndpointFailure ?? defaultIsEndpointFailure;
  const b = get(key);

  if (b.state === 'open') {
    const elapsed = Date.now() - b.openedAt;
    if (elapsed < b.cooldownMs) {
      const retryIn = b.cooldownMs - elapsed;
      if (opts.fallback) return await opts.fallback();
      throw new CircuitOpenError(key, retryIn);
    }
    transition(key, b, 'half-open');
    b.probing = false;
  }

  if (b.state === 'half-open') {
    if (b.probing) {
      // Another caller owns the probe. Everyone else keeps failing fast so
      // a half-open breaker can never become its own thundering herd.
      if (opts.fallback) return await opts.fallback();
      throw new CircuitOpenError(key, 0);
    }
    b.probing = true;
  }

  try {
    const out = await fn();
    b.failures = 0;
    b.opens = 0;
    b.probing = false;
    b.cooldownMs = opts.cooldownMs ?? DEFAULTS.cooldownMs;
    b.lastError = undefined;
    transition(key, b, 'closed');
    return out;
  } catch (err) {
    b.probing = false;
    if (!isFailure(err)) throw err;

    b.lastError = err instanceof Error ? err.message : String(err);
    b.failures++;
    if (b.state === 'half-open' || b.failures >= threshold) {
      b.opens++;
      b.openedAt = Date.now();
      const base = opts.cooldownMs ?? DEFAULTS.cooldownMs;
      b.cooldownMs = Math.min(base * 2 ** (b.opens - 1), maxCooldown);
      transition(key, b, 'open');
      if (opts.fallback) return await opts.fallback();
    }
    throw err;
  }
}

/** True when `key` is currently refusing calls. Cheap — no allocation. */
export function isCircuitOpen(key: string): boolean {
  const b = breakers.get(key);
  if (!b || b.state !== 'open') return false;
  return Date.now() - b.openedAt < b.cooldownMs;
}

/** Snapshot for the diagnostics panel. */
export function circuitSnapshot(): Array<{
  key: string;
  state: BreakerState;
  failures: number;
  retryInMs: number;
  lastError?: string;
}> {
  const now = Date.now();
  return [...breakers.entries()].map(([key, b]) => ({
    key,
    state: b.state,
    failures: b.failures,
    retryInMs: b.state === 'open' ? Math.max(0, b.cooldownMs - (now - b.openedAt)) : 0,
    lastError: b.lastError,
  }));
}

export function onCircuitChange(cb: (key: string, state: BreakerState) => void): () => void {
  listeners.add(cb);
  return () => {
    listeners.delete(cb);
  };
}

/** Test/recovery hook: forget one breaker, or all of them. */
export function resetCircuit(key?: string): void {
  if (key) breakers.delete(key);
  else breakers.clear();
}