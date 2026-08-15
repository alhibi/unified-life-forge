import { afterEach, describe, expect, it, vi } from 'vitest';

import {
  CircuitOpenError,
  circuitSnapshot,
  isCircuitOpen,
  resetCircuit,
  withBreaker,
} from '../circuitBreaker';

afterEach(() => {
  resetCircuit();
  vi.useRealTimers();
});

const boom = (status = 500) => () =>
  Promise.reject(Object.assign(new Error('upstream down'), { status }));

describe('circuit breaker', () => {
  it('passes results through while closed', async () => {
    await expect(withBreaker('ok', async () => 42)).resolves.toBe(42);
    expect(isCircuitOpen('ok')).toBe(false);
  });

  it('opens after the threshold and then fails fast without calling through', async () => {
    const fn = vi.fn(boom());
    for (let i = 0; i < 4; i++) {
      await expect(withBreaker('down', fn, { threshold: 4 })).rejects.toThrow();
    }
    expect(isCircuitOpen('down')).toBe(true);

    const callsBefore = fn.mock.calls.length;
    await expect(withBreaker('down', fn, { threshold: 4 })).rejects.toBeInstanceOf(
      CircuitOpenError,
    );
    // The whole point: no socket is opened while the breaker is open.
    expect(fn.mock.calls.length).toBe(callsBefore);
  });

  it('serves the fallback instead of throwing when one is provided', async () => {
    for (let i = 0; i < 4; i++) {
      await expect(withBreaker('fb', boom(), { threshold: 4 })).rejects.toThrow();
    }
    await expect(
      withBreaker('fb', boom(), { threshold: 4, fallback: () => 'cached' }),
    ).resolves.toBe('cached');
  });

  it('does not open on a 4xx — that is a healthy server rejecting one request', async () => {
    for (let i = 0; i < 6; i++) {
      await expect(withBreaker('notfound', boom(404))).rejects.toThrow();
    }
    expect(isCircuitOpen('notfound')).toBe(false);
  });

  it('half-opens after the cooldown and closes again on a successful probe', async () => {
    vi.useFakeTimers();
    for (let i = 0; i < 2; i++) {
      await expect(
        withBreaker('probe', boom(), { threshold: 2, cooldownMs: 1000 }),
      ).rejects.toThrow();
    }
    expect(isCircuitOpen('probe')).toBe(true);

    vi.advanceTimersByTime(1001);
    await expect(
      withBreaker('probe', async () => 'back', { threshold: 2, cooldownMs: 1000 }),
    ).resolves.toBe('back');
    expect(isCircuitOpen('probe')).toBe(false);
  });

  it('backs off exponentially across repeated opens instead of retry-storming', async () => {
    vi.useFakeTimers();
    const opts = { threshold: 1, cooldownMs: 1000 };
    await expect(withBreaker('backoff', boom(), opts)).rejects.toThrow();
    const first = circuitSnapshot().find((c) => c.key === 'backoff')!.retryInMs;

    vi.advanceTimersByTime(1001);
    // The half-open probe fails, which must lengthen the cooldown.
    await expect(withBreaker('backoff', boom(), opts)).rejects.toThrow();
    const second = circuitSnapshot().find((c) => c.key === 'backoff')!.retryInMs;

    expect(second).toBeGreaterThan(first);
  });
});