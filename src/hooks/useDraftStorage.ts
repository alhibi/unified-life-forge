/**
 * useDraftStorage Hook
 * 
 * Auto-saves form data to localStorage to prevent data loss on page reloads
 * or accidental closures.
 * 
 * @template T - The type of the data
 * @param key - The key to identify this form's draft
 * @param initialValue - The initial value if no draft exists
 * @param config - Configuration options
 * @returns A tuple of [data, setData, hasDraft, submit]
 */
import { useState, useEffect, useCallback } from 'react';
import { createDraftStorage, type DraftConfig } from '@/lib/draftStorage';

export function useDraftStorage<T>(
  key: string,
  initialValue: T,
  config?: DraftConfig
): [T, (value: T) => void, boolean, (data: T) => Promise<T>] {
  const [data, setData] = useState<T>(() => {
    const draft = createDraftStorage().load(key, config);
    return draft ?? initialValue;
  });
  const [hasDraft, setHasDraft] = useState<boolean>(() => {
    return createDraftStorage().hasDraft(key, config);
  });
  const [isLoading, setIsLoading] = useState(false);

  const storage = useCallback(() => createDraftStorage(), [key, config]);

  // Auto-save on data change
  useEffect(() => {
    if (!isLoading) {
      storage().save(key, data, config);
      setHasDraft(true);
    }
  }, [data, key, config, storage, isLoading]);

  const updateData = useCallback(
    (newValue: T) => {
      setData(newValue);
      storage().save(key, newValue, config);
      setHasDraft(true);
    },
    [key, config, storage]
  );

  const submit = useCallback(
    async (formData: T): Promise<T> => {
      setIsLoading(true);

      try {
        // Call the actual submit logic (will be provided by caller)
        const result = await Promise.resolve(formData);

        // Mark as submitted to clear draft if clearOnSuccess is true
        storage().setSubmitted(key, config);
        setHasDraft(false);

        return result;
      } catch (err) {
        console.error('Draft submission failed:', err);
        throw err;
      } finally {
        setIsLoading(false);
      }
    },
    [key, config, storage]
  );

  return [data, updateData, hasDraft, submit];
}

/**
 * useFormWithDraft Hook
 * 
 * Manages a form with draft persistence and submission handling.
 * 
 * @template T - The type of the form data
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
  submit: (data: T) => Promise<T>;
  hasDraft: boolean;
  isLoading: boolean;
  error: Error | null;
} {
  const [data, setData] = useState<T>(() => {
    const draft = createDraftStorage().load(key, config);
    return draft ?? initialData;
  });
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const [hasDraft, setHasDraft] = useState<boolean>(() => {
    return createDraftStorage().hasDraft(key, config);
  });

  const storage = useCallback(() => createDraftStorage(), [key, config]);

  // Auto-save on data change
  useEffect(() => {
    if (!isLoading && !error) {
      storage().save(key, data, config);
      setHasDraft(true);
    }
  }, [data, key, config, storage, isLoading, error]);

  const setDataWrapper = useCallback(
    (newData: Partial<T>) => {
      setData((prev) => ({ ...prev, ...newData }));
    },
    []
  );

  const updateField = useCallback(
    (field: keyof T, value: any) => {
      setData((prev) => ({ ...prev, [field]: value }));
    },
    []
  );

  const reset = useCallback(() => {
    const draft = storage().load(key, config);
    setData(draft ?? initialData);
    setHasDraft(!!draft);
  }, [key, config, storage, initialData]);

  const submit = useCallback(
    async (formData: T): Promise<T> => {
      setIsLoading(true);
      setError(null);

      try {
        // Call the actual submit logic (will be provided by caller)
        const result = await Promise.resolve(formData);

        // Mark as submitted to clear draft if clearOnSuccess is true
        storage().setSubmitted(key, config);
        setHasDraft(false);

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

/**
 * useSearchWithDraft Hook
 * 
 * Manages search state with draft persistence for search inputs.
 * 
 * @param key - The key to identify this search's draft
 * @param initialQuery - The initial search query
 * @param config - Configuration options
 * @returns Search state and handlers
 */
export function useSearchWithDraft(
  key: string,
  initialQuery: string = '',
  config?: DraftConfig
): {
  query: string;
  setQuery: (query: string) => void;
  submit: () => void;
  reset: () => void;
  hasDraft: boolean;
} {
  const [query, setQuery] = useState<string>(() => {
    const draft = createDraftStorage().load(key, config);
    return draft ?? initialQuery;
  });
  const [hasDraft, setHasDraft] = useState<boolean>(() => {
    return createDraftStorage().hasDraft(key, config);
  });

  const storage = useCallback(() => createDraftStorage(), [key, config]);

  const updateQuery = useCallback(
    (newQuery: string) => {
      setQuery(newQuery);
      storage().save(key, newQuery, config);
      setHasDraft(true);
    },
    [key, config, storage]
  );

  const reset = useCallback(() => {
    const draft = storage().load(key, config);
    setQuery(draft ?? initialQuery);
    setHasDraft(!!draft);
  }, [key, config, storage, initialQuery]);

  const submit = useCallback(() => {
    storage().setSubmitted(key, config);
    setHasDraft(false);
  }, [key, config, storage]);

  return {
    query,
    setQuery: updateQuery,
    submit,
    reset,
    hasDraft,
  };
}
