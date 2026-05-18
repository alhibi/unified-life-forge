// ─────────────────────────────────────────────────────────────────────────────
// Chat type definitions
// ─────────────────────────────────────────────────────────────────────────────

export type ConversationFilter = 'all' | 'unread' | 'archived';
export type MessageTypeStr = 'text' | 'image' | 'voice' | 'file';

/**
 * Client-side delivery state. Drives the bubble tick:
 *   pending  → single grey clock     ("sending")
 *   sent     → single grey check     ("server received")
 *   delivered → double grey check    ("recipient client got it")
 *   read     → double primary check  ("recipient read it")
 *   failed   → red "!" with retry    ("send failed")
 *
 * Anything missing this field is treated as `'sent'` (legacy rows).
 */
export type MessageStatus = 'pending' | 'sent' | 'delivered' | 'read' | 'failed';

export interface Conversation {
  id: string;
  user1_id: string;
  user2_id: string;
  updated_at: string;
  otherUsername?: string;
  otherDisplayName?: string;
  otherAvatarUrl?: string;
  otherUserId?: string;
  otherBio?: string | null;
  otherLastSeen?: string | null;
  otherCreatedAt?: string | null;
  lastMessage?: string;
  lastMessageType?: string;
  lastMessageFromMe?: boolean;
  lastMessageDeleted?: boolean;
  lastMessageTime?: string;
  /** Whether the OTHER user has read the most recent message I sent.
   * Used to render the WhatsApp-style read indicator next to the preview. */
  lastMessageRead?: boolean;
  /** Whether the OTHER user has received (delivered_at != null) my most
   * recent message but not yet read it. */
  lastMessageDelivered?: boolean;
  unreadCount?: number;
}

export interface Message {
  id: string;
  conversation_id: string;
  sender_id: string;
  content: string;
  read: boolean;
  created_at: string;
  reply_to_id?: string | null;
  message_type: string;
  file_url?: string | null;
  file_name?: string | null;
  deleted: boolean;
  edited_at?: string | null;
  /** Server-stamped time when the recipient client received the row. */
  delivered_at?: string | null;
  expires_at?: string | null;
  /** uuid[] of recipients who have hidden this message for themselves. */
  hidden_for?: string[] | null;
  /** Client-supplied UUID for idempotent inserts (anti-duplicate). */
  client_id?: string | null;
  /** Forward provenance — set when this message was created via "forward". */
  forwarded_from_message_id?: string | null;
  forwarded_from_sender_id?: string | null;
  /** Client-only delivery state. Never persisted to the DB. */
  status?: MessageStatus;
}

export interface Reaction {
  id: string;
  message_id: string;
  user_id: string;
  emoji: string;
}

export interface ChatDrawerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  unreadCount: number;
  onUnreadChange: (count: number) => void;
  /**
   * When true the drawer is rendered as a full-screen page instead of
   * a Radix Sheet, so it can host the dedicated /chat route under the
   * bottom navigation. The `onOpenChange(false)` callback is then used
   * by the host to issue a router back-navigation.
   */
  inline?: boolean;
}

export interface ActionMenuState {
  msg: Message;
  isMine: boolean;
  rect: { top: number; bottom: number; left: number; right: number; width: number; height: number };
  containerRect: { top: number; bottom: number; height: number };
}

export interface ChatPrefs {
  pinned: Record<string, boolean>;
  /** Mute expiry timestamp (ms epoch). 0 = unmuted, Infinity-encoded as -1 = forever. */
  muted: Record<string, number>;
  archived: Record<string, boolean>;
  drafts: Record<string, string>;
  /** Last known scroll position (px) per conversation, for "resume where you were". */
  scroll: Record<string, number>;
  wallpapers: Record<string, string>;   // convId -> wallpaper id
  globalWallpaper: string;              // default wallpaper
  soundEnabled: boolean;
  enterToSend: boolean;
}

export interface Wallpaper {
  id: string;
  label: string;
  labelAr: string;
  /** CSS background for the chat area. Keep low contrast so bubbles pop. */
  background: string;
  isDark?: boolean;
}
