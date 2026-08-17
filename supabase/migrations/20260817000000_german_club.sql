-- Migration: 20260817000000_german_club.sql
-- Description: النادي الألماني (Der Club) schema, RLS policies, and seed content

DO $$ BEGIN
  CREATE TYPE german_entry_type AS ENUM ('word', 'phrase', 'sentence', 'idiom');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE german_gender AS ENUM ('der', 'die', 'das', 'plural', 'n_a');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE german_register AS ENUM ('formal', 'neutral', 'informal', 'slang');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE content_review_status AS ENUM ('ai_generated', 'reviewed', 'verified');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- 1. Shelves (رفوف المواقف اليومية)
CREATE TABLE IF NOT EXISTS public.german_club_shelves (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug text UNIQUE NOT NULL,
  title_ar text NOT NULL,
  title_de text,
  description_ar text,
  situation_tags text[] DEFAULT '{}',
  icon text,
  sort_order int DEFAULT 0,
  is_premium boolean DEFAULT true,
  created_at timestamptz DEFAULT now()
);

-- 2. Entries (المفردات والعبارات)
CREATE TABLE IF NOT EXISTS public.german_club_entries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  shelf_id uuid REFERENCES public.german_club_shelves(id) ON DELETE CASCADE,
  entry_type german_entry_type NOT NULL,
  german_text text NOT NULL,
  gender german_gender DEFAULT 'n_a',
  ipa text,
  arabic_translation text NOT NULL,
  register german_register DEFAULT 'neutral',
  is_separable_verb boolean DEFAULT false,
  separable_prefix text,
  example_sentence_de text,
  example_sentence_ar text,
  audio_url text,
  difficulty_level text DEFAULT 'A1',
  review_status content_review_status DEFAULT 'ai_generated',
  sort_order int DEFAULT 0,
  created_at timestamptz DEFAULT now()
);

-- 3. Grammar Notes (زاوية القواعد)
CREATE TABLE IF NOT EXISTS public.german_club_grammar_notes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title_ar text NOT NULL,
  title_de text,
  body_md text NOT NULL,
  related_shelf_ids uuid[] DEFAULT '{}',
  difficulty_level text DEFAULT 'A1',
  review_status content_review_status DEFAULT 'ai_generated',
  sort_order int DEFAULT 0,
  created_at timestamptz DEFAULT now()
);

-- 4. User Progress
CREATE TABLE IF NOT EXISTS public.german_club_progress (
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  entry_id uuid REFERENCES public.german_club_entries(id) ON DELETE CASCADE,
  is_mastered boolean DEFAULT false,
  last_seen_at timestamptz DEFAULT now(),
  PRIMARY KEY (user_id, entry_id)
);

-- 5. Premium Entitlements
CREATE TABLE IF NOT EXISTS public.premium_entitlements (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  product_slug text NOT NULL,
  is_active boolean DEFAULT true,
  expires_at timestamptz,
  created_at timestamptz DEFAULT now(),
  UNIQUE (user_id, product_slug)
);

-- Permissions
GRANT ALL ON public.german_club_shelves TO authenticated, anon, service_role;
GRANT ALL ON public.german_club_entries TO authenticated, anon, service_role;
GRANT ALL ON public.german_club_grammar_notes TO authenticated, anon, service_role;
GRANT ALL ON public.german_club_progress TO authenticated, service_role;
GRANT ALL ON public.premium_entitlements TO authenticated, service_role;

-- RLS
ALTER TABLE public.german_club_shelves ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.german_club_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.german_club_grammar_notes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.german_club_progress ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.premium_entitlements ENABLE ROW LEVEL SECURITY;

-- RLS Policies
DROP POLICY IF EXISTS "shelves readable" ON public.german_club_shelves;
CREATE POLICY "shelves readable" ON public.german_club_shelves FOR SELECT USING (true);

DROP POLICY IF EXISTS "grammar notes readable" ON public.german_club_grammar_notes;
CREATE POLICY "grammar notes readable" ON public.german_club_grammar_notes
  FOR SELECT USING (review_status IN ('reviewed', 'verified'));

DROP POLICY IF EXISTS "only reviewed entries readable" ON public.german_club_entries;
CREATE POLICY "only reviewed entries readable" ON public.german_club_entries
  FOR SELECT USING (review_status IN ('reviewed', 'verified'));

DROP POLICY IF EXISTS "own progress" ON public.german_club_progress;
CREATE POLICY "own progress" ON public.german_club_progress
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "own entitlements" ON public.premium_entitlements;
CREATE POLICY "own entitlements" ON public.premium_entitlements
  FOR SELECT USING (auth.uid() = user_id);

