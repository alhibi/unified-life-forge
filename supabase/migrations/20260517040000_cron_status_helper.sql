-- =====================================================================
-- CRON STATUS HELPER
-- =====================================================================
-- pg_cron writes job-run history into the `cron.job_run_details` table
-- in the `cron` schema. That schema is restricted to superuser/postgres
-- by default, so we expose a minimal SECURITY DEFINER wrapper that
-- returns just what the UI needs (last N runs of our two reading jobs)
-- without giving any extra access.
--
-- The function whitelists job names so a future caller can't read
-- runs of other jobs (analytics jobs, vacuum schedules, …) by passing
-- a different name.

CREATE OR REPLACE FUNCTION public.reading_cron_status(max_rows integer DEFAULT 20)
RETURNS TABLE (
  jobname text,
  status text,
  start_time timestamptz,
  end_time timestamptz,
  return_message text
)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
  SELECT
    j.jobname::text,
    d.status::text,
    d.start_time,
    d.end_time,
    d.return_message
  FROM cron.job j
  JOIN cron.job_run_details d ON d.jobid = j.jobid
  WHERE j.jobname IN ('rss-refresh-feeds', 'rss-keyword-alerts')
  ORDER BY d.start_time DESC
  LIMIT GREATEST(1, LEAST(max_rows, 200));
$$;

REVOKE EXECUTE ON FUNCTION public.reading_cron_status(integer) FROM PUBLIC;
GRANT  EXECUTE ON FUNCTION public.reading_cron_status(integer) TO authenticated;
GRANT  EXECUTE ON FUNCTION public.reading_cron_status(integer) TO anon;
