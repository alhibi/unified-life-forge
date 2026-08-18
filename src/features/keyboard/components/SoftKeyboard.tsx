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
  ALEF_VARIANTS,
  caretDelta,
  EASTERN_NUMBER_ROW,
  HARAKAT,
  ISLAMIC_SYMBOLS,
  isRtlLayout,
  type KeyDef,
  LAYOUT_ROWS,
  type LayoutId,
  QUICK_PUNCTUATION,
  WESTERN_NUMBER_ROW,
} from '../lib/layouts';
import { replaceLastWord } from '../lib/edit';
import { getAutoCorrection, getWordSuggestions, learnWord } from '../lib/prediction';
import {
  type KeyboardSettings,
  readKeyboardSettings,
} from '../lib/preference';
import { playKeyClickSound } from '../lib/sound';
import { keyboardPaletteVars } from '../lib/theme';
import { ClipboardPanel } from './ClipboardPanel';
import { EmojiPanel } from './EmojiPanel';
import { KeyboardSettingsModal } from './KeyboardSetting';
import { KeyPopup } from './KeyPopup';
import { ToolBar } from './ToolBar';

export interface SoftKeyboardProps {
  onInsert: (text: string) => void;
  onBackspace: () => void;
  onBackspaceWord: () => void;
  onReplaceLastWord: (original: string, replacement: string) => boolean;
  onEnter: () => void;
  onMoveCaret: (delta: number) => void;
  onDone: () => void;
  onUseSystemKeyboard: () => void;
  enterLabel?: string;
  onHeightChange?: (height: number) => void;
  isSensitive?: boolean;
  shouldAutoCap?: boolean;
}

const HOLD_REPEAT_MS = 70;
/** Slop, in px, a finger may travel on a key before the tap is treated as a drag. */
const DRAG_SLOP = 12;

