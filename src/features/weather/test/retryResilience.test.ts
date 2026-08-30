// ============================================================================
// Retry / Resilience strategy tests.
//
// We exercise:
//   • classifyFailure — HTTP status, abort, network error
//   • backoffDelayMs — bounded by cap, increases with attempt
//   • decideRetry — terminal failures never retry, maxAttempts stops retries
//   • CircuitBreakerV2 — opens after threshold in time window, half-open
//     requires multiple successes, terminal failures don't trip
//   • executeWithResilience — end-to-end with a controllable fetch fn
// ============================================================================

import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { CircuitBreakerV2 } from '../engine/CircuitBreakerV2';
import { executeWithResilience } from '../engine/ResilienceStrategy';
import {
  backoffDelayMs,
  classifyFailure,
  decideRetry,
  DEFAULT_RETRY_POLICY,
  type RetryPolicyOptions,
} from '../engine/RetryPolicy';

beforeEach(() => {
  localStorage.clear();
});

afterEach(() => {
  localStorage.clear();
});

describe('classifyFailure', () => {
  it('treats 401/403 as terminal', () => {
    expect(classifyFailure({ status: 401 })).toBe('terminal');
    expect(classifyFailure({ status: 403 })).toBe('terminal');
  });
  it('treats 5xx and 429 as retryable', () => {
    expect(classifyFailure({ status: 500 })).toBe('retryable');
    expect(classifyFailure({ status: 502 })).toBe('retryable');
    expect(classifyFailure({ status: 503 })).toBe('retryable');
    expect(classifyFailure({ status: 429 })).toBe('retryable');
  });
  it('treats AbortError and timeouts as retryable', () => {
    expect(classifyFailure({ name: 'AbortError', message: 'aborted' })).toBe('retryable');
    expect(classifyFailure({ message: 'adapter timeout' })).toBe('retryable');
  });
});

describe('backoffDelayMs', () => {
  const opts: RetryPolicyOptions = { maxAttempts: 3, baseDelayMs: 100, maxDelayMs: 1000, factor: 2 };

  it('is in [0, base * factor^(attempt-1)]', () => {
    for (let attempt = 1; attempt <= 4; attempt += 1) {
      for (let i = 0; i < 100; i += 1) {
        const d = backoffDelayMs(attempt, opts, Math.random);
        const cap = Math.min(opts.maxDelayMs, opts.baseDelayMs * Math.pow(opts.factor, attempt - 1));
        expect(d).toBeGreaterThanOrEqual(0);
        expect(d).toBeLessThanOrEqual(cap + 1);
      }
    }
  });

  it('respects the cap', () => {
    for (let i = 0; i < 100; i += 1) {
      const d = backoffDelayMs(10, opts, () => 1); // force ceiling
      expect(d).toBeLessThanOrEqual(opts.maxDelayMs + 1);
    }
  });
});

describe('decideRetry', () => {
  const opts: RetryPolicyOptions = { maxAttempts: 2, baseDelayMs: 100, maxDelayMs: 1000, factor: 2 };

  it('refuses to retry terminal failures', () => {
    const d = decideRetry(1, 'terminal', opts);
    expect(d.shouldRetry).toBe(false);
    expect(d.reason).toBe('terminal');
  });

  it('stops at maxAttempts', () => {
    const d = decideRetry(opts.maxAttempts, 'retryable', opts);
    expect(d.shouldRetry).toBe(false);
    expect(d.reason).toBe('max_attempts_reached');
  });

  it('allows retry while attempts remain', () => {
    const d = decideRetry(1, 'retryable', opts, () => 0.5);
    expect(d.shouldRetry).toBe(true);
    expect(d.attempt).toBe(2);
    expect(d.delayMs).toBeGreaterThanOrEqual(0);
  });
});

