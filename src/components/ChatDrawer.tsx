import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useOtherUserPresence, formatLastSeen } from '@/hooks/usePresence';
import { useApp } from '@/contexts/AppContext';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
  ChevronRight, ChevronLeft, ChevronDown, Send, Search, Plus, MessageCircle,
  Check, CheckCheck, Reply, Trash2, Paperclip, X,
  Download, FileText, MoreVertical, Trash, Info, Copy, Pin, Mic, Smile,
  ArrowDown, Calendar, Clock, Image as ImageIcon, User2
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { motion, AnimatePresence, useMotionValue, useTransform } from 'framer-motion';
import { EMOJI_AVATARS, getAppleEmojiUrl, isEmojiAvatarValue } from '@/utils/emojiAvatar';
import { getDefaultAvatarForUser } from '@/utils/defaultAvatar';

interface Conversation {
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
  lastMessageTime?: string;
  unreadCount?: number;
}

interface Message {
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
}

const getSignedFileUrl = async (fileUrl: string): Promise<string> => {
  if (!fileUrl || !fileUrl.includes('/chat-files/')) return fileUrl;
  const match = fileUrl.match(/chat-files\/(.+?)(?:\?|$)/);
  if (!match) return fileUrl;
  const path = decodeURIComponent(match[1]);
  const { data, error } = await supabase.storage.from('chat-files').createSignedUrl(path, 3600);
  return error ? fileUrl : data.signedUrl;
};

interface Reaction {
  id: string;
  message_id: string;
  user_id: string;
  emoji: string;
}

interface ChatDrawerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  unreadCount: number;
  onUnreadChange: (count: number) => void;
}

const QUICK_EMOJIS = ['❤️', '👍', '😂', '🔥', '😢', '👏'];
const EXTRA_EMOJIS = [
  '👎', '🥰', '😮', '🤔', '🎉', '💯', '🙏', '😡', '💔', '🫡',
  '✨', '🤣', '😍', '🥺', '😘', '🤗', '😎', '🤩', '😏', '🫠',
  '😤', '😭', '🥳', '💪', '🤝', '👀', '💀', '🫶', '🥹', '😈',
  '🤯', '💃', '🕺', '❤️‍🔥', '💋', '🌹', '🍕', '☕', '🎶', '⚡',
  '🦋', '🌙', '🔮', '🧿', '🪬', '📌', '🏆', '🎯', '💎', '🫰',
];

interface ActionMenuState {
  msg: Message;
  isMine: boolean;
  rect: { top: number; bottom: number; left: number; right: number; width: number; height: number };
  containerRect: { top: number; bottom: number; height: number };
}

function formatTime(dateStr: string, isAr: boolean) {
  const d = new Date(dateStr);
  const now = new Date();
  const diffMs = now.getTime() - d.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) return isAr ? 'الآن' : 'Jetzt';
  if (diffMins < 60) return isAr ? `${diffMins} د` : `${diffMins} Min`;
  if (diffHours < 24) return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  if (diffDays < 7) return d.toLocaleDateString(isAr ? 'ar' : 'de', { weekday: 'short' });
  return d.toLocaleDateString(isAr ? 'ar' : 'de', { day: 'numeric', month: 'short' });
}

// formatLastSeen is now imported from usePresence

// Swipeable message wrapper - right only
function SwipeableMessage({ children, isMine, deleted, onSwipeReply }: {
  children: React.ReactNode;
  isMine: boolean;
  deleted: boolean;
  onSwipeReply: () => void;
}) {
  const x = useMotionValue(0);
  const replyIconOpacity = useTransform(x, [0, 30, 50], [0, 0.5, 1]);
  const replyIconScale = useTransform(x, [0, 30, 50], [0.5, 0.8, 1]);

  return (
    <div className="relative overflow-visible w-full">
      <motion.div
        className="absolute top-1/2 -translate-y-1/2 start-0 pointer-events-none z-0"
        style={{ opacity: replyIconOpacity, scale: replyIconScale }}
      >
        <div className="w-8 h-8 rounded-full bg-primary/15 flex items-center justify-center">
          <Reply className="w-4 h-4 text-primary" />
        </div>
      </motion.div>
      <motion.div
        className={cn("relative z-10 flex", isMine ? 'justify-end' : 'justify-start')}
        style={{ x, touchAction: 'pan-y' }}
        drag={deleted ? false : "x"}
        dragDirectionLock
        dragConstraints={{ left: 0, right: 0 }}
        dragElastic={{ left: 0, right: 0.4 }}
        dragSnapToOrigin
        onDrag={(_, info) => {
          if (info.offset.x < 0) x.set(0);
        }}
        onDragEnd={(_, info) => {
          if (info.offset.x > 50) onSwipeReply();
        }}
      >
        {children}
      </motion.div>
    </div>
  );
}

// Typing dots animation
function TypingDots() {
  return (
    <div className="flex items-center gap-[3px] py-0.5">
      {[0, 1, 2].map(i => (
        <motion.div
          key={i}
          className="w-[5px] h-[5px] rounded-full bg-primary"
          animate={{ opacity: [0.3, 1, 0.3], y: [0, -3, 0] }}
          transition={{ duration: 0.8, repeat: Infinity, delay: i * 0.15 }}
        />
      ))}
    </div>
  );
}

