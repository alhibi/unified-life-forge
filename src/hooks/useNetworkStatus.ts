/**
 * useNetworkStatus Hook
 * 
 * Listens for online/offline events and provides network status.
 * Also provides a function to trigger toast notifications for network status changes.
 */
import { useState, useEffect, useCallback } from 'react';
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
  const { isOnline } = useNetworkStatus();

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

/**
 * useOfflineStorage Hook
 * 
 * Buffers operations when offline and executes them when online.
 * Useful for queueing actions during network outages.
 * 
 * @param key - Storage key for the queue
 * @returns Object with queue, addItem, executeQueue, and clearQueue
 */
export function useOfflineStorage<T>(
  key: string
): {
  queue: T[];
  addItem: (item: T) => void;
  executeQueue: () => Promise<void>;
  clearQueue: () => void;
} {
  const { isOnline } = useNetworkStatus();
  const [queue, setQueue] = useState<T[]>(() => {
    try {
      const saved = localStorage.getItem(key);
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  useEffect(() => {
    try {
      localStorage.setItem(key, JSON.stringify(queue));
    } catch {
      // Ignore errors (e.g., private browsing mode)
    }
  }, [key, queue]);

  const addItem = useCallback(
    (item: T) => {
      setQueue((prev) => [...prev, item]);

      if (isOnline) {
        // Try to execute immediately if online
        executeQueue();
      }
    },
    [isOnline, executeQueue]
  );

  const executeQueue = useCallback(async (): Promise<void> => {
    if (!isOnline || queue.length === 0) {
      return;
    }

    try {
      // Execute all items in the queue
      // This is a placeholder - the actual execution logic should be provided
      await Promise.all(queue.map(async (item) => {
        // TODO: Add execution logic here
        console.log('Executing queued item:', item);
      }));

      clearQueue();
    } catch (error) {
      console.error('Failed to execute queue:', error);
    }
  }, [isOnline, queue]);

  const clearQueue = useCallback(() => {
    setQueue([]);
    try {
      localStorage.removeItem(key);
    } catch {
      // Ignore errors
    }
  }, [key]);

  return { queue, addItem, executeQueue, clearQueue };
}
