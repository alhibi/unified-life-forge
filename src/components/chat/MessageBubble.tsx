import React from 'react';
import { motion, useMotionValue, useTransform } from 'framer-motion';
import { Reply } from 'lucide-react';
import { cn } from '@/lib/utils';

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
