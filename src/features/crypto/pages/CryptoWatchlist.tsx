import { AnimatePresence, motion } from 'framer-motion';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { toast } from 'sonner';

import BackButton from '@/components/BackButton';
import SEO from '@/components/SEO';
import { AppCard, PageShell } from '@/components/ui/app-shell';
import { StateView } from '@/components/ui/state-view';
import { useConservingInterval } from '@/hooks/useConserve';
import {
  Plus,
  RefreshCw,
  Trash2,
  TrendingDown,
  TrendingUp,
} from '@/lib/icons';

import { cryptoApi } from '../api';
import TokenDetailDrawer from '../components/TokenDetailDrawer';
import TokenSearchDrawer from '../components/TokenSearchDrawer';
import { CHAIN_LABELS, type ChainId, type NormalizedPair, type WatchlistItem } from '../types';

export default function CryptoWatchlist() {
  const [watchlist, setWatchlist] = useState<WatchlistItem[]>([]);
  const [pairsData, setPairsData] = useState<NormalizedPair[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Modals & Drawers state
  const [searchOpen, setSearchOpen] = useState(false);
  const [detailOpen, setDetailOpen] = useState(false);
  const [selectedPair, setSelectedPair] = useState<NormalizedPair | null>(null);

  // Price Tick Pulsing ref to store previous prices
  const prevPricesRef = useRef<Record<string, string>>({});
  const [pulsingKeys, setPulsingKeys] = useState<Record<string, 'up' | 'down'>>({});

  // Every deferred handler timer is tracked so navigating away cancels it —
  // otherwise a pulse-clear setState or a delete network call fires minutes
  // after the screen is gone.
  const timersRef = useRef<Set<ReturnType<typeof setTimeout>>>(new Set());
  const mountedRef = useRef(true);
  const defer = (fn: () => void, ms: number) => {
    const id = setTimeout(() => {
      timersRef.current.delete(id);
      if (mountedRef.current) fn();
    }, ms);
    timersRef.current.add(id);
  };
  useEffect(
    () => () => {
      mountedRef.current = false;
      for (const id of timersRef.current) clearTimeout(id);
      timersRef.current.clear();
    },
    [],
  );

  // Fetch initial watchlist entries and their live parameters
  const loadData = async (showRefresher = false) => {
    if (showRefresher) setRefreshing(true);
    setError(null);
    try {
      const dbWatchlist = await cryptoApi.getWatchlist();
      setWatchlist(dbWatchlist);

      if (dbWatchlist.length > 0) {
        const queryPairs = dbWatchlist.map((item) => ({
          chainId: item.chain_id as ChainId,
          pairAddress: item.pair_address,
        }));

        const liveData = await cryptoApi.batchLookup(queryPairs);

        // Detect price changes and trigger subtle pulse animations
        const newPulsing: Record<string, 'up' | 'down'> = {};
        liveData.forEach((pair) => {
          const key = `${pair.chainId}:${pair.pairAddress}`;
          const oldPriceStr = prevPricesRef.current[key];
          const newPriceStr = pair.priceUsd;

          if (oldPriceStr && oldPriceStr !== newPriceStr) {
            const oldVal = parseFloat(oldPriceStr);
            const newVal = parseFloat(newPriceStr);
            if (!isNaN(oldVal) && !isNaN(newVal)) {
              newPulsing[key] = newVal > oldVal ? 'up' : 'down';
            }
          }
          // Store new price for next tick
          prevPricesRef.current[key] = newPriceStr;
        });

        if (Object.keys(newPulsing).length > 0) {
          setPulsingKeys((prev) => ({ ...prev, ...newPulsing }));
          // Clear pulsing states after 1.5s
          defer(() => {
            setPulsingKeys((prev) => {
              const updated = { ...prev };
              Object.keys(newPulsing).forEach((k) => delete updated[k]);
              return updated;
            });
          }, 1500);
        }

        setPairsData(liveData);
      } else {
        setPairsData([]);
      }
    } catch (err: unknown) {
      console.error('[CryptoWatchlist] Load failed:', err);
      setError('تعذّر جلب أسعار العملات الحية. يرجى التحقق من اتصال الشبكة.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  // Keep a stable reference to the latest loader so the polling hook below is
  // armed once and never re-armed by an unrelated render.
  const loadRef = useRef(loadData);
  useEffect(() => {
    loadRef.current = loadData;
  });

  useEffect(() => {
    void loadRef.current();
  }, []);

  const poll = useCallback(() => {
    void loadRef.current();
  }, []);

  // Price polling is `optional`: on a device in hard conservation we stop
  // entirely rather than stretch, because the screen has a pull-to-refresh and
  // a manual refresh button — the user can always ask for fresh prices, and a
  // watchlist quietly costing battery in the background is worse than a price
  // that is a few minutes old. Visibility pausing and the refresh-on-return are
  // now part of the hook instead of hand-rolled here.
  useConservingInterval(poll, 30 * 1000, { optional: true, refreshOnResume: true });


  // Remove Watchlist item with undo toast logic
  const handleRemove = async (dbId: string, symbol: string, chainId: string, address: string) => {
    // 1. Optimistic UI update
    const previousWatchlist = [...watchlist];
    const previousPairs = [...pairsData];

    setWatchlist((prev) => prev.filter((item) => item.id !== dbId));
    setPairsData((prev) => prev.filter((p) => !(p.chainId === chainId && p.pairAddress.toLowerCase() === address.toLowerCase())));

    let undo = false;

    toast(`تمت إزالة ${symbol} من قائمة المراقبة`, {
      action: {
        label: 'تراجع',
        onClick: () => {
          undo = true;
          // Restore state
          setWatchlist(previousWatchlist);
          setPairsData(previousPairs);
        },
      },
      duration: 5000,
    });

    // Wait for toast duration or close
    defer(() => { void (async () => {
      if (!undo) {
        try {
          await cryptoApi.removeFromWatchlist(dbId);
        } catch (err) {
          console.error('[CryptoWatchlist] Remove failed:', err);
          toast.error(`فشل إزالة ${symbol} من خوادم قائمة البيانات.`);
          // Rollback
          setWatchlist(previousWatchlist);
          setPairsData(previousPairs);
        }
      }
    })(); }, 5100);
  };

  const handleOpenDetail = (pair: NormalizedPair) => {
    setSelectedPair(pair);
    setDetailOpen(true);
  };

  // Safe decimal string formatting
  const formatPrice = (priceStr: string) => {
    const val = parseFloat(priceStr);
    if (isNaN(val)) return '$0.00';
    if (val === 0) return '$0.00';

    if (val < 0.00001) {
      // Find index of first significant digit
      const matches = priceStr.match(/0\.0+([1-9]\d*)/);
      if (matches && matches[1]) {
        return `$${priceStr}`;
      }
      return `$${val.toFixed(8)}`;
    }

    if (val < 0.01) {
      return `$${val.toFixed(6)}`;
    }
    if (val < 1) {
      return `$${val.toFixed(4)}`;
    }
    return `$${val.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 4 })}`;
  };

  // Format volume and liquidity to compact sizes
  const formatCompact = (numStr: string) => {
    const val = parseFloat(numStr);
    if (isNaN(val)) return '-';
    if (val >= 1e9) return `$${(val / 1e9).toFixed(2)}B`;
    if (val >= 1e6) return `$${(val / 1e6).toFixed(2)}M`;
    if (val >= 1e3) return `$${(val / 1e3).toFixed(0)}K`;
    return `$${val.toLocaleString()}`;
  };

  return (
    <PageShell>
      <SEO
        title="مراقب العملات الرقمية — قائمة المراقبة"
        description="متابعة أسعار العملات المشفرة، السيولة، حجم التداول والتحليلات الفورية عبر DEX Screener"
        path="/crypto"
      />

      {/* Header bar */}
      <div className="flex items-center justify-between gap-3 mb-5">
        <div className="flex items-center gap-3 min-w-0">
          <BackButton />
          <div className="min-w-0">
            <h1 className="text-title font-bold text-foreground tracking-tight">قائمة العملات</h1>
            <p className="flex items-center gap-1.5 text-micro text-muted-foreground font-medium mt-0.5">
              <span className="relative flex h-1.5 w-1.5">
                <span className="absolute inset-0 rounded-full bg-emerald-500/60 animate-ping" />
                <span className="relative h-1.5 w-1.5 rounded-full bg-emerald-500" />
              </span>
              تحديث حي • DEX Screener
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* Manual Refresh Button */}
          <button
            type="button"
            disabled={refreshing || loading}
            onClick={() => loadData(true)}
            className="flex h-10 w-10 items-center justify-center rounded-2xl border border-border/40 bg-card/40 backdrop-blur-sm text-muted-foreground hover:text-foreground active:scale-95 disabled:opacity-50 transition-motion"
            title="تحديث الأسعار"
            aria-label="تحديث الأسعار"
          >
            <RefreshCw className={`h-4 w-4 ${refreshing ? 'animate-spin text-primary' : ''}`} />
          </button>

          {/* Add Coin Button */}
          <button
            type="button"
            onClick={() => setSearchOpen(true)}
            className="flex h-10 gap-2 items-center rounded-2xl bg-primary hover:bg-primary/95 text-primary-foreground font-bold px-4 shadow-sm active:scale-95 transition-motion text-mini"
          >
            <Plus className="h-4 w-4" />
            إضافة عملة
          </button>
        </div>
      </div>

      {/* Main content body */}
      <div className="space-y-3">
        {loading ? (
          // Elegant skeleton loading state
          <div className="space-y-3" role="status" aria-label="تحميل قائمة العملات">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="animate-pulse h-16 w-full rounded-xl bg-card/20 border border-border/10 p-3 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="h-9 w-9 rounded-full bg-muted/40 shrink-0" />
                  <div className="space-y-1.5">
                    <div className="h-4 w-16 bg-muted/40 rounded" />
                    <div className="h-3 w-24 bg-muted/40 rounded" />
                  </div>
                </div>
                <div className="space-y-1.5 text-end">
                  <div className="h-4 w-20 bg-muted/40 rounded ms-auto" />
                  <div className="h-3 w-12 bg-muted/40 rounded ms-auto" />
                </div>
              </div>
            ))}
          </div>
        ) : error && watchlist.length === 0 ? (
          // Offline and "the price service failed" are different problems and
          // deserve different sentences: one is the user's connection and will
          // fix itself, the other is ours and needs a retry.
          <StateView
            kind={navigator.onLine ? 'error' : 'offline'}
            title={navigator.onLine ? 'تعذّر جلب الأسعار' : 'لا يوجد اتصال بالإنترنت'}
            body={
              navigator.onLine
                ? 'خدمة الأسعار لم تستجب هذه المرة. قائمتك محفوظة كما هي، وستظهر الأسعار عند إعادة المحاولة.'
                : 'أسعار العملات تحتاج اتصالاً مباشراً. قائمتك محفوظة، وستُحدَّث الأسعار تلقائياً عند عودة الاتصال.'
            }
            action={{
              label: 'إعادة المحاولة',
              onClick: () => void loadData(true),
              pending: refreshing,
            }}
          />
        ) : watchlist.length === 0 ? (
          <StateView
            kind="empty"
            title="قائمة المراقبة فارغة"
            body="لم تُضِف أي عملة بعد. ابحث عن زوج تداول لتتابع سعره الحيّ وتغيّره خلال 24 ساعة في مكان واحد."
            action={{ label: 'ابحث عن عملة', onClick: () => setSearchOpen(true) }}
          />

        ) : (
          // Watchlisted token entries
          <div className="space-y-2.5">
            <AnimatePresence initial={false}>
              {watchlist.map((item) => {
                // Find matching live pair data
                const pair = pairsData.find(
                  (p) => p.chainId === item.chain_id && p.pairAddress.toLowerCase() === item.pair_address.toLowerCase()
                );

                const pulseState = pulsingKeys[`${item.chain_id}:${item.pair_address}`];
                const priceChg = pair ? parseFloat(pair.priceChange24h) : 0;
                const isUp = priceChg >= 0;

                return (
                  <motion.div
                    key={item.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                    transition={{ duration: 0.25 }}
                  >
                    <AppCard
                      pressable
                      onClick={() => pair && handleOpenDetail(pair)}
                      className={`group flex items-center justify-between gap-3 rounded-2xl border border-border/10 bg-card/30 backdrop-blur-sm p-3.5 hover:bg-card/50 hover:border-border/25 transition-motion relative overflow-hidden ${
                        pulseState === 'up'
                          ? 'ring-1 ring-emerald-500/30 bg-emerald-500/5'
                          : pulseState === 'down'
                          ? 'ring-1 ring-rose-500/30 bg-rose-500/5'
                          : ''
                      }`}
                    >
                      {/* Trend hairline on the leading edge */}
                      <span
                        aria-hidden
                        className={`absolute inset-y-2 start-0 w-[2px] rounded-full ${
                          isUp ? 'bg-emerald-500/50' : 'bg-rose-500/50'
                        }`}
                      />

                      <div className="flex items-center gap-3 min-w-0">
                        {/* Fallback image */}
                        <div className="relative h-10 w-10 rounded-full bg-muted/30 border border-border/20 flex items-center justify-center overflow-hidden shrink-0 shadow-inner">
                          {pair?.imageUrl ? (
                            <img
                              src={pair.imageUrl}
                              alt={item.token_symbol}
                              className="h-full w-full object-cover"
                              onError={(e) => {
                                (e.currentTarget as HTMLImageElement).style.display = 'none';
                              }}
                            />
                          ) : (
                            <span className="text-micro font-bold text-muted-foreground uppercase">
                              {item.token_symbol.slice(0, 3)}
                            </span>
                          )}
                        </div>

                        {/* Symbolic identifiers */}
                        <div className="min-w-0">
                          <div className="flex items-center gap-1.5">
                            <span className="text-meta font-bold text-foreground tracking-tight truncate">
                              {item.token_symbol}
                            </span>
                            <span className="text-micro uppercase tracking-[0.08em] font-bold text-muted-foreground/80 border border-border/25 px-1.5 py-[1px] rounded-full">
                              {CHAIN_LABELS[item.chain_id as ChainId] || item.chain_id}
                            </span>
                          </div>
                          <p className="text-micro text-muted-foreground truncate max-w-[130px] md:max-w-[200px] mt-0.5">
                            {item.label || (pair ? pair.name : 'جاري التحميل...')}
                          </p>
                        </div>
                      </div>

                      {/* Financial parameters */}
                      <div className="flex items-center gap-2.5 shrink-0">
                        {pair ? (
                          <div className="text-end">
                            {/* Monospaced, tabular numerals for prices */}
                            <p className="text-meta font-bold font-plex-mono text-foreground tracking-tight tabular-nums">
                              {formatPrice(pair.priceUsd)}
                            </p>

                            <div className="flex items-center justify-end gap-1.5 mt-1">
                              <span className="text-micro text-muted-foreground/80 font-plex-mono tabular-nums">
                                {formatCompact(pair.volume24h)}
                              </span>
                              {/* Non-color-only indications: Icon represents trend direction */}
                              <span
                                className={`text-micro font-bold font-plex-mono tabular-nums flex items-center gap-0.5 rounded-full px-1.5 py-[2px] ${
                                  isUp
                                    ? 'text-emerald-500 bg-emerald-500/10'
                                    : 'text-rose-500 bg-rose-500/10'
                                }`}
                              >
                                {isUp ? (
                                  <TrendingUp className="h-3 w-3 shrink-0" />
                                ) : (
                                  <TrendingDown className="h-3 w-3 shrink-0" />
                                )}
                                {Math.abs(priceChg).toFixed(2)}%
                              </span>
                            </div>
                          </div>
                        ) : (
                          <div className="text-end animate-pulse space-y-1">
                            <div className="h-4 w-16 bg-muted/40 rounded ms-auto" />
                            <div className="h-3 w-10 bg-muted/40 rounded ms-auto" />
                          </div>
                        )}

                        {/* Separate Explicit Remove Action */}
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation(); // prevent opening detail
                            handleRemove(item.id, item.token_symbol, item.chain_id, item.pair_address);
                          }}
                          className="flex h-9 w-9 items-center justify-center rounded-xl border border-border/10 text-muted-foreground/50 opacity-70 group-hover:opacity-100 hover:border-rose-500/25 hover:bg-rose-500/10 hover:text-rose-500 transition-motion"
                          title="إزالة من القائمة"
                          aria-label={`إزالة ${item.token_symbol} من القائمة`}
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </AppCard>
                  </motion.div>
                );
              })}
            </AnimatePresence>
          </div>
        )}
      </div>

      {/* Slidable/responsive search and add sheets */}
      <TokenSearchDrawer
        open={searchOpen}
        onOpenChange={setSearchOpen}
        watchlistPairs={watchlist.map((item) => ({
          chainId: item.chain_id,
          pairAddress: item.pair_address,
        }))}
        onAddSuccess={() => {
          setSearchOpen(false);
          loadData();
        }}
      />

      {/* Slidable/responsive granular coin details sheet */}
      <TokenDetailDrawer
        open={detailOpen}
        onOpenChange={setDetailOpen}
        pair={selectedPair}
        delisted={selectedPair ? !pairsData.some((p) => p.chainId === selectedPair.chainId && p.pairAddress.toLowerCase() === selectedPair.pairAddress.toLowerCase()) : false}
      />
    </PageShell>
  );
}
