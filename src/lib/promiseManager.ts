/**
 * Promise Manager Utility
 * 
 * Manages promises to prevent race conditions and handle cancellation
 * using AbortController for cleanup of dangling promises.
 */

import { useRef } from 'react';
import { performanceNow } from './debounce';

interface PendingPromise<T> {
  promise: Promise<T>;
  abortController: AbortController;
  requestId: number;
  createdAt: number;
}

interface PromiseManager {
  /**
   * Execute a promise with automatic cancellation handling
   * 
   * @param executor - Promise executor function
   * @returns Object containing the promise and abortController
   */
  execute<T>(executor: (signal: AbortSignal) => Promise<T>): {
    promise: Promise<T>;
    abortController: AbortController;
  };

  /**
   * Execute a promise and track it for cleanup
   * 
   * @param key - Unique key to identify this promise
   * @param executor - Promise executor function
   * @returns The promise that was created
   */
  track<T>(key: string, executor: (signal: AbortSignal) => Promise<T>): Promise<T>;

  /**
   * Cancel all pending promises for a given key
   * 
   * @param key - The key to cancel promises for
   */
  cancel<T>(key: string): void;

  /**
   * Cancel all pending promises
   */
  cancelAll(): void;

  /**
   * Check if there are pending promises for a given key
   * 
   * @param key - The key to check
   * @returns True if there are pending promises
   */
  hasPending<T>(key: string): boolean;

  /**
   * Get the number of pending promises
   * 
   * @returns The number of pending promises
   */
  getPendingCount(): number;
}

/**
 * Create a new PromiseManager instance
 * 
 * @returns A PromiseManager instance
 */
export function createPromiseManager(): PromiseManager {
  const pendingPromises = new Map<string, PendingPromise<any>>();

  let requestIdCounter = 0;

  const execute = <T>(
    executor: (signal: AbortSignal) => Promise<T>
  ): {
    promise: Promise<T>;
    abortController: AbortController;
  } => {
    const abortController = new AbortController();
    const requestId = ++requestIdCounter;

    const promise = new Promise<T>((resolve, reject) => {
      let isSettled = false;

      const wrappedExecutor = async (signal: AbortSignal) => {
        try {
          const result = await executor(signal);
          if (!isSettled) {
            resolve(result);
            isSettled = true;
          }
        } catch (error) {
          if (!isSettled) {
            reject(error);
            isSettled = true;
          }
        }
      };

      // Execute immediately
      wrappedExecutor(abortController.signal);

      // Listen for abort
      abortController.signal.addEventListener('abort', () => {
        if (!isSettled) {
          reject(new DOMException('Aborted', 'AbortError'));
          isSettled = true;
        }
      });
    });

    return { promise, abortController };
  };

  const track = <T>(key: string, executor: (signal: AbortSignal) => Promise<T>): Promise<T> => {
    // Cancel any existing promise for this key
    cancel(key);

    const abortController = new AbortController();
    const requestId = ++requestIdCounter;
    const createdAt = performanceNow();

    const wrappedExecutor = async (signal: AbortSignal): Promise<T> => {
      try {
        const result = await executor(signal);
        return result;
      } catch (error) {
        if (error instanceof DOMException && error.name === 'AbortError') {
          // Canceled, don't reject the outer promise
          throw error;
        }
        throw error;
      }
    };

    const promise = wrappedExecutor(abortController.signal);

    pendingPromises.set(key, {
      promise,
      abortController,
      requestId,
      createdAt,
    });

    // Clean up after promise settles
    promise.finally(() => {
      pendingPromises.delete(key);
    });

    return promise;
  };

  const cancel = (key: string): void => {
    const pending = pendingPromises.get(key);
    if (pending) {
      pending.abortController.abort();
      pendingPromises.delete(key);
    }
  };

  const cancelAll = (): void => {
    pendingPromises.forEach((pending) => {
      pending.abortController.abort();
    });
    pendingPromises.clear();
  };

  const hasPending = (key: string): boolean => {
    return pendingPromises.has(key);
  };

  const getPendingCount = (): number => {
    return pendingPromises.size;
  };

  return {
    execute,
    track,
    cancel,
    cancelAll,
    hasPending,
    getPendingCount,
  };
}

/**
 * Hook-safe promise manager for React components
 * 
 * @returns A PromiseManager instance
 */
export function usePromiseManager(): PromiseManager {
  const managerRef = useRef<PromiseManager | null>(null);

  if (!managerRef.current) {
    managerRef.current = createPromiseManager();
  }

  return managerRef.current;
}

/**
 * Execute a fetch-like operation with automatic cancellation
 * 
 * @param manager - The promise manager instance
 * @param key - Unique key for this operation
 * @param fetcher - A function that returns a promise (like fetch)
 * @returns The result of the fetcher function
 */
export async function executeWithPromiseManager<T>(
  manager: PromiseManager,
  key: string,
  fetcher: (signal: AbortSignal) => Promise<T>
): Promise<T> {
  try {
    return await manager.track(key, fetcher);
  } catch (error) {
    if (error instanceof DOMException && error.name === 'AbortError') {
      // This is expected when canceling, return a sentinel value or throw
      throw new CanceledError(`Operation "${key}" was canceled`);
    }
    throw error;
  }
}

/**
 * Error type for canceled operations
 */
export class CanceledError extends Error {
  constructor(message?: string) {
    super(message);
    this.name = 'CanceledError';
  }
}

/**
 * Utility to check if an error is a cancellation error
 * 
 * @param error - The error to check
 * @returns True if the error is a cancellation error
 */
export function isCanceledError(error: unknown): boolean {
  return (
    error instanceof CanceledError ||
    (error instanceof DOMException && error.name === 'AbortError')
  );
}

// Export a default instance for convenience
export const defaultPromiseManager = createPromiseManager();
