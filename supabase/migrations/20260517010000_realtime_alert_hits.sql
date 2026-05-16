-- =====================================================================
-- REALTIME for keyword_alert_hits
-- =====================================================================
-- Without this, the KeywordAlertsView UI subscribes to
-- `postgres_changes` on `keyword_alert_hits` but never receives any
-- events, because the table isn't part of the `supabase_realtime`
-- publication that the realtime backend listens to.
--
-- Both ADDs are wrapped in DO blocks so re-running the migration is
-- safe even if the table is already in the publication.

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime'
      AND schemaname = 'public'
      AND tablename = 'keyword_alert_hits'
  ) THEN
    EXECUTE 'ALTER PUBLICATION supabase_realtime ADD TABLE public.keyword_alert_hits';
  END IF;
EXCEPTION WHEN undefined_object THEN
  -- supabase_realtime publication may not exist on a bare Postgres.
  RAISE NOTICE 'supabase_realtime publication not found, skipping ADD TABLE keyword_alert_hits';
END $$;

-- REPLICA IDENTITY FULL is required so UPDATE events (e.g. marking a
-- hit as `seen`) include the previous row contents. Without it the
-- realtime backend can't deliver updates with row-level filters.
ALTER TABLE public.keyword_alert_hits REPLICA IDENTITY FULL;
