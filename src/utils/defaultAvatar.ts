import defaultAvatar1 from '@/assets/default-avatar-1.png';
import defaultAvatar2 from '@/assets/default-avatar-2.png';
import defaultAvatar3 from '@/assets/default-avatar-3.png';

const DEFAULT_AVATARS = [defaultAvatar1, defaultAvatar2, defaultAvatar3];

/**
 * Returns a deterministic default avatar image based on username hash.
 * Same user always gets the same avatar.
 */
export const getDefaultAvatarForUser = (name: string): string => {
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  const index = Math.abs(hash) % DEFAULT_AVATARS.length;
  return DEFAULT_AVATARS[index];
};
