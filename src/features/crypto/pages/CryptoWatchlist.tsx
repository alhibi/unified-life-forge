import { AnimatePresence, motion } from 'framer-motion';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { toast } from 'sonner';

import PageHeader from '@/components/PageHeader';
import SEO from '@/components/SEO';
import { AppCard, AppList, AppRow, IconButton, PageShell } from '@/components/ui/app-shell';
import { Button } from '@/components/ui/button';
import { SkeletonList } from '@/components/ui/skeleton';
import { StateView } from '@/components/ui/state-view';
import { useConservingInterval } from '@/hooks/useConserve';
import {
  Activity,
  Plus,
  RefreshCw,
  Trash2,
  TrendingDown,
  TrendingUp,
  Waves,
} from '@/lib/icons';
import { cn } from '@/lib/utils';

import { cryptoApi } from '../api';
import TokenDetailDrawer from '../components/TokenDetailDrawer';
import TokenSearchDrawer from '../components/TokenSearchDrawer';
import { CHAIN_LABELS, type ChainId, type NormalizedPair, type WatchlistItem } from '../types';

/**
 * What a watchlist gives the user. Rendered beside the empty/offline states so
 * the screen answers "and then what?" instead of leaving a void under the
 * message; every line describes real behaviour of this page.
 */
const WATCHLIST_BENEFITS = [
  {
    icon: Activity,
    title: 'السعر اللحظي',
    body: 'سعر الزوج واتجاهه خلال 24 ساعة، يُحدَّث تلقائياً كل 30 ثانية.',
  },
  {
    icon: TrendingUp,
    title: 'حركة مفهومة',
    body: 'تغيّر السعر مع حجم التداول، ليتميّز الاتجاه الحقيقي من الوميض العابر.',
  },
  {
    icon: Waves,
    title: 'التفاصيل عند الطلب',
    body: 'افتح أي عملة لترى السيولة والرسم السعري الكامل في لوحة التفاصيل.',
  },
] as const;

