/**
 * Off-thread computation pool.
 *
 * Anything CPU-bound (chess engines, thermodynamic indices, image
 * preprocessing, large CSV parses, cryptographic checksums) MUST run through
 * this pool instead of on the main thread. The pool is lazy, sized to the
 * device's hardware concurrency (capped at 4 to protect low-end phones), and
 * falls back to a single-worker mode under battery saver.
 *
 * Communication is over Comlink so worker code looks like ordinary async
 * functions; do NOT wrap calls in `new Promise(...)` at the call site, just
 * `await pool.exec('chess', { fen })`.
 */

import * as Comlink from 'comlink';

import type { WorkerKind } from './workerKinds';

type WorkerEntry = {
  worker: Worker;
  proxy: Comlink.Remote<unknown>;
  busy: boolean;
};

class WorkerPool {
  private workers = new Map<WorkerKind, WorkerEntry[]>();
  private maxPerKind = 2;
  private batterySaver = false;

  configure(opts: { maxPerKind?: number; batterySaver?: boolean }): void {
    if (typeof opts.maxPerKind === 'number') this.maxPerKind = opts.maxPerKind;
    if (typeof opts.batterySaver === 'boolean') this.batterySaver = opts.batterySaver;
  }

  async exec<TKind extends WorkerKind, TInput, TOutput>(
    kind: TKind,
    payload: TInput,
  ): Promise<TOutput> {
    const entry = await this.acquire(kind);
    try {
      return (await (entry.proxy as unknown as {
        run: (p: TInput) => Promise<TOutput>;
      }).run(payload));
    } finally {
      entry.busy = false;
    }
  }

  private async acquire(kind: WorkerKind): Promise<WorkerEntry> {
    const idle = (this.workers.get(kind) ?? []).find((w) => !w.busy);
    if (idle) {
      idle.busy = true;
      return idle;
    }
    const list = this.workers.get(kind) ?? [];
    if (list.length < this.maxPerKind && !this.batterySaver) {
      const entry = await this.spawn(kind);
      this.workers.set(kind, [...list, entry]);
      entry.busy = true;
      return entry;
    }
    const reusable = list[0];
    if (!reusable) {
      return this.acquireSlow(kind);
    }
    reusable.busy = true;
    return reusable;
  }

  private async acquireSlow(kind: WorkerKind): Promise<WorkerEntry> {
    return new Promise((resolve) => {
      const interval = window.setInterval(() => {
        const idle = (this.workers.get(kind) ?? []).find((w) => !w.busy);
        if (idle) {
          window.clearInterval(interval);
          idle.busy = true;
          resolve(idle);
        }
      }, 16);
    });
  }

  private async spawn(kind: WorkerKind): Promise<WorkerEntry> {
    const worker = new Worker(new URL(`./${kind}.worker.ts`, import.meta.url), {
      type: 'module',
      name: `smarthub-${kind}`,
    });
    const proxy = Comlink.wrap<unknown>(worker);
    return { worker, proxy, busy: false };
  }

  terminateAll(): void {
    for (const list of this.workers.values()) {
      for (const entry of list) entry.worker.terminate();
    }
    this.workers.clear();
  }
}

export const workerPool = new WorkerPool();