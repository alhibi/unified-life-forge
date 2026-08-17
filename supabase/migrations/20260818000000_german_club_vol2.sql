-- Migration: 20260818000000_german_club_vol2.sql
-- Description: النادي الألماني (Der Club) Vol. 2 Content Enrichment — Shelves, Entries, and Etymology/Trivia Notes

-- 1. Insert Vol. 2 Shelves across all 11 new domains
INSERT INTO public.german_club_shelves (slug, title_ar, title_de, description_ar, situation_tags, icon, sort_order, is_premium) VALUES
-- ك. الأمثال والتعبيرات الاصطلاحية (Idioms & Proverbs — Redewendungen)
('animal-idioms', 'تعبيرات بالحيوانات', 'Tier-Redewendungen', 'الأمثال الشائعة المعتمدة على الحيوانات في الثقافة الألمانية', ARRAY['idioms', 'animals', 'redewendungen'], 'Dog', 38, true),
('weather-idioms', 'تعبيرات بالطقس', 'Wetter-Redewendungen', 'المصطلحات والمجازات المستعارة من حالات الطقس', ARRAY['idioms', 'weather', 'redewendungen'], 'CloudRain', 39, true),
('food-idioms', 'تعبيرات بالأكل والطعام', 'Essen-Redewendungen', 'أمثال الطعام وتعبيرات المطبخ التي تتكرر في الحديث اليومي', ARRAY['idioms', 'food', 'redewendungen'], 'UtensilsCrossed', 40, true),
('body-idioms', 'تعبيرات بأجزاء الجسم', 'Körper-Redewendungen', 'المجازات المبنية على أعضاء الجسم والحواس', ARRAY['idioms', 'body', 'redewendungen'], 'HeartHandshake', 41, true),

-- ل. اللهجات الإقليمية (Regional Dialects)
('bavarian-signature', 'لهجة بافاريا (Bayerisch)', 'Bayerische Redensarten', 'عبارات ولهجة ولاية بافاريا والجنوب الألماني', ARRAY['bavarian', 'dialects', 'south'], 'MapPin', 42, true),
('swabian-signature', 'لهجة سوابيا (Schwäbisch)', 'Schwäbische Eigenheiten', 'تعبيرات وخصوصيات لهجة إقليم سوابيا وشتوتغارت', ARRAY['swabian', 'dialects', 'stuttgart'], 'MapPin', 43, true),
('kolsch-cologne', 'لهجة كولن (Kölsch)', 'Kölsche Lebensart & Dialekt', 'مصطلحات مدينة كولن وثقافة نهر الراين', ARRAY['cologne', 'kolsch', 'dialects'], 'MapPin', 44, true),
('austrian-swiss-basics', 'الألمانية النمساوية والسويسرية', 'Österreichisch & Schweizerdeutsch', 'الفروقات الكبيرة بين ألمانية ألمانيا والنمسا وسويسرا', ARRAY['austrian', 'swiss', 'dialects'], 'Globe', 45, true),

-- م. الشتائم والإهانات والانزعاج (Swearing, Insults & Venting)
('swearing-insults', 'الشتائم والإهانات اليومية', 'Flüche & Schimpfwörter', 'عبارات الغضب والشتائم مع تصنيف الدقة ومستوى الشدة', ARRAY['swearing', 'insults', 'slang'], 'AlertOctagon', 46, true),
('venting-expressions', 'تعبيرات التذمر والانزعاج', 'Frust & Meckern im Alltag', 'قاموس التذمر من الزحام والبيروقراطية والمواعيد', ARRAY['venting', 'frustration', 'slang'], 'Frown', 47, true),

