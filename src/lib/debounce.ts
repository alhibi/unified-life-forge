/**
 * Debounce utility function
 * 
 * Creates a debounced function that delays execution until after wait milliseconds
 * have elapsed since the last time the debounced function was invoked.
 * 
 * @param func - The function to debounce
 * @param wait - The number of milliseconds to delay
 * @returns A debounced function
 * 
 * @example
 * const debouncedFn = debounce((value: string) => {
 *   console.log('Search:', value);
 * }, 300);
 */
export function debounce<T extends (...args: any[]) => any>(
  func: T,
  wait: number
): (...args: Parameters<T>) => void {
  let timeoutId: ReturnType<typeof setTimeout> | null = null;

  return (...args: Parameters<T>) => {
    if (timeoutId !== null) {
      clearTimeout(timeoutId);
    }

    timeoutId = setTimeout(() => {
      func(...args);
    }, wait);
  };
}

/**
 * Throttle utility function
 * 
 * Creates a throttled function that only invokes the provided function at most
 * once every cooldown milliseconds.
 * 
 * @param func - The function to throttle
 * @param cooldown - The number of milliseconds to throttle executions
 * @returns A throttled function
 * 
 * @example
 * const throttledFn = throttle((event: MouseEvent) => {
 *   console.log('Scroll position:', event.clientX);
 * }, 100);
 */
export function throttle<T extends (...args: any[]) => any>(
  func: T,
  cooldown: number
): (...args: Parameters<T>) => void {
  let lastCall = 0;
  let timeoutId: ReturnType<typeof setTimeout> | null = null;

  return (...args: Parameters<T>) => {
    const now = Date.now();

    if (now - lastCall >= cooldown) {
      lastCall = now;
      func(...args);
    } else if (timeoutId === null) {
      timeoutId = setTimeout(() => {
        lastCall = Date.now();
        timeoutId = null;
        func(...args);
      }, cooldown - (now - lastCall));
    }
  };
}

/**
 * Wait utility function
 * 
 * Returns a promise that resolves after the specified milliseconds
 * 
 * @param ms - The number of milliseconds to wait
 * @returns A promise that resolves after the specified time
 */
export function wait(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Request idle callback wrapper
 * 
 * Provides a fallback for requestIdleCallback in environments that don't support it
 * 
 * @param callback - The callback to execute during idle time
 * @returns An ID for the idle callback
 */
export function safeRequestIdleCallback(
  callback: (deadline: { readonly timeRemaining: () => number }) => void
): number {
  if ('requestIdleCallback' in window) {
    return (window as any).requestIdleCallback(callback);
  }
  // Fallback to setTimeout with 1500ms delay
  return setTimeout(() => callback({ timeRemaining: () => 50 }), 1500);
}

/**
 * Cancel idle callback wrapper
 * 
 * Provides a fallback for cancelIdleCallback in environments that don't support it
 * 
 * @param id - The ID returned by requestIdleCallback
 */
export function safeCancelIdleCallback(id: number): void {
  if ('cancelIdleCallback' in window) {
    (window as any).cancelIdleCallback(id);
  } else {
    clearTimeout(id);
  }
}

/**
 * High-precision timestamp
 * 
 * Returns a high-precision timestamp for performance measurement
 * 
 * @returns A high-precision timestamp
 */
export function performanceNow(): number {
  if (typeof performance !== 'undefined' && performance.now) {
    return performance.now();
  }
  return Date.now();
}
