import { memo, useEffect, useState } from 'react';

import { Check, Clipboard, Plus, RefreshCw, Search, Pin, Trash2, X } from '@/lib/icons';
import { haptics } from '@/lib/native';
import { cn } from '@/lib/utils';

import {
  clearUnpinnedClipboard,
  deleteClipboardItem,
  getClipboardHistory,
  saveToClipboardHistory,
  syncSystemClipboard,
  type ClipboardItem,
  togglePinClipboardItem,
} from '../lib/clipboard';

interface ClipboardPanelProps {
  onInsertText: (text: string) => void;
  onClose: () => void;
}

/**
 * Integrated Unlimited Clipboard Manager Panel.
 * Shows pinned and copied items with search and live sync.
 */
export const ClipboardPanel = memo(function ClipboardPanel({
  onInsertText,
  onClose,
}: ClipboardPanelProps) {
  const [items, setItems] = useState<ClipboardItem[]>(() => getClipboardHistory());
  const [searchQuery, setSearchQuery] = useState('');
  const [newItemText, setNewItemText] = useState('');
  const [showAddInput, setShowAddInput] = useState(false);

  useEffect(() => {
    const handler = (e: Event) => {
      setItems((e as CustomEvent<ClipboardItem[]>).detail);
    };
    window.addEventListener('soft-keyboard-clipboard-updated', handler);
    return () => window.removeEventListener('soft-keyboard-clipboard-updated', handler);
  }, []);

  const handleSyncSystem = async () => {
    haptics('selection');
    const updated = await syncSystemClipboard();
    setItems(updated);
  };

  const handleAddItem = () => {
    if (!newItemText.trim()) return;
    saveToClipboardHistory(newItemText.trim());
    setNewItemText('');
    setShowAddInput(false);
    haptics('selection');
  };

  const filteredItems = items.filter((item) =>
    item.text.toLowerCase().includes(searchQuery.toLowerCase()),
  );

  return (
    <div className="flex h-56 w-full flex-col border-t border-border/40 bg-[hsl(var(--surface-1))]/98 p-2 backdrop-blur-xl">
      {/* Top Header */}
      <div className="mb-2 flex items-center justify-between border-b border-border/30 pb-1.5 px-1">
        <div className="flex items-center gap-2">
          <Clipboard className="h-4 w-4 text-[hsl(var(--live))]" />
          <span className="text-mini font-semibold text-foreground">حافظة النصوص</span>
          <span className="rounded-full bg-[hsl(var(--surface-2))] px-2 py-0.5 text-micro text-muted-foreground">
            {items.length} عنصر
          </span>
        </div>

        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={() => setShowAddInput(!showAddInput)}
            className="flex items-center gap-1 rounded-lg px-2 py-1 text-micro text-muted-foreground hover:bg-[hsl(var(--surface-2))] hover:text-foreground"
            title="إضافة نص جديد للحافظة"
          >
            <Plus className="h-3.5 w-3.5" aria-hidden="true" />
            <span>إضافة</span>
          </button>

          <button
            type="button"
            onClick={handleSyncSystem}
            className="flex items-center gap-1 rounded-lg px-2 py-1 text-micro text-muted-foreground hover:bg-[hsl(var(--surface-2))] hover:text-foreground"
            title="مزامنة حافظة النظام"
          >
            <RefreshCw className="h-3.5 w-3.5" aria-hidden="true" />
            <span>مزامنة</span>
          </button>

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
              <span>مسح</span>
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

      {/* Manual Add Item Drawer Row */}
      {showAddInput && (
        <div className="mb-2 flex items-center gap-2 px-1">
          <input
            type="text"
            value={newItemText}
            onChange={(e) => setNewItemText(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleAddItem()}
            placeholder="اكتب نصاً جديداً لحفظه في الحافظة..."
            className="flex-1 rounded-xl border border-border/50 bg-[hsl(var(--surface-2))] px-3 py-1.5 text-mini text-foreground placeholder:text-muted-foreground/60 focus:outline-none focus:ring-1 focus:ring-[hsl(var(--live))]"
          />
          <button
            type="button"
            onClick={handleAddItem}
            className="rounded-xl bg-[hsl(var(--live))] px-3 py-1.5 text-mini font-semibold text-white active:scale-95 transition-transform"
          >
            حفظ
          </button>
        </div>
      )}

      {/* Search Input Bar */}
      {items.length > 5 && !showAddInput && (
        <div className="mb-2 relative px-1">
          <Search className="absolute right-3 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="بحث في الحافظة..."
            className="w-full rounded-xl border border-border/40 bg-[hsl(var(--surface-2))]/60 py-1.5 pr-8 pl-3 text-micro text-foreground placeholder:text-muted-foreground/60 focus:outline-none focus:ring-1 focus:ring-[hsl(var(--live))]"
          />
        </div>
      )}

      {/* Snippets List */}
      <div className="flex-1 overflow-y-auto space-y-1.5 pe-1">
        {filteredItems.length === 0 ? (
          <div className="flex h-28 flex-col items-center justify-center text-center text-muted-foreground">
            <p className="text-mini">
              {searchQuery ? 'لا توجد نتائج مطابقة للبحث' : 'الحافظة فارغة حالياً'}
            </p>
            <p className="text-micro opacity-70">
              {searchQuery
                ? 'جرب البحث بكلمة أخرى'
                : 'أي نص تقوم بنسخه سيظهر هنا مباشرة للوصول السريع'}
            </p>
          </div>
        ) : (
          filteredItems.map((item) => (
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
                className="flex-1 text-start text-mini text-foreground line-clamp-2 leading-tight font-medium"
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
