
CREATE TABLE IF NOT EXISTS public.pkm_mind_events (
  id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id          uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  type             text NOT NULL CHECK (type IN ('insight','contradiction')),
  related_note_ids uuid[] NOT NULL,
  summary          text NOT NULL,
  created_at       timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.pkm_mind_events TO authenticated;
GRANT ALL ON public.pkm_mind_events TO service_role;

ALTER TABLE public.pkm_mind_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "own mind events" ON public.pkm_mind_events
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS pkm_mind_events_user_created_idx
  ON public.pkm_mind_events (user_id, created_at DESC);
