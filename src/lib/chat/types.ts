// ─────────────────────────────────────────────────────────────────────────────
// Wave-1 chat types.
//
// These models replace the loosely-typed `Conversation` + `Message` shapes in
// `src/components/chat/types.ts` with discriminated unions that distinguish
// raw DB rows from hydrated, view-ready models. The legacy types are still
// exported for back-compat — code that hasn't been migrated to the new model
// reads the deprecated names without changes.
// ─────────────────────────────────────────────────────────────────────────────

import type { Database } from '@/integrations/supabase/types';

// ── Raw DB rows ──────────────────────────────────────────────────────────────
// These mirror the table definitions exactly. Use them when you need the
// type that `supabase.from('table').select('*')` returns.
export type DbChat            = Database['public']['Tables']['chats']['Row'];
export type DbChatInsert      = Database['public']['Tables']['chats']['Insert'];
export type DbChatUpdate      = Database['public']['Tables']['chats']['Update'];
export type DbChatMember      = Database['public']['Tables']['chat_members']['Row'];
export type DbChatMemberInsert = Database['public']['Tables']['chat_members']['Insert'];
export type DbChatMemberUpdate = Database['public']['Tables']['chat_members']['Update'];
export type DbChatAttachment  = Database['public']['Tables']['chat_attachments']['Row'];
export type DbConversation    = Database['public']['Tables']['conversations']['Row'];
export type DbMessage         = Database['public']['Tables']['messages']['Row'];
export type DbMessageInsert   = Database['public']['Tables']['messages']['Insert'];
export type DbMessageUpdate   = Database['public']['Tables']['messages']['Update'];
export type DbProfile         = Database['public']['Tables']['profiles']['Row'];
export type DbReaction        = Database['public']['Tables']['message_reactions']['Row'];
export type DbBlockedUser     = Database['public']['Tables']['blocked_users']['Row'];

// ── Domain enums ─────────────────────────────────────────────────────────────
/** What kind of chat this is. Drives RLS, UI, and capability flags. */
export type ChatKind     = 'dm' | 'group' | 'channel';
/** A member's role inside a chat (DMs only ever have `'member'`). */
export type ChatRole     = 'owner' | 'admin' | 'member';
/** Server-side message types (extensible — keep as `string` in transit). */
export type MessageKind  =
  | 'text' | 'image' | 'voice' | 'file'
  | 'video' | 'sticker' | 'gif'
  | 'location' | 'contact' | 'poll' | 'system';
/** Client-only delivery state. Drives the bubble tick. */
export type MessageStatus = 'pending' | 'sent' | 'delivered' | 'read' | 'failed';

// ── Hydrated, view-ready models ──────────────────────────────────────────────
//
// `ChatSummary` is what `list_my_chats()` returns: enough denormalized data
// to render a row in the conversation list without any follow-up queries.
//
// `Chat` is the full hydrated chat object used by the active-room view —
// includes member count and the caller's own membership row.
//
// `ChatMember` is a hydrated member entry (DB row + profile fields).
//
// `ChatMessage` is a `Message` enriched with `status` (client-only) and a
// resolved sender name where useful.
// ─────────────────────────────────────────────────────────────────────────────

export interface ChatSummary {
  id: string;
  kind: ChatKind;
  /** Group/channel only. NULL for DMs — derive from `other.*` in the UI. */
  title: string | null;
  description: string | null;
  avatarUrl: string | null;
  isPublic: boolean;
  whoCanSend: 'all' | 'admins';
  /** Legacy DM-only — back-compat with old code paths. */
  legacyConversationId: string | null;
  pinnedMessageId: string | null;
  selfDestructSeconds: number | null;
  updatedAt: string;
  createdAt: string;
  /** Caller's own membership view of this chat. */
  myRole: ChatRole;
  myPinnedAt: string | null;
  myArchivedAt: string | null;
  myMutedUntil: string | null;
  myLastReadAt: string | null;
  myDraftText: string | null;
  unreadCount: number;
  memberCount: number;
  lastMessage: {
    id: string;
    at: string;
    kind: string;
    senderId: string;
    preview: string;
    deleted: boolean;
  } | null;
  /** Populated only for DMs. */
  other: {
    userId: string;
    username: string | null;
    displayName: string | null;
    avatarUrl: string | null;
    lastSeen: string | null;
  } | null;
}

