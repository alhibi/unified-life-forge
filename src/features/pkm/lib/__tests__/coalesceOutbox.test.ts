/**
 * Tests the real outbox coalescing used by `useSyncEngine`.
 *
 * This replaces `useSyncEngine.bench.test.ts`, which defined `sequentialPush` and
 * `bulkPush` inside the test file, compared them to each other, and never imported
 * the hook it was named after — so it asserted that code written in the test behaved
 * as the test expected. Its only load-bearing assertion was
 * `expect(bulkDuration).toBeLessThan(seqDuration)`, a wall-clock comparison that is
 * flaky by construction on a shared runner.
 *
 * These assert the properties that actually matter to a user coming back online.
 */

import { describe, expect, it } from 'vitest';

import {
  type CoalescableEntry,
  coalesceOutbox,
  networkCallCount,
} from '../coalesceOutbox';

function upsert(rowId: string, title = rowId): CoalescableEntry {
  return { table: 'pkm_notes', op: 'upsert', rowId, payload: { id: rowId, title } };
}

function remove(rowId: string): CoalescableEntry {
  return { table: 'pkm_notes', op: 'delete', rowId, payload: { id: rowId } };
}

describe('coalesceOutbox', () => {
  it('returns nothing for an empty batch', () => {
    expect(coalesceOutbox([])).toEqual({ upserts: [], deleteIds: [] });
    expect(networkCallCount(coalesceOutbox([]))).toBe(0);
  });

  it('keeps one upsert per row however many times it was edited', () => {
    // Editing one note five times offline must cost one upsert on reconnect.
    const batch = [upsert('n1', 'v1'), upsert('n1', 'v2'), upsert('n1', 'v3')];
    const result = coalesceOutbox(batch);

    expect(result.upserts).toHaveLength(1);
    expect(result.upserts[0]).toEqual({ id: 'n1', title: 'v3' });
  });

  it('keeps the LAST operation, not the first', () => {
    // The outbox is append-only and ordered, so a later entry supersedes an earlier
    // one. Getting this backwards would resurrect stale content over newer edits.
    const result = coalesceOutbox([upsert('n1', 'old'), upsert('n1', 'new')]);
    expect(result.upserts[0]).toMatchObject({ title: 'new' });
  });

  it('lets a delete queued after an upsert win', () => {
    // Otherwise the row is pushed and then tombstoned — two calls and a window in
    // which other devices can see a note the user already deleted.
    const result = coalesceOutbox([upsert('n1'), remove('n1')]);

    expect(result.upserts).toEqual([]);
    expect(result.deleteIds).toEqual(['n1']);
  });

  it('lets an upsert queued after a delete win', () => {
    // Deleting then re-creating the same id must not leave it tombstoned.
    const result = coalesceOutbox([remove('n1'), upsert('n1', 'back')]);

    expect(result.deleteIds).toEqual([]);
    expect(result.upserts).toEqual([{ id: 'n1', title: 'back' }]);
  });

  it('never costs more than two network calls, at any batch size', () => {
    // This is the property the old timing assertion was groping at, expressed as
    // something deterministic.
    for (const size of [1, 20, 500, 5000]) {
      const batch: CoalescableEntry[] = [];
      for (let i = 0; i < size; i++) {
        batch.push(i % 7 === 0 ? remove(`n${i % 50}`) : upsert(`n${i % 50}`));
      }
      expect(networkCallCount(coalesceOutbox(batch)), `size ${size}`).toBeLessThanOrEqual(2);
    }
  });

  it('collapses 20 entries over 15 rows to 15 operations', () => {
    // The scenario the deleted test described: 20 queued entries, 5 of them
    // redundant, the last one a delete.
    const batch: CoalescableEntry[] = [];
    for (let i = 0; i < 20; i++) {
      const rowId = `note-${i % 15}`;
      batch.push(i === 19 ? remove(rowId) : upsert(rowId, `Note ${i}`));
    }
    const result = coalesceOutbox(batch);

    expect(result.upserts.length + result.deleteIds.length).toBe(15);
    expect(networkCallCount(result)).toBe(2);
  });

  it('ignores rows belonging to another table', () => {
    // The outbox is shared. Pushing another table's payload to pkm_notes would be a
    // schema error at best and a cross-feature data leak at worst.
    const batch: CoalescableEntry[] = [
      upsert('n1'),
      { table: 'journal_entries', op: 'upsert', rowId: 'j1', payload: { id: 'j1' } },
    ];
    const result = coalesceOutbox(batch);

    expect(result.upserts).toEqual([{ id: 'n1', title: 'n1' }]);
  });

  it('can be pointed at a different table', () => {
    const batch: CoalescableEntry[] = [
      upsert('n1'),
      { table: 'journal_entries', op: 'upsert', rowId: 'j1', payload: { id: 'j1' } },
    ];
    expect(coalesceOutbox(batch, 'journal_entries').upserts).toEqual([{ id: 'j1' }]);
  });

  it('preserves first-seen order so the request is deterministic', () => {
    // Worth having when comparing a failing sync against server logs.
    const result = coalesceOutbox([
      upsert('b'),
      upsert('a'),
      upsert('c'),
      upsert('a', 'a2'), // re-setting an existing key must not move it
    ]);
    expect(result.upserts.map((u) => u.id)).toEqual(['b', 'a', 'c']);
    expect(result.upserts[1]).toMatchObject({ title: 'a2' });
  });

  it('does not mutate the input', () => {
    const batch = [upsert('n1'), remove('n2')];
    const snapshot = JSON.parse(JSON.stringify(batch));
    coalesceOutbox(batch);
    expect(batch).toEqual(snapshot);
  });
});
