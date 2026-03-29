
CREATE POLICY "Service role can insert articles"
  ON public.rss_articles
  FOR INSERT
  TO service_role
  WITH CHECK (true);

CREATE POLICY "Service role can update articles"
  ON public.rss_articles
  FOR UPDATE
  TO service_role
  USING (true);
