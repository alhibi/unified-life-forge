import { GERMAN_DICTIONARY_DATA } from '../dictionaryData';
import type { DictionaryEntry } from '../../types';

/**
 * Der Wortspaziergang — "the word walk" — a 7-step wandering journey.
 *
 * Each step is one entry, chosen so the sequence feels like walking
 * through related neighborhoods rather than jumping randomly.
 *
 * Strategy
 * ────────
 * 1. Pick a seed entry (curated mix of interesting + beginner-friendly).
 * 2. Step 1: the seed itself.
 * 3. Step 2: random entry in the same category as seed.
 * 4. Step 3: random entry in the same CEFR + different category.
 * 5. Step 4: random entry with synonyms of seed's primary word.
 * 6. Step 5: random entry with antonym of seed's primary word (if any).
 * 7. Step 6: random entry from the daily Wort pool.
 * 8. Step 7: random entry that connects the loop back (shares a tag).
 */

const SPUR_LENGTH = 7;

export interface SpaziergangStop {
  step: number;          // 1..7
  entry: DictionaryEntry;
  reason: string;        // human-readable reason in Arabic
  emoji: string;
}

const REASON_TEMPLATES_AR: Record<string, string> = {
  'seed': 'نقطة البداية',
  'same-category': 'من نفس العالم',
  'new-category': 'قفز إلى عالم جديد',
  'synonym': 'مرادف يضيء المعنى',
  'antonym': 'عكس يوضح الفرق',
  'daily-wort': 'كلمة اليوم',
  'bridge': 'جسر بين عالمين',
};

/**
 * Build a 7-stop Wortspaziergang starting from a seed (or pick one if null).
 * Always returns 7 distinct entries.
 */
export function buildSpaziergang(seedEntryId: string | null = null): SpaziergangStop[] {
  if (GERMAN_DICTIONARY_DATA.length === 0) return [];

  // Pick seed: prefer A1/A2 entries with rich examples, but ensure we always have one
  const seed = seedEntryId
    ? GERMAN_DICTIONARY_DATA.find((e) => e.id === seedEntryId) ?? pickSeed()
    : pickSeed();

  const stops: SpaziergangStop[] = [];
  const usedIds = new Set<string>();

  // Stop 1: the seed
  stops.push(makeStop(1, seed, 'seed'));
  usedIds.add(seed.id);

  // Stop 2: same category
  const s2 = pickDistinct(
    GERMAN_DICTIONARY_DATA.filter((e) => e.id !== seed.id && e.category === seed.category),
    usedIds,
  );
  if (s2) {
    stops.push(makeStop(2, s2, 'same-category'));
    usedIds.add(s2.id);
  }

  // Stop 3: new category, same CEFR
  const s3 = pickDistinct(
    GERMAN_DICTIONARY_DATA.filter(
      (e) => e.id !== seed.id && e.category !== seed.category && e.cefr === seed.cefr,
    ),
    usedIds,
  );
  if (s3) {
    stops.push(makeStop(3, s3, 'new-category'));
    usedIds.add(s3.id);
  }

  // Stop 4: synonym
  if (seed.synonyms?.length) {
    const s4 = pickDistinct(
      GERMAN_DICTIONARY_DATA.filter((e) => seed.synonyms!.some((s) => s.toLowerCase() === e.german.toLowerCase())),
      usedIds,
    );
    if (s4) {
      stops.push(makeStop(4, s4, 'synonym'));
      usedIds.add(s4.id);
    }
  }

  // Stop 5: antonym
  if (seed.antonyms?.length) {
    const s5 = pickDistinct(
      GERMAN_DICTIONARY_DATA.filter((e) => seed.antonyms!.some((a) => a.toLowerCase() === e.german.toLowerCase())),
      usedIds,
    );
    if (s5) {
      stops.push(makeStop(5, s5, 'antonym'));
      usedIds.add(s5.id);
    }
  }

  // Stop 6: bridge — share at least one tag with stop 2 or stop 3
  const bridge = stops[1] || stops[2];
  if (bridge) {
    const tagSet = new Set((bridge.entry.tags ?? []).map((t) => t.toLowerCase()));
    const s6 = pickDistinct(
      GERMAN_DICTIONARY_DATA.filter(
        (e) =>
          e.id !== seed.id &&
          (e.tags ?? []).some((t) => tagSet.has(t.toLowerCase())),
      ),
      usedIds,
    );
    if (s6) {
      stops.push(makeStop(6, s6, 'bridge'));
      usedIds.add(s6.id);
    }
  }

  // Stop 7: pure random fill (if we haven't reached 7 yet)
  while (stops.length < SPUR_LENGTH) {
    const s7 = pickDistinct(GERMAN_DICTIONARY_DATA, usedIds);
    if (!s7) break;
    stops.push(makeStop(stops.length + 1, s7, 'daily-wort'));
    usedIds.add(s7.id);
  }

  // Renumber so steps are always 1..N
  return stops.map((s, i) => ({ ...s, step: i + 1 }));
}

function pickSeed(): DictionaryEntry {
  // Prefer a beginner-friendly entry with rich examples for a good first stop
  const candidates = GERMAN_DICTIONARY_DATA.filter(
    (e) => (e.cefr === 'A1' || e.cefr === 'A2') && e.examples.length >= 1,
  );
  const pool = candidates.length > 0 ? candidates : GERMAN_DICTIONARY_DATA;
  return pool[Math.floor(Math.random() * pool.length)];
}

function pickDistinct(
  pool: DictionaryEntry[],
  usedIds: Set<string>,
): DictionaryEntry | null {
  const filtered = pool.filter((e) => !usedIds.has(e.id));
  if (filtered.length === 0) return null;
  return filtered[Math.floor(Math.random() * filtered.length)];
}

function makeStop(step: number, entry: DictionaryEntry, reason: string): SpaziergangStop {
  const EMOJIS: Record<string, string> = {
    'seed': '🌱',
    'same-category': '🗂',
    'new-category': '🌍',
    'synonym': '🪞',
    'antonym': '🔁',
    'daily-wort': '✨',
    'bridge': '🌉',
  };
  return {
    step,
    entry,
    reason: REASON_TEMPLATES_AR[reason] ?? reason,
    emoji: EMOJIS[reason] ?? '•',
  };
}

export const SPAZIERGANG_LENGTH = SPUR_LENGTH;