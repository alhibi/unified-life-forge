CREATE TABLE IF NOT EXISTS public.quick_captures (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title text NOT NULL,
  content text,
  capture_type text NOT NULL DEFAULT 'note',
  is_task boolean NOT NULL DEFAULT false,
  task_completed boolean NOT NULL DEFAULT false,
  task_due_at timestamptz,
  voice_transcript text,
  tags text[] NOT NULL DEFAULT '{}',
  captured_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT quick_captures_type_check CHECK (capture_type IN ('note','task','idea','reminder','observation')),
  CONSTRAINT quick_captures_title_len CHECK (char_length(title) <= 300)
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.quick_captures TO authenticated;
GRANT ALL ON public.quick_captures TO service_role;

ALTER TABLE public.quick_captures ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own captures" ON public.quick_captures
  FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS quick_captures_user_time_idx ON public.quick_captures (user_id, captured_at DESC);

CREATE OR REPLACE FUNCTION public.quick_captures_touch_updated_at()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END; $$;

DROP TRIGGER IF EXISTS quick_captures_updated_at ON public.quick_captures;
CREATE TRIGGER quick_captures_updated_at BEFORE UPDATE ON public.quick_captures
FOR EACH ROW EXECUTE FUNCTION public.quick_captures_touch_updated_at();