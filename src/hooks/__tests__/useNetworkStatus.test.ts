import { act, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { useNetworkStatus, useOfflineStorage } from '../useNetworkStatus';

describe('useNetworkStatus Hook', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
    localStorage.clear();
  });

  it('should initialize with current navigator.onLine status', () => {
    const originalOnLine = navigator.onLine;
    Object.defineProperty(navigator, 'onLine', { value: true, configurable: true });

    const { result } = renderHook(() => useNetworkStatus());
    expect(result.current.isOnline).toBe(true);

    Object.defineProperty(navigator, 'onLine', { value: originalOnLine, configurable: true });
  });

  it('should update status when online/offline window events fire', () => {
    const { result } = renderHook(() => useNetworkStatus());

    act(() => {
      window.dispatchEvent(new Event('offline'));
    });
    expect(result.current.isOnline).toBe(false);
    expect(result.current.lastChange).toBeInstanceOf(Date);

    act(() => {
      window.dispatchEvent(new Event('online'));
    });
    expect(result.current.isOnline).toBe(true);
  });
});

describe('useOfflineStorage Hook', () => {
  const STORAGE_KEY = 'test-offline-queue';

  beforeEach(() => {
    localStorage.clear();
  });

  afterEach(() => {
    vi.restoreAllMocks();
    localStorage.clear();
  });

  it('should initialize queue from localStorage', () => {
    const initialData = [{ id: '1', task: 'Save Note' }];
    localStorage.setItem(STORAGE_KEY, JSON.stringify(initialData));

    const { result } = renderHook(() => useOfflineStorage(STORAGE_KEY));
    expect(result.current.queue).toEqual(initialData);
  });

  it('should add items to queue and persist them', () => {
    const { result } = renderHook(() => useOfflineStorage<string>(STORAGE_KEY));

    act(() => {
      result.current.addItem('Task A');
    });

    expect(result.current.queue).toEqual(['Task A']);
    expect(JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]')).toEqual(['Task A']);
  });

  it('should clear queue successfully', () => {
    const { result } = renderHook(() => useOfflineStorage<string>(STORAGE_KEY));

    act(() => {
      result.current.addItem('Task A');
      result.current.addItem('Task B');
    });

    expect(result.current.queue).toHaveLength(2);

    act(() => {
      result.current.clearQueue();
    });

    expect(result.current.queue).toEqual([]);
    expect(localStorage.getItem(STORAGE_KEY)).toBeNull();
  });

  it('should automatically process queue when online and items exist', async () => {
    const originalOnLine = navigator.onLine;
    Object.defineProperty(navigator, 'onLine', { value: false, configurable: true });

    const mockProcess = vi.fn().mockResolvedValue(undefined);
    const { result } = renderHook(() => useOfflineStorage<string>(STORAGE_KEY, {
      onProcessItem: mockProcess,
      retryDelayMs: 0,
    }));

    act(() => {
      result.current.addItem('Pending Sync Job');
    });

    expect(mockProcess).not.toHaveBeenCalled();
    expect(result.current.queue).toEqual(['Pending Sync Job']);

    Object.defineProperty(navigator, 'onLine', { value: true, configurable: true });

    act(() => {
      window.dispatchEvent(new Event('online'));
    });

    await act(async () => {
      await result.current.executeQueue();
    });

    expect(mockProcess).toHaveBeenCalledWith('Pending Sync Job');
    expect(result.current.queue).toEqual([]);
    expect(result.current.syncStatus).toBe('success');

    Object.defineProperty(navigator, 'onLine', { value: originalOnLine, configurable: true });
  });

  it('should handle item failure and retry correctly', async () => {
    const originalOnLine = navigator.onLine;
    Object.defineProperty(navigator, 'onLine', { value: true, configurable: true });

    let attempts = 0;
    const mockProcess = vi.fn().mockImplementation(async () => {
      attempts++;
      if (attempts < 3) {
        throw new Error('Transient connection issue');
      }
      return Promise.resolve();
    });

    const { result } = renderHook(() => useOfflineStorage<string>(STORAGE_KEY, {
      onProcessItem: mockProcess,
      maxRetriesPerItem: 3,
      retryDelayMs: 0, // no wait delay to execute fast in test env
    }));

    act(() => {
      result.current.addItem('Retryable Job');
    });

    await act(async () => {
      await result.current.executeQueue();
    });

    expect(mockProcess).toHaveBeenCalledTimes(3);
    expect(result.current.queue).toEqual([]);
    expect(result.current.syncStatus).toBe('success');

    Object.defineProperty(navigator, 'onLine', { value: originalOnLine, configurable: true });
  });

  it('should flag syncStatus as error when processing completely fails', async () => {
    const originalOnLine = navigator.onLine;
    Object.defineProperty(navigator, 'onLine', { value: true, configurable: true });

    const mockProcess = vi.fn().mockRejectedValue(new Error('Fatal error'));
    const { result } = renderHook(() => useOfflineStorage<string>(STORAGE_KEY, {
      onProcessItem: mockProcess,
      maxRetriesPerItem: 2,
      retryDelayMs: 0,
    }));

    act(() => {
      result.current.addItem('Failing Job');
    });

    await act(async () => {
      await result.current.executeQueue();
    });

    expect(result.current.syncStatus).toBe('error');
    expect(result.current.error?.message).toContain('Failed to sync 1 items');
    expect(result.current.queue).toEqual(['Failing Job']);

    Object.defineProperty(navigator, 'onLine', { value: originalOnLine, configurable: true });
  });
});
