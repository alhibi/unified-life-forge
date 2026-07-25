import { AnimatePresence, motion } from 'framer-motion';
import React, { useEffect, useMemo, useState } from 'react';

import ImageLightbox from '@/components/ImageLightbox';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Sheet, SheetContent } from '@/components/ui/sheet';
import { useVoicePlayer } from '@/contexts/VoicePlayerContext';
import { readableFileName, unpackFileName } from '@/lib/chat/imageMeta';
import {
  ArrowDown,
  Check,
  ChevronRight,
  Download,
  FileText,
  Pin,
  Search,
  Timer,
  Trash,
  Upload,
  Volume2,
  VolumeX,
  X,
} from '@/lib/icons';
import { setInChatConversation } from '@/lib/inChatConversation';
import { cn, debounce } from '@/lib/utils';

import { useAppleEmojiReady } from './appleEmoji';
import ChatImage from './ChatImage';
import ChatInput from './ChatInput';
import {
  formatClockTime,
  formatDateSeparator,
  getSignedFileUrl,
  renderHighlighted,
  renderRichText,
  stripMarkers,
} from './chatUtils';
import {
  WALLPAPERS,
} from './constants';
import ConversationList from './ConversationList';
import { getBubbleRadius } from './drawer/bubbleRadius';
import { renderAvatar } from './drawer/chatAvatar';
import ChatHeader from './drawer/ChatHeader';
import MessageActionMenu from './drawer/MessageActionMenu';
import ProfilePanel from './drawer/ProfilePanel';
import { useFileDropZone } from './drawer/useFileDropZone';
import { useMessageGestures } from './drawer/useMessageGestures';
import VoiceBubble from './drawer/VoiceBubble';
import ForwardPicker from './ForwardPicker';
import { LinkPreview } from './LinkPreview';
import {
  ForwardedBadge,
  MessageTicks,
  ReactionPill,
  SwipeableMessage,
  TypingDots,
} from './MessageBubble';
import MessageInfo from './MessageInfo';
import { MessageRowErrorBoundary } from './MessageRowErrorBoundary';
import type { ActionMenuState, ChatDrawerProps, Message } from './types';
import { useChat } from './useChat';
import { useVoiceRecording } from './useVoiceRecording';
import { VirtualMessageList, type VirtualMessageListHandle } from './VirtualMessageList';
import WallpaperPicker from './WallpaperPicker';

