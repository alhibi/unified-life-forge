-- Reading feature cloud tables

-- 1) reading_feeds: user's RSS sources
CREATE TABLE public.reading_feeds (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  url text NOT NULL,
  name text NOT NULL,
  category text NOT NULL DEFAULT 'general',
  enabled boolean NOT NULL DEFAULT true,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, url)
);
CREATE INDEX reading_feeds_user_idx ON public.reading_feeds(user_id, sort_order);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.reading_feeds TO authenticated;
GRANT ALL ON public.reading_feeds TO service_role;
ALTER TABLE public.reading_feeds ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage own feeds" ON public.reading_feeds
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE TRIGGER reading_feeds_updated_at
  BEFORE UPDATE ON public.reading_feeds
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 2) reading_read_state: article read markers
CREATE TABLE public.reading_read_state (
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  article_link text NOT NULL,
  read_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, article_link)
);
CREATE INDEX reading_read_state_user_idx ON public.reading_read_state(user_id, read_at DESC);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.reading_read_state TO authenticated;
GRANT ALL ON public.reading_read_state TO service_role;
ALTER TABLE public.reading_read_state ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage own read state" ON public.reading_read_state
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- 3) reading_bookmarks: saved articles with snapshot
CREATE TABLE public.reading_bookmarks (
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  article_link text NOT NULL,
  snapshot jsonb NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, article_link)
);
CREATE INDEX reading_bookmarks_user_idx ON public.reading_bookmarks(user_id, created_at DESC);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.reading_bookmarks TO authenticated;
GRANT ALL ON public.reading_bookmarks TO service_role;
ALTER TABLE public.reading_bookmarks ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage own bookmarks" ON public.reading_bookmarks
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- 4) reading_prefs: single-row-per-user reader preferences
CREATE TABLE public.reading_prefs (
  user_id uuid NOT NULL PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  prefs jsonb NOT NULL DEFAULT '{}'::jsonb,
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.reading_prefs TO authenticated;
GRANT ALL ON public.reading_prefs TO service_role;
ALTER TABLE public.reading_prefs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage own reading prefs" ON public.reading_prefs
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE TRIGGER reading_prefs_updated_at
  BEFORE UPDATE ON public.reading_prefs
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();