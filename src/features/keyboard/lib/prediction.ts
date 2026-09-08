/**
 * Prediction, learning and auto-correction engine for the in-app keyboard.
 *
 * Designed for long, intensive, repetitive typing:
 *
 *  • Every accepted word is learned with a *frequency count*, not just an
 *    "have I seen it" flag, so the words a person actually types keep floating
 *    to the front of the bar over weeks of use.
 *  • Word pairs are learned too (a first-order Markov chain), so after a space
 *    the bar predicts the next word from the previous one instead of showing a
 *    static greeting list.
 *  • Matching is done on a *normalised* form (diacritics stripped, alef/ya/ta
 *    marbuta unified), which is what makes Arabic prediction actually usable:
 *    typing "احمد" or "الس" finds "أحمد" and "السلام".
 *  • Counts decay slowly on write, so a burst of one-off words cannot
 *    permanently poison the dictionary.
 *
 * Storage is a single compact JSON blob, capped, with a memory fallback for
 * private browsing.
 */

const STORE_KEY = 'smarthub:soft-keyboard-dictionary-v3';
/** Pre-v3 store: a flat array of learned words. Migrated on first read. */
const LEGACY_DICT_KEY = 'smarthub:soft-keyboard-user-dict';

const MAX_WORDS = 1200;
const MAX_PAIRS = 2000;
/** Writes between decay passes, and the factor applied when one runs. */
const DECAY_EVERY = 400;
const DECAY_FACTOR = 0.85;

interface LearnedStore {
  /** normalisedWord → { s: surface form actually typed, c: count } */
  words: Record<string, { s: string; c: number }>;
  /** `${normPrev}\u0000${normNext}` → { s: next surface form, c: count } */
  pairs: Record<string, { s: string; c: number }>;
  /** Writes since the last decay pass. */
  w: number;
}

const emptyStore = (): LearnedStore => ({ words: {}, pairs: {}, w: 0 });

let cache: LearnedStore | null = null;

/* ────────────────────────── normalisation ────────────────────────── */

const DIACRITICS = /[\u0610-\u061A\u064B-\u065F\u0670\u06D6-\u06ED\u0640]/g;

/**
 * Folds a token to its match key: no diacritics/tatweel, unified hamza forms,
 * ya/alef-maqsura and ta-marbuta merged, lowercase for Latin.
 */
export function normalizeToken(token: string): string {
  return token
    .replace(DIACRITICS, '')
    .replace(/[\u0622\u0623\u0625\u0627\u0671]/g, '\u0627')
    .replace(/\u0649/g, '\u064A')
    .replace(/\u0629/g, '\u0647')
    .replace(/[\u0624\u0626]/g, '\u0621')
    .toLowerCase()
    .trim();
}

/** True for a token made only of letters (Arabic or Latin) — worth learning. */
function isLearnable(token: string): boolean {
  return token.length >= 2 && /^[\p{L}\u0640'\u2019-]+$/u.test(token);
}

/* ────────────────────────── persistence ────────────────────────── */

function readStore(): LearnedStore {
  if (cache) return cache;
  if (typeof localStorage !== 'undefined') {
    try {
      const raw = localStorage.getItem(STORE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw) as Partial<LearnedStore>;
        if (parsed && typeof parsed === 'object') {
          cache = {
            words: parsed.words && typeof parsed.words === 'object' ? parsed.words : {},
            pairs: parsed.pairs && typeof parsed.pairs === 'object' ? parsed.pairs : {},
            w: typeof parsed.w === 'number' ? parsed.w : 0,
          };
          return cache;
        }
      }
      // Migrate the flat pre-v3 list so nobody loses their vocabulary.
      const legacy = localStorage.getItem(LEGACY_DICT_KEY);
      if (legacy) {
        const list = JSON.parse(legacy) as unknown;
        if (Array.isArray(list)) {
          const store = emptyStore();
          for (const item of list) {
            if (typeof item !== 'string') continue;
            const key = normalizeToken(item);
            if (key) store.words[key] = { s: item, c: 2 };
          }
          cache = store;
          writeStore();
          return cache;
        }
      }
    } catch {
      /* corrupt payload — start clean rather than throwing on every keystroke */
    }
  }
  cache = emptyStore();
  return cache;
}

/** Trims the weakest entries so the store can never grow without bound. */
function prune(store: LearnedStore): void {
  const trim = (bag: Record<string, { s: string; c: number }>, max: number) => {
    const keys = Object.keys(bag);
    if (keys.length <= max) return;
    keys
      .sort((a, b) => bag[a].c - bag[b].c)
      .slice(0, keys.length - max)
      .forEach((k) => delete bag[k]);
  };
  trim(store.words, MAX_WORDS);
  trim(store.pairs, MAX_PAIRS);
}

