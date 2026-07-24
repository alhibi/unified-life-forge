/**
 * usePromiseManager Hook
 * 
 * Manages promises to prevent race conditions and handle cancellation.
 * Useful for data fetching that needs to be cancelled on unmount.
 */
import { useRef, useEffect, useState, useCallback } from 'react';
import { createPromiseManager, executeWithPromiseManager, CanceledError, isCanceledError } from '@/lib/promiseManager';

type PromiseManager = ReturnType<typeof createPromiseManager>;

export function usePromiseManager(): PromiseManager {
  const managerRef = useRef<PromiseManager | null>(null);

  if (!managerRef.current) {
    managerRef.current = createPromiseManager();
  }

  return managerRef.current;
}

/**
 * useAsyncEffect Hook
 * 
 * Runs an async effect with automatic promise cancellation.
 * Similar to useEffect but for async operations.
 * 
 * @param effect - The async effect function
 * @param deps - Dependencies array
 */
export function useAsyncEffect(
  effect: (signal: AbortSignal) => Promise<void> | void,
  deps: React.DependencyList = []
): void {
  const manager = usePromiseManager();

  useEffect(() => {
    const controller = new AbortController();

    const runEffect = async () => {
      try {
        await effect(controller.signal);
      } catch (error) {
        if (!isCanceledError(error)) {
          console.error('Async effect error:', error);
        }
      }
    };

    runEffect();

    return () => {
      controller.abort();
    };
  }, deps); // eslint-disable-line react-hooks/exhaustive-deps
}

/**
 * useAsync Hook
 * 
 * Runs an async function and returns its result, loading state, and error.
 * Automatically handles promise cancellation.
 * 
 * @param asyncFunction - The async function to run
 * @param immediate - Whether to run immediately (default: true)
 * @returns Object with data, loading, error, and execute
 */
export function useAsync<T>(
  asyncFunction: (signal: AbortSignal) => Promise<T>,
  immediate: boolean = true
): {
  data: T | null;
  loading: boolean;
  error: Error | null;
  execute: (immediate?: boolean) => void;
} {
  const manager = usePromiseManager();
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<Error | null>(null);

  const execute = useCallback(
    (immediateValue: boolean = immediate) => {
      if (!immediateValue) {
        return;
      }

      setLoading(true);
      setError(null);

      manager
        .track('useAsync', (signal: AbortSignal) => asyncFunction(signal))
        .then((result: T) => {
          setData(result);
          setLoading(false);
          setError(null);
        })
        .catch((err: Error) => {
          if (!isCanceledError(err)) {
            setError(err);
          }
          setLoading(false);
        });
    },
    [asyncFunction, manager]
  );

  useEffect(() => {
    execute();
  }, [execute]);

  return { data, loading, error, execute };
}

/**
 * useCancelablePromise Hook
 * 
 * Returns a function that executes a promise and returns a cancel function.
 * Useful for manual promise management with cleanup.
 * 
 * @param executor - The promise executor
 * @returns Object with execute and cancel functions
 */
export function useCancelablePromise<T>(
  executor: (signal: AbortSignal) => Promise<T>
): {
  execute: () => Promise<T>;
  cancel: () => void;
  loading: boolean;
} {
  const manager = usePromiseManager();
  const [loading, setLoading] = useState(false);

  const execute = useCallback(async (): Promise<T> => {
    setLoading(true);
    try {
      const result = await executeWithPromiseManager(manager, 'useCancelablePromise', executor);
      setLoading(false);
      return result;
    } catch (error) {
      setLoading(false);
      throw error;
    }
  }, [manager, executor]);

  const cancel = useCallback(() => {
    manager.cancel('useCancelablePromise');
  }, [manager]);

  return { execute, cancel, loading };
}

/**
 * useOptimisticUpdate Hook
 * 
 * Manages optimistic UI updates with rollback on error.
 * 
 * @param initialValue - The initial value
 * @returns Object with value, setOptimisticValue, rollback, and commit
 */
export function useOptimisticUpdate<T>(
  initialValue: T
): {
  value: T;
  setOptimisticValue: (value: T) => void;
  rollback: () => void;
  commit: () => void;
  isOptimistic: boolean;
} {
  const [value, setValue] = useState<T>(initialValue);
  const [optimisticValue, setOptimisticValueState] = useState<T | null>(null);
  const [rollbackValue, setRollbackValue] = useState<T | null>(null);

  const setOptimisticValue = useCallback((newValue: T) => {
    setRollbackValue(value);
    setOptimisticValueState(newValue);
    setValue(newValue);
  }, [value]);

  const rollback = useCallback(() => {
    if (rollbackValue !== null) {
      setValue(rollbackValue);
      setRollbackValue(null);
    }
  }, [rollbackValue]);

  const commit = useCallback(() => {
    setRollbackValue(null);
  }, []);

  return {
    value,
    setOptimisticValue,
    rollback,
    commit,
    isOptimistic: optimisticValue !== null,
  };
}
