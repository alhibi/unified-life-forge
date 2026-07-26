CREATE EXTENSION IF NOT EXISTS pgcrypto;

ALTER TABLE public.countries ADD COLUMN IF NOT EXISTS continent TEXT;
ALTER TABLE public.countries ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT now();

CREATE OR REPLACE FUNCTION public.travel_touch_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql SET search_path = public AS $$
BEGIN NEW.updated_at := now(); RETURN NEW; END;
$$;

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
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'places_visit_status_check') THEN
    ALTER TABLE public.places ADD CONSTRAINT places_visit_status_check
      CHECK (visit_status IN ('wishlist', 'planned', 'visited'));
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'places_price_level_check') THEN
    ALTER TABLE public.places ADD CONSTRAINT places_price_level_check
      CHECK (price_level IS NULL OR price_level BETWEEN 0 AND 4);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'places_duration_check') THEN
    ALTER TABLE public.places ADD CONSTRAINT places_duration_check
      CHECK (duration_minutes IS NULL OR duration_minutes BETWEEN 5 AND 10080);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'places_best_months_check') THEN
    ALTER TABLE public.places ADD CONSTRAINT places_best_months_check
      CHECK (
        best_months <@ ARRAY[1,2,3,4,5,6,7,8,9,10,11,12]::SMALLINT[]
        AND coalesce(array_length(best_months, 1), 0) <= 12
      );
  END IF;
END $$;

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
CREATE TRIGGER trg_places_touch BEFORE UPDATE ON public.places
FOR EACH ROW EXECUTE FUNCTION public.travel_touch_updated_at();

ALTER TABLE public.place_photos
  ADD COLUMN IF NOT EXISTS caption_ar TEXT,
  ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT now();

CREATE INDEX IF NOT EXISTS place_photos_place_idx ON public.place_photos(place_id, sort_order);

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
CREATE INDEX IF NOT EXISTS place_links_place_idx ON public.place_links(place_id, sort_order);

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
CREATE TRIGGER trg_trips_touch BEFORE UPDATE ON public.trips
FOR EACH ROW EXECUTE FUNCTION public.travel_touch_updated_at();

CREATE TABLE IF NOT EXISTS public.trip_places (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  trip_id UUID REFERENCES public.trips(id) ON DELETE CASCADE NOT NULL,
  place_id UUID REFERENCES public.places(id) ON DELETE CASCADE NOT NULL,
  day_index INTEGER NOT NULL DEFAULT 1 CHECK (day_index BETWEEN 1 AND 365),
  sort_order INTEGER NOT NULL DEFAULT 0,
  note_ar TEXT,
  start_time TIME,
  duration_minutes INTEGER CHECK (duration_minutes IS NULL OR duration_minutes BETWEEN 5 AND 1440),
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE (trip_id, place_id)
);
CREATE INDEX IF NOT EXISTS trip_places_trip_idx ON public.trip_places(trip_id, day_index, sort_order);

ALTER TABLE public.place_links ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.trips ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.trip_places ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "public read place_links" ON public.place_links;
CREATE POLICY "public read place_links" ON public.place_links FOR SELECT TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "owner writes place_links" ON public.place_links;
CREATE POLICY "owner writes place_links" ON public.place_links FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.places p WHERE p.id = place_id AND p.user_id = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM public.places p WHERE p.id = place_id AND p.user_id = auth.uid()));

DROP POLICY IF EXISTS "owner reads trips" ON public.trips;
CREATE POLICY "owner reads trips" ON public.trips FOR SELECT TO authenticated USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "owner writes trips" ON public.trips;
CREATE POLICY "owner writes trips" ON public.trips FOR ALL TO authenticated
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "owner reads trip_places" ON public.trip_places;
CREATE POLICY "owner reads trip_places" ON public.trip_places FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.trips t WHERE t.id = trip_id AND t.user_id = auth.uid()));

DROP POLICY IF EXISTS "owner writes trip_places" ON public.trip_places;
CREATE POLICY "owner writes trip_places" ON public.trip_places FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.trips t WHERE t.id = trip_id AND t.user_id = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM public.trips t WHERE t.id = trip_id AND t.user_id = auth.uid()));

