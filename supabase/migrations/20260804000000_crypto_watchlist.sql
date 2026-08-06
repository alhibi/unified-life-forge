-- =====================================================================
-- Database Schema: Crypto Watchlist (DexScreener Integration)
-- =====================================================================

CREATE TABLE IF NOT EXISTS public.crypto_watchlist (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  chain_id TEXT NOT NULL CHECK (chain_id IN ('solana', 'ethereum', 'bsc', 'base', 'arbitrum', 'polygon')),
  pair_address TEXT NOT NULL,
  token_symbol TEXT NOT NULL,
  label TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, chain_id, pair_address)
);

-- Grants
GRANT SELECT, INSERT, UPDATE, DELETE ON public.crypto_watchlist TO authenticated;
GRANT ALL ON public.crypto_watchlist TO service_role;

-- Enable Row Level Security (RLS)
ALTER TABLE public.crypto_watchlist ENABLE ROW LEVEL SECURITY;

-- RLS Policies
DO $$ BEGIN
  CREATE POLICY "cw_select_own" ON public.crypto_watchlist FOR SELECT TO authenticated USING (auth.uid() = user_id);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY "cw_insert_own" ON public.crypto_watchlist FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY "cw_update_own" ON public.crypto_watchlist FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY "cw_delete_own" ON public.crypto_watchlist FOR DELETE TO authenticated USING (auth.uid() = user_id);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- Indices for optimized querying
CREATE INDEX IF NOT EXISTS crypto_watchlist_user_id_idx ON public.crypto_watchlist(user_id);
CREATE INDEX IF NOT EXISTS crypto_watchlist_chain_pair_idx ON public.crypto_watchlist(chain_id, pair_address);

-- Realtime publication setup
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime'
      AND schemaname = 'public'
      AND tablename = 'crypto_watchlist'
  ) THEN
    EXECUTE 'ALTER PUBLICATION supabase_realtime ADD TABLE public.crypto_watchlist';
  END IF;
EXCEPTION WHEN undefined_object THEN
  -- supabase_realtime publication may not exist on a bare Postgres.
  RAISE NOTICE 'supabase_realtime publication not found, skipping ADD TABLE crypto_watchlist';
END $$;

-- Replica identity full for complete update payloads
ALTER TABLE public.crypto_watchlist REPLICA IDENTITY FULL;
