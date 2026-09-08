/**
 * Stage 5 craft contracts — optimistic rollback, data warmers, numerals.
 */
import { describe, expect, it, vi } from 'vitest';

import { formatNumber } from '@/components/ui/animated-number';
import { runOptimistic } from '@/lib/optimistic';
import { prefetchRoute, registerDataPrefetch } from '@/lib/routePrefetch';

vi.mock('@/lib/notify', () => ({
  notify: { error: vi.fn(), success: vi.fn(), info: vi.fn() },
}));

describe('runOptimistic', () => {
  it('paints before the commit resolves and keeps the state on success', async () => {
    const order: string[] = [];
    const ok = await runOptimistic({
      apply: () => order.push('apply'),
      rollback: () => order.push('rollback'),
      commit: async () => {
        order.push('commit');
        return 'server-id';
      },
    });
    expect(ok).toBe(true);
    expect(order).toEqual(['apply', 'commit']);
  });

  it('rolls back visibly when the commit rejects', async () => {
    const rollback = vi.fn();
    const ok = await runOptimistic({
      apply: () => undefined,
      rollback,
      commit: () => Promise.reject(new Error('offline')),
    });
    expect(ok).toBe(false);
    expect(rollback).toHaveBeenCalledOnce();
  });
});

describe('data warmers', () => {
  it('fires once per TTL window and never throws from a failed warm', () => {
    const warm = vi.fn(() => Promise.reject(new Error('nope')));
    registerDataPrefetch('/__test-warm', warm);
    expect(() => prefetchRoute('/__test-warm')).not.toThrow();
    prefetchRoute('/__test-warm');
    expect(warm).toHaveBeenCalledTimes(1);
  });
});

describe('formatNumber', () => {
  it('uses global numerals and only groups large figures', () => {
    expect(formatNumber(7)).toBe('7');
    expect(formatNumber(1234)).toBe('1234');
    expect(formatNumber(12345)).toBe('12,345');
    expect(formatNumber(3.456, 2)).toBe('3.46');
  });
});