/** Individual Keyboard Key with Gboard styling, press feedback, key borders, and long-press popups */
const Key = memo(function Key({
  label,
  onPress,
  onHold,
  onPopupSelect,
  popups,
  showPopupPreview = true,
  vibrate = true,
  soundOnClick = false,
  soundVolume = 0.5,
  keyBorders = false,
  holdDelayMs = 280,
  pressOnRelease = false,
  className,
  ariaLabel,
  span = 1,
  tone = 'letter',
  children,
}: {
  label?: string;
  onPress: () => void;
  onHold?: () => void;
  onPopupSelect?: (ch: string) => void;
  popups?: string[];
  showPopupPreview?: boolean;
  vibrate?: boolean;
  soundOnClick?: boolean;
  soundVolume?: number;
  keyBorders?: boolean;
  /** Long-press threshold, driven by user preference. */
  holdDelayMs?: number;
  /**
   * Emit on pointerup instead of pointerdown. The spacebar needs this: it
   * doubles as a caret trackpad, and firing on press inserted a space on every
   * drag.
   */
  pressOnRelease?: boolean;
  className?: string;
  ariaLabel?: string;
  span?: number;
  tone?: 'letter' | 'modifier' | 'accent';
  children?: React.ReactNode;
}) {
  const timers = useRef<{ start?: number; repeat?: number }>({});
  const [isPressed, setIsPressed] = useState(false);
  const [showPopup, setShowPopup] = useState(false);
  const [hoverVariant, setHoverVariant] = useState<string | null>(null);
  const popupOpenRef = useRef(false);
  /** A hold already produced output, so the release must not emit a tap too. */
  const consumedRef = useRef(false);

  const clear = useCallback(() => {
    if (timers.current.start) window.clearTimeout(timers.current.start);
    if (timers.current.repeat) window.clearInterval(timers.current.repeat);
    timers.current = {};
    setIsPressed(false);
    setShowPopup(false);
    setHoverVariant(null);
    popupOpenRef.current = false;
    consumedRef.current = false;
  }, []);

  useEffect(() => {
    const handleBlur = () => clear();
    window.addEventListener('blur', handleBlur);
    return () => {
      clear();
      window.removeEventListener('blur', handleBlur);
    };
  }, [clear]);

  /** Variant under the given viewport point, if the finger is over the popup. */
  const variantAt = useCallback((x: number, y: number) => {
    const node = document.elementFromPoint(x, y);
    const hit = (node as HTMLElement | null)?.closest?.('[data-kb-variant]');
    return hit?.getAttribute('data-kb-variant') ?? null;
  }, []);

  return (
    <div className="relative flex min-w-0" style={{ flexGrow: span, flexBasis: 0 }}>
      {/* Magnifier / Variant Popup */}
      {(isPressed || showPopup) && showPopupPreview && (
        <KeyPopup
          label={label ?? ''}
          popups={showPopup ? popups : undefined}
          activeVariant={hoverVariant}
          onSelectPopup={(ch) => {
            if (onPopupSelect) onPopupSelect(ch);
            else onPress();
            clear();
          }}
          positionStyle={{ left: '50%' }}
        />
      )}

      <button
        type="button"
        aria-label={ariaLabel ?? label}
        onPointerDown={(event) => {
          event.preventDefault();
          // Keep every subsequent move/up on this key even if the finger slides
          // off it, which is what makes hold-and-slide variant picking reliable.
          try {
            event.currentTarget.setPointerCapture(event.pointerId);
          } catch {
            /* capture is best-effort */
          }
          setIsPressed(true);
          if (!pressOnRelease) onPress();
          if (vibrate) haptics('selection');
          if (soundOnClick) playKeyClickSound(tone, soundVolume);

          timers.current.start = window.setTimeout(() => {
            if (popups && popups.length > 0) {
              popupOpenRef.current = true;
              setShowPopup(true);
            } else if (onHold) {
              consumedRef.current = true;
              onHold();
              timers.current.repeat = window.setInterval(onHold, HOLD_REPEAT_MS);
            }
          }, holdDelayMs);
        }}
        onPointerMove={(event) => {
          if (!popupOpenRef.current) return;
          setHoverVariant(variantAt(event.clientX, event.clientY));
        }}
        onPointerUp={(event) => {
          // The pointer stays captured by this key, so the popup buttons never
          // receive their own pointerdown: resolve the selection by hit-test.
          if (popupOpenRef.current) {
            const variant = variantAt(event.clientX, event.clientY);
            if (variant) {
              if (onPopupSelect) onPopupSelect(variant);
              if (vibrate) haptics('selection');
            }
          } else if (pressOnRelease && !consumedRef.current) {
            onPress();
          }
          clear();
        }}
        onPointerLeave={() => {
          // Sliding up toward the popup must not cancel the interaction.
          if (!popupOpenRef.current) clear();
        }}
        onPointerCancel={clear}
        onContextMenu={(event) => event.preventDefault()}
        className={cn(
          'relative flex h-[var(--kb-key-h)] w-full select-none items-center justify-center rounded-[var(--r-md)]',
          'text-[1.125rem] font-medium leading-none transition-[transform,background-color,filter] duration-75',
          'active:scale-[0.93] touch-none',
          tone === 'letter' &&
            'bg-[hsl(var(--kb-key))] text-[hsl(var(--kb-fg))] shadow-[0_1px_2px_rgba(0,0,0,0.14)]',
          tone === 'modifier' &&
            'bg-[hsl(var(--kb-key-mod))] text-[hsl(var(--kb-fg-muted))] shadow-[0_1px_1px_rgba(0,0,0,0.1)]',
          tone === 'accent' &&
            'bg-[hsl(var(--kb-accent))] text-[hsl(var(--kb-accent-fg))] font-semibold shadow-[0_2px_4px_rgba(0,0,0,0.2)]',
          isPressed && 'brightness-[1.18]',
          keyBorders && 'ring-1 ring-[hsl(var(--kb-edge))]',
          className,
        )}
      >
        {children ?? label}
      </button>
    </div>
  );
});

