import React from 'react';
import { cn } from '@/lib/utils';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { isEmojiAvatarValue, getAppleEmojiUrl } from '@/utils/emojiAvatar';
import { getDefaultAvatarForUser } from '@/utils/defaultAvatar';
import { MessageTicks, ReactionPill } from '@/components/chat/MessageBubble';
import { renderRichText, formatClockTime } from '@/components/chat/chatUtils';
import type { ChatMember, ChatMessage, ChatReaction } from '@/lib/chat';

interface GroupMessageBubbleProps {
  message: ChatMessage;
  isMine: boolean;
  /** Show the sender header (avatar + name)? Hidden when previous bubble was from same sender. */
  showSenderHeader: boolean;
  /** Member info for the sender (provides avatar + name). */
  sender?: ChatMember | null;
  /** Reactions to render under the bubble. */
  reactions: ChatReaction[];
  myUserId: string;
  /** Long-press menu callback. */
  onLongPress: (msg: ChatMessage, target: HTMLElement) => void;
  /** Toggle a reaction. */
  onToggleReaction: (messageId: string, emoji: string) => void;
  /** Tap a reply preview to scroll to the original message. */
  onJumpToReply?: (replyToId: string) => void;
  /** Resolved replied-to message (for inline preview). */
  replyTarget?: ChatMessage | null;
  /** Retry a failed send. */
  onRetry?: () => void;
}

/**
 * Group/channel-aware bubble. Mirrors the WhatsApp/Telegram styling of the
 * 1-to-1 path but always knows the sender (groups don't display "you" for
 * own messages; the sender header is hidden for own messages instead).
 *
 * Key differences from the legacy MessageBubble:
 *   • Renders the sender's name + avatar above the bubble for "first in
 *     a streak" — Telegram parity for group chats.
 *   • Reactions sit BELOW the bubble (matches WhatsApp); long-press still
 *     opens the action menu (handled by the parent via `onLongPress`).
 *   • Failed-send state shows a tap- button.
 */
