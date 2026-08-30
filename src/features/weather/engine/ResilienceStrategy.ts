// ============================================================================
// ResilienceStrategy — the policy that ties Retry + CircuitBreaker together
// for one adapter call.
//
// LIFECYCLE OF A SINGLE ADAPTER CALL
//   1. Check breaker — if open, skip the call and return a synthetic
//      "breaker_open" failure.
//   2. Make the call with timeout + AbortSignal.
//   3. If it succeeded, record a success with the breaker.
//   4. If it failed, classify the failure:
//        • terminal: do NOT retry, record the failure without tripping the
//          threshold (auth bugs aren't reliability bugs).
//        • retryable: decide via RetryPolicy whether to try again. Sleep
//          for the backoff, then re-attempt. After all attempts are
//          exhausted, record the failure with the breaker.
//
// The engine no longer needs to know about retries — it gets back a single
// AdapterResponse whose `ok`/`error` reflects the final outcome.
// ============================================================================

import type { ForecastLayers } from '../types/ForecastLayer';
import type { AdapterResponse } from '../types/SourceRegistry';
import type { SourceId } from '../types/SourceRegistry';
import type { PartialSnapshot } from '../types/WeatherSnapshot';
import { breakerV2 } from './CircuitBreakerV2';
import {
  classifyFailure,
  decideRetry,
  DEFAULT_RETRY_POLICY,
  type FailureClass,
  type RetryPolicyOptions,
  sleep,
} from './RetryPolicy';

export interface AdapterFetchFn {
  (signal: AbortSignal): Promise<{ snapshot: PartialSnapshot; forecast: Partial<ForecastLayers> }>;
}

export interface ResilienceContext {
  sourceId: SourceId;
  /** Per-source hard timeout in ms. Tuned by the registry. */
  timeoutMs: number;
  /** Retry policy. Defaults to a single retry with backoff. */
  retry?: RetryPolicyOptions;
  /** Test seam — replace Math.random for deterministic jitter. */
  rng?: () => number;
}

/** Build a single-shot AbortController that fires after `timeoutMs`. */
function makeTimeoutController(timeoutMs: number): AbortController {
  const ac = new AbortController();
  setTimeout(() => ac.abort(new Error('adapter timeout')), timeoutMs);
  return ac;
}

export interface StrategyResult {
  response: AdapterResponse;
  /** Which attempt produced the result (1 = first try). */
  attempts: number;
  /** How the breaker was affected by this call. */
  breakerEffect: 'opened' | 'half_opened' | 'closed' | 'unchanged';
}

export async function executeWithResilience(
  fetch: AdapterFetchFn,
  ctx: ResilienceContext,
): Promise<StrategyResult> {
  const policy: RetryPolicyOptions = ctx.retry ?? DEFAULT_RETRY_POLICY;
  const rng = ctx.rng ?? Math.random;
  const startedTotal = performance.now();

  // 1 — breaker gate.
  if (!breakerV2.allow(ctx.sourceId)) {
    return {
      response: {
        sourceId: ctx.sourceId,
        ok: false,
        durationMs: 0,
        error: 'breaker_open',
      },
      attempts: 0,
      breakerEffect: 'unchanged',
    };
  }

  let attempts = 0;
  let lastError = 'unknown error';
  let lastStatus: number | undefined;
  let lastMessage = '';
  let breakerOpened = false;
  let breakerHalfOpened = false;
  let breakerClosed = false;

  while (attempts < policy.maxAttempts) {
    attempts += 1;
    const ac = makeTimeoutController(ctx.timeoutMs);
    const attemptStart = performance.now();
    try {
      const { snapshot, forecast } = await fetch(ac.signal);
      const duration = Math.round(performance.now() - attemptStart);
      // Closing edge: the source delivered data. If we were half_open, this
      // counts toward the half-open successes.
      const snap = breakerV2.snapshot(ctx.sourceId);
      breakerV2.recordSuccess(ctx.sourceId, duration);
      if (snap.state === 'half_open') breakerHalfOpened = true;
      if (snap.state === 'open' || snap.state === 'closed') breakerClosed = true;
      return {
        response: {
          sourceId: ctx.sourceId,
          ok: true,
          durationMs: Math.round(performance.now() - startedTotal),
          snapshot,
          forecast,
        },
        attempts,
        breakerEffect: breakerHalfOpened ? 'half_opened' : breakerClosed ? 'closed' : 'unchanged',
      };
    } catch (e) {
      const err = e as { name?: string; status?: number; message?: string };
      lastStatus = err.status;
      lastMessage = err.message ?? 'unknown error';
      lastError = lastMessage;
      const cls: FailureClass = classifyFailure({ status: lastStatus, message: lastMessage, name: err.name });
      // Terminal? No retry, no threshold update.
      if (cls === 'terminal') {
        breakerV2.recordFailure(ctx.sourceId, lastStatus, lastMessage, Math.round(performance.now() - attemptStart));
        return {
          response: {
            sourceId: ctx.sourceId,
            ok: false,
            durationMs: Math.round(performance.now() - startedTotal),
            error: `terminal: ${lastError}`,
          },
          attempts,
          breakerEffect: 'unchanged',
        };
      }
      // Decide whether to retry.
      const decision = decideRetry(attempts, cls, policy, rng);
      if (!decision.shouldRetry) {
        breakerV2.recordFailure(ctx.sourceId, lastStatus, lastMessage, Math.round(performance.now() - attemptStart));
        if (breakerV2.snapshot(ctx.sourceId).state === 'open') breakerOpened = true;
        return {
          response: {
            sourceId: ctx.sourceId,
            ok: false,
            durationMs: Math.round(performance.now() - startedTotal),
            error: lastError,
          },
          attempts,
          breakerEffect: breakerOpened ? 'opened' : 'unchanged',
        };
      }
      await sleep(decision.delayMs);
    }
  }

  // Loop exited via maxAttempts — we already reported on the last failure
  // above, but if the loop is broken without a return (impossible, but safe)
  // we still want a final report.
  breakerV2.recordFailure(ctx.sourceId, lastStatus, lastMessage, 0);
  return {
    response: {
      sourceId: ctx.sourceId,
      ok: false,
      durationMs: Math.round(performance.now() - startedTotal),
      error: lastError,
    },
    attempts,
    breakerEffect: breakerV2.snapshot(ctx.sourceId).state === 'open' ? 'opened' : 'unchanged',
  };
}