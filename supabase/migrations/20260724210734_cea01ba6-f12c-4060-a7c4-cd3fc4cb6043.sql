
-- Countries
CREATE TABLE public.countries (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  iso_code text NOT NULL UNIQUE,
  name_ar text NOT NULL,
  name_en text NOT NULL,
  bounds jsonb NOT NULL,
  places_count integer NOT NULL DEFAULT 0,
  cover_image_url text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.countries TO anon, authenticated;
GRANT ALL ON public.countries TO service_role;
ALTER TABLE public.countries ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Countries are publicly readable" ON public.countries FOR SELECT USING (true);
CREATE TRIGGER update_countries_updated_at BEFORE UPDATE ON public.countries FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Places
CREATE TABLE public.places (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  country_id uuid NOT NULL REFERENCES public.countries(id) ON DELETE CASCADE,
  name_ar text NOT NULL,
  name_en text,
  category text NOT NULL DEFAULT 'other',
  location jsonb NOT NULL,
  description_ar text,
  best_time_to_visit text,
  tags text[] NOT NULL DEFAULT '{}',
  rating numeric(2,1),
  cover_photo_url text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX places_country_id_idx ON public.places(country_id);
GRANT SELECT ON public.places TO anon, authenticated;
GRANT ALL ON public.places TO service_role;
ALTER TABLE public.places ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Places are publicly readable" ON public.places FOR SELECT USING (true);
CREATE TRIGGER update_places_updated_at BEFORE UPDATE ON public.places FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Place photos
CREATE TABLE public.place_photos (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  place_id uuid NOT NULL REFERENCES public.places(id) ON DELETE CASCADE,
  storage_path text NOT NULL,
  sort_order integer NOT NULL DEFAULT 0,
  is_cover boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX place_photos_place_id_idx ON public.place_photos(place_id);
GRANT SELECT ON public.place_photos TO anon, authenticated;
GRANT ALL ON public.place_photos TO service_role;
ALTER TABLE public.place_photos ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Place photos are publicly readable" ON public.place_photos FOR SELECT USING (true);

-- Maintain places_count on countries
CREATE OR REPLACE FUNCTION public.sync_country_places_count() RETURNS trigger
LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  IF (TG_OP = 'INSERT') THEN
    UPDATE public.countries SET places_count = places_count + 1 WHERE id = NEW.country_id;
  ELSIF (TG_OP = 'DELETE') THEN
    UPDATE public.countries SET places_count = GREATEST(places_count - 1, 0) WHERE id = OLD.country_id;
  ELSIF (TG_OP = 'UPDATE') AND (NEW.country_id IS DISTINCT FROM OLD.country_id) THEN
    UPDATE public.countries SET places_count = GREATEST(places_count - 1, 0) WHERE id = OLD.country_id;
    UPDATE public.countries SET places_count = places_count + 1 WHERE id = NEW.country_id;
  END IF;
  RETURN NULL;
END;
$$;
CREATE TRIGGER places_count_sync AFTER INSERT OR UPDATE OR DELETE ON public.places FOR EACH ROW EXECUTE FUNCTION public.sync_country_places_count();
