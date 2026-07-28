-- Migration for Fitness Tracking feature: fitness_activities and fitness_daily_metrics

-- Create Table: fitness_activities
CREATE TABLE IF NOT EXISTS public.fitness_activities (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  activity_type TEXT NOT NULL,
  source TEXT NOT NULL CHECK (source IN ('auto', 'manual')),
  start_time TIMESTAMPTZ NOT NULL,
  end_time TIMESTAMPTZ,
  duration_seconds INTEGER,
  distance_meters NUMERIC,
  calories NUMERIC,
  avg_heart_rate NUMERIC,
  route JSONB, -- Array of {lat, lng, timestamp} points for the map
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Create Table: fitness_daily_metrics
CREATE TABLE IF NOT EXISTS public.fitness_daily_metrics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  date DATE NOT NULL,
  steps INTEGER,
  distance_meters NUMERIC,
  calories NUMERIC,
  avg_heart_rate NUMERIC,
  sleep_minutes INTEGER,
  UNIQUE(user_id, date)
);

-- Enable Row Level Security (RLS)
ALTER TABLE public.fitness_activities ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.fitness_daily_metrics ENABLE ROW LEVEL SECURITY;

-- Create RLS Policies for fitness_activities
CREATE POLICY "Users can view their own fitness activities"
  ON public.fitness_activities FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own fitness activities"
  ON public.fitness_activities FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own fitness activities"
  ON public.fitness_activities FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own fitness activities"
  ON public.fitness_activities FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- Create RLS Policies for fitness_daily_metrics
CREATE POLICY "Users can view their own fitness daily metrics"
  ON public.fitness_daily_metrics FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own fitness daily metrics"
  ON public.fitness_daily_metrics FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own fitness daily metrics"
  ON public.fitness_daily_metrics FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own fitness daily metrics"
  ON public.fitness_daily_metrics FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- Create optimized indexes for query performance and key constraints
CREATE INDEX IF NOT EXISTS fitness_activities_user_id_idx ON public.fitness_activities(user_id);
CREATE INDEX IF NOT EXISTS fitness_activities_start_time_idx ON public.fitness_activities(start_time DESC);
CREATE INDEX IF NOT EXISTS fitness_daily_metrics_user_id_idx ON public.fitness_daily_metrics(user_id);
CREATE INDEX IF NOT EXISTS fitness_daily_metrics_date_idx ON public.fitness_daily_metrics(date DESC);

-- Grant privileges to authenticated and service_role
GRANT SELECT, INSERT, UPDATE, DELETE ON public.fitness_activities TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.fitness_daily_metrics TO authenticated;
GRANT ALL ON public.fitness_activities TO service_role;
GRANT ALL ON public.fitness_daily_metrics TO service_role;
