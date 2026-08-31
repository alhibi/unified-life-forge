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
import { GERMAN_CLUB_TOKENS } from '../types';

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
 * bundle small.
 */
export const QuickLookup: React.FC = () => {
  const [query, setQuery] = useState('');
  const [debounced, setDebounced] = useState('');
  const [open, setOpen] = useState(false);
  const [dictIndex, setDictIndex] = useState<readonly IndexedEntry[] | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const navigate = useNavigate();
  const shouldReduceMotion = useReducedMotion();

  // Load dictionary data lazily on first input
  const loadDictionary = useCallback(async () => {
    if (dictIndex) return;
    const { GERMAN_DICTIONARY_DATA } = await import('../lib/dictionaryData');
    const { buildIndex } = await import('../lib/search');
    setDictIndex(buildIndex(GERMAN_DICTIONARY_DATA));
  }, [dictIndex]);

  // 180ms debounce — snappy but cheap on a 5000-entry index.
  useEffect(() => {
    const t = setTimeout(() => setDebounced(query), 180);
    return () => clearTimeout(t);
  }, [query]);

  // Trigger dictionary load on first user input
  useEffect(() => {
    if (query && !dictIndex) {
      loadDictionary();
    }
  }, [query, dictIndex, loadDictionary]);

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
      <div
        className="relative flex items-center gap-2 rounded-2xl border bg-white px-3.5 py-2.5 shadow-sm transition-all"
        style={{
          borderColor: open && query ? GERMAN_CLUB_TOKENS.prussian : `${GERMAN_CLUB_TOKENS.oak}44`,
          boxShadow:
            open && query
              ? '0 0 0 4px rgba(23, 50, 77, 0.08), 0 4px 16px -8px rgba(23, 24, 28, 0.18)'
              : '0 1px 0 rgba(0,0,0,0.02), 0 4px 12px -8px rgba(23,24,28,0.12)',
        }}
      >
        <Search className="w-4 h-4 text-stone-500 shrink-0" />
        <input
          ref={inputRef}
          type="text"
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setOpen(true);
          }}
          onFocus={() => setOpen(true)}
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
          className="flex-1 bg-transparent outline-none text-sm placeholder:text-stone-400"
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
            className="shrink-0 p-1 rounded-md hover:bg-stone-100 text-stone-500 transition-colors"
            aria-label="مسح البحث"
          >
            <X className="w-3.5 h-3.5" />
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
            className="absolute z-50 left-0 right-0 mt-1.5 rounded-2xl border bg-white overflow-hidden"
            style={{
              borderColor: `${GERMAN_CLUB_TOKENS.oak}33`,
              boxShadow: '0 8px 32px -12px rgba(23,24,28,0.24), 0 2px 8px -4px rgba(0,0,0,0.06)',
            }}
          >
            {/* Header — what we searched */}
            <div className="flex items-center justify-between px-3.5 py-2 border-b border-stone-200/70 bg-stone-50/60">
              <div className="flex items-center gap-1.5 text-xs">
                <span className="font-mono font-bold uppercase tracking-wider text-stone-600">
                  {queryLang === 'arabic'
                    ? 'بحث عربي'
                    : queryLang === 'german'
                      ? 'Suche'
                      : 'Search'}
                </span>
                <span className="text-stone-400">·</span>
                <span className="text-stone-500">
                  {totalMatches > 0 ? `${totalMatches} نتيجة` : 'لا توجد نتائج'}
                </span>
              </div>
              {totalMatches > MAX_SUGGESTIONS && (
                <button
                  type="button"
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={handleSeeAll}
                  className="text-xs font-semibold text-[#17324D] hover:underline"
                >
                  عرض الكل ({totalMatches}) ←
                </button>
              )}
            </div>

            {/* Results list */}
            {results.length === 0 ? (
              <div className="px-4 py-8 text-center text-stone-500">
                <p className="text-sm font-medium mb-1">لا توجد نتائج لـ "{debounced}"</p>
                <p className="text-xs text-stone-400">جرّب جزءاً من الكلمة، أو بالأحرف الأولى</p>
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

  return (
    <li>
      <button
        type="button"
        onMouseDown={(e) => e.preventDefault()}
        onClick={onClick}
        className="w-full text-start px-3.5 py-2.5 hover:bg-stone-50 transition-colors flex items-center gap-3 border-b border-stone-100/60 last:border-b-0"
      >
        {/* Match strength indicator */}
        <span
          className="shrink-0 w-1 self-stretch rounded-full"
          style={{
            backgroundColor: isExact
              ? '#22c55e'
              : isPrefix
                ? GERMAN_CLUB_TOKENS.prussian
                : isFuzzy
                  ? '#9ca3af'
                  : '#d4d4d8',
          }}
          aria-hidden="true"
        />

        <div className="flex-1 min-w-0">
          <div className="flex items-baseline gap-2">
            <span
              className={`font-bold text-[#17181C] truncate ${isFuzzy ? 'italic text-stone-600' : ''}`}
              dir="ltr"
              style={{ unicodeBidi: 'isolate' }}
            >
              {entry.german}
            </span>
            {isExact && (
              <span className="text-[0.625rem] font-mono font-bold text-emerald-700 uppercase tracking-wider">
                مطابقة
              </span>
            )}
            {isFuzzy && (
              <span className="text-[0.625rem] font-mono font-bold text-stone-500 uppercase tracking-wider">
                قريب
              </span>
            )}
          </div>
          <p className="text-xs text-stone-600 truncate leading-snug">{entry.arabic}</p>
        </div>

        <Sparkles className="w-3 h-3 text-stone-400 shrink-0" aria-hidden="true" />
      </button>
    </li>
  );
};
