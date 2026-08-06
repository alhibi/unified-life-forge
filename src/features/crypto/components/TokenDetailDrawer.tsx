import React from 'react';

import { AppCard } from '@/components/ui/app-shell';
import ResponsiveDrawer from '@/components/ui/ResponsiveDrawer';
import { type ChainId, CHAIN_LABELS, type NormalizedPair } from '../types';

interface TokenDetailDrawerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  pair: NormalizedPair | null;
  delisted?: boolean;
}

export default function TokenDetailDrawer({
  open,
  onOpenChange,
  pair,
  delisted = false,
}: TokenDetailDrawerProps) {
  if (!pair) return null;

  // Format large numbers in millions/billions
  const formatCompact = (numStr: string) => {
    const val = parseFloat(numStr);
    if (isNaN(val)) return '-';
    if (val >= 1e9) return `$${(val / 1e9).toFixed(2)}B`;
    if (val >= 1e6) return `$${(val / 1e6).toFixed(2)}M`;
    if (val >= 1e3) return `$${(val / 1e3).toFixed(1)}K`;
    return `$${val.toLocaleString()}`;
  };

  const buySellRatio = () => {
    const buys = pair.txns24h.buys;
    const sells = pair.txns24h.sells;
    const total = buys + sells;
    if (total === 0) return { buysPct: 50, sellsPct: 50 };
    return {
      buysPct: Math.round((buys / total) * 100),
      sellsPct: Math.round((sells / total) * 100),
    };
  };

  const ratio = buySellRatio();

  // Create DexScreener embed widget URL
  const getEmbedUrl = () => {
    return `https://dexscreener.com/${pair.chainId}/${pair.pairAddress}?embed=1&theme=dark&trades=0&info=0`;
  };

  const isUp = parseFloat(pair.priceChange24h) >= 0;

  return (
    <ResponsiveDrawer
      open={open}
      onOpenChange={onOpenChange}
      title={`${pair.symbol} / ${pair.quoteTokenSymbol}`}
      description={`${pair.name} • أسواق ${pair.dexId}`}
    >
      <div className="space-y-4 px-1 pb-4">
        {delisted && (
          <div className="p-4 rounded-md border border-destructive/20 bg-destructive/5 text-center">
            <p className="text-xs text-destructive font-semibold">
              هذه العملة قد تكون ملغاة أو غير نشطة حالياً على منصات التداول.
            </p>
          </div>
        )}

        {/* Embedded Chart / Link out */}
        <div className="overflow-hidden rounded-md border border-border/10 bg-black aspect-video w-full relative">
          <iframe
            src={getEmbedUrl()}
            title={`DexScreener chart for ${pair.symbol}`}
            className="w-full h-full border-0 absolute inset-0"
            allow="fullscreen"
          />
        </div>

        {/* High Density Metric Cards */}
        <div className="grid grid-cols-2 gap-3">
          <AppCard compact className="bg-muted/10 border border-border/5">
            <span className="text-[0.625rem] text-muted-foreground font-semibold">القيمة السوقية</span>
            <p className="text-sm font-bold font-plex-mono text-foreground tracking-tight tabular-nums mt-0.5">
              {pair.marketCap ? formatCompact(pair.marketCap) : '-'}
            </p>
          </AppCard>

          <AppCard compact className="bg-muted/10 border border-border/5">
            <span className="text-[0.625rem] text-muted-foreground font-semibold">التقييم المخفف بالكامل (FDV)</span>
            <p className="text-sm font-bold font-plex-mono text-foreground tracking-tight tabular-nums mt-0.5">
              {pair.fdv ? formatCompact(pair.fdv) : '-'}
            </p>
          </AppCard>

          <AppCard compact className="bg-muted/10 border border-border/5">
            <span className="text-[0.625rem] text-muted-foreground font-semibold">السيولة</span>
            <p className="text-sm font-bold font-plex-mono text-foreground tracking-tight tabular-nums mt-0.5">
              {pair.liquidityUsd ? formatCompact(pair.liquidityUsd) : '-'}
            </p>
          </AppCard>

          <AppCard compact className="bg-muted/10 border border-border/5">
            <span className="text-[0.625rem] text-muted-foreground font-semibold">حجم التداول (24 ساعة)</span>
            <p className="text-sm font-bold font-plex-mono text-foreground tracking-tight tabular-nums mt-0.5">
              {pair.volume24h ? formatCompact(pair.volume24h) : '-'}
            </p>
          </AppCard>
        </div>

        {/* Buy/Sell Volume Split */}
        <div className="space-y-1.5 bg-muted/10 border border-border/5 rounded-md p-3">
          <div className="flex items-center justify-between text-[0.625rem] text-muted-foreground font-semibold">
            <span>نسبة عمليات الشراء ({ratio.buysPct}%)</span>
            <span>نسبة عمليات البيع ({ratio.sellsPct}%)</span>
          </div>
          <div className="h-1.5 w-full rounded-full bg-rose-500/20 overflow-hidden flex">
            <div
              className="bg-emerald-500 h-full transition-all duration-500"
              style={{ width: `${ratio.buysPct}%` }}
            />
          </div>
          <div className="flex justify-between text-[0.6875rem] font-plex-mono tracking-tight tabular-nums font-bold mt-1">
            <span className="text-emerald-500">▲ {pair.txns24h.buys} شراء</span>
            <span className="text-rose-500">▼ {pair.txns24h.sells} بيع</span>
          </div>
        </div>

        {/* Token Details list */}
        <div className="space-y-2 text-xs">
          <div className="flex justify-between py-1.5 border-b border-border/10">
            <span className="text-muted-foreground">الشبكة</span>
            <span className="font-bold text-foreground capitalize">
              {CHAIN_LABELS[pair.chainId as ChainId] || pair.chainId}
            </span>
          </div>
          <div className="flex justify-between py-1.5 border-b border-border/10">
            <span className="text-muted-foreground">عنوان الزوج</span>
            <span className="font-bold font-plex-mono text-foreground select-all tabular-nums text-[0.625rem]">
              {pair.pairAddress}
            </span>
          </div>
          <div className="flex justify-between py-1.5 border-b border-border/10">
            <span className="text-muted-foreground">العملة الأساسية</span>
            <span className="font-bold font-plex-mono text-foreground select-all tabular-nums text-[0.625rem]">
              {pair.baseTokenAddress}
            </span>
          </div>
        </div>

        {/* External links */}
        {(pair.websites.length > 0 || pair.socials.length > 0) && (
          <div className="space-y-2">
            <span className="text-[0.625rem] text-muted-foreground font-bold tracking-wider uppercase block">
              الروابط والمجتمعات
            </span>
            <div className="flex flex-wrap gap-2">
              {pair.websites.map((w, idx) => (
                <a
                  key={idx}
                  href={w.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex h-8 items-center gap-1.5 rounded-md border border-border/40 bg-muted/20 px-3 text-xs font-semibold text-foreground hover:bg-muted/40 transition-colors"
                >
                  🌐 {w.label || 'الموقع الرسمي'}
                </a>
              ))}
              {pair.socials.map((s, idx) => (
                <a
                  key={idx}
                  href={s.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex h-8 items-center gap-1.5 rounded-md border border-border/40 bg-muted/20 px-3 text-xs font-semibold text-foreground hover:bg-muted/40 transition-colors"
                >
                  💬 {s.platform}
                </a>
              ))}
            </div>
          </div>
        )}

        <div className="pt-2">
          <a
            href={`https://dexscreener.com/${pair.chainId}/${pair.pairAddress}`}
            target="_blank"
            rel="noopener noreferrer"
            className="flex h-11 w-full items-center justify-center gap-2 rounded-md bg-muted/60 border border-border/40 hover:bg-muted text-xs font-bold text-foreground transition-all duration-normal active:scale-95"
          >
            📊 فتح الصفحة الكاملة على DEX Screener
          </a>
        </div>
      </div>
    </ResponsiveDrawer>
  );
}
