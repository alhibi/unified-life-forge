import { motion } from 'framer-motion';
import { memo, useCallback, useEffect, useRef, useState } from 'react';

import {
  ArrowLeft,
  ArrowRight,
  ArrowUp,
  Backspace,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  CornerDownLeft,
  Keyboard,
  Languages,
} from '@/lib/icons';
import { haptics } from '@/lib/native';
import { cn } from '@/lib/utils';

import { ClipboardPanel } from './ClipboardPanel';
import { EmojiPanel } from './EmojiPanel';
import { KeyboardSettingsModal } from './KeyboardSetting';
import { KeyPopup } from './KeyPopup';
import { ToolBar } from './ToolBar';
import {
  ALEF_VARIANTS,
  caretDelta,
  EASTERN_NUMBER_ROW,
  HARAKAT,
  isRtlLayout,
  ISLAMIC_SYMBOLS,
  type KeyDef,
  LAYOUT_ROWS,
  type LayoutId,
  QUICK_PUNCTUATION,
  WESTERN_NUMBER_ROW,
} from '../lib/layouts';
import {
  readKeyboardSettings,
  type KeyboardSettings,
} from '../lib/preference';
import { getWordSuggestions, learnWord } from '../lib/prediction';

export interface SoftKeyboardProps {
  onInsert: (text: string) => void;
  onBackspace: () => void;
  onBackspaceWord: () => void;
  onEnter: () => void;
  onMoveCaret: (delta: number) => void;
  onDone: () => void;
  onUseSystemKeyboard: () => void;
  enterLabel?: string;
  onHeightChange?: (height: number) => void;
}

const HOLD_START_MS = 280;
const HOLD_REPEAT_MS = 50;

