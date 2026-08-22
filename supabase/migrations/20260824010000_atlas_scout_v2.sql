-- ============================================================================
-- Atlas Scout v2 — full, CORRECTED schema for AI deep place discovery.
--
-- Why a second migration: b100f7f1 shipped atlas_scout.sql whose promotion
-- FK points at public.travel_places — a table that exists NOWHERE (the atlas
-- has stored places in public.places since 20260724000000). Against a real
-- database that migration fails at its FK line, so none of its tables land.
--
-- This file is self-contained and idempotent: it creates the whole feature
-- schema with the FK repointed at public.places, and swaps the blanket
-- UNIQUE on watch targets for a partial one over ACTIVE rows so a city the
-- user once removed can be re-added (the old constraint blocked it forever).
-- ============================================================================

-- ── Enums ───────────────────────────────────────────────────────────────────
DO $$ BEGIN CREATE TYPE atlas_target_kind AS ENUM ('city', 'country'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE atlas_scout_status AS ENUM ('queued','researching','writing','completed','failed'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE atlas_place_vibe AS ENUM ('nature','food','adventure','culture','nightlife','family','budget','luxury'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- ── Watch targets: the user's chosen favorites ───────────────────────────────
CREATE TABLE IF NOT EXISTS public.atlas_watch_targets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  kind atlas_target_kind NOT NULL,
  -- Free-text canonical name, e.g. 'برلين' or 'Berlin, Germany'
  query text NOT NULL,
  -- Resolved display name from geocoding
  display_name_ar text NOT NULL,
  display_name_en text NOT NULL,
  iso_code text,
  center_lng double precision,
  center_lat double precision,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Duplicate protection for ACTIVE favourites only. Soft-deleted rows
-- (is_active = false) must not hold their slot hostage — the client flips
-- them back on re-add, so uniqueness over the whole table was a dead end.
CREATE INDEX IF NOT EXISTS atlas_watch_targets_active_unique
  ON public.atlas_watch_targets (user_id, kind, lower(query))
  WHERE is_active;

CREATE INDEX IF NOT EXISTS idx_atlas_watch_targets_user
  ON public.atlas_watch_targets(user_id) WHERE is_active;

-- Legacy blanket constraint from the broken first pass (no-op when absent).
DO $$
DECLARE c text;
BEGIN
  FOR c IN
    SELECT conname FROM pg_constraint
    WHERE conrelid = 'public.atlas_watch_targets'::regclass
      AND contype = 'u'
  LOOP
    EXECUTE format('ALTER TABLE public.atlas_watch_targets DROP CONSTRAINT %I', c);
  END LOOP;
END $$;

-- ── Scout runs: one per generation request (audit + progress tracking) ──────
CREATE TABLE IF NOT EXISTS public.atlas_scout_runs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  target_id uuid NOT NULL REFERENCES public.atlas_watch_targets(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  status atlas_scout_status NOT NULL DEFAULT 'queued',
  model text NOT NULL DEFAULT 'google/gemini-2.5-flash',
  places_found int NOT NULL DEFAULT 0,
  error_message text,
  started_at timestamptz NOT NULL DEFAULT now(),
  completed_at timestamptz
);

CREATE INDEX IF NOT EXISTS idx_atlas_scout_runs_target
  ON public.atlas_scout_runs(target_id, started_at DESC);

-- ── Scout places: the researched dossiers ────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.atlas_scout_places (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  run_id uuid NOT NULL REFERENCES public.atlas_scout_runs(id) ON DELETE CASCADE,
  target_id uuid NOT NULL REFERENCES public.atlas_watch_targets(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

  name_en text NOT NULL,
  name_ar text,
  category text NOT NULL DEFAULT 'other'
    CHECK (category IN ('nature','beach','viewpoint','historic','museum','religious',
                        'food','cafe','market','city','park','adventure','stay','culture','transport','other')),
  vibe atlas_place_vibe,

  -- GeoJSON order [lng, lat] to match public.places.location exactly.
  coordinates jsonb,
  address_line text,
  city text,

  description_ar text NOT NULL,
  atmosphere_ar text,          -- what it FEELS like: light, sound, crowd, smell
  tips_ar text,                -- local-knowledge practical tips
  best_months smallint[] NOT NULL DEFAULT '{}',
  duration_minutes int,
  price_level smallint CHECK (price_level BETWEEN 0 AND 4),

  signature_dish text,         -- food category only
  photo_query_en text,         -- feeds the client-side Wikimedia photo lookup
  sources text[] NOT NULL DEFAULT '{}',

  -- Promotion into the real atlas — public.places, NOT the mythical
  -- travel_places the first pass pointed at.
  promoted_place_id uuid REFERENCES public.places(id) ON DELETE SET NULL,
  dismissed boolean NOT NULL DEFAULT false,

  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_atlas_scout_places_target
  ON public.atlas_scout_places(target_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_atlas_scout_places_pending
  ON public.atlas_scout_places(target_id) WHERE promoted_place_id IS NULL AND NOT dismissed;

-- Heal databases where the broken FK somehow landed under another name.
DO $$ BEGIN
  ALTER TABLE public.atlas_scout_places
    DROP CONSTRAINT IF EXISTS atlas_scout_places_promoted_place_id_fkey;
END $$;

-- ── RLS ─────────────────────────────────────────────────────────────────────
ALTER TABLE public.atlas_watch_targets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.atlas_scout_runs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.atlas_scout_places ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  CREATE POLICY atlas_watch_targets_own ON public.atlas_watch_targets
    FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY atlas_scout_runs_own ON public.atlas_scout_runs
    FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY atlas_scout_places_own ON public.atlas_scout_places
    FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
