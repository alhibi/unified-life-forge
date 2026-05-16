-- =====================================================================
-- ARABIC-AWARE FULL-TEXT SEARCH
-- =====================================================================
-- The original `search_vector` used `to_tsvector('simple', ...)` which
-- preserved Arabic diacritics (tashkeel) and the four hamza-bearing
-- alif variants (ا، أ، إ، آ). In practice this means searches for
-- "إيران" never matched articles spelling it "ايران", and any query
-- with diacritics matched almost nothing.
--
-- Fix: a stored `normalize_arabic()` function that
--   1. strips combining marks U+0610..U+061A, U+064B..U+065F, U+0670,
--      U+06D6..U+06ED  (all forms of tashkeel + tatweel),
--   2. unifies hamza variants to ا,
--   3. unifies ى → ي and ة → ه (common spelling drift),
--   4. lowercases.
--
-- The `search_vector` column is rebuilt over normalize_arabic(<text>),
-- and the RPC now normalizes the user's query before tokenising. So
-- the same input always lines up with the same vocabulary, regardless
-- of how the user types it.

CREATE OR REPLACE FUNCTION public.normalize_arabic(s text)
RETURNS text
LANGUAGE sql
IMMUTABLE
PARALLEL SAFE
AS $$
  SELECT lower(
    regexp_replace(
      regexp_replace(
        regexp_replace(
          regexp_replace(
            coalesce(s, ''),
            '[\u0610-\u061A\u064B-\u065F\u0670\u06D6-\u06ED\u0640]',
            '',
            'g'
          ),
          '[إأآا]', 'ا', 'g'
        ),
        'ى', 'ي', 'g'
      ),
      'ة', 'ه', 'g'
    )
  );
$$;

-- Drop the existing generated column so we can replace it. Generated
-- columns can't be ALTERed in place; we have to drop + recreate. The
-- GIN index dies with it; we rebuild that too.
ALTER TABLE public.rss_articles
  DROP COLUMN IF EXISTS search_vector;

ALTER TABLE public.rss_articles
  ADD COLUMN search_vector tsvector
  GENERATED ALWAYS AS (
    setweight(to_tsvector('simple', public.normalize_arabic(title)),       'A') ||
    setweight(to_tsvector('simple', public.normalize_arabic(description)), 'B') ||
    setweight(to_tsvector('simple', public.normalize_arabic(full_content)),'C')
  ) STORED;

CREATE INDEX IF NOT EXISTS idx_rss_articles_search_vector
  ON public.rss_articles USING gin(search_vector);

-- Replace the search RPC so the query side is normalized too.
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
  ORDER BY rank DESC, r.pub_date DESC NULLS LAST
  LIMIT GREATEST(1, LEAST(max_rows, 200));
$$;

REVOKE EXECUTE ON FUNCTION public.search_rss_articles(text, text[], integer) FROM PUBLIC;
GRANT  EXECUTE ON FUNCTION public.search_rss_articles(text, text[], integer) TO authenticated;
GRANT  EXECUTE ON FUNCTION public.search_rss_articles(text, text[], integer) TO anon;
