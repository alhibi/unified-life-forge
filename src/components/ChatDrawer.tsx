import React, { useState, useEffect, useRef, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useApp } from '@/contexts/AppContext';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
  ChevronRight, ChevronLeft, Send, Search, Plus, MessageCircle,
  Check, CheckCheck, Reply, Trash2, Paperclip, X,
  Download, FileText, MoreVertical, Trash, Info
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { motion, AnimatePresence } from 'framer-motion';
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

const QUICK_EMOJIS = ['❤️', '👍', '😂', '😮', '😢', '🔥', '👏', '🎉'];

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
  const [showEmojiFor, setShowEmojiFor] = useState<string | null>(null);
  const [typingUser, setTypingUser] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [showProfilePopup, setShowProfilePopup] = useState(false);
  const [showChatMenu, setShowChatMenu] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);
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

  // Typing indicator
  useEffect(() => {
    if (!activeConv || !user) return;

    const channel = supabase.channel(`typing:${activeConv.id}`, {
      config: { presence: { key: user.id } },
    });

    channel.on('presence', { event: 'sync' }, () => {
      const state = channel.presenceState();
      const others = Object.keys(state).filter(k => k !== user.id);
      setTypingUser(others.length > 0);
    });

    channel.subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [activeConv, user]);

  const broadcastTyping = useCallback(() => {
    if (!activeConv || !user) return;
    const channel = supabase.channel(`typing:${activeConv.id}`);
    channel.track({ typing: true });

    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
    typingTimeoutRef.current = setTimeout(() => {
      channel.untrack();
    }, 3000);
  }, [activeConv, user]);

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
    setShowEmojiFor(null);
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
        <SheetContent side={isAr ? 'right' : 'left'} className="w-full sm:max-w-md p-0">
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
      <SheetContent side={isAr ? 'right' : 'left'} className="w-full sm:max-w-md p-0 flex flex-col bg-background">
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
                <SheetTitle className="text-lg font-bold">
                  {isAr ? 'الرسائل' : 'Nachrichten'}
                </SheetTitle>
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
                <Button size="icon" variant="ghost" className="rounded-full" onClick={() => { setShowNewChat(false); setSearchResult(null); setSearchError(''); setSearchUser(''); }} aria-label={isAr ? 'رجوع' : 'Zurück'}>
                  <BackIcon className="h-5 w-5" />
                </Button>
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
              <Button size="icon" variant="ghost" className="rounded-full shrink-0" onClick={() => { setActiveConv(null); setReplyTo(null); setShowChatMenu(false); loadConversations(); }} aria-label={isAr ? 'رجوع' : 'Zurück'}>
                <BackIcon className="h-5 w-5" />
              </Button>
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
            <div className="flex-1 overflow-y-auto p-3 space-y-1" onClick={() => { setShowChatMenu(false); setShowEmojiFor(null); }}>
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
                    <motion.div
                      initial={{ opacity: 0, y: 8, scale: 0.95 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      transition={{ duration: 0.15 }}
                      className={cn('flex', isMine ? 'justify-end' : 'justify-start')}
                    >
                      <div
                        className="relative max-w-[78%] group"
                        onContextMenu={(e) => { e.preventDefault(); if (!msg.deleted) setShowEmojiFor(showEmojiFor === msg.id ? null : msg.id); }}
                        onClick={(e) => { e.stopPropagation(); if (!msg.deleted) setShowEmojiFor(showEmojiFor === msg.id ? null : msg.id); }}
                      >
                        {/* Reply preview */}
                        {msg.reply_to_id && !msg.deleted && (
                          <div className={cn(
                            'text-[10px] px-3 py-1.5 mb-0.5 rounded-t-xl border-s-2',
                            isMine
                              ? 'bg-primary/20 border-primary-foreground/30 text-primary-foreground/70'
                              : 'bg-muted/60 border-primary/40 text-muted-foreground'
                          )}>
                            <Reply className="w-3 h-3 inline me-1" />
                            {getReplyPreview(msg.reply_to_id)}
                          </div>
                        )}

                        <div className={cn(
                          'rounded-2xl px-3.5 py-2 text-sm',
                          msg.deleted
                            ? 'bg-muted/30 text-muted-foreground/50 italic'
                            : isMine
                              ? 'bg-primary text-primary-foreground rounded-br-md'
                              : 'bg-card border border-border/40 text-foreground rounded-bl-md'
                        )}>
                          {msg.deleted ? (
                            <p className="text-xs">{isAr ? '🚫 تم حذف هذه الرسالة' : '🚫 Diese Nachricht wurde gelöscht'}</p>
                          ) : msg.message_type === 'image' ? (
                            <div className="space-y-1">
                              <img
                                src={msg.file_url!}
                                alt={msg.file_name || 'image'}
                                className="rounded-xl max-w-full max-h-60 object-cover cursor-pointer"
                                onClick={(e) => { e.stopPropagation(); window.open(msg.file_url!, '_blank'); }}
                              />
                              {msg.content && msg.content !== msg.file_name && (
                                <p className="break-words whitespace-pre-wrap text-xs" dir="auto">{msg.content}</p>
                              )}
                            </div>
                          ) : msg.message_type === 'file' ? (
                            <a
                              href={msg.file_url!}
                              target="_blank"
                              rel="noopener noreferrer"
                              className={cn(
                                'flex items-center gap-2 py-1',
                                isMine ? 'text-primary-foreground' : 'text-foreground'
                              )}
                              onClick={e => e.stopPropagation()}
                            >
                              <FileText className="w-5 h-5 shrink-0" />
                              <span className="text-xs truncate flex-1">{msg.file_name}</span>
                              <Download className="w-4 h-4 shrink-0 opacity-60" />
                            </a>
                          ) : (
                            <p className="break-words whitespace-pre-wrap" dir="auto">{msg.content}</p>
                          )}

                          {!msg.deleted && (
                            <div className={cn('flex items-center gap-1 mt-1', isMine ? 'justify-end' : 'justify-start')}>
                              <span className={cn('text-[10px]', isMine ? 'text-primary-foreground/50' : 'text-muted-foreground/60')}>
                                {new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                              </span>
                              {isMine && (
                                msg.read
                                  ? <CheckCheck className="h-3 w-3 text-primary-foreground/50" />
                                  : <Check className="h-3 w-3 text-primary-foreground/50" />
                              )}
                            </div>
                          )}
                        </div>

                        {/* Reactions */}
                        {msgReactions.length > 0 && (
                          <div className={cn('flex gap-1 mt-0.5 flex-wrap', isMine ? 'justify-end' : 'justify-start')} dir="ltr">
                            {Object.entries(
                              msgReactions.reduce((acc, r) => {
                                acc[r.emoji] = (acc[r.emoji] || 0) + 1;
                                return acc;
                              }, {} as Record<string, number>)
                            ).map(([emoji, count]) => (
                              <button
                                key={emoji}
                                onClick={(e) => { e.stopPropagation(); toggleReaction(msg.id, emoji); }}
                                className={cn(
                                  'inline-flex items-center gap-0.5 text-sm px-1.5 py-0.5 rounded-full bg-card/80 border border-border/30 hover:scale-110 transition-transform',
                                  msgReactions.some(r => r.emoji === emoji && r.user_id === user.id) && 'border-primary/50 bg-primary/10'
                                )}
                                aria-label={`${emoji} reaction`}
                              >
                                <span className="text-base leading-none">{emoji}</span>
                                {count > 1 && <span className="text-[10px] text-muted-foreground font-medium">{count}</span>}
                              </button>
                            ))}
                          </div>
                        )}

                        {/* Quick emoji bar */}
                        <AnimatePresence>
                          {showEmojiFor === msg.id && !msg.deleted && (
                            <motion.div
                              initial={{ opacity: 0, scale: 0.8, y: 4 }}
                              animate={{ opacity: 1, scale: 1, y: 0 }}
                              exit={{ opacity: 0, scale: 0.8 }}
                              className={cn(
                                'absolute -top-11 flex items-center gap-0.5 bg-card border border-border/50 rounded-full px-2 py-1.5 shadow-xl z-10',
                                isMine ? 'right-0' : 'left-0'
                              )}
                              dir="ltr"
                              onClick={e => e.stopPropagation()}
                            >
                              {QUICK_EMOJIS.map(emoji => (
                                <button
                                  key={emoji}
                                  onClick={() => toggleReaction(msg.id, emoji)}
                                  className="text-lg hover:scale-125 active:scale-90 transition-transform p-0.5"
                                  aria-label={`React with ${emoji}`}
                                >
                                  {emoji}
                                </button>
                              ))}
                              <div className="w-px h-5 bg-border/40 mx-0.5" />
                              <button
                                onClick={() => { setReplyTo(msg); setShowEmojiFor(null); inputRef.current?.focus(); }}
                                className="text-muted-foreground hover:text-foreground transition-colors p-1"
                                aria-label={isAr ? 'رد' : 'Antworten'}
                              >
                                <Reply className="w-4 h-4" />
                              </button>
                              {isMine && (
                                <button
                                  onClick={() => { deleteMessage(msg.id); setShowEmojiFor(null); }}
                                  className="text-destructive/70 hover:text-destructive transition-colors p-1"
                                  aria-label={isAr ? 'حذف' : 'Löschen'}
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              )}
                            </motion.div>
                          )}
                        </AnimatePresence>
                      </div>
                    </motion.div>
                  </React.Fragment>
                );
              })}
              <div ref={messagesEndRef} />
            </div>

            {/* Reply preview bar */}
            <AnimatePresence>
              {replyTo && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  className="border-t border-border/30 bg-card/50 px-4 py-2 flex items-center gap-2"
                >
                  <Reply className="w-4 h-4 text-primary shrink-0" />
                  <p className="text-xs text-muted-foreground truncate flex-1" dir="auto">
                    {replyTo.message_type === 'image' ? '📷' : replyTo.content}
                  </p>
                  <button onClick={() => setReplyTo(null)} className="text-muted-foreground hover:text-foreground" aria-label={isAr ? 'إلغاء' : 'Abbrechen'}>
                    <X className="w-4 h-4" />
                  </button>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Input area */}
            <div className="p-3 border-t border-border/50 bg-card/30 flex items-center gap-2">
              <Button
                size="icon"
                variant="ghost"
                className="rounded-full shrink-0 h-9 w-9"
                onClick={() => fileInputRef.current?.click()}
                disabled={uploading}
                aria-label={isAr ? 'إرفاق ملف' : 'Datei anhängen'}
              >
                {uploading ? (
                  <div className="w-4 h-4 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
                ) : (
                  <Paperclip className="h-4 w-4 text-muted-foreground" />
                )}
              </Button>
              <Input
                ref={inputRef}
                placeholder={isAr ? 'اكتب رسالة...' : 'Nachricht schreiben...'}
                value={newMessage}
                onChange={e => { setNewMessage(e.target.value); broadcastTyping(); }}
                onKeyDown={e => e.key === 'Enter' && !e.shiftKey && sendMessage()}
                dir="auto"
                className="flex-1 rounded-full bg-accent/30 border-border/30"
              />
              <Button
                size="icon"
                className="rounded-full shrink-0 h-9 w-9"
                onClick={() => sendMessage()}
                disabled={!newMessage.trim()}
                aria-label={isAr ? 'إرسال' : 'Senden'}
              >
                <Send className="h-4 w-4" />
              </Button>
            </div>
          </>
        )}
      </SheetContent>
    </Sheet>
  );
}
