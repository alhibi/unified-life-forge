import { memo } from 'react';

import {
  CheckSquare,
  Clipboard,
  Columns,
  Copy,
  CopyCheck,
  CornerUpLeft,
  Heart,
  Palette,
  Scissors,
  Smile,
  Sparkles,
  Wand2,
} from '@/lib/icons';
import { haptics } from '@/lib/native';
import { cn } from '@/lib/utils';

export interface ToolBarProps {
  suggestions: string[];
  onSelectSuggestion: (word: string) => void;
  activePanel: 'none' | 'clipboard' | 'emoji' | 'settings' | 'islamic';
  setActivePanel: (panel: 'none' | 'clipboard' | 'emoji' | 'settings' | 'islamic') => void;
  oneHandedMode: 'off' | 'left' | 'right';
  setOneHandedMode: (mode: 'off' | 'left' | 'right') => void;
  onTashkeelToggle?: () => void;
  hasSelection?: boolean;
  onCut?: () => void;
  onCopy?: () => void;
  onPaste?: () => void;
  onSelectAll?: () => void;
  canUndo?: boolean;
  onUndo?: () => void;
}

/**
 * Gboard-style top action bar. Features smart word suggestion chips & quick tool toggles.
 */
export const ToolBar = memo(function ToolBar({
  suggestions,
  onSelectSuggestion,
  activePanel,
  setActivePanel,
  oneHandedMode,
  setOneHandedMode,
  hasSelection = false,
  onCut,
  onCopy,
  onPaste,
  onSelectAll,
  canUndo = false,
  onUndo,
}: ToolBarProps) {
  return (
    <div className="mb-1.5 flex h-9 items-center gap-1 border-b border-border/30 px-1 text-muted-foreground">
      {/* Selection Toolbar OR Smart Suggestions Bar */}
      <div className="flex min-w-0 flex-1 items-center gap-1.5 overflow-x-auto no-scrollbar">
        {hasSelection ? (
          <div className="flex items-center gap-1" dir="rtl">
            {onCut && (
              <button
                type="button"
                onPointerDown={(e) => {
                  e.preventDefault();
                  onCut();
                  haptics('selection');
                }}
                className="flex h-7 items-center gap-1 rounded-lg bg-[hsl(var(--live))]/15 px-2 text-micro font-medium text-[hsl(var(--live))] active:scale-95 hover:bg-[hsl(var(--live))]/25"
              >
                <Scissors className="h-3.5 w-3.5" aria-hidden="true" />
                <span>قص</span>
              </button>
            )}
            {onCopy && (
              <button
                type="button"
                onPointerDown={(e) => {
                  e.preventDefault();
                  onCopy();
                  haptics('selection');
                }}
                className="flex h-7 items-center gap-1 rounded-lg bg-[hsl(var(--surface-2))] px-2 text-micro font-medium text-foreground active:scale-95 hover:bg-[hsl(var(--surface-3))]"
              >
                <Copy className="h-3.5 w-3.5" aria-hidden="true" />
                <span>نسخ</span>
              </button>
            )}
            {onPaste && (
              <button
                type="button"
                onPointerDown={(e) => {
                  e.preventDefault();
                  onPaste();
                  haptics('selection');
                }}
                className="flex h-7 items-center gap-1 rounded-lg bg-[hsl(var(--surface-2))] px-2 text-micro font-medium text-foreground active:scale-95 hover:bg-[hsl(var(--surface-3))]"
              >
                <CopyCheck className="h-3.5 w-3.5" aria-hidden="true" />
                <span>لصق</span>
              </button>
            )}
            {onSelectAll && (
              <button
                type="button"
                onPointerDown={(e) => {
                  e.preventDefault();
                  onSelectAll();
                  haptics('selection');
                }}
                className="flex h-7 items-center gap-1 rounded-lg bg-[hsl(var(--surface-2))] px-2 text-micro font-medium text-foreground active:scale-95 hover:bg-[hsl(var(--surface-3))]"
              >
                <CheckSquare className="h-3.5 w-3.5" aria-hidden="true" />
                <span>تحديد الكل</span>
              </button>
            )}
          </div>
        ) : (
          <>
            {canUndo && onUndo && (
              <button
                type="button"
                title="تراجع"
                aria-label="تراجع عن آخر إدخال"
                onPointerDown={(e) => {
                  e.preventDefault();
                  onUndo();
                  haptics('selection');
                }}
                className="flex h-7 shrink-0 items-center gap-1 rounded-lg bg-[hsl(var(--live))]/15 px-2 text-micro font-semibold text-[hsl(var(--live))] active:scale-95 hover:bg-[hsl(var(--live))]/25"
              >
                <CornerUpLeft className="h-3.5 w-3.5" aria-hidden="true" />
                <span>تراجع</span>
              </button>
            )}

            {suggestions.length > 0 ? (
              suggestions.map((word, idx) => (
                <button
                  key={idx}
                  type="button"
                  onPointerDown={(e) => {
                    e.preventDefault();
                    onSelectSuggestion(word);
                    haptics('selection');
                  }}
                  className="flex h-7 shrink-0 items-center gap-1 rounded-lg bg-[hsl(var(--surface-2))]/80 px-2.5 text-mini font-medium text-foreground transition-all active:scale-95 active:bg-[hsl(var(--live))] active:text-white"
                >
                  <Sparkles className="h-3 w-3 text-[hsl(var(--live))]" aria-hidden="true" />
                  <span>{word}</span>
                </button>
              ))
            ) : (
              <div className="flex items-center gap-1.5 px-2 text-micro text-muted-foreground/70">
                <Wand2 className="h-3.5 w-3.5" aria-hidden="true" />
                <span>لوحة المفاتيح الذكية جاهزة...</span>
              </div>
            )}
          </>
        )}
      </div>

      {/* Quick Access Tools */}
      <div className="flex shrink-0 items-center gap-0.5">
        <button
          type="button"
          title="رموز إسلامية"
          aria-label="رموز إسلامية"
          onPointerDown={(e) => {
            e.preventDefault();
            setActivePanel(activePanel === 'islamic' ? 'none' : 'islamic');
            haptics('selection');
          }}
          className={cn(
            'flex h-7 w-7 items-center justify-center rounded-lg transition-colors active:scale-90',
            activePanel === 'islamic' ? 'bg-[hsl(var(--live))]/20 text-[hsl(var(--live))]' : 'hover:bg-[hsl(var(--surface-2))]',
          )}
        >
          <Heart className="h-4 w-4" aria-hidden="true" />
        </button>

        <button
          type="button"
          title="الإموجي والملصقات"
          aria-label="الإموجي والملصقات"
          onPointerDown={(e) => {
            e.preventDefault();
            setActivePanel(activePanel === 'emoji' ? 'none' : 'emoji');
            haptics('selection');
          }}
          className={cn(
            'flex h-7 w-7 items-center justify-center rounded-lg transition-colors active:scale-90',
            activePanel === 'emoji' ? 'bg-[hsl(var(--live))]/20 text-[hsl(var(--live))]' : 'hover:bg-[hsl(var(--surface-2))]',
          )}
        >
          <Smile className="h-4 w-4" aria-hidden="true" />
        </button>

        <button
          type="button"
          title="حافظة النصوص"
          aria-label="حافظة النصوص"
          onPointerDown={(e) => {
            e.preventDefault();
            setActivePanel(activePanel === 'clipboard' ? 'none' : 'clipboard');
            haptics('selection');
          }}
          className={cn(
            'flex h-7 w-7 items-center justify-center rounded-lg transition-colors active:scale-90',
            activePanel === 'clipboard' ? 'bg-[hsl(var(--live))]/20 text-[hsl(var(--live))]' : 'hover:bg-[hsl(var(--surface-2))]',
          )}
        >
          <Clipboard className="h-4 w-4" aria-hidden="true" />
        </button>

        <button
          type="button"
          title="وضع اليد الواحدة"
          aria-label="وضع اليد الواحدة"
          onPointerDown={(e) => {
            e.preventDefault();
            const next = oneHandedMode === 'off' ? 'right' : oneHandedMode === 'right' ? 'left' : 'off';
            setOneHandedMode(next);
            haptics('selection');
          }}
          className={cn(
            'flex h-7 w-7 items-center justify-center rounded-lg transition-colors active:scale-90',
            oneHandedMode !== 'off' ? 'bg-[hsl(var(--live))]/20 text-[hsl(var(--live))]' : 'hover:bg-[hsl(var(--surface-2))]',
          )}
        >
          <Columns className="h-4 w-4" aria-hidden="true" />
        </button>

        <button
          type="button"
          title="تخصيص المظهر والإعدادات"
          aria-label="تخصيص المظهر والإعدادات"
          onPointerDown={(e) => {
            e.preventDefault();
            setActivePanel(activePanel === 'settings' ? 'none' : 'settings');
            haptics('selection');
          }}
          className={cn(
            'flex h-7 w-7 items-center justify-center rounded-lg transition-colors active:scale-90',
            activePanel === 'settings' ? 'bg-[hsl(var(--live))]/20 text-[hsl(var(--live))]' : 'hover:bg-[hsl(var(--surface-2))]',
          )}
        >
          <Palette className="h-4 w-4" aria-hidden="true" />
        </button>
      </div>
    </div>
  );
});
