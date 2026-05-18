import React, { useCallback, useMemo } from 'react';
import { supabase } from '@/integrations/supabase/client';
import ImageLightbox from '@/components/ImageLightbox';
import { useVoicePlayer } from '@/contexts/VoicePlayerContext';
import { Sheet, SheetContent } from '@/components/ui/sheet';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
  ChevronRight, ChevronLeft, ChevronDown, Search,
  Check, CheckCheck, Reply, Trash2, X,
  Download, FileText, MoreVertical, Trash, Copy, Pin, PinOff,
  ArrowDown, Calendar, Image as ImageIcon, User2, Pencil, Timer, TimerOff,
  Share2, BellOff, Bell, Archive, ArchiveRestore, Volume2, VolumeX,
  Palette as WallpaperIcon, Forward as ForwardIcon,
  CornerDownLeft, Upload, EyeOff,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { motion, AnimatePresence } from 'framer-motion';
import { isEmojiAvatarValue, getAppleEmojiUrl } from '@/utils/emojiAvatar';
import { getDefaultAvatarForUser } from '@/utils/defaultAvatar';
import {
  getSignedFileUrl, formatClockTime, formatDateSeparator, formatSelfDestructLabel,
  renderRichText, stripMarkers, renderHighlighted,
} from './chatUtils';
import { QUICK_EMOJIS, WALLPAPERS, SELF_DESTRUCT_OPTIONS, MUTE_DURATION_OPTIONS } from './constants';
import { useChat } from './useChat';
import { useVoiceRecording } from './useVoiceRecording';
import { SwipeableMessage, TypingDots, MessageTicks, ReactionPill, ForwardedBadge } from './MessageBubble';
import ConversationList from './ConversationList';
import ChatInput from './ChatInput';
import ChatImage from './ChatImage';
import EmojiPicker from './EmojiPicker';
import ForwardPicker from './ForwardPicker';
import WallpaperPicker from './WallpaperPicker';
import MessageInfo from './MessageInfo';
import { haptic } from './sounds';
import type { ChatDrawerProps, ActionMenuState, Message } from './types';

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────
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

/** Signal-style asymmetric bubble radius based on grouping + orientation. */
function getBubbleRadius(isMine: boolean, samePrev: boolean, sameNext: boolean) {
  const big = '18px';
  const small = '4px';
  if (isMine) {
    const topRight = samePrev ? small : big;
    const bottomRight = sameNext ? small : big;
    return { borderRadius: `${big} ${topRight} ${bottomRight} ${big}` };
  } else {
    const topLeft = samePrev ? small : big;
    const bottomLeft = sameNext ? small : big;
    return { borderRadius: `${topLeft} ${big} ${big} ${bottomLeft}` };
  }
}

/**
 * Waveform gating. We only ask the voice-player context to decode audio peaks
 * once the bubble has scrolled into view — otherwise a 200-message chat with
 * 30 voice notes would kick off 30 fetches + decodeAudioData on first paint,
 * stalling the UI and hitting signed-URL rate limits.
 */
function useWaveformOnVisible(
  ref: React.RefObject<HTMLDivElement | null>,
  fileUrl: string,
  msgId: string,
  hasCachedWaveform: boolean,
  generateWaveform: (url: string, msgId: string) => Promise<number[]>,
) {
  React.useEffect(() => {
    if (!fileUrl || hasCachedWaveform) return;
    const el = ref.current;
    if (!el) return;
    // Browsers without IntersectionObserver fall back to eager generation
    // (matches old behavior without crashing).
    if (typeof IntersectionObserver === 'undefined') {
      generateWaveform(fileUrl, msgId);
      return;
    }
    const io = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            generateWaveform(fileUrl, msgId);
            io.disconnect();
            break;
          }
        }
      },
      { root: null, rootMargin: '200px 0px', threshold: 0.01 },
    );
    io.observe(el);
    return () => io.disconnect();
  }, [ref, fileUrl, msgId, hasCachedWaveform, generateWaveform]);
}

/**
 * Voice-message bubble. Encapsulates the player UI + waveform-on-visible
 * hook so the main render tree stays readable and so the IntersectionObserver
 * only fires for voice notes actually on screen.
 */
interface VoiceBubbleProps {
  msg: Message;
  isMine: boolean;
  isDarkBg: boolean;
  isFading: boolean;
  isAr: boolean;
  fileUrl: string;
  rawFileUrl: string | null;
  senderName: string;
  onSelectToggle: (id: string) => void;
  selectionMode: boolean;
  voicePlayer: ReturnType<typeof useVoicePlayer>;
}

