CREATE TYPE public.journal_mood AS ENUM ('organic', 'analytical', 'balanced');

CREATE TABLE public.journal_entries (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT,
  content TEXT NOT NULL DEFAULT '',
  mood public.journal_mood NOT NULL DEFAULT 'balanced',
  tags TEXT[] NOT NULL DEFAULT '{}'::text[],
  word_count INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.journal_entries TO authenticated;
GRANT ALL ON public.journal_entries TO service_role;

ALTER TABLE public.journal_entries ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users read own journal entries" ON public.journal_entries
  FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users insert own journal entries" ON public.journal_entries
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users update own journal entries" ON public.journal_entries
  FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users delete own journal entries" ON public.journal_entries
  FOR DELETE TO authenticated USING (auth.uid() = user_id);

CREATE INDEX journal_entries_user_created_idx
  ON public.journal_entries (user_id, created_at DESC);

CREATE TRIGGER update_journal_entries_updated_at
  BEFORE UPDATE ON public.journal_entries
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();