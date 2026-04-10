import React from 'react';
import { motion } from 'framer-motion';
import { MessageCircle, Pencil } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { isEmojiAvatarValue, getAppleEmojiUrl } from '@/utils/emojiAvatar';
import { getDefaultAvatarForUser } from '@/utils/defaultAvatar';
import { formatTime } from './chatUtils';
import type { Conversation } from './types';

interface ConversationListProps {
  conversations: Conversation[];
  isAr: boolean;
  onSelect: (conv: Conversation) => void;
  onNewChat: () => void;
}

function renderAvatar(username?: string, avatarUrl?: string | null, size: string = 'h-[50px] w-[50px]') {
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

const ConversationList: React.FC<ConversationListProps> = ({ conversations, isAr, onSelect, onNewChat }) => {
  if (conversations.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-muted-foreground gap-4 px-8 relative">
        <div className="w-20 h-20 rounded-full bg-primary/5 flex items-center justify-center">
          <MessageCircle className="h-9 w-9 text-primary/30" />
        </div>
        <div className="text-center space-y-1">
          <p className="text-[15px] font-semibold text-foreground/60">
            {isAr ? 'لا توجد محادثات بعد' : 'Noch keine Gespräche'}
          </p>
          <p className="text-[13px] text-muted-foreground/60">
            {isAr ? 'ابدأ محادثة جديدة مع أصدقائك' : 'Starte ein neues Gespräch'}
          </p>
        </div>
        {/* FAB */}
        <motion.button
          onClick={onNewChat}
          className="absolute bottom-6 end-5 w-14 h-14 rounded-full bg-primary text-primary-foreground flex items-center justify-center shadow-lg shadow-primary/25"
          whileTap={{ scale: 0.9 }}
          initial={{ scale: 0, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ type: 'spring', damping: 20, stiffness: 300, delay: 0.2 }}
        >
          <Pencil className="w-5 h-5" />
        </motion.button>
      </div>
    );
  }

  return (
    <div className="relative h-full">
      <div className="divide-y divide-border/10">
        {conversations.map((conv, idx) => (
          <motion.button
            key={conv.id}
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: idx * 0.02, duration: 0.2 }}
            onClick={() => onSelect(conv)}
            className={cn(
              'w-full flex items-center gap-3 px-4 py-3 transition-colors text-start',
              'active:bg-accent/40',
              (conv.unreadCount ?? 0) > 0 && 'bg-primary/[0.02]'
            )}
          >
            <div className="relative shrink-0">
              {renderAvatar(conv.otherUsername, conv.otherAvatarUrl, 'h-[50px] w-[50px]')}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-baseline justify-between gap-2">
                <span className={cn(
                  'text-[15px] text-foreground truncate',
                  (conv.unreadCount ?? 0) > 0 ? 'font-bold' : 'font-semibold'
                )}>
                  {conv.otherDisplayName || conv.otherUsername}
                </span>
                <span className={cn(
                  'text-[11px] shrink-0 tabular-nums',
                  (conv.unreadCount ?? 0) > 0 ? 'text-primary font-semibold' : 'text-muted-foreground/50'
                )}>
                  {conv.lastMessageTime && formatTime(conv.lastMessageTime, isAr)}
                </span>
              </div>
              <div className="flex items-center justify-between gap-2 mt-0.5">
                {conv.lastMessage ? (
                  <p className={cn(
                    'text-[13px] truncate leading-relaxed',
                    (conv.unreadCount ?? 0) > 0 ? 'text-foreground/70 font-medium' : 'text-muted-foreground/60'
                  )}>
                    {conv.lastMessage}
                  </p>
                ) : (
                  <span className="text-[13px] text-muted-foreground/40 italic">
                    {isAr ? 'لا توجد رسائل' : 'Keine Nachrichten'}
                  </span>
                )}
                {(conv.unreadCount ?? 0) > 0 && (
                  <span className="shrink-0 bg-primary text-primary-foreground text-[11px] rounded-full min-w-[20px] h-[20px] flex items-center justify-center px-1.5 font-bold">
                    {conv.unreadCount}
                  </span>
                )}
              </div>
            </div>
          </motion.button>
        ))}
      </div>

      {/* FAB */}
      <motion.button
        onClick={onNewChat}
        className="absolute bottom-6 end-5 w-14 h-14 rounded-full bg-primary text-primary-foreground flex items-center justify-center shadow-lg shadow-primary/25 z-10"
        whileTap={{ scale: 0.9 }}
        initial={{ scale: 0 }}
        animate={{ scale: 1 }}
        transition={{ type: 'spring', damping: 18, stiffness: 300, delay: 0.15 }}
      >
        <Pencil className="w-5 h-5" />
      </motion.button>
    </div>
  );
};

export default ConversationList;
