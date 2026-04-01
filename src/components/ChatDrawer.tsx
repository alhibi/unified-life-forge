import React, { useState, useEffect, useRef, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useApp } from '@/contexts/AppContext';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
  ChevronRight, ChevronLeft, ChevronDown, Send, Search, Plus, MessageCircle,
  Check, CheckCheck, Reply, Trash2, Paperclip, X,
  Download, FileText, MoreVertical, Trash, Info, Copy, Pin, Mic, Smile
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { motion, AnimatePresence, useMotionValue, useTransform } from 'framer-motion';
import { EMOJI_AVATARS } from '@/utils/emojiAvatar';

interface Conversation {
  id: string;
  user1_id: string;
  user2_id: string;
  updated_at: string;
  otherUsername?: string;
  otherDisplayName?: string;
  otherAvatarUrl?: string;
  otherUserId?: string;
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
          // Prevent left drag entirely
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
  const typingChannelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);
  const [showProfilePopup, setShowProfilePopup] = useState(false);
  const [showChatMenu, setShowChatMenu] = useState(false);

  // Voice recording state
  const [isRecording, setIsRecording] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const recordingChunksRef = useRef<Blob[]>([]);
  const recordingTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const recordingStartXRef = useRef(0);
  const recordingCancelledRef = useRef(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const messagesContainerRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const typingTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
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
      .select('user_id, username, display_name, avatar_url')
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

      setTimeout(scrollToBottom, 100);
    }
  }, [activeConv, user, scrollToBottom]);

  useEffect(() => {
    if (open && user) loadConversations();
  }, [open, user, loadConversations]);

  useEffect(() => {
    if (activeConv) loadMessages();
  }, [activeConv, loadMessages]);

  // Realtime
  useEffect(() => {
    if (!user || !open) return;

    const channel = supabase
      .channel('chat-realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'messages' }, (payload) => {
        if (payload.eventType === 'INSERT') {
          const msg = payload.new as Message;
          if (activeConv && msg.conversation_id === activeConv.id) {
            setMessages(prev => [...prev, msg]);
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
        if (payload.eventType === 'INSERT') {
          setReactions(prev => [...prev, payload.new as Reaction]);
        } else if (payload.eventType === 'DELETE') {
          const old = payload.old as { id: string };
          setReactions(prev => prev.filter(r => r.id !== old.id));
        }
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [user, open, activeConv, scrollToBottom, loadConversations]);

  // Typing indicator - shared channel with presence
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

    channel.subscribe(async (status) => {
      if (status === 'SUBSCRIBED') {
        typingChannelRef.current = channel;
      }
    });

    return () => {
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
    }, 2000);
  }, []);

  // Polling
  useEffect(() => {
    if (!user) return;
    loadConversations();
    const interval = setInterval(loadConversations, 30000);
    return () => clearInterval(interval);
  }, [user, loadConversations]);

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

    setNewMessage('');
    setReplyTo(null);

    await supabase.from('messages').insert({
      conversation_id: activeConv.id,
      sender_id: user.id,
      content,
      message_type: type,
      file_url: fileUrl || null,
      file_name: fileName || null,
      reply_to_id: replyTo?.id || null,
    });

    await supabase.from('conversations')
      .update({ updated_at: new Date().toISOString() })
      .eq('id', activeConv.id);
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

    const { data: urlData } = supabase.storage.from('chat-files').getPublicUrl(path);
    const isImage = file.type.startsWith('image/');

    await sendMessage(isImage ? 'image' : 'file', urlData.publicUrl, file.name);
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
    // Delete all messages in conversation
    await supabase.from('messages').delete().eq('conversation_id', activeConv.id);
    await supabase.from('conversations').delete().eq('id', activeConv.id);
    setActiveConv(null);
    setShowChatMenu(false);
    loadConversations();
  };

  // Voice recording functions
  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      
      // Detect supported mimeType
      const mimeType = MediaRecorder.isTypeSupported('audio/webm;codecs=opus')
        ? 'audio/webm;codecs=opus'
        : MediaRecorder.isTypeSupported('audio/webm')
          ? 'audio/webm'
          : MediaRecorder.isTypeSupported('audio/mp4')
            ? 'audio/mp4'
            : '';

      const options: MediaRecorderOptions = mimeType ? { mimeType } : {};
      const mediaRecorder = new MediaRecorder(stream, options);
      recordingChunksRef.current = [];
      recordingCancelledRef.current = false;
      mediaRecorderRef.current = mediaRecorder;

      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) recordingChunksRef.current.push(e.data);
      };

      mediaRecorder.onstop = async () => {
        stream.getTracks().forEach(t => t.stop());
        if (recordingCancelledRef.current) {
          return;
        }
        const finalMime = mediaRecorder.mimeType || 'audio/webm';
        const ext = finalMime.includes('mp4') ? 'mp4' : 'webm';
        const blob = new Blob(recordingChunksRef.current, { type: finalMime });
        if (blob.size > 0 && activeConv && user) {
          const path = `${user.id}/${activeConv.id}/${Date.now()}.${ext}`;
          const { error } = await supabase.storage.from('chat-files').upload(path, blob);
          if (!error) {
            const { data: urlData } = supabase.storage.from('chat-files').getPublicUrl(path);
            await sendMessage('voice', urlData.publicUrl, `voice_${Date.now()}.${ext}`);
          }
        }
      };

      mediaRecorder.start(250);
      setIsRecording(true);
      setRecordingTime(0);
      recordingTimerRef.current = setInterval(() => {
        setRecordingTime(prev => prev + 1);
      }, 1000);
    } catch (err) {
      console.error('Microphone error:', err);
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
    const initial = (username || '?').charAt(0).toUpperCase();
    return (
      <Avatar className={cn(size, 'shrink-0')}>
        {avatarUrl ? (
          <AvatarImage src={avatarUrl} alt={username} className="object-cover" />
        ) : null}
        <AvatarFallback className="bg-primary/10 text-lg">
          {initial}
        </AvatarFallback>
      </Avatar>
    );
  };

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

        {/* ─── Profile Popup ─── */}
        <AnimatePresence>
          {showProfilePopup && activeConv && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 z-50 bg-background/95 backdrop-blur-sm flex flex-col"
              onClick={() => setShowProfilePopup(false)}
            >
              <motion.div
                initial={{ opacity: 0, y: 30 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 30 }}
                transition={{ type: 'spring', damping: 25, stiffness: 300 }}
                className="flex flex-col items-center justify-center flex-1 gap-5 px-6"
                onClick={e => e.stopPropagation()}
              >
                {/* Large avatar */}
                <motion.div
                  initial={{ scale: 0.5 }}
                  animate={{ scale: 1 }}
                  transition={{ type: 'spring', damping: 20, stiffness: 300 }}
                >
                  {renderAvatar(activeConv.otherUsername, activeConv.otherAvatarUrl, 'h-28 w-28')}
                </motion.div>

                <div className="text-center space-y-1">
                  <h2 className="text-xl font-bold text-foreground">
                    {activeConv.otherDisplayName || activeConv.otherUsername}
                  </h2>
                  {activeConv.otherDisplayName && activeConv.otherDisplayName !== activeConv.otherUsername && (
                    <p className="text-sm text-muted-foreground">@{activeConv.otherUsername}</p>
                  )}
                </div>

                {/* Stats */}
                <div className="flex gap-8 mt-2">
                  <div className="text-center">
                    <p className="text-2xl font-bold text-foreground">{messages.length}</p>
                    <p className="text-xs text-muted-foreground">{isAr ? 'رسالة' : 'Nachrichten'}</p>
                  </div>
                  <div className="text-center">
                    <p className="text-2xl font-bold text-foreground">
                      {messages.filter(m => m.message_type === 'image').length}
                    </p>
                    <p className="text-xs text-muted-foreground">{isAr ? 'صورة' : 'Fotos'}</p>
                  </div>
                </div>

                {/* Actions */}
                <div className="flex gap-3 mt-4">
                  <Button
                    variant="destructive"
                    size="sm"
                    className="rounded-full gap-2"
                    onClick={() => { deleteConversation(); setShowProfilePopup(false); }}
                  >
                    <Trash className="w-4 h-4" />
                    {isAr ? 'حذف المحادثة' : 'Chat löschen'}
                  </Button>
                </div>

                <Button
                  variant="ghost"
                  size="sm"
                  className="mt-4 rounded-full text-muted-foreground"
                  onClick={() => setShowProfilePopup(false)}
                >
                  {isAr ? 'إغلاق' : 'Schließen'}
                </Button>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

        {!activeConv && !showNewChat ? (
          // ─── Conversation List ───
          <>
            <SheetHeader className="p-4 border-b border-border/50 bg-card/50">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <button
                    onClick={() => onOpenChange(false)}
                    className="w-10 h-10 rounded-2xl bg-secondary/60 flex items-center justify-center active:scale-95 transition-transform"
                    aria-label={isAr ? 'رجوع' : 'Zurück'}
                  >
                    <BackIcon className="w-5 h-5 text-foreground stroke-[1.8]" />
                  </button>
                  <SheetTitle className="text-lg font-bold">
                    {isAr ? 'الرسائل' : 'Nachrichten'}
                  </SheetTitle>
                </div>
                <Button size="icon" variant="ghost" className="rounded-full" onClick={() => setShowNewChat(true)} aria-label={isAr ? 'محادثة جديدة' : 'Neues Gespräch'}>
                  <Plus className="h-5 w-5" />
                </Button>
              </div>
            </SheetHeader>
            <div className="flex-1 overflow-y-auto">
              {conversations.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full text-muted-foreground gap-3 px-6">
                  <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center">
                    <MessageCircle className="h-8 w-8 text-primary/50" />
                  </div>
                  <p className="text-sm">{isAr ? 'لا توجد محادثات بعد' : 'Noch keine Gespräche'}</p>
                  <Button variant="outline" size="sm" className="rounded-full" onClick={() => setShowNewChat(true)}>
                    {isAr ? 'ابدأ محادثة جديدة' : 'Neues Gespräch starten'}
                  </Button>
                </div>
              ) : (
                conversations.map(conv => (
                  <motion.button
                    key={conv.id}
                    initial={{ opacity: 0, x: isAr ? 20 : -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    onClick={() => setActiveConv(conv)}
                    className={cn(
                      'w-full flex items-center gap-3 p-3.5 hover:bg-accent/30 transition-all border-b border-border/10 text-start',
                      (conv.unreadCount ?? 0) > 0 && 'bg-primary/[0.03]'
                    )}
                  >
                    <div className="relative">
                      {renderAvatar(conv.otherUsername, conv.otherAvatarUrl, 'h-[52px] w-[52px]')}
                      {(conv.unreadCount ?? 0) > 0 && (
                        <span className="absolute -top-0.5 -end-0.5 bg-primary text-primary-foreground text-[10px] rounded-full min-w-[18px] h-[18px] flex items-center justify-center px-1 font-bold shadow-sm">
                          {conv.unreadCount}
                        </span>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <span className={cn(
                          'font-semibold text-[14px] text-foreground',
                          (conv.unreadCount ?? 0) > 0 && 'font-bold'
                        )}>
                          {conv.otherDisplayName || conv.otherUsername}
                        </span>
                        <span className={cn(
                          'text-[11px] shrink-0',
                          (conv.unreadCount ?? 0) > 0 ? 'text-primary font-medium' : 'text-muted-foreground/60'
                        )}>
                          {conv.lastMessageTime && formatTime(conv.lastMessageTime, isAr)}
                        </span>
                      </div>
                      {conv.lastMessage && (
                        <p className={cn(
                          'text-[12.5px] truncate mt-0.5',
                          (conv.unreadCount ?? 0) > 0 ? 'text-foreground/80 font-medium' : 'text-muted-foreground'
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
            <SheetHeader className="p-4 border-b border-border/50 bg-card/50">
              <div className="flex items-center gap-3">
                <button
                  onClick={() => { setShowNewChat(false); setSearchResult(null); setSearchError(''); setSearchUser(''); }}
                  className="w-10 h-10 rounded-2xl bg-secondary/60 flex items-center justify-center active:scale-95 transition-transform"
                  aria-label={isAr ? 'رجوع' : 'Zurück'}
                >
                  <BackIcon className="w-5 h-5 text-foreground stroke-[1.8]" />
                </button>
                <SheetTitle className="text-lg font-bold">
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
            <div className="p-3 border-b border-border/50 bg-card/50 flex items-center gap-3">
              <button
                onClick={() => { setActiveConv(null); setReplyTo(null); setShowChatMenu(false); loadConversations(); }}
                className="w-10 h-10 rounded-2xl bg-secondary/60 flex items-center justify-center active:scale-95 transition-transform shrink-0"
                aria-label={isAr ? 'رجوع' : 'Zurück'}
              >
                <BackIcon className="w-5 h-5 text-foreground stroke-[1.8]" />
              </button>
              <button
                className="flex items-center gap-3 flex-1 min-w-0"
                onClick={() => setShowProfilePopup(true)}
              >
                {renderAvatar(activeConv?.otherUsername, activeConv?.otherAvatarUrl, 'h-10 w-10')}
                <div className="min-w-0 text-start">
                  <span className="font-semibold text-sm block truncate">
                    {activeConv?.otherDisplayName || activeConv?.otherUsername}
                  </span>
                  <AnimatePresence mode="wait">
                    {typingUser ? (
                      <motion.span
                        key="typing"
                        initial={{ opacity: 0, y: 4 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: 4 }}
                        className="text-[11px] text-primary font-medium"
                      >
                        {isAr ? 'يكتب الآن...' : 'tippt...'}
                      </motion.span>
                    ) : (
                      <motion.span
                        key="username"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        className="text-[11px] text-muted-foreground"
                      >
                        @{activeConv?.otherUsername}
                      </motion.span>
                    )}
                  </AnimatePresence>
                </div>
              </button>
              <div className="relative">
                <Button
                  size="icon"
                  variant="ghost"
                  className="rounded-full shrink-0"
                  onClick={() => setShowChatMenu(!showChatMenu)}
                  aria-label={isAr ? 'خيارات' : 'Optionen'}
                >
                  <MoreVertical className="h-4 w-4" />
                </Button>
                <AnimatePresence>
                  {showChatMenu && (
                    <motion.div
                      initial={{ opacity: 0, scale: 0.9, y: -4 }}
                      animate={{ opacity: 1, scale: 1, y: 0 }}
                      exit={{ opacity: 0, scale: 0.9 }}
                      className={cn(
                        'absolute top-full mt-1 bg-card border border-border/50 rounded-xl shadow-xl z-20 min-w-[180px] overflow-hidden',
                        isAr ? 'left-0' : 'right-0'
                      )}
                    >
                      <button
                        className="w-full flex items-center gap-3 px-4 py-3 hover:bg-accent/30 transition-colors text-sm text-start"
                        onClick={() => { setShowProfilePopup(true); setShowChatMenu(false); }}
                      >
                        <Info className="w-4 h-4 text-muted-foreground" />
                        {isAr ? 'معلومات المحادثة' : 'Chat-Info'}
                      </button>
                      <button
                        className="w-full flex items-center gap-3 px-4 py-3 hover:bg-destructive/10 transition-colors text-sm text-destructive text-start"
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
            <div ref={messagesContainerRef} className="flex-1 overflow-y-auto p-3 space-y-0.5" onClick={() => { setShowChatMenu(false); setActionMenu(null); setShowExtraEmojis(false); }}>
              {messages.map((msg, idx) => {
                const isMine = msg.sender_id === user.id;
                const msgReactions = reactions.filter(r => r.message_id === msg.id);
                const showDate = idx === 0 || new Date(msg.created_at).toDateString() !== new Date(messages[idx - 1].created_at).toDateString();

                return (
                  <React.Fragment key={msg.id}>
                    {showDate && (
                      <div className="flex justify-center py-2">
                        <span className="text-[10px] text-muted-foreground/60 bg-card/60 px-3 py-1 rounded-full">
                          {new Date(msg.created_at).toLocaleDateString(isAr ? 'ar' : 'de', { day: 'numeric', month: 'short' })}
                        </span>
                      </div>
                    )}
                    <div
                      className={cn('flex relative', isMine ? 'justify-end' : 'justify-start')}
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
                          className={cn("relative max-w-[78%] group")}
                          onContextMenu={(e) => openActionMenu(msg, isMine, e)}
                          onClick={(e) => openActionMenu(msg, isMine, e)}
                        >
                        <div className={cn(
                          'rounded-2xl text-sm overflow-hidden',
                          msg.deleted
                            ? 'bg-muted/30 text-muted-foreground/50 italic'
                            : isMine
                              ? 'bg-primary text-primary-foreground rounded-br-md'
                              : 'bg-card border border-border/40 text-foreground rounded-bl-md'
                        )}>
                          {/* Telegram-style reply preview */}
                          {msg.reply_to_id && !msg.deleted && (() => {
                            const repliedMsg = messages.find(m => m.id === msg.reply_to_id);
                            const replySenderName = repliedMsg?.sender_id === user.id
                              ? (isAr ? 'أنت' : 'Du')
                              : (activeConv?.otherDisplayName || activeConv?.otherUsername || '');
                            return (
                              <div className={cn(
                                'mx-1.5 mt-1.5 px-2.5 py-1.5 rounded-lg border-s-[3px]',
                                isMine
                                  ? 'bg-primary-foreground/10 border-primary-foreground/50'
                                  : 'bg-muted/40 border-primary/60'
                              )}>
                                <span className={cn(
                                  'text-[11px] font-semibold block',
                                  isMine ? 'text-primary-foreground/80' : 'text-primary'
                                )}>
                                  {replySenderName}
                                </span>
                                <span className={cn(
                                  'text-[11px] line-clamp-1',
                                  isMine ? 'text-primary-foreground/60' : 'text-muted-foreground'
                                )}>
                                  {getReplyPreview(msg.reply_to_id)}
                                </span>
                              </div>
                            );
                          })()}

                          {msg.deleted ? (
                            <p className="text-xs px-3 py-2">{isAr ? '🚫 تم حذف هذه الرسالة' : '🚫 Diese Nachricht wurde gelöscht'}</p>
                          ) : msg.message_type === 'image' ? (
                            <div>
                              <img
                                src={msg.file_url!}
                                alt={msg.file_name || 'image'}
                                className="rounded-t-lg max-w-full max-h-60 object-cover cursor-pointer"
                                onClick={(e) => { e.stopPropagation(); window.open(msg.file_url!, '_blank'); }}
                              />
                              <div className="px-3 py-1.5 flex items-end justify-between gap-2">
                                {msg.content && msg.content !== msg.file_name ? (
                                  <p className="break-words whitespace-pre-wrap text-xs flex-1" dir="auto">{msg.content}</p>
                                ) : <span />}
                                <span className={cn('text-[10px] whitespace-nowrap flex items-center gap-0.5 shrink-0', isMine ? 'text-primary-foreground/50' : 'text-muted-foreground/60')}>
                                  {new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                  {isMine && (msg.read ? <CheckCheck className="h-3 w-3" /> : <Check className="h-3 w-3" />)}
                                </span>
                              </div>
                            </div>
                          ) : msg.message_type === 'voice' ? (
                            <div className="px-3 py-2 flex items-center gap-2 min-w-[180px]">
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  const audio = new Audio(msg.file_url!);
                                  audio.play();
                                }}
                                className={cn(
                                  'w-8 h-8 rounded-full flex items-center justify-center shrink-0',
                                  isMine ? 'bg-primary-foreground/20' : 'bg-primary/15'
                                )}
                              >
                                <svg viewBox="0 0 24 24" className={cn('w-4 h-4', isMine ? 'text-primary-foreground' : 'text-primary')} fill="currentColor">
                                  <path d="M8 5v14l11-7z" />
                                </svg>
                              </button>
                              <div className="flex-1 flex items-center gap-[1px]" dir="ltr">
                                {Array.from({ length: 24 }).map((_, i) => (
                                  <div
                                    key={i}
                                    className={cn(
                                      'w-[2px] rounded-full',
                                      isMine ? 'bg-primary-foreground/40' : 'bg-primary/40'
                                    )}
                                    style={{ height: `${Math.random() * 12 + 4}px` }}
                                  />
                                ))}
                              </div>
                              <span className={cn('text-[10px] whitespace-nowrap flex items-center gap-0.5 shrink-0', isMine ? 'text-primary-foreground/50' : 'text-muted-foreground/60')}>
                                {new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                {isMine && (msg.read ? <CheckCheck className="h-3 w-3" /> : <Check className="h-3 w-3" />)}
                              </span>
                            </div>
                          ) : msg.message_type === 'file' ? (
                            <div className="px-3 py-2">
                              <a
                                href={msg.file_url!}
                                target="_blank"
                                rel="noopener noreferrer"
                                className={cn('flex items-center gap-2', isMine ? 'text-primary-foreground' : 'text-foreground')}
                                onClick={e => e.stopPropagation()}
                              >
                                <FileText className="w-5 h-5 shrink-0" />
                                <span className="text-xs truncate flex-1">{msg.file_name}</span>
                                <Download className="w-4 h-4 shrink-0 opacity-60" />
                              </a>
                              <div className="flex justify-end mt-0.5">
                                <span className={cn('text-[10px] flex items-center gap-0.5', isMine ? 'text-primary-foreground/50' : 'text-muted-foreground/60')}>
                                  {new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                  {isMine && (msg.read ? <CheckCheck className="h-3 w-3" /> : <Check className="h-3 w-3" />)}
                                </span>
                              </div>
                            </div>
                          ) : (
                            <div className="px-3 py-1.5">
                              <span className="break-words whitespace-pre-wrap" dir="auto">
                                {msg.content}
                                {!msg.deleted && (
                                  <span className={cn(
                                    'inline-flex items-center gap-0.5 align-bottom text-[10px] whitespace-nowrap',
                                    isMine ? 'text-primary-foreground/50' : 'text-muted-foreground/50',
                                    isAr ? 'me-1 float-left ms-2' : 'ms-1 float-right me-0'
                                  )} style={{ marginTop: '4px' }}>
                                    {new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                    {isMine && (msg.read ? <CheckCheck className="h-3 w-3" /> : <Check className="h-3 w-3" />)}
                                  </span>
                                )}
                              </span>
                            </div>
                          )}
                        </div>

                        {/* Reactions */}
                        {msgReactions.length > 0 && (
                          <div className={cn('flex gap-0.5 mt-0.5 flex-wrap', isMine ? 'justify-end' : 'justify-start')} dir="ltr">
                            {Object.entries(
                              msgReactions.reduce((acc, r) => {
                                acc[r.emoji] = (acc[r.emoji] || 0) + 1;
                                return acc;
                              }, {} as Record<string, number>)
                            ).map(([emoji, count]) => (
                              <button
                                key={emoji}
                                onClick={(e) => { e.stopPropagation(); toggleReaction(msg.id, emoji); }}
                                className="inline-flex items-center gap-0.5 hover:scale-125 active:scale-90 transition-transform"
                                aria-label={`${emoji} reaction`}
                              >
                                <span className="text-[18px] leading-none">{emoji}</span>
                                {count > 1 && <span className="text-[10px] text-muted-foreground font-medium">{count}</span>}
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
              <div ref={messagesEndRef} />
            </div>

            {/* ─── Action Menu Overlay ─── */}
            <AnimatePresence>
              {actionMenu && (() => {
                const spaceAbove = actionMenu.rect.top - actionMenu.containerRect.top;
                const showAbove = spaceAbove > 180;

                return (
                  <>
                    <motion.div
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      transition={{ duration: 0.15 }}
                      className="fixed inset-0 z-[60] bg-black/60 backdrop-blur-lg"
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
                          showAbove ? "flex-col-reverse" : "flex-col"
                        )}
                        style={{
                          top: showAbove ? undefined : `${actionMenu.rect.top}px`,
                          bottom: showAbove ? `${window.innerHeight - actionMenu.rect.top + 4}px` : undefined,
                          ...(actionMenu.isMine ? { right: '12px' } : { left: '12px' }),
                          width: `${actionMenu.rect.width}px`,
                          maxWidth: '88vw',
                        }}
                        onClick={e => e.stopPropagation()}
                      >
                        {/* Selected message - same width as original */}
                        <div className={cn(
                          'rounded-2xl text-sm overflow-hidden shadow-2xl',
                          actionMenu.isMine
                            ? 'bg-primary text-primary-foreground rounded-br-md'
                            : 'bg-card border border-border/40 text-foreground rounded-bl-md'
                        )}>
                          {actionMenu.msg.message_type === 'text' && (
                            <div className="px-3 py-1.5">
                              <span className="break-words whitespace-pre-wrap text-[13.5px]" dir="auto">
                                {actionMenu.msg.content}
                                <span className={cn(
                                  'inline-flex items-center gap-0.5 align-bottom text-[10px] whitespace-nowrap',
                                  actionMenu.isMine ? 'text-primary-foreground/50' : 'text-muted-foreground/50',
                                  isAr ? 'me-1 float-left ms-2' : 'ms-1 float-right me-0'
                                )} style={{ marginTop: '4px' }}>
                                  {new Date(actionMenu.msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                  {actionMenu.isMine && (actionMenu.msg.read ? <CheckCheck className="h-3 w-3" /> : <Check className="h-3 w-3" />)}
                                </span>
                              </span>
                            </div>
                          )}
                          {actionMenu.msg.message_type === 'image' && (
                            <img src={actionMenu.msg.file_url!} alt="" className="max-w-full max-h-40 object-cover" />
                          )}
                        </div>

                        {/* Unified toolbar card */}
                        <div className={cn(
                          "bg-card/95 backdrop-blur-sm border border-border/30 rounded-2xl shadow-2xl overflow-hidden",
                          showAbove ? "mb-1.5" : "mt-1.5"
                        )}>
                          {/* Emoji row */}
                          <div className="flex items-center justify-center gap-0.5 px-2 py-1.5" dir="ltr">
                            {QUICK_EMOJIS.map(emoji => (
                              <button
                                key={emoji}
                                onClick={() => { toggleReaction(actionMenu.msg.id, emoji); setShowExtraEmojis(false); }}
                                className="text-[19px] hover:scale-125 active:scale-90 transition-transform px-[2px]"
                                aria-label={`React with ${emoji}`}
                              >
                                {emoji}
                              </button>
                            ))}
                            <button
                              onClick={() => setShowExtraEmojis(!showExtraEmojis)}
                              className={cn(
                                "w-6 h-6 rounded-full flex items-center justify-center transition-all ms-1",
                                showExtraEmojis ? "bg-primary text-primary-foreground" : "bg-muted/50 text-muted-foreground"
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
                                <div className="h-px bg-border/30 mx-2" />
                                <div className="grid grid-cols-8 gap-0 px-1.5 py-1.5 max-h-[160px] overflow-y-auto" dir="ltr">
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

                          {/* Thin separator */}
                          <div className="h-px bg-border/30 mx-2" />

                          {/* Action icons row */}
                          <div className="flex items-center justify-center gap-1 px-2 py-1.5">
                            <button
                              onClick={() => { setReplyTo(actionMenu.msg); setActionMenu(null); setShowExtraEmojis(false); inputRef.current?.focus(); }}
                              className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg hover:bg-accent/30 active:bg-accent/50 transition-colors"
                              aria-label={isAr ? 'رد' : 'Reply'}
                            >
                              <Reply className="w-3.5 h-3.5 text-muted-foreground" />
                              <span className="text-[11px] text-muted-foreground">{isAr ? 'رد' : 'Rply'}</span>
                            </button>
                            {actionMenu.msg.message_type === 'text' && actionMenu.msg.content && (
                              <button
                                onClick={() => { copyMessage(actionMenu.msg.content); setShowExtraEmojis(false); }}
                                className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg hover:bg-accent/30 active:bg-accent/50 transition-colors"
                                aria-label={isAr ? 'نسخ' : 'Copy'}
                              >
                                <Copy className="w-3.5 h-3.5 text-muted-foreground" />
                                <span className="text-[11px] text-muted-foreground">{isAr ? 'نسخ' : 'Copy'}</span>
                              </button>
                            )}
                            <button
                              onClick={() => { setActionMenu(null); setShowExtraEmojis(false); }}
                              className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg hover:bg-accent/30 active:bg-accent/50 transition-colors"
                              aria-label={isAr ? 'تثبيت' : 'Pin'}
                            >
                              <Pin className="w-3.5 h-3.5 text-muted-foreground" />
                              <span className="text-[11px] text-muted-foreground">{isAr ? 'تثبيت' : 'Pin'}</span>
                            </button>
                            {actionMenu.isMine && !actionMenu.msg.deleted && (
                              <button
                                onClick={() => { deleteMessage(actionMenu.msg.id); setActionMenu(null); setShowExtraEmojis(false); }}
                                className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg hover:bg-destructive/10 active:bg-destructive/20 transition-colors"
                                aria-label={isAr ? 'حذف' : 'Delete'}
                              >
                                <Trash2 className="w-3.5 h-3.5 text-destructive" />
                                <span className="text-[11px] text-destructive">{isAr ? 'حذف' : 'Del'}</span>
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
            <div className="border-t border-border/50 bg-card/30">
              {/* Reply preview */}
              <AnimatePresence>
                {replyTo && !isRecording && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    className="overflow-hidden"
                  >
                    <div className="mx-3 mt-2 rounded-xl bg-accent/40 border border-border/30 overflow-hidden">
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
                  /* ─── Recording UI ─── */
                  <motion.div
                    key="recording"
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: 10 }}
                    transition={{ type: 'spring', damping: 25, stiffness: 400 }}
                    className="p-2 flex items-center gap-2"
                  >
                    {/* Cancel button */}
                    <button
                      onClick={() => stopRecording(true)}
                      className="shrink-0 w-9 h-9 rounded-full flex items-center justify-center bg-destructive/10 hover:bg-destructive/20 active:scale-90 transition-all"
                    >
                      <Trash2 className="w-4 h-4 text-destructive" />
                    </button>

                    {/* Recording indicator */}
                    <div className="flex-1 flex items-center gap-3 bg-accent/30 border border-border/30 rounded-full px-4 h-9">
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

                    {/* Send recording button */}
                    <motion.button
                      onClick={() => stopRecording(false)}
                      className="shrink-0 w-10 h-10 rounded-full bg-primary flex items-center justify-center shadow-lg"
                      whileTap={{ scale: 0.85 }}
                      animate={{ scale: [1, 1.08, 1] }}
                      transition={{ duration: 1.5, repeat: Infinity }}
                    >
                      <Send className="w-4 h-4 text-primary-foreground" />
                    </motion.button>
                  </motion.div>
                ) : (
                  /* ─── Normal Input ─── */
                  <motion.div
                    key="input"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="p-2 flex items-end gap-1.5"
                  >
                    <Button
                      size="icon"
                      variant="ghost"
                      className="rounded-full shrink-0 h-9 w-9"
                      onClick={() => {}}
                      aria-label={isAr ? 'ملصقات' : 'Sticker'}
                    >
                      <Smile className="h-5 w-5 text-muted-foreground" />
                    </Button>

                    <div className="flex-1 flex items-center bg-accent/30 border border-border/30 rounded-full overflow-hidden">
                      <Input
                        ref={inputRef}
                        placeholder={isAr ? 'مراسلة' : 'Nachricht'}
                        value={newMessage}
                        onChange={e => { setNewMessage(e.target.value); broadcastTyping(); }}
                        onKeyDown={e => e.key === 'Enter' && !e.shiftKey && sendMessage()}
                        dir="auto"
                        className="flex-1 border-0 bg-transparent focus-visible:ring-0 focus-visible:ring-offset-0 h-9 text-sm"
                      />
                      <button
                        onClick={() => fileInputRef.current?.click()}
                        disabled={uploading}
                        className="shrink-0 p-2 text-muted-foreground hover:text-foreground transition-colors"
                      >
                        {uploading ? (
                          <div className="w-4 h-4 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
                        ) : (
                          <Paperclip className="h-4 w-4" />
                        )}
                      </button>
                    </div>

                    {newMessage.trim() ? (
                      <Button
                        size="icon"
                        className="rounded-full shrink-0 h-9 w-9"
                        onClick={() => sendMessage()}
                      >
                        <Send className="h-4 w-4" />
                      </Button>
                    ) : (
                      <motion.button
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
