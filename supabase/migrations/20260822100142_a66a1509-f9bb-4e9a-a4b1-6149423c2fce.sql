DO $$ BEGIN CREATE TYPE german_entry_type AS ENUM ('word','phrase','sentence','idiom'); EXCEPTION WHEN duplicate_object THEN null; END $$;
DO $$ BEGIN CREATE TYPE german_gender AS ENUM ('der','die','das','plural','n_a'); EXCEPTION WHEN duplicate_object THEN null; END $$;
DO $$ BEGIN CREATE TYPE german_register AS ENUM ('formal','neutral','informal','slang'); EXCEPTION WHEN duplicate_object THEN null; END $$;
DO $$ BEGIN CREATE TYPE content_review_status AS ENUM ('ai_generated','reviewed','verified'); EXCEPTION WHEN duplicate_object THEN null; END $$;
DO $$ BEGIN CREATE TYPE generation_mode AS ENUM ('model_capacity','fixed_count'); EXCEPTION WHEN duplicate_object THEN null; END $$;
DO $$ BEGIN CREATE TYPE generation_job_status AS ENUM ('queued','running','completed','failed'); EXCEPTION WHEN duplicate_object THEN null; END $$;

CREATE TABLE IF NOT EXISTS public.german_club_shelves (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug text UNIQUE NOT NULL,
  title_ar text NOT NULL,
  title_de text,
  description_ar text,
  situation_tags text[] DEFAULT '{}',
  icon text,
  sort_order int DEFAULT 0,
  is_premium boolean DEFAULT false,
  target_entry_count int DEFAULT 25,
  created_at timestamptz DEFAULT now()
);
ALTER TABLE public.german_club_shelves ADD COLUMN IF NOT EXISTS target_entry_count int DEFAULT 25;

CREATE TABLE IF NOT EXISTS public.german_club_entries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  shelf_id uuid REFERENCES public.german_club_shelves(id) ON DELETE CASCADE,
  entry_type german_entry_type NOT NULL,
  german_text text NOT NULL,
  gender german_gender DEFAULT 'n_a',
  ipa text,
  arabic_translation text NOT NULL,
  register german_register DEFAULT 'neutral',
  is_separable_verb boolean DEFAULT false,
  separable_prefix text,
  example_sentence_de text,
  example_sentence_ar text,
  audio_url text,
  difficulty_level text DEFAULT 'A1',
  review_status content_review_status DEFAULT 'ai_generated',
  sort_order int DEFAULT 0,
  created_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.german_club_grammar_notes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title_ar text NOT NULL,
  title_de text,
  body_md text NOT NULL,
  related_shelf_ids uuid[] DEFAULT '{}',
  difficulty_level text DEFAULT 'A1',
  review_status content_review_status DEFAULT 'ai_generated',
  sort_order int DEFAULT 0,
  created_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.german_club_progress (
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  entry_id uuid NOT NULL,
  is_mastered boolean DEFAULT false,
  last_seen_at timestamptz DEFAULT now(),
  PRIMARY KEY (user_id, entry_id)
);

ALTER TABLE public.content_generation_jobs ALTER COLUMN unit_id DROP NOT NULL;
ALTER TABLE public.content_generation_jobs
  ADD COLUMN IF NOT EXISTS shelf_id uuid REFERENCES public.german_club_shelves(id) ON DELETE CASCADE,
  ADD COLUMN IF NOT EXISTS model_id text,
  ADD COLUMN IF NOT EXISTS mode generation_mode DEFAULT 'model_capacity',
  ADD COLUMN IF NOT EXISTS target_count int,
  ADD COLUMN IF NOT EXISTS entries_generated int DEFAULT 0,
  ADD COLUMN IF NOT EXISTS entries_skipped_duplicate int DEFAULT 0,
  ADD COLUMN IF NOT EXISTS entries_discarded_low_quality int DEFAULT 0,
  ADD COLUMN IF NOT EXISTS error_message text,
  ADD COLUMN IF NOT EXISTS triggered_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS started_at timestamptz DEFAULT now(),
  ADD COLUMN IF NOT EXISTS completed_at timestamptz,
  ADD COLUMN IF NOT EXISTS estimated_cost_usd numeric DEFAULT 0,
  ADD COLUMN IF NOT EXISTS strictness text DEFAULT 'balanced',
  ADD COLUMN IF NOT EXISTS register_targets text[] DEFAULT '{}';