GRANT SELECT ON public.place_links TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.place_links TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.trips, public.trip_places TO authenticated;
GRANT ALL ON public.place_links, public.trips, public.trip_places TO service_role;

DROP POLICY IF EXISTS "owners upload place photo objects" ON storage.objects;
DROP POLICY IF EXISTS "owners update place photo objects" ON storage.objects;
DROP POLICY IF EXISTS "owners delete place photo objects" ON storage.objects;

CREATE POLICY "owners upload place photo objects" ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'place-photos' AND (storage.foldername(name))[1] = auth.uid()::TEXT);
CREATE POLICY "owners update place photo objects" ON storage.objects FOR UPDATE TO authenticated
  USING (bucket_id = 'place-photos' AND (storage.foldername(name))[1] = auth.uid()::TEXT)
  WITH CHECK (bucket_id = 'place-photos' AND (storage.foldername(name))[1] = auth.uid()::TEXT);
CREATE POLICY "owners delete place photo objects" ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'place-photos' AND (storage.foldername(name))[1] = auth.uid()::TEXT);

CREATE TABLE IF NOT EXISTS public.country_stamps (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE DEFAULT auth.uid() NOT NULL,
  iso_code TEXT NOT NULL CHECK (iso_code ~ '^[A-Z]{2}$'),
  status TEXT NOT NULL DEFAULT 'visited' CHECK (status IN ('visited', 'wishlist', 'lived')),
  first_year SMALLINT CHECK (first_year IS NULL OR first_year BETWEEN 1900 AND 2200),
  visit_count SMALLINT NOT NULL DEFAULT 1 CHECK (visit_count BETWEEN 0 AND 999),
  note_ar TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE (user_id, iso_code)
);
CREATE INDEX IF NOT EXISTS country_stamps_user_idx ON public.country_stamps(user_id, status);

DROP TRIGGER IF EXISTS trg_country_stamps_touch ON public.country_stamps;
CREATE TRIGGER trg_country_stamps_touch BEFORE UPDATE ON public.country_stamps
FOR EACH ROW EXECUTE FUNCTION public.travel_touch_updated_at();

ALTER TABLE public.country_stamps ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "owner reads country_stamps" ON public.country_stamps;
CREATE POLICY "owner reads country_stamps" ON public.country_stamps FOR SELECT TO authenticated USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "owner writes country_stamps" ON public.country_stamps;
CREATE POLICY "owner writes country_stamps" ON public.country_stamps FOR ALL TO authenticated
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.country_stamps TO authenticated;
GRANT ALL ON public.country_stamps TO service_role;

CREATE TABLE IF NOT EXISTS public.trip_checklist (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  trip_id UUID REFERENCES public.trips(id) ON DELETE CASCADE NOT NULL,
  label TEXT NOT NULL,
  category TEXT NOT NULL DEFAULT 'other' CHECK (
    category IN ('documents', 'clothes', 'gear', 'health', 'money', 'other')
  ),
  is_done BOOLEAN NOT NULL DEFAULT false,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now()
);
CREATE INDEX IF NOT EXISTS trip_checklist_trip_idx ON public.trip_checklist(trip_id, category, sort_order);

ALTER TABLE public.trip_checklist ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "owner reads trip_checklist" ON public.trip_checklist;
CREATE POLICY "owner reads trip_checklist" ON public.trip_checklist FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.trips t WHERE t.id = trip_id AND t.user_id = auth.uid()));

DROP POLICY IF EXISTS "owner writes trip_checklist" ON public.trip_checklist;
CREATE POLICY "owner writes trip_checklist" ON public.trip_checklist FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.trips t WHERE t.id = trip_id AND t.user_id = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM public.trips t WHERE t.id = trip_id AND t.user_id = auth.uid()));

GRANT SELECT, INSERT, UPDATE, DELETE ON public.trip_checklist TO authenticated;
GRANT ALL ON public.trip_checklist TO service_role;