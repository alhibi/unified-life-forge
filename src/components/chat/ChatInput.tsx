import React, { useEffect, useRef } from 'react';
import { motion, AnimatePresence, useMotionValue, useTransform } from 'framer-motion';
import {
  Send, Mic, X, Pencil, Check, Trash2, Plus, Smile, Lock,
  Play, Pause, Loader2,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Textarea } from '@/components/ui/textarea';
import { WAVEFORM_HEIGHTS } from './constants';
import { formatRecordingTime } from './chatUtils';
import type { Message } from './types';
import EmojiPicker from './EmojiPicker';

interface ChatInputProps {
  isAr: boolean;
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
  onPasteFiles?: (files: File[]) => void;
  /** When true, bare Enter sends; Shift+Enter inserts newline. When false, Enter always inserts a newline. */
  enterToSend?: boolean;
}

/**
 * WhatsApp/Telegram-class composer with:
 *  - staged image previews
 *  - reply / edit preview cards
 *  - categorized emoji picker (toggle)
 *  - press-and-hold voice with slide-to-cancel + drag-up to lock + preview
 *  - paste image support
 */
const ChatInput: React.FC<ChatInputProps> = ({
  isAr, newMessage, setNewMessage,
  replyTo, setReplyTo, editingMessage, cancelEdit,
  stagedPreviews, stagedImagesCount, uploading,
  inputRef, fileInputRef,
  isRecording, recordingTime, locked, previewBlob, previewUrl, uploadingVoice,
  startRecording, stopAndSend, stopAndCancel, stopForPreview, lockRecording, sendPreview, discardPreview,
  sendMessage, saveEditMessage, sendStagedImages, removeStagedImage, clearStagedImages,
  showEmojiPicker, setShowEmojiPicker,
  resizeComposer, broadcastTyping, scrollToBottom,
  activeConvOtherName, userId, onPasteFiles,
  enterToSend = true,
}) => {
  // Drag state for slide-to-cancel / drag-to-lock overlay.
  const drag = useMotionValue(0);
  const dragY = useMotionValue(0);
  const cancelOpacity = useTransform(drag, [-120, -60, 0], [1, 0.6, 0]);
  const lockOpacity = useTransform(dragY, [-80, -30, 0], [1, 0.7, 0.3]);

  // Track the mic button rect so the overlay anchors correctly.
  const micWrapperRef = useRef<HTMLDivElement | null>(null);

  // Preview playback for recorded voice message.
  const [previewPlaying, setPreviewPlaying] = React.useState(false);
  const previewAudioRef = useRef<HTMLAudioElement | null>(null);
  useEffect(() => {
    if (!previewUrl) { setPreviewPlaying(false); return; }
    if (!previewAudioRef.current) previewAudioRef.current = new Audio();
    const audio = previewAudioRef.current;
    audio.src = previewUrl;
    audio.onended = () => setPreviewPlaying(false);
    return () => { audio.pause(); audio.src = ''; };
  }, [previewUrl]);
  const togglePreviewPlay = () => {
    const audio = previewAudioRef.current;
    if (!audio) return;
    if (previewPlaying) { audio.pause(); setPreviewPlaying(false); }
    else { audio.play().then(() => setPreviewPlaying(true)).catch(() => {}); }
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
    const horizontalCancelValue = isAr ? dx : -dx;
    const appliedX = Math.max(-180, Math.min(0, -horizontalCancelValue));
    drag.set(appliedX);
    dragY.set(Math.max(-120, Math.min(0, dy)));

    if (horizontalCancelValue > SLIDE_CANCEL_PX) {
      stopAndCancel();
      startPointer.current = null;
      drag.set(0); dragY.set(0);
    } else if (-dy > LOCK_PX) {
      lockRecording();
      startPointer.current = null;
      drag.set(0); dragY.set(0);
    }
  };

  const handleMicPointerUp = () => {
    // If the user released *before* locking, stop-and-send the recording.
    // startPointer is null once the drag handlers consumed the gesture.
    if (startPointer.current?.pressed && !locked) {
      stopAndSend();
    }
    startPointer.current = null;
    drag.set(0); dragY.set(0);
  };

  const handleMicPointerCancel = () => {
    if (startPointer.current?.pressed && !locked) stopAndCancel();
    startPointer.current = null;
    drag.set(0); dragY.set(0);
  };

  const insertEmoji = (emoji: string) => {
    const el = inputRef.current;
    if (!el) { setNewMessage(newMessage + emoji); return; }
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

  const showPreviewBar = !!previewBlob;
  const disableTextUI = isRecording || showPreviewBar;

  return (
    <div className="border-t border-border/15 bg-background pb-[env(safe-area-inset-bottom)]">
      {/* Staged images preview */}
      <AnimatePresence>
        {stagedPreviews.length > 0 && !disableTextUI && (
          <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden">
            <div className="px-3 pt-2 pb-1">
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-[12px] text-muted-foreground font-medium">
                  {stagedPreviews.length} {isAr ? 'صورة' : (stagedPreviews.length === 1 ? 'Foto' : 'Fotos')}
                </span>
                <button onClick={clearStagedImages} aria-label={isAr ? 'مسح جميع الصور' : 'Alle Bilder entfernen'} className="text-[11px] text-destructive font-medium px-2 py-0.5 rounded-full active:bg-destructive/10 transition-colors">
                  {isAr ? 'مسح الكل' : 'Alle löschen'}
                </button>
              </div>
              <div className="flex gap-1.5 overflow-x-auto pb-1 scrollbar-none">
                {stagedPreviews.map((url, i) => (
                  <div key={i} className="relative shrink-0 w-16 h-16 rounded-xl overflow-hidden bg-muted/30 group">
                    <img src={url} alt="" className="w-full h-full object-cover" />
                    <button onClick={() => removeStagedImage(i)} aria-label={isAr ? 'إزالة الصورة' : 'Bild entfernen'} className="absolute top-0.5 end-0.5 w-5 h-5 rounded-full bg-black/60 flex items-center justify-center">
                      <X className="w-3 h-3 text-white" />
                    </button>
                  </div>
                ))}
                <button onClick={() => fileInputRef.current?.click()} aria-label={isAr ? 'إضافة صور' : 'Mehr hinzufügen'} className="shrink-0 w-16 h-16 rounded-xl border-2 border-dashed border-border/30 flex items-center justify-center active:bg-accent/20 transition-colors">
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
          <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden">
            <div className="mx-3 mt-2 rounded-xl bg-primary/8 border border-primary/15 overflow-hidden">
              <div className="flex items-start gap-2 p-2.5">
                <div className="flex-1 min-w-0 border-s-2 border-primary ps-2.5">
                  <span className="text-[11px] font-semibold text-primary flex items-center gap-1">
                    <Pencil className="w-3 h-3" />
                    {isAr ? 'تعديل الرسالة' : 'Nachricht bearbeiten'}
                  </span>
                  <p className="text-[11px] text-muted-foreground truncate" dir="auto">{editingMessage.content}</p>
                </div>
                <button onClick={cancelEdit} aria-label={isAr ? 'إلغاء التعديل' : 'Bearbeitung abbrechen'} className="shrink-0 w-6 h-6 rounded-full flex items-center justify-center active:bg-muted/60 transition-colors">
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
          <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden">
            <div className="mx-3 mt-2 rounded-xl bg-accent/20 border border-border/15 overflow-hidden">
              <div className="flex items-start gap-2 p-2.5">
                <div className="flex-1 min-w-0 border-s-2 border-primary ps-2.5">
                  <span className="text-[11px] font-semibold text-primary block">
                    {replyTo.sender_id === userId ? (isAr ? 'أنت' : 'Du') : (activeConvOtherName || '')}
                  </span>
                  <p className="text-[11px] text-muted-foreground truncate" dir="auto">
                    {replyTo.message_type === 'image' ? '📷 ' + (isAr ? 'صورة' : 'Foto')
                      : replyTo.message_type === 'voice' ? '🎤 ' + (isAr ? 'رسالة صوتية' : 'Sprachnachricht')
                      : replyTo.message_type === 'file' ? '📎 ' + (replyTo.file_name || (isAr ? 'ملف' : 'Datei'))
                      : replyTo.content}
                  </p>
                </div>
                <button onClick={() => setReplyTo(null)} aria-label={isAr ? 'إلغاء الرد' : 'Antwort abbrechen'} className="shrink-0 w-6 h-6 rounded-full flex items-center justify-center active:bg-muted/60 transition-colors">
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
          <motion.div key="preview" initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 6 }} className="px-3 py-2 flex items-center gap-3" role="region" aria-label={isAr ? 'معاينة الرسالة الصوتية' : 'Sprachnachricht-Vorschau'}>
            <motion.button onClick={discardPreview} disabled={uploadingVoice}  aria-label={isAr ? 'تجاهل التسجيل' : 'Aufnahme verwerfen'} className="shrink-0 w-10 h-10 rounded-full flex items-center justify-center bg-destructive/10 active:bg-destructive/20 transition-colors disabled:opacity-40 disabled:pointer-events-none">
              <Trash2 className="w-5 h-5 text-destructive" />
            </motion.button>

            <div className="flex-1 flex items-center gap-3 bg-muted/20 rounded-full px-2 h-11">
              <button
                onClick={togglePreviewPlay}
                aria-label={previewPlaying ? (isAr ? 'إيقاف مؤقت' : 'Pause') : (isAr ? 'تشغيل' : 'Abspielen')}
                className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary/20 active:scale-90 transition-transform"
              >
                {previewPlaying ? <Pause className="w-4 h-4 text-primary" /> : <Play className="w-4 h-4 text-primary ms-0.5" />}
              </button>
              <div className="flex-1 flex items-center gap-[2.5px] h-5" dir="ltr">
                {Array.from({ length: 26 }).map((_, i) => (
                  <motion.div
                    key={i}
                    animate={previewPlaying ? { height: [2, WAVEFORM_HEIGHTS[i % WAVEFORM_HEIGHTS.length], 2] } : { height: WAVEFORM_HEIGHTS[i % WAVEFORM_HEIGHTS.length] }}
                    transition={previewPlaying ? { duration: 0.4 + Math.random() * 0.3, repeat: Infinity, delay: i * 0.03 } : { duration: 0 }}
                    className="w-[2.5px] rounded-full bg-primary/50"
                  />
                ))}
              </div>
              <span className="shrink-0 text-[11px] font-mono tabular-nums text-muted-foreground/70 pe-1">
                {formatRecordingTime(recordingTime)}
              </span>
            </div>

            <motion.button
              onClick={uploadingVoice ? undefined : sendPreview}
              disabled={uploadingVoice}
              }
              aria-label={isAr ? 'إرسال الرسالة الصوتية' : 'Sprachnachricht senden'}
              aria-busy={uploadingVoice}
              className="shrink-0 w-11 h-11 rounded-full bg-primary flex items-center justify-center shadow-md shadow-primary/20 disabled:opacity-90"
            >
              {uploadingVoice
                ? <Loader2 className="w-5 h-5 text-primary-foreground animate-spin" />
                : <Send className="w-5 h-5 text-primary-foreground" style={{ marginInlineStart: '2px' }} />}
            </motion.button>
          </motion.div>
        ) : isRecording ? (
          /* ── Live recording bar ── */
          <motion.div key="recording" initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 6 }} transition={{ type: 'spring', damping: 25, stiffness: 400 }} className="px-3 py-2 flex items-center gap-3 relative" role="status" aria-live="polite">
            {locked ? (
              <motion.button onClick={stopAndCancel}  aria-label={isAr ? 'إلغاء التسجيل' : 'Aufnahme abbrechen'} className="shrink-0 w-10 h-10 rounded-full flex items-center justify-center bg-destructive/10 active:bg-destructive/20 transition-colors">
                <Trash2 className="w-5 h-5 text-destructive" />
              </motion.button>
            ) : (
              <motion.div className="shrink-0 w-10 h-10 rounded-full flex items-center justify-center bg-destructive/10" style={{ opacity: cancelOpacity }} aria-hidden="true">
                <Trash2 className="w-5 h-5 text-destructive" />
              </motion.div>
            )}

            <div className="flex-1 flex items-center gap-3 bg-muted/20 rounded-full px-4 h-10">
              <motion.div animate={{ opacity: [1, 0.2, 1] }} transition={{ duration: 1, repeat: Infinity, ease: 'easeInOut' }} className="w-2.5 h-2.5 rounded-full bg-destructive shrink-0" aria-hidden="true" />
              <span className="text-[13px] font-mono text-foreground tabular-nums tracking-wide" role="timer" aria-label={isAr ? `مدة التسجيل ${formatRecordingTime(recordingTime)}` : `Aufnahmedauer ${formatRecordingTime(recordingTime)}`}>
                {formatRecordingTime(recordingTime)}
              </span>
              {!locked ? (
                <div className="flex-1 flex items-center justify-center gap-1 text-[12px] text-muted-foreground/70">
                  <span className={cn('inline-block transition-transform', isAr ? '-rotate-180' : '')}>‹</span>
                  <span>{isAr ? 'اسحب للإلغاء' : 'Zum Abbrechen wischen'}</span>
                </div>
              ) : (
                <div className="flex-1 flex items-center justify-center gap-[2.5px]" dir="ltr">
                  {Array.from({ length: 22 }).map((_, i) => (
                    <motion.div
                      key={i}
                      animate={{ height: [2, WAVEFORM_HEIGHTS[i] ?? 10, 2] }}
                      transition={{ duration: 0.4 + Math.random() * 0.3, repeat: Infinity, delay: i * 0.04, ease: 'easeInOut' }}
                      className="w-[2.5px] bg-primary/50 rounded-full"
                    />
                  ))}
                </div>
              )}
            </div>

            {/* Lock / Send buttons */}
            {locked ? (
              <motion.button onClick={stopAndSend}  aria-label={isAr ? 'إرسال الرسالة الصوتية' : 'Sprachnachricht senden'} className="shrink-0 w-10 h-10 rounded-full bg-primary flex items-center justify-center shadow-md shadow-primary/20">
                <Send className="w-5 h-5 text-primary-foreground" style={{ marginInlineStart: '2px' }} />
              </motion.button>
            ) : (
              <>
                {/* Lock hint above mic */}
                <motion.div className="absolute -top-14 end-3 w-10 h-12 rounded-full bg-card border border-border/30 flex items-center justify-center shadow-md pointer-events-none" style={{ opacity: lockOpacity }}>
                  <Lock className="w-4 h-4 text-muted-foreground" />
                </motion.div>
                <motion.div
                  className="shrink-0 w-11 h-11 rounded-full bg-primary flex items-center justify-center shadow-lg shadow-primary/25 relative"
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
          <motion.div key="input" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="px-2.5 py-2 flex items-end gap-1.5">
            {/* Emoji toggle */}
            <button
              type="button"
              onClick={() => { setShowEmojiPicker(!showEmojiPicker); }}
              className={cn(
                'shrink-0 w-10 h-10 rounded-full flex items-center justify-center transition-colors self-end',
                showEmojiPicker ? 'bg-primary/15 text-primary' : 'active:bg-accent/40 text-muted-foreground'
              )}
              aria-label={isAr ? 'رموز تعبيرية' : 'Emoji'}
            >
              <Smile className="h-5 w-5" />
            </button>

            {/* Attach */}
            <button
              type="button"
              onPointerDown={(e) => e.preventDefault()}
              onClick={() => fileInputRef.current?.click()}
              disabled={uploading}
              className="shrink-0 w-10 h-10 rounded-full flex items-center justify-center active:bg-accent/40 transition-colors self-end"
              aria-label={isAr ? 'مرفق' : 'Anhang'}
            >
              {uploading ? (
                <div className="w-5 h-5 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
              ) : (
                <Plus className="h-5 w-5 text-muted-foreground" />
              )}
            </button>

            {/* Text input */}
            <div className="flex-1 flex items-end bg-muted/15 border border-border/15 rounded-2xl overflow-hidden transition-colors focus-within:border-primary/20">
              <Textarea
                ref={inputRef}
                placeholder={
                  stagedImagesCount > 0
                    ? (isAr ? 'أضف تعليقًا (اختياري)...' : 'Bildunterschrift hinzufügen (optional)...')
                    : (isAr ? 'رسالة...' : 'Nachricht...')
                }
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
                onChange={e => {
                  setNewMessage(e.target.value);
                  resizeComposer(e.currentTarget);
                  if (e.target.value.trim()) broadcastTyping();
                }}
                onFocus={() => {
                  if (showEmojiPicker) setShowEmojiPicker(false);
                  resizeComposer();
                  setTimeout(scrollToBottom, 120);
                }}
                onPaste={handlePaste}
                onKeyDown={e => {
                  if (e.key === 'Enter' && enterToSend && !e.shiftKey && !e.nativeEvent.isComposing) {
                    e.preventDefault();
                    if (editingMessage) saveEditMessage();
                    else if (stagedImagesCount > 0) sendStagedImages();
                    else sendMessage();
                  }
                }}
                dir="auto"
                className="flex-1 border-0 bg-transparent focus-visible:ring-0 focus-visible:ring-offset-0 min-h-[40px] max-h-[140px] resize-none px-4 py-[10px] text-[15px] leading-relaxed placeholder:text-muted-foreground/40"
              />
            </div>

            {/* Send or Mic */}
            {(newMessage.trim() || stagedImagesCount > 0 || editingMessage) ? (
              <motion.button
                initial={{ scale: 0.5, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ type: 'spring', damping: 15, stiffness: 400 }}
                className="shrink-0 w-10 h-10 rounded-full bg-primary flex items-center justify-center text-primary-foreground shadow-md shadow-primary/20 self-end"
                type="button"
                aria-label={editingMessage ? (isAr ? 'حفظ التعديل' : 'Änderung speichern') : (isAr ? 'إرسال' : 'Senden')}
                onPointerDown={(e) => e.preventDefault()}
                onClick={() => {
                  if (editingMessage) { saveEditMessage(); return; }
                  if (stagedImagesCount > 0) {
                    // Staged images consume any typed text as a caption; do
                    // not also fire a standalone text message.
                    sendStagedImages();
                    return;
                  }
                  if (newMessage.trim()) sendMessage();
                }}
              >
                {editingMessage
                  ? <Check className="h-5 w-5" />
                  : <Send className="h-[18px] w-[18px]" style={{ marginInlineStart: '1px' }} />}
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
                  aria-label={isAr ? 'تسجيل صوت' : 'Sprachnachricht'}
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
            <EmojiPicker isAr={isAr} onPick={insertEmoji} />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default ChatInput;
