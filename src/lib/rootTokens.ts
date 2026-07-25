export const ROOT_TOKENS_STORAGE_KEY = 'app-root-tokens-v1';
export const MAX_ROOT_TOKEN_COUNT = 256;
export const MAX_ROOT_TOKEN_KEY_LENGTH = 128;
export const MAX_ROOT_TOKEN_VALUE_LENGTH = 1024;

function isPlainObject(value: unknown): value is Record<string, unknown> {
  if (value === null || typeof value !== 'object' || Array.isArray(value)) return false;
  const prototype = Object.getPrototypeOf(value);
  return prototype === Object.prototype || prototype === null;
}

/** Keep only bounded CSS custom properties that are safe to persist and replay. */
export function sanitizeRootTokens(value: unknown): Record<string, string> {
  if (!isPlainObject(value)) return {};

  const sanitized: Record<string, string> = {};
  let count = 0;
  for (const [key, tokenValue] of Object.entries(value)) {
    if (count >= MAX_ROOT_TOKEN_COUNT) break;
    if (
      !key.startsWith('--') ||
      key.length < 3 ||
      key.length > MAX_ROOT_TOKEN_KEY_LENGTH ||
      typeof tokenValue !== 'string' ||
      tokenValue.length > MAX_ROOT_TOKEN_VALUE_LENGTH
    ) {
      continue;
    }
    sanitized[key] = tokenValue;
    count += 1;
  }
  return sanitized;
}

/** Read the boot token cache without allowing storage or malformed JSON to escape. */
export function readRootTokens(): Record<string, string> {
  if (typeof window === 'undefined') return {};
  try {
    const raw = window.localStorage.getItem(ROOT_TOKENS_STORAGE_KEY);
    return raw === null ? {} : sanitizeRootTokens(JSON.parse(raw));
  } catch {
    return {};
  }
}

/**
 * Apply root variables and merge them into the cold-boot cache.
 * DOM and storage failures are isolated so appearance changes never break the app.
 */
export function applyRootTokens(vars: Record<string, string>): Record<string, string> {
  const sanitized = sanitizeRootTokens(vars);

  if (typeof document !== 'undefined') {
    try {
      const root = document.documentElement;
      for (const [key, value] of Object.entries(sanitized)) root.style.setProperty(key, value);
    } catch {
      // A missing or restricted DOM must not make token generation fatal.
    }
  }

  const merged = sanitizeRootTokens({ ...sanitized, ...readRootTokens(), ...sanitized });
  if (typeof window !== 'undefined') {
    try {
      window.localStorage.setItem(ROOT_TOKENS_STORAGE_KEY, JSON.stringify(merged));
    } catch {
      // Private browsing, quotas, and blocked storage are all valid environments.
    }
  }

  return merged;
}
