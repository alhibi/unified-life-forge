-- =====================================================================
-- TIME-RANGE FILTER for archive search
-- =====================================================================
-- The original search_rss_articles RPC took (q, src_names, max_rows).
-- The UI now exposes time-range chips (today / week / month / all) so
-- users can answer questions like "what did Reuters say about the Suez
-- canal *this week*" without scrolling through three years of results.
--
-- We add a `since_at` timestamptz parameter. NULL means no time
-- restriction (preserves the prior behaviour). Postgres dispatches on
-- argument type, so this is a backwards-compatible signature change:
-- old callers that pass (q, src_names, max_rows) keep working through
-- the implicit-NULL default.
--
-- The pub_date column already has an index from the original
-- migration, so the additional predicate is essentially free.

CREATE OR REPLACE FUNCTION public.search_rss_articles(
  q text,
  src_names text[] DEFAULT NULL,
  max_rows integer DEFAULT 50,
  since_at timestamptz DEFAULT NULL
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
  WITH normalized AS (
    SELECT plainto_tsquery('simple', public.normalize_arabic(q)) AS tsq
  )
  SELECT
    r.link,
    r.title,
    r.description,
    r.pub_date,
    r.image,
    r.source_name,
    ts_rank(r.search_vector, n.tsq) AS rank
  FROM public.rss_articles r, normalized n
  WHERE r.search_vector @@ n.tsq
    AND (src_names IS NULL OR r.source_name = ANY(src_names))
    AND (since_at IS NULL OR r.pub_date >= since_at)
  ORDER BY rank DESC, r.pub_date DESC NULLS LAST
  LIMIT GREATEST(1, LEAST(max_rows, 200));
$$;

REVOKE EXECUTE ON FUNCTION public.search_rss_articles(text, text[], integer, timestamptz) FROM PUBLIC;
GRANT  EXECUTE ON FUNCTION public.search_rss_articles(text, text[], integer, timestamptz) TO authenticated;
GRANT  EXECUTE ON FUNCTION public.search_rss_articles(text, text[], integer, timestamptz) TO anon;
