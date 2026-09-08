/**
 * Text expansion (snippets) for the in-app keyboard.
 *
 * The single biggest win for people who type the same things every day: a
 * short trigger typed before a space or punctuation expands into a full
 * phrase. Triggers are stored locally, are case-insensitive for Latin, and are
 * matched on the exact typed token so expansion is never surprising.
 */

const STORE_KEY = 'smarthub:soft-keyboard-snippets-v1';

export interface Snippet {
  /** Typed trigger, e.g. "سلام" or ";mail". */
  trigger: string;
  /** Replacement text inserted in its place. */
  text: string;
}

export const DEFAULT_SNIPPETS: readonly Snippet[] = [
  { trigger: 'سلام', text: 'السلام عليكم ورحمة الله وبركاته' },
  { trigger: 'وسلام', text: 'وعليكم السلام ورحمة الله وبركاته' },
  { trigger: 'جزاك', text: 'جزاك الله خيراً' },
  { trigger: 'حمد', text: 'الحمد لله رب العالمين' },
  { trigger: 'صلعم', text: 'صلى الله عليه وسلم' },
  { trigger: 'بسمله', text: 'بسم الله الرحمن الرحيم' },
];

let cache: Snippet[] | null = null;

function sanitize(list: unknown): Snippet[] {
  if (!Array.isArray(list)) return [];
  const out: Snippet[] = [];
  for (const item of list) {
    if (!item || typeof item !== 'object') continue;
    const trigger = typeof (item as Snippet).trigger === 'string' ? (item as Snippet).trigger.trim() : '';
    const text = typeof (item as Snippet).text === 'string' ? (item as Snippet).text : '';
    if (!trigger || !text || /\s/.test(trigger)) continue;
    if (out.some((s) => s.trigger === trigger)) continue;
    out.push({ trigger, text });
    if (out.length >= 100) break;
  }
  return out;
}

export function getSnippets(): Snippet[] {
  if (cache) return cache;
  if (typeof localStorage !== 'undefined') {
    try {
      const raw = localStorage.getItem(STORE_KEY);
      if (raw) {
        cache = sanitize(JSON.parse(raw));
        return cache;
      }
    } catch {
      /* fall through to defaults */
    }
  }
  cache = [...DEFAULT_SNIPPETS];
  return cache;
}

function persist(next: Snippet[]): Snippet[] {
  cache = next;
  if (typeof localStorage !== 'undefined') {
    try {
      localStorage.setItem(STORE_KEY, JSON.stringify(next));
    } catch {
      /* memory cache still serves this session */
    }
  }
  if (typeof window !== 'undefined' && typeof window.dispatchEvent === 'function') {
    window.dispatchEvent(new CustomEvent('soft-keyboard-snippets-changed', { detail: next }));
  }
  return next;
}

export function saveSnippet(trigger: string, text: string): Snippet[] {
  const clean = trigger.trim().replace(/\s+/g, '');
  if (!clean || !text.trim()) return getSnippets();
  const rest = getSnippets().filter((s) => s.trigger !== clean);
  return persist([{ trigger: clean, text: text.trim() }, ...rest].slice(0, 100));
}

export function deleteSnippet(trigger: string): Snippet[] {
  return persist(getSnippets().filter((s) => s.trigger !== trigger));
}

export function resetSnippets(): Snippet[] {
  return persist([...DEFAULT_SNIPPETS]);
}

/** Drops the in-memory cache (sign-out sweep, tests). */
export function clearSnippetRuntimeCache(): void {
  cache = null;
}

/** Returns the expansion for an exactly-matching trigger, or null. */
export function expandSnippet(token: string): string | null {
  const clean = token.trim();
  if (!clean) return null;
  const list = getSnippets();
  const exact = list.find((s) => s.trigger === clean);
  if (exact) return exact.text;
  const lower = clean.toLowerCase();
  const insensitive = list.find((s) => s.trigger.toLowerCase() === lower);
  return insensitive ? insensitive.text : null;
}
