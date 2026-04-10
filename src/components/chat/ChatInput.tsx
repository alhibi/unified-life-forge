import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Send, Mic, X, Pencil, Check, Trash2, Plus } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Textarea } from '@/components/ui/textarea';
import { WAVEFORM_HEIGHTS } from './constants';
import { formatRecordingTime } from './chatUtils';
import type { Message } from './types';

interface ChatInputProps {
  isAr: boolean;
  isRecording: boolean;
  recordingTime: number;
  newMessage: string;
  setNewMessage: (v: string) => void;
  replyTo: Message | null;
  setReplyTo: (v: Message | null) => void;
  editingMessage: Message | null;
  setEditingMessage: (v: Message | null) => void;
  stagedPreviews: string[];
  uploading: boolean;
  inputRef: React.RefObject<HTMLTextAreaElement>;
  fileInputRef: React.RefObject<HTMLInputElement>;
  sendMessage: () => void;
  saveEditMessage: () => void;
  sendStagedImages: () => void;
  startRecording: () => void;
  stopRecording: (cancel?: boolean) => void;
  removeStagedImage: (i: number) => void;
  clearStagedImages: () => void;
  resizeComposer: (el?: HTMLTextAreaElement | null) => void;
  broadcastTyping: () => void;
  scrollToBottom: () => void;
  activeConvOtherName?: string;
  userId?: string;
  stagedImagesCount: number;
}

