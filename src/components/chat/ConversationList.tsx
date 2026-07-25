import React, { useMemo, useRef, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, useMotionValue, useTransform, AnimatePresence, LayoutGroup } from 'framer-motion';
import {
  MessageCircle, Pencil, Pin, BellOff, Archive, Check, CheckCheck,
  Image as ImageIcon, Mic, FileText, ArchiveRestore, Users, ChevronRight, ChevronLeft,
  Search, X, Settings, Phone, Video, Star, Trash2, Bell,
} from '@/lib/icons';
import { cn } from '@/lib/utils';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { isEmojiAvatarValue, getAppleEmojiUrl } from '@/utils/emojiAvatar';
import { getDefaultAvatarForUser } from '@/utils/defaultAvatar';
import { useChats } from '@/lib/chat';
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
  /** Map of conversation id → whether the other party is currently typing. */
  typingByConv?: Record<string, boolean>;
  /** Set of user ids currently online (from realtime presence). */
  onlineUserIds?: Set<string>;
  /** Callback when search query changes (for parent-level searching). */
  onSearchChange?: (query: string) => void;
  /** Callback to navigate to chat settings */
  onOpenSettings?: () => void;
  /** Callback to delete a conversation */
  onDelete?: (id: string) => void;
  /** Whether to show the search bar (header integration) */
  showSearchBar?: boolean;
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

