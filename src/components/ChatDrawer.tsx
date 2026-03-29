import React, { useState, useEffect, useRef, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useApp } from '@/contexts/AppContext';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { ArrowRight, ArrowLeft, Send, Search, Plus, MessageCircle, Check, CheckCheck } from 'lucide-react';
import { cn } from '@/lib/utils';

interface Conversation {
  id: string;
  user1_id: string;
  user2_id: string;
  updated_at: string;
  otherUsername?: string;
  lastMessage?: string;
  unreadCount?: number;
}

interface Message {
  id: string;
  conversation_id: string;
  sender_id: string;
  content: string;
  read: boolean;
  created_at: string;
}

interface ChatDrawerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  unreadCount: number;
  onUnreadChange: (count: number) => void;
}

export default function ChatDrawer({ open, onOpenChange, unreadCount, onUnreadChange }: ChatDrawerProps) {
  const { user } = useAuth();
  const { language } = useApp();
  const isAr = language === 'ar';

  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [activeConv, setActiveConv] = useState<Conversation | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [searchUser, setSearchUser] = useState('');
  const [searchResult, setSearchResult] = useState<{ user_id: string; username: string } | null>(null);
  const [searchError, setSearchError] = useState('');
  const [showNewChat, setShowNewChat] = useState(false);
  const [loading, setLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

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

    // Get other user profiles
    const otherIds = convs.map(c => c.user1_id === user.id ? c.user2_id : c.user1_id);
    const { data: profiles } = await supabase
      .from('profiles')
      .select('user_id, username')
      .in('user_id', otherIds);

    // Get last messages & unread counts
    const enriched = await Promise.all(convs.map(async (conv) => {
      const otherId = conv.user1_id === user.id ? conv.user2_id : conv.user1_id;
      const profile = profiles?.find(p => p.user_id === otherId);

      const { data: lastMsg } = await supabase
        .from('messages')
        .select('content')
        .eq('conversation_id', conv.id)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      const { count } = await supabase
        .from('messages')
        .select('*', { count: 'exact', head: true })
        .eq('conversation_id', conv.id)
        .neq('sender_id', user.id)
        .eq('read', false);

      return {
        ...conv,
        otherUsername: profile?.username || '?',
        lastMessage: lastMsg?.content,
        unreadCount: count || 0,
      };
    }));

    setConversations(enriched);
    onUnreadChange(enriched.reduce((sum, c) => sum + (c.unreadCount || 0), 0));
  }, [user, onUnreadChange]);

  // Load messages for active conversation
  const loadMessages = useCallback(async () => {
    if (!activeConv || !user) return;
    const { data } = await supabase
      .from('messages')
      .select('*')
      .eq('conversation_id', activeConv.id)
      .order('created_at', { ascending: true });

    if (data) {
      setMessages(data);
      // Mark as read
      await supabase
        .from('messages')
        .update({ read: true })
        .eq('conversation_id', activeConv.id)
        .neq('sender_id', user.id)
        .eq('read', false);
      
      setTimeout(scrollToBottom, 100);
    }
  }, [activeConv, user, scrollToBottom]);

  useEffect(() => {
    if (open && user) loadConversations();
  }, [open, user, loadConversations]);

  useEffect(() => {
    if (activeConv) loadMessages();
  }, [activeConv, loadMessages]);

  // Realtime subscription
  useEffect(() => {
    if (!user || !open) return;

    const channel = supabase
      .channel('messages-realtime')
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'messages',
      }, (payload) => {
        const newMsg = payload.new as Message;
        if (activeConv && newMsg.conversation_id === activeConv.id) {
          setMessages(prev => [...prev, newMsg]);
          // Mark as read immediately
          if (newMsg.sender_id !== user.id) {
            supabase.from('messages').update({ read: true }).eq('id', newMsg.id).then();
          }
          setTimeout(scrollToBottom, 100);
        }
        loadConversations();
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [user, open, activeConv, scrollToBottom, loadConversations]);

  // Also poll for unread when drawer is closed
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
      .select('user_id, username')
      .ilike('username', searchUser.trim())
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

    // Check if conversation exists
    const { data: existing } = await supabase
      .from('conversations')
      .select('*')
      .or(`and(user1_id.eq.${user.id},user2_id.eq.${searchResult.user_id}),and(user1_id.eq.${searchResult.user_id},user2_id.eq.${user.id})`)
      .maybeSingle();

    if (existing) {
      setActiveConv({ ...existing, otherUsername: searchResult.username });
      setShowNewChat(false);
      setSearchUser('');
      setSearchResult(null);
      setLoading(false);
      return;
    }

    const { data: newConv } = await supabase
      .from('conversations')
      .insert({
        user1_id: user.id,
        user2_id: searchResult.user_id,
      })
      .select()
      .single();

    if (newConv) {
      setActiveConv({ ...newConv, otherUsername: searchResult.username });
      setShowNewChat(false);
      setSearchUser('');
      setSearchResult(null);
      loadConversations();
    }
    setLoading(false);
  };

  const sendMessage = async () => {
    if (!newMessage.trim() || !activeConv || !user) return;
    const content = newMessage.trim();
    setNewMessage('');

    await supabase.from('messages').insert({
      conversation_id: activeConv.id,
      sender_id: user.id,
      content,
    });

    await supabase.from('conversations')
      .update({ updated_at: new Date().toISOString() })
      .eq('id', activeConv.id);
  };

  const BackIcon = isAr ? ArrowRight : ArrowLeft;

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
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side={isAr ? 'right' : 'left'} className="w-full sm:max-w-md p-0 flex flex-col">
        {!activeConv && !showNewChat ? (
          // Conversation List
          <>
            <SheetHeader className="p-4 border-b border-border">
              <div className="flex items-center justify-between">
                <SheetTitle className="text-lg font-bold">
                  {isAr ? 'الرسائل' : 'Nachrichten'}
                </SheetTitle>
                <Button size="icon" variant="ghost" onClick={() => setShowNewChat(true)}>
                  <Plus className="h-5 w-5" />
                </Button>
              </div>
            </SheetHeader>
            <div className="flex-1 overflow-y-auto">
              {conversations.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full text-muted-foreground gap-3">
                  <MessageCircle className="h-12 w-12 opacity-30" />
                  <p className="text-sm">{isAr ? 'لا توجد محادثات بعد' : 'Noch keine Gespräche'}</p>
                  <Button variant="outline" size="sm" onClick={() => setShowNewChat(true)}>
                    {isAr ? 'ابدأ محادثة جديدة' : 'Neues Gespräch starten'}
                  </Button>
                </div>
              ) : (
                conversations.map(conv => (
                  <button
                    key={conv.id}
                    onClick={() => setActiveConv(conv)}
                    className="w-full flex items-center gap-3 p-4 hover:bg-accent/50 transition-colors border-b border-border/50 text-start"
                  >
                    <Avatar className="h-11 w-11 shrink-0">
                      <AvatarFallback className="bg-primary/10 text-primary font-bold text-sm">
                        {conv.otherUsername?.charAt(0).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <span className="font-semibold text-sm text-foreground">{conv.otherUsername}</span>
                        {(conv.unreadCount ?? 0) > 0 && (
                          <span className="bg-destructive text-destructive-foreground text-[10px] rounded-full min-w-[18px] h-[18px] flex items-center justify-center px-1 font-bold">
                            {conv.unreadCount}
                          </span>
                        )}
                      </div>
                      {conv.lastMessage && (
                        <p className="text-xs text-muted-foreground truncate mt-0.5">
                          {conv.lastMessage}
                        </p>
                      )}
                    </div>
                  </button>
                ))
              )}
            </div>
          </>
        ) : showNewChat ? (
          // New Chat Search
          <>
            <SheetHeader className="p-4 border-b border-border">
              <div className="flex items-center gap-3">
                <Button size="icon" variant="ghost" onClick={() => { setShowNewChat(false); setSearchResult(null); setSearchError(''); setSearchUser(''); }}>
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
                  className="flex-1"
                  dir="auto"
                />
                <Button size="icon" onClick={searchForUser}>
                  <Search className="h-4 w-4" />
                </Button>
              </div>
              {searchError && (
                <p className="text-destructive text-sm text-center">{searchError}</p>
              )}
              {searchResult && (
                <button
                  onClick={startConversation}
                  disabled={loading}
                  className="w-full flex items-center gap-3 p-4 rounded-xl bg-accent/50 hover:bg-accent transition-colors"
                >
                  <Avatar className="h-11 w-11">
                    <AvatarFallback className="bg-primary/10 text-primary font-bold">
                      {searchResult.username.charAt(0).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <span className="font-semibold text-sm">{searchResult.username}</span>
                </button>
              )}
            </div>
          </>
        ) : (
          // Active Chat
          <>
            <div className="p-3 border-b border-border flex items-center gap-3">
              <Button size="icon" variant="ghost" onClick={() => { setActiveConv(null); loadConversations(); }}>
                <BackIcon className="h-5 w-5" />
              </Button>
              <Avatar className="h-9 w-9">
                <AvatarFallback className="bg-primary/10 text-primary font-bold text-sm">
                  {activeConv?.otherUsername?.charAt(0).toUpperCase()}
                </AvatarFallback>
              </Avatar>
              <span className="font-semibold text-sm">{activeConv?.otherUsername}</span>
            </div>
            <div className="flex-1 overflow-y-auto p-4 space-y-2">
              {messages.map(msg => {
                const isMine = msg.sender_id === user.id;
                return (
                  <div key={msg.id} className={cn('flex', isMine ? 'justify-end' : 'justify-start')}>
                    <div className={cn(
                      'max-w-[75%] rounded-2xl px-3.5 py-2 text-sm',
                      isMine
                        ? 'bg-primary text-primary-foreground rounded-br-md'
                        : 'bg-muted text-foreground rounded-bl-md'
                    )}>
                      <p className="break-words whitespace-pre-wrap" dir="auto">{msg.content}</p>
                      <div className={cn('flex items-center gap-1 mt-1', isMine ? 'justify-end' : 'justify-start')}>
                        <span className={cn('text-[10px]', isMine ? 'text-primary-foreground/60' : 'text-muted-foreground')}>
                          {new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </span>
                        {isMine && (
                          msg.read
                            ? <CheckCheck className="h-3 w-3 text-primary-foreground/60" />
                            : <Check className="h-3 w-3 text-primary-foreground/60" />
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
              <div ref={messagesEndRef} />
            </div>
            <div className="p-3 border-t border-border flex gap-2">
              <Input
                placeholder={isAr ? 'اكتب رسالة...' : 'Nachricht schreiben...'}
                value={newMessage}
                onChange={e => setNewMessage(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && !e.shiftKey && sendMessage()}
                dir="auto"
                className="flex-1"
              />
              <Button size="icon" onClick={sendMessage} disabled={!newMessage.trim()}>
                <Send className="h-4 w-4" />
              </Button>
            </div>
          </>
        )}
      </SheetContent>
    </Sheet>
  );
}
