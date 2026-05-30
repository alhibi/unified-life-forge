import { useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { Check, ChevronLeft, Plus, Star } from '@/lib/icons';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import type { FeedSource } from './types';
import { CATEGORIES, SUGGESTED_FEEDS } from './feeds';
import { SourcePill } from './SourcePill';

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
  isAr,
  onBack,
  onAddSuggested,
  onAddBulk,
}: {
  feedSources: FeedSource[];
  isAr: boolean;
  onBack: () => void;
  onAddSuggested: (feed: FeedSource) => void;
  onAddBulk?: (
    feeds: ReadonlyArray<{ url: string; name: string; category: string; enabled?: boolean }>,
  ) => Promise<{ added: number; skipped: number }>;
}) {
  const [activeCat, setActiveCat] = useState<string>('all');
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [committing, setCommitting] = useState(false);

  const available = useMemo(
    () => SUGGESTED_FEEDS.filter(
      (sf) => !feedSources.some((f) => f.url === sf.url),
    ),
    [feedSources],
  );

  const categoryIds = useMemo(() => {
    const ids = new Set<string>();
    available.forEach((f) => ids.add(f.category));
    return ['all', ...Array.from(ids)];
  }, [available]);

  const filtered = useMemo(
    () => activeCat === 'all'
      ? available
      : available.filter((f) => f.category === activeCat),
    [activeCat, available],
  );

  const catLabel = (id: string) => {
    if (id === 'all') return isAr ? 'الكل' : 'All';
    const c = CATEGORIES.find((x) => x.id === id);
    return c ? (isAr ? c.ar : c.en) : id;
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

  const commitBulk = async () => {
    if (selected.size === 0) return;
    const toAdd = available.filter((f) => selected.has(f.url));
    if (toAdd.length === 0) return;
    setCommitting(true);
    try {
      if (onAddBulk) {
        const { added } = await onAddBulk(toAdd);
        toast.success(
          isAr
            ? `تمت إضافة ${added} ${added === 1 ? 'مصدر' : 'مصادر'}`
            : `Added ${added} feed${added === 1 ? '' : 's'}`,
        );
      } else {
        // Fallback: serial add. Avoids the parallel-invocation storm
        // by spacing each add one frame apart.
        for (const f of toAdd) {
          onAddSuggested(f);
          await new Promise<void>((r) => requestAnimationFrame(() => r()));
        }
        toast.success(
          isAr ? `تمت إضافة ${toAdd.length}` : `Added ${toAdd.length}`,
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
      <div className="flex items-center gap-2 px-4 py-3 border-b border-border/40 bg-card/90 backdrop-blur-md sticky top-0 z-10">
        <button
          type="button"
          onClick={onBack}
          className="p-2 rounded-xl hover:bg-accent/50 active:scale-95 transition-all"
          aria-label={isAr ? 'رجوع' : 'Back'}
        >
          <ChevronLeft className="h-5 w-5 text-foreground rtl:rotate-180" />
        </button>
        <Star className="h-4 w-4 text-primary" />
        <h3 className="text-base font-bold text-foreground flex-1">
          {isAr ? 'مصادر مقترحة' : 'Suggested Feeds'}
        </h3>
        {available.length > 0 && (
          <button
            type="button"
            onClick={selected.size === filtered.length ? clearSelection : selectAllInView}
            className="text-[11px] font-semibold text-primary px-2 py-1 rounded-lg hover:bg-primary/10"
          >
            {selected.size === filtered.length && filtered.length > 0
              ? (isAr ? 'إلغاء التحديد' : 'Clear')
              : (isAr ? 'تحديد الكل' : 'Select all')}
          </button>
        )}
      </div>

      {/* Category filter chips */}
      {available.length > 0 && (
        <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar px-4 py-3 border-b border-border/30">
          {categoryIds.map((id) => (
            <button
              key={id}
              type="button"
              onClick={() => setActiveCat(id)}
              aria-pressed={activeCat === id}
              className={`px-3 py-1.5 rounded-full text-xs font-medium transition-all shrink-0 active:scale-95 ${
                activeCat === id
                  ? 'bg-primary text-primary-foreground'
                  : 'bg-accent/30 text-muted-foreground hover:bg-accent/50'
              }`}
            >
              {catLabel(id)}
            </button>
          ))}
        </div>
      )}

      <div className="flex-1 p-4 overflow-y-auto pb-24">
        {filtered.length === 0
          ? (
            <div className="flex flex-col items-center justify-center py-16 gap-3">
              <Check className="h-8 w-8 text-primary/40" />
              <p className="text-sm text-muted-foreground">
                {isAr ? 'تمت إضافة جميع المصادر المقترحة' : 'All suggestions added'}
              </p>
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
          className="sticky bottom-0 inset-x-0 px-4 py-3 border-t border-border/40 bg-card/95 backdrop-blur-md flex items-center gap-3 z-10"
        >
          <span className="text-sm font-semibold flex-1">
            {isAr
              ? `تم اختيار ${selected.size} ${selected.size === 1 ? 'مصدر' : 'مصادر'}`
              : `${selected.size} selected`}
          </span>
          <Button
            variant="ghost"
            size="sm"
            onClick={clearSelection}
            disabled={committing}
            className="rounded-xl"
          >
            {isAr ? 'مسح' : 'Clear'}
          </Button>
          <Button
            size="sm"
            onClick={commitBulk}
            disabled={committing}
            className="rounded-xl"
          >
            <Plus className="h-3.5 w-3.5 me-1" />
            {isAr ? 'إضافة' : 'Add'}
          </Button>
        </motion.div>
      )}
    </motion.div>
  );
}
