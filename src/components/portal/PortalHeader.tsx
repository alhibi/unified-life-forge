/**
 * PortalHeader — the launcher's sticky top bar.
 *
 * The bar is part of the page, not a slab bolted on top of it: it rides the
 * portal's ambient background transparently and only earns a hairline + a
 * whisper of blur once the content scrolls beneath it. Controls follow the
 * Architectural Copper language — bare glyphs on a hairline-divided rail,
 * serif wordmark, copper-ringed avatar — so the header reads as the same
 * material as the plates below it.
 */
import { memo, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';

import { openCommandPalette } from '@/components/CommandPaletteConstants';
import { StreakFlameBadge } from '@/components/portal/StreakFlameBadge';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useApp } from '@/contexts/AppContext';
import { useAuth } from '@/hooks/useAuth';
import { Grid3X3, LogIn, MessageCircle, Moon, Search, Settings, Sun, User } from '@/lib/icons';
import { prefetchRoute } from '@/lib/routePrefetch';
import { cn } from '@/lib/utils';
import { getDefaultAvatarForUser } from '@/utils/defaultAvatar';
import { getAppleEmojiUrl, isEmojiAvatarValue } from '@/utils/emojiAvatar';

interface Props {
  unreadCount: number;
}

/** Bare glyph control: no filled box, just the hairline rail it sits on. */
const railBtn = cn(
  'flex h-11 w-11 items-center justify-center rounded-md text-muted-foreground',
  'transition-[color,background-color,transform] duration-fast ease-out',
  'hover:bg-foreground/[0.05] hover:text-foreground',
  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
);

function AvatarGlyph() {
  const { user, username, profile } = useAuth();
  if (!user) return <User className="h-5 w-5" aria-hidden />;

  const url = profile?.avatar_url;
  if (url && url.startsWith('http')) {
    return <img src={url} alt="" className="h-full w-full object-cover" />;
  }
  if (url && isEmojiAvatarValue(url)) {
    const emoji = getAppleEmojiUrl(url);
    if (emoji) return <img src={emoji} alt="" className="h-6 w-6 object-contain" />;
  }
  return (
    <img
      src={getDefaultAvatarForUser(username || 'U')}
      alt=""
      className="h-full w-full object-cover"
    />
  );
}

