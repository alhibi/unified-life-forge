/**
 * Worker kinds catalogue. Add an entry here, then create
 * `<kind>.worker.ts` exposing a `run` function via `Comlink.expose`.
 *
 * The new worker file is imported lazily via `new URL(...)` by the pool,
 * so the bundle never ships unused worker chunks.
 */

export type WorkerKind =
  | 'crypto'
  | 'fitness-metrics'
  | 'image-preprocess'
  | 'text-search'
  | 'csv-parse'
  | 'chess';

export const WORKER_KINDS: readonly WorkerKind[] = [
  'crypto',
  'fitness-metrics',
  'image-preprocess',
  'text-search',
  'csv-parse',
  'chess',
] as const;