const ChatInput: React.FC<ChatInputProps> = ({
  isAr, isRecording, recordingTime, newMessage, setNewMessage,
  replyTo, setReplyTo, editingMessage, setEditingMessage,
  stagedPreviews, uploading, inputRef, fileInputRef,
  sendMessage, saveEditMessage, sendStagedImages, startRecording, stopRecording,
  removeStagedImage, clearStagedImages, resizeComposer, broadcastTyping, scrollToBottom,
  activeConvOtherName, userId, stagedImagesCount,
}) => {
  return (
    <div className="border-t border-border/15 bg-background pb-[env(safe-area-inset-bottom)]">
      {/* Staged images preview */}
      <AnimatePresence>
        {stagedPreviews.length > 0 && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden"
          >
            <div className="px-3 pt-2 pb-1">
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-[12px] text-muted-foreground font-medium">
                  {stagedPreviews.length} {isAr ? 'صورة' : (stagedPreviews.length === 1 ? 'Foto' : 'Fotos')}
                </span>
                <button
                  onClick={clearStagedImages}
                  className="text-[11px] text-destructive font-medium px-2 py-0.5 rounded-full active:bg-destructive/10 transition-colors"
                >
                  {isAr ? 'مسح الكل' : 'Alle löschen'}
                </button>
              </div>
              <div className="flex gap-1.5 overflow-x-auto pb-1 scrollbar-none">
                {stagedPreviews.map((url, i) => (
                  <div key={i} className="relative shrink-0 w-16 h-16 rounded-xl overflow-hidden bg-muted/30 group">
                    <img src={url} alt="" className="w-full h-full object-cover" />
                    <button
                      onClick={() => removeStagedImage(i)}
                      className="absolute top-0.5 end-0.5 w-5 h-5 rounded-full bg-black/60 flex items-center justify-center"
                    >
                      <X className="w-3 h-3 text-white" />
                    </button>
                  </div>
                ))}
                <button
                  onClick={() => fileInputRef.current?.click()}
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
        {editingMessage && !isRecording && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden"
          >
            <div className="mx-3 mt-2 rounded-xl bg-primary/8 border border-primary/15 overflow-hidden">
              <div className="flex items-start gap-2 p-2.5">
                <div className="flex-1 min-w-0 border-s-2 border-primary ps-2.5">
                  <span className="text-[11px] font-semibold text-primary block flex items-center gap-1">
                    <Pencil className="w-3 h-3" />
                    {isAr ? 'تعديل الرسالة' : 'Nachricht bearbeiten'}
                  </span>
                  <p className="text-[11px] text-muted-foreground truncate" dir="auto">
                    {editingMessage.content}
                  </p>
                </div>
                <button
                  onClick={() => { setEditingMessage(null); setNewMessage(''); resizeComposer(); }}
                  className="shrink-0 w-6 h-6 rounded-full flex items-center justify-center active:bg-muted/60 transition-colors"
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
        {replyTo && !isRecording && !editingMessage && (
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
                    {replyTo.sender_id === userId
                      ? (isAr ? 'أنت' : 'Du')
                      : (activeConvOtherName || '')}
                  </span>
                  <p className="text-[11px] text-muted-foreground truncate" dir="auto">
                    {replyTo.message_type === 'image' ? '📷 ' + (isAr ? 'صورة' : 'Foto') : replyTo.content}
                  </p>
                </div>
                <button
                  onClick={() => setReplyTo(null)}
                  className="shrink-0 w-6 h-6 rounded-full flex items-center justify-center active:bg-muted/60 transition-colors"
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
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 6 }}
            transition={{ type: 'spring', damping: 25, stiffness: 400 }}
            className="px-3 py-2 flex items-center gap-3"
          >
            <motion.button
              onClick={() => stopRecording(true)}
              className="shrink-0 w-10 h-10 rounded-full flex items-center justify-center bg-destructive/10 active:bg-destructive/20 transition-colors"
              whileTap={{ scale: 0.85 }}
            >
              <Trash2 className="w-5 h-5 text-destructive" />
            </motion.button>

            <div className="flex-1 flex items-center gap-3 bg-muted/20 rounded-full px-4 h-10">
              <motion.div
                animate={{ opacity: [1, 0.2, 1] }}
                transition={{ duration: 1, repeat: Infinity, ease: 'easeInOut' }}
                className="w-2.5 h-2.5 rounded-full bg-destructive shrink-0"
              />
              <span className="text-[13px] font-mono text-foreground tabular-nums tracking-wide">
                {formatRecordingTime(recordingTime)}
              </span>
              <div className="flex-1 flex items-center justify-center gap-[2.5px]" dir="ltr">
                {Array.from({ length: 24 }).map((_, i) => (
                  <motion.div
                    key={i}
                    animate={{ height: [2, WAVEFORM_HEIGHTS[i], 2] }}
                    transition={{
                      duration: 0.4 + Math.random() * 0.4,
                      repeat: Infinity,
                      delay: i * 0.04,
                      ease: 'easeInOut',
                    }}
                    className="w-[2.5px] bg-primary/50 rounded-full"
                    style={{ minHeight: 2 }}
                  />
                ))}
              </div>
            </div>

            <motion.button
              onClick={() => stopRecording(false)}
              className="shrink-0 w-10 h-10 rounded-full bg-primary flex items-center justify-center shadow-md shadow-primary/20"
              whileTap={{ scale: 0.85 }}
              animate={{ scale: [1, 1.06, 1] }}
              transition={{ duration: 1.8, repeat: Infinity, ease: 'easeInOut' }}
            >
              <Send className="w-4.5 h-4.5 text-primary-foreground" style={{ marginInlineStart: '2px' }} />
            </motion.button>
          </motion.div>
        ) : (
          <motion.div
            key="input"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="px-2.5 py-2 flex items-end gap-1.5"
          >
            {/* Plus/attach button */}
            <button
              type="button"
              onPointerDown={(e) => e.preventDefault()}
              onClick={() => fileInputRef.current?.click()}
              disabled={uploading}
              className="shrink-0 w-10 h-10 rounded-full flex items-center justify-center active:bg-accent/40 transition-colors self-end"
            >
              {uploading ? (
                <div className="w-5 h-5 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
              ) : (
                <Plus className="h-5 w-5 text-muted-foreground" />
              )}
            </button>

            {/* Text input - pill shape */}
            <div className="flex-1 flex items-end bg-muted/15 border border-border/15 rounded-full overflow-hidden transition-colors focus-within:border-primary/20">
              <Textarea
                ref={inputRef}
                placeholder={isAr ? 'رسالة...' : 'Nachricht...'}
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
                    if (editingMessage) saveEditMessage();
                    else sendMessage();
                  }
                }}
                dir="auto"
                className="flex-1 border-0 bg-transparent focus-visible:ring-0 focus-visible:ring-offset-0 min-h-[40px] max-h-[120px] resize-none px-4 py-[10px] text-[15px] leading-relaxed placeholder:text-muted-foreground/40"
              />
            </div>

            {/* Send or Mic button */}
            {(newMessage.trim() || stagedImagesCount > 0) ? (
              <motion.button
                initial={{ scale: 0.5, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ type: 'spring', damping: 15, stiffness: 400 }}
                className="shrink-0 w-10 h-10 rounded-full bg-primary flex items-center justify-center text-primary-foreground shadow-md shadow-primary/20 self-end"
                type="button"
                onPointerDown={(e) => e.preventDefault()}
                onClick={() => {
                  if (editingMessage) { saveEditMessage(); return; }
                  if (stagedImagesCount > 0) sendStagedImages();
                  if (newMessage.trim()) sendMessage();
                }}
              >
                {editingMessage ? <Check className="h-4.5 w-4.5" /> : <Send className="h-4.5 w-4.5" style={{ marginInlineStart: '1px' }} />}
              </motion.button>
            ) : (
              <motion.button
                type="button"
                className="shrink-0 h-10 w-10 rounded-full bg-transparent flex items-center justify-center text-muted-foreground active:bg-accent/30 transition-colors self-end"
                whileTap={{ scale: 1.15 }}
                onClick={startRecording}
              >
                <Mic className="h-5 w-5" />
              </motion.button>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default ChatInput;
