import { useEffect, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { pkmDb, type OutboxEntry, type LocalNote } from '../lib/db';

const BATCH = 20;
const INTERVAL_MS = 5000;

/**
 * Local-first sync engine.
 *
 * Rules:
 *  - Every local mutation writes to Dexie + an outbox row.
 *  - This engine periodically drains the outbox to Supabase, and on
 *    startup pulls the user's server-side notes into Dexie, backfilling
 *    the local `userId` of any pre-sign-in notes so they get pushed too.
 *  - Conflict policy: latest `updated_at` wins. Simple and correct for
 *    a single-user personal knowledge base.
 */
export function useSyncEngine() {
  const running = useRef(false);

  useEffect(() => {
    let cancelled = false;

    async function pullFromServer(userId: string) {
      const { data, error } = await supabase
        .from('pkm_notes')
        .select('id,title,content_md,status,is_deleted,updated_at,created_at')
        .eq('user_id', userId)
        .eq('is_deleted', false);
      if (error || !data || data.length === 0) return;

      const serverIds = data.map((row) => row.id as string);
      const localNotes = await pkmDb.notes.bulkGet(serverIds);
      const localNotesMap = new Map<string, LocalNote>();
      localNotes.forEach((note) => {
        if (note) localNotesMap.set(note.id, note);
      });

      const toPut: LocalNote[] = [];

      for (const row of data) {
        const local = localNotesMap.get(row.id as string);
        const serverUpdated = new Date(row.updated_at as string).getTime();
        if (!local || serverUpdated > local.updatedAt) {
          const merged: LocalNote = {
            id: row.id as string,
            userId,
            title: (row.title as string) ?? '',
            contentMd: (row.content_md as string) ?? '',
            status: (row.status as LocalNote['status']) ?? 'draft',
            isDeleted: false,
            createdAt: new Date(row.created_at as string).getTime(),
            updatedAt: serverUpdated,
            dirty: false,
          };
          toPut.push(merged);
        }
      }

      if (toPut.length > 0) {
        await pkmDb.notes.bulkPut(toPut);
      }
      window.dispatchEvent(new Event('pkm-notes-changed'));
    }

    async function claimLocalRows(userId: string) {
      // Backfill any pre-sign-in notes with the current user id, then
      // enqueue an upsert for each so they end up in the cloud.
      const orphans = await pkmDb.notes.where('userId').equals(null as unknown as string).toArray()
        .catch(async () => (await pkmDb.notes.toArray()).filter((n) => !n.userId));

      if (orphans.length === 0) return;

      const outboxEntries: OutboxEntry[] = [];
      for (const n of orphans) {
        n.userId = userId;
        n.dirty = true;
        outboxEntries.push({
          id: crypto.randomUUID(),
          table: 'pkm_notes',
          op: 'upsert',
          rowId: n.id,
          payload: {
            id: n.id,
            user_id: userId,
            title: n.title,
            content_md: n.contentMd,
            status: n.status,
            is_deleted: false,
            updated_at: new Date(n.updatedAt).toISOString(),
            created_at: new Date(n.createdAt).toISOString(),
          },
          createdAt: Date.now(),
        });
      }

      await pkmDb.notes.bulkPut(orphans);
      await pkmDb.outbox.bulkAdd(outboxEntries);
    }

    async function drain() {
      if (running.current || cancelled) return;
      if (typeof navigator !== 'undefined' && !navigator.onLine) return;
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      running.current = true;
      try {
        const batch = await pkmDb.outbox.orderBy('createdAt').limit(BATCH).toArray();
        if (batch.length === 0) return;

        const ok = await pushBatch(batch);
        if (ok) {
          const idsToDelete = batch.map((entry) => entry.id);
          await pkmDb.outbox.bulkDelete(idsToDelete);
        } else {
          // Fallback to sequential to prevent sync blocking in case of single bad entry
          for (const entry of batch) {
            const success = await push(entry);
            if (success) await pkmDb.outbox.delete(entry.id);
          }
        }

        if (batch.length) {
          await pkmDb.notes.where('dirty').equals(1 as unknown as string).modify({ dirty: false })
            .catch(async () => {
              await pkmDb.notes.where('dirty').equals(true as unknown as string).modify({ dirty: false });
            });
        }
      } finally {
        running.current = false;
      }
    }

    async function pushBatch(batch: OutboxEntry[]): Promise<boolean> {
      const pkmNotes = batch.filter((entry) => entry.table === 'pkm_notes');
      if (pkmNotes.length === 0) return true;

      // Coalesce operations: only keep the last operation per rowId
      const coalescedMap = new Map<string, OutboxEntry>();
      for (const entry of pkmNotes) {
        coalescedMap.set(entry.rowId, entry);
      }
      const coalescedEntries = Array.from(coalescedMap.values());

      const upserts: Record<string, unknown>[] = [];
      const deleteIds: string[] = [];

      for (const entry of coalescedEntries) {
        if (entry.op === 'delete') {
          deleteIds.push(entry.rowId);
        } else {
          upserts.push(entry.payload);
        }
      }

      if (upserts.length > 0) {
        const { error } = await supabase
          .from('pkm_notes')
          .upsert(upserts as never, { onConflict: 'id' });
        if (error) {
          console.error('Error during bulk upsert of notes:', error);
          return false;
        }
      }

      if (deleteIds.length > 0) {
        const { error } = await supabase
          .from('pkm_notes')
          .update({ is_deleted: true, updated_at: new Date().toISOString() })
          .in('id', deleteIds);
        if (error) {
          console.error('Error during bulk delete of notes:', error);
          return false;
        }
      }

      return true;
    }

    async function push(entry: OutboxEntry): Promise<boolean> {
      if (entry.table !== 'pkm_notes') return true;
      if (entry.op === 'delete') {
        const { error } = await supabase
          .from('pkm_notes')
          .update({ is_deleted: true, updated_at: new Date().toISOString() })
          .eq('id', entry.rowId);
        return !error;
      }
      const { error } = await supabase
        .from('pkm_notes')
        .upsert(entry.payload as never, { onConflict: 'id' });
      return !error;
    }

    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      await claimLocalRows(user.id);
      await pullFromServer(user.id);
      await drain();
    })();

    const timer = setInterval(drain, INTERVAL_MS);
    const onOnline = () => { void drain(); };
    const onOutbox = () => { void drain(); };
    window.addEventListener('online', onOnline);
    window.addEventListener('pkm-outbox-changed', onOutbox);

    const { data: authSub } = supabase.auth.onAuthStateChange((_e, session) => {
      if (session?.user) {
        void (async () => {
          await claimLocalRows(session.user.id);
          await pullFromServer(session.user.id);
          await drain();
        })();
      }
    });

    return () => {
      cancelled = true;
      clearInterval(timer);
      window.removeEventListener('online', onOnline);
      window.removeEventListener('pkm-outbox-changed', onOutbox);
      authSub?.subscription.unsubscribe();
    };
  }, []);
}