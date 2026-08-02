-- Migration: German Learning Module (de-learning)
-- Creates learning content tables, user state/SRS tables, RLS policies, indexes, and triggers.

-- Enable UUID extension just in case
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. Create Core Content Tables
CREATE TABLE IF NOT EXISTS public.languages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code TEXT UNIQUE NOT NULL,
  name_ar TEXT NOT NULL,
  direction TEXT NOT NULL DEFAULT 'ltr'
);

CREATE TABLE IF NOT EXISTS public.cefr_levels (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code TEXT NOT NULL CHECK (code IN ('A0','A1','A2','B1','B2','C1')),
  name_ar TEXT NOT NULL,
  sort_order INT NOT NULL,
  UNIQUE(code)
);

CREATE TABLE IF NOT EXISTS public.units (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  level_id UUID REFERENCES public.cefr_levels(id) ON DELETE CASCADE NOT NULL,
  title_ar TEXT NOT NULL,
  title_de TEXT NOT NULL,
  theme TEXT,
  icon TEXT,
  sort_order INT NOT NULL
);
CREATE INDEX IF NOT EXISTS units_level_id_sort_order_idx ON public.units(level_id, sort_order);

CREATE TABLE IF NOT EXISTS public.lessons (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  unit_id UUID REFERENCES public.units(id) ON DELETE CASCADE NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('vocab','grammar','listening','speaking','story','review')),
  title_ar TEXT NOT NULL,
  title_de TEXT NOT NULL,
  estimated_minutes INT DEFAULT 6,
  sort_order INT NOT NULL
);
CREATE INDEX IF NOT EXISTS lessons_unit_id_sort_order_idx ON public.lessons(unit_id, sort_order);

CREATE TABLE IF NOT EXISTS public.grammar_points (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lesson_id UUID REFERENCES public.lessons(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,
  explanation_ar TEXT NOT NULL,
  contrastive_note_ar TEXT
);

CREATE TABLE IF NOT EXISTS public.vocabulary_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lemma_de TEXT NOT NULL,
  gender TEXT CHECK (gender IN ('der','die','das') OR gender IS NULL),
  plural_form TEXT,
  ipa TEXT,
  audio_url TEXT,
  image_url TEXT,
  translation_ar TEXT NOT NULL,
  example_sentence_de TEXT,
  example_sentence_ar TEXT,
  frequency_rank INT,
  level_id UUID REFERENCES public.cefr_levels(id) ON DELETE CASCADE NOT NULL,
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft','generated','reviewed','published'))
);
CREATE INDEX IF NOT EXISTS vocabulary_items_level_id_frequency_rank_idx ON public.vocabulary_items(level_id, frequency_rank);
CREATE INDEX IF NOT EXISTS vocabulary_items_status_idx ON public.vocabulary_items(status);

CREATE TABLE IF NOT EXISTS public.exercises (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lesson_id UUID REFERENCES public.lessons(id) ON DELETE CASCADE NOT NULL,
  type TEXT NOT NULL CHECK (type IN (
    'mcq','type_answer','listen_choose','dictation','speak_repeat',
    'sentence_build','fill_blank_grammar','dialogue_simulation',
    'story_comprehension','matching_pairs','error_correction',
    'compound_word_decomposition'
  )),
  payload JSONB NOT NULL,
  difficulty INT DEFAULT 1,
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft','generated','reviewed','published'))
);
CREATE INDEX IF NOT EXISTS exercises_lesson_id_idx ON public.exercises(lesson_id);

CREATE TABLE IF NOT EXISTS public.exercise_vocab_map (
  exercise_id UUID REFERENCES public.exercises(id) ON DELETE CASCADE NOT NULL,
  vocab_id UUID REFERENCES public.vocabulary_items(id) ON DELETE CASCADE NOT NULL,
  PRIMARY KEY (exercise_id, vocab_id)
);