function WatchlistGuide() {
  return (
    <AppCard className="p-5">
      <h2 className="text-title font-semibold text-foreground">ماذا تعرض القائمة؟</h2>
      <p className="mt-1 text-mini leading-relaxed text-muted-foreground">
        كل ما تحتاجه لمتابعة أداء العملات التي تهمّك، في مكان واحد.
      </p>
      <ul className="mt-4 space-y-4">
        {WATCHLIST_BENEFITS.map(({ icon: Icon, title, body }) => (
          <li key={title} className="flex items-start gap-3">
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
              <Icon className="h-4 w-4" aria-hidden />
            </span>
            <span className="min-w-0">
              <span className="block text-meta font-semibold text-foreground">{title}</span>
              <span className="mt-0.5 block text-mini leading-relaxed text-muted-foreground">
                {body}
              </span>
            </span>
          </li>
        ))}
      </ul>
    </AppCard>
  );
}

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

  // Presentation-only aggregates over data already in state: they answer
  // "how is my list doing?" before the user reads individual rows.
  const gainersCount = pairsData.filter((p) => parseFloat(p.priceChange24h) >= 0).length;
  const losersCount = pairsData.length - gainersCount;
  const watchlistLabel =
    watchlist.length === 1
      ? 'عملة واحدة في قائمتك'
      : watchlist.length === 2
        ? 'عملتان في قائمتك'
        : watchlist.length >= 3 && watchlist.length <= 10
          ? `${watchlist.length} عملات في قائمتك`
          : `${watchlist.length} عملة في قائمتك`;

  return (
    <PageShell width="workspace">
      <SEO
        title="مراقب العملات الرقمية — قائمة المراقبة"
        description="متابعة أسعار العملات المشفرة، السيولة، حجم التداول والتحليلات الفورية عبر DEX Screener"
        path="/crypto"
      />

      {/* Header — the display register keeps the title on its own row so it can
          never be truncated by the action cluster on narrow phones; the live
          tick rides in the subtitle slot and refresh stays the only header
          action. "Add coin" is a content action with its own slot below. */}
      <PageHeader
        variant="display"
        eyebrow="مراقب العملات"
        title="قائمة العملات"
        subtitle={
          <span className="flex items-center gap-1.5">
            <span className="relative flex h-1.5 w-1.5" aria-hidden>
              <span className="absolute inset-0 rounded-full bg-data-1/60 animate-ping" />
              <span className="relative h-1.5 w-1.5 rounded-full bg-data-1" />
            </span>
            <span>تحديث حي تلقائي</span>
            <span className="text-muted-foreground-subtle" aria-hidden>·</span>
            <span dir="ltr">DEX Screener</span>
          </span>
        }
        right={
          <IconButton
            disabled={refreshing || loading}
            onClick={() => loadData(true)}
            title="تحديث الأسعار"
            aria-label="تحديث الأسعار"
          >
            <RefreshCw className={cn('h-4 w-4', refreshing && 'animate-spin text-primary')} />
          </IconButton>
        }
      />

      {/* Content states — each state is composed to the size of its message
          and action, with the "what this page gives" panel beside it on wide
          screens so the page never ends in an unexplained void. */}
      <div>
        {loading ? (
          <div className="space-y-4">
            <div className="flex items-center justify-between gap-3" aria-hidden>
              <div className="space-y-2">
                <div className="h-4 w-32 animate-pulse rounded bg-muted/40" />
                <div className="h-3 w-48 animate-pulse rounded bg-muted/25" />
              </div>
              <div className="h-12 w-28 animate-pulse rounded-lg bg-muted/30" />
            </div>
            <AppList>
              <SkeletonList rows={4} rowHeight={64} className="px-4" />
            </AppList>
          </div>
        ) : error && watchlist.length === 0 ? (
          // Offline and "the price service failed" are different problems and
          // deserve different sentences: one is the user's connection and will
          // fix itself, the other is ours and needs a retry.
          <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,1.05fr)_minmax(0,0.95fr)]">
            <StateView
              kind={navigator.onLine ? 'error' : 'offline'}
              compact
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
              secondary="تتحدّث الأسعار تلقائياً كل 30 ثانية عند عودة الخدمة."
            />
            <WatchlistGuide />
          </div>
        ) : watchlist.length === 0 ? (
          <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,1.05fr)_minmax(0,0.95fr)]">
            <StateView
              kind="empty"
              compact
              title="لا عملات في قائمتك بعد"
              body="أضف أول زوج تداول لتتابع سعره الحيّ وتغيّره خلال 24 ساعة وحجم التداول في مكان واحد."
              action={{
                label: 'ابحث عن عملة',
                onClick: () => setSearchOpen(true),
                icon: <Plus className="h-3.5 w-3.5" />,
              }}
              secondary="قائمة المراقبة محفوظة في حسابك وتظهر على كل أجهزتك."
            />
            <WatchlistGuide />
          </div>
        ) : (
          <div className="space-y-4">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div className="min-w-0">
                <p className="text-meta font-semibold text-foreground">{watchlistLabel}</p>
                <p className="mt-0.5 text-mini text-muted-foreground">
                  {pairsData.length > 0
                    ? `${gainersCount} مرتفعة · ${losersCount} منخفضة خلال 24 ساعة`
                    : 'الأسعار الحية غير متاحة الآن؛ قائمتك كما هي.'}
                </p>
              </div>
              <Button
                onClick={() => setSearchOpen(true)}
                className="w-full shrink-0 gap-2 font-bold sm:w-auto"
              >
                <Plus className="h-4 w-4" />
                إضافة عملة
              </Button>
            </div>
            {/* Watchlisted token entries — one grouped list, one row per token. */}
            <AppList>
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
                    <AppRow
                      as="div"
                      onClick={() => pair && handleOpenDetail(pair)}
                      role="button"
                      tabIndex={0}
                      onKeyDown={(e) => {
                        if ((e.key === 'Enter' || e.key === ' ') && pair) {
                          e.preventDefault();
                          handleOpenDetail(pair);
                        }
                      }}
                      className={cn(
                        'relative',
                        pulseState === 'up'
                          ? 'ring-1 ring-data-1/30 bg-data-1/5'
                          : pulseState === 'down'
                            ? 'ring-1 ring-data-5/30 bg-data-5/5'
                            : '',
                      )}
                      leading={
                        // Fallback image
                        <span className="relative h-10 w-10 rounded-full bg-muted/30 border border-border/20 flex items-center justify-center overflow-hidden">
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
                        </span>
                      }
                      title={
                        <span className="flex min-w-0 items-center gap-1.5">
                          <span className="truncate">{item.token_symbol}</span>
                          <span className="shrink-0 text-micro uppercase tracking-[0.08em] font-bold text-muted-foreground-subtle border border-border/25 px-1.5 py-px rounded-full">
                            {CHAIN_LABELS[item.chain_id as ChainId] || item.chain_id}
                          </span>
                        </span>
                      }
                      subtitle={item.label || (pair ? pair.name : 'جاري التحميل...')}
                    >
                      {/* Trend hairline on the leading edge */}
                      <span
                        aria-hidden
                        className={cn(
                          'absolute inset-y-2 start-0 w-[2px] rounded-full',
                          isUp ? 'bg-data-1/50' : 'bg-data-5/50',
                        )}
                      />

                      {/* Financial parameters */}
                      <span className="flex shrink-0 items-center gap-2.5">
                        {pair ? (
                          <span className="flex flex-col items-end">
                            {/* Monospaced, tabular numerals for prices */}
                            <span className="text-meta font-bold font-plex-mono text-foreground tabular-nums">
                              {formatPrice(pair.priceUsd)}
                            </span>

                            <span className="mt-1 flex items-center justify-end gap-1.5">
                              <span className="text-micro text-muted-foreground-subtle font-plex-mono tabular-nums">
                                {formatCompact(pair.volume24h)}
                              </span>
                              {/* Non-color-only indications: Icon represents trend direction */}
                              <span
                                className={cn(
                                  'flex items-center gap-0.5 rounded-full px-1.5 py-[2px] text-micro font-bold font-plex-mono tabular-nums',
                                  isUp
                                    ? 'text-data-1 bg-data-1/10'
                                    : 'text-data-5 bg-data-5/10',
                                )}
                              >
                                {isUp ? (
                                  <TrendingUp className="h-3 w-3 shrink-0" />
                                ) : (
                                  <TrendingDown className="h-3 w-3 shrink-0" />
                                )}
                                {Math.abs(priceChg).toFixed(2)}%
                              </span>
                            </span>
                          </span>
                        ) : (
                          <span className="flex animate-pulse flex-col items-end gap-1">
                            <span className="h-4 w-16 bg-muted/40 rounded" />
                            <span className="h-3 w-10 bg-muted/40 rounded" />
                          </span>
                        )}

                        {/* Separate Explicit Remove Action */}
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation(); // prevent opening detail
                            handleRemove(item.id, item.token_symbol, item.chain_id, item.pair_address);
                          }}
                          className="flex h-9 w-9 items-center justify-center rounded-md border border-border/10 text-muted-foreground-subtle opacity-70 hover:border-data-5/25 hover:bg-data-5/10 hover:text-data-5 hover:opacity-100 transition-motion"
                          title="إزالة من القائمة"
                          aria-label={`إزالة ${item.token_symbol} من القائمة`}
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </span>
                    </AppRow>
                  </motion.div>
                );
              })}
            </AnimatePresence>
            </AppList>
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
