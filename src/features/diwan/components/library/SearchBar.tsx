import React, { useEffect, useRef, useState } from 'react';
import { Search, X, Feather, ScrollText } from '@/lib/icons';
import { Link } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { useDiwanSuggest } from '@/features/diwan/lib/hooks';

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
 * بحث مع debouncing + اقتراحات حيّة (شعراء/قصائد) عبر diwan_suggest.
 * يدعم لمسة واحدة على iOS: 16px لتفادي الـ auto-zoom.
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value]);

  // debounce push
  useEffect(() => {
    const t = setTimeout(() => onChange(local), debounceMs);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [local]);

  // live suggestions
  const suggest = useDiwanSuggest(suggestions && focused && !hideOnce ? local : '');
  const items = suggestions && focused && !hideOnce ? suggest.data ?? [] : [];

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
      <Search className="absolute top-1/2 -translate-y-1/2 start-3 w-4 h-4 text-muted-foreground pointer-events-none" />
      <input
        type="search"
        autoFocus={autoFocus}
        value={local}
        onChange={(e) => { setLocal(e.target.value); setHideOnce(false); }}
        onFocus={() => setFocused(true)}
        placeholder={placeholder}
        className="w-full ps-10 pe-10 py-3 rounded-2xl bg-card border border-border/40 text-[16px] text-foreground placeholder:text-muted-foreground/60 focus:outline-none focus:border-primary/40 focus:ring-2 focus:ring-primary/10 transition"
      />
      {local && (
        <button
          onClick={() => setLocal('')}
          className="absolute top-1/2 -translate-y-1/2 end-2.5 w-7 h-7 rounded-full bg-muted/60 hover:bg-muted flex items-center justify-center"
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
            className="absolute z-30 left-0 right-0 top-full mt-1.5 rounded-2xl bg-card border border-border/50 overflow-hidden"
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
                    onClick={() => { setHideOnce(true); setFocused(false); }}
                    className="flex items-center gap-2.5 px-3 py-2.5 hover:bg-muted/60 active:bg-muted transition-colors border-b border-border/30 last:border-b-0"
                  >
                    <div
                      className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${
                        it.kind === 'poet'
                          ? 'bg-primary/10 text-primary'
                          : 'bg-amber-500/10 text-amber-700 dark:text-amber-400'
                      }`}
                    >
                      {it.kind === 'poet'
                        ? <Feather className="w-4 h-4" />
                        : <ScrollText className="w-4 h-4" />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p
                        className="text-[14px] font-semibold text-foreground truncate"
                        style={{ fontFamily: it.kind === 'poet' ? "'Amiri', serif" : undefined }}
                      >
                        {it.label}
                      </p>
                      {it.sub && (
                        <p className="text-[10px] text-muted-foreground truncate">{it.sub}</p>
                      )}
                    </div>
                    <span className="text-[9px] text-muted-foreground/70 px-1.5 py-0.5 rounded bg-muted/50 shrink-0">
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