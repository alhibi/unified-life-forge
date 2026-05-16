-- =====================================================================
-- FULL-TEXT SEARCH on rss_articles
-- =====================================================================
-- Adds a generated tsvector column that rolls up title (weight A) +
-- description (B) + full_content (C) so ts_rank gives sensible results.
--
-- We use the 'simple' search config (not 'english' / 'arabic') because:
--   * 'arabic' isn't installed on most Postgres builds
--   * 'simple' does basic case-folding + punctuation trimming with no
--     stemming, which is the safest behaviour for mixed-language feeds
--   * Stemming through 'english' would mangle Arabic word boundaries
--
-- The GIN index makes `WHERE search_vector @@ plainto_tsquery(...)`
-- O(log n) instead of a sequential scan.

ALTER TABLE public.rss_articles
  ADD COLUMN IF NOT EXISTS search_vector tsvector
  GENERATED ALWAYS AS (
    setweight(to_tsvector('simple', coalesce(title, '')),       'A') ||
    setweight(to_tsvector('simple', coalesce(description, '')), 'B') ||
    setweight(to_tsvector('simple', coalesce(full_content, '')),'C')
  ) STORED;

CREATE INDEX IF NOT EXISTS idx_rss_articles_search_vector
  ON public.rss_articles USING gin(search_vector);

-- Helper for the search-articles edge function. Returns ranked article
-- rows for a free-text query, optionally restricted by source name.
-- SECURITY INVOKER so RLS on rss_articles still applies (anon can read
-- all rows by existing policy).
CREATE OR REPLACE FUNCTION public.search_rss_articles(
  q text,
  src_names text[] DEFAULT NULL,
  max_rows integer DEFAULT 50
) RETURNS TABLE (
  link text,
  title text,
  description text,
  pub_date timestamptz,
  image text,
  source_name text,
  rank real
)
LANGUAGE sql
STABLE
AS $$
  SELECT
    r.link,
    r.title,
    r.description,
    r.pub_date,
    r.image,
    r.source_name,
    ts_rank(r.search_vector, plainto_tsquery('simple', q)) AS rank
  FROM public.rss_articles r
  WHERE r.search_vector @@ plainto_tsquery('simple', q)
    AND (src_names IS NULL OR r.source_name = ANY(src_names))
  ORDER BY rank DESC, r.pub_date DESC NULLS LAST
  LIMIT GREATEST(1, LEAST(max_rows, 200));
$$;

REVOKE EXECUTE ON FUNCTION public.search_rss_articles(text, text[], integer) FROM PUBLIC;
GRANT  EXECUTE ON FUNCTION public.search_rss_articles(text, text[], integer) TO authenticated;
GRANT  EXECUTE ON FUNCTION public.search_rss_articles(text, text[], integer) TO anon;
