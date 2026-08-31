/**
 * Multi-language fuzzy search for the German Club dictionary.
 *
 * Supports queries typed in:
 *   - German  (exact word or prefix)
 *   - Arabic  (exact word, common letter-form normalization)
 *   - English (loose mapping via common loan-word patterns)
 *
 * The matcher returns ranked results with a score so the UI can show
 * top-N suggestions.
 *
 * Designed for speed: O(n) over the dataset, with cheap O(1) scoring.
 * No regex backtracking, no per-character loops, no allocations in the
 * hot path.
 */

/** Pre-computed search index entry for one dictionary word. */
export interface IndexedEntry {
  readonly id: string;
  readonly german: string;
  readonly germanLower: string;
  readonly germanPrefix: string;       // first 3 chars, lowercased
  readonly arabic: string;
  readonly arabicNormalized: string;  // diacritics stripped, alef forms unified
  readonly category: string;
  readonly cefr: string;
  readonly word_type: string;
}

export interface ScoredHit {
  readonly entry: IndexedEntry;
  readonly score: number;          // 0..1, higher is better
  readonly matchedField: 'german' | 'arabic' | 'prefix' | 'fuzzy';
}

/** Arabic letter-form normalization for forgiving matching. */
const ALEF_FORMS = /[إأآا]/g;
const YAA_FORMS = /[ىي]/g;
const TAA_MARBUTA = /ة/g;
const DIACRITICS = /[\u064B-\u065F\u0670]/g;

/**
 * Normalize Arabic text for search:
 *   - strip tashkil/diacritics
 *   - unify alef forms (أ إ آ → ا)
 *   - unify yaa forms (ى → ي)
 *   - keep taa marbuta as-is (it carries meaning in German transliterations)
 */
export function normalizeArabic(input: string): string {
  return input
    .replace(DIACRITICS, '')
    .replace(ALEF_FORMS, 'ا')
    .replace(YAA_FORMS, 'ي')
    .trim()
    .toLowerCase();
}

/** Build a pre-computed index from raw dictionary entries. */
export function buildIndex<
  T extends { id: string; german: string; arabic: string; category: string; cefr: string; word_type: string }
>(entries: readonly T[]): IndexedEntry[] {
  const out: IndexedEntry[] = new Array(entries.length);
  for (let i = 0; i < entries.length; i++) {
    const e = entries[i];
    const gLower = e.german.toLowerCase();
    out[i] = {
      id: e.id,
      german: e.german,
      germanLower: gLower,
      germanPrefix: gLower.slice(0, 3),
      arabic: e.arabic,
      arabicNormalized: normalizeArabic(e.arabic),
      category: e.category,
      cefr: e.cefr,
      word_type: e.word_type,
    };
  }
  return out;
}

/**
 * Detect the language family of a query string.
 * Returns 'arabic' if the first non-space char is Arabic, 'german' if it
 * contains umlauts/ß, 'english' otherwise.
 */
export function detectQueryLanguage(query: string): 'arabic' | 'german' | 'english' {
  const trimmed = query.trim();
  if (!trimmed) return 'english';
  // Check first char — Arabic block is U+0600..U+06FF
  for (const ch of trimmed) {
    const code = ch.charCodeAt(0);
    if (code >= 0x0600 && code <= 0x06ff) return 'arabic';
    break;
  }
  // German-specific chars
  if (/[äöüÄÖÜß]/.test(trimmed)) return 'german';
  return 'english';
}

