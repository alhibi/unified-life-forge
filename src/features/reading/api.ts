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
import type { Json } from '@/integrations/supabase/types';

import {
  extractedArticleSchema,
  fetchRssResponseSchema,
  type FetchRssResponse,
} from './schemas';
import type { FeedItem, FeedSource, ReaderPrefs } from './types';

const DEFAULT_PREFS: ReaderPrefs = {
  fontSize: 'md',
  lineHeight: 'normal',
  theme: 'system',
  fontFamily: 'sans',
  translationLang: 'ar',
  ttsSpeed: 1.0,
};

export async function currentUserId(): Promise<string | null> {
  try {
    // Use getSession() (local, no network) instead of getUser() (calls
    // /auth/v1/user on every invocation). The reading feature calls
    // this on every mutation; a network round-trip per call would
    // multiply latency and, worse, occasionally trigger TOKEN_REFRESHED
    // events that other listeners react to.
    const { data } = await supabase.auth.getSession();
    return data.session?.user?.id ?? null;
  } catch {
    return null;
  }
}

async function scopedUserId(expectedUserId?: string): Promise<string | null> {
  const uid = await currentUserId();
  if (expectedUserId !== undefined && uid !== expectedUserId) {
    throw new Error('Reading account changed');
  }
  return uid;
}

// ─── Feeds ────────────────────────────────────────────────────────────

export async function listFeeds(expectedUserId?: string): Promise<FeedSource[] | null> {
  const uid = await scopedUserId(expectedUserId);
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

export async function replaceFeeds(feeds: FeedSource[], expectedUserId?: string): Promise<void> {
  const uid = await scopedUserId(expectedUserId);
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

export async function listReadLinks(expectedUserId?: string): Promise<string[] | null> {
  const uid = await scopedUserId(expectedUserId);
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

export async function markRead(links: string[], expectedUserId?: string): Promise<void> {
  const uid = await scopedUserId(expectedUserId);
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

export async function markUnread(links: string[], expectedUserId?: string): Promise<void> {
  const uid = await scopedUserId(expectedUserId);
  if (!uid || links.length === 0) return;
  const { error } = await supabase
    .from('reading_read_state')
    .delete()
    .eq('user_id', uid)
    .in('article_link', links);
  if (error) throw error;
}

// ─── Bookmarks ────────────────────────────────────────────────────────

export async function listBookmarks(expectedUserId?: string): Promise<
  { link: string; snapshot: FeedItem }[] | null
> {
  const uid = await scopedUserId(expectedUserId);
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

export async function addBookmark(article: FeedItem, expectedUserId?: string): Promise<void> {
  const uid = await scopedUserId(expectedUserId);
  if (!uid || !article.link) return;
  const { error } = await supabase.from('reading_bookmarks').upsert(
    [{
      user_id: uid,
      article_link: article.link,
      snapshot: article as unknown as Json,
    }],
    { onConflict: 'user_id,article_link' },
  );
  if (error) throw error;
}

export async function removeBookmark(link: string, expectedUserId?: string): Promise<void> {
  const uid = await scopedUserId(expectedUserId);
  if (!uid || !link) return;
  const { error } = await supabase
    .from('reading_bookmarks')
    .delete()
    .eq('user_id', uid)
    .eq('article_link', link);
  if (error) throw error;
}

// ─── Reader preferences ───────────────────────────────────────────────

export async function loadReaderPrefs(expectedUserId?: string): Promise<ReaderPrefs | null> {
  const uid = await scopedUserId(expectedUserId);
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

export async function saveReaderPrefs(prefs: ReaderPrefs, expectedUserId?: string): Promise<void> {
  const uid = await scopedUserId(expectedUserId);
  if (!uid) return;
  const { error } = await supabase.from('reading_prefs').upsert(
    [{
      user_id: uid,
      prefs: prefs as unknown as Json,
    }],
    { onConflict: 'user_id' },
  );
  if (error) throw error;
}

// ─── Articles + edge functions ────────────────────────────────────────

interface StoredArticleRow {
  title: string;
  link: string;
  description: string | null;
  pub_date: string | null;
  created_at: string;
  image: string | null;
  images: Json | null;
  source_name: string;
}

function rowToFeedItem(row: StoredArticleRow): FeedItem {
  const images = Array.isArray(row.images)
    ? row.images.filter((value): value is string => typeof value === 'string')
    : [];
  return {
    title: row.title,
    link: row.link,
    description: row.description ?? '',
    fullContent: '',
    pubDate: row.pub_date ?? row.created_at,
    image: row.image,
    images,
    source: row.source_name,
  };
}

export async function listStoredArticles(
  sourceNames: ReadonlyArray<string>,
  limit = 300,
): Promise<FeedItem[]> {
  if (sourceNames.length === 0) return [];
  const { data, error } = await supabase
    .from('rss_articles')
    .select('title, link, description, pub_date, created_at, image, images, source_name')
    .in('source_name', [...sourceNames])
    .order('pub_date', { ascending: false })
    .limit(Math.max(1, Math.min(1000, Math.floor(limit))));
  if (error) throw error;
  return (data ?? []).map((row) => rowToFeedItem(row as StoredArticleRow));
}

export async function listStoredArticlesForSource(
  sourceName: string,
  limit = 100,
): Promise<FeedItem[]> {
  if (!sourceName) return [];
  const { data, error } = await supabase
    .from('rss_articles')
    .select('title, link, description, pub_date, created_at, image, images, source_name')
    .eq('source_name', sourceName)
    .order('pub_date', { ascending: false })
    .limit(Math.max(1, Math.min(500, Math.floor(limit))));
  if (error) throw error;
  return (data ?? []).map((row) => rowToFeedItem(row as StoredArticleRow));
}

export async function invokeFetchRss(input: {
  feeds: ReadonlyArray<FeedSource>;
  limit: number;
  fetchFullContent: boolean;
  store: boolean;
  requestId?: string;
}): Promise<FetchRssResponse> {
  const nameMap: Record<string, string> = {};
  for (const feed of input.feeds) nameMap[feed.url] = feed.name;
  const { data, error } = await supabase.functions.invoke('fetch-rss', {
    headers: input.requestId ? { 'x-request-id': input.requestId } : undefined,
    body: {
      urls: input.feeds.map((feed) => feed.url),
      limit: input.limit,
      fetchFullContent: input.fetchFullContent,
      store: input.store,
      nameMap,
    },
  });
  if (error) throw error;
  const candidate: unknown = typeof data === 'string' ? JSON.parse(data) : data;
  return fetchRssResponseSchema.parse(candidate);
}

export interface ExtractedArticlePayload {
  url: string;
  title: string;
  siteName?: string;
  description?: string;
  image: string | null;
  html: string;
  partial?: boolean;
  extractable?: boolean;
}

export async function invokeExtractArticle(url: string): Promise<ExtractedArticlePayload> {
  const { data, error } = await supabase.functions.invoke('extract-article', {
    body: { url },
  });
  if (error) throw error;
  return extractedArticleSchema.parse(data);
}