function writeStore(): void {
  const store = readStore();
  store.w += 1;
  if (store.w >= DECAY_EVERY) {
    store.w = 0;
    for (const bag of [store.words, store.pairs]) {
      for (const key of Object.keys(bag)) {
        const next = bag[key].c * DECAY_FACTOR;
        if (next < 0.4) delete bag[key];
        else bag[key].c = Math.round(next * 100) / 100;
      }
    }
  }
  prune(store);
  if (typeof localStorage !== 'undefined') {
    try {
      localStorage.setItem(STORE_KEY, JSON.stringify(store));
    } catch {
      /* quota or private mode: the in-memory cache still serves this session */
    }
  }
}

/** Drops the in-memory cache (used by the sign-out sweep and by tests). */
export function clearPredictionRuntimeCache(): void {
  cache = null;
}

/** Wipes everything the keyboard has learned about this user. */
export function clearLearnedDictionary(): void {
  cache = emptyStore();
  if (typeof localStorage !== 'undefined') {
    try {
      localStorage.removeItem(STORE_KEY);
      localStorage.removeItem(LEGACY_DICT_KEY);
    } catch {
      /* ignore */
    }
  }
}

/** Removes one learned word (long-press on a suggestion chip). */
export function forgetLearnedWord(word: string): void {
  const key = normalizeToken(word);
  if (!key) return;
  const store = readStore();
  delete store.words[key];
  for (const pair of Object.keys(store.pairs)) {
    if (pair.endsWith(`\u0000${key}`) || pair.startsWith(`${key}\u0000`)) delete store.pairs[pair];
  }
  writeStore();
}

/** Learned vocabulary, strongest first. */
export function getLearnedWords(): string[] {
  const { words } = readStore();
  return Object.keys(words)
    .sort((a, b) => words[b].c - words[a].c)
    .map((k) => words[k].s);
}

export function getDictionaryStats(): { words: number; pairs: number } {
  const store = readStore();
  return { words: Object.keys(store.words).length, pairs: Object.keys(store.pairs).length };
}

/* ────────────────────────── learning ────────────────────────── */

/** Records one accepted word, optionally with the word that preceded it. */
export function learnWord(word: string, previous?: string | null): void {
  const surface = word.trim();
  if (!isLearnable(surface)) return;
  const key = normalizeToken(surface);
  if (!key) return;

  const store = readStore();
  const entry = store.words[key];
  store.words[key] = { s: surface, c: entry ? entry.c + 1 : 1 };

  const prevKey = previous ? normalizeToken(previous) : '';
  if (prevKey && prevKey !== key) {
    const pairKey = `${prevKey}\u0000${key}`;
    const pair = store.pairs[pairKey];
    store.pairs[pairKey] = { s: surface, c: pair ? pair.c + 1 : 1 };
  }
  writeStore();
}

/** Learns a whole phrase at once (used when a snippet or suggestion lands). */
export function learnPhrase(phrase: string): void {
  const tokens = phrase.split(/\s+/).filter(Boolean);
  for (let i = 0; i < tokens.length; i += 1) learnWord(tokens[i], tokens[i - 1] ?? null);
}

/* ────────────────────────── seed data ────────────────────────── */

/** Curated high-frequency Arabic vocabulary with editorial weights. */
const SEED_WORDS: Array<[string, number]> = [
  ['السلام', 9], ['عليكم', 8], ['ورحمة', 6], ['الله', 10], ['وبركاته', 6],
  ['شكراً', 9], ['جزيلاً', 5], ['مرحباً', 8], ['كيف', 8], ['حالك', 7],
  ['صباح', 7], ['الخير', 8], ['النور', 5], ['مساء', 7], ['الحمد', 8], ['لله', 8],
  ['أستغفر', 5], ['سبحان', 6], ['تبارك', 4], ['تعالى', 4], ['الكريم', 5],
  ['العظيم', 5], ['جميل', 6], ['رائع', 6], ['ممتاز', 6], ['بالتأكيد', 5],
  ['إن', 8], ['شاء', 7], ['جزاك', 6], ['خيراً', 7], ['بارك', 6], ['فيك', 6],
  ['مع', 8], ['السلامة', 6], ['أهلاً', 7], ['وسهلاً', 5], ['اليوم', 7],
  ['غداً', 6], ['الآن', 7], ['بعد', 7], ['قبل', 6], ['أرجو', 5], ['ممكن', 6],
  ['تمام', 7], ['حسناً', 6], ['طبعاً', 6], ['ربما', 5], ['أيضاً', 6],
  ['لكن', 6], ['لأن', 6], ['حتى', 6], ['عندما', 5], ['الذي', 6], ['التي', 6],
  ['موعد', 5], ['رسالة', 5], ['ملاحظة', 5], ['تذكير', 5], ['اجتماع', 5],
  ['العمل', 6], ['البيت', 6], ['الصلاة', 7], ['الصباح', 6], ['المساء', 6],
  ['أخي', 6], ['أختي', 5], ['صديقي', 5], ['والدي', 5], ['والدتي', 5],
  ['نعم', 8], ['لا', 8], ['ربنا', 5], ['يسعدك', 5], ['يرحمك', 5],
  ['تطبيق', 4], ['لوحة', 4], ['المفاتيح', 4], ['العربية', 5], ['الكتابة', 5],
  ['النص', 4], ['البحث', 5], ['الحافظة', 4], ['نسخ', 4], ['لصق', 4],
  ['thanks', 4], ['please', 4], ['hello', 4], ['okay', 4], ['tomorrow', 3],
];

