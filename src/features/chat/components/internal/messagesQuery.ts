import { supabase } from '@/integrations/supabase/client';

import type { Message, MessageStatus, Reaction } from '../types';
import { decryptMessageList } from './e2ee';

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
  /**
   * The peer's user id. Required to open end-to-end encrypted bodies; when it is
   * absent (legacy call sites) encrypted messages simply render as unreadable
   * rather than failing the whole fetch.
   */
  peerUserId?: string,
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

  // Decrypt end-to-end encrypted bodies before they reach the renderer, so
  // every downstream consumer (bubbles, search, previews) sees plaintext.
  const decrypted = peerUserId
    ? await decryptMessageList({ myUserId: userId, peerUserId, conversationId }, hydrated)
    : hydrated;

  const msgIds = data.map(m => m.id);
  let reactions: Reaction[] = [];
  if (msgIds.length > 0) {
    const { data: rxns } = await supabase
      .from('message_reactions')
      .select('*')
      .in('message_id', msgIds);
    reactions = (rxns || []) as Reaction[];
  }

  return { messages: decrypted, reactions };
}