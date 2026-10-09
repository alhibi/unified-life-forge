import { AnimatePresence, motion } from 'framer-motion';
import React, { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';

import { useDiwanSuggest } from '@/features/diwan/lib/hooks';
import { ScrollText,Search, X } from '@/lib/icons';

interface Props {
  value?: string;
  placeholder?: string;
  onChange: (value: string) => void;
  debounceMs?: number;
  autoFocus?: boolean;
  /** عرض اقتراحات أثناء الكتابة. افتراضياً مفعّل. */
  suggestions?: boolean;
}

/**
 * شريط البحث المصمم بنمط "المخطوطة" (Manuscript) الفاخر.
 * بدون صندوق كلاسيكي — خط سفلي واحد فقط بلون دافئ، مع دعم التركيز التفاعلي.
 */
export default function SearchBar({
  value,
  placeholder = 'ابحث في المكتبة…',
  onChange,
  debounceMs = 250,
  autoFocus,
  suggestions = true,
}: Props) {
  const [local, setLocal] = useState<string>(value ?? '');
  const [focused, setFocused] = useState(false);
  const [hideOnce, setHideOnce] = useState(false);
  const wrapRef = useRef<HTMLDivElement>(null);

  // sync external value into local input
  useEffect(() => {
    if (value !== undefined && value !== local) setLocal(value);
  }, [value]);

  // debounce push
  useEffect(() => {
    const t = setTimeout(() => onChange(local), debounceMs);
    return () => clearTimeout(t);
  }, [local]);

  // live suggestions
  const suggest = useDiwanSuggest(suggestions && focused && !hideOnce ? local : '');
  const items = suggestions && focused && !hideOnce ? (suggest.data ?? []) : [];

  // close on outside click
  useEffect(() => {
    if (!focused) return;
    const onDown = (e: PointerEvent) => {
      if (!wrapRef.current?.contains(e.target as Node)) setFocused(false);
    };
    window.addEventListener('pointerdown', onDown);
    return () => window.removeEventListener('pointerdown', onDown);
  }, [focused]);

  return (
    <div className="relative" ref={wrapRef}>
      <Search className="absolute top-1/2 -translate-y-1/2 start-0 w-4 h-4 text-muted-foreground/70 pointer-events-none transition-colors" />
      <input
        type="search"
        autoFocus={autoFocus}
        value={local}
        onChange={(e) => {
          setLocal(e.target.value);
          setHideOnce(false);
        }}
        onFocus={() => setFocused(true)}
        placeholder={placeholder}
        className="w-full ps-7 pe-10 py-3 bg-transparent text-foreground placeholder-muted-foreground focus:outline-none transition-motion font-tajawal text-meta"
        style={{
          border: 'none',
          borderBottom: focused ? '1px solid hsl(var(--primary))' : '1px solid hsl(var(--border))',
        }}
      />
      {local && (
        <button
          onClick={() => setLocal('')}
          className="absolute top-1/2 -translate-y-1/2 end-1 w-7 h-7 rounded-full bg-foreground/[6%] hover:bg-foreground/[12%] flex items-center justify-center transition-colors"
          aria-label="مسح البحث"
        >
          <X className="w-3.5 h-3.5 text-muted-foreground" />
        </button>
      )}

      <AnimatePresence>
        {items.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: -4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -4 }}
            transition={{ duration: 0.15 }}
            className="absolute z-header start-0 end-0 top-full mt-2 rounded-[14px] bg-card border border-border overflow-hidden shadow-2xl"
          >
            <ul className="max-h-80 overflow-auto">
              {items.map((it) => (
                <li key={`${it.kind}-${it.slug}`}>
                  <Link
                    to={
                      it.kind === 'poet'
                        ? `/diwan/library/poet/${it.slug}`
                        : `/diwan/library/poem/${it.slug}`
                    }
                    onClick={() => {
                      setHideOnce(true);
                      setFocused(false);
                    }}
                    className="flex items-center gap-3 px-4 py-3 hover:bg-foreground/[3%] active:bg-foreground/[6%] transition-colors border-b border-border/50 last:border-b-0"
                  >
                    {/* Wax Seal for Poet, Scroll icon for Poem */}
                    {it.kind === 'poet' ? (
                      <div
                        className="w-8 h-8 rounded-full flex items-center justify-center shrink-0"
                        style={{ background: 'hsl(var(--primary))' }}
                      >
                        <span className="font-amiri font-bold text-mini text-primary-foreground leading-none select-none">
                          {it.label.trim().charAt(0)}
                        </span>
                      </div>
                    ) : (
                      <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                        <ScrollText className="w-4 h-4 text-primary" />
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <p
                        className="text-meta font-semibold text-foreground truncate"
                        style={{
                          fontFamily:
                            it.kind === 'poet' ? "var(--font-amiri)" : "var(--font-tajawal)",
                        }}
                      >
                        {it.label}
                      </p>
                      {it.sub && (
                        <p className="text-micro text-muted-foreground truncate mt-0.5">{it.sub}</p>
                      )}
                    </div>
                    <span className="text-micro text-muted-foreground/70 px-2 py-0.5 rounded-[5px] bg-foreground/[5%] border border-border/50 shrink-0 font-tajawal">
                      {it.kind === 'poet' ? 'شاعر' : 'قصيدة'}
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
