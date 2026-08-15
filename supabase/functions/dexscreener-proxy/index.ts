import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "npm:@supabase/supabase-js@2.43.0";
import { z } from "npm:zod@3.23.8";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

// Whitelist of supported chains
const SUPPORTED_CHAINS = ["solana", "ethereum", "bsc", "base", "arbitrum", "polygon"] as const;
type ChainId = typeof SUPPORTED_CHAINS[number];

// Input validators
const SearchRequestSchema = z.object({
  action: z.literal("search"),
  query: z.string().min(1).max(100).trim(),
});

const BatchRequestSchema = z.object({
  action: z.literal("batch"),
  pairs: z.array(
    z.object({
      chainId: z.enum(SUPPORTED_CHAINS),
      pairAddress: z.string().min(8).max(66).trim().regex(/^[a-zA-Z0-9_-]+$/),
    })
  ).max(30),
});

const OHLCV_RANGES = ["1D", "5D", "1M", "6M", "1Y"] as const;
type OhlcvRange = typeof OHLCV_RANGES[number];

const OhlcvRequestSchema = z.object({
  action: z.literal("ohlcv"),
  chainId: z.enum(SUPPORTED_CHAINS),
  pairAddress: z.string().min(8).max(66).trim().regex(/^[a-zA-Z0-9_-]+$/),
  range: z.enum(OHLCV_RANGES),
});

const ProxyRequestSchema = z.discriminatedUnion("action", [
  SearchRequestSchema,
  BatchRequestSchema,
  OhlcvRequestSchema,
]);

/** GeckoTerminal network identifiers keyed by our internal chain ids. */
const GECKO_NETWORKS: Record<ChainId, string> = {
  solana: "solana",
  ethereum: "eth",
  bsc: "bsc",
  base: "base",
  arbitrum: "arbitrum",
  polygon: "polygon_pos",
};

/** Candle resolution per visual range: [timeframe, aggregate, limit, cacheTtlMs] */
const RANGE_CONFIG: Record<OhlcvRange, { timeframe: string; aggregate: number; limit: number; ttl: number }> = {
  "1D": { timeframe: "minute", aggregate: 15, limit: 96, ttl: 60_000 },
  "5D": { timeframe: "hour", aggregate: 1, limit: 120, ttl: 300_000 },
  "1M": { timeframe: "hour", aggregate: 4, limit: 180, ttl: 600_000 },
  "6M": { timeframe: "day", aggregate: 1, limit: 180, ttl: 1_800_000 },
  "1Y": { timeframe: "day", aggregate: 1, limit: 365, ttl: 1_800_000 },
};

const GeckoOhlcvSchema = z.object({
  data: z.object({
    attributes: z.object({
      ohlcv_list: z.array(z.array(z.number())),
    }),
  }),
});

// DexScreener Response Schema for Validation
const BaseTokenSchema = z.object({
  address: z.string(),
  name: z.string(),
  symbol: z.string(),
});

const QuoteTokenSchema = z.object({
  address: z.string(),
  name: z.string(),
  symbol: z.string(),
});

const TxnsIntervalSchema = z.object({
  buys: z.number().optional(),
  sells: z.number().optional(),
}).optional();

const TxnsSchema = z.object({
  m5: TxnsIntervalSchema,
  h1: TxnsIntervalSchema,
  h6: TxnsIntervalSchema,
  h24: TxnsIntervalSchema,
}).optional();

const VolumeSchema = z.object({
  m5: z.number().optional(),
  h1: z.number().optional(),
  h6: z.number().optional(),
  h24: z.number().optional(),
}).optional();

const PriceChangeSchema = z.object({
  m5: z.number().optional(),
  h1: z.number().optional(),
  h6: z.number().optional(),
  h24: z.number().optional(),
}).optional();

const LiquiditySchema = z.object({
  usd: z.number().optional(),
  base: z.number().optional(),
  quote: z.number().optional(),
}).optional();

const InfoLinkSchema = z.object({
  type: z.string().optional(),
  label: z.string().optional(),
  url: z.string(),
});

const InfoSchema = z.object({
  imageUrl: z.string().optional(),
  websites: z.array(InfoLinkSchema).optional(),
  socials: z.array(
    z.object({
      platform: z.string().optional(),
      handle: z.string().optional(),
      url: z.string().optional(),
    })
  ).optional(),
}).optional();