// ─────────────────────────────────────────────────────────────────────────────
// ChatDrawer – root of the entire messaging experience.
// ─────────────────────────────────────────────────────────────────────────────
export default function ChatDrawer({
  open,
  onOpenChange,
  unreadCount: _unreadCount,
  onUnreadChange,
  inline = false,
}: ChatDrawerProps) {
  const chat = useChat({ open, onUnreadChange });
  const voice = useVoiceRecording({
    activeConvId: chat.activeConv?.id || null,
    userId: chat.user?.id,
    sendMessage: chat.sendMessage,
  });
  const voicePlayer = useVoicePlayer();

  // Trigger the Apple-emoji map preload (lazy-loads `@emoji-mart/data` and
  // builds the native→unified lookup used by `renderRichText`). The boolean
  // return value flips once the map is ready, which causes this component
  // to re-render so messages already on screen swap from native unicode
  // emojis to <img>-based Apple artwork. Reading the value (even if unused
  // syntactically) is what subscribes us — keep the assignment.
  const _appleEmojiReady = useAppleEmojiReady();

  // Auto-advance voice playback within the active conversation, just like
  // Telegram. The resolver looks up the next non-deleted voice message AFTER
  // the one that just ended and returns its signed URL, sender label and
  // id; the VoicePlayer then queues it. Disabled when the conversation
  // changes or the drawer closes.
  React.useEffect(() => {
    voicePlayer.setOnEnded(async (finishedId, conversationId) => {
      if (!chat.activeConv || chat.activeConv.id !== conversationId) return null;
      const list = chat.messages;
      const idx = list.findIndex((m) => m.id === finishedId);
      if (idx < 0) return null;
      for (let i = idx + 1; i < list.length; i++) {
        const next = list[i];
        if (next.message_type !== 'voice' || next.deleted) continue;
        let url = chat.getFileUrl(next);
        if (!url && next.file_url) {
          // Fall back to a fresh signed URL if our cache lost it.
          try {
            const fresh = await getSignedFileUrl(next.file_url);
            if (fresh) url = fresh;
          } catch {
            /* no-op */
          }
        }
        if (!url) continue;
        const senderName =
          next.sender_id === chat.user?.id
            ? 'أنت'
            : chat.activeConv?.otherDisplayName || chat.activeConv?.otherUsername || '';
        return { msgId: next.id, url, senderName };
      }
      return null;
    });
    return () => voicePlayer.setOnEnded(undefined);
    // We deliberately omit `voicePlayer` from deps because setOnEnded is
    // stable. Including it would tear down the resolver every render.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [chat.activeConv?.id, chat.messages, chat.user?.id, true]);

  const [actionMenu, setActionMenu] = useState<ActionMenuState | null>(null);
  const [convSearchQuery, setConvSearchQuery] = useState('');
  const [showConvSearch, setShowConvSearch] = useState(false);
  const [messageInfoTarget, setMessageInfoTarget] = useState<Message | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  // Debounce search input to prevent excessive filtering
  const [debouncedSearchQuery, setDebouncedSearchQuery] = useState('');

  useEffect(() => {
    const debouncedFn = debounce((query: string) => {
      setDebouncedSearchQuery(query);
    }, 350);

    debouncedFn(convSearchQuery);

    return () => {
      // Clear the debounced function
      setDebouncedSearchQuery(convSearchQuery);
    };
  }, [convSearchQuery]);

  // Imperative handle for the virtualized message list. Lets us route
  // scroll- (reply jumps, search hops) and scroll- through
  // the virtualizer when active. NULL when the eager (non-virtualized)
  // path is used — callers should fall back to getElementById in that case.
  const virtualListRef = React.useRef<VirtualMessageListHandle | null>(null);

  // Escape key collapses one layer at a time: overlays first, then the
  // active conversation, finally leaves the page. Matches what users
  // already get from clicking the in-app back arrows.
  React.useEffect(() => {
    if (!inline) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== 'Escape') return;
      if (showDeleteConfirm) {
        setShowDeleteConfirm(false);
        return;
      }
      if (messageInfoTarget) {
        setMessageInfoTarget(null);
        return;
      }
      if (actionMenu) {
        setActionMenu(null);
        return;
      }
      if (showConvSearch) {
        setShowConvSearch(false);
        setConvSearchQuery('');
        return;
      }
      if (chat.showChatMenu) {
        chat.setShowChatMenu(false);
        return;
      }
      if (chat.showProfilePopup) {
        chat.setShowProfilePopup(false);
        return;
      }
      if (chat.showWallpaperPicker) {
        chat.setShowWallpaperPicker(false);
        return;
      }
      if (chat.forwardingMessages) {
        chat.cancelForward();
        return;
      }
      if (chat.showNewChat) {
        chat.setShowNewChat(false);
        return;
      }
      if (chat.activeConv) {
        chat.setActiveConv(null);
        return;
      }
      onOpenChange(false);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [inline, actionMenu, showConvSearch, chat, onOpenChange, messageInfoTarget]);

  // Hide the global BottomNav while the user is inside an active 1:1
  // conversation on the dedicated /chat page. The legacy surface keeps
  // the same URL whether you're on the list or in a thread, so a path
  // gate isn't enough — we toggle a small external signal that BottomNav
  // subscribes to. Only the inline (full-page) path participates; the
  // sheet/drawer mode is layered on top of the regular UI and shouldn't
  // change the host page's chrome.
  //
  // We deliberately split the sync from the unmount-cleanup so that
  // navigating between conversations doesn't briefly flip the bar back
  // on (`setInChatConversation(false)` running between effect tear-down
  // and re-run would unhide → rehide within the same paint).
  React.useEffect(() => {
    if (!inline) return;
    const insideConversation = !!chat.activeConv && !chat.showNewChat;
    setInChatConversation(insideConversation);
  }, [inline, chat.activeConv, chat.showNewChat]);
  React.useEffect(() => {
    if (!inline) return;
    return () => {
      // Restore the bar when the page unmounts (history pop, route change,
      // logout, etc.). Idempotent — safe even if the bar is already shown.
      setInChatConversation(false);
    };
  }, [inline]);

  const BackIcon = ChevronRight;

  // Unread ignoring archived + muted shown in the tab badge.
  const totalUnread = useMemo(() => {
    return chat.conversations.reduce((sum, c) => {
      if (chat.chatPrefs.isArchived(c.id)) return sum;
      if (chat.chatPrefs.isMuted(c.id)) return sum;
      return sum + (c.unreadCount || 0);
    }, 0);
  }, [chat.conversations, chat.chatPrefs]);

  // Filtered list for the conversation screen (matches tab + search).
  // Using debouncedSearchQuery to prevent excessive filtering on every keystroke
  const filteredConversations = useMemo(() => {
    let list = chat.filteredByTab;
    if (debouncedSearchQuery.trim()) {
      const q = debouncedSearchQuery.toLowerCase();
      list = list.filter(
        (c) =>
          (c.otherDisplayName || c.otherUsername || '').toLowerCase().includes(q) ||
          stripMarkers(c.lastMessage || '')
            .toLowerCase()
            .includes(q),
      );
    }
    return list;
  }, [chat.filteredByTab, debouncedSearchQuery]);

  // Pointer gestures for message bubbles: long-press / contextmenu to open the
  // action menu, tap-to-select while in selection mode, double-tap to react.
  // See chat/drawer/useMessageGestures.ts.
  const {
    openActionMenu,
    beginLongPress,
    continueLongPress,
    endLongPress,
    clearLongPress,
    handleDoubleTapReact,
  } = useMessageGestures({
    selectionMode: chat.selectionMode,
    hasUser: !!chat.user,
    messagesContainerRef: chat.messagesContainerRef,
    setActionMenu,
    toggleSelect: chat.toggleSelect,
    toggleReaction: chat.toggleReaction,
  });


  // Keyboard shortcuts: Esc cascades through overlays/modes; Ctrl/Cmd+K opens
  // search (in-chat when a conversation is open, otherwise conversation list).
  React.useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (messageInfoTarget) {
          setMessageInfoTarget(null);
          return;
        }
        if (actionMenu) {
          setActionMenu(null);
          chat.setShowExtraEmojis(false);
          return;
        }
        if (chat.showChatMenu) {
          chat.setShowChatMenu(false);
          return;
        }
        if (chat.showSelfDestructMenu) {
          chat.setShowSelfDestructMenu(false);
          return;
        }
        if (chat.showEmojiPicker) {
          chat.setShowEmojiPicker(false);
          return;
        }
        if (chat.showSearch) {
          chat.setShowSearch(false);
          return;
        }
        if (chat.selectionMode) {
          chat.clearSelection();
          return;
        }
        if (showConvSearch) {
          setShowConvSearch(false);
          setConvSearchQuery('');
          return;
        }
        return;
      }
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        if (chat.activeConv) {
          chat.setShowSearch(true);
        } else {
          setShowConvSearch(true);
        }
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [
    open,
    actionMenu,
    chat.showChatMenu,
    chat.showSelfDestructMenu,
    chat.showEmojiPicker,
    chat.showSearch,
    chat.selectionMode,
    chat.activeConv,
    showConvSearch,
    chat,
    messageInfoTarget,
  ]);

  // Drag-and-drop attachments. See chat/drawer/useFileDropZone.ts.
  const { isDraggingFiles, dragHandlers } = useFileDropZone({
    enabled: !!chat.activeConv,
    onFiles: chat.addFilesFromDrop,
  });


  // ── Wallpaper resolution ──────────────────────────────────────────────────
  const currentWallpaperId = chat.chatPrefs.getWallpaper(chat.activeConv?.id);
  const currentWallpaper = WALLPAPERS.find((w) => w.id === currentWallpaperId) || WALLPAPERS[0];
  const isDarkBg = currentWallpaper.isDark;

  // ── Reactions index ───────────────────────────────────────────────────────
  // The render loop used to call `chat.reactions.filter(...)` for every
  // message — O(N·M) per render where N is rendered messages and M is the
  // total reaction count. Indexing once per render brings that to O(N+M)
  // and recomputes only when the reactions array reference changes. With
  // virtualization this is the difference between a smooth scroll and
  // dropped frames in chats with thousands of reactions.
  const reactionsByMsgId = useMemo(() => {
    const map = new Map<string, typeof chat.reactions>();
    for (const r of chat.reactions) {
      const list = map.get(r.message_id);
      if (list) list.push(r);
      else map.set(r.message_id, [r]);
    }
    return map;
  }, [chat.reactions]);

  if (!chat.user) {
    const signInPrompt = (
      <div className="flex flex-col items-center justify-center gap-3 h-full px-6 text-center">
        <p className="text-muted-foreground text-sm">{'يرجى تسجيل الدخول أولاً'}</p>
      </div>
    );
    if (inline) {
      return (
        <div
          className="flex flex-col bg-background"
          style={{
            minHeight: '100dvh',
            paddingBottom: 'calc(env(safe-area-inset-bottom, 0px) + 96px)',
          }}
        >
          {signInPrompt}
        </div>
      );
    }
    return (
      <Sheet open={open} onOpenChange={onOpenChange}>
        <SheetContent
          side={'right'}
          className="w-full sm:max-w-md p-0 [&>button[class*='absolute']]:hidden"
        >
          {signInPrompt}
        </SheetContent>
      </Sheet>
    );
  }

  const closeAll = () => {
    onOpenChange(false);
    chat.setActiveConv(null);
    chat.setShowNewChat(false);
    chat.setShowChatMenu(false);
    chat.setShowProfilePopup(false);
    setShowConvSearch(false);
    setConvSearchQuery('');
  };

  const body = (
    <>
      <input
        type="file"
        ref={chat.fileInputRef}
        className="hidden"
        accept="image/*,application/pdf,.doc,.docx,.txt,.zip"
        multiple
        onChange={chat.handleFileUpload}
      />

      {/* Profile panel for the active conversation. See
          chat/drawer/ProfilePanel.tsx. */}
      <ProfilePanel
        chat={chat}
        wallpaperLabel={currentWallpaper.labelAr}
        BackIcon={BackIcon}
        onRequestDeleteConversation={() => setShowDeleteConfirm(true)}
      />


      {/* ───────────────── CONVERSATION LIST SCREEN ───────────────── */}
      {!chat.activeConv && !chat.showNewChat ? (
        <>
          <div className="px-4 h-14 flex items-center justify-between border-b border-border/20 shrink-0">
            <div className="flex items-center gap-3">
              <button
                onClick={() => onOpenChange(false)}
                className="w-9 h-9 rounded-full flex items-center justify-center active:bg-accent/40 transition-colors"
                aria-label={'رجوع'}
              >
                <BackIcon className="w-5 h-5 text-foreground" />
              </button>
              {!showConvSearch && (
                <h1 className="text-[17px] font-bold tracking-tight">{'الرسائل'}</h1>
              )}
            </div>
            {showConvSearch ? (
              <div className="flex-1 flex items-center gap-2 ms-2">
                <div className="flex-1 flex items-center bg-muted/30 rounded-full px-3 h-9">
                  <Search className="w-4 h-4 text-muted-foreground/50 shrink-0" />
                  <input
                    type="text"
                    value={convSearchQuery}
                    onChange={(e) => setConvSearchQuery(e.target.value)}
                    placeholder={'بحث...'}
                    className="flex-1 bg-transparent text-[14px] outline-none ms-2 placeholder:text-muted-foreground/40"
                    dir="auto"
                    autoFocus
                  />
                </div>
                <button
                  onClick={() => {
                    setShowConvSearch(false);
                    setConvSearchQuery('');
                  }}
                  className="w-8 h-8 rounded-full flex items-center justify-center active:bg-accent/40"
                >
                  <X className="w-4 h-4 text-muted-foreground" />
                </button>
              </div>
            ) : (
              <div className="flex items-center gap-1">
                <button
                  onClick={() => chat.chatPrefs.setSoundEnabled(!chat.chatPrefs.prefs.soundEnabled)}
                  className="w-9 h-9 rounded-full flex items-center justify-center active:bg-accent/40 transition-colors"
                  aria-label={chat.chatPrefs.prefs.soundEnabled ? 'كتم الصوت' : 'تفعيل الصوت'}
                >
                  {chat.chatPrefs.prefs.soundEnabled ? (
                    <Volume2 className="w-[18px] h-[18px] text-muted-foreground" />
                  ) : (
                    <VolumeX className="w-[18px] h-[18px] text-muted-foreground" />
                  )}
                </button>
                <button
                  onClick={() => setShowConvSearch(true)}
                  className="w-9 h-9 rounded-full flex items-center justify-center active:bg-accent/40 transition-colors"
                  aria-label={'بحث'}
                >
                  <Search className="w-5 h-5 text-muted-foreground" />
                </button>
              </div>
            )}
          </div>
          <ConversationList
            conversations={filteredConversations}
            currentUserId={chat.user.id}
            filter={chat.conversationFilter}
            onFilterChange={chat.setConversationFilter}
            totalUnread={totalUnread}
            onSelect={chat.setActiveConv}
            onNewChat={() => chat.setShowNewChat(true)}
            isPinned={chat.chatPrefs.isPinned}
            isMuted={chat.chatPrefs.isMuted}
            isArchived={chat.chatPrefs.isArchived}
            togglePinned={chat.chatPrefs.togglePinned}
            toggleMuted={chat.chatPrefs.toggleMuted}
            toggleArchived={chat.chatPrefs.toggleArchived}
            getDraft={chat.chatPrefs.getDraft}
            searchQuery={convSearchQuery}
            isLoading={chat.conversationsLoading && chat.conversations.length === 0}
            typingByConv={chat.typingByConv}
            onlineUserIds={chat.onlineUserIds}
          />
        </>
      ) : /* ───────────────── NEW CHAT SCREEN ───────────────── */
      chat.showNewChat ? (
        <>
          <div className="px-4 h-14 flex items-center gap-3 border-b border-border/20 shrink-0">
            <button
              onClick={() => {
                chat.setShowNewChat(false);
                chat.setSearchUser('');
              }}
              className="w-9 h-9 rounded-full flex items-center justify-center active:bg-accent/40 transition-colors"
              aria-label={'رجوع'}
            >
              <BackIcon className="w-5 h-5 text-foreground" />
            </button>
            <h1 className="text-[17px] font-bold tracking-tight">{'محادثة جديدة'}</h1>
          </div>
          <div className="p-4 space-y-4">
            <div className="flex gap-2">
              <Input
                placeholder={'ابحث باسم المستخدم...'}
                value={chat.searchUser}
                onChange={(e) => chat.setSearchUser(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && !chat.searching && chat.searchForUser()}
                className="flex-1 rounded-full h-10"
                dir="auto"
                disabled={chat.searching}
              />
              <Button
                size="icon"
                className="rounded-full h-10 w-10"
                onClick={chat.searchForUser}
                disabled={chat.searching || !chat.searchUser.trim()}
                aria-label={'بحث'}
              >
                {chat.searching ? (
                  <div
                    className="w-4 h-4 border-2 border-primary-foreground/30 border-t-primary-foreground rounded-full animate-spin"
                    aria-hidden="true"
                  />
                ) : (
                  <Search className="h-4 w-4" />
                )}
              </Button>
            </div>
            {chat.searching && (
              <p className="text-muted-foreground text-sm text-center" aria-live="polite">
                {'جاري البحث...'}
              </p>
            )}
            {!chat.searching && chat.searchError && (
              <p className="text-destructive text-sm text-center">{chat.searchError}</p>
            )}
            {chat.searchResult && !chat.searching && (
              <motion.button
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                onClick={chat.startConversation}
                disabled={chat.loading}
                className="w-full flex items-center gap-3 p-4 rounded-2xl bg-accent/20 active:bg-accent/40 transition-colors disabled:opacity-60"
              >
                {renderAvatar(
                  chat.searchResult.username,
                  chat.searchResult.avatar_url,
                  'h-14 w-14',
                )}
                <div className="text-start flex-1 min-w-0">
                  <span className="font-semibold text-[15px] block truncate">
                    {chat.searchResult.display_name || chat.searchResult.username}
                  </span>
                  {chat.searchResult.display_name &&
                    chat.searchResult.display_name !== chat.searchResult.username && (
                      <span className="text-[13px] text-muted-foreground">
                        @{chat.searchResult.username}
                      </span>
                    )}
                </div>
                {chat.loading && (
                  <div
                    className="w-5 h-5 border-2 border-primary/30 border-t-primary rounded-full animate-spin shrink-0"
                    aria-label={'جاري البدء'}
                  />
                )}
              </motion.button>
            )}
          </div>
        </>
      ) : (
        /* ───────────────── CHAT VIEW ───────────────── */
        <>
          {/* Conversation header. See chat/drawer/ChatHeader.tsx. */}
          <ChatHeader chat={chat} BackIcon={BackIcon} totalUnread={totalUnread} />


          {/* ── Search Bar ── */}
          <AnimatePresence>
            {chat.showSearch && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                className="overflow-hidden border-b border-border/20 shrink-0"
              >
                <div className="flex items-center gap-2 px-3 h-12">
                  <Search className="w-4 h-4 text-muted-foreground/50 shrink-0" />
                  <input
                    type="text"
                    value={chat.chatSearchQuery}
                    onChange={(e) => chat.searchInChat(e.target.value)}
                    placeholder={'بحث في المحادثة...'}
                    className="flex-1 bg-transparent text-[14px] outline-none placeholder:text-muted-foreground/40"
                    dir="auto"
                    autoFocus
                  />
                  {chat.searchResults.length > 0 && (
                    <span className="text-[11px] text-muted-foreground tabular-nums shrink-0">
                      {chat.searchIndex + 1}/{chat.searchResults.length}
                    </span>
                  )}
                  <div className="flex gap-0.5 shrink-0">
                    <button
                      onClick={() => chat.navigateSearch('up')}
                      className="w-7 h-7 rounded-full flex items-center justify-center active:bg-accent/30"
                    >
                      <ChevronRight className="w-3.5 h-3.5 rotate-[-90deg] text-muted-foreground" />
                    </button>
                    <button
                      onClick={() => chat.navigateSearch('down')}
                      className="w-7 h-7 rounded-full flex items-center justify-center active:bg-accent/30"
                    >
                      <ChevronRight className="w-3.5 h-3.5 rotate-90 text-muted-foreground" />
                    </button>
                  </div>
                  <button
                    onClick={() => chat.setShowSearch(false)}
                    className="w-7 h-7 rounded-full flex items-center justify-center active:bg-accent/30"
                  >
                    <X className="w-3.5 h-3.5 text-muted-foreground" />
                  </button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* ── Pinned Message ── */}
          <AnimatePresence>
            {chat.pinnedMessage && !chat.pinnedMessage.deleted && (
              <motion.button
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                className="w-full border-b border-border/20 px-3 py-2 flex items-center gap-2.5 bg-accent/5 active:bg-accent/15 transition-colors text-start overflow-hidden shrink-0"
                onClick={() => {
                  const el = document.getElementById(`msg-${chat.pinnedMessage!.id}`);
                  el?.scrollIntoView({ behavior: 'smooth', block: 'center' });
                }}
              >
                <Pin className="w-3.5 h-3.5 text-primary shrink-0 rotate-45" />
                <div className="flex-1 min-w-0">
                  <p className="text-[10px] text-primary font-semibold">{'رسالة مثبتة'}</p>
                  <p className="text-[12px] text-foreground/70 truncate" dir="auto">
                    {chat.pinnedMessage.message_type === 'text'
                      ? stripMarkers(chat.pinnedMessage.content)
                      : chat.pinnedMessage.message_type === 'image'
                        ? '📷'
                        : chat.pinnedMessage.message_type === 'voice'
                          ? '🎤'
                          : '📎'}
                  </p>
                </div>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    chat.pinMessage(chat.pinnedMessage!);
                  }}
                  className="shrink-0 w-6 h-6 rounded-full flex items-center justify-center active:bg-muted/50"
                >
                  <X className="w-3 h-3 text-muted-foreground" />
                </button>
              </motion.button>
            )}
          </AnimatePresence>

          {/* ── Messages ── */}
          <div
            ref={chat.messagesContainerRef}
            className={cn(
              'flex-1 overflow-y-auto px-3 py-3 overscroll-contain scroll-smooth will-change-scroll relative',
              isDarkBg && 'text-white',
            )}
            style={
              {
                WebkitOverflowScrolling: 'touch',
                background: currentWallpaper.background,
              } as React.CSSProperties
            }
            onScroll={chat.handleScroll}
            onClick={() => {
              chat.setShowChatMenu(false);
              setActionMenu(null);
              chat.setShowExtraEmojis(false);
            }}
            {...dragHandlers}
          >
            <AnimatePresence>
              {isDraggingFiles && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.98 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.98 }}
                  className="absolute inset-2 z-header rounded-2xl border-2 border-dashed border-primary bg-card flex flex-col items-center justify-center gap-3 pointer-events-none"
                  aria-hidden="true"
                >
                  <div className="w-14 h-14 rounded-full bg-primary/20 flex items-center justify-center">
                    <Upload className="w-7 h-7 text-primary" />
                  </div>
                  <p className="text-[14px] font-semibold text-primary">
                    {'أفلت الملفات هنا للإرسال'}
                  </p>
                </motion.div>
              )}
            </AnimatePresence>
            {chat.messagesLoading && chat.messages.length === 0 && (
              <div className="flex flex-col gap-3 py-4" aria-hidden="true">
                {[0, 1, 2, 3, 4].map((i) => {
                  const mine = i % 2 === 1;
                  const width = 140 + ((i * 37) % 140);
                  return (
                    <div key={i} className={cn('flex', mine ? 'justify-end' : 'justify-start')}>
                      <div
                        className="skeleton h-10"
                        style={{
                          width,
                          borderRadius: mine ? '18px 4px 4px 18px' : '4px 18px 18px 4px',
                        }}
                      />
                    </div>
                  );
                })}
              </div>
            )}

            {!chat.messagesLoading && chat.messages.length === 0 && (
              <div className="flex flex-col items-center justify-center h-full text-center gap-3 py-16 opacity-60">
                <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center">
                  <span className="text-2xl">👋</span>
                </div>
                <div>
                  <p className="text-[14px] font-semibold text-foreground/70">
                    {'لا توجد رسائل بعد'}
                  </p>
                  <p className="text-[12px] text-muted-foreground/70 mt-1">
                    {'أرسل رسالتك الأولى لبدء المحادثة'}
                  </p>
                </div>
              </div>
            )}

            {chat.messages.length > 0 && (
              <VirtualMessageList
                messages={chat.messages}
                scrollElementRef={chat.messagesContainerRef}
                handleRef={virtualListRef}
                renderRow={(msg, idx) => {
                  const isMine = msg.sender_id === chat.user!.id;
                  const msgReactions = reactionsByMsgId.get(msg.id) ?? [];
                  const { sameSenderAsPrev, sameSenderAsNext, showDate } = chat.getMessageMeta(idx);
                  const fadeOpacity = chat.getMessageOpacity(msg);
                  const isFading = msg.expires_at && fadeOpacity < 1;
                  const bubbleStyle = getBubbleRadius(isMine, sameSenderAsPrev, sameSenderAsNext);
                  const isSelected = chat.selectedIds.has(msg.id);
                  const isFirstUnread = msg.id === chat.firstUnreadId;

                  return (
                    <MessageRowErrorBoundary isMine={isMine}>
                      <>
                        {/* Date separator */}
                        {showDate && (
                          <div className="flex justify-center py-4">
                            <span className="text-[11px] text-muted-foreground/70 bg-background px-3 py-1 rounded-full font-medium ">
                              {formatDateSeparator(msg.created_at)}
                            </span>
                          </div>
                        )}

                        {/* "New messages" divider */}
                        {isFirstUnread && (
                          <div className="flex items-center gap-2 my-3">
                            <div className="flex-1 h-px bg-primary/30" />
                            <span className="text-[10px] font-semibold text-primary uppercase tracking-wider bg-primary/10 px-2 py-0.5 rounded-full">
                              {'رسائل جديدة'}
                            </span>
                            <div className="flex-1 h-px bg-primary/30" />
                          </div>
                        )}

                        <div
                          id={`msg-${msg.id}`}
                          className={cn(
                            'flex relative transition-colors rounded-md -mx-1 px-1',
                            isMine ? 'justify-end' : 'justify-start',
                            sameSenderAsPrev ? 'mt-[2px]' : 'mt-3',
                            isSelected && 'bg-primary/10',
                          )}
                          style={{
                            opacity: fadeOpacity,
                            transition: 'opacity 2s ease-out, background-color 0.15s',
                          }}
                          onClick={(e) => {
                            if (chat.selectionMode && !msg.deleted) {
                              e.stopPropagation();
                              chat.toggleSelect(msg.id);
                            }
                          }}
                        >
                          <SwipeableMessage
                            isMine={isMine}
                            deleted={msg.deleted}
                            disabled={chat.selectionMode}
                            onSwipeReply={() => {
                              chat.setReplyTo(msg);
                              chat.inputRef.current?.focus();
                            }}
                          >
                            <div
                              className={cn('relative group w-fit min-w-[72px] max-w-[82%]')}
                              onContextMenu={(e) => {
                                e.preventDefault();
                                openActionMenu(msg, isMine, e.currentTarget as HTMLElement);
                              }}
                              onPointerDown={(e) => {
                                handleDoubleTapReact(msg, e);
                                beginLongPress(msg, isMine, e);
                              }}
                              onPointerMove={continueLongPress}
                              onPointerUp={(e) => endLongPress(msg, e)}
                              onPointerCancel={(e) => clearLongPress(e.pointerId)}
                              onPointerLeave={(e) => clearLongPress(e.pointerId)}
                              role="article"
                              aria-label={
                                isMine
                                  ? 'رسالتك'
                                  : chat.activeConv?.otherDisplayName ||
                                    chat.activeConv?.otherUsername ||
                                    ''
                              }
                            >
                              {/* Selection checkmark */}
                              {chat.selectionMode && !msg.deleted && (
                                <div
                                  className={cn(
                                    'absolute top-1 z-raised w-5 h-5 rounded-full border-2 flex items-center justify-center transition-colors',
                                    isMine ? 'start-1' : 'end-1',
                                    isSelected
                                      ? 'bg-primary border-primary'
                                      : 'bg-background/80 border-border/50',
                                  )}
                                >
                                  {isSelected && (
                                    <Check className="w-3 h-3 text-primary-foreground" />
                                  )}
                                </div>
                              )}

                              <div
                                className={cn(
                                  'overflow-hidden text-[15px] leading-[1.5]',
                                  msg.deleted
                                    ? 'bg-muted/20 text-muted-foreground/50 italic'
                                    : isMine
                                      ? isDarkBg
                                        ? 'bg-primary/90 text-primary-foreground'
                                        : 'bg-primary/15 text-foreground'
                                      : isDarkBg
                                        ? 'bg-black/70 text-white border border-white/10'
                                        : 'bg-card border border-border/15 text-foreground',
                                )}
                                style={bubbleStyle}
                              >
                                {/* Forwarded provenance — Telegram-style "↪ Forwarded from Author" */}
                                {msg.forwarded_from_sender_id && !msg.deleted && (
                                  <div className="px-3 pt-2 -mb-1">
                                    <ForwardedBadge
                                      name={chat.getForwardedName(msg.forwarded_from_sender_id)}
                                    />
                                  </div>
                                )}

                                {/* Reply preview inside bubble */}
                                {msg.reply_to_id &&
                                  !msg.deleted &&
                                  (() => {
                                    const repliedMsg = chat.messages.find(
                                      (m) => m.id === msg.reply_to_id,
                                    );
                                    const replySenderName =
                                      repliedMsg?.sender_id === chat.user!.id
                                        ? 'أنت'
                                        : chat.activeConv?.otherDisplayName ||
                                          chat.activeConv?.otherUsername ||
                                          '';
                                    return (
                                      <button
                                        className={cn('w-full mx-0 mt-1.5 px-2 text-start')}
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          if (!msg.reply_to_id) return;
                                          // Route through the virtualizer when active so the target row
                                          // is brought into the rendered window before we try to pulse it.
                                          // Falls back to getElementById internally for the eager path.
                                          virtualListRef.current?.scrollToMessage(msg.reply_to_id, {
                                            align: 'center',
                                            behavior: 'smooth',
                                          });
                                          // Apply the pulse on the next frame, by which time the target
                                          // row's DOM node exists (whether via virtualizer remount or
                                          // because it was already in the eager output).
                                          requestAnimationFrame(() => {
                                            const target = document.getElementById(
                                              `msg-${msg.reply_to_id}`,
                                            );
                                            if (target) {
                                              target.classList.add('animate-pulse');
                                              setTimeout(
                                                () => target.classList.remove('animate-pulse'),
                                                1500,
                                              );
                                            }
                                          });
                                        }}
                                      >
                                        <div
                                          className={cn(
                                            'rounded-lg border-s-2 px-2.5 py-1.5',
                                            isMine
                                              ? 'bg-primary/10 border-primary'
                                              : 'bg-muted/40 border-primary/70',
                                          )}
                                        >
                                          <span
                                            className={cn(
                                              'block text-[11px] font-semibold leading-none mb-0.5',
                                              'text-primary',
                                            )}
                                          >
                                            {replySenderName}
                                          </span>
                                          <span
                                            className="block text-[12px] leading-[1.3] line-clamp-2 text-muted-foreground"
                                            dir="auto"
                                          >
                                            {chat.getReplyPreview(msg.reply_to_id)}
                                          </span>
                                        </div>
                                      </button>
                                    );
                                  })()}

                                {msg.deleted ? (
                                  <p className="px-3 py-2 text-[13px]">{'🚫 تم حذف هذه الرسالة'}</p>
                                ) : msg.message_type === 'image' ? (
                                  (() => {
                                    // Decode any inline metadata (dims, dominant
                                    // colour, LQIP thumbnail) so the bubble paints
                                    // a stable Telegram-style placeholder while
                                    // the full-size streams in.
                                    const meta = unpackFileName(msg.file_name).meta;
                                    return (
                                      <div className="relative">
                                        <ChatImage
                                          src={chat.getFileUrl(msg)}
                                          alt={
                                            readableFileName(msg.file_name) || 'صورة في المحادثة'
                                          }
                                          refreshUrl={() => chat.refreshSignedUrl(msg)}
                                          width={meta?.w}
                                          height={meta?.h}
                                          thumbnailDataUrl={meta?.t}
                                          dominantColor={meta?.c}
                                          maxHeight={240}
                                          className="max-w-full cursor-pointer"
                                          onClick={(e) => {
                                            e.stopPropagation();
                                            if (chat.selectionMode) {
                                              chat.toggleSelect(msg.id);
                                              return;
                                            }
                                            const url = chat.getFileUrl(msg);
                                            if (!url) return;
                                            const rect = (
                                              e.target as HTMLElement
                                            ).getBoundingClientRect();
                                            chat.setLightboxRect(rect);
                                            chat.setLightboxSrc(url);
                                            chat.setLightboxOpen(true);
                                          }}
                                        />
                                        <div className="px-3 py-1.5">
                                          {msg.content &&
                                            msg.content !== readableFileName(msg.file_name) && (
                                              <p
                                                className="break-words whitespace-pre-wrap text-[15px] leading-[1.45] [overflow-wrap:anywhere] [unicode-bidi:plaintext]"
                                                dir="auto"
                                              >
                                                {renderRichText(msg.content)}
                                              </p>
                                            )}
                                          {(() => {
                                            const urlM = msg.content?.match(
                                              /(https?:\/\/[^\s<>()]+|www\.[^\s<>()]+)/i,
                                            );
                                            return urlM ? <LinkPreview url={urlM[0]} /> : null;
                                          })()}
                                          <div
                                            className={cn(
                                              'mt-1.5 flex items-center justify-end gap-[3px] text-[11px] leading-none',
                                              isDarkBg && isMine
                                                ? 'text-primary-foreground/70'
                                                : 'text-muted-foreground/60',
                                            )}
                                            dir="ltr"
                                          >
                                            {msg.edited_at && (
                                              <span className="text-[10px] italic">{'معدّلة'}</span>
                                            )}
                                            {isFading && (
                                              <Timer className="h-[10px] w-[10px] animate-pulse" />
                                            )}
                                            <span>{formatClockTime(msg.created_at)}</span>
                                            {isMine && (
                                              <MessageTicks
                                                status={msg.status}
                                                read={msg.read}
                                                dimmed={isDarkBg}
                                                onRetry={() => chat.retryFailedMessage(msg)}
                                              />
                                            )}
                                          </div>
                                        </div>
                                      </div>
                                    );
                                  })()
                                ) : msg.message_type === 'voice' ? (
                                  <VoiceBubble
                                    msg={msg}
                                    isMine={isMine}
                                    isDarkBg={!!isDarkBg}
                                    isFading={!!isFading}
                                    fileUrl={chat.getFileUrl(msg)}
                                    rawFileUrl={msg.file_url ?? null}
                                    senderName={
                                      isMine
                                        ? 'أنت'
                                        : chat.activeConv?.otherDisplayName ||
                                          chat.activeConv?.otherUsername ||
                                          ''
                                    }
                                    onSelectToggle={chat.toggleSelect}
                                    selectionMode={chat.selectionMode}
                                    voicePlayer={voicePlayer}
                                  />
                                ) : msg.message_type === 'file' ? (
                                  <div className="px-3 py-2">
                                    <a
                                      href={chat.getFileUrl(msg)}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      className="flex items-center gap-2 text-foreground"
                                      onClick={(e) => e.stopPropagation()}
                                    >
                                      <FileText className="h-5 w-5 shrink-0 text-muted-foreground" />
                                      <span className="flex-1 truncate text-[13px]">
                                        {readableFileName(msg.file_name)}
                                      </span>
                                      <Download className="h-4 w-4 shrink-0 opacity-50" />
                                    </a>
                                    <div
                                      className={cn(
                                        'mt-1 flex items-center justify-end gap-[3px] text-[11px] leading-none',
                                        isDarkBg && isMine
                                          ? 'text-primary-foreground/70'
                                          : 'text-muted-foreground/60',
                                      )}
                                      dir="ltr"
                                    >
                                      {isFading && (
                                        <Timer className="h-[10px] w-[10px] animate-pulse" />
                                      )}
                                      <span>{formatClockTime(msg.created_at)}</span>
                                      {isMine && (
                                        <MessageTicks
                                          status={msg.status}
                                          read={msg.read}
                                          dimmed={isDarkBg}
                                          onRetry={() => chat.retryFailedMessage(msg)}
                                        />
                                      )}
                                    </div>
                                  </div>
                                ) : (
                                  /* ── Text message ── */
                                  <div className="px-[10px] py-[6px]">
                                    <p
                                      className="break-words whitespace-pre-wrap text-[15px] leading-[1.5] [word-break:normal] [unicode-bidi:plaintext]"
                                      dir="auto"
                                    >
                                      {chat.showSearch && chat.chatSearchQuery
                                        ? renderHighlighted(msg.content, chat.chatSearchQuery)
                                        : renderRichText(msg.content)}
                                      {!msg.deleted && (
                                        <>
                                          <span aria-hidden="true" className="inline-block w-1.5" />
                                          <span
                                            className={cn(
                                              'inline-flex translate-y-[1px] items-center gap-[3px] align-bottom whitespace-nowrap text-[11px] leading-none select-none',
                                              isDarkBg && isMine
                                                ? 'text-primary-foreground/70'
                                                : 'text-muted-foreground/60',
                                            )}
                                            dir="ltr"
                                          >
                                            {msg.edited_at && (
                                              <span className="text-[10px] italic">{'معدّلة'}</span>
                                            )}
                                            {isFading && (
                                              <Timer className="h-[10px] w-[10px] animate-pulse" />
                                            )}
                                            <span>{formatClockTime(msg.created_at)}</span>
                                            {isMine && (
                                              <MessageTicks
                                                status={msg.status}
                                                read={msg.read}
                                                dimmed={isDarkBg}
                                                onRetry={() => chat.retryFailedMessage(msg)}
                                              />
                                            )}
                                          </span>
                                        </>
                                      )}
                                    </p>
                                    {(() => {
                                      const urlM = msg.content?.match(
                                        /(https?:\/\/[^\s<>()]+|www\.[^\s<>()]+)/i,
                                      );
                                      return urlM ? <LinkPreview url={urlM[0]} /> : null;
                                    })()}
                                  </div>
                                )}
                              </div>

                              {/* Reactions */}
                              {msgReactions.length > 0 && (
                                <div
                                  className={cn(
                                    'flex gap-1 -mt-1.5 flex-wrap relative z-raised',
                                    isMine ? 'justify-end pe-1' : 'justify-start ps-1',
                                  )}
                                  dir="ltr"
                                >
                                  {(() => {
                                    const grouped: Record<
                                      string,
                                      { count: number; mine: boolean }
                                    > = {};
                                    for (const r of msgReactions) {
                                      if (!grouped[r.emoji])
                                        grouped[r.emoji] = { count: 0, mine: false };
                                      grouped[r.emoji].count += 1;
                                      if (chat.user && r.user_id === chat.user.id)
                                        grouped[r.emoji].mine = true;
                                    }
                                    return Object.entries(grouped).map(([emoji, info]) => (
                                      <ReactionPill
                                        key={emoji}
                                        emoji={emoji}
                                        count={info.count}
                                        reactedByMe={info.mine}
                                        onClick={() => {
                                          if (chat.user) chat.toggleReaction(msg.id, emoji);
                                        }}
                                        ariaLabel={
                                          info.mine ? `${emoji} (${'تفاعلت'})` : `${emoji} reaction`
                                        }
                                      />
                                    ));
                                  })()}
                                </div>
                              )}
                            </div>
                          </SwipeableMessage>
                        </div>
                      </>
                    </MessageRowErrorBoundary>
                  );
                }}
              />
            )}

            {/* Typing indicator */}
            <AnimatePresence>
              {chat.typingUser && (
                <motion.div
                  initial={{ opacity: 0, y: 6, scale: 0.9 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: 4, scale: 0.9 }}
                  transition={{ type: 'spring', damping: 20, stiffness: 380 }}
                  className="flex justify-start mt-1.5"
                  aria-live="polite"
                  aria-label={'يكتب'}
                >
                  <div
                    className="bg-card border border-border/15 px-3.5 py-2 shadow-sm"
                    style={{ borderRadius: '18px 18px 18px 4px' }}
                  >
                    <TypingDots />
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Image uploads in progress */}
            {chat.activeConv &&
              chat.imageUpload.uploads
                .filter((u) => u.conversationId === chat.activeConv!.id)
                .map((upload) => {
                  const saving =
                    upload.originalBytes &&
                    upload.compressedBytes &&
                    upload.originalBytes > upload.compressedBytes
                      ? Math.round(
                          ((upload.originalBytes - upload.compressedBytes) / upload.originalBytes) *
                            100,
                        )
                      : 0;
                  const aspect =
                    upload.width && upload.height ? `${upload.width} / ${upload.height}` : '4 / 3';
                  return (
                    <div key={upload.tempId} className="flex justify-end mt-2">
                      <div
                        className="relative max-w-[75%] overflow-hidden bg-primary/15"
                        style={{ borderRadius: '18px 18px 4px 18px' }}
                      >
                        <div
                          className="relative"
                          style={{
                            aspectRatio: aspect,
                            maxHeight: 240,
                            background: upload.dominantColor ?? undefined,
                          }}
                        >
                          <img
                            src={upload.localPreviewUrl}
                            alt=""
                            className={cn(
                              'absolute inset-0 w-full h-full object-cover transition-all duration-500',
                              (upload.status === 'uploading' || upload.status === 'compressing') &&
                                'blur-[2px] brightness-75',
                              upload.status === 'done' && 'blur-0 brightness-100',
                            )}
                          />
                          {upload.status === 'compressing' && (
                            <div className="absolute inset-0 flex items-center justify-center">
                              <svg className="w-12 h-12 animate-spin" viewBox="0 0 48 48">
                                <circle
                                  cx="24"
                                  cy="24"
                                  r="20"
                                  fill="none"
                                  stroke="white"
                                  strokeOpacity="0.2"
                                  strokeWidth="3"
                                />
                                <circle
                                  cx="24"
                                  cy="24"
                                  r="20"
                                  fill="none"
                                  stroke="white"
                                  strokeWidth="3"
                                  strokeLinecap="round"
                                  strokeDasharray={`${2 * Math.PI * 20}`}
                                  strokeDashoffset={`${2 * Math.PI * 20 * 0.7}`}
                                />
                              </svg>
                            </div>
                          )}
                          {upload.status === 'uploading' && (
                            <div className="absolute inset-0 flex items-center justify-center">
                              <svg className="w-12 h-12 -rotate-90" viewBox="0 0 48 48">
                                <circle
                                  cx="24"
                                  cy="24"
                                  r="20"
                                  fill="none"
                                  stroke="white"
                                  strokeOpacity="0.2"
                                  strokeWidth="3"
                                />
                                <circle
                                  cx="24"
                                  cy="24"
                                  r="20"
                                  fill="none"
                                  stroke="white"
                                  strokeWidth="3"
                                  strokeLinecap="round"
                                  strokeDasharray={`${2 * Math.PI * 20}`}
                                  strokeDashoffset={`${2 * Math.PI * 20 * (1 - upload.progress / 100)}`}
                                  className="transition-all duration-300"
                                />
                              </svg>
                              <span className="absolute text-white text-[11px] font-bold">
                                {upload.progress}%
                              </span>
                            </div>
                          )}
                          {upload.status === 'error' && (
                            <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 bg-black/65 px-3 text-center">
                              {upload.errorMessage && (
                                <p
                                  className="text-white text-[12px] font-medium leading-tight max-w-[200px]"
                                  dir="auto"
                                >
                                  {upload.errorMessage}
                                </p>
                              )}
                              <div className="flex gap-2">
                                <button
                                  onClick={() => chat.imageUpload.retryUpload(upload.tempId)}
                                  className="px-3.5 py-1.5 rounded-full bg-destructive text-white text-[12px] font-medium active:scale-95 transition-transform"
                                >
                                  {'إعادة المحاولة'}
                                </button>
                                <button
                                  onClick={() => chat.imageUpload.clearUpload(upload.tempId)}
                                  aria-label={'تجاهل'}
                                  className="px-3.5 py-1.5 rounded-full bg-white/15 text-white text-[12px] font-medium active:scale-95 transition-transform"
                                >
                                  {'تجاهل'}
                                </button>
                              </div>
                            </div>
                          )}
                          {/* Compression badge — Telegram shows this in the
                          upload tile so users know their photo was optimized
                          before being sent. Hidden during error state. */}
                          {saving >= 15 && upload.status !== 'error' && (
                            <span className="absolute bottom-1.5 start-1.5 px-1.5 py-0.5 rounded-md bg-black/65 text-white text-[10px] font-semibold">
                              −{saving}%
                            </span>
                          )}
                        </div>
                        <div className="px-3 py-1.5">
                          <div
                            className="flex items-center justify-end gap-[3px] text-[11px] leading-none text-muted-foreground/60"
                            dir="ltr"
                          >
                            <span>{formatClockTime(new Date().toISOString())}</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}

            <div ref={chat.messagesEndRef} />
          </div>

          {/* ── Scroll to Bottom FAB ── */}
          <AnimatePresence>
            {chat.showScrollDown && (
              <motion.button
                initial={{ opacity: 0, scale: 0.6, y: 8 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.6, y: 8 }}
                transition={{ type: 'spring', damping: 18, stiffness: 380 }}
                whileTap={{ scale: 0.9 }}
                onClick={() => chat.scrollToBottom()}
                aria-label={'الانتقال للأسفل'}
                className={cn(
                  'absolute bottom-24 end-4 z-raised w-11 h-11 rounded-full flex items-center justify-center transition-colors',
                  'bg-card border border-border/50',
                  (chat.activeConv?.unreadCount ?? 0) > 0 && 'ring-2 ring-primary/40',
                )}
              >
                <ArrowDown className="w-[18px] h-[18px] text-foreground/80" strokeWidth={2.25} />
                {(() => {
                  const unread = chat.activeConv?.unreadCount || 0;
                  if (!unread) return null;
                  return (
                    <motion.span
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      transition={{ type: 'spring', damping: 12, stiffness: 500 }}
                      className="absolute -top-1.5 -end-1.5 bg-primary text-primary-foreground text-[10px] font-bold rounded-full min-w-[20px] h-[20px] flex items-center justify-center px-1.5 tabular-nums"
                    >
                      {unread > 99 ? '99+' : unread}
                    </motion.span>
                  );
                })()}
              </motion.button>
            )}
          </AnimatePresence>

          {/* Message context menu. See chat/drawer/MessageActionMenu.tsx. */}
          <MessageActionMenu
            actionMenu={actionMenu}
            chat={chat}
            onClose={() => {
              setActionMenu(null);
              chat.setShowExtraEmojis(false);
            }}
            onCloseKeepingEmojiTray={() => setActionMenu(null)}
            onShowMessageInfo={setMessageInfoTarget}
          />


          {/* ── Chat Input ── */}
          {chat.activeConv && chat.chatPrefs.isBlocked(chat.activeConv.id) ? (
            <div className="border-t border-border/15 bg-[#111111] px-4 py-4 flex flex-col items-center justify-center gap-3 pb-[calc(env(safe-area-inset-bottom,0px)+16px)]">
              <p className="text-[13px] text-muted-foreground font-medium text-center">
                {'لقد قمت بحظر هذا المستخدم'}
              </p>
              <button
                onClick={() => chat.chatPrefs.toggleBlocked(chat.activeConv!.id)}
                className="px-6 py-2 rounded-xl bg-primary/10 hover:bg-primary/20 text-[#C9A84C] border border-[#C9A84C]/30 text-[13px] font-semibold active:scale-95 transition-transform"
              >
                {'إلغاء الحظر'}
              </button>
            </div>
          ) : (
            <ChatInput
              newMessage={chat.newMessage}
              setNewMessage={chat.setNewMessage}
              replyTo={chat.replyTo}
              setReplyTo={chat.setReplyTo}
              editingMessage={chat.editingMessage}
              cancelEdit={chat.cancelEdit}
              stagedPreviews={chat.stagedPreviews}
              stagedImagesCount={chat.stagedImages.length}
              uploading={chat.uploading}
              inputRef={chat.inputRef as React.RefObject<HTMLTextAreaElement>}
              fileInputRef={chat.fileInputRef as React.RefObject<HTMLInputElement>}
              isRecording={voice.isRecording}
              recordingTime={voice.recordingTime}
              locked={voice.locked}
              previewBlob={voice.previewBlob}
              previewUrl={voice.previewUrl}
              uploadingVoice={voice.uploadingVoice}
              liveBars={voice.liveBars}
              capturedBars={voice.capturedBars}
              startRecording={voice.startRecording}
              stopAndSend={voice.stopAndSend}
              stopAndCancel={voice.stopAndCancel}
              stopForPreview={voice.stopForPreview}
              lockRecording={voice.lockRecording}
              sendPreview={voice.sendPreview}
              discardPreview={voice.discardPreview}
              sendMessage={chat.sendMessage}
              saveEditMessage={chat.saveEditMessage}
              sendStagedImages={chat.sendStagedImages}
              removeStagedImage={chat.removeStagedImage}
              clearStagedImages={chat.clearStagedImages}
              showEmojiPicker={chat.showEmojiPicker}
              setShowEmojiPicker={chat.setShowEmojiPicker}
              resizeComposer={chat.resizeComposer}
              broadcastTyping={chat.broadcastTyping}
              scrollToBottom={chat.scrollToBottom}
              activeConvOtherName={
                chat.activeConv?.otherDisplayName || chat.activeConv?.otherUsername
              }
              userId={chat.user.id}
              onPasteFiles={chat.addImagesFromFiles}
              enterToSend={chat.chatPrefs.prefs.enterToSend}
            />
          )}
        </>
      )}

      {/* ── Forward picker ── */}
      {chat.forwardingMessages && (
        <ForwardPicker
          messages={chat.forwardingMessages}
          conversations={chat.conversations.filter((c) => c.id !== chat.activeConv?.id)}
          onClose={chat.cancelForward}
          onForward={chat.performForwardTo}
        />
      )}

      {/* ── Message info ── */}
      {/* Always re-resolve the message from the live messages list so
            the modal updates in real time (sent → delivered → read) without
            forcing the caller to re-open the dialog. */}
      <MessageInfo
        isOpen={!!messageInfoTarget}
        message={
          messageInfoTarget
            ? (chat.messages.find((m) => m.id === messageInfoTarget.id) ?? messageInfoTarget)
            : null
        }
        onClose={() => setMessageInfoTarget(null)}
      />

      {/* ── Wallpaper picker ── */}
      {chat.showWallpaperPicker && (
        <WallpaperPicker
          currentId={currentWallpaperId}
          onClose={() => chat.setShowWallpaperPicker(false)}
          onPick={(id) => {
            chat.chatPrefs.setWallpaper(chat.activeConv?.id ?? null, id);
            chat.setShowWallpaperPicker(false);
          }}
        />
      )}
    </>
  );

  const confirmDialog = (
    <AnimatePresence>
      {showDeleteConfirm && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-fullscreen-above flex items-center justify-center bg-black/60 px-6"
          onClick={() => setShowDeleteConfirm(false)}
        >
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.9, opacity: 0 }}
            transition={{ type: 'spring', stiffness: 400, damping: 25 }}
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-sm rounded-2xl bg-card border border-border/20 p-6 space-y-4 shadow-2xl"
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-destructive/10 flex items-center justify-center shrink-0">
                <Trash className="w-5 h-5 text-destructive" />
              </div>
              <h3 className="text-lg font-bold text-foreground">{'حذف المحادثة نهائياً'}</h3>
            </div>
            <p className="text-sm text-muted-foreground leading-relaxed" dir="auto">
              {
                'هل أنت متأكد من حذف هذه المحادثة نهائياً؟ سيتم مسح جميع الرسائل والوسائط ولا يمكن التراجع عن هذا الإجراء.'
              }
            </p>
            <div className="flex gap-3 pt-1">
              <button
                onClick={() => setShowDeleteConfirm(false)}
                className="flex-1 py-2.5 rounded-xl bg-secondary text-secondary-foreground text-sm font-medium active:scale-[0.98] transition-transform"
              >
                {'إلغاء'}
              </button>
              <button
                onClick={async () => {
                  setShowDeleteConfirm(false);
                  await chat.deleteConversation();
                  chat.setShowProfilePopup(false);
                  chat.setProfileTab('info');
                }}
                className="flex-1 py-2.5 rounded-xl bg-destructive text-white text-sm font-medium active:scale-[0.98] transition-transform"
              >
                {'حذف'}
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );

  const lightbox = (
    <ImageLightbox
      src={chat.lightboxSrc}
      open={chat.lightboxOpen}
      onClose={() => chat.setLightboxOpen(false)}
      originRect={chat.lightboxRect}
    />
  );

  if (inline) {
    // Full-page rendering for the dedicated /chat route. We deliberately
    // avoid `position: fixed` here because the parent <PageTransition>
    // sets `contain: paint`, which establishes a containing block for
    // fixed-positioned descendants — trapping them inside a zero-height
    // box. A regular flex column anchored to the dynamic viewport height
    // works on every browser and respects the persistent BottomNav.
    //
    // While the user is inside an active 1:1 conversation we drop the
    // 64px nav-reserve and let the composer hug the safe-area, matching
    // WhatsApp / Telegram chrome (the BottomNav itself is hidden via
    // `setInChatConversation`, see the effect above).
    const insideConversation = !!chat.activeConv && !chat.showNewChat;
    return (
      <>
        <div
          className="flex flex-col bg-background w-full"
          style={{
            height: '100dvh',
            paddingBottom: insideConversation
              ? 'env(safe-area-inset-bottom, 0px)'
              : 'calc(env(safe-area-inset-bottom, 0px) + 64px)',
          }}
        >
          {body}
        </div>
        {lightbox}
        {confirmDialog}
      </>
    );
  }

  return (
    <Sheet
      open={open}
      onOpenChange={(v) => {
        if (!v) closeAll();
        else onOpenChange(v);
      }}
    >
      <SheetContent
        side={'right'}
        className="w-full sm:max-w-md p-0 flex flex-col bg-background [&>button[class*='absolute']]:hidden"
      >
        {body}
      </SheetContent>
      {lightbox}
      {confirmDialog}
    </Sheet>
  );
}