/** Individual Keyboard Key with Gboard styling, press feedback, and long-press popups */
const Key = memo(function Key({
  label,
  onPress,
  onHold,
  onPopupSelect,
  popups,
  showPopupPreview = true,
  vibrate = true,
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
  className?: string;
  ariaLabel?: string;
  span?: number;
  tone?: 'letter' | 'modifier' | 'accent';
  children?: React.ReactNode;
}) {
  const timers = useRef<{ start?: number; repeat?: number }>({});
  const [isPressed, setIsPressed] = useState(false);
  const [showPopup, setShowPopup] = useState(false);

  const clear = useCallback(() => {
    if (timers.current.start) window.clearTimeout(timers.current.start);
    if (timers.current.repeat) window.clearInterval(timers.current.repeat);
    timers.current = {};
    setIsPressed(false);
    setShowPopup(false);
  }, []);

  useEffect(() => clear, [clear]);

  return (
    <div className="relative flex min-w-0" style={{ flexGrow: span, flexBasis: 0 }}>
      {/* Magnifier / Variant Popup */}
      {(isPressed || showPopup) && showPopupPreview && (
        <KeyPopup
          label={label ?? ''}
          popups={showPopup ? popups : undefined}
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
          setIsPressed(true);
          onPress();
          if (vibrate) haptics('selection');

          timers.current.start = window.setTimeout(() => {
            if (popups && popups.length > 0) {
              setShowPopup(true);
            } else if (onHold) {
              onHold();
              timers.current.repeat = window.setInterval(onHold, HOLD_REPEAT_MS);
            }
          }, HOLD_START_MS);
        }}
        onPointerUp={clear}
        onPointerLeave={clear}
        onPointerCancel={clear}
        onContextMenu={(event) => event.preventDefault()}
        className={cn(
          'relative flex h-[var(--kb-key-h)] w-full select-none items-center justify-center rounded-[var(--r-md)]',
          'text-[1.125rem] font-medium leading-none text-foreground transition-all duration-75',
          'active:scale-[0.93] touch-none',
          tone === 'letter' &&
            'bg-[hsl(var(--surface-2))] border border-white/5 shadow-[0_1px_2px_rgba(0,0,0,0.12)] hover:bg-[hsl(var(--surface-2))]/90',
          tone === 'modifier' &&
            'bg-[hsl(var(--surface-1))] text-muted-foreground border border-white/5 shadow-[0_1px_1px_rgba(0,0,0,0.08)]',
          tone === 'accent' &&
            'bg-[hsl(var(--live))] text-white font-semibold shadow-[0_2px_4px_rgba(0,0,0,0.2)]',
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
  const [settings, setSettings] = useState<KeyboardSettings>(() => readKeyboardSettings());
  const [layout, setLayout] = useState<LayoutId>('ar');
  const [shift, setShift] = useState(false);
  const [caps, setCaps] = useState(false);
  const [activePanel, setActivePanel] = useState<'none' | 'clipboard' | 'emoji' | 'islamic'>('none');
  const [settingsModalOpen, setSettingsModalOpen] = useState(false);
  const [oneHandedMode, setOneHandedMode] = useState<'off' | 'left' | 'right'>('off');
  const [typedBuffer, setTypedBuffer] = useState('');
  const [suggestions, setSuggestions] = useState<string[]>(() => getWordSuggestions(''));

  const rootRef = useRef<HTMLDivElement>(null);
  const spaceDragRef = useRef<{ startX: number } | null>(null);

  // Listen for settings changes
  useEffect(() => {
    const handler = (e: Event) => {
      setSettings((e as CustomEvent<KeyboardSettings>).detail);
    };
    window.addEventListener('soft-keyboard-settings-changed', handler);
    return () => window.removeEventListener('soft-keyboard-settings-changed', handler);
  }, []);

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
      ? [HARAKAT.slice(0, 5), HARAKAT.slice(5, 10)]
      : LAYOUT_ROWS[layout] ?? LAYOUT_ROWS.ar;

  const emit = (key: KeyDef) => {
    const upper = shift || caps;
    const textToInsert = upper && key.alt ? key.alt : key.ch;
    onInsert(textToInsert);
    if (shift && !caps) setShift(false);

    // Update dynamic word suggestions
    const newBuffer = typedBuffer + textToInsert;
    setTypedBuffer(newBuffer);
    setSuggestions(getWordSuggestions(newBuffer));
  };

  const handleBackspace = () => {
    onBackspace();
    const newBuffer = typedBuffer.slice(0, -1);
    setTypedBuffer(newBuffer);
    setSuggestions(getWordSuggestions(newBuffer));
  };

  const letters = layout === 'ar' || layout === 'en';
  const rtl = isRtlLayout(layout);
  const quickStrip: readonly string[] = layout === 'ar' ? ALEF_VARIANTS : QUICK_PUNCTUATION;

  // Height dynamic variable mapping
  const keyHeightVar =
    settings.keyHeight === 'compact'
      ? '2.4rem'
      : settings.keyHeight === 'tall'
        ? '3.2rem'
        : settings.keyHeight === 'extra-tall'
          ? '3.6rem'
          : '2.85rem';

  return (
    <motion.div
      ref={rootRef}
      initial={{ y: '100%' }}
      animate={{ y: 0 }}
      exit={{ y: '100%' }}
      transition={{ type: 'spring', stiffness: 500, damping: 40, mass: 0.7 }}
      dir={rtl ? 'rtl' : 'ltr'}
      role="group"
      aria-label="لوحة مفاتيح التطبيق"
      style={
        {
          '--kb-key-h': keyHeightVar,
          paddingBottom: 'max(env(safe-area-inset-bottom), 0.5rem)',
        } as React.CSSProperties
      }
      className={cn(
        'pointer-events-auto w-full border-t border-border/50 bg-[hsl(var(--surface-0))]/98 backdrop-blur-2xl transition-all',
        'px-1.5 pt-1.5 shadow-2xl',
        settings.theme === 'oled' && 'bg-black border-neutral-800',
        settings.theme === 'gboard-light' && 'bg-neutral-100 text-neutral-900',
        settings.theme === 'sand' && 'bg-[#e2d8ce] text-[#2c221e]',
        settings.theme === 'luxury-gold' && 'bg-[#181512] text-[#f0e6d2]',
        settings.theme === 'emerald' && 'bg-[#0f241d] text-[#d1fae5]',
        settings.theme === 'sapphire' && 'bg-[#0f172a] text-[#e2e8f0]',
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
        suggestions={suggestions}
        onSelectSuggestion={(word) => {
          onInsert(word + ' ');
          learnWord(word);
          setTypedBuffer('');
          setSuggestions(getWordSuggestions(''));
          if (settings.vibrateOnKeyPress) haptics('selection');
        }}
        activePanel={activePanel}
        setActivePanel={(panel) => {
          if (panel === 'settings') {
            setSettingsModalOpen(true);
          } else {
            setActivePanel(panel);
          }
        }}
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
        <div className="flex h-44 w-full flex-col border-t border-border/40 bg-[hsl(var(--surface-1))]/95 p-2 backdrop-blur-xl">
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
        <div className="mb-1.5 flex items-center gap-1" dir={rtl ? 'rtl' : 'ltr'}>
          <div className="flex min-w-0 flex-1 gap-1 overflow-x-auto no-scrollbar">
            {quickStrip.map((ch) => (
              <button
                key={ch}
                type="button"
                onPointerDown={(e) => {
                  e.preventDefault();
                  onInsert(ch);
                  if (settings.vibrateOnKeyPress) haptics('selection');
                }}
                className="h-8 min-w-8 shrink-0 rounded-lg bg-[hsl(var(--surface-2))]/60 px-2 text-[0.9375rem] font-medium leading-none text-muted-foreground transition-all active:scale-90 active:bg-[hsl(var(--live))] active:text-white"
              >
                {ch}
              </button>
            ))}
          </div>
          <button
            type="button"
            aria-label="تحريك المؤشر للخلف"
            onPointerDown={(e) => {
              e.preventDefault();
              onMoveCaret(caretDelta(layout, 'right'));
              if (settings.vibrateOnKeyPress) haptics('selection');
            }}
            className="flex h-8 w-8 items-center justify-center rounded-lg text-muted-foreground hover:bg-[hsl(var(--surface-2))]"
          >
            <ArrowRight className="h-4 w-4" aria-hidden="true" />
          </button>
          <button
            type="button"
            aria-label="تحريك المؤشر للأمام"
            onPointerDown={(e) => {
              e.preventDefault();
              onMoveCaret(caretDelta(layout, 'left'));
              if (settings.vibrateOnKeyPress) haptics('selection');
            }}
            className="flex h-8 w-8 items-center justify-center rounded-lg text-muted-foreground hover:bg-[hsl(var(--surface-2))]"
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
            className="flex h-8 w-8 items-center justify-center rounded-lg text-muted-foreground hover:bg-[hsl(var(--surface-2))]"
          >
            <ChevronDown className="h-4 w-4" aria-hidden="true" />
          </button>
        </div>
      )}

      {/* Main Keyboard Keys View */}
      {activePanel === 'none' && (
        <div className="space-y-1.5">
          {/* Optional Top Number Row */}
          {settings.showNumberRow && layout === 'ar' && (
            <div className="flex gap-1">
              {(settings.digitType === 'eastern' ? EASTERN_NUMBER_ROW : WESTERN_NUMBER_ROW).map((key) => (
                <Key
                  key={key.ch}
                  label={key.ch}
                  ariaLabel={key.ch}
                  showPopupPreview={settings.showKeyPressPopup}
                  vibrate={settings.vibrateOnKeyPress}
                  className="h-8 text-mini bg-[hsl(var(--surface-1))]"
                  onPress={() => onInsert(key.ch)}
                />
              ))}
            </div>
          )}

          {rows.map((keys, index) => (
            <div key={index} className="flex gap-1">
              {/* Shift Key */}
              {letters && index === rows.length - 1 && (
                <Key
                  tone="modifier"
                  span={1.5}
                  showPopupPreview={false}
                  vibrate={settings.vibrateOnKeyPress}
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
                  className={cn((shift || caps) && 'bg-[hsl(var(--live))]/20 text-[hsl(var(--live))] border-[hsl(var(--live))]/40')}
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
                  showPopupPreview={settings.showKeyPressPopup}
                  vibrate={settings.vibrateOnKeyPress}
                  className={cn(
                    layout === 'ar' && 'text-[1.25rem]',
                    layout === 'harakat' && 'text-[1.375rem]',
                  )}
                  onPress={() => emit(key)}
                  onPopupSelect={(ch) => onInsert(ch)}
                  onHold={key.alt && key.alt !== key.ch ? () => onInsert(key.alt as string) : undefined}
                />
              ))}

              {/* Backspace Key */}
              {index === rows.length - 1 && (
                <Key
                  tone="modifier"
                  span={1.5}
                  showPopupPreview={false}
                  vibrate={settings.vibrateOnKeyPress}
                  ariaLabel="حذف"
                  onPress={handleBackspace}
                  onHold={onBackspaceWord}
                >
                  <Backspace className="h-5 w-5" aria-hidden="true" />
                </Key>
              )}
            </div>
          ))}

          {/* Bottom Row: Layout Switchers, Spacebar, System Keyboard, Action */}
          <div className="flex gap-1 pb-1">
            <Key
              tone="modifier"
              span={1.5}
              showPopupPreview={false}
              vibrate={settings.vibrateOnKeyPress}
              label={layout === 'num' || layout === 'sym' ? 'أ ب' : '123'}
              ariaLabel="تبديل الأرقام والرموز"
              onPress={() => setLayout(layout === 'num' || layout === 'sym' ? 'ar' : 'num')}
            />
            {(layout === 'num' || layout === 'sym') && (
              <Key
                tone="modifier"
                span={1.3}
                showPopupPreview={false}
                vibrate={settings.vibrateOnKeyPress}
                label={layout === 'num' ? '=\\<' : '?123'}
                ariaLabel="رموز إضافية"
                onPress={() => setLayout(layout === 'num' ? 'sym' : 'num')}
              />
            )}
            <Key
              tone="modifier"
              span={1.2}
              showPopupPreview={false}
              vibrate={settings.vibrateOnKeyPress}
              ariaLabel="تبديل اللغة"
              onPress={() => setLayout(layout === 'ar' ? 'en' : 'ar')}
            >
              <span className="flex items-center gap-1 text-mini font-semibold">
                <Languages className="h-4 w-4" aria-hidden="true" />
                {layout === 'ar' ? 'EN' : 'ع'}
              </span>
            </Key>
            <Key
              tone="modifier"
              span={1.1}
              showPopupPreview={false}
              vibrate={settings.vibrateOnKeyPress}
              label={'\u25CC\u064E'}
              ariaLabel="التشكيل"
              onPress={() => setLayout(layout === 'harakat' ? 'ar' : 'harakat')}
              className={cn(layout === 'harakat' && 'bg-[hsl(var(--live))]/20 text-[hsl(var(--live))]')}
            />

            {/* Spacebar with Caret Drag Support */}
            <div
              className="relative flex flex-[4] items-center"
              onPointerDown={(e) => {
                spaceDragRef.current = { startX: e.clientX };
              }}
              onPointerMove={(e) => {
                if (!spaceDragRef.current) return;
                const diff = e.clientX - spaceDragRef.current.startX;
                if (Math.abs(diff) > 18) {
                  onMoveCaret(diff > 0 ? 1 : -1);
                  spaceDragRef.current = { startX: e.clientX };
                  if (settings.vibrateOnKeyPress) haptics('selection');
                }
              }}
              onPointerUp={() => {
                spaceDragRef.current = null;
              }}
            >
              <Key
                span={1}
                label=""
                ariaLabel="مسافة"
                showPopupPreview={false}
                vibrate={settings.vibrateOnKeyPress}
                onPress={() => {
                  onInsert(' ');
                  setTypedBuffer('');
                  setSuggestions(getWordSuggestions(''));
                }}
                onHold={() => onInsert(' ')}
                className="w-full"
              >
                <div className="flex items-center gap-2 text-micro text-muted-foreground/60">
                  <ChevronRight className="h-3 w-3" />
                  <span className="h-1 w-12 rounded-full bg-muted-foreground/40" />
                  <ChevronLeft className="h-3 w-3" />
                </div>
              </Key>
            </div>

            <Key
              tone="modifier"
              span={1.1}
              showPopupPreview={false}
              vibrate={settings.vibrateOnKeyPress}
              ariaLabel="لوحة مفاتيح النظام"
              onPress={onUseSystemKeyboard}
            >
              <Keyboard className="h-5 w-5" aria-hidden="true" />
            </Key>

            <Key
              tone="accent"
              span={2}
              showPopupPreview={false}
              vibrate={settings.vibrateOnKeyPress}
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
