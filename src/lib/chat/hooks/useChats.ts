// ─────────────────────────────────────────────────────────────────────────────
// useChats — single source of truth for the conversation list.
//
// Backed by React Query against `list_my_chats()`. The first paint comes
// from the IndexedDB cache (so the user sees their list instantly on cold
// boot), then we background-refetch and invalidate on realtime updates.
//
// Realtime triggers a debounced invalidation on:
//   • messages INSERT/UPDATE   (last message preview / unread count change)
//   • chat_members UPDATE      (role changed, pin/mute/archive flipped)
//   • chats UPDATE             (metadata changed by an admin)
//
// We deliberately avoid a per-chat `chat_members` listener; the global
// listener with chat-id filtering scales to many chats with one channel.
// ─────────────────────────────────────────────────────────────────────────────

import { useEffect, useMemo, useRef } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import type { RealtimeChannel } from '@supabase/supabase-js';
import { supabase, isSupabaseConfigured } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import * as api from '../api';
import { cacheChats, readCachedChats } from '../idbCache';
import { chatKeys } from '../queryKeys';
import type { ChatSummary } from '../types';

const REALTIME_INVALIDATION_DEBOUNCE_MS = 600;

export interface UseChatsResult {
  chats: ChatSummary[];
  isLoading: boolean;
  isError: boolean;
  error: Error | null;
  /** Ask the server for a fresh list (also re-warms IDB). */
  refresh: () => Promise<void>;
  /** Has the first server fetch landed yet? Useful for "show skeletons until
   *  we know there are no chats" UX. */
  isInitialLoaded: boolean;
}

export function useChats(): UseChatsResult {
  const { user } = useAuth();
  const userId = user?.id ?? null;
  const qc = useQueryClient();

  const initialDataRef = useRef<ChatSummary[] | undefined>(undefined);

  // Synchronously seed the React Query cache from IDB on first hook usage
  // for this user. We don't await — the query will swap in fresh server
  // data within a few hundred ms.
  if (initialDataRef.current === undefined && userId) {
    initialDataRef.current = qc.getQueryData<ChatSummary[]>(chatKeys.list()) ?? [];
    void readCachedChats().then(cached => {
      const have = qc.getQueryData<ChatSummary[]>(chatKeys.list());
      if ((!have || have.length === 0) && cached.length > 0) {
        qc.setQueryData(chatKeys.list(), cached);
      }
    });
  }

  const query = useQuery({
    queryKey: chatKeys.list(),
    enabled: !!userId && isSupabaseConfigured,
    staleTime: 30_000,
    gcTime: 10 * 60_000,
    // Groups RPC may be missing on some environments; listMyChats returns
    // [] gracefully in that case. Avoid the automatic exponential retry.
    retry: false,
    refetchOnWindowFocus: false,
    queryFn: async () => {
      const list = await api.listMyChats();
      // Side-effect: keep IDB warm.
      void cacheChats(list);
      return list;
    },
    placeholderData: prev => prev,
  });

  // ── Realtime invalidation ──────────────────────────────────────────────────
  useEffect(() => {
    if (!userId || !isSupabaseConfigured) return;
    let disposed = false;
    const channel: RealtimeChannel = supabase.channel(`chat-list:${userId}`);
    let pending: ReturnType<typeof setTimeout> | null = null;

    const schedule = () => {
      if (pending) clearTimeout(pending);
      pending = setTimeout(() => {
        if (disposed) return;
        void qc.invalidateQueries({ queryKey: chatKeys.list() });
      }, REALTIME_INVALIDATION_DEBOUNCE_MS);
    };

    channel
      .on('postgres_changes', { event: '*', schema: 'public', table: 'messages' },        schedule)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'conversations' },   schedule)
      .subscribe();

    return () => {
      disposed = true;
      if (pending) clearTimeout(pending);
      supabase.removeChannel(channel);
    };
  }, [userId, qc]);

  return useMemo<UseChatsResult>(() => ({
    chats:           query.data ?? [],
    isLoading:       query.isLoading,
    isError:         query.isError,
    error:           query.error as Error | null,
    refresh:         async () => { await query.refetch(); },
    isInitialLoaded: !query.isLoading && !query.isFetching && query.isFetched,
  }), [query]);
}
