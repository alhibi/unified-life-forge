/**
 * useNetworkStatus Hook
 * 
 * Listens for online/offline events and provides network status.
 * Also provides a function to trigger toast notifications for network status changes.
 */
import { useCallback, useEffect, useState } from 'react';
import { toast } from 'sonner';

export interface NetworkStatus {
  isOnline: boolean;
  lastChange: Date | null;
}

/**
 * Hook to get the current network status
 * 
 * @returns Object with isOnline, lastChange, and status message
 */
export function useNetworkStatus(): NetworkStatus {
  const [isOnline, setIsOnline] = useState<boolean>(
    typeof navigator !== 'undefined' ? navigator.onLine : true
  );
  const [lastChange, setLastChange] = useState<Date | null>(null);

  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      setLastChange(new Date());
    };

    const handleOffline = () => {
      setIsOnline(false);
      setLastChange(new Date());
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  return {
    isOnline,
    lastChange,
  };
}

/**
 * useNetworkToast Hook
 * 
 * Displays toast notifications when network status changes.
 * 
 * @param options - Options for the toast notifications
 */
export function useNetworkToast(options?: {
  onOnline?: (event: Event) => void;
  onOffline?: (event: Event) => void;
  onlineMessage?: string;
  offlineMessage?: string;
}): void {

  useEffect(() => {
    const handleOnline = (event: Event) => {
      const message = options?.onlineMessage ?? 'Network connection restored';
      toast.success(message, {
        id: 'network-status',
        duration: 4000,
      });
      options?.onOnline?.(event);
    };

    const handleOffline = (event: Event) => {
      const message = options?.offlineMessage ?? 'You are offline. Some features may not work.';
      toast.error(message, {
        id: 'network-status',
        duration: 5000,
      });
      options?.onOffline?.(event);
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [options]);
}

/**
 * useOnlineOnly Hook
 * 
 * Prevents execution of effects when offline.
 * Useful for API calls that should only run when online.
 * 
 * @param effect - The effect to run when online
 * @param deps - Dependencies array
 */
export function useOnlineOnly(
  effect: () => void | (() => void),
  deps: React.DependencyList = []
): void {
  const { isOnline } = useNetworkStatus();

  useEffect(() => {
    if (!isOnline) {
      return;
    }

    return effect();
  }, [isOnline, ...deps]); // eslint-disable-line react-hooks/exhaustive-deps
}

/**
 * useNetworkRetry Hook
 * 
 * Automatically retries failed operations when network comes back online.
 * 
 * @param executor - The function to execute
 * @param maxRetries - Maximum number of retries (default: 3)
 * @param retryDelay - Delay between retries in ms (default: 5000)
 * @returns Function that executes with retry logic
 */
export function useNetworkRetry<T>(
  executor: () => Promise<T>,
  maxRetries: number = 3,
  retryDelay: number = 5000
): {
  execute: () => Promise<T>;
  retryCount: number;
  isRetrying: boolean;
} {
  const { isOnline } = useNetworkStatus();
  const [retryCount, setRetryCount] = useState(0);
  const [isRetrying, setIsRetrying] = useState(false);

  const execute = useCallback(async (): Promise<T> => {
    if (!isOnline) {
      setRetryCount(0);
      throw new Error('No network connection');
    }

    try {
      return await executor();
    } catch (error) {
      if (retryCount < maxRetries && isOnline) {
        setIsRetrying(true);
        await new Promise((resolve) => setTimeout(resolve, retryDelay));
        setRetryCount((prev) => prev + 1);
        setIsRetrying(false);
        return execute();
      }
      throw error;
    }
  }, [executor, isOnline, retryCount, maxRetries, retryDelay]);

  return { execute, retryCount, isRetrying };
}

export type OfflineSyncStatus = 'idle' | 'syncing' | 'success' | 'error';

export interface OfflineStorageConfig<T> {
  onProcessItem?: (item: T) => Promise<void>;
  maxRetriesPerItem?: number;
  retryDelayMs?: number; // customizable delay for testing and tuning backoffs
}

/**
 * useOfflineStorage Hook
 * 
 * Buffers operations when offline and executes them when online.
 * Fully-typed robust implementation with transaction safety, retries, error capturing,
 * and state notifications.
 * 
 * @param key - Storage key for the queue
 * @param config - Operational configuration
 */
export function useOfflineStorage<T>(
  key: string,
  config?: OfflineStorageConfig<T>
): {
  queue: T[];
  addItem: (item: T) => void;
  executeQueue: (processItem?: (item: T) => Promise<void>) => Promise<void>;
  clearQueue: () => void;
  syncStatus: OfflineSyncStatus;
  lastSyncTime: Date | null;
  error: Error | null;
} {
  const { isOnline } = useNetworkStatus();
  const [syncStatus, setSyncStatus] = useState<OfflineSyncStatus>('idle');
  const [lastSyncTime, setLastSyncTime] = useState<Date | null>(null);
  const [syncError, setSyncError] = useState<Error | null>(null);

  const [queue, setQueue] = useState<T[]>(() => {
    try {
      const saved = localStorage.getItem(key);
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  // Keep localStorage sync clean and free from stale files
  useEffect(() => {
    try {
      if (queue.length === 0) {
        localStorage.removeItem(key);
      } else {
        localStorage.setItem(key, JSON.stringify(queue));
      }
    } catch {
      // Ignore storage limit / incognito exceptions
    }
  }, [key, queue]);

  const executeQueue = useCallback(async (
    processItemOverride?: (item: T) => Promise<void>
  ): Promise<void> => {
    // Guards: don't execute if offline, empty, or already in progress!
    if (!isOnline || queue.length === 0 || syncStatus === 'syncing') {
      return;
    }

    const processor = processItemOverride ?? config?.onProcessItem;
    if (!processor) {
      setSyncStatus('idle');
      return;
    }

    setSyncStatus('syncing');
    setSyncError(null);

    const itemsToProcess = [...queue];
    const failedItems: T[] = [];
    const maxRetries = config?.maxRetriesPerItem ?? 3;
    const delayBase = config?.retryDelayMs ?? 500;

    try {
      for (const item of itemsToProcess) {
        let attempts = 0;
        let success = false;
        let lastErr: any = null;

        while (attempts < maxRetries && !success) {
          try {
            await processor(item);
            success = true;
          } catch (err) {
            attempts++;
            lastErr = err;
            if (attempts < maxRetries && delayBase > 0) {
              await new Promise((r) => setTimeout(r, delayBase * attempts));
            }
          }
        }

        if (!success) {
          failedItems.push(item);
          console.error('Failed to process offline queue item after retries:', item, lastErr);
        }
      }

      setQueue(failedItems);
      setLastSyncTime(new Date());

      if (failedItems.length > 0) {
        setSyncStatus('error');
        setSyncError(new Error(`Failed to sync ${failedItems.length} items in the queue`));
      } else {
        setSyncStatus('success');
        // Reset status back to idle after a short delay
        setTimeout(() => setSyncStatus('idle'), 3000);
      }
    } catch (globalErr: any) {
      setSyncStatus('error');
      setSyncError(globalErr instanceof Error ? globalErr : new Error(String(globalErr)));
    }
  }, [isOnline, queue, config?.onProcessItem, config?.maxRetriesPerItem, config?.retryDelayMs, syncStatus]);

  const addItem = useCallback(
    (item: T) => {
      setQueue((prev) => [...prev, item]);
    },
    []
  );

  // Automatically trigger sync when coming online
  useEffect(() => {
    if (isOnline && queue.length > 0 && syncStatus === 'idle') {
      executeQueue();
    }
  }, [isOnline, queue.length, executeQueue, syncStatus]);

  const clearQueue = useCallback(() => {
    setQueue([]);
    setSyncStatus('idle');
    setSyncError(null);
    try {
      localStorage.removeItem(key);
    } catch {
      // Ignore errors
    }
  }, [key]);

  return {
    queue,
    addItem,
    executeQueue,
    clearQueue,
    syncStatus,
    lastSyncTime,
    error: syncError,
  };
}
