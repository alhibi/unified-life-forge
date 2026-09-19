import React from 'react';

import type { ChatRole } from '@/lib/chat';
import { Crown, Shield, User } from '@/lib/icons';
import { cn } from '@/lib/utils';

interface RoleBadgeProps {
  role: ChatRole;
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
const RoleBadge: React.FC<RoleBadgeProps> = ({ role, size = 'sm', customTitle }) => {
  if (role === 'member' && !customTitle) return null;
  const wrapperCls = cn(
    'inline-flex items-center gap-0.5 rounded-full font-medium leading-none',
    size === 'sm'
      ? 'text-micro h-[15px] px-1.5'
      : 'text-micro h-[19px] px-2',
    role === 'owner'
      ? 'bg-signal/15 text-signal dark:text-signal ring-1 ring-signal/25'
      : role === 'admin'
        ? 'bg-data-4/15 text-data-4 dark:text-data-4 ring-1 ring-data-4/25'
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
