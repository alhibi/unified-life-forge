import React, { useEffect, useRef, useState } from 'react';
import { cn } from '@/lib/utils';
import { useApp } from '@/contexts/AppContext';

interface EmojiPickerProps {
  isAr: boolean;
  onPick: (emoji: string) => void;
  /** When true, picker is shorter (260px). Default is 320px. */
  compact?: boolean;
}

/**
 * Apple-style emoji picker (iPhone artwork from emoji-datasource-apple via CDN).
 *
 * Renders the full official Unicode emoji set, grouped into categories with
 * search, recents and skin-tone variants. We lazy-load the picker library
 * and its data the first time the component mounts so the initial bundle
 * stays small.
 *
 * Wraps `@emoji-mart/react`'s `<Picker>` and adapts it to the app theme,
 * locale (ar/de) and the chat composer's onPick contract.
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
          data: (dataMod as { default: unknown }).default ?? dataMod,
          i18n: (i18nMod as { default: unknown }).default ?? i18nMod,
          set: 'apple',
          theme: resolvedTheme,
          locale: isAr ? 'ar' : 'de',
          navPosition: 'top',
          previewPosition: 'none',
          searchPosition: 'sticky',
          skinTonePosition: 'search',
          perLine: 9,
          emojiSize: 22,
          emojiButtonSize: 34,
          emojiButtonRadius: '12px',
          maxFrequentRows: 2,
          dynamicWidth: true,
          autoFocus: false,
          onEmojiSelect: (emoji: { native?: string; src?: string; shortcodes?: string }) => {
            // Native unicode (e.g. "😀") is what we insert; emoji-mart hands us
            // its Apple-image src for display, but the actual character we send.
            if (emoji?.native) onPickRef.current(emoji.native);
          },
        });

        pickerHostRef.current = picker;
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
    // Re-mount when locale changes (different i18n bundle, different category labels).
    // We don't include `onPick` because it's stable per parent render and changing
    // it shouldn't tear down the picker; the closure captures the latest via ref-like
    // behaviour from the parent if it memos onPick.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAr]);

  // Hot-swap theme without remounting (emoji-mart watches the `theme` attribute).
  useEffect(() => {
    const el = pickerHostRef.current;
    if (!el) return;
    try {
      (el as unknown as { theme?: string }).theme = resolvedTheme;
      el.setAttribute('theme', resolvedTheme);
    } catch {
      /* noop */
    }
  }, [resolvedTheme]);

  return (
    <div
      className={cn(
        'bg-background border-t border-border/15 flex flex-col relative',
        compact ? 'h-[300px]' : 'h-[360px]'
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

export default EmojiPicker;
