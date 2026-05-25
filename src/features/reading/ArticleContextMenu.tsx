import { ReactNode } from 'react';
import {
  Bookmark, BookmarkCheck, ChevronsDown, ChevronsUp, Circle,
  CircleCheck, Copy, ExternalLink, Share2,
} from 'lucide-react';
import { toast } from 'sonner';
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuSeparator,
  ContextMenuTrigger,
} from '@/components/ui/context-menu';
import type { FeedItem } from './types';
import { safeHref } from './utils';

/**
 * Long-press / right-click menu for article rows.
 *
 * Borrowed from ReadYou and CapyReader — both apps surface "Mark all
 * above / below as read" as primary affordances because in practice
 * users pick a stopping point in the timeline rather than tapping
 * each article. Exposing them via a context menu (and never via a
 * primary button) keeps the list visually clean while making the
 * power-user actions one gesture away.
 *
 * On touch devices, Radix's ContextMenu opens after the browser
 * fires `contextmenu` (long-press, ~500 ms). On desktop it opens
 * on right-click. No custom long-press handling needed.
 *
 * The trigger renders the row's own contents — wrap any element
 * (the article card, a list row, etc.) and the menu attaches to it.
 */
export function ArticleContextMenu({
  article,
  isRead,
  isBookmarked,
  isAr,
  hasAbove,
  hasBelow,
  children,
  onMarkRead,
  onMarkUnread,
  onMarkAboveRead,
  onMarkBelowRead,
  onToggleBookmark,
}: {
  article: FeedItem;
  isRead: boolean;
  isBookmarked: boolean;
  isAr: boolean;
  /** Whether there are any rows above this one in the *visible* list. */
  hasAbove: boolean;
  /** Whether there are any rows below this one in the *visible* list. */
  hasBelow: boolean;
  children: ReactNode;
  onMarkRead: () => void;
  onMarkUnread: () => void;
  onMarkAboveRead: () => void;
  onMarkBelowRead: () => void;
  onToggleBookmark: () => void;
}) {
  const link = safeHref(article.link);
  const hasShare = typeof navigator !== 'undefined' && !!navigator.share;

  const onCopyLink = async () => {
    try {
      if (typeof navigator !== 'undefined' && navigator.clipboard) {
        await navigator.clipboard.writeText(article.link);
        toast.success(isAr ? 'تم نسخ الرابط' : 'Link copied');
      } else {
        // Fallback for older browsers / insecure contexts
        const ta = document.createElement('textarea');
        ta.value = article.link;
        ta.style.position = 'fixed';
        ta.style.opacity = '0';
        document.body.appendChild(ta);
        ta.select();
        try { document.execCommand('copy'); } finally { document.body.removeChild(ta); }
        toast.success(isAr ? 'تم نسخ الرابط' : 'Link copied');
      }
    } catch {
      toast.error(isAr ? 'تعذّر النسخ' : 'Copy failed');
    }
  };

  const onShare = async () => {
    if (!navigator.share) return;
    try {
      await navigator.share({
        title: article.title,
        text: article.title,
        url: article.link,
      });
    } catch {
      /* user cancelled — silent */
    }
  };

  const onOpenOriginal = () => {
    if (link === '#') return;
    window.open(link, '_blank', 'noopener,noreferrer');
  };

  return (
    <ContextMenu>
      <ContextMenuTrigger asChild>
        {children}
      </ContextMenuTrigger>
      <ContextMenuContent className="w-56">
        {isRead
          ? (
            <ContextMenuItem onClick={onMarkUnread}>
              <Circle className="h-3.5 w-3.5 me-2" />
              {isAr ? 'وضع كغير مقروء' : 'Mark as unread'}
            </ContextMenuItem>
          )
          : (
            <ContextMenuItem onClick={onMarkRead}>
              <CircleCheck className="h-3.5 w-3.5 me-2" />
              {isAr ? 'وضع كمقروء' : 'Mark as read'}
            </ContextMenuItem>
          )}
        {hasAbove && (
          <ContextMenuItem onClick={onMarkAboveRead}>
            <ChevronsUp className="h-3.5 w-3.5 me-2" />
            {isAr ? 'تحديد ما فوقه كمقروء' : 'Mark above as read'}
          </ContextMenuItem>
        )}
        {hasBelow && (
          <ContextMenuItem onClick={onMarkBelowRead}>
            <ChevronsDown className="h-3.5 w-3.5 me-2" />
            {isAr ? 'تحديد ما تحته كمقروء' : 'Mark below as read'}
          </ContextMenuItem>
        )}
        <ContextMenuSeparator />
        <ContextMenuItem onClick={onToggleBookmark}>
          {isBookmarked
            ? <BookmarkCheck className="h-3.5 w-3.5 me-2 text-primary" />
            : <Bookmark className="h-3.5 w-3.5 me-2" />}
          {isBookmarked
            ? (isAr ? 'إزالة من المحفوظات' : 'Remove bookmark')
            : (isAr ? 'حفظ' : 'Bookmark')}
        </ContextMenuItem>
        <ContextMenuSeparator />
        <ContextMenuItem onClick={onOpenOriginal} disabled={link === '#'}>
          <ExternalLink className="h-3.5 w-3.5 me-2" />
          {isAr ? 'فتح في المتصفّح' : 'Open original'}
        </ContextMenuItem>
        <ContextMenuItem onClick={onCopyLink}>
          <Copy className="h-3.5 w-3.5 me-2" />
          {isAr ? 'نسخ الرابط' : 'Copy link'}
        </ContextMenuItem>
        {hasShare && (
          <ContextMenuItem onClick={onShare}>
            <Share2 className="h-3.5 w-3.5 me-2" />
            {isAr ? 'مشاركة' : 'Share'}
          </ContextMenuItem>
        )}
      </ContextMenuContent>
    </ContextMenu>
  );
}
