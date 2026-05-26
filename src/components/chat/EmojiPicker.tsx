import React, { useEffect, useRef, useState } from 'react';
import { cn } from '@/lib/utils';
import { useApp } from '@/contexts/AppContext';

interface EmojiPickerProps {
  isAr: boolean;
  onPick: (emoji: string) => void;
  /** When true, picker is shorter (300px). Default is 380px. */
  compact?: boolean;
}

/**
 * Apple-style emoji picker (iPhone artwork from emoji-datasource-apple via CDN).
 *
 * Renders the full official Unicode emoji set, grouped into 9 categories
 * (Frequent, Smileys & People, Animals & Nature, Food & Drink, Activities,
 *  Travel & Places, Objects, Symbols, Flags) with search, recents, and
 * skin-tone variants — matching what you get on an iPhone keyboard.
 *
 * We lazy-load the picker library and its data the first time the component
 * mounts so the initial bundle stays small.
 *
 * Wraps `@emoji-mart/react`'s `<Picker>` and adapts it to the app theme
 * tokens (HSL design tokens are converted to RGB CSS vars that emoji-mart
 * understands), the active locale (ar/de) and the chat composer's onPick
 * contract.
 */
const EmojiPicker: React.FC<EmojiPickerProps> = ({ isAr, onPick, compact }) => {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const pickerHostRef = useRef<HTMLElement | null>(null);
  const onPickRef = useRef(onPick);
  useEffect(() => { onPickRef.current = onPick; }, [onPick]);
  const { theme } = useApp();
  const [resolvedTheme, setResolvedTheme] = useState<'light' | 'dark'>(() =>
    document.documentElement.classList.contains('dark') ? 'dark' : 'light'
  );
  const [ready, setReady] = useState(false);
  const [error, setError] = useState(false);

  // Keep the picker's theme in sync with the app theme (incl. 'system').
  useEffect(() => {
    const update = () => {
      setResolvedTheme(document.documentElement.classList.contains('dark') ? 'dark' : 'light');
    };
    update();
    const obs = new MutationObserver(update);
    obs.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] });
    return () => obs.disconnect();
  }, [theme]);

  // Lazy-load emoji-mart and mount its picker once.
  useEffect(() => {
    let cancelled = false;
    const mount = async () => {
      try {
        const [{ Picker }, dataMod, i18nMod] = await Promise.all([
          import('emoji-mart'),
          import('@emoji-mart/data'),
          isAr
            ? import('@emoji-mart/data/i18n/ar.json')
            : import('@emoji-mart/data/i18n/de.json'),
        ]);
        if (cancelled || !containerRef.current) return;

        const picker = new (Picker as unknown as new (props: Record<string, unknown>) => HTMLElement)({
          // Full official Unicode emoji dataset.
          data: (dataMod as { default: unknown }).default ?? dataMod,
          i18n: (i18nMod as { default: unknown }).default ?? i18nMod,
          // 'apple' = iPhone-style emoji artwork (sprite via jsDelivr CDN).
          set: 'apple',
          theme: resolvedTheme,
          locale: isAr ? 'ar' : 'de',
          // iOS-keyboard layout: nav at the top, search sticky just below,
          // skin-tone selector tucked next to search, no preview row at the
          // bottom (saves vertical space on phones).
          navPosition: 'top',
          previewPosition: 'none',
          searchPosition: 'sticky',
          skinTonePosition: 'search',
          // perLine is auto-computed because dynamicWidth is true; we still
          // hint a sensible default for the very first paint.
          perLine: 9,
          emojiSize: 24,
          emojiButtonSize: 38,
          emojiButtonRadius: '12px',
          maxFrequentRows: 2,
          dynamicWidth: true,
          autoFocus: false,
          // Default category order matches the iPhone keyboard exactly:
          // frequent → people → nature → foods → activity → places →
          // objects → symbols → flags. We pass it explicitly so a future
          // dataset change can't reorder the keyboard on us.
          categories: [
            'frequent',
            'people',
            'nature',
            'foods',
            'activity',
            'places',
            'objects',
            'symbols',
            'flags',
          ],
          onEmojiSelect: (emoji: { native?: string; src?: string; shortcodes?: string }) => {
            // Native unicode (e.g. "😀") is what we insert into the message;
            // emoji-mart hands us its Apple-image src for *display*, but the
            // actual character we send is unicode so it renders correctly on
            // the recipient's device.
            if (emoji?.native) onPickRef.current(emoji.native);
          },
        });

        pickerHostRef.current = picker;
        applyThemeVars(picker, resolvedTheme);
        containerRef.current.appendChild(picker);
        setReady(true);
      } catch (e) {
        if (!cancelled) {
          console.error('[EmojiPicker] failed to mount', e);
          setError(true);
        }
      }
    };
    mount();

    return () => {
      cancelled = true;
      if (pickerHostRef.current) {
        pickerHostRef.current.remove();
        pickerHostRef.current = null;
      }
    };
    // Re-mount when locale changes (different i18n bundle, different
    // category labels). We don't include `onPick` because we proxy it
    // through `onPickRef`, so a changing parent callback never tears the
    // picker down.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAr]);

  // Hot-swap theme without remounting (emoji-mart watches the `theme`
  // attribute) and re-apply our CSS vars so colors track app theme.
  useEffect(() => {
    const el = pickerHostRef.current;
    if (!el) return;
    try {
      (el as unknown as { theme?: string }).theme = resolvedTheme;
      el.setAttribute('theme', resolvedTheme);
      applyThemeVars(el, resolvedTheme);
    } catch {
      /* noop */
    }
  }, [resolvedTheme]);

  return (
    <div
      className={cn(
        'bg-background border-t border-border/15 flex flex-col relative',
        compact ? 'h-[300px]' : 'h-[380px]'
      )}
      dir="ltr"
    >
      <div
        ref={containerRef}
        className={cn(
          'flex-1 min-h-0 overflow-hidden',
          // Style the Picker host element to fill the container.
          '[&_em-emoji-picker]:!w-full [&_em-emoji-picker]:!h-full [&_em-emoji-picker]:!min-h-0 [&_em-emoji-picker]:!max-h-none [&_em-emoji-picker]:!border-0 [&_em-emoji-picker]:!shadow-none [&_em-emoji-picker]:!rounded-none [&_em-emoji-picker]:!font-sans'
        )}
      />
      {!ready && !error && (
        <div className="absolute inset-0 flex items-center justify-center text-[12px] text-muted-foreground/70 pointer-events-none">
          {isAr ? 'جاري تحميل الرموز…' : 'Lade Emojis…'}
        </div>
      )}
      {error && (
        <div className="absolute inset-0 flex items-center justify-center text-[12px] text-destructive">
          {isAr ? 'تعذّر تحميل الرموز' : 'Emojis konnten nicht geladen werden'}
        </div>
      )}
    </div>
  );
};

// ─────────────────────────────────────────────────────────────────────────────
// Theme vars
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Bridge our HSL design tokens to the RGB CSS variables that emoji-mart
 * exposes on its `<em-emoji-picker>` host element. Without this the picker
 * uses hard-coded greys that look out of place against the app's surface.
 *
 * Public emoji-mart vars we override:
 *   --rgb-background  surface behind the grid + nav
 *   --rgb-color       primary text/icon color
 *   --rgb-input       search-field background
 *   --rgb-accent      active category indicator + hover state
 *   --color-border / --color-border-over   divider lines
 *   --shadow          drop shadow on the host
 *   --font-family     so labels match the app font
 */
function applyThemeVars(host: HTMLElement, mode: 'light' | 'dark') {
  const styles = host.style;
  if (mode === 'dark') {
    styles.setProperty('--rgb-background', '20, 20, 24');
    styles.setProperty('--rgb-color', '230, 230, 235');
    styles.setProperty('--rgb-input', '38, 38, 44');
    styles.setProperty('--rgb-accent', '120, 120, 130');
    styles.setProperty('--color-border', 'rgba(255, 255, 255, 0.07)');
    styles.setProperty('--color-border-over', 'rgba(255, 255, 255, 0.12)');
  } else {
    styles.setProperty('--rgb-background', '255, 255, 255');
    styles.setProperty('--rgb-color', '24, 24, 28');
    styles.setProperty('--rgb-input', '244, 244, 247');
    styles.setProperty('--rgb-accent', '90, 90, 100');
    styles.setProperty('--color-border', 'rgba(0, 0, 0, 0.06)');
    styles.setProperty('--color-border-over', 'rgba(0, 0, 0, 0.10)');
  }
  styles.setProperty('--shadow', 'none');
  styles.setProperty('--font-family', 'inherit');
}

export default EmojiPicker;
