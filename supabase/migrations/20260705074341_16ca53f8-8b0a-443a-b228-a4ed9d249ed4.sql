
CREATE TABLE public.archive_documents (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  accession_number BIGSERIAL NOT NULL UNIQUE,
  title TEXT NOT NULL,
  topic TEXT NOT NULL,
  depth TEXT NOT NULL CHECK (depth IN ('standard','deep','deepest')),
  complexity TEXT NOT NULL,
  tags TEXT[] NOT NULL DEFAULT '{}',
  abstract TEXT NOT NULL DEFAULT '',
  content TEXT NOT NULL,
  outline JSONB NOT NULL DEFAULT '{}'::jsonb,
  word_count INTEGER NOT NULL DEFAULT 0,
  search_vector tsvector,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX archive_documents_user_created_idx ON public.archive_documents (user_id, created_at DESC);
CREATE INDEX archive_documents_fts_idx ON public.archive_documents USING GIN (search_vector);
CREATE INDEX archive_documents_tags_idx ON public.archive_documents USING GIN (tags);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.archive_documents TO authenticated;
GRANT ALL ON public.archive_documents TO service_role;
GRANT USAGE, SELECT ON SEQUENCE public.archive_documents_accession_number_seq TO authenticated, service_role;

ALTER TABLE public.archive_documents ENABLE ROW LEVEL SECURITY;

CREATE POLICY "own_select" ON public.archive_documents FOR SELECT TO authenticated USING (user_id = auth.uid());
CREATE POLICY "own_insert" ON public.archive_documents FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());
CREATE POLICY "own_update" ON public.archive_documents FOR UPDATE TO authenticated USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
CREATE POLICY "own_delete" ON public.archive_documents FOR DELETE TO authenticated USING (user_id = auth.uid());

CREATE TRIGGER archive_documents_updated_at
  BEFORE UPDATE ON public.archive_documents
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- FTS trigger (normalize_arabic is not IMMUTABLE so we can't use GENERATED)
CREATE OR REPLACE FUNCTION public.archive_documents_tsv_update()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  NEW.search_vector :=
    setweight(to_tsvector('simple', public.normalize_arabic(coalesce(NEW.title,''))), 'A') ||
    setweight(to_tsvector('simple', public.normalize_arabic(coalesce(array_to_string(NEW.tags,' '),''))), 'B') ||
    setweight(to_tsvector('simple', public.normalize_arabic(coalesce(NEW.abstract,''))), 'C') ||
    setweight(to_tsvector('simple', public.normalize_arabic(coalesce(NEW.content,''))), 'D');
  RETURN NEW;
END $$;

CREATE TRIGGER archive_documents_tsv
  BEFORE INSERT OR UPDATE OF title, tags, abstract, content ON public.archive_documents
  FOR EACH ROW EXECUTE FUNCTION public.archive_documents_tsv_update();

CREATE OR REPLACE FUNCTION public.search_archive(q TEXT, max_rows INTEGER DEFAULT 30)
RETURNS TABLE (
  id UUID, accession_number BIGINT, title TEXT, abstract TEXT, tags TEXT[],
  depth TEXT, word_count INTEGER, created_at TIMESTAMPTZ, rank REAL
) LANGUAGE sql STABLE SET search_path = public AS $$
  WITH n AS (SELECT plainto_tsquery('simple', public.normalize_arabic(q)) AS tsq)
  SELECT d.id, d.accession_number, d.title, d.abstract, d.tags,
         d.depth, d.word_count, d.created_at,
         ts_rank(d.search_vector, n.tsq) AS rank
  FROM public.archive_documents d, n
  WHERE d.user_id = auth.uid()
    AND (n.tsq = ''::tsquery OR d.search_vector @@ n.tsq)
  ORDER BY (CASE WHEN n.tsq = ''::tsquery THEN 0 ELSE ts_rank(d.search_vector, n.tsq) END) DESC,
           d.created_at DESC
  LIMIT GREATEST(1, LEAST(max_rows, 100));
$$;

GRANT EXECUTE ON FUNCTION public.search_archive(TEXT, INTEGER) TO authenticated;
