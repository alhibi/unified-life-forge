import { useCallback, useEffect, useState } from 'react';
import { pkmDb, newId, type LocalNote, type NoteStatus, type OutboxEntry } from '../lib/db';
import { supabase } from '@/integrations/supabase/client';

/**
 * Reactive access to the local notes table. All mutations write through
 * Dexie and then broadcast a lightweight `pkm-notes-changed` event so
 * every mounted hook re-fetches. Cheap for MVP scale (< 10k notes).
 */
const EVT = 'pkm-notes-changed';
function emitChange() { window.dispatchEvent(new Event(EVT)); }

async function currentUserId(): Promise<string | null> {
  const { data } = await supabase.auth.getUser();
  return data.user?.id ?? null;
}

function toDbPayload(n: LocalNote) {
  return {
    id: n.id,
    user_id: n.userId,
    title: n.title,
    content_md: n.contentMd,
    status: n.status,
    is_deleted: n.isDeleted ?? false,
    updated_at: new Date(n.updatedAt).toISOString(),
    created_at: new Date(n.createdAt).toISOString(),
  };
}

async function enqueue(entry: Omit<OutboxEntry, 'id' | 'createdAt'>) {
  await pkmDb.outbox.add({
    ...entry,
    id: newId(),
    createdAt: Date.now(),
  });
  // Nudge the sync engine.
  window.dispatchEvent(new Event('pkm-outbox-changed'));
}

export function useNotes() {
  const [notes, setNotes] = useState<LocalNote[]>([]);
  const [loading, setLoading] = useState(true);

  const reload = useCallback(async () => {
    const rows = await pkmDb.notes.orderBy('updatedAt').reverse().toArray();
    setNotes(rows);
    setLoading(false);
  }, []);

  useEffect(() => {
    void reload();
    const on = () => { void reload(); };
    window.addEventListener(EVT, on);
    return () => window.removeEventListener(EVT, on);
  }, [reload]);

  const createNote = useCallback(async (): Promise<string> => {
    const now = Date.now();
    const userId = await currentUserId();
    const note: LocalNote = {
      id: newId(),
      userId,
      title: '',
      contentMd: '',
      status: 'draft',
      isDeleted: false,
      createdAt: now,
      updatedAt: now,
      dirty: !!userId,
    };
    await pkmDb.notes.put(note);
    if (userId) {
      await enqueue({ table: 'pkm_notes', op: 'upsert', rowId: note.id, payload: toDbPayload(note) });
    }
    emitChange();
    return note.id;
  }, []);

  const updateNote = useCallback(
    async (id: string, patch: Partial<Pick<LocalNote, 'title' | 'contentMd' | 'status'>>) => {
      const now = Date.now();
      await pkmDb.notes.update(id, { ...patch, updatedAt: now, dirty: true });
      const row = await pkmDb.notes.get(id);
      if (row?.userId) {
        await enqueue({ table: 'pkm_notes', op: 'upsert', rowId: id, payload: toDbPayload(row) });
      }
      emitChange();
    },
    [],
  );

  const deleteNote = useCallback(async (id: string) => {
    const row = await pkmDb.notes.get(id);
    await pkmDb.notes.delete(id);
    if (row?.userId) {
      await enqueue({ table: 'pkm_notes', op: 'delete', rowId: id, payload: { id } });
    }
    emitChange();
  }, []);

  return { notes, loading, createNote, updateNote, deleteNote, reload };
}

export type { LocalNote, NoteStatus };