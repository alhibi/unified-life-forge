// ─────────────────────────────────────────────────────────────────────────────
// useChatMessages — paginated, virtualization-friendly messages query.
//
// Powered by `useInfiniteQuery` so the chat history can be loaded in
// fixed-size pages (50 per page by default) instead of one giant SELECT.
// The first page paints from IDB; subsequent pages paginate via the
// `get_messages_paginated(chat_id, before_id, limit)` RPC.
//
// Realtime updates are merged into the React Query cache directly — INSERT
// rows are appended, UPDATE rows replace the prior entry by id, DELETE rows
// are removed. The hook exposes a flattened `messages` array plus
// `fetchPreviousPage()` for the infinite-scroll header.
//
// Optimistic updates / deduplication
//   The send path mints a `client_id`. When the realtime echo lands we
//   replace the optimistic row by client_id (not by id) so the swap is
//   stable even before the canonical `id` is known.
// ─────────────────────────────────────────────────────────────────────────────

import type { RealtimeChannel } from '@supabase/supabase-js';
import type { InfiniteData } from '@tanstack/react-query';
import { useInfiniteQuery, useQueryClient } from '@tanstack/react-query';
import { useCallback, useEffect, useMemo } from 'react';

import { useAuth } from '@/hooks/useAuth';
import { isSupabaseConfigured,supabase } from '@/integrations/supabase/client';

import * as api from '../api';
import {
  cacheMessages, deleteCachedMessage,
readCachedMessages, reconcileMessageByClientId, } from '../idbCache';
import { chatKeys } from '../queryKeys';
import {
  type ChatMessage, type DbMessage,
  effectiveStatus, messageFromDb,
} from '../types';

const PAGE_SIZE = 50;
/** Empty fallback queryKey when chatId is null. Module-level reference so
 *  React Query never sees a "new" array on each render and refetches. */
const DISABLED_KEY = ['chat', 'messages', 'infinite', 'disabled'] as const;

interface MessagesPage {
  /** ASC-ordered messages for this page. */
  messages: ChatMessage[];
  /** Cursor for the previous (older) page. NULL means we're at the top. */
  prevCursor: string | null;
}

type MessagesInfinite = InfiniteData<MessagesPage>;

export interface UseChatMessagesResult {
  messages: ChatMessage[];
  isLoading: boolean;
  isError: boolean;
  error: Error | null;
  hasMoreOlder: boolean;
  isFetchingOlder: boolean;
  loadOlder: () => Promise<void>;
  /**
   * Insert a local-only optimistic message (no network). Reconciled with
   * the canonical row when the realtime echo arrives, keyed by client_id.
   */
  pushOptimistic: (m: ChatMessage) => void;
  /**
   * Replace a row by client_id. Used by the send mutation when the insert
   * promise resolves before the realtime echo.
   */
  replaceByClientId: (clientId: string, next: ChatMessage) => void;
  /** Patch a specific row (status flip, edited content). */
  patchById: (id: string, patch: Partial<ChatMessage>) => void;
  /** Drop a row by id (delete-for-everyone, hide-for-me, expired). */
  removeById: (id: string) => void;
  /** Force a fresh refetch of the latest page. */
  refresh: () => Promise<void>;
}

