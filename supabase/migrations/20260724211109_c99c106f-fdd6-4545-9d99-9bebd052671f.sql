
-- 1. Add owner column to places
ALTER TABLE public.places ADD COLUMN IF NOT EXISTS user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE;
ALTER TABLE public.places ALTER COLUMN user_id SET NOT NULL;
CREATE INDEX IF NOT EXISTS places_user_id_idx ON public.places(user_id);

-- 2. Replace public read policies with per-user policies on places
DROP POLICY IF EXISTS "Places are publicly readable" ON public.places;
CREATE POLICY "Users read own places" ON public.places
  FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users insert own places" ON public.places
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users update own places" ON public.places
  FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users delete own places" ON public.places
  FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- 3. place_photos: scope to owning place
DROP POLICY IF EXISTS "Place photos are publicly readable" ON public.place_photos;
CREATE POLICY "Users manage own place photos" ON public.place_photos
  FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.places p WHERE p.id = place_id AND p.user_id = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM public.places p WHERE p.id = place_id AND p.user_id = auth.uid()));

-- 4. countries stay publicly readable, but authenticated users may add new ones
CREATE POLICY "Auth users can add countries" ON public.countries
  FOR INSERT TO authenticated WITH CHECK (true);

-- 5. Storage: allow authenticated users to manage their own folder in place-photos
CREATE POLICY "Users read own place photos storage"
  ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'place-photos' AND (auth.uid()::text = (storage.foldername(name))[1]));
CREATE POLICY "Users upload own place photos storage"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'place-photos' AND (auth.uid()::text = (storage.foldername(name))[1]));
CREATE POLICY "Users delete own place photos storage"
  ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'place-photos' AND (auth.uid()::text = (storage.foldername(name))[1]));
