// ============================================================================
// RetryPolicy — exponential backoff with jitter, per-source tunable.
//
// WHY WE RETRY
//   Network blips (DNS hiccups, TLS handshake failures, brief 502s from a
//   load balancer) are transient. Dropping a source on the first failure
//   means a single bad second kills a perfectly good forecast model for the
//   rest of the user's session. A second attempt 800 ms later — almost
//   always succeeds in real networks.
//
// WHY JITTER
//   Without jitter, 12 adapters that all fail at T=0 retry at T=800 ms
//   together, hammering the failing infrastructure at once. With full
//   jitter the retries spread across a window, lightening the load on
//   whatever is having a bad minute.
//
// WHY NOT RETRY CERTAIN ERRORS
//   401/403 (auth) and 400 (bad request) cannot be fixed by retrying. We
//   surface them immediately so the diagnostic is honest.
// ============================================================================

/** Outcome categories we use to decide whether a failure is retryable. */
export type FailureClass =
  | 'retryable'   // network, timeout, 5xx, 429 — worth another shot
  | 'terminal'    // 4xx auth/bad-request — give up immediately
  | 'unknown';    // we couldn't classify; treat as retryable (conservative)

/** Classify a thrown error or HTTP status into a FailureClass. */
export function classifyFailure(input: { status?: number; message?: string; name?: string }): FailureClass {
  if (typeof input.status === 'number') {
    if (input.status === 401 || input.status === 403) return 'terminal';
    if (input.status === 400 || input.status === 404) return 'terminal';
    if (input.status === 408 || input.status === 425 || input.status === 429) return 'retryable';
    if (input.status >= 500) return 'retryable';
    if (input.status >= 400) return 'terminal';
    return 'retryable';
  }
  const msg = (input.message ?? '').toLowerCase();
  const name = (input.name ?? '').toLowerCase();
  if (name === 'aborterror' || msg.includes('timeout') || msg.includes('aborted')) return 'retryable';
  if (msg.includes('failed to fetch') || msg.includes('networkerror')) return 'retryable';
  return 'unknown';
}

export interface RetryPolicyOptions {
  /** Max number of attempts including the first. 1 = no retry. */
  maxAttempts: number;
  /** Base delay between attempts in ms. */
  baseDelayMs: number;
  /** Hard cap on any single backoff delay. */
  maxDelayMs: number;
  /** Multiplier applied to the delay between attempts (typically 2). */
  factor: number;
}

/** Compute the backoff delay for an attempt index (1-based, after the first failure). */
export function backoffDelayMs(attempt: number, opts: RetryPolicyOptions, rng: () => number = Math.random): number {
  // Full jitter: random delay in [0, min(cap, base * factor^(attempt-1))].
  const exp = Math.min(opts.maxDelayMs, opts.baseDelayMs * Math.pow(opts.factor, attempt - 1));
  return Math.round(rng() * exp);
}

export interface RetryDecision {
  shouldRetry: boolean;
  delayMs: number;
  attempt: number;
  reason: FailureClass | 'max_attempts_reached' | 'success';
}

/**
 * Decide whether to retry after a failure. Pure: does not actually sleep.
 * The caller is responsible for `await sleep(decision.delayMs)`.
 */
export function decideRetry(
  attemptsSoFar: number,
  failureClass: FailureClass,
  opts: RetryPolicyOptions,
  rng: () => number = Math.random,
): RetryDecision {
  if (failureClass === 'terminal') {
    return { shouldRetry: false, delayMs: 0, attempt: attemptsSoFar, reason: 'terminal' };
  }
  if (attemptsSoFar >= opts.maxAttempts) {
    return { shouldRetry: false, delayMs: 0, attempt: attemptsSoFar, reason: 'max_attempts_reached' };
  }
  const nextAttempt = attemptsSoFar + 1;
  return {
    shouldRetry: true,
    delayMs: backoffDelayMs(nextAttempt, opts, rng),
    attempt: nextAttempt,
    reason: failureClass,
  };
}

export const DEFAULT_RETRY_POLICY: RetryPolicyOptions = {
  maxAttempts: 2,        // 1 retry total — bounded so a slow source can't drag the pipeline
  baseDelayMs: 400,
  maxDelayMs: 2500,
  factor: 2,
};

/** Sleep helper for the caller. */
export function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}