export function useChatMessages(chatId: string | null | undefined): UseChatMessagesResult {
  const { user } = useAuth();
  const viewerId = user?.id;
  const qc = useQueryClient();

  const queryKey = useMemo(
    () => (chatId ? chatKeys.messagesInfinite(chatId) : DISABLED_KEY),
    [chatId],
  );

  const query = useInfiniteQuery<MessagesPage, Error>({
    queryKey,
    enabled: !!chatId && isSupabaseConfigured,
    initialPageParam: null as string | null,
    getNextPageParam: () => null,
    getPreviousPageParam: (firstPage) => firstPage.prevCursor,
    queryFn: async ({ pageParam }) => {
      const cursor = (pageParam as string | null) ?? null;
      const page = await api.fetchMessagesPage(chatId as string, cursor, PAGE_SIZE, viewerId);
      // Side-effect: warm IDB. Cheap and helpful for cold-boot paint next time.
      void cacheMessages(chatId as string, page);
      return {
        messages: page,
        prevCursor: page.length === PAGE_SIZE ? page[0].id : null,
      } satisfies MessagesPage;
    },
    placeholderData: prev => prev,
  });

  // ── IDB warmup: if the first page hasn't landed and we have something
  //     cached, seed it synchronously so the user sees content fast.
  // ───────────────────────────────────────────────────────────────────────────
  useEffect(() => {
    if (!chatId) return;
    const cur = qc.getQueryData<MessagesInfinite>(queryKey);
    if (cur && cur.pages.length > 0) return;
    void readCachedMessages(chatId, PAGE_SIZE).then(cached => {
      if (cached.length === 0) return;
      const existing = qc.getQueryData<MessagesInfinite>(queryKey);
      if (existing && existing.pages.length > 0) return;
      qc.setQueryData<MessagesInfinite>(queryKey, {
        pageParams: [null],
        pages: [{
          messages: cached,
          prevCursor: cached.length === PAGE_SIZE ? cached[0].id : null,
        }],
      });
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [chatId, qc]);

  // ── Realtime: subscribe to the chat's INSERT/UPDATE/DELETE events ──────────
  useEffect(() => {
    if (!chatId || !isSupabaseConfigured) return;
    const channel: RealtimeChannel = supabase.channel(`chat:${chatId}`);

    const onInsert = (row: DbMessage) => {
      mergeRealtimeInsert(qc, queryKey, row, viewerId);
    };
    const onUpdate = (row: DbMessage) => {
      mergeRealtimeUpdate(qc, queryKey, row, viewerId);
    };
    const onDelete = (row: DbMessage) => {
      removeFromCache(qc, queryKey, row.id);
      void deleteCachedMessage(row.id);
    };

    channel
      .on('postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'messages', filter: `chat_id=eq.${chatId}` },
        (payload) => onInsert(payload.new as DbMessage))
      .on('postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'messages', filter: `chat_id=eq.${chatId}` },
        (payload) => onUpdate(payload.new as DbMessage))
      .on('postgres_changes',
        { event: 'DELETE', schema: 'public', table: 'messages', filter: `chat_id=eq.${chatId}` },
        (payload) => onDelete(payload.old as DbMessage))
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [chatId, qc, queryKey, viewerId]);

  // ── Public mutators (used by the send / edit / delete hooks) ───────────────
  const pushOptimistic = useCallback((m: ChatMessage) => {
    qc.setQueryData<MessagesInfinite>(queryKey, prev => appendToPages(prev, m));
  }, [qc, queryKey]);

  const replaceByClientId = useCallback((clientId: string, next: ChatMessage) => {
    qc.setQueryData<MessagesInfinite>(queryKey, prev => replaceByClientIdInPages(prev, clientId, next));
    void reconcileMessageByClientId(clientId, next);
  }, [qc, queryKey]);

  const patchById = useCallback((id: string, patch: Partial<ChatMessage>) => {
    qc.setQueryData<MessagesInfinite>(queryKey, prev => patchInPages(prev, id, patch));
  }, [qc, queryKey]);

  const removeById = useCallback((id: string) => {
    qc.setQueryData<MessagesInfinite>(queryKey, prev => removeInPages(prev, id));
    void deleteCachedMessage(id);
  }, [qc, queryKey]);

  const messages = useMemo<ChatMessage[]>(() => {
    if (!query.data) return [];
    // Pages come oldest-first (page[0] is the *first* page we fetched, which
    // is the latest 50 messages; subsequent pages are older). Concatenate
    // in reverse so the resulting array is strictly ASC by created_at.
    const out: ChatMessage[] = [];
    for (let i = query.data.pages.length - 1; i >= 0; i--) {
      out.push(...query.data.pages[i].messages);
    }
    return out;
  }, [query.data]);

  const loadOlder = useCallback(async () => {
    if (!query.hasPreviousPage || query.isFetchingPreviousPage) return;
    await query.fetchPreviousPage();
  }, [query]);

  return {
    messages,
    isLoading:        query.isLoading,
    isError:          query.isError,
    error:            query.error as Error | null,
    hasMoreOlder:     !!query.hasPreviousPage,
    isFetchingOlder:  query.isFetchingPreviousPage,
    loadOlder,
    pushOptimistic,
    replaceByClientId,
    patchById,
    removeById,
    refresh: async () => { await query.refetch(); },
  };
}

// ── Internal cache mutators ─────────────────────────────────────────────────

function appendToPages(prev: MessagesInfinite | undefined, m: ChatMessage): MessagesInfinite {
  if (!prev || prev.pages.length === 0) {
    return { pageParams: [null], pages: [{ messages: [m], prevCursor: null }] };
  }
  const next = clonePages(prev);
  // Page[0] is the latest page — append to it.
  const lastPage = next.pages[0];
  next.pages[0] = { ...lastPage, messages: [...lastPage.messages, m] };
  return next;
}

function replaceByClientIdInPages(
  prev: MessagesInfinite | undefined,
  clientId: string,
  next: ChatMessage,
): MessagesInfinite | undefined {
  if (!prev) return prev;
  const out = clonePages(prev);
  for (let i = 0; i < out.pages.length; i++) {
    const page = out.pages[i];
    let touched = false;
    const msgs = page.messages.map(m => {
      if (m.clientId === clientId) { touched = true; return next; }
      // Also catch the case where the realtime canonical row arrives FIRST
      // and we need to dedup against it when the optimistic id is later
      // merged in.
      if (m.id === next.id) { touched = true; return next; }
      return m;
    });
    if (touched) {
      out.pages[i] = { ...page, messages: msgs };
      return out;
    }
  }
  // Not found anywhere — append.
  out.pages[0] = {
    ...out.pages[0],
    messages: [...out.pages[0].messages, next],
  };
  return out;
}

function patchInPages(
  prev: MessagesInfinite | undefined,
  id: string,
  patch: Partial<ChatMessage>,
): MessagesInfinite | undefined {
  if (!prev) return prev;
  const out = clonePages(prev);
  for (let i = 0; i < out.pages.length; i++) {
    const page = out.pages[i];
    let touched = false;
    const msgs = page.messages.map(m => {
      if (m.id === id) { touched = true; return { ...m, ...patch }; }
      return m;
    });
    if (touched) {
      out.pages[i] = { ...page, messages: msgs };
      return out;
    }
  }
  return prev;
}

function removeInPages(
  prev: MessagesInfinite | undefined,
  id: string,
): MessagesInfinite | undefined {
  if (!prev) return prev;
  const out = clonePages(prev);
  let touched = false;
  for (let i = 0; i < out.pages.length; i++) {
    const page = out.pages[i];
    const filtered = page.messages.filter(m => m.id !== id);
    if (filtered.length !== page.messages.length) {
      out.pages[i] = { ...page, messages: filtered };
      touched = true;
    }
  }
  return touched ? out : prev;
}

function mergeRealtimeInsert(
  qc: ReturnType<typeof useQueryClient>,
  queryKey: readonly unknown[],
  row: DbMessage,
  viewerId: string | undefined,
) {
  const incoming = messageFromDb(row, effectiveStatus(row, viewerId));
  qc.setQueryData<MessagesInfinite>(queryKey, prev => {
    if (!prev) return { pageParams: [null], pages: [{ messages: [incoming], prevCursor: null }] };
    // Dedup by id and by client_id (optimistic swap).
    const out = clonePages(prev);
    for (let i = 0; i < out.pages.length; i++) {
      const page = out.pages[i];
      const idx = page.messages.findIndex(
        m => m.id === incoming.id || (incoming.clientId && m.clientId === incoming.clientId),
      );
      if (idx >= 0) {
        const next = [...page.messages];
        next[idx] = incoming;
        out.pages[i] = { ...page, messages: next };
        return out;
      }
    }
    // Append to latest page (page[0]).
    out.pages[0] = { ...out.pages[0], messages: [...out.pages[0].messages, incoming] };
    return out;
  });
  if (incoming.chatId) void cacheMessages(incoming.chatId, [incoming]);
}

function mergeRealtimeUpdate(
  qc: ReturnType<typeof useQueryClient>,
  queryKey: readonly unknown[],
  row: DbMessage,
  viewerId: string | undefined,
) {
  const incoming = messageFromDb(row, effectiveStatus(row, viewerId));
  qc.setQueryData<MessagesInfinite>(queryKey, prev => {
    if (!prev) return prev;
    const out = clonePages(prev);
    for (let i = 0; i < out.pages.length; i++) {
      const page = out.pages[i];
      const idx = page.messages.findIndex(m => m.id === incoming.id);
      if (idx >= 0) {
        // Preserve any client-only state we've accumulated locally
        // (e.g. "pending" -> "sent" was already done; don't downgrade).
        const merged = { ...page.messages[idx], ...incoming };
        const next = [...page.messages];
        next[idx] = merged;
        out.pages[i] = { ...page, messages: next };
        return out;
      }
    }
    return prev;
  });
}

function removeFromCache(
  qc: ReturnType<typeof useQueryClient>,
  queryKey: readonly unknown[],
  id: string,
) {
  qc.setQueryData<MessagesInfinite>(queryKey, prev => removeInPages(prev, id));
}

function clonePages(p: MessagesInfinite): MessagesInfinite {
  return { pageParams: [...p.pageParams], pages: p.pages.map(pg => ({ ...pg })) };
}