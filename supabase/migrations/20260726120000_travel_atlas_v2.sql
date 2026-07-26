-- Travel Atlas v2 — أطلس الرحلات
--
-- The v1 migration (20260724000000_travel_atlas.sql) shipped a schema the
-- client could not actually write to. Two defects are fixed here, plus the
-- feature is widened from "a pin with a name" into a real travel record.
--
-- FIX 1 — `countries.center` was `NOT NULL` but nothing ever supplied it, so
--         every first-place-in-a-new-country insert failed on a not-null
--         violation. The column is now optional and backfilled from `bounds`.
--
-- FIX 2 — the storage policies required object paths to start with the owning
--         place UUID (`<place_id>/…`) while the client uploaded to
--         `<user_id>/<place_id>/…`, so every photo upload was rejected by RLS.
--         The convention is now owner-scoped (`<user_id>/…`), which is also
--         what lets a draft upload happen before the place row exists.

-- ── Countries ───────────────────────────────────────────────────────────────

ALTER TABLE public.countries ALTER COLUMN center DROP NOT NULL;
ALTER TABLE public.countries ADD COLUMN IF NOT EXISTS continent TEXT;
ALTER TABLE public.countries ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT now();

-- Backfill the centre of any existing row from the stored bounding box.
UPDATE public.countries
SET center = ST_SetSRID(
      ST_MakePoint(
        (((bounds -> 'sw' -> 0)::TEXT)::DOUBLE PRECISION
          + ((bounds -> 'ne' -> 0)::TEXT)::DOUBLE PRECISION) / 2,
        (((bounds -> 'sw' -> 1)::TEXT)::DOUBLE PRECISION
          + ((bounds -> 'ne' -> 1)::TEXT)::DOUBLE PRECISION) / 2
      ),
      4326
    )::GEOGRAPHY
WHERE center IS NULL;

-- ── Shared updated_at trigger ───────────────────────────────────────────────

CREATE OR REPLACE FUNCTION public.travel_touch_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  NEW.updated_at := now();
  RETURN NEW;
END;
$$;

-- ── Places: the full travel record ──────────────────────────────────────────

ALTER TABLE public.places
  ADD COLUMN IF NOT EXISTS city TEXT,
  ADD COLUMN IF NOT EXISTS address TEXT,
  ADD COLUMN IF NOT EXISTS visit_status TEXT NOT NULL DEFAULT 'wishlist',
  ADD COLUMN IF NOT EXISTS visited_on DATE,
  ADD COLUMN IF NOT EXISTS price_level SMALLINT,
  ADD COLUMN IF NOT EXISTS duration_minutes INTEGER,
  ADD COLUMN IF NOT EXISTS best_months SMALLINT[] NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS tips_ar TEXT,
  ADD COLUMN IF NOT EXISTS is_favorite BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT now();

DO $$
BEGIN
  -- Wishlist / planned / visited is the axis every travel guide sorts on.
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'places_visit_status_check'
  ) THEN
    ALTER TABLE public.places
      ADD CONSTRAINT places_visit_status_check
      CHECK (visit_status IN ('wishlist', 'planned', 'visited'));
  END IF;

  -- 0–4 maps to the "free · ‎$ · $$ · $$$ · $$$$" scale shown in the UI.
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'places_price_level_check'
  ) THEN
    ALTER TABLE public.places
      ADD CONSTRAINT places_price_level_check
      CHECK (price_level IS NULL OR price_level BETWEEN 0 AND 4);
  END IF;

  -- One week is the ceiling for "how long to spend here".
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'places_duration_check'
  ) THEN
    ALTER TABLE public.places
      ADD CONSTRAINT places_duration_check
      CHECK (duration_minutes IS NULL OR duration_minutes BETWEEN 5 AND 10080);
  END IF;

  -- best_months holds calendar month numbers.
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'places_best_months_check'
  ) THEN
    ALTER TABLE public.places
      ADD CONSTRAINT places_best_months_check
      CHECK (
        array_length(best_months, 1) IS NULL
        OR (
          array_length(best_months, 1) <= 12
          AND NOT EXISTS (
            SELECT 1 FROM unnest(best_months) AS m WHERE m < 1 OR m > 12
          )
        )
      );
  END IF;
END
$$;

