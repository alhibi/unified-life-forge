// ─────────────────────────────────────────────────────────────────────────────
// Chat Performance Utilities
//
// Collection of optimization utilities for the chat module:
//   - Message batching for bulk operations
//   - Scroll-aware image lazy loading
//   - Media preloading for smooth UX
//   - Memory-efficient message pagination
//   - Debounced/throttled helpers for realtime events
//   - Connection quality detection for adaptive behavior
//
// Design principles:
//   - Never block the main thread for > 16ms
//   - Prefer requestIdleCallback for non-urgent work
//   - Respect battery and data saver modes
//   - Degrade gracefully on low-end devices
// ─────────────────────────────────────────────────────────────────────────────

// ── Debounce / Throttle ──────────────────────────────────────────────────────

/**
 * Returns a debounced version of `fn` that delays execution by `ms`.
 * Includes a `.flush()` method to immediately invoke the pending call.
 */
export function debounce<T extends (...args: any[]) => any>(
  fn: T,
  ms: number,
): T & { flush: () => void; cancel: () => void } {
  let timer: ReturnType<typeof setTimeout> | null = null;
  let lastArgs: Parameters<T> | null = null;

  const debounced = ((...args: Parameters<T>) => {
    lastArgs = args;
    if (timer) clearTimeout(timer);
    timer = setTimeout(() => {
      timer = null;
      fn(...(lastArgs as Parameters<T>));
      lastArgs = null;
    }, ms);
  }) as T & { flush: () => void; cancel: () => void };

  debounced.flush = () => {
    if (timer && lastArgs) {
      clearTimeout(timer);
      timer = null;
      fn(...lastArgs);
      lastArgs = null;
    }
  };

  debounced.cancel = () => {
    if (timer) {
      clearTimeout(timer);
      timer = null;
      lastArgs = null;
    }
  };

  return debounced;
}

/**
 * Returns a throttled version of `fn` that executes at most once per `ms`.
 * Uses leading + trailing edge for responsiveness.
 */
export function throttle<T extends (...args: any[]) => any>(fn: T, ms: number): T {
  let lastCall = 0;
  let timer: ReturnType<typeof setTimeout> | null = null;
  let lastArgs: Parameters<T> | null = null;

  return ((...args: Parameters<T>) => {
    const now = Date.now();
    const remaining = ms - (now - lastCall);

    if (remaining <= 0) {
      if (timer) { clearTimeout(timer); timer = null; }
      lastCall = now;
      fn(...args);
    } else {
      lastArgs = args;
      if (!timer) {
        timer = setTimeout(() => {
          timer = null;
          lastCall = Date.now();
          if (lastArgs) fn(...lastArgs);
          lastArgs = null;
        }, remaining);
      }
    }
  }) as T;
}

// ── Idle Scheduler ───────────────────────────────────────────────────────────

type IdleCallback = () => void;

const _idleQueue: IdleCallback[] = [];
let _idleScheduled = false;

/**
 * Schedule work to run when the browser is idle. Falls back to
 * setTimeout(fn, 50) when requestIdleCallback is unavailable.
 */
export function scheduleIdle(fn: IdleCallback): void {
  _idleQueue.push(fn);
  if (!_idleScheduled) {
    _idleScheduled = true;
    if (typeof requestIdleCallback !== 'undefined') {
      requestIdleCallback(_flushIdleQueue, { timeout: 2000 });
    } else {
      setTimeout(_flushIdleQueue, 50);
    }
  }
}

function _flushIdleQueue(deadline?: IdleDeadline): void {
  _idleScheduled = false;
  const hasTime = () => !deadline || deadline.timeRemaining() > 5;

  while (_idleQueue.length > 0 && hasTime()) {
    const task = _idleQueue.shift()!;
    try { task(); } catch (e) { console.warn('[chat/perf] idle task error:', e); }
  }

  // If there are remaining tasks, reschedule
  if (_idleQueue.length > 0) {
    _idleScheduled = true;
    if (typeof requestIdleCallback !== 'undefined') {
      requestIdleCallback(_flushIdleQueue, { timeout: 2000 });
    } else {
      setTimeout(_flushIdleQueue, 50);
    }
  }
}

// ── Connection Quality ───────────────────────────────────────────────────────

export type ConnectionQuality = 'excellent' | 'good' | 'fair' | 'poor' | 'offline';

/**
 * Detect the current connection quality based on Network Information API.
 * Falls back to 'good' when the API is unavailable.
 */
export function getConnectionQuality(): ConnectionQuality {
  if (!navigator.onLine) return 'offline';

  const conn = (navigator as any).connection;
  if (!conn) return 'good';

  const { effectiveType, downlink, rtt } = conn;

  if (effectiveType === '4g' && downlink > 5) return 'excellent';
  if (effectiveType === '4g') return 'good';
  if (effectiveType === '3g') return 'fair';
  if (effectiveType === '2g' || effectiveType === 'slow-2g') return 'poor';
  if (rtt > 1000) return 'poor';
  if (rtt > 500) return 'fair';

  return 'good';
}

/**
 * Returns adaptive settings based on connection quality:
 *  - Image quality to request
 *  - Whether to auto-download media
 *  - Typing indicator broadcast frequency
 *  - Reconnection backoff
 */