-- Indexes for fast query performance
CREATE INDEX IF NOT EXISTS idx_german_entries_shelf ON public.german_club_entries(shelf_id, sort_order);
CREATE INDEX IF NOT EXISTS idx_german_entries_review ON public.german_club_entries(review_status);
CREATE INDEX IF NOT EXISTS idx_german_grammar_review ON public.german_club_grammar_notes(review_status);

-- Seed Data: Initial Reviewed Shelves
INSERT INTO public.german_club_shelves (slug, title_ar, title_de, description_ar, situation_tags, icon, sort_order, is_premium) VALUES
('cafe-and-bakery', 'في المقهى والمخبز', 'Im Café & in der Bäckerei', 'طلب القهوة، السؤال عن الفاتورة، والمفردات اليومية في المقاهي الألمانية', ARRAY['coffee', 'bakery', 'ordering'], 'Coffee', 1, false),
('trains-and-transport', 'القطارات والمواصلات', 'Zug & Nahverkehr', 'التعامل مع تأخير القطارات (Deutsche Bahn) والتنقّل اليومي', ARRAY['train', 'db', 'transport'], 'Train', 2, false),
('roommates-and-housing', 'السكن والزملاء (WG)', 'Wohnung & WG-Leben', 'المحادثات والنقاشات اليومية مع الشركاء في السكن', ARRAY['housing', 'wg', 'roommate'], 'Home', 3, true),
('flirting-and-dating', 'التودد والتعارف', 'Flirten & Smalltalk', 'عبارات التعارف والحديث العفوي الأنيق', ARRAY['social', 'chat', 'dating'], 'Heart', 4, true),
('bureaucracy-and-office', 'الدوائر الرسمية والأوراق', 'Amt & Bürokratie', 'عبارات المعاملات الرسمية والمواعيد الألمانية', ARRAY['office', 'forms', 'official'], 'FileText', 5, true)
ON CONFLICT (slug) DO NOTHING;

-- Seed Data: Initial Reviewed Entries
DO $$
DECLARE
  v_cafe_id uuid;
  v_train_id uuid;
  v_housing_id uuid;
  v_flirt_id uuid;
