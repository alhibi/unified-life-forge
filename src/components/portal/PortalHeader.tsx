/**
 * PortalHeader — the launcher's sticky top bar.
 *
 * Uses the shared `.app-sticky-header` chrome (opaque background + hairline)
 * and the shared DropdownMenu primitive for the account menu. The previous
 * portal hand-rolled a popover with its own outside-click and Escape handling,
 * which meant it did not participate in the app's focus-trap or scroll-lock
 * contracts and could be left open behind a navigation.
 */
import { memo } from 'react';
import { useNavigate } from 'react-router-dom';

import { openCommandPalette } from '@/components/CommandPalette';
import { IconButton } from '@/components/ui/app-shell';
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
  return <img src={getDefaultAvatarForUser(username || 'U')} alt="" className="h-full w-full object-cover" />;
}

function PortalHeaderImpl({ unreadCount }: Props) {
  const navigate = useNavigate();
  const { theme, setTheme } = useApp();
  const { user, username } = useAuth();
  const isDark = theme === 'dark';

  return (
    <header className="app-sticky-header z-header flex h-14 items-center gap-1 px-4">
      <span className="flex items-center gap-2.5">
        {/* Brand mark: a 24px rounded square with an inset block. Flat, no
            gradient — the wordmark carries the identity. */}
        <span
          className="flex h-6 w-6 items-center justify-center rounded-sm border-[1.5px] border-foreground"
          aria-hidden
        >
          <span className="h-2 w-2 rounded-[2px] bg-foreground" />
        </span>
        <span className="text-meta font-extrabold tracking-[0.14em] text-foreground">AMV.LIFE</span>
      </span>

      <span className="ms-auto flex items-center gap-1">
        <IconButton onClick={openCommandPalette} aria-label="بحث سريع في التطبيق">
          <Search className="h-5 w-5" aria-hidden />
        </IconButton>

        <IconButton
          onClick={() => setTheme(isDark ? 'light' : 'dark')}
          aria-label={isDark ? 'التبديل إلى الوضع النهاري' : 'التبديل إلى الوضع الليلي'}
        >
          {isDark ? <Moon className="h-5 w-5" aria-hidden /> : <Sun className="h-5 w-5" aria-hidden />}
        </IconButton>

        {user && (
          <IconButton
            onClick={() => navigate('/chat')}
            onMouseEnter={() => prefetchRoute('/chat')}
            aria-label={unreadCount > 0 ? `المحادثات، ${unreadCount} غير مقروء` : 'المحادثات'}
            className="relative"
          >
            <MessageCircle className="h-5 w-5" aria-hidden />
            {unreadCount > 0 && (
              <span
                className="absolute top-1.5 end-1.5 flex min-w-[18px] items-center justify-center rounded-full bg-primary px-1 text-micro font-bold tabular-nums text-primary-foreground"
                aria-hidden
              >
                {unreadCount > 99 ? '٩٩+' : unreadCount}
              </span>
            )}
          </IconButton>
        )}

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button
              type="button"
              aria-label="الحساب والإعدادات"
              className={cn(
                'flex h-11 w-11 items-center justify-center overflow-hidden rounded-full',
                'border border-border text-foreground',
                'transition-colors duration-fast hover:bg-muted',
                'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
              )}
            >
              <AvatarGlyph />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="min-w-[220px]">
            <DropdownMenuLabel className="text-mini font-normal text-muted-foreground">
              {user ? 'مسجّل الدخول باسم' : 'زائر'}
              <span className="mt-0.5 block truncate text-meta font-semibold text-foreground">
                {user ? username || user.email : 'بدون حساب'}
              </span>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            {user ? (
              <>
                <DropdownMenuItem onSelect={() => navigate('/profile')}>
                  <User className="h-4 w-4" aria-hidden />
                  الملف الشخصي
                </DropdownMenuItem>
                <DropdownMenuItem onSelect={() => navigate('/settings')}>
                  <Settings className="h-4 w-4" aria-hidden />
                  الإعدادات
                </DropdownMenuItem>
                <DropdownMenuItem onSelect={() => navigate('/settings/theme')}>
                  <Grid3X3 className="h-4 w-4" aria-hidden />
                  السمة والألوان
                </DropdownMenuItem>
              </>
            ) : (
              <>
                <DropdownMenuItem onSelect={() => navigate('/auth')}>
                  <LogIn className="h-4 w-4" aria-hidden />
                  تسجيل الدخول
                </DropdownMenuItem>
                <DropdownMenuItem onSelect={() => navigate('/settings')}>
                  <Settings className="h-4 w-4" aria-hidden />
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
