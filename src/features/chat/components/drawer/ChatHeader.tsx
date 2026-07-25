import { AnimatePresence, motion } from 'framer-motion';
import React from 'react';

import {
  Bell,
  BellOff,
  Copy,
  CornerDownLeft,
  EyeOff,
  Forward as ForwardIcon,
  Image as ImageIcon,
  MoreVertical,
  Palette as WallpaperIcon,
  Pin,
  PinOff,
  Search,
  Timer,
  TimerOff,
  Trash,
  Trash2,
  X,
} from '@/lib/icons';
import { cn } from '@/lib/utils';

import { formatSelfDestructLabel } from '../chatUtils';
import { MUTE_DURATION_OPTIONS, SELF_DESTRUCT_OPTIONS } from '../constants';
import { EncryptionBadge } from '../EncryptionPanel';
import { TypingDots } from '../MessageBubble';
import type { useChat } from '../useChat';
import { useEncryptionStatus } from '../useEncryptionStatus';
import { renderAvatar } from './chatAvatar';
import { fetchSharedMedia } from './sharedMedia';

interface Props {
  chat: ReturnType<typeof useChat>;
  /** Direction-aware back chevron supplied by the drawer. */
  BackIcon: React.ComponentType<{ className?: string }>;
  /** Unread total across all other conversations, badged on the back button. */
  totalUnread: number;
}

/**
 * Header of an open conversation.
 *
 * Two mutually exclusive modes:
 *   • selection mode — a count plus bulk copy / forward / hide / delete, where
 *     "delete for everyone" appears only if the selection contains messages
 *     this user sent;
 *   • normal mode — back button with an unread badge, the other participant
 *     with live presence and a typing indicator, the ephemeral-message timer,
 *     and the three-dot menu (search, mute with durations, pin, wallpaper,
 *     shared media, disappearing messages, Enter-to-send, delete).
 *
 * Extracted verbatim from ChatDrawer.tsx, where it was a 370-line inline block.
 */
export default function ChatHeader({ chat, BackIcon, totalUnread }: Props) {
  // Lock badge next to the peer's name. Only ever shown when the conversation is
  // genuinely end-to-end encrypted — see useEncryptionStatus.
  const encryption = useEncryptionStatus(chat.user?.id, chat.activeConv?.otherUserId);

  return (
      <div className="z-header h-14 px-3 flex items-center gap-2 app-sticky-header border-b border-border/20 shrink-0">
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

            <EncryptionBadge status={encryption.status} onClick={() => chat.setShowProfilePopup(true)} />

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
                      className="fixed inset-0 z-raised"
                      onClick={() => chat.setShowChatMenu(false)}
                    />
                    <motion.div
                      initial={{ opacity: 0, scale: 0.95, y: -4 }}
                      animate={{ opacity: 1, scale: 1, y: 0 }}
                      exit={{ opacity: 0, scale: 0.95 }}
                      transition={{ duration: 0.15 }}
                      className={cn(
                        'absolute top-full mt-1 bg-card border border-border/30 rounded-xl z-sticky min-w-[200px] overflow-hidden ',
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
                              if (exp == null) return 'إلغاء الكتم';
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
                            void fetchSharedMedia(chat.activeConv.id).then(chat.setSharedMedia);
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
  );
}
