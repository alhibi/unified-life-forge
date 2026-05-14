import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useApp } from '@/contexts/AppContext';
import { useImageUpload } from '@/contexts/ImageUploadContext';
import { useOtherUserPresence, useUserOnline, useOnlineUserIds, formatLastSeen, useTick } from '@/hooks/usePresence';
import { getSignedFileUrl, getMessagePreview } from './chatUtils';
import { playChatSound, primeAudio, haptic } from './sounds';
import { useChatPrefs } from './useChatPrefs';
import {
  chatError, chatSuccess, describeError, validateFile, clampText,
  MAX_STAGED_IMAGES,
} from './chatNotify';
import type { Conversation, Message, Reaction, ConversationFilter } from './types';

interface UseChatOptions {
  open: boolean;
  onUnreadChange: (count: number) => void;
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
  useEffect(() => { stagedPreviewsRef.current = stagedPreviews; }, [stagedPreviews]);

  const imageUpload = useImageUpload();

  // ── Presence ──────────────────────────────────────────────────────────────
  const [realtimeLastSeen, setRealtimeLastSeen] = useState<string | null>(null);
  useOtherUserPresence(activeConv?.otherUserId, useCallback((ls: string | null) => setRealtimeLastSeen(ls), []));
  const otherIsLiveOnline = useUserOnline(activeConv?.otherUserId);
  // While the drawer is open we read the entire set of online users on a
  // single channel so the conversation list can paint a green dot on each
  // avatar without N hooks per row.
  const onlineUserIds = useOnlineUserIds(open);
  // Re-evaluate the formatted "last seen" string every 30s so labels like
  // "2 min ago" stay accurate without the consumer wiring a setInterval.
  const presenceTick = useTick(30_000);

  const otherPresence = useMemo(() => {
    const ls = realtimeLastSeen ?? activeConv?.otherLastSeen ?? null;
    const formatted = formatLastSeen(ls, isAr);
    if (otherIsLiveOnline) {
      return { text: isAr ? 'متصل الآن' : 'Online', isOnline: true };
    }
    return formatted;
    // presenceTick is included intentionally so the memo recomputes on each
    // 30s tick and labels like "2 min ago" stay accurate without consumers
    // wiring a setInterval.
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
    // "Near bottom" threshold — within 120 px we still auto-scroll on new
    // messages; beyond that we respect the user and surface the scroll FAB.
    isNearBottomRef.current = distFromBottom < 120;
    setShowScrollDown(distFromBottom > 200);
  }, []);

  // Revoke all staged preview object URLs (defensive cleanup).
  const revokeStagedPreviews = useCallback(() => {
    stagedPreviewsRef.current.forEach(url => {
      try { URL.revokeObjectURL(url); } catch { /* no-op */ }
    });
    stagedPreviewsRef.current = [];
  }, []);

  // On full unmount, revoke any lingering blob URLs so they don't leak.
  useEffect(() => {
    return () => { revokeStagedPreviews(); };
  }, [revokeStagedPreviews]);

  // Wrapped setActiveConv: save/restore drafts, reset ephemeral UI state,
  // and clear the signed-URL cache so files from a different conversation
  // don't leak (they expire after 1h anyway).
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
    setShowSearch(false);
    setChatSearchQuery('');
    setSearchResults([]);
    setShowEmojiPicker(false);
    setSelectedIds(new Set());
    setSignedUrls({});          // fresh conv = fresh URL cache
    revokeStagedPreviews();     // don't carry images across conversations
    setStagedImages([]);
    setStagedPreviews([]);
    isNearBottomRef.current = true;