const GroupMessageBubble: React.FC<GroupMessageBubbleProps> = ({ message, isMine, showSenderHeader, sender, reactions, myUserId,
  onLongPress, onToggleReaction, onJumpToReply, replyTarget, onRetry,
}) => {
  const ref = React.useRef<HTMLDivElement>(null);
  const longPressRef = React.useRef<ReturnType<typeof setTimeout> | null>(null);

  const startLongPress = (e: React.PointerEvent) => {
    if (longPressRef.current) clearTimeout(longPressRef.current);
    const target = e.currentTarget as HTMLElement;
    longPressRef.current = setTimeout(() => {
      onLongPress(message, target);
    }, 380);
  };
  const cancelLongPress = () => {
    if (longPressRef.current) { clearTimeout(longPressRef.current); longPressRef.current = null; }
  };

  // Group reactions by emoji for compact display.
  // Hook must run unconditionally — kept above any early return.
  const grouped = React.useMemo(() => {
    const map = new Map<string, { count: number; mine: boolean }>();
    for (const r of reactions) {
      const cur = map.get(r.emoji);
      if (cur) {
        cur.count += 1;
        if (r.userId === myUserId) cur.mine = true;
      } else {
        map.set(r.emoji, { count: 1, mine: r.userId === myUserId });
      }
    }
    return Array.from(map, ([emoji, v]) => ({ emoji, ...v }));
  }, [reactions, myUserId]);

  if (message.deleted) {
    return (
      <div className={cn('flex w-full', isMine ? 'justify-end' : 'justify-start')}>
        <div className="rounded-2xl bg-muted/30 text-muted-foreground italic text-[13px] px-3 py-1.5 max-w-[78%]">
          {'🚫 رسالة محذوفة'}
        </div>
      </div>
    );
  }

  const failed = message.status === 'failed';

  return (
    <div className={cn('flex w-full', isMine ? 'justify-end' : 'justify-start')}>
      <div className="flex flex-col items-stretch max-w-[80%] gap-0.5">
        {/* Sender header — only shown for OTHERS, only when streak starts */}
        {!isMine && showSenderHeader && sender && (
          <div className="flex items-center gap-1.5 ms-1 mt-0.5">
            <Avatar className="h-5 w-5">
              {sender.avatarUrl?.startsWith('http')
                ? <AvatarImage src={sender.avatarUrl} className="object-cover" />
                : isEmojiAvatarValue(sender.avatarUrl ?? '')
                  ? <AvatarImage src={getAppleEmojiUrl(sender.avatarUrl ?? '') || ''} className="w-[60%] h-[60%] object-contain m-auto" />
                  : <img src={getDefaultAvatarForUser(sender.username ?? sender.userId)} alt="" className="w-full h-full object-cover" />}
              <AvatarFallback className="bg-muted" />
            </Avatar>
            <span className="text-[11px] font-semibold text-primary truncate max-w-[150px]">
              {sender.displayName || sender.username || sender.userId.slice(0, 6)}
            </span>
            {sender.role !== 'member' && (
              <span className={cn(
                'text-[10px] px-1 py-px rounded-full font-medium',
                sender.role === 'owner'
                  ? 'bg-amber-500/15 text-amber-600 dark:text-amber-400'
                  : 'bg-sky-500/15 text-sky-600 dark:text-sky-400',
              )}>
                {sender.role === 'owner' ? ('مالك') : ('مشرف')}
              </span>
            )}
          </div>
        )}

        <div
          ref={ref}
          onPointerDown={startLongPress}
          onPointerUp={cancelLongPress}
          onPointerLeave={cancelLongPress}
          onPointerCancel={cancelLongPress}
          onContextMenu={(e) => { e.preventDefault(); onLongPress(message, e.currentTarget as HTMLElement); }}
          className={cn(
            'rounded-2xl px-3 py-2 select-none cursor-default',
            isMine
              ? 'bg-primary text-primary-foreground rounded-ee-md'
              : 'bg-card border border-border/15 rounded-es-md',
            failed && 'opacity-70 ring-1 ring-destructive/30',
          )}
        >
          {/* Reply preview */}
          {message.replyToId && (
            <button
              type="button"
              onClick={() => message.replyToId && onJumpToReply?.(message.replyToId)}
              className={cn(
                'w-full block rounded-lg ps-2 py-1 mb-1.5 text-start border-s-2 transition-opacity',
                isMine ? 'border-primary-foreground/50 bg-primary-foreground/10' : 'border-primary/40 bg-muted/25',
                'hover:opacity-80',
              )}
            >
              <p className={cn(
                'text-[10px] font-semibold truncate',
                isMine ? 'text-primary-foreground/85' : 'text-primary',
              )}>
                {replyTarget?.senderId === myUserId
                  ? ('أنت')
                  : ('↵ رد')}
              </p>
              <p className={cn(
                'text-[12px] truncate',
                isMine ? 'text-primary-foreground/75' : 'text-muted-foreground',
              )} dir="auto">
                {replyTarget
                  ? (replyTarget.deleted
                      ? ('🚫 محذوفة')
                      : (replyTarget.content || (replyTarget.kind === 'image' ? '📷' : replyTarget.kind === 'voice' ? '🎤' : '📎')))
                  : ('رسالة قديمة')}
              </p>
            </button>
          )}

          <p
            className="text-[14px] leading-relaxed whitespace-pre-wrap break-words"
            dir="auto"
          >
            {renderRichText(message.content)}
          </p>

          <div className={cn(
            'flex items-center gap-1 justify-end mt-0.5',
            'text-[10px]',
            isMine ? 'text-primary-foreground/70' : 'text-muted-foreground/70',
          )}>
            {message.editedAt && (
              <span className="italic">{'معدّلة'}</span>
            )}
            <span>{formatClockTime(message.createdAt)}</span>
            {isMine && (
              <MessageTicks
                status={message.status}
                read={message.read}
                dimmed
                onRetry={onRetry}
              />
            )}
          </div>
        </div>

        {/* Reactions row */}
        {grouped.length > 0 && (
          <div className={cn(
            'flex flex-wrap gap-1 mt-0.5',
            isMine ? 'justify-end pe-1' : 'justify-start ps-1',
          )}>
            {grouped.map(g => (
              <ReactionPill
                key={g.emoji}
                emoji={g.emoji}
                count={g.count}
                reactedByMe={g.mine}
                onClick={() => onToggleReaction(message.id, g.emoji)}
              />
            ))}
          </div>
        )}

        {/* Failed-send hint (sender side) */}
        {failed && isMine && (
          <p className="text-[10px] text-destructive text-end pe-1 mt-0.5">
            {'تعذّر الإرسال — اضغط للمحاولة'}
          </p>
        )}
      </div>
    </div>
  );
};

export default GroupMessageBubble;
