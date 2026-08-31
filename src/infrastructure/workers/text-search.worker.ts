/**
 * `text-search` worker: trigram index + ranked retrieval over a corpus of
 * up to ~50k documents. Used by the Archive, Diwan, and Knowledge features
 * to search offline content without round-tripping the Supabase edge.
 */

import * as Comlink from 'comlink';

export type Doc = { id: string; text: string; title?: string };

export type SearchInput =
  | { op: 'index'; docs: Doc[] }
  | { op: 'query'; q: string; topK: number };

export type SearchOutput =
  | { op: 'index'; docs: number; trigrams: number }
  | {
      op: 'query';
      results: Array<{ id: string; score: number; title?: string }>;
    };

const trigrams = new Map<string, Set<string>>();
const docs = new Map<string, Doc>();

function trigramsOf(text: string): Set<string> {
  const padded = `  ${text.toLowerCase()}  `;
  const out = new Set<string>();
  for (let i = 0; i < padded.length - 2; i += 1) out.add(padded.slice(i, i + 3));
  return out;
}

const api = {
  run(input: SearchInput): SearchOutput {
    if (input.op === 'index') {
      trigrams.clear();
      docs.clear();
      let count = 0;
      for (const doc of input.docs) {
        docs.set(doc.id, doc);
        const set = trigramsOf(doc.text);
        for (const t of set) {
          let bucket = trigrams.get(t);
          if (!bucket) {
            bucket = new Set();
            trigrams.set(t, bucket);
          }
          bucket.add(doc.id);
        }
        count += set.size;
      }
      return { op: 'index', docs: input.docs.length, trigrams: count };
    }
    const q = input.q.toLowerCase();
    const queryTris = trigramsOf(q);
    const scores = new Map<string, number>();
    for (const tri of queryTris) {
      const bucket = trigrams.get(tri);
      if (!bucket) continue;
      for (const id of bucket) scores.set(id, (scores.get(id) ?? 0) + 1);
    }
    const ranked = [...scores.entries()]
      .map(([id, score]) => ({ id, score, title: docs.get(id)?.title }))
      .sort((a, b) => b.score - a.score)
      .slice(0, input.topK);
    return { op: 'query', results: ranked };
  },
};

Comlink.expose(api);