    if (conv) {
      const draft = chatPrefs.getDraft(conv.id);
      setNewMessage(draft);
      setTimeout(() => resizeComposer(), 0);
    } else {
      setNewMessage('');
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
          supabase.from('messages')
            .select('conversation_id, sender_id, content, message_type, deleted, created_at, file_name')
            .eq('conversation_id', cid)
            .order('created_at', { ascending: false })
            .limit(1)
            .maybeSingle()
        )).then(results => ({
          data: results.map(r => r.data).filter(Boolean) as Array<{
            conversation_id: string; sender_id: string; content: string; message_type: string; deleted: boolean; created_at: string; file_name: string | null;
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
          lastMessage: lastMsg ? getMessagePreview(lastMsg, isAr) : undefined,
          lastMessageType: lastMsg?.message_type,
          lastMessageFromMe: lastMsg?.sender_id === user.id,
          lastMessageDeleted: lastMsg?.deleted,
          lastMessageTime: lastMsg?.created_at || conv.updated_at,
          unreadCount,
        };
      });

      setConversations(enriched);
      // Unread badge: ignore muted chats so notifications don't nag
      onUnreadChange(enriched.reduce((sum, c) => chatPrefs.isMuted(c.id) ? sum : sum + (c.unreadCount || 0), 0));
    } catch {
      // Silent — network toast already handled via chatError elsewhere
    } finally {
      setConversationsLoading(false);
    }
  }, [user, onUnreadChange, isAr, chatPrefs]);

  // Trailing-debounced variant for realtime bursts. Multiple incoming messages
  // within 400 ms coalesce into a single refetch.
  const scheduleLoadConversations = useCallback(() => {
    if (loadConversationsTimerRef.current) clearTimeout(loadConversationsTimerRef.current);
    loadConversationsTimerRef.current = setTimeout(() => {
      loadConversations();
    }, 400);
  }, [loadConversations]);

  // Recompute unread badge when mute prefs change
  useEffect(() => {
    onUnreadChange(conversations.reduce((sum, c) => chatPrefs.isMuted(c.id) ? sum : sum + (c.unreadCount || 0), 0));
  }, [conversations, chatPrefs.prefs.muted, onUnreadChange, chatPrefs]);

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
        setMessages(data as Message[]);
        const msgIds = data.map(m => m.id);

        supabase.rpc('mark_messages_read', { p_conversation_id: activeConv.id }).then();

        if (msgIds.length > 0) {
          const { data: rxns } = await supabase
            .from('message_reactions')
            .select('*')
            .in('message_id', msgIds);
          setReactions((rxns || []) as Reaction[]);
        } else {
          setReactions([]);
        }

        requestAnimationFrame(() => scrollToBottom(false));
      }
    } finally {
      setMessagesLoading(false);
    }
  }, [activeConv, user, scrollToBottom, isAr]);

  useEffect(() => { if (open && user) loadConversations(); }, [open, user, loadConversations]);
  useEffect(() => { if (activeConv) loadMessages(); }, [activeConv, loadMessages]);

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

  /**
   * Returns the signed URL for a message's attachment when it's resolved.
   * Falls back to the raw `file_url` only if it already looks like an HTTP(S)
   * URL — otherwise returns an empty string so the bubble can show its
   * skeleton instead of triggering a broken-image request.
   */
  const getFileUrl = useCallback((msg: Message) => {
    if (signedUrls[msg.id]) return signedUrls[msg.id];
    if (msg.file_url && /^https?:\/\//i.test(msg.file_url)) return msg.file_url;
    return '';
  }, [signedUrls]);

  /** Force-refresh a signed URL for a given message — e.g. after expiry. */
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
  useEffect(() => {
    if (!user || !open) return;
    let cancelled = false;
    const channelName = `chat-realtime-${Date.now()}`;

    const channel = supabase
      .channel(channelName)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'messages' }, (payload) => {
        if (cancelled) return;
        if (payload.eventType === 'INSERT') {
          const msg = payload.new as Message;

          if (activeConv && msg.conversation_id === activeConv.id) {
            setMessages(prev => {
              if (prev.some(m => m.id === msg.id)) return prev;
              // Replace optimistic message if it matches
              if (msg.sender_id === user.id) {
                const idx = prev.findIndex(m =>
                  m.id.startsWith('optimistic_') &&
                  m.content === msg.content &&
                  m.sender_id === msg.sender_id
                );
                if (idx !== -1) {
                  const next = [...prev];
                  next[idx] = msg;
                  return next;
                }
              }
              return [...prev, msg];
            });

            if (msg.sender_id !== user.id) {
              supabase.rpc('mark_message_read', { p_message_id: msg.id }).then();
              if (!chatPrefs.isMuted(activeConv.id)) {
                const now = Date.now();
                if (now - lastIncomingTsRef.current > 800) {
                  lastIncomingTsRef.current = now;
                  playChatSound('receive');
                }
              }
            }
            // Only auto-scroll if the user is already near the bottom; otherwise
            // leave them where they are and let the scroll-down FAB advertise
            // the new message.
            if (isNearBottomRef.current || msg.sender_id === user.id) {
              requestAnimationFrame(() => scrollToBottom(true));
            }
          } else if (msg.sender_id !== user.id) {
            // Message in a different conversation – play receive (if not muted)
            const conv = conversations.find(c => c.id === msg.conversation_id);
            if (conv && !chatPrefs.isMuted(conv.id)) {
              const now = Date.now();
              if (now - lastIncomingTsRef.current > 1500) {
                lastIncomingTsRef.current = now;
                playChatSound('receive');
              }
            }
          }
          scheduleLoadConversations();
        } else if (payload.eventType === 'UPDATE') {
          const msg = payload.new as Message;
          setMessages(prev => prev.map(m => m.id === msg.id ? msg : m));
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
      .subscribe();

    return () => {
      cancelled = true;
      if (loadConversationsTimerRef.current) clearTimeout(loadConversationsTimerRef.current);
      supabase.removeChannel(channel);
    };
  }, [user, open, activeConv, scrollToBottom, scheduleLoadConversations, chatPrefs, conversations]);

  // ── Typing presence ───────────────────────────────────────────────────────
  // Receiver-side fail-safe: if the remote tab dies between an "I'm typing"
  // and the trailing "stopped" broadcast, we never get the corresponding
  // `track({ typing: false })`. A local timer auto-clears the indicator if
  // we haven't seen a fresh sync within TYPING_STALE_MS.
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

    const channel = supabase.channel(`typing:${activeConv.id}`, {
      config: { presence: { key: user.id } },
    });

    channel.on('presence', { event: 'sync' }, () => {
      const state = channel.presenceState();
      const others = Object.keys(state).filter(k => k !== user!.id);
      const isTyping = others.some(k => {
        const presences = state[k] as Record<string, unknown>[];
        return presences?.some((p) => p.typing === true);
      });
      setTypingUser(isTyping);
      if (isTyping) armStale(); else disarmStale();
    });

    channel.on('presence', { event: 'leave' }, ({ leftPresences }) => {
      const otherLeft = leftPresences?.some((p: Record<string, unknown>) => p.typing === true);
      if (otherLeft) { setTypingUser(false); disarmStale(); }
    });

    channel.subscribe(async (status) => {
      if (status === 'SUBSCRIBED') typingChannelRef.current = channel;
    });

    return () => {
      if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
      disarmStale();
      // Synchronously emit a final {typing: false} on the OUTGOING channel
      // so the other side sees us stop the moment we switch conv, even if
      // the trailing setTimeout (which fires {typing: false}) never gets to
      // run because we just cleared it.
      try { channel.track({ typing: false }); } catch { /* no-op */ }
      try { channel.untrack(); } catch { /* no-op */ }
      typingChannelRef.current = null;
      typingThrottleRef.current = 0;
      supabase.removeChannel(channel);
    };
  }, [activeConv, user]);

  // ── Typing-in-conversation-list ──────────────────────────────────────────
  // While the drawer is open we want to surface "X is typing…" right in the
  // conversation list, not only inside the active chat. We piggy-back on the
  // existing per-conv presence channels by subscribing in listen-only mode
  // (no track() call). Capped at MAX_LIST_TYPING_CHANNELS so a user with
  // hundreds of conversations never opens hundreds of realtime sockets.
  const MAX_LIST_TYPING_CHANNELS = 40;
  const convIdsForTyping = useMemo(
    () => conversations.slice(0, MAX_LIST_TYPING_CHANNELS).map(c => c.id).sort().join(','),
    [conversations],
  );
  useEffect(() => {
    if (!open || !user || !convIdsForTyping) return;
    const ids = convIdsForTyping.split(',').filter(Boolean);
    const listKey = `${user.id}-list`;
    const channels = ids.map(convId => {
      // Reuse the same channel name as the active-conv tracker so writes
      // there are visible here. Distinguish ourselves with a `-list` suffix
      // on the presence key so the active-conv subscriber doesn't think we
      // are a second tab for the same user.
      const ch = supabase.channel(`typing:${convId}`, {
        config: { presence: { key: listKey } },
      });
      const recompute = () => {
        const state = ch.presenceState();
        const others = Object.entries(state).filter(([k]) => k !== listKey && k !== user.id);
        const typing = others.some(([, entries]) =>
          (entries as Array<Record<string, unknown>>).some(e => e.typing === true),
        );
        setTypingByConv(prev => {
          if (prev[convId] === typing) return prev;
          return { ...prev, [convId]: typing };
        });
      };
      ch.on('presence', { event: 'sync' }, recompute);
      ch.on('presence', { event: 'join' },  recompute);
      ch.on('presence', { event: 'leave' }, recompute);
      ch.subscribe();
      return ch;
    });
    return () => {
      channels.forEach(ch => supabase.removeChannel(ch));
      setTypingByConv({});
    };
  }, [open, user, convIdsForTyping]);

  const broadcastTyping = useCallback(() => {
    if (!typingChannelRef.current) return;
    // Throttle the "is typing" broadcast to once per second to avoid a
    // network call on every keystroke; the off-timer still trails by 1.5s
    // so the indicator reliably fades after the user stops.
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
  const sendMessage = useCallback(async (type: string = 'text', fileUrl?: string, fileName?: string, explicitContent?: string, explicitConvId?: string) => {
    const rawContent = explicitContent ?? (type === 'text' ? newMessage.trim() : (fileName || ''));
    // Clamp long messages defensively (RLS may reject otherwise, and it keeps
    // the DB tidy). `clipped` is currently not surfaced; toasting would be noisy.
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

    const optimisticId = `optimistic_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
    const now = new Date().toISOString();

    const insertData: Record<string, unknown> = {
      conversation_id: convId,
      sender_id: user.id,
      content,
      message_type: type,
      file_url: fileUrl || null,
      file_name: fileName || null,
      reply_to_id: replyToId,
    };

    if (selfDestructSeconds && isCurrentConv) {
      insertData.expires_at = new Date(Date.now() + selfDestructSeconds * 1000).toISOString();
    }

    if (type === 'text' && isCurrentConv) {
      const optimisticMsg: Message = {
        id: optimisticId,
        conversation_id: convId,
        sender_id: user.id,
        content,
        read: false,
        created_at: now,
        reply_to_id: replyToId,
        message_type: type,
        file_url: null,
        file_name: null,
        deleted: false,
        edited_at: null,
        expires_at: (insertData.expires_at as string) || null,
      };
      setMessages(prev => [...prev, optimisticMsg]);
      isNearBottomRef.current = true; // I just sent → jump to bottom
      requestAnimationFrame(() => scrollToBottom(true));
    }

    primeAudio();
    playChatSound('send');
    haptic('light');

    const insertPromise = supabase.from('messages').insert(insertData as never).select().single();
    supabase.from('conversations').update({ updated_at: now }).eq('id', convId).then();

    try {
      const { data: realMsg, error } = await insertPromise;
      if (error) {
        chatError('sendFailed', isAr, describeError(error, isAr));
        // Roll back the optimistic row so the user can retry via composer.
        if (type === 'text' && isCurrentConv) {
          setMessages(prev => prev.filter(m => m.id !== optimisticId));
          // Restore the text so they don't lose what they typed.
          setNewMessage(prev => prev || content);
          setTimeout(() => resizeComposer(), 0);
        }
        return;
      }
      if (realMsg && type === 'text' && isCurrentConv) {
        setMessages(prev => prev.map(m => m.id === optimisticId ? (realMsg as Message) : m));
      }
    } catch (err) {
      chatError('sendFailed', isAr, describeError(err, isAr));
      if (type === 'text' && isCurrentConv) {
        setMessages(prev => prev.filter(m => m.id !== optimisticId));
        setNewMessage(prev => prev || content);
      }
    }

    if (type === 'text' && isCurrentConv) focusComposer();
  }, [newMessage, activeConv, user, replyTo, selfDestructSeconds, resizeComposer, scrollToBottom, focusComposer, chatPrefs, isAr]);

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
      // Put the user back into edit mode so they don't lose context.
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
  const searchInChat = useCallback((query: string) => {
    setChatSearchQuery(query);
    if (!query.trim()) { setSearchResults([]); setSearchIndex(0); return; }
    const q = query.toLowerCase();
    const results = messages.filter(m => !m.deleted && m.message_type === 'text' && m.content.toLowerCase().includes(q));
    setSearchResults(results);
    setSearchIndex(results.length > 0 ? results.length - 1 : 0);
    if (results.length > 0) {
      const el = document.getElementById(`msg-${results[results.length - 1].id}`);
      el?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  }, [messages]);

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
  }, []); // fadeTick captured by re-render; no need as dep

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
  const handleFileUpload = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
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

  /**
   * Mixed-content handler used by drag-and-drop: stages images for batched
   * preview/send and uploads other files immediately as 'file' messages.
   */
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

  // Tracks pending captions keyed by temp upload id, so the first image of a
  // batch carries the user's typed caption once its storage upload completes.
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
    // Revoke preview URLs here — ImageUploadContext owns its own localPreviewUrl
    // created when the upload starts, so these are safe to release.
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

  // Wire image-upload completion
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
      // Use .limit(1) instead of .maybeSingle() so multiple matches don't
      // crash the query – we just pick the best one.
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

  const getMessageMeta = useCallback((idx: number) => {
    const msg = messages[idx];
    const prev = idx > 0 ? messages[idx - 1] : null;
    const next = idx < messages.length - 1 ? messages[idx + 1] : null;
    const sameSenderAsPrev = prev && prev.sender_id === msg.sender_id && !prev.deleted && (new Date(msg.created_at).getTime() - new Date(prev.created_at).getTime() < 120000);
    const sameSenderAsNext = next && next.sender_id === msg.sender_id && !next.deleted && (new Date(next.created_at).getTime() - new Date(msg.created_at).getTime() < 120000);
    const showDate = idx === 0 || new Date(msg.created_at).toDateString() !== new Date(messages[idx - 1].created_at).toDateString();
    return { sameSenderAsPrev: !!sameSenderAsPrev && !showDate, sameSenderAsNext: !!sameSenderAsNext, showDate };
  }, [messages]);

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
    const selected = messages
      .filter(m => selectedIds.has(m.id) && !m.deleted)
      .map(m => {
        if (m.message_type === 'text') return m.content;
        return getMessagePreview(m, isAr);
      })
      .join('\n');
    if (selected) {
      navigator.clipboard.writeText(selected)
        .then(() => chatSuccess('copied', isAr))
        .catch(() => chatError('linkCopyFailed', isAr));
    }
  }, [messages, selectedIds, isAr]);

  const deleteSelectedMessages = useCallback(async () => {
    if (!user) return;
    const ownSelected = messages
      .filter(m => selectedIds.has(m.id) && m.sender_id === user.id && !m.deleted)
      .map(m => m.id);
    await deleteManyMessages(ownSelected);
  }, [messages, selectedIds, user, deleteManyMessages]);

  // Forward: pick messages, open picker, then send to chosen conversation(s)
  const startForward = useCallback((msgs: Message[]) => {
    setForwardingMessages(msgs);
  }, []);

  const performForwardTo = useCallback(async (targetConvId: string) => {
    if (!forwardingMessages || !user) return;
    const label = isAr ? '↪️ محوّلة' : '↪️ Weitergeleitet';
    for (const m of forwardingMessages) {
      if (m.deleted) continue;
      const prefix = `${label}\n`;
      if (m.message_type === 'text') {
        await sendMessage('text', undefined, undefined, prefix + m.content, targetConvId);
      } else if (m.message_type === 'image' || m.message_type === 'file' || m.message_type === 'voice') {
        // Re-reference same storage path - target user sees it via signed URL
        await sendMessage(m.message_type, m.file_url || undefined, m.file_name || undefined, prefix + (m.content || ''), targetConvId);
      }
    }
    setForwardingMessages(null);
    setSelectedIds(new Set());
    playChatSound('send');
  }, [forwardingMessages, user, sendMessage, isAr]);

  const cancelForward = useCallback(() => setForwardingMessages(null), []);

  // ── Unread divider anchor (client-side: first unread incoming) ────────────
  const firstUnreadId = useMemo(() => {
    if (!user || messages.length === 0) return null;
    const first = messages.find(m => !m.read && m.sender_id !== user.id && !m.deleted);
    return first?.id ?? null;
  }, [messages, user]);

  // ── Sort + filter conversations for UI ────────────────────────────────────
  const sortedConversations = useMemo(() => {
    const pinned: Conversation[] = [];
    const rest: Conversation[] = [];
    for (const c of conversations) {
      if (chatPrefs.isPinned(c.id)) pinned.push(c);
      else rest.push(c);
    }
    // Each group already sorted by updated_at (descending) thanks to loadConversations
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
    messages, reactions,
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
    // Forward
    forwardingMessages, startForward, performForwardTo, cancelForward,
    // Presence
    otherPresence, imageUpload,
    // Refs
    messagesEndRef, messagesContainerRef, fileInputRef, inputRef,
    // Actions
    scrollToBottom, focusComposer, resizeComposer, handleScroll,
    loadConversations, loadMessages,
    sendMessage, deleteMessage, deleteManyMessages, pinMessage,
    startEditMessage, saveEditMessage,
    searchInChat, navigateSearch,
    toggleSelfDestruct, toggleReaction,
    handleFileUpload, addImagesFromFiles, addFilesFromDrop, sendStagedImages, removeStagedImage, clearStagedImages,
    getReplyPreview, deleteConversation,
    searchForUser, startConversation,
    getMessageMeta, copyMessage, broadcastTyping,
    getMessageOpacity,
    // Prefs
    chatPrefs,
  };
}

export type ChatHook = ReturnType<typeof useChat>;
