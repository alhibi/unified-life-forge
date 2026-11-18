DROP POLICY IF EXISTS "Anyone can read articles" ON public.rss_articles;
REVOKE SELECT ON public.rss_articles FROM anon;
CREATE POLICY "Signed-in users can read articles" ON public.rss_articles FOR SELECT TO authenticated USING (auth.uid() IS NOT NULL);