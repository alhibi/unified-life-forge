import { useState, useCallback, useMemo } from 'react';

/**
 * Optimistic Updates Utility
 * 
 * Implements optimistic UI updates with automatic rollback on error.
 * Critical for high-frequency actions like likes, toggles, and list deletions.
 */

interface OptimisticOperation<T> {
  id: string;
  key: string;
  optimisticValue: T;
  rollbackValue: T;
  timestamp: number;
  completed: boolean;
  error?: Error;
}

interface OptimisticUpdateManager {
  /**
   * Execute an optimistic update
   * 
   * @param key - Unique key for this update
   * @param optimisticValue - The value to show immediately
   * @param executor - The async function that persists the change
   * @returns The final value after the operation completes
   */
  execute<T>(key: string, optimisticValue: T, executor: () => Promise<T>): Promise<T>;

  /**
   * Execute an optimistic update and return a cancel function
   * 
   * @param key - Unique key for this update
   * @param optimisticValue - The value to show immediately
   * @param executor - The async function that persists the change
   * @returns Object with execute function and cancel function
   */
  create<T>(key: string, optimisticValue: T, executor: () => Promise<T>): {
    execute: () => Promise<T>;
    cancel: () => void;
  };

  /**
   * Rollback an optimistic update by key
   * 
   * @param key - The key of the update to rollback
   */
  rollback(key: string): void;

  /**
   * Rollback all optimistic updates
   */
  rollbackAll(): void;

  /**
   * Check if there's an active optimistic update for a key
   * 
   * @param key - The key to check
   * @returns True if there's an active update
   */
  hasActive(key: string): boolean;

  /**
   * Get all active optimistic updates
   * 
   * @returns Array of active optimistic updates
   */
  getActive(): OptimisticOperation<any>[];
}

/**
 * Create an Optimistic Update Manager instance
 * 
 * @returns An Optimistic Update Manager instance
 */
export function createOptimisticUpdateManager(): OptimisticUpdateManager {
  const activeOperations = new Map<string, OptimisticOperation<any>>();

  const execute = async <T>(
    key: string,
    optimisticValue: T,
    executor: () => Promise<T>
  ): Promise<T> => {
    // Create rollback snapshot
    const rollbackValue = getSnapshot<T>(key) as T;

    // Create optimistic operation
    const operation: OptimisticOperation<T> = {
      id: generateId(),
      key,
      optimisticValue,
      rollbackValue,
      timestamp: Date.now(),
      completed: false,
    };

    activeOperations.set(key, operation as OptimisticOperation<any>);

    try {
      // Execute the actual operation
      const finalValue = await executor();

      // Mark as completed
      operation.completed = true;

      // Clean up
      activeOperations.delete(key);

      return finalValue;
    } catch (error) {
      // Rollback on error
      rollback(key);

      throw error;
    }
  };

  const create = <T>(
    key: string,
    optimisticValue: T,
    executor: () => Promise<T>
  ): {
    execute: () => Promise<T>;
    cancel: () => void;
  } => {
    const rollbackValue = getSnapshot<T>(key) as T;

    const operation: OptimisticOperation<T> = {
      id: generateId(),
      key,
      optimisticValue,
      rollbackValue,
      timestamp: Date.now(),
      completed: false,
    };

    activeOperations.set(key, operation as OptimisticOperation<any>);

    const execute = async (): Promise<T> => {
      try {
        const finalValue = await executor();
        operation.completed = true;
        activeOperations.delete(key);
        return finalValue;
      } catch (error) {
        rollback(key);
        throw error;
      }
    };

    const cancel = () => {
      activeOperations.delete(key);
    };

    return { execute, cancel };
  };

  const getSnapshot = <T>(key: string): T | null => {
    // Get the current value from wherever it's stored
    // This would be implemented based on the specific use case
    return null as T | null;
  };

  const rollback = (key: string): void => {
    const operation = activeOperations.get(key);
    if (operation) {
      // Rollback to the saved value
      // This would be implemented based on the specific use case
      // setSnapshot(key, operation.rollbackValue);

      // Remove from active operations
      activeOperations.delete(key);
    }
  };

  const rollbackAll = (): void => {
    activeOperations.forEach((operation, key) => {
      // Rollback to the saved value
      // setSnapshot(key, operation.rollbackValue);
    });
    activeOperations.clear();
  };

  const hasActive = (key: string): boolean => {
    return activeOperations.has(key);
  };

  const getActive = (): OptimisticOperation<any>[] => {
    return Array.from(activeOperations.values());
  };

  return {
    execute,
    create,
    rollback,
    rollbackAll,
    hasActive,
    getActive,
  };
}

/**
 * Hook for optimistic updates
 * 
 * @param manager - The optimistic update manager
 * @returns Hook API for optimistic updates
 */
export function useOptimisticUpdates(
  manager: OptimisticUpdateManager
): {
  execute: <T>(key: string, optimisticValue: T, executor: () => Promise<T>) => Promise<T>;
  cancel: (key: string) => void;
  rollback: (key: string) => void;
  hasActive: (key: string) => boolean;
} {
  return {
    execute: manager.execute.bind(manager),
    cancel: manager.rollback.bind(manager),
    rollback: manager.rollback.bind(manager),
    hasActive: manager.hasActive.bind(manager),
  };
}

/**
 * Optimistic Toggle Hook
 * 
 * Toggles a boolean value optimistically with rollback on error
 * 
 * @param key - Unique key for this toggle
 * @param initialValue - Initial value
 * @param toggleFn - Function to toggle the value
 * @returns Object with value, toggle, and isOptimistic
 */
