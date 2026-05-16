-- =====================================================================
-- SCHEDULED REFRESH for the reading feature
-- =====================================================================
-- pg_cron fires the fetch-rss / check-keyword-alerts edge functions on
-- a fixed cadence so the archive stays fresh even when no user has the
-- app open. We use pg_net.http_post to invoke the functions because
-- pg_cron itself can only run SQL.
--
-- These extensions are usually pre-installed on Supabase; the
-- CREATE EXTENSION calls are idempotent so re-running this migration
-- is safe.

CREATE EXTENSION IF NOT EXISTS pg_cron;
CREATE EXTENSION IF NOT EXISTS pg_net;

-- Helper that posts to one of our edge functions. Reads the project
-- URL and service-role key from app settings (set once via
--   SELECT set_config('app.settings.supabase_url', '...', false);
--   SELECT set_config('app.settings.service_role_key', '...', false);
-- in Supabase Studio → Database → Extensions or via a one-off SQL).
-- If those settings are missing the function silently returns NULL so
-- the cron job keeps the schedule slot but doesn't crash.
CREATE OR REPLACE FUNCTION public.invoke_edge_function(fn_name text, payload jsonb DEFAULT '{}'::jsonb)
RETURNS bigint
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  base_url text;
  key text;
  request_id bigint;
BEGIN
  base_url := current_setting('app.settings.supabase_url', true);
  key      := current_setting('app.settings.service_role_key', true);
  IF base_url IS NULL OR key IS NULL OR base_url = '' OR key = '' THEN
    RAISE NOTICE 'invoke_edge_function: app.settings.supabase_url / service_role_key not set, skipping %', fn_name;
    RETURN NULL;
  END IF;

  SELECT net.http_post(
    url := base_url || '/functions/v1/' || fn_name,
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || key
    ),
    body := payload,
    timeout_milliseconds := 60000
  ) INTO request_id;
  RETURN request_id;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.invoke_edge_function(text, jsonb) FROM PUBLIC;
GRANT  EXECUTE ON FUNCTION public.invoke_edge_function(text, jsonb) TO postgres;

-- Scheduled job: every 30 minutes, refresh every enabled feed across
-- all users. The fetch-rss function dedupes via rss_feed_meta
-- (ETag/Last-Modified) so unchanged feeds are essentially free.
--
-- We don't pass the URL list — we let the function build it from the
-- distinct source_urls in rss_articles + rss_feed_meta. The function
-- itself enforces the SSRF allowlist.

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'rss-refresh-feeds') THEN
    PERFORM cron.unschedule('rss-refresh-feeds');
  END IF;
  PERFORM cron.schedule(
    'rss-refresh-feeds',
    '*/30 * * * *',
    $cron$ SELECT public.invoke_edge_function('fetch-rss-cron', '{}'::jsonb); $cron$
  );

  IF EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'rss-keyword-alerts') THEN
    PERFORM cron.unschedule('rss-keyword-alerts');
  END IF;
  PERFORM cron.schedule(
    'rss-keyword-alerts',
    '5,35 * * * *',
    $cron$ SELECT public.invoke_edge_function('check-keyword-alerts', '{}'::jsonb); $cron$
  );
EXCEPTION WHEN OTHERS THEN
  RAISE NOTICE 'pg_cron scheduling skipped: %', SQLERRM;
END $$;
