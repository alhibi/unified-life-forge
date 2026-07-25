import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { motion, AnimatePresence, useMotionValue, useTransform } from 'framer-motion';
import {
  Send,
  Mic,
  X,
  Pencil,
  Check,
  Trash2,
  Plus,
  Smile,
  Lock,
  Play,
  Pause,
  Loader2,
  Camera,
  FileText,
  MapPin,
  Image as ImageIcon,
} from '@/lib/icons';
import { cn } from '@/lib/utils';
import { Textarea } from '@/components/ui/textarea';
import { WAVEFORM_HEIGHTS } from './constants';
import { formatRecordingTime } from './chatUtils';
import type { Message } from './types';
import { readableFileName } from '@/lib/chat/imageMeta';
import EmojiPicker from './EmojiPicker';
import LiveWaveform from './LiveWaveform';

interface ChatInputProps {
  // Text composer
  newMessage: string;
  setNewMessage: (v: string) => void;
  // Reply / edit
  replyTo: Message | null;
  setReplyTo: (v: Message | null) => void;
  editingMessage: Message | null;
  cancelEdit: () => void;
  // Staged attachments
  stagedPreviews: string[];
  stagedImagesCount: number;
  // States
  uploading: boolean;
  inputRef: React.RefObject<HTMLTextAreaElement>;
  fileInputRef: React.RefObject<HTMLInputElement>;
  // Voice recording state/actions
  isRecording: boolean;
  recordingTime: number;
  locked: boolean;
  previewBlob: Blob | null;
  previewUrl: string;
  uploadingVoice: boolean;
  /** Live amplitude bars during recording. NULL when not recording. */
  liveBars?: number[] | null;
  /** Captured envelope from the just-finished recording, used to render
   *  the preview pill's static waveform. NULL when no preview is active. */
  capturedBars?: number[] | null;
  startRecording: () => void;
  stopAndSend: () => void;
  stopAndCancel: () => void;
  stopForPreview: () => void;
  lockRecording: () => void;
  sendPreview: () => void;
  discardPreview: () => void;
  // Message actions
  sendMessage: () => void;
  saveEditMessage: () => void;
  sendStagedImages: () => void;
  removeStagedImage: (i: number) => void;
  clearStagedImages: () => void;
  // Emoji picker
  showEmojiPicker: boolean;
  setShowEmojiPicker: (v: boolean) => void;
  // Helpers
  resizeComposer: (el?: HTMLTextAreaElement | null) => void;
  broadcastTyping: () => void;
  scrollToBottom: () => void;
  activeConvOtherName?: string;
  userId?: string;
  onPasteFiles?: (files: File[]) => void | Promise<void>;
  /** When true, bare Enter sends; Shift+Enter inserts newline. When false, Enter always inserts a newline. */
  enterToSend?: boolean;
  /** Mention suggestions for @-mentions in groups */
  mentionSuggestions?: Array<{
    userId: string;
    username: string;
    displayName?: string;
    avatarUrl?: string | null;
  }>;
  /** Callback when message should be scheduled */
  onSchedule?: (date: Date) => void;
  /** Whether scheduling is supported */
  canSchedule?: boolean;
}

// ─────────────────────────────────────────────────────────────────────────────
// AttachmentMenu — Telegram-style bottom sheet with attachment type options.
// ─────────────────────────────────────────────────────────────────────────────
const ATTACHMENT_OPTIONS = () =>
  [
    { id: 'photo', icon: ImageIcon, label: 'صورة', color: 'bg-blue-500' },
    { id: 'camera', icon: Camera, label: 'كاميرا', color: 'bg-pink-500' },
    { id: 'file', icon: FileText, label: 'ملف', color: 'bg-purple-500' },
    { id: 'location', icon: MapPin, label: 'موقع', color: 'bg-green-500' },
  ] as const;

interface AttachmentMenuProps {
  onSelect: (type: string) => void;
  onClose: () => void;
}

