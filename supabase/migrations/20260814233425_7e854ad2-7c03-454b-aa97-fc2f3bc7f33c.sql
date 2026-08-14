ALTER TABLE public.mg_connections DROP CONSTRAINT IF EXISTS mg_connections_lens_check;
ALTER TABLE public.mg_connections ADD CONSTRAINT mg_connections_lens_check
  CHECK (lens = ANY (ARRAY['structural'::text, 'tension'::text, 'lineage'::text]));