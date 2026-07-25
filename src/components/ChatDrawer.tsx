import { AnimatePresence, motion } from 'framer-motion';
import React, { useCallback, useMemo, useState, useEffect } from 'react';

import ImageLightbox from '@/components/ImageLightbox';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Sheet, SheetContent } from '@/components/ui/sheet';
import { useVoicePlayer } from '@/contexts/VoicePlayerContext';
import { supabase } from '@/integrations/supabase/client';
import { readableFileName, unpackFileName } from '@/lib/chat/imageMeta';
import {
  Archive,
  ArchiveRestore,
  ArrowDown,
  Bell,
  BellOff,
  Calendar,
  Check,
  ChevronDown,
  ChevronRight,
  Copy,
  CornerDownLeft,
  Download,
  EyeOff,
  FileText,
  Forward as ForwardIcon,
  Image as ImageIcon,
  MoreVertical,
  Palette as WallpaperIcon,
  Pencil,
  Pin,
  PinOff,
  Reply,
  Search,
  Share2,
  Timer,
  TimerOff,
  Trash,
  Trash2,
  Upload,
  User2,
  Volume2,
  VolumeX,
  X,
} from '@/lib/icons';
import { setInChatConversation } from '@/lib/inChatConversation';
import { cn, debounce } from '@/lib/utils';
import { getDefaultAvatarForUser } from '@/utils/defaultAvatar';
import { getAppleEmojiUrl, isEmojiAvatarValue } from '@/utils/emojiAvatar';

