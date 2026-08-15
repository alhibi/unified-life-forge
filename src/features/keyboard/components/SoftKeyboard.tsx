import { motion } from 'framer-motion';
import { memo, useCallback, useEffect, useRef, useState } from 'react';

import {
  ArrowLeft,
  ArrowRight,
  ArrowUp,
  Backspace,
  ChevronDown,
  CornerDownLeft,
  Keyboard,
  Languages,
} from '@/lib/icons';
import { haptics } from '@/lib/native';
import { cn } from '@/lib/utils';

import {
  HARAKAT,
  isRtlLayout,
  type KeyDef,
  LAYOUT_ROWS,
  type LayoutId,
  QUICK_PUNCTUATION,
} from '../lib/layouts';

export interface SoftKeyboardProps {
  /** Insert a literal string at the caret. */
  onInsert: (text: string) => void;
  onBackspace: () => void;
  onBackspaceWord: () => void;
  onEnter: () => void;
  onMoveCaret: (delta: number) => void;
  /** Dismiss the keyboard (blurs the field). */
  onDone: () => void;
  /** Hand this field, and every future one, back to the OS keyboard. */
  onUseSystemKeyboard: () => void;
  /** Label of the primary action key — "إرسال" for composers, "تم" elsewhere. */
  enterLabel?: string;
  onHeightChange?: (height: number) => void;
}

const HOLD_START_MS = 320;
const HOLD_REPEAT_MS = 60;

/** One key. Acts on pointerdown so the glyph lands with zero perceived delay. */
const Key = memo(function Key({
  label,
  onPress,
  onHold,
  className,
  ariaLabel,
  span = 1,
  tone = 'letter',
  children,
}: {
  label?: string;
  onPress: () => void;
  onHold?: () => void;
  className?: string;
  ariaLabel?: string;
  span?: number;
  tone?: 'letter' | 'modifier' | 'accent';
  children?: React.ReactNode;
}) {
  const timers = useRef<{ start?: number; repeat?: number }>({});

  const clear = useCallback(() => {
    if (timers.current.start) window.clearTimeout(timers.current.start);
    if (timers.current.repeat) window.clearInterval(timers.current.repeat);
    timers.current = {};
  }, []);

  useEffect(() => clear, [clear]);

  return (
    <button
      type="button"
      aria-label={ariaLabel ?? label}
      // Keeping focus in the text field is the whole trick: without this the
      // field blurs on every keypress and the caret is lost.
      onPointerDown={(event) => {
        event.preventDefault();
        onPress();
        haptics('selection');
        if (!onHold) return;
        timers.current.start = window.setTimeout(() => {
          onHold();
          timers.current.repeat = window.setInterval(onHold, HOLD_REPEAT_MS);
        }, HOLD_START_MS);
      }}
      onPointerUp={clear}
      onPointerLeave={clear}
      onPointerCancel={clear}
      onContextMenu={(event) => event.preventDefault()}
      style={{ flexGrow: span, flexBasis: 0 }}
      className={cn(
        'relative flex h-[var(--kb-key-h)] min-w-0 select-none items-center justify-center rounded-[var(--r-md)]',
        'text-[1.0625rem] leading-none text-foreground transition-[transform,background-color,box-shadow] duration-100',
        'active:scale-[0.94] touch-none',
        tone === 'letter' &&
          'bg-[hsl(var(--surface-2))] shadow-[inset_0_1px_0_hsl(0_0%_100%/0.04),var(--shadow-1)]',
        tone === 'modifier' && 'bg-[hsl(var(--surface-1))] text-muted-foreground',
        tone === 'accent' && 'bg-[hsl(var(--live))] text-[hsl(var(--surface-0))] font-medium',
        className,
      )}
    >
      {children ?? label}
    </button>
  );
});

/**
 * The app's own on-screen keyboard.
 *
 * Arabic first (it is an Arabic-only product), with Latin, digits, symbols and a
 * dedicated diacritics page. Purely presentational: every mutation is delegated
 * to the provider, which owns the focused field.
 */