const AttachmentMenu = React.memo(function AttachmentMenu({
  onSelect,
  onClose,
}: AttachmentMenuProps) {
  const options = useMemo(() => ATTACHMENT_OPTIONS(), []);
  return (
    <motion.div
      className="absolute bottom-full mb-2 start-2 z-drawer"
      initial={{ opacity: 0, scale: 0.8, y: 10 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.8, y: 10 }}
      transition={{ type: 'spring', damping: 20, stiffness: 350 }}
    >
      <div className="bg-card rounded-2xl border border-border p-3 min-w-[200px]">
        <div className="grid grid-cols-4 gap-3">
          {options.map((opt, i) => (
            <motion.button
              key={opt.id}
              type="button"
              className="flex flex-col items-center gap-1.5"
              onClick={() => {
                onSelect(opt.id);
                onClose();
              }}
              initial={{ scale: 0, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ delay: i * 0.05, type: 'spring', damping: 15 }}
              whileTap={{ scale: 0.9 }}
            >
              <div
                className={cn('w-11 h-11 rounded-full flex items-center justify-center', opt.color)}
              >
                <opt.icon className="w-5 h-5 text-white" />
              </div>
              <span className="text-[10px] text-muted-foreground font-medium">{opt.label}</span>
            </motion.button>
          ))}
        </div>
      </div>
      {/* Click-away backdrop */}
      <div className="fixed inset-0 -z-raised" onClick={onClose} />
    </motion.div>
  );
});

// ─────────────────────────────────────────────────────────────────────────────
// MentionSuggestionList — popup showing matching users when typing @
// ─────────────────────────────────────────────────────────────────────────────
interface MentionSuggestionListProps {
  suggestions: Array<{
    userId: string;
    username: string;
    displayName?: string;
    avatarUrl?: string | null;
  }>;
  query: string;
  onSelect: (username: string) => void;
}

const MentionSuggestionList = React.memo(function MentionSuggestionList({
  suggestions,
  query,
  onSelect,
}: MentionSuggestionListProps) {
  const filtered = useMemo(() => {
    if (!query) return suggestions.slice(0, 5);
    const q = query.toLowerCase();
    return suggestions
      .filter(
        (s) => s.username.toLowerCase().includes(q) || s.displayName?.toLowerCase().includes(q),
      )
      .slice(0, 5);
  }, [suggestions, query]);

  if (!filtered.length) return null;

  return (
    <motion.div
      className="absolute bottom-full mb-1 start-0 end-0 mx-3 z-drawer"
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 8 }}
    >
      <div className="bg-card rounded-xl border border-border overflow-hidden">
        {filtered.map((user, i) => (
          <motion.button
            key={user.userId}
            type="button"
            className="w-full flex items-center gap-2.5 px-3 py-2 hover:bg-muted/30 active:bg-muted/40 transition-colors text-start"
            onClick={() => onSelect(user.username)}
            initial={{ opacity: 0, x: -8 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: i * 0.03 }}
          >
            <div className="w-7 h-7 rounded-full bg-primary/10 flex items-center justify-center shrink-0 overflow-hidden">
              {user.avatarUrl ? (
                <img src={user.avatarUrl} alt="" className="w-full h-full object-cover" />
              ) : (
                <span className="text-[11px] font-bold text-primary">
                  {(user.username || '?')[0].toUpperCase()}
                </span>
              )}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-[13px] font-medium text-foreground truncate">
                {user.displayName || user.username}
              </p>
              <p className="text-[11px] text-muted-foreground">@{user.username}</p>
            </div>
          </motion.button>
        ))}
      </div>
    </motion.div>
  );
});

// ─────────────────────────────────────────────────────────────────────────────
// CharacterCounter — shows remaining chars when approaching limit.
// ─────────────────────────────────────────────────────────────────────────────
const MAX_CHARS = 4096;
const WARN_THRESHOLD = 3800;

const CharacterCounter = React.memo(function CharacterCounter({ count }: { count: number }) {
  if (count < WARN_THRESHOLD) return null;
  const remaining = MAX_CHARS - count;
  const isOver = remaining < 0;
  return (
    <motion.span
      initial={{ opacity: 0, scale: 0.8 }}
      animate={{ opacity: 1, scale: 1 }}
      className={cn(
        'absolute top-1 end-2 text-[10px] font-mono tabular-nums',
        isOver
          ? 'text-destructive font-bold'
          : remaining < 100
            ? 'text-orange-500'
            : 'text-muted-foreground/50',
      )}
    >
      {remaining}
    </motion.span>
  );
});

