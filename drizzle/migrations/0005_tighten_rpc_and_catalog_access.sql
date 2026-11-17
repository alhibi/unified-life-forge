REVOKE EXECUTE ON FUNCTION public.invoke_edge_function(text, jsonb) FROM PUBLIC, anon, authenticated;

CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role app_role)
 RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public'
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id AND role = _role
      AND (_user_id = auth.uid() OR auth.role() = 'service_role')
  )
$$;

CREATE OR REPLACE FUNCTION public.search_profiles(q text, lim integer DEFAULT 12)
 RETURNS TABLE(user_id uuid, username text, display_name text, avatar_url text)
 LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public'
AS $$
  SELECT p.user_id, p.username, p.display_name, p.avatar_url
  FROM public.profiles p
  WHERE auth.uid() IS NOT NULL
    AND length(btrim(q)) >= 2
    AND p.user_id <> auth.uid()
    AND (
      (p.is_public AND (p.username ILIKE '%' || q || '%' OR coalesce(p.display_name,'') ILIKE '%' || q || '%'))
      OR lower(p.username) = lower(btrim(q))
    )
  ORDER BY p.username ASC
  LIMIT GREATEST(1, LEAST(coalesce(lim, 12), 25));
$$;

DROP POLICY IF EXISTS "public read grammar points" ON public.grammar_points;
CREATE POLICY "signed-in read grammar points" ON public.grammar_points FOR SELECT TO authenticated USING (auth.uid() IS NOT NULL);
DROP POLICY IF EXISTS "public read languages" ON public.languages;
CREATE POLICY "signed-in read languages" ON public.languages FOR SELECT TO authenticated USING (auth.uid() IS NOT NULL);
DROP POLICY IF EXISTS "shelves readable" ON public.german_club_shelves;
CREATE POLICY "signed-in read shelves" ON public.german_club_shelves FOR SELECT TO authenticated USING (auth.uid() IS NOT NULL);
DROP POLICY IF EXISTS "public read units" ON public.units;
CREATE POLICY "signed-in read units" ON public.units FOR SELECT TO authenticated USING (auth.uid() IS NOT NULL);
DROP POLICY IF EXISTS "grammar notes readable" ON public.german_club_grammar_notes;
CREATE POLICY "signed-in read grammar notes" ON public.german_club_grammar_notes FOR SELECT TO authenticated USING (auth.uid() IS NOT NULL);
DROP POLICY IF EXISTS "Countries are publicly readable" ON public.countries;
CREATE POLICY "signed-in read countries" ON public.countries FOR SELECT TO authenticated USING (auth.uid() IS NOT NULL);
DROP POLICY IF EXISTS "entries readable" ON public.german_club_entries;
CREATE POLICY "signed-in read entries" ON public.german_club_entries FOR SELECT TO authenticated USING (auth.uid() IS NOT NULL);
DROP POLICY IF EXISTS "public read lessons" ON public.lessons;
CREATE POLICY "signed-in read lessons" ON public.lessons FOR SELECT TO authenticated USING (auth.uid() IS NOT NULL);
DROP POLICY IF EXISTS "public read exercise vocab map" ON public.exercise_vocab_map;
CREATE POLICY "signed-in read exercise vocab map" ON public.exercise_vocab_map FOR SELECT TO authenticated USING (auth.uid() IS NOT NULL);
DROP POLICY IF EXISTS "public read cefr levels" ON public.cefr_levels;
CREATE POLICY "signed-in read cefr levels" ON public.cefr_levels FOR SELECT TO authenticated USING (auth.uid() IS NOT NULL);

DROP POLICY IF EXISTS "Authenticated users can read public keys" ON public.chat_public_keys;
CREATE POLICY "Read own or conversation partner keys" ON public.chat_public_keys FOR SELECT TO authenticated
USING (
  user_id = auth.uid() OR EXISTS (
    SELECT 1 FROM public.conversations c
    WHERE (c.user1_id = auth.uid() AND c.user2_id = chat_public_keys.user_id)
       OR (c.user2_id = auth.uid() AND c.user1_id = chat_public_keys.user_id)
  )
);

DROP POLICY IF EXISTS "Authenticated users can read feed meta" ON public.rss_feed_meta;
CREATE POLICY "Read meta for own feeds or admin" ON public.rss_feed_meta FOR SELECT TO authenticated
USING (
  public.has_role(auth.uid(), 'admin')
  OR EXISTS (SELECT 1 FROM public.reading_feeds f WHERE f.user_id = auth.uid() AND f.url = rss_feed_meta.source_url)
);