-- The category vocabulary grows from 7 to 16 so a saved place can be filed the
-- way a traveller actually thinks about it (a café is not "food · other").
ALTER TABLE public.places DROP CONSTRAINT IF EXISTS places_category_check;
ALTER TABLE public.places
  ADD CONSTRAINT places_category_check CHECK (
    category IN (
      'nature', 'beach', 'viewpoint', 'historic', 'museum', 'religious',
      'food', 'cafe', 'market', 'city', 'park', 'adventure',
      'stay', 'culture', 'transport', 'other'
    )
  );

CREATE INDEX IF NOT EXISTS places_user_idx ON public.places(user_id);
CREATE INDEX IF NOT EXISTS places_status_idx ON public.places(visit_status);
CREATE INDEX IF NOT EXISTS places_favorite_idx ON public.places(user_id) WHERE is_favorite;

DROP TRIGGER IF EXISTS trg_places_touch ON public.places;
CREATE TRIGGER trg_places_touch
BEFORE UPDATE ON public.places
FOR EACH ROW EXECUTE FUNCTION public.travel_touch_updated_at();

-- ── Photos: captions + stable ordering ──────────────────────────────────────

ALTER TABLE public.place_photos
  ADD COLUMN IF NOT EXISTS caption_ar TEXT,
  ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT now();

CREATE INDEX IF NOT EXISTS place_photos_place_idx
  ON public.place_photos(place_id, sort_order);

-- ── Links: the references a place collects ──────────────────────────────────

CREATE TABLE IF NOT EXISTS public.place_links (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  place_id UUID REFERENCES public.places(id) ON DELETE CASCADE NOT NULL,
  kind TEXT NOT NULL DEFAULT 'other' CHECK (
    kind IN ('website', 'maps', 'video', 'article', 'booking', 'social', 'other')
  ),
  label TEXT,
  url TEXT NOT NULL CHECK (url ~* '^https?://.+'),
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS place_links_place_idx
  ON public.place_links(place_id, sort_order);

-- ── Trips: the itinerary layer ──────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.trips (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE DEFAULT auth.uid() NOT NULL,
  title TEXT NOT NULL,
  country_id UUID REFERENCES public.countries(id) ON DELETE SET NULL,
  start_date DATE,
  end_date DATE,
  notes_ar TEXT,
  budget_amount NUMERIC(12, 2) CHECK (budget_amount IS NULL OR budget_amount >= 0),
  budget_currency TEXT,
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'planned', 'active', 'done')),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  CONSTRAINT trips_date_order CHECK (end_date IS NULL OR start_date IS NULL OR end_date >= start_date)
);

CREATE INDEX IF NOT EXISTS trips_user_idx ON public.trips(user_id, start_date);

DROP TRIGGER IF EXISTS trg_trips_touch ON public.trips;
CREATE TRIGGER trg_trips_touch
BEFORE UPDATE ON public.trips
FOR EACH ROW EXECUTE FUNCTION public.travel_touch_updated_at();

CREATE TABLE IF NOT EXISTS public.trip_places (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  trip_id UUID REFERENCES public.trips(id) ON DELETE CASCADE NOT NULL,
  place_id UUID REFERENCES public.places(id) ON DELETE CASCADE NOT NULL,
  day_index INTEGER NOT NULL DEFAULT 1 CHECK (day_index BETWEEN 1 AND 365),
  sort_order INTEGER NOT NULL DEFAULT 0,
  note_ar TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE (trip_id, place_id)
);

CREATE INDEX IF NOT EXISTS trip_places_trip_idx
  ON public.trip_places(trip_id, day_index, sort_order);

-- ── RLS ─────────────────────────────────────────────────────────────────────

ALTER TABLE public.place_links ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.trips ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.trip_places ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "public read place_links" ON public.place_links;
CREATE POLICY "public read place_links"
  ON public.place_links FOR SELECT
  TO anon, authenticated
  USING (true);

DROP POLICY IF EXISTS "owner writes place_links" ON public.place_links;
CREATE POLICY "owner writes place_links"
  ON public.place_links FOR ALL
  TO authenticated
  USING (
    EXISTS (SELECT 1 FROM public.places p WHERE p.id = place_id AND p.user_id = auth.uid())
  )
  WITH CHECK (
    EXISTS (SELECT 1 FROM public.places p WHERE p.id = place_id AND p.user_id = auth.uid())
  );

