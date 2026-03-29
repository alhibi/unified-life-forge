
CREATE TABLE public.rss_articles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  link text NOT NULL UNIQUE,
  description text DEFAULT '',
  full_content text DEFAULT '',
  pub_date timestamp with time zone,
  image text,
  images jsonb DEFAULT '[]'::jsonb,
  source_name text NOT NULL,
  source_url text NOT NULL,
  fetched_at timestamp with time zone NOT NULL DEFAULT now(),
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

CREATE INDEX idx_rss_articles_pub_date ON public.rss_articles(pub_date DESC);
CREATE INDEX idx_rss_articles_source ON public.rss_articles(source_name);
CREATE INDEX idx_rss_articles_link ON public.rss_articles(link);

ALTER TABLE public.rss_articles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read articles"
  ON public.rss_articles
  FOR SELECT
  TO public
  USING (true);
