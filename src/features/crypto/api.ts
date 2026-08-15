import { supabase } from '@/integrations/supabase/client';

import {
  type ChainId,
  type ChartRange,
  type NormalizedPair,
  NormalizedPairSchema,
  type OhlcvSeries,
  OhlcvResponseSchema,
  type WatchlistItem,
  WatchlistItemSchema,
} from './types';

const PROXY_URL = `${
  (import.meta as any).env.VITE_SUPABASE_URL || 'https://nmrckgzmluoavgucqvjh.supabase.co'
}/functions/v1/dexscreener-proxy`;

async function getAuthToken(): Promise<string> {
  const {
    data: { session },
  } = await supabase.auth.getSession();

  if (!session?.access_token) {
    throw new Error('يجب تسجيل الدخول أولاً للوصول إلى هذه الميزة.');
  }

  return session.access_token;
}

export const cryptoApi = {
  /** Retrieves all watchlist items for the logged-in user from public.crypto_watchlist */
  async getWatchlist(): Promise<WatchlistItem[]> {
    const { data, error } = await supabase
      .from('crypto_watchlist' as any)
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('[cryptoApi] Failed to fetch watchlist:', error);
      throw error;
    }

    // Validate rows against Zod schema to ensure absolute type safety
    return (data ?? []).map((row) => WatchlistItemSchema.parse(row));
  },

  /** Adds a new token pair to the database watchlist */
  async addToWatchlist(
    chainId: ChainId,
    pairAddress: string,
    tokenSymbol: string,
    label?: string
  ): Promise<WatchlistItem> {
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      throw new Error('يجب تسجيل الدخول أولاً للوصول إلى هذه الميزة.');
    }

    const { data, error } = await supabase
      .from('crypto_watchlist' as any)
      .insert({
        user_id: user.id,
        chain_id: chainId,
        pair_address: pairAddress,
        token_symbol: tokenSymbol,
        label: label || null,
      })
      .select('*')
      .single();

    if (error) {
      console.error('[cryptoApi] Failed to add to watchlist:', error);
      throw error;
    }

    return WatchlistItemSchema.parse(data);
  },

  /** Removes a token pair from the watchlist database */
  async removeFromWatchlist(id: string): Promise<void> {
    const { error } = await supabase
      .from('crypto_watchlist' as any)
      .delete()
      .eq('id', id);

    if (error) {
      console.error('[cryptoApi] Failed to remove from watchlist:', error);
      throw error;
    }
  },

  /** Proxies the search query through our secure edge function */
  async search(query: string): Promise<NormalizedPair[]> {
    const token = await getAuthToken();

    const response = await fetch(PROXY_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        action: 'search',
        query: query.trim(),
      }),
    });

    if (!response.ok) {
      const errJson = await response.json().catch(() => ({}));
      throw new Error(errJson.error || `خطأ في الاتصال بالخادم (${response.status})`);
    }

    const json = await response.json();
    const pairs = json.data ?? [];

    // Parse and validate results
    return pairs.map((pair: any) => NormalizedPairSchema.parse(pair));
  },

  /** Proxies a batch list lookup through our edge function to merge results efficiently */
  async batchLookup(pairs: { chainId: ChainId; pairAddress: string }[]): Promise<NormalizedPair[]> {
    if (pairs.length === 0) return [];

    const token = await getAuthToken();

    const response = await fetch(PROXY_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        action: 'batch',
        pairs,
      }),
    });

    if (!response.ok) {
      const errJson = await response.json().catch(() => ({}));
      throw new Error(errJson.error || `خطأ في جلب بيانات العملات (${response.status})`);
    }

    const json = await response.json();
    const resultPairs = json.data ?? [];

    // Parse and validate results
    return resultPairs.map((pair: any) => NormalizedPairSchema.parse(pair));
  },

  /** Fetches real on-chain candle history for a pair through our edge function */
  async getCandles(chainId: ChainId, pairAddress: string, range: ChartRange): Promise<OhlcvSeries> {
    const token = await getAuthToken();

    const response = await fetch(PROXY_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ action: 'ohlcv', chainId, pairAddress, range }),
    });

    if (!response.ok) {
      const errJson = await response.json().catch(() => ({}));
      throw new Error(errJson.error || `خطأ في جلب بيانات الرسم البياني (${response.status})`);
    }

    const json = await response.json();
    return OhlcvResponseSchema.parse(json.data);
  },
};
