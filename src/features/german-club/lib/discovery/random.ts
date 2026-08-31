import { GERMAN_DICTIONARY_DATA } from '../dictionaryData';
import type { DictionaryEntry } from '../../types';

/**
 * Random Discovery — pick a random entry, or a "related" entry near one
 * the user already saw. Designed to make browsing feel like wandering,
 * not consuming a queue.
 *
 * Relationship is shallow but well-curated:
 *   - exact shared word_type
 *   - close CEFR level
 *   - shared category
 *   - any synonyms / antonyms intersection (rare but valuable)
 */

export type DiscoveryReason =
  | 'fresh'           // pure random, no history
  | 'same-category'   // random within same category as last seed
  | 'same-level'      // random within same CEFR level as last seed
  | 'synonym'         // random from synonyms of last seed
  | 'antonym'         // random from antonyms of last seed
  | 'mixed';          // default — variety bias

export interface DiscoveryResult {
  entry: DictionaryEntry;
  reason: DiscoveryReason;
}

/** Build an index by id for synonym/antonym lookup. */
const ID_INDEX: Map<string, DictionaryEntry> = new Map(
  GERMAN_DICTIONARY_DATA.map((e) => [e.id, e])
);

/**
 * Pick a single random entry, with an optional bias toward the last seed.
 *
 * @param lastSeedId   - the id of the last entry shown (or null for the first call)
 * @param opts         - exclude certain categories (e.g. too easy, too hard)
 * @returns            - the chosen entry + the reason it was chosen
 */
export function discoverRandom(
  lastSeedId: string | null,
  opts?: { excludeCategories?: string[] },
): DiscoveryResult | null {
  const pool = opts?.excludeCategories?.length
    ? GERMAN_DICTIONARY_DATA.filter((e) => !opts.excludeCategories!.includes(e.category))
    : GERMAN_DICTIONARY_DATA;

  if (pool.length === 0) return null;

  const lastSeed = lastSeedId ? ID_INDEX.get(lastSeedId) : null;

  // 1) If we have a seed with synonyms, 30% chance to jump there
  if (lastSeed?.synonyms?.length) {
    const synonymIds = lastSeed.synonyms
      .map((g) => pool.find((e) => e.german.toLowerCase() === g.toLowerCase())?.id)
      .filter((id): id is string => Boolean(id));
    if (synonymIds.length > 0 && Math.random() < 0.3) {
      const id = synonymIds[Math.floor(Math.random() * synonymIds.length)];
      const entry = ID_INDEX.get(id);
      if (entry) return { entry, reason: 'synonym' };
    }
  }

  // 2) Same CEFR level — 25% chance
  if (lastSeed && Math.random() < 0.25) {
    const sameLevel = pool.filter((e) => e.cefr === lastSeed.cefr);
    if (sameLevel.length > 0) {
      const entry = sameLevel[Math.floor(Math.random() * sameLevel.length)];
      return { entry, reason: 'same-level' };
    }
  }

  // 3) Same category — 25% chance
  if (lastSeed && Math.random() < 0.25) {
    const sameCat = pool.filter((e) => e.category === lastSeed.category);
    if (sameCat.length > 0) {
      const entry = sameCat[Math.floor(Math.random() * sameCat.length)];
      return { entry, reason: 'same-category' };
    }
  }

  // 4) Antonym — 5% chance (rare, but delightful when found)
  if (lastSeed?.antonyms?.length && Math.random() < 0.05) {
    const antIds = lastSeed.antonyms
      .map((g) => pool.find((e) => e.german.toLowerCase() === g.toLowerCase())?.id)
      .filter((id): id is string => Boolean(id));
    if (antIds.length > 0) {
      const id = antIds[Math.floor(Math.random() * antIds.length)];
      const entry = ID_INDEX.get(id);
      if (entry) return { entry, reason: 'antonym' };
    }
  }

  // 5) Pure random — fallback (also the first-call path)
  const entry = pool[Math.floor(Math.random() * pool.length)];
  return { entry, reason: lastSeed ? 'mixed' : 'fresh' };
}

/** Pick N distinct random entries. */
export function discoverMany(count: number, excludeCategories?: string[]): DiscoveryEntry[] {
  const seen = new Set<string>();
  const out: DiscoveryEntry[] = [];
  let attempts = 0;
  while (out.length < count && attempts < count * 5) {
    const r = discoverRandom(null, { excludeCategories });
    if (r && !seen.has(r.entry.id)) {
      seen.add(r.entry.id);
      out.push(r.entry);
    }
    attempts++;
  }
  return out;
}

export type DiscoveryEntry = DictionaryEntry;