-- 2. Create User-Scoped Progress & SRS Tables
CREATE TABLE IF NOT EXISTS public.user_progress (
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  lesson_id UUID REFERENCES public.lessons(id) ON DELETE CASCADE NOT NULL,
  status TEXT DEFAULT 'not_started' CHECK (status IN ('not_started', 'in_progress', 'completed')),
  mastery_score NUMERIC DEFAULT 0,
  last_practiced_at TIMESTAMPTZ,
  PRIMARY KEY (user_id, lesson_id)
);

CREATE TABLE IF NOT EXISTS public.srs_state (
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  item_id UUID NOT NULL, -- references vocabulary_items or grammar_points
  item_type TEXT NOT NULL CHECK (item_type IN ('vocab','grammar')),
  stability NUMERIC NOT NULL DEFAULT 1,
  difficulty NUMERIC NOT NULL DEFAULT 5,
  due_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  review_count INT DEFAULT 0,
  lapses INT DEFAULT 0,
  PRIMARY KEY (user_id, item_id)
);
CREATE INDEX IF NOT EXISTS srs_state_user_id_due_at_idx ON public.srs_state(user_id, due_at);

CREATE TABLE IF NOT EXISTS public.srs_review_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  item_id UUID NOT NULL,
  rating TEXT NOT NULL CHECK (rating IN ('again','hard','good','easy')),
  reviewed_at TIMESTAMPTZ DEFAULT now(),
  elapsed_days NUMERIC
);

CREATE TABLE IF NOT EXISTS public.user_stats (
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
  xp INT DEFAULT 0,
  streak_days INT DEFAULT 0,
  league_tier TEXT DEFAULT 'bronze',
  last_active_date DATE
);

