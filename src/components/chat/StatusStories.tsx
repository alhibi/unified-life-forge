import React, { useState, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus, X, Eye, Clock, Camera, Type, Palette } from '@/lib/icons';
import { cn } from '@/lib/utils';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { isEmojiAvatarValue, getAppleEmojiUrl } from '@/utils/emojiAvatar';
import { getDefaultAvatarForUser } from '@/utils/defaultAvatar';

// ─────────────────────────────────────────────────────────────────────────────
// StatusStories — WhatsApp/Instagram-style status/stories feature.
// Shows a horizontal scrollable row of story circles at the top of chat list.
// ─────────────────────────────────────────────────────────────────────────────

export interface StatusItem {
  id: string;
  userId: string;
  username: string;
  displayName?: string;
  avatarUrl?: string | null;
  /** Preview content (text for text-status, image URL for media) */
  preview?: string;
  type: 'text' | 'image' | 'video';
  /** Background color/gradient for text statuses */
  background?: string;
  createdAt: string;
  expiresAt: string;
  /** Whether the current user has viewed this status */
  viewed: boolean;
  /** Number of viewers */
  viewCount: number;
}

interface StatusStoriesProps {
  isAr: boolean;
  myStatus?: StatusItem | null;
  statuses: StatusItem[];
  myAvatarUrl?: string | null;
  myUsername?: string;
  onViewStatus: (status: StatusItem) => void;
  onCreateStatus: () => void;
}

const STATUS_GRADIENTS = [
  'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
  'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)',
  'linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)',
  'linear-gradient(135deg, #43e97b 0%, #38f9d7 100%)',
  'linear-gradient(135deg, #fa709a 0%, #fee140 100%)',
  'linear-gradient(135deg, #a18cd1 0%, #fbc2eb 100%)',
  'linear-gradient(135deg, #fccb90 0%, #d57eeb 100%)',
  'linear-gradient(135deg, #667eea 0%, #f093fb 100%)',
];

function StatusAvatar({
  avatarUrl,
  username,
  hasUnviewed,
  isOwn,
  size = 'lg',
}: {
  avatarUrl?: string | null;
  username?: string;
  hasUnviewed?: boolean;
  isOwn?: boolean;
  size?: 'sm' | 'lg';
}) {
  const isEmoji = avatarUrl ? isEmojiAvatarValue(avatarUrl) : false;
  const hasImage = avatarUrl && avatarUrl.startsWith('http');
  const defaultSrc = getDefaultAvatarForUser(username || '?');
  const sizeClass = size === 'lg' ? 'w-[58px] h-[58px]' : 'w-[44px] h-[44px]';
  const ringWidth = size === 'lg' ? '3px' : '2px';

  return (
    <div className="relative">
      {/* Ring indicator */}
      <div
        className={cn(
          'rounded-full p-[3px]',
          hasUnviewed
            ? 'bg-gradient-to-tr from-primary via-purple-500 to-pink-500'
            : isOwn
              ? 'bg-border/30'
              : 'bg-muted/30'
        )}
        style={{ padding: ringWidth }}
      >
        <Avatar className={cn(sizeClass, 'border-2 border-background')}>
          {hasImage ? (
            <AvatarImage src={avatarUrl!} alt={username} className="object-cover" />
          ) : isEmoji ? (
            <AvatarImage src={getAppleEmojiUrl(avatarUrl!) || ''} alt={username} className="w-[60%] h-[60%] object-contain m-auto" />
          ) : (
            <img src={defaultSrc} alt={username || ''} className="w-full h-full object-cover" />
          )}
          <AvatarFallback className="bg-muted text-muted-foreground text-xs font-bold">
            {(username || '?')[0].toUpperCase()}
          </AvatarFallback>
        </Avatar>
      </div>
      {/* Plus badge for own status */}
      {isOwn && (
        <div className="absolute -bottom-0.5 -end-0.5 w-5 h-5 rounded-full bg-primary flex items-center justify-center ring-2 ring-background">
          <Plus className="w-3 h-3 text-primary-foreground" />
        </div>
      )}
    </div>
  );
}

/**
 * StatusStories horizontal scrollbar component.
 * Shows: [My Status + Add] [Contact 1] [Contact 2] ...
 */
