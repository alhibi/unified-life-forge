import { AnimatePresence, motion } from 'framer-motion';
import React from 'react';

import { readableFileName, unpackFileName } from '@/lib/chat/imageMeta';
import {
  Calendar,
  Check,
  ChevronDown,
  Copy,
  EyeOff,
  Pencil,
  Pin,
  PinOff,
  Reply,
  Share2,
  Trash2,
} from '@/lib/icons';
import { cn } from '@/lib/utils';

import ChatImage from '../ChatImage';
import { formatClockTime, renderRichText, stripMarkers } from '../chatUtils';
import { QUICK_EMOJIS } from '../constants';
import EmojiPicker from '../EmojiPicker';
import { MessageTicks } from '../MessageBubble';
import type { ActionMenuState, Message } from '../types';
import type { useChat } from '../useChat';
import { getBubbleRadius } from './bubbleRadius';

interface Props {
  /** Null closes the menu; the component renders its own AnimatePresence. */
  actionMenu: ActionMenuState | null;
  chat: ReturnType<typeof useChat>;
  /** Dismisses the menu and collapses the extra-emoji tray. */
  onClose: () => void;
  /**
   * Dismisses the menu but leaves the extra-emoji tray state alone. The pin
   * action behaved this way before the extraction and the difference is
   * preserved rather than normalised.
   */
  onCloseKeepingEmojiTray: () => void;
  onShowMessageInfo: (msg: Message) => void;
}

/**
 * Context menu for a single message: a preview of the bubble, a quick-reaction
 * row with an expandable picker, and the action list (reply, forward, copy,
 * edit, pin, select, info, hide for me, delete for everyone).
 *
 * Extracted verbatim from ChatDrawer.tsx, where it was a 325-line inline IIFE.
 * The positioning maths is unchanged: the menu flips above the bubble when
 * there are more than 180px of room, is clamped to a 12px viewport gutter, and
 * is anchored to the bubble's trailing edge for outgoing messages.
 */