-- ن. الحياة الرومانسية والحميمية (Romance & Intimacy)
('flirting-deep', 'الغزل والتعارف العميق', 'Tieferes Flirten & Komplimente', 'عبارات الغزل المتقدم، الإطراء، وإبداء الاهتمام الصريح', ARRAY['flirting', 'romance', 'dating'], 'Heart', 48, true),
('relationship-milestones', 'مراحل العلاقة والشراكة', 'Beziehungsstufen & Zusammenziehen', 'عبارات الانتقال للعيش معاً وتحديد شكل العلاقة', ARRAY['relationship', 'milestones', 'romance'], 'Users', 49, true),
('breakup-language', 'عبارات الانفصال الصريحة', 'Trennung & Schluss machen', 'الصراحة والمباشرة في الحديث عن نهاية العلاقة', ARRAY['breakup', 'relationships', 'honest'], 'HeartOff', 50, true),
('pet-names-affection', 'ألقاب الحب والمودة', 'Kosenamen & Liebeserklärungen', 'ألقاب الدلع والغرام الشائعة بين الشركاء والأصدقاء', ARRAY['petnames', 'affection', 'love'], 'Smile', 51, true),

-- س. الثقافات الفرعية الألمانية (German Subcultures)
('techno-club-culture', 'ثقافة التكنو والنوادي', 'Techno, Berghain & Clubkultur', 'مصطلحات نوادي برلين الليلية وسياسة الحراس على الأبواب', ARRAY['techno', 'berlin', 'clubbing'], 'Music', 52, true),
('football-fan-culture', 'ثقافة مشجعي كرة القدم', 'Stadion & Bundesliga-Fan-Slang', 'هتافات الملاعب وعامية مدرجات البوندسليغا', ARRAY['football', 'bundesliga', 'sports'], 'Trophy', 53, true),
('gaming-culture', 'عامية الألعاب الرقمية', 'Gaming & Zocker-Slang', 'مصطلحات الغيمرز الألمان واللعب عبر الشبكة', ARRAY['gaming', 'esports', 'slang'], 'Gamepad2', 54, true),
('festival-culture', 'مهرجانات الموسيقى والمخيمات', 'Musikfestivals & Wacken', 'مصطلحات التخييم والمهرجانات الصيفية مثل Wacken و Rock am Ring', ARRAY['festivals', 'music', 'camping'], 'Tent', 55, true),

-- ع. الخصوصية والحياة الرقمية (Digital Life & Privacy)
('privacy-datenschutz', 'الخصوصية وحماية البيانات', 'Datenschutz & DSGVO', 'هوس الخصوصية الألماني ومصطلحات حماية البيانات الشخصية', ARRAY['privacy', 'datenschutz', 'tech'], 'Lock', 56, true),
('online-banking', 'البنوك والخدمات الرقمية', 'Online-Banking & Fintech', 'مصطلحات التحويلات البنكية الرقمية والـ IBAN والـ TAN', ARRAY['banking', 'fintech', 'finance'], 'CreditCard', 57, true),
('tech-support-calls', 'الدعم الفني والخدمات', 'Kundenservice & Hotline', 'مكالمات الدعم وشكاوى انقطاع الإنترنيت والتغطية', ARRAY['techsupport', 'internet', 'service'], 'PhoneCall', 58, true),

-- ف. البيئة وفرز النفايات بعمق (Environment & Recycling)
('mulltrennung-full-system', 'نظام فرز النفايات الكامل', 'Mülltrennung & Recycling-System', 'دليل الفرز الدقيق: Plastik, Biotonne, Restmüll, Glascontainer', ARRAY['recycling', 'mulltrennung', 'environment'], 'Recycle', 59, true),
('ruhezeit-quiet-hours', 'ساعات الهدوء القانونية (Ruhezeit)', 'Ruhezeit & Sonntagsruhe', 'القوانين الاجتماعية المتبعة أيام الأحد وبعد العاشرة مساءً', ARRAY['ruhezeit', 'law', 'neighborhood'], 'VolumeX', 60, true),

