import { motion } from 'framer-motion';
import { Check, ChevronLeft, Plus, Star } from 'lucide-react';
import { Button } from '@/components/ui/button';
import type { FeedSource } from './types';
import { CATEGORIES, SUGGESTED_FEEDS } from './feeds';
import { SourcePill } from './SourcePill';
import { useState, useMemo } from 'react';

export function SuggestedFeedsView({
  feedSources,
  isAr,
  onBack,
  onAddSuggested,
}: {
  feedSources: FeedSource[];
  isAr: boolean;
  onBack: () => void;
  onAddSuggested: (feed: FeedSource) => void;
}) {
  const [activeCat, setActiveCat] = useState<string>('all');

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
      </div>

      {/* Category filter chips */}
      {available.length > 0 && (
        <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar px-4 py-3 border-b border-border/30">
          {categoryIds.map((id) => (
            <button
              key={id}
              type="button"
              onClick={() => setActiveCat(id)}
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

      <div className="flex-1 p-4 overflow-y-auto">
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
              {filtered.map((feed, i) => (
                <motion.div
                  key={feed.url}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.03 }}
                  className="flex items-center gap-3 p-3.5 rounded-2xl bg-accent/20 hover:bg-accent/30 transition-colors"
                >
                  <SourcePill name={feed.name} size="md" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-foreground truncate">
                      {feed.name}
                    </p>
                    <p className="text-[11px] text-muted-foreground mt-0.5">
                      {catLabel(feed.category)}
                    </p>
                  </div>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => onAddSuggested(feed)}
                    className="shrink-0 h-9 w-9 p-0 rounded-xl"
                    aria-label={isAr ? 'إضافة' : 'Add'}
                  >
                    <Plus className="h-4 w-4" />
                  </Button>
                </motion.div>
              ))}
            </div>
          )}
      </div>
    </motion.div>
  );
}
