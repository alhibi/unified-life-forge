CREATE EXTENSION IF NOT EXISTS vector;

-- ─────────────── sources ───────────────
CREATE TABLE public.mg_sources (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name text NOT NULL,
  feed_url text NOT NULL,
  domain_tags text[] NOT NULL DEFAULT '{}',
  active boolean NOT NULL DEFAULT true,
  last_fetched_at timestamptz,
  last_error text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, feed_url)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.mg_sources TO authenticated;
GRANT ALL ON public.mg_sources TO service_role;
ALTER TABLE public.mg_sources ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own sources" ON public.mg_sources FOR ALL TO authenticated
  USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

-- ─────────────── articles ───────────────
CREATE TABLE public.mg_articles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  source_id uuid REFERENCES public.mg_sources(id) ON DELETE SET NULL,
  url text NOT NULL,
  title text,
  author text,
  published_at timestamptz,
  fetched_at timestamptz NOT NULL DEFAULT now(),
  raw_text text,
  summary text,
  domain_tags text[] NOT NULL DEFAULT '{}',
  word_count integer NOT NULL DEFAULT 0,
  status text NOT NULL DEFAULT 'queued' CHECK (status IN ('queued','processed','error')),
  error_message text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, url)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.mg_articles TO authenticated;
GRANT ALL ON public.mg_articles TO service_role;
ALTER TABLE public.mg_articles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own articles" ON public.mg_articles FOR ALL TO authenticated
  USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
CREATE INDEX mg_articles_user_pub_idx ON public.mg_articles (user_id, published_at DESC NULLS LAST);
CREATE INDEX mg_articles_status_idx ON public.mg_articles (user_id, status);

-- ─────────────── chunks ───────────────
CREATE TABLE public.mg_article_chunks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  article_id uuid NOT NULL REFERENCES public.mg_articles(id) ON DELETE CASCADE,
  chunk_index integer NOT NULL,
  chunk_text text NOT NULL,
  embedding vector(1536),
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (article_id, chunk_index)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.mg_article_chunks TO authenticated;
GRANT ALL ON public.mg_article_chunks TO service_role;
ALTER TABLE public.mg_article_chunks ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own chunks" ON public.mg_article_chunks FOR ALL TO authenticated
  USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
CREATE INDEX mg_chunks_embedding_idx ON public.mg_article_chunks
  USING hnsw (embedding vector_cosine_ops);

-- ─────────────── connections ───────────────
CREATE TABLE public.mg_connections (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  article_ids uuid[] NOT NULL,
  lens text NOT NULL CHECK (lens IN ('synthesizer','skeptic','pattern_hunter','contrarian')),
  connection_text text NOT NULL,
  why_it_matters text,
  novelty_score integer NOT NULL DEFAULT 3 CHECK (novelty_score BETWEEN 1 AND 5),
  confidence_label text NOT NULL DEFAULT 'speculative'
    CHECK (confidence_label IN ('speculative','plausible','well_established')),
  status text NOT NULL DEFAULT 'new' CHECK (status IN ('new','pinned','dismissed')),
  model_used text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.mg_connections TO authenticated;
GRANT ALL ON public.mg_connections TO service_role;
ALTER TABLE public.mg_connections ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own connections" ON public.mg_connections FOR ALL TO authenticated
  USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
CREATE INDEX mg_connections_feed_idx ON public.mg_connections (user_id, status, created_at DESC);

-- ─────────────── chat ───────────────
CREATE TABLE public.mg_conversations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title text,
  seed_connection_id uuid REFERENCES public.mg_connections(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.mg_conversations TO authenticated;
GRANT ALL ON public.mg_conversations TO service_role;
ALTER TABLE public.mg_conversations ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own mg conversations" ON public.mg_conversations FOR ALL TO authenticated
  USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

CREATE TABLE public.mg_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  conversation_id uuid NOT NULL REFERENCES public.mg_conversations(id) ON DELETE CASCADE,
  role text NOT NULL CHECK (role IN ('user','assistant')),
  content text NOT NULL,
  model_used text,
  cited_article_ids uuid[] NOT NULL DEFAULT '{}',
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.mg_messages TO authenticated;
GRANT ALL ON public.mg_messages TO service_role;
ALTER TABLE public.mg_messages ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own mg messages" ON public.mg_messages FOR ALL TO authenticated
  USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
CREATE INDEX mg_messages_conv_idx ON public.mg_messages (conversation_id, created_at);

-- ─────────────── pinboard ───────────────
CREATE TABLE public.mg_pinboard (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  connection_id uuid NOT NULL REFERENCES public.mg_connections(id) ON DELETE CASCADE,
  user_note text,
  pinned_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, connection_id)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.mg_pinboard TO authenticated;
GRANT ALL ON public.mg_pinboard TO service_role;
ALTER TABLE public.mg_pinboard ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own pinboard" ON public.mg_pinboard FOR ALL TO authenticated
  USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

-- ─────────────── settings ───────────────
CREATE TABLE public.mg_settings (
  user_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  preferred_models text[] NOT NULL DEFAULT '{}',
  ingestion_hour integer NOT NULL DEFAULT 6 CHECK (ingestion_hour BETWEEN 0 AND 23),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.mg_settings TO authenticated;
GRANT ALL ON public.mg_settings TO service_role;
ALTER TABLE public.mg_settings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own mg settings" ON public.mg_settings FOR ALL TO authenticated
  USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

-- ─────────────── updated_at triggers ───────────────
CREATE TRIGGER mg_sources_touch BEFORE UPDATE ON public.mg_sources
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER mg_articles_touch BEFORE UPDATE ON public.mg_articles
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER mg_connections_touch BEFORE UPDATE ON public.mg_connections
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER mg_conversations_touch BEFORE UPDATE ON public.mg_conversations
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER mg_pinboard_touch BEFORE UPDATE ON public.mg_pinboard
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER mg_settings_touch BEFORE UPDATE ON public.mg_settings
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ─────────────── semantic search ───────────────
CREATE OR REPLACE FUNCTION public.mg_match_chunks(
  query_embedding vector(1536),
  match_count integer DEFAULT 8,
  p_user_id uuid DEFAULT NULL
)
RETURNS TABLE(
  chunk_id uuid,
  article_id uuid,
  chunk_text text,
  similarity double precision,
  article_title text,
  article_url text
)
LANGUAGE sql
STABLE
SET search_path = public
AS $$
  SELECT c.id, c.article_id, c.chunk_text,
         1 - (c.embedding <=> query_embedding) AS similarity,
         a.title, a.url
  FROM public.mg_article_chunks c
  JOIN public.mg_articles a ON a.id = c.article_id
  WHERE c.embedding IS NOT NULL
    AND c.user_id = COALESCE(p_user_id, auth.uid())
  ORDER BY c.embedding <=> query_embedding
  LIMIT GREATEST(1, LEAST(COALESCE(match_count, 8), 50));
$$;
GRANT EXECUTE ON FUNCTION public.mg_match_chunks(vector, integer, uuid) TO authenticated, service_role;