export default function ChatDrawer({ open, onOpenChange, unreadCount, onUnreadChange }: ChatDrawerProps) {
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
  const [actionMenu, setActionMenu] = useState<ActionMenuState | null>(null);
  const [showExtraEmojis, setShowExtraEmojis] = useState(false);
  const [typingUser, setTypingUser] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [signedUrls, setSignedUrls] = useState<Record<string, string>>({});
  const typingChannelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);
  const [showProfilePopup, setShowProfilePopup] = useState(false);
  const [showChatMenu, setShowChatMenu] = useState(false);
  const [showScrollDown, setShowScrollDown] = useState(false);
  const [sharedMedia, setSharedMedia] = useState<Message[]>([]);
  const [profileTab, setProfileTab] = useState<'info' | 'media'>('info');
  const reconnectRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Voice recording state
  const [isRecording, setIsRecording] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const recordingChunksRef = useRef<Blob[]>([]);
  const recordingTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const recordingStartXRef = useRef(0);
  const recordingCancelledRef = useRef(false);

  // Voice playback state
  const [playingMsgId, setPlayingMsgId] = useState<string | null>(null);
  const [playbackProgress, setPlaybackProgress] = useState<Record<string, number>>({});
  const [playbackDurations, setPlaybackDurations] = useState<Record<string, number>>({});
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const playbackRAF = useRef<number | null>(null);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const messagesContainerRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const typingTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

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

  // Scroll detection for FAB
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
    const { data: profiles } = await supabase
      .from('profiles')
      .select('user_id, username, display_name, avatar_url, bio, last_seen, created_at')
      .in('user_id', otherIds);

    const enriched = await Promise.all(convs.map(async (conv) => {
      const otherId = conv.user1_id === user.id ? conv.user2_id : conv.user1_id;
      const profile = profiles?.find(p => p.user_id === otherId);

      const { data: lastMsg } = await supabase
        .from('messages')
        .select('content, message_type, deleted, created_at')
        .eq('conversation_id', conv.id)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      const { count } = await supabase
        .from('messages')
        .select('*', { count: 'exact', head: true })
        .eq('conversation_id', conv.id)
        .neq('sender_id', user.id)
        .eq('read', false)
        .eq('deleted', false);

      let lastContent = lastMsg?.content;
      if (lastMsg?.deleted) lastContent = isAr ? '🚫 تم حذف الرسالة' : '🚫 Nachricht gelöscht';
      else if (lastMsg?.message_type === 'image') lastContent = '📷 ' + (isAr ? 'صورة' : 'Foto');
      else if (lastMsg?.message_type === 'voice') lastContent = '🎤 ' + (isAr ? 'رسالة صوتية' : 'Sprachnachricht');
      else if (lastMsg?.message_type === 'file') lastContent = '📎 ' + (isAr ? 'ملف' : 'Datei');

      return {
        ...conv,
        otherUsername: profile?.username || '?',
        otherDisplayName: profile?.display_name || profile?.username || '?',
        otherAvatarUrl: profile?.avatar_url || null,
        otherUserId: otherId,
        otherBio: (profile as any)?.bio || null,
        otherLastSeen: (profile as any)?.last_seen || null,
        otherCreatedAt: (profile as any)?.created_at || null,
        lastMessage: lastContent,
        lastMessageTime: lastMsg?.created_at || conv.updated_at,
        unreadCount: count || 0,
      };
    }));

    setConversations(enriched);
    onUnreadChange(enriched.reduce((sum, c) => sum + (c.unreadCount || 0), 0));
  }, [user, onUnreadChange, isAr]);

  const loadMessages = useCallback(async () => {
    if (!activeConv || !user) return;
    const { data } = await supabase
      .from('messages')
      .select('*')
      .eq('conversation_id', activeConv.id)
      .order('created_at', { ascending: true });

    if (data) {
      setMessages(data as Message[]);
      await supabase
        .from('messages')
        .update({ read: true })
        .eq('conversation_id', activeConv.id)
        .neq('sender_id', user.id)
        .eq('read', false);

      const msgIds = data.map(m => m.id);
      if (msgIds.length > 0) {
        const { data: rxns } = await supabase
          .from('message_reactions')
          .select('*')
          .in('message_id', msgIds);
        setReactions((rxns || []) as Reaction[]);
      }

      setTimeout(() => scrollToBottom(false), 50);
    }
  }, [activeConv, user, scrollToBottom]);

  useEffect(() => {
    if (open && user) loadConversations();
  }, [open, user, loadConversations]);

  useEffect(() => {
    if (activeConv) loadMessages();
  }, [activeConv, loadMessages]);

  // Resolve signed URLs for file messages
  useEffect(() => {
    const fileMessages = messages.filter(m => m.file_url && !signedUrls[m.id]);
    if (fileMessages.length === 0) return;
    Promise.all(fileMessages.map(async (m) => {
      const url = await getSignedFileUrl(m.file_url!);
      return { id: m.id, url };
    })).then(results => {
      setSignedUrls(prev => {
        const next = { ...prev };
        results.forEach(r => { next[r.id] = r.url; });
        return next;
      });
    });
  }, [messages]);

  const getFileUrl = (msg: Message) => signedUrls[msg.id] || msg.file_url || '';

  // Realtime with reconnection
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
              return [...prev, msg];
            });
            if (msg.sender_id !== user.id) {
              supabase.from('messages').update({ read: true }).eq('id', msg.id).then();
            }
            setTimeout(scrollToBottom, 100);
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
      const others = Object.keys(state).filter(k => k !== user.id);
      const isTyping = others.some(k => {
        const presences = state[k] as any[];
        return presences?.some((p: any) => p.typing === true);
      });
      setTypingUser(isTyping);
    });

    // Also listen for join/leave to catch quick changes
    channel.on('presence', { event: 'leave' }, ({ leftPresences }) => {
      // When other user's presence leaves, stop showing typing
      const otherLeft = leftPresences?.some((p: any) => p.typing === true);
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

  // Polling
  useEffect(() => {
    if (!user) return;
    loadConversations();
    const interval = setInterval(loadConversations, 30000);
    return () => clearInterval(interval);
  }, [user, loadConversations]);

  // Realtime presence for the other user in active conversation
  const [realtimeLastSeen, setRealtimeLastSeen] = useState<string | null>(null);
  useOtherUserPresence(activeConv?.otherUserId, useCallback((ls) => setRealtimeLastSeen(ls), []));

  // Compute presence display for the active conversation's other user
  const otherPresence = useMemo(() => {
    const ls = realtimeLastSeen ?? activeConv?.otherLastSeen ?? null;
    return formatLastSeen(ls, isAr);
  }, [realtimeLastSeen, activeConv?.otherLastSeen, isAr]);

  const searchForUser = async () => {
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
      setSearchResult(data);
    } else {
      setSearchError(isAr ? 'لم يتم العثور على المستخدم' : 'Benutzer nicht gefunden');
    }
  };

  const startConversation = async () => {
    if (!searchResult || !user) return;
    setLoading(true);

    const { data: existing } = await supabase
      .from('conversations')
      .select('*')
      .or(`and(user1_id.eq.${user.id},user2_id.eq.${searchResult.user_id}),and(user1_id.eq.${searchResult.user_id},user2_id.eq.${user.id})`)
      .maybeSingle();

    if (existing) {
      setActiveConv({ ...existing, otherUsername: searchResult.username, otherDisplayName: searchResult.display_name || searchResult.username, otherAvatarUrl: searchResult.avatar_url || null, otherUserId: searchResult.user_id });
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
      setActiveConv({ ...newConv, otherUsername: searchResult.username, otherDisplayName: searchResult.display_name || searchResult.username, otherAvatarUrl: searchResult.avatar_url || null, otherUserId: searchResult.user_id });
      setShowNewChat(false);
      setSearchUser('');
      setSearchResult(null);
      loadConversations();
    }
    setLoading(false);
  };

  const sendMessage = async (type: string = 'text', fileUrl?: string, fileName?: string) => {
    const content = type === 'text' ? newMessage.trim() : (fileName || '');
    if (!content && type === 'text') return;
    if (!activeConv || !user) return;

    const replyToId = replyTo?.id || null;

    setNewMessage('');
    setReplyTo(null);
    resizeComposer();
    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
    typingChannelRef.current?.track({ typing: false });

    await supabase.from('messages').insert({
      conversation_id: activeConv.id,
      sender_id: user.id,
      content,
      message_type: type,
      file_url: fileUrl || null,
      file_name: fileName || null,
      reply_to_id: replyToId,
    });

    await supabase.from('conversations')
      .update({ updated_at: new Date().toISOString() })
      .eq('id', activeConv.id);

    if (type === 'text') focusComposer();
  };

  const deleteMessage = async (msgId: string) => {
    await supabase.from('messages').update({ deleted: true, content: '' }).eq('id', msgId);
  };

  const toggleReaction = async (messageId: string, emoji: string) => {
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
    setActionMenu(null);
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user || !activeConv) return;
    setUploading(true);

    const ext = file.name.split('.').pop();
    const path = `${user.id}/${activeConv.id}/${Date.now()}.${ext}`;

    const { error } = await supabase.storage.from('chat-files').upload(path, file);
    if (error) {
      setUploading(false);
      return;
    }

    const { data: signedData } = await supabase.storage.from('chat-files').createSignedUrl(path, 3600);
    const fileUrlResult = signedData?.signedUrl || '';
    const isImage = file.type.startsWith('image/');

    await sendMessage(isImage ? 'image' : 'file', fileUrlResult, file.name);
    setUploading(false);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const getReplyPreview = (replyId: string) => {
    const msg = messages.find(m => m.id === replyId);
    if (!msg) return null;
    if (msg.deleted) return isAr ? 'رسالة محذوفة' : 'Gelöschte Nachricht';
    if (msg.message_type === 'image') return '📷 ' + (isAr ? 'صورة' : 'Foto');
    if (msg.message_type === 'voice') return '🎤 ' + (isAr ? 'رسالة صوتية' : 'Sprachnachricht');
    if (msg.message_type === 'file') return '📎 ' + msg.file_name;
    return msg.content.length > 50 ? msg.content.slice(0, 50) + '…' : msg.content;
  };

  const deleteConversation = async () => {
    if (!activeConv || !user) return;
    await supabase.from('messages').delete().eq('conversation_id', activeConv.id);
    await supabase.from('conversations').delete().eq('id', activeConv.id);
    setActiveConv(null);
    setShowChatMenu(false);
    loadConversations();
  };

  // Voice recording functions
  const startRecording = async () => {
    try {
      // Stop any playing audio first
      if (audioRef.current) { audioRef.current.pause(); audioRef.current = null; setPlayingMsgId(null); }

      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
          sampleRate: 48000,
          channelCount: 1,
        }
      });
      
      const mimeType = MediaRecorder.isTypeSupported('audio/webm;codecs=opus')
        ? 'audio/webm;codecs=opus'
        : MediaRecorder.isTypeSupported('audio/webm')
          ? 'audio/webm'
          : MediaRecorder.isTypeSupported('audio/mp4')
            ? 'audio/mp4'
            : '';

      const options: MediaRecorderOptions = {
        ...(mimeType ? { mimeType } : {}),
        audioBitsPerSecond: 128000,
      };
      const mediaRecorder = new MediaRecorder(stream, options);
      recordingChunksRef.current = [];
      recordingCancelledRef.current = false;
      mediaRecorderRef.current = mediaRecorder;

      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) recordingChunksRef.current.push(e.data);
      };

      mediaRecorder.onstop = async () => {
        stream.getTracks().forEach(t => t.stop());
        if (recordingCancelledRef.current) return;
        const finalMime = mediaRecorder.mimeType || 'audio/webm';
        const ext = finalMime.includes('mp4') ? 'mp4' : 'webm';
        const blob = new Blob(recordingChunksRef.current, { type: finalMime });
        if (blob.size > 0 && activeConv && user) {
          const path = `${user.id}/${activeConv.id}/${Date.now()}.${ext}`;
          const { error } = await supabase.storage.from('chat-files').upload(path, blob);
          if (!error) {
            const { data: signedData } = await supabase.storage.from('chat-files').createSignedUrl(path, 3600);
            await sendMessage('voice', signedData?.signedUrl || '', `voice_${Date.now()}.${ext}`);
          }
        }
      };

      mediaRecorder.start(200);
      setIsRecording(true);
      setRecordingTime(0);
      recordingTimerRef.current = setInterval(() => {
        setRecordingTime(prev => prev + 1);
      }, 1000);
    } catch (err) {
      // silently fail
    }
  };

  const stopRecording = (cancel = false) => {
    recordingCancelledRef.current = cancel;
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop();
    }
    setIsRecording(false);
    if (recordingTimerRef.current) {
      clearInterval(recordingTimerRef.current);
      recordingTimerRef.current = null;
    }
    setRecordingTime(0);
  };

  // Voice playback
  const togglePlayback = useCallback((msgId: string, url: string) => {
    // If already playing this message, pause it
    if (playingMsgId === msgId && audioRef.current) {
      audioRef.current.pause();
      if (playbackRAF.current) cancelAnimationFrame(playbackRAF.current);
      setPlayingMsgId(null);
      return;
    }

    // Stop previous audio
    if (audioRef.current) {
      audioRef.current.pause();
      if (playbackRAF.current) cancelAnimationFrame(playbackRAF.current);
    }

    const audio = new Audio(url);
    audio.preload = 'auto';
    audioRef.current = audio;
    setPlayingMsgId(msgId);

    audio.onloadedmetadata = () => {
      if (isFinite(audio.duration)) {
        setPlaybackDurations(prev => ({ ...prev, [msgId]: audio.duration }));
      }
    };

    const updateProgress = () => {
      if (audio.currentTime && audio.duration) {
        setPlaybackProgress(prev => ({ ...prev, [msgId]: audio.currentTime / audio.duration }));
      }
      if (!audio.paused) {
        playbackRAF.current = requestAnimationFrame(updateProgress);
      }
    };

    audio.onplay = () => { playbackRAF.current = requestAnimationFrame(updateProgress); };

    audio.onended = () => {
      setPlayingMsgId(null);
      setPlaybackProgress(prev => ({ ...prev, [msgId]: 0 }));
      if (playbackRAF.current) cancelAnimationFrame(playbackRAF.current);
    };

    audio.play().catch(() => setPlayingMsgId(null));
  }, [playingMsgId]);

  const formatRecordingTime = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}:${s.toString().padStart(2, '0')}`;
  };

  const openActionMenu = (msg: Message, isMine: boolean, e: React.MouseEvent | React.TouchEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (msg.deleted) return;
    const target = (e.currentTarget as HTMLElement);
    const rect = target.getBoundingClientRect();
    const containerRect = messagesContainerRef.current?.getBoundingClientRect() || { top: 0, bottom: window.innerHeight, height: window.innerHeight };
    setActionMenu({
      msg,
      isMine,
      rect: { top: rect.top, bottom: rect.bottom, left: rect.left, right: rect.right, width: rect.width, height: rect.height },
      containerRect: { top: containerRect.top, bottom: containerRect.bottom, height: containerRect.height },
    });
  };

  const copyMessage = (content: string) => {
    navigator.clipboard.writeText(content).catch(() => {});
    setActionMenu(null);
  };

  const BackIcon = isAr ? ChevronRight : ChevronLeft;

  const renderAvatar = (username?: string, avatarUrl?: string | null, size: string = 'h-12 w-12') => {
    const isEmoji = avatarUrl ? isEmojiAvatarValue(avatarUrl) : false;
    const hasImage = avatarUrl && avatarUrl.startsWith('http');
    const defaultSrc = getDefaultAvatarForUser(username || '?');
    return (
      <Avatar className={cn(size, 'shrink-0')}>
        {hasImage ? (
          <AvatarImage src={avatarUrl} alt={username} className="object-cover" />
        ) : isEmoji ? (
          <AvatarImage src={getAppleEmojiUrl(avatarUrl!) || ''} alt={username} className="w-[60%] h-[60%] object-contain m-auto" />
        ) : (
          <img src={defaultSrc} alt={username || ''} className="w-full h-full object-cover" />
        )}
        <AvatarFallback className="bg-muted" />
      </Avatar>
    );
  };

  // Group consecutive same-sender messages
  const getMessageMeta = useCallback((idx: number) => {
    const msg = messages[idx];
    const prev = idx > 0 ? messages[idx - 1] : null;
    const next = idx < messages.length - 1 ? messages[idx + 1] : null;
    const sameSenderAsPrev = prev && prev.sender_id === msg.sender_id && !prev.deleted && (new Date(msg.created_at).getTime() - new Date(prev.created_at).getTime() < 120000);
    const sameSenderAsNext = next && next.sender_id === msg.sender_id && !next.deleted && (new Date(next.created_at).getTime() - new Date(msg.created_at).getTime() < 120000);
    const showDate = idx === 0 || new Date(msg.created_at).toDateString() !== new Date(messages[idx - 1].created_at).toDateString();
    
    return { sameSenderAsPrev: !!sameSenderAsPrev && !showDate, sameSenderAsNext: !!sameSenderAsNext, showDate };
  }, [messages]);

  if (!user) {
    return (
      <Sheet open={open} onOpenChange={onOpenChange}>
        <SheetContent side={isAr ? 'right' : 'left'} className="w-full sm:max-w-md p-0 [&>button[class*='absolute']]:hidden">
          <div className="flex items-center justify-center h-full">
            <p className="text-muted-foreground text-sm">
              {isAr ? 'يرجى تسجيل الدخول أولاً' : 'Bitte zuerst anmelden'}
            </p>
          </div>
        </SheetContent>
      </Sheet>
    );
  }

  return (
    <Sheet open={open} onOpenChange={(v) => { onOpenChange(v); if (!v) { setActiveConv(null); setShowNewChat(false); setShowChatMenu(false); setShowProfilePopup(false); } }}>
      <SheetContent side={isAr ? 'right' : 'left'} className="w-full sm:max-w-md p-0 flex flex-col bg-background [&>button[class*='absolute']]:hidden">
        <input
          type="file"
          ref={fileInputRef}
          className="hidden"
          accept="image/*,application/pdf,.doc,.docx,.txt,.zip"
          onChange={handleFileUpload}
        />

        {/* ─── Enhanced Profile Popup ─── */}
        <AnimatePresence>
          {showProfilePopup && activeConv && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 z-50 bg-background flex flex-col"
            >
              {/* Header */}
              <div className="flex items-center gap-3 px-4 pt-4 pb-3 border-b border-border/30">
                <button
                  onClick={() => { setShowProfilePopup(false); setProfileTab('info'); }}
                  className="w-9 h-9 rounded-xl bg-secondary/50 flex items-center justify-center active:scale-95 transition-transform"
                >
                  <BackIcon className="w-4.5 h-4.5 text-foreground stroke-[2]" />
                </button>
                <h2 className="text-[16px] font-bold">{isAr ? 'الملف الشخصي' : 'Profil'}</h2>
              </div>

              {/* Profile hero */}
              <div className="flex flex-col items-center pt-6 pb-4 px-6">
                <motion.div
                  initial={{ scale: 0.7 }}
                  animate={{ scale: 1 }}
                  transition={{ type: 'spring', damping: 20, stiffness: 300 }}
                >
                  {renderAvatar(activeConv.otherUsername, activeConv.otherAvatarUrl, 'h-24 w-24')}
                </motion.div>
                <h3 className="text-lg font-bold text-foreground mt-3">
                  {activeConv.otherDisplayName || activeConv.otherUsername}
                </h3>
                {activeConv.otherDisplayName && activeConv.otherDisplayName !== activeConv.otherUsername && (
                  <p className="text-[13px] text-muted-foreground">@{activeConv.otherUsername}</p>
                )}
                <p className={cn(
                  'text-[12px] mt-1 font-medium',
                  otherPresence.isOnline
                    ? 'text-green-500'
                    : 'text-muted-foreground/70'
                )}>
                  {otherPresence.text}
                </p>
              </div>

              {/* Tab switcher */}
              <div className="flex mx-4 bg-muted/30 rounded-xl p-1 gap-1">
                <button
                  onClick={() => setProfileTab('info')}
                  className={cn(
                    'flex-1 py-2 rounded-lg text-[13px] font-medium transition-all',
                    profileTab === 'info' ? 'bg-background text-foreground shadow-sm' : 'text-muted-foreground'
                  )}
                >
                  {isAr ? 'المعلومات' : 'Info'}
                </button>
                <button
                  onClick={() => {
                    setProfileTab('media');
                    // Load shared media
                    if (activeConv) {
                      supabase
                        .from('messages')
                        .select('*')
                        .eq('conversation_id', activeConv.id)
                        .in('message_type', ['image', 'file'])
                        .eq('deleted', false)
                        .order('created_at', { ascending: false })
                        .limit(50)
                        .then(({ data }) => setSharedMedia((data || []) as Message[]));
                    }
                  }}
                  className={cn(
                    'flex-1 py-2 rounded-lg text-[13px] font-medium transition-all',
                    profileTab === 'media' ? 'bg-background text-foreground shadow-sm' : 'text-muted-foreground'
                  )}
                >
                  {isAr ? 'الوسائط' : 'Medien'}
                </button>
              </div>

              {/* Tab content */}
              <div className="flex-1 overflow-y-auto mt-3 px-4 pb-6">
                {profileTab === 'info' ? (
                  <div className="space-y-3">

                    {/* Stats */}
                    <div className="bg-card border border-border/20 rounded-2xl p-4">
                      <div className="grid grid-cols-3 gap-3 text-center">
                        <div>
                          <p className="text-xl font-bold text-foreground">{messages.length}</p>
                          <p className="text-[10px] text-muted-foreground">{isAr ? 'رسالة' : 'Nachrichten'}</p>
                        </div>
                        <div>
                          <p className="text-xl font-bold text-foreground">
                            {messages.filter(m => m.message_type === 'image').length}
                          </p>
                          <p className="text-[10px] text-muted-foreground">{isAr ? 'صورة' : 'Fotos'}</p>
                        </div>
                        <div>
                          <p className="text-xl font-bold text-foreground">
                            {messages.filter(m => m.message_type === 'voice').length}
                          </p>
                          <p className="text-[10px] text-muted-foreground">{isAr ? 'صوتية' : 'Audio'}</p>
                        </div>
                      </div>
                    </div>

                    {/* Details */}
                    <div className="bg-card border border-border/20 rounded-2xl divide-y divide-border/10">
                      <div className="flex items-center gap-3 p-3.5">
                        <User2 className="w-4 h-4 text-muted-foreground shrink-0" />
                        <div className="min-w-0">
                          <p className="text-[11px] text-muted-foreground">{isAr ? 'النبذة' : 'Bio'}</p>
                          <p className="text-[13px] text-foreground font-medium">{activeConv.otherBio || (isAr ? 'لا توجد نبذة' : 'No bio')}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-3 p-3.5">
                        <Calendar className="w-4 h-4 text-muted-foreground shrink-0" />
                        <div className="min-w-0">
                          <p className="text-[11px] text-muted-foreground">{isAr ? 'تاريخ الانضمام' : 'Beigetreten'}</p>
                          <p className="text-[13px] text-foreground font-medium">
                            {activeConv.otherCreatedAt
                              ? new Date(activeConv.otherCreatedAt).toLocaleDateString(isAr ? 'ar' : 'de', { day: 'numeric', month: 'long', year: 'numeric' })
                              : '—'}
                          </p>
                        </div>
                      </div>
                    </div>

                    {/* Delete */}
                    <button
                      onClick={() => { deleteConversation(); setShowProfilePopup(false); setProfileTab('info'); }}
                      className="w-full flex items-center justify-center gap-2 py-3 rounded-2xl bg-destructive/10 text-destructive text-[13px] font-medium active:bg-destructive/20 transition-colors"
                    >
                      <Trash className="w-4 h-4" />
                      {isAr ? 'حذف المحادثة' : 'Chat löschen'}
                    </button>
                  </div>
                ) : (
                  /* Shared Media Grid */
                  <div>
                    {sharedMedia.length === 0 ? (
                      <div className="flex flex-col items-center justify-center py-16 text-muted-foreground gap-3">
                        <ImageIcon className="w-10 h-10 opacity-30" />
                        <p className="text-sm">{isAr ? 'لا توجد وسائط مشتركة' : 'Keine gemeinsamen Medien'}</p>
                      </div>
                    ) : (
                      <div className="grid grid-cols-3 gap-1 rounded-xl overflow-hidden">
                        {sharedMedia.map(m => (
                          m.message_type === 'image' ? (
                            <button
                              key={m.id}
                              onClick={() => window.open(getFileUrl(m), '_blank')}
                              className="aspect-square bg-muted/30 overflow-hidden hover:opacity-80 transition-opacity"
                            >
                              <img src={getFileUrl(m)} alt="" className="w-full h-full object-cover" />
                            </button>
                          ) : (
                            <div key={m.id} className="aspect-square bg-muted/20 flex flex-col items-center justify-center gap-1.5 p-2">
                              <FileText className="w-6 h-6 text-muted-foreground" />
                              <span className="text-[9px] text-muted-foreground truncate w-full text-center">{m.file_name}</span>
                            </div>
                          )
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {!activeConv && !showNewChat ? (
          // ─── Conversation List ───
          <>
            <SheetHeader className="px-4 pt-4 pb-3 border-b border-border/40">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <button
                    onClick={() => onOpenChange(false)}
                    className="w-9 h-9 rounded-xl bg-secondary/50 flex items-center justify-center active:scale-95 transition-transform"
                    aria-label={isAr ? 'رجوع' : 'Zurück'}
                  >
                    <BackIcon className="w-4.5 h-4.5 text-foreground stroke-[2]" />
                  </button>
                  <SheetTitle className="text-[17px] font-bold tracking-tight">
                    {isAr ? 'الرسائل' : 'Nachrichten'}
                  </SheetTitle>
                </div>
                <button
                  onClick={() => setShowNewChat(true)}
                  className="w-9 h-9 rounded-xl bg-primary/10 flex items-center justify-center active:scale-95 transition-all hover:bg-primary/20"
                  aria-label={isAr ? 'محادثة جديدة' : 'Neues Gespräch'}
                >
                  <Plus className="h-4.5 w-4.5 text-primary stroke-[2]" />
                </button>
              </div>
            </SheetHeader>
            <div className="flex-1 overflow-y-auto">
              {conversations.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full text-muted-foreground gap-4 px-8">
                  <div className="w-20 h-20 rounded-full bg-primary/5 flex items-center justify-center">
                    <MessageCircle className="h-9 w-9 text-primary/30" />
                  </div>
                  <div className="text-center space-y-1">
                    <p className="text-sm font-medium text-foreground/60">{isAr ? 'لا توجد محادثات بعد' : 'Noch keine Gespräche'}</p>
                    <p className="text-xs text-muted-foreground/60">{isAr ? 'ابدأ محادثة جديدة مع أصدقائك' : 'Starte ein neues Gespräch'}</p>
                  </div>
                  <Button variant="outline" size="sm" className="rounded-full mt-1" onClick={() => setShowNewChat(true)}>
                    <Plus className="w-3.5 h-3.5 me-1.5" />
                    {isAr ? 'محادثة جديدة' : 'Neues Gespräch'}
                  </Button>
                </div>
              ) : (
                conversations.map((conv, idx) => (
                  <motion.button
                    key={conv.id}
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: idx * 0.03 }}
                    onClick={() => setActiveConv(conv)}
                    className={cn(
                      'w-full flex items-center gap-3 px-4 py-3 hover:bg-accent/30 active:bg-accent/50 transition-all text-start',
                      (conv.unreadCount ?? 0) > 0 && 'bg-primary/[0.03]'
                    )}
                  >
                    <div className="relative">
                      {renderAvatar(conv.otherUsername, conv.otherAvatarUrl, 'h-[50px] w-[50px]')}
                      {(conv.unreadCount ?? 0) > 0 && (
                        <span className="absolute -top-0.5 -end-0.5 bg-primary text-primary-foreground text-[10px] rounded-full min-w-[18px] h-[18px] flex items-center justify-center px-1 font-bold">
                          {conv.unreadCount}
                        </span>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-baseline justify-between gap-2">
                        <span className={cn(
                          'text-[14.5px] text-foreground truncate',
                          (conv.unreadCount ?? 0) > 0 ? 'font-bold' : 'font-semibold'
                        )}>
                          {conv.otherDisplayName || conv.otherUsername}
                        </span>
                        <span className={cn(
                          'text-[11px] shrink-0 tabular-nums',
                          (conv.unreadCount ?? 0) > 0 ? 'text-primary font-semibold' : 'text-muted-foreground/50'
                        )}>
                          {conv.lastMessageTime && formatTime(conv.lastMessageTime, isAr)}
                        </span>
                      </div>
                      {conv.lastMessage && (
                        <p className={cn(
                          'text-[12.5px] truncate mt-0.5 leading-relaxed',
                          (conv.unreadCount ?? 0) > 0 ? 'text-foreground/70 font-medium' : 'text-muted-foreground/70'
                        )}>
                          {conv.lastMessage}
                        </p>
                      )}
                    </div>
                  </motion.button>
                ))
              )}
            </div>
          </>
        ) : showNewChat ? (
          // ─── New Chat Search ───
          <>
            <SheetHeader className="px-4 pt-4 pb-3 border-b border-border/40">
              <div className="flex items-center gap-3">
                <button
                  onClick={() => { setShowNewChat(false); setSearchResult(null); setSearchError(''); setSearchUser(''); }}
                  className="w-9 h-9 rounded-xl bg-secondary/50 flex items-center justify-center active:scale-95 transition-transform"
                  aria-label={isAr ? 'رجوع' : 'Zurück'}
                >
                  <BackIcon className="w-4.5 h-4.5 text-foreground stroke-[2]" />
                </button>
                <SheetTitle className="text-[17px] font-bold tracking-tight">
                  {isAr ? 'محادثة جديدة' : 'Neues Gespräch'}
                </SheetTitle>
              </div>
            </SheetHeader>
            <div className="p-4 space-y-4">
              <div className="flex gap-2">
                <Input
                  placeholder={isAr ? 'ابحث باسم المستخدم...' : 'Nach Benutzername suchen...'}
                  value={searchUser}
                  onChange={e => setSearchUser(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && searchForUser()}
                  className="flex-1 rounded-full"
                  dir="auto"
                />
                <Button size="icon" className="rounded-full" onClick={searchForUser} aria-label={isAr ? 'بحث' : 'Suchen'}>
                  <Search className="h-4 w-4" />
                </Button>
              </div>
              {searchError && <p className="text-destructive text-sm text-center">{searchError}</p>}
              {searchResult && (
                <motion.button
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  onClick={startConversation}
                  disabled={loading}
                  className="w-full flex items-center gap-3 p-4 rounded-2xl bg-accent/30 hover:bg-accent/50 transition-colors"
                >
                  {renderAvatar(searchResult.username, searchResult.avatar_url, 'h-14 w-14')}
                  <div className="text-start">
                    <span className="font-semibold text-sm block">{searchResult.display_name || searchResult.username}</span>
                    {searchResult.display_name && searchResult.display_name !== searchResult.username && (
                      <span className="text-xs text-muted-foreground">@{searchResult.username}</span>
                    )}
                  </div>
                </motion.button>
              )}
            </div>
          </>
        ) : (
          // ─── Active Chat ───
          <>
            {/* Chat Header */}
            <div className="sticky top-0 z-30 px-3 py-2.5 border-b border-border/40 flex items-center gap-2.5 bg-background/80 backdrop-blur-xl">
              <button
                onClick={() => { setActiveConv(null); setReplyTo(null); setShowChatMenu(false); loadConversations(); }}
                className="w-9 h-9 rounded-xl bg-secondary/50 flex items-center justify-center active:scale-95 transition-transform shrink-0"
                aria-label={isAr ? 'رجوع' : 'Zurück'}
              >
                <BackIcon className="w-4.5 h-4.5 text-foreground stroke-[2]" />
              </button>
              <button
                className="flex items-center gap-2.5 flex-1 min-w-0"
                onClick={() => setShowProfilePopup(true)}
              >
                {renderAvatar(activeConv?.otherUsername, activeConv?.otherAvatarUrl, 'h-9 w-9')}
                <div className="min-w-0 text-start">
                  <span className="font-semibold text-[14px] block truncate leading-tight">
                    {activeConv?.otherDisplayName || activeConv?.otherUsername}
                  </span>
                  <AnimatePresence mode="wait">
                    {typingUser ? (
                      <motion.div
                        key="typing"
                        initial={{ opacity: 0, y: 4 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: 4 }}
                        className="flex items-center gap-1.5"
                      >
                        <span className="text-[11px] text-primary font-medium leading-tight">
                          {isAr ? 'يكتب' : 'tippt'}
                        </span>
                        <TypingDots />
                      </motion.div>
                    ) : (
                      <motion.span
                        key="status"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        className={cn(
                          'text-[11px] leading-tight',
                          otherPresence.isOnline
                            ? 'text-green-500 font-medium'
                            : 'text-muted-foreground/60'
                        )}
                      >
                        {otherPresence.text}
                      </motion.span>
                    )}
                  </AnimatePresence>
                </div>
              </button>
              <div className="relative">
                <button
                  onClick={() => setShowChatMenu(!showChatMenu)}
                  className="w-8 h-8 rounded-lg flex items-center justify-center hover:bg-accent/30 active:bg-accent/50 transition-colors"
                  aria-label={isAr ? 'خيارات' : 'Optionen'}
                >
                  <MoreVertical className="h-4 w-4 text-muted-foreground" />
                </button>
                <AnimatePresence>
                  {showChatMenu && (
                    <motion.div
                      initial={{ opacity: 0, scale: 0.9, y: -4 }}
                      animate={{ opacity: 1, scale: 1, y: 0 }}
                      exit={{ opacity: 0, scale: 0.9 }}
                      className={cn(
                        'absolute top-full mt-1 bg-card border border-border/40 rounded-xl z-20 min-w-[170px] overflow-hidden',
                        isAr ? 'left-0' : 'right-0'
                      )}
                    >
                      <button
                        className="w-full flex items-center gap-3 px-4 py-2.5 hover:bg-accent/30 transition-colors text-[13px] text-start"
                        onClick={() => { setShowProfilePopup(true); setShowChatMenu(false); }}
                      >
                        <Info className="w-4 h-4 text-muted-foreground" />
                        {isAr ? 'معلومات المحادثة' : 'Chat-Info'}
                      </button>
                      <div className="h-px bg-border/20 mx-3" />
                      <button
                        className="w-full flex items-center gap-3 px-4 py-2.5 hover:bg-destructive/10 transition-colors text-[13px] text-destructive text-start"
                        onClick={deleteConversation}
                      >
                        <Trash className="w-4 h-4" />
                        {isAr ? 'حذف المحادثة' : 'Chat löschen'}
                      </button>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </div>

            {/* Messages */}
            <div
              ref={messagesContainerRef}
              className="flex-1 overflow-y-auto px-3 py-2"
              onScroll={handleScroll}
              onClick={() => { setShowChatMenu(false); setActionMenu(null); setShowExtraEmojis(false); }}
            >
              {messages.map((msg, idx) => {
                const isMine = msg.sender_id === user.id;
                const msgReactions = reactions.filter(r => r.message_id === msg.id);
                const { sameSenderAsPrev, sameSenderAsNext, showDate } = getMessageMeta(idx);

                return (
                  <React.Fragment key={msg.id}>
                    {showDate && (
                      <div className="flex justify-center py-3">
                        <span className="text-[10px] text-muted-foreground/50 bg-muted/30 px-3 py-1 rounded-full font-medium tracking-wide">
                          {new Date(msg.created_at).toLocaleDateString(isAr ? 'ar' : 'de', { day: 'numeric', month: 'long' })}
                        </span>
                      </div>
                    )}
                    <div
                      className={cn(
                        'flex relative',
                        isMine ? 'justify-end' : 'justify-start',
                        sameSenderAsPrev ? 'mt-[2px]' : 'mt-2.5'
                      )}
                    >
                      <SwipeableMessage
                        isMine={isMine}
                        deleted={msg.deleted}
                        onSwipeReply={() => {
                          setReplyTo(msg);
                          inputRef.current?.focus();
                        }}
                      >
                        <div
                          className={cn('relative group w-fit min-w-[80px] max-w-[75%]')}
                          onContextMenu={(e) => openActionMenu(msg, isMine, e)}
                          onClick={(e) => openActionMenu(msg, isMine, e)}
                        >
                          <div className={cn(
                            'overflow-hidden text-[14px] leading-relaxed',
                            msg.deleted
                              ? 'bg-muted/30 text-muted-foreground/50 italic rounded-[18px]'
                              : isMine
                                ? 'bg-primary text-primary-foreground rounded-[18px] rounded-br-[4px]'
                                : 'bg-card border border-border/30 text-foreground rounded-[18px] rounded-bl-[4px]'
                          )}>
                            {msg.reply_to_id && !msg.deleted && (() => {
                              const repliedMsg = messages.find(m => m.id === msg.reply_to_id);
                              const replySenderName = repliedMsg?.sender_id === user.id
                                ? (isAr ? 'أنت' : 'Du')
                                : (activeConv?.otherDisplayName || activeConv?.otherUsername || '');
                              return (
                                <div className={cn(
                                  'mx-2 mt-2 rounded-xl border-s-2 px-3 py-2',
                                  isMine
                                    ? 'bg-primary-foreground/10 border-primary-foreground/60'
                                    : 'bg-muted/40 border-primary/70'
                                )}>
                                  <span className={cn(
                                    'mb-1 block text-[12px] font-semibold leading-none',
                                    isMine ? 'text-primary-foreground/85' : 'text-primary'
                                  )}>
                                    {replySenderName}
                                  </span>
                                  <span className={cn(
                                    'block text-[13px] leading-[1.35] line-clamp-2',
                                    isMine ? 'text-primary-foreground/65' : 'text-muted-foreground'
                                  )} dir="auto">
                                    {getReplyPreview(msg.reply_to_id)}
                                  </span>
                                </div>
                              );
                            })()}

                            {msg.deleted ? (
                              <p className="px-3 py-2 text-xs">{isAr ? '🚫 تم حذف هذه الرسالة' : '🚫 Diese Nachricht wurde gelöscht'}</p>
                            ) : msg.message_type === 'image' ? (
                              <div>
                                <img
                                  src={getFileUrl(msg)}
                                  alt={msg.file_name || 'image'}
                                  className="max-w-full max-h-60 object-cover cursor-pointer"
                                  onClick={(e) => { e.stopPropagation(); window.open(getFileUrl(msg), '_blank'); }}
                                />
                                <div className="px-3 py-2">
                                  {msg.content && msg.content !== msg.file_name && (
                                    <p className="break-words whitespace-pre-wrap text-[14px] leading-[1.45] [overflow-wrap:anywhere] [unicode-bidi:plaintext]" dir="auto">
                                      {msg.content}
                                    </p>
                                  )}
                                  <div className={cn(
                                    'mt-1 flex items-center justify-end gap-[3px] pt-1 text-[11px] leading-none',
                                    isMine ? 'text-primary-foreground/50' : 'text-foreground/40'
                                  )} dir="ltr">
                                    <span>{new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                                    {isMine && (msg.read ? <CheckCheck className="h-[11px] w-[11px]" /> : <Check className="h-[11px] w-[11px]" />)}
                                  </div>
                                </div>
                              </div>
                            ) : msg.message_type === 'voice' ? (
                              (() => {
                                const isPlaying = playingMsgId === msg.id;
                                const progress = playbackProgress[msg.id] || 0;
                                const duration = playbackDurations[msg.id] || 0;
                                const formatDur = (s: number) => {
                                  if (!s || !isFinite(s)) return '0:00';
                                  const m = Math.floor(s / 60);
                                  const sec = Math.floor(s % 60);
                                  return `${m}:${sec.toString().padStart(2, '0')}`;
                                };
                                // Generate stable waveform bars based on message id
                                const seed = msg.id.split('').reduce((a: number, c: string) => a + c.charCodeAt(0), 0);
                                const bars = Array.from({ length: 28 }, (_, i) => {
                                  const h = ((Math.sin(seed * (i + 1) * 0.7) + 1) / 2) * 14 + 3;
                                  return h;
                                });

                                return (
                                  <div className="min-w-[220px] px-3 py-2.5">
                                    <div className="flex items-center gap-3">
                                      <button
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          togglePlayback(msg.id, getFileUrl(msg));
                                        }}
                                        className={cn(
                                          'flex h-10 w-10 shrink-0 items-center justify-center rounded-full transition-colors active:scale-90',
                                          isMine ? 'bg-primary-foreground/20 hover:bg-primary-foreground/30' : 'bg-primary/15 hover:bg-primary/25'
                                        )}
                                      >
                                        {isPlaying ? (
                                          <svg viewBox="0 0 24 24" className={cn('h-5 w-5', isMine ? 'text-primary-foreground' : 'text-primary')} fill="currentColor">
                                            <rect x="6" y="4" width="4" height="16" rx="1" />
                                            <rect x="14" y="4" width="4" height="16" rx="1" />
                                          </svg>
                                        ) : (
                                          <svg viewBox="0 0 24 24" className={cn('h-5 w-5 ms-0.5', isMine ? 'text-primary-foreground' : 'text-primary')} fill="currentColor">
                                            <path d="M8 5v14l11-7z" />
                                          </svg>
                                        )}
                                      </button>
                                      <div className="flex-1 flex flex-col gap-1.5">
                                        {/* Waveform with progress overlay */}
                                        <div className="flex items-center gap-[2px] h-[20px]" dir="ltr">
                                          {bars.map((h, i) => {
                                            const barProgress = i / bars.length;
                                            const isActive = barProgress < progress;
                                            return (
                                              <div
                                                key={i}
                                                className={cn(
                                                  'w-[3px] rounded-full transition-colors duration-150',
                                                  isActive
                                                    ? (isMine ? 'bg-primary-foreground/80' : 'bg-primary/80')
                                                    : (isMine ? 'bg-primary-foreground/25' : 'bg-primary/25')
                                                )}
                                                style={{ height: `${h}px` }}
                                              />
                                            );
                                          })}
                                        </div>
                                        {/* Duration */}
                                        <div className="flex items-center justify-between" dir="ltr">
                                          <span className={cn(
                                            'text-[10px] tabular-nums',
                                            isMine ? 'text-primary-foreground/45' : 'text-foreground/35'
                                          )}>
                                            {isPlaying && duration ? formatDur(progress * duration) : (duration ? formatDur(duration) : '')}
                                          </span>
                                          <span className={cn(
                                            'flex items-center gap-[3px] text-[11px] leading-none',
                                            isMine ? 'text-primary-foreground/50' : 'text-foreground/40'
                                          )}>
                                            {new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                            {isMine && (msg.read ? <CheckCheck className="h-[11px] w-[11px]" /> : <Check className="h-[11px] w-[11px]" />)}
                                          </span>
                                        </div>
                                      </div>
                                    </div>
                                  </div>
                                );
                              })()
                            ) : msg.message_type === 'file' ? (
                              <div className="px-3 py-2">
                                <a
                                  href={getFileUrl(msg)}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className={cn('flex items-center gap-2', isMine ? 'text-primary-foreground' : 'text-foreground')}
                                  onClick={e => e.stopPropagation()}
                                >
                                  <FileText className="h-5 w-5 shrink-0" />
                                  <span className="flex-1 truncate text-[13px]">{msg.file_name}</span>
                                  <Download className="h-4 w-4 shrink-0 opacity-60" />
                                </a>
                                <div className={cn(
                                  'mt-1 flex items-center justify-end gap-[3px] pt-1 text-[11px] leading-none',
                                  isMine ? 'text-primary-foreground/50' : 'text-foreground/40'
                                )} dir="ltr">
                                  <span>{new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                                  {isMine && (msg.read ? <CheckCheck className="h-[11px] w-[11px]" /> : <Check className="h-[11px] w-[11px]" />)}
                                </div>
                              </div>
                            ) : (
                              <div className="px-[10px] py-[6px]">
                                <p
                                  className="break-words whitespace-pre-wrap text-[14.5px] leading-[1.55] [word-break:normal] [unicode-bidi:plaintext]"
                                  dir="auto"
                                >
                                  <span>{msg.content}</span>
                                  {!msg.deleted && (
                                    <>
                                      <span aria-hidden="true" className="inline-block w-1.5" />
                                      <span
                                        className={cn(
                                          'inline-flex translate-y-[1px] items-center gap-[3px] align-bottom whitespace-nowrap text-[11px] leading-none select-none',
                                          isMine ? 'text-primary-foreground/50' : 'text-foreground/40'
                                        )}
                                        dir="ltr"
                                      >
                                        <span>{new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                                        {isMine && (msg.read ? <CheckCheck className="h-[11px] w-[11px]" /> : <Check className="h-[11px] w-[11px]" />)}
                                      </span>
                                    </>
                                  )}
                                </p>
                              </div>
                            )}
                          </div>

                        {/* Reactions */}
                        {msgReactions.length > 0 && (
                          <div className={cn('flex gap-0.5 -mt-1 flex-wrap relative z-[1]', isMine ? 'justify-end pe-1' : 'justify-start ps-1')} dir="ltr">
                            {Object.entries(
                              msgReactions.reduce((acc, r) => {
                                acc[r.emoji] = (acc[r.emoji] || 0) + 1;
                                return acc;
                              }, {} as Record<string, number>)
                            ).map(([emoji, count]) => (
                              <button
                                key={emoji}
                                onClick={(e) => { e.stopPropagation(); toggleReaction(msg.id, emoji); }}
                                className="inline-flex items-center gap-0.5 bg-card/80 border border-border/20 rounded-full px-1 py-0.5 hover:scale-110 active:scale-90 transition-transform"
                                aria-label={`${emoji} reaction`}
                              >
                                <span className="text-[14px] leading-none">{emoji}</span>
                                {count > 1 && <span className="text-[9px] text-muted-foreground font-medium">{count}</span>}
                              </button>
                            ))}
                          </div>
                        )}
                      </div>
                      </SwipeableMessage>
                    </div>
                  </React.Fragment>
                );
              })}

              {/* Typing indicator bubble */}
              <AnimatePresence>
                {typingUser && (
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: 10 }}
                    className="flex justify-start mt-2"
                  >
                    <div className="bg-card border border-border/30 rounded-2xl rounded-bl-md px-4 py-2.5">
                      <TypingDots />
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
              <div ref={messagesEndRef} />
            </div>

            {/* Scroll to bottom FAB */}
            <AnimatePresence>
              {showScrollDown && (
                <motion.button
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.8 }}
                  transition={{ type: 'spring', damping: 20, stiffness: 400 }}
                  onClick={() => scrollToBottom()}
                  className="absolute bottom-24 end-4 z-10 w-9 h-9 rounded-full bg-card border border-border/40 flex items-center justify-center active:scale-90 transition-transform"
                >
                  <ArrowDown className="w-4 h-4 text-muted-foreground" />
                </motion.button>
              )}
            </AnimatePresence>

            {/* ─── Action Menu Overlay ─── */}
            <AnimatePresence>
              {actionMenu && (() => {
                const spaceAbove = actionMenu.rect.top - actionMenu.containerRect.top;
                const showAbove = spaceAbove > 180;
                const viewportPadding = 12;
                const menuWidth = Math.min(Math.max(actionMenu.rect.width, 260), window.innerWidth - viewportPadding * 2);
                const anchoredLeft = actionMenu.isMine
                  ? actionMenu.rect.right - menuWidth
                  : actionMenu.rect.left;
                const menuLeft = Math.min(
                  Math.max(anchoredLeft, viewportPadding),
                  window.innerWidth - menuWidth - viewportPadding,
                );
                const previewWidth = Math.min(actionMenu.rect.width, menuWidth);

                return (
                  <>
                    <motion.div
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      transition={{ duration: 0.15 }}
                      className="fixed inset-0 z-[60] bg-black/50 backdrop-blur-xl"
                      onClick={() => { setActionMenu(null); setShowExtraEmojis(false); }}
                    />

                    <div
                      className="fixed inset-0 z-[61] pointer-events-none"
                      onClick={() => { setActionMenu(null); setShowExtraEmojis(false); }}
                    >
                      <motion.div
                        initial={{ opacity: 0, scale: 0.92 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.92 }}
                        transition={{ type: 'spring', damping: 28, stiffness: 450 }}
                        className={cn(
                          "absolute pointer-events-auto flex flex-col",
                          showAbove ? "flex-col-reverse" : "flex-col",
                          actionMenu.isMine ? 'items-end' : 'items-start'
                        )}
                        style={{
                          top: showAbove ? undefined : `${actionMenu.rect.top}px`,
                          bottom: showAbove ? `${window.innerHeight - actionMenu.rect.top + 4}px` : undefined,
                          left: `${menuLeft}px`,
                          width: `${menuWidth}px`,
                          maxWidth: `${menuWidth}px`,
                        }}
                        onClick={e => e.stopPropagation()}
                      >
                        {/* Selected message preview */}
                        <div className={cn(
                          'rounded-2xl text-[14px] overflow-hidden',
                          actionMenu.isMine
                            ? 'bg-primary text-primary-foreground rounded-br-md'
                            : 'bg-card border border-border/30 text-foreground rounded-bl-md'
                        )} style={{ width: `${previewWidth}px`, maxWidth: '100%' }}>
                          {actionMenu.msg.message_type === 'text' && (
                            <div className="relative px-2 py-[3px]" style={{ minHeight: '24px' }}>
                              <span className="break-words whitespace-pre-wrap" dir="auto">
                                {actionMenu.msg.content}
                                <span className="inline-block align-bottom" style={{ width: actionMenu.isMine ? '62px' : '46px', height: '1px' }} />
                              </span>
                              <span className={cn(
                                'absolute bottom-[3px] flex items-center gap-[3px] text-[10px] whitespace-nowrap',
                                actionMenu.isMine ? 'text-primary-foreground/50' : 'text-muted-foreground/50',
                                isAr ? 'left-2' : 'right-2'
                              )}>
                                {new Date(actionMenu.msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                {actionMenu.isMine && (actionMenu.msg.read ? <CheckCheck className="h-[11px] w-[11px]" /> : <Check className="h-[11px] w-[11px]" />)}
                              </span>
                            </div>
                          )}
                          {actionMenu.msg.message_type === 'image' && (
                            <img src={getFileUrl(actionMenu.msg)} alt="" className="max-w-full max-h-40 object-cover" />
                          )}
                        </div>

                        {/* Unified toolbar */}
                        <div className={cn(
                          "bg-card/95 backdrop-blur-md border border-border/30 rounded-2xl overflow-hidden",
                          showAbove ? "mb-1.5" : "mt-1.5"
                        )}>
                          {/* Emoji row */}
                          <div className="flex items-center justify-center gap-0.5 px-2.5 py-2" dir="ltr">
                            {QUICK_EMOJIS.map(emoji => (
                              <button
                                key={emoji}
                                onClick={() => { toggleReaction(actionMenu.msg.id, emoji); setShowExtraEmojis(false); }}
                                className="text-[20px] hover:scale-125 active:scale-90 transition-transform px-[3px]"
                                aria-label={`React with ${emoji}`}
                              >
                                {emoji}
                              </button>
                            ))}
                            <button
                              onClick={() => setShowExtraEmojis(!showExtraEmojis)}
                              className={cn(
                                "w-7 h-7 rounded-full flex items-center justify-center transition-all ms-1",
                                showExtraEmojis ? "bg-primary text-primary-foreground" : "bg-muted/40 text-muted-foreground"
                              )}
                              aria-label="More emojis"
                            >
                              <ChevronDown className={cn("w-3.5 h-3.5 transition-transform duration-200", showExtraEmojis && "rotate-180")} />
                            </button>
                          </div>

                          {/* Dropdown emojis */}
                          <AnimatePresence>
                            {showExtraEmojis && (
                              <motion.div
                                initial={{ height: 0 }}
                                animate={{ height: 'auto' }}
                                exit={{ height: 0 }}
                                transition={{ duration: 0.2 }}
                                className="overflow-hidden"
                              >
                                <div className="h-px bg-border/20 mx-2.5" />
                                <div className="grid grid-cols-8 gap-0 px-2 py-2 max-h-[150px] overflow-y-auto" dir="ltr">
                                  {EXTRA_EMOJIS.map(emoji => (
                                    <button
                                      key={emoji}
                                      onClick={() => { toggleReaction(actionMenu.msg.id, emoji); setShowExtraEmojis(false); }}
                                      className="text-[19px] hover:scale-110 active:scale-90 transition-transform p-1 rounded-lg hover:bg-accent/20 flex items-center justify-center"
                                      aria-label={`React with ${emoji}`}
                                    >
                                      {emoji}
                                    </button>
                                  ))}
                                </div>
                              </motion.div>
                            )}
                          </AnimatePresence>

                          <div className="h-px bg-border/20 mx-2.5" />

                          {/* Action icons */}
                          <div className="flex items-center justify-center gap-0.5 px-2 py-1.5 flex-wrap">
                            <button
                              onClick={() => { setReplyTo(actionMenu.msg); setActionMenu(null); setShowExtraEmojis(false); inputRef.current?.focus(); }}
                              className="flex items-center gap-1.5 px-3 py-2 rounded-xl hover:bg-accent/30 active:bg-accent/50 transition-colors"
                              aria-label={isAr ? 'رد' : 'Reply'}
                            >
                              <Reply className="w-3.5 h-3.5 text-muted-foreground" />
                              <span className="text-[11px] text-muted-foreground font-medium">{isAr ? 'رد' : 'Rply'}</span>
                            </button>
                            {actionMenu.msg.message_type === 'text' && actionMenu.msg.content && (
                              <button
                                onClick={() => { copyMessage(actionMenu.msg.content); setShowExtraEmojis(false); }}
                                className="flex items-center gap-1.5 px-3 py-2 rounded-xl hover:bg-accent/30 active:bg-accent/50 transition-colors"
                                aria-label={isAr ? 'نسخ' : 'Copy'}
                              >
                                <Copy className="w-3.5 h-3.5 text-muted-foreground" />
                                <span className="text-[11px] text-muted-foreground font-medium">{isAr ? 'نسخ' : 'Copy'}</span>
                              </button>
                            )}
                            <button
                              onClick={() => { setActionMenu(null); setShowExtraEmojis(false); }}
                              className="flex items-center gap-1.5 px-3 py-2 rounded-xl hover:bg-accent/30 active:bg-accent/50 transition-colors"
                              aria-label={isAr ? 'تثبيت' : 'Pin'}
                            >
                              <Pin className="w-3.5 h-3.5 text-muted-foreground" />
                              <span className="text-[11px] text-muted-foreground font-medium">{isAr ? 'تثبيت' : 'Pin'}</span>
                            </button>
                            {actionMenu.isMine && !actionMenu.msg.deleted && (
                              <button
                                onClick={() => { deleteMessage(actionMenu.msg.id); setActionMenu(null); setShowExtraEmojis(false); }}
                                className="flex items-center gap-1.5 px-3 py-2 rounded-xl hover:bg-destructive/10 active:bg-destructive/20 transition-colors"
                                aria-label={isAr ? 'حذف' : 'Delete'}
                              >
                                <Trash2 className="w-3.5 h-3.5 text-destructive" />
                                <span className="text-[11px] text-destructive font-medium">{isAr ? 'حذف' : 'Del'}</span>
                              </button>
                            )}
                          </div>
                        </div>
                      </motion.div>
                    </div>
                  </>
                );
              })()}
            </AnimatePresence>

            {/* Input area */}
            <div className="border-t border-border/30 bg-background pb-[env(safe-area-inset-bottom)]">
              {/* Reply preview */}
              <AnimatePresence>
                {replyTo && !isRecording && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    className="overflow-hidden"
                  >
                    <div className="mx-3 mt-2 rounded-xl bg-accent/30 border border-border/20 overflow-hidden">
                      <div className="flex items-start gap-2 p-2.5">
                        <div className="flex-1 min-w-0 border-s-[3px] border-primary ps-2.5">
                          <span className="text-[11px] font-semibold text-primary block">
                            {replyTo.sender_id === user.id
                              ? (isAr ? 'أنت' : 'Du')
                              : (activeConv?.otherDisplayName || activeConv?.otherUsername || '')}
                          </span>
                          <p className="text-[11px] text-muted-foreground truncate" dir="auto">
                            {replyTo.message_type === 'image' ? '📷 ' + (isAr ? 'صورة' : 'Foto') : replyTo.content}
                          </p>
                        </div>
                        <button
                          onClick={() => setReplyTo(null)}
                          className="shrink-0 w-6 h-6 rounded-full flex items-center justify-center hover:bg-muted/60 transition-colors"
                        >
                          <X className="w-3.5 h-3.5 text-muted-foreground" />
                        </button>
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              <AnimatePresence mode="wait">
                {isRecording ? (
                  <motion.div
                    key="recording"
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: 10 }}
                    transition={{ type: 'spring', damping: 25, stiffness: 400 }}
                    className="p-2 flex items-center gap-2"
                  >
                    <button
                      onClick={() => stopRecording(true)}
                      className="shrink-0 w-9 h-9 rounded-full flex items-center justify-center bg-destructive/10 hover:bg-destructive/20 active:scale-90 transition-all"
                    >
                      <Trash2 className="w-4 h-4 text-destructive" />
                    </button>

                    <div className="flex-1 flex items-center gap-3 bg-accent/20 border border-border/20 rounded-full px-4 h-9">
                      <motion.div
                        animate={{ opacity: [1, 0.3, 1] }}
                        transition={{ duration: 1.2, repeat: Infinity }}
                        className="w-2.5 h-2.5 rounded-full bg-destructive shrink-0"
                      />
                      <span className="text-sm font-mono text-foreground tabular-nums">
                        {formatRecordingTime(recordingTime)}
                      </span>
                      <div className="flex-1 flex items-center justify-center gap-[2px]" dir="ltr">
                        {Array.from({ length: 20 }).map((_, i) => (
                          <motion.div
                            key={i}
                            animate={{
                              height: [3, Math.random() * 14 + 4, 3],
                            }}
                            transition={{
                              duration: 0.5 + Math.random() * 0.3,
                              repeat: Infinity,
                              delay: i * 0.05,
                            }}
                            className="w-[2px] bg-primary/60 rounded-full"
                            style={{ minHeight: 3 }}
                          />
                        ))}
                      </div>
                    </div>

                    <motion.button
                      onClick={() => stopRecording(false)}
                      className="shrink-0 w-10 h-10 rounded-full bg-primary flex items-center justify-center"
                      whileTap={{ scale: 0.85 }}
                      animate={{ scale: [1, 1.08, 1] }}
                      transition={{ duration: 1.5, repeat: Infinity }}
                    >
                      <Send className="w-4 h-4 text-primary-foreground" />
                    </motion.button>
                  </motion.div>
                ) : (
                  <motion.div
                    key="input"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="p-2 flex items-end gap-1.5"
                  >
                    <button
                      type="button"
                      onPointerDown={(e) => e.preventDefault()}
                      onClick={() => fileInputRef.current?.click()}
                      disabled={uploading}
                      className="shrink-0 w-9 h-9 rounded-full flex items-center justify-center hover:bg-accent/30 active:bg-accent/50 transition-colors self-end"
                    >
                      {uploading ? (
                        <div className="w-4 h-4 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
                      ) : (
                        <Paperclip className="h-[18px] w-[18px] text-muted-foreground" />
                      )}
                    </button>

                    <div className="flex-1 flex items-end bg-accent/20 border border-border/25 rounded-[22px] overflow-hidden">
                      <Textarea
                        ref={inputRef}
                        placeholder={isAr ? 'اكتب رسالة...' : 'Nachricht...'}
                        value={newMessage}
                        rows={1}
                        name="chat-message"
                        autoComplete="off"
                        autoCorrect="on"
                        autoCapitalize="sentences"
                        spellCheck
                        enterKeyHint="send"
                        inputMode="text"
                        data-form-type="other"
                        onChange={e => {
                          setNewMessage(e.target.value);
                          resizeComposer(e.currentTarget);
                          if (e.target.value.trim()) broadcastTyping();
                        }}
                        onFocus={() => {
                          resizeComposer();
                          setTimeout(scrollToBottom, 120);
                        }}
                        onKeyDown={e => {
                          if (e.key === 'Enter' && !e.shiftKey && !e.nativeEvent.isComposing) {
                            e.preventDefault();
                            void sendMessage();
                          }
                        }}
                        dir="auto"
                        className="flex-1 border-0 bg-transparent focus-visible:ring-0 focus-visible:ring-offset-0 min-h-[38px] max-h-[120px] resize-none px-3 py-[9px] text-[15px] leading-relaxed placeholder:text-muted-foreground/50"
                      />
                    </div>

                    {newMessage.trim() ? (
                      <motion.div
                        initial={{ scale: 0.5, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        transition={{ type: 'spring', damping: 15, stiffness: 400 }}
                      >
                        <Button
                          size="icon"
                          className="rounded-full shrink-0 h-9 w-9"
                          type="button"
                          onPointerDown={(e) => e.preventDefault()}
                          onClick={() => sendMessage()}
                        >
                          <Send className="h-4 w-4" />
                        </Button>
                      </motion.div>
                    ) : (
                      <motion.button
                        type="button"
                        className="shrink-0 h-9 w-9 rounded-full bg-primary flex items-center justify-center text-primary-foreground"
                        whileTap={{ scale: 1.3 }}
                        onClick={startRecording}
                      >
                        <Mic className="h-4 w-4" />
                      </motion.button>
                    )}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </>
        )}
      </SheetContent>
    </Sheet>
  );
}
