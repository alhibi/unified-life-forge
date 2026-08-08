// ─────────────────────────────────────────────────────────────────────────────
// Thin, strongly-typed Supabase wrappers for chat operations.
//
// Every export here is:
//   • Pure — never reaches into React Query or the IDB cache directly.
//     Hooks compose these into mutations and queries.
//   • Throws on error — callers can rely on `try/catch` semantics rather
//     than the discriminated-union `{ data, error }` shape that supabase-js
//     returns natively.
//   • Returns hydrated domain models (ChatSummary, ChatMessage, …) where
//     possible, so calling code never has to remember the snake_case
//     column layout or the un-hydrated row's `as any` casts.
//
// This file is the single place where the column / RPC names appear in
// the codebase; if Supabase ever decides to rename `chat_id` to
// `room_id`, the diff is in one place.
// ─────────────────────────────────────────────────────────────────────────────

import { isSupabaseConfigured,supabase as _supabaseTyped } from '@/integrations/supabase/client';
import type { Database } from '@/integrations/supabase/types';

import {
  asChatKind, asChatRole,
  type ChatMember, type ChatMessage, type ChatSummary,
  type CreateGroupInput, effectiveStatus,
  messageFromDb, type SendMessageInput,
} from './types';

const supabase = _supabaseTyped;

// ── Internal helpers ─────────────────────────────────────────────────────────

function ensureConfigured(): void {
  if (!isSupabaseConfigured) {
    throw new Error('supabase_not_configured');
  }
}

// `list_my_chats` row shape (mirrors the migration's RETURNS TABLE).
type DbChatListRow = Database['public']['Functions']['list_my_chats']['Returns'][number];
type DbMembersRow  = Database['public']['Functions']['list_chat_members']['Returns'][number];

function rowToChatSummary(row: DbChatListRow): ChatSummary {
  return {
    id:                  row.chat_id,
    kind:                asChatKind(row.kind),
    title:               row.title,
    description:         row.description,
    avatarUrl:           row.avatar_url,
    isPublic:            row.is_public,
    whoCanSend:          (row.who_can_send as 'all' | 'admins') ?? 'all',
    legacyConversationId: row.legacy_conversation_id,
    pinnedMessageId:     row.pinned_message_id,
    selfDestructSeconds: row.self_destruct_seconds,
    updatedAt:           row.updated_at,
    createdAt:           row.created_at,
    myRole:              asChatRole(row.member_role),
    myPinnedAt:          row.member_pinned_at,
    myArchivedAt:        row.member_archived_at,
    myMutedUntil:        row.member_muted_until,
    myLastReadAt:        row.member_last_read_at,
    myDraftText:         row.member_draft_text,
    unreadCount:         row.unread_count ?? 0,
    memberCount:         row.member_count ?? 0,
    lastMessage: row.last_message_id ? {
      id:        row.last_message_id,
      at:        row.last_message_at ?? row.updated_at,
      kind:      row.last_message_kind ?? 'text',
      senderId:  row.last_message_sender ?? '',
      preview:   row.last_message_preview ?? '',
      deleted:   row.last_message_deleted,
    } : null,
    other: row.other_user_id ? {
      userId:      row.other_user_id,
      username:    row.other_username,
      displayName: row.other_display_name,
      avatarUrl:   row.other_avatar_url,
      lastSeen:    row.other_last_seen,
    } : null,
  };
}

function rowToChatMember(row: DbMembersRow): ChatMember {
  return {
    userId:       row.user_id,
    role:         asChatRole(row.role),
    customTitle:  row.custom_title,
    joinedAt:     row.joined_at,
    addedBy:      row.added_by,
    username:     row.username,
    displayName:  row.display_name,
    avatarUrl:    row.avatar_url,
    lastSeen:     row.last_seen,
  };
}

// ── Chats ────────────────────────────────────────────────────────────────────

export async function listMyChats(): Promise<ChatSummary[]> {
  ensureConfigured();
  const { data, error } = await supabase.rpc('list_my_chats');
  if (error) {
    // Groups schema (chats/chat_members/list_my_chats) hasn't been rolled
    // out on this project yet. Legacy 1-to-1 chat is handled by
    // `useChat.ts` directly against `conversations` — return empty here
    // instead of throwing so React Query doesn't retry-loop the 404 on
    // every realtime event.
    if ((error as { code?: string }).code === 'PGRST202' || /not find|schema cache/i.test(error.message ?? '')) {
      return [];
    }
    throw new Error(error.message);
  }
  return (data ?? []).map(rowToChatSummary);
}

export async function getChat(chatId: string): Promise<ChatSummary | null> {
  ensureConfigured();
  // Reuse list_my_chats and pick the row — keeps a single source of truth
  // for hydration. For very large chat lists we'd switch to a dedicated
  // get_chat RPC; up to ~hundreds of rows the cost is negligible.
  const all = await listMyChats();
  return all.find(c => c.id === chatId) ?? null;
}

