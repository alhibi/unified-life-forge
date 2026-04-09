import React from 'react';
import { motion } from 'framer-motion';
import { MessageCircle, Plus } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
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

function renderAvatar(username?: string, avatarUrl?: string | null, size: string = 'h-12 w-12') {
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
      <div className="flex flex-col items-center justify-center h-full text-muted-foreground gap-4 px-8">
        <div className="w-20 h-20 rounded-full bg-primary/5 flex items-center justify-center">
          <MessageCircle className="h-9 w-9 text-primary/30" />
        </div>
        <div className="text-center space-y-1">
          <p className="text-sm font-medium text-foreground/60">{isAr ? 'لا توجد محادثات بعد' : 'Noch keine Gespräche'}</p>
          <p className="text-xs text-muted-foreground/60">{isAr ? 'ابدأ محادثة جديدة مع أصدقائك' : 'Starte ein neues Gespräch'}</p>
        </div>
        <Button variant="outline" size="sm" className="rounded-full mt-1" onClick={onNewChat}>
          <Plus className="w-3.5 h-3.5 me-1.5" />
          {isAr ? 'محادثة جديدة' : 'Neues Gespräch'}
        </Button>
      </div>
    );
  }

  return (
    <>
      {conversations.map((conv, idx) => (
        <motion.button
          key={conv.id}
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: idx * 0.03 }}
          onClick={() => onSelect(conv)}
          className={cn(
            'w-full flex items-center gap-3 px-4 py-3 hover:bg-accent/30 active:bg-accent/50 transition-all text-start',
            (conv.unreadCount ?? 0) > 0 && 'bg-primary/[0.03]'
          )}
        >
          <div className="relative">
            {renderAvatar(conv.otherUsername, conv.otherAvatarUrl, 'h-[50px] w-[50px]')}
            {(conv.unreadCount ?? 0) > 0 && (
              <span className="absolute -top-0.5 -end-0.5 bg-primary text-primary-foreground text-[10px] rounded-full min-w-[18px] h-[18px] flex items-center justify-center px-1 font-bold">
                {conv.unreadCount}
              </span>
            )}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-baseline justify-between gap-2">
              <span className={cn(
                'text-[14.5px] text-foreground truncate',
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
            {conv.lastMessage && (
              <p className={cn(
                'text-[12.5px] truncate mt-0.5 leading-relaxed',
                (conv.unreadCount ?? 0) > 0 ? 'text-foreground/70 font-medium' : 'text-muted-foreground/70'
              )}>
                {conv.lastMessage}
              </p>
            )}
          </div>
        </motion.button>
      ))}
    </>
  );
};

export default ConversationList;