export default function SoftKeyboard({
  onInsert,
  onBackspace,
  onBackspaceWord,
  onEnter,
  onMoveCaret,
  onDone,
  onUseSystemKeyboard,
  enterLabel = 'تم',
  onHeightChange,
}: SoftKeyboardProps) {
  const [layout, setLayout] = useState<LayoutId>('ar');
  const [shift, setShift] = useState(false);
  const [caps, setCaps] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);

  // Publish our height so the app can keep the caret above the keyboard.
  useEffect(() => {
    const el = rootRef.current;
    if (!el || !onHeightChange) return;
    const report = () => onHeightChange(el.getBoundingClientRect().height);
    report();
    const observer = new ResizeObserver(report);
    observer.observe(el);
    return () => observer.disconnect();
  }, [onHeightChange]);

  const rows: KeyDef[][] =
    layout === 'harakat'
      ? [HARAKAT.slice(0, 5), HARAKAT.slice(5, 10)]
      : LAYOUT_ROWS[layout];

  const emit = (key: KeyDef) => {
    const upper = shift || caps;
    onInsert(upper && key.alt ? key.alt : key.ch);
    if (shift && !caps) setShift(false);
  };

  const letters = layout === 'ar' || layout === 'en';

  return (
    <motion.div
      ref={rootRef}
      initial={{ y: '100%' }}
      animate={{ y: 0 }}
      exit={{ y: '100%' }}
      transition={{ type: 'spring', stiffness: 520, damping: 42, mass: 0.7 }}
      dir={isRtlLayout(layout) ? 'rtl' : 'ltr'}
      role="group"
      aria-label="لوحة مفاتيح التطبيق"
      style={
        {
          '--kb-key-h': '2.75rem',
          paddingBottom: 'max(env(safe-area-inset-bottom), 0.5rem)',
        } as React.CSSProperties
      }
      className={cn(
        'pointer-events-auto w-full border-t border-[hsl(var(--border))]/60',
        'bg-[hsl(var(--surface-0))]/98 backdrop-blur-xl',
        'px-1.5 pt-1.5',
      )}
    >
      {/* Utility strip: punctuation within thumb reach, plus caret nudges. */}
      <div className="mb-1.5 flex items-center gap-1" dir="rtl">
        <div className="flex min-w-0 flex-1 gap-1 overflow-x-auto [-ms-overflow-style:none] [scrollbar-width:none]">
          {QUICK_PUNCTUATION.map((ch) => (
            <button
              key={ch}
              type="button"
              onPointerDown={(e) => {
                e.preventDefault();
                onInsert(ch);
                haptics('selection');
              }}
              className="h-8 min-w-8 shrink-0 rounded-[var(--r-sm)] px-2 text-meta text-muted-foreground active:scale-[0.94] active:text-foreground"
            >
              {ch}
            </button>
          ))}
        </div>
        <button
          type="button"
          aria-label="تحريك المؤشر لليمين"
          onPointerDown={(e) => {
            e.preventDefault();
            onMoveCaret(1);
          }}
          className="app-icon-btn h-8 w-8 text-muted-foreground"
        >
          <ArrowRight className="h-4 w-4" aria-hidden="true" />
        </button>
        <button
          type="button"
          aria-label="تحريك المؤشر لليسار"
          onPointerDown={(e) => {
            e.preventDefault();
            onMoveCaret(-1);
          }}
          className="app-icon-btn h-8 w-8 text-muted-foreground"
        >
          <ArrowLeft className="h-4 w-4" aria-hidden="true" />
        </button>
        <button
          type="button"
          aria-label="إخفاء لوحة المفاتيح"
          onPointerDown={(e) => {
            e.preventDefault();
            onDone();
          }}
          className="app-icon-btn h-8 w-8 text-muted-foreground"
        >
          <ChevronDown className="h-4 w-4" aria-hidden="true" />
        </button>
      </div>

      <div className="space-y-1.5">
        {rows.map((keys, index) => (
          <div key={index} className="flex gap-1">
            {/* Shift lives on the last letter row, as on every phone keyboard. */}
            {letters && index === rows.length - 1 && (
              <Key
                tone="modifier"
                span={1.5}
                ariaLabel={caps ? 'إلغاء التثبيت' : 'أحرف بديلة'}
                onPress={() => {
                  // tap → one-shot shift, tap again → locked, third → off.
                  if (caps) {
                    setCaps(false);
                    setShift(false);
                  } else if (shift) {
                    setShift(false);
                    setCaps(true);
                  } else {
                    setShift(true);
                  }
                }}
                className={cn((shift || caps) && 'bg-[hsl(var(--live))]/20 text-[hsl(var(--live))]')}
              >
                <ArrowUp className={cn('h-5 w-5', caps && 'stroke-[2.5]')} aria-hidden="true" />
              </Key>
            )}
            {keys.map((key) => (
              <Key
                key={key.ch}
                label={(shift || caps ? key.alt : undefined) ?? key.label ?? key.ch}
                ariaLabel={key.ch}
                onPress={() => emit(key)}
                onHold={key.alt ? () => onInsert(key.alt as string) : undefined}
              />
            ))}
            {letters && index === rows.length - 1 && (
              <Key
                tone="modifier"
                span={1.5}
                ariaLabel="حذف"
                onPress={onBackspace}
                onHold={onBackspaceWord}
              >
                <Backspace className="h-5 w-5" aria-hidden="true" />
              </Key>
            )}
            {!letters && index === rows.length - 1 && (
              <Key tone="modifier" span={1.5} ariaLabel="حذف" onPress={onBackspace} onHold={onBackspaceWord}>
                <Backspace className="h-5 w-5" aria-hidden="true" />
              </Key>
            )}
          </div>
        ))}

        {/* Bottom row: layout switching, space, primary action. */}
        <div className="flex gap-1 pb-1">
          <Key
            tone="modifier"
            span={1.6}
            label={layout === 'num' || layout === 'sym' ? 'أ ب' : '123'}
            ariaLabel="تبديل الأرقام والرموز"
            onPress={() => setLayout(layout === 'num' || layout === 'sym' ? 'ar' : 'num')}
          />
          {(layout === 'num' || layout === 'sym') && (
            <Key
              tone="modifier"
              span={1.4}
              label={layout === 'num' ? '=\\<' : '?123'}
              ariaLabel="رموز إضافية"
              onPress={() => setLayout(layout === 'num' ? 'sym' : 'num')}
            />
          )}
          <Key
            tone="modifier"
            span={1.2}
            ariaLabel="تبديل اللغة"
            onPress={() => setLayout(layout === 'ar' ? 'en' : 'ar')}
          >
            <span className="flex items-center gap-1 text-mini">
              <Languages className="h-4 w-4" aria-hidden="true" />
              {layout === 'ar' ? 'EN' : 'ع'}
            </span>
          </Key>
          <Key
            tone="modifier"
            span={1.2}
            label={'\u25CC\u064E'}
            ariaLabel="التشكيل"
            onPress={() => setLayout(layout === 'harakat' ? 'ar' : 'harakat')}
            className={cn(layout === 'harakat' && 'bg-[hsl(var(--live))]/18 text-[hsl(var(--live))]')}
          />
          <Key span={4} label="" ariaLabel="مسافة" onPress={() => onInsert(' ')} onHold={() => onInsert(' ')}>
            <span className="h-px w-8 bg-muted-foreground/50" />
          </Key>
          <Key
            tone="modifier"
            span={1.1}
            ariaLabel="لوحة مفاتيح النظام"
            onPress={onUseSystemKeyboard}
          >
            <Keyboard className="h-5 w-5" aria-hidden="true" />
          </Key>
          <Key tone="accent" span={1.8} ariaLabel={enterLabel} onPress={onEnter}>
            <span className="flex items-center gap-1.5 text-mini">
              <CornerDownLeft className="h-4 w-4" aria-hidden="true" />
              {enterLabel}
            </span>
          </Key>
        </div>
      </div>
    </motion.div>
  );
}