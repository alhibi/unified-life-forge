import React, { useRef } from 'react';
import { motion, useMotionValue, useTransform, AnimatePresence } from 'framer-motion';
import {
  MessageCircle, Pencil, Pin, BellOff, Archive, CheckCheck,
  Image as ImageIcon, Mic, FileText, ArchiveRestore,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { isEmojiAvatarValue, getAppleEmojiUrl } from '@/utils/emojiAvatar';
import { getDefaultAvatarForUser } from '@/utils/defaultAvatar';
import { formatTime, stripMarkers } from './chatUtils';
import type { Conversation, ConversationFilter } from './types';

interface ConversationListProps {
  conversations: Conversation[];
  isAr: boolean;
  currentUserId: string;
  filter: ConversationFilter;
  onFilterChange: (filter: ConversationFilter) => void;
  totalUnread: number;
  onSelect: (conv: Conversation) => void;
  onNewChat: () => void;
  isPinned: (id: string) => boolean;
  isMuted: (id: string) => boolean;
  isArchived: (id: string) => boolean;
  togglePinned: (id: string) => void;
  toggleMuted: (id: string) => void;
  toggleArchived: (id: string) => void;
  getDraft: (id: string) => string;
  searchQuery?: string;
  /** When true, show skeleton rows instead of empty state during first fetch. */
  isLoading?: boolean;
}

function renderAvatar(username?: string, avatarUrl?: string | null, size: string = 'h-[52px] w-[52px]') {
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
}

// Highlight matched substring in text (plain, no HTML).
function HighlightText({ text, query }: { text: string; query?: string }) {
  if (!query) return <>{text}</>;
  const idx = text.toLowerCase().indexOf(query.toLowerCase());
  if (idx < 0) return <>{text}</>;
  return (
    <>
      {text.slice(0, idx)}
      <mark className="bg-primary/20 text-primary rounded px-0.5">{text.slice(idx, idx + query.length)}</mark>
      {text.slice(idx + query.length)}
    </>
  );
}

// A row that supports a horizontal swipe revealing actions on the end side.
function SwipeRow({
  id, children, onSwipeLeft, onSwipeRight,
}: {
  id: string;
  children: React.ReactNode;
  onSwipeLeft?: () => void;
  onSwipeRight?: () => void;
}) {
  const x = useMotionValue(0);
  const bg = useTransform(x, [-120, -40, 0, 40, 120], [
    'hsl(var(--primary) / 0.18)',
    'hsl(var(--primary) / 0.08)',
    'transparent',
    'hsl(var(--primary) / 0.08)',
    'hsl(var(--primary) / 0.18)',
  ]);
  return (
    <motion.div
      key={id}
      className="relative"
      style={{ background: bg }}
    >
      <motion.div
        style={{ x, touchAction: 'pan-y' }}
        drag="x"
        dragDirectionLock
        dragConstraints={{ left: -160, right: 160 }}
        dragElastic={0.25}
        dragSnapToOrigin
        onDragEnd={(_, info) => {
          if (info.offset.x > 80 && onSwipeRight) onSwipeRight();
          else if (info.offset.x < -80 && onSwipeLeft) onSwipeLeft();
        }}
      >
        {children}
      </motion.div>
    </motion.div>
  );
}

const ConversationList: React.FC<ConversationListProps> = ({
  conversations, isAr, currentUserId, filter, onFilterChange, totalUnread,
  onSelect, onNewChat, isPinned, isMuted, isArchived,
  togglePinned, toggleMuted, toggleArchived, getDraft, searchQuery, isLoading,
}) => {
  const tabs: Array<{ id: ConversationFilter; labelAr: string; labelDe: string }> = [
    { id: 'all',      labelAr: 'الكل',      labelDe: 'Alle' },
    { id: 'unread',   labelAr: 'غير مقروءة', labelDe: 'Ungelesen' },
    { id: 'archived', labelAr: 'المؤرشفة',   labelDe: 'Archiviert' },
  ];

  const hasContent = conversations.length > 0;
  const fabRef = useRef<HTMLButtonElement>(null);

  return (
    <div className="relative h-full flex flex-col">
      {/* Filter tabs */}
      <div className="flex items-center gap-1.5 px-4 py-2 overflow-x-auto scrollbar-none shrink-0">
        {tabs.map(tab => {
          const active = filter === tab.id;
          const showBadge = tab.id === 'unread' && totalUnread > 0;
          return (
            <button
              key={tab.id}
              onClick={() => onFilterChange(tab.id)}
              className={cn(
                'h-8 px-3.5 rounded-full text-[12.5px] font-medium transition-all whitespace-nowrap flex items-center gap-1.5',
                active
                  ? 'bg-primary text-primary-foreground shadow-sm'
                  : 'bg-muted/30 text-muted-foreground active:bg-muted/50'
              )}
            >
              {isAr ? tab.labelAr : tab.labelDe}
              {showBadge && !active && (
                <span className="bg-primary text-primary-foreground text-[10px] font-bold rounded-full min-w-[16px] h-[16px] flex items-center justify-center px-1">
                  {totalUnread}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* Conversations */}
      <div className="flex-1 overflow-y-auto">
        {isLoading ? (
          <div className="divide-y divide-border/10" aria-hidden="true">
            {[0, 1, 2, 3, 4, 5].map(i => (
              <div key={i} className="flex items-center gap-3 px-4 py-3">
                <div className="skeleton h-[52px] w-[52px] rounded-full shrink-0" />
                <div className="flex-1 min-w-0 space-y-2">
                  <div className="flex items-center justify-between gap-2">
                    <div className="skeleton h-3.5 w-24 rounded" />
                    <div className="skeleton h-2.5 w-10 rounded" />
                  </div>
                  <div className="skeleton h-3 w-full max-w-[220px] rounded" />
                </div>
              </div>
            ))}
          </div>
        ) : !hasContent ? (
          <div className="flex flex-col items-center justify-center h-full text-muted-foreground gap-4 px-8">
            <div className="w-20 h-20 rounded-full bg-primary/5 flex items-center justify-center">
              {filter === 'archived'
                ? <Archive className="h-9 w-9 text-primary/30" />
                : <MessageCircle className="h-9 w-9 text-primary/30" />}
            </div>
            <div className="text-center space-y-1">
              <p className="text-[15px] font-semibold text-foreground/60">
                {filter === 'archived'
                  ? (isAr ? 'لا توجد محادثات مؤرشفة' : 'Keine archivierten Chats')
                  : filter === 'unread'
                    ? (isAr ? 'كل شيء تمت قراءته' : 'Alles gelesen')
                    : (isAr ? 'لا توجد محادثات بعد' : 'Noch keine Gespräche')}
              </p>
              <p className="text-[13px] text-muted-foreground/60">
                {isAr ? 'ابدأ محادثة جديدة مع أصدقائك' : 'Starte ein neues Gespräch'}
              </p>
            </div>
          </div>
        ) : (
          <div className="divide-y divide-border/10">
            {conversations.map((conv, idx) => {
              const pinned = isPinned(conv.id);
              const muted = isMuted(conv.id);
              const archived = isArchived(conv.id);
              const draft = getDraft(conv.id);
              const unread = conv.unreadCount ?? 0;

              // Last message preview
              const nameToShow = conv.otherDisplayName || conv.otherUsername || '';
              let previewBody: React.ReactNode = null;
              let previewIcon: React.ReactNode = null;

              if (draft.trim()) {
                previewIcon = null;
                previewBody = (
                  <span className="text-destructive font-medium">
                    {isAr ? 'مسودة: ' : 'Entwurf: '}
                    <span className="text-foreground/70 font-normal">
                      <HighlightText text={stripMarkers(draft.slice(0, 60))} query={searchQuery} />
                    </span>
                  </span>
                );
              } else if (conv.lastMessage) {
                // Media icon
                if (conv.lastMessageType === 'image') previewIcon = <ImageIcon className="w-3.5 h-3.5 text-muted-foreground/70 shrink-0" />;
                else if (conv.lastMessageType === 'voice') previewIcon = <Mic className="w-3.5 h-3.5 text-muted-foreground/70 shrink-0" />;
                else if (conv.lastMessageType === 'file') previewIcon = <FileText className="w-3.5 h-3.5 text-muted-foreground/70 shrink-0" />;

                const body = stripMarkers(conv.lastMessage);
                previewBody = (
                  <>
                    {conv.lastMessageFromMe && !conv.lastMessageDeleted && (
                      <span className="text-muted-foreground/60 shrink-0">
                        {isAr ? 'أنت: ' : 'Du: '}
                      </span>
                    )}
                    <HighlightText text={body} query={searchQuery} />
                  </>
                );
              } else {
                previewBody = (
                  <span className="italic text-muted-foreground/40">
                    {isAr ? 'لا توجد رسائل' : 'Keine Nachrichten'}
                  </span>
                );
              }

              return (
                <SwipeRow
                  key={conv.id}
                  id={conv.id}
                  // Swipe end-wards (left in LTR, right in RTL) → archive/unarchive
                  onSwipeLeft={() => (isAr ? togglePinned(conv.id) : toggleArchived(conv.id))}
                  // Swipe start-wards → pin/unpin (or opposite when RTL)
                  onSwipeRight={() => (isAr ? toggleArchived(conv.id) : togglePinned(conv.id))}
                >
                  <motion.button
                    initial={{ opacity: 0, y: 4 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: Math.min(idx * 0.015, 0.3), duration: 0.2 }}
                    onClick={() => onSelect(conv)}
                    className={cn(
                      'w-full flex items-center gap-3 px-4 py-3 transition-colors text-start bg-background',
                      'active:bg-accent/40',
                      unread > 0 && !muted && 'bg-primary/[0.02]'
                    )}
                  >
                    <div className="relative shrink-0">
                      {renderAvatar(conv.otherUsername, conv.otherAvatarUrl, 'h-[52px] w-[52px]')}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-1.5 min-w-0">
                          {pinned && <Pin className="w-3 h-3 text-muted-foreground/60 shrink-0 rotate-45" />}
                          <span className={cn(
                            'text-[15px] text-foreground truncate',
                            unread > 0 && !muted ? 'font-bold' : 'font-semibold'
                          )}>
                            <HighlightText text={nameToShow} query={searchQuery} />
                          </span>
                          {muted && <BellOff className="w-3 h-3 text-muted-foreground/50 shrink-0" />}
                        </div>
                        <span className={cn(
                          'text-[11px] shrink-0 tabular-nums',
                          unread > 0 && !muted ? 'text-primary font-semibold' : 'text-muted-foreground/50'
                        )}>
                          {conv.lastMessageTime && formatTime(conv.lastMessageTime, isAr)}
                        </span>
                      </div>
                      <div className="flex items-center justify-between gap-2 mt-0.5">
                        <div className={cn(
                          'text-[13px] truncate leading-relaxed flex items-center gap-1.5 min-w-0',
                          unread > 0 && !muted ? 'text-foreground/75 font-medium' : 'text-muted-foreground/65'
                        )}>
                          {/* Own read/delivered ticks (like WhatsApp) */}
                          {conv.lastMessageFromMe && !conv.lastMessageDeleted && !draft && (
                            <CheckCheck className={cn('w-3.5 h-3.5 shrink-0', unread === 0 ? 'text-primary' : 'text-muted-foreground/50')} />
                          )}
                          {previewIcon}
                          <span className="truncate" dir="auto">{previewBody}</span>
                        </div>
                        <div className="flex items-center gap-1 shrink-0">
                          {archived && filter !== 'archived' && <ArchiveRestore className="w-3.5 h-3.5 text-muted-foreground/40" />}
                          {unread > 0 && (
                            <span className={cn(
                              'text-[11px] rounded-full min-w-[20px] h-[20px] flex items-center justify-center px-1.5 font-bold',
                              muted
                                ? 'bg-muted/60 text-muted-foreground'
                                : 'bg-primary text-primary-foreground'
                            )}>
                              {unread > 99 ? '99+' : unread}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  </motion.button>
                </SwipeRow>
              );
            })}
          </div>
        )}
      </div>

      {/* FAB: new chat */}
      <AnimatePresence>
        {filter !== 'archived' && (
          <motion.button
            ref={fabRef}
            onClick={onNewChat}
            className="absolute bottom-6 end-5 w-14 h-14 rounded-full bg-primary text-primary-foreground flex items-center justify-center shadow-lg shadow-primary/25 z-10"
            whileTap={{ scale: 0.9 }}
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0, opacity: 0 }}
            transition={{ type: 'spring', damping: 18, stiffness: 300 }}
          >
            <Pencil className="w-5 h-5" />
          </motion.button>
        )}
      </AnimatePresence>
    </div>
  );
};

export default ConversationList;