export async function createOrGetDM(otherUserId: string): Promise<ChatSummary> {
  ensureConfigured();
  const { data, error } = await supabase.rpc('create_or_get_dm', { p_other_user_id: otherUserId });
  if (error) throw new Error(error.message);
  if (!data) throw new Error('create_or_get_dm: empty response');
  // The RPC returns a chats row; refresh the list to hydrate `lastMessage` etc.
  const all = await listMyChats();
  const found = all.find(c => c.id === data.id);
  if (!found) throw new Error('chat created but not visible to caller');
  return found;
}

export async function createGroupChat(input: CreateGroupInput): Promise<ChatSummary> {
  ensureConfigured();
  const { data, error } = await supabase.rpc('create_group_chat', {
    p_kind:        input.kind,
    p_title:       input.title,
    p_description: input.description ?? null,
    p_avatar_url:  input.avatarUrl   ?? null,
    p_member_ids:  input.memberIds   ?? [],
  });
  if (error) throw new Error(error.message);
  if (!data) throw new Error('create_group_chat: empty response');
  const all = await listMyChats();
  const found = all.find(c => c.id === data.id);
  if (!found) throw new Error('chat created but not visible to caller');
  return found;
}

export async function updateChatMetadata(input: {
  chatId: string;
  title?: string | null;
  description?: string | null;
  avatarUrl?: string | null;
}): Promise<void> {
  ensureConfigured();
  const { error } = await supabase.rpc('update_chat_metadata', {
    p_chat_id:     input.chatId,
    p_title:       input.title ?? null,
    p_description: input.description ?? null,
    p_avatar_url:  input.avatarUrl ?? null,
  });
  if (error) throw new Error(error.message);
}

export async function deleteChat(chatId: string): Promise<void> {
  ensureConfigured();
  const { error } = await supabase.from('chats').delete().eq('id', chatId);
  if (error) throw new Error(error.message);
}

// ── Members ──────────────────────────────────────────────────────────────────

export async function listChatMembers(chatId: string): Promise<ChatMember[]> {
  ensureConfigured();
  const { data, error } = await supabase.rpc('list_chat_members', { p_chat_id: chatId });
  if (error) throw new Error(error.message);
  return (data ?? []).map(rowToChatMember);
}

export async function addChatMember(chatId: string, userId: string): Promise<void> {
  ensureConfigured();
  const { error } = await supabase.rpc('add_chat_member', { p_chat_id: chatId, p_user_id: userId });
  if (error) throw new Error(error.message);
}

export async function removeChatMember(chatId: string, userId: string): Promise<void> {
  ensureConfigured();
  const { error } = await supabase.rpc('remove_chat_member', { p_chat_id: chatId, p_user_id: userId });
  if (error) throw new Error(error.message);
}

export async function leaveChat(chatId: string): Promise<void> {
  ensureConfigured();
  const { data: u, error: uErr } = await supabase.auth.getUser();
  if (uErr) throw new Error(uErr.message);
  const uid = u.user?.id;
  if (!uid) throw new Error('not authenticated');
  const { error } = await supabase.rpc('remove_chat_member', { p_chat_id: chatId, p_user_id: uid });
  if (error) throw new Error(error.message);
}

export async function updateChatMemberRole(
  chatId: string,
  userId: string,
  role: 'admin' | 'member',
): Promise<void> {
  ensureConfigured();
  const { error } = await supabase.rpc('update_chat_member_role', {
    p_chat_id: chatId,
    p_user_id: userId,
    p_new_role: role,
  });
  if (error) throw new Error(error.message);
}

// ── Per-member preferences ───────────────────────────────────────────────────

export async function setChatPinned(chatId: string, pinned: boolean): Promise<void> {
  ensureConfigured();
  const { error } = await supabase.rpc('set_chat_pinned', { p_chat_id: chatId, p_pinned: pinned });
  if (error) throw new Error(error.message);
}

export async function setChatArchived(chatId: string, archived: boolean): Promise<void> {
  ensureConfigured();
  const { error } = await supabase.rpc('set_chat_archived', { p_chat_id: chatId, p_archived: archived });
  if (error) throw new Error(error.message);
}

/** Pass `seconds = 0` to unmute, `< 0` to mute forever. */
export async function setChatMuted(chatId: string, seconds: number): Promise<void> {
  ensureConfigured();
  const { error } = await supabase.rpc('set_chat_muted', { p_chat_id: chatId, p_seconds: seconds });
  if (error) throw new Error(error.message);
}

export async function markChatRead(chatId: string, messageId?: string | null): Promise<void> {
  ensureConfigured();
  const { error } = await supabase.rpc('mark_chat_read', {
    p_chat_id:    chatId,
    p_message_id: messageId ?? null,
  });
  if (error) throw new Error(error.message);
}