function VoiceBubble({
  msg, isMine, isDarkBg, isFading, isAr,
  fileUrl, rawFileUrl, senderName, onSelectToggle, selectionMode, voicePlayer,
}: VoiceBubbleProps) {
  const containerRef = React.useRef<HTMLDivElement | null>(null);
  const cachedWaveform = voicePlayer.waveformCache[msg.id];
  useWaveformOnVisible(containerRef, fileUrl, msg.id, !!cachedWaveform, voicePlayer.generateWaveform);

  const isPlaying = voicePlayer.isPlayingMsg(msg.id);
  const progress = voicePlayer.getProgress(msg.id);
  const duration = voicePlayer.getDuration(msg.id);
  const formatDur = (s: number) => {
    if (!s || !isFinite(s)) return '0:00';
    const m = Math.floor(s / 60);
    const sec = Math.floor(s % 60);
    return `${m}:${sec.toString().padStart(2, '0')}`;
  };

  const bars = React.useMemo(() => {
    if (cachedWaveform) return cachedWaveform;
    const seed = msg.id.split('').reduce((a, c) => a + c.charCodeAt(0), 0);
    return Array.from({ length: 40 }, (_, i) => ((Math.sin(seed * (i + 1) * 0.7) + 1) / 2) * 0.85 + 0.15);
  }, [cachedWaveform, msg.id]);

  const handleToggle = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (selectionMode) { onSelectToggle(msg.id); return; }
    const playableUrl = fileUrl || (rawFileUrl ? await getSignedFileUrl(rawFileUrl) : '');
    if (!playableUrl) return;
    voicePlayer.togglePlayback(msg.id, playableUrl, senderName, msg.conversation_id);
  };

  const handleSeek = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (voicePlayer.state.msgId !== msg.id) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const fraction = (e.clientX - rect.left) / rect.width;
    voicePlayer.seek(Math.max(0, Math.min(1, fraction)));
  };

  return (
    <div ref={containerRef} className="min-w-[220px] px-3 py-2.5">
      <div className="flex items-center gap-3">
        <button
          onClick={handleToggle}
          aria-label={isPlaying ? (isAr ? 'إيقاف مؤقت' : 'Pause') : (isAr ? 'تشغيل الرسالة الصوتية' : 'Sprachnachricht abspielen')}
          className={cn('flex h-9 w-9 shrink-0 items-center justify-center rounded-full transition-colors active:scale-90', isMine ? 'bg-primary/20' : 'bg-primary/15')}
        >
          {isPlaying ? (
            <svg viewBox="0 0 24 24" className="h-4 w-4 text-primary" fill="currentColor"><rect x="6" y="4" width="4" height="16" rx="1" /><rect x="14" y="4" width="4" height="16" rx="1" /></svg>
          ) : (
            <svg viewBox="0 0 24 24" className="h-4 w-4 text-primary ms-0.5" fill="currentColor"><path d="M8 5v14l11-7z" /></svg>
          )}
        </button>
        <div className="flex-1 flex flex-col gap-1.5">
          <div
            className="flex items-center gap-[2px] h-[20px] cursor-pointer"
            dir="ltr"
            role={voicePlayer.state.msgId === msg.id ? 'slider' : undefined}
            aria-label={isAr ? 'شريط تقدم الصوت' : 'Audio-Fortschritt'}
            aria-valuemin={voicePlayer.state.msgId === msg.id ? 0 : undefined}
            aria-valuemax={voicePlayer.state.msgId === msg.id ? 100 : undefined}
            aria-valuenow={voicePlayer.state.msgId === msg.id ? Math.round(progress * 100) : undefined}
            onClick={handleSeek}
          >
            {bars.map((h, i) => {
              const barProgress = i / bars.length;
              const isActive = voicePlayer.state.msgId === msg.id && barProgress < progress;
              return (
                <div
                  key={i}
                  className={cn('flex-1 rounded-full transition-colors duration-100', isActive ? 'bg-primary' : 'bg-muted-foreground/25')}
                  style={{ height: `${h * 20}px`, minWidth: '2px' }}
                />
              );
            })}
          </div>
          <div className="flex items-center justify-between" dir="ltr">
            <span className="text-[10px] tabular-nums text-muted-foreground/50">
              {isPlaying && duration ? formatDur(progress * duration) : (duration ? formatDur(duration) : '')}
            </span>
            <div className="flex items-center gap-1.5">
              {isPlaying && (
                <button
                  onClick={(e) => { e.stopPropagation(); voicePlayer.cyclePlaybackRate(); }}
                  className={cn(
                    'text-[10px] font-bold tabular-nums px-1.5 py-[1px] rounded-full leading-none transition-colors active:scale-90',
                    isMine && isDarkBg ? 'bg-primary-foreground/20 text-primary-foreground' : 'bg-primary/15 text-primary'
                  )}
                  aria-label={isAr ? 'سرعة التشغيل' : 'Wiedergabegeschwindigkeit'}
                >
                  {voicePlayer.state.playbackRate === 1 ? '1×' : voicePlayer.state.playbackRate === 1.5 ? '1.5×' : '2×'}
                </button>
              )}
              <span className={cn('flex items-center gap-[3px] text-[11px] leading-none', isDarkBg && isMine ? 'text-primary-foreground/70' : 'text-muted-foreground/60')}>
                {msg.edited_at && <span className="text-[9px] italic">{isAr ? 'معدّلة' : 'bearb.'}</span>}
                {isFading && <Timer className="h-[10px] w-[10px] animate-pulse" />}
                {formatClockTime(msg.created_at)}
                {isMine && <MessageTicks status={msg.status} read={msg.read} dimmed={isDarkBg} isAr={isAr} />}
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// ChatDrawer – root of the entire messaging experience.
// ─────────────────────────────────────────────────────────────────────────────
export default function ChatDrawer({ open, onOpenChange, unreadCount, onUnreadChange, inline = false }: ChatDrawerProps) {
  const chat = useChat({ open, onUnreadChange });
  const voice = useVoiceRecording({
    activeConvId: chat.activeConv?.id || null,
    userId: chat.user?.id,
    isAr: chat.isAr,
    sendMessage: chat.sendMessage,
  });
  const voicePlayer = useVoicePlayer();

  // Auto-advance voice playback within the active conversation, just like
  // Telegram. The resolver looks up the next non-deleted voice message AFTER
  // the one that just ended and returns its signed URL, sender label and
  // id; the VoicePlayer then queues it. Disabled when the conversation
  // changes or the drawer closes.
  React.useEffect(() => {
    voicePlayer.setOnEnded(async (finishedId, conversationId) => {
      if (!chat.activeConv || chat.activeConv.id !== conversationId) return null;
      const list = chat.messages;
      const idx = list.findIndex(m => m.id === finishedId);
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
          } catch { /* no-op */ }
        }
        if (!url) continue;
        const senderName = next.sender_id === chat.user?.id
          ? (chat.isAr ? 'أنت' : 'Du')
          : (chat.activeConv?.otherDisplayName || chat.activeConv?.otherUsername || '');
        return { msgId: next.id, url, senderName };
      }
      return null;
    });
    return () => voicePlayer.setOnEnded(undefined);
    // We deliberately omit `voicePlayer` from deps because setOnEnded is
    // stable. Including it would tear down the resolver every render.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [chat.activeConv?.id, chat.messages, chat.user?.id, chat.isAr]);

  const [actionMenu, setActionMenu] = React.useState<ActionMenuState | null>(null);
  const [convSearchQuery, setConvSearchQuery] = React.useState('');
  const [showConvSearch, setShowConvSearch] = React.useState(false);
  const [messageInfoTarget, setMessageInfoTarget] = React.useState<Message | null>(null);

  // Escape key collapses one layer at a time: overlays first, then the
  // active conversation, finally leaves the page. Matches what users
  // already get from clicking the in-app back arrows.
  React.useEffect(() => {
    if (!inline) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== 'Escape') return;
      if (messageInfoTarget) { setMessageInfoTarget(null); return; }
      if (actionMenu) { setActionMenu(null); return; }
      if (showConvSearch) { setShowConvSearch(false); setConvSearchQuery(''); return; }
      if (chat.showChatMenu) { chat.setShowChatMenu(false); return; }
      if (chat.showProfilePopup) { chat.setShowProfilePopup(false); return; }
      if (chat.showWallpaperPicker) { chat.setShowWallpaperPicker(false); return; }
      if (chat.forwardingMessages) { chat.cancelForward(); return; }
      if (chat.showNewChat) { chat.setShowNewChat(false); return; }
      if (chat.activeConv) { chat.setActiveConv(null); return; }
      onOpenChange(false);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [inline, actionMenu, showConvSearch, chat, onOpenChange, messageInfoTarget]);

  const BackIcon = chat.isAr ? ChevronRight : ChevronLeft;

  // Unread ignoring archived + muted shown in the tab badge.
  const totalUnread = useMemo(() => {
    return chat.conversations.reduce((sum, c) => {
      if (chat.chatPrefs.isArchived(c.id)) return sum;
      if (chat.chatPrefs.isMuted(c.id)) return sum;
      return sum + (c.unreadCount || 0);
    }, 0);
  }, [chat.conversations, chat.chatPrefs]);

  // Filtered list for the conversation screen (matches tab + search).
  const filteredConversations = useMemo(() => {
    let list = chat.filteredByTab;
    if (convSearchQuery.trim()) {
      const q = convSearchQuery.toLowerCase();
      list = list.filter(c =>
        (c.otherDisplayName || c.otherUsername || '').toLowerCase().includes(q) ||
        stripMarkers(c.lastMessage || '').toLowerCase().includes(q)
      );
    }
    return list;
  }, [chat.filteredByTab, convSearchQuery]);

  // Open the action menu anchored to the given bubble element. The trigger
  // is either a long-press (~350 ms) or a native contextmenu — a bare tap
  // never opens it, so users can scroll and read without surprise.
  const openActionMenu = useCallback((msg: Message, isMine: boolean, bubbleEl: HTMLElement) => {
    if (chat.selectionMode) return;
    if (msg.deleted) return;
    const rect = bubbleEl.getBoundingClientRect();
    const containerRect = chat.messagesContainerRef.current?.getBoundingClientRect() || { top: 0, bottom: window.innerHeight, height: window.innerHeight };
    setActionMenu({
      msg,
      isMine,
      rect: { top: rect.top, bottom: rect.bottom, left: rect.left, right: rect.right, width: rect.width, height: rect.height },
      containerRect: { top: containerRect.top, bottom: containerRect.bottom, height: containerRect.height },
    });
    haptic('medium');
  }, [chat.messagesContainerRef, chat.selectionMode]);

  // Long-press gesture state. Kept outside hooks so refs persist across renders
  // of individual message bubbles, indexed by pointer id so multi-touch doesn't
  // collide.
  const longPressTimersRef = React.useRef<Map<number, ReturnType<typeof setTimeout>>>(new Map());
  const longPressStartRef  = React.useRef<Map<number, { x: number; y: number; fired: boolean }>>(new Map());
  const LONG_PRESS_MS      = 380;
  const LONG_PRESS_TOLER   = 10; // px of movement that still counts as a press

  const clearLongPress = useCallback((pointerId: number) => {
    const t = longPressTimersRef.current.get(pointerId);
    if (t) { clearTimeout(t); longPressTimersRef.current.delete(pointerId); }
    longPressStartRef.current.delete(pointerId);
  }, []);

  const beginLongPress = useCallback((msg: Message, isMine: boolean, e: React.PointerEvent<HTMLDivElement>) => {
    if (chat.selectionMode) return;
    if (msg.deleted) return;
    if (e.pointerType === 'mouse' && e.button !== 0) return; // only left mouse button
    const el = e.currentTarget;
    const startX = e.clientX, startY = e.clientY;
    longPressStartRef.current.set(e.pointerId, { x: startX, y: startY, fired: false });
    const timer = setTimeout(() => {
      const entry = longPressStartRef.current.get(e.pointerId);
      if (!entry) return;
      entry.fired = true;
      openActionMenu(msg, isMine, el);
    }, LONG_PRESS_MS);
    longPressTimersRef.current.set(e.pointerId, timer);
  }, [chat.selectionMode, openActionMenu]);

  const continueLongPress = useCallback((e: React.PointerEvent<HTMLDivElement>) => {
    const entry = longPressStartRef.current.get(e.pointerId);
    if (!entry) return;
    const dx = e.clientX - entry.x;
    const dy = e.clientY - entry.y;
    if (Math.hypot(dx, dy) > LONG_PRESS_TOLER) clearLongPress(e.pointerId);
  }, [clearLongPress]);

  const endLongPress = useCallback((msg: Message, e: React.PointerEvent<HTMLDivElement>) => {
    const entry = longPressStartRef.current.get(e.pointerId);
    const fired = entry?.fired ?? false;
    clearLongPress(e.pointerId);
    // If the user simply tapped in selection mode, toggle the selection.
    if (!fired && chat.selectionMode && !msg.deleted) {
      chat.toggleSelect(msg.id);
    }
  }, [clearLongPress, chat.selectionMode, chat.toggleSelect, chat.messages.length]); // eslint-disable-line react-hooks/exhaustive-deps

  // Clean up any in-flight long-press timers on unmount
  React.useEffect(() => {
    const timers = longPressTimersRef.current;
    return () => {
      timers.forEach(t => clearTimeout(t));
      timers.clear();
    };
  }, []);

  // Keyboard shortcuts: Esc cascades through overlays/modes; Ctrl/Cmd+K opens
  // search (in-chat when a conversation is open, otherwise conversation list).
  React.useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (messageInfoTarget) { setMessageInfoTarget(null); return; }
        if (actionMenu) { setActionMenu(null); chat.setShowExtraEmojis(false); return; }
        if (chat.showChatMenu) { chat.setShowChatMenu(false); return; }
        if (chat.showSelfDestructMenu) { chat.setShowSelfDestructMenu(false); return; }
        if (chat.showEmojiPicker) { chat.setShowEmojiPicker(false); return; }
        if (chat.showSearch) { chat.setShowSearch(false); return; }
        if (chat.selectionMode) { chat.clearSelection(); return; }
        if (showConvSearch) { setShowConvSearch(false); setConvSearchQuery(''); return; }
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
  }, [open, actionMenu, chat.showChatMenu, chat.showSelfDestructMenu, chat.showEmojiPicker, chat.showSearch, chat.selectionMode, chat.activeConv, showConvSearch, chat, messageInfoTarget]);


  // ── Double-tap to react (Instagram/Telegram-style) ─────────────────────────
  // Tracks the most recent tap timestamp per message so quick double-taps
  // toggle a heart reaction without opening the long-press action menu.
  const lastTapRef = React.useRef<Map<string, number>>(new Map());
  const DOUBLE_TAP_MS = 320;

  const handleDoubleTapReact = useCallback((msg: Message, e: React.PointerEvent) => {
    if (!chat.user) return;
    if (chat.selectionMode || msg.deleted) return;
    if (e.pointerType === 'mouse' && e.button !== 0) return;
    const now = Date.now();
    const last = lastTapRef.current.get(msg.id) || 0;
    if (now - last < DOUBLE_TAP_MS) {
      chat.toggleReaction(msg.id, '❤️');
      haptic('medium');
      lastTapRef.current.delete(msg.id);
    } else {
      lastTapRef.current.set(msg.id, now);
    }
  }, [chat]);

  // ── Drag and drop file support ────────────────────────────────────────────
  const [isDraggingFiles, setIsDraggingFiles] = React.useState(false);
  const dragCounterRef = React.useRef(0);

  const onDragEnter = useCallback((e: React.DragEvent) => {
    if (!chat.activeConv) return;
    const types = Array.from(e.dataTransfer.types || []);
    if (!types.includes('Files')) return;
    e.preventDefault();
    dragCounterRef.current += 1;
    setIsDraggingFiles(true);
  }, [chat.activeConv]);

  const onDragOver = useCallback((e: React.DragEvent) => {
    if (!chat.activeConv) return;
    const types = Array.from(e.dataTransfer.types || []);
    if (!types.includes('Files')) return;
    e.preventDefault();
    e.dataTransfer.dropEffect = 'copy';
  }, [chat.activeConv]);

  const onDragLeave = useCallback((e: React.DragEvent) => {
    if (!chat.activeConv) return;
    e.preventDefault();
    dragCounterRef.current = Math.max(0, dragCounterRef.current - 1);
    if (dragCounterRef.current === 0) setIsDraggingFiles(false);
  }, [chat.activeConv]);

  const onDrop = useCallback((e: React.DragEvent) => {
    if (!chat.activeConv) return;
    e.preventDefault();
    dragCounterRef.current = 0;
    setIsDraggingFiles(false);
    const files = Array.from(e.dataTransfer.files || []);
    if (files.length > 0) chat.addFilesFromDrop(files);
  }, [chat]);

  // ── Wallpaper resolution ──────────────────────────────────────────────────
  const currentWallpaperId = chat.chatPrefs.getWallpaper(chat.activeConv?.id);
  const currentWallpaper = WALLPAPERS.find(w => w.id === currentWallpaperId) || WALLPAPERS[0];
  const isDarkBg = currentWallpaper.isDark;

  if (!chat.user) {
    const signInPrompt = (
      <div className="flex flex-col items-center justify-center gap-3 h-full px-6 text-center">
        <p className="text-muted-foreground text-sm">
          {chat.isAr ? 'يرجى تسجيل الدخول أولاً' : 'Bitte zuerst anmelden'}
        </p>
      </div>
    );
    if (inline) {
      return (
        <div className="flex flex-col bg-background" style={{ minHeight: '100dvh', paddingBottom: 'calc(env(safe-area-inset-bottom, 0px) + 96px)' }}>
          {signInPrompt}
        </div>
      );
    }
    return (
      <Sheet open={open} onOpenChange={onOpenChange}>
        <SheetContent side={chat.isAr ? 'right' : 'left'} className="w-full sm:max-w-md p-0 [&>button[class*='absolute']]:hidden">
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

        {/* ───────────────── Profile Popup ───────────────── */}
        <AnimatePresence>
          {chat.showProfilePopup && chat.activeConv && (
            <motion.div
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="absolute inset-0 z-50 bg-background flex flex-col"
            >
              <div className="flex items-center gap-3 px-4 h-14 border-b border-border/20">
                <button
                  onClick={() => { chat.setShowProfilePopup(false); chat.setProfileTab('info'); }}
                  className="w-9 h-9 rounded-full flex items-center justify-center active:bg-accent/40 transition-colors"
                >
                  <BackIcon className="w-5 h-5 text-foreground" />
                </button>
                <h2 className="text-[16px] font-semibold">{chat.isAr ? 'الملف الشخصي' : 'Profil'}</h2>
              </div>

              <div className="flex flex-col items-center pt-8 pb-4 px-6">
                <motion.div initial={{ scale: 0.8 }} animate={{ scale: 1 }} transition={{ type: 'spring', damping: 20, stiffness: 300 }}>
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

              {/* Quick action pills */}
              <div className="flex items-center justify-center gap-2 px-4 mb-3">
                <button
                  onClick={() => chat.chatPrefs.toggleMuted(chat.activeConv!.id)}
                  className={cn('flex flex-col items-center gap-1 px-4 py-2.5 rounded-2xl transition-colors active:scale-95',
                    chat.chatPrefs.isMuted(chat.activeConv.id) ? 'bg-primary/10 text-primary' : 'bg-muted/30 text-foreground')}
                >
                  {chat.chatPrefs.isMuted(chat.activeConv.id)
                    ? <BellOff className="w-4 h-4" />
                    : <Bell className="w-4 h-4" />}
                  <span className="text-[10.5px] font-medium">
                    {chat.chatPrefs.isMuted(chat.activeConv.id) ? (chat.isAr ? 'مكتوم' : 'Stumm') : (chat.isAr ? 'كتم' : 'Stummschalten')}
                  </span>
                </button>
                <button
                  onClick={() => chat.chatPrefs.togglePinned(chat.activeConv!.id)}
                  className={cn('flex flex-col items-center gap-1 px-4 py-2.5 rounded-2xl transition-colors active:scale-95',
                    chat.chatPrefs.isPinned(chat.activeConv.id) ? 'bg-primary/10 text-primary' : 'bg-muted/30 text-foreground')}
                >
                  <Pin className={cn('w-4 h-4', chat.chatPrefs.isPinned(chat.activeConv.id) && 'rotate-45')} />
                  <span className="text-[10.5px] font-medium">
                    {chat.chatPrefs.isPinned(chat.activeConv.id) ? (chat.isAr ? 'مثبّتة' : 'Angeheftet') : (chat.isAr ? 'تثبيت' : 'Anheften')}
                  </span>
                </button>
                <button
                  onClick={() => { chat.chatPrefs.toggleArchived(chat.activeConv!.id); chat.setActiveConv(null); chat.setShowProfilePopup(false); }}
                  className="flex flex-col items-center gap-1 px-4 py-2.5 rounded-2xl bg-muted/30 text-foreground transition-colors active:scale-95"
                >
                  {chat.chatPrefs.isArchived(chat.activeConv.id)
                    ? <ArchiveRestore className="w-4 h-4" />
                    : <Archive className="w-4 h-4" />}
                  <span className="text-[10.5px] font-medium">
                    {chat.chatPrefs.isArchived(chat.activeConv.id) ? (chat.isAr ? 'إلغاء الأرشفة' : 'Entarchivieren') : (chat.isAr ? 'أرشفة' : 'Archivieren')}
                  </span>
                </button>
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
                      <div className="flex items-center gap-3 p-3.5"><User2 className="w-4 h-4 text-muted-foreground shrink-0" /><div className="min-w-0"><p className="text-[11px] text-muted-foreground">{chat.isAr ? 'النبذة' : 'Bio'}</p><p className="text-[13px] text-foreground font-medium">{chat.activeConv.otherBio || (chat.isAr ? 'لا توجد نبذة' : 'Keine Bio')}</p></div></div>
                      <div className="flex items-center gap-3 p-3.5"><Calendar className="w-4 h-4 text-muted-foreground shrink-0" /><div className="min-w-0"><p className="text-[11px] text-muted-foreground">{chat.isAr ? 'تاريخ الانضمام' : 'Beigetreten'}</p><p className="text-[13px] text-foreground font-medium">{chat.activeConv.otherCreatedAt ? new Date(chat.activeConv.otherCreatedAt).toLocaleDateString(chat.isAr ? 'ar' : 'de', { day: 'numeric', month: 'long', year: 'numeric' }) : '—'}</p></div></div>
                      <button className="w-full flex items-center gap-3 p-3.5 active:bg-accent/30 transition-colors text-start"
                        onClick={() => chat.setShowWallpaperPicker(true)}>
                        <WallpaperIcon className="w-4 h-4 text-muted-foreground shrink-0" />
                        <div className="min-w-0 flex-1">
                          <p className="text-[11px] text-muted-foreground">{chat.isAr ? 'الخلفية' : 'Hintergrund'}</p>
                          <p className="text-[13px] text-foreground font-medium">{chat.isAr ? currentWallpaper.labelAr : currentWallpaper.label}</p>
                        </div>
                        <ChevronRight className={cn('w-4 h-4 text-muted-foreground/50', chat.isAr && 'rotate-180')} />
                      </button>
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
                          <button
                            key={m.id}
                            onClick={(e) => {
                              const url = chat.getFileUrl(m);
                              if (!url) return;
                              const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
                              chat.setLightboxRect(rect);
                              chat.setLightboxSrc(url);
                              chat.setLightboxOpen(true);
                            }}
                            className="aspect-square bg-muted/30 overflow-hidden hover:opacity-80 transition-opacity"
                          >
                            <ChatImage
                              src={chat.getFileUrl(m)}
                              alt={m.file_name || ''}
                              isAr={chat.isAr}
                              refreshUrl={() => chat.refreshSignedUrl(m)}
                              className="w-full h-full"
                            />
                          </button>
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

        {/* ───────────────── CONVERSATION LIST SCREEN ───────────────── */}
        {!chat.activeConv && !chat.showNewChat ? (
          <>
            <div className="px-4 h-14 flex items-center justify-between border-b border-border/20 shrink-0">
              <div className="flex items-center gap-3">
                <button onClick={() => onOpenChange(false)} className="w-9 h-9 rounded-full flex items-center justify-center active:bg-accent/40 transition-colors" aria-label={chat.isAr ? 'رجوع' : 'Zurück'}>
                  <BackIcon className="w-5 h-5 text-foreground" />
                </button>
                {!showConvSearch && (
                  <h1 className="text-[17px] font-bold tracking-tight">{chat.isAr ? 'الرسائل' : 'Nachrichten'}</h1>
                )}
              </div>
              {showConvSearch ? (
                <div className="flex-1 flex items-center gap-2 ms-2">
                  <div className="flex-1 flex items-center bg-muted/30 rounded-full px-3 h-9">
                    <Search className="w-4 h-4 text-muted-foreground/50 shrink-0" />
                    <input
                      type="text"
                      value={convSearchQuery}
                      onChange={e => setConvSearchQuery(e.target.value)}
                      placeholder={chat.isAr ? 'بحث...' : 'Suchen...'}
                      className="flex-1 bg-transparent text-[14px] outline-none ms-2 placeholder:text-muted-foreground/40"
                      dir="auto"
                      autoFocus
                    />
                  </div>
                  <button onClick={() => { setShowConvSearch(false); setConvSearchQuery(''); }} className="w-8 h-8 rounded-full flex items-center justify-center active:bg-accent/40">
                    <X className="w-4 h-4 text-muted-foreground" />
                  </button>
                </div>
              ) : (
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => chat.chatPrefs.setSoundEnabled(!chat.chatPrefs.prefs.soundEnabled)}
                    className="w-9 h-9 rounded-full flex items-center justify-center active:bg-accent/40 transition-colors"
                    aria-label={chat.chatPrefs.prefs.soundEnabled ? (chat.isAr ? 'كتم الصوت' : 'Stumm') : (chat.isAr ? 'تفعيل الصوت' : 'Laut')}
                  >
                    {chat.chatPrefs.prefs.soundEnabled
                      ? <Volume2 className="w-[18px] h-[18px] text-muted-foreground" />
                      : <VolumeX className="w-[18px] h-[18px] text-muted-foreground" />}
                  </button>
                  <button onClick={() => setShowConvSearch(true)} className="w-9 h-9 rounded-full flex items-center justify-center active:bg-accent/40 transition-colors" aria-label={chat.isAr ? 'بحث' : 'Suchen'}>
                    <Search className="w-5 h-5 text-muted-foreground" />
                  </button>
                </div>
              )}
            </div>
            <ConversationList
              conversations={filteredConversations}
              isAr={chat.isAr}
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

        /* ───────────────── NEW CHAT SCREEN ───────────────── */
        ) : chat.showNewChat ? (
          <>
            <div className="px-4 h-14 flex items-center gap-3 border-b border-border/20 shrink-0">
              <button onClick={() => { chat.setShowNewChat(false); chat.setSearchUser(''); }} className="w-9 h-9 rounded-full flex items-center justify-center active:bg-accent/40 transition-colors" aria-label={chat.isAr ? 'رجوع' : 'Zurück'}>
                <BackIcon className="w-5 h-5 text-foreground" />
              </button>
              <h1 className="text-[17px] font-bold tracking-tight">{chat.isAr ? 'محادثة جديدة' : 'Neues Gespräch'}</h1>
            </div>
            <div className="p-4 space-y-4">
              <div className="flex gap-2">
                <Input
                  placeholder={chat.isAr ? 'ابحث باسم المستخدم...' : 'Nach Benutzername suchen...'}
                  value={chat.searchUser}
                  onChange={e => chat.setSearchUser(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && !chat.searching && chat.searchForUser()}
                  className="flex-1 rounded-full h-10"
                  dir="auto"
                  disabled={chat.searching}
                />
                <Button
                  size="icon"
                  className="rounded-full h-10 w-10"
                  onClick={chat.searchForUser}
                  disabled={chat.searching || !chat.searchUser.trim()}
                  aria-label={chat.isAr ? 'بحث' : 'Suchen'}
                >
                  {chat.searching
                    ? <div className="w-4 h-4 border-2 border-primary-foreground/30 border-t-primary-foreground rounded-full animate-spin" aria-hidden="true" />
                    : <Search className="h-4 w-4" />}
                </Button>
              </div>
              {chat.searching && (
                <p className="text-muted-foreground text-sm text-center" aria-live="polite">
                  {chat.isAr ? 'جاري البحث...' : 'Suche läuft...'}
                </p>
              )}
              {!chat.searching && chat.searchError && (
                <p className="text-destructive text-sm text-center">{chat.searchError}</p>
              )}
              {chat.searchResult && !chat.searching && (
                <motion.button initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} onClick={chat.startConversation} disabled={chat.loading} className="w-full flex items-center gap-3 p-4 rounded-2xl bg-accent/20 active:bg-accent/40 transition-colors disabled:opacity-60">
                  {renderAvatar(chat.searchResult.username, chat.searchResult.avatar_url, 'h-14 w-14')}
                  <div className="text-start flex-1 min-w-0">
                    <span className="font-semibold text-[15px] block truncate">{chat.searchResult.display_name || chat.searchResult.username}</span>
                    {chat.searchResult.display_name && chat.searchResult.display_name !== chat.searchResult.username && (
                      <span className="text-[13px] text-muted-foreground">@{chat.searchResult.username}</span>
                    )}
                  </div>
                  {chat.loading && (
                    <div className="w-5 h-5 border-2 border-primary/30 border-t-primary rounded-full animate-spin shrink-0" aria-label={chat.isAr ? 'جاري البدء' : 'Startet'} />
                  )}
                </motion.button>
              )}
            </div>
          </>

        /* ───────────────── CHAT VIEW ───────────────── */
        ) : (
          <>
            {/* ── Chat Header ── */}
            <div className="sticky top-0 z-30 h-14 px-3 flex items-center gap-2 bg-background border-b border-border/20 shrink-0">
              {chat.selectionMode ? (
                <>
                  <button onClick={chat.clearSelection} className="w-9 h-9 rounded-full flex items-center justify-center active:bg-accent/40 transition-colors shrink-0">
                    <X className="w-5 h-5 text-foreground" />
                  </button>
                  <span className="font-semibold text-[15px]">
                    {chat.selectedIds.size} {chat.isAr ? 'محددة' : 'ausgewählt'}
                  </span>
                  <div className="flex-1" />
                  <button onClick={chat.copySelectedMessages} className="w-9 h-9 rounded-full flex items-center justify-center active:bg-accent/40" aria-label={chat.isAr ? 'نسخ' : 'Kopieren'}>
                    <Copy className="w-5 h-5 text-foreground" />
                  </button>
                  <button onClick={() => {
                    const msgs = chat.messages.filter(m => chat.selectedIds.has(m.id));
                    chat.startForward(msgs);
                  }} className="w-9 h-9 rounded-full flex items-center justify-center active:bg-accent/40" aria-label={chat.isAr ? 'توجيه' : 'Weiterleiten'}>
                    <ForwardIcon className="w-5 h-5 text-foreground" />
                  </button>
                  <button onClick={() => {
                    const ids = chat.messages.filter(m => chat.selectedIds.has(m.id) && !m.deleted).map(m => m.id);
                    chat.hideManyForSelf(ids);
                  }} className="w-9 h-9 rounded-full flex items-center justify-center active:bg-accent/40" aria-label={chat.isAr ? 'حذف لي فقط' : 'Für mich löschen'}>
                    <EyeOff className="w-5 h-5 text-foreground" />
                  </button>
                  {chat.messages.filter(m => chat.selectedIds.has(m.id) && m.sender_id === chat.user?.id && !m.deleted).length > 0 && (
                    <button onClick={chat.deleteSelectedMessages} className="w-9 h-9 rounded-full flex items-center justify-center active:bg-destructive/15" aria-label={chat.isAr ? 'حذف للجميع' : 'Für alle löschen'}>
                      <Trash2 className="w-5 h-5 text-destructive" />
                    </button>
                  )}
                </>
              ) : (
                <>
                  <button
                    onClick={() => { chat.setActiveConv(null); chat.loadConversations(); }}
                    className="w-9 h-9 rounded-full flex items-center justify-center active:bg-accent/40 transition-colors shrink-0 relative"
                    aria-label={chat.isAr ? 'رجوع' : 'Zurück'}
                  >
                    <BackIcon className="w-5 h-5 text-foreground" />
                    {totalUnread > 0 && (
                      <span className="absolute -top-0.5 -end-0.5 bg-primary text-primary-foreground text-[9px] font-bold rounded-full min-w-[14px] h-[14px] flex items-center justify-center px-1">
                        {totalUnread > 9 ? '9+' : totalUnread}
                      </span>
                    )}
                  </button>
                  <button className="flex items-center gap-2.5 flex-1 min-w-0 active:opacity-70 transition-opacity" onClick={() => chat.setShowProfilePopup(true)}>
                    <div className="relative shrink-0">
                      {renderAvatar(chat.activeConv?.otherUsername, chat.activeConv?.otherAvatarUrl, 'h-9 w-9')}
                      {chat.otherPresence.isOnline && (
                        <span aria-label={chat.isAr ? 'متصل الآن' : 'Online'} className="absolute bottom-0 end-0 block h-2.5 w-2.5 rounded-full bg-green-500 ring-2 ring-background" />
                      )}
                    </div>
                    <div className="min-w-0 text-start">
                      <span className="font-semibold text-[15px] block truncate leading-tight flex items-center gap-1">
                        {chat.activeConv?.otherDisplayName || chat.activeConv?.otherUsername}
                        {chat.activeConv && chat.chatPrefs.isMuted(chat.activeConv.id) && (
                          <BellOff className="w-3 h-3 text-muted-foreground/50 shrink-0" />
                        )}
                      </span>
                      <AnimatePresence mode="wait">
                        {chat.typingUser ? (
                          <motion.div key="typing" initial={{ opacity: 0, y: 2 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 2 }} className="flex items-center gap-1.5">
                            <span className="text-[11px] text-primary font-medium leading-tight">{chat.isAr ? 'يكتب' : 'tippt'}</span>
                            <TypingDots />
                          </motion.div>
                        ) : (
                          <motion.span key="status" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className={cn('text-[11px] leading-tight block', chat.otherPresence.isOnline ? 'text-green-500 font-medium' : 'text-muted-foreground/60')}>
                            {chat.otherPresence.text}
                          </motion.span>
                        )}
                      </AnimatePresence>
                    </div>
                  </button>

                  {chat.selfDestructSeconds && (
                    <div className="flex items-center gap-1 px-2 py-1 rounded-full bg-accent/20">
                      <Timer className="w-3 h-3 text-primary" />
                      <span className="text-[10px] text-primary font-medium">{formatSelfDestructLabel(chat.selfDestructSeconds)}</span>
                    </div>
                  )}

                  {/* Three-dot menu */}
                  <div className="relative">
                    <button onClick={() => chat.setShowChatMenu(!chat.showChatMenu)} className="w-9 h-9 rounded-full flex items-center justify-center active:bg-accent/40 transition-colors" aria-label={chat.isAr ? 'خيارات' : 'Optionen'}>
                      <MoreVertical className="h-5 w-5 text-muted-foreground" />
                    </button>
                    <AnimatePresence>
                      {chat.showChatMenu && (
                        <>
                          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-10" onClick={() => chat.setShowChatMenu(false)} />
                          <motion.div
                            initial={{ opacity: 0, scale: 0.95, y: -4 }}
                            animate={{ opacity: 1, scale: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 0.95 }}
                            transition={{ duration: 0.15 }}
                            className={cn('absolute top-full mt-1 bg-card border border-border/30 rounded-xl z-20 min-w-[200px] overflow-hidden shadow-lg', chat.isAr ? 'left-0' : 'right-0')}
                          >
                            <button className="w-full flex items-center gap-3 px-4 py-2.5 active:bg-accent/30 transition-colors text-[13px] text-start" onClick={() => { chat.setShowSearch(true); chat.setShowChatMenu(false); }}>
                              <Search className="w-4 h-4 text-muted-foreground" />{chat.isAr ? 'بحث في المحادثة' : 'Im Chat suchen'}
                            </button>
                            <button className="w-full flex items-center gap-3 px-4 py-2.5 active:bg-accent/30 transition-colors text-[13px] text-start" onClick={() => chat.setShowMuteMenu(!chat.showMuteMenu)}>
                              {chat.chatPrefs.isMuted(chat.activeConv!.id) ? <Bell className="w-4 h-4 text-muted-foreground" /> : <BellOff className="w-4 h-4 text-muted-foreground" />}
                              {chat.chatPrefs.isMuted(chat.activeConv!.id)
                                ? (() => {
                                    const exp = chat.chatPrefs.muteExpiresAt(chat.activeConv!.id);
                                    if (exp == null) return chat.isAr ? 'إلغاء الكتم' : 'Laut schalten';
                                    const mins = Math.max(0, Math.round((exp - Date.now()) / 60000));
                                    return chat.isAr
                                      ? `مكتومة (${mins < 60 ? `${mins}د` : mins < 1440 ? `${Math.round(mins / 60)}س` : `${Math.round(mins / 1440)}ي`})`
                                      : `Stumm (${mins < 60 ? `${mins} Min` : mins < 1440 ? `${Math.round(mins / 60)} Std` : `${Math.round(mins / 1440)} T`})`;
                                  })()
                                : (chat.isAr ? 'كتم الإشعارات' : 'Stummschalten')}
                            </button>
                            <AnimatePresence>
                              {chat.showMuteMenu && (
                                <motion.div initial={{ height: 0 }} animate={{ height: 'auto' }} exit={{ height: 0 }} className="overflow-hidden">
                                  <div className="px-3 pb-2 space-y-0.5">
                                    {chat.chatPrefs.isMuted(chat.activeConv!.id) && (
                                      <button
                                        onClick={() => { chat.chatPrefs.muteFor(chat.activeConv!.id, 0); chat.setShowMuteMenu(false); chat.setShowChatMenu(false); }}
                                        className="w-full text-start px-3 py-1.5 rounded-lg text-[12px] transition-colors text-primary active:bg-accent/30"
                                      >
                                        {chat.isAr ? 'إلغاء الكتم' : 'Laut schalten'}
                                      </button>
                                    )}
                                    {MUTE_DURATION_OPTIONS.map(opt => (
                                      <button
                                        key={`mute-${opt.valueSeconds}`}
                                        onClick={() => { chat.chatPrefs.muteFor(chat.activeConv!.id, opt.valueSeconds); chat.setShowMuteMenu(false); chat.setShowChatMenu(false); }}
                                        className="w-full text-start px-3 py-1.5 rounded-lg text-[12px] transition-colors text-foreground active:bg-accent/30"
                                      >
                                        {chat.isAr ? opt.labelAr : opt.labelDe}
                                      </button>
                                    ))}
                                  </div>
                                </motion.div>
                              )}
                            </AnimatePresence>
                            <button className="w-full flex items-center gap-3 px-4 py-2.5 active:bg-accent/30 transition-colors text-[13px] text-start" onClick={() => { chat.chatPrefs.togglePinned(chat.activeConv!.id); chat.setShowChatMenu(false); }}>
                              {chat.chatPrefs.isPinned(chat.activeConv!.id) ? <PinOff className="w-4 h-4 text-muted-foreground" /> : <Pin className="w-4 h-4 text-muted-foreground" />}
                              {chat.chatPrefs.isPinned(chat.activeConv!.id) ? (chat.isAr ? 'إلغاء التثبيت' : 'Lösen') : (chat.isAr ? 'تثبيت المحادثة' : 'Chat anheften')}
                            </button>
                            <button className="w-full flex items-center gap-3 px-4 py-2.5 active:bg-accent/30 transition-colors text-[13px] text-start" onClick={() => { chat.setShowWallpaperPicker(true); chat.setShowChatMenu(false); }}>
                              <WallpaperIcon className="w-4 h-4 text-muted-foreground" />
                              {chat.isAr ? 'الخلفية' : 'Hintergrund'}
                            </button>
                            <div className="h-px bg-border/15 mx-3" />
                            <button className="w-full flex items-center gap-3 px-4 py-2.5 active:bg-accent/30 transition-colors text-[13px] text-start" onClick={() => { chat.setShowProfilePopup(true); chat.setProfileTab('media'); chat.setShowChatMenu(false); if (chat.activeConv) { supabase.from('messages').select('*').eq('conversation_id', chat.activeConv.id).in('message_type', ['image', 'file']).eq('deleted', false).order('created_at', { ascending: false }).limit(50).then(({ data }) => chat.setSharedMedia((data || []) as Message[])); } }}>
                              <ImageIcon className="w-4 h-4 text-muted-foreground" />{chat.isAr ? 'الوسائط المشتركة' : 'Geteilte Medien'}
                            </button>
                            <button className="w-full flex items-center gap-3 px-4 py-2.5 active:bg-accent/30 transition-colors text-[13px] text-start" onClick={() => chat.setShowSelfDestructMenu(!chat.showSelfDestructMenu)}>
                              {chat.selfDestructSeconds ? <TimerOff className="w-4 h-4 text-muted-foreground" /> : <Timer className="w-4 h-4 text-muted-foreground" />}
                              {chat.isAr ? 'رسائل زائلة' : 'Verschwindend'}
                            </button>
                            <AnimatePresence>
                              {chat.showSelfDestructMenu && (
                                <motion.div initial={{ height: 0 }} animate={{ height: 'auto' }} exit={{ height: 0 }} className="overflow-hidden">
                                  <div className="px-3 pb-2 space-y-0.5">
                                    {SELF_DESTRUCT_OPTIONS.map(opt => (
                                      <button
                                        key={`sd-${opt.valueSeconds ?? 'off'}`}
                                        onClick={() => chat.toggleSelfDestruct(opt.valueSeconds)}
                                        className={cn(
                                          'w-full text-start px-3 py-1.5 rounded-lg text-[12px] transition-colors',
                                          chat.selfDestructSeconds === opt.valueSeconds
                                            ? 'bg-primary/15 text-primary font-medium'
                                            : 'active:bg-accent/30 text-foreground'
                                        )}
                                      >
                                        {chat.isAr ? opt.labelAr : opt.labelDe}
                                      </button>
                                    ))}
                                  </div>
                                </motion.div>
                              )}
                            </AnimatePresence>
                            <div className="h-px bg-border/15 mx-3" />
                            <button
                              className="w-full flex items-center justify-between gap-3 px-4 py-2.5 active:bg-accent/30 transition-colors text-[13px] text-start"
                              onClick={() => chat.chatPrefs.setEnterToSend(!chat.chatPrefs.prefs.enterToSend)}
                              role="menuitemcheckbox"
                              aria-checked={chat.chatPrefs.prefs.enterToSend}
                            >
                              <span className="flex items-center gap-3">
                                <CornerDownLeft className="w-4 h-4 text-muted-foreground" />
                                {chat.isAr ? 'Enter للإرسال' : 'Enter zum Senden'}
                              </span>
                              <span className={cn(
                                'relative w-8 h-[18px] rounded-full transition-colors shrink-0',
                                chat.chatPrefs.prefs.enterToSend ? 'bg-primary' : 'bg-muted/50'
                              )}>
                                <span className={cn(
                                  'absolute top-[2px] w-[14px] h-[14px] rounded-full bg-background shadow-sm transition-all',
                                  chat.chatPrefs.prefs.enterToSend ? 'start-[16px]' : 'start-[2px]'
                                )} />
                              </span>
                            </button>
                            <div className="h-px bg-border/15 mx-3" />
                            <button className="w-full flex items-center gap-3 px-4 py-2.5 active:bg-destructive/10 transition-colors text-[13px] text-destructive text-start" onClick={chat.deleteConversation}>
                              <Trash className="w-4 h-4" />{chat.isAr ? 'حذف المحادثة' : 'Chat löschen'}
                            </button>
                          </motion.div>
                        </>
                      )}
                    </AnimatePresence>
                  </div>
                </>
              )}
            </div>

            {/* ── Search Bar ── */}
            <AnimatePresence>
              {chat.showSearch && (
                <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden border-b border-border/20 shrink-0">
                  <div className="flex items-center gap-2 px-3 h-12">
                    <Search className="w-4 h-4 text-muted-foreground/50 shrink-0" />
                    <input type="text" value={chat.chatSearchQuery} onChange={e => chat.searchInChat(e.target.value)} placeholder={chat.isAr ? 'بحث في المحادثة...' : 'Suchen...'} className="flex-1 bg-transparent text-[14px] outline-none placeholder:text-muted-foreground/40" dir="auto" autoFocus />
                    {chat.searchResults.length > 0 && <span className="text-[11px] text-muted-foreground tabular-nums shrink-0">{chat.searchIndex + 1}/{chat.searchResults.length}</span>}
                    <div className="flex gap-0.5 shrink-0">
                      <button onClick={() => chat.navigateSearch('up')} className="w-7 h-7 rounded-full flex items-center justify-center active:bg-accent/30"><ChevronRight className="w-3.5 h-3.5 rotate-[-90deg] text-muted-foreground" /></button>
                      <button onClick={() => chat.navigateSearch('down')} className="w-7 h-7 rounded-full flex items-center justify-center active:bg-accent/30"><ChevronRight className="w-3.5 h-3.5 rotate-90 text-muted-foreground" /></button>
                    </div>
                    <button onClick={() => chat.setShowSearch(false)} className="w-7 h-7 rounded-full flex items-center justify-center active:bg-accent/30"><X className="w-3.5 h-3.5 text-muted-foreground" /></button>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* ── Pinned Message ── */}
            <AnimatePresence>
              {chat.pinnedMessage && !chat.pinnedMessage.deleted && (
                <motion.button initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="w-full border-b border-border/20 px-3 py-2 flex items-center gap-2.5 bg-accent/5 active:bg-accent/15 transition-colors text-start overflow-hidden shrink-0" onClick={() => { const el = document.getElementById(`msg-${chat.pinnedMessage!.id}`); el?.scrollIntoView({ behavior: 'smooth', block: 'center' }); }}>
                  <Pin className="w-3.5 h-3.5 text-primary shrink-0 rotate-45" />
                  <div className="flex-1 min-w-0">
                    <p className="text-[10px] text-primary font-semibold">{chat.isAr ? 'رسالة مثبتة' : 'Angeheftet'}</p>
                    <p className="text-[12px] text-foreground/70 truncate" dir="auto">{chat.pinnedMessage.message_type === 'text' ? stripMarkers(chat.pinnedMessage.content) : chat.pinnedMessage.message_type === 'image' ? '📷' : chat.pinnedMessage.message_type === 'voice' ? '🎤' : '📎'}</p>
                  </div>
                  <button onClick={(e) => { e.stopPropagation(); chat.pinMessage(chat.pinnedMessage!); }} className="shrink-0 w-6 h-6 rounded-full flex items-center justify-center active:bg-muted/50"><X className="w-3 h-3 text-muted-foreground" /></button>
                </motion.button>
              )}
            </AnimatePresence>

            {/* ── Messages ── */}
            <div
              ref={chat.messagesContainerRef}
              className={cn(
                'flex-1 overflow-y-auto px-3 py-3 overscroll-contain scroll-smooth will-change-scroll relative',
                isDarkBg && 'text-white'
              )}
              style={{
                WebkitOverflowScrolling: 'touch',
                background: currentWallpaper.background,
              } as React.CSSProperties}
              onScroll={chat.handleScroll}
              onClick={() => { chat.setShowChatMenu(false); setActionMenu(null); chat.setShowExtraEmojis(false); }}
              onDragEnter={onDragEnter}
              onDragOver={onDragOver}
              onDragLeave={onDragLeave}
              onDrop={onDrop}
            >
              <AnimatePresence>
                {isDraggingFiles && (
                  <motion.div
                    initial={{ opacity: 0, scale: 0.98 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.98 }}
                    className="absolute inset-2 z-30 rounded-2xl border-2 border-dashed border-primary bg-primary/10 backdrop-blur-sm flex flex-col items-center justify-center gap-3 pointer-events-none"
                    aria-hidden="true"
                  >
                    <div className="w-14 h-14 rounded-full bg-primary/20 flex items-center justify-center">
                      <Upload className="w-7 h-7 text-primary" />
                    </div>
                    <p className="text-[14px] font-semibold text-primary">
                      {chat.isAr ? 'أفلت الملفات هنا للإرسال' : 'Dateien hier ablegen zum Senden'}
                    </p>
                  </motion.div>
                )}
              </AnimatePresence>
              {chat.messagesLoading && chat.messages.length === 0 && (
                <div className="flex flex-col gap-3 py-4" aria-hidden="true">
                  {[0, 1, 2, 3, 4].map(i => {
                    const mine = i % 2 === 1;
                    const width = 140 + ((i * 37) % 140);
                    return (
                      <div key={i} className={cn('flex', mine ? 'justify-end' : 'justify-start')}>
                        <div
                          className="skeleton h-10"
                          style={{ width, borderRadius: mine ? '18px 4px 4px 18px' : '4px 18px 18px 4px' }}
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
                      {chat.isAr ? 'لا توجد رسائل بعد' : 'Noch keine Nachrichten'}
                    </p>
                    <p className="text-[12px] text-muted-foreground/70 mt-1">
                      {chat.isAr ? 'أرسل رسالتك الأولى لبدء المحادثة' : 'Sende die erste Nachricht'}
                    </p>
                  </div>
                </div>
              )}

              {chat.messages.map((msg, idx) => {
                const isMine = msg.sender_id === chat.user!.id;
                const msgReactions = chat.reactions.filter(r => r.message_id === msg.id);
                const { sameSenderAsPrev, sameSenderAsNext, showDate } = chat.getMessageMeta(idx);
                const fadeOpacity = chat.getMessageOpacity(msg);
                const isFading = msg.expires_at && fadeOpacity < 1;
                const bubbleStyle = getBubbleRadius(isMine, sameSenderAsPrev, sameSenderAsNext);
                const isSelected = chat.selectedIds.has(msg.id);
                const isFirstUnread = msg.id === chat.firstUnreadId;

                return (
                  <React.Fragment key={msg.id}>
                    {/* Date separator */}
                    {showDate && (
                      <div className="flex justify-center py-4">
                        <span className="text-[11px] text-muted-foreground/70 bg-background/60 backdrop-blur-sm px-3 py-1 rounded-full font-medium shadow-sm">
                          {formatDateSeparator(msg.created_at, chat.isAr)}
                        </span>
                      </div>
                    )}

                    {/* "New messages" divider */}
                    {isFirstUnread && (
                      <div className="flex items-center gap-2 my-3">
                        <div className="flex-1 h-px bg-primary/30" />
                        <span className="text-[10px] font-semibold text-primary uppercase tracking-wider bg-primary/10 px-2 py-0.5 rounded-full">
                          {chat.isAr ? 'رسائل جديدة' : 'Neue Nachrichten'}
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
                        isSelected && 'bg-primary/10'
                      )}
                      style={{ opacity: fadeOpacity, transition: 'opacity 2s ease-out, background-color 0.15s' }}
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
                        onSwipeReply={() => { chat.setReplyTo(msg); chat.inputRef.current?.focus(); }}
                      >
                        <div
                          className={cn('relative group w-fit min-w-[72px] max-w-[82%]')}
                          onContextMenu={(e) => { e.preventDefault(); openActionMenu(msg, isMine, e.currentTarget as HTMLElement); }}
                          onPointerDown={(e) => { handleDoubleTapReact(msg, e); beginLongPress(msg, isMine, e); }}
                          onPointerMove={continueLongPress}
                          onPointerUp={(e) => endLongPress(msg, e)}
                          onPointerCancel={(e) => clearLongPress(e.pointerId)}
                          onPointerLeave={(e) => clearLongPress(e.pointerId)}
                          role="article"
                          aria-label={isMine ? (chat.isAr ? 'رسالتك' : 'Deine Nachricht') : (chat.activeConv?.otherDisplayName || chat.activeConv?.otherUsername || '')}
                        >
                          {/* Selection checkmark */}
                          {chat.selectionMode && !msg.deleted && (
                            <div className={cn(
                              'absolute top-1 z-10 w-5 h-5 rounded-full border-2 flex items-center justify-center transition-colors',
                              isMine ? 'start-1' : 'end-1',
                              isSelected ? 'bg-primary border-primary' : 'bg-background/80 border-border/50'
                            )}>
                              {isSelected && <Check className="w-3 h-3 text-primary-foreground" />}
                            </div>
                          )}

                          <div
                            className={cn(
                              'overflow-hidden text-[15px] leading-[1.5]',
                              msg.deleted
                                ? 'bg-muted/20 text-muted-foreground/50 italic'
                                : isMine
                                  ? isDarkBg ? 'bg-primary/90 text-primary-foreground' : 'bg-primary/15 text-foreground'
                                  : isDarkBg ? 'bg-white/10 backdrop-blur-md text-white border border-white/5' : 'bg-card border border-border/15 text-foreground'
                            )}
                            style={bubbleStyle}
                          >
                            {/* Forwarded provenance — Telegram-style "↪ Forwarded from Author" */}
                            {msg.forwarded_from_sender_id && !msg.deleted && (
                              <div className="px-3 pt-2 -mb-1">
                                <ForwardedBadge name={chat.getForwardedName(msg.forwarded_from_sender_id)} isAr={chat.isAr} />
                              </div>
                            )}

                            {/* Reply preview inside bubble */}
                            {msg.reply_to_id && !msg.deleted && (() => {
                              const repliedMsg = chat.messages.find(m => m.id === msg.reply_to_id);
                              const replySenderName = repliedMsg?.sender_id === chat.user!.id ? (chat.isAr ? 'أنت' : 'Du') : (chat.activeConv?.otherDisplayName || chat.activeConv?.otherUsername || '');
                              return (
                                <button
                                  className={cn('w-full mx-0 mt-1.5 px-2 text-start')}
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    if (msg.reply_to_id) {
                                      const el = document.getElementById(`msg-${msg.reply_to_id}`);
                                      if (el) {
                                        el.scrollIntoView({ behavior: 'smooth', block: 'center' });
                                        el.classList.add('animate-pulse');
                                        setTimeout(() => el.classList.remove('animate-pulse'), 1500);
                                      }
                                    }
                                  }}
                                >
                                  <div className={cn('rounded-lg border-s-2 px-2.5 py-1.5', isMine ? 'bg-primary/10 border-primary' : 'bg-muted/40 border-primary/70')}>
                                    <span className={cn('block text-[11px] font-semibold leading-none mb-0.5', 'text-primary')}>{replySenderName}</span>
                                    <span className="block text-[12px] leading-[1.3] line-clamp-2 text-muted-foreground" dir="auto">{chat.getReplyPreview(msg.reply_to_id)}</span>
                                  </div>
                                </button>
                              );
                            })()}

                            {msg.deleted ? (
                              <p className="px-3 py-2 text-[13px]">{chat.isAr ? '🚫 تم حذف هذه الرسالة' : '🚫 Diese Nachricht wurde gelöscht'}</p>
                            ) : msg.message_type === 'image' ? (
                              <div className="relative">
                                <ChatImage
                                  src={chat.getFileUrl(msg)}
                                  alt={msg.file_name || 'image'}
                                  isAr={chat.isAr}
                                  refreshUrl={() => chat.refreshSignedUrl(msg)}
                                  className="max-w-full max-h-60 aspect-[4/3] cursor-pointer"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    if (chat.selectionMode) { chat.toggleSelect(msg.id); return; }
                                    const url = chat.getFileUrl(msg);
                                    if (!url) return;
                                    const rect = (e.target as HTMLElement).getBoundingClientRect();
                                    chat.setLightboxRect(rect);
                                    chat.setLightboxSrc(url);
                                    chat.setLightboxOpen(true);
                                  }}
                                />
                                <div className="px-3 py-1.5">
                                  {msg.content && msg.content !== msg.file_name && (
                                    <p className="break-words whitespace-pre-wrap text-[15px] leading-[1.45] [overflow-wrap:anywhere] [unicode-bidi:plaintext]" dir="auto">
                                      {renderRichText(msg.content)}
                                    </p>
                                  )}
                                  <div className={cn('mt-0.5 flex items-center justify-end gap-[3px] text-[11px] leading-none', isDarkBg && isMine ? 'text-primary-foreground/70' : 'text-muted-foreground/60')} dir="ltr">
                                    {msg.edited_at && <span className="text-[9px] italic">{chat.isAr ? 'معدّلة' : 'bearb.'}</span>}
                                    {isFading && <Timer className="h-[10px] w-[10px] animate-pulse" />}
                                    <span>{formatClockTime(msg.created_at)}</span>
                                    {isMine && <MessageTicks status={msg.status} read={msg.read} dimmed={isDarkBg} isAr={chat.isAr} onRetry={() => chat.retryFailedMessage(msg)} />}
                                  </div>
                                </div>
                              </div>
                            ) : msg.message_type === 'voice' ? (
                              <VoiceBubble
                                msg={msg}
                                isMine={isMine}
                                isDarkBg={!!isDarkBg}
                                isFading={!!isFading}
                                isAr={chat.isAr}
                                fileUrl={chat.getFileUrl(msg)}
                                rawFileUrl={msg.file_url ?? null}
                                senderName={isMine ? (chat.isAr ? 'أنت' : 'Du') : (chat.activeConv?.otherDisplayName || chat.activeConv?.otherUsername || '')}
                                onSelectToggle={chat.toggleSelect}
                                selectionMode={chat.selectionMode}
                                voicePlayer={voicePlayer}
                              />
                            ) : msg.message_type === 'file' ? (
                              <div className="px-3 py-2">
                                <a href={chat.getFileUrl(msg)} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 text-foreground" onClick={e => e.stopPropagation()}>
                                  <FileText className="h-5 w-5 shrink-0 text-muted-foreground" /><span className="flex-1 truncate text-[13px]">{msg.file_name}</span><Download className="h-4 w-4 shrink-0 opacity-50" />
                                </a>
                                <div className={cn('mt-1 flex items-center justify-end gap-[3px] text-[11px] leading-none', isDarkBg && isMine ? 'text-primary-foreground/70' : 'text-muted-foreground/60')} dir="ltr">
                                  {isFading && <Timer className="h-[10px] w-[10px] animate-pulse" />}
                                  <span>{formatClockTime(msg.created_at)}</span>
                                  {isMine && <MessageTicks status={msg.status} read={msg.read} dimmed={isDarkBg} isAr={chat.isAr} onRetry={() => chat.retryFailedMessage(msg)} />}
                                </div>
                              </div>
                            ) : (
                              /* ── Text message ── */
                              <div className="px-[10px] py-[6px]">
                                <p className="break-words whitespace-pre-wrap text-[15px] leading-[1.5] [word-break:normal] [unicode-bidi:plaintext]" dir="auto">
                                  {chat.showSearch && chat.chatSearchQuery
                                    ? renderHighlighted(msg.content, chat.chatSearchQuery)
                                    : renderRichText(msg.content)}
                                  {!msg.deleted && (
                                    <>
                                      <span aria-hidden="true" className="inline-block w-1.5" />
                                      <span className={cn('inline-flex translate-y-[1px] items-center gap-[3px] align-bottom whitespace-nowrap text-[11px] leading-none select-none',
                                        isDarkBg && isMine ? 'text-primary-foreground/70' : 'text-muted-foreground/60')} dir="ltr">
                                        {msg.edited_at && <span className="text-[9px] italic">{chat.isAr ? 'معدّلة' : 'bearb.'}</span>}
                                        {isFading && <Timer className="h-[10px] w-[10px] animate-pulse" />}
                                        <span>{formatClockTime(msg.created_at)}</span>
                                        {isMine && (
                                          <MessageTicks
                                            status={msg.status}
                                            read={msg.read}
                                            dimmed={isDarkBg}
                                            isAr={chat.isAr}
                                            onRetry={() => chat.retryFailedMessage(msg)}
                                          />
                                        )}
                                      </span>
                                    </>
                                  )}
                                </p>
                              </div>
                            )}
                          </div>

                          {/* Reactions */}
                          {msgReactions.length > 0 && (
                            <div className={cn('flex gap-1 -mt-1.5 flex-wrap relative z-[1]', isMine ? 'justify-end pe-1' : 'justify-start ps-1')} dir="ltr">
                              {(() => {
                                const grouped: Record<string, { count: number; mine: boolean }> = {};
                                for (const r of msgReactions) {
                                  if (!grouped[r.emoji]) grouped[r.emoji] = { count: 0, mine: false };
                                  grouped[r.emoji].count += 1;
                                  if (chat.user && r.user_id === chat.user.id) grouped[r.emoji].mine = true;
                                }
                                return Object.entries(grouped).map(([emoji, info]) => (
                                  <ReactionPill
                                    key={emoji}
                                    emoji={emoji}
                                    count={info.count}
                                    reactedByMe={info.mine}
                                    onClick={() => { if (chat.user) chat.toggleReaction(msg.id, emoji); }}
                                    ariaLabel={info.mine
                                      ? `${emoji} (${chat.isAr ? 'تفاعلت' : 'du hast reagiert'})`
                                      : `${emoji} reaction`}
                                  />
                                ));
                              })()}
                            </div>
                          )}
                        </div>
                      </SwipeableMessage>
                    </div>
                  </React.Fragment>
                );
              })}

              {/* Typing indicator */}
              <AnimatePresence>
                {chat.typingUser && (
                  <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 6 }} className="flex justify-start mt-2" aria-live="polite" aria-label={chat.isAr ? 'يكتب' : 'tippt'}>
                    <div className="bg-card border border-border/15 px-4 py-2.5" style={{ borderRadius: '18px 18px 18px 4px' }}>
                      <TypingDots />
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Image uploads in progress */}
              {chat.activeConv && chat.imageUpload.uploads.filter(u => u.conversationId === chat.activeConv!.id).map(upload => (
                <div key={upload.tempId} className="flex justify-end mt-2">
                  <div className="relative max-w-[75%] overflow-hidden bg-primary/15" style={{ borderRadius: '18px 18px 4px 18px' }}>
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
                    <div className="px-3 py-1.5"><div className="flex items-center justify-end gap-[3px] text-[11px] leading-none text-muted-foreground/60" dir="ltr"><span>{formatClockTime(new Date().toISOString())}</span></div></div>
                  </div>
                </div>
              ))}

              <div ref={chat.messagesEndRef} />
            </div>

            {/* ── Scroll to Bottom FAB ── */}
            <AnimatePresence>
              {chat.showScrollDown && (
                <motion.button
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.8 }}
                  transition={{ type: 'spring', damping: 20, stiffness: 400 }}
                  onClick={() => chat.scrollToBottom()}
                  aria-label={chat.isAr ? 'الانتقال للأسفل' : 'Nach unten scrollen'}
                  className="absolute bottom-24 end-4 z-10 w-10 h-10 rounded-full bg-card border border-border/20 flex items-center justify-center active:scale-90 transition-transform shadow-md"
                >
                  <ArrowDown className="w-4 h-4 text-muted-foreground" />
                  {(() => {
                    const unread = chat.activeConv?.unreadCount || 0;
                    if (!unread) return null;
                    return (
                      <span className="absolute -top-1 -end-1 bg-primary text-primary-foreground text-[10px] font-bold rounded-full min-w-[18px] h-[18px] flex items-center justify-center px-1 shadow">
                        {unread > 99 ? '99+' : unread}
                      </span>
                    );
                  })()}
                </motion.button>
              )}
            </AnimatePresence>

            {/* ── Action Menu (Long Press / tap) ── */}
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
                    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.12 }} className="fixed inset-0 z-[60] bg-black/40 backdrop-blur-sm" onClick={() => { setActionMenu(null); chat.setShowExtraEmojis(false); }} />
                    <div className="fixed inset-0 z-[61] pointer-events-none" onClick={() => { setActionMenu(null); chat.setShowExtraEmojis(false); }}>
                      <motion.div initial={{ opacity: 0, scale: 0.92 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.92 }} transition={{ type: 'spring', damping: 28, stiffness: 450 }} className={cn("absolute pointer-events-auto flex flex-col", showAbove ? "flex-col-reverse" : "flex-col", actionMenu.isMine ? 'items-end' : 'items-start')} style={{ top: showAbove ? undefined : `${actionMenu.rect.top}px`, bottom: showAbove ? `${window.innerHeight - actionMenu.rect.top + 4}px` : undefined, left: `${menuLeft}px`, width: `${menuWidth}px`, maxWidth: `${menuWidth}px` }} onClick={e => e.stopPropagation()}>
                        {/* Message preview */}
                        <div className={cn('text-[15px] overflow-hidden', actionMenu.isMine ? 'bg-primary/15 text-foreground' : 'bg-card border border-border/15 text-foreground')} style={getBubbleRadius(actionMenu.isMine, false, false) as React.CSSProperties}>
                          {actionMenu.msg.message_type === 'text' && (
                            <div className="relative px-[10px] py-[6px]" style={{ width: `${previewWidth}px`, maxWidth: '100%' }}>
                              <span className="break-words whitespace-pre-wrap" dir="auto">{renderRichText(actionMenu.msg.content)}<span className="inline-block align-bottom" style={{ width: '62px', height: '1px' }} /></span>
                              <span className={cn('absolute bottom-[6px] flex items-center gap-[3px] text-[10px] whitespace-nowrap text-muted-foreground/50', chat.isAr ? 'left-2.5' : 'right-2.5')}>
                                {formatClockTime(actionMenu.msg.created_at)}
                                {actionMenu.isMine && <MessageTicks status={actionMenu.msg.status} read={actionMenu.msg.read} isAr={chat.isAr} />}
                              </span>
                            </div>
                          )}
                          {actionMenu.msg.message_type === 'image' && (
                            <ChatImage
                              src={chat.getFileUrl(actionMenu.msg)}
                              alt={actionMenu.msg.file_name || ''}
                              isAr={chat.isAr}
                              refreshUrl={() => chat.refreshSignedUrl(actionMenu.msg)}
                              className="max-w-full aspect-[4/3] max-h-40"
                            />
                          )}
                        </div>

                        {/* Emoji bar + actions */}
                        <div className={cn("bg-card border border-border/20 rounded-2xl overflow-hidden shadow-lg", showAbove ? "mb-1.5" : "mt-1.5")}>
                          {/* Quick emojis */}
                          <div className="flex items-center justify-center gap-1 px-3 py-2" dir="ltr">
                            {QUICK_EMOJIS.map(emoji => (
                              <button key={emoji} onClick={() => { chat.toggleReaction(actionMenu.msg.id, emoji); setActionMenu(null); chat.setShowExtraEmojis(false); }} className="text-[22px] active:scale-125 transition-transform px-[2px]" aria-label={`React with ${emoji}`}>{emoji}</button>
                            ))}
                            <button onClick={() => chat.setShowExtraEmojis(!chat.showExtraEmojis)} className={cn("w-7 h-7 rounded-full flex items-center justify-center transition-all ms-1", chat.showExtraEmojis ? "bg-primary text-primary-foreground" : "bg-muted/30 text-muted-foreground")} aria-label="More emojis">
                              <ChevronDown className={cn("w-3.5 h-3.5 transition-transform duration-200", chat.showExtraEmojis && "rotate-180")} />
                            </button>
                          </div>
                          <AnimatePresence>
                            {chat.showExtraEmojis && (
                              <motion.div initial={{ height: 0 }} animate={{ height: 'auto' }} exit={{ height: 0 }} transition={{ duration: 0.2 }} className="overflow-hidden">
                                <div className="h-px bg-border/15 mx-3" />
                                <div className="px-1 pt-1 pb-2">
                                  <EmojiPicker
                                    isAr={chat.isAr}
                                    compact
                                    onPick={(emoji) => {
                                      chat.toggleReaction(actionMenu.msg.id, emoji);
                                      setActionMenu(null);
                                      chat.setShowExtraEmojis(false);
                                    }}
                                  />
                                </div>
                              </motion.div>
                            )}
                          </AnimatePresence>
                          {/* Action buttons */}
                          <div className="h-px bg-border/15 mx-3" />
                          <div className="py-1">
                            <button onClick={() => { chat.setReplyTo(actionMenu.msg); setActionMenu(null); chat.setShowExtraEmojis(false); chat.inputRef.current?.focus(); }} className="w-full flex items-center gap-3 px-4 py-2 active:bg-accent/30 transition-colors text-start">
                              <Reply className="w-4 h-4 text-muted-foreground" /><span className="text-[13px]">{chat.isAr ? 'رد' : 'Antworten'}</span>
                            </button>
                            <button onClick={() => { chat.startForward([actionMenu.msg]); setActionMenu(null); chat.setShowExtraEmojis(false); }} className="w-full flex items-center gap-3 px-4 py-2 active:bg-accent/30 transition-colors text-start">
                              <Share2 className="w-4 h-4 text-muted-foreground" /><span className="text-[13px]">{chat.isAr ? 'توجيه' : 'Weiterleiten'}</span>
                            </button>
                            {actionMenu.msg.message_type === 'text' && actionMenu.msg.content && (
                              <button onClick={() => { chat.copyMessage(stripMarkers(actionMenu.msg.content)); setActionMenu(null); chat.setShowExtraEmojis(false); }} className="w-full flex items-center gap-3 px-4 py-2 active:bg-accent/30 transition-colors text-start">
                                <Copy className="w-4 h-4 text-muted-foreground" /><span className="text-[13px]">{chat.isAr ? 'نسخ النص' : 'Text kopieren'}</span>
                              </button>
                            )}
                            {actionMenu.isMine && actionMenu.msg.message_type === 'text' && !actionMenu.msg.deleted && (
                              <button onClick={() => { chat.startEditMessage(actionMenu.msg); setActionMenu(null); chat.setShowExtraEmojis(false); }} className="w-full flex items-center gap-3 px-4 py-2 active:bg-accent/30 transition-colors text-start">
                                <Pencil className="w-4 h-4 text-muted-foreground" /><span className="text-[13px]">{chat.isAr ? 'تعديل' : 'Bearbeiten'}</span>
                              </button>
                            )}
                            <button onClick={() => { chat.pinMessage(actionMenu.msg); setActionMenu(null); }} className="w-full flex items-center gap-3 px-4 py-2 active:bg-accent/30 transition-colors text-start">
                              {chat.pinnedMessage?.id === actionMenu.msg.id ? <PinOff className="w-4 h-4 text-muted-foreground" /> : <Pin className="w-4 h-4 text-muted-foreground" />}
                              <span className="text-[13px]">{chat.pinnedMessage?.id === actionMenu.msg.id ? (chat.isAr ? 'إلغاء التثبيت' : 'Lösen') : (chat.isAr ? 'تثبيت' : 'Anheften')}</span>
                            </button>
                            <button onClick={() => { chat.toggleSelect(actionMenu.msg.id); setActionMenu(null); chat.setShowExtraEmojis(false); }} className="w-full flex items-center gap-3 px-4 py-2 active:bg-accent/30 transition-colors text-start">
                              <Check className="w-4 h-4 text-muted-foreground" /><span className="text-[13px]">{chat.isAr ? 'تحديد' : 'Auswählen'}</span>
                            </button>
                            {/* Info — only meaningful for messages I sent (delivery/read receipts). */}
                            {actionMenu.isMine && !actionMenu.msg.deleted && (
                              <button onClick={() => { setMessageInfoTarget(actionMenu.msg); setActionMenu(null); chat.setShowExtraEmojis(false); }} className="w-full flex items-center gap-3 px-4 py-2 active:bg-accent/30 transition-colors text-start">
                                <Calendar className="w-4 h-4 text-muted-foreground" /><span className="text-[13px]">{chat.isAr ? 'معلومات الرسالة' : 'Nachrichteninfo'}</span>
                              </button>
                            )}
                            {/* Delete for me — works for any non-deleted message regardless of sender. */}
                            {!actionMenu.msg.deleted && (
                              <button onClick={() => { chat.hideMessageForSelf(actionMenu.msg.id); setActionMenu(null); chat.setShowExtraEmojis(false); }} className="w-full flex items-center gap-3 px-4 py-2 active:bg-accent/30 transition-colors text-start">
                                <EyeOff className="w-4 h-4 text-muted-foreground" /><span className="text-[13px]">{chat.isAr ? 'حذف لي فقط' : 'Für mich löschen'}</span>
                              </button>
                            )}
                            {actionMenu.isMine && !actionMenu.msg.deleted && (
                              <>
                                <div className="h-px bg-border/15 mx-3" />
                                <button onClick={() => { chat.deleteMessage(actionMenu.msg.id); setActionMenu(null); chat.setShowExtraEmojis(false); }} className="w-full flex items-center gap-3 px-4 py-2 active:bg-destructive/10 transition-colors text-start">
                                  <Trash2 className="w-4 h-4 text-destructive" /><span className="text-[13px] text-destructive">{chat.isAr ? 'حذف للجميع' : 'Für alle löschen'}</span>
                                </button>
                              </>
                            )}
                          </div>
                        </div>
                      </motion.div>
                    </div>
                  </>
                );
              })()}
            </AnimatePresence>

            {/* ── Chat Input ── */}
            <ChatInput
              isAr={chat.isAr}
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
              activeConvOtherName={chat.activeConv?.otherDisplayName || chat.activeConv?.otherUsername}
              userId={chat.user.id}
              onPasteFiles={chat.addImagesFromFiles}
              enterToSend={chat.chatPrefs.prefs.enterToSend}
            />
          </>
        )}

        {/* ── Forward picker ── */}
        {chat.forwardingMessages && (
          <ForwardPicker
            isAr={chat.isAr}
            messages={chat.forwardingMessages}
            conversations={chat.conversations.filter(c => c.id !== chat.activeConv?.id)}
            onClose={chat.cancelForward}
            onForward={chat.performForwardTo}
          />
        )}

        {/* ── Message info ── */}
        {/* Always re-resolve the message from the live messages list so
            the modal updates in real time (sent → delivered → read) without
            forcing the caller to re-open the dialog. */}
        <MessageInfo
          isAr={chat.isAr}
          isOpen={!!messageInfoTarget}
          message={messageInfoTarget ? (chat.messages.find(m => m.id === messageInfoTarget.id) ?? messageInfoTarget) : null}
          onClose={() => setMessageInfoTarget(null)}
        />

        {/* ── Wallpaper picker ── */}
        {chat.showWallpaperPicker && (
          <WallpaperPicker
            isAr={chat.isAr}
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
    return (
      <>
        <div
          className="flex flex-col bg-background w-full"
          style={{
            height: '100dvh',
            paddingBottom: 'calc(env(safe-area-inset-bottom, 0px) + 64px)',
          }}
        >
          {body}
        </div>
        {lightbox}
      </>
    );
  }

  return (
    <Sheet open={open} onOpenChange={(v) => { if (!v) closeAll(); else onOpenChange(v); }}>
      <SheetContent side={chat.isAr ? 'right' : 'left'} className="w-full sm:max-w-md p-0 flex flex-col bg-background [&>button[class*='absolute']]:hidden">
        {body}
      </SheetContent>
      {lightbox}
    </Sheet>
  );
}
