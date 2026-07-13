import { useCallback, useEffect, useState } from 'react';
import { pkmDb, newId, type LocalNote, type NoteStatus } from '../lib/db';

/**
 * Reactive access to the local notes table. All mutations write through
 * Dexie and then broadcast a lightweight `pkm-notes-changed` event so
 * every mounted hook re-fetches. Cheap for MVP scale (< 10k notes).
 */
const EVT = 'pkm-notes-changed';
function emitChange() { window.dispatchEvent(new Event(EVT)); }

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
    const note: LocalNote = {
      id: newId(),
      title: '',
      contentMd: '',
      status: 'draft',
      createdAt: now,
      updatedAt: now,
    };
    await pkmDb.notes.put(note);
    emitChange();
    return note.id;
  }, []);

  const updateNote = useCallback(
    async (id: string, patch: Partial<Pick<LocalNote, 'title' | 'contentMd' | 'status'>>) => {
      await pkmDb.notes.update(id, { ...patch, updatedAt: Date.now() });
      emitChange();
    },
    [],
  );

  const deleteNote = useCallback(async (id: string) => {
    await pkmDb.notes.delete(id);
    emitChange();
  }, []);

  return { notes, loading, createNote, updateNote, deleteNote, reload };
}

export type { LocalNote, NoteStatus };