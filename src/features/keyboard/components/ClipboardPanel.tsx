import { memo, useEffect, useState } from 'react';

import { Check, Pin, Trash2, X } from '@/lib/icons';
import { haptics } from '@/lib/native';
import { cn } from '@/lib/utils';

import {
  clearUnpinnedClipboard,
  deleteClipboardItem,
  getClipboardHistory,
  type ClipboardItem,
  togglePinClipboardItem,
} from '../lib/clipboard';

interface ClipboardPanelProps {
  onInsertText: (text: string) => void;
  onClose: () => void;
}

/**
 * Integrated Clipboard Manager Panel.
 * Shows pinned and recently copied items for fast typing.
 */
export const ClipboardPanel = memo(function ClipboardPanel({
  onInsertText,
  onClose,
}: ClipboardPanelProps) {
  const [items, setItems] = useState<ClipboardItem[]>(() => getClipboardHistory());

  useEffect(() => {
    const handler = (e: Event) => {
      setItems((e as CustomEvent<ClipboardItem[]>).detail);
    };
    window.addEventListener('soft-keyboard-clipboard-updated', handler);
    return () => window.removeEventListener('soft-keyboard-clipboard-updated', handler);
  }, []);

  return (
    <div className="flex h-52 w-full flex-col border-t border-border/40 bg-[hsl(var(--surface-1))]/95 p-2 backdrop-blur-xl">
      {/* Header */}
      <div className="mb-2 flex items-center justify-between border-b border-border/30 pb-1.5 px-1">
        <div className="flex items-center gap-2">
          <span className="text-mini font-semibold text-foreground">حافظة النصوص</span>
          <span className="rounded-full bg-[hsl(var(--surface-2))] px-2 py-0.5 text-micro text-muted-foreground">
            {items.length} عنصر
          </span>
        </div>
        <div className="flex items-center gap-1">
          {items.some((i) => !i.pinned) && (
            <button
              type="button"
              onClick={() => {
                clearUnpinnedClipboard();
                haptics('selection');
              }}
              className="flex items-center gap-1 rounded-lg px-2 py-1 text-micro text-muted-foreground hover:bg-[hsl(var(--surface-2))] hover:text-foreground"
            >
              <Trash2 className="h-3.5 w-3.5" aria-hidden="true" />
              <span>مسح الغير مثبت</span>
            </button>
          )}
          <button
            type="button"
            onClick={onClose}
            className="flex h-7 w-7 items-center justify-center rounded-lg text-muted-foreground hover:bg-[hsl(var(--surface-2))]"
          >
            <X className="h-4 w-4" aria-hidden="true" />
          </button>
        </div>
      </div>

      {/* Snippets List */}
      <div className="flex-1 overflow-y-auto space-y-1.5 pe-1">
        {items.length === 0 ? (
          <div className="flex h-32 flex-col items-center justify-center text-center text-muted-foreground">
            <p className="text-mini">الحافظة فارغة حالياً</p>
            <p className="text-micro opacity-70">أي نص تقوم بنسخه يظهر هنا للوصول السريع</p>
          </div>
        ) : (
          items.map((item) => (
            <div
              key={item.id}
              className={cn(
                'group flex items-center justify-between gap-2 rounded-xl border p-2.5 transition-all',
                item.pinned
                  ? 'border-[hsl(var(--live))]/40 bg-[hsl(var(--live))]/10'
                  : 'border-border/30 bg-[hsl(var(--surface-2))]/60 hover:bg-[hsl(var(--surface-2))]',
              )}
            >
              <button
                type="button"
                onPointerDown={(e) => {
                  e.preventDefault();
                  onInsertText(item.text);
                  haptics('selection');
                }}
                className="flex-1 text-start text-mini text-foreground line-clamp-2 leading-tight"
              >
                {item.text}
              </button>

              <div className="flex items-center gap-1 shrink-0">
                <button
                  type="button"
                  onClick={() => {
                    togglePinClipboardItem(item.id);
                    haptics('selection');
                  }}
                  className={cn(
                    'flex h-7 w-7 items-center justify-center rounded-lg transition-colors',
                    item.pinned
                      ? 'text-[hsl(var(--live))] bg-[hsl(var(--live))]/20'
                      : 'text-muted-foreground hover:bg-background/40',
                  )}
                  title={item.pinned ? 'إلغاء التثبيت' : 'تثبيت'}
                >
                  <Pin className="h-3.5 w-3.5" aria-hidden="true" />
                </button>
                <button
                  type="button"
                  onClick={() => {
                    deleteClipboardItem(item.id);
                    haptics('selection');
                  }}
                  className="flex h-7 w-7 items-center justify-center rounded-lg text-muted-foreground hover:bg-destructive/20 hover:text-destructive"
                  title="حذف"
                >
                  <Trash2 className="h-3.5 w-3.5" aria-hidden="true" />
                </button>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
});
