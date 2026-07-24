-- Travel Atlas / أطلس الرحلات
-- Personal, multi-user-ready travel guide with public discovery.

CREATE EXTENSION IF NOT EXISTS postgis;
CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE public.countries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  iso_code TEXT UNIQUE NOT NULL,
  name_ar TEXT NOT NULL,
  name_en TEXT NOT NULL,
  center GEOGRAPHY(POINT, 4326) NOT NULL,
  bounds JSONB NOT NULL CHECK (
    jsonb_typeof(bounds) = 'object'
    AND jsonb_typeof(bounds -> 'sw') = 'array'
    AND jsonb_array_length(bounds -> 'sw') = 2
    AND jsonb_typeof(bounds -> 'sw' -> 0) = 'number'
    AND jsonb_typeof(bounds -> 'sw' -> 1) = 'number'
    AND jsonb_typeof(bounds -> 'ne') = 'array'
    AND jsonb_array_length(bounds -> 'ne') = 2
    AND jsonb_typeof(bounds -> 'ne' -> 0) = 'number'
    AND jsonb_typeof(bounds -> 'ne' -> 1) = 'number'
  ),
  places_count INTEGER NOT NULL DEFAULT 0 CHECK (places_count >= 0),
  cover_image_url TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE public.places (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) DEFAULT auth.uid(),
  country_id UUID REFERENCES public.countries(id) ON DELETE CASCADE NOT NULL,
  name_ar TEXT NOT NULL,
  name_en TEXT,
  category TEXT NOT NULL CHECK (
    category IN ('nature', 'historic', 'food', 'city', 'religious', 'adventure', 'other')
  ),
  location GEOGRAPHY(POINT, 4326) NOT NULL,
  description_ar TEXT,
  best_time_to_visit TEXT,
  tags TEXT[] DEFAULT '{}',
  rating NUMERIC(2,1) CHECK (rating BETWEEN 0 AND 5),
  cover_photo_url TEXT,
  ai_enriched BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE public.place_photos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  place_id UUID REFERENCES public.places(id) ON DELETE CASCADE NOT NULL,
  storage_path TEXT NOT NULL,
  sort_order INTEGER DEFAULT 0,
  is_cover BOOLEAN DEFAULT false
);

CREATE INDEX places_location_idx ON public.places USING GIST(location);
CREATE INDEX places_country_idx ON public.places(country_id);

-- Keep countries.places_count in sync automatically. SECURITY DEFINER is
-- required because country rows are public reference data and intentionally
-- have no client write policy; the trigger still needs to update their count.
CREATE OR REPLACE FUNCTION public.sync_country_places_count()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF (TG_OP = 'INSERT') THEN
    UPDATE public.countries
    SET places_count = places_count + 1
    WHERE id = NEW.country_id;
  ELSIF (TG_OP = 'UPDATE' AND OLD.country_id IS DISTINCT FROM NEW.country_id) THEN
    UPDATE public.countries
    SET places_count = GREATEST(places_count - 1, 0)
    WHERE id = OLD.country_id;

    UPDATE public.countries
    SET places_count = places_count + 1
    WHERE id = NEW.country_id;
  ELSIF (TG_OP = 'DELETE') THEN
    UPDATE public.countries
    SET places_count = GREATEST(places_count - 1, 0)
    WHERE id = OLD.country_id;
  END IF;
  RETURN NULL;
END;
$$;

CREATE TRIGGER trg_places_count
AFTER INSERT OR DELETE OR UPDATE OF country_id ON public.places
FOR EACH ROW EXECUTE FUNCTION public.sync_country_places_count();

ALTER TABLE public.countries ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.places ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.place_photos ENABLE ROW LEVEL SECURITY;

CREATE POLICY "public read countries"
  ON public.countries FOR SELECT
  TO anon, authenticated
  USING (true);

CREATE POLICY "public read places"
  ON public.places FOR SELECT
  TO anon, authenticated
  USING (true);

CREATE POLICY "public read place_photos"
  ON public.place_photos FOR SELECT
  TO anon, authenticated
  USING (true);

CREATE POLICY "owner writes places"
  ON public.places FOR ALL
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "owner writes photos"
  ON public.place_photos FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.places p
      WHERE p.id = place_id
        AND p.user_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM public.places p
      WHERE p.id = place_id
        AND p.user_id = auth.uid()
    )
  );

GRANT SELECT ON public.countries, public.places, public.place_photos TO anon;
GRANT SELECT ON public.countries, public.places, public.place_photos TO authenticated;
GRANT INSERT, UPDATE, DELETE ON public.places, public.place_photos TO authenticated;
GRANT ALL ON public.countries, public.places, public.place_photos TO service_role;

-- Public-read photo storage. Object paths are expected to begin with the
-- owning place UUID: <place_id>/<filename>.
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'place-photos',
  'place-photos',
  true,
  10485760,
  ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/avif']
)
ON CONFLICT (id) DO UPDATE
SET public = EXCLUDED.public,
    file_size_limit = EXCLUDED.file_size_limit,
    allowed_mime_types = EXCLUDED.allowed_mime_types;

CREATE POLICY "public read place photo objects"
  ON storage.objects FOR SELECT
  TO anon, authenticated
  USING (bucket_id = 'place-photos');

CREATE POLICY "owners upload place photo objects"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'place-photos'
    AND EXISTS (
      SELECT 1
      FROM public.places p
      WHERE p.id::text = (storage.foldername(name))[1]
        AND p.user_id = auth.uid()
    )
  );

CREATE POLICY "owners update place photo objects"
  ON storage.objects FOR UPDATE
  TO authenticated
  USING (
    bucket_id = 'place-photos'
    AND EXISTS (
      SELECT 1
      FROM public.places p
      WHERE p.id::text = (storage.foldername(name))[1]
        AND p.user_id = auth.uid()
    )
  )
  WITH CHECK (
    bucket_id = 'place-photos'
    AND EXISTS (
      SELECT 1
      FROM public.places p
      WHERE p.id::text = (storage.foldername(name))[1]
        AND p.user_id = auth.uid()
    )
  );

CREATE POLICY "owners delete place photo objects"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (
    bucket_id = 'place-photos'
    AND EXISTS (
      SELECT 1
      FROM public.places p
      WHERE p.id::text = (storage.foldername(name))[1]
        AND p.user_id = auth.uid()
    )
  );
