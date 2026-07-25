import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { cn } from '@/lib/utils';
import { getDefaultAvatarForUser } from '@/utils/defaultAvatar';
import { getAppleEmojiUrl, isEmojiAvatarValue } from '@/utils/emojiAvatar';

/**
 * Renders a conversation avatar, resolving the three shapes `avatar_url` can
 * take: a remote image URL, an Apple-emoji token, or nothing (in which case a
 * deterministic default is derived from the username).
 *
 * Extracted verbatim from ChatDrawer.tsx, where it was a module-level helper.
 */
export function renderAvatar(
  username?: string,
  avatarUrl?: string | null,
  size: string = 'h-12 w-12',
) {
  const isEmoji = avatarUrl ? isEmojiAvatarValue(avatarUrl) : false;
  const hasImage = avatarUrl && avatarUrl.startsWith('http');
  const defaultSrc = getDefaultAvatarForUser(username || '?');
  return (
    <Avatar className={cn(size, 'shrink-0')}>
      {hasImage ? (
        <AvatarImage src={avatarUrl} alt={username} className="object-cover" />
      ) : isEmoji ? (
        <AvatarImage
          src={getAppleEmojiUrl(avatarUrl!) || ''}
          alt={username}
          className="w-[60%] h-[60%] object-contain m-auto"
        />
      ) : (
        <img src={defaultSrc} alt={username || ''} className="w-full h-full object-cover" />
      )}
      <AvatarFallback className="bg-muted" />
    </Avatar>
  );
}