export interface ChatMember {
  userId: string;
  role: ChatRole;
  customTitle: string | null;
  joinedAt: string;
  addedBy: string | null;
  username: string | null;
  displayName: string | null;
  avatarUrl: string | null;
  lastSeen: string | null;
}

export interface Chat extends ChatSummary {
  /** Up to 200 members hydrated alongside the chat (groups). DMs return []. */
  members: ChatMember[];
}

export interface ChatMessage {
  id: string;
  /** Always populated for new-model messages; NULL for legacy rows that
   * predate the chat_id column and haven't been backfilled. */
  chatId: string | null;
  conversationId: string;
  senderId: string;
  content: string;
  kind: MessageKind;
  read: boolean;
  createdAt: string;
  replyToId: string | null;
  fileUrl: string | null;
  fileName: string | null;
  deleted: boolean;
  editedAt: string | null;
  deliveredAt: string | null;
  expiresAt: string | null;
  hiddenFor: string[];
  clientId: string | null;
  forwardedFromMessageId: string | null;
  forwardedFromSenderId: string | null;
  /** Client-only — never persisted. */
  status: MessageStatus;
}

export interface ChatReaction {
  id: string;
  messageId: string;
  userId: string;
  emoji: string;
  createdAt: string;
}

// ── Mutation payloads ────────────────────────────────────────────────────────
export interface SendMessageInput {
  chatId: string;
  /** Will be backfilled from chats.legacy_conversation_id when the chat is a
   * DM. Group/channel sends pass undefined and rely on chat_id alone. */
  conversationId?: string;
  kind: MessageKind;
  content: string;
  fileUrl?: string | null;
  fileName?: string | null;
  replyToId?: string | null;
  /** Set this to enable per-message self-destruct. The chat-level setting
   * is used as the default by the caller. */
  expiresAt?: string | null;
  /** Forward provenance (set when this is a forwarded message). */
  forwardedFromMessageId?: string | null;
  forwardedFromSenderId?: string | null;
  /** Required: client-supplied UUID for idempotent inserts. */
  clientId: string;
}

export interface CreateGroupInput {
  kind: 'group' | 'channel';
  title: string;
  description?: string | null;
  avatarUrl?: string | null;
  /** Other user ids to add as members alongside the caller (owner). */
  memberIds?: string[];
}

// ── Type guards / converters ─────────────────────────────────────────────────

const VALID_KINDS = new Set<MessageKind>([
  'text', 'image', 'voice', 'file', 'video',
  'sticker', 'gif', 'location', 'contact', 'poll', 'system',
]);

/** Safely narrow an unknown DB string to a `MessageKind`. */
export function asMessageKind(v: unknown): MessageKind {
  return typeof v === 'string' && VALID_KINDS.has(v as MessageKind)
    ? (v as MessageKind)
    : 'text';
}

const VALID_ROLES = new Set<ChatRole>(['owner', 'admin', 'member']);
export function asChatRole(v: unknown): ChatRole {
  return typeof v === 'string' && VALID_ROLES.has(v as ChatRole)
    ? (v as ChatRole)
    : 'member';
}

const VALID_KINDS_CHAT = new Set<ChatKind>(['dm', 'group', 'channel']);
export function asChatKind(v: unknown): ChatKind {
  return typeof v === 'string' && VALID_KINDS_CHAT.has(v as ChatKind)
    ? (v as ChatKind)
    : 'dm';
}

