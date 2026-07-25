/**
 * Seed corpus for the Diwan library — types + loader.
 *
 * The 610-poem corpus used to live in this file as an exported `poetryEras`
 * array literal: 18,876 lines of Arabic poetry expressed as JavaScript. Rollup
 * hoisted it into a shared chunk (644 kB raw / 349 kB gzipped) that every
 * `/diwan/*` route pulled in eagerly, because `local-fallback.ts` imports it at
 * module scope.
 *
 * That cost was paid unconditionally — including by users whose Supabase
 * instance is configured and populated, where `withFallback()` in `lib/hooks.ts`
 * never calls the local path at all. They downloaded and parsed a third of a
 * megabyte of poetry the app then ignored.
 *
 * The corpus now lives in `public/data/diwan-poetry.json` and is fetched on
 * first use. Consequences:
 *   • it leaves the JavaScript graph entirely — no parse/compile cost, and the
 *     browser's native JSON parser is considerably faster than evaluating an
 *     equivalent object literal;
 *   • it is only ever requested when the local fallback actually runs, i.e. in
 *     demo mode (no Supabase) or after a remote failure;
 *   • it is cached independently of the app bundle, so a code deploy no longer
 *     invalidates it.
 *
 * Regenerating the JSON: the file is committed as-is. If you edit the corpus,
 * edit the JSON. The ingest pipeline in `scripts/diwan/` writes the same shape.
 */

export interface Poem {
  title: string;
  verses: string[];
}

export interface Poet {
  id: string;
  name: string;
  era: string;
  bio: string;
  poems: Poem[];
}

export interface Era {
  id: string;
  name: string;
  nameAr: string;
  period: string;
  poets: Poet[];
}

/** Public path of the corpus asset. Also used by the test fetch shim. */
export const POETRY_CORPUS_URL = '/data/diwan-poetry.json';

/**
 * Single in-flight promise, so N concurrent callers share one request. Cached
 * for the lifetime of the document — the corpus is immutable literary data.
 */
let corpus: Promise<Era[]> | null = null;

function isEraArray(value: unknown): value is Era[] {
  if (!Array.isArray(value)) return false;
  return value.every(
    (e) =>
      typeof e === 'object' &&
      e !== null &&
      typeof (e as Era).id === 'string' &&
      Array.isArray((e as Era).poets),
  );
}

/**
 * Loads the seed corpus. Resolves to `[]` rather than throwing when the asset
 * is missing or malformed: the caller is already a fallback path, and an empty
 * corpus degrades to "no local data" instead of taking down the route.
 */
export function loadPoetryEras(): Promise<Era[]> {
  corpus ??= (async () => {
    try {
      const res = await fetch(POETRY_CORPUS_URL, { cache: 'force-cache' });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const json: unknown = await res.json();
      if (!isEraArray(json)) throw new Error('unexpected corpus shape');
      return json;
    } catch (err) {
      console.warn(
        `[diwan] could not load the seed corpus from ${POETRY_CORPUS_URL}:`,
        (err as Error).message,
      );
      // Do not memoise a failure — a later call may succeed (e.g. the network
      // came back), and an empty corpus permanently cached would be worse than
      // one extra request.
      corpus = null;
      return [];
    }
  })();
  return corpus;
}

/** Test seam: drops the memoised corpus so a spec can re-stub `fetch`. */
export function __resetPoetryCorpusForTests(): void {
  corpus = null;
}
