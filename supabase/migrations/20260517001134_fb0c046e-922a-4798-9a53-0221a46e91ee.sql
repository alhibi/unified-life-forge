
-- 1. rss_feed_meta
CREATE TABLE IF NOT EXISTS public.rss_feed_meta (
  source_url       text PRIMARY KEY,
  etag             text,
  last_modified    text,
  last_fetched_at  timestamptz,
  last_status      integer,
  last_error       text,
  consecutive_failures integer NOT NULL DEFAULT 0,
  item_count_last  integer,
  created_at       timestamptz NOT NULL DEFAULT now(),
  updated_at       timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_rss_feed_meta_last_fetched ON public.rss_feed_meta(last_fetched_at DESC);
ALTER TABLE public.rss_feed_meta ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Anyone can read feed meta" ON public.rss_feed_meta;
CREATE POLICY "Anyone can read feed meta" ON public.rss_feed_meta FOR SELECT TO public USING (true);
DROP POLICY IF EXISTS "Service role can write feed meta" ON public.rss_feed_meta;
CREATE POLICY "Service role can write feed meta" ON public.rss_feed_meta FOR ALL TO service_role USING (true) WITH CHECK (true);

-- 2. normalize_arabic + search_vector
CREATE OR REPLACE FUNCTION public.normalize_arabic(s text)
RETURNS text LANGUAGE sql IMMUTABLE PARALLEL SAFE AS $$
  SELECT lower(regexp_replace(regexp_replace(regexp_replace(regexp_replace(
    coalesce(s, ''),
    '[\u0610-\u061A\u064B-\u065F\u0670\u06D6-\u06ED\u0640]', '', 'g'),
    '[إأآا]', 'ا', 'g'),
    'ى', 'ي', 'g'),
    'ة', 'ه', 'g'));
$$;

ALTER TABLE public.rss_articles DROP COLUMN IF EXISTS search_vector;
ALTER TABLE public.rss_articles ADD COLUMN search_vector tsvector
  GENERATED ALWAYS AS (
    setweight(to_tsvector('simple', public.normalize_arabic(title)),       'A') ||
    setweight(to_tsvector('simple', public.normalize_arabic(description)), 'B') ||
    setweight(to_tsvector('simple', public.normalize_arabic(full_content)),'C')
  ) STORED;
CREATE INDEX IF NOT EXISTS idx_rss_articles_search_vector ON public.rss_articles USING gin(search_vector);

-- 3. search_rss_articles RPC (final signature)
CREATE OR REPLACE FUNCTION public.search_rss_articles(
  q text, src_names text[] DEFAULT NULL, max_rows integer DEFAULT 50, since_at timestamptz DEFAULT NULL
) RETURNS TABLE (link text, title text, description text, pub_date timestamptz, image text, source_name text, rank real)
LANGUAGE sql STABLE SET search_path = public AS $$
  WITH normalized AS (SELECT plainto_tsquery('simple', public.normalize_arabic(q)) AS tsq)
  SELECT r.link, r.title, r.description, r.pub_date, r.image, r.source_name,
         ts_rank(r.search_vector, n.tsq) AS rank
  FROM public.rss_articles r, normalized n
  WHERE r.search_vector @@ n.tsq
    AND (src_names IS NULL OR r.source_name = ANY(src_names))
    AND (since_at IS NULL OR r.pub_date >= since_at)
  ORDER BY rank DESC, r.pub_date DESC NULLS LAST
  LIMIT GREATEST(1, LEAST(max_rows, 200));
$$;
REVOKE EXECUTE ON FUNCTION public.search_rss_articles(text, text[], integer, timestamptz) FROM PUBLIC;
GRANT  EXECUTE ON FUNCTION public.search_rss_articles(text, text[], integer, timestamptz) TO authenticated, anon;

-- 4. keyword_alerts + keyword_alert_hits
CREATE TABLE IF NOT EXISTS public.keyword_alerts (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  keyword         text NOT NULL CHECK (length(keyword) BETWEEN 2 AND 80),
  source_filter   text[],
  match_mode      text NOT NULL DEFAULT 'any' CHECK (match_mode IN ('any', 'phrase', 'whole_word')),
  enabled         boolean NOT NULL DEFAULT true,
  last_check_at   timestamptz NOT NULL DEFAULT now(),
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_keyword_alerts_user ON public.keyword_alerts(user_id) WHERE enabled = true;
ALTER TABLE public.keyword_alerts ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users manage their own keyword alerts" ON public.keyword_alerts;
CREATE POLICY "Users manage their own keyword alerts" ON public.keyword_alerts FOR ALL TO authenticated
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE TABLE IF NOT EXISTS public.keyword_alert_hits (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  alert_id        uuid NOT NULL REFERENCES public.keyword_alerts(id) ON DELETE CASCADE,
  user_id         uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  article_link    text NOT NULL,
  article_title   text NOT NULL,
  source_name     text,
  matched_at      timestamptz NOT NULL DEFAULT now(),
  seen            boolean NOT NULL DEFAULT false,
  UNIQUE (alert_id, article_link)
);
CREATE INDEX IF NOT EXISTS idx_keyword_alert_hits_user_unseen
  ON public.keyword_alert_hits(user_id, matched_at DESC) WHERE seen = false;
ALTER TABLE public.keyword_alert_hits ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users read their own alert hits" ON public.keyword_alert_hits;
CREATE POLICY "Users read their own alert hits" ON public.keyword_alert_hits FOR SELECT TO authenticated USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "Users mark their alert hits as seen" ON public.keyword_alert_hits;
CREATE POLICY "Users mark their alert hits as seen" ON public.keyword_alert_hits FOR UPDATE TO authenticated
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "Service role writes alert hits" ON public.keyword_alert_hits;
CREATE POLICY "Service role writes alert hits" ON public.keyword_alert_hits FOR INSERT TO service_role WITH CHECK (true);

CREATE OR REPLACE FUNCTION public.touch_keyword_alerts_updated_at()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN NEW.updated_at := now(); RETURN NEW; END;
$$;
DROP TRIGGER IF EXISTS keyword_alerts_touch_updated_at ON public.keyword_alerts;
CREATE TRIGGER keyword_alerts_touch_updated_at
  BEFORE UPDATE ON public.keyword_alerts FOR EACH ROW
  EXECUTE FUNCTION public.touch_keyword_alerts_updated_at();

-- 5. Realtime for alert hits
ALTER TABLE public.keyword_alert_hits REPLICA IDENTITY FULL;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_publication_tables
    WHERE pubname='supabase_realtime' AND schemaname='public' AND tablename='keyword_alert_hits') THEN
    EXECUTE 'ALTER PUBLICATION supabase_realtime ADD TABLE public.keyword_alert_hits';
  END IF;
EXCEPTION WHEN undefined_object THEN NULL; END $$;

-- 6. reading_cron_status
CREATE OR REPLACE FUNCTION public.reading_cron_status(max_rows integer DEFAULT 20)
RETURNS TABLE (jobname text, status text, start_time timestamptz, end_time timestamptz, return_message text)
LANGUAGE sql SECURITY DEFINER SET search_path = public STABLE AS $$
  SELECT j.jobname::text, d.status::text, d.start_time, d.end_time, d.return_message
  FROM cron.job j JOIN cron.job_run_details d ON d.jobid = j.jobid
  WHERE j.jobname IN ('rss-refresh-feeds', 'rss-keyword-alerts')
  ORDER BY d.start_time DESC
  LIMIT GREATEST(1, LEAST(max_rows, 200));
$$;
REVOKE EXECUTE ON FUNCTION public.reading_cron_status(integer) FROM PUBLIC;
GRANT  EXECUTE ON FUNCTION public.reading_cron_status(integer) TO authenticated, anon;

-- 7. pg_cron schedule
CREATE EXTENSION IF NOT EXISTS pg_cron;
CREATE EXTENSION IF NOT EXISTS pg_net;

CREATE OR REPLACE FUNCTION public.invoke_edge_function(fn_name text, payload jsonb DEFAULT '{}'::jsonb)
RETURNS bigint LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE base_url text; key text; request_id bigint;
BEGIN
  base_url := current_setting('app.settings.supabase_url', true);
  key      := current_setting('app.settings.service_role_key', true);
  IF base_url IS NULL OR key IS NULL OR base_url = '' OR key = '' THEN
    RAISE NOTICE 'invoke_edge_function: settings missing, skipping %', fn_name;
    RETURN NULL;
  END IF;
  SELECT net.http_post(
    url := base_url || '/functions/v1/' || fn_name,
    headers := jsonb_build_object('Content-Type','application/json','Authorization','Bearer ' || key),
    body := payload,
    timeout_milliseconds := 60000
  ) INTO request_id;
  RETURN request_id;
END $$;

DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM cron.job WHERE jobname='rss-refresh-feeds') THEN PERFORM cron.unschedule('rss-refresh-feeds'); END IF;
  PERFORM cron.schedule('rss-refresh-feeds','*/30 * * * *',
    $cron$ SELECT public.invoke_edge_function('fetch-rss-cron', '{}'::jsonb); $cron$);
  IF EXISTS (SELECT 1 FROM cron.job WHERE jobname='rss-keyword-alerts') THEN PERFORM cron.unschedule('rss-keyword-alerts'); END IF;
  PERFORM cron.schedule('rss-keyword-alerts','5,35 * * * *',
    $cron$ SELECT public.invoke_edge_function('check-keyword-alerts', '{}'::jsonb); $cron$);
EXCEPTION WHEN OTHERS THEN RAISE NOTICE 'pg_cron scheduling skipped: %', SQLERRM;
END $$;
