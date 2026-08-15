CREATE TABLE public.crypto_watchlist (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  chain_id text NOT NULL CHECK (chain_id IN ('solana','ethereum','bsc','base','arbitrum','polygon')),
  pair_address text NOT NULL CHECK (char_length(pair_address) BETWEEN 8 AND 66),
  token_symbol text NOT NULL CHECK (char_length(token_symbol) BETWEEN 1 AND 32),
  label text CHECK (label IS NULL OR char_length(label) <= 64),
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT crypto_watchlist_unique_entry UNIQUE (user_id, chain_id, pair_address)
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.crypto_watchlist TO authenticated;
GRANT ALL ON public.crypto_watchlist TO service_role;

ALTER TABLE public.crypto_watchlist ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own watchlist"
  ON public.crypto_watchlist FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can add to their own watchlist"
  ON public.crypto_watchlist FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own watchlist"
  ON public.crypto_watchlist FOR UPDATE TO authenticated
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete from their own watchlist"
  ON public.crypto_watchlist FOR DELETE TO authenticated
  USING (auth.uid() = user_id);

CREATE INDEX crypto_watchlist_user_created_idx ON public.crypto_watchlist (user_id, created_at DESC);