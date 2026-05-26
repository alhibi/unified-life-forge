import React, { useEffect, useState } from 'react';

/**
 * Apple-emoji rendering pipeline for chat messages.
 *
 * Why this exists
 * ───────────────
 * A native unicode emoji like "😀" inserted into a message renders using the
 * recipient's *system* emoji font — Android emoji on Android, Segoe on Windows
 * etc. — so the user sees a different glyph than the iPhone artwork shown in
 * the picker. To get true iPhone consistency everywhere, we replace native
 * emoji runs in rendered message content with `<img>` tags pointing at Apple's
 * official emoji images (the same `emoji-datasource-apple` PNGs that
 * emoji-mart's picker uses).
 *
 * How it works
 * ────────────
 * 1. `preloadAppleEmoji()` lazy-loads `@emoji-mart/data` (~150KB) and walks
 *    its `emojis.{id}.skins[]` table to build:
 *      • `mapping`   — `Map<nativeUnicode, unifiedCodepoint>`
 *      • `maxLen`    — longest native emoji length in UTF-16 code units
 *                       (covers skin-tone + ZWJ family sequences)
 * 2. `renderTextWithAppleEmoji(text)` walks the string with longest-prefix
 *    match against the map. Matched runs become `<img src=…unified.png>`,
 *    other runs stay as plain text.
 * 3. Subscribers registered via `onAppleEmojiReady` (e.g. the rich-text
 *    cache in chatUtils) are invalidated when data finishes loading, so
 *    messages rendered before the load completes get re-rendered with
 *    Apple artwork on the next paint.
 *
 * Performance notes
 * ─────────────────
 * • The longest-prefix walk is O(n × maxLen) where maxLen ≈ 32 UTF-16 units;
 *   linear scan is faster than a 3,800-alternative regex on real messages.
 * • `@emoji-mart/data` is dynamically imported so it stays in its own chunk
 *   (already split for the picker — we just consume the same module).
 * • Apple images are loaded from jsDelivr's CDN (same source as emoji-mart's
 *   picker), so there's no extra bundling cost.
 */

// ─────────────────────────────────────────────────────────────────────────────
// Constants
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Pinned emoji-datasource-apple version. Must be ≥ the version emoji-mart's
 * `data` package expects, so every unified codepoint emoji-mart knows about
 * has a matching PNG (`emoji-datasource-apple@16` is a superset of v15 which
 * emoji-mart 5.6 ships data for).
 *
 * Kept in sync with `src/utils/emojiAvatar.ts` so the same CDN cache hit
 * serves both the avatar picker and message bodies.
 */
const APPLE_DATA_VERSION = '16.0.0';
const APPLE_BASE = `https://cdn.jsdelivr.net/npm/emoji-datasource-apple@${APPLE_DATA_VERSION}/img/apple/64`;

/** URL for a single Apple emoji PNG given its unified codepoint string. */
export function getAppleEmojiPngUrl(unified: string): string {
  return `${APPLE_BASE}/${unified}.png`;
}

// ─────────────────────────────────────────────────────────────────────────────
// State
// ─────────────────────────────────────────────────────────────────────────────

interface EmojiSkin { unified?: string; native?: string; }
interface EmojiEntry { skins?: EmojiSkin[]; }
interface EmojiDataShape { emojis?: Record<string, EmojiEntry>; }

/** native unicode → unified codepoint string (e.g. "👍🏻" → "1f44d-1f3fb"). */
let mapping: Map<string, string> | null = null;
/** Longest native string in `mapping` — caps the prefix-search window. */
let maxLen = 0;
/** In-flight load promise, deduplicates concurrent calls. */
let loadPromise: Promise<void> | null = null;

const subscribers = new Set<() => void>();

// ─────────────────────────────────────────────────────────────────────────────
// Loading
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Lazy-load and parse `@emoji-mart/data`. Idempotent and concurrency-safe —
 * many parts of the chat call this on mount; only one fetch happens.
 */
export function preloadAppleEmoji(): Promise<void> {
  if (mapping) return Promise.resolve();
  if (loadPromise) return loadPromise;

  loadPromise = (async () => {
    try {
      const mod = await import('@emoji-mart/data');
      const data = ((mod as { default?: unknown }).default ?? mod) as EmojiDataShape;
      const m = new Map<string, string>();
      let max = 0;

      const emojis = data.emojis ?? {};
      for (const id in emojis) {
        const skins = emojis[id]?.skins ?? [];
        for (const skin of skins) {
          if (skin?.native && skin?.unified) {
            m.set(skin.native, skin.unified);
            if (skin.native.length > max) max = skin.native.length;
          }
        }
      }

      mapping = m;
      maxLen = max || 32;

      // Notify cache-invalidation subscribers BEFORE returning. Synchronous
      // notification is intentional — callers awaiting `preloadAppleEmoji()`
      // should already see the new data on their next render tick.
      subscribers.forEach(fn => { try { fn(); } catch { /* swallow */ } });
    } catch (err) {
      // Fall back to native rendering forever. This isn't a hard error —
      // users still see emojis, just in their device's font.
      console.warn('[appleEmoji] failed to load @emoji-mart/data; falling back to native emoji', err);
    }
  })();

  return loadPromise;
}

