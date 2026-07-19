// The ONLY place in the journal feature that touches Supabase.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
import { supabase } from '@/integrations/supabase/client';
import { computeWordCount, type JournalEntry, type JournalEntryInput } from './types';

// The generated Supabase types are regenerated only after the migration
// runs, so we cast the client here to keep this module compiling in the
// meantime. All other type-safety is preserved via the domain types.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const db = supabase as any;

/** Convert a raw row from Postgres into the domain type. */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function rowToEntry(row: any): JournalEntry {
  return {
    id: row.id,
    userId: row.user_id,
    title: row.title ?? null,
    content: row.content ?? '',
    mood: row.mood,
    tags: Array.isArray(row.tags) ? row.tags : [],
    wordCount: row.word_count ?? 0,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function normalizeTags(tags: string[] | undefined): string[] {
  if (!tags || !tags.length) return [];
  return Array.from(
    new Set(tags.map((t) => t.trim()).filter((t) => t.length > 0 && t.length <= 40)),
  ).slice(0, 12);
}

export async function listEntries(): Promise<JournalEntry[]> {
  const { data, error } = await db
    .from('journal_entries')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(500);
  if (error) throw error;
  return (data ?? []).map(rowToEntry);
}

export async function createEntry(input: JournalEntryInput): Promise<JournalEntry> {
  const { data: { session } } = await supabase.auth.getSession();
  const userId = session?.user?.id;
  if (!userId) throw new Error('not_authenticated');

  const payload = {
    user_id: userId,
    title: input.title?.trim() || null,
    content: input.content ?? '',
    mood: input.mood,
    tags: normalizeTags(input.tags),
    word_count: computeWordCount(input.content ?? ''),
  };

  const { data, error } = await db
    .from('journal_entries')
    .insert(payload)
    .select('*')
    .single();
  if (error) throw error;
  return rowToEntry(data);
}

export async function updateEntry(id: string, input: Partial<JournalEntryInput>): Promise<JournalEntry> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const patch: Record<string, any> = {};
  if (input.title !== undefined) patch.title = input.title?.trim() || null;
  if (input.content !== undefined) {
    patch.content = input.content;
    patch.word_count = computeWordCount(input.content);
  }
  if (input.mood !== undefined) patch.mood = input.mood;
  if (input.tags !== undefined) patch.tags = normalizeTags(input.tags);

  const { data, error } = await db
    .from('journal_entries')
    .update(patch)
    .eq('id', id)
    .select('*')
    .single();
  if (error) throw error;
  return rowToEntry(data);
}

export async function deleteEntry(id: string): Promise<void> {
  const { error } = await db.from('journal_entries').delete().eq('id', id);
  if (error) throw error;
}