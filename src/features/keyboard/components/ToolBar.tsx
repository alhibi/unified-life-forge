import { memo, useCallback, useRef, useState } from 'react';

import { Button } from '@/components/ui/button';
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
import { cn } from '@/lib/utils';

import { chromeFeedback } from '../lib/feedback';

export interface ToolBarProps {
  suggestions: string[];
  onSelectSuggestion: (word: string) => void;
  /** Long-press a chip to drop a word the keyboard learned by mistake. */
  onForgetSuggestion?: (word: string) => void;
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
 * One suggestion chip. A tap accepts the word; a long press offers to forget
 * it — the escape hatch that keeps a learning dictionary from slowly filling
 * with typos over months of use.
 */
const SuggestionChip = memo(function SuggestionChip({
  word,
  onSelect,
  onForget,
}: {
  word: string;
  onSelect: (word: string) => void;
  onForget?: (word: string) => void;
}) {
  const holdRef = useRef<number | undefined>(undefined);
  const [confirming, setConfirming] = useState(false);

  const clear = useCallback(() => {
    if (holdRef.current) window.clearTimeout(holdRef.current);
    holdRef.current = undefined;
  }, []);

  if (confirming) {
    return (
      <Button
        variant="ghost"
        activation="click"
        type="button"
        onPointerDown={(e) => {
          e.preventDefault();
          onForget?.(word);
          setConfirming(false);
        }}
        onClick={(e) => {
          if (e.detail === 0) {
            onForget?.(word);
            setConfirming(false);
          }
        }}
        onPointerLeave={() => setConfirming(false)}
        className="flex h-11 shrink-0 items-center gap-1 rounded-lg bg-destructive/15 px-2.5 text-mini font-medium text-destructive"
      >
        <span>نسيان «{word}»؟</span>
      </Button>
    );
  }

  return (
    <Button
      variant="ghost"
      activation="click"
      type="button"
      onPointerDown={(e) => {
        e.preventDefault();
        if (onForget) {
          holdRef.current = window.setTimeout(() => {
            holdRef.current = undefined;
            setConfirming(true);
            chromeFeedback();
          }, 500);
        }
      }}
      onPointerUp={(e) => {
        e.preventDefault();
        if (!onForget || holdRef.current) {
          clear();
          onSelect(word);
          chromeFeedback();
        }
      }}
      onClick={(e) => {
        if (e.detail === 0) {
          onSelect(word);
          chromeFeedback();
        }
      }}
      onPointerCancel={clear}
      onPointerLeave={clear}
      className="flex h-11 shrink-0 items-center gap-1 rounded-lg bg-[hsl(var(--surface-2))]/80 px-2.5 text-mini font-medium text-foreground transition-motion active:scale-95 active:bg-primary-container active:text-on-primary-container"
    >
      <Sparkles className="h-3 w-3 text-[hsl(var(--live))]" aria-hidden="true" />
      <span>{word}</span>
    </Button>
  );
});

/**
 * Gboard-style top action bar. Features smart word suggestion chips & quick tool toggles.
 */
export const ToolBar = memo(function ToolBar({
  suggestions,
  onSelectSuggestion,
  onForgetSuggestion,
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
    <div className="mb-1.5 flex min-h-11 flex-wrap items-center gap-1 border-b border-border/30 px-1 text-muted-foreground">
      {/* Selection Toolbar OR Smart Suggestions Bar */}
      <div className="flex min-w-0 flex-1 items-center gap-1.5 overflow-x-auto no-scrollbar">
        {hasSelection ? (
          <div className="flex items-center gap-1" dir="rtl">
            {onCut && (
              <Button
                variant="ghost"
                activation="click"
                type="button"
                onPointerDown={(e) => {
                  e.preventDefault();
                  onCut();
                  chromeFeedback();
                }}
                onClick={(e) => {
                  if (e.detail === 0) {
                    onCut();
                    chromeFeedback();
                  }
                }}
                className="flex h-11 items-center gap-1 rounded-lg bg-[hsl(var(--live))]/15 px-2 text-micro font-medium text-[hsl(var(--live))] active:scale-95 hover:bg-[hsl(var(--live))]/25"
              >
                <Scissors className="h-3.5 w-3.5" aria-hidden="true" />
                <span>قص</span>
              </Button>
            )}
            {onCopy && (
              <Button
                variant="ghost"
                activation="click"
                type="button"
                onPointerDown={(e) => {
                  e.preventDefault();
                  onCopy();
                  chromeFeedback();
                }}
                onClick={(e) => {
                  if (e.detail === 0) {
                    onCopy();
                    chromeFeedback();
                  }
                }}
                className="flex h-11 items-center gap-1 rounded-lg bg-[hsl(var(--surface-2))] px-2 text-micro font-medium text-foreground active:scale-95 hover:bg-[hsl(var(--surface-3))]"
              >
                <Copy className="h-3.5 w-3.5" aria-hidden="true" />
                <span>نسخ</span>
              </Button>
            )}
            {onPaste && (
              <Button
                variant="ghost"
                activation="click"
                type="button"
                onPointerDown={(e) => {
                  e.preventDefault();
                  onPaste();
                  chromeFeedback();
                }}
                onClick={(e) => {
                  if (e.detail === 0) {
                    onPaste();
                    chromeFeedback();
                  }
                }}
                className="flex h-11 items-center gap-1 rounded-lg bg-[hsl(var(--surface-2))] px-2 text-micro font-medium text-foreground active:scale-95 hover:bg-[hsl(var(--surface-3))]"
              >
                <CopyCheck className="h-3.5 w-3.5" aria-hidden="true" />
                <span>لصق</span>
              </Button>
            )}
            {onSelectAll && (
              <Button
                variant="ghost"
                activation="click"
                type="button"
                onPointerDown={(e) => {
                  e.preventDefault();
                  onSelectAll();
                  chromeFeedback();
                }}
                onClick={(e) => {
                  if (e.detail === 0) {
                    onSelectAll();
                    chromeFeedback();
                  }
                }}
                className="flex h-11 items-center gap-1 rounded-lg bg-[hsl(var(--surface-2))] px-2 text-micro font-medium text-foreground active:scale-95 hover:bg-[hsl(var(--surface-3))]"
              >
                <CheckSquare className="h-3.5 w-3.5" aria-hidden="true" />
                <span>تحديد الكل</span>
              </Button>
            )}
          </div>
        ) : (
          <>
            {canUndo && onUndo && (
              <Button
                variant="ghost"
                activation="click"
                type="button"
                title="تراجع"
                aria-label="تراجع عن آخر إدخال"
                onPointerDown={(e) => {
                  e.preventDefault();
                  onUndo();
                  chromeFeedback();
                }}
                onClick={(e) => {
                  if (e.detail === 0) {
                    onUndo();
                    chromeFeedback();
                  }
                }}
                className="flex h-11 shrink-0 items-center gap-1 rounded-lg bg-[hsl(var(--live))]/15 px-2 text-micro font-semibold text-[hsl(var(--live))] active:scale-95 hover:bg-[hsl(var(--live))]/25"
              >
                <CornerUpLeft className="h-3.5 w-3.5" aria-hidden="true" />
                <span>تراجع</span>
              </Button>
            )}

            {suggestions.length > 0 ? (
              suggestions.map((word, idx) => (
                <SuggestionChip
                  key={`${word}-${idx}`}
                  word={word}
                  onSelect={onSelectSuggestion}
                  onForget={onForgetSuggestion}
                />
              ))
            ) : (
              <div className="flex items-center gap-1.5 px-2 text-micro text-muted-foreground-subtle">
                <Wand2 className="h-3.5 w-3.5" aria-hidden="true" />
                <span>لوحة المفاتيح الذكية جاهزة...</span>
              </div>
            )}
          </>
        )}
      </div>

      {/* Quick Access Tools */}
      <div className="flex w-full shrink-0 items-center justify-end gap-0.5">
        <Button
          variant="ghost"
          activation="click"
          type="button"
          title="رموز إسلامية"
          aria-label="رموز إسلامية"
          onPointerDown={(e) => {
            e.preventDefault();
            setActivePanel(activePanel === 'islamic' ? 'none' : 'islamic');
            chromeFeedback();
          }}
          onClick={(e) => {
            if (e.detail === 0) {
              setActivePanel(activePanel === 'islamic' ? 'none' : 'islamic');
              chromeFeedback();
            }
          }}
          className={cn(
            'flex h-11 w-11 items-center justify-center rounded-lg transition-colors active:scale-90',
            activePanel === 'islamic'
              ? 'bg-[hsl(var(--live))]/20 text-[hsl(var(--live))]'
              : 'hover:bg-[hsl(var(--surface-2))]',
          )}
        >
          <Heart className="h-4 w-4" aria-hidden="true" />
        </Button>

        <Button
          variant="ghost"
          activation="click"
          type="button"
          title="الإموجي والملصقات"
          aria-label="الإموجي والملصقات"
          onPointerDown={(e) => {
            e.preventDefault();
            setActivePanel(activePanel === 'emoji' ? 'none' : 'emoji');
            chromeFeedback();
          }}
          onClick={(e) => {
            if (e.detail === 0) {
              setActivePanel(activePanel === 'emoji' ? 'none' : 'emoji');
              chromeFeedback();
            }
          }}
          className={cn(
            'flex h-11 w-11 items-center justify-center rounded-lg transition-colors active:scale-90',
            activePanel === 'emoji'
              ? 'bg-[hsl(var(--live))]/20 text-[hsl(var(--live))]'
              : 'hover:bg-[hsl(var(--surface-2))]',
          )}
        >
          <Smile className="h-4 w-4" aria-hidden="true" />
        </Button>

        <Button
          variant="ghost"
          activation="click"
          type="button"
          title="حافظة النصوص"
          aria-label="حافظة النصوص"
          onPointerDown={(e) => {
            e.preventDefault();
            setActivePanel(activePanel === 'clipboard' ? 'none' : 'clipboard');
            chromeFeedback();
          }}
          onClick={(e) => {
            if (e.detail === 0) {
              setActivePanel(activePanel === 'clipboard' ? 'none' : 'clipboard');
              chromeFeedback();
            }
          }}
          className={cn(
            'flex h-11 w-11 items-center justify-center rounded-lg transition-colors active:scale-90',
            activePanel === 'clipboard'
              ? 'bg-[hsl(var(--live))]/20 text-[hsl(var(--live))]'
              : 'hover:bg-[hsl(var(--surface-2))]',
          )}
        >
          <Clipboard className="h-4 w-4" aria-hidden="true" />
        </Button>

        <Button
          variant="ghost"
          activation="click"
          type="button"
          title="وضع اليد الواحدة"
          aria-label="وضع اليد الواحدة"
          onPointerDown={(e) => {
            e.preventDefault();
            const next =
              oneHandedMode === 'off' ? 'right' : oneHandedMode === 'right' ? 'left' : 'off';
            setOneHandedMode(next);
            chromeFeedback();
          }}
          onClick={(e) => {
            if (e.detail === 0) {
              const next =
                oneHandedMode === 'off' ? 'right' : oneHandedMode === 'right' ? 'left' : 'off';
              setOneHandedMode(next);
              chromeFeedback();
            }
          }}
          className={cn(
            'flex h-11 w-11 items-center justify-center rounded-lg transition-colors active:scale-90',
            oneHandedMode !== 'off'
              ? 'bg-[hsl(var(--live))]/20 text-[hsl(var(--live))]'
              : 'hover:bg-[hsl(var(--surface-2))]',
          )}
        >
          <Columns className="h-4 w-4" aria-hidden="true" />
        </Button>

        <Button
          variant="ghost"
          activation="click"
          type="button"
          title="تخصيص المظهر والإعدادات"
          aria-label="تخصيص المظهر والإعدادات"
          onPointerDown={(e) => {
            e.preventDefault();
            setActivePanel(activePanel === 'settings' ? 'none' : 'settings');
            chromeFeedback();
          }}
          onClick={(e) => {
            if (e.detail === 0) {
              setActivePanel(activePanel === 'settings' ? 'none' : 'settings');
              chromeFeedback();
            }
          }}
          className={cn(
            'flex h-11 w-11 items-center justify-center rounded-lg transition-colors active:scale-90',
            activePanel === 'settings'
              ? 'bg-[hsl(var(--live))]/20 text-[hsl(var(--live))]'
              : 'hover:bg-[hsl(var(--surface-2))]',
          )}
        >
          <Palette className="h-4 w-4" aria-hidden="true" />
        </Button>
      </div>
    </div>
  );
});
