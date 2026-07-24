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
      <Search className="absolute top-1/2 -translate-y-1/2 start-0 w-4 h-4 text-[#7E7259] pointer-events-none transition-colors" />
      <input
        type="search"
        autoFocus={autoFocus}
        value={local}
        onChange={(e) => { setLocal(e.target.value); setHideOnce(false); }}
        onFocus={() => setFocused(true)}
        placeholder={placeholder}
        className="w-full ps-7 pe-10 py-3 bg-transparent text-[#F2E9D8] placeholder-[#7E7259] focus:outline-none transition-all font-tajawal text-[15px]"
        style={{
          border: 'none',
          borderBottom: focused
            ? '1px solid var(--wax)'
            : '1px solid var(--hairline-strong)',
        }}
      />
      {local && (
        <button
          onClick={() => setLocal('')}
          className="absolute top-1/2 -translate-y-1/2 end-1 w-7 h-7 rounded-full bg-[rgba(242,233,216,0.06)] hover:bg-[rgba(242,233,216,0.12)] flex items-center justify-center transition-colors"
          aria-label="مسح البحث"
        >
          <X className="w-3.5 h-3.5 text-[#B8AA8E]" />
        </button>
      )}

      <AnimatePresence>
        {items.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: -4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -4 }}
            transition={{ duration: 0.15 }}
            className="absolute z-30 left-0 right-0 top-full mt-2 rounded-[14px] bg-[#1D1811] border border-[var(--hairline-strong)] overflow-hidden shadow-2xl"
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
                    className="flex items-center gap-3 px-4 py-3 hover:bg-[rgba(242,233,216,0.03)] active:bg-[rgba(242,233,216,0.06)] transition-colors border-b border-[var(--hairline)] last:border-b-0"
                  >
                    {/* Wax Seal for Poet, Scroll icon for Poem */}
                    {it.kind === 'poet' ? (
                      <div
                        className="w-8 h-8 rounded-full flex items-center justify-center shrink-0"
                        style={{
                          background: 'hsl(var(--primary))',
                          boxShadow: 'var(--shadow-sm)',
                        }}
                      >
                        <span className="font-amiri font-bold text-[13px] text-[#F5DFC9] leading-none select-none">
                          {it.label.trim().charAt(0)}
                        </span>
                      </div>
                    ) : (
                      <div className="w-8 h-8 rounded-lg bg-[rgba(184,73,46,0.1)] flex items-center justify-center shrink-0">
                        <ScrollText className="w-4 h-4 text-[var(--wax)]" />
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <p
                        className="text-[14px] font-semibold text-[#F2E9D8] truncate"
                        style={{ fontFamily: it.kind === 'poet' ? "'Amiri', serif" : "'Tajawal', sans-serif" }}
                      >
                        {it.label}
                      </p>
                      {it.sub && (
                        <p className="text-[11px] text-[#B8AA8E] truncate mt-0.5">{it.sub}</p>
                      )}
                    </div>
                    <span className="text-[10px] text-[#7E7259] px-2 py-0.5 rounded-[5px] bg-[rgba(242,233,216,0.05)] border border-[var(--hairline)] shrink-0 font-tajawal">
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
