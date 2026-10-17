DROP POLICY IF EXISTS "Public read access for avatars" ON storage.objects;
CREATE POLICY "Users can read own avatar objects" ON storage.objects
  FOR SELECT TO authenticated
  USING (bucket_id = 'avatars' AND (storage.foldername(name))[1] = (select auth.uid())::text);
DROP POLICY IF EXISTS "stats readable by authenticated" ON public.model_performance_stats;
CREATE POLICY "stats readable by admins" ON public.model_performance_stats
  FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));