/** Curated multi-word completions, keyed by the prefix that unlocks them. */
const SEED_PHRASES: Array<[string, string, number]> = [
  ['الس', 'السلام عليكم ورحمة الله وبركاته', 9],
  ['الس', 'السلام عليكم', 8],
  ['وعل', 'وعليكم السلام ورحمة الله وبركاته', 8],
  ['ان', 'إن شاء الله', 9],
  ['انش', 'إن شاء الله', 9],
  ['الح', 'الحمد لله', 9],
  ['بسم', 'بسم الله الرحمن الرحيم', 8],
  ['جزا', 'جزاك الله خيراً', 8],
  ['بار', 'بارك الله فيك', 8],
  ['صل', 'صلى الله عليه وسلم', 7],
  ['رض', 'رضي الله عنه', 6],
  ['است', 'أستغفر الله العظيم', 6],
  ['صب', 'صباح الخير', 7],
  ['مس', 'مساء الخير', 7],
  ['كيف', 'كيف حالك', 8],
  ['لا', 'لا حول ولا قوة إلا بالله', 5],
  ['ماش', 'ما شاء الله', 7],
  ['تصب', 'تصبح على خير', 6],
  ['كل', 'كل عام وأنتم بخير', 5],
  ['علي', 'على الرحب والسعة', 4],
];

/** Editorial next-word chains, used before anything has been learned. */
const SEED_NEXT: Record<string, string[]> = {
  السلام: ['عليكم', 'عليكم ورحمة الله وبركاته'],
  عليكم: ['ورحمة الله وبركاته', 'السلام'],
  إن: ['شاء الله', 'شاء'],
  جزاك: ['الله خيراً', 'الله كل خير'],
  بارك: ['الله فيك', 'الله فيكم'],
  صباح: ['الخير', 'النور'],
  مساء: ['الخير', 'النور'],
  صلى: ['الله عليه وسلم'],
  الحمد: ['لله', 'لله على كل حال'],
  كيف: ['حالك', 'الحال'],
  ما: ['شاء الله', 'رأيك'],
  شكراً: ['جزيلاً', 'لك'],
  أخي: ['الكريم', 'الحبيب'],
  في: ['أمان الله', 'الحقيقة'],
};

const SEED_INITIAL = ['السلام عليكم', 'الحمد لله', 'إن شاء الله', 'شكراً', 'صباح الخير', 'كيف حالك'];

/** Normalised seed index, built once. */
const seedWordIndex = SEED_WORDS.map(([w, c]) => ({ key: normalizeToken(w), s: w, c }));
const seedPhraseIndex = SEED_PHRASES.map(([prefix, phrase, c]) => ({
  key: normalizeToken(prefix),
  s: phrase,
  c,
}));

/* ────────────────────────── auto-correction ────────────────────────── */

const TYPO_MAP: Record<string, string> = {
  شكرا: 'شكراً',
  اهلا: 'أهلاً',
  'اهلاً': 'أهلاً',
  اهل: 'أهل',
  انشاءالله: 'إن شاء الله',
  انشالله: 'إن شاء الله',
  الحمدلله: 'الحمد لله',
  ماشاءالله: 'ما شاء الله',
  سبحانالله: 'سبحان الله',
  جزاكالله: 'جزاك الله',
  مبروك: 'مبارك',
  هذاه: 'هذه',
  ذالك: 'ذلك',
  لكم: 'لكم',
  انا: 'أنا',
  انت: 'أنت',
  اليوم: 'اليوم',
  عفوا: 'عفواً',
  مرحبا: 'مرحباً',
  جدا: 'جداً',
  ايضا: 'أيضاً',
  teh: 'the',
  taht: 'that',
  recieve: 'receive',
  seperate: 'separate',
  definately: 'definitely',
  thru: 'through',
  becuase: 'because',
  im: "I'm",
  dont: "don't",
  cant: "can't",
  wont: "won't",
  ive: "I've",
};