// A row that supports a horizontal swipe revealing action indicators.
function SwipeRow({
  id, children, onSwipeLeft, onSwipeRight, leftLabel, rightLabel, isAr,
}: {
  id: string;
  children: React.ReactNode;
  onSwipeLeft?: () => void;
  onSwipeRight?: () => void;
  leftLabel?: string;
  rightLabel?: string;
  isAr?: boolean;
}) {
  const x = useMotionValue(0);
  const leftBg = useTransform(x, [-120, -40, 0], [
    'hsl(var(--primary) / 0.15)',
    'hsl(var(--primary) / 0.06)',
    'transparent',
  ]);
  const rightBg = useTransform(x, [0, 40, 120], [
    'transparent',
    'hsl(var(--primary) / 0.06)',
    'hsl(var(--primary) / 0.15)',
  ]);
  const leftIconOp = useTransform(x, [-100, -50, 0], [1, 0.5, 0]);
  const rightIconOp = useTransform(x, [0, 50, 100], [0, 0.5, 1]);

  return (
    <motion.div
      layout="position"
      key={id}
      className="relative overflow-hidden"
      transition={{ layout: { type: 'spring', damping: 30, stiffness: 350 } }}
    >
      {/* Swipe reveal indicators */}
      <motion.div
        className="absolute inset-y-0 end-0 flex items-center pe-4 pointer-events-none"
        style={{ opacity: leftIconOp }}
      >
        <div className="flex items-center gap-1.5 text-primary">
          <Archive className="w-4 h-4" />
          <span className="text-[11px] font-medium">{leftLabel}</span>
        </div>
      </motion.div>
      <motion.div
        className="absolute inset-y-0 start-0 flex items-center ps-4 pointer-events-none"
        style={{ opacity: rightIconOp }}
      >
        <div className="flex items-center gap-1.5 text-primary">
          <Pin className="w-4 h-4" />
          <span className="text-[11px] font-medium">{rightLabel}</span>
        </div>
      </motion.div>

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

function TypingDotsMini() {
  return (
    <span className="inline-flex items-center gap-[2px]" aria-hidden>
      {[0, 1, 2].map(i => (
        <motion.span
          key={i}
          className="w-[3px] h-[3px] rounded-full bg-primary"
          animate={{ opacity: [0.3, 1, 0.3], y: [0, -1.5, 0] }}
          transition={{ duration: 0.8, repeat: Infinity, delay: i * 0.15 }}
        />
      ))}
    </span>
  );
}

const ConversationList: React.FC<ConversationListProps> = ({
  conversations, isAr, currentUserId, filter, onFilterChange, totalUnread,
  onSelect, onNewChat, isPinned, isMuted, isArchived,
  togglePinned, toggleMuted, toggleArchived, getDraft, searchQuery, isLoading,
  typingByConv, onlineUserIds, onSearchChange, onOpenSettings, onDelete, showSearchBar,
}) => {
  const tabs: Array<{ id: ConversationFilter; labelAr: string; icon?: React.ReactNode }> = [
    { id: 'all',      labelAr: 'الكل', },
    { id: 'unread',   labelAr: 'غير مقروءة', },
    { id: 'archived', labelAr: 'المؤرشفة', },
  ];

  const [localSearch, setLocalSearch] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const searchInputRef = useRef<HTMLInputElement>(null);

  const hasContent = conversations.length > 0;
  const fabRef = useRef<HTMLButtonElement>(null);
  const navigate = useNavigate();

  const { chats } = useChats();
  const groupsCount = chats.filter(c => c.kind !== 'dm').length;

  // Sort conversations: pinned first, then by time
  const sortedConversations = useMemo(() => {
    const pinned = conversations.filter(c => isPinned(c.id));
    const unpinned = conversations.filter(c => !isPinned(c.id));
    return [...pinned, ...unpinned];
  }, [conversations, isPinned]);

  // Local search filtering
  const filteredConversations = useMemo(() => {
    if (!localSearch.trim()) return sortedConversations;
    const q = localSearch.toLowerCase();
    return sortedConversations.filter(c => {
      const name = (c.otherDisplayName || c.otherUsername || '').toLowerCase();
      const msg = (c.lastMessage || '').toLowerCase();
      return name.includes(q) || msg.includes(q);
    });
  }, [sortedConversations, localSearch]);

  const handleSearchToggle = useCallback(() => {
    setIsSearching(prev => {
      if (!prev) {
        setTimeout(() => searchInputRef.current?.focus(), 100);
      } else {
        setLocalSearch('');
        onSearchChange?.('');
      }
      return !prev;
    });
  }, [onSearchChange]);

  const effectiveSearchQuery = localSearch || searchQuery;

  return (
    <div className="relative h-full flex flex-col">
      {/* Search bar (expandable) */}
      <AnimatePresence>
        {isSearching && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ type: 'spring', damping: 25, stiffness: 350 }}
            className="overflow-hidden shrink-0"
          >
            <div className="px-3 pt-2 pb-1">
              <div className="flex items-center gap-2 bg-muted/20 border border-border/20 rounded-xl px-3 h-10 focus-within:border-primary/30 transition-colors">
                <Search className="w-4 h-4 text-muted-foreground/60 shrink-0" />
                <input
                  ref={searchInputRef}
                  type="text"
                  value={localSearch}
                  onChange={e => {
                    setLocalSearch(e.target.value);
                    onSearchChange?.(e.target.value);
                  }}
                  placeholder={'بحث في المحادثات...'}
                  className="flex-1 bg-transparent text-[14px] text-foreground placeholder:text-muted-foreground/50 outline-none"
                  dir="auto"
                />
                {localSearch && (
                  <motion.button
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    type="button"
                    onClick={() => { setLocalSearch(''); onSearchChange?.(''); }}
                    className="w-5 h-5 rounded-full bg-muted/40 flex items-center justify-center"
                  >
                    <X className="w-3 h-3 text-muted-foreground" />
                  </motion.button>
                )}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Filter tabs + actions row */}
      <div className="flex items-center gap-1.5 px-3 py-2 overflow-x-auto scrollbar-none shrink-0">
        <div className="flex items-center gap-1.5 flex-1 overflow-x-auto scrollbar-none">
          {tabs.map(tab => {
            const active = filter === tab.id;
            const showBadge = tab.id === 'unread' && totalUnread > 0;
            return (
              <motion.button
                key={tab.id}
                onClick={() => onFilterChange(tab.id)}
                className={cn(
                  'h-8 px-3.5 rounded-full text-[12.5px] font-medium whitespace-nowrap flex items-center gap-1.5 transition-all',
                  active
                    ? 'bg-primary text-primary-foreground '
                    : 'bg-muted/30 text-muted-foreground active:bg-muted/50'
                )}
                whileTap={{ scale: 0.95 }}
              >
                {tab.labelAr}
                {showBadge && !active && (
                  <motion.span
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    className="bg-primary text-primary-foreground text-[10px] font-bold rounded-full min-w-[16px] h-[16px] flex items-center justify-center px-1"
                  >
                    {totalUnread > 99 ? '99+' : totalUnread}
                  </motion.span>
                )}
              </motion.button>
            );
          })}
        </div>

        {/* Action buttons */}
        <div className="flex items-center gap-0.5 shrink-0">
          <button
            type="button"
            onClick={handleSearchToggle}
            className={cn(
              'w-8 h-8 rounded-full flex items-center justify-center transition-colors',
              isSearching ? 'bg-primary/15 text-primary' : 'text-muted-foreground active:bg-muted/40'
            )}
            aria-label={'بحث'}
          >
            <Search className="w-4 h-4" />
          </button>
          {onOpenSettings && (
            <button
              type="button"
              onClick={onOpenSettings}
              className="w-8 h-8 rounded-full flex items-center justify-center text-muted-foreground active:bg-muted/40 transition-colors"
              aria-label={'الإعدادات'}
            >
              <Settings className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      {/* Groups & channels entry-point */}
      <motion.button
        type="button"
        onClick={() => navigate('/chat/groups')}
        className="flex items-center gap-3 px-4 py-2.5 mx-3 mb-1 rounded-2xl bg-muted/15 hover:bg-muted/25 active:bg-muted/35 border border-border/15 transition-colors text-start"
        whileTap={{ scale: 0.98 }}
      >
        <div className="h-9 w-9 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
          <Users className="w-4 h-4 text-primary" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-[13.5px] font-semibold text-foreground">
            {'المجموعات والقنوات'}
          </p>
          <p className="text-[11px] text-muted-foreground">
            {groupsCount > 0
              ? (`${groupsCount} ${groupsCount === 1 ? 'محادثة' : 'محادثات'}`)
              : ('إنشاء مجموعة جديدة')}
          </p>
        </div>
        {<ChevronLeft className="w-4 h-4 text-muted-foreground shrink-0" />}
      </motion.button>

      {/* Conversations */}
      <div className="flex-1 overflow-y-auto overscroll-contain">
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
        ) : !hasContent && !localSearch ? (
          <div className="flex flex-col items-center justify-center h-full text-muted-foreground gap-4 px-8">
            <motion.div
              className="w-20 h-20 rounded-full bg-primary/5 flex items-center justify-center"
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ type: 'spring', damping: 15 }}
            >
              {filter === 'archived'
                ? <Archive className="h-9 w-9 text-primary/30" />
                : <MessageCircle className="h-9 w-9 text-primary/30" />}
            </motion.div>
            <div className="text-center space-y-1">
              <p className="text-[15px] font-semibold text-foreground/60">
                {filter === 'archived'
                  ? ('لا توجد محادثات مؤرشفة')
                  : filter === 'unread'
                    ? ('كل شيء تمت قراءته')
                    : ('لا توجد محادثات بعد')}
              </p>
              <p className="text-[13px] text-muted-foreground/60">
                {'ابدأ محادثة جديدة مع أصدقائك'}
              </p>
            </div>
          </div>
        ) : filteredConversations.length === 0 && localSearch ? (
          <div className="flex flex-col items-center justify-center py-16 text-muted-foreground gap-3 px-8">
            <Search className="h-10 w-10 text-muted-foreground/20" />
            <p className="text-[14px] text-center text-muted-foreground/60">
              {`لا توجد نتائج لـ "${localSearch}"`}
            </p>
          </div>
        ) : (
          <LayoutGroup>
            <div className="divide-y divide-border/10">
              {/* Pinned section header */}
              {filteredConversations.some(c => isPinned(c.id)) && (
                <div className="px-4 py-1.5">
                  <span className="text-[11px] font-medium text-muted-foreground/60 uppercase tracking-wider">
                    {'المثبتة'}
                  </span>
                </div>
              )}
              {filteredConversations.map((conv, idx) => {
              const pinned = isPinned(conv.id);
              const muted = isMuted(conv.id);
              const archived = isArchived(conv.id);
              const draft = getDraft(conv.id);
              const unread = conv.unreadCount ?? 0;

              // Show divider between pinned and unpinned
              const isPrevPinned = idx > 0 && isPinned(filteredConversations[idx - 1].id);
              const showUnpinnedHeader = !pinned && isPrevPinned;

              const nameToShow = conv.otherDisplayName || conv.otherUsername || '';
              let previewBody: React.ReactNode = null;
              let previewIcon: React.ReactNode = null;

              const otherTyping = !!typingByConv?.[conv.id];

              if (otherTyping) {
                previewIcon = null;
                previewBody = (
                  <span className="text-primary font-medium flex items-center gap-1">
                    {'يكتب'}
                    <TypingDotsMini />
                  </span>
                );
              } else if (draft.trim()) {
                previewIcon = null;
                previewBody = (
                  <span className="text-destructive font-medium">
                    {'مسودة: '}
                    <span className="text-foreground/70 font-normal">
                      <HighlightText text={stripMarkers(draft.slice(0, 60))} query={effectiveSearchQuery} />
                    </span>
                  </span>
                );
              } else if (conv.lastMessage) {
                if (conv.lastMessageType === 'image') previewIcon = <ImageIcon className="w-3.5 h-3.5 text-muted-foreground/70 shrink-0" />;
                else if (conv.lastMessageType === 'voice') previewIcon = <Mic className="w-3.5 h-3.5 text-muted-foreground/70 shrink-0" />;
                else if (conv.lastMessageType === 'file') previewIcon = <FileText className="w-3.5 h-3.5 text-muted-foreground/70 shrink-0" />;

                const body = stripMarkers(conv.lastMessage);
                previewBody = (
                  <>
                    {conv.lastMessageFromMe && !conv.lastMessageDeleted && (
                      <span className="text-muted-foreground/60 shrink-0">
                        {'أنت: '}
                      </span>
                    )}
                    <HighlightText text={body} query={effectiveSearchQuery} />
                  </>
                );
              } else {
                previewBody = (
                  <span className="italic text-muted-foreground/40">
                    {'لا توجد رسائل'}
                  </span>
                );
              }

              return (
                <React.Fragment key={conv.id}>
                  {showUnpinnedHeader && (
                    <div className="px-4 py-1.5">
                      <span className="text-[11px] font-medium text-muted-foreground/60 uppercase tracking-wider">
                        {'المحادثات'}
                      </span>
                    </div>
                  )}
                  <SwipeRow
                    id={conv.id}
                    onSwipeLeft={() => (togglePinned(conv.id))}
                    onSwipeRight={() => (toggleArchived(conv.id))}
                    leftLabel={(pinned ? 'إلغاء التثبيت' : 'تثبيت')}
                    rightLabel={(archived ? 'إلغاء الأرشفة' : 'أرشفة')}
                    isAr={isAr}
                  >
                    <motion.button
                      initial={{ opacity: 0, y: 4 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: Math.min(idx * 0.015, 0.3), duration: 0.2 }}
                      onClick={() => onSelect(conv)}
                      className={cn(
                        'w-full flex items-center gap-3 px-4 py-3 transition-colors text-start bg-background',
                        'active:bg-accent/40',
                        unread > 0 && !muted && 'bg-primary/[0.02]',
                        pinned && 'bg-muted/[0.04]'
                      )}
                    >
                      <div className="relative shrink-0">
                        {renderAvatar(conv.otherUsername, conv.otherAvatarUrl, 'h-[52px] w-[52px]')}
                        {conv.otherUserId && onlineUserIds?.has(conv.otherUserId) && (
                          <motion.span
                            initial={{ scale: 0 }}
                            animate={{ scale: 1 }}
                            aria-label={'متصل الآن'}
                            className="absolute bottom-0 end-0 block h-3 w-3 rounded-full bg-green-500 ring-2 ring-background"
                          />
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-2">
                          <div className="flex items-center gap-1.5 min-w-0">
                            {pinned && <Pin className="w-3 h-3 text-primary/60 shrink-0 rotate-45" />}
                            <span className={cn(
                              'text-[15px] text-foreground truncate',
                              unread > 0 && !muted ? 'font-bold' : 'font-semibold'
                            )}>
                              <HighlightText text={nameToShow} query={effectiveSearchQuery} />
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
                            {conv.lastMessageFromMe && !conv.lastMessageDeleted && !draft && !otherTyping && (
                              conv.lastMessageRead
                                ? <CheckCheck className="w-3.5 h-3.5 shrink-0 text-primary" />
                                : conv.lastMessageDelivered
                                  ? <CheckCheck className="w-3.5 h-3.5 shrink-0 text-muted-foreground/55" />
                                  : <Check className="w-3.5 h-3.5 shrink-0 text-muted-foreground/55" />
                            )}
                            {previewIcon}
                            <span className="truncate" dir="auto">{previewBody}</span>
                          </div>
                          <div className="flex items-center gap-1 shrink-0">
                            {archived && filter !== 'archived' && <ArchiveRestore className="w-3.5 h-3.5 text-muted-foreground/40" />}
                            {unread > 0 && (
                              <motion.span
                                initial={{ scale: 0 }}
                                animate={{ scale: 1 }}
                                transition={{ type: 'spring', damping: 12 }}
                                className={cn(
                                  'text-[11px] rounded-full min-w-[20px] h-[20px] flex items-center justify-center px-1.5 font-bold',
                                  muted
                                    ? 'bg-muted/60 text-muted-foreground'
                                    : 'bg-primary text-primary-foreground'
                                )}
                              >
                                {unread > 99 ? '99+' : unread}
                              </motion.span>
                            )}
                          </div>
                        </div>
                      </div>
                    </motion.button>
                  </SwipeRow>
                </React.Fragment>
              );
            })}
            </div>
          </LayoutGroup>
        )}
      </div>

      {/* FAB: new chat */}
      <AnimatePresence>
        {filter !== 'archived' && (
          <motion.button
            ref={fabRef}
            onClick={onNewChat}
            className="absolute bottom-6 end-5 w-14 h-14 rounded-full bg-primary text-primary-foreground flex items-center justify-center z-10"
            
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
