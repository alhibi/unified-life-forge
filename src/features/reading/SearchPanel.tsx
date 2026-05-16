import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronLeft, Loader2, Search, X } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { supabase } from '@/integrations/supabase/client';
import type { FeedItem } from './types';
import { SourcePill } from './SourcePill';
import { timeAgo } from './utils';

/**
 * Full-archive search. Calls the search-articles edge function which
 * uses Postgres' tsvector + GIN index, so we can scan the full body
 * of every stored article in a few hundred milliseconds.
 *
 * Optional `restrictTo` limits results to the user's currently-enabled
 * feed names so disabled sources don't pollute the results.
 */

interface SearchHit {
  link: string;
  title: string;
  description: string;
  pub_date: string | null;
  image: string | null;
  source_name: string;
  rank: number;
}

export function SearchPanel({
  isAr,
  language,
  restrictTo,
  onBack,
  onOpenArticle,
}: {
  isAr: boolean;
  language: string;
  restrictTo?: string[];
  onBack: () => void;
  onOpenArticle: (item: FeedItem) => void;
}) {
  const [q, setQ] = useState('');
  const [debounced, setDebounced] = useState('');
  const [loading, setLoading] = useState(false);
  const [hits, setHits] = useState<SearchHit[]>([]);
  const [error, setError] = useState('');

  // Debounce keyboard input by 350 ms.
  useEffect(() => {
    const timer = setTimeout(() => setDebounced(q.trim()), 350);
    return () => clearTimeout(timer);
  }, [q]);

  useEffect(() => {
    let cancelled = false;
    const run = async () => {
      if (debounced.length < 2) {
        setHits([]);
        setError('');
        return;
      }
      setLoading(true);
      setError('');
      try {
        const { data, error } = await supabase.functions.invoke(
          'search-articles',
          {
            body: {
              q: debounced,
              // null = search every source. An empty array means the
              // user has disabled every feed — don't silently widen
              // the search to "everywhere", that would be confusing.
              // The page never passes undefined here; if it ever did
              // we'd treat that the same as null.
              sources: restrictTo === undefined
                ? null
                : restrictTo,
              limit: 100,
            },
          },
        );
        if (cancelled) return;
        if (error) throw error;
        const payload = data as { results: SearchHit[]; error?: string };
        if (payload.error) throw new Error(payload.error);
        setHits(payload.results || []);
      } catch (e: any) {
        if (cancelled) return;
        setError(e?.message || (isAr ? 'تعذّر البحث' : 'Search failed'));
        setHits([]);
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    run();
    return () => {
      cancelled = true;
    };
  }, [debounced, isAr, restrictTo]);

  return (
    <motion.div
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
          <ChevronLeft className="h-5 w-5 rtl:rotate-180" />
        </button>
        <Search className="h-4 w-4 text-primary" />
        <h3 className="text-base font-bold flex-1">
          {isAr ? 'بحث الأرشيف' : 'Search archive'}
        </h3>
      </div>

      <div className="px-4 py-3 border-b border-border/30">
        <div className="relative">
          <Search className="absolute start-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            autoFocus
            placeholder={isAr
              ? 'ابحث في كل المقالات المؤرشفة...'
              : 'Search every archived article...'}
            value={q}
            onChange={(e) => setQ(e.target.value)}
            className="ps-10 h-11 text-sm rounded-xl"
          />
          {q && (
            <button
              type="button"
              onClick={() => setQ('')}
              className="absolute end-3 top-1/2 -translate-y-1/2"
              aria-label={isAr ? 'مسح' : 'Clear'}
            >
              <X className="h-4 w-4 text-muted-foreground" />
            </button>
          )}
        </div>
        {restrictTo && restrictTo.length > 0 && (
          <p className="text-[10px] text-muted-foreground/70 mt-2">
            {isAr
              ? `يبحث في ${restrictTo.length} مصدر مفعّل`
              : `Searching ${restrictTo.length} enabled source${restrictTo.length === 1 ? '' : 's'}`}
          </p>
        )}
      </div>

      <div className="flex-1 overflow-y-auto">
        {loading && (
          <div className="flex items-center justify-center gap-2 py-10">
            <Loader2 className="h-4 w-4 animate-spin text-primary" />
            <span className="text-sm text-muted-foreground">
              {isAr ? 'جاري البحث...' : 'Searching...'}
            </span>
          </div>
        )}
        {!loading && debounced.length >= 2 && hits.length === 0 && !error && (
          <div className="flex flex-col items-center justify-center py-20 gap-2 text-center">
            <Search className="h-8 w-8 text-muted-foreground/30" />
            <p className="text-sm text-muted-foreground">
              {isAr ? 'لا نتائج لـ "' + debounced + '"' : `No matches for “${debounced}”`}
            </p>
          </div>
        )}
        {!loading && error && (
          <div className="flex flex-col items-center justify-center py-20 gap-2 text-center px-6">
            <p className="text-sm text-destructive">{error}</p>
          </div>
        )}
        {!loading && q.length === 0 && (
          <div className="flex flex-col items-center justify-center py-20 gap-2 text-center px-6">
            <p className="text-sm text-muted-foreground">
              {isAr
                ? 'اكتب كلمتين أو أكثر للبحث في كامل الأرشيف'
                : 'Type 2+ characters to search every stored article'}
            </p>
          </div>
        )}
        <AnimatePresence initial={false}>
          {hits.map((hit, i) => (
            <motion.button
              key={hit.link}
              type="button"
              initial={{ opacity: 0, y: 4 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              transition={{ delay: Math.min(i * 0.015, 0.25) }}
              onClick={() =>
                onOpenArticle({
                  title: hit.title,
                  link: hit.link,
                  description: hit.description,
                  pubDate: hit.pub_date || '',
                  image: hit.image,
                  images: hit.image ? [hit.image] : [],
                  source: hit.source_name,
                })}
              className="w-full text-start p-4 hover:bg-accent/20 active:bg-accent/30 transition-colors flex gap-3 border-b border-border/15"
            >
              <div className="flex-1 min-w-0">
                <h4 className="text-[14px] font-semibold leading-snug line-clamp-2">
                  {hit.title}
                </h4>
                {hit.description && (
                  <p className="text-xs text-muted-foreground mt-1 line-clamp-2 leading-relaxed">
                    {hit.description}
                  </p>
                )}
                <div className="flex items-center gap-2 mt-2 flex-wrap">
                  <SourcePill name={hit.source_name} size="sm" />
                  <span className="text-[11px] text-foreground/70 font-medium">
                    {hit.source_name}
                  </span>
                  {hit.pub_date && (
                    <>
                      <span className="w-1 h-1 rounded-full bg-muted-foreground/30" />
                      <span className="text-[11px] text-muted-foreground/70">
                        {timeAgo(hit.pub_date, language)}
                      </span>
                    </>
                  )}
                </div>
              </div>
              {hit.image && (
                <img
                  src={hit.image}
                  alt=""
                  className="w-16 h-16 object-cover rounded-xl shrink-0"
                  loading="lazy"
                  onError={(e) => {
                    (e.currentTarget as HTMLImageElement).style.display = 'none';
                  }}
                />
              )}
            </motion.button>
          ))}
        </AnimatePresence>
      </div>
    </motion.div>
  );
}
