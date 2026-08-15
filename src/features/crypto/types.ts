import { z } from 'zod';

export const SUPPORTED_CHAINS = ['solana', 'ethereum', 'bsc', 'base', 'arbitrum', 'polygon'] as const;
export type ChainId = typeof SUPPORTED_CHAINS[number];

// Match the display names and icons/logos for the chains
export const CHAIN_LABELS: Record<ChainId, string> = {
  solana: 'Solana',
  ethereum: 'Ethereum',
  bsc: 'BNB Chain',
  base: 'Base',
  arbitrum: 'Arbitrum',
  polygon: 'Polygon',
};

export const WatchlistItemSchema = z.object({
  id: z.string().uuid(),
  user_id: z.string().uuid(),
  chain_id: z.enum(SUPPORTED_CHAINS),
  pair_address: z.string().min(8).max(66),
  token_symbol: z.string(),
  label: z.string().nullable(),
  created_at: z.string(),
});

export type WatchlistItem = z.infer<typeof WatchlistItemSchema>;

export const NormalizedPairSchema = z.object({
  chainId: z.string(),
  dexId: z.string(),
  pairAddress: z.string(),
  symbol: z.string(),
  name: z.string(),
  priceUsd: z.string(),
  priceChange24h: z.string(),
  volume24h: z.string(),
  liquidityUsd: z.string(),
  marketCap: z.string(),
  fdv: z.string(),
  imageUrl: z.string().optional().or(z.literal('')),
  baseTokenAddress: z.string(),
  quoteTokenAddress: z.string(),
  quoteTokenSymbol: z.string(),
  txns24h: z.object({
    buys: z.number(),
    sells: z.number(),
  }),
  websites: z.array(
    z.object({
      label: z.string().optional(),
      url: z.string(),
    })
  ),
  socials: z.array(
    z.object({
      platform: z.string(),
      url: z.string(),
    })
  ),
  stale: z.boolean().optional(),
});

export type NormalizedPair = z.infer<typeof NormalizedPairSchema>;

export const CHART_RANGES = ['1D', '5D', '1M', '6M', '1Y'] as const;
export type ChartRange = typeof CHART_RANGES[number];

export const CHART_RANGE_LABELS: Record<ChartRange, string> = {
  '1D': 'يوم واحد',
  '5D': '5 أيام',
  '1M': 'شهر واحد',
  '6M': '6 أشهر',
  '1Y': 'سنة واحدة',
};

export const CandleSchema = z.object({
  t: z.number(),
  o: z.string(),
  h: z.string(),
  l: z.string(),
  c: z.string(),
  v: z.string(),
});

export type Candle = z.infer<typeof CandleSchema>;

export const OhlcvResponseSchema = z.object({
  range: z.enum(CHART_RANGES),
  candles: z.array(CandleSchema),
});

export type OhlcvSeries = z.infer<typeof OhlcvResponseSchema>;

export type ApiResponseEnvelope<T> = {
  data: T;
  error?: string;
  status?: number;
};
