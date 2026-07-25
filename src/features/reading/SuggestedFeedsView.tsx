import { motion } from 'framer-motion';
import { useDeferredValue, useMemo, useRef, useState } from 'react';
import { toast } from 'sonner';

import { Button } from '@/components/ui/button';
import { Check, ChevronLeft, Plus, Search, Star, X } from '@/lib/icons';

import {
  CATEGORIES,
  detectFeedLanguage,
  LANGUAGES,
  normalizeSearch,
  SUGGESTED_FEEDS,
} from './feeds';
import { SourcePill } from './SourcePill';
import type { FeedSource } from './types';

type LangId = (typeof LANGUAGES)[number]['id'];

/** Build a stable per-feed search index (name + host + category label). */
function buildIndex(feeds: ReadonlyArray<FeedSource>): string[] {
  return feeds.map((f) => {
    let host = '';
    try { host = new URL(f.url).hostname.replace(/^www\./, ''); } catch { /* */ }
    const cat = CATEGORIES.find((c) => c.id === f.category);
    const catLabel = cat ? `${cat.ar} ${cat.en}` : f.category;
    return normalizeSearch([f.name, host, catLabel].join(' '));
  });
}

/**
 * Curated feed catalogue with category chips and a multi-select
 * bulk-add flow.
 *
 * Why bulk-add matters:
 *  Adding 5 feeds one at a time previously fired 5 separate edge
 *  function invocations and 5 toasts. With multi-select the user
 *  picks all the feeds they want, hits "Add N", and we fire ONE
 *  refresh covering all of them — orders of magnitude less network
 *  traffic and a single, summary toast at the end.
 *
 * Falls back to per-row add when the parent didn't supply onAddBulk
 * (older call-sites).
 */
