/**
 * Calisthenics knowledge cards — one per skill.
 *
 * Sourced from Steven Low (Overcoming Gravity 2nd ed.), Calimove and
 * FitnessFAQs syllabi, FIG static elements appendix, and peer-reviewed
 * sports-medicine papers on tendon adaptation.
 *
 * Each card is a paragraph-level briefing that the UI shows in a sheet
 * when the user taps the "i" button on a skill card. Bilingual.
 */

import type { SkillKnowledgeCard } from './types';

const CARDS: Record<string, SkillKnowledgeCard> = {
  pushUp: {
    skillKey: 'pushUp',
    whyTrainIt: {
      ar: 'تمرين الضغط هو الأساس لكل مهارات الدفع — من البنش برس إلى البلانش. يبني الصدر، الترايسبس، الأكتاف، وثبات الجذع كله في حركة واحدة.',
    },
    mobilityPrereqs: [
      { ar: 'مرونة كتف 180° (ذراعان فوق الرأس).', },
      { ar: 'قدرة على بلانك 30 ث.', },
      { ar: 'مرونة معصم 90°.', },
    ],
    warmupSequence: [
      { ar: '10 دورات كتف لكل اتجاه.', },
      { ar: '8 cat-cow بطيء.', },
      { ar: '10 chin tucks.', },
      { ar: '5 ضغط حائط لتنشيط النمط.', },
      { ar: '5-8 ضغط مائل سهل.', },
    ],
    topMistakes: [
      {
        mistake: { ar: 'انخفاض الورك (الجسم على شكل V مقلوب).', },
        fix: { ar: 'شدّ البطن والأرداف معاً قبل النزول.', },
      },
      {
        mistake: { ar: 'مرفقان يفتحان 90°.', },
        fix: { ar: 'فكّر "اسحب الأرض نحوك" — يلصق المرفقين بالجسم.', },
      },
      {
        mistake: { ar: 'مدى نصفي — الصدر لا يلمس.', },
        fix: { ar: 'انزل إلى مسافة قبضة واحدة من الأرض على الأقل.', },
      },
    ],
    recoveryNotes: {
      ar: 'الضغط حركة منخفضة الجهد عصبياً — يمكن تكرارها يومياً (GtG). استرح 48 ساعة عند العمل على نسخ متقدمة (one-arm).',
    },
    frequencyPerWeek: { min: 2, ideal: 4, max: 7 },
    programmingStyle: {
      ar: 'تردد عالٍ، حجم متوسط — 3-5 مجموعات × 8-15 تكرار. الأسلوب البولغاري مفيد للمبتدئين.',
    },
    helpfulEquipment: [
      { ar: 'مقابض ضغط (paralettes) — تخفّف ضغط المعصم.', },
      { ar: 'مطّاطات مقاومة للتحدي بشكل آمن.', },
    ],
    milestones: [
      { ar: '20 ضغطاً متتالياً نظيفاً.', },
      { ar: 'archer push-up 5 لكل جانب.', },
      { ar: 'one-arm push-up 1 نظيف.', },
    ],
  },

  pullUp: {
    skillKey: 'pullUp',
    whyTrainIt: {
      ar: 'العقلة هي مقياس قوة العالم العلوي. تبني ظهراً عريضاً، بايسبس قوية، قبضة فولاذية، وثبات لوحَي الكتف.',
    },
    mobilityPrereqs: [
      { ar: 'تعليق ميت 30 ث بدون ألم.', },
      { ar: 'مرونة كتف لرفع الذراعين فوق الرأس بحرية.', },
    ],
    warmupSequence: [
      { ar: 'تعليق نشط 30 ث × 2.', },
      { ar: '10 scapular pull-ups.', },
      { ar: '5 negative pull-ups بطيئة.', },
      { ar: 'shoulder dislocates بشريط.', },
    ],
    topMistakes: [
      {
        mistake: { ar: 'الأرجوحة لاكتساب زخم.', },
        fix: { ar: 'كوّر القدمين تحت الجسم وثبتهما.', },
      },
      {
        mistake: { ar: 'مدى نصفي — الذقن لا يصل البار.', },
        fix: { ar: 'كل تكرارة لا تُحسب إلا إذا تجاوز الذقن البار.', },
      },
      {
        mistake: { ar: 'تعليق سلبي يضغط مفصل الكتف.', },
        fix: { ar: 'حافظ على لوحَي الكتف مفعّلتين دائماً.', },
      },
    ],
    recoveryNotes: {
      ar: 'حجم العقلة المتقدم يستهلك المرفقين — يومان راحة بين الجلسات الكثيفة. لا تتجاوز 60 تكراراً عاملاً يومياً.',
    },
    frequencyPerWeek: { min: 2, ideal: 3, max: 5 },
    programmingStyle: {
      ar: 'حجم متوسط مع مجموعات متقاطعة — pyramid sets أو greaseable doubles ممتازة.',
    },
    helpfulEquipment: [
      { ar: 'مطّاطات مقاومة للتدرّج.', },
      { ar: 'حلقات للحلقات pull-ups (variation).', },
      { ar: 'حزام ثقل للعقلة المثقلة.', },
    ],
    milestones: [
      { ar: 'أول عقلة صارمة.', },
      { ar: '10 عقلات متتالية.', },
      { ar: 'عقلة مثقلة بـ 50% من وزن الجسم.', },
      { ar: 'عقلة بيد واحدة.', },
    ],
  },

  dip: {
    skillKey: 'dip',
    whyTrainIt: {
      ar: 'الديبس مكافئ بنش برس بوزن الجسم — يستهدف الترايسبس والصدر السفلي والكتف الأمامي. تحضير لازم للماصل أب.',
    },
    mobilityPrereqs: [
      { ar: 'مرونة كتف لتحمل وزن الجسم في القمة.', },
      { ar: 'قوة معصم لـ support hold 30 ث.', },
    ],
    warmupSequence: [
      { ar: 'support hold 20 ث × 3.', },
      { ar: '10 shoulder shrugs على القضبان.', },
      { ar: 'pseudo planche lean 20 ث.', },
    ],
    topMistakes: [
      {
        mistake: { ar: 'مدى قصير خوفاً من ألم الكتف.', },
        fix: { ar: 'انزل تدريجياً — أعمق 1 سم كل أسبوع حتى الكتف بمستوى المرفق.', },
      },
      {
        mistake: { ar: 'كتفان مرفوعان للأذن — انضغاط.', },
        fix: { ar: 'اسحب الكتفين للأسفل قبل البدء.', },
      },
    ],
    recoveryNotes: {
      ar: 'يضغط المرفقين والكتف — أعرض ⅔ تكرارات كحد لكل جلسة لمنع التهاب وتر العضد.',
    },
    frequencyPerWeek: { min: 2, ideal: 3, max: 4 },
    programmingStyle: {
      ar: 'حجم معتدل — 4-6 مجموعات × 5-10 تكرارات. أسلوب التدرج المزدوج فعال جداً.',
    },
    helpfulEquipment: [
      { ar: 'قضبان متوازية ثابتة.', },
      { ar: 'حلقات لتطور (RTO support).', },
      { ar: 'حزام ديبس للأوزان.', },
    ],
    milestones: [
      { ar: '8 ديبس متتالية صارمة.', },
      { ar: 'ring dip بمدى كامل.', },
      { ar: 'ديبس مثقّل بـ 25% من وزن الجسم.', },
    ],
  },

  squat: {
    skillKey: 'squat',
    whyTrainIt: {
      ar: 'سكوات وزن الجسم يبني أرجلاً قوية بدون معدات. الـ pistol والـ shrimp يصلان إلى مستوى تحدٍّ يضاهي السكوات الثقيل بالبار.',
    },
    mobilityPrereqs: [
      { ar: 'سكوات هوائي بعمق كامل والكعب على الأرض.', },
      { ar: 'مرونة كاحل: ركبة فوق أصابع 10 سم.', },
    ],
    warmupSequence: [
      { ar: '10 air squats سهلة.', },
      { ar: '8 cossack squats.', },
      { ar: '5 split squats لكل ساق.', },
      { ar: 'wall ankle mobility 30 ث.', },
    ],
    topMistakes: [
      {
        mistake: { ar: 'انهيار الركبة للداخل.', },
        fix: { ar: 'فكّر "اضغط الأرض بعيداً عن خط منتصف الجسم".', },
      },
      {
        mistake: { ar: 'كعب يرتفع.', },
        fix: { ar: 'اعمل على الكاحل أولاً، أو ارفع الكعب 1-2 سم.', },
      },
    ],
    recoveryNotes: {
      ar: 'سكوات وزن الجسم متعاف بسرعة. التمارين الأحادية (pistol) تجهد ركبة واحدة — يومان راحة.',
    },
    frequencyPerWeek: { min: 2, ideal: 4, max: 6 },
    programmingStyle: {
      ar: 'حجم عالٍ — 4-6 مجموعات × 8-15 تكرار. الأحادي 3-5 لكل ساق.',
    },
    helpfulEquipment: [
      { ar: 'حلقات أو شرائط لـ assisted pistol.', },
      { ar: 'مقعد أو كرسي صغير لـ shrimp squats.', },
    ],
    milestones: [
      { ar: '50 air squat متتالٍ.', },
      { ar: '5 pistol لكل ساق.', },
      { ar: '5 shrimp squat لكل ساق.', },
    ],
  },

  lSit: {
    skillKey: 'lSit',
    whyTrainIt: {
      ar: 'إل-سيت يبني عضلات بطن، هيب فلكسر، وترايسبس قوية بثبات إيزومتري. تحضير لازم للـ planche والـ press to HS.',
    },
    mobilityPrereqs: [
      { ar: 'مرونة هيب فلكسر — قدرة على رفع الرجل المستقيمة 90°.', },
      { ar: 'قوة معصم لدعم الجسم.', },
    ],
    warmupSequence: [
      { ar: 'compression test 5 × 5 ث.', },
      { ar: '10 hanging knee raises.', },
      { ar: '20 hollow body rocks.', },
    ],
    topMistakes: [
      {
        mistake: { ar: 'كتفان مرفوعان للأذن.', },
        fix: { ar: 'اسحب الكتفين للأسفل بفعالية.', },
      },
      {
        mistake: { ar: 'ركبتان منثنيتان (يصبح tuck L-sit).', },
        fix: { ar: 'ركّز على الـ active straightening للركبة.', },
      },
    ],
    recoveryNotes: {
      ar: 'متوسط الإجهاد. ممكن العمل عليه يومياً بحجم منخفض. مناسب لـ Grease the Groove.',
    },
    frequencyPerWeek: { min: 3, ideal: 5, max: 7 },
    programmingStyle: {
      ar: 'محاولات هولد قصيرة متعددة — 5-8 محاولات × أكبر مدة ممكنة.',
    },
    helpfulEquipment: [
      { ar: 'parallettes — تطيل المدى وتزيد التحدي.', },
    ],
    milestones: [
      { ar: 'L-sit أرضي 15 ث.', },
      { ar: 'L-sit على parallettes 30 ث.', },
      { ar: 'V-sit 5 ث.', },
    ],
  },

  handstand: {
    skillKey: 'handstand',
    whyTrainIt: {
      ar: 'وقوف اليدين قمة التحكم في الجسم — توازن، قوة كتف، تحكم نَفَس، وثقة بالنفس. أيضاً المتطلب الأول لـ HSPU وبعض البلانش.',
    },
    mobilityPrereqs: [
      { ar: 'مرونة كتف 180° — ذراعان فوق الأذن بدون تقوس الظهر.', },
      { ar: 'مرونة معصم 90°.', },
      { ar: 'بلانك 60 ث ثابت.', },
    ],
    warmupSequence: [
      { ar: '5 wall handstands 20 ث.', },
      { ar: '10 wrist circles لكل اتجاه.', },
      { ar: 'shoulder pass-throughs بشريط × 15.', },
      { ar: 'pike compressions × 10.', },
    ],
    topMistakes: [
      {
        mistake: { ar: 'تقوس الظهر السفلي (banana).', },
        fix: { ar: 'شدّ البطن والأرداف ودفع الأضلاع للأسفل.', },
      },
      {
        mistake: { ar: 'كتفان مغلقان — يدفع الجسم للسقوط.', },
        fix: { ar: 'افتح الكتف للأقصى — كأنك تدفع الكتف عبر الأذنين.', },
      },
      {
        mistake: { ar: 'استخدام الكتف للتوازن بدل الأصابع.', },
        fix: { ar: 'تحكّم بالـ "claw fingers" — اضغط الأرض.', },
      },
    ],
    recoveryNotes: {
      ar: 'إجهاد كتف عالٍ — يومان أو ثلاثة بين جلسات HSPU. التوازن وحده ممكن يومياً.',
    },
    frequencyPerWeek: { min: 3, ideal: 5, max: 7 },
    programmingStyle: {
      ar: 'تحدي يومي 10-20 دقيقة من المحاولات. HSPU بحجم منخفض 3-4 مجموعات × 3-5.',
    },
    helpfulEquipment: [
      { ar: 'parallettes — أسهل على المعصم.', },
      { ar: 'حائط مسطح خالٍ من العقبات.', },
      { ar: 'مرايا أو هاتف مثبت لمراجعة الفورم.', },
    ],
    milestones: [
      { ar: 'وقوف للحائط 60 ث.', },
      { ar: 'وقوف حر 30 ث.', },
      { ar: '5 wall HSPU بمدى كامل.', },
      { ar: 'press to handstand.', },
    ],
  },

  frontLever: {
    skillKey: 'frontLever',
    whyTrainIt: {
      ar: 'الفرنت ليفر يبني ظهراً عريضاً وقويّاً غير قابل للكسر. كل عضلة جذع وكتف تشتغل في تناسق فولاذي.',
    },
    mobilityPrereqs: [
      { ar: '12+ pull-ups صارمة.', },
      { ar: 'tuck FL hold 15 ث.', },
      { ar: 'hollow hold 60 ث.', },
    ],
    warmupSequence: [
      { ar: 'scapular pulls × 12.', },
      { ar: 'tuck FL hold 10 ث × 3 (تحضير).', },
      { ar: 'inverted hang 20 ث.', },
    ],
    topMistakes: [
      {
        mistake: { ar: 'مرفقان منثنيان — يفقد الـ leverage.', },
        fix: { ar: 'افكر "ادفع الأرض بعيداً" بذراعين مقفولتين.', },
      },
      {
        mistake: { ar: 'انفتاح ورك (يكسر السطر).', },
        fix: { ar: 'انكماش بطن قوي + شدّ الأرداف.', },
      },
    ],
    recoveryNotes: {
      ar: 'الـ FL يستهلك بايسبس وأسفل الظهر بشدة. يومان راحة على الأقل بين الجلسات الكاملة.',
    },
    frequencyPerWeek: { min: 2, ideal: 3, max: 4 },
    programmingStyle: {
      ar: 'محاولات هولد قصيرة كثيرة — 5-8 × 5-10 ث. Pull من tuck/straddle FL لتنمية القوة الديناميكية.',
    },
    helpfulEquipment: [
      { ar: 'بار سحب ثابت أو حلقات.', },
      { ar: 'مطّاطات لتقليل الوزن في المراحل الأولى.', },
    ],
    milestones: [
      { ar: 'tuck FL 15 ث.', },
      { ar: 'straddle FL 10 ث.', },
      { ar: 'full FL 5 ث.', },
      { ar: 'FL pull-up.', },
    ],
  },

  backLever: {
    skillKey: 'backLever',
    whyTrainIt: {
      ar: 'الباك ليفر بناء قاعدة لكل عناصر الحلقات الثابتة — iron cross، victorian، maltese. مرونة كتف نادرة + قوة بايسبس.',
    },
    mobilityPrereqs: [
      { ar: 'german hang 30 ث بدون ألم.', },
      { ar: 'مرونة كتف للوصول للوضع المقلوب.', },
    ],
    warmupSequence: [
      { ar: 'german hang 10 ث × 3.', },
      { ar: 'shoulder dislocates × 15.', },
      { ar: 'tuck BL 5 ث × 3 (تحضير).', },
    ],
    topMistakes: [
      {
        mistake: { ar: 'مرفقان منثنيان.', },
        fix: { ar: 'افكر "ابعد المرفق عن البار" — استدارة خارج.', },
      },
      {
        mistake: { ar: 'كتفان متجمعان (لا مرونة).', },
        fix: { ar: 'اعمل على german hang لأسابيع قبل الـ tuck BL.', },
      },
    ],
    recoveryNotes: {
      ar: 'يجهد بايسبس (ذراعان مقفولتان مع شد). اقتصر على 2-3 جلسات أسبوعياً.',
    },
    frequencyPerWeek: { min: 2, ideal: 3, max: 4 },
    programmingStyle: {
      ar: 'محاولات هولد متعددة قصيرة + lower from inverted hang ببطء.',
    },
    helpfulEquipment: [
      { ar: 'حلقات مرنة الزاوية.', },
      { ar: 'مطّاطات للتدرّج.', },
    ],
    milestones: [
      { ar: 'tuck BL 15 ث.', },
      { ar: 'straddle BL 10 ث.', },
      { ar: 'full BL 5 ث.', },
    ],
  },

  planche: {
    skillKey: 'planche',
    whyTrainIt: {
      ar: 'الـ planche قمة الكاليستنيكس — قوة كتف وصدر وجذع تتجاوز معظم الرياضيين. يستغرق سنوات لكن لا يضاهى.',
    },
    mobilityPrereqs: [
      { ar: 'planche lean 30 ث (كتف فوق المعصم).', },
      { ar: 'pseudo planche push-ups 8.', },
      { ar: 'مرونة معصم متطورة.', },
    ],
    warmupSequence: [
      { ar: 'wrist preparation 5 دقائق.', },
      { ar: 'planche lean 20 ث × 3 تحضير.', },
      { ar: 'tuck planche 5 ث × 3.', },
    ],
    topMistakes: [
      {
        mistake: { ar: 'كتف منهار للداخل.', },
        fix: { ar: 'انكماش لوحَي الكتف للأقصى (max protraction).', },
      },
      {
        mistake: { ar: 'مرفقان منثنيان.', },
        fix: { ar: 'لا تتقدم لخطوة جديدة قبل ضبط الـ lean بمرفق مقفل.', },
      },
      {
        mistake: { ar: 'تطور سريع جداً يؤدي لإصابة وتر العضد.', },
        fix: { ar: 'اعمل عاماً كاملاً على straddle قبل full planche.', },
      },
    ],
    recoveryNotes: {
      ar: 'إجهاد عالٍ على وتر بايسبس وكتف. يومان أو ثلاثة بين الجلسات. ابتعد عن الأوزان عند الإحساس بأي ألم وتري.',
    },
    frequencyPerWeek: { min: 2, ideal: 3, max: 4 },
    programmingStyle: {
      ar: 'محاولات هولد قصيرة جداً (5-10 ث) لكن متعددة (8-12 محاولة لكل جلسة). تطور بطيء جداً.',
    },
    helpfulEquipment: [
      { ar: 'parallettes — تخفّف ضغط المعصم.', },
      { ar: 'مطّاطات معلّقة للـ band-assisted planche.', },
    ],
    milestones: [
      { ar: 'tuck planche 15 ث.', },
      { ar: 'straddle planche 5 ث.', },
      { ar: 'full planche 3 ث.', },
      { ar: 'planche push-up.', },
    ],
  },

  muscleUp: {
    skillKey: 'muscleUp',
    whyTrainIt: {
      ar: 'الماصل أب يجمع السحب والعبور والديبس في حركة واحدة. اختبار حقيقي للقوة الانفجارية والتنسيق.',
    },
    mobilityPrereqs: [
      { ar: '8-10 strict pull-ups.', },
      { ar: '8-10 strict dips.', },
      { ar: 'high pull above sternum.', },
    ],
    warmupSequence: [
      { ar: '5 explosive pull-ups.', },
      { ar: '5 dips بمدى كامل.', },
      { ar: 'transition negatives × 3.', },
    ],
    topMistakes: [
      {
        mistake: { ar: 'سحب ضعيف — لا تتجاوز نقطة العبور.', },
        fix: { ar: 'اعمل على explosive pull-ups مع pull-ups مثقّلة.', },
      },
      {
        mistake: { ar: 'لا ميل للأمام عند العبور.', },
        fix: { ar: 'تخيّل "احنِ صدرك للبار وارفع المرفقين خلفك".', },
      },
    ],
    recoveryNotes: {
      ar: 'مرفقان وكتفان يجهدان من الانتقال — يومان راحة. اعمل التحضيرات (high pull, dips) في أيام منفصلة.',
    },
    frequencyPerWeek: { min: 2, ideal: 3, max: 4 },
    programmingStyle: {
      ar: 'حجم منخفض، تكرارات قليلة — 4-5 مجموعات × 1-3. قوة انفجارية + تحكم.',
    },
    helpfulEquipment: [
      { ar: 'بار سحب صلب.', },
      { ar: 'حلقات للتطور المتقدم.', },
      { ar: 'كرة تنس للقبضة الكاذبة (تثبيت رسغ).', },
    ],
    milestones: [
      { ar: 'first muscle-up (kipping).', },
      { ar: 'strict bar muscle-up.', },
      { ar: 'strict ring muscle-up.', },
    ],
  },

  humanFlag: {
    skillKey: 'humanFlag',
    whyTrainIt: {
      ar: 'العلم البشري يعرض قوة جانبية نادرة ومذهلة بصرياً. يدرّب obliques، شدّ كتف، وثبات جذع.',
    },
    mobilityPrereqs: [
      { ar: 'pull-ups صارمة 8+.', },
      { ar: 'side plank 60 ث ثابت.', },
      { ar: 'pseudo planche lean 30 ث.', },
    ],
    warmupSequence: [
      { ar: 'side plank 30 ث لكل جانب.', },
      { ar: 'lat activation drills.', },
      { ar: '5 vertical flags 5 ث.', },
    ],
    topMistakes: [
      {
        mistake: { ar: 'يد سفلى ضعيفة — تنهار.', },
        fix: { ar: 'اضغط الأرض بقوة عبر يد سفلى — كأنك تدفعها بعيداً.', },
      },
      {
        mistake: { ar: 'سحب عمودي بدلاً من جانبي.', },
        fix: { ar: 'فكّر "اسحب الجسم نحو السقف، ادفع الأرضي".', },
      },
    ],
    recoveryNotes: {
      ar: 'جانبا الجذع والكتف يجهدان معاً — جلستان أسبوعياً مثالي.',
    },
    frequencyPerWeek: { min: 2, ideal: 3, max: 4 },
    programmingStyle: {
      ar: 'محاولات هولد متعددة قصيرة + lever raises لتطوير القوة.',
    },
    helpfulEquipment: [
      { ar: 'عمود عمودي قوي.', },
      { ar: 'مقابض حائط (wall hangers).', },
    ],
    milestones: [
      { ar: 'tuck flag 8 ث.', },
      { ar: 'straddle flag 5 ث.', },
      { ar: 'full flag 5 ث.', },
    ],
  },

  dragonFlag: {
    skillKey: 'dragonFlag',
    whyTrainIt: {
      ar: 'علم التنين اختراع بروس لي — أقوى تمرين بطن إيزومتري + ديناميكي. يبني عضلات بطن مستقرة فولاذية.',
    },
    mobilityPrereqs: [
      { ar: 'hollow hold 60 ث.', },
      { ar: 'leg raises 15 صارمة.', },
    ],
    warmupSequence: [
      { ar: 'hollow body rocks × 20.', },
      { ar: 'tuck dragon × 5.', },
    ],
    topMistakes: [
      {
        mistake: { ar: 'انحناء الورك في القمة.', },
        fix: { ar: 'حافظ على جسم خط مستقيم — البطن يعمل لا الورك.', },
      },
      {
        mistake: { ar: 'سقوط بدلاً من نزول متحكم.', },
        fix: { ar: 'انزل 4-5 ث في كل تكرارة.', },
      },
    ],
    recoveryNotes: {
      ar: 'إجهاد بطن وأسفل ظهر متوسط — 48 ساعة.',
    },
    frequencyPerWeek: { min: 2, ideal: 3, max: 4 },
    programmingStyle: {
      ar: 'تكرارات قليلة بطيئة — 4-5 مجموعات × 3-6.',
    },
    helpfulEquipment: [
      { ar: 'مقعد ثابت أو عمود سفلي للإمساك.', },
    ],
    milestones: [
      { ar: 'tuck dragon flag 8.', },
      { ar: 'full dragon flag 3.', },
      { ar: 'full dragon flag 8.', },
    ],
  },

  nordicCurl: {
    skillKey: 'nordicCurl',
    whyTrainIt: {
      ar: 'النوردك أقوى تمرين خلفية فخذ بوزن الجسم — يقي إصابات ACL وhamstring الشهيرة عند الرياضيين.',
    },
    mobilityPrereqs: [
      { ar: 'leg curl machine 5×8 (إن وجد).', },
      { ar: 'glute ham raise 8.', },
    ],
    warmupSequence: [
      { ar: 'glute bridges × 15.', },
      { ar: 'hamstring stretch dynamic × 10.', },
    ],
    topMistakes: [
      {
        mistake: { ar: 'سقوط بدلاً من نزول متحكم.', },
        fix: { ar: 'يدان مستعدتان للسقوط بأمان — لا تخف من النزول البطيء.', },
      },
      {
        mistake: { ar: 'ثني الورك (يصبح good morning مقلوب).', },
        fix: { ar: 'حافظ على جسم خط مستقيم من الركبة للرأس.', },
      },
    ],
    recoveryNotes: {
      ar: 'تجهد فظيع على الفخذ الخلفي — جلستان أسبوعياً كحد أقصى.',
    },
    frequencyPerWeek: { min: 1, ideal: 2, max: 3 },
    programmingStyle: {
      ar: 'حجم منخفض جداً — 3 مجموعات × 4-6 تكرار. كل تكرارة تستحق.',
    },
    helpfulEquipment: [
      { ar: 'شريك يثبّت الكاحلين.', },
      { ar: 'حافة سرير ثابتة.', },
      { ar: 'جهاز glute ham raise.', },
    ],
    milestones: [
      { ar: 'full eccentric nordic 5.', },
      { ar: 'full nordic curl 1.', },
      { ar: 'weighted nordic curl.', },
    ],
  },

  press2HS: {
    skillKey: 'press2HS',
    whyTrainIt: {
      ar: 'الـ press to HS انتقال رشيق من L-sit إلى وقوف اليدين — قمة قوة الكتف وتحكم الجذع. يبدو سحرياً.',
    },
    mobilityPrereqs: [
      { ar: 'L-sit أرضي 30 ث.', },
      { ar: 'وقوف اليدين الحر 30 ث.', },
      { ar: 'pancake stretch — يد للأرض بين الرجلين.', },
    ],
    warmupSequence: [
      { ar: 'pike compressions × 10.', },
      { ar: 'straddle compressions × 10.', },
      { ar: 'wall handstand 30 ث × 2.', },
    ],
    topMistakes: [
      {
        mistake: { ar: 'استخدام قفز بدل القوة.', },
        fix: { ar: 'العمل على negatives لأشهر قبل الـ concentric.', },
      },
      {
        mistake: { ar: 'ضعف هيب فلكسر — الرجلان لا تصلان.', },
        fix: { ar: 'pike compressions 3 مرات أسبوعياً.', },
      },
    ],
    recoveryNotes: {
      ar: 'يجهد كتف، جذع، وهيب فلكسر معاً. 48 ساعة بين الجلسات.',
    },
    frequencyPerWeek: { min: 2, ideal: 3, max: 4 },
    programmingStyle: {
      ar: 'محاولات قليلة عالية الجودة — 4-5 مجموعات × 2-4 تكرار. negatives بطيئة 5-7 ث.',
    },
    helpfulEquipment: [
      { ar: 'parallettes — مدى أكبر.', },
      { ar: 'حائط للتدريب الأولي.', },
    ],
    milestones: [
      { ar: 'wall straddle press × 5.', },
      { ar: 'free straddle press × 3.', },
      { ar: 'pike press to HS.', },
    ],
  },
};

/* ─────────────────────── Public API ─────────────────────── */

export function knowledgeFor(skillKey: string): SkillKnowledgeCard | null {
  return CARDS[skillKey] ?? null;
}

export function listKnowledgeKeys(): string[] {
  return Object.keys(CARDS);
}