-- ص. الرياضة وأسلوب الحياة النشط (Sports & Active Lifestyle)
('gym-culture', 'عامية الجيم والياقة', 'Fitnessstudio & Gym-Slang', 'المصطلحات المستعملة في أندية اللياقة البدنية والتمارين', ARRAY['gym', 'fitness', 'sports'], 'Dumbbell', 61, true),
('cycling-culture', 'ثقافة وسلوكيات الدراجات', 'Fahrradkultur & Radwege', 'قوانين مسارات الدراجات ومعدات التنقل اليومي', ARRAY['cycling', 'bikes', 'lifestyle'], 'Bike', 62, true),
('running-culture', 'الجري والماراثونات', 'Laufen & Marathon-Kultur', 'سباقات الجري والتمارين القاسية في الحدائق العامة', ARRAY['running', 'marathon', 'fitness'], 'Footprints', 63, true),

-- ق. السفر داخل ألمانيا (Travel Within Germany)
('deutschlandticket-travel', 'تذكرة ألمانيا والقطارات الإقليمية', 'Deutschlandticket & Regio-Züge', 'التنقل بتذكرة 49 يورو وقواعد القطارات الإقليمية (RE/RB)', ARRAY['deutschlandticket', 'travel', 'trains'], 'Ticket', 64, true),
('hostel-culture', 'ثقافة الهوستلات والسفر الاقتصادي', 'Hostels & Günstiges Reisen', 'مصطلحات بيوت الشباب والغرف المشتركة', ARRAY['hostel', 'travel', 'budget'], 'Bed', 65, true),

-- ر. المهرجانات بعمق (Festivals — Full Depth)
('oktoberfest-full', 'مهرجان أوكتوبرفست', 'Oktoberfest & Wiesn-Kultur', 'مصطلحات أزياء Lederhosen والخيم وأجواء ميونخ الشهيرة', ARRAY['oktoberfest', 'wiesn', 'tradition'], 'Beer', 66, true),
('karneval-full', 'الكرنفال بعمق (Alaaf / Helau)', 'Karneval, Fasching & Fastnacht', 'أجواء الكرنفال في كولن وماينتس وصيحات المهرجان', ARRAY['karneval', 'fasching', 'party'], 'PartyPopper', 67, true),
('christmas-markets', 'أسواق الكريسماس (Weihnachtsmarkt)', 'Weihnachtsmärkte & Glühwein', 'ثقافة المشروبات الدافئة والأكواخ الخشبية في الشتاء', ARRAY['christmas', 'weihnachten', 'winter'], 'Snowflake', 68, true),

-- ت. الحيوانات الأليفة والحياة المنزلية (Pets & Home Life)
('pet-culture', 'ثقافة الحيوانات الأليفة', 'Haustiere & Hundekultur', 'تربية الكلاب في ألمانيا ودخول المطاعم والأماكن العامة', ARRAY['pets', 'dogs', 'animals'], 'Dog', 69, true),
('putzplan-chores', 'جدول التنظيف والمهام المنزلية', 'Putzplan & Kehrwoche', 'تنظيم مهام البيت والـ Kehrwoche في الجنوب الألماني', ARRAY['cleaning', 'chores', 'wg'], 'Sparkles', 70, true)
ON CONFLICT (slug) DO UPDATE SET
  title_ar = EXCLUDED.title_ar,
  title_de = EXCLUDED.title_de,
  description_ar = EXCLUDED.description_ar,
  situation_tags = EXCLUDED.situation_tags,
  icon = EXCLUDED.icon,
  sort_order = EXCLUDED.sort_order;


-- 2. Insert Seed Entries for Vol. 2 Shelves
DO $$
DECLARE
  v_shelf_id uuid;