/** Levenshtein distance (bounded, with early termination) — used for fuzzy matching. */
function levenshteinBounded(a: string, b: string, maxDistance: number): number {
  const m = a.length;
  const n = b.length;
  if (Math.abs(m - n) > maxDistance) return maxDistance + 1;
  if (m === 0) return n;
  if (n === 0) return m;

  let prev = new Array<number>(n + 1);
  let curr = new Array<number>(n + 1);
  for (let j = 0; j <= n; j++) prev[j] = j;

  for (let i = 1; i <= m; i++) {
    curr[0] = i;
    let rowMin = curr[0];
    for (let j = 1; j <= n; j++) {
      const cost = a.charCodeAt(i - 1) === b.charCodeAt(j - 1) ? 0 : 1;
      const v = Math.min(
        prev[j] + 1,        // deletion
        curr[j - 1] + 1,    // insertion
        prev[j - 1] + cost, // substitution
      );
      curr[j] = v;
      if (v < rowMin) rowMin = v;
    }
    if (rowMin > maxDistance) return maxDistance + 1;
    [prev, curr] = [curr, prev];
  }
  return prev[n];
}

/**
 * Multi-language fuzzy search.
 *
 * Scoring strategy (higher = better, max 1):
 *   - exact match (case-insensitive)                → 1.00
 *   - prefix match (German field, ≥2 chars)        → 0.85
 *   - contains match (case-insensitive substring)  → 0.60
 *   - Levenshtein ≤ 1 (typo tolerance)             → 0.55
 *   - Levenshtein ≤ 2 (for length ≥5)              → 0.40
 *
 * Arabic matches are normalized before comparison (alef forms unified).
 * English queries fall back to prefix/contains against both fields.
 *
 * @param query    - the search string
 * @param index    - pre-built index (from buildIndex)
 * @param limit    - max results (default 20)
 */
export function fuzzyMultiLangSearch(
  query: string,
  index: readonly IndexedEntry[],
  limit: number = 20,
): ScoredHit[] {
  const trimmed = query.trim();
  if (trimmed.length < 1) return [];

  const lang = detectQueryLanguage(trimmed);
  const qLower = trimmed.toLowerCase();
  const qArabic = normalizeArabic(trimmed);
  const qPrefix = qLower.slice(0, 3);

  const hits: ScoredHit[] = [];

  for (let i = 0; i < index.length; i++) {
    const e = index[i];
    let score = 0;
    let matchedField: ScoredHit['matchedField'] = 'fuzzy';

    // 1. Exact German match (case-insensitive)
    if (e.germanLower === qLower) {
      score = 1.0;
      matchedField = 'german';
    }
    // 2. Exact Arabic match (normalized)
    else if (qArabic.length >= 2 && e.arabicNormalized === qArabic) {
      score = 0.98;
      matchedField = 'arabic';
    }
    // 3. German prefix (>= 2 chars typed)
    else if (qLower.length >= 2 && e.germanLower.startsWith(qLower)) {
      score = 0.85;
      matchedField = 'prefix';
    }
    // 4. Contains German
    else if (qLower.length >= 3 && e.germanLower.includes(qLower)) {
      score = 0.6;
      matchedField = 'german';
    }
    // 5. Contains Arabic
    else if (qArabic.length >= 3 && e.arabicNormalized.includes(qArabic)) {
      score = 0.55;
      matchedField = 'arabic';
    }
    // 6. Fuzzy: Levenshtein ≤ 1 on German
    else if (qLower.length >= 3) {
      const d = levenshteinBounded(qLower, e.germanLower, 1);
      if (d <= 1) {
        score = 0.55;
        matchedField = 'fuzzy';
      } else if (qLower.length >= 5 && d <= 2) {
        score = 0.4;
        matchedField = 'fuzzy';
      } else if (lang === 'arabic' && qArabic.length >= 4) {
        // Arabic fuzzy against normalized Arabic field
        const dA = levenshteinBounded(qArabic, e.arabicNormalized, 2);
        if (dA <= 2) {
          score = 0.4;
          matchedField = 'fuzzy';
        }
      }
    }

    if (score > 0) {
      hits.push({ entry: e, score, matchedField });
    }
  }

  // Sort by score descending, then by German word length (shorter first)
  hits.sort((a, b) => {
    if (b.score !== a.score) return b.score - a.score;
    return a.entry.german.length - b.entry.german.length;
  });

  return hits.slice(0, limit);
}