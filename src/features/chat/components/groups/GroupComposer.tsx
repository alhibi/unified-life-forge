import { AnimatePresence, motion } from 'framer-motion';
import React, { useEffect, useRef, useState } from 'react';

import type { ChatMessage } from '@/lib/chat';
import { Pencil,Reply, Send, Smile, X } from '@/lib/icons';
import { cn } from '@/lib/utils';

import EmojiPicker from '../EmojiPicker';

interface GroupComposerProps {
  text: string;
  onTextChange: (next: string) => void;
  onSend: () => void;
  isSending: boolean;
  enterToSend: boolean;
  replyTo: ChatMessage | null;
  onClearReply: () => void;
  editing: ChatMessage | null;
  onCancelEdit: () => void;
  onTyping: () => void;
  /** When true, composer renders a "channel posting only" notice instead of an input. */
  readOnly?: boolean;
  readOnlyReason?: string;
}

const MAX_HEIGHT = 140;

/**
 * Minimal but solid composer for the new group/channel surface.
 * The legacy ChatInput in src/components/chat is left untouched; this
 * variant strips voice / image attach (Wave-2 territory) so we can ship
 * Wave 1 with a tight code path that never reaches into the old hook.
 */
const GroupComposer: React.FC<GroupComposerProps> = ({ text, onTextChange, onSend, isSending, enterToSend,
  replyTo, onClearReply, editing, onCancelEdit, onTyping, readOnly, readOnlyReason,
}) => {
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);

  const insertEmoji = (emoji: string) => {
    const el = inputRef.current;
    if (!el) {
      onTextChange(text + emoji);
      return;
    }
    const start = el.selectionStart ?? text.length;
    const end = el.selectionEnd ?? text.length;
    const next = text.slice(0, start) + emoji + text.slice(end);
    onTextChange(next);
    requestAnimationFrame(() => {
      el.focus();
      const caret = start + emoji.length;
      el.setSelectionRange(caret, caret);
    });
  };

  // Auto-resize on every change.
  useEffect(() => {
    const el = inputRef.current;
    if (!el) return;
    el.style.height = '0px';
    el.style.height = `${Math.min(Math.max(el.scrollHeight, 40), MAX_HEIGHT)}px`;
  }, [text]);

  const canSend = text.trim().length > 0 && !isSending;

  if (readOnly) {
    return (
      <div className="px-4 py-3 border-t border-border/15 bg-muted/15">
        <p className="text-[12px] text-muted-foreground text-center">
          {readOnlyReason ?? ('لا يمكنك الإرسال هنا')}
        </p>
      </div>
    );
  }

  return (
    <div className="border-t border-border/15 bg-background">
      {/* Reply / edit banner */}
      {(replyTo || editing) && (
        <div className="flex items-start gap-2 px-3 py-2 border-b border-border/10 bg-muted/15">
          <div className={cn(
            'h-9 w-1 rounded-full shrink-0',
            editing ? 'bg-amber-500' : 'bg-primary',
          )} />
          <div className="flex-1 min-w-0">
            <p className="text-[10px] uppercase tracking-wider text-muted-foreground/80 flex items-center gap-1">
              {editing
                ? <><Pencil className="w-3 h-3" />{'تعديل'}</>
                : <><Reply className="w-3 h-3" />{'رد'}</>}
            </p>
            <p className="text-[12px] text-foreground/80 truncate" dir="auto">
              {(editing?.content ?? replyTo?.content ?? '').slice(0, 120)}
            </p>
          </div>
          <button
            type="button"
            onClick={editing ? onCancelEdit : onClearReply}
            className="w-7 h-7 rounded-full flex items-center justify-center active:bg-accent/40 shrink-0 mt-0.5"
            aria-label={'إلغاء'}
          >
            <X className="w-3.5 h-3.5 text-muted-foreground" />
          </button>
        </div>
      )}

      <div className="flex items-end gap-2 px-3 py-2">
        <button
          type="button"
          onClick={() => setShowEmojiPicker(!showEmojiPicker)}
          aria-label={'الرموز التعبيرية'}
          aria-pressed={showEmojiPicker}
          className={cn(
            'w-9 h-9 rounded-full flex items-center justify-center transition-colors shrink-0',
            showEmojiPicker
              ? 'bg-primary/15 text-primary'
              : 'text-muted-foreground hover:text-foreground active:bg-accent/40'
          )}
          tabIndex={-1}
        >
          <Smile className="w-5 h-5" />
        </button>

        <div className="flex-1 min-w-0 bg-muted/30 rounded-2xl">
          <textarea
            ref={inputRef}
            value={text}
            onChange={(e) => { onTextChange(e.target.value); onTyping(); }}
            onFocus={() => {
              if (showEmojiPicker) setShowEmojiPicker(false);
            }}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey && enterToSend) {
                e.preventDefault();
                if (canSend) {
                  onSend();
                  if (showEmojiPicker) setShowEmojiPicker(false);
                }
              }
            }}
            rows={1}
            placeholder={'اكتب رسالة...'}
            className={cn(
              'w-full bg-transparent outline-none resize-none px-4 py-2.5',
              'text-[14px] leading-snug placeholder:text-muted-foreground/40',
              'max-h-[140px]',
            )}
            dir="auto"
          />
        </div>

        <button
          type="button"
          onClick={() => {
            onSend();
            if (showEmojiPicker) setShowEmojiPicker(false);
          }}
          disabled={!canSend}
          className={cn(
            'h-10 w-10 rounded-full flex items-center justify-center transition-all shrink-0',
            'active:scale-90',
            canSend
              ? 'bg-primary text-primary-foreground '
              : 'bg-muted text-muted-foreground/40',
          )}
          aria-label={'إرسال'}
        >
          <Send className="w-4 h-4 -mt-px" />
        </button>
      </div>

      {/* Emoji picker (collapsible) */}
      <AnimatePresence>
        {showEmojiPicker && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden border-t border-border/10"
          >
            <EmojiPicker onPick={insertEmoji} compact />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default GroupComposer;
