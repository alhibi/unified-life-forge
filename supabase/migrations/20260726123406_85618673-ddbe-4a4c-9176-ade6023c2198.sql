DROP POLICY IF EXISTS "public read place_links" ON public.place_links;
CREATE POLICY "owner reads place_links"
  ON public.place_links
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.places p
      WHERE p.id = place_links.place_id
        AND p.user_id = auth.uid()
    )
  );
REVOKE SELECT ON public.place_links FROM anon;