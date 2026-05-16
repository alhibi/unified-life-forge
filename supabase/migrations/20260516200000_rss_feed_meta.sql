-- =====================================================================
-- RSS FEED METADATA — ETag / Last-Modified caching
-- =====================================================================
-- The fetch-rss edge function uses this to send conditional requests
-- (If-None-Match / If-Modified-Since), so unchanged feeds short-circuit
-- with a 304 and we return cached articles from rss_articles instead of
-- re-parsing the entire body.
--
-- Per-feed status is also kept here so the UI can display health
-- indicators ("X failed yesterday", "Y returned 304", etc.).

CREATE TABLE IF NOT EXISTS public.rss_feed_meta (
  source_url       text PRIMARY KEY,
  etag             text,
  last_modified    text,
  last_fetched_at  timestamp with time zone,
  last_status      integer,             -- HTTP status of the last fetch
  last_error       text,                -- truncated error string when last_status indicates failure
  consecutive_failures integer NOT NULL DEFAULT 0,
  item_count_last  integer,             -- how many items the last successful fetch produced
  created_at       timestamp with time zone NOT NULL DEFAULT now(),
  updated_at       timestamp with time zone NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_rss_feed_meta_last_fetched ON public.rss_feed_meta(last_fetched_at DESC);

ALTER TABLE public.rss_feed_meta ENABLE ROW LEVEL SECURITY;

-- Anyone can read feed health info (it's all public RSS metadata anyway).
CREATE POLICY "Anyone can read feed meta"
  ON public.rss_feed_meta
  FOR SELECT
  TO public
  USING (true);

-- Only the service role (used by the edge function) can write.
CREATE POLICY "Service role can write feed meta"
  ON public.rss_feed_meta
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);