/**
 * Gboard-style On-Screen Keyboard Component for Arabic & Multilingual Typing.
 * Enforces standard Left-To-Right layout geometry (Shift on left, Backspace on right,
 * 123 on left, Enter on right) while preserving Arabic text rendering and caret dynamics.
 */
export default function SoftKeyboard({
  onInsert,
  onBackspace,
  onBackspaceWord,
  onReplaceLastWord,
  onEnter,
  onMoveCaret,
  onDone,
  onUseSystemKeyboard,
  enterLabel = 'تم',
  onHeightChange,
  isSensitive = false,
  shouldAutoCap = true,
}: SoftKeyboardProps) {
  const [settings, setSettings] = useState<KeyboardSettings>(() => readKeyboardSettings());
  const [layout, setLayout] = useState<LayoutId>('ar');
  const [shift, setShift] = useState(false);
  const [caps, setCaps] = useState(false);

  // Sync auto-capitalization on English layout
  useEffect(() => {
    if (layout === 'en' && settings.autoCapitalization && shouldAutoCap && !caps) {
      setShift(true);
    }
  }, [layout, settings.autoCapitalization, shouldAutoCap, caps]);
  const [activePanel, setActivePanel] = useState<'none' | 'clipboard' | 'emoji' | 'islamic'>('none');
  const [settingsModalOpen, setSettingsModalOpen] = useState(false);
  const [oneHandedMode, setOneHandedMode] = useState<'off' | 'left' | 'right'>(
    () => readKeyboardSettings().oneHandedMode,
  );
  const [typedBuffer, setTypedBuffer] = useState('');
  const [lastCorrection, setLastCorrection] = useState<{
    original: string;
    corrected: string;
  } | null>(null);
  const [suggestions, setSuggestions] = useState<string[]>(() =>
    isSensitive ? [] : getWordSuggestions(''),
  );

  const rootRef = useRef<HTMLDivElement>(null);
  const spaceDragRef = useRef<{ startX: number; moved: boolean } | null>(null);
  const lastSpaceTapRef = useRef<number>(0);
  const pendingPredictionRef = useRef<{ idleId?: number; timeoutId?: number } | null>(null);

  // Listen for settings changes
  useEffect(() => {
    const handler = (e: Event) => {
      const next = (e as CustomEvent<KeyboardSettings>).detail;
      setSettings(next);
      setOneHandedMode(next.oneHandedMode);
    };
    window.addEventListener('soft-keyboard-settings-changed', handler);
    return () => window.removeEventListener('soft-keyboard-settings-changed', handler);
  }, []);

  /**
   * Non-blocking prediction pipeline with requestIdleCallback or immediate timeout fallback.
   * Cancels any pending prediction job on rapid consecutive keystrokes.
   */
  const updateSuggestions = useCallback((buffer: string, sensitive: boolean) => {
    if (pendingPredictionRef.current?.idleId && typeof cancelIdleCallback !== 'undefined') {
      cancelIdleCallback(pendingPredictionRef.current.idleId);
    }
    if (pendingPredictionRef.current?.timeoutId) {
      clearTimeout(pendingPredictionRef.current.timeoutId);
    }
    pendingPredictionRef.current = null;

    if (sensitive) {
      setSuggestions([]);
      return;
    }

    const compute = () => {
      setSuggestions(getWordSuggestions(buffer));
    };

    if (typeof requestIdleCallback !== 'undefined') {
      const idleId = requestIdleCallback(() => compute(), { timeout: 50 });
      pendingPredictionRef.current = { idleId };
    } else {
      const timeoutId = window.setTimeout(compute, 0);
      pendingPredictionRef.current = { timeoutId };
    }
  }, []);

  // Cleanup pending prediction jobs on unmount
  useEffect(() => {
    return () => {
      if (pendingPredictionRef.current?.idleId && typeof cancelIdleCallback !== 'undefined') {
        cancelIdleCallback(pendingPredictionRef.current.idleId);
      }
      if (pendingPredictionRef.current?.timeoutId) {
        clearTimeout(pendingPredictionRef.current.timeoutId);
      }
    };
  }, []);

  /**
   * Switching layout ends the current word and any pending shift latch: keeping
   * them alive leaked English suggestions into Arabic typing and vice versa.
   */
  const switchLayout = useCallback(
    (next: LayoutId) => {
      setLayout(next);
      setShift(false);
      setCaps(false);
      setTypedBuffer('');
      updateSuggestions('', isSensitive);
    },
    [isSensitive, updateSuggestions],
  );

  // Height publishing
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
      ? [HARAKAT.slice(0, 6), HARAKAT.slice(6, 12)]
      : LAYOUT_ROWS[layout as keyof typeof LAYOUT_ROWS] ?? LAYOUT_ROWS.ar;

  const emit = useCallback(
    (key: KeyDef) => {
      const upper = shift || caps;
      const textToInsert = upper && key.alt ? key.alt : key.ch;
      onInsert(textToInsert);
      if (shift && !caps) setShift(false);

      // Clear last auto-correction undo token when typing non-backspace
      setLastCorrection(null);

      // Only letters continue a word. Digits, punctuation and combining marks end
      // it, so the prediction buffer never accumulates junk that can't be matched.
      const isWordChar = /^[\p{L}\u0640]+$/u.test(textToInsert);
      const newBuffer = isWordChar ? typedBuffer + textToInsert : '';
      setTypedBuffer(newBuffer);
      updateSuggestions(newBuffer, isSensitive);
    },
    [shift, caps, onInsert, typedBuffer, updateSuggestions, isSensitive],
  );

  const handleBackspace = useCallback(() => {
    if (lastCorrection) {
      // Undo single auto-correction on immediate backspace tap
      const restored = onReplaceLastWord(lastCorrection.corrected + ' ', lastCorrection.original);
      if (restored) {
        setTypedBuffer(lastCorrection.original);
        setLastCorrection(null);
        return;
      }
    }
    onBackspace();
    const newBuffer = typedBuffer.slice(0, -1);
    setTypedBuffer(newBuffer);
    updateSuggestions(newBuffer, isSensitive);
  }, [
    lastCorrection,
    onBackspace,
    onReplaceLastWord,
    typedBuffer,
    updateSuggestions,
    isSensitive,
  ]);

  const handleSpacePress = useCallback(() => {
    const now = Date.now();

    // Check mild auto-correction on word boundary space
    if (settings.autoCorrectionEnabled && typedBuffer && !isSensitive) {
      const correction = getAutoCorrection(typedBuffer);
      if (correction) {
        const replaced = onReplaceLastWord(typedBuffer, correction + ' ');
        if (replaced) {
          setLastCorrection({ original: typedBuffer, corrected: correction });
          setTypedBuffer('');
          updateSuggestions('', isSensitive);
          return;
        }
      }
    }

    setLastCorrection(null);

    if (settings.autoPeriod && now - lastSpaceTapRef.current < 320) {
      // Auto-period shortcut: convert previous space/tap to ". "
      onBackspace();
      onInsert('. ');
      lastSpaceTapRef.current = 0;
    } else {
      onInsert(' ');
      lastSpaceTapRef.current = now;
    }
    setTypedBuffer('');
    updateSuggestions('', isSensitive);
  }, [
    settings.autoCorrectionEnabled,
    settings.autoPeriod,
    typedBuffer,
    isSensitive,
    onBackspace,
    onInsert,
    onReplaceLastWord,
    updateSuggestions,
  ]);

  /** Props every key shares, memoized to prevent unnecessary re-renders across rows. */
  const keyChrome = useMemo(
    () => ({
      showPopupPreview: settings.showKeyPressPopup,
      vibrate: settings.vibrateOnKeyPress,
      soundOnClick: settings.soundOnClick || settings.soundEnabled,
      soundVolume: settings.soundVolume,
      keyBorders: settings.keyBorders,
      holdDelayMs: settings.holdDelayMs,
    }),
    [
      settings.showKeyPressPopup,
      settings.vibrateOnKeyPress,
      settings.soundOnClick,
      settings.soundEnabled,
      settings.soundVolume,
      settings.keyBorders,
      settings.holdDelayMs,
    ],
  );

  const letters = layout === 'ar' || layout === 'en';
  const rtl = isRtlLayout(layout);
  const quickStrip: readonly string[] = layout === 'ar' ? ALEF_VARIANTS : QUICK_PUNCTUATION;

  // Height dynamic variable mapping with landscape adaptability
  const keyHeightVar =
    settings.keyHeight === 'compact'
      ? '2.2rem'
      : settings.keyHeight === 'tall'
        ? '3.1rem'
        : settings.keyHeight === 'extra-tall'
          ? '3.5rem'
          : '2.75rem';

  return (
    <motion.div
      ref={rootRef}
      initial={{ y: '100%' }}
      animate={{ y: 0 }}
      exit={{ y: '100%' }}
      transition={{ type: 'spring', stiffness: 500, damping: 40, mass: 0.7 }}
      dir="ltr"
      role="group"
      aria-label="لوحة مفاتيح التطبيق"
      style={
        {
          '--kb-key-h': keyHeightVar,
          paddingBottom: 'max(env(safe-area-inset-bottom), 0.5rem)',
          ...keyboardPaletteVars(settings.theme),
        } as React.CSSProperties
      }
      className={cn(
        'pointer-events-auto w-full select-none border-t border-[hsl(var(--kb-edge))]',
        'bg-[hsl(var(--kb-bg))] text-[hsl(var(--kb-fg))] shadow-2xl backdrop-blur-2xl',
        'px-1.5 pt-1.5 landscape:px-8 landscape:pt-1 landscape:pb-1 landscape:max-h-[50vh] landscape:overflow-y-auto',
        '[&]:landscape:[--kb-key-h:2rem]',
        oneHandedMode === 'right' && 'ms-auto w-[85%]',
        oneHandedMode === 'left' && 'me-auto w-[85%]',
      )}
    >
      {/* Settings Modal Drawer */}
      <KeyboardSettingsModal
        open={settingsModalOpen}
        onOpenChange={setSettingsModalOpen}
      />

      {/* Top Action & Suggestion Bar */}
      <ToolBar
        suggestions={isSensitive ? [] : suggestions}
        onSelectSuggestion={(word) => {
          onInsert(word + ' ');
          if (!isSensitive) {
            learnWord(word);
          }
          setTypedBuffer('');
          updateSuggestions('', isSensitive);
          if (settings.vibrateOnKeyPress) haptics('selection');
        }}
        activePanel={activePanel}
        setActivePanel={useCallback((panel) => {
          if (panel === 'settings') {
            setSettingsModalOpen(true);
          } else {
            setActivePanel(panel);
          }
        }, [])}
        oneHandedMode={oneHandedMode}
        setOneHandedMode={setOneHandedMode}
      />

      {/* Sub-Panels (Clipboard / Emoji / Islamic Symbols) */}
      {activePanel === 'clipboard' && (
        <ClipboardPanel
          onInsertText={(text) => onInsert(text)}
          onClose={() => setActivePanel('none')}
        />
      )}

      {activePanel === 'emoji' && (
        <EmojiPanel
          onInsertEmoji={(emoji) => onInsert(emoji)}
          onClose={() => setActivePanel('none')}
        />
      )}

      {activePanel === 'islamic' && (
        <div className="flex h-44 w-full flex-col border-t border-border/40 bg-[hsl(var(--surface-1))]/95 p-2 backdrop-blur-xl" dir="rtl">
          <div className="mb-2 flex items-center justify-between border-b border-border/30 pb-1 px-1">
            <span className="text-mini font-semibold text-foreground">رموز وعبارات إسلامية</span>
            <button
              type="button"
              onClick={() => setActivePanel('none')}
              className="text-micro text-muted-foreground hover:text-foreground"
            >
              إغلاق
            </button>
          </div>
          <div className="grid grid-cols-2 gap-1.5 overflow-y-auto p-1">
            {ISLAMIC_SYMBOLS.map((sym) => (
              <button
                key={sym.ch}
                type="button"
                onPointerDown={(e) => {
                  e.preventDefault();
                  onInsert(sym.ch);
                  if (settings.vibrateOnKeyPress) haptics('selection');
                }}
                className="flex h-9 items-center justify-center rounded-xl border border-white/5 bg-[hsl(var(--surface-2))] px-2 text-mini font-medium text-foreground transition-all active:scale-95 hover:bg-[hsl(var(--live))]/20"
              >
                {sym.label}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Quick Punctuation & Navigation Strip */}
      {activePanel === 'none' && (
        <div className="mb-1.5 flex items-center gap-1">
          <div className="flex min-w-0 flex-1 gap-1 overflow-x-auto no-scrollbar" dir={rtl ? 'rtl' : 'ltr'}>
            {quickStrip.map((ch) => (
              <button
                key={ch}
                type="button"
                onPointerDown={(e) => {
                  e.preventDefault();
                  onInsert(ch);
                  if (settings.vibrateOnKeyPress) haptics('selection');
                }}
                className="h-8 min-w-8 shrink-0 rounded-lg bg-[hsl(var(--kb-key))]/70 px-2 text-[0.9375rem] font-medium leading-none text-[hsl(var(--kb-fg-muted))] transition-transform active:scale-90 active:bg-[hsl(var(--kb-accent))] active:text-[hsl(var(--kb-accent-fg))]"
              >
                {ch}
              </button>
            ))}
          </div>
          <div className="flex shrink-0 items-center gap-1">
            <button
              type="button"
              aria-label="تحريك المؤشر لليمين"
              title="تحريك المؤشر لليمين"
              onPointerDown={(e) => {
                e.preventDefault();
                onMoveCaret(caretDelta(layout, 'right'));
                if (settings.vibrateOnKeyPress) haptics('selection');
              }}
              className="flex h-8 w-8 items-center justify-center rounded-lg text-[hsl(var(--kb-fg-muted))] active:bg-[hsl(var(--kb-key))]"
            >
              <ArrowRight className="h-4 w-4" aria-hidden="true" />
            </button>
            <button
              type="button"
              aria-label="تحريك المؤشر لليسار"
              title="تحريك المؤشر لليسار"
              onPointerDown={(e) => {
                e.preventDefault();
                onMoveCaret(caretDelta(layout, 'left'));
                if (settings.vibrateOnKeyPress) haptics('selection');
              }}
              className="flex h-8 w-8 items-center justify-center rounded-lg text-[hsl(var(--kb-fg-muted))] active:bg-[hsl(var(--kb-key))]"
            >
              <ArrowLeft className="h-4 w-4" aria-hidden="true" />
            </button>
            <button
              type="button"
              aria-label="إخفاء لوحة المفاتيح"
              title="إخفاء لوحة المفاتيح"
              onPointerDown={(e) => {
                e.preventDefault();
                onDone();
              }}
              className="flex h-8 w-8 items-center justify-center rounded-lg text-[hsl(var(--kb-fg-muted))] active:bg-[hsl(var(--kb-key))]"
            >
              <ChevronDown className="h-4 w-4" aria-hidden="true" />
            </button>
          </div>
        </div>
      )}

      {/* Main Keyboard Keys View */}
      {activePanel === 'none' && (
        <div className="space-y-1.5">
          {/* Optional Top Number Row */}
          {settings.showNumberRow && letters && (
            <div className="flex gap-1">
              {(settings.digitType === 'eastern' && layout === 'ar' ? EASTERN_NUMBER_ROW : WESTERN_NUMBER_ROW).map((key) => (
                <Key
                  key={key.ch}
                  label={key.ch}
                  ariaLabel={key.ch}
                  {...keyChrome}
                  className="h-8 text-mini"
                  onPress={() => onInsert(key.ch)}
                />
              ))}
            </div>
          )}

          {rows.map((keys, index) => (
            <div key={index} className="flex gap-1">
              {/* Shift Key (Left side of Row 3) */}
              {letters && index === rows.length - 1 && (
                <Key
                  tone="modifier"
                  span={1.5}
                  {...keyChrome}
                  showPopupPreview={false}
                  ariaLabel={caps ? 'إلغاء التثبيت' : 'أحرف بديلة'}
                  onPress={() => {
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
                  className={cn((shift || caps) && 'bg-[hsl(var(--kb-accent))]/25 text-[hsl(var(--kb-accent))] ring-1 ring-[hsl(var(--kb-accent))]/50')}
                >
                  <ArrowUp className={cn('h-5 w-5', caps && 'stroke-[2.5]')} aria-hidden="true" />
                </Key>
              )}

              {keys.map((key) => (
                <Key
                  key={key.ch}
                  label={(shift || caps ? key.alt : undefined) ?? key.label ?? key.ch}
                  popups={key.popups}
                  ariaLabel={key.ch}
                  {...keyChrome}
                  className={cn(
                    layout === 'ar' && 'text-[1.25rem]',
                    layout === 'harakat' && 'text-[1.375rem]',
                  )}
                  onPress={() => emit(key)}
                  onPopupSelect={(ch) => {
                    // The base character was inserted on press: swap it out.
                    onBackspace();
                    onInsert(ch);
                  }}
                  onHold={key.alt && key.alt !== key.ch ? () => onInsert(key.alt as string) : undefined}
                />
              ))}

              {/* Backspace Key (Right side of Row 3) */}
              {index === rows.length - 1 && (
                <Key
                  tone="modifier"
                  span={1.5}
                  {...keyChrome}
                  showPopupPreview={false}
                  ariaLabel="حذف"
                  onPress={handleBackspace}
                  onHold={onBackspaceWord}
                >
                  <Backspace className="h-5 w-5" aria-hidden="true" />
                </Key>
              )}
            </div>
          ))}

          {/* Bottom Row: Layout Switchers, Spacebar, Quick Period, System Keyboard, Action */}
          <div className="flex gap-1 pb-1">
            <Key
              tone="modifier"
              span={1.4}
              {...keyChrome}
              showPopupPreview={false}
              label={layout === 'num' || layout === 'sym' ? 'أ ب' : '?123'}
              ariaLabel="تبديل الأرقام والرموز"
              onPress={() => switchLayout(layout === 'num' || layout === 'sym' ? 'ar' : 'num')}
            />

            {(layout === 'num' || layout === 'sym') && (
              <Key
                tone="modifier"
                span={1.2}
                {...keyChrome}
                showPopupPreview={false}
                label={layout === 'num' ? '=\\<' : '123'}
                ariaLabel="رموز إضافية"
                onPress={() => switchLayout(layout === 'num' ? 'sym' : 'num')}
              />
            )}

            <Key
              tone="modifier"
              span={1.2}
              {...keyChrome}
              showPopupPreview={false}
              ariaLabel="تبديل اللغة"
              onPress={() => switchLayout(layout === 'ar' ? 'en' : 'ar')}
            >
              <span className="flex items-center gap-1 text-mini font-semibold">
                <Languages className="h-4 w-4" aria-hidden="true" />
                {layout === 'ar' ? 'EN' : 'ع'}
              </span>
            </Key>

            <Key
              tone="modifier"
              span={1.1}
              {...keyChrome}
              showPopupPreview={false}
              label={'\u25CC\u064E'}
              ariaLabel="التشكيل"
              onPress={() => switchLayout(layout === 'harakat' ? 'ar' : 'harakat')}
              className={cn(layout === 'harakat' && 'bg-[hsl(var(--kb-accent))]/25 text-[hsl(var(--kb-accent))]')}
            />

            {/* Spacebar with Caret Drag & Long-Press Language Switch Support */}
            <div
              className="relative flex flex-[4] items-center"
              onPointerDown={(e) => {
                spaceDragRef.current = { startX: e.clientX, moved: false };
              }}
              onPointerMove={(e) => {
                if (!spaceDragRef.current) return;
                const diff = e.clientX - spaceDragRef.current.startX;
                if (Math.abs(diff) > DRAG_SLOP) {
                  // Dragging right moves caret visually right, dragging left moves caret visually left
                  onMoveCaret(caretDelta(layout, diff > 0 ? 'right' : 'left'));
                  spaceDragRef.current = { startX: e.clientX, moved: true };
                  if (settings.vibrateOnKeyPress) haptics('selection');
                }
              }}
              onPointerUp={() => {
                spaceDragRef.current = null;
              }}
              onPointerCancel={() => {
                spaceDragRef.current = null;
              }}
            >
              <Key
                span={1}
                label=""
                ariaLabel="مسافة"
                {...keyChrome}
                showPopupPreview={false}
                // Space commits on release so sliding it as a caret trackpad
                // never leaves a stray space behind.
                pressOnRelease
                onPress={() => {
                  if (spaceDragRef.current?.moved) return;
                  handleSpacePress();
                }}
                onHold={() => {
                  if (spaceDragRef.current?.moved) return;
                  // Long-press spacebar triggers fast language switch between 'ar' and 'en'
                  switchLayout(layout === 'ar' ? 'en' : 'ar');
                  if (settings.vibrateOnKeyPress) haptics('selection');
                }}
                className="w-full"
              >
                <div className="flex items-center justify-center gap-1.5 text-micro text-[hsl(var(--kb-fg-muted))] opacity-75">
                  <span className="h-1 w-10 rounded-full bg-[hsl(var(--kb-fg-muted))]/50" />
                  <span className="text-[0.6875rem] font-semibold uppercase tracking-wider">
                    {layout === 'ar' ? 'العربية' : 'English'}
                  </span>
                  <span className="h-1 w-10 rounded-full bg-[hsl(var(--kb-fg-muted))]/50" />
                </div>
              </Key>
            </div>

            {/* Quick Period / Comma Key */}
            <Key
              tone="modifier"
              span={1}
              {...keyChrome}
              showPopupPreview={false}
              label={layout === 'ar' ? '،' : '.'}
              ariaLabel="علامة ترقيم"
              onPress={() => onInsert(layout === 'ar' ? '،' : '.')}
              onHold={() => onInsert('.')}
            />

            {/* System Keyboard Switcher */}
            <Key
              tone="modifier"
              span={1.1}
              {...keyChrome}
              showPopupPreview={false}
              ariaLabel="لوحة مفاتيح النظام"
              onPress={onUseSystemKeyboard}
            >
              <Keyboard className="h-5 w-5" aria-hidden="true" />
            </Key>

            {/* Enter / Action Key */}
            <Key
              tone="accent"
              span={2}
              {...keyChrome}
              showPopupPreview={false}
              ariaLabel={enterLabel}
              onPress={onEnter}
            >
              <span className="flex items-center gap-1.5 whitespace-nowrap text-mini font-semibold">
                <CornerDownLeft className="h-4 w-4" aria-hidden="true" />
                {enterLabel}
              </span>
            </Key>
          </div>
        </div>
      )}
    </motion.div>
  );
}
