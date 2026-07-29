
CREATE TABLE IF NOT EXISTS public.fitness_activities (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  activity_type TEXT NOT NULL,
  source TEXT NOT NULL CHECK (source IN ('auto', 'manual', 'health_connect')),
  start_time TIMESTAMPTZ NOT NULL,
  end_time TIMESTAMPTZ,
  duration_seconds INTEGER,
  distance_meters NUMERIC,
  calories NUMERIC,
  avg_heart_rate NUMERIC,
  route JSONB,
  external_id TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.fitness_daily_metrics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  date DATE NOT NULL,
  steps INTEGER,
  distance_meters NUMERIC,
  calories NUMERIC,
  avg_heart_rate NUMERIC,
  sleep_minutes INTEGER,
  source TEXT DEFAULT 'health_connect',
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(user_id, date)
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.fitness_activities TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.fitness_daily_metrics TO authenticated;
GRANT ALL ON public.fitness_activities TO service_role;
GRANT ALL ON public.fitness_daily_metrics TO service_role;

ALTER TABLE public.fitness_activities ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.fitness_daily_metrics ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  CREATE POLICY "fa_select_own" ON public.fitness_activities FOR SELECT TO authenticated USING (auth.uid() = user_id);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  CREATE POLICY "fa_insert_own" ON public.fitness_activities FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  CREATE POLICY "fa_update_own" ON public.fitness_activities FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  CREATE POLICY "fa_delete_own" ON public.fitness_activities FOR DELETE TO authenticated USING (auth.uid() = user_id);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY "fdm_select_own" ON public.fitness_daily_metrics FOR SELECT TO authenticated USING (auth.uid() = user_id);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  CREATE POLICY "fdm_insert_own" ON public.fitness_daily_metrics FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  CREATE POLICY "fdm_update_own" ON public.fitness_daily_metrics FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  CREATE POLICY "fdm_delete_own" ON public.fitness_daily_metrics FOR DELETE TO authenticated USING (auth.uid() = user_id);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- Bring an existing table (from the earlier migration file) up to spec.
ALTER TABLE public.fitness_activities DROP CONSTRAINT IF EXISTS fitness_activities_source_check;
ALTER TABLE public.fitness_activities ADD CONSTRAINT fitness_activities_source_check CHECK (source IN ('auto', 'manual', 'health_connect'));
ALTER TABLE public.fitness_activities ADD COLUMN IF NOT EXISTS external_id TEXT;
ALTER TABLE public.fitness_daily_metrics ADD COLUMN IF NOT EXISTS source TEXT DEFAULT 'health_connect';
ALTER TABLE public.fitness_daily_metrics ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT now();

CREATE INDEX IF NOT EXISTS fitness_activities_user_id_idx ON public.fitness_activities(user_id);
CREATE INDEX IF NOT EXISTS fitness_activities_start_time_idx ON public.fitness_activities(start_time DESC);
CREATE INDEX IF NOT EXISTS fitness_activities_external_id_idx ON public.fitness_activities(user_id, external_id) WHERE external_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS fitness_daily_metrics_user_id_idx ON public.fitness_daily_metrics(user_id);
CREATE INDEX IF NOT EXISTS fitness_daily_metrics_date_idx ON public.fitness_daily_metrics(date DESC);
