/**
 * useUrlStateSync Hook
 * 
 * Syncs UI state with URL query parameters for bookmarkable deep links.
 * 
 * @template T - The type of the state value
 * @param key - The query parameter key
 * @param defaultValue - The default value if not in URL
 * @param options - Options for parsing/serialization
 * @returns A tuple of [value, setValue]
 */
import { useState, useEffect, useCallback } from 'react';
import { createUrlStateSync, type UrlStateOptions } from '@/lib/urlStateSync';

export function useUrlState<T>(
  key: string,
  defaultValue: T,
  options?: Omit<UrlStateOptions, 'defaultValue'>
): [T, (value: T) => void] {
  const [value, setValue] = useState<T>(() => {
    const urlValue = createUrlStateSync().get(key, { ...options, defaultValue });
    return urlValue ?? defaultValue;
  });

  const syncValue = useCallback(
    (newValue: T) => {
      setValue(newValue);
      createUrlStateSync().set(key, newValue, options);
    },
    [key, options]
  );

  // Sync URL changes back to state
  useEffect(() => {
    const searchParams = new URLSearchParams(window.location.search);
    const urlValue = searchParams.get(key);
    const parsedValue = urlValue ? (options?.parseJson ? JSON.parse(urlValue) : urlValue) : null;

    if (parsedValue !== null && parsedValue !== undefined) {
      setValue(parsedValue as T);
    }
  }, [key, options]);

  return [value, syncValue];
}

/**
 * useUrlStates Hook
 * 
 * Syncs multiple state values with URL query parameters.
 * 
 * @template T - The type of the state object
 * @param entries - Array of key-value entries with config
 * @returns Object with all synced states and their setters
 */
export function useUrlStates<T extends Record<string, any>>(
  entries: Array<{
    key: string;
    defaultValue: T[keyof T];
    options?: Omit<UrlStateOptions, 'defaultValue'>;
  }>
): {
  [K in keyof T]: [T[K], (value: T[K]) => void];
} {
  const syncedStates = {} as {
    [K in keyof T]: [T[K], (value: T[K]) => void];
  };

  entries.forEach(({ key, defaultValue, options }) => {
    (syncedStates as any)[key] = useUrlState(key, defaultValue, options);
  });

  return syncedStates;
}

/**
 * useUrlParam Hook
 * 
 * Gets a URL parameter without syncing back to state.
 * Useful for read-only access to URL parameters.
 * 
 * @param key - The query parameter key
 * @param options - Options for parsing
 * @returns The parsed value or null
 */
export function useUrlParam<T>(
  key: string,
  options?: Omit<UrlStateOptions, 'defaultValue'>
): T | null {
  const [value, setValue] = useState<T | null>(null);

  useEffect(() => {
    const urlValue = createUrlStateSync().get(key, options);
    setValue(urlValue as T | null);
  }, [key, options]);

  return value;
}

/**
 * useUrlParams Hook
 * 
 * Gets multiple URL parameters without syncing back to state.
 * 
 * @param keys - Array of query parameter keys
 * @param options - Options map for each parameter
 * @returns Object with all parameter values
 */
export function useUrlParams(
  keys: string[],
  options?: Record<string, Omit<UrlStateOptions, 'defaultValue'>>
): Record<string, any> {
  const [values, setValues] = useState<Record<string, any>>({});

  useEffect(() => {
    const syncParams: Record<string, any> = {};

    keys.forEach((key) => {
      const value = createUrlStateSync().get(key, options?.[key]);
      syncParams[key] = value;
    });

    setValues(syncParams);
  }, [keys, options]);

  return values;
}

/**
 * useUrlStateHistory Hook
 * 
 * Maintains a history of URL state changes for easy navigation.
 * 
 * @param key - The query parameter key
 * @param defaultValue - The default value if not in URL
 * @param options - Options for parsing/serialization
 * @returns Object with current value, setValue, history, and navigation methods
 */
export function useUrlStateHistory<T>(
  key: string,
  defaultValue: T,
  options?: Omit<UrlStateOptions, 'defaultValue'>
): {
  value: T;
  setValue: (value: T) => void;
  history: T[];
  canGoBack: boolean;
  canGoForward: boolean;
  goBack: () => void;
  goForward: () => void;
} {
  const [value, setValue] = useUrlState(key, defaultValue, options);
  const [history, setHistory] = useState<T[]>([]);
  const [historyIndex, setHistoryIndex] = useState<number>(-1);

  useEffect(() => {
    if (historyIndex === -1) {
      setHistory([value]);
      setHistoryIndex(0);
    } else if (history[historyIndex] !== value) {
      const newHistory = history.slice(0, historyIndex + 1);
      newHistory.push(value);
      setHistory(newHistory);
      setHistoryIndex(newHistory.length - 1);
    }
  }, [value, history, historyIndex]);

  const canGoBack = historyIndex > 0;
  const canGoForward = historyIndex < history.length - 1;

  const goBack = useCallback(() => {
    if (canGoBack) {
      const newValue = history[historyIndex - 1];
      setValue(newValue);
      setHistoryIndex(historyIndex - 1);
    }
  }, [canGoBack, history, historyIndex, setValue]);

  const goForward = useCallback(() => {
    if (canGoForward) {
      const newValue = history[historyIndex + 1];
      setValue(newValue);
      setHistoryIndex(historyIndex + 1);
    }
  }, [canGoForward, history, historyIndex, setValue]);

  return {
    value,
    setValue,
    history,
    canGoBack,
    canGoForward,
    goBack,
    goForward,
  };
}
