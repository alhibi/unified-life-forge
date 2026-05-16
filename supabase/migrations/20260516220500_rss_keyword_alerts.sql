-- =====================================================================
-- KEYWORD ALERTS — per-user watchlist for new articles
-- =====================================================================
-- A row here is "user U wants to be notified when any future article
-- contains keyword K". The check-keyword-alerts edge function scans
-- rss_articles published since `last_check_at` against every alert and
-- creates rows in `keyword_alert_hits` for the UI to display.

CREATE TABLE IF NOT EXISTS public.keyword_alerts (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  keyword         text NOT NULL CHECK (length(keyword) BETWEEN 2 AND 80),
  -- Optional source restriction. When NULL the alert fires on any feed.
  source_filter   text[],
  match_mode      text NOT NULL DEFAULT 'any' CHECK (match_mode IN ('any', 'phrase', 'whole_word')),
  enabled         boolean NOT NULL DEFAULT true,
  last_check_at   timestamptz NOT NULL DEFAULT now(),
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_keyword_alerts_user
  ON public.keyword_alerts(user_id) WHERE enabled = true;

ALTER TABLE public.keyword_alerts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage their own keyword alerts"
  ON public.keyword_alerts
  FOR ALL
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Hits — append-only log of (alert, article) pairs the cron job has
-- detected. The UI reads this table to render the inbox-style
-- "alerts" view. We dedupe on (alert_id, article_link) so re-runs of
-- the cron don't create duplicates.
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

CREATE POLICY "Users read their own alert hits"
  ON public.keyword_alert_hits
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users mark their alert hits as seen"
  ON public.keyword_alert_hits
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Service role inserts hits during cron; users never insert directly.
CREATE POLICY "Service role writes alert hits"
  ON public.keyword_alert_hits
  FOR INSERT
  TO service_role
  WITH CHECK (true);

-- updated_at trigger for alerts
CREATE OR REPLACE FUNCTION public.touch_keyword_alerts_updated_at()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at := now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS keyword_alerts_touch_updated_at ON public.keyword_alerts;
CREATE TRIGGER keyword_alerts_touch_updated_at
  BEFORE UPDATE ON public.keyword_alerts
  FOR EACH ROW EXECUTE FUNCTION public.touch_keyword_alerts_updated_at();
