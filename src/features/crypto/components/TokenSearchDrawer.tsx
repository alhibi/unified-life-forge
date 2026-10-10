import React, { useEffect, useState } from 'react';
import { toast } from 'sonner';

import { AppList, AppRow } from '@/components/ui/app-shell';
import ResponsiveDrawer from '@/components/ui/ResponsiveDrawer';
import { StateView } from '@/components/ui/state-view';
import { Check, Loader2, Plus, Search } from '@/lib/icons';

function useDebounce<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value);
  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);
    return () => {
      clearTimeout(handler);
    };
  }, [value, delay]);
  return debouncedValue;
}

/** Errors here can be Error instances or PostgrestError-shaped objects —
 *  read a string `message` off either without widening to `any`. */
function messageOf(err: unknown, fallback: string): string {
  if (err && typeof err === 'object' && 'message' in err) {
    const message = (err as { message?: unknown }).message;
    if (typeof message === 'string' && message) return message;
  }
  return fallback;
}

import { cryptoApi } from '../api';
import { CHAIN_LABELS, type ChainId, type NormalizedPair } from '../types';

interface TokenSearchDrawerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  watchlistPairs: { chainId: string; pairAddress: string }[];
  onAddSuccess: () => void;
}

export default function TokenSearchDrawer({
  open,
  onOpenChange,
  watchlistPairs,
  onAddSuccess,
}: TokenSearchDrawerProps) {
  const [query, setQuery] = useState('');
  const debouncedQuery = useDebounce(query, 400);
  const [results, setResults] = useState<NormalizedPair[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [addingId, setAddingId] = useState<string | null>(null);

  // Trigger search on debounced query changes
  useEffect(() => {
    if (debouncedQuery.trim().length < 2) {
      setResults([]);
      setError(null);
      return;
    }

    async function performSearch() {
      setLoading(true);
      setError(null);
      try {
        const data = await cryptoApi.search(debouncedQuery);
        setResults(data);
      } catch (err: unknown) {
        console.error('[TokenSearchDrawer] Search failed:', err);
        setError(messageOf(err, 'فشل البحث. يرجى التحقق من الاتصال بالشبكة.'));
      } finally {
        setLoading(false);
      }
    }

    performSearch();
  }, [debouncedQuery]);

  // Reset state on close
  useEffect(() => {
    if (!open) {
      setQuery('');
      setResults([]);
      setError(null);
    }
  }, [open]);

  const isAlreadyAdded = (pair: NormalizedPair) => {
    return watchlistPairs.some(
      (w) => w.chainId === pair.chainId && w.pairAddress.toLowerCase() === pair.pairAddress.toLowerCase()
    );
  };

  const handleAdd = async (pair: NormalizedPair) => {
    if (isAlreadyAdded(pair)) return;

    setAddingId(pair.pairAddress);
    try {
      await cryptoApi.addToWatchlist(
        pair.chainId as ChainId,
        pair.pairAddress,
        pair.symbol,
        pair.name
      );
      toast.success(`تمت إضافة ${pair.symbol} بنجاح إلى قائمة المراقبة.`);
      onAddSuccess();
    } catch (err: unknown) {
      console.error('[TokenSearchDrawer] Add failed:', err);
      toast.error('عذراً، فشل إضافة العملة إلى قائمة المراقبة.');
    } finally {
      setAddingId(null);
    }
  };

  // Capped search count
  const MAX_VISIBLE_RESULTS = 12;
  const visibleResults = results.slice(0, MAX_VISIBLE_RESULTS);

  return (
    <ResponsiveDrawer
      open={open}
      onOpenChange={onOpenChange}
      title="إضافة عملة رقمية"
      description="ابحث باسم العملة، رمزها (مثال: SOL, BTC) أو عنوان عقد المجمّع."
    >
      <div className="space-y-4 px-1">
        {/* Search input bar */}
        <div className="relative flex items-center">
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="اسم العملة، الرمز، أو عقد الزوج..."
            className="w-full h-11 bg-muted/40 border border-border/40 rounded-md pe-10 ps-4 text-meta text-foreground placeholder:text-muted-foreground outline-none focus:border-primary/50 transition-colors"
            style={{ fontSize: 16 }}
            maxLength={100}
            autoFocus
          />
          <Search className="absolute start-3.5 h-4 w-4 text-muted-foreground pointer-events-none" />
          {loading && (
            <Loader2 className="absolute end-3.5 h-4 w-4 text-primary animate-spin" />
          )}
        </div>

        {/* Search results & states */}
        <div className="space-y-2.5 max-h-[48dvh] overflow-y-auto pe-0.5 scrollbar-thin">
          {error && (
            <div className="p-4 rounded-md border border-destructive/20 bg-destructive/5 text-center">
              <p className="text-mini text-destructive">{error}</p>
            </div>
          )}

          {!loading && results.length === 0 && debouncedQuery.trim() && (
            <StateView
              compact
              kind="search"
              title="لا توجد نتائج"
              body={`لم نجد أي أسواق مطابقة لـ «${debouncedQuery}». جرّب رمزاً آخر أو ابحث بعنوان العقد.`}
            />
          )}

          {visibleResults.length > 0 && (
            <AppList>
              {visibleResults.map((pair) => {
                const added = isAlreadyAdded(pair);
                const adding = addingId === pair.pairAddress;

                return (
                  <AppRow
                    key={`${pair.chainId}:${pair.pairAddress}`}
                    as="div"
                    leading={
                      // Token logo fallback image
                      <span className="relative h-9 w-9 rounded-full bg-muted/40 border border-border/10 flex items-center justify-center overflow-hidden">
                        {pair.imageUrl ? (
                          <img
                            src={pair.imageUrl}
                            alt={pair.symbol}
                            className="h-full w-full object-cover"
                            onError={(e) => {
                              // Hide broken image
                              (e.currentTarget as HTMLImageElement).style.display = 'none';
                            }}
                          />
                        ) : (
                          <span className="text-micro font-bold text-muted-foreground">
                            {pair.symbol.slice(0, 3)}
                          </span>
                        )}
                      </span>
                    }
                    title={
                      <span className="flex min-w-0 items-center gap-2">
                        <span className="truncate">{pair.symbol}</span>
                        <span className="shrink-0 text-micro uppercase tracking-wider font-semibold text-muted-foreground-subtle bg-muted/40 px-1.5 py-0.5 rounded-sm">
                          {CHAIN_LABELS[pair.chainId as ChainId] || pair.chainId}
                        </span>
                      </span>
                    }
                    subtitle={`${pair.name} • ${pair.dexId}`}
                  >
                    {/* Current formatted price */}
                    <span className="shrink-0 text-mini font-bold font-plex-mono text-foreground tracking-tight tabular-nums">
                      ${parseFloat(pair.priceUsd) < 0.01 ? pair.priceUsd : parseFloat(pair.priceUsd).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 6 })}
                    </span>

                    {added ? (
                      <div className="flex h-8 shrink-0 items-center gap-1 rounded-md bg-data-1/10 border border-data-1/20 px-2.5 text-micro font-bold text-data-1">
                        <Check className="h-3 w-3 shrink-0" />
                        مضاف
                      </div>
                    ) : (
                      <button
                        type="button"
                        disabled={adding}
                        onClick={() => handleAdd(pair)}
                        className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-primary hover:bg-primary/95 text-primary-foreground transition-motion duration-normal disabled:opacity-50"
                        title="إضافة لقائمة المراقبة"
                      >
                        {adding ? (
                          <Loader2 className="h-3 w-3 animate-spin" />
                        ) : (
                          <Plus className="h-4 w-4" />
                        )}
                      </button>
                    )}
                  </AppRow>
                );
              })}
            </AppList>
          )}

          {results.length > MAX_VISIBLE_RESULTS && (
            <p className="text-micro text-muted-foreground/75 text-center mt-2">
              تم إظهار أول {MAX_VISIBLE_RESULTS} من أصل {results.length} نتيجة بحث مطابقة.
            </p>
          )}
        </div>
      </div>
    </ResponsiveDrawer>
  );
}
