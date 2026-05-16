import { motion, AnimatePresence } from 'framer-motion';
import { Type } from 'lucide-react';
import { useState, useRef, useEffect } from 'react';
import type { ReaderPrefs } from './types';

/**
 * Inline popover for reader-mode preferences. Reads/writes the
 * caller-controlled `prefs` object, so persistence is handled in the
 * data hook.
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

  // Click-outside dismissal
  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (!ref.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open]);

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="p-2 rounded-xl hover:bg-accent/50 active:scale-95 transition-all"
        aria-label={isAr ? 'إعدادات القراءة' : 'Reading preferences'}
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
            className="absolute end-0 top-full mt-2 w-64 z-30 rounded-2xl border border-border/60 bg-card shadow-lg p-3 space-y-3"
          >
            <PrefRow label={isAr ? 'حجم الخط' : 'Font size'}>
              {(['sm', 'md', 'lg', 'xl'] as const).map((s) => (
                <SegBtn
                  key={s}
                  active={prefs.fontSize === s}
                  onClick={() => onChange({ ...prefs, fontSize: s })}
                >
                  {s === 'sm' ? 'A' : s === 'md' ? 'A' : s === 'lg' ? 'A' : 'A'}
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
            <PrefRow label={isAr ? 'النوع' : 'Family'}>
              {(['sans', 'serif'] as const).map((f) => (
                <SegBtn
                  key={f}
                  active={prefs.fontFamily === f}
                  onClick={() => onChange({ ...prefs, fontFamily: f })}
                >
                  <span
                    className="text-[10px] capitalize"
                    style={{
                      fontFamily: f === 'serif' ? 'Georgia, serif' : 'inherit',
                    }}
                  >
                    {f === 'sans' ? 'Aa' : 'Aa'}
                  </span>
                </SegBtn>
              ))}
            </PrefRow>
            <PrefRow label={isAr ? 'الخلفية' : 'Theme'}>
              {(['system', 'sepia', 'dim'] as const).map((t) => (
                <SegBtn
                  key={t}
                  active={prefs.theme === t}
                  onClick={() => onChange({ ...prefs, theme: t })}
                >
                  <span
                    className="w-4 h-4 rounded-full inline-block"
                    style={{
                      background:
                        t === 'sepia'
                          ? '#f4ecd8'
                          : t === 'dim'
                            ? '#1f1f23'
                            : 'transparent',
                      border:
                        t === 'system' ? '1px solid currentColor' : 'none',
                    }}
                  />
                </SegBtn>
              ))}
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
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex-1 h-8 rounded-lg flex items-center justify-center transition-colors text-foreground/80 ${
        active
          ? 'bg-primary/15 text-primary border border-primary/30'
          : 'bg-accent/30 hover:bg-accent/50'
      }`}
    >
      {children}
    </button>
  );
}
