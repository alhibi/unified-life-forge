import React from 'react';
import { Crown, Shield, User } from '@/lib/icons';
import { cn } from '@/lib/utils';
import type { ChatRole } from '@/lib/chat';

interface RoleBadgeProps {
  role: ChatRole;
  isAr: boolean;
  /** Small (next to a name) vs. medium (in a member-list row). */
  size?: 'sm' | 'md';
  /** Custom title overrides the role label entirely. */
  customTitle?: string | null;
}

/**
 * Small pill that surfaces a member's role inside a group/channel.
 * Owner: gold crown · Admin: blue shield · Member: nothing (returned null).
 *
 * Designed to sit next to the username in member rows, the active-chat
 * header, and the long-press action menu's bubble author label.
 */
const RoleBadge: React.FC<RoleBadgeProps> = ({ role, isAr, size = 'sm', customTitle }) => {
  if (role === 'member' && !customTitle) return null;
  const wrapperCls = cn(
    'inline-flex items-center gap-0.5 rounded-full font-medium leading-none',
    size === 'sm'
      ? 'text-[10px] h-[15px] px-1.5'
      : 'text-[11.5px] h-[19px] px-2',
    role === 'owner'
      ? 'bg-amber-500/15 text-amber-600 dark:text-amber-400 ring-1 ring-amber-500/25'
      : role === 'admin'
        ? 'bg-sky-500/15 text-sky-600 dark:text-sky-400 ring-1 ring-sky-500/25'
        : 'bg-muted/40 text-muted-foreground ring-1 ring-border/30',
  );
  const Icon = role === 'owner' ? Crown : role === 'admin' ? Shield : User;
  const label = customTitle
    ? customTitle
    : role === 'owner'
      ? ('المالك')
      : role === 'admin'
        ? ('مشرف')
        : ('عضو');

  return (
    <span className={wrapperCls}>
      <Icon className="h-[10px] w-[10px] shrink-0" />
      <span className="truncate max-w-[88px]">{label}</span>
    </span>
  );
};

export default RoleBadge;