export async function setChatDraft(chatId: string, text: string): Promise<void> {
  ensureConfigured();
  const { data: { session } } = await supabase.auth.getSession();
  const userId = session?.user?.id;
  if (!userId) return;

  // Try to upsert to message_drafts table first (as required by the local-to-cloud-migration.md target schema)
  const { error } = await supabase
    .from('message_drafts')
    .upsert({
      user_id: userId,
      conversation_id: chatId,
      body: text,
      updated_at: new Date().toISOString()
    });

  if (error) {
    // Fallback to legacy RPC set_chat_draft if table/RPC needs it
    const { error: rpcError } = await supabase.rpc('set_chat_draft', { p_chat_id: chatId, p_text: text });
    if (rpcError) throw new Error(rpcError.message);
  }
}

// ── Messages ─────────────────────────────────────────────────────────────────

export async function fetchMessagesPage(
  chatId: string,
  beforeId: string | null,
  limit: number = 50,
  viewerId: string | undefined,
): Promise<ChatMessage[]> {
  ensureConfigured();
  const { data, error } = await supabase.rpc('get_messages_paginated', {
    p_chat_id:   chatId,
    p_before_id: beforeId,
    p_limit:     limit,
  });
  if (error) throw new Error(error.message);
  // The RPC returns DESC; flip to ASC for the renderer's natural order.
  return (data ?? [])
    .map(row => messageFromDb(row, effectiveStatus(row, viewerId)))
    .reverse();
}

export async function sendMessage(input: SendMessageInput, viewerId: string): Promise<ChatMessage> {
  ensureConfigured();
  // Resolve conversation_id from chat_id if not supplied (DM legacy mirror).
  let convId = input.conversationId ?? null;
  if (!convId) {
    const { data: chat, error } = await supabase
      .from('chats')
      .select('legacy_conversation_id')
      .eq('id', input.chatId)
      .maybeSingle();
    if (error) throw new Error(error.message);
    convId = chat?.legacy_conversation_id ?? null;
  }

  if (!convId) {
    // For groups/channels we can't honour the legacy conversations.id NOT NULL
    // constraint without a sentinel row. We use the chat_id as a UUID-shaped
    // pseudo-conversation; legacy paths will skip it via the `chat_id IS NOT
    // NULL` branch in policies/triggers.
    convId = input.chatId;
  }

  const insertRow: Database['public']['Tables']['messages']['Insert'] = {
    conversation_id: convId,
    chat_id:         input.chatId,
    sender_id:       viewerId,
    content:         input.content,
    message_type:    input.kind,
    file_url:        input.fileUrl ?? null,
    file_name:       input.fileName ?? null,
    reply_to_id:     input.replyToId ?? null,
    client_id:       input.clientId,
    expires_at:      input.expiresAt ?? null,
    forwarded_from_message_id: input.forwardedFromMessageId ?? null,
    forwarded_from_sender_id:  input.forwardedFromSenderId  ?? null,
  };

  const { data, error } = await supabase
    .from('messages')
    .insert(insertRow)
    .select()
    .single();

  // Idempotency: 23505 = unique_violation on (sender_id, client_id). The
  // server already has the row; refetch and return that.
  if (error && (error as { code?: string }).code === '23505') {
    const { data: existing, error: refErr } = await supabase
      .from('messages')
      .select('*')
      .eq('sender_id', viewerId)
      .eq('client_id', input.clientId)
      .maybeSingle();
    if (refErr) throw new Error(refErr.message);
    if (!existing) throw new Error('send returned 23505 but no row found');
    return messageFromDb(existing, 'sent');
  }
  if (error) throw new Error(error.message);
  if (!data) throw new Error('send: empty response');
  return messageFromDb(data, 'sent');
}

export async function editMessage(messageId: string, newContent: string): Promise<void> {
  ensureConfigured();
  const { error } = await supabase
    .from('messages')
    .update({ content: newContent, edited_at: new Date().toISOString() })
    .eq('id', messageId);
  if (error) throw new Error(error.message);
}

export async function deleteMessageForEveryone(messageId: string): Promise<void> {
  ensureConfigured();
  const { error } = await supabase
    .from('messages')
    .update({ deleted: true, content: '', file_url: null, file_name: null })
    .eq('id', messageId);
  if (error) throw new Error(error.message);
}

export async function hideMessageForSelf(messageId: string): Promise<void> {
  ensureConfigured();
  const { error } = await supabase.rpc('hide_message_for_self', { p_message_id: messageId });
  if (error) throw new Error(error.message);
}

export async function markMessageDelivered(messageId: string): Promise<void> {
  ensureConfigured();
  const { error } = await supabase.rpc('mark_message_delivered', { p_message_id: messageId });
  if (error) throw new Error(error.message);
}

