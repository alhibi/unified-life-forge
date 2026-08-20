-- Migration to fix content_generation_jobs schema and ensure all columns exist
-- Solves "Could not find the 'mode' column of 'content_generation_jobs' in the schema cache"

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'generation_mode') THEN
    CREATE TYPE generation_mode AS ENUM ('model_capacity', 'fixed_count');
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'generation_job_status') THEN
    CREATE TYPE generation_job_status AS ENUM ('queued', 'running', 'completed', 'failed');
  END IF;
END $$;

-- 1. Alter content_generation_jobs to support both legacy units and modern German Club shelves
ALTER TABLE public.content_generation_jobs
  ALTER COLUMN unit_id DROP NOT NULL;

ALTER TABLE public.content_generation_jobs
  ADD COLUMN IF NOT EXISTS shelf_id UUID REFERENCES public.german_club_shelves(id) ON DELETE CASCADE,
  ADD COLUMN IF NOT EXISTS model_id TEXT,
  ADD COLUMN IF NOT EXISTS mode generation_mode DEFAULT 'model_capacity',
  ADD COLUMN IF NOT EXISTS target_count INT,
  ADD COLUMN IF NOT EXISTS entries_generated INT DEFAULT 0,
  ADD COLUMN IF NOT EXISTS entries_skipped_duplicate INT DEFAULT 0,
  ADD COLUMN IF NOT EXISTS entries_discarded_low_quality INT DEFAULT 0,
  ADD COLUMN IF NOT EXISTS error_message TEXT,
  ADD COLUMN IF NOT EXISTS triggered_by UUID REFERENCES auth.users(id),
  ADD COLUMN IF NOT EXISTS started_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  ADD COLUMN IF NOT EXISTS completed_at TIMESTAMP WITH TIME ZONE,
  ADD COLUMN IF NOT EXISTS estimated_cost_usd NUMERIC DEFAULT 0,
  ADD COLUMN IF NOT EXISTS strictness TEXT DEFAULT 'balanced',
  ADD COLUMN IF NOT EXISTS register_targets TEXT[] DEFAULT '{}';

-- 2. Grants & RLS for content_generation_jobs
GRANT ALL ON public.content_generation_jobs TO authenticated, service_role, anon;

ALTER TABLE public.content_generation_jobs ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'content_generation_jobs' AND policyname = 'allow authenticated manages jobs'
  ) THEN
    CREATE POLICY "allow authenticated manages jobs" ON public.content_generation_jobs
      FOR ALL USING (auth.uid() IS NOT NULL OR auth.role() = 'service_role')
      WITH CHECK (auth.uid() IS NOT NULL OR auth.role() = 'service_role');
  END IF;
END $$;

-- 3. Create generation_job_rejections table IF NOT EXISTS
CREATE TABLE IF NOT EXISTS public.generation_job_rejections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id UUID REFERENCES public.content_generation_jobs(id) ON DELETE CASCADE,
  candidate_text TEXT NOT NULL,
  reason TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- 4. Create model_performance_stats table IF NOT EXISTS
CREATE TABLE IF NOT EXISTS public.model_performance_stats (
  model_id TEXT NOT NULL,
  shelf_id UUID REFERENCES public.german_club_shelves(id) ON DELETE CASCADE,
  total_generated INT DEFAULT 0,
  total_accepted INT DEFAULT 0,
  runs_count INT DEFAULT 0,
  last_used_at TIMESTAMP WITH TIME ZONE,
  PRIMARY KEY (model_id, shelf_id)
);

-- Grants & RLS
GRANT ALL ON public.generation_job_rejections TO authenticated, service_role, anon;
GRANT ALL ON public.model_performance_stats TO authenticated, service_role, anon;

ALTER TABLE public.generation_job_rejections ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.model_performance_stats ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'generation_job_rejections' AND policyname = 'authenticated manages rejections'
  ) THEN
    CREATE POLICY "authenticated manages rejections" ON public.generation_job_rejections
      FOR ALL USING (auth.uid() IS NOT NULL OR auth.role() = 'service_role');
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'model_performance_stats' AND policyname = 'authenticated manages performance stats'
  ) THEN
    CREATE POLICY "authenticated manages performance stats" ON public.model_performance_stats
      FOR ALL USING (auth.uid() IS NOT NULL OR auth.role() = 'service_role');
  END IF;
END $$;

-- Enable Realtime updates
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_publication WHERE pubname = 'supabase_realtime') THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.content_generation_jobs;
    ALTER PUBLICATION supabase_realtime ADD TABLE public.generation_job_rejections;
    ALTER PUBLICATION supabase_realtime ADD TABLE public.model_performance_stats;
  END IF;
EXCEPTION
  WHEN OTHERS THEN NULL;
END $$;

-- Notify PostgREST to reload schema cache
NOTIFY pgrst, 'reload schema';
