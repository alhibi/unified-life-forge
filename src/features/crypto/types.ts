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
export type ApiResponseEnvelope<T> = {
  data: T;
  error?: string;
  status?: number;
};