BEGIN
  -- ك. الأمثال (Animal Idioms)
  SELECT id INTO v_shelf_id FROM public.german_club_shelves WHERE slug = 'animal-idioms';
  IF v_shelf_id IS NOT NULL THEN
    INSERT INTO public.german_club_entries
      (shelf_id, entry_type, german_text, gender, ipa, arabic_translation, register, is_separable_verb, separable_prefix, example_sentence_de, example_sentence_ar, review_status, sort_order, difficulty_level)
    VALUES
      (v_shelf_id, 'idiom', 'die Katze im Sack kaufen', 'die', null, 'يشتري القطة في الكيس (يشتري شيئاً دون فصحه أو التأكد منه)', 'neutral', false, null, 'Du solltest das Auto vorher testen und nicht die Katze im Sack kaufen.', 'عليك تجربة السيارة أولاً وألا تشتري السمك في الماء / القطة في الكيس.', 'verified', 1, 'B1'),
      (v_shelf_id, 'idiom', 'zwei Fliegen mit einer Klappe schlagen', 'die', null, 'يضرب عصفورين بحجر واحد', 'neutral', false, null, 'Wenn wir auf dem Weg einkaufen, schlagen wir zwei Fliegen mit einer Klappe.', 'إذا تسوقنا في طريقنا، سنضرب عصفورين بحجر واحد.', 'verified', 2, 'B1'),
      (v_shelf_id, 'idiom', 'Schwein haben', 'das', null, 'يحالفه حظ غير متوقع (الحظ السعيد)', 'informal', false, null, 'Da hast du aber ordentlich Schwein gehabt!', 'لقد حالفك حظ كبير جداً في هذا الموقف!', 'verified', 3, 'B1');
  END IF;

  -- ك. الأمثال (Food Idioms)
  SELECT id INTO v_shelf_id FROM public.german_club_shelves WHERE slug = 'food-idioms';
  IF v_shelf_id IS NOT NULL THEN
    INSERT INTO public.german_club_entries
      (shelf_id, entry_type, german_text, gender, ipa, arabic_translation, register, is_separable_verb, separable_prefix, example_sentence_de, example_sentence_ar, review_status, sort_order, difficulty_level)
    VALUES
      (v_shelf_id, 'idiom', 'Das ist mir Wurst', 'die', null, 'هذا الأمر لا يفرق معي بتاتاً (عادي بالنسبة لي)', 'informal', false, null, 'Ob wir heute oder morgen gehen, ist mir völlig Wurst.', 'سواء ذهبنا اليوم أو غداً، الأمر لا يشكل فرقاً لدي إطلاقاً.', 'verified', 1, 'A2'),
      (v_shelf_id, 'idiom', 'Seinen Senf dazugeben', 'der', null, 'يدلي برأيه غير المطلوب (يحشر أنفه)', 'informal', false, null, 'Er muss immer seinen Senf dazugeben.', 'يجب عليه دائماً أن يدلي برأيه في كل شيء.', 'verified', 2, 'B1');
  END IF;

  -- ل. اللهجات الإقليمية (Bavarian)
  SELECT id INTO v_shelf_id FROM public.german_club_shelves WHERE slug = 'bavarian-signature';
  IF v_shelf_id IS NOT NULL THEN
    INSERT INTO public.german_club_entries
      (shelf_id, entry_type, german_text, gender, ipa, arabic_translation, register, is_separable_verb, separable_prefix, example_sentence_de, example_sentence_ar, review_status, sort_order, difficulty_level)
    VALUES
      (v_shelf_id, 'phrase', 'Servus!', 'n_a', null, 'مرحباً / إلى اللقاء (تحية بافارية ونمساوية شهيرة)', 'informal', false, null, 'Servus! Wie geht’s dir heute?', 'مرحباً! كيف حالك اليوم؟', 'verified', 1, 'A1'),
      (v_shelf_id, 'phrase', 'Grüß Gott!', 'n_a', null, 'السلام عليكم / حياك الله (التحية الرسمية في جنوب ألمانيا)', 'formal', false, null, 'Grüß Gott, Frau Müller! Wie kann ich Ihnen helfen?', 'حياك الله سيدة مولر! كيف يمكنني مساعدتك؟', 'verified', 2, 'A1');
  END IF;

  -- م. الشتائم والإهانات (Swearing & Insults)
  SELECT id INTO v_shelf_id FROM public.german_club_shelves WHERE slug = 'swearing-insults';
  IF v_shelf_id IS NOT NULL THEN
    INSERT INTO public.german_club_entries
      (shelf_id, entry_type, german_text, gender, ipa, arabic_translation, register, is_separable_verb, separable_prefix, example_sentence_de, example_sentence_ar, review_status, sort_order, difficulty_level)
    VALUES
      (v_shelf_id, 'word', 'Scheiße', 'die', '/ˈʃaɪ̯sə/', 'تباً / تباً للوضع (شدة: خفيفة إلى متوسطة)', 'slang', false, null, 'Ach Scheiße, ich habe meinen Schlüssel vergessen!', 'تباً، لقد نسيت مفاتيحي!', 'verified', 1, 'A2'),
      (v_shelf_id, 'word', 'Mist', 'der', '/mɪst/', 'تباً خفيفة (بديل مهذب لـ Scheiße)', 'informal', false, null, 'So ein Mist, der Bus ist gerade weg.', 'يا للأسف، لقد غادرت الحافلة للتو.', 'verified', 2, 'A1'),
      (v_shelf_id, 'word', 'verdammt', 'n_a', '/fɛʁˈdamt/', 'تباً / لعنة (شدة: خفيفة)', 'slang', false, null, 'Das ist verdammt kalt heute.', 'الطقس بارد بشكل ملعون اليوم.', 'verified', 3, 'A2'),
      (v_shelf_id, 'word', 'Arschloch', 'das', '/ˈaʁʃlɔx/', 'شتيمة مباشرة للشخص (شدة: متوسطة إلى قوية)', 'slang', false, null, 'Er hat mich beschimpft, so ein Arschloch.', 'لقد شتمني، يا له من شخص سيء.', 'verified', 4, 'B1');
  END IF;

  -- ن. الحياة الرومانسية (Pet Names)
  SELECT id INTO v_shelf_id FROM public.german_club_shelves WHERE slug = 'pet-names-affection';
  IF v_shelf_id IS NOT NULL THEN
    INSERT INTO public.german_club_entries
      (shelf_id, entry_type, german_text, gender, ipa, arabic_translation, register, is_separable_verb, separable_prefix, example_sentence_de, example_sentence_ar, review_status, sort_order, difficulty_level)
    VALUES
      (v_shelf_id, 'word', 'Schatz', 'der', '/ʃats/', 'حبيبي / حبيبتي (اللقب الأكثر انتشاراً في ألمانيا)', 'informal', false, null, 'Guten Morgen, Schatz! Hast du gut geschlafen?', 'صباح الخير يا حبيبي! هل نمت جيدا؟', 'verified', 1, 'A1'),
      (v_shelf_id, 'word', 'Liebling', 'der', null, 'عزيزي / عزيزتي', 'informal', false, null, 'Liebling, bringst du mir bitte ein Glas Wasser?', 'عزيزي، هل تجلب لي كاس ماء من فضلك؟', 'verified', 2, 'A1');
  END IF;

  -- س. الثقافات الفرعية (Techno Club Culture)
  SELECT id INTO v_shelf_id FROM public.german_club_shelves WHERE slug = 'techno-club-culture';
  IF v_shelf_id IS NOT NULL THEN
    INSERT INTO public.german_club_entries
      (shelf_id, entry_type, german_text, gender, ipa, arabic_translation, register, is_separable_verb, separable_prefix, example_sentence_de, example_sentence_ar, review_status, sort_order, difficulty_level)
    VALUES
      (v_shelf_id, 'word', 'Türsteher', 'der', '/ˈtyːɐ̯ˌʃteːɐ/', 'حارس باب النادي الليلي (البونسر)', 'neutral', false, null, 'Der Türsteher hat uns heute leider nicht reingelassen.', 'للأسف لم يسمح لنا حارس الباب بالدخول اليوم.', 'verified', 1, 'A2'),
      (v_shelf_id, 'phrase', 'Heute nicht', 'n_a', null, 'ليس اليوم (العبارة الشهيرة لرفض الدخول للنادي)', 'slang', false, null, 'Der Türsteher guckte nur und sagte: Heute nicht.', 'نظر الحارس وقال ببساطة: ليس اليوم.', 'verified', 2, 'A2');
  END IF;

  -- ع. الخصوصية (Privacy & Datenschutz)
  SELECT id INTO v_shelf_id FROM public.german_club_shelves WHERE slug = 'privacy-datenschutz';
  IF v_shelf_id IS NOT NULL THEN
    INSERT INTO public.german_club_entries
      (shelf_id, entry_type, german_text, gender, ipa, arabic_translation, register, is_separable_verb, separable_prefix, example_sentence_de, example_sentence_ar, review_status, sort_order, difficulty_level)
    VALUES
      (v_shelf_id, 'word', 'Datenschutz', 'der', '/ˈdaːtn̩ˌʃʊts/', 'حماية البيانات والخصوصية', 'formal', false, null, 'Aus Gründen des Datenschutzes darf ich Ihnen diese Auskunft nicht geben.', 'لأسباب تتعلق بحماية البيانات، لا يمكنني إعطاؤك هذه المعلومات.', 'verified', 1, 'B1'),
      (v_shelf_id, 'word', 'Einwilligung', 'die', null, 'الموافقة الرسمية / التصريح', 'formal', false, null, 'Wir benötigen Ihre schriftliche Einwilligung.', 'نحن نحتاج إلى موافقتك الخطية.', 'verified', 2, 'B2');
  END IF;

  -- ف. البيئة (Recycling Full System)
  SELECT id INTO v_shelf_id FROM public.german_club_shelves WHERE slug = 'mulltrennung-full-system';
  IF v_shelf_id IS NOT NULL THEN
    INSERT INTO public.german_club_entries
      (shelf_id, entry_type, german_text, gender, ipa, arabic_translation, register, is_separable_verb, separable_prefix, example_sentence_de, example_sentence_ar, review_status, sort_order, difficulty_level)
    VALUES
      (v_shelf_id, 'word', 'Gelbe Tonne', 'die', null, 'حاوية القمامة الصفراء (للبلاستيك والمعادن والأغلفة)', 'neutral', false, null, 'Plastikverpackungen kommen in die Gelbe Tonne.', 'العبوات البلاستيكية توضع في الحاوية الصفراء.', 'verified', 1, 'A1'),
      (v_shelf_id, 'word', 'Biotonne', 'die', null, 'حاوية النفايات العضوية (بقايا الطعام والنباتات)', 'neutral', false, null, 'Essensreste gehören strictly in die Biotonne.', 'بقايا الطعام تتبع للحاوية العضوية حصراً.', 'verified', 2, 'A1'),
      (v_shelf_id, 'word', 'Restmüll', 'der', null, 'النفايات العامة المتبقية (غير القابلة للتدوير)', 'neutral', false, null, 'Alles, was man nicht recyceln kann, ist Restmüll.', 'كل ما لا يمكن إعادة تدويره يذهب للنفايات المتبقية.', 'verified', 3, 'A1');
  END IF;

  -- ف. البيئة (Ruhezeit)
  SELECT id INTO v_shelf_id FROM public.german_club_shelves WHERE slug = 'ruhezeit-quiet-hours';
  IF v_shelf_id IS NOT NULL THEN
    INSERT INTO public.german_club_entries
      (shelf_id, entry_type, german_text, gender, ipa, arabic_translation, register, is_separable_verb, separable_prefix, example_sentence_de, example_sentence_ar, review_status, sort_order, difficulty_level)
    VALUES
      (v_shelf_id, 'word', 'Ruhezeit', 'die', null, 'ساعات الهدوء القانونية (ممنوع الإزعاج)', 'formal', false, null, 'Ab 22 Uhr gilt im Haus die gesetzliche Ruhezeit.', 'ابتداءً من الساعة 10 مساءً تسري ساعات الهدوء القانونية في البناء.', 'verified', 1, 'A2'),
      (v_shelf_id, 'phrase', 'Sonntagsruhe', 'die', null, 'هدوء يوم الأحد (ممنوع تشغيل الأجهزة الثقيلة أو التنظيف)', 'formal', false, null, 'Am Sonntag darf man wegen der Sonntagsruhe keinen Rasen mähen.', 'يوم الأحد لا يصح قص العشب بآلة بسبب قانون هدوء الأحد.', 'verified', 2, 'B1');
  END IF;
