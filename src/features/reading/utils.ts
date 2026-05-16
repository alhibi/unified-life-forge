/** Pure utility helpers — no React, no DOM. */

/** Relative-time string like "2h ago" / "منذ ساعتين". */
export function timeAgo(dateStr: string, lang: string): string {
  if (!dateStr) return '';
  const isAr = lang === 'ar';
  try {
    const date = new Date(dateStr);
    if (Number.isNaN(date.getTime())) return '';
    const diffMs = Date.now() - date.getTime();
    const diffMin = Math.floor(diffMs / 60_000);
    if (diffMin < 1) return isAr ? 'الآن' : 'now';
    if (diffMin < 60) return isAr ? `منذ ${diffMin} د` : `${diffMin}m ago`;
    const diffHr = Math.floor(diffMin / 60);
    if (diffHr < 24) return isAr ? `منذ ${diffHr} س` : `${diffHr}h ago`;
    const diffDay = Math.floor(diffHr / 24);
    if (diffDay < 30) return isAr ? `منذ ${diffDay} ي` : `${diffDay}d ago`;
    const diffMo = Math.floor(diffDay / 30);
    return isAr ? `منذ ${diffMo} شهر` : `${diffMo}mo ago`;
  } catch { return ''; }
}

/** Locale-aware long date format. */
export function formatDate(dateStr: string, lang: string): string {
  if (!dateStr) return '';
  try {
    const date = new Date(dateStr);
    if (Number.isNaN(date.getTime())) return dateStr;
    return date.toLocaleDateString(
      lang === 'ar' ? 'ar' : 'en-US',
      {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      },
    );
  } catch { return dateStr; }
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
export function readingMinutes(text: string, lang: string): number {
  const plain = stripHtml(text);
  if (!plain) return 1;
  // Count tokens by whitespace; for Arabic this is words, for English same.
  const words = plain.split(/\s+/).filter(Boolean).length;
  const wpm = lang === 'ar' ? 180 : 220;
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
