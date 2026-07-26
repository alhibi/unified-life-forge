-- Travel Atlas v3 — country stamps, timed itineraries, packing lists
--
-- Two additions, each answering a question the place-level atlas cannot:
--
--   1. "which COUNTRIES have I been to" — a country is stamped as a whole, and
--      that is true even where the traveller saved no individual place. Deriving
--      it from `places` would mean a country only counts once you remember to pin
--      a café in it, which is backwards.
--
--   2. "what am I doing at 09:00 on day two, and what do I need to pack" — the
--      itinerary gains clock times, and each trip gains a checklist.

-- ── Country stamps ──────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.country_stamps (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE DEFAULT auth.uid() NOT NULL,
  -- ISO 3166-1 alpha-2. Deliberately NOT a foreign key to public.countries:
  -- that table only holds the countries someone has saved a place in, and a
  -- stamp must work for all 178 on the map.
  iso_code TEXT NOT NULL CHECK (iso_code ~ '^[A-Z]{2}$'),
  status TEXT NOT NULL DEFAULT 'visited' CHECK (status IN ('visited', 'wishlist', 'lived')),
  -- Optional: the year it first happened. A full date is more precision than
  -- anyone remembers for a country visited twenty years ago.
  first_year SMALLINT CHECK (first_year IS NULL OR first_year BETWEEN 1900 AND 2200),
  visit_count SMALLINT NOT NULL DEFAULT 1 CHECK (visit_count BETWEEN 0 AND 999),
  note_ar TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE (user_id, iso_code)
);

CREATE INDEX IF NOT EXISTS country_stamps_user_idx ON public.country_stamps(user_id, status);

DROP TRIGGER IF EXISTS trg_country_stamps_touch ON public.country_stamps;
CREATE TRIGGER trg_country_stamps_touch
BEFORE UPDATE ON public.country_stamps
FOR EACH ROW EXECUTE FUNCTION public.travel_touch_updated_at();

ALTER TABLE public.country_stamps ENABLE ROW LEVEL SECURITY;

-- A travel record is private by default. Unlike `places`, which are public-read
-- so a link can be shared, nobody else needs to see which countries you have
-- been to.
DROP POLICY IF EXISTS "owner reads country_stamps" ON public.country_stamps;
CREATE POLICY "owner reads country_stamps"
  ON public.country_stamps FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "owner writes country_stamps" ON public.country_stamps;
CREATE POLICY "owner writes country_stamps"
  ON public.country_stamps FOR ALL
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.country_stamps TO authenticated;
GRANT ALL ON public.country_stamps TO service_role;

-- ── Timed itinerary stops ───────────────────────────────────────────────────

ALTER TABLE public.trip_places
  ADD COLUMN IF NOT EXISTS start_time TIME,
  ADD COLUMN IF NOT EXISTS duration_minutes INTEGER;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'trip_places_duration_check'
  ) THEN
    ALTER TABLE public.trip_places
      ADD CONSTRAINT trip_places_duration_check
      CHECK (duration_minutes IS NULL OR duration_minutes BETWEEN 5 AND 1440);
  END IF;
END
$$;

-- ── Packing / document checklist ────────────────────────────────────────────

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

CREATE INDEX IF NOT EXISTS trip_checklist_trip_idx
  ON public.trip_checklist(trip_id, category, sort_order);

ALTER TABLE public.trip_checklist ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "owner reads trip_checklist" ON public.trip_checklist;
CREATE POLICY "owner reads trip_checklist"
  ON public.trip_checklist FOR SELECT
  TO authenticated
  USING (
    EXISTS (SELECT 1 FROM public.trips t WHERE t.id = trip_id AND t.user_id = auth.uid())
  );

DROP POLICY IF EXISTS "owner writes trip_checklist" ON public.trip_checklist;
CREATE POLICY "owner writes trip_checklist"
  ON public.trip_checklist FOR ALL
  TO authenticated
  USING (
    EXISTS (SELECT 1 FROM public.trips t WHERE t.id = trip_id AND t.user_id = auth.uid())
  )
  WITH CHECK (
    EXISTS (SELECT 1 FROM public.trips t WHERE t.id = trip_id AND t.user_id = auth.uid())
  );

GRANT SELECT, INSERT, UPDATE, DELETE ON public.trip_checklist TO authenticated;
GRANT ALL ON public.trip_checklist TO service_role;