ALTER TABLE public.german_club_entries
  ADD COLUMN IF NOT EXISTS generation_job_id uuid REFERENCES public.content_generation_jobs(id) ON DELETE SET NULL;

CREATE TABLE IF NOT EXISTS public.generation_job_rejections (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id uuid REFERENCES public.content_generation_jobs(id) ON DELETE CASCADE,
  candidate_text text NOT NULL,
  reason text NOT NULL,
  created_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.model_performance_stats (
  model_id text NOT NULL,
  shelf_id uuid REFERENCES public.german_club_shelves(id) ON DELETE CASCADE,
  total_generated int DEFAULT 0,
  total_accepted int DEFAULT 0,
  runs_count int DEFAULT 0,
  last_used_at timestamptz,
  PRIMARY KEY (model_id, shelf_id)
);

CREATE INDEX IF NOT EXISTS idx_german_entries_shelf ON public.german_club_entries(shelf_id, sort_order);
CREATE INDEX IF NOT EXISTS idx_german_entries_job ON public.german_club_entries(generation_job_id);
CREATE INDEX IF NOT EXISTS idx_gen_jobs_shelf ON public.content_generation_jobs(shelf_id, status);

GRANT SELECT ON public.german_club_shelves TO anon, authenticated;
GRANT ALL ON public.german_club_shelves TO service_role;
GRANT SELECT ON public.german_club_entries TO anon, authenticated;
GRANT ALL ON public.german_club_entries TO service_role;
GRANT SELECT ON public.german_club_grammar_notes TO anon, authenticated;
GRANT ALL ON public.german_club_grammar_notes TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.german_club_progress TO authenticated;
GRANT ALL ON public.german_club_progress TO service_role;
GRANT SELECT ON public.content_generation_jobs TO authenticated;
GRANT ALL ON public.content_generation_jobs TO service_role;
GRANT SELECT ON public.generation_job_rejections TO authenticated;
GRANT ALL ON public.generation_job_rejections TO service_role;
GRANT SELECT ON public.model_performance_stats TO authenticated;
GRANT ALL ON public.model_performance_stats TO service_role;

ALTER TABLE public.german_club_shelves ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.german_club_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.german_club_grammar_notes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.german_club_progress ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.content_generation_jobs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.generation_job_rejections ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.model_performance_stats ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "shelves readable" ON public.german_club_shelves;
CREATE POLICY "shelves readable" ON public.german_club_shelves FOR SELECT TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "only reviewed entries readable" ON public.german_club_entries;
DROP POLICY IF EXISTS "entries readable" ON public.german_club_entries;
CREATE POLICY "entries readable" ON public.german_club_entries FOR SELECT TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "grammar notes readable" ON public.german_club_grammar_notes;
CREATE POLICY "grammar notes readable" ON public.german_club_grammar_notes FOR SELECT TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "own progress" ON public.german_club_progress;
CREATE POLICY "own progress" ON public.german_club_progress FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "admin manages jobs" ON public.content_generation_jobs;
DROP POLICY IF EXISTS "allow authenticated manages jobs" ON public.content_generation_jobs;
DROP POLICY IF EXISTS "jobs readable by authenticated" ON public.content_generation_jobs;
CREATE POLICY "jobs readable by authenticated" ON public.content_generation_jobs FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "admin manages rejections" ON public.generation_job_rejections;
DROP POLICY IF EXISTS "authenticated manages rejections" ON public.generation_job_rejections;
DROP POLICY IF EXISTS "rejections readable by authenticated" ON public.generation_job_rejections;
CREATE POLICY "rejections readable by authenticated" ON public.generation_job_rejections FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "authenticated manages performance stats" ON public.model_performance_stats;
DROP POLICY IF EXISTS "stats readable by authenticated" ON public.model_performance_stats;
CREATE POLICY "stats readable by authenticated" ON public.model_performance_stats FOR SELECT TO authenticated USING (true);

DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM pg_publication WHERE pubname = 'supabase_realtime') THEN
    BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE public.content_generation_jobs; EXCEPTION WHEN OTHERS THEN NULL; END;
    BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE public.generation_job_rejections; EXCEPTION WHEN OTHERS THEN NULL; END;
    BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE public.german_club_entries; EXCEPTION WHEN OTHERS THEN NULL; END;
  END IF;
END $$;