import { useState, useEffect, useRef, useCallback, useMemo, type ChangeEvent } from 'react';
import { supabase as _supabaseTyped } from '@/integrations/supabase/client';
// The chat module was written against a richer schema (chats, chat_members,
// blocked_users, plus a long list of RPCs) than the current generated
// `Database` type knows about. Until the migration catches up, treat the
// client as untyped here so the build doesn't fail on rpc/from name unions.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const supabase: any = _supabaseTyped;
import { useAuth } from '@/hooks/useAuth';
import { useApp } from '@/contexts/AppContext';
import { useImageUpload } from '@/contexts/ImageUploadContext';
import { useOtherUserPresence, useUserOnline, useOnlineUserIds, formatLastSeen, useTick } from '@/hooks/usePresence';
import { getSignedFileUrl, getMessagePreview } from './chatUtils';
import { playChatSound, primeAudio, haptic } from './sounds';
import { useChatPrefs } from './useChatPrefs';
import { acquireTypingChannel } from './typingChannels';
import {
  chatError, chatSuccess, describeError, validateFile, clampText,
  MAX_STAGED_IMAGES,
} from './chatNotify';
import type { Conversation, Message, Reaction, ConversationFilter, MessageStatus } from './types';

interface UseChatOptions {
  open: boolean;
  onUnreadChange: (count: number) => void;
}

// Stable client UUID generator. `crypto.randomUUID` is available in modern
// browsers (Safari 15.4+, all evergreens) but fall back gracefully so the
// hook still works on the rare older engine. The id only needs to be
// reasonably unique per user — the DB unique index is on
// (sender_id, client_id), so even if two users happened to mint the same
// uuid it wouldn't collide.
function newClientId(): string {
  const c = (typeof globalThis !== 'undefined' ? globalThis.crypto : undefined) as
    | (Crypto & { randomUUID?: () => string })
    | undefined;
  if (c?.randomUUID) {
    try { return c.randomUUID(); } catch { /* fall through */ }
  }
  // RFC4122 v4-ish fallback. Good enough for client-only idempotency.
  const r = () => Math.random().toString(16).slice(2, 10);
  return `${r()}-${r().slice(0, 4)}-${r().slice(0, 4)}-${r().slice(0, 4)}-${r()}${r().slice(0, 4)}`;
}

/**
 * Top-level hook powering ChatDrawer. Organizes state, realtime, drafts,
 * selection mode, filters and local prefs (pin/mute/archive/wallpaper) into
 * a single ergonomic API for the UI.
 */