/** Map a raw `messages` row to the hydrated `ChatMessage` shape. */
export function messageFromDb(row: DbMessage, status: MessageStatus = 'sent'): ChatMessage {
  return {
    id: row.id,
    chatId: row.chat_id ?? null,
    conversationId: row.conversation_id,
    senderId: row.sender_id,
    content: row.content,
    kind: asMessageKind(row.message_type),
    read: row.read,
    createdAt: row.created_at,
    replyToId: row.reply_to_id ?? null,
    fileUrl: row.file_url ?? null,
    fileName: row.file_name ?? null,
    deleted: row.deleted,
    editedAt: row.edited_at ?? null,
    deliveredAt: row.delivered_at ?? null,
    expiresAt: row.expires_at ?? null,
    hiddenFor: row.hidden_for ?? [],
    clientId: row.client_id ?? null,
    forwardedFromMessageId: row.forwarded_from_message_id ?? null,
    forwardedFromSenderId: row.forwarded_from_sender_id ?? null,
    status,
  };
}

/** Effective MessageStatus for a row given the viewer's perspective. */
export function effectiveStatus(
  row: Pick<DbMessage, 'sender_id' | 'read' | 'delivered_at'>,
  viewerId: string | undefined,
  override?: MessageStatus,
): MessageStatus {
  if (override) return override;
  if (!viewerId || row.sender_id !== viewerId) return row.read ? 'read' : 'delivered';
  if (row.read) return 'read';
  if (row.delivered_at) return 'delivered';
  return 'sent';
}

/** Drop the local-only fields when sending a message back to the wire. */
export function messageToInsert(
  m: ChatMessage,
  overrides: Partial<DbMessageInsert> = {},
): DbMessageInsert {
  return {
    conversation_id: m.conversationId,
    chat_id: m.chatId,
    sender_id: m.senderId,
    content: m.content,
    message_type: m.kind,
    file_url: m.fileUrl,
    file_name: m.fileName,
    reply_to_id: m.replyToId,
    client_id: m.clientId,
    forwarded_from_message_id: m.forwardedFromMessageId,
    forwarded_from_sender_id: m.forwardedFromSenderId,
    expires_at: m.expiresAt,
    ...overrides,
  };
}

// ── Convenience predicates ───────────────────────────────────────────────────
export const isDM       = (c: Pick<ChatSummary, 'kind'>) => c.kind === 'dm';
export const isGroup    = (c: Pick<ChatSummary, 'kind'>) => c.kind === 'group';
export const isChannel  = (c: Pick<ChatSummary, 'kind'>) => c.kind === 'channel';
export const isAdmin    = (m: Pick<ChatMember, 'role'>) => m.role === 'owner' || m.role === 'admin';
export const isOwner    = (m: Pick<ChatMember, 'role'>) => m.role === 'owner';

/** Whether the caller is currently muted for this chat. Cheaper than a full
 *  date parse — accepts the timestamptz string supplied by the server. */
export function isChatMuted(s: Pick<ChatSummary, 'myMutedUntil'>, now: number = Date.now()): boolean {
  if (!s.myMutedUntil) return false;
  const t = Date.parse(s.myMutedUntil);
  return Number.isFinite(t) && t > now;
}

/** Whether the caller has archived this chat. */
export function isChatArchived(s: Pick<ChatSummary, 'myArchivedAt'>): boolean {
  return s.myArchivedAt !== null;
}

/** Whether the caller has pinned this chat. */
export function isChatPinned(s: Pick<ChatSummary, 'myPinnedAt'>): boolean {
  return s.myPinnedAt !== null;
}

/** Effective display name for a chat (falls back to DM partner name). */
export function chatDisplayName(s: ChatSummary): string {
  if (s.title && s.title.trim()) return s.title;
  if (s.other?.displayName) return s.other.displayName;
  if (s.other?.username) return s.other.username;
  return '';
}

/** Effective avatar source. */
export function chatAvatar(s: ChatSummary): string | null {
  if (s.avatarUrl) return s.avatarUrl;
  return s.other?.avatarUrl ?? null;
}
