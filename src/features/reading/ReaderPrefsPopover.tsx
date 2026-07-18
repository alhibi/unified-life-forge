import { motion, AnimatePresence } from 'framer-motion';
import { Type } from '@/lib/icons';
import { useState, useRef, useEffect } from 'react';
import type { ReaderPrefs } from './types';

/**
 * Inline popover for reader-mode preferences. Reads/writes the
 * caller-controlled `prefs` object, so persistence is handled in the
 * data hook.
 *
 * A11y:
 *  - Trigger has `aria-haspopup="dialog"` + `aria-expanded` so screen
 *    readers announce the popover.
 *  - Esc closes and returns focus to the trigger.
 *  - Click-outside dismissal still works for mouse / touch.
 */
export function ReaderPrefsPopover({
  prefs,
  onChange,
  isAr,
}: {
  prefs: ReaderPrefs;
  onChange: (next: ReaderPrefs) => void;
  isAr: boolean;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);

  const themeLabelMap: Record<ReaderPrefs['theme'], string> = {
    system: isAr ? 'النظام' : 'System',
    sepia: isAr ? 'سيبيا' : 'Sepia',
    dim: isAr ? 'داكن' : 'Dim',
    emerald: isAr ? 'زمردي' : 'Emerald',
    'warm-ivory': isAr ? 'عاجي دافئ' : 'Warm Ivory',
    'obsidian-gold': isAr ? 'ذهب معتم' : 'Obsidian Gold',
  };

  const fontFamilyLabelMap: Record<ReaderPrefs['fontFamily'], string> = {
    sans: isAr ? 'افتراضي' : 'Sans',
    serif: isAr ? 'سيريف' : 'Serif',
    amiri: isAr ? 'خط أميري' : 'Amiri',
    kufi: isAr ? 'خط كوفي' : 'Kufi',
    'system-arabic': isAr ? 'خط النظام' : 'System Arabic',
  };

  // Click-outside dismissal
  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (!ref.current?.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setOpen(false);
        triggerRef.current?.focus();
      }
    };
    document.addEventListener('mousedown', handler);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', handler);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  // Map font-size keys to actual rendered sizes for the visual hint
  // on the segmented buttons. Previously every button rendered "A" at
  // the same size, so the user couldn't see which choice was bigger.
  const fontSizePxHint: Record<ReaderPrefs['fontSize'], string> = {
    sm: '11px',
    md: '13px',
    lg: '15px',
    xl: '17px',
    '2xl': '20px',
  };

  return (
    <div ref={ref} className="relative">
      <button
        ref={triggerRef}
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="p-2 rounded-xl hover:bg-accent/50 active:scale-95 transition-all"
        aria-label={isAr ? 'إعدادات القراءة' : 'Reading preferences'}
        aria-haspopup="dialog"
        aria-expanded={open}
      >
        <Type className="h-4 w-4 text-muted-foreground" />
      </button>
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: -6, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -6, scale: 0.96 }}
            transition={{ duration: 0.15 }}
            role="dialog"
            aria-label={isAr ? 'إعدادات القراءة' : 'Reading preferences'}
 className="absolute end-0 top-full mt-2 w-64 z-30 rounded-2xl border border-border/60 bg-card p-3 space-y-3"
 >
 <PrefRow label={isAr ? 'حجم الخط' : 'Font size'}>
              {(['sm', 'md', 'lg', 'xl', '2xl'] as const).map((s) => (
                <SegBtn
                  key={s}
                  active={prefs.fontSize === s}
                  onClick={() => onChange({ ...prefs, fontSize: s })}
                  aria-label={`${isAr ? 'حجم الخط' : 'Font size'} ${s}`}
                >
                  <span
                    aria-hidden="true"
                    className="font-semibold leading-none"
                    style={{ fontSize: fontSizePxHint[s] }}
                  >
                    A
                  </span>
                  <span className="sr-only">{s}</span>
                </SegBtn>
              ))}
            </PrefRow>
            <PrefRow label={isAr ? 'تباعد الأسطر' : 'Line height'}>
              {(['compact', 'normal', 'relaxed'] as const).map((s) => (
                <SegBtn
                  key={s}
                  active={prefs.lineHeight === s}
                  onClick={() => onChange({ ...prefs, lineHeight: s })}
                >
                  <span className="text-[10px] capitalize">
                    {isAr
                      ? s === 'compact' ? 'مدمج' : s === 'normal' ? 'عادي' : 'مريح'
                      : s}
                  </span>
                </SegBtn>
              ))}
            </PrefRow>
            <PrefRow label={isAr ? 'نوع الخط' : 'Family'}>
              {(['sans', 'serif', 'amiri', 'kufi', 'system-arabic'] as const).map((f) => (
                <SegBtn
                  key={f}
                  active={prefs.fontFamily === f}
                  onClick={() => onChange({ ...prefs, fontFamily: f })}
                  title={fontFamilyLabelMap[f]}
                >
                  <span
                    className="text-[11px] font-semibold"
                    style={{
                      fontFamily:
                        f === 'serif' ? 'Georgia, serif' :
                        f === 'amiri' ? 'Amiri, serif' :
                        f === 'kufi' ? 'Noto Kufi Arabic, sans-serif' :
                        f === 'system-arabic' ? 'system-ui, sans-serif' : 'system-ui, sans-serif',
                    }}
                  >
                    {f === 'sans' ? 'Ab' : f === 'serif' ? 'Aa' : 'ع'}
                  </span>
                </SegBtn>
              ))}
            </PrefRow>
            <PrefRow label={isAr ? 'السمات الفاخرة' : 'Premium Themes'}>
              <div className="grid grid-cols-3 gap-1.5 w-full">
                {(['system', 'sepia', 'dim', 'emerald', 'warm-ivory', 'obsidian-gold'] as const).map((t) => (
                  <SegBtn
                    key={t}
                    active={prefs.theme === t}
                    onClick={() => onChange({ ...prefs, theme: t })}
                    title={themeLabelMap[t]}
                    className={`h-10 text-[10px] flex flex-col gap-1 rounded-xl transition-all ${
                      prefs.theme === t
                        ? 'bg-primary/20 text-primary border border-primary/40'
                        : 'bg-accent/40'
                    }`}
                  >
                    <span
                      aria-hidden
                      className="w-4 h-4 rounded-full inline-block shadow-sm"
                      style={{
                        background:
                          t === 'sepia' ? '#f4ecd8' :
                          t === 'dim' ? '#1f1f23' :
                          t === 'emerald' ? '#064e3b' :
                          t === 'warm-ivory' ? '#fbf8f3' :
                          t === 'obsidian-gold' ? '#121214' : 'transparent',
                        border:
                          t === 'system' ? '1px solid currentColor' :
                          t === 'obsidian-gold' ? '1px solid #d4af37' : 'none',
                      }}
                    />
                    <span className="scale-[0.85] truncate max-w-full font-medium">
                      {themeLabelMap[t]}
                    </span>
                  </SegBtn>
                ))}
              </div>
            </PrefRow>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function PrefRow({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <p className="text-[10px] text-muted-foreground uppercase tracking-wider font-semibold mb-1.5">
        {label}
      </p>
      <div className="flex gap-1.5">{children}</div>
    </div>
  );
}

function SegBtn({
  active,
  onClick,
  children,
  ...rest
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
} & React.ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={`flex-1 h-9 rounded-lg flex items-center justify-center transition-colors text-foreground/80 ${
        active
          ? 'bg-primary/15 text-primary border border-primary/30'
          : 'bg-accent/30 hover:bg-accent/50'
      }`}
      {...rest}
    >
      {children}
    </button>
  );
}
