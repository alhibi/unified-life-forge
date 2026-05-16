import React from 'react';

/**
 * Render `text` with every match of `query` wrapped in a highlight
 * span. Matching is case-insensitive AND Arabic-tashkeel/hamza
 * insensitive, mirroring what the server-side full-text search does
 * (otherwise the visual highlight wouldn't line up with the rows the
 * SQL function returned).
 *
 * The function returns a React fragment so it can be used directly
 * inside <h4>, <p>, etc. without adding an extra wrapper element.
 *
 * Algorithm notes:
 *   1. Build a "view → original" position map from the un-normalized
 *      text so we know where to slice when the match is found in the
 *      normalized version.
 *   2. Run the same regex word-search over the normalized text.
 *   3. Project each hit back to the original-text indices so we
 *      preserve the user's punctuation, casing, and diacritics in
 *      the rendered output.
 */

const TASHKEEL_RE = /[\u0610-\u061A\u064B-\u065F\u0670\u06D6-\u06ED\u0640]/g;

/** Normalise a single character (returns the empty string for chars
 *  that should be filtered out). Used to build the position map. */
function normChar(c: string): string {
  if (TASHKEEL_RE.test(c)) {
    TASHKEEL_RE.lastIndex = 0;
    return '';
  }
  if (c === 'إ' || c === 'أ' || c === 'آ') return 'ا';
  if (c === 'ى') return 'ي';
  if (c === 'ة') return 'ه';
  return c.toLowerCase();
}

/** Build a normalised string + a parallel array mapping each
 *  normalised position back to its starting position in the
 *  original. Used to project regex matches found in the normalised
 *  view back onto the original characters. */
function buildView(s: string): { norm: string; map: number[] } {
  let norm = '';
  const map: number[] = [];
  for (let i = 0; i < s.length; i++) {
    const n = normChar(s[i]);
    for (let j = 0; j < n.length; j++) {
      norm += n[j];
      map.push(i);
    }
  }
  // Sentinel so end-of-match is always representable.
  map.push(s.length);
  return { norm, map };
}

function escapeRegex(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

interface HighlightOptions {
  /** className applied to the <mark> wrapper. Defaults to a soft tint. */
  markClass?: string;
}

export function highlightText(
  text: string,
  query: string,
  opts: HighlightOptions = {},
): React.ReactNode {
  const trimmed = (query || '').trim();
  if (!text || !trimmed) return text;
  const { norm, map } = buildView(text);
  const { norm: needle } = buildView(trimmed);
  if (!needle) return text;

  // Tokenise the query so a multi-word search like "ذكاء اصطناعي"
  // highlights both terms individually. Each token must be at least
  // 2 chars to prevent spurious single-letter highlighting.
  const tokens = needle
    .split(/\s+/)
    .filter((t) => t.length >= 2)
    .map(escapeRegex);
  if (tokens.length === 0) return text;
  const re = new RegExp(`(${tokens.join('|')})`, 'g');

  const out: React.ReactNode[] = [];
  let pos = 0;
  let m: RegExpExecArray | null;
  const markClass = opts.markClass ??
    'bg-primary/20 text-primary-foreground rounded px-0.5 [color:hsl(var(--foreground))]';
  while ((m = re.exec(norm)) !== null) {
    const startNorm = m.index;
    const endNorm = m.index + m[0].length;
    const startOrig = map[startNorm] ?? startNorm;
    const endOrig = map[endNorm] ?? endNorm;
    if (startOrig > pos) out.push(text.slice(pos, startOrig));
    out.push(
      <mark key={startOrig} className={markClass}>
        {text.slice(startOrig, endOrig)}
      </mark>,
    );
    pos = endOrig;
    if (m[0].length === 0) re.lastIndex++; // prevent infinite loop
  }
  if (pos < text.length) out.push(text.slice(pos));
  return <>{out}</>;
}