export default function MessageActionMenu({
  actionMenu,
  chat,
  onClose,
  onCloseKeepingEmojiTray,
  onShowMessageInfo,
}: Props) {
  return (
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
                className="app-scrim z-sheet"
                onClick={onClose}
              />
              <div className="fixed inset-0 z-sheet-above pointer-events-none" onClick={onClose}>
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
                      'text-meta overflow-hidden',
                      actionMenu.isMine
                        ? 'bg-primary/15 text-foreground'
                        : 'bg-card border border-border/15 text-foreground',
                    )}
                    style={getBubbleRadius(actionMenu.isMine, false, false) as React.CSSProperties}
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
                            'absolute bottom-[6px] flex items-center gap-[3px] text-micro whitespace-nowrap text-muted-foreground/50',
                            'left-2.5',
                          )}
                        >
                          {formatClockTime(actionMenu.msg.created_at)}
                          {actionMenu.isMine && (
                            <MessageTicks
                              status={actionMenu.msg.status}
                              read={actionMenu.msg.read}
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
                    <div className="flex items-center justify-center gap-1 px-3 py-2" dir="ltr">
                      {QUICK_EMOJIS.map((emoji) => (
                        <button
                          key={emoji}
                          onClick={() => {
                            chat.toggleReaction(actionMenu.msg.id, emoji);
                            onClose();
                          }}
                          className="text-display active:scale-125 transition-transform px-[2px]"
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
                              compact
                              onPick={(emoji) => {
                                chat.toggleReaction(actionMenu.msg.id, emoji);
                                onClose();
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
                          onClose();
                          chat.inputRef.current?.focus();
                        }}
                        className="w-full flex items-center gap-3 px-4 py-2 active:bg-accent/30 transition-colors text-start"
                      >
                        <Reply className="w-4 h-4 text-muted-foreground" />
                        <span className="text-mini">{'رد'}</span>
                      </button>
                      <button
                        onClick={() => {
                          chat.startForward([actionMenu.msg]);
                          onClose();
                        }}
                        className="w-full flex items-center gap-3 px-4 py-2 active:bg-accent/30 transition-colors text-start"
                      >
                        <Share2 className="w-4 h-4 text-muted-foreground" />
                        <span className="text-mini">{'توجيه'}</span>
                      </button>
                      {actionMenu.msg.message_type === 'text' && actionMenu.msg.content && (
                        <button
                          onClick={() => {
                            chat.copyMessage(stripMarkers(actionMenu.msg.content));
                            onClose();
                          }}
                          className="w-full flex items-center gap-3 px-4 py-2 active:bg-accent/30 transition-colors text-start"
                        >
                          <Copy className="w-4 h-4 text-muted-foreground" />
                          <span className="text-mini">{'نسخ النص'}</span>
                        </button>
                      )}
                      {actionMenu.isMine &&
                        actionMenu.msg.message_type === 'text' &&
                        !actionMenu.msg.deleted && (
                          <button
                            onClick={() => {
                              chat.startEditMessage(actionMenu.msg);
                              onClose();
                            }}
                            className="w-full flex items-center gap-3 px-4 py-2 active:bg-accent/30 transition-colors text-start"
                          >
                            <Pencil className="w-4 h-4 text-muted-foreground" />
                            <span className="text-mini">{'تعديل'}</span>
                          </button>
                        )}
                      <button
                        onClick={() => {
                          chat.pinMessage(actionMenu.msg);
                          onCloseKeepingEmojiTray();
                        }}
                        className="w-full flex items-center gap-3 px-4 py-2 active:bg-accent/30 transition-colors text-start"
                      >
                        {chat.pinnedMessage?.id === actionMenu.msg.id ? (
                          <PinOff className="w-4 h-4 text-muted-foreground" />
                        ) : (
                          <Pin className="w-4 h-4 text-muted-foreground" />
                        )}
                        <span className="text-mini">
                          {chat.pinnedMessage?.id === actionMenu.msg.id ? 'إلغاء التثبيت' : 'تثبيت'}
                        </span>
                      </button>
                      <button
                        onClick={() => {
                          chat.toggleSelect(actionMenu.msg.id);
                          onClose();
                        }}
                        className="w-full flex items-center gap-3 px-4 py-2 active:bg-accent/30 transition-colors text-start"
                      >
                        <Check className="w-4 h-4 text-muted-foreground" />
                        <span className="text-mini">{'تحديد'}</span>
                      </button>
                      {/* Info — only meaningful for messages I sent (delivery/read receipts). */}
                      {actionMenu.isMine && !actionMenu.msg.deleted && (
                        <button
                          onClick={() => {
                            onShowMessageInfo(actionMenu.msg);
                            onClose();
                          }}
                          className="w-full flex items-center gap-3 px-4 py-2 active:bg-accent/30 transition-colors text-start"
                        >
                          <Calendar className="w-4 h-4 text-muted-foreground" />
                          <span className="text-mini">{'معلومات الرسالة'}</span>
                        </button>
                      )}
                      {/* Delete for me — works for any non-deleted message regardless of sender. */}
                      {!actionMenu.msg.deleted && (
                        <button
                          onClick={() => {
                            chat.hideMessageForSelf(actionMenu.msg.id);
                            onClose();
                          }}
                          className="w-full flex items-center gap-3 px-4 py-2 active:bg-accent/30 transition-colors text-start"
                        >
                          <EyeOff className="w-4 h-4 text-muted-foreground" />
                          <span className="text-mini">{'حذف لي فقط'}</span>
                        </button>
                      )}
                      {actionMenu.isMine && !actionMenu.msg.deleted && (
                        <>
                          <div className="h-px bg-border/15 mx-3" />
                          <button
                            onClick={() => {
                              chat.deleteMessage(actionMenu.msg.id);
                              onClose();
                            }}
                            className="w-full flex items-center gap-3 px-4 py-2 active:bg-destructive/10 transition-colors text-start"
                          >
                            <Trash2 className="w-4 h-4 text-destructive" />
                            <span className="text-mini text-destructive">{'حذف للجميع'}</span>
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
  );
}
