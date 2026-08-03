-- Reference / content tables
CREATE TABLE public.languages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code text UNIQUE NOT NULL,
  name_ar text NOT NULL,
  direction text NOT NULL DEFAULT 'ltr'
);
GRANT SELECT ON public.languages TO anon, authenticated;
GRANT ALL ON public.languages TO service_role;
ALTER TABLE public.languages ENABLE ROW LEVEL SECURITY;
CREATE POLICY "public read languages" ON public.languages FOR SELECT USING (true);

CREATE TABLE public.cefr_levels (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code text NOT NULL CHECK (code IN ('A0','A1','A2','B1','B2','C1')),
  name_ar text NOT NULL,
  sort_order int NOT NULL
);
GRANT SELECT ON public.cefr_levels TO anon, authenticated;
GRANT ALL ON public.cefr_levels TO service_role;
ALTER TABLE public.cefr_levels ENABLE ROW LEVEL SECURITY;
CREATE POLICY "public read cefr levels" ON public.cefr_levels FOR SELECT USING (true);

CREATE TABLE public.units (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  level_id uuid NOT NULL REFERENCES public.cefr_levels(id) ON DELETE CASCADE,
  title_ar text NOT NULL,
  title_de text NOT NULL,
  theme text,
  icon text,
  sort_order int NOT NULL
);
CREATE INDEX units_level_sort_idx ON public.units(level_id, sort_order);
GRANT SELECT ON public.units TO anon, authenticated;
GRANT ALL ON public.units TO service_role;
ALTER TABLE public.units ENABLE ROW LEVEL SECURITY;
CREATE POLICY "public read units" ON public.units FOR SELECT USING (true);

CREATE TABLE public.lessons (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  unit_id uuid NOT NULL REFERENCES public.units(id) ON DELETE CASCADE,
  type text NOT NULL CHECK (type IN ('vocab','grammar','listening','speaking','story','review')),
  title_ar text NOT NULL,
  title_de text NOT NULL DEFAULT '',
  estimated_minutes int NOT NULL DEFAULT 6,
  sort_order int NOT NULL
);
CREATE INDEX lessons_unit_sort_idx ON public.lessons(unit_id, sort_order);
GRANT SELECT ON public.lessons TO anon, authenticated;
GRANT ALL ON public.lessons TO service_role;
ALTER TABLE public.lessons ENABLE ROW LEVEL SECURITY;
CREATE POLICY "public read lessons" ON public.lessons FOR SELECT USING (true);

CREATE TABLE public.grammar_points (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  lesson_id uuid NOT NULL REFERENCES public.lessons(id) ON DELETE CASCADE,
  name text NOT NULL,
  explanation_ar text NOT NULL,
  contrastive_note_ar text
);
CREATE INDEX grammar_points_lesson_idx ON public.grammar_points(lesson_id);
GRANT SELECT ON public.grammar_points TO anon, authenticated;
GRANT ALL ON public.grammar_points TO service_role;
ALTER TABLE public.grammar_points ENABLE ROW LEVEL SECURITY;
CREATE POLICY "public read grammar points" ON public.grammar_points FOR SELECT USING (true);

CREATE TABLE public.vocabulary_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  lemma_de text NOT NULL,
  gender text CHECK (gender IN ('der','die','das') OR gender IS NULL),
  plural_form text,
  ipa text,
  audio_url text,
  image_url text,
  translation_ar text NOT NULL,
  example_sentence_de text,
  example_sentence_ar text,
  frequency_rank int,
  level_id uuid NOT NULL REFERENCES public.cefr_levels(id) ON DELETE CASCADE,
  status text NOT NULL DEFAULT 'draft' CHECK (status IN ('draft','generated','reviewed','published'))
);
CREATE INDEX vocabulary_items_level_freq_idx ON public.vocabulary_items(level_id, frequency_rank);
CREATE INDEX vocabulary_items_status_idx ON public.vocabulary_items(status);
GRANT SELECT ON public.vocabulary_items TO anon, authenticated;
GRANT ALL ON public.vocabulary_items TO service_role;
ALTER TABLE public.vocabulary_items ENABLE ROW LEVEL SECURITY;
CREATE POLICY "public read published vocab" ON public.vocabulary_items FOR SELECT USING (status = 'published');

CREATE TABLE public.exercises (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  lesson_id uuid NOT NULL REFERENCES public.lessons(id) ON DELETE CASCADE,
  type text NOT NULL CHECK (type IN (
    'mcq','type_answer','listen_choose','dictation','speak_repeat',
    'sentence_build','fill_blank_grammar','dialogue_simulation',
    'story_comprehension','matching_pairs','error_correction',
    'compound_word_decomposition'
  )),
  payload jsonb NOT NULL,
  difficulty int NOT NULL DEFAULT 1,
  status text NOT NULL DEFAULT 'draft' CHECK (status IN ('draft','generated','reviewed','published'))
);
CREATE INDEX exercises_lesson_idx ON public.exercises(lesson_id);
CREATE INDEX exercises_status_idx ON public.exercises(status);
GRANT SELECT ON public.exercises TO anon, authenticated;
GRANT ALL ON public.exercises TO service_role;
ALTER TABLE public.exercises ENABLE ROW LEVEL SECURITY;
CREATE POLICY "public read published exercises" ON public.exercises FOR SELECT USING (status = 'published');

