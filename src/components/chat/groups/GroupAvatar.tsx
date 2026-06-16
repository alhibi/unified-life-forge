import React, { useMemo } from 'react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { isEmojiAvatarValue, getAppleEmojiUrl } from '@/utils/emojiAvatar';
import { cn } from '@/lib/utils';
import { Hash, Users } from '@/lib/icons';
import type { ChatKind, ChatSummary } from '@/lib/chat';
import { chatAvatar, chatDisplayName } from '@/lib/chat';

interface GroupAvatarProps {
  /** Pass the full ChatSummary when you have it — saves the caller from
   *  computing the right fallback. */
  chat?: ChatSummary;
  /** Direct overrides (used by previews where there's no chat row yet). */
  kind?: ChatKind;
  title?: string | null;
  avatarUrl?: string | null;
  className?: string;
  /** When true, renders a small "kind" overlay icon (groups: people; channels: hash). */
  showKindBadge?: boolean;
}

// 8 deterministic gradient buckets for letter-only groups.
// We pick by name hash so the same group always gets the same colour.
const PALETTES: Array<[string, string]> = [
  ['hsl(195 75% 55%)', 'hsl(220 70% 50%)'],
  ['hsl(160 60% 45%)', 'hsl(180 55% 40%)'],
  ['hsl(280 60% 60%)', 'hsl(260 55% 50%)'],
  ['hsl(35 85% 55%)',  'hsl(20 80% 50%)'],
  ['hsl(0 70% 55%)',   'hsl(345 65% 50%)'],
  ['hsl(140 50% 45%)', 'hsl(120 45% 40%)'],
  ['hsl(48 90% 55%)',  'hsl(35 85% 50%)'],
  ['hsl(220 30% 45%)', 'hsl(220 25% 35%)'],
];

function hashString(str: string): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = (h * 0x01000193) >>> 0;
  }
  return h;
}

function paletteFor(seed: string): [string, string] {
  return PALETTES[hashString(seed || '?') % PALETTES.length];
}

function initials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return '?';
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

/**
 * Avatar that gracefully falls back to a deterministic gradient with
 * initials when no image is set — Telegram parity for groups/channels.
 *
 * Use cases:
 *   • Pass a `chat` prop to render the avatar of a hydrated chat (DM falls
 *     back to the partner's avatar; groups fall back to title initials).
 *   • Pass `title`/`avatarUrl` directly when previewing a not-yet-saved
 *     group inside the GroupCreatorSheet.
 */
const GroupAvatar: React.FC<GroupAvatarProps> = ({
  chat, kind, title, avatarUrl, className, showKindBadge = true,
}) => {
  const effectiveKind   = kind ?? chat?.kind ?? 'dm';
  const effectiveTitle  = title ?? (chat ? chatDisplayName(chat) : '') ?? '';
  const effectiveAvatar = avatarUrl ?? (chat ? chatAvatar(chat) : null);

  const palette = useMemo(() => paletteFor(effectiveTitle), [effectiveTitle]);
  const init    = useMemo(() => initials(effectiveTitle), [effectiveTitle]);

  const isEmoji = effectiveAvatar ? isEmojiAvatarValue(effectiveAvatar) : false;
  const hasImage = effectiveAvatar && effectiveAvatar.startsWith('http');

  return (
    <div className={cn('relative shrink-0', className)}>
      <Avatar className="h-full w-full">
        {hasImage ? (
          <AvatarImage
            src={effectiveAvatar!}
            alt={effectiveTitle}
            className="object-cover"
          />
        ) : isEmoji ? (
          <AvatarImage
            src={getAppleEmojiUrl(effectiveAvatar!) || ''}
            alt={effectiveTitle}
            className="w-[60%] h-[60%] object-contain m-auto"
          />
        ) : (
          <AvatarFallback
            className="text-primary-foreground font-semibold tracking-wider"
            style={{
              
            }}
          >
            {init}
          </AvatarFallback>
        )}
      </Avatar>

      {showKindBadge && effectiveKind !== 'dm' && (
        <div
          className={cn(
            'absolute -bottom-0.5 -end-0.5 rounded-full bg-background flex items-center justify-center',
            'h-[40%] w-[40%] min-h-[14px] min-w-[14px] max-h-[20px] max-w-[20px]',
            ' ring-1 ring-border/30',
          )}
          aria-hidden="true"
        >
          {effectiveKind === 'channel'
            ? <Hash  className="h-[60%] w-[60%] text-primary" />
            : <Users className="h-[60%] w-[60%] text-primary" />}
        </div>
      )}
    </div>
  );
};

export default GroupAvatar;