CREATE TABLE IF NOT EXISTS public.placement_test_results (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  placed_level_id UUID REFERENCES public.cefr_levels(id) ON DELETE SET NULL,
  raw_score NUMERIC,
  taken_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.content_generation_jobs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  unit_id UUID REFERENCES public.units(id) ON DELETE CASCADE NOT NULL,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending','generated','reviewed','published','failed')),
  model_used TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 3. Row Level Security (RLS) Policies
ALTER TABLE public.languages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cefr_levels ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.units ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lessons ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.grammar_points ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.vocabulary_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.exercises ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.exercise_vocab_map ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_progress ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.srs_state ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.srs_review_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_stats ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.placement_test_results ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.content_generation_jobs ENABLE ROW LEVEL SECURITY;

-- Select policies for reference content
CREATE POLICY "public read languages" ON public.languages FOR SELECT USING (true);
CREATE POLICY "public read cefr" ON public.cefr_levels FOR SELECT USING (true);
CREATE POLICY "public read units" ON public.units FOR SELECT USING (true);
CREATE POLICY "public read lessons" ON public.lessons FOR SELECT USING (true);
CREATE POLICY "public read grammar" ON public.grammar_points FOR SELECT USING (true);
CREATE POLICY "public read published vocab" ON public.vocabulary_items FOR SELECT USING (status = 'published');
CREATE POLICY "public read published exercises" ON public.exercises FOR SELECT USING (status = 'published');
CREATE POLICY "public read exercise_vocab_map" ON public.exercise_vocab_map FOR SELECT USING (true);

-- User Progress and Spaced Repetition (SRS)
CREATE POLICY "owner rw progress" ON public.user_progress FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "owner rw srs" ON public.srs_state FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "owner rw review log" ON public.srs_review_log FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "owner rw stats" ON public.user_stats FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "owner rw placement" ON public.placement_test_results FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "owner read jobs" ON public.content_generation_jobs FOR SELECT USING (true);

-- Grants
GRANT SELECT ON public.languages TO authenticated, anon;
GRANT SELECT ON public.cefr_levels TO authenticated, anon;
GRANT SELECT ON public.units TO authenticated, anon;
GRANT SELECT ON public.lessons TO authenticated, anon;
GRANT SELECT ON public.grammar_points TO authenticated, anon;
GRANT SELECT ON public.vocabulary_items TO authenticated, anon;
GRANT SELECT ON public.exercises TO authenticated, anon;
GRANT SELECT ON public.exercise_vocab_map TO authenticated, anon;

GRANT SELECT, INSERT, UPDATE, DELETE ON public.user_progress TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.srs_state TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.srs_review_log TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.user_stats TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.placement_test_results TO authenticated;
GRANT SELECT ON public.content_generation_jobs TO authenticated;

-- Service Role full access
GRANT ALL ON ALL TABLES IN SCHEMA public TO service_role;

-- 4. Initial Seed Data
-- Languages
INSERT INTO public.languages (code, name_ar, direction)
VALUES ('de', 'الألمانية', 'ltr')
ON CONFLICT (code) DO NOTHING;

-- CEFR Levels
INSERT INTO public.cefr_levels (code, name_ar, sort_order)
VALUES
  ('A0', 'التأسيس البسيط (A0)', 1),
  ('A1', 'المبتدئ الأساسي (A1)', 2),
  ('A2', 'المبتدئ المتقدم (A2)', 3),
  ('B1', 'المتوسط الأساسي (B1)', 4),
  ('B2', 'المتوسط المتقدم (B2)', 5),
  ('C1', 'المتقدم المتمكن (C1)', 6)
ON CONFLICT (code) DO UPDATE SET name_ar = EXCLUDED.name_ar, sort_order = EXCLUDED.sort_order;

-- Seed a temporary Level ID resolver for subsequent seeding
DO $$
DECLARE
  a0_id UUID;
  a1_id UUID;
  unit_a0_1_id UUID;
  unit_a1_1_id UUID;
  lesson_a0_1_id UUID;
  lesson_a1_1_id UUID;
  vocab_hallo_id UUID;
  vocab_danke_id UUID;
  vocab_morgen_id UUID;
  vocab_tschuss_id UUID;
  vocab_ich_id UUID;
  vocab_name_id UUID;
  vocab_kommen_id UUID;
  vocab_aus_id UUID;
BEGIN
  -- Get level IDs
  SELECT id INTO a0_id FROM public.cefr_levels WHERE code = 'A0';
  SELECT id INTO a1_id FROM public.cefr_levels WHERE code = 'A1';

  -- A0 Unit 1
  INSERT INTO public.units (level_id, title_ar, title_de, theme, icon, sort_order)
  VALUES (a0_id, 'الحروف والتحيات الأولى', 'Buchstaben und erste Grüße', 'Basics', 'Sparkles', 1)
  RETURNING id INTO unit_a0_1_id;

  -- A0 Unit 1 Lesson 1
  INSERT INTO public.lessons (unit_id, type, title_ar, title_de, estimated_minutes, sort_order)
  VALUES (unit_a0_1_id, 'vocab', 'التحيات البسيطة وبداية الحديث', 'Einfache Begrüßungen', 5, 1)
  RETURNING id INTO lesson_a0_1_id;

  -- A1 Unit 1
  INSERT INTO public.units (level_id, title_ar, title_de, theme, icon, sort_order)
  VALUES (a1_id, 'التعريف بالنفس والموطن', 'Sich vorstellen und Herkunft', 'Introduction', 'User', 1)
  RETURNING id INTO unit_a1_1_id;

  -- A1 Unit 1 Lesson 1
  INSERT INTO public.lessons (unit_id, type, title_ar, title_de, estimated_minutes, sort_order)
  VALUES (unit_a1_1_id, 'vocab', 'الاسم، البلد، واللغة', 'Name, Land und Sprache', 7, 1)
  RETURNING id INTO lesson_a1_1_id;

  -- Seed A0 Vocabulary items
  INSERT INTO public.vocabulary_items (lemma_de, gender, plural_form, ipa, audio_url, image_url, translation_ar, example_sentence_de, example_sentence_ar, frequency_rank, level_id, status)
  VALUES
    ('Hallo', NULL, NULL, 'ˈhaloː', 'https://nmrckgzmluoavgucqvjh.supabase.co/storage/v1/object/public/german_audio/hallo.mp3', NULL, 'مرحباً', 'Hallo! Wie geht es dir?', 'مرحباً! كيف حالك؟', 1, a0_id, 'published')
  RETURNING id INTO vocab_hallo_id;

  INSERT INTO public.vocabulary_items (lemma_de, gender, plural_form, ipa, audio_url, image_url, translation_ar, example_sentence_de, example_sentence_ar, frequency_rank, level_id, status)
  VALUES
    ('Danke', NULL, NULL, 'ˈdaŋkə', 'https://nmrckgzmluoavgucqvjh.supabase.co/storage/v1/object/public/german_audio/danke.mp3', NULL, 'شكراً', 'Danke für deine Hilfe.', 'شكراً لك على مساعدتك.', 2, a0_id, 'published')
  RETURNING id INTO vocab_danke_id;

  INSERT INTO public.vocabulary_items (lemma_de, gender, plural_form, ipa, audio_url, image_url, translation_ar, example_sentence_de, example_sentence_ar, frequency_rank, level_id, status)
  VALUES
    ('Guten Morgen', NULL, NULL, 'ˈɡuːtn̩ ˈmɔrɡn̩', 'https://nmrckgzmluoavgucqvjh.supabase.co/storage/v1/object/public/german_audio/guten_morgen.mp3', NULL, 'صباح الخير', 'Guten Morgen, mein Freund!', 'صباح الخير يا صديقي!', 3, a0_id, 'published')
  RETURNING id INTO vocab_morgen_id;

  INSERT INTO public.vocabulary_items (lemma_de, gender, plural_form, ipa, audio_url, image_url, translation_ar, example_sentence_de, example_sentence_ar, frequency_rank, level_id, status)
  VALUES
    ('Tschüss', NULL, NULL, 'tʃyːs', 'https://nmrckgzmluoavgucqvjh.supabase.co/storage/v1/object/public/german_audio/tschuess.mp3', NULL, 'وداعاً / مع السلامة', 'Tschüss, bis morgen!', 'وداعاً، أراك غداً!', 4, a0_id, 'published')
  RETURNING id INTO vocab_tschuss_id;

  -- Seed A1 Vocabulary items
  INSERT INTO public.vocabulary_items (lemma_de, gender, plural_form, ipa, audio_url, image_url, translation_ar, example_sentence_de, example_sentence_ar, frequency_rank, level_id, status)
  VALUES
    ('ich', NULL, NULL, 'ɪç', 'https://nmrckgzmluoavgucqvjh.supabase.co/storage/v1/object/public/german_audio/ich.mp3', NULL, 'أنا', 'Ich spreche ein bisschen Deutsch.', 'أنا أتحدث القليل من الألمانية.', 5, a1_id, 'published')
  RETURNING id INTO vocab_ich_id;

  INSERT INTO public.vocabulary_items (lemma_de, gender, plural_form, ipa, audio_url, image_url, translation_ar, example_sentence_de, example_sentence_ar, frequency_rank, level_id, status)
  VALUES
    ('Name', 'der', 'Namen', 'ˈnaːmə', 'https://nmrckgzmluoavgucqvjh.supabase.co/storage/v1/object/public/german_audio/name.mp3', NULL, 'الاسم', 'Mein Name ist Ahmad.', 'اسمي هو أحمد.', 6, a1_id, 'published')
  RETURNING id INTO vocab_name_id;

  INSERT INTO public.vocabulary_items (lemma_de, gender, plural_form, ipa, audio_url, image_url, translation_ar, example_sentence_de, example_sentence_ar, frequency_rank, level_id, status)
  VALUES
    ('kommen', NULL, NULL, 'ˈkɔmən', 'https://nmrckgzmluoavgucqvjh.supabase.co/storage/v1/object/public/german_audio/kommen.mp3', NULL, 'يأتي', 'Woher kommen Sie?', 'من أين تأتي حضرتك؟', 7, a1_id, 'published')
  RETURNING id INTO vocab_kommen_id;

  INSERT INTO public.vocabulary_items (lemma_de, gender, plural_form, ipa, audio_url, image_url, translation_ar, example_sentence_de, example_sentence_ar, frequency_rank, level_id, status)
  VALUES
    ('aus', NULL, NULL, 'aʊ̯s', 'https://nmrckgzmluoavgucqvjh.supabase.co/storage/v1/object/public/german_audio/aus.mp3', NULL, 'مِن', 'Ich komme aus Syrien.', 'أنا قادم من سوريا.', 8, a1_id, 'published')
  RETURNING id INTO vocab_aus_id;

  -- Seed Grammar Points with Contrastive Arabic Bridges
  INSERT INTO public.grammar_points (lesson_id, name, explanation_ar, contrastive_note_ar)
  VALUES (
    lesson_a1_1_id,
    'الاسم وأداة التعريف للمذكر (der)',
    'الأسماء في اللغة الألمانية تُصنَّف إلى ثلاثة أجناس نحوية: مذكر ومؤنث ومحايد. المذكر يستخدم أداة التعريف "der".',
    'الرابط مع اللغة العربية: الأداة "der" تشبه أل التعريف للمذكر في العربية. تذكر دائماً أن جنس الكلمة نحوي بحت ولا يعكس بالضرورة جنس الكائن الحقيقي، تماماً مثلما نعتبر كلمة "طاولة" مؤنثة نحوياً في العربية بينما هي جماد.'
  );

  -- Seed MCQ Exercises
  INSERT INTO public.exercises (lesson_id, type, payload, difficulty, status)
  VALUES (
    lesson_a0_1_id,
    'mcq',
    '{
      "prompt_de": "Wie sagt man \"مرحباً\" auf Deutsch?",
      "options": [
        {"id": "a", "text": "Hallo", "is_correct": true},
        {"id": "b", "text": "Danke", "is_correct": false},
        {"id": "c", "text": "Tschüss", "is_correct": false},
        {"id": "d", "text": "Bitte", "is_correct": false}
      ]
    }'::jsonb,
    1,
    'published'
  );

  -- Seed Type Answer Exercises
  INSERT INTO public.exercises (lesson_id, type, payload, difficulty, status)
  VALUES (
    lesson_a0_1_id,
    'type_answer',
    '{
      "direction": "ar_to_de",
      "prompt": "اكتب الكلمة الألمانية التي تعني: شكراً",
      "accepted_answers": ["danke", "Danke"],
      "hint": "تبدأ بحرف D"
    }'::jsonb,
    1,
    'published'
  );

  -- Seed Listen Choose Exercises
  INSERT INTO public.exercises (lesson_id, type, payload, difficulty, status)
  VALUES (
    lesson_a0_1_id,
    'listen_choose',
    '{
      "audio_url": "https://nmrckgzmluoavgucqvjh.supabase.co/storage/v1/object/public/german_audio/guten_morgen.mp3",
      "options": [
        {"id": "a", "text": "Guten Morgen"},
        {"id": "b", "text": "Tschüss"},
        {"id": "c", "text": "Hallo"}
      ],
      "correct_option_id": "a"
    }'::jsonb,
    1,
    'published'
  );

  -- Seed Matching Pairs Exercises
  INSERT INTO public.exercises (lesson_id, type, payload, difficulty, status)
  VALUES (
    lesson_a0_1_id,
    'matching_pairs',
    '{
      "pairs": [
        {"left": "Hallo", "right": "مرحباً"},
        {"left": "Danke", "right": "شكراً"},
        {"left": "Tschüss", "right": "وداعاً"},
        {"left": "Guten Morgen", "right": "صباح الخير"}
      ]
    }'::jsonb,
    1,
    'published'
  );

  -- Seed A1 MCQ Exercises
  INSERT INTO public.exercises (lesson_id, type, payload, difficulty, status)
  VALUES (
    lesson_a1_1_id,
    'mcq',
    '{
      "prompt_de": "Was bedeutet \"ich\" auf Arabisch?",
      "options": [
        {"id": "a", "text": "أنا", "is_correct": true},
        {"id": "b", "text": "هو", "is_correct": false},
        {"id": "c", "text": "أنت", "is_correct": false}
      ]
    }'::jsonb,
    1,
    'published'
  );

END $$;
