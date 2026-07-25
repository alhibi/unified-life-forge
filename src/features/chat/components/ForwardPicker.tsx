import React, { useMemo, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Search, X, Send, ChevronRight } from '@/lib/icons';
import { cn } from '@/lib/utils';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { isEmojiAvatarValue, getAppleEmojiUrl } from '@/utils/emojiAvatar';
import { getDefaultAvatarForUser } from '@/utils/defaultAvatar';
import type { Conversation, Message } from './types';
import { getMessagePreview, stripMarkers } from './chatUtils';

interface ForwardPickerProps {
  messages: Message[];
  conversations: Conversation[];
  onClose: () => void;
  onForward: (convId: string) => void;
}

function renderAvatar(username?: string, avatarUrl?: string | null) {
  const isEmoji = avatarUrl ? isEmojiAvatarValue(avatarUrl) : false;
  const hasImage = avatarUrl && avatarUrl.startsWith('http');
  const defaultSrc = getDefaultAvatarForUser(username || '?');
  return (
    <Avatar className="h-11 w-11 shrink-0">
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

/**
 * Modal sheet for selecting a target conversation to forward messages to.
 * Overlays on top of the chat drawer with a blur + slide-up animation.
 */
const ForwardPicker: React.FC<ForwardPickerProps> = ({ messages, conversations, onClose, onForward }) => {
  const [query, setQuery] = useState('');
  const BackIcon = ChevronRight;

  const filtered = useMemo(() => {
    if (!query.trim()) return conversations;
    const q = query.toLowerCase();
    return conversations.filter(c =>
      (c.otherDisplayName || c.otherUsername || '').toLowerCase().includes(q)
    );
  }, [conversations, query]);

  const firstMsg = messages[0];

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
        className="absolute inset-0 z-picker bg-black/60"
        onClick={onClose}
      />
      <motion.div
        initial={{ y: '100%' }} animate={{ y: 0 }} exit={{ y: '100%' }}
        transition={{ type: 'spring', damping: 30, stiffness: 300 }}
        className="absolute inset-x-0 bottom-0 z-picker-above bg-background rounded-t-3xl flex flex-col max-h-[85%] "
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mx-auto w-10 h-1 rounded-full bg-border/40 mt-2 mb-1" />
        <div className="px-4 h-14 flex items-center gap-2 border-b border-border/15">
          <button onClick={onClose} className="w-9 h-9 rounded-full flex items-center justify-center active:bg-accent/40 transition-colors">
            <BackIcon className="w-5 h-5 text-foreground" />
          </button>
          <h2 className="text-[16px] font-semibold">
            {`إعادة توجيه ${messages.length > 1 ? `(${messages.length})` : ''}`}
          </h2>
        </div>

        {/* Message preview */}
        {firstMsg && (
          <div className="px-4 py-2.5 border-b border-border/10 bg-muted/10">
            <p className="text-[11px] text-muted-foreground mb-0.5">
              {'رسالة محوّلة:'}
            </p>
            <p className="text-[13px] text-foreground/80 line-clamp-2" dir="auto">
              {stripMarkers(getMessagePreview(firstMsg))}
              {messages.length > 1 && (
                <span className="text-muted-foreground ms-1">
                  {`و ${messages.length - 1} رسالة أخرى`}
                </span>
              )}
            </p>
          </div>
        )}

        {/* Search */}
        <div className="px-4 py-2 border-b border-border/10">
          <div className="flex items-center bg-muted/30 rounded-full px-3 h-9">
            <Search className="w-4 h-4 text-muted-foreground/50 shrink-0" />
            <input
              type="text"
              value={query}
              onChange={e => setQuery(e.target.value)}
              placeholder={'ابحث عن محادثة...'}
              className="flex-1 bg-transparent text-[14px] outline-none ms-2 placeholder:text-muted-foreground/40"
              dir="auto"
              autoFocus
            />
            {query && (
              <button onClick={() => setQuery('')} className="w-6 h-6 rounded-full flex items-center justify-center active:bg-accent/40">
                <X className="w-3.5 h-3.5 text-muted-foreground" />
              </button>
            )}
          </div>
        </div>

        {/* List */}
        <div className="flex-1 overflow-y-auto">
          {filtered.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-muted-foreground/60 gap-2">
              <Search className="w-8 h-8 opacity-30" />
              <p className="text-[13px]">{'لا نتائج'}</p>
            </div>
          ) : (
            <div className="divide-y divide-border/10">
              {filtered.map(conv => (
                <button
                  key={conv.id}
                  onClick={() => onForward(conv.id)}
                  className={cn(
                    'w-full flex items-center gap-3 px-4 py-2.5 text-start active:bg-accent/40 transition-colors'
                  )}
                >
                  {renderAvatar(conv.otherUsername, conv.otherAvatarUrl)}
                  <div className="flex-1 min-w-0">
                    <p className="text-[14px] font-semibold text-foreground truncate">
                      {conv.otherDisplayName || conv.otherUsername}
                    </p>
                    {conv.otherDisplayName && conv.otherDisplayName !== conv.otherUsername && (
                      <p className="text-[11px] text-muted-foreground truncate">@{conv.otherUsername}</p>
                    )}
                  </div>
                  <div className="w-9 h-9 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                    <Send className="w-4 h-4 text-primary" style={{ marginInlineStart: '1px' }} />
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      </motion.div>
    </AnimatePresence>
  );
};

export default ForwardPicker;