export function getAdaptiveSettings(quality: ConnectionQuality) {
  switch (quality) {
    case 'excellent':
      return {
        imageQuality: 1.0,
        autoDownload: true,
        typingBroadcastMs: 1500,
        reconnectBackoff: 1000,
        prefetchMessages: 100,
        enableAnimations: true,
      };
    case 'good':
      return {
        imageQuality: 0.85,
        autoDownload: true,
        typingBroadcastMs: 2000,
        reconnectBackoff: 2000,
        prefetchMessages: 50,
        enableAnimations: true,
      };
    case 'fair':
      return {
        imageQuality: 0.7,
        autoDownload: false,
        typingBroadcastMs: 3000,
        reconnectBackoff: 5000,
        prefetchMessages: 30,
        enableAnimations: true,
      };
    case 'poor':
      return {
        imageQuality: 0.5,
        autoDownload: false,
        typingBroadcastMs: 5000,
        reconnectBackoff: 10000,
        prefetchMessages: 20,
        enableAnimations: false,
      };
    case 'offline':
      return {
        imageQuality: 0,
        autoDownload: false,
        typingBroadcastMs: Infinity,
        reconnectBackoff: 30000,
        prefetchMessages: 0,
        enableAnimations: false,
      };
  }
}

// ── Media Preloading ─────────────────────────────────────────────────────────

const _preloadCache = new Set<string>();
const _preloadQueue: string[] = [];
let _preloading = false;

/**
 * Preload an image URL in the background. Skips if already cached
 * or if the connection quality is poor.
 */
export function preloadImage(url: string): void {
  if (!url || _preloadCache.has(url)) return;
  if (getConnectionQuality() === 'poor' || getConnectionQuality() === 'offline') return;

  _preloadQueue.push(url);
  if (!_preloading) _processPreloadQueue();
}

function _processPreloadQueue(): void {
  if (_preloadQueue.length === 0) { _preloading = false; return; }
  _preloading = true;

  const url = _preloadQueue.shift()!;
  if (_preloadCache.has(url)) {
    _processPreloadQueue();
    return;
  }

  const img = new Image();
  img.onload = () => {
    _preloadCache.add(url);
    // Process next after a small delay to avoid congestion
    setTimeout(_processPreloadQueue, 100);
  };
  img.onerror = () => {
    setTimeout(_processPreloadQueue, 100);
  };
  img.src = url;
}

/**
 * Preload images for messages that are about to scroll into view.
 * Call this from the VirtualMessageList's overscan zone.
 */
export function preloadMessagesMedia(messages: Array<{ fileUrl?: string | null; kind?: string }>): void {
  for (const msg of messages) {
    if (msg.kind === 'image' && msg.fileUrl) {
      preloadImage(msg.fileUrl);
    }
  }
}

// ── Memory Management ────────────────────────────────────────────────────────

/**
 * Estimate memory pressure. Returns true if we should be conservative
 * with caching and animations.
 */
export function isMemoryConstrained(): boolean {
  // Use the performance.memory API if available (Chrome only)
  const perf = (performance as any).memory;
  if (perf) {
    const usageRatio = perf.usedJSHeapSize / perf.jsHeapSizeLimit;
    return usageRatio > 0.7;
  }
  // Fallback: check device memory API
  const dm = (navigator as any).deviceMemory;
  if (dm && dm <= 2) return true;
  return false;
}

/**
 * Get the recommended page size for message pagination based on
 * device capabilities and connection quality.
 */
export function getRecommendedPageSize(): number {
  const quality = getConnectionQuality();
  const memConstrained = isMemoryConstrained();

  if (memConstrained) return 25;
  if (quality === 'poor') return 20;
  if (quality === 'fair') return 30;
  return 50;
}

// ── Batch Operations ─────────────────────────────────────────────────────────

/**
 * Process items in batches, yielding to the main thread between batches.
 * Useful for bulk operations like marking many messages as read.
 */
export async function processBatch<T>(
  items: T[],
  processor: (batch: T[]) => Promise<void>,
  batchSize: number = 20,
): Promise<void> {
  for (let i = 0; i < items.length; i += batchSize) {
    const batch = items.slice(i, i + batchSize);
    await processor(batch);
    // Yield to main thread between batches
    if (i + batchSize < items.length) {
      await new Promise(resolve => setTimeout(resolve, 0));
    }
  }
}

// ── Data Saver Detection ─────────────────────────────────────────────────────

/** Returns true if the user has Data Saver mode enabled. */
export function isDataSaverEnabled(): boolean {
  const conn = (navigator as any).connection;
  return conn?.saveData === true;
}

// ── Visibility State ─────────────────────────────────────────────────────────

let _visibilityListeners: Array<(visible: boolean) => void> = [];

/** Subscribe to tab visibility changes. Returns unsubscribe function. */
export function onVisibilityChange(fn: (visible: boolean) => void): () => void {
  _visibilityListeners.push(fn);

  if (_visibilityListeners.length === 1) {
    document.addEventListener('visibilitychange', _handleVisibility);
  }

  return () => {
    _visibilityListeners = _visibilityListeners.filter(f => f !== fn);
    if (_visibilityListeners.length === 0) {
      document.removeEventListener('visibilitychange', _handleVisibility);
    }
  };
}

function _handleVisibility(): void {
  const visible = document.visibilityState === 'visible';
  for (const fn of _visibilityListeners) {
    try { fn(visible); } catch { /* ignore */ }
  }
}

/** Returns true if the document is currently visible. */
export function isTabVisible(): boolean {
  return document.visibilityState === 'visible';
}
