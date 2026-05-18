import React from 'react';
import { motion, useMotionValue, useTransform } from 'framer-motion';
import { Reply, Check, CheckCheck, Clock, AlertCircle, RotateCw } from 'lucide-react';
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
        <div className="w-8 h-8 rounded-full bg-primary/15 flex items-center justify-center">
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
// TypingDots – 3 bouncing dots for "is typing" indicator.
// ─────────────────────────────────────────────────────────────────────────────
export function TypingDots({ size = 5 }: { size?: number }) {
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
}

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

export function MessageTicks({ status, read, dimmed, onRetry, isAr }: MessageTicksProps) {
  // Resolve effective status. Legacy rows have no `status`; default to read
  // when read=true, otherwise 'sent'.
  const eff: MessageStatus = status ?? (read ? 'read' : 'sent');

  if (eff === 'pending') {
    return <Clock className={cn('h-[11px] w-[11px] animate-pulse', dimmed ? 'text-primary-foreground/70' : 'text-muted-foreground/60')} aria-label={isAr ? 'يجري الإرسال' : 'Wird gesendet'} />;
  }
  if (eff === 'failed') {
    return (
      <button
        type="button"
        onClick={(e) => { e.stopPropagation(); onRetry?.(); }}
        className="inline-flex items-center gap-[2px] text-destructive active:scale-90 transition-transform"
        aria-label={isAr ? 'إعادة المحاولة' : 'Erneut versuchen'}
      >
        <AlertCircle className="h-[12px] w-[12px]" />
        <RotateCw className="h-[10px] w-[10px]" />
      </button>
    );
  }
  if (eff === 'read') {
    return <CheckCheck className="h-[11px] w-[11px] text-primary" aria-label={isAr ? 'مقروءة' : 'Gelesen'} />;
  }
  if (eff === 'delivered') {
    return <CheckCheck className={cn('h-[11px] w-[11px]', dimmed ? 'text-primary-foreground/70' : 'text-muted-foreground/60')} aria-label={isAr ? 'وصلت' : 'Zugestellt'} />;
  }
  // sent
  return <Check className={cn('h-[11px] w-[11px]', dimmed ? 'text-primary-foreground/70' : 'text-muted-foreground/60')} aria-label={isAr ? 'أُرسلت' : 'Gesendet'} />;
}

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

export function ReactionPill({ emoji, count, reactedByMe, onClick, ariaLabel }: ReactionPillProps) {
  return (
    <button
      type="button"
      onClick={(e) => { e.stopPropagation(); onClick?.(); }}
      className={cn(
        'inline-flex items-center gap-0.5 rounded-full px-1.5 py-0.5 active:scale-90 transition-transform text-[13px] border',
        reactedByMe
          ? 'bg-primary/15 border-primary/40 ring-1 ring-primary/20'
          : 'bg-card border-border/20',
      )}
      aria-label={ariaLabel}
    >
      <span className="leading-none">{emoji}</span>
      {count > 1 && <span className="text-[9px] text-muted-foreground font-medium">{count}</span>}
    </button>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// ForwardedBadge — the small "Forwarded from X" header inside a bubble.
// ─────────────────────────────────────────────────────────────────────────────
export function ForwardedBadge({ name, isAr }: { name?: string | null; isAr: boolean }) {
  return (
    <div className="flex items-center gap-1 mb-0.5 text-[11px] text-muted-foreground/80 italic">
      <Reply className="w-3 h-3 -scale-x-100" />
      <span>
        {isAr ? 'محوّلة' : 'Weitergeleitet'}
        {name ? <> · <span className="not-italic font-medium">{name}</span></> : null}
      </span>
    </div>
  );
}

// Re-export Message type for consumers that import from this module.
export type { Message };
