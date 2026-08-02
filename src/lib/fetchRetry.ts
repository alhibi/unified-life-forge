/**
 * Network resilience primitives shared across the app.
 *
 * Three building blocks:
 *   1. `withRetry(fn)`  — exponential backoff with full jitter, plus a
 *      smart "is this even worth retrying?" check (network-class errors
 *      and 5xx/429 only — never on 4xx where the server already gave
 *      a definitive verdict).
 *   2. `dedupe(key, fn)` — collapses concurrent identical requests into
 *      a single in-flight promise so a user mashing "refresh" or a
 *      remounting component doesn't fan out N copies of the same call.
 *   3. `throttleEdgeCall(name, fn, minIntervalMs)` — per-key cooldown
 *      that throws when called more frequently than `minIntervalMs`.
 *      A best-effort client-side guard against accidental floods of
 *      Edge Function calls (the real abuse story still has to live
 *      server-side once the platform exposes primitives for it).
 *
 * All three are intentionally framework-agnostic — they take and return
 * promises so they compose with `supabase.functions.invoke`, `fetch`,
 * `supabase.rpc(...)`, and anything else that yields a Promise.
 */

export class TransientNetworkError extends Error {
  constructor(msg: string, override readonly cause?: unknown) {
    super(msg);
    this.name = 'TransientNetworkError';
  }
}

export class ThrottledError extends Error {
  constructor(public readonly retryAfterMs: number) {
    super(`Throttled — retry in ${retryAfterMs}ms`);
    this.name = 'ThrottledError';
  }
}

/* ───────────────── retry ───────────────── */

export interface RetryOpts {
  /** Maximum attempts INCLUDING the first one. Default: 3. */
  attempts?: number;
  /** Base delay before the second attempt, in ms. Default: 400. */
  baseMs?: number;
  /** Hard cap on any single delay. Default: 4000. */
  capMs?: number;
  /** Custom retry-worthiness check. Defaults to network-class errors. */
  shouldRetry?: (err: unknown) => boolean;
  /** AbortSignal — when aborted, the loop exits immediately. */
  signal?: AbortSignal;
}

const NETWORKY = /network|fetch|offline|timeout|temporarily|ECONNRESET|ETIMEDOUT|503|504|429/i;

function defaultShouldRetry(err: unknown): boolean {
  if (!err) return false;
  // Supabase / fetch error shapes both carry a string `message`.
  const e = err as { message?: string; status?: number; code?: string | number };
  if (typeof e.status === 'number' && (e.status === 429 || e.status >= 500)) return true;
  if (typeof e.code === 'string' && /network|timeout/i.test(e.code)) return true;
  return typeof e.message === 'string' && NETWORKY.test(e.message);
}

function jitter(ms: number): number {
  // Full jitter (AWS recommendation): random in [0, ms].
  return Math.floor(Math.random() * ms);
}

/** Run an async producer with exponential backoff. */
export async function withRetry<T>(fn: () => Promise<T>, opts: RetryOpts = {}): Promise<T> {
  const attempts = Math.max(1, opts.attempts ?? 3);
  const baseMs = opts.baseMs ?? 400;
  const capMs = opts.capMs ?? 4000;
  const shouldRetry = opts.shouldRetry ?? defaultShouldRetry;

  let lastErr: unknown;
  for (let i = 0; i < attempts; i++) {
    if (opts.signal?.aborted) throw opts.signal.reason ?? new Error('aborted');
    try {
      return await fn();
    } catch (err) {
      lastErr = err;
      if (i === attempts - 1 || !shouldRetry(err)) throw err;
      const delay = jitter(Math.min(capMs, baseMs * 2 ** i));
      await new Promise<void>((resolve, reject) => {
        const t = setTimeout(resolve, delay);
        opts.signal?.addEventListener('abort', () => {
          clearTimeout(t);
          reject(opts.signal?.reason ?? new Error('aborted'));
        }, { once: true });
      });
    }
  }
  throw lastErr;
}

/* ───────────────── dedupe ───────────────── */

const inFlight = new Map<string, Promise<unknown>>();

/**
 * Collapse concurrent identical calls. Subsequent callers attach to the
 * first promise; nothing is cached past resolution — once the promise
 * settles the entry is dropped and the next caller starts fresh.
 */
export function dedupe<T>(key: string, fn: () => Promise<T>): Promise<T> {
  const existing = inFlight.get(key) as Promise<T> | undefined;
  if (existing) return existing;
  const promise = fn().finally(() => {
    if (inFlight.get(key) === promise) inFlight.delete(key);
  });
  inFlight.set(key, promise);
  return promise;
}

/* ───────────────── client-side throttle ───────────────── */

const lastCallAt = new Map<string, number>();

/**
 * Reject a call when the same `name` was invoked less than
 * `minIntervalMs` ago. Defensive only — prevents accidental floods
 * from double-clicks, mount loops, or runaway effects. The real
 * abuse story still needs server-side rate limiting.
 */
export async function throttleEdgeCall<T>(
  name: string,
  fn: () => Promise<T>,
  minIntervalMs = 1500,
): Promise<T> {
  const now = Date.now();
  const last = lastCallAt.get(name) ?? 0;
  const delta = now - last;
  if (delta < minIntervalMs) {
    throw new ThrottledError(minIntervalMs - delta);
  }
  lastCallAt.set(name, now);
  try {
    return await fn();
  } catch (err) {
    // Roll back the timestamp on hard failure so a genuine retry isn't
    // penalised — the failure was instant and consumed no real budget.
    lastCallAt.set(name, last);
    throw err;
  }
}