/**
 * WhatsApp/Telegram-class composer with:
 * - staged image previews
 * - reply / edit preview cards
 * - categorized emoji picker (toggle)
 * - press-and-hold voice with slide- + drag-up to lock + preview
 * - paste image support
 */
const ChatInput: React.FC<ChatInputProps> = ({
  newMessage,
  setNewMessage,
  replyTo,
  setReplyTo,
  editingMessage,
  cancelEdit,
  stagedPreviews,
  stagedImagesCount,
  uploading,
  inputRef,
  fileInputRef,
  isRecording,
  recordingTime,
  locked,
  previewBlob,
  previewUrl,
  uploadingVoice,
  liveBars,
  capturedBars,
  startRecording,
  stopAndSend,
  stopAndCancel,
  stopForPreview,
  lockRecording,
  sendPreview,
  discardPreview,
  sendMessage,
  saveEditMessage,
  sendStagedImages,
  removeStagedImage,
  clearStagedImages,
  showEmojiPicker,
  setShowEmojiPicker,
  resizeComposer,
  broadcastTyping,
  scrollToBottom,
  activeConvOtherName,
  userId,
  onPasteFiles,
  enterToSend = true,
  mentionSuggestions,
  onSchedule,
  canSchedule,
}) => {
  // Drag state for slide- / drag- overlay.
  const drag = useMotionValue(0);
  const dragY = useMotionValue(0);
  const cancelOpacity = useTransform(drag, [-120, -60, 0], [1, 0.6, 0]);
  const lockOpacity = useTransform(dragY, [-80, -30, 0], [1, 0.7, 0.3]);

  // Track the mic button rect so the overlay anchors correctly.
  const micWrapperRef = useRef<HTMLDivElement | null>(null);

  // Attachment menu state
  const [showAttachMenu, setShowAttachMenu] = useState(false);

  // Mention detection state
  const [mentionQuery, setMentionQuery] = useState<string | null>(null);
  const [showMentions, setShowMentions] = useState(false);

  // Preview playback for recorded voice message.
  const [previewPlaying, setPreviewPlaying] = useState(false);
  const previewAudioRef = useRef<HTMLAudioElement | null>(null);
  useEffect(() => {
    if (!previewUrl) {
      setPreviewPlaying(false);
      return;
    }
    if (!previewAudioRef.current) previewAudioRef.current = new Audio();
    const audio = previewAudioRef.current;
    audio.src = previewUrl;
    // Reset to the start on end so the user can tap Play again without a
    // stuck playhead (previously the audio stayed at `duration` and Play
    // did nothing on the second tap).
    audio.onended = () => {
      setPreviewPlaying(false);
      try {
        audio.currentTime = 0;
      } catch {
        /* no-op */
      }
    };
    return () => {
      audio.pause();
      audio.src = '';
    };
  }, [previewUrl]);
  const togglePreviewPlay = () => {
    const audio = previewAudioRef.current;
    if (!audio) return;
    if (previewPlaying) {
      audio.pause();
      setPreviewPlaying(false);
      return;
    }
    // If the previous play finished, the currentTime may be at duration;
    // rewind so tapping Play always starts audible playback.
    if (audio.ended || (audio.duration && audio.currentTime >= audio.duration - 0.05)) {
      try {
        audio.currentTime = 0;
      } catch {
        /* no-op */
      }
    }
    audio
      .play()
      .then(() => setPreviewPlaying(true))
      .catch(() => {});
  };

  // ── Paste handler ──────────────────────────────────────────────────────────
  const handlePaste = (e: React.ClipboardEvent<HTMLTextAreaElement>) => {
    const items = e.clipboardData?.items;
    if (!items) return;
    const files: File[] = [];
    for (let i = 0; i < items.length; i++) {
      const item = items[i];
      if (item.kind === 'file' && item.type.startsWith('image/')) {
        const f = item.getAsFile();
        if (f) files.push(f);
      }
    }
    if (files.length > 0) {
      e.preventDefault();
      onPasteFiles?.(files);
    }
  };

  // ── Pointer handlers for voice recording ──────────────────────────────────
  const startPointer = React.useRef<{ x: number; y: number; pressed: boolean } | null>(null);
  const SLIDE_CANCEL_PX = 100;
  const LOCK_PX = 70;

  const handleMicPointerDown = (e: React.PointerEvent) => {
    if (previewBlob) return;
    (e.target as HTMLElement).setPointerCapture?.(e.pointerId);
    startPointer.current = { x: e.clientX, y: e.clientY, pressed: true };
    startRecording();
  };

  const handleMicPointerMove = (e: React.PointerEvent) => {
    if (locked || !startPointer.current || !startPointer.current.pressed) return;
    const dx = e.clientX - startPointer.current.x;
    const dy = e.clientY - startPointer.current.y;
    // Horizontal drag direction depends on language (RTL drags right to cancel)
    const horizontalCancelValue = dx;
    const appliedX = Math.max(-180, Math.min(0, -horizontalCancelValue));
    drag.set(appliedX);
    dragY.set(Math.max(-120, Math.min(0, dy)));

    if (horizontalCancelValue > SLIDE_CANCEL_PX) {
      stopAndCancel();
      startPointer.current = null;
      drag.set(0);
      dragY.set(0);
    } else if (-dy > LOCK_PX) {
      lockRecording();
      startPointer.current = null;
      drag.set(0);
      dragY.set(0);
    }
  };

  const handleMicPointerUp = () => {
    // If the user released *before* locking, stop-and-send the recording.
    // startPointer is null once the drag handlers consumed the gesture.
    if (startPointer.current?.pressed && !locked) {
      stopAndSend();
    }
    startPointer.current = null;
    drag.set(0);
    dragY.set(0);
  };

  const handleMicPointerCancel = () => {
    if (startPointer.current?.pressed && !locked) stopAndCancel();
    startPointer.current = null;
    drag.set(0);
    dragY.set(0);
  };

  const insertEmoji = (emoji: string) => {
    const el = inputRef.current;
    if (!el) {
      setNewMessage(newMessage + emoji);
      return;
    }
    const start = el.selectionStart ?? newMessage.length;
    const end = el.selectionEnd ?? newMessage.length;
    const next = newMessage.slice(0, start) + emoji + newMessage.slice(end);
    setNewMessage(next);
    requestAnimationFrame(() => {
      el.focus();
      const caret = start + emoji.length;
      el.setSelectionRange(caret, caret);
      resizeComposer(el);
    });
  };

  // ── Mention detection ──────────────────────────────────────────────────────
  const detectMention = useCallback(
    (text: string, cursorPos: number) => {
      if (!mentionSuggestions?.length) {
        setShowMentions(false);
        return;
      }
      const before = text.slice(0, cursorPos);
      const match = before.match(/@(\w*)$/);
      if (match) {
        setMentionQuery(match[1]);
        setShowMentions(true);
      } else {
        setShowMentions(false);
        setMentionQuery(null);
      }
    },
    [mentionSuggestions],
  );

  const insertMention = useCallback(
    (username: string) => {
      const el = inputRef.current;
      if (!el) return;
      const cursorPos = el.selectionStart ?? newMessage.length;
      const before = newMessage.slice(0, cursorPos);
      const after = newMessage.slice(cursorPos);
      const mentionStart = before.lastIndexOf('@');
      if (mentionStart === -1) return;
      const next = before.slice(0, mentionStart) + `@${username} ` + after;
      setNewMessage(next);
      setShowMentions(false);
      setMentionQuery(null);
      requestAnimationFrame(() => {
        el.focus();
        const caret = mentionStart + username.length + 2;
        el.setSelectionRange(caret, caret);
        resizeComposer(el);
      });
    },
    [newMessage, inputRef, setNewMessage, resizeComposer],
  );

  // ── Attachment menu handler ─────────────────────────────────────────────────
  const handleAttachmentSelect = useCallback(
    (type: string) => {
      switch (type) {
        case 'photo':
        case 'camera':
          fileInputRef.current?.click();
          break;
        case 'file':
          fileInputRef.current?.click();
          break;
        case 'location':
          // Location sharing - get current position and send as text
          if (navigator.geolocation) {
            navigator.geolocation.getCurrentPosition(
              (pos) => {
                const { latitude, longitude } = pos.coords;
                const locationText = `📍 https://maps.google.com/?q=${latitude},${longitude}`;
                setNewMessage(locationText);
              },
              () => {
                setNewMessage('📍 لم يتم تحديد الموقع');
              },
            );
          }
          break;
      }
    },
    [fileInputRef, setNewMessage],
  );

  const showPreviewBar = !!previewBlob;
  const disableTextUI = isRecording || showPreviewBar;

  return (
    <div className="border-t border-border/15 bg-background pb-[env(safe-area-inset-bottom)] relative">
      {/* Mention suggestions popup */}
      <AnimatePresence>
        {showMentions && mentionSuggestions && mentionQuery !== null && (
          <MentionSuggestionList
            suggestions={mentionSuggestions}
            query={mentionQuery}
            onSelect={insertMention}
          />
        )}
      </AnimatePresence>

      {/* Attachment menu */}
      <AnimatePresence>
        {showAttachMenu && (
          <AttachmentMenu
            onSelect={handleAttachmentSelect}
            onClose={() => setShowAttachMenu(false)}
          />
        )}
      </AnimatePresence>

      {/* Staged images preview */}
      <AnimatePresence>
        {stagedPreviews.length > 0 && !disableTextUI && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden"
          >
            <div className="px-3 pt-2 pb-1">
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-[12px] text-muted-foreground font-medium">
                  {stagedPreviews.length} {'صورة'}
                </span>
                <button
                  onClick={clearStagedImages}
                  aria-label={'مسح جميع الصور'}
                  className="text-[11px] text-destructive font-medium px-2 py-0.5 rounded-full active:bg-destructive/10 transition-colors"
                >
                  {'مسح الكل'}
                </button>
              </div>
              <div className="flex gap-1.5 overflow-x-auto pb-1 scrollbar-none">
                {stagedPreviews.map((url, i) => (
                  <div
                    key={i}
                    className="relative shrink-0 w-16 h-16 rounded-xl overflow-hidden bg-muted/30 group"
                  >
                    <img src={url} alt="" className="w-full h-full object-cover" />
                    <button
                      onClick={() => removeStagedImage(i)}
                      aria-label={'إزالة الصورة'}
                      className="absolute top-0.5 end-0.5 w-5 h-5 rounded-full bg-black/60 flex items-center justify-center"
                    >
                      <X className="w-3 h-3 text-white" />
                    </button>
                  </div>
                ))}
                <button
                  onClick={() => fileInputRef.current?.click()}
                  aria-label={'إضافة صور'}
                  className="shrink-0 w-16 h-16 rounded-xl border-2 border-dashed border-border/30 flex items-center justify-center active:bg-accent/20 transition-colors"
                >
                  <Plus className="w-5 h-5 text-muted-foreground" />
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Edit preview */}
      <AnimatePresence>
        {editingMessage && !disableTextUI && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden"
          >
            <div className="mx-3 mt-2 rounded-xl bg-primary/8 border border-primary/15 overflow-hidden">
              <div className="flex items-start gap-2 p-2.5">
                <div className="flex-1 min-w-0 border-s-2 border-primary ps-2.5">
                  <span className="text-[11px] font-semibold text-primary flex items-center gap-1">
                    <Pencil className="w-3 h-3" />
                    {'تعديل الرسالة'}
                  </span>
                  <p className="text-[11px] text-muted-foreground truncate" dir="auto">
                    {editingMessage.content}
                  </p>
                </div>
                <button
                  onClick={cancelEdit}
                  aria-label={'إلغاء التعديل'}
                  className="shrink-0 w-9 h-9 -m-1.5 rounded-full flex items-center justify-center active:bg-muted/60 transition-colors"
                >
                  <X className="w-3.5 h-3.5 text-muted-foreground" />
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Reply preview */}
      <AnimatePresence>
        {replyTo && !disableTextUI && !editingMessage && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden"
          >
            <div className="mx-3 mt-2 rounded-xl bg-accent/20 border border-border/15 overflow-hidden">
              <div className="flex items-start gap-2 p-2.5">
                <div className="flex-1 min-w-0 border-s-2 border-primary ps-2.5">
                  <span className="text-[11px] font-semibold text-primary block">
                    {replyTo.sender_id === userId ? 'أنت' : activeConvOtherName || ''}
                  </span>
                  <p className="text-[11px] text-muted-foreground truncate" dir="auto">
                    {replyTo.message_type === 'image'
                      ? '📷 ' + ((replyTo.content || '').trim() || 'صورة')
                      : replyTo.message_type === 'voice'
                        ? '🎤 ' + 'رسالة صوتية'
                        : replyTo.message_type === 'file'
                          ? '📎 ' + (readableFileName(replyTo.file_name) || 'ملف')
                          : replyTo.content}
                  </p>
                </div>
                <button
                  onClick={() => setReplyTo(null)}
                  aria-label={'إلغاء الرد'}
                  className="shrink-0 w-9 h-9 -m-1.5 rounded-full flex items-center justify-center active:bg-muted/60 transition-colors"
                >
                  <X className="w-3.5 h-3.5 text-muted-foreground" />
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Input row ── */}
      <AnimatePresence mode="wait">
        {showPreviewBar ? (
          /* ── Recorded voice preview bar ── */
          <motion.div
            key="preview"
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 6 }}
            className="px-3 py-2 flex items-center gap-3"
            role="region"
            aria-label={'معاينة الرسالة الصوتية'}
          >
            <motion.button
              onClick={discardPreview}
              disabled={uploadingVoice}
              aria-label={'تجاهل التسجيل'}
              className="shrink-0 w-10 h-10 rounded-full flex items-center justify-center bg-destructive/10 active:bg-destructive/20 transition-colors disabled:opacity-40 disabled:pointer-events-none"
            >
              <Trash2 className="w-5 h-5 text-destructive" />
            </motion.button>

            <div className="flex-1 flex items-center gap-3 bg-muted/20 rounded-full px-2 h-11">
              <button
                onClick={togglePreviewPlay}
                aria-label={previewPlaying ? 'إيقاف مؤقت' : 'تشغيل'}
                className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary/20 active:scale-90 transition-transform"
              >
                {previewPlaying ? (
                  <Pause className="w-4 h-4 text-primary" />
                ) : (
                  <Play className="w-4 h-4 text-primary ms-0.5" />
                )}
              </button>
              {/* Captured envelope of the actual recording. Falls back to
                  the seeded fallback bars when the analyser was disabled
                  (Web Audio missing) so the pill always renders. */}
              <div className="flex-1 text-primary/60">
                <LiveWaveform
                  bars={capturedBars ?? WAVEFORM_HEIGHTS.map((h) => h / 22)}
                  height={20}
                  barWidth={2.5}
                  gap={2.5}
                  emphasizeFresh={false}
                />
              </div>
              <span className="shrink-0 text-[11px] font-mono tabular-nums text-muted-foreground/70 pe-1">
                {formatRecordingTime(recordingTime)}
              </span>
            </div>

            <motion.button
              onClick={uploadingVoice ? undefined : sendPreview}
              disabled={uploadingVoice}
              aria-label={'إرسال الرسالة الصوتية'}
              aria-busy={uploadingVoice}
              className="shrink-0 w-11 h-11 rounded-full bg-primary flex items-center justify-center disabled:opacity-90"
            >
              {uploadingVoice ? (
                <Loader2 className="w-5 h-5 text-primary-foreground animate-spin" />
              ) : (
                <Send
                  className="w-5 h-5 text-primary-foreground"
                  style={{ marginInlineStart: '2px' }}
                />
              )}
            </motion.button>
          </motion.div>
        ) : isRecording ? (
          /* ── Live recording bar ── */
          <motion.div
            key="recording"
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 6 }}
            transition={{ type: 'spring', damping: 25, stiffness: 400 }}
            className="px-3 py-2 flex items-center gap-3 relative"
            role="status"
            aria-live="polite"
          >
            {locked ? (
              <motion.button
                onClick={stopAndCancel}
                aria-label={'إلغاء التسجيل'}
                className="shrink-0 w-10 h-10 rounded-full flex items-center justify-center bg-destructive/10 active:bg-destructive/20 transition-colors"
              >
                <Trash2 className="w-5 h-5 text-destructive" />
              </motion.button>
            ) : (
              <motion.div
                className="shrink-0 w-10 h-10 rounded-full flex items-center justify-center bg-destructive/10"
                style={{ opacity: cancelOpacity }}
                aria-hidden="true"
              >
                <Trash2 className="w-5 h-5 text-destructive" />
              </motion.div>
            )}

            <div className="flex-1 flex items-center gap-3 bg-muted/20 rounded-full px-4 h-10">
              <motion.div
                animate={{ opacity: [1, 0.2, 1] }}
                transition={{ duration: 1, repeat: Infinity, ease: 'easeInOut' }}
                className="w-2.5 h-2.5 rounded-full bg-destructive shrink-0"
                aria-hidden="true"
              />
              <span
                className="text-[13px] font-mono text-foreground tabular-nums tracking-wide"
                role="timer"
                aria-label={`مدة التسجيل ${formatRecordingTime(recordingTime)}`}
              >
                {formatRecordingTime(recordingTime)}
              </span>
              {!locked ? (
                <div className="flex-1 flex items-center justify-center gap-1 text-[12px] text-muted-foreground/70">
                  <span className={cn('inline-block transition-transform', '-rotate-180')}>‹</span>
                  <span>{'اسحب للإلغاء'}</span>
                </div>
              ) : (
                /* Live amplitude bars — the user sees their voice in real
                   time. Bars fall back to a quiet floor when the analyser
                   isn't ready or Web Audio is unsupported. */
                <div className="flex-1 text-primary/55">
                  <LiveWaveform bars={liveBars ?? null} height={20} barWidth={2.5} gap={2.5} />
                </div>
              )}
            </div>

            {/* Lock / Send buttons */}
            {locked ? (
              <motion.button
                onClick={stopAndSend}
                aria-label={'إرسال الرسالة الصوتية'}
                className="shrink-0 w-10 h-10 rounded-full bg-primary flex items-center justify-center "
              >
                <Send
                  className="w-5 h-5 text-primary-foreground"
                  style={{ marginInlineStart: '2px' }}
                />
              </motion.button>
            ) : (
              <>
                {/* Lock hint above mic */}
                <motion.div
                  className="absolute -top-14 end-3 w-10 h-12 rounded-full bg-card border border-border/30 flex items-center justify-center pointer-events-none"
                  style={{ opacity: lockOpacity }}
                >
                  <Lock className="w-4 h-4 text-muted-foreground" />
                </motion.div>
                <motion.div
                  className="shrink-0 w-11 h-11 rounded-full bg-primary flex items-center justify-center relative"
                  animate={{ scale: [1, 1.08, 1] }}
                  transition={{ duration: 1.8, repeat: Infinity, ease: 'easeInOut' }}
                >
                  <Mic className="h-5 w-5 text-primary-foreground" />
                </motion.div>
              </>
            )}
          </motion.div>
        ) : (
          /* ── Text composer ── */
          <motion.div
            key="input"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="px-2.5 py-2 flex items-end gap-1.5"
          >
            {/* Attach (+) — kept outside the pill so the menu anchors cleanly. */}
            <button
              type="button"
              onPointerDown={(e) => e.preventDefault()}
              onClick={() => setShowAttachMenu(!showAttachMenu)}
              disabled={uploading}
              className={cn(
                'shrink-0 w-10 h-10 rounded-full flex items-center justify-center transition-colors self-end',
                showAttachMenu
                  ? 'bg-primary/15 text-primary'
                  : 'active:bg-accent/40 text-muted-foreground',
              )}
              aria-label={'مرفق'}
            >
              {uploading ? (
                <div className="w-5 h-5 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
              ) : (
                <motion.div
                  animate={{ rotate: showAttachMenu ? 45 : 0 }}
                  transition={{ type: 'spring', damping: 15 }}
                >
                  <Plus className="h-5 w-5" />
                </motion.div>
              )}
            </button>

            {/* Text input — iOS-style pill with the emoji button tucked inside. */}
            <div className="flex-1 relative flex items-end bg-muted/15 border border-border/15 rounded-3xl overflow-visible transition-all duration-200 focus-within:border-primary/25 focus-within:bg-muted/5 ">
              <CharacterCounter count={newMessage.length} />

              {/* Emoji toggle — sits inside the pill on the start edge,
                  bottom-aligned so it stays put while the textarea grows. */}
              <button
                type="button"
                onClick={() => {
                  setShowEmojiPicker(!showEmojiPicker);
                }}
                className={cn(
                  'shrink-0 self-end mb-1 ms-1 w-8 h-8 rounded-full flex items-center justify-center transition-colors',
                  showEmojiPicker
                    ? 'bg-primary/15 text-primary'
                    : 'text-muted-foreground/70 active:bg-accent/40',
                )}
                aria-label={'رموز تعبيرية'}
                aria-pressed={showEmojiPicker}
              >
                <Smile className="h-[18px] w-[18px]" />
              </button>

              <Textarea
                ref={inputRef}
                placeholder={stagedImagesCount > 0 ? 'أضف تعليقًا (اختياري)...' : 'رسالة...'}
                value={newMessage}
                rows={1}
                name="chat-message"
                autoComplete="off"
                autoCorrect="on"
                autoCapitalize="sentences"
                spellCheck
                enterKeyHint={enterToSend ? 'send' : 'enter'}
                inputMode="text"
                data-form-type="other"
                onChange={(e) => {
                  const val = e.target.value;
                  if (val.length <= MAX_CHARS) {
                    setNewMessage(val);
                  }
                  resizeComposer(e.currentTarget);
                  if (val.trim()) broadcastTyping();
                  // Detect @mentions
                  detectMention(val, e.currentTarget.selectionStart ?? val.length);
                }}
                onFocus={() => {
                  if (showEmojiPicker) setShowEmojiPicker(false);
                  if (showAttachMenu) setShowAttachMenu(false);
                  resizeComposer();
                  setTimeout(scrollToBottom, 120);
                }}
                onPaste={handlePaste}
                onKeyDown={(e) => {
                  if (
                    e.key === 'Enter' &&
                    enterToSend &&
                    !e.shiftKey &&
                    !e.nativeEvent.isComposing
                  ) {
                    e.preventDefault();
                    if (showMentions) return; // Let mention list handle it
                    if (editingMessage) saveEditMessage();
                    else if (stagedImagesCount > 0) sendStagedImages();
                    else sendMessage();
                  }
                  // Escape to close mentions/emoji
                  if (e.key === 'Escape') {
                    if (showMentions) {
                      setShowMentions(false);
                      e.preventDefault();
                    }
                    if (showEmojiPicker) {
                      setShowEmojiPicker(false);
                      e.preventDefault();
                    }
                    if (showAttachMenu) {
                      setShowAttachMenu(false);
                      e.preventDefault();
                    }
                  }
                }}
                dir="auto"
                className="flex-1 border-0 bg-transparent focus-visible:ring-0 focus-visible:ring-offset-0 min-h-[40px] max-h-[140px] resize-none ps-1.5 pe-3.5 py-[10px] text-[15px] leading-relaxed placeholder:text-muted-foreground/40"
              />
            </div>

            {/* Send or Mic */}
            {newMessage.trim() || stagedImagesCount > 0 || editingMessage ? (
              <motion.button
                initial={{ scale: 0.5, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ type: 'spring', damping: 15, stiffness: 400 }}
                className="shrink-0 w-10 h-10 rounded-full bg-primary flex items-center justify-center text-primary-foreground self-end"
                type="button"
                aria-label={editingMessage ? 'حفظ التعديل' : 'إرسال'}
                onPointerDown={(e) => e.preventDefault()}
                onClick={() => {
                  if (editingMessage) {
                    saveEditMessage();
                    return;
                  }
                  if (stagedImagesCount > 0) {
                    sendStagedImages();
                    return;
                  }
                  if (newMessage.trim()) sendMessage();
                }}
              >
                {editingMessage ? (
                  <Check className="h-5 w-5" />
                ) : (
                  <Send className="h-[18px] w-[18px]" style={{ marginInlineStart: '1px' }} />
                )}
              </motion.button>
            ) : (
              <div ref={micWrapperRef} className="shrink-0 self-end">
                <motion.button
                  type="button"
                  className="h-10 w-10 rounded-full flex items-center justify-center text-muted-foreground active:bg-accent/30 transition-colors"
                  onPointerDown={handleMicPointerDown}
                  onPointerMove={handleMicPointerMove}
                  onPointerUp={handleMicPointerUp}
                  onPointerCancel={handleMicPointerCancel}
                  onContextMenu={(e) => e.preventDefault()}
                  aria-label={'تسجيل صوت'}
                >
                  <Mic className="h-5 w-5" />
                </motion.button>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Emoji picker (collapsible) */}
      <AnimatePresence>
        {showEmojiPicker && !isRecording && !showPreviewBar && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <EmojiPicker onPick={insertEmoji} />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default ChatInput;