import { useAppleEmojiReady } from './chat/appleEmoji';
import ChatImage from './chat/ChatImage';
import ChatInput from './chat/ChatInput';
import {
  formatClockTime,
  formatDateSeparator,
  formatSelfDestructLabel,
  getSignedFileUrl,
  renderHighlighted,
  renderRichText,
  stripMarkers,
} from './chat/chatUtils';
import {
  MUTE_DURATION_OPTIONS,
  QUICK_EMOJIS,
  SELF_DESTRUCT_OPTIONS,
  WALLPAPERS,
} from './chat/constants';
import ConversationList from './chat/ConversationList';
import EmojiPicker from './chat/EmojiPicker';
import ForwardPicker from './chat/ForwardPicker';
import { LinkPreview } from './chat/LinkPreview';
import {
  ForwardedBadge,
  MessageTicks,
  ReactionPill,
  SwipeableMessage,
  TypingDots,
} from './chat/MessageBubble';
import MessageInfo from './chat/MessageInfo';
import { MessageRowErrorBoundary } from './chat/MessageRowErrorBoundary';
import { haptic } from './chat/sounds';
import type { ActionMenuState, ChatDrawerProps, Message } from './chat/types';
import { useChat } from './chat/useChat';
import { useVoiceRecording } from './chat/useVoiceRecording';
import { VirtualMessageList, type VirtualMessageListHandle } from './chat/VirtualMessageList';
import WallpaperPicker from './chat/WallpaperPicker';

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
        <AvatarImage
          src={getAppleEmojiUrl(avatarUrl!) || ''}
          alt={username}
          className="w-[60%] h-[60%] object-contain m-auto"
        />
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
  msg,
  isMine,
  isDarkBg,
  isFading,
  isAr,
  fileUrl,
  rawFileUrl,
  senderName,
  onSelectToggle,
  selectionMode,
  voicePlayer,
}: VoiceBubbleProps) {
  const containerRef = React.useRef<HTMLDivElement | null>(null);
  const cachedWaveform = voicePlayer.waveformCache[msg.id];
  useWaveformOnVisible(
    containerRef,
    fileUrl,
    msg.id,
    !!cachedWaveform,
    voicePlayer.generateWaveform,
  );

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
    return Array.from(
      { length: 40 },
      (_, i) => ((Math.sin(seed * (i + 1) * 0.7) + 1) / 2) * 0.85 + 0.15,
    );
  }, [cachedWaveform, msg.id]);

  const handleToggle = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (selectionMode) {
      onSelectToggle(msg.id);
      return;
    }
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

  // ── Pointer-drag scrubber (Telegram-style "drag the playhead") ──────────
  // The bare click- above stays for desktop quick-jumps. On top of
  // it, we layer a pointer-capture flow so users can grab the waveform
  // and slide along — far more accurate than tapping the right position.
  const isMineActiveRef = React.useRef(false);
  const trackRectRef = React.useRef<DOMRect | null>(null);
  const handleScrubStart = (e: React.PointerEvent<HTMLDivElement>) => {
    if (voicePlayer.state.msgId !== msg.id) return;
    if (e.pointerType === 'mouse' && e.button !== 0) return;
    e.stopPropagation();
    e.preventDefault();
    isMineActiveRef.current = true;
    (e.currentTarget as HTMLElement).setPointerCapture?.(e.pointerId);
    trackRectRef.current = e.currentTarget.getBoundingClientRect();
    const r = trackRectRef.current;
    voicePlayer.seek(Math.max(0, Math.min(1, (e.clientX - r.left) / r.width)));
  };
  const handleScrubMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!isMineActiveRef.current || !trackRectRef.current) return;
    const r = trackRectRef.current;
    voicePlayer.seek(Math.max(0, Math.min(1, (e.clientX - r.left) / r.width)));
  };
  const handleScrubEnd = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!isMineActiveRef.current) return;
    isMineActiveRef.current = false;
    trackRectRef.current = null;
    try {
      (e.currentTarget as HTMLElement).releasePointerCapture?.(e.pointerId);
    } catch {
      /* no-op */
    }
  };

  return (
    <div ref={containerRef} className="min-w-[220px] px-3 py-2.5">
      <div className="flex items-center gap-3">
        <button
          onClick={handleToggle}
          aria-label={
            isPlaying
              ? 'إيقاف مؤقت'
              : 'تشغيل الرسالة الصوتية'
          }
          className={cn(
            'flex h-9 w-9 shrink-0 items-center justify-center rounded-full transition-colors active:scale-90',
            isMine ? 'bg-primary/20' : 'bg-primary/15',
          )}
        >
          {isPlaying ? (
            <svg viewBox="0 0 24 24" className="h-4 w-4 text-primary" fill="currentColor">
              <rect x="6" y="4" width="4" height="16" rx="1" />
              <rect x="14" y="4" width="4" height="16" rx="1" />
            </svg>
          ) : (
            <svg viewBox="0 0 24 24" className="h-4 w-4 text-primary ms-0.5" fill="currentColor">
              <path d="M8 5v14l11-7z" />
            </svg>
          )}
        </button>
        <div className="flex-1 flex flex-col gap-1.5">
          <div
            className="flex items-center gap-[2px] h-[20px] cursor-pointer touch-none select-none"
            dir="ltr"
            role={voicePlayer.state.msgId === msg.id ? 'slider' : undefined}
            aria-label={'شريط تقدم الصوت'}
            aria-valuemin={voicePlayer.state.msgId === msg.id ? 0 : undefined}
            aria-valuemax={voicePlayer.state.msgId === msg.id ? 100 : undefined}
            aria-valuenow={
              voicePlayer.state.msgId === msg.id ? Math.round(progress * 100) : undefined
            }
            onClick={handleSeek}
            onPointerDown={handleScrubStart}
            onPointerMove={handleScrubMove}
            onPointerUp={handleScrubEnd}
            onPointerCancel={handleScrubEnd}
          >
            {bars.map((h, i) => {
              const barProgress = i / bars.length;
              const isActive = voicePlayer.state.msgId === msg.id && barProgress < progress;
              return (
                <div
                  key={i}
                  className={cn(
                    'flex-1 rounded-full transition-colors duration-100',
                    isActive ? 'bg-primary' : 'bg-muted-foreground/25',
                  )}
                  style={{ height: `${h * 20}px`, minWidth: '2px' }}
                />
              );
            })}
          </div>
          <div className="flex items-center justify-between" dir="ltr">
            <span className="text-[10px] tabular-nums text-muted-foreground/50">
              {isPlaying && duration
                ? formatDur(progress * duration)
                : duration
                  ? formatDur(duration)
                  : ''}
            </span>
            <div className="flex items-center gap-1.5">
              {isPlaying && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    voicePlayer.cyclePlaybackRate();
                  }}
                  className={cn(
                    'text-[10px] font-bold tabular-nums px-1.5 py-[1px] rounded-full leading-none transition-colors active:scale-90',
                    isMine && isDarkBg
                      ? 'bg-primary-foreground/20 text-primary-foreground'
                      : 'bg-primary/15 text-primary',
                  )}
                  aria-label={'سرعة التشغيل'}
                >
                  {voicePlayer.state.playbackRate === 1
                    ? '1×'
                    : voicePlayer.state.playbackRate === 1.5
                      ? '1.5×'
                      : '2×'}
                </button>
              )}
              <span
                className={cn(
                  'flex items-center gap-[3px] text-[11px] leading-none',
                  isDarkBg && isMine ? 'text-primary-foreground/70' : 'text-muted-foreground/60',
                )}
              >
                {msg.edited_at && (
                  <span className="text-[10px] italic">{'معدّلة'}</span>
                )}
                {isFading && <Timer className="h-[10px] w-[10px] animate-pulse" />}
                {formatClockTime(msg.created_at)}
                {isMine && (
                  <MessageTicks status={msg.status} read={msg.read} dimmed={isDarkBg} isAr={isAr} />
                )}
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
    isAr: chat.isAr,
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
  }, [chat.activeConv?.id, chat.messages, chat.user?.id, chat.isAr]);

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

  // Open the action menu anchored to the given bubble element. The trigger
  // is either a long-press (~350 ms) or a native contextmenu — a bare tap
  // never opens it, so users can scroll and read without surprise.
  const openActionMenu = useCallback(
    (msg: Message, isMine: boolean, bubbleEl: HTMLElement) => {
      if (chat.selectionMode) return;
      if (msg.deleted) return;
      const rect = bubbleEl.getBoundingClientRect();
      const containerRect = chat.messagesContainerRef.current?.getBoundingClientRect() || {
        top: 0,
        bottom: window.innerHeight,
        height: window.innerHeight,
      };
      setActionMenu({
        msg,
        isMine,
        rect: {
          top: rect.top,
          bottom: rect.bottom,
          left: rect.left,
          right: rect.right,
          width: rect.width,
          height: rect.height,
        },
        containerRect: {
          top: containerRect.top,
          bottom: containerRect.bottom,
          height: containerRect.height,
        },
      });
      haptic('medium');
    },
    [chat.messagesContainerRef, chat.selectionMode],
  );

  // Long-press gesture state. Kept outside hooks so refs persist across renders
  // of individual message bubbles, indexed by pointer id so multi-touch doesn't
  // collide.
  const longPressTimersRef = React.useRef<Map<number, ReturnType<typeof setTimeout>>>(new Map());
  const longPressStartRef = React.useRef<Map<number, { x: number; y: number; fired: boolean }>>(
    new Map(),
  );
  const LONG_PRESS_MS = 380;
  const LONG_PRESS_TOLER = 10; // px of movement that still counts as a press

  const clearLongPress = useCallback((pointerId: number) => {
    const t = longPressTimersRef.current.get(pointerId);
    if (t) {
      clearTimeout(t);
      longPressTimersRef.current.delete(pointerId);
    }
    longPressStartRef.current.delete(pointerId);
  }, []);

  const beginLongPress = useCallback(
    (msg: Message, isMine: boolean, e: React.PointerEvent<HTMLDivElement>) => {
      if (chat.selectionMode) return;
      if (msg.deleted) return;
      if (e.pointerType === 'mouse' && e.button !== 0) return; // only left mouse button
      const el = e.currentTarget;
      const startX = e.clientX,
        startY = e.clientY;
      longPressStartRef.current.set(e.pointerId, { x: startX, y: startY, fired: false });
      const timer = setTimeout(() => {
        const entry = longPressStartRef.current.get(e.pointerId);
        if (!entry) return;
        entry.fired = true;
        openActionMenu(msg, isMine, el);
      }, LONG_PRESS_MS);
      longPressTimersRef.current.set(e.pointerId, timer);
    },
    [chat.selectionMode, openActionMenu],
  );

  const continueLongPress = useCallback(
    (e: React.PointerEvent<HTMLDivElement>) => {
      const entry = longPressStartRef.current.get(e.pointerId);
      if (!entry) return;
      const dx = e.clientX - entry.x;
      const dy = e.clientY - entry.y;
      if (Math.hypot(dx, dy) > LONG_PRESS_TOLER) clearLongPress(e.pointerId);
    },
    [clearLongPress],
  );

  const endLongPress = useCallback(
    (msg: Message, e: React.PointerEvent<HTMLDivElement>) => {
      const entry = longPressStartRef.current.get(e.pointerId);
      const fired = entry?.fired ?? false;
      clearLongPress(e.pointerId);
      // If the user simply tapped in selection mode, toggle the selection.
      if (!fired && chat.selectionMode && !msg.deleted) {
        chat.toggleSelect(msg.id);
      }
    },
    [clearLongPress, chat.selectionMode, chat.toggleSelect, chat.messages.length],
  );

  // Clean up any in-flight long-press timers on unmount
  React.useEffect(() => {
    const timers = longPressTimersRef.current;
    return () => {
      timers.forEach((t) => clearTimeout(t));
      timers.clear();
    };
  }, []);

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

  // ── Double-tap to react (Instagram/Telegram-style) ─────────────────────────
  // Tracks the most recent tap timestamp per message so quick double-taps
  // toggle a heart reaction without opening the long-press action menu.
  const lastTapRef = React.useRef<Map<string, number>>(new Map());
  const DOUBLE_TAP_MS = 320;

  const handleDoubleTapReact = useCallback(
    (msg: Message, e: React.PointerEvent) => {
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
    },
    [chat],
  );

  // ── Drag and drop file support ────────────────────────────────────────────
  const [isDraggingFiles, setIsDraggingFiles] = React.useState(false);
  const dragCounterRef = React.useRef(0);

  const onDragEnter = useCallback(
    (e: React.DragEvent) => {
      if (!chat.activeConv) return;
      const types = Array.from(e.dataTransfer.types || []);
      if (!types.includes('Files')) return;
      e.preventDefault();
      dragCounterRef.current += 1;
      setIsDraggingFiles(true);
    },
    [chat.activeConv],
  );

  const onDragOver = useCallback(
    (e: React.DragEvent) => {
      if (!chat.activeConv) return;
      const types = Array.from(e.dataTransfer.types || []);
      if (!types.includes('Files')) return;
      e.preventDefault();
      e.dataTransfer.dropEffect = 'copy';
    },
    [chat.activeConv],
  );

  const onDragLeave = useCallback(
    (e: React.DragEvent) => {
      if (!chat.activeConv) return;
      e.preventDefault();
      dragCounterRef.current = Math.max(0, dragCounterRef.current - 1);
      if (dragCounterRef.current === 0) setIsDraggingFiles(false);
    },
    [chat.activeConv],
  );

  const onDrop = useCallback(
    (e: React.DragEvent) => {
      if (!chat.activeConv) return;
      e.preventDefault();
      dragCounterRef.current = 0;
      setIsDraggingFiles(false);
      const files = Array.from(e.dataTransfer.files || []);
      if (files.length > 0) chat.addFilesFromDrop(files);
    },
    [chat],
  );

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
        <p className="text-muted-foreground text-sm">
          {'يرجى تسجيل الدخول أولاً'}
        </p>
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

      {/* ───────────────── Profile Popup ───────────────── */}
      <AnimatePresence>
        {chat.showProfilePopup && chat.activeConv && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 z-50 bg-background flex flex-col"
          >
            <div className="flex items-center gap-3 px-4 h-14 border-b border-border/20">
              <button
                onClick={() => {
                  chat.setShowProfilePopup(false);
                  chat.setProfileTab('info');
                }}
                className="w-9 h-9 rounded-full flex items-center justify-center active:bg-accent/40 transition-colors"
              >
                <BackIcon className="w-5 h-5 text-foreground" />
              </button>
              <h2 className="text-[16px] font-semibold">{'الملف الشخصي'}</h2>
            </div>

            <div className="flex flex-col items-center pt-8 pb-4 px-6">
              <motion.div
                initial={{ scale: 0.8 }}
                animate={{ scale: 1 }}
                transition={{ type: 'spring', damping: 20, stiffness: 300 }}
              >
                {renderAvatar(
                  chat.activeConv.otherUsername,
                  chat.activeConv.otherAvatarUrl,
                  'h-24 w-24',
                )}
              </motion.div>
              <h3 className="text-lg font-bold text-foreground mt-3">
                {chat.activeConv.otherDisplayName || chat.activeConv.otherUsername}
              </h3>
              {chat.activeConv.otherDisplayName &&
                chat.activeConv.otherDisplayName !== chat.activeConv.otherUsername && (
                  <p className="text-[13px] text-muted-foreground">
                    @{chat.activeConv.otherUsername}
                  </p>
                )}
              <p
                className={cn(
                  'text-[12px] mt-1 font-medium',
                  chat.otherPresence.isOnline ? 'text-green-500' : 'text-muted-foreground/70',
                )}
              >
                {chat.otherPresence.text}
              </p>
            </div>

            {/* Quick action pills */}
            <div className="flex items-center justify-center gap-2 px-4 mb-3">
              <button
                onClick={() => chat.chatPrefs.toggleMuted(chat.activeConv!.id)}
                className={cn(
                  'flex flex-col items-center gap-1 px-4 py-2.5 rounded-2xl transition-colors active:scale-95',
                  chat.chatPrefs.isMuted(chat.activeConv.id)
                    ? 'bg-primary/10 text-primary'
                    : 'bg-muted/30 text-foreground',
                )}
              >
                {chat.chatPrefs.isMuted(chat.activeConv.id) ? (
                  <BellOff className="w-4 h-4" />
                ) : (
                  <Bell className="w-4 h-4" />
                )}
                <span className="text-[10px] font-medium">
                  {chat.chatPrefs.isMuted(chat.activeConv.id)
                    ? 'مكتوم'
                    : 'كتم'}
                </span>
              </button>
              <button
                onClick={() => chat.chatPrefs.togglePinned(chat.activeConv!.id)}
                className={cn(
                  'flex flex-col items-center gap-1 px-4 py-2.5 rounded-2xl transition-colors active:scale-95',
                  chat.chatPrefs.isPinned(chat.activeConv.id)
                    ? 'bg-primary/10 text-primary'
                    : 'bg-muted/30 text-foreground',
                )}
              >
                <Pin
                  className={cn(
                    'w-4 h-4',
                    chat.chatPrefs.isPinned(chat.activeConv.id) && 'rotate-45',
                  )}
                />
                <span className="text-[10px] font-medium">
                  {chat.chatPrefs.isPinned(chat.activeConv.id)
                    ? 'مثبّتة'
                    : 'تثبيت'}
                </span>
              </button>
              <button
                onClick={() => {
                  chat.chatPrefs.toggleArchived(chat.activeConv!.id);
                  chat.setActiveConv(null);
                  chat.setShowProfilePopup(false);
                }}
                className="flex flex-col items-center gap-1 px-4 py-2.5 rounded-2xl bg-muted/30 text-foreground transition-colors active:scale-95"
              >
                {chat.chatPrefs.isArchived(chat.activeConv.id) ? (
                  <ArchiveRestore className="w-4 h-4" />
                ) : (
                  <Archive className="w-4 h-4" />
                )}
                <span className="text-[10px] font-medium">
                  {chat.chatPrefs.isArchived(chat.activeConv.id)
                    ? 'إلغاء الأرشفة'
                    : 'أرشفة'}
                </span>
              </button>
            </div>

            <div className="flex mx-4 bg-muted/30 rounded-xl p-1 gap-1">
              <button
                onClick={() => chat.setProfileTab('info')}
                className={cn(
                  'flex-1 py-2 rounded-lg text-[13px] font-medium transition-all',
                  chat.profileTab === 'info'
                    ? 'bg-background text-foreground '
                    : 'text-muted-foreground',
                )}
              >
                {'المعلومات'}
              </button>
              <button
                onClick={() => {
                  chat.setProfileTab('media');
                  if (chat.activeConv) {
                    supabase
                      .from('messages')
                      .select('*')
                      .eq('conversation_id', chat.activeConv.id)
                      .in('message_type', ['image', 'file'])
                      .eq('deleted', false)
                      .order('created_at', { ascending: false })
                      .limit(50)
                      .then(({ data }) => chat.setSharedMedia((data || []) as Message[]));
                  }
                }}
                className={cn(
                  'flex-1 py-2 rounded-lg text-[13px] font-medium transition-all',
                  chat.profileTab === 'media'
                    ? 'bg-background text-foreground '
                    : 'text-muted-foreground',
                )}
              >
                {'الوسائط'}
              </button>
            </div>

            <div className="flex-1 overflow-y-auto mt-3 px-4 pb-6">
              {chat.profileTab === 'info' ? (
                <div className="space-y-3">
                  <div className="bg-card border border-border/20 rounded-2xl p-4">
                    <div className="grid grid-cols-3 gap-3 text-center">
                      <div>
                        <p className="text-xl font-bold text-foreground">{chat.messages.length}</p>
                        <p className="text-[10px] text-muted-foreground">
                          {'رسالة'}
                        </p>
                      </div>
                      <div>
                        <p className="text-xl font-bold text-foreground">
                          {chat.messages.filter((m) => m.message_type === 'image').length}
                        </p>
                        <p className="text-[10px] text-muted-foreground">
                          {'صورة'}
                        </p>
                      </div>
                      <div>
                        <p className="text-xl font-bold text-foreground">
                          {chat.messages.filter((m) => m.message_type === 'voice').length}
                        </p>
                        <p className="text-[10px] text-muted-foreground">
                          {'صوتية'}
                        </p>
                      </div>
                    </div>
                  </div>
                  <div className="bg-card border border-border/20 rounded-2xl divide-y divide-border/10">
                    <div className="flex items-center gap-3 p-3.5">
                      <User2 className="w-4 h-4 text-muted-foreground shrink-0" />
                      <div className="min-w-0">
                        <p className="text-[11px] text-muted-foreground">
                          {'النبذة'}
                        </p>
                        <p className="text-[13px] text-foreground font-medium">
                          {chat.activeConv.otherBio || ('لا توجد نبذة')}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3 p-3.5">
                      <Calendar className="w-4 h-4 text-muted-foreground shrink-0" />
                      <div className="min-w-0">
                        <p className="text-[11px] text-muted-foreground">
                          {'تاريخ الانضمام'}
                        </p>
                        <p className="text-[13px] text-foreground font-medium">
                          {chat.activeConv.otherCreatedAt
                            ? new Date(chat.activeConv.otherCreatedAt).toLocaleDateString(
                                'ar',
                                { day: 'numeric', month: 'long', year: 'numeric' },
                              )
                            : '—'}
                        </p>
                      </div>
                    </div>
                    <button
                      className="w-full flex items-center gap-3 p-3.5 active:bg-accent/30 transition-colors text-start"
                      onClick={() => chat.setShowWallpaperPicker(true)}
                    >
                      <WallpaperIcon className="w-4 h-4 text-muted-foreground shrink-0" />
                      <div className="min-w-0 flex-1">
                        <p className="text-[11px] text-muted-foreground">
                          {'الخلفية'}
                        </p>
                        <p className="text-[13px] text-foreground font-medium">
                          {currentWallpaper.labelAr}
                        </p>
                      </div>
                      <ChevronRight
                        className={cn(
                          'w-4 h-4 text-muted-foreground/50',
                          chat.isAr && 'rotate-180',
                        )}
                      />
                    </button>
                  </div>
                  <button
                    onClick={() => chat.chatPrefs.toggleBlocked(chat.activeConv!.id)}
                    className={cn(
                      'w-full flex items-center justify-center gap-2 py-3 rounded-2xl text-[13px] font-medium transition-colors active:scale-[0.98]',
                      chat.chatPrefs.isBlocked(chat.activeConv!.id)
                        ? 'bg-primary/10 text-[#C9A84C]'
                        : 'bg-destructive/10 text-destructive',
                    )}
                  >
                    <EyeOff className="w-4 h-4" />
                    {chat.chatPrefs.isBlocked(chat.activeConv!.id)
                      ? 'إلغاء حظر المستخدم'
                      : 'حظر هذا المستخدم'}
                  </button>
                  <button
                    onClick={() => setShowDeleteConfirm(true)}
                    className="w-full flex items-center justify-center gap-2 py-3 rounded-2xl bg-destructive/10 text-destructive text-[13px] font-medium active:bg-destructive/20 transition-colors"
                  >
                    <Trash className="w-4 h-4" />
                    {'حذف المحادثة'}
                  </button>
                </div>
              ) : (
                <div>
                  {chat.sharedMedia.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-16 text-muted-foreground gap-3">
                      <ImageIcon className="w-10 h-10 opacity-30" />
                      <p className="text-sm">
                        {'لا توجد وسائط مشتركة'}
                      </p>
                    </div>
                  ) : (
                    <div className="grid grid-cols-3 gap-1 rounded-xl overflow-hidden">
                      {chat.sharedMedia.map((m) =>
                        m.message_type === 'image' ? (
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
                              alt={readableFileName(m.file_name) || ''}
                              isAr={chat.isAr}
                              refreshUrl={() => chat.refreshSignedUrl(m)}
                              className="w-full h-full"
                            />
                          </button>
                        ) : (
                          <div
                            key={m.id}
                            className="aspect-square bg-muted/20 flex flex-col items-center justify-center gap-1.5 p-2"
                          >
                            <FileText className="w-6 h-6 text-muted-foreground" />
                            <span className="text-[10px] text-muted-foreground truncate w-full text-center">
                              {readableFileName(m.file_name)}
                            </span>
                          </div>
                        ),
                      )}
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
              <button
                onClick={() => onOpenChange(false)}
                className="w-9 h-9 rounded-full flex items-center justify-center active:bg-accent/40 transition-colors"
                aria-label={'رجوع'}
              >
                <BackIcon className="w-5 h-5 text-foreground" />
              </button>
              {!showConvSearch && (
                <h1 className="text-[17px] font-bold tracking-tight">
                  {'الرسائل'}
                </h1>
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
                  aria-label={
                    chat.chatPrefs.prefs.soundEnabled
                      ? 'كتم الصوت'
                      : 'تفعيل الصوت'
                  }
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
            <h1 className="text-[17px] font-bold tracking-tight">
              {'محادثة جديدة'}
            </h1>
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
          {/* ── Chat Header ── */}
          <div className="sticky top-0 z-30 h-14 px-3 flex items-center gap-2 bg-background border-b border-border/20 shrink-0">
            {chat.selectionMode ? (
              <>
                <button
                  onClick={chat.clearSelection}
                  aria-label={'إلغاء التحديد'}
                  className="w-9 h-9 rounded-full flex items-center justify-center active:bg-accent/40 transition-colors shrink-0"
                >
                  <X className="w-5 h-5 text-foreground" />
                </button>
                <span className="font-semibold text-[15px]">
                  {chat.selectedIds.size} {'محددة'}
                </span>
                <div className="flex-1" />
                <button
                  onClick={chat.copySelectedMessages}
                  className="w-9 h-9 rounded-full flex items-center justify-center active:bg-accent/40"
                  aria-label={'نسخ'}
                >
                  <Copy className="w-5 h-5 text-foreground" />
                </button>
                <button
                  onClick={() => {
                    const msgs = chat.messages.filter((m) => chat.selectedIds.has(m.id));
                    chat.startForward(msgs);
                  }}
                  className="w-9 h-9 rounded-full flex items-center justify-center active:bg-accent/40"
                  aria-label={'توجيه'}
                >
                  <ForwardIcon className="w-5 h-5 text-foreground" />
                </button>
                <button
                  onClick={() => {
                    const ids = chat.messages
                      .filter((m) => chat.selectedIds.has(m.id) && !m.deleted)
                      .map((m) => m.id);
                    chat.hideManyForSelf(ids);
                  }}
                  className="w-9 h-9 rounded-full flex items-center justify-center active:bg-accent/40"
                  aria-label={'حذف لي فقط'}
                >
                  <EyeOff className="w-5 h-5 text-foreground" />
                </button>
                {chat.messages.filter(
                  (m) => chat.selectedIds.has(m.id) && m.sender_id === chat.user?.id && !m.deleted,
                ).length > 0 && (
                  <button
                    onClick={chat.deleteSelectedMessages}
                    className="w-9 h-9 rounded-full flex items-center justify-center active:bg-destructive/15"
                    aria-label={'حذف للجميع'}
                  >
                    <Trash2 className="w-5 h-5 text-destructive" />
                  </button>
                )}
              </>
            ) : (
              <>
                <button
                  onClick={() => {
                    chat.setActiveConv(null);
                    chat.loadConversations();
                  }}
                  className="w-9 h-9 rounded-full flex items-center justify-center active:bg-accent/40 transition-colors shrink-0 relative"
                  aria-label={'رجوع'}
                >
                  <BackIcon className="w-5 h-5 text-foreground" />
                  {totalUnread > 0 && (
                    <span className="absolute -top-0.5 -end-0.5 bg-primary text-primary-foreground text-[10px] font-bold rounded-full min-w-[14px] h-[14px] flex items-center justify-center px-1">
                      {totalUnread > 9 ? '9+' : totalUnread}
                    </span>
                  )}
                </button>
                <button
                  className="flex items-center gap-2.5 flex-1 min-w-0 active:opacity-70 transition-opacity"
                  onClick={() => chat.setShowProfilePopup(true)}
                >
                  <div className="relative shrink-0">
                    {renderAvatar(
                      chat.activeConv?.otherUsername,
                      chat.activeConv?.otherAvatarUrl,
                      'h-9 w-9',
                    )}
                    {chat.otherPresence.isOnline && (
                      <span
                        aria-label={'متصل الآن'}
                        className="absolute bottom-0 end-0 block h-2.5 w-2.5 rounded-full bg-green-500 ring-2 ring-background"
                      />
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
                        <motion.div
                          key="typing"
                          initial={{ opacity: 0, y: 2 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, y: 2 }}
                          className="flex items-center gap-1.5"
                        >
                          <span className="text-[11px] text-[#C9A84C] font-semibold leading-tight">
                            {`${chat.activeConv?.otherDisplayName || chat.activeConv?.otherUsername} يكتب`}
                          </span>
                          <TypingDots size={3} />
                        </motion.div>
                      ) : (
                        <motion.span
                          key="status"
                          initial={{ opacity: 0 }}
                          animate={{ opacity: 1 }}
                          className={cn(
                            'text-[11px] leading-tight block',
                            chat.otherPresence.isOnline
                              ? 'text-green-500 font-medium'
                              : 'text-muted-foreground/60',
                          )}
                        >
                          {chat.otherPresence.text}
                        </motion.span>
                      )}
                    </AnimatePresence>
                  </div>
                </button>

                {chat.selfDestructSeconds && (
                  <div className="flex items-center gap-1 px-2 py-1 rounded-full bg-accent/20">
                    <Timer className="w-3 h-3 text-primary" />
                    <span className="text-[10px] text-primary font-medium">
                      {formatSelfDestructLabel(chat.selfDestructSeconds)}
                    </span>
                  </div>
                )}

                {/* Three-dot menu */}
                <div className="relative">
                  <button
                    onClick={() => chat.setShowChatMenu(!chat.showChatMenu)}
                    className="w-9 h-9 rounded-full flex items-center justify-center active:bg-accent/40 transition-colors"
                    aria-label={'خيارات'}
                  >
                    <MoreVertical className="h-5 w-5 text-muted-foreground" />
                  </button>
                  <AnimatePresence>
                    {chat.showChatMenu && (
                      <>
                        <motion.div
                          initial={{ opacity: 0 }}
                          animate={{ opacity: 1 }}
                          exit={{ opacity: 0 }}
                          className="fixed inset-0 z-10"
                          onClick={() => chat.setShowChatMenu(false)}
                        />
                        <motion.div
                          initial={{ opacity: 0, scale: 0.95, y: -4 }}
                          animate={{ opacity: 1, scale: 1, y: 0 }}
                          exit={{ opacity: 0, scale: 0.95 }}
                          transition={{ duration: 0.15 }}
                          className={cn(
                            'absolute top-full mt-1 bg-card border border-border/30 rounded-xl z-20 min-w-[200px] overflow-hidden ',
                            'left-0',
                          )}
                        >
                          <button
                            className="w-full flex items-center gap-3 px-4 py-2.5 active:bg-accent/30 transition-colors text-[13px] text-start"
                            onClick={() => {
                              chat.setShowSearch(true);
                              chat.setShowChatMenu(false);
                            }}
                          >
                            <Search className="w-4 h-4 text-muted-foreground" />
                            {'بحث في المحادثة'}
                          </button>
                          <button
                            className="w-full flex items-center gap-3 px-4 py-2.5 active:bg-accent/30 transition-colors text-[13px] text-start"
                            onClick={() => chat.setShowMuteMenu(!chat.showMuteMenu)}
                          >
                            {chat.chatPrefs.isMuted(chat.activeConv!.id) ? (
                              <Bell className="w-4 h-4 text-muted-foreground" />
                            ) : (
                              <BellOff className="w-4 h-4 text-muted-foreground" />
                            )}
                            {chat.chatPrefs.isMuted(chat.activeConv!.id)
                              ? (() => {
                                  const exp = chat.chatPrefs.muteExpiresAt(chat.activeConv!.id);
                                  if (exp == null)
                                    return 'إلغاء الكتم';
                                  const mins = Math.max(0, Math.round((exp - Date.now()) / 60000));
                                  return `مكتومة (${mins < 60 ? `${mins}د` : mins < 1440 ? `${Math.round(mins / 60)}س` : `${Math.round(mins / 1440)}ي`})`;
                                })()
                              : 'كتم الإشعارات'}
                          </button>
                          <AnimatePresence>
                            {chat.showMuteMenu && (
                              <motion.div
                                initial={{ height: 0 }}
                                animate={{ height: 'auto' }}
                                exit={{ height: 0 }}
                                className="overflow-hidden"
                              >
                                <div className="px-3 pb-2 space-y-0.5">
                                  {chat.chatPrefs.isMuted(chat.activeConv!.id) && (
                                    <button
                                      onClick={() => {
                                        chat.chatPrefs.muteFor(chat.activeConv!.id, 0);
                                        chat.setShowMuteMenu(false);
                                        chat.setShowChatMenu(false);
                                      }}
                                      className="w-full text-start px-3 py-1.5 rounded-lg text-[12px] transition-colors text-primary active:bg-accent/30"
                                    >
                                      {'إلغاء الكتم'}
                                    </button>
                                  )}
                                  {MUTE_DURATION_OPTIONS.map((opt) => (
                                    <button
                                      key={`mute-${opt.valueSeconds}`}
                                      onClick={() => {
                                        chat.chatPrefs.muteFor(
                                          chat.activeConv!.id,
                                          opt.valueSeconds,
                                        );
                                        chat.setShowMuteMenu(false);
                                        chat.setShowChatMenu(false);
                                      }}
                                      className="w-full text-start px-3 py-1.5 rounded-lg text-[12px] transition-colors text-foreground active:bg-accent/30"
                                    >
                                      {opt.labelAr}
                                    </button>
                                  ))}
                                </div>
                              </motion.div>
                            )}
                          </AnimatePresence>
                          <button
                            className="w-full flex items-center gap-3 px-4 py-2.5 active:bg-accent/30 transition-colors text-[13px] text-start"
                            onClick={() => {
                              chat.chatPrefs.togglePinned(chat.activeConv!.id);
                              chat.setShowChatMenu(false);
                            }}
                          >
                            {chat.chatPrefs.isPinned(chat.activeConv!.id) ? (
                              <PinOff className="w-4 h-4 text-muted-foreground" />
                            ) : (
                              <Pin className="w-4 h-4 text-muted-foreground" />
                            )}
                            {chat.chatPrefs.isPinned(chat.activeConv!.id)
                              ? 'إلغاء التثبيت'
                              : 'تثبيت المحادثة'}
                          </button>
                          <button
                            className="w-full flex items-center gap-3 px-4 py-2.5 active:bg-accent/30 transition-colors text-[13px] text-start"
                            onClick={() => {
                              chat.setShowWallpaperPicker(true);
                              chat.setShowChatMenu(false);
                            }}
                          >
                            <WallpaperIcon className="w-4 h-4 text-muted-foreground" />
                            {'الخلفية'}
                          </button>
                          <div className="h-px bg-border/15 mx-3" />
                          <button
                            className="w-full flex items-center gap-3 px-4 py-2.5 active:bg-accent/30 transition-colors text-[13px] text-start"
                            onClick={() => {
                              chat.setShowProfilePopup(true);
                              chat.setProfileTab('media');
                              chat.setShowChatMenu(false);
                              if (chat.activeConv) {
                                supabase
                                  .from('messages')
                                  .select('*')
                                  .eq('conversation_id', chat.activeConv.id)
                                  .in('message_type', ['image', 'file'])
                                  .eq('deleted', false)
                                  .order('created_at', { ascending: false })
                                  .limit(50)
                                  .then(({ data }) =>
                                    chat.setSharedMedia((data || []) as Message[]),
                                  );
                              }
                            }}
                          >
                            <ImageIcon className="w-4 h-4 text-muted-foreground" />
                            {'الوسائط المشتركة'}
                          </button>
                          <button
                            className="w-full flex items-center gap-3 px-4 py-2.5 active:bg-accent/30 transition-colors text-[13px] text-start"
                            onClick={() => chat.setShowSelfDestructMenu(!chat.showSelfDestructMenu)}
                          >
                            {chat.selfDestructSeconds ? (
                              <TimerOff className="w-4 h-4 text-muted-foreground" />
                            ) : (
                              <Timer className="w-4 h-4 text-muted-foreground" />
                            )}
                            {'رسائل زائلة'}
                          </button>
                          <AnimatePresence>
                            {chat.showSelfDestructMenu && (
                              <motion.div
                                initial={{ height: 0 }}
                                animate={{ height: 'auto' }}
                                exit={{ height: 0 }}
                                className="overflow-hidden"
                              >
                                <div className="px-3 pb-2 space-y-0.5">
                                  {SELF_DESTRUCT_OPTIONS.map((opt) => (
                                    <button
                                      key={`sd-${opt.valueSeconds ?? 'off'}`}
                                      onClick={() => chat.toggleSelfDestruct(opt.valueSeconds)}
                                      className={cn(
                                        'w-full text-start px-3 py-1.5 rounded-lg text-[12px] transition-colors',
                                        chat.selfDestructSeconds === opt.valueSeconds
                                          ? 'bg-primary/15 text-primary font-medium'
                                          : 'active:bg-accent/30 text-foreground',
                                      )}
                                    >
                                      {opt.labelAr}
                                    </button>
                                  ))}
                                </div>
                              </motion.div>
                            )}
                          </AnimatePresence>
                          <div className="h-px bg-border/15 mx-3" />
                          <button
                            className="w-full flex items-center justify-between gap-3 px-4 py-2.5 active:bg-accent/30 transition-colors text-[13px] text-start"
                            onClick={() =>
                              chat.chatPrefs.setEnterToSend(!chat.chatPrefs.prefs.enterToSend)
                            }
                            role="menuitemcheckbox"
                            aria-checked={chat.chatPrefs.prefs.enterToSend}
                          >
                            <span className="flex items-center gap-3">
                              <CornerDownLeft className="w-4 h-4 text-muted-foreground" />
                              {'Enter للإرسال'}
                            </span>
                            <span
                              className={cn(
                                'relative w-8 h-[18px] rounded-full transition-colors shrink-0',
                                chat.chatPrefs.prefs.enterToSend ? 'bg-primary' : 'bg-muted/50',
                              )}
                            >
                              <span
                                className={cn(
                                  'absolute top-[2px] w-[14px] h-[14px] rounded-full bg-background transition-all',
                                  chat.chatPrefs.prefs.enterToSend ? 'start-[16px]' : 'start-[2px]',
                                )}
                              />
                            </span>
                          </button>
                          <div className="h-px bg-border/15 mx-3" />
                          <button
                            className="w-full flex items-center gap-3 px-4 py-2.5 active:bg-destructive/10 transition-colors text-[13px] text-destructive text-start"
                            onClick={chat.deleteConversation}
                          >
                            <Trash className="w-4 h-4" />
                            {'حذف المحادثة'}
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
                  <p className="text-[10px] text-primary font-semibold">
                    {'رسالة مثبتة'}
                  </p>
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
                    <MessageRowErrorBoundary isMine={isMine} isAr={chat.isAr}>
                      <>
                        {/* Date separator */}
                        {showDate && (
                          <div className="flex justify-center py-4">
                            <span className="text-[11px] text-muted-foreground/70 bg-background/60 backdrop-blur-sm px-3 py-1 rounded-full font-medium ">
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
                                    'absolute top-1 z-10 w-5 h-5 rounded-full border-2 flex items-center justify-center transition-colors',
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
                                        ? 'bg-white/10 backdrop-blur-md text-white border border-white/5'
                                        : 'bg-card border border-border/15 text-foreground',
                                )}
                                style={bubbleStyle}
                              >
                                {/* Forwarded provenance — Telegram-style "↪ Forwarded from Author" */}
                                {msg.forwarded_from_sender_id && !msg.deleted && (
                                  <div className="px-3 pt-2 -mb-1">
                                    <ForwardedBadge
                                      name={chat.getForwardedName(msg.forwarded_from_sender_id)}
                                      isAr={chat.isAr}
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
                                  <p className="px-3 py-2 text-[13px]">
                                    {'🚫 تم حذف هذه الرسالة'}
                                  </p>
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
                                            readableFileName(msg.file_name) ||
                                            ('صورة في المحادثة')
                                          }
                                          isAr={chat.isAr}
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
                                            return urlM ? (
                                              <LinkPreview url={urlM[0]} isAr={chat.isAr} />
                                            ) : null;
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
                                              <span className="text-[10px] italic">
                                                {'معدّلة'}
                                              </span>
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
                                                isAr={chat.isAr}
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
                                    isAr={chat.isAr}
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
                                          isAr={chat.isAr}
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
                                              <span className="text-[10px] italic">
                                                {'معدّلة'}
                                              </span>
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
                                                isAr={chat.isAr}
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
                                      return urlM ? (
                                        <LinkPreview url={urlM[0]} isAr={chat.isAr} />
                                      ) : null;
                                    })()}
                                  </div>
                                )}
                              </div>

                              {/* Reactions */}
                              {msgReactions.length > 0 && (
                                <div
                                  className={cn(
                                    'flex gap-1 -mt-1.5 flex-wrap relative z-[1]',
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
                                          info.mine
                                            ? `${emoji} (${'تفاعلت'})`
                                            : `${emoji} reaction`
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
                            <span className="absolute bottom-1.5 start-1.5 px-1.5 py-0.5 rounded-md bg-black/45 backdrop-blur-sm text-white text-[10px] font-semibold">
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
                  'absolute bottom-24 end-4 z-10 w-11 h-11 rounded-full flex items-center justify-center transition-colors',
                  'bg-card/95 backdrop-blur-md border border-border/30',
                  'shadow-md',
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
                      className="absolute -top-1.5 -end-1.5 bg-primary text-primary-foreground text-[10px] font-bold rounded-full min-w-[20px] h-[20px] flex items-center justify-center px-1.5 shadow-[0_2px_8px_-2px_hsl(var(--primary)/0.6)] tabular-nums"
                    >
                      {unread > 99 ? '99+' : unread}
                    </motion.span>
                  );
                })()}
              </motion.button>
            )}
          </AnimatePresence>

          {/* ── Action Menu (Long Press / tap) ── */}
          <AnimatePresence>
            {actionMenu &&
              (() => {
                const spaceAbove = actionMenu.rect.top - actionMenu.containerRect.top;
                const showAbove = spaceAbove > 180;
                const viewportPadding = 12;
                const menuWidth = Math.min(
                  Math.max(actionMenu.rect.width, 260),
                  window.innerWidth - viewportPadding * 2,
                );
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
                      transition={{ duration: 0.12 }}
                      className="fixed inset-0 z-[60] bg-black/40 backdrop-blur-sm"
                      onClick={() => {
                        setActionMenu(null);
                        chat.setShowExtraEmojis(false);
                      }}
                    />
                    <div
                      className="fixed inset-0 z-[61] pointer-events-none"
                      onClick={() => {
                        setActionMenu(null);
                        chat.setShowExtraEmojis(false);
                      }}
                    >
                      <motion.div
                        initial={{ opacity: 0, scale: 0.92 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.92 }}
                        transition={{ type: 'spring', damping: 28, stiffness: 450 }}
                        className={cn(
                          'absolute pointer-events-auto flex flex-col',
                          showAbove ? 'flex-col-reverse' : 'flex-col',
                          actionMenu.isMine ? 'items-end' : 'items-start',
                        )}
                        style={{
                          top: showAbove ? undefined : `${actionMenu.rect.top}px`,
                          bottom: showAbove
                            ? `${window.innerHeight - actionMenu.rect.top + 4}px`
                            : undefined,
                          left: `${menuLeft}px`,
                          width: `${menuWidth}px`,
                          maxWidth: `${menuWidth}px`,
                        }}
                        onClick={(e) => e.stopPropagation()}
                      >
                        {/* Message preview */}
                        <div
                          className={cn(
                            'text-[15px] overflow-hidden',
                            actionMenu.isMine
                              ? 'bg-primary/15 text-foreground'
                              : 'bg-card border border-border/15 text-foreground',
                          )}
                          style={
                            getBubbleRadius(actionMenu.isMine, false, false) as React.CSSProperties
                          }
                        >
                          {actionMenu.msg.message_type === 'text' && (
                            <div
                              className="relative px-[10px] py-[6px]"
                              style={{ width: `${previewWidth}px`, maxWidth: '100%' }}
                            >
                              <span className="break-words whitespace-pre-wrap" dir="auto">
                                {renderRichText(actionMenu.msg.content)}
                                <span
                                  className="inline-block align-bottom"
                                  style={{ width: '62px', height: '1px' }}
                                />
                              </span>
                              <span
                                className={cn(
                                  'absolute bottom-[6px] flex items-center gap-[3px] text-[10px] whitespace-nowrap text-muted-foreground/50',
                                  'left-2.5',
                                )}
                              >
                                {formatClockTime(actionMenu.msg.created_at)}
                                {actionMenu.isMine && (
                                  <MessageTicks
                                    status={actionMenu.msg.status}
                                    read={actionMenu.msg.read}
                                    isAr={chat.isAr}
                                  />
                                )}
                              </span>
                            </div>
                          )}
                          {actionMenu.msg.message_type === 'image' &&
                            (() => {
                              const m = unpackFileName(actionMenu.msg.file_name).meta;
                              return (
                                <ChatImage
                                  src={chat.getFileUrl(actionMenu.msg)}
                                  alt={readableFileName(actionMenu.msg.file_name) || ''}
                                  isAr={chat.isAr}
                                  refreshUrl={() => chat.refreshSignedUrl(actionMenu.msg)}
                                  width={m?.w}
                                  height={m?.h}
                                  thumbnailDataUrl={m?.t}
                                  dominantColor={m?.c}
                                  maxHeight={160}
                                  className="max-w-full"
                                />
                              );
                            })()}
                        </div>

                        {/* Emoji bar + actions */}
                        <div
                          className={cn(
                            'bg-card border border-border/20 rounded-2xl overflow-hidden',
                            showAbove ? 'mb-1.5' : 'mt-1.5',
                          )}
                        >
                          {/* Quick emojis */}
                          <div
                            className="flex items-center justify-center gap-1 px-3 py-2"
                            dir="ltr"
                          >
                            {QUICK_EMOJIS.map((emoji) => (
                              <button
                                key={emoji}
                                onClick={() => {
                                  chat.toggleReaction(actionMenu.msg.id, emoji);
                                  setActionMenu(null);
                                  chat.setShowExtraEmojis(false);
                                }}
                                className="text-[22px] active:scale-125 transition-transform px-[2px]"
                                aria-label={`React with ${emoji}`}
                              >
                                {emoji}
                              </button>
                            ))}
                            <button
                              onClick={() => chat.setShowExtraEmojis(!chat.showExtraEmojis)}
                              className={cn(
                                'w-7 h-7 rounded-full flex items-center justify-center transition-all ms-1',
                                chat.showExtraEmojis
                                  ? 'bg-primary text-primary-foreground'
                                  : 'bg-muted/30 text-muted-foreground',
                              )}
                              aria-label="More emojis"
                            >
                              <ChevronDown
                                className={cn(
                                  'w-3.5 h-3.5 transition-transform duration-200',
                                  chat.showExtraEmojis && 'rotate-180',
                                )}
                              />
                            </button>
                          </div>
                          <AnimatePresence>
                            {chat.showExtraEmojis && (
                              <motion.div
                                initial={{ height: 0 }}
                                animate={{ height: 'auto' }}
                                exit={{ height: 0 }}
                                transition={{ duration: 0.2 }}
                                className="overflow-hidden"
                              >
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
                            <button
                              onClick={() => {
                                chat.setReplyTo(actionMenu.msg);
                                setActionMenu(null);
                                chat.setShowExtraEmojis(false);
                                chat.inputRef.current?.focus();
                              }}
                              className="w-full flex items-center gap-3 px-4 py-2 active:bg-accent/30 transition-colors text-start"
                            >
                              <Reply className="w-4 h-4 text-muted-foreground" />
                              <span className="text-[13px]">{'رد'}</span>
                            </button>
                            <button
                              onClick={() => {
                                chat.startForward([actionMenu.msg]);
                                setActionMenu(null);
                                chat.setShowExtraEmojis(false);
                              }}
                              className="w-full flex items-center gap-3 px-4 py-2 active:bg-accent/30 transition-colors text-start"
                            >
                              <Share2 className="w-4 h-4 text-muted-foreground" />
                              <span className="text-[13px]">
                                {'توجيه'}
                              </span>
                            </button>
                            {actionMenu.msg.message_type === 'text' && actionMenu.msg.content && (
                              <button
                                onClick={() => {
                                  chat.copyMessage(stripMarkers(actionMenu.msg.content));
                                  setActionMenu(null);
                                  chat.setShowExtraEmojis(false);
                                }}
                                className="w-full flex items-center gap-3 px-4 py-2 active:bg-accent/30 transition-colors text-start"
                              >
                                <Copy className="w-4 h-4 text-muted-foreground" />
                                <span className="text-[13px]">
                                  {'نسخ النص'}
                                </span>
                              </button>
                            )}
                            {actionMenu.isMine &&
                              actionMenu.msg.message_type === 'text' &&
                              !actionMenu.msg.deleted && (
                                <button
                                  onClick={() => {
                                    chat.startEditMessage(actionMenu.msg);
                                    setActionMenu(null);
                                    chat.setShowExtraEmojis(false);
                                  }}
                                  className="w-full flex items-center gap-3 px-4 py-2 active:bg-accent/30 transition-colors text-start"
                                >
                                  <Pencil className="w-4 h-4 text-muted-foreground" />
                                  <span className="text-[13px]">
                                    {'تعديل'}
                                  </span>
                                </button>
                              )}
                            <button
                              onClick={() => {
                                chat.pinMessage(actionMenu.msg);
                                setActionMenu(null);
                              }}
                              className="w-full flex items-center gap-3 px-4 py-2 active:bg-accent/30 transition-colors text-start"
                            >
                              {chat.pinnedMessage?.id === actionMenu.msg.id ? (
                                <PinOff className="w-4 h-4 text-muted-foreground" />
                              ) : (
                                <Pin className="w-4 h-4 text-muted-foreground" />
                              )}
                              <span className="text-[13px]">
                                {chat.pinnedMessage?.id === actionMenu.msg.id
                                  ? 'إلغاء التثبيت'
                                  : 'تثبيت'}
                              </span>
                            </button>
                            <button
                              onClick={() => {
                                chat.toggleSelect(actionMenu.msg.id);
                                setActionMenu(null);
                                chat.setShowExtraEmojis(false);
                              }}
                              className="w-full flex items-center gap-3 px-4 py-2 active:bg-accent/30 transition-colors text-start"
                            >
                              <Check className="w-4 h-4 text-muted-foreground" />
                              <span className="text-[13px]">
                                {'تحديد'}
                              </span>
                            </button>
                            {/* Info — only meaningful for messages I sent (delivery/read receipts). */}
                            {actionMenu.isMine && !actionMenu.msg.deleted && (
                              <button
                                onClick={() => {
                                  setMessageInfoTarget(actionMenu.msg);
                                  setActionMenu(null);
                                  chat.setShowExtraEmojis(false);
                                }}
                                className="w-full flex items-center gap-3 px-4 py-2 active:bg-accent/30 transition-colors text-start"
                              >
                                <Calendar className="w-4 h-4 text-muted-foreground" />
                                <span className="text-[13px]">
                                  {'معلومات الرسالة'}
                                </span>
                              </button>
                            )}
                            {/* Delete for me — works for any non-deleted message regardless of sender. */}
                            {!actionMenu.msg.deleted && (
                              <button
                                onClick={() => {
                                  chat.hideMessageForSelf(actionMenu.msg.id);
                                  setActionMenu(null);
                                  chat.setShowExtraEmojis(false);
                                }}
                                className="w-full flex items-center gap-3 px-4 py-2 active:bg-accent/30 transition-colors text-start"
                              >
                                <EyeOff className="w-4 h-4 text-muted-foreground" />
                                <span className="text-[13px]">
                                  {'حذف لي فقط'}
                                </span>
                              </button>
                            )}
                            {actionMenu.isMine && !actionMenu.msg.deleted && (
                              <>
                                <div className="h-px bg-border/15 mx-3" />
                                <button
                                  onClick={() => {
                                    chat.deleteMessage(actionMenu.msg.id);
                                    setActionMenu(null);
                                    chat.setShowExtraEmojis(false);
                                  }}
                                  className="w-full flex items-center gap-3 px-4 py-2 active:bg-destructive/10 transition-colors text-start"
                                >
                                  <Trash2 className="w-4 h-4 text-destructive" />
                                  <span className="text-[13px] text-destructive">
                                    {'حذف للجميع'}
                                  </span>
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
          isAr={chat.isAr}
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
        isAr={chat.isAr}
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

  const confirmDialog = (
    <AnimatePresence>
      {showDeleteConfirm && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[110] flex items-center justify-center bg-black/60 backdrop-blur-sm px-6"
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
              <h3 className="text-lg font-bold text-foreground">
                {'حذف المحادثة نهائياً'}
              </h3>
            </div>
            <p className="text-sm text-muted-foreground leading-relaxed" dir="auto">
              {'هل أنت متأكد من حذف هذه المحادثة نهائياً؟ سيتم مسح جميع الرسائل والوسائط ولا يمكن التراجع عن هذا الإجراء.'}
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