BEGIN
  SELECT id INTO v_cafe_id FROM public.german_club_shelves WHERE slug = 'cafe-and-bakery';
  SELECT id INTO v_train_id FROM public.german_club_shelves WHERE slug = 'trains-and-transport';
  SELECT id INTO v_housing_id FROM public.german_club_shelves WHERE slug = 'roommates-and-housing';
  SELECT id INTO v_flirt_id FROM public.german_club_shelves WHERE slug = 'flirting-and-dating';

  IF v_cafe_id IS NOT NULL THEN
    INSERT INTO public.german_club_entries
      (shelf_id, entry_type, german_text, gender, ipa, arabic_translation, register, is_separable_verb, separable_prefix, example_sentence_de, example_sentence_ar, review_status, sort_order, difficulty_level)
    VALUES
      (v_cafe_id, 'word', 'Kaffee', 'der', '/ˈkafe/', 'القهوة', 'neutral', false, null, 'Ich trinke morgens gerne einen heißen Kaffee.', 'أحب شرب قهوة ساخنة في الصباح.', 'verified', 1, 'A1'),
      (v_cafe_id, 'phrase', 'Rechnung, bitte', 'die', null, 'الفاتورة، من فضلك', 'neutral', false, null, 'Wir möchten gerne bezahlen. Die Rechnung, bitte!', 'نريد الدفع من فضلك. الفاتورة لو سمحت!', 'verified', 2, 'A1'),
      (v_cafe_id, 'word', 'Wasser', 'das', '/ˈvasɐ/', 'الماء', 'neutral', false, null, 'Ein stilles Wasser, bitte.', 'ماء عادي (بدون غاز)، من فضلك.', 'verified', 3, 'A1'),
      (v_cafe_id, 'phrase', 'ist mir egal', 'n_a', null, 'هذا الأمر لا يهمّني / عادي عندي', 'informal', false, null, 'Was möchtest du trinken? – Das ist mir egal.', 'ماذا تحب أن تشرب؟ – عادي، لا يهم أي شيء.', 'verified', 4, 'A2');
  END IF;

  IF v_train_id IS NOT NULL THEN
    INSERT INTO public.german_club_entries
      (shelf_id, entry_type, german_text, gender, ipa, arabic_translation, register, is_separable_verb, separable_prefix, example_sentence_de, example_sentence_ar, review_status, sort_order, difficulty_level)
    VALUES
      (v_train_id, 'word', 'Zug', 'der', '/tsuːk/', 'القطار', 'neutral', false, null, 'Der Zug nach Berlin hat heute zehn Minuten Verspätung.', 'قطار برلين متأخر اليوم عشر دقائق.', 'verified', 1, 'A1'),
      (v_train_id, 'word', 'Fahrkarte', 'die', '/ˈfaːɐ̯kaʁtə/', 'تذكرة السفر', 'formal', false, null, 'Haben Sie Ihre Fahrkarte dabei?', 'هل معك تذكرة السفر؟', 'verified', 2, 'A1'),
      (v_train_id, 'phrase', 'Alter, im Ernst?', 'n_a', null, 'يا زلمة، جدّي؟ / أحقاً هذا؟', 'slang', false, null, 'Der Zug ist schon wieder ausgefallen. – Alter, im Ernst?', 'تم إلغاء القطار مجدداً. – يا رجل، أجدّك تتكلم؟', 'verified', 3, 'B1'),
      (v_train_id, 'word', 'einsteigen', 'n_a', '/ˈaɪ̯nˌʃtaɪ̯ɡn̩/', 'يركب (القطار/الحافلة)', 'neutral', true, 'ein', 'Bitte alle Fahrgäste jetzt einsteigen!', 'يرجى من جميع الركاب الركوب الآن!', 'verified', 4, 'A2');
  END IF;

  IF v_housing_id IS NOT NULL THEN
    INSERT INTO public.german_club_entries
      (shelf_id, entry_type, german_text, gender, ipa, arabic_translation, register, is_separable_verb, separable_prefix, example_sentence_de, example_sentence_ar, review_status, sort_order, difficulty_level)
    VALUES
      (v_housing_id, 'word', 'aufstehen', 'n_a', '/ˈaʊ̯fˌʃteːən/', 'يستيقظ / ينهض', 'neutral', true, 'auf', 'Ich stehe um sieben Uhr auf.', 'أنا أستيقظ في الساعة السابعة.', 'verified', 1, 'A1'),
      (v_housing_id, 'word', 'anrufen', 'n_a', '/ˈanˌʁuːfn̩/', 'يتصل هاتفياً', 'neutral', true, 'an', 'Ich rufe dich morgen an.', 'سأتصل بك غداً.', 'verified', 2, 'A1'),
      (v_housing_id, 'word', 'Schlüssel', 'der', '/ˈʃlʏsl̩/', 'المفتاح', 'neutral', false, null, 'Wo ist mein Schlüssel?', 'أين مفتاحي؟', 'verified', 3, 'A1');
  END IF;

  IF v_flirt_id IS NOT NULL THEN
    INSERT INTO public.german_club_entries
      (shelf_id, entry_type, german_text, gender, ipa, arabic_translation, register, is_separable_verb, separable_prefix, example_sentence_de, example_sentence_ar, review_status, sort_order, difficulty_level)
    VALUES
      (v_flirt_id, 'phrase', 'mitkommen', 'n_a', '/ˈmɪtˌkɔmən/', 'يأتي مع / يرافق', 'informal', true, 'mit', 'Kommst du heute Abend mit?', 'هل تأتي معنا هذا المساء؟', 'verified', 1, 'A2'),
      (v_flirt_id, 'idiom', 'Schmetterlinge im Bauch', 'plural', null, 'فراشات في المعدة (شعور الإعجاب)', 'informal', false, null, 'Wenn ich dich sehe, habe ich Schmetterlinge im Bauch.', 'عندما أراك، أشعر بفراشات في قلبي.', 'verified', 2, 'B1');
  END IF;
END $$;

-- Seed Data: Initial Grammar Notes (زاوية القواعد)
INSERT INTO public.german_club_grammar_notes (title_ar, title_de, body_md, difficulty_level, review_status, sort_order) VALUES
('أدوات التعريف الثلاث (Der, Die, Das)', 'Die bestimmten Artikel', 'في اللغة الألمانية توجد ثلاثة أجناس للأسماء عكس العربية التي فيها جنسين فقط:

1. **Der** (المذكر - الأزرق العميق): مثل *der Kaffee* (القهوة)، *der Zug* (القطار).
2. **Die** (المؤنث - الوردي الناعم): مثل *die Rechnung* (الفاتورة)، *die Fahrkarte* (التذكرة).
3. **Das** (المحايد - الرمادي الدافيء): مثل *das Wasser* (الماء).

تذكر دائماً أن تحفظ الاسم مع أداته ولونه المخصص!', 'A1', 'verified', 1),
('الأفعال المنفصلة (Trennbare Verben)', 'Trennbare Verben im Satz', 'تتميز العديد من الأفعال الألمانية بوجود بادئة (Prefix) تنفصل عن الفعل الرئيسي في الجملة البسيطة وتذهب إلى نهاية الجملة تماماً!

مثال مع الفعل **aufstehen** (يستيقظ - البادئة `auf`):
- *Ich **stehe** um sieben Uhr **auf**.* (أنا أستيقظ الساعة السابعة).

لاحظ كيف يحل الجزء الأساسي (*stehe*) في الموقع الثاني للجملة، بينما تقفز البادئة (*auf*) إلى نهاية الجملة.', 'A1', 'verified', 2)
ON CONFLICT DO NOTHING;
