// ─────────────────────────────────────────────────────────────────────────────
// Chat type definitions
// ─────────────────────────────────────────────────────────────────────────────

export type ConversationFilter = 'all' | 'unread' | 'archived';
export type MessageTypeStr = 'text' | 'image' | 'voice' | 'file';

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
  expires_at?: string | null;
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
}

export interface ActionMenuState {
  msg: Message;
  isMine: boolean;
  rect: { top: number; bottom: number; left: number; right: number; width: number; height: number };
  containerRect: { top: number; bottom: number; height: number };
}

export interface ChatPrefs {
  pinned: Record<string, boolean>;
  muted: Record<string, boolean>;
  archived: Record<string, boolean>;
  drafts: Record<string, string>;
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
