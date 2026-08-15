import { afterEach, describe, expect, it, vi } from 'vitest';

import { createManagedScope } from '../useManagedEffect';

afterEach(() => vi.useRealTimers());

describe('managed resource scope', () => {
  it('clears timers on dispose so nothing outlives the scope', () => {
    vi.useFakeTimers();
    const tick = vi.fn();
    const { track, dispose } = createManagedScope();
    track.interval(tick, 100);
    track.timeout(tick, 50);

    dispose();
    vi.advanceTimersByTime(1000);
    expect(tick).not.toHaveBeenCalled();
  });

  it('removes event listeners on dispose', () => {
    const target = new EventTarget();
    const handler = vi.fn();
    const { track, dispose } = createManagedScope();
    track.on(target, 'ping', handler);

    target.dispatchEvent(new Event('ping'));
    expect(handler).toHaveBeenCalledTimes(1);

    dispose();
    target.dispatchEvent(new Event('ping'));
    expect(handler).toHaveBeenCalledTimes(1);
  });

  it('aborts tracked signals so in-flight fetches are cancelled', () => {
    const { track, dispose } = createManagedScope();
    const signal = track.signal();
    expect(signal.aborted).toBe(false);
    dispose();
    expect(signal.aborted).toBe(true);
  });

  it('disposes in reverse acquisition order', () => {
    const order: number[] = [];
    const { track, dispose } = createManagedScope();
    track.add(() => order.push(1));
    track.add(() => order.push(2));
    dispose();
    expect(order).toEqual([2, 1]);
  });

  it('immediately disposes anything acquired after teardown', () => {
    const { track, dispose } = createManagedScope();
    dispose();
    const late = vi.fn();
    track.add(late);
    expect(late).toHaveBeenCalledTimes(1);
  });

  it('survives a throwing disposer and still tears the rest down', () => {
    const after = vi.fn();
    const { track, dispose } = createManagedScope();
    track.add(after);
    track.add(() => {
      throw new Error('bad cleanup');
    });
    expect(() => dispose()).not.toThrow();
    expect(after).toHaveBeenCalledTimes(1);
  });

  it('is idempotent — a double dispose does not double-run cleanups', () => {
    const once = vi.fn();
    const { track, dispose } = createManagedScope();
    track.add(once);
    dispose();
    dispose();
    expect(once).toHaveBeenCalledTimes(1);
  });
});