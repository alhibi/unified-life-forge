import { motion } from 'framer-motion';
import React from 'react';

import BackButton from '@/components/BackButton';
import { StreakFlameBadge } from '@/components/portal/StreakFlameBadge';
import { Button } from '@/components/ui/button';
import {
  Award,
  Copy,
  MapPin,
  Pencil,
  QrCode,
  ShieldCheck,
  Sparkles,
} from '@/lib/icons';
import { getDefaultAvatarForUser } from '@/utils/defaultAvatar';
import { getAppleEmojiUrl, isEmojiAvatarValue } from '@/utils/emojiAvatar';

export interface ProfileHeaderHeroProps {
  username: string;
  displayName: string;
  avatarUrl: string;
  title?: string | null;
  location?: string | null;
  statusText?: string | null;
  statusEmoji?: string | null;
  completionPercentage: number;
  isUploadingAvatar: boolean;
  onAvatarClick: () => void;
  onOpenPassModal: () => void;
  onCopyLink: () => void;
  isOnline?: boolean;
  memberSinceDate?: string | null;
}

export const ProfileHeaderHero: React.FC<ProfileHeaderHeroProps> = ({
  username,
  displayName,
  avatarUrl,
  title,
  location,
  statusText,
  statusEmoji = '✨',
  completionPercentage,
  isUploadingAvatar,
  onAvatarClick,
  onOpenPassModal,
  onCopyLink,
  isOnline = true,
  memberSinceDate,
}) => {
  const isUrlAvatar = avatarUrl && avatarUrl.startsWith('http');
  const isEmojiAvatar = avatarUrl && isEmojiAvatarValue(avatarUrl);

  // SVG Progress Ring calculations (Radius 58, Circumference ~364)
  const radius = 58;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (completionPercentage / 100) * circumference;

  return (
    <div className="relative w-full overflow-hidden">
      {/* Cover band — flat surface; the old gradient canvas and ambient glow are gone */}
      <div className="relative h-[240px] sm:h-[280px] w-full overflow-hidden bg-secondary border-b border-border">
        {/* Top Header Controls Bar */}
        <div className="absolute top-4 inset-x-4 z-raised flex items-center justify-between">
          <BackButton fallback="/" />

          <div className="flex items-center gap-2">
            {/* Digital Identity Ticket Pass Button */}
            <Button
              variant="secondary"
              size="sm"
              onClick={onOpenPassModal}
              className="gap-1.5"
              title="بطاقة الهوية الرقمية"
            >
              <QrCode className="w-3.5 h-3.5 text-primary" aria-hidden />
              <span className="font-semibold">بطاقة الهوية</span>
            </Button>

            {/* Copy Profile Link Button */}
            <Button
              variant="secondary"
              size="sm"
              onClick={onCopyLink}
              className="gap-1.5"
              title="نسخ رابط الملف"
            >
              <Copy className="w-3.5 h-3.5" aria-hidden />
              <span className="hidden sm:inline">مشاركة</span>
            </Button>
          </div>
        </div>
      </div>

      {/* Main Identity Profile Block */}
      <div className="relative -mt-[88px] px-5 max-w-xl mx-auto flex flex-col items-center text-center">
        {/* Avatar Container with SVG Completion Meter Ring */}
        <div className="relative group cursor-pointer" onClick={onAvatarClick}>
          {/* Circular Progress Ring — encodes the completion percentage */}
          <svg className="w-[128px] h-[128px] -rotate-90 pointer-events-none" viewBox="0 0 128 128">
            <circle
              cx="64"
              cy="64"
              r={radius}
              className="text-muted/30 stroke-current"
              strokeWidth="4"
              fill="transparent"
            />
            <motion.circle
              cx="64"
              cy="64"
              r={radius}
              className="text-primary stroke-current"
              strokeWidth="4"
              fill="transparent"
              strokeDasharray={circumference}
              initial={{ strokeDashoffset: circumference }}
              animate={{ strokeDashoffset }}
              transition={{ duration: 1.2, ease: 'easeOut' }}
              strokeLinecap="round"
            />
          </svg>

          {/* Inner Avatar Image */}
          <div className="absolute inset-[6px] rounded-full ring-4 ring-background bg-secondary overflow-hidden flex items-center justify-center transition-transform group-hover:scale-[0.98]">
            {isUrlAvatar ? (
              <img src={avatarUrl} alt={displayName} className="w-full h-full object-cover" />
            ) : isEmojiAvatar ? (
              <img src={getAppleEmojiUrl(avatarUrl) || ''} alt={displayName} className="w-16 h-16" />
            ) : (
              <img
                src={getDefaultAvatarForUser(username || 'U')}
                alt={displayName}
                className="w-full h-full object-cover"
              />
            )}

            {/* Hover overlay edit hint */}
            <div className="absolute inset-0 bg-background/75 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center text-foreground text-micro font-medium">
              <Pencil className="w-4 h-4 mb-0.5" aria-hidden />
              <span>تغيير</span>
            </div>
          </div>

          {/* Uploading Spinner or Edit Badge */}
          <div className="absolute bottom-1 end-1 w-8 h-8 rounded-full bg-primary flex items-center justify-center ring-4 ring-background">
            {isUploadingAvatar ? (
              <span className="animate-spin w-4 h-4 border-2 border-primary-foreground/30 border-t-primary-foreground rounded-full" />
            ) : (
              <Pencil className="w-3.5 h-3.5 text-primary-foreground" aria-hidden />
            )}
          </div>

          {/* Completion Badge Pill */}
          <div className="absolute -bottom-2 start-1/2 -translate-x-1/2 px-2 py-0.5 rounded-full bg-background ring-1 ring-border text-micro font-extrabold text-primary tabular-nums">
            {completionPercentage}%
          </div>
        </div>

        {/* Display Name & Handle */}
        <div className="mt-4 space-y-1">
          <div className="flex items-center justify-center gap-2">
            <h1 className="text-display font-extrabold text-foreground tracking-tight leading-tight">
              {displayName || username || 'المستخدم'}
            </h1>
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-primary/10 text-primary text-micro font-bold border border-primary/20">
              <ShieldCheck className="w-3 h-3" aria-hidden />
              عضو موثق
            </span>
          </div>

          <p className="text-mini font-mono text-muted-foreground" dir="ltr">
            @{username || 'user'}
          </p>
        </div>

        {/* Title / Passion & Location */}
        {(title || location) && (
          <div className="mt-2.5 flex flex-wrap items-center justify-center gap-3 text-mini text-muted-foreground">
            {title && (
              <span className="inline-flex items-center gap-1 font-medium text-foreground/90">
                <Sparkles className="w-3.5 h-3.5 text-primary" aria-hidden />
                {title}
              </span>
            )}
            {title && location && <span className="text-border">•</span>}
            {location && (
              <span className="inline-flex items-center gap-1">
                <MapPin className="w-3.5 h-3.5 text-muted-foreground" aria-hidden />
                {location}
              </span>
            )}
          </div>
        )}

        {/* Status Pill with Emoji */}
        {statusText && (
          <motion.div
            initial={{ opacity: 0, y: 4 }}
            animate={{ opacity: 1, y: 0 }}
            className="mt-3 inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-secondary text-mini font-medium text-foreground"
          >
            <span className="text-meta">{statusEmoji || '✨'}</span>
            <span>{statusText}</span>
          </motion.div>
        )}

        {/* Presence & Member Since Chips */}
        <div className="mt-3.5 flex flex-wrap items-center justify-center gap-2">
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-success/10 text-micro font-semibold text-success">
            <span className="rounded-full bg-success w-1.5 h-1.5" aria-hidden />
            {isOnline ? 'متصل الآن' : 'نشط مؤخراً'}
          </span>

          {memberSinceDate && (
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-muted/40 text-micro text-muted-foreground">
              <Award className="w-3 h-3" aria-hidden />
              عضو منذ {memberSinceDate}
            </span>
          )}

          {/* The living flame — same single instance language as the portal */}
          <StreakFlameBadge />
        </div>
      </div>
    </div>
  );
};