export function SuggestedFeedsView({
  feedSources,
  onBack,
  onAddSuggested,
  onAddBulk,
}: {
  feedSources: FeedSource[];
  onBack: () => void;
  onAddSuggested: (feed: FeedSource) => void;
  onAddBulk?: (
    feeds: ReadonlyArray<{ url: string; name: string; category: string; enabled?: boolean }>,
  ) => Promise<{ added: number; skipped: number }>;
}) {
  const [activeCat, setActiveCat] = useState<string>('all');
  const [activeLang, setActiveLang] = useState<LangId>('all');
  const [query, setQuery] = useState('');
  const deferredQuery = useDeferredValue(query);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [committing, setCommitting] = useState(false);
  const searchInputRef = useRef<HTMLInputElement>(null);

  const available = useMemo(
    () => SUGGESTED_FEEDS.filter(
      (sf) => !feedSources.some((f) => f.url === sf.url),
    ),
    [feedSources],
  );

  // Precompute a searchable index per available feed so keystrokes
  // stay smooth even at 300+ suggestions.
  const searchIndex = useMemo(
    () => buildIndex(available),
    [available],
  );
  const feedLangs = useMemo(
    () => available.map((f) => detectFeedLanguage(f)),
    [available],
  );

  const filtered = useMemo(() => {
    const normalizedQuery = normalizeSearch(deferredQuery);
    // Split multi-word queries so "bbc عربي" matches even when the
    // words don't appear contiguously in the source name.
    const terms = normalizedQuery.length > 0
      ? normalizedQuery.split(/\s+/).filter(Boolean)
      : [];
    const out: FeedSource[] = [];
    for (let i = 0; i < available.length; i++) {
      const f = available[i];
      if (activeCat !== 'all' && f.category !== activeCat) continue;
      if (activeLang !== 'all' && feedLangs[i] !== activeLang) continue;
      if (terms.length > 0) {
        const hay = searchIndex[i];
        let matched = true;
        for (const t of terms) {
          if (!hay.includes(t)) { matched = false; break; }
        }
        if (!matched) continue;
      }
      out.push(f);
    }
    return out;
  }, [available, activeCat, activeLang, deferredQuery, searchIndex, feedLangs]);

  // Category chips show only the ones with results under the current
  // language + query filters, plus their live counts.
  const categoryCounts = useMemo(() => {
    const normalizedQuery = normalizeSearch(deferredQuery);
    const terms = normalizedQuery.length > 0
      ? normalizedQuery.split(/\s+/).filter(Boolean)
      : [];
    const counts: Record<string, number> = { all: 0 };
    for (let i = 0; i < available.length; i++) {
      const f = available[i];
      if (activeLang !== 'all' && feedLangs[i] !== activeLang) continue;
      if (terms.length > 0) {
        const hay = searchIndex[i];
        let matched = true;
        for (const t of terms) {
          if (!hay.includes(t)) { matched = false; break; }
        }
        if (!matched) continue;
      }
      counts.all = (counts.all || 0) + 1;
      counts[f.category] = (counts[f.category] || 0) + 1;
    }
    return counts;
  }, [available, activeLang, deferredQuery, searchIndex, feedLangs]);

  const categoryIds = useMemo(() => {
    const withCounts = Object.keys(categoryCounts).filter((id) => id !== 'all');
    // Preserve the canonical CATEGORIES ordering, drop empty ones.
    const ordered = CATEGORIES.map((c) => c.id).filter((id) => withCounts.includes(id));
    return ['all', ...ordered];
  }, [categoryCounts]);

  const catLabel = (id: string) => {
    if (id === 'all') return 'الكل';
    const c = CATEGORIES.find((x) => x.id === id);
    return c ? (c.ar) : id;
  };

  const langLabel = (id: LangId) => {
    const l = LANGUAGES.find((x) => x.id === id);
    return l ? (l.ar) : id;
  };

  const toggleSelect = (url: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(url)) next.delete(url);
      else next.add(url);
      return next;
    });
  };

  const selectAllInView = () => {
    setSelected((prev) => {
      const next = new Set(prev);
      filtered.forEach((f) => next.add(f.url));
      return next;
    });
  };

  const clearSelection = () => setSelected(new Set());
  const clearQuery = () => {
    setQuery('');
    searchInputRef.current?.focus();
  };
  const resetFilters = () => {
    setActiveCat('all');
    setActiveLang('all');
    setQuery('');
  };

  const commitBulk = async () => {
    if (selected.size === 0) return;
    const toAdd = available.filter((f) => selected.has(f.url));
    if (toAdd.length === 0) return;
    setCommitting(true);
    try {
      if (onAddBulk) {
        const { added } = await onAddBulk(toAdd);
        toast.success(
          `تمت إضافة ${added} ${added === 1 ? 'مصدر' : 'مصادر'}`,
        );
      } else {
        // Fallback: serial add. Avoids the parallel-invocation storm
        // by spacing each add one frame apart.
        for (const f of toAdd) {
          onAddSuggested(f);
          await new Promise<void>((r) => requestAnimationFrame(() => r()));
        }
        toast.success(
          `تمت إضافة ${toAdd.length}`,
        );
      }
      clearSelection();
    } finally {
      setCommitting(false);
    }
  };

  return (
    <motion.div
      key="suggested"
      initial={{ opacity: 0, x: 24 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -24 }}
      transition={{ duration: 0.25 }}
      className="flex flex-col min-h-screen"
    >
      <div className="flex items-center gap-2 px-4 py-3 border-b border-border/40 app-sticky-header-card z-raised">
        <button
          type="button"
          onClick={onBack}
          className="p-2 rounded-xl hover:bg-accent/50 active:scale-95 transition-all"
          aria-label={'رجوع'}
        >
          <ChevronLeft className="h-5 w-5 text-foreground rtl:rotate-180" />
        </button>
        <Star className="h-4 w-4 text-primary" />
        <h3 className="text-base font-bold text-foreground flex-1">
          {'مصادر مقترحة'}
        </h3>
        {available.length > 0 && (
          <button
            type="button"
            onClick={selected.size === filtered.length ? clearSelection : selectAllInView}
            className="text-[11px] font-semibold text-primary px-2 py-1 rounded-lg hover:bg-primary/10"
          >
            {selected.size === filtered.length && filtered.length > 0
              ? ('إلغاء التحديد')
              : ('تحديد الكل')}
          </button>
        )}
      </div>

      {/* Advanced search + filters */}
      {available.length > 0 && (
        <div className="flex flex-col gap-2 px-4 py-3 border-b border-border/30 bg-card/60">
          {/* Search input */}
          <div className="relative">
            <Search className="absolute top-1/2 -translate-y-1/2 start-3 h-4 w-4 text-muted-foreground pointer-events-none" />
            <input
              ref={searchInputRef}
              type="search"
              inputMode="search"
              autoComplete="off"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Escape') clearQuery(); }}
              placeholder={'ابحث بالاسم أو النطاق أو الفئة…'}
              aria-label={'بحث في المصادر'}
              className="w-full rounded-xl bg-accent/25 focus:bg-accent/40 focus:outline-none focus:ring-2 focus:ring-primary/40 text-sm ps-9 pe-9 py-2.5 placeholder:text-muted-foreground/70 text-foreground transition-colors"
              dir="auto"
            />
            {query.length > 0 && (
              <button
                type="button"
                onClick={clearQuery}
                aria-label={'مسح البحث'}
                className="absolute top-1/2 -translate-y-1/2 end-2 p-1 rounded-lg hover:bg-accent/50 text-muted-foreground"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            )}
          </div>

          {/* Language chips */}
          <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar">
            {LANGUAGES.map((l) => (
              <button
                key={l.id}
                type="button"
                onClick={() => setActiveLang(l.id)}
                aria-pressed={activeLang === l.id}
                className={`px-3 py-1 rounded-full text-[11px] font-medium transition-all shrink-0 active:scale-95 ${
                  activeLang === l.id
                    ? 'bg-foreground/90 text-background'
                    : 'bg-accent/25 text-muted-foreground hover:bg-accent/40'
                }`}
              >
                {langLabel(l.id)}
              </button>
            ))}
          </div>

          {/* Category chips with counts */}
          <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar">
            {categoryIds.map((id) => {
              const count = categoryCounts[id] ?? 0;
              const isActive = activeCat === id;
              return (
                <button
                  key={id}
                  type="button"
                  onClick={() => setActiveCat(id)}
                  aria-pressed={isActive}
                  className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-all shrink-0 active:scale-95 ${
                    isActive
                      ? 'bg-primary text-primary-foreground'
                      : 'bg-accent/30 text-muted-foreground hover:bg-accent/50'
                  }`}
                >
                  <span>{catLabel(id)}</span>
                  <span className={`text-[10px] tabular-nums rounded-full px-1.5 py-0.5 ${
                    isActive ? 'bg-primary-foreground/15' : 'bg-foreground/10'
                  }`}>{count}</span>
                </button>
              );
            })}
          </div>
        </div>
      )}

      <div className="flex-1 p-4 overflow-y-auto pb-page">
        {filtered.length === 0
          ? (
            <div className="flex flex-col items-center justify-center py-16 gap-3">
              {available.length === 0 ? (
                <>
                  <Check className="h-8 w-8 text-primary/40" />
                  <p className="text-sm text-muted-foreground">
                    {'تمت إضافة جميع المصادر المقترحة'}
                  </p>
                </>
              ) : (
                <>
                  <Search className="h-8 w-8 text-muted-foreground/50" />
                  <p className="text-sm text-muted-foreground text-center">
                    {'لا نتائج مطابقة للبحث'}
                  </p>
                  <button
                    type="button"
                    onClick={resetFilters}
                    className="text-[12px] font-semibold text-primary px-3 py-1.5 rounded-lg hover:bg-primary/10"
                  >
                    {'مسح الفلاتر'}
                  </button>
                </>
              )}
            </div>
          )
          : (
            <div className="space-y-2">
              {filtered.map((feed, i) => {
                const isSelected = selected.has(feed.url);
                return (
                  <motion.button
                    type="button"
                    key={feed.url}
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: Math.min(i * 0.02, 0.2) }}
                    onClick={() => toggleSelect(feed.url)}
                    aria-pressed={isSelected}
                    className={`w-full flex items-center gap-3 p-3.5 rounded-2xl transition-colors text-start ${
                      isSelected
                        ? 'bg-primary/10 ring-1 ring-primary/30'
                        : 'bg-accent/20 hover:bg-accent/30'
                    }`}
                  >
                    <SourcePill name={feed.name} size="md" />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-foreground truncate" dir="auto">
                        {feed.name}
                      </p>
                      <p className="text-[11px] text-muted-foreground mt-0.5">
                        {catLabel(feed.category)}
                      </p>
                    </div>
                    <span
                      className={`shrink-0 w-6 h-6 rounded-full inline-flex items-center justify-center transition-colors ${
                        isSelected
                          ? 'bg-primary text-primary-foreground'
                          : 'bg-accent/40 text-muted-foreground'
                      }`}
                      aria-hidden
                    >
                      {isSelected ? <Check className="h-3.5 w-3.5" /> : <Plus className="h-3.5 w-3.5" />}
                    </span>
                  </motion.button>
                );
              })}
            </div>
          )}
      </div>

      {/* Sticky bulk-add footer */}
      {selected.size > 0 && (
        <motion.div
          initial={{ y: 80, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: 80, opacity: 0 }}
          className="sticky bottom-0 inset-x-0 px-4 py-3 border-t border-border bg-card flex items-center gap-3 z-raised"
        >
          <span className="text-sm font-semibold flex-1">
            {`تم اختيار ${selected.size} ${selected.size === 1 ? 'مصدر' : 'مصادر'}`}
          </span>
          <Button
            variant="ghost"
            size="sm"
            onClick={clearSelection}
            disabled={committing}
            className="rounded-xl"
          >
            {'مسح'}
          </Button>
          <Button
            size="sm"
            onClick={commitBulk}
            disabled={committing}
            className="rounded-xl"
          >
            <Plus className="h-3.5 w-3.5 me-1" />
            {'إضافة'}
          </Button>
        </motion.div>
      )}
    </motion.div>
  );
}
