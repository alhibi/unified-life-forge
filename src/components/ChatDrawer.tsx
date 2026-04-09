import React, { useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import ImageLightbox from '@/components/ImageLightbox';
import { useVoicePlayer } from '@/contexts/VoicePlayerContext';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
  ChevronRight, ChevronLeft, ChevronDown, Search, Plus,
  Check, CheckCheck, Reply, Trash2, Paperclip, X,
  Download, FileText, MoreVertical, Trash, Info, Copy, Pin, PinOff,
  ArrowDown, Calendar, Clock, Image as ImageIcon, User2, Pencil, Timer, TimerOff
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { motion, AnimatePresence } from 'framer-motion';
import { isEmojiAvatarValue, getAppleEmojiUrl } from '@/utils/emojiAvatar';
import { getDefaultAvatarForUser } from '@/utils/defaultAvatar';
import { getSignedFileUrl } from './chat/chatUtils';
import { QUICK_EMOJIS, EXTRA_EMOJIS } from './chat/constants';
import { useChat } from './chat/useChat';
import { useVoiceRecording } from './chat/useVoiceRecording';
import { SwipeableMessage, TypingDots } from './chat/MessageBubble';
import ConversationList from './chat/ConversationList';
import ChatInput from './chat/ChatInput';
import type { ChatDrawerProps, ActionMenuState, Message } from './chat/types';

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

export default function ChatDrawer({ open, onOpenChange, unreadCount, onUnreadChange }: ChatDrawerProps) {
  const chat = useChat({ open, onUnreadChange });
  const { isRecording, recordingTime, startRecording, stopRecording } = useVoiceRecording({
    activeConvId: chat.activeConv?.id || null,
    userId: chat.user?.id,
    sendMessage: chat.sendMessage,
  });
  const voicePlayer = useVoicePlayer();

  const [actionMenu, setActionMenu] = React.useState<ActionMenuState | null>(null);

  const BackIcon = chat.isAr ? ChevronRight : ChevronLeft;

  const openActionMenu = useCallback((msg: Message, isMine: boolean, e: React.MouseEvent | React.TouchEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (msg.deleted) return;
    const target = (e.currentTarget as HTMLElement);
    const rect = target.getBoundingClientRect();
    const containerRect = chat.messagesContainerRef.current?.getBoundingClientRect() || { top: 0, bottom: window.innerHeight, height: window.innerHeight };
    setActionMenu({
      msg,
      isMine,
      rect: { top: rect.top, bottom: rect.bottom, left: rect.left, right: rect.right, width: rect.width, height: rect.height },
      containerRect: { top: containerRect.top, bottom: containerRect.bottom, height: containerRect.height },
    });
  }, [chat.messagesContainerRef]);

  if (!chat.user) {
    return (
      <Sheet open={open} onOpenChange={onOpenChange}>
        <SheetContent side={chat.isAr ? 'right' : 'left'} className="w-full sm:max-w-md p-0 [&>button[class*='absolute']]:hidden">
          <div className="flex items-center justify-center h-full">
            <p className="text-muted-foreground text-sm">
              {chat.isAr ? 'يرجى تسجيل الدخول أولاً' : 'Bitte zuerst anmelden'}
            </p>
          </div>
        </SheetContent>
      </Sheet>
    );
  }

  return (
    <Sheet open={open} onOpenChange={(v) => { onOpenChange(v); if (!v) { chat.setActiveConv(null); chat.setShowNewChat(false); chat.setShowChatMenu(false); chat.setShowProfilePopup(false); } }}>
      <SheetContent side={chat.isAr ? 'right' : 'left'} className="w-full sm:max-w-md p-0 flex flex-col bg-background [&>button[class*='absolute']]:hidden">
        <input
          type="file"
          ref={chat.fileInputRef}
          className="hidden"
          accept="image/*,application/pdf,.doc,.docx,.txt,.zip"
          multiple
          onChange={chat.handleFileUpload}
        />

        {/* ─── Profile Popup ─── */}
        <AnimatePresence>
          {chat.showProfilePopup && chat.activeConv && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 z-50 bg-background flex flex-col"
            >
              <div className="flex items-center gap-3 px-4 pt-4 pb-3 border-b border-border/30">
                <button
                  onClick={() => { chat.setShowProfilePopup(false); chat.setProfileTab('info'); }}
                  className="w-9 h-9 rounded-xl bg-secondary/50 flex items-center justify-center active:scale-95 transition-transform"
                >
                  <BackIcon className="w-4.5 h-4.5 text-foreground stroke-[2]" />
                </button>
                <h2 className="text-[16px] font-bold">{chat.isAr ? 'الملف الشخصي' : 'Profil'}</h2>
              </div>

              <div className="flex flex-col items-center pt-6 pb-4 px-6">
                <motion.div initial={{ scale: 0.7 }} animate={{ scale: 1 }} transition={{ type: 'spring', damping: 20, stiffness: 300 }}>
                  {renderAvatar(chat.activeConv.otherUsername, chat.activeConv.otherAvatarUrl, 'h-24 w-24')}
                </motion.div>
                <h3 className="text-lg font-bold text-foreground mt-3">{chat.activeConv.otherDisplayName || chat.activeConv.otherUsername}</h3>
                {chat.activeConv.otherDisplayName && chat.activeConv.otherDisplayName !== chat.activeConv.otherUsername && (
                  <p className="text-[13px] text-muted-foreground">@{chat.activeConv.otherUsername}</p>
                )}
                <p className={cn('text-[12px] mt-1 font-medium', chat.otherPresence.isOnline ? 'text-green-500' : 'text-muted-foreground/70')}>
                  {chat.otherPresence.text}
                </p>
              </div>

              <div className="flex mx-4 bg-muted/30 rounded-xl p-1 gap-1">
                <button onClick={() => chat.setProfileTab('info')} className={cn('flex-1 py-2 rounded-lg text-[13px] font-medium transition-all', chat.profileTab === 'info' ? 'bg-background text-foreground shadow-sm' : 'text-muted-foreground')}>
                  {chat.isAr ? 'المعلومات' : 'Info'}
                </button>
                <button onClick={() => {
                  chat.setProfileTab('media');
                  if (chat.activeConv) {
                    supabase.from('messages').select('*').eq('conversation_id', chat.activeConv.id).in('message_type', ['image', 'file']).eq('deleted', false).order('created_at', { ascending: false }).limit(50).then(({ data }) => chat.setSharedMedia((data || []) as Message[]));
                  }
                }} className={cn('flex-1 py-2 rounded-lg text-[13px] font-medium transition-all', chat.profileTab === 'media' ? 'bg-background text-foreground shadow-sm' : 'text-muted-foreground')}>
                  {chat.isAr ? 'الوسائط' : 'Medien'}
                </button>
              </div>

              <div className="flex-1 overflow-y-auto mt-3 px-4 pb-6">
                {chat.profileTab === 'info' ? (
                  <div className="space-y-3">
                    <div className="bg-card border border-border/20 rounded-2xl p-4">
                      <div className="grid grid-cols-3 gap-3 text-center">
                        <div><p className="text-xl font-bold text-foreground">{chat.messages.length}</p><p className="text-[10px] text-muted-foreground">{chat.isAr ? 'رسالة' : 'Nachrichten'}</p></div>
                        <div><p className="text-xl font-bold text-foreground">{chat.messages.filter(m => m.message_type === 'image').length}</p><p className="text-[10px] text-muted-foreground">{chat.isAr ? 'صورة' : 'Fotos'}</p></div>
                        <div><p className="text-xl font-bold text-foreground">{chat.messages.filter(m => m.message_type === 'voice').length}</p><p className="text-[10px] text-muted-foreground">{chat.isAr ? 'صوتية' : 'Audio'}</p></div>
                      </div>
                    </div>
                    <div className="bg-card border border-border/20 rounded-2xl divide-y divide-border/10">
                      <div className="flex items-center gap-3 p-3.5"><User2 className="w-4 h-4 text-muted-foreground shrink-0" /><div className="min-w-0"><p className="text-[11px] text-muted-foreground">{chat.isAr ? 'النبذة' : 'Bio'}</p><p className="text-[13px] text-foreground font-medium">{chat.activeConv.otherBio || (chat.isAr ? 'لا توجد نبذة' : 'No bio')}</p></div></div>
                      <div className="flex items-center gap-3 p-3.5"><Calendar className="w-4 h-4 text-muted-foreground shrink-0" /><div className="min-w-0"><p className="text-[11px] text-muted-foreground">{chat.isAr ? 'تاريخ الانضمام' : 'Beigetreten'}</p><p className="text-[13px] text-foreground font-medium">{chat.activeConv.otherCreatedAt ? new Date(chat.activeConv.otherCreatedAt).toLocaleDateString(chat.isAr ? 'ar' : 'de', { day: 'numeric', month: 'long', year: 'numeric' }) : '—'}</p></div></div>
                    </div>
                    <button onClick={() => { chat.deleteConversation(); chat.setShowProfilePopup(false); chat.setProfileTab('info'); }} className="w-full flex items-center justify-center gap-2 py-3 rounded-2xl bg-destructive/10 text-destructive text-[13px] font-medium active:bg-destructive/20 transition-colors">
                      <Trash className="w-4 h-4" />{chat.isAr ? 'حذف المحادثة' : 'Chat löschen'}
                    </button>
                  </div>
                ) : (
                  <div>
                    {chat.sharedMedia.length === 0 ? (
                      <div className="flex flex-col items-center justify-center py-16 text-muted-foreground gap-3"><ImageIcon className="w-10 h-10 opacity-30" /><p className="text-sm">{chat.isAr ? 'لا توجد وسائط مشتركة' : 'Keine gemeinsamen Medien'}</p></div>
                    ) : (
                      <div className="grid grid-cols-3 gap-1 rounded-xl overflow-hidden">
                        {chat.sharedMedia.map(m => m.message_type === 'image' ? (
                          <button key={m.id} onClick={() => window.open(chat.getFileUrl(m), '_blank')} className="aspect-square bg-muted/30 overflow-hidden hover:opacity-80 transition-opacity"><img src={chat.getFileUrl(m)} alt="" className="w-full h-full object-cover" /></button>
                        ) : (
                          <div key={m.id} className="aspect-square bg-muted/20 flex flex-col items-center justify-center gap-1.5 p-2"><FileText className="w-6 h-6 text-muted-foreground" /><span className="text-[9px] text-muted-foreground truncate w-full text-center">{m.file_name}</span></div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {!chat.activeConv && !chat.showNewChat ? (
          <>
            <SheetHeader className="px-4 pt-4 pb-3 border-b border-border/40">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <button onClick={() => onOpenChange(false)} className="w-9 h-9 rounded-xl bg-secondary/50 flex items-center justify-center active:scale-95 transition-transform" aria-label={chat.isAr ? 'رجوع' : 'Zurück'}>
                    <BackIcon className="w-4.5 h-4.5 text-foreground stroke-[2]" />
                  </button>
                  <SheetTitle className="text-[17px] font-bold tracking-tight">{chat.isAr ? 'الرسائل' : 'Nachrichten'}</SheetTitle>
                </div>
                <button onClick={() => chat.setShowNewChat(true)} className="w-9 h-9 rounded-xl bg-primary/10 flex items-center justify-center active:scale-95 transition-all hover:bg-primary/20" aria-label={chat.isAr ? 'محادثة جديدة' : 'Neues Gespräch'}>
                  <Plus className="h-4.5 w-4.5 text-primary stroke-[2]" />
                </button>
              </div>
            </SheetHeader>
            <div className="flex-1 overflow-y-auto">
              <ConversationList conversations={chat.conversations} isAr={chat.isAr} onSelect={chat.setActiveConv} onNewChat={() => chat.setShowNewChat(true)} />
            </div>
          </>
        ) : chat.showNewChat ? (
          <>
            <SheetHeader className="px-4 pt-4 pb-3 border-b border-border/40">
              <div className="flex items-center gap-3">
                <button onClick={() => { chat.setShowNewChat(false); chat.setSearchUser(''); }} className="w-9 h-9 rounded-xl bg-secondary/50 flex items-center justify-center active:scale-95 transition-transform" aria-label={chat.isAr ? 'رجوع' : 'Zurück'}>
                  <BackIcon className="w-4.5 h-4.5 text-foreground stroke-[2]" />
                </button>
                <SheetTitle className="text-[17px] font-bold tracking-tight">{chat.isAr ? 'محادثة جديدة' : 'Neues Gespräch'}</SheetTitle>
              </div>
            </SheetHeader>
            <div className="p-4 space-y-4">
              <div className="flex gap-2">
                <Input placeholder={chat.isAr ? 'ابحث باسم المستخدم...' : 'Nach Benutzername suchen...'} value={chat.searchUser} onChange={e => chat.setSearchUser(e.target.value)} onKeyDown={e => e.key === 'Enter' && chat.searchForUser()} className="flex-1 rounded-full" dir="auto" />
                <Button size="icon" className="rounded-full" onClick={chat.searchForUser} aria-label={chat.isAr ? 'بحث' : 'Suchen'}><Search className="h-4 w-4" /></Button>
              </div>
              {chat.searchError && <p className="text-destructive text-sm text-center">{chat.searchError}</p>}
              {chat.searchResult && (
                <motion.button initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} onClick={chat.startConversation} disabled={chat.loading} className="w-full flex items-center gap-3 p-4 rounded-2xl bg-accent/30 hover:bg-accent/50 transition-colors">
                  {renderAvatar(chat.searchResult.username, chat.searchResult.avatar_url, 'h-14 w-14')}
                  <div className="text-start">
                    <span className="font-semibold text-sm block">{chat.searchResult.display_name || chat.searchResult.username}</span>
                    {chat.searchResult.display_name && chat.searchResult.display_name !== chat.searchResult.username && (
                      <span className="text-xs text-muted-foreground">@{chat.searchResult.username}</span>
                    )}
                  </div>
                </motion.button>
              )}
            </div>
          </>
        ) : (
          <>
            {/* Chat Header */}
            <div className="sticky top-0 z-30 px-3 py-2.5 border-b border-border/40 flex items-center gap-2.5 bg-background/80 backdrop-blur-xl">
              <button onClick={() => { chat.setActiveConv(null); chat.setReplyTo(null); chat.setShowChatMenu(false); chat.loadConversations(); }} className="w-9 h-9 rounded-xl bg-secondary/50 flex items-center justify-center active:scale-95 transition-transform shrink-0" aria-label={chat.isAr ? 'رجوع' : 'Zurück'}>
                <BackIcon className="w-4.5 h-4.5 text-foreground stroke-[2]" />
              </button>
              <button className="flex items-center gap-2.5 flex-1 min-w-0" onClick={() => chat.setShowProfilePopup(true)}>
                {renderAvatar(chat.activeConv?.otherUsername, chat.activeConv?.otherAvatarUrl, 'h-9 w-9')}
                <div className="min-w-0 text-start">
                  <span className="font-semibold text-[14px] block truncate leading-tight">{chat.activeConv?.otherDisplayName || chat.activeConv?.otherUsername}</span>
                  <AnimatePresence mode="wait">
                    {chat.typingUser ? (
                      <motion.div key="typing" initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 4 }} className="flex items-center gap-1.5">
                        <span className="text-[11px] text-primary font-medium leading-tight">{chat.isAr ? 'يكتب' : 'tippt'}</span>
                        <TypingDots />
                      </motion.div>
                    ) : (
                      <motion.span key="status" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className={cn('text-[11px] leading-tight', chat.otherPresence.isOnline ? 'text-green-500 font-medium' : 'text-muted-foreground/60')}>
                        {chat.otherPresence.text}
                      </motion.span>
                    )}
                  </AnimatePresence>
                </div>
              </button>
              <div className="relative">
                <button onClick={() => chat.setShowChatMenu(!chat.showChatMenu)} className="w-8 h-8 rounded-lg flex items-center justify-center hover:bg-accent/30 active:bg-accent/50 transition-colors" aria-label={chat.isAr ? 'خيارات' : 'Optionen'}>
                  <MoreVertical className="h-4 w-4 text-muted-foreground" />
                </button>
                <AnimatePresence>
                  {chat.showChatMenu && (
                    <motion.div initial={{ opacity: 0, scale: 0.9, y: -4 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.9 }} className={cn('absolute top-full mt-1 bg-card border border-border/40 rounded-xl z-20 min-w-[170px] overflow-hidden', chat.isAr ? 'left-0' : 'right-0')}>
                      <button className="w-full flex items-center gap-3 px-4 py-2.5 hover:bg-accent/30 transition-colors text-[13px] text-start" onClick={() => { chat.setShowProfilePopup(true); chat.setShowChatMenu(false); }}>
                        <Info className="w-4 h-4 text-muted-foreground" />{chat.isAr ? 'معلومات المحادثة' : 'Chat-Info'}
                      </button>
                      <div className="h-px bg-border/20 mx-3" />
                      <button className="w-full flex items-center gap-3 px-4 py-2.5 hover:bg-accent/30 transition-colors text-[13px] text-start" onClick={() => { chat.setShowSearch(true); chat.setShowChatMenu(false); }}>
                        <Search className="w-4 h-4 text-muted-foreground" />{chat.isAr ? 'بحث في المحادثة' : 'Im Chat suchen'}
                      </button>
                      <div className="h-px bg-border/20 mx-3" />
                      <button className="w-full flex items-center gap-3 px-4 py-2.5 hover:bg-accent/30 transition-colors text-[13px] text-start" onClick={() => chat.setShowSelfDestructMenu(!chat.showSelfDestructMenu)}>
                        {chat.selfDestructSeconds ? <TimerOff className="w-4 h-4 text-muted-foreground" /> : <Timer className="w-4 h-4 text-muted-foreground" />}
                        {chat.selfDestructSeconds ? (chat.isAr ? 'إيقاف التدمير الذاتي' : 'Selbstzerstörung aus') : (chat.isAr ? 'رسائل ذاتية الحذف' : 'Selbstzerstörung')}
                      </button>
                      <AnimatePresence>
                        {chat.showSelfDestructMenu && (
                          <motion.div initial={{ height: 0 }} animate={{ height: 'auto' }} exit={{ height: 0 }} className="overflow-hidden">
                            <div className="px-3 pb-2 space-y-0.5">
                              {[{ label: chat.isAr ? '30 ثانية' : '30 Sek.', val: 30 }, { label: chat.isAr ? '5 دقائق' : '5 Min.', val: 300 }, { label: chat.isAr ? 'ساعة' : '1 Std.', val: 3600 }, { label: chat.isAr ? 'يوم' : '1 Tag', val: 86400 }, { label: chat.isAr ? 'إيقاف' : 'Aus', val: null as number | null }].map(opt => (
                                <button key={opt.label} onClick={() => chat.toggleSelfDestruct(opt.val)} className={cn('w-full text-start px-3 py-1.5 rounded-lg text-[12px] transition-colors', chat.selfDestructSeconds === opt.val ? 'bg-primary/15 text-primary font-medium' : 'hover:bg-accent/30 text-foreground')}>
                                  {opt.label}
                                </button>
                              ))}
                            </div>
                          </motion.div>
                        )}
                      </AnimatePresence>
                      <div className="h-px bg-border/20 mx-3" />
                      <button className="w-full flex items-center gap-3 px-4 py-2.5 hover:bg-destructive/10 transition-colors text-[13px] text-destructive text-start" onClick={chat.deleteConversation}>
                        <Trash className="w-4 h-4" />{chat.isAr ? 'حذف المحادثة' : 'Chat löschen'}
                      </button>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </div>

            {/* Search bar */}
            <AnimatePresence>
              {chat.showSearch && (
                <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden border-b border-border/30">
                  <div className="flex items-center gap-2 px-3 py-2">
                    <Search className="w-4 h-4 text-muted-foreground shrink-0" />
                    <input type="text" value={chat.chatSearchQuery} onChange={e => chat.searchInChat(e.target.value)} placeholder={chat.isAr ? 'بحث في المحادثة...' : 'Suchen...'} className="flex-1 bg-transparent text-[13px] outline-none placeholder:text-muted-foreground/50" dir="auto" autoFocus />
                    {chat.searchResults.length > 0 && <span className="text-[11px] text-muted-foreground tabular-nums shrink-0">{chat.searchIndex + 1}/{chat.searchResults.length}</span>}
                    <div className="flex gap-0.5 shrink-0">
                      <button onClick={() => chat.navigateSearch('up')} className="w-7 h-7 rounded-lg flex items-center justify-center hover:bg-accent/30"><ChevronRight className="w-3.5 h-3.5 rotate-[-90deg] text-muted-foreground" /></button>
                      <button onClick={() => chat.navigateSearch('down')} className="w-7 h-7 rounded-lg flex items-center justify-center hover:bg-accent/30"><ChevronRight className="w-3.5 h-3.5 rotate-90 text-muted-foreground" /></button>
                    </div>
                    <button onClick={() => { chat.setShowSearch(false); }} className="w-7 h-7 rounded-lg flex items-center justify-center hover:bg-accent/30"><X className="w-3.5 h-3.5 text-muted-foreground" /></button>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Pinned message */}
            <AnimatePresence>
              {chat.pinnedMessage && !chat.pinnedMessage.deleted && (
                <motion.button initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="w-full border-b border-border/30 px-3 py-2 flex items-center gap-2.5 bg-accent/10 hover:bg-accent/20 transition-colors text-start overflow-hidden" onClick={() => { const el = document.getElementById(`msg-${chat.pinnedMessage!.id}`); el?.scrollIntoView({ behavior: 'smooth', block: 'center' }); }}>
                  <Pin className="w-3.5 h-3.5 text-primary shrink-0 rotate-45" />
                  <div className="flex-1 min-w-0">
                    <p className="text-[10px] text-primary font-semibold">{chat.isAr ? 'رسالة مثبتة' : 'Angeheftet'}</p>
                    <p className="text-[12px] text-foreground/70 truncate" dir="auto">{chat.pinnedMessage.message_type === 'text' ? chat.pinnedMessage.content : chat.pinnedMessage.message_type === 'image' ? '📷 ' + (chat.isAr ? 'صورة' : 'Foto') : chat.pinnedMessage.message_type === 'voice' ? '🎤' : '📎'}</p>
                  </div>
                  <button onClick={(e) => { e.stopPropagation(); chat.pinMessage(chat.pinnedMessage!); }} className="shrink-0 w-6 h-6 rounded-full flex items-center justify-center hover:bg-muted/50"><X className="w-3 h-3 text-muted-foreground" /></button>
                </motion.button>
              )}
            </AnimatePresence>

            {/* Self-destruct indicator */}
            {chat.selfDestructSeconds && (
              <div className="flex items-center justify-center gap-1.5 py-1.5 bg-accent/5 border-b border-border/20">
                <Timer className="w-3 h-3 text-primary" />
                <span className="text-[10px] text-primary font-medium">
                  {chat.isAr ? 'رسائل ذاتية الحذف' : 'Selbstzerstörung'}: {chat.selfDestructSeconds < 60 ? `${chat.selfDestructSeconds}${chat.isAr ? 'ث' : 's'}` : chat.selfDestructSeconds < 3600 ? `${Math.floor(chat.selfDestructSeconds / 60)}${chat.isAr ? 'د' : 'm'}` : chat.selfDestructSeconds < 86400 ? `${Math.floor(chat.selfDestructSeconds / 3600)}${chat.isAr ? 'س' : 'h'}` : `${Math.floor(chat.selfDestructSeconds / 86400)}${chat.isAr ? 'ي' : 'd'}`}
                </span>
              </div>
            )}

            {/* Messages */}
            <div
              ref={chat.messagesContainerRef}
              className="flex-1 overflow-y-auto px-3 py-2 overscroll-contain scroll-smooth will-change-scroll"
              style={{ WebkitOverflowScrolling: 'touch' } as React.CSSProperties}
              onScroll={chat.handleScroll}
              onClick={() => { chat.setShowChatMenu(false); setActionMenu(null); chat.setShowExtraEmojis(false); }}
            >
              {chat.messages.map((msg, idx) => {
                const isMine = msg.sender_id === chat.user!.id;
                const msgReactions = chat.reactions.filter(r => r.message_id === msg.id);
                const { sameSenderAsPrev, sameSenderAsNext, showDate } = chat.getMessageMeta(idx);
                const fadeOpacity = chat.getMessageOpacity(msg);
                const isFading = msg.expires_at && fadeOpacity < 1;

                return (
                  <React.Fragment key={msg.id}>
                    {showDate && (
                      <div className="flex justify-center py-3">
                        <span className="text-[10px] text-muted-foreground/50 bg-muted/30 px-3 py-1 rounded-full font-medium tracking-wide">
                          {new Date(msg.created_at).toLocaleDateString(chat.isAr ? 'ar' : 'de', { day: 'numeric', month: 'long' })}
                        </span>
                      </div>
                    )}
                    <div id={`msg-${msg.id}`} className={cn('flex relative', isMine ? 'justify-end' : 'justify-start', sameSenderAsPrev ? 'mt-[2px]' : 'mt-2.5')} style={{ opacity: fadeOpacity, transition: 'opacity 2s ease-out' }}>
                      <SwipeableMessage isMine={isMine} deleted={msg.deleted} onSwipeReply={() => { chat.setReplyTo(msg); chat.inputRef.current?.focus(); }}>
                        <div className={cn('relative group w-fit min-w-[80px] max-w-[75%]')} onContextMenu={(e) => openActionMenu(msg, isMine, e)} onClick={(e) => openActionMenu(msg, isMine, e)}>
                          <div className={cn(
                            'overflow-hidden text-[14px] leading-relaxed',
                            msg.deleted ? 'bg-muted/30 text-muted-foreground/50 italic rounded-[18px]' : isMine ? 'bg-primary text-primary-foreground rounded-[18px] rounded-br-[4px]' : 'bg-card border border-border/30 text-foreground rounded-[18px] rounded-bl-[4px]'
                          )}>
                            {msg.reply_to_id && !msg.deleted && (() => {
                              const repliedMsg = chat.messages.find(m => m.id === msg.reply_to_id);
                              const replySenderName = repliedMsg?.sender_id === chat.user!.id ? (chat.isAr ? 'أنت' : 'Du') : (chat.activeConv?.otherDisplayName || chat.activeConv?.otherUsername || '');
                              return (
                                <div className={cn('mx-2 mt-2 rounded-xl border-s-2 px-3 py-2', isMine ? 'bg-primary-foreground/10 border-primary-foreground/60' : 'bg-muted/40 border-primary/70')}>
                                  <span className={cn('mb-1 block text-[12px] font-semibold leading-none', isMine ? 'text-primary-foreground/85' : 'text-primary')}>{replySenderName}</span>
                                  <span className={cn('block text-[13px] leading-[1.35] line-clamp-2', isMine ? 'text-primary-foreground/65' : 'text-muted-foreground')} dir="auto">{chat.getReplyPreview(msg.reply_to_id)}</span>
                                </div>
                              );
                            })()}

                            {msg.deleted ? (
                              <p className="px-3 py-2 text-xs">{chat.isAr ? '🚫 تم حذف هذه الرسالة' : '🚫 Diese Nachricht wurde gelöscht'}</p>
                            ) : msg.message_type === 'image' ? (
                              <div className="relative">
                                <img src={chat.getFileUrl(msg)} alt={msg.file_name || 'image'} className="max-w-full max-h-60 object-cover cursor-pointer rounded-sm" loading="lazy" onClick={(e) => { e.stopPropagation(); const rect = (e.target as HTMLElement).getBoundingClientRect(); chat.setLightboxRect(rect); chat.setLightboxSrc(chat.getFileUrl(msg)); chat.setLightboxOpen(true); }} />
                                <div className="px-3 py-2">
                                  {msg.content && msg.content !== msg.file_name && <p className="break-words whitespace-pre-wrap text-[14px] leading-[1.45] [overflow-wrap:anywhere] [unicode-bidi:plaintext]" dir="auto">{msg.content}</p>}
                                  <div className={cn('mt-1 flex items-center justify-end gap-[3px] pt-1 text-[11px] leading-none', isMine ? 'text-primary-foreground/50' : 'text-foreground/40')} dir="ltr">
                                    <span>{new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                                    {isMine && (msg.read ? <CheckCheck className="h-[11px] w-[11px]" /> : <Check className="h-[11px] w-[11px]" />)}
                                  </div>
                                </div>
                              </div>
                            ) : msg.message_type === 'voice' ? (
                              (() => {
                                const isPlaying = voicePlayer.isPlayingMsg(msg.id);
                                const progress = voicePlayer.getProgress(msg.id);
                                const duration = voicePlayer.getDuration(msg.id);
                                const formatDur = (s: number) => { if (!s || !isFinite(s)) return '0:00'; const m = Math.floor(s / 60); const sec = Math.floor(s % 60); return `${m}:${sec.toString().padStart(2, '0')}`; };
                                const cachedWaveform = voicePlayer.waveformCache[msg.id];
                                const bars = cachedWaveform || (() => { const seed = msg.id.split('').reduce((a: number, c: string) => a + c.charCodeAt(0), 0); return Array.from({ length: 40 }, (_, i) => ((Math.sin(seed * (i + 1) * 0.7) + 1) / 2) * 0.85 + 0.15); })();
                                const fileUrl = chat.getFileUrl(msg);
                                if (fileUrl && !cachedWaveform) voicePlayer.generateWaveform(fileUrl, msg.id);
                                const senderName = isMine ? 'أنت' : (chat.activeConv?.otherDisplayName || chat.activeConv?.otherUsername || '');

                                return (
                                  <div className="min-w-[220px] px-3 py-2.5">
                                    <div className="flex items-center gap-3">
                                      <button onClick={async (e) => { e.stopPropagation(); const playableUrl = fileUrl || (msg.file_url ? await getSignedFileUrl(msg.file_url) : ''); if (!playableUrl) return; voicePlayer.togglePlayback(msg.id, playableUrl, senderName, msg.conversation_id); }} className={cn('flex h-10 w-10 shrink-0 items-center justify-center rounded-full transition-colors active:scale-90', isMine ? 'bg-primary-foreground/20 hover:bg-primary-foreground/30' : 'bg-primary/15 hover:bg-primary/25')}>
                                        {isPlaying ? (
                                          <svg viewBox="0 0 24 24" className={cn('h-5 w-5', isMine ? 'text-primary-foreground' : 'text-primary')} fill="currentColor"><rect x="6" y="4" width="4" height="16" rx="1" /><rect x="14" y="4" width="4" height="16" rx="1" /></svg>
                                        ) : (
                                          <svg viewBox="0 0 24 24" className={cn('h-5 w-5 ms-0.5', isMine ? 'text-primary-foreground' : 'text-primary')} fill="currentColor"><path d="M8 5v14l11-7z" /></svg>
                                        )}
                                      </button>
                                      <div className="flex-1 flex flex-col gap-1.5">
                                        <div className="flex items-center gap-[2px] h-[22px] cursor-pointer" dir="ltr" onClick={(e) => { e.stopPropagation(); if (voicePlayer.state.msgId === msg.id) { const rect = e.currentTarget.getBoundingClientRect(); const fraction = (e.clientX - rect.left) / rect.width; voicePlayer.seek(Math.max(0, Math.min(1, fraction))); } }}>
                                          {bars.map((h, i) => { const barProgress = i / bars.length; const isActive = voicePlayer.state.msgId === msg.id && barProgress < progress; return (<div key={i} className={cn('flex-1 rounded-full transition-colors duration-100', isActive ? (isMine ? 'bg-primary-foreground' : 'bg-primary') : (isMine ? 'bg-primary-foreground/25' : 'bg-muted-foreground/25'))} style={{ height: `${h * 22}px`, minWidth: '2px' }} />); })}
                                        </div>
                                        <div className="flex items-center justify-between" dir="ltr">
                                          <span className={cn('text-[10px] tabular-nums', isMine ? 'text-primary-foreground/45' : 'text-foreground/35')}>{isPlaying && duration ? formatDur(progress * duration) : (duration ? formatDur(duration) : '')}</span>
                                          <span className={cn('flex items-center gap-[3px] text-[11px] leading-none', isMine ? 'text-primary-foreground/50' : 'text-foreground/40')}>
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
                                <a href={chat.getFileUrl(msg)} target="_blank" rel="noopener noreferrer" className={cn('flex items-center gap-2', isMine ? 'text-primary-foreground' : 'text-foreground')} onClick={e => e.stopPropagation()}>
                                  <FileText className="h-5 w-5 shrink-0" /><span className="flex-1 truncate text-[13px]">{msg.file_name}</span><Download className="h-4 w-4 shrink-0 opacity-60" />
                                </a>
                                <div className={cn('mt-1 flex items-center justify-end gap-[3px] pt-1 text-[11px] leading-none', isMine ? 'text-primary-foreground/50' : 'text-foreground/40')} dir="ltr">
                                  <span>{new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                                  {isMine && (msg.read ? <CheckCheck className="h-[11px] w-[11px]" /> : <Check className="h-[11px] w-[11px]" />)}
                                </div>
                              </div>
                            ) : (
                              <div className="px-[10px] py-[6px]">
                                <p className="break-words whitespace-pre-wrap text-[14.5px] leading-[1.55] [word-break:normal] [unicode-bidi:plaintext]" dir="auto">
                                  <span>{msg.content}</span>
                                  {!msg.deleted && (<><span aria-hidden="true" className="inline-block w-1.5" /><span className={cn('inline-flex translate-y-[1px] items-center gap-[3px] align-bottom whitespace-nowrap text-[11px] leading-none select-none', isMine ? 'text-primary-foreground/50' : 'text-foreground/40')} dir="ltr">{msg.edited_at && <span className="text-[9px] italic">{chat.isAr ? 'معدّلة' : 'bearb.'}</span>}<span>{new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>{isMine && (msg.read ? <CheckCheck className="h-[11px] w-[11px]" /> : <Check className="h-[11px] w-[11px]" />)}</span></>)}
                                </p>
                              </div>
                            )}
                          </div>

                          {msgReactions.length > 0 && (
                            <div className={cn('flex gap-0.5 -mt-1 flex-wrap relative z-[1]', isMine ? 'justify-end pe-1' : 'justify-start ps-1')} dir="ltr">
                              {Object.entries(msgReactions.reduce((acc, r) => { acc[r.emoji] = (acc[r.emoji] || 0) + 1; return acc; }, {} as Record<string, number>)).map(([emoji, count]) => (
                                <button key={emoji} onClick={(e) => { e.stopPropagation(); chat.toggleReaction(msg.id, emoji); }} className="inline-flex items-center gap-0.5 bg-card/80 border border-border/20 rounded-full px-1 py-0.5 hover:scale-110 active:scale-90 transition-transform" aria-label={`${emoji} reaction`}>
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

              <AnimatePresence>
                {chat.typingUser && (
                  <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 10 }} className="flex justify-start mt-2">
                    <div className="bg-card border border-border/30 rounded-2xl rounded-bl-md px-4 py-2.5"><TypingDots /></div>
                  </motion.div>
                )}
              </AnimatePresence>

              {chat.activeConv && chat.imageUpload.uploads.filter(u => u.conversationId === chat.activeConv!.id).map(upload => (
                <div key={upload.tempId} className="flex justify-end mt-2">
                  <div className="relative max-w-[75%] rounded-[18px] rounded-br-[4px] overflow-hidden bg-primary">
                    <img src={upload.localPreviewUrl} alt="" className={cn('max-w-full max-h-60 object-cover transition-all duration-500', upload.status === 'uploading' && 'blur-[2px] brightness-75', upload.status === 'done' && 'blur-0 brightness-100')} />
                    {upload.status === 'uploading' && (
                      <div className="absolute inset-0 flex items-center justify-center">
                        <svg className="w-12 h-12 -rotate-90" viewBox="0 0 48 48"><circle cx="24" cy="24" r="20" fill="none" stroke="white" strokeOpacity="0.2" strokeWidth="3" /><circle cx="24" cy="24" r="20" fill="none" stroke="white" strokeWidth="3" strokeLinecap="round" strokeDasharray={`${2 * Math.PI * 20}`} strokeDashoffset={`${2 * Math.PI * 20 * (1 - upload.progress / 100)}`} className="transition-all duration-300" /></svg>
                        <span className="absolute text-white text-[11px] font-bold">{upload.progress}%</span>
                      </div>
                    )}
                    {upload.status === 'error' && (
                      <div className="absolute inset-0 flex items-center justify-center bg-black/50">
                        <button onClick={() => chat.imageUpload.retryUpload(upload.tempId)} className="px-4 py-2 rounded-full bg-destructive text-white text-sm font-medium active:scale-95 transition-transform">{chat.isAr ? 'إعادة المحاولة' : 'Wiederholen'}</button>
                      </div>
                    )}
                    <div className="px-3 py-1.5"><div className="flex items-center justify-end gap-[3px] text-[11px] leading-none text-primary-foreground/50" dir="ltr"><span>{new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span></div></div>
                  </div>
                </div>
              ))}

              <div ref={chat.messagesEndRef} />
            </div>

            {/* Scroll FAB */}
            <AnimatePresence>
              {chat.showScrollDown && (
                <motion.button initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.8 }} transition={{ type: 'spring', damping: 20, stiffness: 400 }} onClick={() => chat.scrollToBottom()} className="absolute bottom-24 end-4 z-10 w-9 h-9 rounded-full bg-card border border-border/40 flex items-center justify-center active:scale-90 transition-transform">
                  <ArrowDown className="w-4 h-4 text-muted-foreground" />
                </motion.button>
              )}
            </AnimatePresence>

            {/* Action Menu */}
            <AnimatePresence>
              {actionMenu && (() => {
                const spaceAbove = actionMenu.rect.top - actionMenu.containerRect.top;
                const showAbove = spaceAbove > 180;
                const viewportPadding = 12;
                const menuWidth = Math.min(Math.max(actionMenu.rect.width, 260), window.innerWidth - viewportPadding * 2);
                const anchoredLeft = actionMenu.isMine ? actionMenu.rect.right - menuWidth : actionMenu.rect.left;
                const menuLeft = Math.min(Math.max(anchoredLeft, viewportPadding), window.innerWidth - menuWidth - viewportPadding);
                const previewWidth = Math.min(actionMenu.rect.width, menuWidth);

                return (
                  <>
                    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.15 }} className="fixed inset-0 z-[60] bg-black/50 backdrop-blur-xl" onClick={() => { setActionMenu(null); chat.setShowExtraEmojis(false); }} />
                    <div className="fixed inset-0 z-[61] pointer-events-none" onClick={() => { setActionMenu(null); chat.setShowExtraEmojis(false); }}>
                      <motion.div initial={{ opacity: 0, scale: 0.92 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.92 }} transition={{ type: 'spring', damping: 28, stiffness: 450 }} className={cn("absolute pointer-events-auto flex flex-col", showAbove ? "flex-col-reverse" : "flex-col", actionMenu.isMine ? 'items-end' : 'items-start')} style={{ top: showAbove ? undefined : `${actionMenu.rect.top}px`, bottom: showAbove ? `${window.innerHeight - actionMenu.rect.top + 4}px` : undefined, left: `${menuLeft}px`, width: `${menuWidth}px`, maxWidth: `${menuWidth}px` }} onClick={e => e.stopPropagation()}>
                        <div className={cn('rounded-2xl text-[14px] overflow-hidden', actionMenu.isMine ? 'bg-primary text-primary-foreground rounded-br-md' : 'bg-card border border-border/30 text-foreground rounded-bl-md')} style={{ width: `${previewWidth}px`, maxWidth: '100%' }}>
                          {actionMenu.msg.message_type === 'text' && (
                            <div className="relative px-2 py-[3px]" style={{ minHeight: '24px' }}>
                              <span className="break-words whitespace-pre-wrap" dir="auto">{actionMenu.msg.content}<span className="inline-block align-bottom" style={{ width: actionMenu.isMine ? '62px' : '46px', height: '1px' }} /></span>
                              <span className={cn('absolute bottom-[3px] flex items-center gap-[3px] text-[10px] whitespace-nowrap', actionMenu.isMine ? 'text-primary-foreground/50' : 'text-muted-foreground/50', chat.isAr ? 'left-2' : 'right-2')}>
                                {new Date(actionMenu.msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                {actionMenu.isMine && (actionMenu.msg.read ? <CheckCheck className="h-[11px] w-[11px]" /> : <Check className="h-[11px] w-[11px]" />)}
                              </span>
                            </div>
                          )}
                          {actionMenu.msg.message_type === 'image' && <img src={chat.getFileUrl(actionMenu.msg)} alt="" className="max-w-full max-h-40 object-cover" />}
                        </div>

                        <div className={cn("bg-card/95 backdrop-blur-md border border-border/30 rounded-2xl overflow-hidden", showAbove ? "mb-1.5" : "mt-1.5")}>
                          <div className="flex items-center justify-center gap-0.5 px-2.5 py-2" dir="ltr">
                            {QUICK_EMOJIS.map(emoji => (
                              <button key={emoji} onClick={() => { chat.toggleReaction(actionMenu.msg.id, emoji); setActionMenu(null); chat.setShowExtraEmojis(false); }} className="text-[20px] hover:scale-125 active:scale-90 transition-transform px-[3px]" aria-label={`React with ${emoji}`}>{emoji}</button>
                            ))}
                            <button onClick={() => chat.setShowExtraEmojis(!chat.showExtraEmojis)} className={cn("w-7 h-7 rounded-full flex items-center justify-center transition-all ms-1", chat.showExtraEmojis ? "bg-primary text-primary-foreground" : "bg-muted/40 text-muted-foreground")} aria-label="More emojis">
                              <ChevronDown className={cn("w-3.5 h-3.5 transition-transform duration-200", chat.showExtraEmojis && "rotate-180")} />
                            </button>
                          </div>
                          <AnimatePresence>
                            {chat.showExtraEmojis && (
                              <motion.div initial={{ height: 0 }} animate={{ height: 'auto' }} exit={{ height: 0 }} transition={{ duration: 0.2 }} className="overflow-hidden">
                                <div className="h-px bg-border/20 mx-2.5" />
                                <div className="grid grid-cols-8 gap-0 px-2 py-2 max-h-[150px] overflow-y-auto" dir="ltr">
                                  {EXTRA_EMOJIS.map(emoji => (
                                    <button key={emoji} onClick={() => { chat.toggleReaction(actionMenu.msg.id, emoji); setActionMenu(null); chat.setShowExtraEmojis(false); }} className="text-[19px] hover:scale-110 active:scale-90 transition-transform p-1 rounded-lg hover:bg-accent/20 flex items-center justify-center" aria-label={`React with ${emoji}`}>{emoji}</button>
                                  ))}
                                </div>
                              </motion.div>
                            )}
                          </AnimatePresence>
                          <div className="h-px bg-border/20 mx-2.5" />
                          <div className="flex items-center justify-center gap-0.5 px-2 py-1.5 flex-wrap">
                            <button onClick={() => { chat.setReplyTo(actionMenu.msg); setActionMenu(null); chat.setShowExtraEmojis(false); chat.inputRef.current?.focus(); }} className="flex items-center gap-1.5 px-3 py-2 rounded-xl hover:bg-accent/30 active:bg-accent/50 transition-colors" aria-label={chat.isAr ? 'رد' : 'Reply'}><Reply className="w-3.5 h-3.5 text-muted-foreground" /><span className="text-[11px] text-muted-foreground font-medium">{chat.isAr ? 'رد' : 'Rply'}</span></button>
                            {actionMenu.msg.message_type === 'text' && actionMenu.msg.content && (
                              <button onClick={() => { chat.copyMessage(actionMenu.msg.content); setActionMenu(null); chat.setShowExtraEmojis(false); }} className="flex items-center gap-1.5 px-3 py-2 rounded-xl hover:bg-accent/30 active:bg-accent/50 transition-colors" aria-label={chat.isAr ? 'نسخ' : 'Copy'}><Copy className="w-3.5 h-3.5 text-muted-foreground" /><span className="text-[11px] text-muted-foreground font-medium">{chat.isAr ? 'نسخ' : 'Copy'}</span></button>
                            )}
                            <button onClick={() => { chat.pinMessage(actionMenu.msg); setActionMenu(null); }} className="flex items-center gap-1.5 px-3 py-2 rounded-xl hover:bg-accent/30 active:bg-accent/50 transition-colors" aria-label={chat.isAr ? 'تثبيت' : 'Pin'}>
                              {chat.pinnedMessage?.id === actionMenu.msg.id ? <PinOff className="w-3.5 h-3.5 text-muted-foreground" /> : <Pin className="w-3.5 h-3.5 text-muted-foreground" />}
                              <span className="text-[11px] text-muted-foreground font-medium">{chat.pinnedMessage?.id === actionMenu.msg.id ? (chat.isAr ? 'إلغاء' : 'Unpin') : (chat.isAr ? 'تثبيت' : 'Pin')}</span>
                            </button>
                            {actionMenu.isMine && actionMenu.msg.message_type === 'text' && !actionMenu.msg.deleted && (
                              <button onClick={() => { chat.startEditMessage(actionMenu.msg); setActionMenu(null); chat.setShowExtraEmojis(false); }} className="flex items-center gap-1.5 px-3 py-2 rounded-xl hover:bg-accent/30 active:bg-accent/50 transition-colors" aria-label={chat.isAr ? 'تعديل' : 'Edit'}><Pencil className="w-3.5 h-3.5 text-muted-foreground" /><span className="text-[11px] text-muted-foreground font-medium">{chat.isAr ? 'تعديل' : 'Edit'}</span></button>
                            )}
                            {actionMenu.isMine && !actionMenu.msg.deleted && (
                              <button onClick={() => { chat.deleteMessage(actionMenu.msg.id); setActionMenu(null); chat.setShowExtraEmojis(false); }} className="flex items-center gap-1.5 px-3 py-2 rounded-xl hover:bg-destructive/10 active:bg-destructive/20 transition-colors" aria-label={chat.isAr ? 'حذف' : 'Delete'}><Trash2 className="w-3.5 h-3.5 text-destructive" /><span className="text-[11px] text-destructive font-medium">{chat.isAr ? 'حذف' : 'Del'}</span></button>
                            )}
                          </div>
                        </div>
                      </motion.div>
                    </div>
                  </>
                );
              })()}
            </AnimatePresence>

            {/* Chat Input */}
            <ChatInput
              isAr={chat.isAr}
              isRecording={isRecording}
              recordingTime={recordingTime}
              newMessage={chat.newMessage}
              setNewMessage={chat.setNewMessage}
              replyTo={chat.replyTo}
              setReplyTo={chat.setReplyTo}
              editingMessage={chat.editingMessage}
              setEditingMessage={chat.setEditingMessage}
              stagedPreviews={chat.stagedPreviews}
              uploading={chat.uploading}
              inputRef={chat.inputRef as React.RefObject<HTMLTextAreaElement>}
              fileInputRef={chat.fileInputRef as React.RefObject<HTMLInputElement>}
              sendMessage={chat.sendMessage}
              saveEditMessage={chat.saveEditMessage}
              sendStagedImages={chat.sendStagedImages}
              startRecording={startRecording}
              stopRecording={stopRecording}
              removeStagedImage={chat.removeStagedImage}
              clearStagedImages={chat.clearStagedImages}
              resizeComposer={chat.resizeComposer}
              broadcastTyping={chat.broadcastTyping}
              scrollToBottom={chat.scrollToBottom}
              activeConvOtherName={chat.activeConv?.otherDisplayName || chat.activeConv?.otherUsername}
              userId={chat.user?.id}
              stagedImagesCount={chat.stagedImages.length}
            />
          </>
        )}
      </SheetContent>

      <ImageLightbox
        src={chat.lightboxSrc}
        open={chat.lightboxOpen}
        onClose={() => chat.setLightboxOpen(false)}
        originRect={chat.lightboxRect}
      />
    </Sheet>
  );
}
