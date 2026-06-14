-- rss_articles has RLS policies referencing anon/authenticated but the table
-- itself was never granted the underlying privileges. PostgREST treats this
-- as "permission denied" before RLS is even evaluated, so reads silently
-- return empty even though the policies look correct.
GRANT SELECT ON public.rss_articles TO anon, authenticated;
GRANT ALL ON public.rss_articles TO service_role;

-- rss_feed_meta is read by the same client surfaces (source picker / freshness
-- badge); fix the same gap while we're here. Writes stay restricted to the
-- service role via the existing policies.
GRANT SELECT ON public.rss_feed_meta TO anon, authenticated;
GRANT ALL ON public.rss_feed_meta TO service_role;