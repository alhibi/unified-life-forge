import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import {
  ensureStorageHeadroom,
  estimateStorage,
  hasRoomFor,
  registerEvictor,
} from '../storageQuota';

const GB = 1024 ** 3;

function mockEstimate(usage: number, quota: number) {
  Object.defineProperty(navigator, 'storage', {
    configurable: true,
    value: { estimate: vi.fn(async () => ({ usage, quota })) },
  });
}

let unregister: Array<() => void> = [];

beforeEach(() => {
  unregister = [];
});

afterEach(() => {
  for (const off of unregister) off();
  vi.restoreAllMocks();
});

describe('storage quota guard', () => {
  it('reports unsupported instead of guessing when estimate() is missing', async () => {
    Object.defineProperty(navigator, 'storage', { configurable: true, value: undefined });
    const est = await estimateStorage();
    expect(est).toEqual({ usage: 0, quota: 0, ratio: 0, supported: false });
    // And an unsupported platform must never block a write.
    await expect(hasRoomFor(10 * GB)).resolves.toBe(true);
  });

  it('does not evict while usage is below the high-water mark', async () => {
    mockEstimate(1 * GB, 10 * GB);
    const evict = vi.fn(async () => 0);
    unregister.push(registerEvictor({ id: 'test:idle', value: 1, evict }));

    await ensureStorageHeadroom(true);
    expect(evict).not.toHaveBeenCalled();
  });

  it('evicts cheapest-first when usage crosses the high-water mark', async () => {
    mockEstimate(9 * GB, 10 * GB);
    const order: string[] = [];
    unregister.push(
      registerEvictor({
        id: 'test:expensive',
        value: 9,
        evict: async () => {
          order.push('expensive');
          return 0;
        },
      }),
      registerEvictor({
        id: 'test:cheap',
        value: 1,
        evict: async (target) => {
          order.push('cheap');
          // Frees everything asked for, so the expensive cache is spared.
          return target;
        },
      }),
    );

    await ensureStorageHeadroom(true);
    expect(order).toEqual(['cheap']);
  });

  it('keeps going when one evictor throws', async () => {
    mockEstimate(9.5 * GB, 10 * GB);
    const second = vi.fn(async () => 0);
    unregister.push(
      registerEvictor({
        id: 'test:broken',
        value: 1,
        evict: async () => {
          throw new Error('idb closed');
        },
      }),
      registerEvictor({ id: 'test:next', value: 2, evict: second }),
    );

    await expect(ensureStorageHeadroom(true)).resolves.toBeTruthy();
    expect(second).toHaveBeenCalled();
  });

  it('refuses a write that would cross the high-water mark', async () => {
    mockEstimate(7.9 * GB, 10 * GB);
    await expect(hasRoomFor(0.5 * GB)).resolves.toBe(false);
    await expect(hasRoomFor(1024)).resolves.toBe(true);
  });
});