END $$;


-- 3. Seed Etymology & Word-Origin Trivia Notes (Domain ش. أصول الكلمات وحكايات لغوية)
INSERT INTO public.german_club_grammar_notes (title_ar, title_de, body_md, difficulty_level, review_status, sort_order) VALUES
('أصول الكلمات الألمانية في الإنجليزية (Germanisms in English)', 'Deutsche Wörter im Englischen', 'هناك كلمات ألمانية أصيلة هاجرت إلى اللغة الإنجليزية واستُعملت كما هي بنفس المعنى والتركيب:

1. **Kindergarten**: مكونة من *Kinder* (أطفال) + *Garten* (حديقة) = حديقة الأطفال. ابتكر المصطلح المربي الألماني "فريدريش فروبل" عام 1837 للتعامل مع الأطفال بنمو طبيعي كالحديقة.
2. **Zeitgeist**: مكونة من *Zeit* (زمن) + *Geist* (روح) = روح العصر أو التوجه الفكري المقبول في حقبة معينة.
3. **Doppelgänger**: مكونة من *Doppel* (مزدوج) + *Gänger* (سائر/ماشٍ) = القرين الشبحي أو الشخص الشبيه بغيره تماماً.
4. **Wanderlust**: مكونة من *wandern* (التجوال في الطبيعة) + *Lust* (شغف/رغبة) = الشغف العارم بالسفر واكتشاف العالم.
5. **Schadenfreude**: مكونة من *Schaden* (ضرر/أذى) + *Freude* (سعادة) = الشماتة أو الفرح بسوء حظ الآخرين.', 'B1', 'verified', 10),

('حلقة الـ Denglisch واستعادة الكلمات الإنجليزية بلمسة ألمانية', 'Der Denglisch-Loop: Rückentlehnungen', 'تأخذ الألمانية أحياناً كلمات إنجليزية وتغير معناها أو تصيغ منها استخدماً مختلفاً تماماً لا يفهمه الإنجليز أنفسهم:

- **Handy**: يستخدمه الألمان لوصف "الهاتف المحمول"، بينما الهاتف المحمول بالإنجليزية يُسمى *Mobile* أو *Cell phone*! كلمة Handy بالإنجليزية تعني فقط "مفيد أو عملي"!
- **Beamer**: يعنون به "جهاز العرض الضوئي (Projector)"، بينما في الإنجليزية Beamer تشير سيارات BMW!
- **Public Viewing**: يستعملونها للبث المباشر المفتوح للمباريات في الساحات، بينما بالإنجليزية تعني معانية جثمان قبل الدفن!', 'B1', 'verified', 11),

('عبقرية الكلمات المركبة في الألمانية (Komposita-Magie)', 'Wie die deutschen Komposita wirklich funktionieren', 'تتمتع اللغة الألمانية بمرونة هندسية مذهلة في بناء الكلمات المركبة الطويلة بدون فواصل:

القاعدة الأساسية: الكلمة الأخيرة في التركيب هي التي تحدد المعنى الأساسي والجنس Grammatical Gender:
- **der Handschuh** (القفاز): *Hand* (يد) + *Schuh* (حذاء) -> حذاء اليد! وبما أن Schuh مذكر، الكلمة كلها أصبحت *der*.
- **das Schlagzeug** (مجموعة الطبول/الدرامز): *schlagen* (يضرب) + *Zeug* (أداة/شيء) -> أداة الضرب!
- **Kummerspeck**: *Kummer* (حزن) + *Speck* (دهن/شحم) -> الوزن الزائد الناتج عن الأكل بشراهة أثناء الفترات العاطفية الصعبة!', 'B1', 'verified', 12)
ON CONFLICT DO NOTHING;