/**
 * Subscribe a callback that runs once the emoji map becomes available.
 * Used by `chatUtils` to invalidate its rich-text render cache, and by
 * `useAppleEmojiReady` to trigger a re-render.
 *
 * If data is already loaded, the callback fires synchronously inside the
 * call to `onAppleEmojiReady` itself.
 */
export function onAppleEmojiReady(fn: () => void): () => void {
  if (mapping) { fn(); return () => { /* noop */ }; }
  subscribers.add(fn);
  return () => { subscribers.delete(fn); };
}

/** Whether the emoji map has finished loading. */
export function isAppleEmojiReady(): boolean {
  return mapping !== null;
}

// ─────────────────────────────────────────────────────────────────────────────
// Rendering
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Convert a string into React nodes, replacing every iPhone emoji run with
 * an `<img>` tag pointing at Apple's emoji artwork. Non-emoji runs stay as
 * plain strings so React can flatten them efficiently.
 *
 * If the emoji data hasn't loaded yet, returns the input as-is so the
 * caller can render native emojis immediately and upgrade later.
 *
 * @param text       The raw text to render.
 * @param keyPrefix  Stable prefix for React keys (the parent token's index).
 */
export function renderTextWithAppleEmoji(
  text: string,
  keyPrefix: string | number = '',
): React.ReactNode[] {
  if (!text) return [];
  if (!mapping || maxLen === 0) return [text];

  const nodes: React.ReactNode[] = [];
  let buf = '';
  let i = 0;
  let nodeIdx = 0;
  const len = text.length;
  const limit = maxLen;

  while (i < len) {
    // Try the longest possible prefix first so multi-codepoint sequences
    // (skin tones, ZWJ families, flags) match before their components.
    let matchLen = 0;
    let matchUnified: string | null = null;
    const tryMax = Math.min(limit, len - i);
    for (let l = tryMax; l >= 1; l--) {
      const candidate = text.substr(i, l);
      const u = mapping.get(candidate);
      if (u) { matchLen = l; matchUnified = u; break; }
    }

    if (matchLen > 0 && matchUnified) {
      if (buf) {
        nodes.push(buf);
        buf = '';
      }
      const native = text.substr(i, matchLen);
      nodes.push(
        React.createElement('img', {
          key: `${keyPrefix}-e${nodeIdx++}`,
          src: getAppleEmojiPngUrl(matchUnified),
          alt: native,
          draggable: false,
          loading: 'lazy',
          decoding: 'async',
          className:
            // Inline-flow with the surrounding line-height. Width=1.2em and
            // a small negative align tucks the glyph onto the text baseline
            // so emoji-only lines aren't taller than text lines.
            'inline-block align-[-0.2em] w-[1.2em] h-[1.2em] mx-[1px] select-none',
          // If the CDN PNG ever 404s (network blip, deprecated codepoint),
          // gracefully fall back to the native unicode character so the
          // user never sees a broken-image icon.
          onError: (e: React.SyntheticEvent<HTMLImageElement>) => {
            const img = e.currentTarget;
            const span = document.createElement('span');
            span.textContent = native;
            img.replaceWith(span);
          },
        }),
      );
      i += matchLen;
    } else {
      buf += text.charAt(i);
      i++;
    }
  }

  if (buf) nodes.push(buf);
  return nodes;
}

// ─────────────────────────────────────────────────────────────────────────────
// React glue
// ─────────────────────────────────────────────────────────────────────────────

/**
 * React hook that returns true once the emoji map is ready. Triggers
 * `preloadAppleEmoji()` on mount so the chat starts loading data without
 * the consumer needing to call it explicitly.
 *
 * Use this in any chat root component so a re-render is scheduled the
 * moment the map flips from "loading" to "ready" — that's what causes
 * already-rendered messages to upgrade from native to Apple emojis.
 */
export function useAppleEmojiReady(): boolean {
  const [ready, setReady] = useState<boolean>(() => isAppleEmojiReady());

  useEffect(() => {
    if (isAppleEmojiReady()) {
      setReady(true);
      return;
    }
    // Kick off the load + subscribe to readiness in one go.
    preloadAppleEmoji();
    const unsub = onAppleEmojiReady(() => setReady(true));
    return unsub;
  }, []);

  return ready;
}
