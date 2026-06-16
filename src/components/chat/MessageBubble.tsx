import React, { useCallback, useRef, useState } from 'react';
import { motion, useMotionValue, useTransform, AnimatePresence } from 'framer-motion';
import {
  Reply, Check, CheckCheck, Clock, AlertCircle, RotateCw,
  Star, Pin, Bookmark, Heart, ThumbsUp, Sparkles,
} from '@/lib/icons';
import { cn } from '@/lib/utils';
import type { Message, MessageStatus } from './types';

// ─────────────────────────────────────────────────────────────────────────────
// SwipeableMessage: drag-to-reply wrapper. Drags in the "reply" direction only
// (start-edge on LTR, end-edge on RTL) and crosses a 50px threshold to trigger.
// ─────────────────────────────────────────────────────────────────────────────
interface SwipeableMessageProps {
  children: React.ReactNode;
  isMine: boolean;
  deleted: boolean;
  disabled?: boolean;
  onSwipeReply: () => void;
}

export function SwipeableMessage({ children, isMine, deleted, disabled, onSwipeReply }: SwipeableMessageProps) {
  const x = useMotionValue(0);
  const replyIconOpacity = useTransform(x, [0, 30, 50], [0, 0.5, 1]);
  const replyIconScale   = useTransform(x, [0, 30, 50], [0.5, 0.8, 1]);

  return (
    <div className="relative overflow-visible w-full">
      <motion.div
        className="absolute top-1/2 -translate-y-1/2 start-0 pointer-events-none z-0"
        style={{ opacity: replyIconOpacity, scale: replyIconScale }}
      >
        <div className="w-8 h-8 rounded-full bg-primary/15 flex items-center justify-center backdrop-blur-sm">
          <Reply className="w-4 h-4 text-primary" />
        </div>
      </motion.div>
      <motion.div
        className={cn('relative z-10 flex', isMine ? 'justify-end' : 'justify-start')}
        style={{ x, touchAction: 'pan-y' }}
        drag={disabled || deleted ? false : 'x'}
        dragDirectionLock
        dragConstraints={{ left: 0, right: 0 }}
        dragElastic={{ left: 0, right: 0.4 }}
        dragSnapToOrigin
        onDrag={(_, info) => { if (info.offset.x < 0) x.set(0); }}
        onDragEnd={(_, info) => { if (info.offset.x > 50) onSwipeReply(); }}
      >
        {children}
      </motion.div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// DoubleTapHeart — WhatsApp-style double-tap to react with heart animation.
// Wraps the bubble and fires `onDoubleTap` with a heart burst animation.
// ─────────────────────────────────────────────────────────────────────────────
interface DoubleTapHeartProps {
  children: React.ReactNode;
  disabled?: boolean;
  onDoubleTap?: () => void;
}

export const DoubleTapHeart = React.memo(function DoubleTapHeart({ children, disabled, onDoubleTap }: DoubleTapHeartProps) {
  const [showHeart, setShowHeart] = useState(false);
  const lastTapRef = useRef(0);

  const handleTap = useCallback(() => {
    if (disabled) return;
    const now = Date.now();
    if (now - lastTapRef.current < 300) {
      setShowHeart(true);
      onDoubleTap?.();
      setTimeout(() => setShowHeart(false), 900);
    }
    lastTapRef.current = now;
  }, [disabled, onDoubleTap]);

  return (
    <div className="relative" onClick={handleTap}>
      {children}
      <AnimatePresence>
        {showHeart && (
          <motion.div
            className="absolute inset-0 flex items-center justify-center pointer-events-none z-50"
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: 1.3, opacity: 1 }}
            exit={{ scale: 0.8, opacity: 0, y: -20 }}
            transition={{ type: 'spring', damping: 10, stiffness: 200 }}
          >
            <Heart className="w-10 h-10 text-red-500 fill-red-500 " />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
});

// ─────────────────────────────────────────────────────────────────────────────
// MessageStarBadge — small star icon shown on starred/bookmarked messages.
// ─────────────────────────────────────────────────────────────────────────────
export const MessageStarBadge = React.memo(function MessageStarBadge({ isAr }: { isAr?: boolean }) {
  return (
    <motion.span
      initial={{ scale: 0 }}
      animate={{ scale: 1 }}
      className="inline-flex"
      aria-label={isAr ? 'مميزة بنجمة' : 'Markiert'}
    >
      <Star className="h-[10px] w-[10px] text-amber-500 fill-amber-500" />
    </motion.span>
  );
});

// ─────────────────────────────────────────────────────────────────────────────
// EditedBadge — subtle "(edited)" indicator for modified messages.
// ─────────────────────────────────────────────────────────────────────────────
export const EditedBadge = React.memo(function EditedBadge({ isAr, dimmed }: { isAr?: boolean; dimmed?: boolean }) {
  return (
    <span className={cn(
      'text-[9px] italic',
      dimmed ? 'text-primary-foreground/50' : 'text-muted-foreground/50'
    )}>
      {isAr ? 'معدّلة' : 'bearbeitet'}
    </span>
  );
});

// ─────────────────────────────────────────────────────────────────────────────
// SelfDestructTimer — countdown badge for expiring messages.
// ─────────────────────────────────────────────────────────────────────────────
interface SelfDestructTimerProps {
  expiresAt: string;
  isAr?: boolean;
}

export const SelfDestructTimer = React.memo(function SelfDestructTimer({ expiresAt, isAr }: SelfDestructTimerProps) {
  const [remaining, setRemaining] = React.useState('');

  React.useEffect(() => {
    const update = () => {
      const diff = Math.max(0, new Date(expiresAt).getTime() - Date.now());
      if (diff <= 0) { setRemaining(isAr ? 'منتهية' : 'Abgelaufen'); return; }
      const s = Math.floor(diff / 1000);
      if (s < 60) setRemaining(`${s}s`);
      else if (s < 3600) setRemaining(`${Math.floor(s / 60)}m`);
      else setRemaining(`${Math.floor(s / 3600)}h`);
    };
    update();
    const id = setInterval(update, 1000);
    return () => clearInterval(id);
  }, [expiresAt, isAr]);

  return (
    <motion.span
      className="inline-flex items-center gap-0.5 text-[9px] text-orange-500/80"
      animate={{ opacity: [0.6, 1, 0.6] }}
      transition={{ duration: 2, repeat: Infinity }}
    >
      <Clock className="h-[9px] w-[9px]" />
      {remaining}
    </motion.span>
  );
});

// ─────────────────────────────────────────────────────────────────────────────
// TypingDots – 3 bouncing dots for "is typing" indicator.
//
// Wrapped in React.memo because the dots are pure (only `size` changes its
// output, and that's typically stable per-call-site). When rendered inside
// a virtualized chat, this component would otherwise re-run its motion
// component setup on every scroll-driven parent render.
// ─────────────────────────────────────────────────────────────────────────────
export const TypingDots = React.memo(function TypingDots({ size = 5 }: { size?: number }) {
  return (
    <div className="flex items-center gap-[3px] py-0.5">
      {[0, 1, 2].map(i => (
        <motion.div
          key={i}
          className="rounded-full bg-primary"
          style={{ width: size, height: size }}
          animate={{ opacity: [0.3, 1, 0.3], y: [0, -3, 0] }}
          transition={{ duration: 0.8, repeat: Infinity, delay: i * 0.15 }}
        />
      ))}
    </div>
  );
});

// ─────────────────────────────────────────────────────────────────────────────
// MessageTicks — Telegram-style delivery status indicator.
//
// We surface 5 states distinctly so users always know what happened:
//   • pending  → spinning clock           ("sending…")
//   • sent     → single grey check        ("server has it")
//   • delivered→ double grey check        (reserved for future, looks like sent for now)
//   • read     → double primary check     ("recipient read it")
//   • failed   → red exclamation + retry  ("send failed, tap to retry")
//
// `dimmed` switches to the on-dark/on-primary color set used inside coloured
// bubbles (mine, on a dark wallpaper).
// ─────────────────────────────────────────────────────────────────────────────
interface MessageTicksProps {
  status?: MessageStatus;
  read: boolean;
  dimmed?: boolean;
  onRetry?: () => void;
  isAr?: boolean;
}

export const MessageTicks = React.memo(function MessageTicks({ status, read, dimmed, onRetry, isAr }: MessageTicksProps) {
  // Resolve effective status. Legacy rows have no `status`; default to read
  // when read=true, otherwise 'sent'.
  const eff: MessageStatus = status ?? (read ? 'read' : 'sent');

  if (eff === 'pending') {
    return (
      <motion.span
        initial={{ opacity: 0, scale: 0.5 }}
        animate={{ opacity: 1, scale: 1 }}
        className="inline-flex"
      >
        <Clock className={cn('h-[11px] w-[11px] animate-pulse', dimmed ? 'text-primary-foreground/70' : 'text-muted-foreground/60')} aria-label={isAr ? 'يجري الإرسال' : 'Wird gesendet'} />
      </motion.span>
    );
  }
  if (eff === 'failed') {
    return (
      <motion.button
        type="button"
        onClick={(e) => { e.stopPropagation(); onRetry?.(); }}
        className="inline-flex items-center gap-[2px] text-destructive"
        aria-label={isAr ? 'إعادة المحاولة' : 'Erneut versuchen'}
        whileTap={{ scale: 0.85 }}
        animate={{ x: [0, -2, 2, -2, 0] }}
        transition={{ duration: 0.4 }}
      >
        <AlertCircle className="h-[12px] w-[12px]" />
        <RotateCw className="h-[10px] w-[10px]" />
      </motion.button>
    );
  }
  if (eff === 'read') {
    return (
      <motion.span
        initial={{ scale: 0.8 }}
        animate={{ scale: 1 }}
        transition={{ type: 'spring', damping: 15, stiffness: 400 }}
        className="inline-flex"
      >
        <CheckCheck className="h-[11px] w-[11px] text-primary" aria-label={isAr ? 'مقروءة' : 'Gelesen'} />
      </motion.span>
    );
  }
  if (eff === 'delivered') {
    return (
      <motion.span
        initial={{ scale: 0.8 }}
        animate={{ scale: 1 }}
        className="inline-flex"
      >
        <CheckCheck className={cn('h-[11px] w-[11px]', dimmed ? 'text-primary-foreground/70' : 'text-muted-foreground/60')} aria-label={isAr ? 'وصلت' : 'Zugestellt'} />
      </motion.span>
    );
  }
  // sent
  return (
    <motion.span
      initial={{ scale: 0 }}
      animate={{ scale: 1 }}
      transition={{ type: 'spring', damping: 12 }}
      className="inline-flex"
    >
      <Check className={cn('h-[11px] w-[11px]', dimmed ? 'text-primary-foreground/70' : 'text-muted-foreground/60')} aria-label={isAr ? 'أُرسلت' : 'Gesendet'} />
    </motion.span>
  );
}, (prev, next) => {
  // Custom comparator. We deliberately ignore `onRetry` identity because
  // call sites typically pass an inline arrow `() => retry(msg)` that
  // changes reference every parent render. The handler is only invoked
  // on a click — at which point it captures the latest props via
  // closure of the parent scope, so the staleness window is at most
  // one render and the retry call itself is idempotent (same outcome
  // regardless of which version of the closure runs).
  return prev.status === next.status
      && prev.read === next.read
      && prev.dimmed === next.dimmed
      && prev.isAr === next.isAr;
});

// ─────────────────────────────────────────────────────────────────────────────
// ReactionPill — pill that shows an emoji + count, plus a subtle outline if
// the current viewer is one of the reactors. Used in the per-bubble
// reaction strip.
// ─────────────────────────────────────────────────────────────────────────────
interface ReactionPillProps {
  key?: React.Key;
  emoji: string;
  count: number;
  reactedByMe: boolean;
  onClick?: () => void;
  ariaLabel?: string;
}

export const ReactionPill = React.memo(function ReactionPill({ emoji, count, reactedByMe, onClick, ariaLabel }: ReactionPillProps) {
  return (
    <motion.button
      type="button"
      onClick={(e) => { e.stopPropagation(); onClick?.(); }}
      className={cn(
        'inline-flex items-center gap-0.5 rounded-full px-1.5 py-0.5 text-[13px] border select-none',
        reactedByMe
          ? 'bg-primary/15 border-primary/40 ring-1 ring-primary/20 shadow-sm shadow-primary/10'
          : 'bg-card border-border/20 hover:bg-muted/30',
      )}
      whileTap={{ scale: 0.85 }}
      layout
      transition={{ type: 'spring', damping: 20, stiffness: 400 }}
      aria-label={ariaLabel}
    >
      <motion.span
        className="leading-none"
        key={`${emoji}-${count}`}
        initial={{ scale: 1.4, rotate: -10 }}
        animate={{ scale: 1, rotate: 0 }}
        transition={{ type: 'spring', damping: 12 }}
      >
        {emoji}
      </motion.span>
      {count > 1 && (
        <motion.span
          className="text-[9px] text-muted-foreground font-medium tabular-nums"
          key={count}
          initial={{ scale: 0, y: 4 }}
          animate={{ scale: 1, y: 0 }}
        >
          {count}
        </motion.span>
      )}
    </motion.button>
  );
}, (prev, next) => {
  // Same trade-off as MessageTicks: callers typically inline
  // `() => toggleReaction(msg.id, emoji)` so onClick identity churns each
  // render. The handler closes over stable refs (msg.id + emoji are stable
  // strings) so any closure version we hold onto resolves to the same
  // mutation. We compare every prop except onClick so the visual content
  // drives re-renders, not handler identity.
  return prev.emoji === next.emoji
      && prev.count === next.count
      && prev.reactedByMe === next.reactedByMe
      && prev.ariaLabel === next.ariaLabel;
});

// ─────────────────────────────────────────────────────────────────────────────
// ForwardedBadge — the small "Forwarded from X" header inside a bubble.
// ─────────────────────────────────────────────────────────────────────────────
export const ForwardedBadge = React.memo(function ForwardedBadge({ name, isAr }: { name?: string | null; isAr: boolean }) {
  return (
    <motion.div
      className="flex items-center gap-1 mb-0.5 text-[11px] text-muted-foreground/80 italic"
      initial={{ opacity: 0, x: -8 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.2 }}
    >
      <Reply className="w-3 h-3 -scale-x-100" />
      <span>
        {isAr ? 'محوّلة' : 'Weitergeleitet'}
        {name ? <> · <span className="not-italic font-medium">{name}</span></> : null}
      </span>
    </motion.div>
  );
});

// ─────────────────────────────────────────────────────────────────────────────
// QuickReactionBar — floating bar that appears above a message on long-press.
// Shows QUICK_EMOJIS as a row of tappable emoji icons with spring animation.
// ─────────────────────────────────────────────────────────────────────────────
interface QuickReactionBarProps {
  emojis: string[];
  onSelect: (emoji: string) => void;
  onExpand?: () => void;
  isMine: boolean;
  isAr?: boolean;
}

export const QuickReactionBar = React.memo(function QuickReactionBar({
  emojis, onSelect, onExpand, isMine, isAr,
}: QuickReactionBarProps) {
  return (
    <motion.div
      className={cn(
        'flex items-center gap-0.5 px-2 py-1.5 rounded-full bg-card/95 backdrop-blur-md shadow-xl border border-border/30',
        isMine ? 'origin-bottom-right' : 'origin-bottom-left'
      )}
      initial={{ scale: 0.5, opacity: 0, y: 10 }}
      animate={{ scale: 1, opacity: 1, y: 0 }}
      exit={{ scale: 0.5, opacity: 0, y: 10 }}
      transition={{ type: 'spring', damping: 18, stiffness: 350 }}
    >
      {emojis.map((emoji, i) => (
        <motion.button
          key={emoji}
          type="button"
          className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-muted/40 active:scale-110 text-[20px]"
          onClick={(e) => { e.stopPropagation(); onSelect(emoji); }}
          initial={{ scale: 0, y: 8 }}
          animate={{ scale: 1, y: 0 }}
          transition={{ type: 'spring', damping: 14, delay: i * 0.03 }}
          whileTap={{ scale: 1.3 }}
        >
          {emoji}
        </motion.button>
      ))}
      {onExpand && (
        <motion.button
          type="button"
          className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-muted/40 text-muted-foreground"
          onClick={(e) => { e.stopPropagation(); onExpand(); }}
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ delay: emojis.length * 0.03 }}
          whileTap={{ scale: 1.2 }}
          aria-label={isAr ? 'المزيد' : 'Mehr'}
        >
          <Sparkles className="w-4 h-4" />
        </motion.button>
      )}
    </motion.div>
  );
});

// ─────────────────────────────────────────────────────────────────────────────
// MessageMetaRow — the time + ticks + star row at the bottom of a bubble.
// Centralizes layout so all bubble renderers stay consistent.
// ─────────────────────────────────────────────────────────────────────────────
interface MessageMetaRowProps {
  time: string;
  isMine: boolean;
  status?: MessageStatus;
  read: boolean;
  dimmed?: boolean;
  isAr?: boolean;
  starred?: boolean;
  edited?: boolean;
  expiresAt?: string | null;
  onRetry?: () => void;
}

export const MessageMetaRow = React.memo(function MessageMetaRow({
  time, isMine, status, read, dimmed, isAr, starred, edited, expiresAt, onRetry,
}: MessageMetaRowProps) {
  return (
    <span className={cn(
      'inline-flex items-center gap-1 text-[10px] select-none shrink-0 mt-0.5',
      dimmed ? 'text-primary-foreground/60' : 'text-muted-foreground/55',
    )}>
      {edited && <EditedBadge isAr={isAr} dimmed={dimmed} />}
      {expiresAt && <SelfDestructTimer expiresAt={expiresAt} isAr={isAr} />}
      <span className="tabular-nums">{time}</span>
      {starred && <MessageStarBadge isAr={isAr} />}
      {isMine && <MessageTicks status={status} read={read} dimmed={dimmed} onRetry={onRetry} isAr={isAr} />}
    </span>
  );
});

// ─────────────────────────────────────────────────────────────────────────────
// SeenByAvatars — shows small avatar circles for who has read the message
// (group chats). Telegram-style "seen by N" with expandable avatar row.
// ─────────────────────────────────────────────────────────────────────────────
interface SeenByAvatarsProps {
  seenBy: Array<{ userId: string; avatarUrl?: string | null; username?: string }>;
  maxShow?: number;
  isAr?: boolean;
}

export const SeenByAvatars = React.memo(function SeenByAvatars({ seenBy, maxShow = 3, isAr }: SeenByAvatarsProps) {
  if (!seenBy.length) return null;
  const shown = seenBy.slice(0, maxShow);
  const extra = seenBy.length - maxShow;

  return (
    <motion.div
      className="flex items-center gap-0.5 mt-0.5"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ delay: 0.3 }}
    >
      <div className="flex -space-x-1.5 rtl:space-x-reverse">
        {shown.map((s, i) => (
          <motion.div
            key={s.userId}
            className="w-4 h-4 rounded-full bg-muted border border-background overflow-hidden"
            initial={{ scale: 0, x: -4 }}
            animate={{ scale: 1, x: 0 }}
            transition={{ delay: i * 0.05 }}
          >
            {s.avatarUrl ? (
              <img src={s.avatarUrl} alt={s.username} className="w-full h-full object-cover" />
            ) : (
              <span className="w-full h-full flex items-center justify-center text-[7px] font-bold text-muted-foreground">
                {(s.username || '?')[0].toUpperCase()}
              </span>
            )}
          </motion.div>
        ))}
      </div>
      {extra > 0 && (
        <span className="text-[9px] text-muted-foreground/60 tabular-nums">
          +{extra}
        </span>
      )}
    </motion.div>
  );
});

// Re-export Message type for consumers that import from this module.
export type { Message, MessageStatus };
