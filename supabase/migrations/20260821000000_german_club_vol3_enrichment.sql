-- Migration: 20260821000000_german_club_vol3_enrichment.sql
-- Description: النادي الألماني (Der Club) Vol. 3 Content Enrichment — Additional High-Fidelity Entries across Shelves

DO $$
DECLARE
  v_shelf_id uuid;
BEGIN
  -- 1. أسواق الكريسماس (Christmas Markets)
  SELECT id INTO v_shelf_id FROM public.german_club_shelves WHERE slug = 'christmas-markets';
  IF v_shelf_id IS NOT NULL THEN
    INSERT INTO public.german_club_entries
      (shelf_id, entry_type, german_text, gender, ipa, arabic_translation, register, is_separable_verb, separable_prefix, example_sentence_de, example_sentence_ar, review_status, sort_order, difficulty_level)
    VALUES
      (v_shelf_id, 'word', 'Glühwein', 'der', '/ˈɡlyːˌvaɪ̯n/', 'المشروب الشتوي الدافئ بالبهارات والمعطر', 'neutral', false, null, 'Ein heißer Glühwein gehört zum Weihnachtsmarkt.', 'المشروب الدافئ جزء لا يتجزأ من سوق الكريسماس.', 'verified', 1, 'A1'),
      (v_shelf_id, 'word', 'Buden', 'plural', '/ˈbuːdn̩/', 'أكواخ الخشب الصغيرة للتسوق الشتوي', 'neutral', false, null, 'Die Buden sind wunderschön dekoriert.', 'الأكواخ الخشبية مزينة بشكل رائع.', 'verified', 2, 'A2'),
      (v_shelf_id, 'word', 'Pfandbecher', 'der', '/ˈpfantbɛçɐ/', 'كوب المشروب مع التامين النقدي', 'neutral', false, null, 'Man zahlt drei Euro Pfand für den Pfandbecher.', 'يدفع المرء ثلاثة يورو كوديعة على الكوب.', 'verified', 3, 'A2'),
      (v_shelf_id, 'word', 'Kinderpunsch', 'der', '/ˈkɪndɐpʊnʃ/', 'مشروب الفواكه الدافئ الخالي من الكحول', 'neutral', false, null, 'Einen Kinderpunsch für die Kleinen, bitte!', 'مشروب بنش الفواكه للأطفال من فضلك!', 'verified', 4, 'A1'),
      (v_shelf_id, 'word', 'Gebrannte Mandeln', 'plural', '/ɡəˈbʁantn̩ ˈmandln̩/', 'اللوز المحمص بالسكر والقرفة', 'neutral', false, null, 'Gebrannte Mandeln duften auf dem ganzen Markt.', 'اللوز المحمص بالسكر تفوح رائحته في كل السوق.', 'verified', 5, 'A2'),
      (v_shelf_id, 'word', 'Lebkuchen', 'der', '/ˈleːpˌkuːxn̩/', 'كيك التوابل والزنجبيل الشتوي', 'neutral', false, null, 'Nürnberger Lebkuchen schmeckt besonders gut.', 'كيك الزنجبيل من نورنبرغ طعمه لديد جداً.', 'verified', 6, 'A2')
    ON CONFLICT DO NOTHING;
  END IF;

  -- 2. ثقافة الحيوانات الأليفة (Pet Culture)
  SELECT id INTO v_shelf_id FROM public.german_club_shelves WHERE slug = 'pet-culture';
  IF v_shelf_id IS NOT NULL THEN
    INSERT INTO public.german_club_entries
      (shelf_id, entry_type, german_text, gender, ipa, arabic_translation, register, is_separable_verb, separable_prefix, example_sentence_de, example_sentence_ar, review_status, sort_order, difficulty_level)
    VALUES
      (v_shelf_id, 'word', 'Hundesteuer', 'die', '/ˈhʊndəˌʃtɔɪ̯ɐ/', 'ضريبة اقتناء الكلاب الرسمية في ألمانيا', 'formal', false, null, 'In Deutschland muss man Hundesteuer bezahlen.', 'في ألمانيا يجب دفع ضريبة اقتناء الكلب.', 'verified', 1, 'B1'),
      (v_shelf_id, 'word', 'Anleinpflicht', 'die', '/ˈanlaɪ̯npflɪçt/', 'إلزامية تقييد الكلب بالحبل في أماكن معينة', 'formal', false, null, 'Hier gilt Anleinpflicht im gesamten Park.', 'تسري هنا إلزامية تقييد الكلاب في المنتزه.', 'verified', 2, 'B1'),
      (v_shelf_id, 'word', 'Tierarzt', 'der', '/ˈtiːɐ̯ˌʔaːʁtst/', 'الطبيب البيطري', 'neutral', false, null, 'Wir müssen morgen zum Tierarzt mit dem Hund.', 'يجب أن نذهب غداً إلى الطبيب البيطري مع الكلب.', 'verified', 3, 'A2'),
      (v_shelf_id, 'word', 'Kotbeutel', 'der', '/ˈkoːtˌbɔɪ̯tl̩/', 'كيس جمع نفايات الكلاب', 'neutral', false, null, 'Bitte immer Kotbeutel beim Gassigehen mitnehmen.', 'يرجى دائماً أخذ أكياس النفايات أثناء تمشية الكلب.', 'verified', 4, 'A2'),
      (v_shelf_id, 'word', 'Gassigehen', 'das', '/ˈɡasiˌɡeːən/', 'تمشية الكلب اليومية', 'informal', false, null, 'Ich gehe zweimal am Tag mit dem Hund gassigehen.', 'أخرج لتمشية الكلب مرتين في اليوم.', 'verified', 5, 'A2')
    ON CONFLICT DO NOTHING;
  END IF;

  -- 3. جدول التنظيف والمهام المنزلية (Putzplan Chores)
  SELECT id INTO v_shelf_id FROM public.german_club_shelves WHERE slug = 'putzplan-chores';
  IF v_shelf_id IS NOT NULL THEN
    INSERT INTO public.german_club_entries
      (shelf_id, entry_type, german_text, gender, ipa, arabic_translation, register, is_separable_verb, separable_prefix, example_sentence_de, example_sentence_ar, review_status, sort_order, difficulty_level)
    VALUES
      (v_shelf_id, 'word', 'Putzplan', 'der', '/ˈpʊtsˌplaːn/', 'جدول توزيع مهام التنظيف بالتناوب', 'neutral', false, null, 'Wer ist diese Woche laut Putzplan dran?', 'من عليه الدور هذا الأسبوع حسب جدول التنظيف؟', 'verified', 1, 'A2'),
      (v_shelf_id, 'word', 'Kehrwoche', 'die', '/ˈkeːɐ̯ˌvɔxə/', 'أسبوع واجب تنظيف مدخل البناء (تقليد الجنوب)', 'neutral', false, null, 'Diese Woche haben wir Kehrwoche.', 'هذا الأسبوع لدينا واجب تنظيف البناء.', 'verified', 2, 'B1'),
      (v_shelf_id, 'word', 'Staubsaugen', 'das', '/ˈʃtaʊ̯pzaʊ̯ɡn̩/', 'التنظيف بالمكنسة الكهربائية', 'neutral', false, null, 'Ich muss heute noch das Wohnzimmer staubsaugen.', 'يجب علي تنظيف غرفة المعيشة بالمكنسة الكهربائية اليوم.', 'verified', 3, 'A1'),
      (v_shelf_id, 'word', 'Mülleimer ausleeren', 'n_a', null, 'تفريع سلة القمامة', 'neutral', true, 'aus', 'Kannst du bitte den Mülleimer ausleeren?', 'هل يمكنك تفريغ سلة القمامة من فضلك؟', 'verified', 4, 'A2'),
      (v_shelf_id, 'word', 'Bad putzen', 'n_a', null, 'تنظيف الحمام', 'neutral', false, null, 'Am Samstag ist das Bad putzen dran.', 'يوم السبت موعد تنظيف الحمام.', 'verified', 5, 'A1')
    ON CONFLICT DO NOTHING;
  END IF;

  -- 4. لهجة بافاريا (Bavarian Signature)
  SELECT id INTO v_shelf_id FROM public.german_club_shelves WHERE slug = 'bavarian-signature';
  IF v_shelf_id IS NOT NULL THEN
    INSERT INTO public.german_club_entries
      (shelf_id, entry_type, german_text, gender, ipa, arabic_translation, register, is_separable_verb, separable_prefix, example_sentence_de, example_sentence_ar, review_status, sort_order, difficulty_level)
    VALUES
      (v_shelf_id, 'phrase', 'O\'zapft is!', 'n_a', null, 'تم فتح برميل المشروب! (صيحة افتتاح أوكتوبرفست)', 'informal', false, null, 'Der Oberbürgermeister ruft: O’zapft is!', 'رئيس البلدية يصيح: تم افتتاح المهرجان والبرميل!', 'verified', 3, 'B1'),
      (v_shelf_id, 'word', 'Semmel', 'die', '/ˈzɛml̩/', 'خبز صغير دائري (اسم Brötchen في بافاريا)', 'neutral', false, null, 'Zwei Semmeln mit Butter, bitte.', 'خبزتان صغيرتان مع الزبدة لو سمحت.', 'verified', 4, 'A1'),
      (v_shelf_id, 'phrase', 'Passt schon!', 'n_a', null, 'الأمر تمام / لا بأس إطلاقاً (عبارة الرضا البافارية)', 'informal', false, null, 'Danke für deine Hilfe! – Passt schon!', 'شكراً لمساعدتك! – لا بأس، الأمر تمام!', 'verified', 5, 'A2')
    ON CONFLICT DO NOTHING;
  END IF;

  -- 5. تعبيرات التذمر للانزعاج (Venting Expressions)
  SELECT id INTO v_shelf_id FROM public.german_club_shelves WHERE slug = 'venting-expressions';
  IF v_shelf_id IS NOT NULL THEN
    INSERT INTO public.german_club_entries
      (shelf_id, entry_type, german_text, gender, ipa, arabic_translation, register, is_separable_verb, separable_prefix, example_sentence_de, example_sentence_ar, review_status, sort_order, difficulty_level)
    VALUES
      (v_shelf_id, 'phrase', 'Das gibt’s doch gar nicht!', 'n_a', null, 'هذا غير معقول ولا يصدق إطلاقاً!', 'informal', false, null, 'Schon wieder Stau? Das gibt’s doch gar nicht!', 'ازدحام مروري مجدداً؟ هذا لا يصدق إطلاقاً!', 'verified', 3, 'A2'),
      (v_shelf_id, 'phrase', 'Ich glaub’, mich knutscht ein Elch!', 'n_a', null, 'يا للمفاجأة الدهشة الشديدة! (تعبير فكاهي عن الصدمة)', 'slang', false, null, 'Du hast im Lotto gewonnen? Ich glaub’, mich knutscht ein Elch!', 'فزت باليانصيب؟ يا للمفاجأة الصادمة!', 'verified', 4, 'B2')
    ON CONFLICT DO NOTHING;
  END IF;
END $$;