export function useChat({ open, onUnreadChange }: UseChatOptions) {
  const { user } = useAuth();
  const { language } = useApp();
  const isAr = language === 'ar';

  // Local chat preferences (pinned/muted/archived/drafts/wallpapers/sounds)
  const chatPrefs = useChatPrefs(user?.id);

  // ── Data ──────────────────────────────────────────────────────────────────
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [activeConv, setActiveConvRaw] = useState<Conversation | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [reactions, setReactions] = useState<Reaction[]>([]);

  // ── Composer ──────────────────────────────────────────────────────────────
  const [newMessage, setNewMessage] = useState('');
  const [replyTo, setReplyTo] = useState<Message | null>(null);
  const [editingMessage, setEditingMessage] = useState<Message | null>(null);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);

  // ── New chat ──────────────────────────────────────────────────────────────
  const [searchUser, setSearchUser] = useState('');
  const [searchResult, setSearchResult] = useState<{ user_id: string; username: string; display_name?: string; avatar_url?: string } | null>(null);
  const [searchError, setSearchError] = useState('');
  const [showNewChat, setShowNewChat] = useState(false);
  const [loading, setLoading] = useState(false);
  const [searching, setSearching] = useState(false);

  // ── Header / panels ───────────────────────────────────────────────────────
  const [showExtraEmojis, setShowExtraEmojis] = useState(false);
  const [showProfilePopup, setShowProfilePopup] = useState(false);
  const [profileTab, setProfileTab] = useState<'info' | 'media'>('info');
  const [showChatMenu, setShowChatMenu] = useState(false);
  const [showScrollDown, setShowScrollDown] = useState(false);
  const [showSelfDestructMenu, setShowSelfDestructMenu] = useState(false);
  const [showMuteMenu, setShowMuteMenu] = useState(false);
  const [showWallpaperPicker, setShowWallpaperPicker] = useState(false);

  // ── Conversation filter (All / Unread / Archived) ─────────────────────────
  const [conversationFilter, setConversationFilter] = useState<ConversationFilter>('all');

  // ── Realtime / network ────────────────────────────────────────────────────
  const [typingUser, setTypingUser] = useState(false);
  const [typingByConv, setTypingByConv] = useState<Record<string, boolean>>({});
  const [uploading, setUploading] = useState(false);
  const [messagesLoading, setMessagesLoading] = useState(false);
  const [conversationsLoading, setConversationsLoading] = useState(false);
  const [signedUrls, setSignedUrls] = useState<Record<string, string>>({});

  // ── Search ────────────────────────────────────────────────────────────────
  const [showSearch, setShowSearch] = useState(false);
  const [chatSearchQuery, setChatSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<Message[]>([]);
  const [searchIndex, setSearchIndex] = useState(0);

  // ── Pin / self-destruct (server) ──────────────────────────────────────────
  const [pinnedMessage, setPinnedMessage] = useState<Message | null>(null);
  const [selfDestructSeconds, setSelfDestructSeconds] = useState<number | null>(null);

  // ── Lightbox / staged images ──────────────────────────────────────────────
  const [sharedMedia, setSharedMedia] = useState<Message[]>([]);
  const [lightboxSrc, setLightboxSrc] = useState('');
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [lightboxRect, setLightboxRect] = useState<DOMRect | null>(null);
  const [stagedImages, setStagedImages] = useState<File[]>([]);
  const [stagedPreviews, setStagedPreviews] = useState<string[]>([]);

  // ── Multi-select mode ─────────────────────────────────────────────────────
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const selectionMode = selectedIds.size > 0;

  // ── Forward flow ──────────────────────────────────────────────────────────
  const [forwardingMessages, setForwardingMessages] = useState<Message[] | null>(null);

  // ── Resolved display names for forwarded message authors ─────────────────
  // Realtime echoes of forwarded messages only carry the author's user id,
  // not their display name. We resolve them lazily from the profiles table
  // and cache forever since names rarely change in a session.
  const [forwardedNames, setForwardedNames] = useState<Record<string, string>>({});

  // ── Refs ──────────────────────────────────────────────────────────────────
  const typingChannelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);
  const typingTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const messagesContainerRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const lastIncomingTsRef = useRef<number>(0);   // for rate-limiting receive sound
  const loadConversationsTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isNearBottomRef = useRef(true);          // whether to auto-scroll new msgs
  const stagedPreviewsRef = useRef<string[]>([]);
  const userIdRef = useRef<string | undefined>(user?.id);
  const activeConvIdRef = useRef<string | null>(null);
  const conversationsRef = useRef<Conversation[]>(conversations);
  const chatPrefsRef = useRef(chatPrefs);
  const isArRef = useRef(isAr);
  const messagesRef = useRef<Message[]>(messages);
  const restoreScrollRef = useRef<number | null>(null);

  useEffect(() => { stagedPreviewsRef.current = stagedPreviews; }, [stagedPreviews]);
  useEffect(() => { userIdRef.current = user?.id; }, [user?.id]);
  useEffect(() => { activeConvIdRef.current = activeConv?.id ?? null; }, [activeConv?.id]);
  useEffect(() => { conversationsRef.current = conversations; }, [conversations]);
  useEffect(() => { chatPrefsRef.current = chatPrefs; }, [chatPrefs]);
  useEffect(() => { isArRef.current = isAr; }, [isAr]);
  useEffect(() => { messagesRef.current = messages; }, [messages]);

  const imageUpload = useImageUpload();

  // ── Presence ──────────────────────────────────────────────────────────────
  const [realtimeLastSeen, setRealtimeLastSeen] = useState<string | null>(null);
  useOtherUserPresence(activeConv?.otherUserId, useCallback((ls: string | null) => setRealtimeLastSeen(ls), []));
  const otherIsLiveOnline = useUserOnline(activeConv?.otherUserId);
  const onlineUserIds = useOnlineUserIds(open);
  const presenceTick = useTick(30_000);

  const otherPresence = useMemo(() => {
    const ls = realtimeLastSeen ?? activeConv?.otherLastSeen ?? null;
    const formatted = formatLastSeen(ls, isAr);
    if (otherIsLiveOnline) {
      return { text: isAr ? 'متصل الآن' : 'Online', isOnline: true };
    }
    return formatted;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [realtimeLastSeen, activeConv?.otherLastSeen, otherIsLiveOnline, isAr, presenceTick]);

  // ── Helpers ───────────────────────────────────────────────────────────────
  const scrollToBottom = useCallback((smooth = true) => {
    messagesEndRef.current?.scrollIntoView({ behavior: smooth ? 'smooth' : 'instant' });
  }, []);

  const focusComposer = useCallback(() => {
    requestAnimationFrame(() => {
      const composer = inputRef.current;
      if (!composer) return;
      composer.focus({ preventScroll: true });
      const caretPosition = composer.value.length;
      composer.setSelectionRange(caretPosition, caretPosition);
    });
  }, []);

  const resizeComposer = useCallback((element?: HTMLTextAreaElement | null) => {
    const composer = element ?? inputRef.current;
    if (!composer) return;
    composer.style.height = '0px';
    composer.style.height = `${Math.min(Math.max(composer.scrollHeight, 40), 140)}px`;
  }, []);

  const handleScroll = useCallback(() => {
    const container = messagesContainerRef.current;
    if (!container) return;
    const distFromBottom = container.scrollHeight - container.scrollTop - container.clientHeight;
    isNearBottomRef.current = distFromBottom < 120;
    setShowScrollDown(distFromBottom > 200);

    // Persist scroll position so the next visit resumes here. We only
    // remember non-bottom positions — at the bottom we always want fresh
    // messages to anchor.
    const convId = activeConvIdRef.current;
    if (convId) {
      if (distFromBottom < 80) {
        chatPrefsRef.current.clearScroll(convId);
      } else {
        chatPrefsRef.current.setScroll(convId, container.scrollTop);
      }
    }
  }, []);

  const revokeStagedPreviews = useCallback(() => {
    stagedPreviewsRef.current.forEach(url => {
      try { URL.revokeObjectURL(url); } catch { /* no-op */ }
    });
    stagedPreviewsRef.current = [];
  }, []);

  useEffect(() => {
    return () => { revokeStagedPreviews(); };
  }, [revokeStagedPreviews]);

  // Wrapped setActiveConv: save/restore drafts, reset ephemeral UI state.
  const setActiveConv = useCallback((conv: Conversation | null) => {
    if (activeConv && activeConv.id !== conv?.id) {
      chatPrefs.setDraft(activeConv.id, newMessage);
    }
    setActiveConvRaw(conv);
    setReplyTo(null);
    setEditingMessage(null);
    setShowChatMenu(false);
    setShowProfilePopup(false);
    setShowSelfDestructMenu(false);
    setShowMuteMenu(false);
    setShowSearch(false);
    setChatSearchQuery('');
    setSearchResults([]);
    setShowEmojiPicker(false);
    setSelectedIds(new Set());
    setSignedUrls({});
    revokeStagedPreviews();
    setStagedImages([]);
    setStagedPreviews([]);
    isNearBottomRef.current = true;

    if (conv) {
      // Instant unread reset: clear the count locally so the badge updates
      // immediately, before the network round-trip to mark_messages_read
      // even leaves the tab. The server is already authoritative — we just
      // want zero-latency feedback.
      setConversations(prev => {
        const target = prev.find(c => c.id === conv.id);
        if (!target || (target.unreadCount ?? 0) === 0) return prev;
        return prev.map(c => c.id === conv.id ? { ...c, unreadCount: 0 } : c);
      });

      const draft = chatPrefs.getDraft(conv.id);
      setNewMessage(draft);
      setTimeout(() => resizeComposer(), 0);

      // Schedule scroll restore: loadMessages will scroll to bottom on
      // first paint, then we override if there's a saved position.
      const savedScroll = chatPrefs.getScroll(conv.id);
      restoreScrollRef.current = savedScroll > 0 ? savedScroll : null;
    } else {
      setNewMessage('');
      restoreScrollRef.current = null;
    }
  }, [activeConv, newMessage, chatPrefs, resizeComposer, revokeStagedPreviews]);

  // Auto-save draft as user types.
  useEffect(() => {
    if (!activeConv) return;
    const timer = setTimeout(() => {
      chatPrefs.setDraft(activeConv.id, newMessage);
    }, 300);
    return () => clearTimeout(timer);
  }, [newMessage, activeConv, chatPrefs]);

  // Re-emit total unread to host whenever conversations or mute prefs change.
  useEffect(() => {
    onUnreadChange(conversations.reduce((sum, c) => chatPrefs.isMuted(c.id) ? sum : sum + (c.unreadCount || 0), 0));
  }, [conversations, chatPrefs.prefs.muted, onUnreadChange, chatPrefs]);

  // ── Load conversations ────────────────────────────────────────────────────
  const loadConversations = useCallback(async () => {
    if (!user) return;
    setConversationsLoading(true);
    try {
      const { data: convs, error: convsErr } = await supabase
        .from('conversations')
        .select('*')
        .or(`user1_id.eq.${user.id},user2_id.eq.${user.id}`)
        .order('updated_at', { ascending: false });

      if (convsErr || !convs) { setConversationsLoading(false); return; }

      const otherIds = convs.map(c => c.user1_id === user.id ? c.user2_id : c.user1_id);
      const convIds = convs.map(c => c.id);

      const [profilesRes, allMsgsRes, unreadMsgsRes] = await Promise.all([
        supabase.from('profiles')
          .select('user_id, username, display_name, avatar_url, bio, last_seen, created_at')
          .in('user_id', otherIds),
        Promise.all(convIds.map(cid =>
          (supabase.from('messages') as any)
            .select('conversation_id, sender_id, content, message_type, deleted, created_at, file_name, hidden_for, read, delivered_at')
            .eq('conversation_id', cid)
            .order('created_at', { ascending: false })
            .limit(1)
            .maybeSingle()
        )).then(results => ({
          data: results.map((r: any) => r.data).filter(Boolean) as Array<{
            conversation_id: string; sender_id: string; content: string; message_type: string; deleted: boolean; created_at: string; file_name: string | null; hidden_for: string[] | null; read: boolean; delivered_at: string | null;
          }>,
          error: null,
        })),
        supabase.from('messages')
          .select('conversation_id')
          .in('conversation_id', convIds)
          .neq('sender_id', user.id)
          .eq('read', false)
          .eq('deleted', false),
      ]);

      const profiles = profilesRes.data || [];
      const allMsgs = allMsgsRes.data || [];
      const unreadMsgs = unreadMsgsRes.data || [];

      const lastMsgMap = new Map<string, typeof allMsgs[0]>();
      for (const m of allMsgs) {
        if (!lastMsgMap.has(m.conversation_id)) lastMsgMap.set(m.conversation_id, m);
      }

      const unreadCountMap = new Map<string, number>();
      for (const m of unreadMsgs) {
        unreadCountMap.set(m.conversation_id, (unreadCountMap.get(m.conversation_id) || 0) + 1);
      }

      const enriched: Conversation[] = convs.map((conv) => {
        const otherId = conv.user1_id === user.id ? conv.user2_id : conv.user1_id;
        const profile = profiles.find(p => p.user_id === otherId);
        const lastMsg = lastMsgMap.get(conv.id);
        const unreadCount = unreadCountMap.get(conv.id) || 0;

        return {
          ...conv,
          otherUsername: profile?.username || '?',
          otherDisplayName: profile?.display_name ?? profile?.username ?? '?',
          otherAvatarUrl: profile?.avatar_url ?? undefined,
          otherUserId: otherId,
          otherBio: (profile as unknown as { bio?: string | null })?.bio ?? null,
          otherLastSeen: (profile as unknown as { last_seen?: string | null })?.last_seen ?? null,
          otherCreatedAt: (profile as unknown as { created_at?: string | null })?.created_at ?? null,
          lastMessage: lastMsg ? getMessagePreview(lastMsg, isAr, user.id) : undefined,
          lastMessageType: lastMsg?.message_type,
          lastMessageFromMe: lastMsg?.sender_id === user.id,
          lastMessageDeleted: lastMsg?.deleted,
          lastMessageTime: lastMsg?.created_at || conv.updated_at,
          lastMessageRead: lastMsg?.sender_id === user.id ? !!lastMsg?.read : undefined,
          lastMessageDelivered: lastMsg?.sender_id === user.id ? !!lastMsg?.delivered_at : undefined,
          unreadCount,
        };
      });

      setConversations(enriched);
    } catch {
      // Silent — network toast already handled via chatError elsewhere
    } finally {
      setConversationsLoading(false);
    }
  }, [user, isAr]);

  const scheduleLoadConversations = useCallback(() => {
    if (loadConversationsTimerRef.current) clearTimeout(loadConversationsTimerRef.current);
    loadConversationsTimerRef.current = setTimeout(() => {
      loadConversations();
    }, 400);
  }, [loadConversations]);

  /**
   * Optimistically bump a conversation row to the top of the list with a
   * fresh preview / timestamp. Used both when the local user sends a
   * message AND when realtime delivers an incoming one — so the list
   * reorders instantly instead of waiting on the 400ms debounce.
   */
  const bumpConversationLocally = useCallback((msg: Message) => {
    const uid = userIdRef.current;
    if (!uid) return;
    setConversations(prev => {
      const idx = prev.findIndex(c => c.id === msg.conversation_id);
      if (idx < 0) return prev;
      const old = prev[idx];
      const fromMe = msg.sender_id === uid;
      const next: Conversation = {
        ...old,
        lastMessage: msg.deleted ? undefined : getMessagePreview(msg, isArRef.current, uid),
        lastMessageType: msg.message_type,
        lastMessageFromMe: fromMe,
        lastMessageDeleted: msg.deleted,
        lastMessageTime: msg.created_at,
        lastMessageRead:      fromMe ? !!msg.read         : undefined,
        lastMessageDelivered: fromMe ? !!msg.delivered_at : undefined,
        updated_at: msg.created_at,
        // If incoming AND we're not currently viewing that conv, increment.
        unreadCount: !fromMe && msg.conversation_id !== activeConvIdRef.current
          ? (old.unreadCount ?? 0) + 1
          : (msg.conversation_id === activeConvIdRef.current ? 0 : (old.unreadCount ?? 0)),
      };
      // Re-sort by updated_at desc (pin/sort layer in UI handles pinned rows).
      const without = [...prev.slice(0, idx), ...prev.slice(idx + 1)];
      without.unshift(next);
      return without;
    });
  }, []);

  // ── Load messages ─────────────────────────────────────────────────────────
  const loadMessages = useCallback(async () => {
    if (!activeConv || !user) return;
    setMessagesLoading(true);
    try {
      const { data, error } = await supabase
        .from('messages')
        .select('*')
        .eq('conversation_id', activeConv.id)
        .order('created_at', { ascending: true });

      if (error) { chatError('conversationGone', isAr, describeError(error, isAr)); return; }

      if (data) {
        // Hydrate the client-side `status` field from server columns so
        // every previously-loaded row renders the correct tick the moment
        // it appears (read > delivered > sent), instead of waiting for the
        // first realtime UPDATE.
        const hydrated = (data as Message[]).map(m => {
          if (m.sender_id !== user.id) return m;
          let status: MessageStatus = 'sent';
          if (m.read) status = 'read';
          else if (m.delivered_at) status = 'delivered';
          return { ...m, status };
        });
        setMessages(hydrated);
        const msgIds = data.map(m => m.id);

        // Mark in parallel: every undelivered "from them" row becomes
        // delivered, every unread one becomes read. Both RPCs ignore
        // already-stamped rows, so they are idempotent.
        (supabase.rpc as any)('mark_messages_delivered', { p_conversation_id: activeConv.id }).then();
        supabase.rpc('mark_messages_read',      { p_conversation_id: activeConv.id }).then();

        if (msgIds.length > 0) {
          const { data: rxns } = await supabase
            .from('message_reactions')
            .select('*')
            .in('message_id', msgIds);
          setReactions((rxns || []) as Reaction[]);
        } else {
          setReactions([]);
        }

        // Scroll restore: if we have a saved position, jump there. If not,
        // and there is at least one unread incoming message, anchor at the
        // first unread (Telegram-style "X new messages" entrypoint).
        // Otherwise default to the bottom (latest message).
        requestAnimationFrame(() => {
          const target = restoreScrollRef.current;
          if (target != null && messagesContainerRef.current) {
            messagesContainerRef.current.scrollTop = target;
            isNearBottomRef.current =
              (messagesContainerRef.current.scrollHeight
                - messagesContainerRef.current.scrollTop
                - messagesContainerRef.current.clientHeight) < 120;
            restoreScrollRef.current = null;
            return;
          }
          // Find first unread message from the OTHER user — same logic as
          // the firstUnreadId memo, computed inline because that memo isn't
          // available yet on first paint.
          const firstUnread = (data as Message[]).find(
            m => !m.read && m.sender_id !== user.id && !m.deleted && !(m.hidden_for ?? []).includes(user.id),
          );
          if (firstUnread) {
            const el = document.getElementById(`msg-${firstUnread.id}`);
            if (el) {
              el.scrollIntoView({ behavior: 'instant' as ScrollBehavior, block: 'center' });
              return;
            }
          }
          scrollToBottom(false);
        });
      }
    } finally {
      setMessagesLoading(false);
    }
  }, [activeConv, user, scrollToBottom, isAr]);

  useEffect(() => { if (open && user) loadConversations(); }, [open, user, loadConversations]);
  useEffect(() => { if (activeConv) loadMessages(); }, [activeConv, loadMessages]);

  // When the chat opens we sweep delivery acknowledgements across every
  // conversation the user is a participant of. The recipient client is
  // the only entity that can attest "I have received this row", so any
  // tab-restart / network drop is handled here. The RPC walks the
  // user's conversations and skips already-stamped rows on the server,
  // so the call is cheap and idempotent.
  useEffect(() => {
    if (!open || !user) return;
    let cancelled = false;
    // Defer slightly so loadConversations finishes first and we're not
    // spamming requests at the same moment as initial paint.
    const id = setTimeout(async () => {
      const convs = conversationsRef.current;
      if (cancelled || convs.length === 0) return;
      // Sequentialize to avoid hammering the database with parallel
      // UPDATEs across many conversations on a busy account.
      for (const c of convs) {
        if (cancelled) return;
        try { await (supabase.rpc as any)('mark_messages_delivered', { p_conversation_id: c.id }); } catch { /* no-op */ }
      }
    }, 600);
    return () => { cancelled = true; clearTimeout(id); };
  }, [open, user, conversations.length]);

  // ── Resolve signed URLs for files ─────────────────────────────────────────
  useEffect(() => {
    const needsUrl = messages.filter(m => {
      if (signedUrls[m.id]) return false;
      return !!m.file_url;
    });
    if (needsUrl.length === 0) return;

    let cancelled = false;
    Promise.all(needsUrl.map(async (m) => {
      const path = m.file_url || '';
      if (!path) return { id: m.id, url: '' };
      try {
        const url = await getSignedFileUrl(path);
        return { id: m.id, url };
      } catch {
        return { id: m.id, url: '' };
      }
    })).then(results => {
      if (cancelled) return;
      setSignedUrls(prev => {
        const next = { ...prev };
        results.forEach(r => { if (r.url) next[r.id] = r.url; });
        return next;
      });
    });
    return () => { cancelled = true; };
  }, [messages, signedUrls]);

  const getFileUrl = useCallback((msg: Message) => {
    if (signedUrls[msg.id]) return signedUrls[msg.id];
    if (msg.file_url && /^https?:\/\//i.test(msg.file_url)) return msg.file_url;
    return '';
  }, [signedUrls]);

  const refreshSignedUrl = useCallback(async (msg: Message): Promise<string | null> => {
    if (!msg.file_url) return null;
    try {
      const url = await getSignedFileUrl(msg.file_url);
      if (!url) return null;
      setSignedUrls(prev => ({ ...prev, [msg.id]: url }));
      return url;
    } catch {
      return null;
    }
  }, []);

  // ── Realtime subscription ─────────────────────────────────────────────────
  // Stable channel name so React StrictMode + activeConv changes don't churn
  // the websocket. Subscribed once per (user, drawer-open) lifecycle. All
  // closures inside read fresh state via refs to avoid stale-state bugs.
  useEffect(() => {
    if (!user || !open) return;
    let cancelled = false;
    const channelName = `chat-realtime:${user.id}`;

    const channel = supabase
      .channel(channelName)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'messages' }, (payload) => {
        if (cancelled) return;
        const uid = userIdRef.current;
        if (!uid) return;
        const activeId = activeConvIdRef.current;
        const isAr = isArRef.current;

        if (payload.eventType === 'INSERT') {
          const msg = payload.new as Message;

          if (activeId && msg.conversation_id === activeId) {
            setMessages(prev => {
              if (prev.some(m => m.id === msg.id)) return prev;
              // Idempotent dedup: if a pending optimistic row carries the
              // same client_id we just inserted, replace it. Falls back to
              // checking by id only for legacy rows without a client_id.
              if (msg.sender_id === uid && msg.client_id) {
                const idx = prev.findIndex(m => m.client_id === msg.client_id);
                if (idx !== -1) {
                  const next = [...prev];
                  next[idx] = { ...msg, status: 'sent' };
                  return next;
                }
              }
              return [...prev, msg];
            });

            if (msg.sender_id !== uid) {
              // The conversation is open, so this message is BOTH delivered
              // AND about to be read. Stamp the timestamps in parallel —
              // each RPC ignores already-stamped rows so they stay idempotent.
              (supabase.rpc as any)('mark_message_delivered', { p_message_id: msg.id }).then();
              supabase.rpc('mark_message_read', { p_message_id: msg.id }).then();
              if (!chatPrefsRef.current.isMuted(activeId)) {
                const now = Date.now();
                if (now - lastIncomingTsRef.current > 800) {
                  lastIncomingTsRef.current = now;
                  playChatSound('receive');
                }
              }
            }
            if (isNearBottomRef.current || msg.sender_id === uid) {
              requestAnimationFrame(() => scrollToBottom(true));
            }
          } else if (msg.sender_id !== uid) {
            // Tab is open and subscribed but on a different conversation —
            // the message is still delivered to this client even though
            // the user hasn't read it yet. This is exactly the "delivered
            // but unread" Telegram tick state.
            (supabase.rpc as any)('mark_message_delivered', { p_message_id: msg.id }).then();
            const conv = conversationsRef.current.find(c => c.id === msg.conversation_id);
            if (conv && !chatPrefsRef.current.isMuted(conv.id)) {
              const now = Date.now();
              if (now - lastIncomingTsRef.current > 1500) {
                lastIncomingTsRef.current = now;
                playChatSound('receive');
              }
            }
          }
          // Bump the conversation list locally so the row jumps to top
          // instantly with the right preview, regardless of which conv
          // the user is currently inside.
          bumpConversationLocally(msg);
        } else if (payload.eventType === 'UPDATE') {
          const msg = payload.new as Message;
          setMessages(prev => prev.map(m => {
            if (m.id !== msg.id) return m;
            // Telegram-style status escalation. A row never goes backwards,
            // so we always pick the highest-precedence state we can prove
            // from the server data:
            //   read > delivered > sent  (for messages WE sent)
            //   For messages from others we don't render ticks, so we
            //   keep whatever we had.
            let status: MessageStatus | undefined = m.status;
            if (msg.sender_id === uid) {
              if (msg.read) status = 'read';
              else if (msg.delivered_at) status = 'delivered';
              else if (m.status === 'pending' || m.status === 'failed') status = 'sent';
              else status = m.status ?? 'sent';
            }
            return { ...msg, status } as Message;
          }));
          // Propagate read/delivered transitions to the conversation list
          // so the WhatsApp-style tick next to the preview updates without
          // a roundtrip refetch.
          setConversations(prev => prev.map(c => {
            if (c.id !== msg.conversation_id) return c;
            // We only care when the row update is on the most-recent
            // message I sent — otherwise the preview is unaffected.
            const isMyLast = c.lastMessageFromMe && c.lastMessageTime === msg.created_at && msg.sender_id === uid;
            if (!isMyLast) return c;
            return { ...c, lastMessageRead: !!msg.read, lastMessageDelivered: !!msg.delivered_at };
          }));
        } else if (payload.eventType === 'DELETE') {
          const oldMsg = payload.old as { id: string };
          setMessages(prev => prev.filter(m => m.id !== oldMsg.id));
        }
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'message_reactions' }, (payload) => {
        if (cancelled) return;
        if (payload.eventType === 'INSERT') {
          setReactions(prev => {
            if (prev.some(r => r.id === (payload.new as Reaction).id)) return prev;
            return [...prev, payload.new as Reaction];
          });
        } else if (payload.eventType === 'DELETE') {
          const old = payload.old as { id: string };
          setReactions(prev => prev.filter(r => r.id !== old.id));
        }
      })
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'conversations' }, (payload) => {
        // The server-side bump trigger fires on every new message so the
        // updated_at column reflects the canonical message timestamp.
        // Reordering here keeps every tab's list in lock-step with the
        // database without depending on the local optimistic bump.
        if (cancelled) return;
        const conv = payload.new as { id: string; updated_at: string; pinned_message_id: string | null; self_destruct_seconds: number | null };
        setConversations(prev => {
          const idx = prev.findIndex(c => c.id === conv.id);
          if (idx < 0) return prev;
          const old = prev[idx];
          if (old.updated_at === conv.updated_at) return prev;
          const next = { ...old, updated_at: conv.updated_at } as Conversation;
          // Re-sort by updated_at desc; pinned ordering happens in the
          // UI layer (sortedConversations) so we just need chronological.
          const without = [...prev.slice(0, idx), ...prev.slice(idx + 1)];
          let insertAt = 0;
          while (insertAt < without.length && without[insertAt].updated_at > conv.updated_at) insertAt++;
          without.splice(insertAt, 0, next);
          return without;
        });
      })
      .subscribe();

    return () => {
      cancelled = true;
      if (loadConversationsTimerRef.current) clearTimeout(loadConversationsTimerRef.current);
      supabase.removeChannel(channel);
    };
  }, [user, open, scrollToBottom, bumpConversationLocally]);

  // ── Typing presence ───────────────────────────────────────────────────────
  const typingStaleTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const typingThrottleRef   = useRef(0);
  useEffect(() => {
    if (!activeConv || !user) return;
    setTypingUser(false);

    const TYPING_STALE_MS = 6000;
    const armStale = () => {
      if (typingStaleTimerRef.current) clearTimeout(typingStaleTimerRef.current);
      typingStaleTimerRef.current = setTimeout(() => setTypingUser(false), TYPING_STALE_MS);
    };
    const disarmStale = () => {
      if (typingStaleTimerRef.current) {
        clearTimeout(typingStaleTimerRef.current);
        typingStaleTimerRef.current = null;
      }
    };

    const handle = acquireTypingChannel(activeConv.id, user.id);
    typingChannelRef.current = handle.channel;

    const offChange = handle.onChange((state) => {
      const others = Object.entries(state).filter(([k]) => k !== user.id);
      const isTyping = others.some(([, presences]) =>
        (presences as Array<Record<string, unknown>>).some(p => p.typing === true),
      );
      setTypingUser(isTyping);
      if (isTyping) armStale(); else disarmStale();
    });

    return () => {
      if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
      disarmStale();
      try { handle.channel.track({ typing: false }); } catch { /* no-op */ }
      try { handle.channel.untrack(); } catch { /* no-op */ }
      typingChannelRef.current = null;
      typingThrottleRef.current = 0;
      offChange();
      handle.release();
    };
  }, [activeConv, user]);

  // ── Typing-in-conversation-list ──────────────────────────────────────────
  const MAX_LIST_TYPING_CHANNELS = 40;
  const convIdsForTyping = useMemo(
    () => conversations.slice(0, MAX_LIST_TYPING_CHANNELS).map(c => c.id).sort().join(','),
    [conversations],
  );
  useEffect(() => {
    if (!open || !user || !convIdsForTyping) return;
    const ids = convIdsForTyping.split(',').filter(Boolean);
    const handles = ids.map(convId => {
      const handle = acquireTypingChannel(convId, user.id);
      const off = handle.onChange((state) => {
        const others = Object.entries(state).filter(([k]) => k !== user.id);
        const typing = others.some(([, entries]) =>
          (entries as Array<Record<string, unknown>>).some(e => e.typing === true),
        );
        setTypingByConv(prev => {
          if (prev[convId] === typing) return prev;
          return { ...prev, [convId]: typing };
        });
      });
      return { off, handle };
    });
    return () => {
      handles.forEach(({ off, handle }) => { off(); handle.release(); });
      setTypingByConv({});
    };
  }, [open, user, convIdsForTyping]);

  const broadcastTyping = useCallback(() => {
    if (!typingChannelRef.current) return;
    const now = Date.now();
    if (now - typingThrottleRef.current >= 1000) {
      typingThrottleRef.current = now;
      typingChannelRef.current.track({ typing: true });
    }
    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
    typingTimeoutRef.current = setTimeout(() => {
      typingChannelRef.current?.track({ typing: false });
      typingThrottleRef.current = 0;
    }, 1500);
  }, []);

  // ── Send / edit / delete messages ─────────────────────────────────────────
  /**
   * Insert a message. Uses a server-generated row id for the canonical
   * message, but a client-supplied `client_id` for optimistic dedup so the
   * realtime echo can replace the optimistic row deterministically — for
   * every message_type, including images/voice/files where the visible
   * text would be identical across multiple sends.
   */
  const sendMessage = useCallback(async (
    type: string = 'text',
    fileUrl?: string,
    fileName?: string,
    explicitContent?: string,
    explicitConvId?: string,
    forwardOf?: { messageId: string; senderId: string },
  ) => {
    const rawContent = explicitContent ?? (type === 'text' ? newMessage.trim() : (fileName || ''));
    const { text: content } = clampText(rawContent);
    if (!content && type === 'text') return;

    const convId = explicitConvId ?? activeConv?.id;
    if (!convId || !user) return;

    const isCurrentConv = activeConv?.id === convId;
    const replyToId = isCurrentConv ? (replyTo?.id || null) : null;

    if (type === 'text' && isCurrentConv) {
      setNewMessage('');
      chatPrefs.clearDraft(convId);
      setReplyTo(null);
      resizeComposer();
    }
    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
    typingChannelRef.current?.track({ typing: false });

    const clientId = newClientId();
    const optimisticId = `optimistic_${clientId}`;
    const now = new Date().toISOString();

    const insertData: Record<string, unknown> = {
      conversation_id: convId,
      sender_id: user.id,
      content,
      message_type: type,
      file_url: fileUrl || null,
      file_name: fileName || null,
      reply_to_id: replyToId,
      client_id: clientId,
      forwarded_from_message_id: forwardOf?.messageId ?? null,
      forwarded_from_sender_id:  forwardOf?.senderId  ?? null,
    };

    if (selfDestructSeconds && isCurrentConv) {
      insertData.expires_at = new Date(Date.now() + selfDestructSeconds * 1000).toISOString();
    }

    // Optimistic local row for ALL types (text/image/voice/file). The
    // realtime echo will replace it deterministically via client_id.
    const optimisticMsg: Message = {
      id: optimisticId,
      conversation_id: convId,
      sender_id: user.id,
      content,
      read: false,
      created_at: now,
      reply_to_id: replyToId,
      message_type: type,
      file_url: fileUrl ?? null,
      file_name: fileName ?? null,
      deleted: false,
      edited_at: null,
      expires_at: (insertData.expires_at as string) || null,
      hidden_for: [],
      client_id: clientId,
      forwarded_from_message_id: forwardOf?.messageId ?? null,
      forwarded_from_sender_id:  forwardOf?.senderId  ?? null,
      status: 'pending',
    };
    if (isCurrentConv) {
      setMessages(prev => [...prev, optimisticMsg]);
      isNearBottomRef.current = true;
      requestAnimationFrame(() => scrollToBottom(true));
    }
    // Also bump the conversation list immediately even if the user is
    // looking at a different conversation when sending (e.g. forwarding).
    bumpConversationLocally(optimisticMsg);

    primeAudio();
    playChatSound('send');
    haptic('light');

    // The DB trigger `messages_bump_conversation` updates
    // conversations.updated_at atomically with the INSERT — so we no
    // longer need to fire a separate UPDATE here. That avoids a write
    // race where the client UPDATE happened to land before the realtime
    // INSERT echoed in subscribers' tabs.

    try {
      const { data: realMsg, error } = await supabase
        .from('messages')
        .insert(insertData as never)
        .select()
        .single();

      if (error) {
        chatError('sendFailed', isAr, describeError(error, isAr));
        // Mark the optimistic row as failed instead of dropping it, so the
        // user can tap a "retry" button without retyping.
        setMessages(prev => prev.map(m =>
          m.id === optimisticId ? { ...m, status: 'failed' } : m,
        ));
        return;
      }
      if (realMsg) {
        setMessages(prev => prev.map(m =>
          m.id === optimisticId
            ? { ...(realMsg as Message), status: 'sent' }
            : m,
        ));
      }
    } catch (err) {
      chatError('sendFailed', isAr, describeError(err, isAr));
      setMessages(prev => prev.map(m =>
        m.id === optimisticId ? { ...m, status: 'failed' } : m,
      ));
    }

    if (type === 'text' && isCurrentConv) focusComposer();
  }, [newMessage, activeConv, user, replyTo, selfDestructSeconds, resizeComposer,
      scrollToBottom, focusComposer, chatPrefs, isAr, bumpConversationLocally]);

  /**
   * Re-attempt a send for a message that previously transitioned to 'failed'.
   * Idempotent thanks to the (sender_id, client_id) unique index — even if
   * the original insert silently committed before we observed the failure,
   * the retry collapses into a no-op.
   */
  const retryFailedMessage = useCallback(async (failed: Message) => {
    if (!user || !failed.client_id) return;
    setMessages(prev => prev.map(m => m.id === failed.id ? { ...m, status: 'pending' } : m));
    const insertData: Record<string, unknown> = {
      conversation_id: failed.conversation_id,
      sender_id: user.id,
      content: failed.content,
      message_type: failed.message_type,
      file_url: failed.file_url ?? null,
      file_name: failed.file_name ?? null,
      reply_to_id: failed.reply_to_id ?? null,
      client_id: failed.client_id,
      expires_at: failed.expires_at ?? null,
      forwarded_from_message_id: failed.forwarded_from_message_id ?? null,
      forwarded_from_sender_id:  failed.forwarded_from_sender_id  ?? null,
    };
    try {
      const { data: realMsg, error } = await supabase
        .from('messages')
        .insert(insertData as never)
        .select()
        .single();
      if (error) {
        // 23505 = unique_violation (already inserted). Re-fetch the row.
        if ((error as { code?: string }).code === '23505') {
          const { data: existing } = await (supabase
            .from('messages')
            .select('*')
            .eq('sender_id', user.id) as any)
            .eq('client_id', failed.client_id)
            .single();
          if (existing) {
            setMessages(prev => prev.map(m =>
              m.id === failed.id ? { ...(existing as Message), status: 'sent' } : m,
            ));
            return;
          }
        }
        chatError('sendFailed', isAr, describeError(error, isAr));
        setMessages(prev => prev.map(m => m.id === failed.id ? { ...m, status: 'failed' } : m));
        return;
      }
      if (realMsg) {
        setMessages(prev => prev.map(m =>
          m.id === failed.id ? { ...(realMsg as Message), status: 'sent' } : m,
        ));
      }
    } catch (err) {
      chatError('sendFailed', isAr, describeError(err, isAr));
      setMessages(prev => prev.map(m => m.id === failed.id ? { ...m, status: 'failed' } : m));
    }
  }, [user, isAr]);

  const deleteMessage = useCallback(async (msgId: string) => {
    const { error } = await supabase.from('messages').update({ deleted: true, content: '' }).eq('id', msgId);
    if (error) chatError('deleteFailed', isAr, describeError(error, isAr));
  }, [isAr]);

  const deleteManyMessages = useCallback(async (ids: string[]) => {
    if (ids.length === 0) return;
    const { error } = await supabase.from('messages').update({ deleted: true, content: '' }).in('id', ids);
    if (error) chatError('deleteFailed', isAr, describeError(error, isAr));
    setSelectedIds(new Set());
  }, [isAr]);

  /**
   * Hide a single message for the current viewer only (delete-for-me),
   * leaving the original sender's copy intact. The DB function appends
   * auth.uid() to messages.hidden_for.
   */
  const hideMessageForSelf = useCallback(async (msgId: string) => {
    if (!user) return;
    // Optimistic: mark it locally first so the bubble disappears instantly.
    setMessages(prev => prev.map(m =>
      m.id === msgId
        ? { ...m, hidden_for: [...(m.hidden_for ?? []), user.id] }
        : m,
    ));
    const { error } = await (supabase.rpc as any)('hide_message_for_self', { p_message_id: msgId });
    if (error) {
      // Roll back on failure.
      setMessages(prev => prev.map(m =>
        m.id === msgId
          ? { ...m, hidden_for: (m.hidden_for ?? []).filter(u => u !== user.id) }
          : m,
      ));
      chatError('deleteFailed', isAr, describeError(error, isAr));
    }
  }, [user, isAr]);

  const hideManyForSelf = useCallback(async (ids: string[]) => {
    if (!user || ids.length === 0) return;
    setMessages(prev => prev.map(m =>
      ids.includes(m.id)
        ? { ...m, hidden_for: [...(m.hidden_for ?? []), user.id] }
        : m,
    ));
    setSelectedIds(new Set());
    // Sequential RPC calls to keep auth.uid lookups consistent — these are
    // cheap (single UPDATE) and the user typically picks <10.
    for (const id of ids) {
      try { await (supabase.rpc as any)('hide_message_for_self', { p_message_id: id }); } catch { /* no-op */ }
    }
  }, [user]);

  const pinMessage = useCallback(async (msg: Message) => {
    if (!activeConv) return;
    const newPinId = pinnedMessage?.id === msg.id ? null : msg.id;
    const { error } = await supabase.from('conversations').update({ pinned_message_id: newPinId } as Record<string, unknown>).eq('id', activeConv.id);
    if (error) { chatError('editFailed', isAr, describeError(error, isAr)); return; }
    setPinnedMessage(newPinId ? msg : null);
  }, [activeConv, pinnedMessage, isAr]);

  const startEditMessage = useCallback((msg: Message) => {
    setEditingMessage(msg);
    setReplyTo(null);
    setNewMessage(msg.content);
    setTimeout(() => { inputRef.current?.focus(); resizeComposer(); }, 50);
  }, [resizeComposer]);

  const saveEditMessage = useCallback(async () => {
    if (!editingMessage || !newMessage.trim()) return;
    const { text: content } = clampText(newMessage.trim());
    const msgToEdit = editingMessage;
    setEditingMessage(null);
    setNewMessage('');
    resizeComposer();
    const { error } = await supabase.from('messages').update({
      content,
      edited_at: new Date().toISOString(),
    } as Record<string, unknown>).eq('id', msgToEdit.id);
    if (error) {
      chatError('editFailed', isAr, describeError(error, isAr));
      setEditingMessage(msgToEdit);
      setNewMessage(content);
      setTimeout(() => resizeComposer(), 0);
      return;
    }
    playChatSound('send');
  }, [editingMessage, newMessage, resizeComposer, isAr]);

  const cancelEdit = useCallback(() => {
    setEditingMessage(null);
    setNewMessage('');
    resizeComposer();
  }, [resizeComposer]);

  // ── In-chat search ────────────────────────────────────────────────────────
  // Server-backed full-text search via the `search_chat_messages` RPC.
  // Replaces the previous client-side `content.includes(q)` filter, which
  // was blind to Arabic diacritic / hamza variants and limited to whatever
  // happened to be in the in-memory `messages` array.
  //
  // Strategy
  //   1. Call the RPC scoped to the active conversation (legacy `chat_id`
  //      lookup via the chats backfill — RPC handles both paths).
  //   2. Map RPC hits back onto the locally-loaded `messages` array so
  //      the UI's existing `searchResults: Message[]` contract still
  //      holds (drives navigation up/down + scroll-to).
  //   3. Hits that aren't currently in memory (i.e. older history that
  //      hasn't been paginated in) are skipped with a console warn —
  //      pagination through search results is on the wave-2 follow-up.
  //   4. On RPC error, fall back to the client-side filter so search
  //      stays usable in offline / RPC-misconfigured environments.
  const searchInChat = useCallback(async (query: string) => {
    setChatSearchQuery(query);
    const trimmed = query.trim();
    if (!trimmed) { setSearchResults([]); setSearchIndex(0); return; }
    if (!activeConv) { setSearchResults([]); setSearchIndex(0); return; }

    // Local fallback used in two scenarios: RPC error, and as a synchronous
    // first paint while the RPC is in flight.
    const q = trimmed.toLowerCase();
    const local = messages.filter(m =>
      !m.deleted && m.message_type === 'text' && m.content.toLowerCase().includes(q),
    );
    setSearchResults(local);
    setSearchIndex(local.length > 0 ? local.length - 1 : 0);

    try {
      const { data, error } = await supabase.rpc('search_chat_messages', {
        p_query:   trimmed,
        // Try the unified chat_id first; the RPC accepts both via the
        // legacy_conversation_id lookup, but DM rows don't always carry
        // a chat_id locally. Pass NULL to scope server-side to ALL the
        // caller's conversations and then narrow client-side to this one.
        p_chat_id: null,
        p_limit:   200,
      });
      if (error) throw error;

      const hits = (data ?? []) as Array<{
        message_id:      string;
        conversation_id: string;
        chat_id:         string | null;
      }>;
      // Filter to the active conversation and translate hit IDs back onto
      // the loaded `messages` array (preserving the RPC's rank order).
      const byId = new Map<string, Message>();
      for (const m of messages) byId.set(m.id, m);
      const ranked: Message[] = [];
      for (const h of hits) {
        if (h.conversation_id !== activeConv.id) continue;
        const found = byId.get(h.message_id);
        if (!found || found.deleted) continue;
        ranked.push(found);
      }
      // The RPC orders by rank DESC, but the search bar's mental model
      // is "step through chronologically" via prev/next arrows. Sort by
      // creation time so navigation feels natural; the rank order is
      // available for a future "Top results" UI.
      ranked.sort((a, b) => a.created_at.localeCompare(b.created_at));

      // Replace local results only when the RPC produced something —
      // an empty FTS result with a non-empty client-side match means the
      // index hasn't ingested the just-sent row yet (search_vector is
      // synchronous on insert via STORED, but realtime delivery + index
      // rebuild can race by a tick or two on the recipient's side).
      if (ranked.length > 0) {
        setSearchResults(ranked);
        setSearchIndex(ranked.length - 1);
        const last = ranked[ranked.length - 1];
        // Defer scroll until after the result-list state has rendered.
        requestAnimationFrame(() => {
          const el = document.getElementById(`msg-${last.id}`);
          el?.scrollIntoView({ behavior: 'smooth', block: 'center' });
        });
      } else if (local.length > 0) {
        // Keep the local results we already showed. No-op here.
        const last = local[local.length - 1];
        requestAnimationFrame(() => {
          const el = document.getElementById(`msg-${last.id}`);
          el?.scrollIntoView({ behavior: 'smooth', block: 'center' });
        });
      }
    } catch (err) {
      // RPC failure is non-fatal — the local fallback is already shown.
      console.warn('[chat] search_chat_messages RPC failed', err);
      if (local.length > 0) {
        const last = local[local.length - 1];
        requestAnimationFrame(() => {
          const el = document.getElementById(`msg-${last.id}`);
          el?.scrollIntoView({ behavior: 'smooth', block: 'center' });
        });
      }
    }
  }, [activeConv, messages]);

  const navigateSearch = useCallback((direction: 'up' | 'down') => {
    if (searchResults.length === 0) return;
    const newIdx = direction === 'up'
      ? Math.max(0, searchIndex - 1)
      : Math.min(searchResults.length - 1, searchIndex + 1);
    setSearchIndex(newIdx);
    const el = document.getElementById(`msg-${searchResults[newIdx].id}`);
    el?.scrollIntoView({ behavior: 'smooth', block: 'center' });
  }, [searchResults, searchIndex]);

  // ── Self-destruct ─────────────────────────────────────────────────────────
  const toggleSelfDestruct = useCallback(async (seconds: number | null) => {
    if (!activeConv) return;
    const { error } = await supabase.from('conversations').update({ self_destruct_seconds: seconds } as Record<string, unknown>).eq('id', activeConv.id);
    if (error) { chatError('editFailed', isAr, describeError(error, isAr)); return; }
    setSelfDestructSeconds(seconds);
    setShowSelfDestructMenu(false);
    setShowChatMenu(false);
  }, [activeConv, isAr]);

  useEffect(() => {
    if (!activeConv) { setPinnedMessage(null); setSelfDestructSeconds(null); return; }
    supabase.from('conversations').select('pinned_message_id, self_destruct_seconds' as string)
      .eq('id', activeConv.id).single().then(({ data }) => {
        const d = data as Record<string, unknown> | null;
        if (d?.self_destruct_seconds) setSelfDestructSeconds(d.self_destruct_seconds as number);
        else setSelfDestructSeconds(null);
        if (d?.pinned_message_id) {
          supabase.from('messages').select('*').eq('id', d.pinned_message_id as string).single().then(({ data: pmsg }) => {
            if (pmsg) setPinnedMessage(pmsg as Message);
          });
        } else setPinnedMessage(null);
      });
  }, [activeConv]);

  // ── Self-destruct fade + expiry ───────────────────────────────────────────
  const [fadeTick, setFadeTick] = useState(0);

  useEffect(() => {
    const now = new Date();
    const upcoming = messages.filter(m => m.expires_at && new Date(m.expires_at) > now);
    const expired = messages.filter(m => m.expires_at && new Date(m.expires_at) <= now);
    if (expired.length > 0) {
      setMessages(prev => prev.filter(m => !m.expires_at || new Date(m.expires_at) > now));
    }
    if (upcoming.length > 0) {
      const nextExpiry = Math.min(...upcoming.map(m => new Date(m.expires_at!).getTime() - now.getTime()));
      const tickInterval = Math.min(2000, Math.max(nextExpiry, 500));
      const timer = setTimeout(() => {
        setFadeTick(t => t + 1);
        setMessages(prev => prev.filter(m => !m.expires_at || new Date(m.expires_at) > new Date()));
      }, tickInterval);
      return () => clearTimeout(timer);
    }
  }, [messages, fadeTick]);

  const getMessageOpacity = useCallback((msg: Message): number => {
    if (!msg.expires_at) return 1;
    const now = Date.now();
    const expiresAt = new Date(msg.expires_at).getTime();
    const createdAt = new Date(msg.created_at).getTime();
    const totalDuration = expiresAt - createdAt;
    const remaining = expiresAt - now;
    if (remaining <= 0) return 0;
    if (totalDuration <= 0) return 1;
    const ratio = remaining / totalDuration;
    if (ratio > 0.3) return 1;
    return 0.15 + (ratio / 0.3) * 0.85;
  }, []);

  // ── Reactions ─────────────────────────────────────────────────────────────
  const toggleReaction = useCallback(async (messageId: string, emoji: string) => {
    if (!user) return;
    const existing = reactions.find(r => r.message_id === messageId && r.user_id === user.id && r.emoji === emoji);
    try {
      if (existing) {
        const { error } = await supabase.from('message_reactions').delete().eq('id', existing.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from('message_reactions').insert({ message_id: messageId, user_id: user.id, emoji });
        if (error) throw error;
        haptic('light');
      }
    } catch (err) {
      chatError('reactionFailed', isAr, describeError(err, isAr));
    }
  }, [user, reactions, isAr]);

  // ── Files + staged images ─────────────────────────────────────────────────
  const handleFileUpload = useCallback(async (e: ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (!files.length || !user || !activeConv) return;

    const images = files.filter(f => f.type.startsWith('image/'));
    const others = files.filter(f => !f.type.startsWith('image/'));

    if (images.length > 0) {
      const validImages = images.filter(f => validateFile(f, 'image', isAr));
      const currentCount = stagedImages.length;
      const room = Math.max(0, MAX_STAGED_IMAGES - currentCount);
      if (validImages.length > room) chatError('tooManyImages', isAr);
      const toStage = validImages.slice(0, room);
      if (toStage.length > 0) {
        const previews = toStage.map(f => URL.createObjectURL(f));
        setStagedImages(prev => [...prev, ...toStage]);
        setStagedPreviews(prev => [...prev, ...previews]);
      }
      if (fileInputRef.current) fileInputRef.current.value = '';
    }

    for (const file of others) {
      if (!validateFile(file, 'file', isAr)) continue;
      setUploading(true);
      const ext = file.name.includes('.') ? (file.name.split('.').pop() || 'bin') : 'bin';
      const path = `${user.id}/${activeConv.id}/${Date.now()}.${ext}`;
      const { error } = await supabase.storage.from('chat-files').upload(path, file);
      setUploading(false);
      if (error) { chatError('uploadFailed', isAr, describeError(error, isAr)); continue; }
      await sendMessage('file', path, file.name);
    }
    if (fileInputRef.current) fileInputRef.current.value = '';
  }, [user, activeConv, sendMessage, isAr, stagedImages.length]);

  const addImagesFromFiles = useCallback((files: File[]) => {
    const images = files.filter(f => f.type.startsWith('image/'));
    if (images.length === 0) return;
    const valid = images.filter(f => validateFile(f, 'image', isAr));
    const room = Math.max(0, MAX_STAGED_IMAGES - stagedImages.length);
    if (valid.length > room) chatError('tooManyImages', isAr);
    const toStage = valid.slice(0, room);
    if (toStage.length === 0) return;
    const previews = toStage.map(f => URL.createObjectURL(f));
    setStagedImages(prev => [...prev, ...toStage]);
    setStagedPreviews(prev => [...prev, ...previews]);
  }, [isAr, stagedImages.length]);

  const addFilesFromDrop = useCallback(async (files: File[]) => {
    if (!files.length || !user || !activeConv) return;
    const images = files.filter(f => f.type.startsWith('image/'));
    const others = files.filter(f => !f.type.startsWith('image/'));
    if (images.length > 0) addImagesFromFiles(images);
    for (const file of others) {
      if (!validateFile(file, 'file', isAr)) continue;
      setUploading(true);
      const ext = file.name.includes('.') ? (file.name.split('.').pop() || 'bin') : 'bin';
      const path = `${user.id}/${activeConv.id}/${Date.now()}.${ext}`;
      const { error } = await supabase.storage.from('chat-files').upload(path, file);
      setUploading(false);
      if (error) { chatError('uploadFailed', isAr, describeError(error, isAr)); continue; }
      await sendMessage('file', path, file.name);
    }
  }, [user, activeConv, addImagesFromFiles, isAr, sendMessage]);

  const pendingCaptionsRef = useRef<Map<string, string>>(new Map());

  const sendStagedImages = useCallback(() => {
    if (!user || !activeConv || stagedImages.length === 0) return;
    const caption = newMessage.trim();
    let firstTempId: string | null = null;
    for (const file of stagedImages) {
      const tempId = imageUpload.startUpload(file, activeConv.id, user.id);
      if (!firstTempId) firstTempId = tempId;
    }
    if (caption && firstTempId) {
      pendingCaptionsRef.current.set(firstTempId, caption);
      setNewMessage('');
      chatPrefs.clearDraft(activeConv.id);
      resizeComposer();
    }
    stagedPreviews.forEach(url => { try { URL.revokeObjectURL(url); } catch { /* no-op */ } });
    setStagedImages([]);
    setStagedPreviews([]);
    isNearBottomRef.current = true;
    setTimeout(() => scrollToBottom(), 100);
    playChatSound('send');
  }, [user, activeConv, stagedImages, stagedPreviews, imageUpload, scrollToBottom, newMessage, chatPrefs, resizeComposer]);

  const removeStagedImage = useCallback((index: number) => {
    const url = stagedPreviews[index];
    if (url) { try { URL.revokeObjectURL(url); } catch { /* no-op */ } }
    setStagedImages(prev => prev.filter((_, i) => i !== index));
    setStagedPreviews(prev => prev.filter((_, i) => i !== index));
  }, [stagedPreviews]);

  const clearStagedImages = useCallback(() => {
    stagedPreviews.forEach(url => { try { URL.revokeObjectURL(url); } catch { /* no-op */ } });
    setStagedImages([]);
    setStagedPreviews([]);
  }, [stagedPreviews]);

  useEffect(() => {
    imageUpload.setOnUploadComplete((tempId: string, storagePath: string, fileName: string, conversationId: string) => {
      if (user) {
        const caption = pendingCaptionsRef.current.get(tempId);
        if (caption !== undefined) pendingCaptionsRef.current.delete(tempId);
        sendMessage('image', storagePath, fileName, caption, conversationId);
        setTimeout(() => imageUpload.clearUpload(tempId), 500);
      }
    });
    return () => imageUpload.setOnUploadComplete(undefined);
  }, [user, sendMessage, imageUpload]);

  const getReplyPreview = useCallback((replyId: string) => {
    const msg = messages.find(m => m.id === replyId);
    if (!msg) return null;
    if (msg.deleted) return isAr ? 'رسالة محذوفة' : 'Gelöschte Nachricht';
    if (msg.message_type === 'image') return '📷 ' + (isAr ? 'صورة' : 'Foto');
    if (msg.message_type === 'voice') return '🎤 ' + (isAr ? 'رسالة صوتية' : 'Sprachnachricht');
    if (msg.message_type === 'file') return '📎 ' + msg.file_name;
    return msg.content.length > 50 ? msg.content.slice(0, 50) + '…' : msg.content;
  }, [messages, isAr]);

  const deleteConversation = useCallback(async () => {
    if (!activeConv || !user) return;
    const { error: delMsgsErr } = await supabase.from('messages').delete().eq('conversation_id', activeConv.id);
    if (delMsgsErr) { chatError('deleteFailed', isAr, describeError(delMsgsErr, isAr)); return; }
    const { error: delConvErr } = await supabase.from('conversations').delete().eq('id', activeConv.id);
    if (delConvErr) { chatError('deleteFailed', isAr, describeError(delConvErr, isAr)); return; }
    chatPrefs.clearDraft(activeConv.id);
    chatPrefs.clearScroll(activeConv.id);
    setActiveConv(null);
    setShowChatMenu(false);
    loadConversations();
  }, [activeConv, user, loadConversations, chatPrefs, setActiveConv, isAr]);

  // ── New chat search ───────────────────────────────────────────────────────
  const searchForUser = useCallback(async () => {
    if (!searchUser.trim() || !user) return;
    setSearchError('');
    setSearchResult(null);
    setSearching(true);

    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('user_id, username, display_name, avatar_url')
        .ilike('username', `%${searchUser.trim()}%`)
        .neq('user_id', user.id)
        .order('username', { ascending: true })
        .limit(1);

      if (error) { chatError('searchFailed', isAr, describeError(error, isAr)); return; }

      const profile = data?.[0];
      if (profile) {
        setSearchResult({
          ...profile,
          display_name: profile.display_name ?? undefined,
          avatar_url: profile.avatar_url ?? undefined,
        });
      } else {
        setSearchError(isAr ? 'لم يتم العثور على المستخدم' : 'Benutzer nicht gefunden');
      }
    } finally {
      setSearching(false);
    }
  }, [searchUser, user, isAr]);

  const startConversation = useCallback(async () => {
    if (!searchResult || !user) return;
    setLoading(true);

    try {
      const { data: existing } = await supabase
        .from('conversations')
        .select('*')
        .or(`and(user1_id.eq.${user.id},user2_id.eq.${searchResult.user_id}),and(user1_id.eq.${searchResult.user_id},user2_id.eq.${user.id})`)
        .maybeSingle();

      const finish = (conv: Record<string, unknown>) => {
        setActiveConv({
          ...(conv as unknown as Conversation),
          otherUsername: searchResult.username,
          otherDisplayName: searchResult.display_name || searchResult.username,
          otherAvatarUrl: searchResult.avatar_url ?? undefined,
          otherUserId: searchResult.user_id,
        });
        setShowNewChat(false);
        setSearchUser('');
        setSearchResult(null);
      };

      if (existing) { finish(existing); return; }

      const { data: newConv, error } = await supabase
        .from('conversations')
        .insert({ user1_id: user.id, user2_id: searchResult.user_id })
        .select()
        .single();

      if (error || !newConv) {
        chatError('convStartFailed', isAr, describeError(error, isAr));
        return;
      }
      finish(newConv);
      loadConversations();
    } finally {
      setLoading(false);
    }
  }, [searchResult, user, loadConversations, setActiveConv, isAr]);

  // ── Visible messages = filter out hidden_for-includes-me ─────────────────
  const visibleMessages = useMemo(() => {
    if (!user) return messages;
    return messages.filter(m => !m.hidden_for?.includes(user.id));
  }, [messages, user]);

  const getMessageMeta = useCallback((idx: number) => {
    const list = visibleMessages;
    const msg = list[idx];
    const prev = idx > 0 ? list[idx - 1] : null;
    const next = idx < list.length - 1 ? list[idx + 1] : null;
    const sameSenderAsPrev = prev && prev.sender_id === msg.sender_id && !prev.deleted && (new Date(msg.created_at).getTime() - new Date(prev.created_at).getTime() < 120000);
    const sameSenderAsNext = next && next.sender_id === msg.sender_id && !next.deleted && (new Date(next.created_at).getTime() - new Date(msg.created_at).getTime() < 120000);
    const showDate = idx === 0 || new Date(msg.created_at).toDateString() !== new Date(list[idx - 1].created_at).toDateString();
    return { sameSenderAsPrev: !!sameSenderAsPrev && !showDate, sameSenderAsNext: !!sameSenderAsNext, showDate };
  }, [visibleMessages]);

  // Resolve forwarded-from author names. Skips uids we already know
  // (cached, our own user, or the active conversation peer).
  useEffect(() => {
    if (!user) return;
    const known = new Set<string>([
      user.id,
      ...(activeConv?.otherUserId ? [activeConv.otherUserId] : []),
      ...Object.keys(forwardedNames),
    ]);
    const missing = new Set<string>();
    for (const m of messages) {
      const id = m.forwarded_from_sender_id;
      if (id && !known.has(id)) missing.add(id);
    }
    if (missing.size === 0) return;
    let cancelled = false;
    supabase.from('profiles')
      .select('user_id, username, display_name')
      .in('user_id', Array.from(missing))
      .then(({ data }) => {
        if (cancelled || !data) return;
        setForwardedNames(prev => {
          const next = { ...prev };
          for (const row of data) {
            const r = row as { user_id: string; username: string | null; display_name: string | null };
            next[r.user_id] = r.display_name || r.username || '';
          }
          return next;
        });
      });
    return () => { cancelled = true; };
  }, [messages, user, activeConv?.otherUserId, forwardedNames]);

  /** Look up a display name for a forwarded message's original author. */
  const getForwardedName = useCallback((senderId: string | null | undefined): string => {
    if (!senderId) return '';
    if (user && senderId === user.id) return isAr ? 'أنت' : 'Du';
    if (activeConv?.otherUserId === senderId) return activeConv.otherDisplayName || activeConv.otherUsername || '';
    return forwardedNames[senderId] || '';
  }, [user, activeConv, forwardedNames, isAr]);

  const copyMessage = useCallback((content: string) => {
    navigator.clipboard.writeText(content)
      .then(() => chatSuccess('copied', isAr))
      .catch(() => chatError('linkCopyFailed', isAr));
  }, [isAr]);



  // ── Multi-select ──────────────────────────────────────────────────────────
  const toggleSelect = useCallback((msgId: string) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(msgId)) next.delete(msgId);
      else next.add(msgId);
      return next;
    });
    haptic('light');
  }, []);

  const clearSelection = useCallback(() => setSelectedIds(new Set()), []);

  const copySelectedMessages = useCallback(() => {
    if (!user) return;
    const selected = messages
      .filter(m => selectedIds.has(m.id) && !m.deleted)
      .map(m => {
        if (m.message_type === 'text') return m.content;
        return getMessagePreview(m, isAr, user.id);
      })
      .join('\n');
    if (selected) {
      navigator.clipboard.writeText(selected)
        .then(() => chatSuccess('copied', isAr))
        .catch(() => chatError('linkCopyFailed', isAr));
    }
  }, [messages, selectedIds, isAr, user]);

  const deleteSelectedMessages = useCallback(async () => {
    if (!user) return;
    const ownSelected = messages
      .filter(m => selectedIds.has(m.id) && m.sender_id === user.id && !m.deleted)
      .map(m => m.id);
    await deleteManyMessages(ownSelected);
  }, [messages, selectedIds, user, deleteManyMessages]);

  const startForward = useCallback((msgs: Message[]) => {
    setForwardingMessages(msgs);
  }, []);

  const performForwardTo = useCallback(async (targetConvId: string) => {
    if (!forwardingMessages || !user) return;
    for (const m of forwardingMessages) {
      if (m.deleted) continue;
      // Preserve the original author so the badge shows the right name
      // even after multiple chained forwards (Telegram chains forward
      // provenance to the FIRST author, not the proximate forwarder).
      const provenance = {
        messageId: m.forwarded_from_message_id ?? m.id,
        senderId:  m.forwarded_from_sender_id  ?? m.sender_id,
      };
      if (m.message_type === 'text') {
        await sendMessage('text', undefined, undefined, m.content, targetConvId, provenance);
      } else if (m.message_type === 'image' || m.message_type === 'file' || m.message_type === 'voice') {
        await sendMessage(m.message_type, m.file_url || undefined, m.file_name || undefined, m.content || '', targetConvId, provenance);
      }
    }
    setForwardingMessages(null);
    setSelectedIds(new Set());
    playChatSound('send');
  }, [forwardingMessages, user, sendMessage]);

  const cancelForward = useCallback(() => setForwardingMessages(null), []);

  const firstUnreadId = useMemo(() => {
    if (!user || visibleMessages.length === 0) return null;
    const first = visibleMessages.find(m => !m.read && m.sender_id !== user.id && !m.deleted);
    return first?.id ?? null;
  }, [visibleMessages, user]);

  const sortedConversations = useMemo(() => {
    const pinned: Conversation[] = [];
    const rest: Conversation[] = [];
    for (const c of conversations) {
      if (chatPrefs.isPinned(c.id)) pinned.push(c);
      else rest.push(c);
    }
    return [...pinned, ...rest];
  }, [conversations, chatPrefs.prefs.pinned]); // eslint-disable-line react-hooks/exhaustive-deps

  const filteredByTab = useMemo(() => {
    if (conversationFilter === 'archived') {
      return sortedConversations.filter(c => chatPrefs.isArchived(c.id));
    }
    const visible = sortedConversations.filter(c => !chatPrefs.isArchived(c.id));
    if (conversationFilter === 'unread') {
      return visible.filter(c => (c.unreadCount || 0) > 0);
    }
    return visible;
  }, [sortedConversations, conversationFilter, chatPrefs.prefs.archived]); // eslint-disable-line react-hooks/exhaustive-deps

  return {
    user, isAr,
    // Data
    conversations, sortedConversations, filteredByTab,
    activeConv, setActiveConv,
    messages: visibleMessages,
    rawMessages: messages,
    reactions,
    firstUnreadId,
    // Composer
    newMessage, setNewMessage,
    replyTo, setReplyTo,
    editingMessage, setEditingMessage, cancelEdit,
    showEmojiPicker, setShowEmojiPicker,
    // New chat
    searchUser, setSearchUser, searchResult, searchError,
    showNewChat, setShowNewChat,
    loading, searching,
    // Panels
    showExtraEmojis, setShowExtraEmojis,
    showProfilePopup, setShowProfilePopup,
    profileTab, setProfileTab,
    showChatMenu, setShowChatMenu,
    showScrollDown,
    showSelfDestructMenu, setShowSelfDestructMenu,
    showMuteMenu, setShowMuteMenu,
    showWallpaperPicker, setShowWallpaperPicker,
    // Filter
    conversationFilter, setConversationFilter,
    // Realtime
    typingUser, typingByConv, onlineUserIds, uploading,
    messagesLoading, conversationsLoading,
    signedUrls, getFileUrl, refreshSignedUrl,
    // Search
    showSearch, setShowSearch,
    chatSearchQuery, searchResults, searchIndex,
    // Pin / self-destruct
    pinnedMessage, setPinnedMessage,
    selfDestructSeconds,
    // Lightbox / media
    sharedMedia, setSharedMedia,
    lightboxSrc, setLightboxSrc,
    lightboxOpen, setLightboxOpen,
    lightboxRect, setLightboxRect,
    stagedImages, stagedPreviews,
    // Selection
    selectedIds, selectionMode, toggleSelect, clearSelection,
    copySelectedMessages, deleteSelectedMessages,
    hideManyForSelf,
    // Forward
    forwardingMessages, startForward, performForwardTo, cancelForward,
    // Presence
    otherPresence, imageUpload,
    // Refs
    messagesEndRef, messagesContainerRef, fileInputRef, inputRef,
    // Actions
    scrollToBottom, focusComposer, resizeComposer, handleScroll,
    loadConversations, loadMessages,
    sendMessage, retryFailedMessage,
    deleteMessage, deleteManyMessages, hideMessageForSelf,
    pinMessage,
    startEditMessage, saveEditMessage,
    searchInChat, navigateSearch,
    toggleSelfDestruct, toggleReaction,
    handleFileUpload, addImagesFromFiles, addFilesFromDrop, sendStagedImages, removeStagedImage, clearStagedImages,
    getReplyPreview, deleteConversation,
    searchForUser, startConversation,
    getMessageMeta, copyMessage, broadcastTyping,
    getMessageOpacity,
    getForwardedName,
    // Prefs
    chatPrefs,
  };
}

export type ChatHook = ReturnType<typeof useChat>;