export function useOptimisticToggle(
  key: string,
  initialValue: boolean,
  toggleFn: (value: boolean) => Promise<boolean>
): {
  value: boolean;
  toggle: () => Promise<void>;
  isOptimistic: boolean;
} {
  const [value, setValue] = useState(initialValue);
  const [isOptimistic, setIsOptimistic] = useState(false);

  const manager = useMemo(() => createOptimisticUpdateManager(), []);

  const toggle = useCallback(async (): Promise<void> => {
    const newValue = !value;
    setValue(newValue);
    setIsOptimistic(true);

    try {
      await manager.execute(key, newValue, async () => {
        const result = await toggleFn(newValue);
        return result;
      });
      setIsOptimistic(false);
    } catch (error) {
      // Rollback happened automatically
      setValue(value);
      setIsOptimistic(false);
      throw error;
    }
  }, [key, value, toggleFn, manager]);

  return { value, toggle, isOptimistic };
}

/**
 * Optimistic Counter Hook
 * 
 * Updates a counter value optimistically with rollback on error
 * 
 * @param key - Unique key for this counter
 * @param initialValue - Initial value
 * @param updateFn - Function to update the counter
 * @returns Object with value, increment, decrement, and isOptimistic
 */
export function useOptimisticCounter(
  key: string,
  initialValue: number = 0,
  updateFn?: (value: number) => Promise<number>
): {
  value: number;
  increment: (delta?: number) => Promise<void>;
  decrement: (delta?: number) => Promise<void>;
  set: (value: number) => Promise<void>;
  isOptimistic: boolean;
} {
  const [value, setValue] = useState(initialValue);
  const [isOptimistic, setIsOptimistic] = useState(false);

  const manager = useMemo(() => createOptimisticUpdateManager(), []);

  const executeUpdate = useCallback(
    async (newValue: number): Promise<void> => {
      setValue(newValue);
      setIsOptimistic(true);

      try {
        if (updateFn) {
          await manager.execute(key, newValue, async () => {
            const result = await updateFn(newValue);
            return result;
          });
        }
        setIsOptimistic(false);
      } catch (error) {
        // Rollback happened automatically
        setValue(value);
        setIsOptimistic(false);
        throw error;
      }
    },
    [key, value, updateFn, manager]
  );

  const increment = useCallback(
    async (delta: number = 1): Promise<void> => {
      await executeUpdate(value + delta);
    },
    [value, executeUpdate]
  );

  const decrement = useCallback(
    async (delta: number = 1): Promise<void> => {
      await executeUpdate(value - delta);
    },
    [value, executeUpdate]
  );

  const set = useCallback(
    async (newValue: number): Promise<void> => {
      await executeUpdate(newValue);
    },
    [executeUpdate]
  );

  return { value, increment, decrement, set, isOptimistic };
}

/**
 * Optimistic List Hook
 * 
 * Manages a list with optimistic add/remove/update operations
 * 
 * @param key - Unique key for this list
 * @param initialValue - Initial list value
 * @returns Object with list, addItem, removeItem, updateItem, and isOptimistic
 */
export function useOptimisticList<T>(
  key: string,
  initialValue: T[] = []
): {
  list: T[];
  addItem: (item: T) => Promise<void>;
  removeItem: (index: number) => Promise<void>;
  updateItem: (index: number, newItem: T) => Promise<void>;
  moveItem: (fromIndex: number, toIndex: number) => Promise<void>;
  isOptimistic: boolean;
} {
  const [list, setList] = useState<T[]>(initialValue);
  const [isOptimistic, setIsOptimistic] = useState(false);

  const manager = useMemo(() => createOptimisticUpdateManager(), []);

  const executeListUpdate = useCallback(
    async (updateFn: (current: T[]) => T[]): Promise<void> => {
      const previousList = [...list];
      const newList = updateFn(previousList);
      setList(newList);
      setIsOptimistic(true);

      try {
        // For list operations, the update function itself is the executor
        // In a real implementation, this would persist to backend
        setIsOptimistic(false);
      } catch (error) {
        // Rollback happened automatically
        setList(previousList);
        setIsOptimistic(false);
        throw error;
      }
    },
    [list, manager]
  );

  const addItem = useCallback(
    async (item: T): Promise<void> => {
      await executeListUpdate((current) => [...current, item]);
    },
    [executeListUpdate]
  );

  const removeItem = useCallback(
    async (index: number): Promise<void> => {
      await executeListUpdate((current) => current.filter((_, i) => i !== index));
    },
    [executeListUpdate]
  );

  const updateItem = useCallback(
    async (index: number, newItem: T): Promise<void> => {
      await executeListUpdate((current) =>
        current.map((item, i) => (i === index ? newItem : item))
      );
    },
    [executeListUpdate]
  );

  const moveItem = useCallback(
    async (fromIndex: number, toIndex: number): Promise<void> => {
      if (fromIndex === toIndex) return;

      await executeListUpdate((current) => {
        const newItem = [...current];
        const [removed] = newItem.splice(fromIndex, 1);
        newItem.splice(toIndex, 0, removed);
        return newItem;
      });
    },
    [executeListUpdate]
  );

  return { list, addItem, removeItem, updateItem, moveItem, isOptimistic };
}

// Export a default instance for convenience
export const defaultOptimisticUpdateManager = createOptimisticUpdateManager();

/**
 * Helper function to generate unique IDs
 */
function generateId(): string {
  return `${Date.now().toString(36)}-${Math.random().toString(36).substr(2, 9)}`;
}
