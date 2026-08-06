import React, { useEffect, useState } from 'react';
import { toast } from 'sonner';

import { AppCard } from '@/components/ui/app-shell';
import ResponsiveDrawer from '@/components/ui/ResponsiveDrawer';
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

import { cryptoApi } from '../api';
import { type ChainId, CHAIN_LABELS, type NormalizedPair } from '../types';

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
    if (!debouncedQuery.trim()) {
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
      } catch (err: any) {
        console.error('[TokenSearchDrawer] Search failed:', err);
        setError(err.message || 'فشل البحث. يرجى التحقق من الاتصال بالشبكة.');
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
    } catch (err: any) {
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
            className="w-full h-11 bg-muted/40 border border-border/40 rounded-md pe-10 ps-4 text-sm text-foreground placeholder:text-muted-foreground outline-none focus:border-primary/50 transition-colors"
            style={{ fontSize: 16 }}
            maxLength={100}
            autoFocus
          />
          <Search className="absolute right-3.5 h-4 w-4 text-muted-foreground pointer-events-none" />
          {loading && (
            <Loader2 className="absolute left-3.5 h-4 w-4 text-primary animate-spin" />
          )}
        </div>

        {/* Search results & states */}
        <div className="space-y-2.5 max-h-[48dvh] overflow-y-auto pe-0.5 scrollbar-thin">
          {error && (
            <div className="p-4 rounded-md border border-destructive/20 bg-destructive/5 text-center">
              <p className="text-xs text-destructive">{error}</p>
            </div>
          )}

          {!loading && results.length === 0 && debouncedQuery.trim() && (
            <div className="py-8 text-center" role="status">
              <p className="text-sm font-semibold text-foreground/80 mb-1">لا توجد نتائج</p>
              <p className="text-xs text-muted-foreground">
                لم نجد أي أسواق مطابقة لـ «{debouncedQuery}». جرّب رمزاً آخر.
              </p>
            </div>
          )}

          {visibleResults.map((pair) => {
            const added = isAlreadyAdded(pair);
            const adding = addingId === pair.pairAddress;

            return (
              <AppCard
                key={`${pair.chainId}:${pair.pairAddress}`}
                compact
                className="flex items-center justify-between border border-border/10 bg-card/25 backdrop-blur-sm p-3 hover:bg-card/40 transition-colors"
              >
                <div className="flex items-center gap-3">
                  {/* Token logo fallback image */}
                  <div className="relative h-9 w-9 rounded-full bg-muted/40 border border-border/10 flex items-center justify-center overflow-hidden shrink-0">
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
                      <span className="text-[0.625rem] font-bold text-muted-foreground">
                        {pair.symbol.slice(0, 3)}
                      </span>
                    )}
                  </div>

                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-bold text-foreground tracking-tight truncate">
                        {pair.symbol}
                      </span>
                      <span className="text-[0.625rem] uppercase tracking-wider font-semibold text-muted-foreground/80 bg-muted/40 px-1.5 py-0.5 rounded-sm shrink-0">
                        {CHAIN_LABELS[pair.chainId as ChainId] || pair.chainId}
                      </span>
                    </div>
                    <p className="text-[0.6875rem] text-muted-foreground truncate max-w-[160px] md:max-w-[200px]">
                      {pair.name} • {pair.dexId}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  {/* Current formatted price */}
                  <span className="text-xs font-bold font-plex-mono text-foreground tracking-tight tabular-nums">
                    ${parseFloat(pair.priceUsd) < 0.01 ? pair.priceUsd : parseFloat(pair.priceUsd).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 6 })}
                  </span>

                  {added ? (
                    <div className="flex h-8 items-center gap-1 rounded-md bg-emerald-500/10 border border-emerald-500/20 px-2.5 text-[0.625rem] font-bold text-emerald-500">
                      <Check className="h-3 w-3 shrink-0" />
                      مضاف
                    </div>
                  ) : (
                    <button
                      type="button"
                      disabled={adding}
                      onClick={() => handleAdd(pair)}
                      className="flex h-8 w-8 items-center justify-center rounded-md bg-primary hover:bg-primary/95 text-primary-foreground transition-all duration-normal active:scale-95 disabled:opacity-50"
                      title="إضافة لقائمة المراقبة"
                    >
                      {adding ? (
                        <Loader2 className="h-3 w-3 animate-spin" />
                      ) : (
                        <Plus className="h-4 w-4" />
                      )}
                    </button>
                  )}
                </div>
              </AppCard>
            );
          })}

          {results.length > MAX_VISIBLE_RESULTS && (
            <p className="text-[0.625rem] text-muted-foreground/75 text-center mt-2">
              تم إظهار أول {MAX_VISIBLE_RESULTS} من أصل {results.length} نتيجة بحث مطابقة.
            </p>
          )}
        </div>
      </div>
    </ResponsiveDrawer>
  );
}