const DexPairSchema = z.object({
  chainId: z.string(),
  dexId: z.string(),
  url: z.string(),
  pairAddress: z.string(),
  labels: z.array(z.string()).optional(),
  baseToken: BaseTokenSchema,
  quoteToken: QuoteTokenSchema,
  priceNative: z.string().optional(),
  priceUsd: z.string().optional(),
  txns: TxnsSchema,
  volume: VolumeSchema,
  priceChange: PriceChangeSchema,
  liquidity: LiquiditySchema,
  fdv: z.number().optional(),
  marketCap: z.number().optional(),
  pairCreatedAt: z.number().optional(),
  info: InfoSchema,
});

const DexScreenerResponseSchema = z.object({
  schemaVersion: z.string().optional(),
  pairs: z.array(DexPairSchema).nullable().optional(),
});

type DexPair = z.infer<typeof DexPairSchema>;

// Global in-memory cache to survive between hot isolate invocations
interface CacheEntry {
  data: any;
  expiresAt: number;
  timestamp: number;
}
const MEMORY_CACHE = new Map<string, CacheEntry>();
const CACHE_TTL_MS = 30 * 1000; // 30-second cache TTL

// Rate limiting state: user request counts tracking
interface RateLimitTracker {
  count: number;
  resetAt: number;
}
const USER_RATE_LIMITS = new Map<string, RateLimitTracker>();
const MAX_REQUESTS_PER_MINUTE = 60;

/** Checks if user has exceeded their request limit. Returns true if throttled. */
function isThrottled(userId: string): boolean {
  const now = Date.now();
  const tracker = USER_RATE_LIMITS.get(userId);

  if (!tracker || now > tracker.resetAt) {
    USER_RATE_LIMITS.set(userId, {
      count: 1,
      resetAt: now + 60000,
    });
    return false;
  }

  if (tracker.count >= MAX_REQUESTS_PER_MINUTE) {
    return true;
  }

  tracker.count += 1;
  return false;
}

/** Normalized outcome returned to the client */
interface NormalizedPair {
  chainId: string;
  dexId: string;
  pairAddress: string;
  symbol: string;
  name: string;
  priceUsd: string;
  priceChange24h: string;
  volume24h: string;
  liquidityUsd: string;
  marketCap: string;
  fdv: string;
  imageUrl: string;
  baseTokenAddress: string;
  quoteTokenAddress: string;
  quoteTokenSymbol: string;
  txns24h: { buys: number; sells: number };
  websites: { label?: string; url: string }[];
  socials: { platform: string; url: string }[];
  stale?: boolean;
}

function normalizePairData(pair: DexPair, isStale = false): NormalizedPair {
  return {
    chainId: pair.chainId,
    dexId: pair.dexId,
    pairAddress: pair.pairAddress,
    symbol: pair.baseToken.symbol,
    name: pair.baseToken.name,
    priceUsd: pair.priceUsd ?? "0",
    priceChange24h: pair.priceChange?.h24?.toString() ?? "0",
    volume24h: pair.volume?.h24?.toString() ?? "0",
    liquidityUsd: pair.liquidity?.usd?.toString() ?? "0",
    marketCap: pair.marketCap?.toString() ?? "",
    fdv: pair.fdv?.toString() ?? "",
    imageUrl: pair.info?.imageUrl ?? "",
    baseTokenAddress: pair.baseToken.address,
    quoteTokenAddress: pair.quoteToken.address,
    quoteTokenSymbol: pair.quoteToken.symbol,
    txns24h: {
      buys: pair.txns?.h24?.buys ?? 0,
      sells: pair.txns?.h24?.sells ?? 0,
    },
    websites: pair.info?.websites?.map((w) => ({ label: w.label, url: w.url })) ?? [],
    socials: pair.info?.socials?.map((s) => ({ platform: s.platform ?? "", url: s.url ?? "" })).filter((s) => s.url) ?? [],
    stale: isStale || undefined,
  };
}

