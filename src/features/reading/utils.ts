/** Pure utility helpers — no React, no DOM. */

/**
 * Defence-in-depth: only allow http(s) URLs as anchor `href` values.
 * Untrusted RSS feeds could supply `javascript:` or `data:` URLs that
 * would execute in our origin when clicked. Anything else collapses
 * to "#" so the link becomes a no-op.
 */
export function safeHref(url: string | null | undefined): string {
  if (!url) return '#';
  return /^https?:\/\//i.test(url.trim()) ? url : '#';
}

/**
 * Relative-time string like "2h ago" / "منذ ساعتين".
 *
 * Robust against clock-skewed feeds: a date 30 seconds in the *future*
 * (which can happen when a publisher's clock is slightly ahead) clamps
 * to "now" instead of rendering as "منذ -1 شهر". For dates further in
 * the future we render "in 2h" / "بعد ٢س" rather than the absurd
 * negative-month string the previous implementation produced.
 */
export function timeAgo(dateStr: string, _lang: string): string {
  if (!dateStr) return '';
  try {
    const date = new Date(dateStr);
    if (Number.isNaN(date.getTime())) return '';
    const diffMs = Date.now() - date.getTime();
    const future = diffMs < 0;
    // Clamp tiny clock skew (≤ 60s) to "now" so a publisher whose
    // server is 30 seconds ahead doesn't show "in 30 seconds".
    if (Math.abs(diffMs) < 60_000) return 'الآن';
    const abs = Math.abs(diffMs);
    const min = Math.floor(abs / 60_000);
    if (min < 60) {
      return future
        ? (`بعد ${min} د`)
        : (`منذ ${min} د`);
    }
    const hr = Math.floor(min / 60);
    if (hr < 24) {
      return future
        ? (`بعد ${hr} س`)
        : (`منذ ${hr} س`);
    }
    const day = Math.floor(hr / 24);
    if (day < 30) {
      return future
        ? (`بعد ${day} ي`)
        : (`منذ ${day} ي`);
    }
    const mo = Math.floor(day / 30);
    if (mo < 12) {
      return future
        ? (`بعد ${mo} شهر`)
        : (`منذ ${mo} شهر`);
    }
    const yr = Math.floor(day / 365);
    return future
      ? (`بعد ${yr} سنة`)
      : (`منذ ${yr} سنة`);
  } catch { return ''; }
}

/** Locale-aware long date format. */
export function formatDate(dateStr: string, _lang: string): string {
  if (!dateStr) return '';
  try {
    const date = new Date(dateStr);
    if (Number.isNaN(date.getTime())) return '';
    return date.toLocaleDateString(
      'ar',
      {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      },
    );
  } catch { return ''; }
}

/** Strip HTML tags for plain-text length / preview computations. */
export function stripHtml(html: string): string {
  if (!html) return '';
  return html.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
}

/**
 * Estimate reading time. Arabic averages ~ 180 wpm, English ~ 220 wpm.
 * For mixed scripts we pick the slower of the two so we never undersell
 * the time. Returns whole minutes (minimum 1).
 */
export function readingMinutes(text: string, _lang: string): number {
  const plain = stripHtml(text);
  if (!plain) return 1;
  // Count tokens by whitespace; for Arabic this is words, for English same.
  const words = plain.split(/\s+/).filter(Boolean).length;
  const wpm = 180;
  return Math.max(1, Math.round(words / wpm));
}

/**
 * Build a short, deterministic source pill (first character of the
 * first significant word). Cheap visual identity per feed.
 */
export function sourceInitial(name: string): string {
  if (!name) return '?';
  const trimmed = name.trim();
  // Take the first non-whitespace character
  const ch = trimmed.codePointAt(0);
  return ch ? String.fromCodePoint(ch) : '?';
}

/**
 * A 32-bit hash of a string. We use this to derive a stable hue for
 * each source pill without storing colors anywhere.
 */
export function hashHue(input: string): number {
  let hash = 0;
  for (let i = 0; i < input.length; i++) {
    hash = (hash * 31 + input.charCodeAt(i)) | 0;
  }
  return Math.abs(hash) % 360;
}

/**
 * Throttle helper — run `fn` at most once every `wait` ms. The trailing
 * call (if one was suppressed during the wait window) fires after the
 * cooldown so the final state is never lost. Used by the article-list
 * scroll handler so dragging a long list doesn't write 60 localStorage
 * entries per second.
 */
export function throttle<Args extends unknown[]>(
  fn: (...args: Args) => void,
  wait: number,
): (...args: Args) => void {
  let last = 0;
  let pending: ReturnType<typeof setTimeout> | null = null;
  let pendingArgs: Args | null = null;
  return (...args: Args) => {
    const now = Date.now();
    const remaining = wait - (now - last);
    if (remaining <= 0) {
      last = now;
      fn(...args);
    } else {
      pendingArgs = args;
      if (!pending) {
        pending = setTimeout(() => {
          last = Date.now();
          pending = null;
          if (pendingArgs) {
            fn(...pendingArgs);
            pendingArgs = null;
          }
        }, remaining);
      }
    }
  };
}
