-- Migration for In-App Content Generation Jobs (German Club)

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'generation_mode') THEN
    CREATE TYPE generation_mode AS ENUM ('model_capacity', 'fixed_count');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'generation_job_status') THEN
    CREATE TYPE generation_job_status AS ENUM ('queued', 'running', 'completed', 'failed');
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS public.content_generation_jobs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  shelf_id UUID REFERENCES public.german_club_shelves(id) ON DELETE CASCADE,
  model_id TEXT NOT NULL,
  mode generation_mode NOT NULL,
  target_count INT,
  status generation_job_status DEFAULT 'queued',
  entries_generated INT DEFAULT 0,
  entries_skipped_duplicate INT DEFAULT 0,
  entries_discarded_low_quality INT DEFAULT 0,
  error_message TEXT,
  triggered_by UUID REFERENCES auth.users(id),
  started_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  completed_at TIMESTAMP WITH TIME ZONE
);

GRANT ALL ON public.content_generation_jobs TO authenticated, service_role;

ALTER TABLE public.content_generation_jobs ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'content_generation_jobs' AND policyname = 'admin manages jobs'
  ) THEN
    CREATE POLICY "admin manages jobs" ON public.content_generation_jobs
      FOR ALL USING (auth.uid() = triggered_by);
  END IF;
END $$;

-- Enable Realtime updates for live progress tracking in UI
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_publication WHERE pubname = 'supabase_realtime') THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.content_generation_jobs;
  END IF;
EXCEPTION
  WHEN OTHERS THEN NULL;
END $$;
