/**
 * Collapses a PKM outbox batch into the minimum set of network operations.
 *
 * Extracted from the closure inside `useSyncEngine.ts::pushBatch` so it can be
 * tested. It previously could not be: the only test that claimed to cover it
 * (`useSyncEngine.bench.test.ts`) re-implemented this logic *inside the test file*
 * and compared its own two local functions to each other, never importing the hook.
 * It asserted that code written in the test behaved as the test expected, and its
 * one real assertion was a wall-clock comparison — flaky by construction on a shared
 * CI runner.
 *
 * The behaviour is worth having a real test for. Editing a note five times offline
 * should cost one upsert on reconnect, not five, and a note that was created and
 * then deleted while offline should not be pushed and then tombstoned.
 */

/** The subset of an outbox row this function needs. */
export interface CoalescableEntry {
  /** Which table the row belongs to. Only `pkm_notes` is synced today. */
  table: string;
  op: 'upsert' | 'delete';
  /** Primary key of the row being synced — the coalescing key. */
  rowId: string;
  payload: Record<string, unknown>;
}

export interface CoalescedBatch {
  /** Rows to upsert, in first-seen order. */
  upserts: Record<string, unknown>[];
  /** Row ids to tombstone. */
  deleteIds: string[];
}

/**
 * Keeps only the last queued operation per `rowId`.
 *
 * Last-write-wins is correct here because the outbox is append-only and ordered: a
 * later entry for the same row supersedes the earlier one by definition. That also
 * means a delete queued after an upsert correctly wins, so the row is tombstoned
 * rather than being pushed first.
 *
 * Insertion order is preserved (`Map` iterates in insertion order, and re-setting an
 * existing key does not move it), which keeps the upsert payload order stable and
 * therefore the network request deterministic — worth having when debugging a sync
 * against server logs.
 */
export function coalesceOutbox(
  entries: readonly CoalescableEntry[],
  table = 'pkm_notes',
): CoalescedBatch {
  const forTable = entries.filter((entry) => entry.table === table);

  const latestByRow = new Map<string, CoalescableEntry>();
  for (const entry of forTable) {
    latestByRow.set(entry.rowId, entry);
  }

  const upserts: Record<string, unknown>[] = [];
  const deleteIds: string[] = [];
  for (const entry of latestByRow.values()) {
    if (entry.op === 'delete') deleteIds.push(entry.rowId);
    else upserts.push(entry.payload);
  }

  return { upserts, deleteIds };
}

/**
 * How many network round trips `coalesceOutbox`'s result costs.
 *
 * At most two, whatever the batch size: one bulk upsert and one bulk tombstone
 * update. The sequential path this replaced made one call per outbox entry.
 */
export function networkCallCount(batch: CoalescedBatch): number {
  return (batch.upserts.length > 0 ? 1 : 0) + (batch.deleteIds.length > 0 ? 1 : 0);
}
