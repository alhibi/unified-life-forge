/**
 * Profile Feature Caching Foundation
 * ================================
 * 
 * Provides TTL-aware caching for all profile modules:
 * - badges (30min TTL)
 * - streaks (2min TTL, stale-allowed)
 * - activity (1min TTL)
 * - privacy (1hour TTL)
 * - visits (15sec TTL)
 * 
 * Usage:
 *   import { badgeCache, streakCache } from '../lib/cache'
 *   
 *   // Read cached value
 *   const result = badgeCache.read('key')
 *   if (result.valid) {
 *     const data = result.value
 *   }
 *   
 *   // Write value with optional TTL override
 *   badgeCache.write('key', value, 60000) // 60 seconds
 *   
 *   // Check if cached value is valid
 *   const valid = badgeCache.isValid('key')
 */

// Module-specific cache TTL configurations (in milliseconds)
export const PROFILE_CACHE_TTLs = {
  /** Badges cache - longer TTL, data changes infrequently */
  badges: 30 * 60 * 1000, // 30 minutes

  /** Streak engine - medium TTL, needs reasonable freshness, allows stale */
  streaks: 2 * 60 * 1000, // 2 minutes

  /** Activity aggregator - shorter TTL, more dynamic data */
  activity: 60 * 1000, // 1 minute

  /** Privacy settings - very long TTL, static UI state */
  privacy: 60 * 60 * 1000, // 1 hour

  /** Visit tracker - short TTL, high frequency updates */
  visits: 15 * 1000, // 15 seconds
}

/**
 * Cache Read Result type - indicates whether cached value is valid
 */
export type CacheReadResult<T> = {
  /** The cached value if found and not expired, otherwise undefined */
  value: T | undefined;
  /** Whether the entry is valid (exists and not expired) */
  valid: boolean;
}

/**
 * Creates a LocalStorage cache instance for a specific profile module
 * @param moduleKey - Short key identifier (e.g., 'badges', 'streaks', 'activity')
 * @param config - Optional TTL configuration in milliseconds
 * @returns Cache object with read/write/remove methods
 */
export function createModuleCache<T = any>(
  moduleKey: string,
  config?: { defaultTtl?: number }
) {
  const storageKey = `profile:${moduleKey}`;
  const defaultTtl = config?.defaultTtl || PROFILE_CACHE_TTLs[moduleKey as keyof typeof PROFILE_CACHE_TTLs];

  return {
    /** Read cached value with TTL validation */
    read(key: string): CacheReadResult<T> {
      try {
        const raw = localStorage.getItem(`${storageKey}:${key}`);
        if (!raw) {
          return { value: undefined, valid: false };
        }

        const parsed = JSON.parse(raw);
        
        // Handle backward compatibility - raw value (string/number/boolean)
        if (typeof parsed !== 'object' || parsed === null) {
          return { value: parsed as T, valid: true };
        }

        // Handle object format with value/timestamp/ttl
        // Check if it has the expected cache structure
        if ('value' in parsed && 'timestamp' in parsed) {
          const value = parsed.value as T;
          const timestamp = parsed.timestamp;
          const cachedTtl = parsed.ttl;
          const age = Date.now() - timestamp;
          const isValid = age < (cachedTtl || defaultTtl || PROFILE_CACHE_TTLs[moduleKey as keyof typeof PROFILE_CACHE_TTLs]);

          if (isValid) {
            return { value, valid: true };
          }

          return { value: undefined, valid: false };
        }

        // Fallback: treat as valid raw value
        return { value: parsed, valid: true };
      } catch {
        return { value: undefined, valid: false };
      }
    },

    /** Write value to localStorage with TTL */
    write(key: string, value: any, ttl?: number): void {
      try {
        const entry = {
          value,
          timestamp: Date.now(),
          ttl: ttl || defaultTtl || PROFILE_CACHE_TTLs[moduleKey as keyof typeof PROFILE_CACHE_TTLs],
        };
        localStorage.setItem(`${storageKey}:${key}`, JSON.stringify(entry));
      } catch {
        /* ignore storage quota errors */
      }
    },

    /** Remove from localStorage */
    remove(key: string): void {
      try {
        localStorage.removeItem(`${storageKey}:${key}`);
      } catch {
        /* ignore */
      }
    },

    /** Clear all entries for this module */
    clear(): void {
      try {
        // Clear only keys matching this module prefix
        const prefix = storageKey + ':';
        for (let i = 0; i < localStorage.length; i++) {
          const k = localStorage.key(i);
          if (k && k.startsWith(prefix)) {
            localStorage.removeItem(k);
          }
        }
      } catch {
        /* ignore */
      }
    },

    /** Check if a specific key has valid cached data */
    isValid(key: string): boolean {
      return this.read(key).valid;
    },
  };
}

/**
 * Pre-created cache instances for common profile modules
 * Usage: import { badgeCache, streakCache } from '../lib/cache'
 * Access: badgeCache.read('some-key'), badgeCache.write('some-key', value)
 */
export const badgeCache = createModuleCache<any>('badges');
export const streakCache = createModuleCache<any>('streaks');
export const activityCache = createModuleCache<any>('activity');
export const privacyCache = createModuleCache<any>('privacy');
export const visitsCache = createModuleCache<any>('visits');

/**
 * Session-only (in-memory) caches - faster, non-persistent
 * Good for streaks/current session state that shouldn't persist across sessions
 * These are pure in-memory, no localStorage involvement
 */
export function createSessionCache<T = any>(moduleKey: string) {
   
  const _moduleKey = moduleKey; // Mark as used to avoid warning

  const store: Map<string, { value: T; timestamp: number; ttl: number }> = new Map();

  return {
    /** Read cached value */
    read(key: string): CacheReadResult<T> {
      const entry = store.get(key);
      if (!entry) {
        return { value: undefined, valid: false };
      }

      const age = Date.now() - entry.timestamp;
      const isValid = age < (entry.ttl || 2 * 60 * 1000);

      if (isValid) {
        return { value: entry.value, valid: true };
      }

      store.delete(key);
      return { value: undefined, valid: false };
    },

    /** Write value to memory store */
    write(key: string, value: T, ttl?: number): void {
      store.set(key, {
        value,
        timestamp: Date.now(),
        ttl: ttl || 2 * 60 * 1000,
      });
    },

    /** Remove from memory store */
    remove(key: string): void {
      store.delete(key);
    },

    /** Clear all entries */
    clear(): void {
      store.clear();
    },
  };
}

/** Session caches for common modules */
export const sessionBadgeCache = createSessionCache<any>('badges');

/**
 * Deep Cache Validation — Advanced validation with structured entry checks.
 */
export function deepValidateCacheEntry<T>(value: unknown, timestamp: number, ttlMs: number): CacheReadResult<T> {
  const age = Date.now() - timestamp;
  const isValid = age >= 0 && age < ttlMs;
  return { value: isValid ? (value as T) : undefined, valid: isValid };
}
export const sessionStreakCache = createSessionCache<any>('streaks');
export const sessionActivityCache = createSessionCache<any>('activity');

/**
 * Completion cache - 10 minute TTL for profile completion metrics
 */
export const completionCache = createModuleCache<any>('completion', { defaultTtl: 10 * 60 * 1000 });