CREATE TABLE public.exercise_vocab_map (
  exercise_id uuid NOT NULL REFERENCES public.exercises(id) ON DELETE CASCADE,
  vocab_id uuid NOT NULL REFERENCES public.vocabulary_items(id) ON DELETE CASCADE,
  PRIMARY KEY (exercise_id, vocab_id)
);
GRANT SELECT ON public.exercise_vocab_map TO anon, authenticated;
GRANT ALL ON public.exercise_vocab_map TO service_role;
ALTER TABLE public.exercise_vocab_map ENABLE ROW LEVEL SECURITY;
CREATE POLICY "public read exercise vocab map" ON public.exercise_vocab_map FOR SELECT USING (true);

-- User-scoped tables
CREATE TABLE public.user_progress (
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  lesson_id uuid NOT NULL REFERENCES public.lessons(id) ON DELETE CASCADE,
  status text NOT NULL DEFAULT 'not_started' CHECK (status IN ('not_started','in_progress','completed')),
  mastery_score numeric NOT NULL DEFAULT 0,
  last_practiced_at timestamptz,
  PRIMARY KEY (user_id, lesson_id)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.user_progress TO authenticated;
GRANT ALL ON public.user_progress TO service_role;
ALTER TABLE public.user_progress ENABLE ROW LEVEL SECURITY;
CREATE POLICY "owner rw progress" ON public.user_progress FOR ALL TO authenticated
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE TABLE public.srs_state (
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  item_id uuid NOT NULL,
  item_type text NOT NULL CHECK (item_type IN ('vocab','grammar')),
  stability numeric NOT NULL DEFAULT 1,
  difficulty numeric NOT NULL DEFAULT 5,
  due_at timestamptz NOT NULL DEFAULT now(),
  review_count int NOT NULL DEFAULT 0,
  lapses int NOT NULL DEFAULT 0,
  PRIMARY KEY (user_id, item_id)
);
CREATE INDEX srs_state_user_due_idx ON public.srs_state(user_id, due_at);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.srs_state TO authenticated;
GRANT ALL ON public.srs_state TO service_role;
ALTER TABLE public.srs_state ENABLE ROW LEVEL SECURITY;
CREATE POLICY "owner rw srs" ON public.srs_state FOR ALL TO authenticated
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE TABLE public.srs_review_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  item_id uuid NOT NULL,
  rating text NOT NULL CHECK (rating IN ('again','hard','good','easy')),
  reviewed_at timestamptz NOT NULL DEFAULT now(),
  elapsed_days numeric
);
CREATE INDEX srs_review_log_user_idx ON public.srs_review_log(user_id, reviewed_at DESC);
GRANT SELECT, INSERT ON public.srs_review_log TO authenticated;
GRANT ALL ON public.srs_review_log TO service_role;
ALTER TABLE public.srs_review_log ENABLE ROW LEVEL SECURITY;
CREATE POLICY "owner rw review log" ON public.srs_review_log FOR ALL TO authenticated
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE TABLE public.user_stats (
  user_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  xp int NOT NULL DEFAULT 0,
  streak_days int NOT NULL DEFAULT 0,
  league_tier text NOT NULL DEFAULT 'bronze',
  last_active_date date
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.user_stats TO authenticated;
GRANT ALL ON public.user_stats TO service_role;
ALTER TABLE public.user_stats ENABLE ROW LEVEL SECURITY;
CREATE POLICY "owner rw stats" ON public.user_stats FOR ALL TO authenticated
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE TABLE public.placement_test_results (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  placed_level_id uuid REFERENCES public.cefr_levels(id) ON DELETE SET NULL,
  raw_score numeric,
  taken_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT ON public.placement_test_results TO authenticated;
GRANT ALL ON public.placement_test_results TO service_role;
ALTER TABLE public.placement_test_results ENABLE ROW LEVEL SECURITY;
CREATE POLICY "owner rw placement" ON public.placement_test_results FOR ALL TO authenticated
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE TABLE public.content_generation_jobs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  unit_id uuid NOT NULL REFERENCES public.units(id) ON DELETE CASCADE,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','generated','reviewed','published','failed')),
  model_used text,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT ALL ON public.content_generation_jobs TO service_role;
ALTER TABLE public.content_generation_jobs ENABLE ROW LEVEL SECURITY;