function PortalHeaderImpl({ unreadCount }: Props) {
  const navigate = useNavigate();
  const { theme, setTheme } = useApp();
  const { user, username } = useAuth();
  const isDark = theme === 'dark';
  const [lifted, setLifted] = useState(false);

  useEffect(() => {
    const onScroll = () => setLifted(window.scrollY > 4);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  return (
    <header
      className={cn(
        'sticky top-0 z-header flex h-14 items-center gap-1 px-4',
        'transition-[background-color,border-color,backdrop-filter] duration-normal ease-out',
        lifted
          ? 'border-b border-border/50 bg-background/72 backdrop-blur-xl backdrop-saturate-150'
          : 'border-b border-transparent bg-transparent',
      )}
    >
      <span className="flex items-center gap-2.5">
        {/* Brand mark: a copper hairline square with an inset copper block —
            the same two materials the plates below are milled from. */}
        <span
          className="flex h-6 w-6 items-center justify-center rounded-sm border border-primary/55"
          aria-hidden
        >
          <span className="h-1.5 w-1.5 rounded-[1px] bg-primary" />
        </span>
        <span className="font-display text-lg leading-none tracking-[0.06em] text-foreground">
          amv<span className="text-primary">.</span>life
        </span>
      </span>

      <span className="ms-auto flex items-center gap-0.5">
        <button
          type="button"
          className={railBtn}
          onClick={openCommandPalette}
          aria-label="بحث سريع في التطبيق"
        >
          <Search className="h-[1.15rem] w-[1.15rem]" aria-hidden />
        </button>

        <button
          type="button"
          className={railBtn}
          onClick={() => setTheme(isDark ? 'light' : 'dark')}
          aria-label={isDark ? 'التبديل إلى الوضع النهاري' : 'التبديل إلى الوضع الليلي'}
        >
          {isDark ? (
            <Moon className="h-[1.15rem] w-[1.15rem]" aria-hidden />
          ) : (
            <Sun className="h-[1.15rem] w-[1.15rem]" aria-hidden />
          )}
        </button>

        {user && (
          <button
            type="button"
            onClick={() => navigate('/chat')}
            onMouseEnter={() => prefetchRoute('/chat')}
            aria-label={unreadCount > 0 ? `المحادثات، ${unreadCount} غير مقروء` : 'المحادثات'}
            className={cn(railBtn, 'relative')}
          >
            <MessageCircle className="h-[1.15rem] w-[1.15rem]" aria-hidden />
            {unreadCount > 0 && (
              <span
                className="absolute top-2 end-2 flex min-w-[17px] items-center justify-center rounded-full bg-primary px-1 text-micro font-bold tabular-nums text-primary-foreground"
                aria-hidden
              >
                {unreadCount > 99 ? '٩٩+' : unreadCount}
              </span>
            )}
          </button>
        )}

        {/* Hairline rail divider: separates navigation glyphs from identity. */}
        <span className="mx-1.5 h-5 w-px bg-border/60" aria-hidden />

        {/* Live commitment streak — sits beside the identity cluster. */}
        {user && <StreakFlameBadge />}

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button
              type="button"
              aria-label="الحساب والإعدادات"
              className={cn(
                'flex h-9 w-9 items-center justify-center overflow-hidden rounded-full',
                'border border-primary/40 text-foreground',
                'transition-[border-color,box-shadow] duration-normal ease-out',
                'hover:border-primary/70 hover:shadow-[0_0_0_3px_hsl(var(--primary)/0.12)]',
                'data-[state=open]:border-primary/80 data-[state=open]:shadow-[0_0_0_3px_hsl(var(--primary)/0.16)]',
                'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
              )}
            >
              <AvatarGlyph />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent
            align="end"
            sideOffset={8}
            className="arch-plate min-w-[16rem] rounded-lg border-0 p-1.5"
          >
            <DropdownMenuLabel className="flex items-center gap-3 px-2 py-2.5 font-normal">
              <span className="flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-full border border-primary/35">
                <AvatarGlyph />
              </span>
              <span className="min-w-0">
                <span className="arch-eyebrow block">{user ? 'الحساب' : 'زائر'}</span>
                <span className="mt-0.5 block truncate font-display text-base leading-tight text-foreground">
                  {user ? username || user.email : 'بدون حساب'}
                </span>
              </span>
            </DropdownMenuLabel>
            <DropdownMenuSeparator className="mx-2 bg-border/50" />
            {user ? (
              <>
                <DropdownMenuItem
                  onSelect={() => navigate('/profile')}
                  onMouseEnter={() => prefetchRoute('/profile')}
                  className={
                    'group flex h-11 items-center gap-3 rounded-md px-2 text-meta text-foreground focus:bg-foreground/[0.06] focus:text-foreground'
                  }
                >
                  <User
                    className={
                      'h-[1.05rem] w-[1.05rem] text-muted-foreground transition-colors group-focus:text-primary'
                    }
                    aria-hidden
                  />
                  الملف الشخصي
                </DropdownMenuItem>
                <DropdownMenuItem
                  onSelect={() => navigate('/settings')}
                  onMouseEnter={() => prefetchRoute('/settings')}
                  className={
                    'group flex h-11 items-center gap-3 rounded-md px-2 text-meta text-foreground focus:bg-foreground/[0.06] focus:text-foreground'
                  }
                >
                  <Settings
                    className={
                      'h-[1.05rem] w-[1.05rem] text-muted-foreground transition-colors group-focus:text-primary'
                    }
                    aria-hidden
                  />
                  الإعدادات
                </DropdownMenuItem>
                <DropdownMenuItem
                  onSelect={() => navigate('/settings/appearance')}
                  onMouseEnter={() => prefetchRoute('/settings/appearance')}
                  className={
                    'group flex h-11 items-center gap-3 rounded-md px-2 text-meta text-foreground focus:bg-foreground/[0.06] focus:text-foreground'
                  }
                >
                  <Grid3X3
                    className={
                      'h-[1.05rem] w-[1.05rem] text-muted-foreground transition-colors group-focus:text-primary'
                    }
                    aria-hidden
                  />
                  السمة والألوان
                </DropdownMenuItem>
              </>
            ) : (
              <>
                <DropdownMenuItem
                  onSelect={() => navigate('/auth')}
                  onMouseEnter={() => prefetchRoute('/auth')}
                  className={
                    'group flex h-11 items-center gap-3 rounded-md px-2 text-meta text-foreground focus:bg-foreground/[0.06] focus:text-foreground'
                  }
                >
                  <LogIn
                    className={
                      'h-[1.05rem] w-[1.05rem] text-muted-foreground transition-colors group-focus:text-primary'
                    }
                    aria-hidden
                  />
                  تسجيل الدخول
                </DropdownMenuItem>
                <DropdownMenuItem
                  onSelect={() => navigate('/settings')}
                  onMouseEnter={() => prefetchRoute('/settings')}
                  className={
                    'group flex h-11 items-center gap-3 rounded-md px-2 text-meta text-foreground focus:bg-foreground/[0.06] focus:text-foreground'
                  }
                >
                  <Settings
                    className={
                      'h-[1.05rem] w-[1.05rem] text-muted-foreground transition-colors group-focus:text-primary'
                    }
                    aria-hidden
                  />
                  الإعدادات
                </DropdownMenuItem>
              </>
            )}
          </DropdownMenuContent>
        </DropdownMenu>
      </span>
    </header>
  );
}

export const PortalHeader = memo(PortalHeaderImpl);
export default PortalHeader;
