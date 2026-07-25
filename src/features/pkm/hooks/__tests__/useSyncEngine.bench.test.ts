import { describe, expect,it } from 'vitest';

// Simulating network delay for Supabase API calls (e.g., 5ms per roundtrip)
const NETWORK_DELAY_MS = 5;

async function simulateNetworkCall<T>(result: T): Promise<T> {
  return new Promise((resolve) => setTimeout(() => resolve(result), NETWORK_DELAY_MS));
}

// Simulated sequential push logic (original behavior)
async function sequentialPush(batch: Array<{ id: string; op: 'upsert' | 'delete'; payload: Record<string, unknown>; rowId: string }>) {
  let networkCalls = 0;
  const localDbDeletions = 0;

  for (const _entry of batch) {
    networkCalls++;
    await simulateNetworkCall(true); // Simulate push(entry)

    // Simulate local outbox delete
  }

  return { networkCalls, localDbDeletions: batch.length ? batch.length : localDbDeletions };
}

// Simulated optimized bulk push logic with coalescing (proposed behavior)
async function bulkPush(batch: Array<{ id: string; op: 'upsert' | 'delete'; payload: Record<string, unknown>; rowId: string }>) {
  let networkCalls = 0;
  let localDbDeletions = 0;

  // 1. Coalesce/Deduplicate operations: only keep the last operation per rowId
  const coalescedMap = new Map<string, typeof batch[0]>();
  for (const entry of batch) {
    coalescedMap.set(entry.rowId, entry);
  }
  const coalescedEntries = Array.from(coalescedMap.values());

  // 2. Separate upserts and deletes
  const upserts: Record<string, unknown>[] = [];
  const deleteIds: string[] = [];

  for (const entry of coalescedEntries) {
    if (entry.op === 'delete') {
      deleteIds.push(entry.rowId);
    } else {
      upserts.push(entry.payload);
    }
  }

  // 3. Perform bulk network calls
  if (upserts.length > 0) {
    networkCalls++;
    await simulateNetworkCall(true); // Bulk upsert
  }

  if (deleteIds.length > 0) {
    networkCalls++;
    await simulateNetworkCall(true); // Bulk update (is_deleted = true)
  }

  // 4. Bulk delete from local outbox
  if (batch.length > 0) {
    localDbDeletions = 1; // Done in a single bulk operation, e.g., pkmDb.outbox.bulkDelete(...)
  }

  return { networkCalls, localDbDeletions };
}

describe('Sync Engine Batch Performance', () => {
  it('compares sequential vs bulk performance with 20 entries (including redundancies)', async () => {
    // Constructing a batch of 20 entries with some redundancy
    const batch: Array<{ id: string; op: 'upsert' | 'delete'; payload: Record<string, unknown>; rowId: string }> = [];

    // Create 15 unique notes, some having duplicate operations in the outbox
    for (let i = 0; i < 20; i++) {
      const rowId = `note-${i % 15}`; // 5 redundant notes (i.e., note-0 to note-4 have 2 operations each)
      const op = i === 19 ? 'delete' : 'upsert';
      batch.push({
        id: `outbox-${i}`,
        op,
        rowId,
        payload: { id: rowId, title: `Note ${i}` },
      });
    }

    // Benchmark Sequential Approach
    const startSeq = performance.now();
    const seqResult = await sequentialPush(batch);
    const endSeq = performance.now();
    const seqDuration = endSeq - startSeq;

    // Benchmark Bulk Approach
    const startBulk = performance.now();
    const bulkResult = await bulkPush(batch);
    const endBulk = performance.now();
    const bulkDuration = endBulk - startBulk;

    console.log('--- SYNC ENGINE PERFORMANCE COMPARISON ---');
    console.log(`Sequential Duration: ${seqDuration.toFixed(2)}ms`);
    console.log(`Bulk Duration:       ${bulkDuration.toFixed(2)}ms`);
    console.log(`Speedup Factor:      ${(seqDuration / bulkDuration).toFixed(2)}x`);
    console.log(`Sequential Calls:    ${seqResult.networkCalls} network calls, ${seqResult.localDbDeletions} DB writes`);
    console.log(`Bulk Calls:          ${bulkResult.networkCalls} network calls, ${bulkResult.localDbDeletions} DB writes`);
    console.log('-----------------------------------------');

    // Assertions
    expect(bulkResult.networkCalls).toBeLessThanOrEqual(2);
    expect(bulkResult.localDbDeletions).toBe(1);
    expect(bulkDuration).toBeLessThan(seqDuration);
  });
});
