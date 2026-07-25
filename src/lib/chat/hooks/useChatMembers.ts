// useChatMembers — list members for the active chat with realtime
// invalidation when an admin adds / removes / promotes someone.

import type { RealtimeChannel } from '@supabase/supabase-js';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect } from 'react';

import { isSupabaseConfigured,supabase } from '@/integrations/supabase/client';

import * as api from '../api';
import { chatKeys } from '../queryKeys';
import type { ChatMember } from '../types';

export interface UseChatMembersResult {
  members: ChatMember[];
  isLoading: boolean;
  isError:   boolean;
  refetch:   () => Promise<void>;
}

export function useChatMembers(chatId: string | null | undefined): UseChatMembersResult {
  const qc = useQueryClient();

  const query = useQuery({
    queryKey: chatId ? chatKeys.members(chatId) : ['chat', 'members', 'disabled'],
    enabled: !!chatId && isSupabaseConfigured,
    staleTime: 60_000,
    queryFn: () => api.listChatMembers(chatId as string),
  });

  useEffect(() => {
    if (!chatId || !isSupabaseConfigured) return;
    const channel: RealtimeChannel = supabase
      .channel(`chat-members:${chatId}`)
      .on('postgres_changes',
        { event: '*', schema: 'public', table: 'chat_members', filter: `chat_id=eq.${chatId}` },
        () => { void qc.invalidateQueries({ queryKey: chatKeys.members(chatId) }); })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [chatId, qc]);

  return {
    members: query.data ?? [],
    isLoading: query.isLoading,
    isError:   query.isError,
    refetch:   async () => { await query.refetch(); },
  };
}
