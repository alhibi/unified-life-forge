/**
 * Marginalia data access. Reads go straight through RLS-scoped tables;
 * ingestion, discovery and chat go through edge functions because they
 * hold the model keys.
 */
import { supabase } from '@/integrations/supabase/client';

import type {
  MgArticle,
  MgConnection,
  MgConnectionStatus,
  MgConversation,
  MgLens,
  MgMessage,
  MgPin,
  MgSource,
} from './types';

/* eslint-disable @typescript-eslint/no-explicit-any -- mg_* tables are not in the generated types yet. */
const db = supabase as any;

const FN_BASE = `${(import.meta as any).env.VITE_SUPABASE_URL}/functions/v1`;

async function authHeaders(): Promise<Record<string, string>> {
  const { data } = await supabase.auth.getSession();
  const token = data.session?.access_token;
  if (!token) throw new Error('يجب تسجيل الدخول أولاً');
  return { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' };
}

async function invoke<T>(fn: string, body: unknown): Promise<T> {
  const res = await fetch(`${FN_BASE}/${fn}`, {
    method: 'POST',
    headers: await authHeaders(),
    body: JSON.stringify(body ?? {}),
  });
  const text = await res.text();
  let parsed: any = null;
  try { parsed = text ? JSON.parse(text) : null; } catch { /* non-JSON error body */ }
  if (!res.ok) throw new Error(parsed?.error || `فشل الطلب (${res.status})`);
  return parsed as T;
}

export const marginaliaApi = {
  /* ── Sources ─────────────────────────────────────────────────────── */
  async listSources(): Promise<MgSource[]> {
    const { data, error } = await db.from('mg_sources')
      .select('id,name,feed_url,active,last_fetched_at,last_error')
      .order('created_at', { ascending: true });
    if (error) throw error;
    return (data ?? []) as MgSource[];
  },

  async addSource(name: string, feedUrl: string): Promise<MgSource> {
    const { data: auth } = await supabase.auth.getUser();
    const userId = auth.user?.id;
    if (!userId) throw new Error('يجب تسجيل الدخول أولاً');
    const { data, error } = await db.from('mg_sources')
      .insert({ user_id: userId, name: name.trim(), feed_url: feedUrl.trim() })
      .select('id,name,feed_url,active,last_fetched_at,last_error')
      .single();
    if (error) throw error;
    return data as MgSource;
  },

  async setSourceActive(id: string, active: boolean): Promise<void> {
    const { error } = await db.from('mg_sources').update({ active }).eq('id', id);
    if (error) throw error;
  },

  async removeSource(id: string): Promise<void> {
    const { error } = await db.from('mg_sources').delete().eq('id', id);
    if (error) throw error;
  },

  /* ── Articles ────────────────────────────────────────────────────── */
  async listArticles(limit = 120): Promise<MgArticle[]> {
    const { data, error } = await db.from('mg_articles')
      .select('id,source_id,url,title,author,published_at,fetched_at,summary,domain_tags,word_count,status,error_message')
      .order('fetched_at', { ascending: false })
      .limit(limit);
    if (error) throw error;
    return (data ?? []) as MgArticle[];
  },

  async removeArticle(id: string): Promise<void> {
    const { error } = await db.from('mg_articles').delete().eq('id', id);
    if (error) throw error;
  },

  addArticle(url: string) {
    return invoke<{ outcome: { status: string; reason?: string; title?: string } }>(
      'mg-add-article', { url },
    );
  },

  ingest(sourceId?: string) {
    return invoke<{ processed: number; results: unknown[] }>('mg-ingest', { sourceId });
  },

  /* ── Connections ─────────────────────────────────────────────────── */
  async listConnections(status?: MgConnectionStatus): Promise<MgConnection[]> {
    let q = db.from('mg_connections')
      .select('id,article_ids,lens,connection_text,why_it_matters,novelty_score,confidence_label,status,model_used,created_at')
      .order('novelty_score', { ascending: false })
      .order('created_at', { ascending: false })
      .limit(120);
    if (status) q = q.eq('status', status);
    const { data, error } = await q;
    if (error) throw error;
    return (data ?? []) as MgConnection[];
  },

  async setConnectionStatus(id: string, status: MgConnectionStatus): Promise<void> {
    const { error } = await db.from('mg_connections').update({ status }).eq('id', id);
    if (error) throw error;
  },

  discover(lenses?: MgLens[]) {
    return invoke<{ created: number; sampled?: number; note?: string; errors?: string[] }>(
      'mg-discover', { lenses },
    );
  },

  /* ── Pinboard ────────────────────────────────────────────────────── */
  async listPins(): Promise<MgPin[]> {
    const { data, error } = await db.from('mg_pinboard')
      .select('id,connection_id,user_note,pinned_at')
      .order('pinned_at', { ascending: false });
    if (error) throw error;
    return (data ?? []) as MgPin[];
  },

  async pin(connectionId: string, note?: string): Promise<void> {
    const { data: auth } = await supabase.auth.getUser();
    const userId = auth.user?.id;
    if (!userId) throw new Error('يجب تسجيل الدخول أولاً');
    const { error } = await db.from('mg_pinboard')
      .upsert({ user_id: userId, connection_id: connectionId, user_note: note ?? null },
        { onConflict: 'user_id,connection_id' });
    if (error) throw error;
    await this.setConnectionStatus(connectionId, 'kept');
  },

  async updatePinNote(id: string, note: string): Promise<void> {
    const { error } = await db.from('mg_pinboard').update({ user_note: note }).eq('id', id);
    if (error) throw error;
  },

  async unpin(id: string): Promise<void> {
    const { error } = await db.from('mg_pinboard').delete().eq('id', id);
    if (error) throw error;
  },

  /* ── Conversations ───────────────────────────────────────────────── */
  async listConversations(): Promise<MgConversation[]> {
    const { data, error } = await db.from('mg_conversations')
      .select('id,title,seed_connection_id,updated_at')
      .order('updated_at', { ascending: false })
      .limit(50);
    if (error) throw error;
    return (data ?? []) as MgConversation[];
  },

  async createConversation(seedConnectionId?: string, title?: string): Promise<MgConversation> {
    const { data: auth } = await supabase.auth.getUser();
    const userId = auth.user?.id;
    if (!userId) throw new Error('يجب تسجيل الدخول أولاً');
    const { data, error } = await db.from('mg_conversations')
      .insert({ user_id: userId, seed_connection_id: seedConnectionId ?? null, title: title ?? null })
      .select('id,title,seed_connection_id,updated_at')
      .single();
    if (error) throw error;
    return data as MgConversation;
  },

  async listMessages(conversationId: string): Promise<MgMessage[]> {
    const { data, error } = await db.from('mg_messages')
      .select('id,conversation_id,role,content,model_used,cited_article_ids,created_at')
      .eq('conversation_id', conversationId)
      .order('created_at', { ascending: true });
    if (error) throw error;
    return (data ?? []) as MgMessage[];
  },

  /**
   * Streams an answer token-by-token. `onDelta` fires per chunk; the promise
   * resolves with the full text plus the article ids the model was given.
   */
  async streamChat(
    conversationId: string,
    message: string,
    onDelta: (delta: string) => void,
    signal?: AbortSignal,
  ): Promise<{ text: string; citedArticleIds: string[]; model?: string }> {
    const res = await fetch(`${FN_BASE}/mg-chat`, {
      method: 'POST',
      headers: await authHeaders(),
      body: JSON.stringify({ conversationId, message }),
      signal,
    });
    if (!res.ok || !res.body) {
      let reason = `فشل الطلب (${res.status})`;
      try { reason = (await res.json())?.error ?? reason; } catch { /* keep default */ }
      throw new Error(reason);
    }
    const reader = res.body.getReader();
    const decoder = new TextDecoder();
    let buffer = '';
    let text = '';
    let citedArticleIds: string[] = [];
    let model: string | undefined;
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split('\n');
      buffer = lines.pop() ?? '';
      for (const line of lines) {
        if (!line.startsWith('data:')) continue;
        const payload = line.slice(5).trim();
        if (!payload) continue;
        try {
          const evt = JSON.parse(payload);
          if (evt.error) throw new Error(evt.error);
          if (typeof evt.delta === 'string') { text += evt.delta; onDelta(evt.delta); }
          if (evt.done) {
            citedArticleIds = evt.citedArticleIds ?? [];
            model = evt.model;
          }
        } catch (e) {
          if ((e as Error).message && !(e as Error).message.startsWith('Unexpected')) throw e;
        }
      }
    }
    return { text, citedArticleIds, model };
  },
};
