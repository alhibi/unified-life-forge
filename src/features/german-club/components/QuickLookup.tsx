import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';

import { Search, Sparkles, X } from '@/lib/icons';

import {
  buildIndex,
  detectQueryLanguage,
  fuzzyMultiLangSearch,
  type IndexedEntry,
  type ScoredHit,
} from '../lib/search';

const MAX_SUGGESTIONS = 6;

/**
 * QuickLookup — a smart search bar mounted on the Home page.
 *
 * Type in German, Arabic, or English. Results rank live:
 *   - exact match (green)
 *   - prefix (blue)
 *   - contains (gray)
 *   - fuzzy typo (italic)
 *
 * Click a result → open its dictionary detail. Click "see all N results"
 * → jump to the dictionary page with the query already in the URL.
 *
 * Performance: ~5000 entries searched in ~10ms (single-threaded). No
 * web worker needed.
 *
 * Dictionary data is loaded lazily on first input to keep the initial
 * bundle small. The lazy import is kicked off from the input's own events
 * (typing/focus), not from an effect — so opening the page never cascades a
 * render just to warm a module that most visitors never ask for.
 */
export const QuickLookup: React.FC = () => {
  const [query, setQuery] = useState('');
  const [debounced, setDebounced] = useState('');
  const [open, setOpen] = useState(false);
  const [dictIndex, setDictIndex] = useState<readonly IndexedEntry[] | null>(null);
  const loadingRef = useRef(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const navigate = useNavigate();
  const shouldReduceMotion = useReducedMotion();

  // Load dictionary data lazily on first input
  const loadDictionary = useCallback(async () => {
    if (dictIndex || loadingRef.current) return;
    loadingRef.current = true;
    try {
      const { GERMAN_DICTIONARY_DATA } = await import('../lib/dictionaryData');
      setDictIndex(buildIndex(GERMAN_DICTIONARY_DATA));
    } finally {
      loadingRef.current = false;
    }
  }, [dictIndex]);

  // 180ms debounce — snappy but cheap on a 5000-entry index.
  useEffect(() => {
    const t = setTimeout(() => setDebounced(query), 180);
    return () => clearTimeout(t);
  }, [query]);

  // Live results
  const results: ScoredHit[] = useMemo(() => {
    if (!debounced.trim() || !dictIndex) return [];
    return fuzzyMultiLangSearch(debounced, dictIndex, MAX_SUGGESTIONS);
  }, [debounced, dictIndex]);

  const totalMatches = useMemo(() => {
    if (!debounced.trim() || !dictIndex) return 0;
    // Count everything, capped to 999 for display
    const all = fuzzyMultiLangSearch(debounced, dictIndex, 999);
    return all.length;
  }, [debounced, dictIndex]);

  const queryLang = detectQueryLanguage(query);

  const handleSelect = (entry: IndexedEntry) => {
    setOpen(false);
    setQuery('');
    navigate(`/german-club/dictionary?focus=${encodeURIComponent(entry.id)}`);
  };

  const handleSeeAll = () => {
    setOpen(false);
    setQuery('');
    navigate(`/german-club/dictionary?q=${encodeURIComponent(debounced.trim())}`);
  };

  return (
    <div className="relative w-full">
      {/* Search input */}
      <div className="relative">
        <Search
          className="pointer-events-none absolute top-1/2 start-3.5 h-4 w-4 -translate-y-1/2 text-muted-foreground"
          aria-hidden
        />
        <input
          ref={inputRef}
          type="text"
          value={query}
          onChange={(e) => {
            const value = e.target.value;
            setQuery(value);
            setOpen(true);
            if (value && !dictIndex) void loadDictionary();
          }}
          onFocus={() => {
            setOpen(true);
            if (query && !dictIndex) void loadDictionary();
          }}
          onBlur={() => setTimeout(() => setOpen(false), 150)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && debounced.trim()) {
              e.preventDefault();
              handleSeeAll();
            } else if (e.key === 'Escape') {
              setOpen(false);
              inputRef.current?.blur();
            }
          }}
          placeholder="ابحث بكلمة أو عبارة — بالعربي أو الألماني أو الإنجليزي"
          className="app-control h-12 pe-10 ps-10 text-lead"
          aria-label="بحث سريع في القاموس"
          dir="auto"
        />
        {query && (
          <button
            type="button"
            onClick={() => {
              setQuery('');
              inputRef.current?.focus();
            }}
            className="absolute top-1/2 end-2 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
            aria-label="مسح البحث"
          >
            <X className="h-3.5 w-3.5" aria-hidden />
          </button>
        )}
      </div>

      {/* Results dropdown */}
      <AnimatePresence>
        {open && debounced.trim().length > 0 && (
          <motion.div
            initial={shouldReduceMotion ? false : { opacity: 0, y: -4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={shouldReduceMotion ? { opacity: 0 } : { opacity: 0, y: -4 }}
            transition={{ duration: 0.18, ease: 'easeOut' }}
            className="glass-overlay absolute inset-x-0 z-float mt-1.5 overflow-hidden rounded-lg"
          >
            {/* Header — what we searched */}
            <div className="flex items-center justify-between border-b border-track px-3.5 py-2">
              <div className="flex items-center gap-1.5 text-mini">
                <span className="font-mono font-bold uppercase tracking-wider text-muted-foreground">
                  {queryLang === 'arabic'
                    ? 'بحث عربي'
                    : queryLang === 'german'
                      ? 'Suche'
                      : 'Search'}
                </span>
                <span className="text-muted-foreground">·</span>
                <span className="text-muted-foreground">
                  {totalMatches > 0 ? (
                    <>
                      <span className="tabular-nums">{totalMatches}</span> نتيجة
                    </>
                  ) : (
                    'لا توجد نتائج'
                  )}
                </span>
              </div>
              {totalMatches > MAX_SUGGESTIONS && (
                <button
                  type="button"
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={handleSeeAll}
                  className="text-mini font-semibold text-primary hover:underline"
                >
                  عرض الكل (<span className="tabular-nums">{totalMatches}</span>) ←
                </button>
              )}
            </div>

            {/* Results list */}
            {results.length === 0 ? (
              <div className="px-4 py-8 text-center text-muted-foreground">
                <p className="mb-1 text-body font-medium">
                  لا توجد نتائج لـ &quot;{debounced}&quot;
                </p>
                <p className="text-mini text-muted-foreground">
                  جرّب جزءاً من الكلمة، أو بالأحرف الأولى
                </p>
              </div>
            ) : (
              <ul className="max-h-80 overflow-y-auto">
                {results.map((hit) => (
                  <ResultRow key={hit.entry.id} hit={hit} onClick={() => handleSelect(hit.entry)} />
                ))}
              </ul>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

interface ResultRowProps {
  hit: ScoredHit;
  onClick: () => void;
}

const ResultRow: React.FC<ResultRowProps> = ({ hit, onClick }) => {
  const { entry, score, matchedField } = hit;
  const isExact = score >= 0.98;
  const isPrefix = matchedField === 'prefix';
  const isFuzzy = matchedField === 'fuzzy';

  // Match strength — a small data key: exact = success, prefix = accent,
  // fuzzy = muted, contains = track.
  const barClass = isExact
    ? 'bg-success'
    : isPrefix
      ? 'bg-primary'
      : isFuzzy
        ? 'bg-muted-foreground'
        : 'bg-track';

  return (
    <li>
      <button
        type="button"
        onMouseDown={(e) => e.preventDefault()}
        onClick={onClick}
        className="flex w-full items-center gap-3 border-b border-track px-3.5 py-2.5 text-start transition-colors last:border-b-0 hover:bg-muted/60"
      >
        {/* Match strength indicator */}
        <span className={`w-1 shrink-0 self-stretch rounded-full ${barClass}`} aria-hidden="true" />

        <div className="min-w-0 flex-1">
          <div className="flex items-baseline gap-2">
            <span
              className={`truncate font-bold text-foreground ${isFuzzy ? 'italic text-muted-foreground' : ''}`}
              dir="ltr"
              style={{ unicodeBidi: 'isolate' }}
            >
              {entry.german}
            </span>
            {isExact && (
              <span className="font-mono text-micro font-bold uppercase tracking-wider text-data-1">
                مطابقة
              </span>
            )}
            {isFuzzy && (
              <span className="font-mono text-micro font-bold uppercase tracking-wider text-muted-foreground">
                قريب
              </span>
            )}
          </div>
          <p className="truncate text-mini leading-snug text-muted-foreground">{entry.arabic}</p>
        </div>

        <Sparkles className="h-3 w-3 shrink-0 text-muted-foreground" aria-hidden="true" />
      </button>
    </li>
  );
};

export default QuickLookup;
