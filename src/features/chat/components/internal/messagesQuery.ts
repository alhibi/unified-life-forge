import { supabase } from '@/integrations/supabase/client';
import type { Message, MessageStatus, Reaction } from '../types';

export interface FetchMessagesResult {
  messages: Message[];
  reactions: Reaction[];
}

/**
 * Load every message in a conversation (ascending) plus every reaction
 * attached to those messages. Hydrates the client-side `status` field
 * (sent/delivered/read) so ticks render correctly on first paint without
 * waiting for the initial realtime UPDATE.
 *
 * Throws the raw PostgrestError on failure so the caller can render a
 * localized toast — we don't own the i18n vocabulary here.
 */
export async function fetchMessagesWithReactions(
  conversationId: string,
  userId: string,
): Promise<FetchMessagesResult> {
  const { data, error } = await supabase
    .from('messages')
    .select('*')
    .eq('conversation_id', conversationId)
    .order('created_at', { ascending: true });

  if (error) throw error;
  if (!data) return { messages: [], reactions: [] };

  const hydrated = (data as Message[]).map(m => {
    if (m.sender_id !== userId) return m;
    let status: MessageStatus = 'sent';
    if (m.read) status = 'read';
    else if (m.delivered_at) status = 'delivered';
    return { ...m, status };
  });

  const msgIds = data.map(m => m.id);
  let reactions: Reaction[] = [];
  if (msgIds.length > 0) {
    const { data: rxns } = await supabase
      .from('message_reactions')
      .select('*')
      .in('message_id', msgIds);
    reactions = (rxns || []) as Reaction[];
  }

  return { messages: hydrated, reactions };
}