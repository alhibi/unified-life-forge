import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useApp } from '@/contexts/AppContext';
import { useImageUpload } from '@/contexts/ImageUploadContext';
import { useOtherUserPresence, formatLastSeen } from '@/hooks/usePresence';
import { getSignedFileUrl } from './chatUtils';
import type { Conversation, Message, Reaction } from './types';

interface UseChatOptions {
  open: boolean;
  onUnreadChange: (count: number) => void;
}

export function useChat({ open, onUnreadChange }: UseChatOptions) {
  const { user } = useAuth();
  const { language } = useApp();
  const isAr = language === 'ar';

  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [activeConv, setActiveConv] = useState<Conversation | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [reactions, setReactions] = useState<Reaction[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [searchUser, setSearchUser] = useState('');
  const [searchResult, setSearchResult] = useState<{ user_id: string; username: string; display_name?: string; avatar_url?: string } | null>(null);
  const [searchError, setSearchError] = useState('');
  const [showNewChat, setShowNewChat] = useState(false);
  const [loading, setLoading] = useState(false);
  const [replyTo, setReplyTo] = useState<Message | null>(null);
  const [showExtraEmojis, setShowExtraEmojis] = useState(false);
  const [typingUser, setTypingUser] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [signedUrls, setSignedUrls] = useState<Record<string, string>>({});
  const [showProfilePopup, setShowProfilePopup] = useState(false);
  const [showChatMenu, setShowChatMenu] = useState(false);
  const [showScrollDown, setShowScrollDown] = useState(false);
  const [sharedMedia, setSharedMedia] = useState<Message[]>([]);
  const [profileTab, setProfileTab] = useState<'info' | 'media'>('info');
  const [pinnedMessage, setPinnedMessage] = useState<Message | null>(null);
  const [showSearch, setShowSearch] = useState(false);
  const [chatSearchQuery, setChatSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<Message[]>([]);
  const [searchIndex, setSearchIndex] = useState(0);
  const [editingMessage, setEditingMessage] = useState<Message | null>(null);
  const [selfDestructSeconds, setSelfDestructSeconds] = useState<number | null>(null);
  const [showSelfDestructMenu, setShowSelfDestructMenu] = useState(false);
  const [lightboxSrc, setLightboxSrc] = useState('');
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [lightboxRect, setLightboxRect] = useState<DOMRect | null>(null);
  const [stagedImages, setStagedImages] = useState<File[]>([]);
  const [stagedPreviews, setStagedPreviews] = useState<string[]>([]);

  const typingChannelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);
  const reconnectRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const typingTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const messagesContainerRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  const imageUpload = useImageUpload();

  const [realtimeLastSeen, setRealtimeLastSeen] = useState<string | null>(null);
  useOtherUserPresence(activeConv?.otherUserId, useCallback((ls: string | null) => setRealtimeLastSeen(ls), []));

  const otherPresence = useMemo(() => {
    const ls = realtimeLastSeen ?? activeConv?.otherLastSeen ?? null;
    return formatLastSeen(ls, isAr);
  }, [realtimeLastSeen, activeConv?.otherLastSeen, isAr]);

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
    composer.style.height = `${Math.min(Math.max(composer.scrollHeight, 40), 120)}px`;
  }, []);

  const handleScroll = useCallback(() => {
    const container = messagesContainerRef.current;
    if (!container) return;
    const distFromBottom = container.scrollHeight - container.scrollTop - container.clientHeight;
    setShowScrollDown(distFromBottom > 200);
  }, []);

  // Load conversations
  const loadConversations = useCallback(async () => {
    if (!user) return;
    const { data: convs } = await supabase
      .from('conversations')
      .select('*')
      .or(`user1_id.eq.${user.id},user2_id.eq.${user.id}`)
      .order('updated_at', { ascending: false });

    if (!convs) return;

    const otherIds = convs.map(c => c.user1_id === user.id ? c.user2_id : c.user1_id);
    const convIds = convs.map(c => c.id);

    const [profilesRes, allMsgsRes, unreadMsgsRes] = await Promise.all([
      supabase.from('profiles')
        .select('user_id, username, display_name, avatar_url, bio, last_seen, created_at')
        .in('user_id', otherIds),
      Promise.all(convIds.map(cid =>
        supabase.from('messages')
          .select('conversation_id, content, message_type, deleted, created_at')
          .eq('conversation_id', cid)
          .order('created_at', { ascending: false })
          .limit(1)
          .maybeSingle()
      )).then(results => ({
        data: results.map(r => r.data).filter(Boolean) as { conversation_id: string; content: string; message_type: string; deleted: boolean; created_at: string }[],
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

    const enriched = convs.map((conv) => {
      const otherId = conv.user1_id === user.id ? conv.user2_id : conv.user1_id;
      const profile = profiles.find(p => p.user_id === otherId);
      const lastMsg = lastMsgMap.get(conv.id);
      const unreadCount = unreadCountMap.get(conv.id) || 0;

      let lastContent = lastMsg?.content;
      if (lastMsg?.deleted) lastContent = isAr ? '🚫 تم حذف الرسالة' : '🚫 Nachricht gelöscht';
      else if (lastMsg?.message_type === 'image') lastContent = '📷 ' + (isAr ? 'صورة' : 'Foto');
      else if (lastMsg?.message_type === 'voice') lastContent = '🎤 ' + (isAr ? 'رسالة صوتية' : 'Sprachnachricht');
      else if (lastMsg?.message_type === 'file') lastContent = '📎 ' + (isAr ? 'ملف' : 'Datei');

      return {
        ...conv,
        otherUsername: profile?.username || '?',
        otherDisplayName: profile?.display_name ?? profile?.username ?? '?',
        otherAvatarUrl: profile?.avatar_url ?? undefined,
        otherUserId: otherId,
        otherBio: (profile as Record<string, unknown>)?.bio as string | null ?? null,
        otherLastSeen: (profile as Record<string, unknown>)?.last_seen as string | null ?? null,
        otherCreatedAt: (profile as Record<string, unknown>)?.created_at as string | null ?? null,
        lastMessage: lastContent,
        lastMessageTime: lastMsg?.created_at || conv.updated_at,
        unreadCount,
      };
    });

    setConversations(enriched);
    onUnreadChange(enriched.reduce((sum, c) => sum + (c.unreadCount || 0), 0));
  }, [user, onUnreadChange, isAr]);

  // Load messages
  const loadMessages = useCallback(async () => {
    if (!activeConv || !user) return;
    const { data } = await supabase
      .from('messages')
      .select('*')
      .eq('conversation_id', activeConv.id)
      .order('created_at', { ascending: true });

    if (data) {
      setMessages(data as Message[]);
      const msgIds = data.map(m => m.id);

      supabase
        .from('messages')
        .update({ read: true })
        .eq('conversation_id', activeConv.id)
        .neq('sender_id', user.id)
        .eq('read', false)
        .then();

      if (msgIds.length > 0) {
        const { data: rxns } = await supabase
          .from('message_reactions')
          .select('*')
          .in('message_id', msgIds);
        setReactions((rxns || []) as Reaction[]);
      }

      scrollToBottom(false);
    }
  }, [activeConv, user, scrollToBottom]);

  useEffect(() => {
    if (open && user) loadConversations();
  }, [open, user, loadConversations]);

  useEffect(() => {
    if (activeConv) loadMessages();
  }, [activeConv, loadMessages]);

  // Resolve signed URLs
  useEffect(() => {
    const needsUrl = messages.filter(m => {
      if (signedUrls[m.id]) return false;
      if (m.file_url) return true;
      if (m.message_type === 'voice' && m.file_name && !m.file_url) return true;
      return false;
    });
    if (needsUrl.length === 0) return;
    Promise.all(needsUrl.map(async (m) => {
      let path = m.file_url || '';
      if (!path && m.message_type === 'voice' && m.file_name) {
        const tsMatch = m.file_name.match(/voice_(\d+)/);
        if (tsMatch) {
          const ext = m.file_name.split('.').pop() || 'webm';
          const folderPath = `${m.sender_id}/${m.conversation_id}`;
          const { data: files } = await supabase.storage.from('chat-files').list(folderPath, { limit: 200 });
          if (files && files.length > 0) {
            const target = parseInt(tsMatch[1]);
            const voiceFiles = files.filter(f => f.name.endsWith(`.${ext}`));
            let closest = voiceFiles[0];
            let minDiff = Infinity;
            for (const f of voiceFiles) {
              const fts = parseInt(f.name.replace(`.${ext}`, ''));
              if (!isNaN(fts)) {
                const diff = Math.abs(fts - target);
                if (diff < minDiff) { minDiff = diff; closest = f; }
              }
            }
            if (closest && minDiff < 5000) {
              path = `${folderPath}/${closest.name}`;
            }
          }
        }
      }
      if (!path) return { id: m.id, url: '' };
      const url = await getSignedFileUrl(path);
      return { id: m.id, url };
    })).then(results => {
      setSignedUrls(prev => {
        const next = { ...prev };
        results.forEach(r => { if (r.url) next[r.id] = r.url; });
        return next;
      });
    });
  }, [messages]);

  const getFileUrl = useCallback((msg: Message) => signedUrls[msg.id] || msg.file_url || '', [signedUrls]);

  // Realtime
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
              if (msg.sender_id === user.id) {
                const optimisticIdx = prev.findIndex(m =>
                  m.id.startsWith('optimistic_') &&
                  m.content === msg.content &&
                  m.sender_id === msg.sender_id
                );
                if (optimisticIdx !== -1) {
                  const next = [...prev];
                  next[optimisticIdx] = msg;
                  return next;
                }
              }
              return [...prev, msg];
            });
            if (msg.sender_id !== user.id) {
              supabase.from('messages').update({ read: true }).eq('id', msg.id).then();
            }
            requestAnimationFrame(() => scrollToBottom(false));
          }
          loadConversations();
        } else if (payload.eventType === 'UPDATE') {
          const msg = payload.new as Message;
          setMessages(prev => prev.map(m => m.id === msg.id ? msg : m));
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
      if (reconnectRef.current) clearTimeout(reconnectRef.current);
      supabase.removeChannel(channel);
    };
  }, [user, open, activeConv, scrollToBottom, loadConversations]);

  // Typing indicator
  useEffect(() => {
    if (!activeConv || !user) return;
    setTypingUser(false);

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
    });

    channel.on('presence', { event: 'leave' }, ({ leftPresences }) => {
      const otherLeft = leftPresences?.some((p: Record<string, unknown>) => p.typing === true);
      if (otherLeft) setTypingUser(false);
    });

    channel.subscribe(async (status) => {
      if (status === 'SUBSCRIBED') {
        typingChannelRef.current = channel;
      }
    });

    return () => {
      if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
      typingChannelRef.current?.untrack();
      typingChannelRef.current = null;
      supabase.removeChannel(channel);
    };
  }, [activeConv, user]);

  const broadcastTyping = useCallback(() => {
    if (!typingChannelRef.current) return;
    typingChannelRef.current.track({ typing: true });

    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
    typingTimeoutRef.current = setTimeout(() => {
      typingChannelRef.current?.track({ typing: false });
    }, 1500);
  }, []);

  // Send message
  const sendMessage = useCallback(async (type: string = 'text', fileUrl?: string, fileName?: string) => {
    const content = type === 'text' ? newMessage.trim() : (fileName || '');
    if (!content && type === 'text') return;
    if (!activeConv || !user) return;

    const replyToId = replyTo?.id || null;

    setNewMessage('');
    setReplyTo(null);
    resizeComposer();
    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
    typingChannelRef.current?.track({ typing: false });

    const optimisticId = `optimistic_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
    const now = new Date().toISOString();

    const insertData: Record<string, unknown> = {
      conversation_id: activeConv.id,
      sender_id: user.id,
      content,
      message_type: type,
      file_url: fileUrl || null,
      file_name: fileName || null,
      reply_to_id: replyToId,
    };

    if (selfDestructSeconds) {
      insertData.expires_at = new Date(Date.now() + selfDestructSeconds * 1000).toISOString();
    }

    if (type === 'text') {
      const optimisticMsg: Message = {
        id: optimisticId,
        conversation_id: activeConv.id,
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
      requestAnimationFrame(() => scrollToBottom(false));
    }

    const insertPromise = supabase.from('messages').insert(insertData as Record<string, string>).select().single();
    supabase.from('conversations')
      .update({ updated_at: now })
      .eq('id', activeConv.id)
      .then();

    if (type === 'text') {
      insertPromise.then(({ data: realMsg }) => {
        if (realMsg) {
          setMessages(prev => prev.map(m => m.id === optimisticId ? (realMsg as Message) : m));
        }
      });
      focusComposer();
    } else {
      await insertPromise;
    }
  }, [newMessage, activeConv, user, replyTo, selfDestructSeconds, resizeComposer, scrollToBottom, focusComposer]);

  const deleteMessage = useCallback(async (msgId: string) => {
    await supabase.from('messages').update({ deleted: true, content: '' }).eq('id', msgId);
  }, []);

  const pinMessage = useCallback(async (msg: Message) => {
    if (!activeConv) return;
    const newPinId = pinnedMessage?.id === msg.id ? null : msg.id;
    await supabase.from('conversations').update({ pinned_message_id: newPinId } as Record<string, unknown>).eq('id', activeConv.id);
    setPinnedMessage(newPinId ? msg : null);
  }, [activeConv, pinnedMessage]);

  const startEditMessage = useCallback((msg: Message) => {
    setEditingMessage(msg);
    setNewMessage(msg.content);
    setTimeout(() => { inputRef.current?.focus(); resizeComposer(); }, 50);
  }, [resizeComposer]);

  const saveEditMessage = useCallback(async () => {
    if (!editingMessage || !newMessage.trim()) return;
    await supabase.from('messages').update({
      content: newMessage.trim(),
      edited_at: new Date().toISOString(),
    } as Record<string, unknown>).eq('id', editingMessage.id);
    setEditingMessage(null);
    setNewMessage('');
    resizeComposer();
  }, [editingMessage, newMessage, resizeComposer]);

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

  const toggleSelfDestruct = useCallback(async (seconds: number | null) => {
    if (!activeConv) return;
    await supabase.from('conversations').update({ self_destruct_seconds: seconds } as Record<string, unknown>).eq('id', activeConv.id);
    setSelfDestructSeconds(seconds);
    setShowSelfDestructMenu(false);
    setShowChatMenu(false);
  }, [activeConv]);

  // Load pinned message & self-destruct setting
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
  }, [activeConv?.id]);

  // Check expired messages
  useEffect(() => {
    const now = new Date();
    const expired = messages.filter(m => m.expires_at && new Date(m.expires_at) <= now);
    if (expired.length > 0) {
      setMessages(prev => prev.filter(m => !m.expires_at || new Date(m.expires_at) > now));
    }
    const upcoming = messages.filter(m => m.expires_at && new Date(m.expires_at) > now);
    if (upcoming.length > 0) {
      const nextExpiry = Math.min(...upcoming.map(m => new Date(m.expires_at!).getTime() - now.getTime()));
      const timer = setTimeout(() => {
        setMessages(prev => prev.filter(m => !m.expires_at || new Date(m.expires_at) > new Date()));
      }, Math.max(nextExpiry, 1000));
      return () => clearTimeout(timer);
    }
  }, [messages]);

  const toggleReaction = useCallback(async (messageId: string, emoji: string) => {
    if (!user) return;
    const existing = reactions.find(r => r.message_id === messageId && r.user_id === user.id && r.emoji === emoji);
    if (existing) {
      await supabase.from('message_reactions').delete().eq('id', existing.id);
    } else {
      await supabase.from('message_reactions').insert({
        message_id: messageId,
        user_id: user.id,
        emoji,
      });
    }
  }, [user, reactions]);

  const handleFileUpload = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (!files.length || !user || !activeConv) return;

    const images = files.filter(f => f.type.startsWith('image/'));
    const others = files.filter(f => !f.type.startsWith('image/'));

    if (images.length > 0) {
      const previews = images.map(f => URL.createObjectURL(f));
      setStagedImages(prev => [...prev, ...images]);
      setStagedPreviews(prev => [...prev, ...previews]);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }

    for (const file of others) {
      setUploading(true);
      const ext = file.name.split('.').pop();
      const path = `${user.id}/${activeConv.id}/${Date.now()}.${ext}`;
      const { error } = await supabase.storage.from('chat-files').upload(path, file);
      if (!error) await sendMessage('file', path, file.name);
      setUploading(false);
    }
    if (fileInputRef.current) fileInputRef.current.value = '';
  }, [user, activeConv, sendMessage]);

  const sendStagedImages = useCallback(() => {
    if (!user || !activeConv || stagedImages.length === 0) return;
    for (const file of stagedImages) {
      imageUpload.startUpload(file, activeConv.id, user.id);
    }
    stagedPreviews.forEach(url => URL.revokeObjectURL(url));
    setStagedImages([]);
    setStagedPreviews([]);
    setTimeout(() => scrollToBottom(), 100);
  }, [user, activeConv, stagedImages, stagedPreviews, imageUpload, scrollToBottom]);

  const removeStagedImage = useCallback((index: number) => {
    URL.revokeObjectURL(stagedPreviews[index]);
    setStagedImages(prev => prev.filter((_, i) => i !== index));
    setStagedPreviews(prev => prev.filter((_, i) => i !== index));
  }, [stagedPreviews]);

  const clearStagedImages = useCallback(() => {
    stagedPreviews.forEach(url => URL.revokeObjectURL(url));
    setStagedImages([]);
    setStagedPreviews([]);
  }, [stagedPreviews]);

  // Wire up image upload completion
  useEffect(() => {
    imageUpload.setOnUploadComplete((tempId: string, storagePath: string, fileName: string, conversationId: string) => {
      if (activeConv && activeConv.id === conversationId && user) {
        sendMessage('image', storagePath, fileName);
        setTimeout(() => imageUpload.clearUpload(tempId), 500);
      }
    });
    return () => imageUpload.setOnUploadComplete(undefined);
  }, [activeConv, user, sendMessage, imageUpload]);

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
    await supabase.from('messages').delete().eq('conversation_id', activeConv.id);
    await supabase.from('conversations').delete().eq('id', activeConv.id);
    setActiveConv(null);
    setShowChatMenu(false);
    loadConversations();
  }, [activeConv, user, loadConversations]);

  const searchForUser = useCallback(async () => {
    if (!searchUser.trim() || !user) return;
    setSearchError('');
    setSearchResult(null);

    const { data } = await supabase
      .from('profiles')
      .select('user_id, username, display_name, avatar_url')
      .ilike('username', `%${searchUser.trim()}%`)
      .neq('user_id', user.id)
      .maybeSingle();

    if (data) {
      setSearchResult({ ...data, display_name: data.display_name ?? undefined, avatar_url: data.avatar_url ?? undefined });
    } else {
      setSearchError(isAr ? 'لم يتم العثور على المستخدم' : 'Benutzer nicht gefunden');
    }
  }, [searchUser, user, isAr]);

  const startConversation = useCallback(async () => {
    if (!searchResult || !user) return;
    setLoading(true);

    const { data: existing } = await supabase
      .from('conversations')
      .select('*')
      .or(`and(user1_id.eq.${user.id},user2_id.eq.${searchResult.user_id}),and(user1_id.eq.${searchResult.user_id},user2_id.eq.${user.id})`)
      .maybeSingle();

    if (existing) {
      setActiveConv({ ...existing, otherUsername: searchResult.username, otherDisplayName: searchResult.display_name || searchResult.username, otherAvatarUrl: searchResult.avatar_url ?? undefined, otherUserId: searchResult.user_id });
      setShowNewChat(false);
      setSearchUser('');
      setSearchResult(null);
      setLoading(false);
      return;
    }

    const { data: newConv } = await supabase
      .from('conversations')
      .insert({ user1_id: user.id, user2_id: searchResult.user_id })
      .select()
      .single();

    if (newConv) {
      setActiveConv({ ...newConv, otherUsername: searchResult.username, otherDisplayName: searchResult.display_name || searchResult.username, otherAvatarUrl: searchResult.avatar_url ?? undefined, otherUserId: searchResult.user_id });
      setShowNewChat(false);
      setSearchUser('');
      setSearchResult(null);
      loadConversations();
    }
    setLoading(false);
  }, [searchResult, user, loadConversations]);

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
    navigator.clipboard.writeText(content).catch(() => {});
  }, []);

  return {
    user, isAr,
    conversations, activeConv, setActiveConv,
    messages, reactions,
    newMessage, setNewMessage,
    searchUser, setSearchUser, searchResult, searchError,
    showNewChat, setShowNewChat,
    loading, replyTo, setReplyTo,
    showExtraEmojis, setShowExtraEmojis,
    typingUser, uploading,
    signedUrls, getFileUrl,
    showProfilePopup, setShowProfilePopup,
    showChatMenu, setShowChatMenu,
    showScrollDown,
    sharedMedia, setSharedMedia,
    profileTab, setProfileTab,
    pinnedMessage, showSearch, setShowSearch,
    chatSearchQuery, searchResults, searchIndex,
    editingMessage, setEditingMessage,
    selfDestructSeconds, showSelfDestructMenu, setShowSelfDestructMenu,
    lightboxSrc, setLightboxSrc,
    lightboxOpen, setLightboxOpen,
    lightboxRect, setLightboxRect,
    stagedImages, stagedPreviews,
    otherPresence, imageUpload,
    // Refs
    messagesEndRef, messagesContainerRef, fileInputRef, inputRef,
    // Actions
    scrollToBottom, focusComposer, resizeComposer, handleScroll,
    loadConversations, loadMessages,
    sendMessage, deleteMessage, pinMessage,
    startEditMessage, saveEditMessage,
    searchInChat, navigateSearch,
    toggleSelfDestruct, toggleReaction,
    handleFileUpload, sendStagedImages, removeStagedImage, clearStagedImages,
    getReplyPreview, deleteConversation,
    searchForUser, startConversation,
    getMessageMeta, copyMessage, broadcastTyping,
    setPinnedMessage,
  };
}