const StatusStories: React.FC<StatusStoriesProps> = ({
  isAr,
  myStatus,
  statuses,
  myAvatarUrl,
  myUsername,
  onViewStatus,
  onCreateStatus,
}) => {
  // Group statuses by user (show latest per user)
  const uniqueStatuses = React.useMemo(() => {
    const seen = new Set<string>();
    return statuses.filter(s => {
      if (seen.has(s.userId)) return false;
      seen.add(s.userId);
      return true;
    });
  }, [statuses]);

  const unviewedCount = uniqueStatuses.filter(s => !s.viewed).length;

  return (
    <div className="shrink-0">
      <div className="flex items-center overflow-x-auto scrollbar-none gap-3 px-4 py-3">
        {/* My status */}
        <motion.button
          type="button"
          onClick={myStatus ? () => onViewStatus(myStatus) : onCreateStatus}
          className="flex flex-col items-center gap-1 shrink-0"
          whileTap={{ scale: 0.95 }}
        >
          <StatusAvatar
            avatarUrl={myAvatarUrl}
            username={myUsername}
            isOwn={!myStatus}
            hasUnviewed={false}
          />
          <span className="text-[11px] text-muted-foreground font-medium w-[62px] truncate text-center">
            {isAr ? 'حالتي' : 'Mein Status'}
          </span>
        </motion.button>

        {/* Separator */}
        {uniqueStatuses.length > 0 && (
          <div className="w-px h-10 bg-border/20 shrink-0" />
        )}

        {/* Others' statuses */}
        {uniqueStatuses.map((status, i) => (
          <motion.button
            key={status.id}
            type="button"
            onClick={() => onViewStatus(status)}
            className="flex flex-col items-center gap-1 shrink-0"
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: i * 0.03 }}
            whileTap={{ scale: 0.95 }}
          >
            <StatusAvatar
              avatarUrl={status.avatarUrl}
              username={status.username}
              hasUnviewed={!status.viewed}
            />
            <span className="text-[11px] text-muted-foreground w-[62px] truncate text-center">
              {status.displayName || status.username}
            </span>
          </motion.button>
        ))}
      </div>

      {/* Subtle divider */}
      <div className="h-px bg-border/10 mx-4" />
    </div>
  );
};

export default StatusStories;

// ─────────────────────────────────────────────────────────────────────────────
// StatusViewer — Full-screen overlay to view a status (like Instagram stories)
// ─────────────────────────────────────────────────────────────────────────────
interface StatusViewerProps {
  isAr: boolean;
  status: StatusItem | null;
  onClose: () => void;
  onNext?: () => void;
  onPrev?: () => void;
}

export const StatusViewer = React.memo(function StatusViewer({
  isAr, status, onClose, onNext, onPrev,
}: StatusViewerProps) {
  if (!status) return null;

  const timeAgo = React.useMemo(() => {
    const diff = Date.now() - new Date(status.createdAt).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return isAr ? 'الآن' : 'Gerade';
    if (mins < 60) return isAr ? `منذ ${mins} د` : `vor ${mins} Min`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return isAr ? `منذ ${hrs} س` : `vor ${hrs} Std`;
    return isAr ? 'أمس' : 'Gestern';
  }, [status.createdAt, isAr]);

  return (
    <motion.div
      className="fixed inset-0 z-[100] bg-black flex flex-col"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
    >
      {/* Progress bar */}
      <div className="absolute top-0 inset-x-0 h-0.5 bg-white/20 z-10">
        <motion.div
          className="h-full bg-white"
          initial={{ width: '0%' }}
          animate={{ width: '100%' }}
          transition={{ duration: 5, ease: 'linear' }}
          onAnimationComplete={onNext}
        />
      </div>

      {/* Header */}
      <div className="relative z-10 flex items-center gap-3 px-4 pt-8 pb-3">
        <Avatar className="w-9 h-9">
          {status.avatarUrl ? (
            <AvatarImage src={status.avatarUrl} className="object-cover" />
          ) : (
            <AvatarFallback className="bg-white/20 text-white text-xs">
              {(status.username || '?')[0].toUpperCase()}
            </AvatarFallback>
          )}
        </Avatar>
        <div className="flex-1 min-w-0">
          <p className="text-[13px] font-semibold text-white truncate">
            {status.displayName || status.username}
          </p>
          <p className="text-[11px] text-white/60">{timeAgo}</p>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center"
        >
          <X className="w-4 h-4 text-white" />
        </button>
      </div>

      {/* Content */}
      <div
        className="flex-1 flex items-center justify-center px-6"
        onClick={(e) => {
          const rect = e.currentTarget.getBoundingClientRect();
          const clickX = e.clientX - rect.left;
          if (clickX < rect.width / 3) onPrev?.();
          else onNext?.();
        }}
        style={{ background: status.background || 'black' }}
      >
        {status.type === 'text' ? (
          <motion.p
            className="text-white text-[22px] font-bold text-center leading-relaxed max-w-[300px]"
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            dir="auto"
          >
            {status.preview}
          </motion.p>
        ) : (
          <motion.img
            src={status.preview}
            className="max-w-full max-h-full rounded-xl object-contain"
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
          />
        )}
      </div>

      {/* Footer - view count */}
      <div className="relative z-10 px-4 py-4 flex items-center gap-2">
        <Eye className="w-4 h-4 text-white/50" />
        <span className="text-[12px] text-white/50">
          {status.viewCount} {isAr ? 'مشاهدة' : 'Aufrufe'}
        </span>
      </div>
    </motion.div>
  );
});
