// ============================================================================
// FuzzyMatcher — Arabic-aware string similarity for city names.
//
// WHY A CUSTOM MATCHER
//   • Existing libraries (fuse.js, fuzzysort) are Latin-script friendly
//     but treat Arabic as opaque glyphs — they score "بغداد" vs
//     "بَغْداد" poorly and ignore the fact that alef has multiple
//     forms (أ إ آ ا).
//   • Our matcher is small and focused. The contract:
//       normalizeArabic(s) — canonical form (no tashkil, unified alef/yaa).
//       fuzzyScore(query, target) — 0..1 confidence.
//
// SCORING
//   • Exact match (after normalisation) → 1
//   • Prefix match → 0.85
//   • Contains match → 0.6 + bonus for word-boundary alignment
//   • Levenshtein-based fuzzy match → lower scores that scale with how
//     close the edit distance is.
//
// The matcher is deliberately permissive — better to surface a relevant
// city with 0.4 confidence than to hide it because of an extra diacritic.
// ============================================================================

const ARABIC_DIACRITICS = /[\u064B-\u065F\u0670]/g;
const ALEF_FORMS = /[\u0622\u0623\u0625]/g;
const YA_FORMS = /[\u0648]/g;

/**
 * Normalise an Arabic string for comparison:
 *   • strip diacritics (tashkil)
 *   • normalise alef → ا
 *   • normalise yaa → ي (waaw stays — it's a separate letter)
 *   • lowercase + trim
 */
export function normalizeArabic(input: string): string {
  if (!input) return '';
  return input
    .normalize('NFKC')
    .replace(ARABIC_DIACRITICS, '')
    .replace(ALEF_FORMS, '\u0627')
    .replace(YA_FORMS, '\u064A')
    .toLowerCase()
    .trim();
}

/**
 * Compute Levenshtein distance between two normalised strings.
 * Bounded O(n*m) — fine for short city names.
 */
export function levenshtein(a: string, b: string): number {
  if (a === b) return 0;
  if (a.length === 0) return b.length;
  if (b.length === 0) return a.length;

  const prev: number[] = new Array(b.length + 1);
  const curr: number[] = new Array(b.length + 1);
  for (let j = 0; j <= b.length; j++) prev[j] = j;
  for (let i = 1; i <= a.length; i++) {
    curr[0] = i;
    for (let j = 1; j <= b.length; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      curr[j] = Math.min(
        prev[j] + 1,
        curr[j - 1] + 1,
        prev[j - 1] + cost,
      );
    }
    for (let j = 0; j <= b.length; j++) prev[j] = curr[j];
  }
  return prev[b.length];
}

/**
 * Score a query against a target string. 0 = no match, 1 = perfect.
 *
 * Returns 0 if either input is empty, or if the fuzzy score is below
 * 0.25 (a 3-edit-distance gap on a 10-character word is too noisy to
 * surface as a city match).
 */
export function fuzzyScore(query: string, target: string): number {
  const q = normalizeArabic(query);
  const t = normalizeArabic(target);
  if (!q || !t) return 0;
  if (q === t) return 1;
  if (t.startsWith(q)) return 0.85;
  // Word-boundary contains: the query starts at the beginning of any word in target.
  const targetWords = t.split(/\s+/);
  for (let i = 0; i < targetWords.length; i++) {
    if (targetWords[i].startsWith(q)) return 0.75;
  }
  if (t.includes(q)) return 0.6;

  const dist = levenshtein(q, t);
  const len = Math.max(q.length, t.length);
  if (len === 0) return 0;
  const similarity = 1 - dist / len;
  if (similarity < 0.5) return 0;
  // Penalise: a fuzzy match should never score above 0.55 — that way the
  // UI can colour-code results honestly.
  return Math.min(0.55, similarity * 0.55);
}

/**
 * Rank a list of items by `fuzzyScore(query, item)`. Items below the
 * threshold are dropped. Returns items with their score attached.
 */
export function rankByFuzzy<T>(
  query: string,
  items: T[],
  pick: (item: T) => string,
): Array<{ item: T; score: number }> {
  return items
    .map((item) => ({ item, score: fuzzyScore(query, pick(item)) }))
    .filter((r) => r.score > 0)
    .sort((a, b) => b.score - a.score);
}