/**
 * Draft Storage Utility
 * 
 * Auto-saves form data to localStorage to prevent data loss on page reloads
 * or accidental closures. Supports automatic cleanup after successful submission.
 */

interface DraftConfig {
  /**
   * Key to identify this form's draft (e.g., 'chat-message', 'settings-profile')
   */
  key: string;
  /**
   * TTL in milliseconds (default: 7 days)
   */
  ttl?: number;
  /**
   * Transform functions for serialization/deserialization
   */
  transform?: {
    toStorage?: (value: any) => any;
    fromStorage?: (value: any) => any;
  };
  /**
   * Should drafts be cleared after successful submission?
   */
  clearOnSuccess?: boolean;
  /**
   * Callback when a draft is loaded
   */
  onLoad?: (draft: any) => void;
  /**
   * Callback when a draft is saved
   */
  onSave?: (draft: any) => void;
  /**
   * Callback when a draft is cleared
   */
  onClear?: () => void;
}

interface DraftStorage {
  /**
   * Save a draft to localStorage
   * 
   * @param key - The key to identify this draft
   * @param data - The data to save
   * @param config - Configuration options
   */
  save: (key: string, data: any, config?: DraftConfig) => void;

  /**
   * Load a draft from localStorage
   * 
   * @param key - The key to identify this draft
   * @param config - Configuration options
   * @returns The loaded draft or null
   */
  load: (key: string, config?: DraftConfig) => any | null;

  /**
   * Clear a draft from localStorage
   * 
   * @param key - The key to identify this draft
   * @param config - Configuration options
   */
  clear: (key: string, config?: DraftConfig) => void;

  /**
   * Check if a draft exists and is not expired
   * 
   * @param key - The key to identify this draft
   * @param config - Configuration options
   * @returns True if a valid draft exists
   */
  hasDraft: (key: string, config?: DraftConfig) => boolean;

  /**
   * Get all draft keys
   * 
   * @returns Array of all draft keys
   */
  getKeys: () => string[];

  /**
   * Clear all expired drafts
   */
  cleanupExpired: () => void;

  /**
   * Set draft submission status (for clearOnSuccess)
   * 
   * @param key - The key to identify this draft
   * @param config - Configuration options
   */
  setSubmitted: (key: string, config?: DraftConfig) => void;
}

/**
 * Create a Draft Storage instance
 * 
 * @returns A Draft Storage instance
 */
export function createDraftStorage(): DraftStorage {
  const STORAGE_PREFIX = 'draft:';
  const DEFAULT_TTL = 7 * 24 * 60 * 60 * 1000; // 7 days

  const getStorageKey = (key: string): string => {
    return `${STORAGE_PREFIX}${key}`;
  };

  const save = (key: string, data: any, config?: DraftConfig): void => {
    const storageKey = getStorageKey(config?.key || key);
    const ttl = config?.ttl ?? DEFAULT_TTL;
    const timestamp = Date.now();
    const transform = config?.transform;

    try {
      const storageData: any = {
        data: transform?.toStorage ? transform.toStorage(data) : data,
        timestamp,
        ttl,
      };

      localStorage.setItem(storageKey, JSON.stringify(storageData));
      config?.onSave?.(data);
    } catch (error) {
      console.warn(`Failed to save draft for key "${key}":`, error);
    }
  };

  const load = (key: string, config?: DraftConfig): any | null => {
    const storageKey = getStorageKey(config?.key || key);

    try {
      const raw = localStorage.getItem(storageKey);

      if (!raw) {
        return null;
      }

      const storageData = JSON.parse(raw);
      const ttl = config?.ttl ?? storageData.ttl ?? DEFAULT_TTL;
      const transform = config?.transform;

      // Check if draft has expired
      if (Date.now() - storageData.timestamp > ttl) {
        localStorage.removeItem(storageKey);
        return null;
      }

      const data = transform?.fromStorage
        ? transform.fromStorage(storageData.data)
        : storageData.data;

      config?.onLoad?.(data);
      return data;
    } catch (error) {
      console.warn(`Failed to load draft for key "${key}":`, error);
      return null;
    }
  };

  const clear = (key: string, config?: DraftConfig): void => {
    const storageKey = getStorageKey(config?.key || key);

    try {
      localStorage.removeItem(storageKey);
      config?.onClear?.();
    } catch (error) {
      console.warn(`Failed to clear draft for key "${key}":`, error);
    }
  };

  const hasDraft = (key: string, config?: DraftConfig): boolean => {
    const storageKey = getStorageKey(config?.key || key);

    try {
      const raw = localStorage.getItem(storageKey);

      if (!raw) {
        return false;
      }

      const storageData = JSON.parse(raw);
      const ttl = config?.ttl ?? storageData.ttl ?? DEFAULT_TTL;

      // Check if draft has expired
      return Date.now() - storageData.timestamp <= ttl;
    } catch {
      return false;
    }
  };

  const getKeys = (): string[] => {
    const keys: string[] = [];

    try {
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && key.startsWith(STORAGE_PREFIX)) {
          keys.push(key.replace(STORAGE_PREFIX, ''));
        }
      }
    } catch {
      // Ignore errors (e.g., private browsing mode)
    }

    return keys;
  };

  const cleanupExpired = (): void => {
    const keys = getKeys();

    keys.forEach((key) => {
      if (!hasDraft(key)) {
        clear(key);
      }
    });
  };

  const setSubmitted = (key: string, config?: DraftConfig): void => {
    if (config?.clearOnSuccess !== false) {
      clear(key, config);
    } else {
      // Mark as submitted so it won't be auto-cleared
      const storageKey = getStorageKey(config?.key || key);

      try {
        const raw = localStorage.getItem(storageKey);
        if (raw) {
          const storageData = JSON.parse(raw);
          storageData.submitted = true;
          localStorage.setItem(storageKey, JSON.stringify(storageData));
        }
      } catch {
        // Ignore errors
      }
    }
  };

  return {
    save,
    load,
    clear,
    hasDraft,
    getKeys,
    cleanupExpired,
    setSubmitted,
  };
}

