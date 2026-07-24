/**
 * useDebounce Hook
 * 
 * Debounces a value with a configurable delay.
 * Useful for search inputs and high-frequency UI events.
 * 
 * @template T - The type of the value to debounce
 * @param value - The value to debounce
 * @param delay - The debounce delay in milliseconds (default: 300)
 * @returns The debounced value
 */
import { useState, useEffect, useCallback, useRef } from 'react';

export function useDebounce<T>(value: T, delay: number = 300): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value);

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    return () => {
      clearTimeout(timer);
    };
  }, [value, delay]);

  return debouncedValue;
}

/**
 * useDebounceCallback Hook
 * 
 * Creates a debounced version of a callback function.
 * 
 * @param callback - The function to debounce
 * @param delay - The debounce delay in milliseconds (default: 300)
 * @returns The debounced function
 */
export function useDebounceCallback<T extends (...args: any[]) => any>(
  callback: T,
  delay: number = 300
): (...args: Parameters<T>) => void {
  const callbackRef = useRef(callback);

  useEffect(() => {
    callbackRef.current = callback;
  }, [callback]);

  return useCallback(
    (...args: Parameters<T>) => {
      const handler = setTimeout(() => {
        callbackRef.current(...args);
      }, delay);

      return () => {
        clearTimeout(handler);
      };
    },
    [delay]
  );
}

/**
 * useDebounceEffect Hook
 * 
 * Runs an effect only after the value has been stable for the specified delay.
 * Similar to useEffect but with debouncing.
 * 
 * @param effect - The effect function to run
 * @param deps - Dependencies array
 * @param delay - The debounce delay in milliseconds (default: 300)
 */
export function useDebounceEffect(
  effect: () => void | (() => void),
  deps: React.DependencyList,
  delay: number = 300
): void {
  useEffect(() => {
    const handler = setTimeout(() => {
      const cleanup = effect();
      return cleanup;
    }, delay);

    return () => {
      clearTimeout(handler);
    };
  }, deps); // eslint-disable-line react-hooks/exhaustive-deps
}

/**
 * useDebounceValue Hook with custom equality function
 * 
 * Debounces a value with a custom comparison function to avoid unnecessary updates.
 * 
 * @param value - The value to debounce
 * @param delay - The debounce delay in milliseconds (default: 300)
 * @param compare - Custom equality function (default: shallow comparison for objects)
 * @returns The debounced value
 */
export function useDebounceValue<T>(
  value: T,
  delay: number = 300,
  compare?: (a: T, b: T) => boolean
): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value);

  useEffect(() => {
    const handler = setTimeout(() => {
      if (!compare || !compare(value, debouncedValue)) {
        setDebouncedValue(value);
      }
    }, delay);

    return () => {
      clearTimeout(handler);
    };
  }, [value, delay, compare, debouncedValue]);

  return debouncedValue;
}
