import { supabase } from '@/integrations/supabase/client';

import type { Message, MessageStatus, Reaction } from '../types';
import { decryptMessageList } from './e2ee';

export interface FetchMessagesResult {
  messages: Message[];
  reactions: Reaction[];
  /** True when older messages exist beyond the returned page. */
  hasMore: boolean;
}

/** Rows fetched per page. Telegram/WhatsApp load a window, not the archive. */
export const MESSAGE_PAGE_SIZE = 50;

export interface FetchMessagesOptions {
  /** Page size. Defaults to {@link MESSAGE_PAGE_SIZE}. */
  limit?: number;
  /** ISO timestamp cursor — return only messages strictly older than this. */
  before?: string;
}

/**
 * Load one page of a conversation's history (newest-first on the wire, returned
 * ascending) plus every reaction attached to those messages. Hydrates the
 * client-side `status` field (sent/delivered/read) so ticks render correctly on
 * first paint without waiting for the initial realtime UPDATE.
 *
 * Paging matters for more than speed: a multi-thousand-message thread used to
 * be decrypted and mounted in one shot on every open.
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
  options: FetchMessagesOptions = {},
): Promise<FetchMessagesResult> {
  const limit = options.limit ?? MESSAGE_PAGE_SIZE;

  let query = supabase
    .from('messages')
    .select('*')
    .eq('conversation_id', conversationId)
    .order('created_at', { ascending: false })
    .limit(limit);

  if (options.before) query = query.lt('created_at', options.before);

  const { data, error } = await query;

  if (error) throw error;
  if (!data) return { messages: [], reactions: [], hasMore: false };

  const hasMore = data.length === limit;
  // Wire order is newest-first (so the page is the *latest* slice); the UI
  // renders oldest-first.
  const page = (data as Message[]).slice().reverse();

  const hydrated = page.map(m => {
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

  const msgIds = page.map(m => m.id);
  let reactions: Reaction[] = [];
  if (msgIds.length > 0) {
    const { data: rxns } = await supabase
      .from('message_reactions')
      .select('*')
      .in('message_id', msgIds);
    reactions = (rxns || []) as Reaction[];
  }

  return { messages: decrypted, reactions, hasMore };
}
