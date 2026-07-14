/**
 * PKM local-first store — Dexie/IndexedDB.
 *
 * v2 adds cloud-sync scaffolding:
 *   - userId + dirty flags on notes so the sync engine knows what to push
 *   - a plain outbox table drained in background to Supabase
 *
 * Tags and wiki-links stay DERIVED from note content on demand
 * (see tagParser.ts / wikiLinks.ts). No physical folders.
 */
import Dexie, { type Table } from 'dexie';

export type NoteStatus = 'draft' | 'active' | 'archived';

export interface LocalNote {
  id: string;
  userId: string | null;      // null until the user signs in; sync engine backfills
  title: string;
  contentMd: string;
  status: NoteStatus;
  isDeleted?: boolean;
  createdAt: number;
  updatedAt: number;
  dirty?: boolean;            // true until the row is synced to Supabase
}

export type OutboxOp = 'upsert' | 'delete';

export interface OutboxEntry {
  id: string;
  table: 'pkm_notes';
  op: OutboxOp;
  rowId: string;
  payload: Record<string, unknown>;
  createdAt: number;
}

class PKMDatabase extends Dexie {
  notes!: Table<LocalNote, string>;
  outbox!: Table<OutboxEntry, string>;

  constructor() {
    super('pkm-local-v1');
    // Legacy v1 schema.
    this.version(1).stores({
      notes: 'id, status, updatedAt',
    });
    // v2: add userId/dirty indexes on notes + outbox table.
    this.version(2)
      .stores({
        notes: 'id, userId, status, updatedAt, dirty',
        outbox: 'id, table, createdAt',
      })
      .upgrade(async (tx) => {
        await tx.table('notes').toCollection().modify((n: LocalNote) => {
          if (n.userId === undefined) n.userId = null;
          if (n.isDeleted === undefined) n.isDeleted = false;
          if (n.dirty === undefined) n.dirty = false;
        });
      });
  }
}

export const pkmDb = new PKMDatabase();

export function newId(): string {
  // Use a UUID so the same id round-trips to Supabase without a swap.
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
    return crypto.randomUUID();
  }
  return (
    Date.now().toString(36) + Math.random().toString(36).slice(2, 10)
  );
}