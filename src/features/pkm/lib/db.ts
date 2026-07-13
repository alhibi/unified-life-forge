/**
 * PKM local-first store — Dexie/IndexedDB.
 *
 * MVP scope: notes only. Tags and wiki-links are DERIVED from note
 * content on demand (see tagParser.ts). We keep the schema tiny so
 * migrations stay cheap when we later add Supabase sync + wiki-links.
 */
import Dexie, { type Table } from 'dexie';

export type NoteStatus = 'draft' | 'active' | 'archived';

export interface LocalNote {
  id: string;
  title: string;
  contentMd: string;
  status: NoteStatus;
  createdAt: number;
  updatedAt: number;
}

class PKMDatabase extends Dexie {
  notes!: Table<LocalNote, string>;

  constructor() {
    super('pkm-local-v1');
    this.version(1).stores({
      notes: 'id, status, updatedAt',
    });
  }
}

export const pkmDb = new PKMDatabase();

export function newId(): string {
  // Short URL-safe id — good enough for local; we'll swap for uuid on sync.
  return (
    Date.now().toString(36) +
    Math.random().toString(36).slice(2, 8)
  );
}