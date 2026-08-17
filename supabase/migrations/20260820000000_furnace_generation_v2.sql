-- Migration for الفرن — Generation Console v2

-- 1. Extend content_generation_jobs
ALTER TABLE public.content_generation_jobs
  ADD COLUMN IF NOT EXISTS estimated_cost_usd NUMERIC DEFAULT 0,
  ADD COLUMN IF NOT EXISTS strictness TEXT DEFAULT 'balanced',
  ADD COLUMN IF NOT EXISTS register_targets TEXT[] DEFAULT '{}';

-- 2. Extend german_club_entries with job reference
ALTER TABLE public.german_club_entries
  ADD COLUMN IF NOT EXISTS generation_job_id UUID REFERENCES public.content_generation_jobs(id) ON DELETE SET NULL;

-- 3. Create generation_job_rejections table
CREATE TABLE IF NOT EXISTS public.generation_job_rejections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id UUID REFERENCES public.content_generation_jobs(id) ON DELETE CASCADE,
  candidate_text TEXT NOT NULL,
  reason TEXT NOT NULL, -- duplicate | gender_uncertain | register_mismatch | shelf_mismatch | low_confidence
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- 4. Create model_performance_stats table
CREATE TABLE IF NOT EXISTS public.model_performance_stats (
  model_id TEXT NOT NULL,
  shelf_id UUID REFERENCES public.german_club_shelves(id) ON DELETE CASCADE,
  total_generated INT DEFAULT 0,
  total_accepted INT DEFAULT 0,
  runs_count INT DEFAULT 0,
  last_used_at TIMESTAMP WITH TIME ZONE,
  PRIMARY KEY (model_id, shelf_id)
);

-- RLS & Grants
GRANT ALL ON public.generation_job_rejections TO authenticated, service_role;
GRANT ALL ON public.model_performance_stats TO authenticated, service_role;

ALTER TABLE public.generation_job_rejections ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.model_performance_stats ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'generation_job_rejections' AND policyname = 'admin manages rejections'
  ) THEN
    CREATE POLICY "admin manages rejections" ON public.generation_job_rejections
      FOR ALL USING (auth.uid() IS NOT NULL);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'model_performance_stats' AND policyname = 'authenticated manages performance stats'
  ) THEN
    CREATE POLICY "authenticated manages performance stats" ON public.model_performance_stats
      FOR ALL USING (auth.uid() IS NOT NULL);
  END IF;
END $$;

-- Enable Realtime updates for rejections and stats
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_publication WHERE pubname = 'supabase_realtime') THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.generation_job_rejections;
    ALTER PUBLICATION supabase_realtime ADD TABLE public.model_performance_stats;
  END IF;
EXCEPTION
  WHEN OTHERS THEN NULL;
END $$;
