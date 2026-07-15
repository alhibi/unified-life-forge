/**
 * Cloud API for the reading feature.
 *
 * Sole chokepoint for Supabase calls in this feature (per
 * docs/architecture/data-layer.md). Everything the reader persists —
 * feeds, read-state, bookmarks, reader prefs — flows through here.
 *
 * Contract:
 *  - Functions throw on error; callers decide how to surface.
 *  - Returns typed shapes matching src/features/reading/types.ts.
 *  - No-ops (return empty defaults) when the user is signed out —
 *    the reading page is browsable while anonymous, and only sync
 *    matters when a session exists.
 */

import { supabase } from '@/integrations/supabase/client';
import type { FeedItem, FeedSource, ReaderPrefs } from './types';

const DEFAULT_PREFS: ReaderPrefs = {
  fontSize: 'md',
  lineHeight: 'normal',
  theme: 'system',
  fontFamily: 'sans',
};

async function currentUserId(): Promise<string | null> {
  try {
    const { data } = await supabase.auth.getUser();
    return data.user?.id ?? null;
  } catch {
    return null;
  }
}

// ─── Feeds ────────────────────────────────────────────────────────────

export async function listFeeds(): Promise<FeedSource[] | null> {
  const uid = await currentUserId();
  if (!uid) return null;
  const { data, error } = await supabase
    .from('reading_feeds')
    .select('url,name,category,enabled,sort_order')
    .eq('user_id', uid)
    .order('sort_order', { ascending: true });
  if (error) throw error;
  return (data ?? []).map((r) => ({
    url: r.url,
    name: r.name,
    category: r.category,
    enabled: r.enabled,
  }));
}

export async function replaceFeeds(feeds: FeedSource[]): Promise<void> {
  const uid = await currentUserId();
  if (!uid) return;
  // Upsert-then-prune: keeps user-added feeds in sync without deleting
  // and reinserting on every mutation (which would churn read-state
  // FKs elsewhere if we later add them).
  const rows = feeds.map((f, i) => ({
    user_id: uid,
    url: f.url,
    name: f.name,
    category: f.category,
    enabled: f.enabled,
    sort_order: i,
  }));
  if (rows.length) {
    const { error } = await supabase
      .from('reading_feeds')
      .upsert(rows, { onConflict: 'user_id,url' });
    if (error) throw error;
  }
  const urls = feeds.map((f) => f.url);
  const del = supabase.from('reading_feeds').delete().eq('user_id', uid);
  const { error: delError } = urls.length
    ? await del.not('url', 'in', `(${urls.map((u) => `"${u.replace(/"/g, '\\"')}"`).join(',')})`)
    : await del;
  if (delError) throw delError;
}

// ─── Read state ───────────────────────────────────────────────────────

export async function listReadLinks(): Promise<string[] | null> {
  const uid = await currentUserId();
  if (!uid) return null;
  // Pull most-recent 5000 read markers — plenty for UI dimming;
  // ancient ones don't need to be in memory.
  const { data, error } = await supabase
    .from('reading_read_state')
    .select('article_link')
    .eq('user_id', uid)
    .order('read_at', { ascending: false })
    .limit(5000);
  if (error) throw error;
  return (data ?? []).map((r) => r.article_link);
}

export async function markRead(links: string[]): Promise<void> {
  const uid = await currentUserId();
  if (!uid || links.length === 0) return;
  const now = new Date().toISOString();
  const rows = links.map((l) => ({
    user_id: uid,
    article_link: l,
    read_at: now,
  }));
  const { error } = await supabase
    .from('reading_read_state')
    .upsert(rows, { onConflict: 'user_id,article_link' });
  if (error) throw error;
}

export async function markUnread(links: string[]): Promise<void> {
  const uid = await currentUserId();
  if (!uid || links.length === 0) return;
  const { error } = await supabase
    .from('reading_read_state')
    .delete()
    .eq('user_id', uid)
    .in('article_link', links);
  if (error) throw error;
}

// ─── Bookmarks ────────────────────────────────────────────────────────

export async function listBookmarks(): Promise<
  { link: string; snapshot: FeedItem }[] | null
> {
  const uid = await currentUserId();
  if (!uid) return null;
  const { data, error } = await supabase
    .from('reading_bookmarks')
    .select('article_link,snapshot,created_at')
    .eq('user_id', uid)
    .order('created_at', { ascending: false });
  if (error) throw error;
  return (data ?? []).map((r) => ({
    link: r.article_link,
    snapshot: r.snapshot as unknown as FeedItem,
  }));
}

export async function addBookmark(article: FeedItem): Promise<void> {
  const uid = await currentUserId();
  if (!uid || !article.link) return;
  const { error } = await supabase.from('reading_bookmarks').upsert(
    {
      user_id: uid,
      article_link: article.link,
      snapshot: article as unknown as Record<string, unknown>,
    },
    { onConflict: 'user_id,article_link' },
  );
  if (error) throw error;
}

export async function removeBookmark(link: string): Promise<void> {
  const uid = await currentUserId();
  if (!uid || !link) return;
  const { error } = await supabase
    .from('reading_bookmarks')
    .delete()
    .eq('user_id', uid)
    .eq('article_link', link);
  if (error) throw error;
}

// ─── Reader preferences ───────────────────────────────────────────────

export async function loadReaderPrefs(): Promise<ReaderPrefs | null> {
  const uid = await currentUserId();
  if (!uid) return null;
  const { data, error } = await supabase
    .from('reading_prefs')
    .select('prefs')
    .eq('user_id', uid)
    .maybeSingle();
  if (error) throw error;
  if (!data) return null;
  return { ...DEFAULT_PREFS, ...((data.prefs as Partial<ReaderPrefs>) ?? {}) };
}

export async function saveReaderPrefs(prefs: ReaderPrefs): Promise<void> {
  const uid = await currentUserId();
  if (!uid) return;
  const { error } = await supabase.from('reading_prefs').upsert(
    {
      user_id: uid,
      prefs: prefs as unknown as Record<string, unknown>,
    },
    { onConflict: 'user_id' },
  );
  if (error) throw error;
}