-- Trips are private planning documents — no public read.
DROP POLICY IF EXISTS "owner reads trips" ON public.trips;
CREATE POLICY "owner reads trips"
  ON public.trips FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "owner writes trips" ON public.trips;
CREATE POLICY "owner writes trips"
  ON public.trips FOR ALL
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "owner reads trip_places" ON public.trip_places;
CREATE POLICY "owner reads trip_places"
  ON public.trip_places FOR SELECT
  TO authenticated
  USING (
    EXISTS (SELECT 1 FROM public.trips t WHERE t.id = trip_id AND t.user_id = auth.uid())
  );

DROP POLICY IF EXISTS "owner writes trip_places" ON public.trip_places;
CREATE POLICY "owner writes trip_places"
  ON public.trip_places FOR ALL
  TO authenticated
  USING (
    EXISTS (SELECT 1 FROM public.trips t WHERE t.id = trip_id AND t.user_id = auth.uid())
  )
  WITH CHECK (
    EXISTS (SELECT 1 FROM public.trips t WHERE t.id = trip_id AND t.user_id = auth.uid())
  );

GRANT SELECT ON public.place_links TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.place_links TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.trips, public.trip_places TO authenticated;
GRANT ALL ON public.place_links, public.trips, public.trip_places TO service_role;

-- ── Storage: owner-scoped object paths ──────────────────────────────────────
-- Object convention is now `<user_id>/<place_id>/<file>`. Checking the FIRST
-- folder against auth.uid() means an upload no longer has to wait for the
-- place row to exist, which is what the draft/edit flow needs.

DROP POLICY IF EXISTS "owners upload place photo objects" ON storage.objects;
DROP POLICY IF EXISTS "owners update place photo objects" ON storage.objects;
DROP POLICY IF EXISTS "owners delete place photo objects" ON storage.objects;

CREATE POLICY "owners upload place photo objects"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'place-photos'
    AND (storage.foldername(name))[1] = auth.uid()::TEXT
  );

CREATE POLICY "owners update place photo objects"
  ON storage.objects FOR UPDATE
  TO authenticated
  USING (
    bucket_id = 'place-photos'
    AND (storage.foldername(name))[1] = auth.uid()::TEXT
  )
  WITH CHECK (
    bucket_id = 'place-photos'
    AND (storage.foldername(name))[1] = auth.uid()::TEXT
  );

CREATE POLICY "owners delete place photo objects"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (
    bucket_id = 'place-photos'
    AND (storage.foldername(name))[1] = auth.uid()::TEXT
  );

-- ── Nearby lookup ───────────────────────────────────────────────────────────
-- Powers the "أماكن قريبة" section on a place page without shipping the whole
-- country to the client. GIST-indexed, so it stays cheap as the atlas grows.

CREATE OR REPLACE FUNCTION public.travel_places_nearby(
  in_longitude DOUBLE PRECISION,
  in_latitude DOUBLE PRECISION,
  in_radius_m DOUBLE PRECISION DEFAULT 50000,
  in_limit INTEGER DEFAULT 12,
  in_exclude UUID DEFAULT NULL
)
RETURNS TABLE (id UUID, distance_m DOUBLE PRECISION)
LANGUAGE sql
STABLE
SET search_path = public
AS $$
  SELECT
    p.id,
    ST_Distance(p.location, ST_SetSRID(ST_MakePoint(in_longitude, in_latitude), 4326)::GEOGRAPHY)
      AS distance_m
  FROM public.places p
  WHERE (in_exclude IS NULL OR p.id <> in_exclude)
    AND ST_DWithin(
      p.location,
      ST_SetSRID(ST_MakePoint(in_longitude, in_latitude), 4326)::GEOGRAPHY,
      LEAST(GREATEST(in_radius_m, 100), 500000)
    )
  ORDER BY distance_m ASC
  LIMIT LEAST(GREATEST(in_limit, 1), 50);
$$;

GRANT EXECUTE ON FUNCTION public.travel_places_nearby(
  DOUBLE PRECISION, DOUBLE PRECISION, DOUBLE PRECISION, INTEGER, UUID
) TO anon, authenticated;