export async function markMessagesDelivered(conversationId: string): Promise<void> {
  ensureConfigured();
  const { error } = await supabase.rpc('mark_messages_delivered', { p_conversation_id: conversationId });
  if (error) throw new Error(error.message);
}

// ── Reactions ────────────────────────────────────────────────────────────────

export async function addReaction(messageId: string, emoji: string, userId: string): Promise<void> {
  ensureConfigured();
  const { error } = await supabase.from('message_reactions')
    .insert({ message_id: messageId, emoji, user_id: userId });
  if (error && (error as { code?: string }).code !== '23505') throw new Error(error.message);
}

export async function removeReaction(messageId: string, emoji: string, userId: string): Promise<void> {
  ensureConfigured();
  const { error } = await supabase.from('message_reactions')
    .delete()
    .eq('message_id', messageId)
    .eq('emoji', emoji)
    .eq('user_id', userId);
  if (error) throw new Error(error.message);
}

// ── Block / unblock ──────────────────────────────────────────────────────────

export async function blockUser(userId: string, reason?: string): Promise<void> {
  ensureConfigured();
  const { error } = await supabase.rpc('block_user', {
    p_user_id: userId,
    p_reason: reason ?? null,
  });
  if (error) throw new Error(error.message);
}

export async function unblockUser(userId: string): Promise<void> {
  ensureConfigured();
  const { error } = await supabase.rpc('unblock_user', { p_user_id: userId });
  if (error) throw new Error(error.message);
}

export async function listBlockedUsers(): Promise<Array<{
  blockedId: string; reason: string | null; createdAt: string;
  username: string | null; displayName: string | null; avatarUrl: string | null;
}>> {
  ensureConfigured();
  // Two-step: blocked_users → profiles join. Doing it in Supabase JS with a
  // foreign-key alias would require a server-side relationship that we
  // intentionally don't have (blocked_id references auth.users, not profiles).
  const { data: blocks, error } = await supabase.from('blocked_users').select('*');
  if (error) throw new Error(error.message);
  if (!blocks || blocks.length === 0) return [];
  const ids = blocks.map(b => b.blocked_id);
  const { data: profiles } = await supabase
    .from('profiles')
    .select('user_id, username, display_name, avatar_url')
    .in('user_id', ids);
  const profMap = new Map((profiles ?? []).map(p => [p.user_id, p]));
  return blocks.map(b => {
    const p = profMap.get(b.blocked_id);
    return {
      blockedId:   b.blocked_id,
      reason:      b.reason,
      createdAt:   b.created_at,
      username:    p?.username ?? null,
      displayName: p?.display_name ?? null,
      avatarUrl:   p?.avatar_url ?? null,
    };
  });
}

// ── User search (new chat / add member) ──────────────────────────────────────

export async function searchUsers(query: string, limit: number = 12): Promise<Array<{
  userId: string; username: string; displayName: string | null; avatarUrl: string | null;
}>> {
  ensureConfigured();
  const q = query.trim();
  if (q.length < 2) return [];
  const { data, error } = await supabase
    .rpc('search_profiles', { q, lim: limit });
  if (error) throw new Error(error.message);
  return (data ?? []).map(r => ({
    userId:      r.user_id,
    username:    r.username,
    displayName: r.display_name,
    avatarUrl:   r.avatar_url,
  }));
}

// ── Chat metadata change helpers (admin only) ────────────────────────────────

export async function updateChatPermissions(input: {
  chatId: string;
  whoCanSend?: 'all' | 'admins';
  whoCanAddMembers?: 'all' | 'admins';
  whoCanEditMeta?: 'admins' | 'owner';
}): Promise<void> {
  ensureConfigured();
  const patch: Database['public']['Tables']['chats']['Update'] = {};
  if (input.whoCanSend)        patch.who_can_send = input.whoCanSend;
  if (input.whoCanAddMembers)  patch.who_can_add_members = input.whoCanAddMembers;
  if (input.whoCanEditMeta)    patch.who_can_edit_meta = input.whoCanEditMeta;
  if (Object.keys(patch).length === 0) return;
  const { error } = await supabase.from('chats').update(patch).eq('id', input.chatId);
  if (error) throw new Error(error.message);
}

export async function setChatSelfDestruct(chatId: string, seconds: number | null): Promise<void> {
  ensureConfigured();
  const { error } = await supabase
    .from('chats')
    .update({ self_destruct_seconds: seconds })
    .eq('id', chatId);
  if (error) throw new Error(error.message);
}

export async function setChatPinnedMessage(chatId: string, messageId: string | null): Promise<void> {
  ensureConfigured();
  const { error } = await supabase
    .from('chats')
    .update({ pinned_message_id: messageId })
    .eq('id', chatId);
  if (error) throw new Error(error.message);
}