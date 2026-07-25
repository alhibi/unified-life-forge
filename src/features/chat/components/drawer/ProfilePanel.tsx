import { AnimatePresence, motion } from 'framer-motion';
import React from 'react';

import { readableFileName } from '@/lib/chat/imageMeta';
import {
  Archive,
  ArchiveRestore,
  Bell,
  BellOff,
  Calendar,
  ChevronRight,
  EyeOff,
  FileText,
  Image as ImageIcon,
  Palette as WallpaperIcon,
  Pin,
  Trash,
  User2,
} from '@/lib/icons';
import { cn } from '@/lib/utils';

import ChatImage from '../ChatImage';
import EncryptionPanel from '../EncryptionPanel';
import type { useChat } from '../useChat';
import { useEncryptionStatus } from '../useEncryptionStatus';
import { renderAvatar } from './chatAvatar';
import { fetchSharedMedia } from './sharedMedia';

interface Props {
  chat: ReturnType<typeof useChat>;
  /** Localised name of the wallpaper currently applied to this conversation. */
  wallpaperLabel: string;
  /** Direction-aware back chevron supplied by the drawer. */
  BackIcon: React.ComponentType<{ className?: string }>;
  onRequestDeleteConversation: () => void;
}

/**
 * Full-screen profile panel for the active direct conversation: identity,
 * presence, quick mute/pin/archive pills, an info tab with counters and a
 * media tab with the shared images and files.
 *
 * Extracted verbatim from ChatDrawer.tsx, where it was a 286-line JSX block
 * inside a 3,000-line component.
 */
export default function ProfilePanel({
  chat,
  wallpaperLabel,
  BackIcon,
  onRequestDeleteConversation,
}: Props) {
  const encryption = useEncryptionStatus(chat.user?.id, chat.activeConv?.otherUserId);

  return (
    <AnimatePresence>
      {chat.showProfilePopup && chat.activeConv && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="absolute inset-0 z-drawer bg-background flex flex-col"
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
            <h2 className="text-[1rem] font-semibold">{'الملف الشخصي'}</h2>
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
                <p className="text-[0.8125rem] text-muted-foreground">
                  @{chat.activeConv.otherUsername}
                </p>
              )}
            <p
              className={cn(
                'text-[0.75rem] mt-1 font-medium',
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
              <span className="text-[0.625rem] font-medium">
                {chat.chatPrefs.isMuted(chat.activeConv.id) ? 'مكتوم' : 'كتم'}
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
                className={cn('w-4 h-4', chat.chatPrefs.isPinned(chat.activeConv.id) && 'rotate-45')}
              />
              <span className="text-[0.625rem] font-medium">
                {chat.chatPrefs.isPinned(chat.activeConv.id) ? 'مثبّتة' : 'تثبيت'}
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
              <span className="text-[0.625rem] font-medium">
                {chat.chatPrefs.isArchived(chat.activeConv.id) ? 'إلغاء الأرشفة' : 'أرشفة'}
              </span>
            </button>
          </div>

          <div className="flex mx-4 bg-muted/30 rounded-xl p-1 gap-1">
            <button
              onClick={() => chat.setProfileTab('info')}
              className={cn(
                'flex-1 py-2 rounded-lg text-[0.8125rem] font-medium transition-all',
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
                  void fetchSharedMedia(chat.activeConv.id).then(chat.setSharedMedia);
                }
              }}
              className={cn(
                'flex-1 py-2 rounded-lg text-[0.8125rem] font-medium transition-all',
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
                {/* Encryption state, safety number and key-change warning. */}
                <div className="bg-card border border-border/20 rounded-2xl p-4">
                  <EncryptionPanel
                    bare
                    status={encryption}
                    peerName={
                      chat.activeConv?.otherDisplayName || chat.activeConv?.otherUsername || 'الطرف الآخر'
                    }
                  />
                </div>
                <div className="bg-card border border-border/20 rounded-2xl p-4">
                  <div className="grid grid-cols-3 gap-3 text-center">
                    <div>
                      <p className="text-xl font-bold text-foreground">{chat.messages.length}</p>
                      <p className="text-[0.625rem] text-muted-foreground">{'رسالة'}</p>
                    </div>
                    <div>
                      <p className="text-xl font-bold text-foreground">
                        {chat.messages.filter((m) => m.message_type === 'image').length}
                      </p>
                      <p className="text-[0.625rem] text-muted-foreground">{'صورة'}</p>
                    </div>
                    <div>
                      <p className="text-xl font-bold text-foreground">
                        {chat.messages.filter((m) => m.message_type === 'voice').length}
                      </p>
                      <p className="text-[0.625rem] text-muted-foreground">{'صوتية'}</p>
                    </div>
                  </div>
                </div>
                <div className="bg-card border border-border/20 rounded-2xl divide-y divide-border/10">
                  <div className="flex items-center gap-3 p-3.5">
                    <User2 className="w-4 h-4 text-muted-foreground shrink-0" />
                    <div className="min-w-0">
                      <p className="text-[0.6875rem] text-muted-foreground">{'النبذة'}</p>
                      <p className="text-[0.8125rem] text-foreground font-medium">
                        {chat.activeConv.otherBio || 'لا توجد نبذة'}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 p-3.5">
                    <Calendar className="w-4 h-4 text-muted-foreground shrink-0" />
                    <div className="min-w-0">
                      <p className="text-[0.6875rem] text-muted-foreground">{'تاريخ الانضمام'}</p>
                      <p className="text-[0.8125rem] text-foreground font-medium">
                        {chat.activeConv.otherCreatedAt
                          ? new Date(chat.activeConv.otherCreatedAt).toLocaleDateString('ar', {
                              day: 'numeric',
                              month: 'long',
                              year: 'numeric',
                            })
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
                      <p className="text-[0.6875rem] text-muted-foreground">{'الخلفية'}</p>
                      <p className="text-[0.8125rem] text-foreground font-medium">{wallpaperLabel}</p>
                    </div>
                    <ChevronRight className={cn('w-4 h-4 text-muted-foreground/50', 'rotate-180')} />
                  </button>
                </div>
                <button
                  onClick={() => chat.chatPrefs.toggleBlocked(chat.activeConv!.id)}
                  className={cn(
                    'w-full flex items-center justify-center gap-2 py-3 rounded-2xl text-[0.8125rem] font-medium transition-colors active:scale-[0.98]',
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
                  onClick={onRequestDeleteConversation}
                  className="w-full flex items-center justify-center gap-2 py-3 rounded-2xl bg-destructive/10 text-destructive text-[0.8125rem] font-medium active:bg-destructive/20 transition-colors"
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
                    <p className="text-sm">{'لا توجد وسائط مشتركة'}</p>
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
                          <span className="text-[0.625rem] text-muted-foreground truncate w-full text-center">
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
  );
}