/**
 * Hook to sync form state with draft storage
 * 
 * @param key - The key to identify this form's draft
 * @param initialValue - The initial value if no draft exists
 * @param config - Configuration options
 * @returns A tuple of [value, setValue, hasDraft]
 */
export function useDraftStorage<T>(
  key: string,
  initialValue: T,
  config?: DraftConfig
): [T, (value: T) => void, boolean] {
  const [value, setValue] = React.useState<T>(() => {
    const draft = createDraftStorage().load(key, config);
    return draft ?? initialValue;
  });
  const [hasDraft, setHasDraft] = React.useState<boolean>(() => {
    return createDraftStorage().hasDraft(key, config);
  });

  // Auto-save on value change
  React.useEffect(() => {
    createDraftStorage().save(key, value, config);
    setHasDraft(true);
  }, [value, key, config]);

  // Clean up when component unmounts
  React.useEffect(() => {
    return () => {
      // Don't clear draft on unmount - keep it for reload
    };
  }, []);

  const updateValue = React.useCallback(
    (newValue: T) => {
      setValue(newValue);
      createDraftStorage().save(key, newValue, config);
      setHasDraft(true);
    },
    [key, config]
  );

  return [value, updateValue, hasDraft];
}

/**
 * Hook to manage a form with draft persistence and submission handling
 * 
 * @param key - The key to identify this form's draft
 * @param initialData - The initial data if no draft exists
 * @param config - Configuration options
 * @returns Form state and handlers
 */
export function useFormWithDraft<T extends Record<string, any>>(
  key: string,
  initialData: T,
  config?: DraftConfig
): {
  data: T;
  setData: (data: Partial<T>) => void;
  updateField: (field: keyof T, value: any) => void;
  reset: () => void;
  submit: (data: T) => Promise<void>;
  hasDraft: boolean;
  isLoading: boolean;
  error: Error | null;
} {
  const [data, setData] = React.useState<T>(() => {
    const draft = createDraftStorage().load(key, config);
    return draft ?? initialData;
  });
  const [isLoading, setIsLoading] = React.useState(false);
  const [error, setError] = React.useState<Error | null>(null);

  const storage = React.useMemo(() => createDraftStorage(), []);

  // Auto-save on data change
  React.useEffect(() => {
    if (!isLoading) {
      storage.save(key, data, config);
    }
  }, [data, key, config, storage, isLoading]);

  const setDataWrapper = React.useCallback(
    (newData: Partial<T>) => {
      setData((prev) => ({ ...prev, ...newData }));
    },
    []
  );

  const updateField = React.useCallback(
    (field: keyof T, value: any) => {
      setData((prev) => ({ ...prev, [field]: value }));
    },
    []
  );

  const reset = React.useCallback(() => {
    const draft = storage.load(key, config);
    setData(draft ?? initialData);
  }, [key, config, storage, initialData]);

  const submit = React.useCallback(
    async (formData: T): Promise<void> => {
      setIsLoading(true);
      setError(null);

      try {
        // Call the actual submit logic (will be provided by caller)
        // This is a placeholder for the actual submission
        const result = await Promise.resolve(formData);

        // Mark as submitted to clear draft if clearOnSuccess is true
        storage.setSubmitted(key, config);

        return result;
      } catch (err) {
        setError(err instanceof Error ? err : new Error('Submission failed'));
        throw err;
      } finally {
        setIsLoading(false);
      }
    },
    [key, config, storage]
  );

  const hasDraft = storage.hasDraft(key, config);

  return {
    data,
    setData: setDataWrapper,
    updateField,
    reset,
    submit,
    hasDraft,
    isLoading,
    error,
  };
}

// Export a default instance for convenience
export const defaultDraftStorage = createDraftStorage();