/**
 * Mild, reversible auto-correction. A word the user has deliberately typed
 * several times is never "corrected" — that is the single most infuriating
 * behaviour of aggressive keyboards.
 */
export function getAutoCorrection(word: string): string | null {
  const clean = word.trim();
  if (!clean) return null;
  const learned = readStore().words[normalizeToken(clean)];
  if (learned && learned.c >= 3) return null;
  return TYPO_MAP[clean] ?? TYPO_MAP[clean.toLowerCase()] ?? null;
}

/* ────────────────────────── suggestions ────────────────────────── */

interface Candidate {
  s: string;
  score: number;
}

function push(out: Map<string, Candidate>, s: string, score: number): void {
  const key = normalizeToken(s);
  if (!key) return;
  const existing = out.get(key);
  if (!existing || existing.score < score) out.set(key, { s, score });
}

/**
 * Next-word predictions for the caret sitting right after `previous`.
 * Learned pairs outrank the editorial chains, which outrank raw frequency.
 */
export function getNextWordSuggestions(previous: string, limit = 5): string[] {
  const out = new Map<string, Candidate>();
  const prevKey = normalizeToken(previous);

  if (prevKey) {
    const store = readStore();
    const prefix = `${prevKey}\u0000`;
    for (const key of Object.keys(store.pairs)) {
      if (key.startsWith(prefix)) push(out, store.pairs[key].s, 1000 + store.pairs[key].c);
    }
    for (const seedKey of Object.keys(SEED_NEXT)) {
      if (normalizeToken(seedKey) !== prevKey) continue;
      SEED_NEXT[seedKey].forEach((word, i) => push(out, word, 500 - i));
    }
  }

  if (out.size < limit) {
    const store = readStore();
    Object.keys(store.words)
      .sort((a, b) => store.words[b].c - store.words[a].c)
      .slice(0, limit * 2)
      .forEach((k) => push(out, store.words[k].s, 100 + store.words[k].c));
    SEED_INITIAL.forEach((phrase, i) => push(out, phrase, 50 - i));
  }

  return [...out.values()]
    .sort((a, b) => b.score - a.score)
    .slice(0, limit)
    .map((c) => c.s);
}

/**
 * Completions for the word currently being typed.
 *
 * @param input   the in-progress token (may be empty)
 * @param context the word immediately before it, for next-word prediction
 */
export function getWordSuggestions(input: string, limit = 5, context?: string | null): string[] {
  const token = input.trim();
  if (!token) return getNextWordSuggestions(context ?? '', limit);

  const key = normalizeToken(token);
  if (!key) return [];

  const out = new Map<string, Candidate>();
  const store = readStore();

  // 1. Learned words the user actually types — highest priority by far.
  for (const wordKey of Object.keys(store.words)) {
    if (wordKey.startsWith(key) && wordKey !== key) {
      push(out, store.words[wordKey].s, 2000 + store.words[wordKey].c * 10 - wordKey.length);
    }
  }

  // 2. Learned continuations of the previous word that also match the prefix.
  const prevKey = context ? normalizeToken(context) : '';
  if (prevKey) {
    const prefix = `${prevKey}\u0000`;
    for (const pairKey of Object.keys(store.pairs)) {
      if (!pairKey.startsWith(prefix)) continue;
      if (!pairKey.slice(prefix.length).startsWith(key)) continue;
      push(out, store.pairs[pairKey].s, 2500 + store.pairs[pairKey].c * 10);
    }
  }

  // 3. Curated multi-word phrases.
  for (const phrase of seedPhraseIndex) {
    if (key.startsWith(phrase.key) || phrase.key.startsWith(key)) {
      push(out, phrase.s, 900 + phrase.c * 10 - Math.abs(phrase.key.length - key.length));
    }
  }

  // 4. Curated single words.
  for (const word of seedWordIndex) {
    if (word.key.startsWith(key) && word.key !== key) {
      push(out, word.s, 600 + word.c * 5 - word.key.length);
    }
  }

  // 5. A pending typo fix always earns a visible slot.
  const correction = getAutoCorrection(token);
  if (correction) push(out, correction, 3000);

  return [...out.values()]
    .filter((c) => normalizeToken(c.s) !== key)
    .sort((a, b) => b.score - a.score)
    .slice(0, limit)
    .map((c) => c.s);
}