describe('CircuitBreakerV2', () => {
  it('does not open on a small number of failures', () => {
    const b = new CircuitBreakerV2();
    for (let i = 0; i < 3; i += 1) b.recordFailure('open-meteo', 503, 'bad gateway', 100);
    expect(b.snapshot('open-meteo').state).toBe('closed');
  });

  it('opens once failures cross the threshold in the time window', () => {
    const b = new CircuitBreakerV2();
    for (let i = 0; i < 5; i += 1) b.recordFailure('met-norway', 500, 'internal', 100);
    expect(b.snapshot('met-norway').state).toBe('open');
    expect(b.allow('met-norway')).toBe(false);
  });

  it('terminal failures do not count toward the threshold', () => {
    const b = new CircuitBreakerV2();
    for (let i = 0; i < 10; i += 1) b.recordFailure('noaa', 401, 'unauthorized', 100);
    expect(b.snapshot('noaa').state).toBe('closed');
  });

  it('half-open requires multiple successes to close', () => {
    const b = new CircuitBreakerV2();
    for (let i = 0; i < 5; i += 1) b.recordFailure('waqi', 502, 'bad gateway', 100);
    expect(b.snapshot('waqi').state).toBe('open');
    // Manually expire the cooldown by mutating the persisted state through a fresh load.
    localStorage.setItem('weather:breakers:v2', JSON.stringify({
      waqi: {
        state: 'open', failures: [], recentSuccesses: 0, cooldownUntilUnix: Date.now() - 1,
        openCycles: 1, lastSuccessUnix: null, recentResponseMs: [], successesLast24h: [], failuresLast24h: [],
      },
    }));
    const b2 = new CircuitBreakerV2();
    expect(b2.allow('waqi')).toBe(true);
    expect(b2.snapshot('waqi').state).toBe('half_open');
    b2.recordSuccess('waqi', 200);
    expect(b2.snapshot('waqi').state).toBe('half_open');
    b2.recordSuccess('waqi', 200);
    expect(b2.snapshot('waqi').state).toBe('closed');
  });

  it('any retryable failure during half_open reopens the breaker', () => {
    localStorage.setItem('weather:breakers:v2', JSON.stringify({
      waqi: {
        state: 'half_open', failures: [], recentSuccesses: 0, cooldownUntilUnix: null,
        openCycles: 1, lastSuccessUnix: null, recentResponseMs: [], successesLast24h: [], failuresLast24h: [],
      },
    }));
    const b2 = new CircuitBreakerV2();
    b2.recordFailure('waqi', 502, 'still broken', 100);
    expect(b2.snapshot('waqi').state).toBe('open');
  });
});

describe('executeWithResilience', () => {
  it('returns ok=true on first success without retrying', async () => {
    let calls = 0;
    const result = await executeWithResilience(
      async () => { calls += 1; return { snapshot: {}, forecast: {} }; },
      { sourceId: 'open-meteo', timeoutMs: 1000, retry: { maxAttempts: 3, baseDelayMs: 1, maxDelayMs: 1, factor: 1 } },
    );
    expect(result.response.ok).toBe(true);
    expect(result.attempts).toBe(1);
    expect(calls).toBe(1);
  });

  it('retries once on a retryable failure then succeeds', async () => {
    let calls = 0;
    const result = await executeWithResilience(
      async () => {
        calls += 1;
        if (calls === 1) { const e = new Error('boom') as Error & { status: number }; e.status = 503; throw e; }
        return { snapshot: {}, forecast: {} };
      },
      { sourceId: 'open-meteo', timeoutMs: 1000, retry: { maxAttempts: 2, baseDelayMs: 1, maxDelayMs: 1, factor: 1 } },
    );
    expect(result.response.ok).toBe(true);
    expect(result.attempts).toBe(2);
    expect(calls).toBe(2);
  });

  it('does NOT retry a terminal failure', async () => {
    let calls = 0;
    const result = await executeWithResilience(
      async () => {
        calls += 1;
        const e = new Error('forbidden') as Error & { status: number }; e.status = 401; throw e;
      },
      { sourceId: 'open-meteo', timeoutMs: 1000, retry: { maxAttempts: 3, baseDelayMs: 1, maxDelayMs: 1, factor: 1 } },
    );
    expect(result.response.ok).toBe(false);
    expect(result.attempts).toBe(1);
    expect(calls).toBe(1);
  });

  it('reports breaker_open without making the call', async () => {
    // The singleton breaker (breakerV2) is what the strategy consults.
    // We trip it directly, then call the strategy and verify the early exit.
    const { breakerV2 } = await import('../engine/CircuitBreakerV2');
    for (let i = 0; i < 5; i += 1) breakerV2.recordFailure('open-meteo', 500, 'fail', 100);
    let calls = 0;
    const result = await executeWithResilience(
      async () => { calls += 1; return { snapshot: {}, forecast: {} }; },
      { sourceId: 'open-meteo', timeoutMs: 1000, retry: { maxAttempts: 2, baseDelayMs: 1, maxDelayMs: 1, factor: 1 } },
    );
    expect(result.response.ok).toBe(false);
    expect(result.response.error).toBe('breaker_open');
    expect(result.attempts).toBe(0);
    expect(calls).toBe(0);
    breakerV2.resetAll();
  });
});

describe('Default retry policy', () => {
  it('allows at most 2 attempts and caps delay at 2.5s', () => {
    expect(DEFAULT_RETRY_POLICY.maxAttempts).toBe(2);
    expect(DEFAULT_RETRY_POLICY.maxDelayMs).toBe(2500);
  });
});