/**
 * URL State Synchronization Utility
 * 
 * Syncs UI states (tabs, search queries, filters, pagination) with URL query parameters
 * for bookmarkable deep links and state persistence across reloads.
 */

interface UrlStateOptions {
  /**
   * Should the state be stringified/parse as JSON?
   */
  parseJson?: boolean;
  /**
   * Should the state be serialized as array?
   */
  isArray?: boolean;
  /**
   * Transform function for the value before setting in URL
   */
  transform?: {
    toUrl?: (value: any) => string;
    fromUrl?: (value: string) => any;
  };
  /**
   * Default value if not present in URL
   */
  defaultValue?: any;
}

interface UrlStateSync {
  /**
   * Get a state value from URL query parameters
   * 
   * @param key - The query parameter key
   * @param options - Options for parsing
   * @returns The parsed value or defaultValue
   */
  get: (key: string, options?: UrlStateOptions) => any;

  /**
   * Set a state value in URL query parameters
   * 
   * @param key - The query parameter key
   * @param value - The value to set
   * @param options - Options for serialization
   */
  set: (key: string, value: any, options?: UrlStateOptions) => void;

  /**
   * Remove a state value from URL query parameters
   * 
   * @param key - The query parameter key
   */
  remove: (key: string) => void;

  /**
   * Get all query parameters as an object
   * 
   * @returns Object containing all query parameters
   */
  getAll: () => Record<string, string>;

  /**
   * Replace the current URL with new query parameters
   * 
   * @param newParams - New query parameters to set
   */
  replace: (newParams: Record<string, any>) => void;

  /**
   * Update query parameters without replacing the entire URL
   * 
   * @param updates - Query parameters to update
   */
  update: (updates: Record<string, any>) => void;

  /**
   * Sync a state with URL query parameters (React hook compatible)
   * 
   * @param key - The query parameter key
   * @param state - The state array from useState
   * @param options - Options for parsing
   * @returns A function to update the state
   */
  useSyncState: <T>(
    key: string,
    state: [T, (value: T) => void],
    options?: UrlStateOptions
  ) => (value: T) => void;
}

/**
 * Parse a URL parameter value
 * 
 * @param value - The raw URL value
 * @param options - Parsing options
 * @returns The parsed value
 */
function parseUrlValue(value: string | null, options?: UrlStateOptions): any {
  if (value === null || value === undefined || value === '') {
    return options?.defaultValue ?? null;
  }

  // Custom transform
  if (options?.transform?.fromUrl) {
    return options.transform.fromUrl(value);
  }

  // JSON parsing
  if (options?.parseJson) {
    try {
      return JSON.parse(value);
    } catch {
      return value;
    }
  }

  // Array parsing
  if (options?.isArray) {
    return value.split(',').filter(Boolean);
  }

  return value;
}

/**
 * Serialize a value for URL
 * 
 * @param value - The value to serialize
 * @param options - Serialization options
 * @returns The serialized string
 */
function serializeUrlValue(value: any, options?: UrlStateOptions): string {
  if (value === null || value === undefined) {
    return '';
  }

  // Custom transform
  if (options?.transform?.toUrl) {
    return options.transform.toUrl(value);
  }

  // JSON serialization
  if (options?.parseJson) {
    return JSON.stringify(value);
  }

  // Array serialization
  if (options?.isArray) {
    return Array.isArray(value) ? value.join(',') : String(value);
  }

  return String(value);
}

/**
 * Create a URL State Sync instance
 * 
 * @returns A URL State Sync instance
 */
export function createUrlStateSync(): UrlStateSync {
  const getSearchParams = (): URLSearchParams => {
    if (typeof window === 'undefined') return new URLSearchParams();

    try {
      return new URLSearchParams(window.location.search);
    } catch {
      return new URLSearchParams();
    }
  };

  const updateUrl = (searchParams: URLSearchParams, replace: boolean = false) => {
    if (typeof window === 'undefined') return;

    const newUrl = `${window.location.pathname}?${searchParams.toString()}${window.location.hash}`;
    
    if (replace) {
      window.history.replaceState(null, '', newUrl);
    } else {
      window.history.pushState(null, '', newUrl);
    }
  };

  const get = (key: string, options?: UrlStateOptions): any => {
    const searchParams = getSearchParams();
    const value = searchParams.get(key);
    return parseUrlValue(value, options);
  };

  const set = (key: string, value: any, options?: UrlStateOptions): void => {
    const searchParams = getSearchParams();
    const serialized = serializeUrlValue(value, options);

    if (serialized === '' || serialized === 'null' || serialized === 'undefined') {
      searchParams.delete(key);
    } else {
      searchParams.set(key, serialized);
    }

    updateUrl(searchParams);
  };

  const remove = (key: string): void => {
    const searchParams = getSearchParams();
    searchParams.delete(key);
    updateUrl(searchParams);
  };

  const getAll = (): Record<string, string> => {
    const searchParams = getSearchParams();
    const result: Record<string, string> = {};

    for (const [key, value] of searchParams.entries()) {
      result[key] = value;
    }

    return result;
  };

  const replace = (newParams: Record<string, any>): void => {
    const searchParams = new URLSearchParams();

    Object.entries(newParams).forEach(([key, value]) => {
      if (value !== null && value !== undefined && value !== '') {
        searchParams.set(key, String(value));
      }
    });

    updateUrl(searchParams, true);
  };

  const update = (updates: Record<string, any>): void => {
    const searchParams = getSearchParams();

    Object.entries(updates).forEach(([key, value]) => {
      if (value === null || value === undefined || value === '') {
        searchParams.delete(key);
      } else {
        searchParams.set(key, String(value));
      }
    });

    updateUrl(searchParams);
  };

  const useSyncState = <T>(
    key: string,
    state: [T, (value: T) => void],
    options?: UrlStateOptions
  ): ((value: T) => void) => {
    const [currentState, setState] = state;

    // Update from URL on mount
    React.useEffect(() => {
      const value = get(key, options);
      if (value !== null && value !== undefined) {
        setState(value as T);
      }
    }, []);

    // Update URL when state changes
    const updateUrlFromState = React.useCallback(
      (value: T) => {
        setState(value);
        set(key, value, options);
      },
      [key, options]
    );

    return updateUrlFromState;
  };

  return {
    get,
    set,
    remove,
    getAll,
    replace,
    update,
    useSyncState,
  };
}

/**
 * Hook to sync state with URL query parameters
 * 
 * @param key - The query parameter key
 * @param defaultValue - The default value if not in URL
 * @param options - Parsing options
 * @returns A tuple of [value, setValue]
 */
export function useUrlState<T>(
  key: string,
  defaultValue: T,
  options?: Omit<UrlStateOptions, 'defaultValue'>
): [T, (value: T) => void] {
  const [value, setValue] = React.useState<T>(() => {
    const urlValue = createUrlStateSync().get(key, { ...options, defaultValue });
    return urlValue ?? defaultValue;
  });

  const syncValue = React.useCallback(
    (newValue: T) => {
      setValue(newValue);
      createUrlStateSync().set(key, newValue, options);
    },
    [key, options]
  );

  return [value, syncValue];
}

/**
 * Hook to sync multiple states with URL query parameters
 * 
 * @param entries - Array of key-value entries with config
 * @returns Object with all synced states and their setters
 */
export function useUrlStates<T extends Record<string, any>>(
  entries: Array<{
    key: keyof T;
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
    (syncedStates as any)[key] = useUrlState(key as string, defaultValue, options);
  });

  return syncedStates;
}

// Export a default instance for convenience
export const defaultUrlStateSync = createUrlStateSync();
