/**
 * Offline-first mutation queue backed by IndexedDB. Every mutation that
 * could fail (create / update / delete against any Supabase table) MUST
 * flow through `enqueue`. The queue:
 *   1. writes to local IndexedDB first (instant UI confirmation),
 *   2. replays pending entries when `navigator.onLine` flips to `true`,
 *   3. requeues on transient failure with exponential backoff,
 *   4. surfaces a permanent failure to the caller after N attempts.
 *
 * The hard lock prevents the double-processing the existing `useOfflineStorage`
 * hook accidentally permitted when the online event fired twice in quick
 * succession (e.g. on iOS Safari when waking from background).
 */

import { get, set, del, keys } from 'idb-keyval';

export type MutationStatus = 'pending' | 'inflight' | 'failed' | 'done';

export interface QueuedMutation<TPayload = unknown> {
  id: string;
  kind: string;
  payload: TPayload;
  enqueuedAt: number;
  attempts: number;
  maxAttempts: number;
  status: MutationStatus;
  lastError?: string;
  nextAttemptAt: number;
}

export type MutationExecutor<TPayload> = (payload: TPayload) => Promise<void>;

export interface OfflineQueueOptions {
  storageKey?: string;
  maxAttempts?: number;
  baseBackoffMs?: number;
  maxBackoffMs?: number;
  onChange?: (queue: QueuedMutation[]) => void;
}

const DEFAULT_KEY = 'smarthub:offline-queue';

class OfflineQueue {
  private readonly storageKey: string;
  private readonly maxAttempts: number;
  private readonly baseBackoffMs: number;
  private readonly maxBackoffMs: number;
  private readonly onChange?: (queue: QueuedMutation[]) => void;
  private running = false;
  private readonly executors = new Map<string, MutationExecutor<unknown>>();

  constructor(opts: OfflineQueueOptions = {}) {
    this.storageKey = opts.storageKey ?? DEFAULT_KEY;
    this.maxAttempts = opts.maxAttempts ?? 8;
    this.baseBackoffMs = opts.baseBackoffMs ?? 500;
    this.maxBackoffMs = opts.maxBackoffMs ?? 60_000;
    this.onChange = opts.onChange;
    if (typeof window !== 'undefined') {
      window.addEventListener('online', () => {
        void this.drain();
      });
    }
  }

  registerExecutor<TPayload>(kind: string, executor: MutationExecutor<TPayload>): void {
    this.executors.set(kind, executor as MutationExecutor<unknown>);
  }

  async enqueue<TPayload>(kind: string, payload: TPayload): Promise<QueuedMutation<TPayload>> {
    const entry: QueuedMutation<TPayload> = {
      id: cryptoRandomId(),
      kind,
      payload,
      enqueuedAt: Date.now(),
      attempts: 0,
      maxAttempts: this.maxAttempts,
      status: 'pending',
      nextAttemptAt: Date.now(),
    };
    const all = await this.all();
    all.push(entry as QueuedMutation);
    await this.write(all);
    this.notify(all);
    if (typeof navigator !== 'undefined' && navigator.onLine) {
      void this.drain();
    }
    return entry;
  }

  async drain(): Promise<void> {
    if (this.running) return;
    this.running = true;
    try {
      const all = await this.all();
      let mutated = false;
      for (const entry of all) {
        if (entry.status === 'done' || entry.status === 'inflight') continue;
        if (entry.nextAttemptAt > Date.now()) continue;
        const executor = this.executors.get(entry.kind);
        if (!executor) {
          entry.status = 'failed';
          entry.lastError = `No executor registered for kind "${entry.kind}"`;
          mutated = true;
          continue;
        }
        entry.status = 'inflight';
        entry.attempts += 1;
        try {
          await executor(entry.payload);
          entry.status = 'done';
          mutated = true;
        } catch (err) {
          entry.status = entry.attempts >= entry.maxAttempts ? 'failed' : 'pending';
          entry.lastError = err instanceof Error ? err.message : String(err);
          const backoff = Math.min(this.maxBackoffMs, this.baseBackoffMs * 2 ** entry.attempts);
          entry.nextAttemptAt = Date.now() + backoff + Math.floor(Math.random() * 250);
          mutated = true;
        }
      }
      if (mutated) {
        const remaining = all.filter((e) => e.status !== 'done');
        await this.write(remaining);
        this.notify(remaining);
      }
    } finally {
      this.running = false;
    }
  }

  async all(): Promise<QueuedMutation[]> {
    const stored = (await get(this.storageKey)) as QueuedMutation[] | undefined;
    return stored ?? [];
  }

  async clear(): Promise<void> {
    await del(this.storageKey);
    this.notify([]);
  }

  private async write(entries: QueuedMutation[]): Promise<void> {
    await set(this.storageKey, entries);
  }

  private notify(entries: QueuedMutation[]): void {
    this.onChange?.(entries);
  }
}

function cryptoRandomId(): string {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) return crypto.randomUUID();
  return Math.random().toString(36).slice(2) + Date.now().toString(36);
}

let singleton: OfflineQueue | null = null;
export function getOfflineQueue(opts?: OfflineQueueOptions): OfflineQueue {
  if (!singleton) singleton = new OfflineQueue(opts);
  return singleton;
}
void keys;