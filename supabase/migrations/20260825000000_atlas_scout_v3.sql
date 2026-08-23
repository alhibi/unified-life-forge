-- Atlas Scout v3 — self-driving favourites.
--
-- The v2 flow required the user to press "run scout" for every target.
-- v3 makes a favourite SELF-STARTING: adding (or re-adding) a city fires
-- a background research run immediately, and the run now also writes a
-- narrative CITY BRIEF — the editorial opening chapter above the place
-- dossiers.
--
-- 1) atlas_watch_targets gains live per-target campaign state so the log
--    shows honest progress badges even after the client left the page:
--      auto_scout_enabled  — the self-start switch (default ON)
--      last_auto_scout_at  — when the last automatic campaign fired
--      last_run_status     — idle | running | done | failed | empty
-- 2) atlas_scout_runs.trigger distinguishes user-pressed runs from
--    auto-fired ones (analytics + honest UX copy).
-- 3) atlas_target_briefs holds one editorial brief per target — the
--    city's character, food scene, nature escapes, practical notes.

ALTER TABLE public.atlas_watch_targets
  ADD COLUMN IF NOT EXISTS auto_scout_enabled boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS last_auto_scout_at timestamptz,
  ADD COLUMN IF NOT EXISTS last_run_status text NOT NULL DEFAULT 'idle'
    CHECK (last_run_status IN ('idle','running','done','failed','empty'));

ALTER TABLE public.atlas_scout_runs
  ADD COLUMN IF NOT EXISTS trigger text NOT NULL DEFAULT 'manual'
    CHECK (trigger IN ('manual','auto'));

CREATE TABLE IF NOT EXISTS public.atlas_target_briefs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  target_id uuid NOT NULL REFERENCES public.atlas_watch_targets(id) ON DELETE CASCADE,
  intro_ar text NOT NULL,
  character_ar text,
  food_scene_ar text,
  nature_escape_ar text,
  practical_ar text,
  when_to_go text,
  best_months smallint[] NOT NULL DEFAULT '{}',
  sources text[] NOT NULL DEFAULT '{}',
  model text,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- One living brief per favourite — newer runs UPDATE it, they don't stack.
CREATE UNIQUE INDEX IF NOT EXISTS atlas_target_briefs_target_unique
  ON public.atlas_target_briefs(target_id);
CREATE INDEX IF NOT EXISTS idx_atlas_target_briefs_user
  ON public.atlas_target_briefs(user_id);

ALTER TABLE public.atlas_target_briefs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own briefs"
  ON public.atlas_target_briefs FOR SELECT
  USING (auth.uid() = user_id);
CREATE POLICY "Users can insert their own briefs"
  ON public.atlas_target_briefs FOR INSERT
  WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own briefs"
  ON public.atlas_target_briefs FOR UPDATE
  USING (auth.uid() = user_id);
CREATE POLICY "Users can delete their own briefs"
  ON public.atlas_target_briefs FOR DELETE
  USING (auth.uid() = user_id);