/** Upstream fetcher with built-in exponential backoff retry and circuit breaker */
async function fetchFromUpstream(url: string, cacheKey: string): Promise<{ data: any; fromCache: boolean; isStale: boolean }> {
  const cached = MEMORY_CACHE.get(cacheKey);
  const now = Date.now();

  // Return fresh cache if available
  if (cached && now < cached.expiresAt) {
    return { data: cached.data, fromCache: true, isStale: false };
  }

  // Fetch from DexScreener with Exponential Backoff on 429 / 503 errors
  let attempt = 0;
  const maxAttempts = 3;
  let delay = 300;

  while (attempt < maxAttempts) {
    try {
      console.log(`[dexscreener-proxy] Fetching upstream URL: ${url}`);
      const response = await fetch(url, {
        headers: {
          "User-Agent": "SmartHub/2.0 (amv.life; contact@amv.life)",
          "Accept": "application/json",
        },
      });

      if (response.status === 429 || response.status >= 500) {
        attempt++;
        if (attempt >= maxAttempts) {
          throw new Error(`Upstream returned HTTP ${response.status}`);
        }
        console.warn(`[dexscreener-proxy] Upstream error ${response.status}. Retrying in ${delay}ms...`);
        await new Promise((resolve) => setTimeout(resolve, delay));
        delay *= 2; // exponential backoff
        continue;
      }

      if (!response.ok) {
        throw new Error(`Upstream returned HTTP ${response.status}`);
      }

      const rawJson = await response.json();

      // Strict JSON Validation of Response Shape
      const validated = DexScreenerResponseSchema.parse(rawJson);

      // Save to cache
      MEMORY_CACHE.set(cacheKey, {
        data: validated,
        expiresAt: now + CACHE_TTL_MS,
        timestamp: now,
      });

      return { data: validated, fromCache: false, isStale: false };

    } catch (error) {
      console.error(`[dexscreener-proxy] Attempt ${attempt + 1} failed for ${url}:`, error);
      attempt++;
      if (attempt < maxAttempts) {
        await new Promise((resolve) => setTimeout(resolve, delay));
        delay *= 2;
      }
    }
  }

  // Circuit Breaker Triggered: If we exhausted retries, serve stale cache if we have one
  if (cached) {
    console.warn(`[dexscreener-proxy] Circuit breaker: Serving stale data for key: ${cacheKey}`);
    return { data: cached.data, fromCache: true, isStale: true };
  }

  throw new Error("DEXScreener API is currently unavailable and no cached fallback is present.");
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed. Use POST." }), {
      status: 405,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  try {
    // 1. Authenticate user using Supabase auth token
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Missing authorization token" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey, {
      global: { headers: { Authorization: authHeader } },
    });

    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return new Response(JSON.stringify({ error: "Invalid or expired session token" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // 2. Apply server-side rate limiter per user
    if (isThrottled(user.id)) {
      return new Response(JSON.stringify({ error: "Too many requests. Limit is 60 requests per minute." }), {
        status: 429,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // 3. Parse and validate JSON input payload
    const body = await req.json();
    const parsedPayload = ProxyRequestSchema.safeParse(body);
    if (!parsedPayload.success) {
      return new Response(JSON.stringify({ error: "Invalid payload parameters", details: parsedPayload.error.flatten() }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const payload = parsedPayload.data;

    // 4. Handle Search action
    if (payload.action === "search") {
      // DexScreener rejects very short queries; treat them as "no results" instead of an error.
      if (payload.query.trim().length < 2) {
        return new Response(JSON.stringify({ data: [] }), {
          status: 200,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const escapedQuery = encodeURIComponent(payload.query);
      const url = `https://api.dexscreener.com/latest/dex/search?q=${escapedQuery}`;
      const cacheKey = `search:${payload.query.toLowerCase()}`;

      try {
        const { data, isStale } = await fetchFromUpstream(url, cacheKey);
        const pairs: DexPair[] = data.pairs ?? [];

        // Filter results to supported chains only
        const filteredPairs = pairs.filter((p) => SUPPORTED_CHAINS.includes(p.chainId as any));
        const normalized = filteredPairs.map((p) => normalizePairData(p, isStale));

        return new Response(JSON.stringify({ data: normalized }), {
          status: 200,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      } catch (err: any) {
        // Search is a soft path: never break the UI, return an empty result set with a flag.
        console.error("[dexscreener-proxy] Search unavailable:", err?.message ?? err);
        return new Response(JSON.stringify({ data: [], unavailable: true }), {
          status: 200,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
    }

    // 5. Handle Batch Lookup action
    if (payload.action === "batch") {
      const requestedPairs = payload.pairs;
      if (requestedPairs.length === 0) {
        return new Response(JSON.stringify({ data: [] }), {
          status: 200,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // Group request by chainId to batch lookup effectively
      const groupedByChain: Record<ChainId, string[]> = {} as any;
      const cachedPairs: NormalizedPair[] = [];
      const missingKeys: { chainId: ChainId; pairAddress: string }[] = [];

      for (const pair of requestedPairs) {
        const cacheKey = `pair:${pair.chainId}:${pair.pairAddress.toLowerCase()}`;
        const cached = MEMORY_CACHE.get(cacheKey);
        const now = Date.now();

        if (cached && now < cached.expiresAt) {
          // Serve fresh from cache
          cachedPairs.push(normalizePairData(cached.data, false));
        } else {
          // Track missing pairs that need fresh upstream fetch
          missingKeys.push(pair);
          if (!groupedByChain[pair.chainId]) {
            groupedByChain[pair.chainId] = [];
          }
          groupedByChain[pair.chainId].push(pair.pairAddress);
        }
      }

      // If we found everything in cache, return immediately
      if (missingKeys.length === 0) {
        return new Response(JSON.stringify({ data: cachedPairs }), {
          status: 200,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // Execute fetches in parallel for each chain group
      const fetchPromises = Object.entries(groupedByChain).map(async ([chainId, addresses]) => {
        // DexScreener allows querying comma-separated pair addresses (up to 30) for a given chainId.
        const commaSeparated = addresses.join(",");
        const url = `https://api.dexscreener.com/latest/dex/pairs/${chainId}/${commaSeparated}`;
        const cacheKeyGroup = `group:${chainId}:${commaSeparated.toLowerCase()}`;

        try {
          const { data, isStale } = await fetchFromUpstream(url, cacheKeyGroup);
          const pairs: DexPair[] = data.pairs ?? [];

          // Save individual pairs to cache as well for granular hits
          const matchedPairs: NormalizedPair[] = [];
          for (const rawPair of pairs) {
            const indCacheKey = `pair:${rawPair.chainId}:${rawPair.pairAddress.toLowerCase()}`;
            MEMORY_CACHE.set(indCacheKey, {
              data: rawPair,
              expiresAt: Date.now() + CACHE_TTL_MS,
              timestamp: Date.now(),
            });
            matchedPairs.push(normalizePairData(rawPair, isStale));
          }

          return { matchedPairs, success: true };
        } catch (err) {
          console.error(`[dexscreener-proxy] Batch failed for ${chainId} with addresses ${addresses}:`, err);

          // For failure, try to fall back to individual stale items already in cache
          const staleFallbacks: NormalizedPair[] = [];
          for (const addr of addresses) {
            const indCacheKey = `pair:${chainId}:${addr.toLowerCase()}`;
            const cached = MEMORY_CACHE.get(indCacheKey);
            if (cached) {
              staleFallbacks.push(normalizePairData(cached.data, true));
            }
          }
          return { matchedPairs: staleFallbacks, success: false };
        }
      });

      const results = await Promise.all(fetchPromises);
      const upstreamFetchedPairs = results.flatMap((r) => r.matchedPairs);

      // Merge cached and newly fetched pairs
      const allMerged = [...cachedPairs, ...upstreamFetchedPairs];

      // De-duplicate final pairs by chainId and pairAddress
      const seenMergedKeys = new Set<string>();
      const finalPairs = allMerged.filter((p) => {
        const uniqueKey = `${p.chainId}:${p.pairAddress.toLowerCase()}`;
        if (seenMergedKeys.has(uniqueKey)) return false;
        seenMergedKeys.add(uniqueKey);
        return true;
      });

      return new Response(JSON.stringify({ data: finalPairs }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ error: "Unhandled operation action" }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (error: any) {
    console.error("[dexscreener-proxy] Unexpected server error:", error);
    return new Response(JSON.stringify({ error: "Internal server error", details: error.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
