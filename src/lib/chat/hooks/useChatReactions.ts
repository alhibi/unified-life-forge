// useChatReactions — load every reaction in a chat in one query, indexed
// by message_id for O(1) lookup from the message bubble. Realtime keeps
// the cache in sync.

import { useEffect, useMemo } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase, isSupabaseConfigured } from '@/integrations/supabase/client';
import { chatKeys } from '../queryKeys';
import type { ChatReaction, DbReaction } from '../types';

function rowToReaction(r: DbReaction): ChatReaction {
  return {
    id:        r.id,
    messageId: r.message_id,
    userId:    r.user_id,
    emoji:     r.emoji,
    createdAt: r.created_at,
  };
}

export interface UseChatReactionsResult {
  reactions: ChatReaction[];
  byMessage: Map<string, ChatReaction[]>;
  isLoading: boolean;
}

export function useChatReactions(chatId: string | null | undefined): UseChatReactionsResult {
  const qc = useQueryClient();

  const query = useQuery<ChatReaction[]>({
    queryKey: chatId ? chatKeys.reactions(chatId) : ['chat', 'reactions', 'disabled'],
    enabled: !!chatId && isSupabaseConfigured,
    staleTime: 30_000,
    queryFn: async () => {
      // The reactions table doesn't carry chat_id directly; the join goes
      // via messages.chat_id. We use a two-step IN-clause query so we don't
      // need a server-side view for now.
      const { data: msgs, error: e1 } = await supabase
        .from('messages')
        .select('id')
        .eq('chat_id', chatId as string);
      if (e1) throw new Error(e1.message);
      const ids = (msgs ?? []).map(m => m.id);
      if (ids.length === 0) return [];
      const { data, error } = await supabase
        .from('message_reactions')
        .select('*')
        .in('message_id', ids);
      if (error) throw new Error(error.message);
      return (data ?? []).map(rowToReaction);
    },
  });

  // Realtime: append/remove on INSERT/DELETE for any message in this chat.
  // We keep the per-message subscription approach for simplicity (one
  // channel for the entire chat tracks reactions across all of its
  // messages, which is identical in cost to one global channel filtered
  // by message_id IN(...)).
  useEffect(() => {
    if (!chatId || !isSupabaseConfigured) return;
    const channel = supabase
      .channel(`chat-reactions:${chatId}`)
      .on('postgres_changes',
        { event: '*', schema: 'public', table: 'message_reactions' },
        () => { void qc.invalidateQueries({ queryKey: chatKeys.reactions(chatId) }); })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [chatId, qc]);

  const byMessage = useMemo(() => {
    const map = new Map<string, ChatReaction[]>();
    for (const r of (query.data ?? [])) {
      const arr = map.get(r.messageId);
      if (arr) arr.push(r); else map.set(r.messageId, [r]);
    }
    return map;
  }, [query.data]);

  return {
    reactions: query.data ?? [],
    byMessage,
    isLoading: query.isLoading,
  };
}
