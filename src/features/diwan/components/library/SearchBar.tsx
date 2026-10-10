import { AnimatePresence, motion } from 'framer-motion';
import React, { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';

import { AppRow, IconChip } from '@/components/ui/app-shell';
import { Input } from '@/components/ui/input';
import { useDiwanSuggest } from '@/features/diwan/lib/hooks';
import { ScrollText, Search, X } from '@/lib/icons';

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
 * شريط البحث الموحّد — حقل <Input> قياسي (سطح .app-control) واقتراحات
 * فورية داخل سطح القوائم المعتم (.glass-overlay). كان الحقل بخط سفلي
 * مخصصًا وdedicated، والاقتراحات بطاقة بظلّ خام.
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
  const navigate = useNavigate();

  // مزامنة القيمة الخارجية مع الحقل عند تغيّرها من الأعلى (مثل شرائح
  // «عمليات بحث سابقة») — ضبط أثناء العرض بدل effect، فلا دورات حالة.
  const [prevValue, setPrevValue] = useState(value);
  if (value !== undefined && value !== prevValue) {
    setPrevValue(value);
    setLocal(value);
  }

  // debounce push
  useEffect(() => {
    const t = setTimeout(() => onChange(local), debounceMs);
    return () => clearTimeout(t);
  }, [local, debounceMs, onChange]);

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
      <Search
        className="pointer-events-none absolute top-1/2 start-3 h-4 w-4 -translate-y-1/2 text-muted-foreground"
        aria-hidden
      />
      <Input
        type="search"
        autoFocus={autoFocus}
        value={local}
        onChange={(e) => {
          setLocal(e.target.value);
          setHideOnce(false);
        }}
        onFocus={() => setFocused(true)}
        placeholder={placeholder}
        className="h-11 ps-10 pe-10 text-meta"
      />
      {local && (
        <button
          type="button"
          onClick={() => setLocal('')}
          aria-label="مسح البحث"
          className="absolute top-1/2 end-2 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-sm text-muted-foreground transition-colors duration-fast hover:bg-muted hover:text-foreground"
        >
          <X className="h-4 w-4" aria-hidden />
        </button>
      )}

      <AnimatePresence>
        {items.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: -4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -4 }}
            transition={{ duration: 0.15 }}
            className="glass-overlay absolute top-full start-0 end-0 z-header mt-2 overflow-hidden rounded-lg"
          >
            <ul className="max-h-80 overflow-auto">
              {items.map((it) => (
                <li key={`${it.kind}-${it.slug}`}>
                  <AppRow
                    onClick={() => {
                      setHideOnce(true);
                      setFocused(false);
                      navigate(
                        it.kind === 'poet'
                          ? `/diwan/library/poet/${it.slug}`
                          : `/diwan/library/poem/${it.slug}`,
                      );
                    }}
                    leading={
                      <IconChip size="sm" aria-hidden>
                        {it.kind === 'poet' ? (
                          <span className="text-mini font-bold">
                            {it.label.trim().charAt(0)}
                          </span>
                        ) : (
                          <ScrollText className="h-4 w-4" />
                        )}
                      </IconChip>
                    }
                    title={it.label}
                    subtitle={it.sub ?? undefined}
                    value={it.kind === 'poet' ? 'شاعر' : 'قصيدة'}
                  />
                </li>
              ))}
            </ul>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
