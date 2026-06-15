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
      de: 'Der Liegestütz ist die Basis aller Drückskills — von Bankdrücken bis Planche. Eine Übung für Brust, Trizeps, Schulter und Core-Stabilität.',
    },
    mobilityPrereqs: [
      { ar: 'مرونة كتف 180° (ذراعان فوق الرأس).', de: 'Schultermobilität 180°.' },
      { ar: 'قدرة على بلانك 30 ث.', de: 'Plank 30s halten können.' },
      { ar: 'مرونة معصم 90°.', de: 'Handgelenksmobilität 90°.' },
    ],
    warmupSequence: [
      { ar: '10 دورات كتف لكل اتجاه.', de: '10 Schulterkreise pro Richtung.' },
      { ar: '8 cat-cow بطيء.', de: '8 Cat-Cow langsam.' },
      { ar: '10 chin tucks.', de: '10 Chin Tucks.' },
      { ar: '5 ضغط حائط لتنشيط النمط.', de: '5 Wand-Liegestütze zur Aktivierung.' },
      { ar: '5-8 ضغط مائل سهل.', de: '5-8 leichte erhöhte Liegestütze.' },
    ],
    topMistakes: [
      {
        mistake: { ar: 'انخفاض الورك (الجسم على شكل V مقلوب).', de: 'Hüfte hängt durch (umgekehrtes V).' },
        fix: { ar: 'شدّ البطن والأرداف معاً قبل النزول.', de: 'Bauch und Po vor dem Ablassen anspannen.' },
      },
      {
        mistake: { ar: 'مرفقان يفتحان 90°.', de: 'Ellbogen 90° abgespreizt.' },
        fix: { ar: 'فكّر "اسحب الأرض نحوك" — يلصق المرفقين بالجسم.', de: '"Boden zu dir ziehen" — Ellbogen am Körper.' },
      },
      {
        mistake: { ar: 'مدى نصفي — الصدر لا يلمس.', de: 'Halbe Wdh. — Brust berührt Boden nicht.' },
        fix: { ar: 'انزل إلى مسافة قبضة واحدة من الأرض على الأقل.', de: 'Bis maximal Faustdicke vom Boden.' },
      },
    ],
    recoveryNotes: {
      ar: 'الضغط حركة منخفضة الجهد عصبياً — يمكن تكرارها يومياً (GtG). استرح 48 ساعة عند العمل على نسخ متقدمة (one-arm).',
      de: 'Liegestütze sind neuronal sparsam — täglich möglich (GtG). 48h Pause für fortgeschrittene Varianten (Einarmig).',
    },
    frequencyPerWeek: { min: 2, ideal: 4, max: 7 },
    programmingStyle: {
      ar: 'تردد عالٍ، حجم متوسط — 3-5 مجموعات × 8-15 تكرار. الأسلوب البولغاري مفيد للمبتدئين.',
      de: 'Hohe Frequenz, mittleres Volumen — 3-5 Sätze × 8-15. Bulgarischer Ansatz hilft Einsteigern.',
    },
    helpfulEquipment: [
      { ar: 'مقابض ضغط (paralettes) — تخفّف ضغط المعصم.', de: 'Liegestützgriffe — schonen Handgelenke.' },
      { ar: 'مطّاطات مقاومة للتحدي بشكل آمن.', de: 'Widerstandsbänder für sichere Steigerung.' },
    ],
    milestones: [
      { ar: '20 ضغطاً متتالياً نظيفاً.', de: '20 saubere Liegestütze am Stück.' },
      { ar: 'archer push-up 5 لكل جانب.', de: 'Archer Push-up 5 pro Seite.' },
      { ar: 'one-arm push-up 1 نظيف.', de: '1 sauberer einarmiger Liegestütz.' },
    ],
  },

  pullUp: {
    skillKey: 'pullUp',
    whyTrainIt: {
      ar: 'العقلة هي مقياس قوة العالم العلوي. تبني ظهراً عريضاً، بايسبس قوية، قبضة فولاذية، وثبات لوحَي الكتف.',
      de: 'Klimmzug ist der Maßstab oberer Kraft. Baut breiten Rücken, starken Bizeps, Eisengriff und Schulterblattstabilität.',
    },
    mobilityPrereqs: [
      { ar: 'تعليق ميت 30 ث بدون ألم.', de: 'Toter Hang 30s schmerzfrei.' },
      { ar: 'مرونة كتف لرفع الذراعين فوق الرأس بحرية.', de: 'Schultern frei über Kopf.' },
    ],
    warmupSequence: [
      { ar: 'تعليق نشط 30 ث × 2.', de: 'Aktiver Hang 30s × 2.' },
      { ar: '10 scapular pull-ups.', de: '10 Scapular Pull-ups.' },
      { ar: '5 negative pull-ups بطيئة.', de: '5 langsame Negativklimmzüge.' },
      { ar: 'shoulder dislocates بشريط.', de: 'Band-Schulterdislokationen.' },
    ],
    topMistakes: [
      {
        mistake: { ar: 'الأرجوحة لاكتساب زخم.', de: 'Mit den Beinen schwingen.' },
        fix: { ar: 'كوّر القدمين تحت الجسم وثبتهما.', de: 'Beine vor dem Körper kreuzen und still halten.' },
      },
      {
        mistake: { ar: 'مدى نصفي — الذقن لا يصل البار.', de: 'Halbe Wdh. — Kinn nicht über Stange.' },
        fix: { ar: 'كل تكرارة لا تُحسب إلا إذا تجاوز الذقن البار.', de: 'Wdh. zählt nur über Stange.' },
      },
      {
        mistake: { ar: 'تعليق سلبي يضغط مفصل الكتف.', de: 'Passiver Hang belastet Schultergelenk.' },
        fix: { ar: 'حافظ على لوحَي الكتف مفعّلتين دائماً.', de: 'Schulterblätter immer aktiv halten.' },
      },
    ],
    recoveryNotes: {
      ar: 'حجم العقلة المتقدم يستهلك المرفقين — يومان راحة بين الجلسات الكثيفة. لا تتجاوز 60 تكراراً عاملاً يومياً.',
      de: 'Hohes Klimmzugvolumen belastet Ellbogen — 2 Tage Pause zwischen schweren Sessions, max. 60 Arbeits-Wdh./Tag.',
    },
    frequencyPerWeek: { min: 2, ideal: 3, max: 5 },
    programmingStyle: {
      ar: 'حجم متوسط مع مجموعات متقاطعة — pyramid sets أو greaseable doubles ممتازة.',
      de: 'Mittleres Volumen mit Pyramide oder GtG-Doubles.',
    },
    helpfulEquipment: [
      { ar: 'مطّاطات مقاومة للتدرّج.', de: 'Widerstandsbänder für Steigerung.' },
      { ar: 'حلقات للحلقات pull-ups (variation).', de: 'Ringe für Variation.' },
      { ar: 'حزام ثقل للعقلة المثقلة.', de: 'Gewichtsgürtel für Weighted Pull-ups.' },
    ],
    milestones: [
      { ar: 'أول عقلة صارمة.', de: 'Erster strikter Klimmzug.' },
      { ar: '10 عقلات متتالية.', de: '10 Klimmzüge am Stück.' },
      { ar: 'عقلة مثقلة بـ 50% من وزن الجسم.', de: 'Weighted Pull-up mit 50 % BW.' },
      { ar: 'عقلة بيد واحدة.', de: 'Einarmiger Klimmzug.' },
    ],
  },

  dip: {
    skillKey: 'dip',
    whyTrainIt: {
      ar: 'الديبس مكافئ بنش برس بوزن الجسم — يستهدف الترايسبس والصدر السفلي والكتف الأمامي. تحضير لازم للماصل أب.',
      de: 'Dips sind das KG-Pendant zum Bankdrücken — Trizeps, untere Brust und vordere Schulter. Pflichtvorbereitung für Muscle-Up.',
    },
    mobilityPrereqs: [
      { ar: 'مرونة كتف لتحمل وزن الجسم في القمة.', de: 'Schultermobilität für Stützposition.' },
      { ar: 'قوة معصم لـ support hold 30 ث.', de: 'Handgelenkskraft für Support 30s.' },
    ],
    warmupSequence: [
      { ar: 'support hold 20 ث × 3.', de: 'Support Hold 20s × 3.' },
      { ar: '10 shoulder shrugs على القضبان.', de: '10 Shrugs am Barren.' },
      { ar: 'pseudo planche lean 20 ث.', de: 'Pseudo-Planche-Lean 20s.' },
    ],
    topMistakes: [
      {
        mistake: { ar: 'مدى قصير خوفاً من ألم الكتف.', de: 'Kurze Range aus Angst vor Schulter.' },
        fix: { ar: 'انزل تدريجياً — أعمق 1 سم كل أسبوع حتى الكتف بمستوى المرفق.', de: 'Graduell tiefer — 1 cm/Woche bis Schulter auf Ellbogenhöhe.' },
      },
      {
        mistake: { ar: 'كتفان مرفوعان للأذن — انضغاط.', de: 'Schultern hoch zum Ohr — Impingement.' },
        fix: { ar: 'اسحب الكتفين للأسفل قبل البدء.', de: 'Schultern aktiv nach unten ziehen.' },
      },
    ],
    recoveryNotes: {
      ar: 'يضغط المرفقين والكتف — أعرض ⅔ تكرارات كحد لكل جلسة لمنع التهاب وتر العضد.',
      de: 'Belastet Ellbogen und Schulter — max. ⅔ der möglichen Wdh./Session, sonst Bizeps-Sehnenreizung.',
    },
    frequencyPerWeek: { min: 2, ideal: 3, max: 4 },
    programmingStyle: {
      ar: 'حجم معتدل — 4-6 مجموعات × 5-10 تكرارات. أسلوب التدرج المزدوج فعال جداً.',
      de: 'Moderates Volumen — 4-6 Sätze × 5-10. Doppel-Progression wirkt stark.',
    },
    helpfulEquipment: [
      { ar: 'قضبان متوازية ثابتة.', de: 'Stabiler Parallelbarren.' },
      { ar: 'حلقات لتطور (RTO support).', de: 'Ringe für RTO-Support.' },
      { ar: 'حزام ديبس للأوزان.', de: 'Dip-Gürtel für Zusatzgewicht.' },
    ],
    milestones: [
      { ar: '8 ديبس متتالية صارمة.', de: '8 strikte Dips am Stück.' },
      { ar: 'ring dip بمدى كامل.', de: 'Voller Ring-Dip.' },
      { ar: 'ديبس مثقّل بـ 25% من وزن الجسم.', de: 'Weighted Dip mit 25 % BW.' },
    ],
  },

  squat: {
    skillKey: 'squat',
    whyTrainIt: {
      ar: 'سكوات وزن الجسم يبني أرجلاً قوية بدون معدات. الـ pistol والـ shrimp يصلان إلى مستوى تحدٍّ يضاهي السكوات الثقيل بالبار.',
      de: 'KG-Squat baut starke Beine ohne Equipment. Pistol und Shrimp erreichen Belastungen wie schwere Langhantel-Kniebeugen.',
    },
    mobilityPrereqs: [
      { ar: 'سكوات هوائي بعمق كامل والكعب على الأرض.', de: 'Voll tiefer Air-Squat mit Ferse am Boden.' },
      { ar: 'مرونة كاحل: ركبة فوق أصابع 10 سم.', de: 'Knöchelmobilität: Knie 10 cm über Zehen.' },
    ],
    warmupSequence: [
      { ar: '10 air squats سهلة.', de: '10 leichte Air Squats.' },
      { ar: '8 cossack squats.', de: '8 Kosaken-Squats.' },
      { ar: '5 split squats لكل ساق.', de: '5 Split Squats pro Bein.' },
      { ar: 'wall ankle mobility 30 ث.', de: 'Wand-Knöchel 30s.' },
    ],
    topMistakes: [
      {
        mistake: { ar: 'انهيار الركبة للداخل.', de: 'Knie kippt nach innen.' },
        fix: { ar: 'فكّر "اضغط الأرض بعيداً عن خط منتصف الجسم".', de: '"Boden seitlich wegdrücken".' },
      },
      {
        mistake: { ar: 'كعب يرتفع.', de: 'Ferse hebt sich.' },
        fix: { ar: 'اعمل على الكاحل أولاً، أو ارفع الكعب 1-2 سم.', de: 'Knöchelmobilität trainieren oder Ferse 1-2 cm erhöhen.' },
      },
    ],
    recoveryNotes: {
      ar: 'سكوات وزن الجسم متعاف بسرعة. التمارين الأحادية (pistol) تجهد ركبة واحدة — يومان راحة.',
      de: 'KG-Squats erholen sich schnell. Einbeinige Versionen (Pistol) belasten ein Knie stark — 2 Tage Pause.',
    },
    frequencyPerWeek: { min: 2, ideal: 4, max: 6 },
    programmingStyle: {
      ar: 'حجم عالٍ — 4-6 مجموعات × 8-15 تكرار. الأحادي 3-5 لكل ساق.',
      de: 'Hohes Volumen — 4-6 × 8-15. Einbeinig 3-5 pro Bein.',
    },
    helpfulEquipment: [
      { ar: 'حلقات أو شرائط لـ assisted pistol.', de: 'Ringe/Bänder für assistierte Pistols.' },
      { ar: 'مقعد أو كرسي صغير لـ shrimp squats.', de: 'Bank oder kleiner Stuhl für Shrimp-Squats.' },
    ],
    milestones: [
      { ar: '50 air squat متتالٍ.', de: '50 Air Squats am Stück.' },
      { ar: '5 pistol لكل ساق.', de: '5 Pistols pro Bein.' },
      { ar: '5 shrimp squat لكل ساق.', de: '5 Shrimps pro Bein.' },
    ],
  },

  lSit: {
    skillKey: 'lSit',
    whyTrainIt: {
      ar: 'إل-سيت يبني عضلات بطن، هيب فلكسر، وترايسبس قوية بثبات إيزومتري. تحضير لازم للـ planche والـ press to HS.',
      de: 'L-Sit baut Bauch, Hüftbeuger und Trizeps durch Iso-Halten. Pflichtvorbereitung für Planche und Press to HS.',
    },
    mobilityPrereqs: [
      { ar: 'مرونة هيب فلكسر — قدرة على رفع الرجل المستقيمة 90°.', de: 'Hüftbeuger-Flexibilität — Bein gerade auf 90°.' },
      { ar: 'قوة معصم لدعم الجسم.', de: 'Handgelenkskraft für Stütz.' },
    ],
    warmupSequence: [
      { ar: 'compression test 5 × 5 ث.', de: 'Compression Test 5 × 5s.' },
      { ar: '10 hanging knee raises.', de: '10 Hanging Knee Raises.' },
      { ar: '20 hollow body rocks.', de: '20 Hollow Body Rocks.' },
    ],
    topMistakes: [
      {
        mistake: { ar: 'كتفان مرفوعان للأذن.', de: 'Schultern hoch zum Ohr.' },
        fix: { ar: 'اسحب الكتفين للأسفل بفعالية.', de: 'Aktiv Schultern nach unten ziehen.' },
      },
      {
        mistake: { ar: 'ركبتان منثنيتان (يصبح tuck L-sit).', de: 'Knie gebeugt — wird Tuck-L-Sit.' },
        fix: { ar: 'ركّز على الـ active straightening للركبة.', de: 'Aktive Knie-Streckung.' },
      },
    ],
    recoveryNotes: {
      ar: 'متوسط الإجهاد. ممكن العمل عليه يومياً بحجم منخفض. مناسب لـ Grease the Groove.',
      de: 'Mittlere Belastung. Tägliches Arbeiten mit niedrigem Volumen ok. Gut für GtG.',
    },
    frequencyPerWeek: { min: 3, ideal: 5, max: 7 },
    programmingStyle: {
      ar: 'محاولات هولد قصيرة متعددة — 5-8 محاولات × أكبر مدة ممكنة.',
      de: 'Viele kurze Haltversuche — 5-8 × max. Zeit.',
    },
    helpfulEquipment: [
      { ar: 'parallettes — تطيل المدى وتزيد التحدي.', de: 'Parallettes — größere Range, mehr Herausforderung.' },
    ],
    milestones: [
      { ar: 'L-sit أرضي 15 ث.', de: 'L-Sit am Boden 15s.' },
      { ar: 'L-sit على parallettes 30 ث.', de: 'L-Sit auf Parallettes 30s.' },
      { ar: 'V-sit 5 ث.', de: 'V-Sit 5s.' },
    ],
  },

  handstand: {
    skillKey: 'handstand',
    whyTrainIt: {
      ar: 'وقوف اليدين قمة التحكم في الجسم — توازن، قوة كتف، تحكم نَفَس، وثقة بالنفس. أيضاً المتطلب الأول لـ HSPU وبعض البلانش.',
      de: 'Handstand — Gipfel der Körperkontrolle: Balance, Schulterkraft, Atemkontrolle, Selbstvertrauen. Auch Voraussetzung für HSPU und Planche.',
    },
    mobilityPrereqs: [
      { ar: 'مرونة كتف 180° — ذراعان فوق الأذن بدون تقوس الظهر.', de: 'Schulter 180° — Arme am Ohr ohne Hohlkreuz.' },
      { ar: 'مرونة معصم 90°.', de: 'Handgelenk 90°.' },
      { ar: 'بلانك 60 ث ثابت.', de: 'Plank 60s.' },
    ],
    warmupSequence: [
      { ar: '5 wall handstands 20 ث.', de: '5 Wand-Handstände 20s.' },
      { ar: '10 wrist circles لكل اتجاه.', de: '10 Handgelenkskreise pro Richtung.' },
      { ar: 'shoulder pass-throughs بشريط × 15.', de: 'Band-Schulter-Pass-Throughs × 15.' },
      { ar: 'pike compressions × 10.', de: 'Pike Compressions × 10.' },
    ],
    topMistakes: [
      {
        mistake: { ar: 'تقوس الظهر السفلي (banana).', de: 'Hohlkreuz (Banane).' },
        fix: { ar: 'شدّ البطن والأرداف ودفع الأضلاع للأسفل.', de: 'Bauch + Po anspannen, Rippen runter.' },
      },
      {
        mistake: { ar: 'كتفان مغلقان — يدفع الجسم للسقوط.', de: 'Geschlossene Schultern — kippt nach hinten.' },
        fix: { ar: 'افتح الكتف للأقصى — كأنك تدفع الكتف عبر الأذنين.', de: 'Maximal öffnen — Schultern durch die Ohren drücken.' },
      },
      {
        mistake: { ar: 'استخدام الكتف للتوازن بدل الأصابع.', de: 'Mit Schultern statt Fingern balancieren.' },
        fix: { ar: 'تحكّم بالـ "claw fingers" — اضغط الأرض.', de: 'Mit "Klauenfingern" Boden eindrücken.' },
      },
    ],
    recoveryNotes: {
      ar: 'إجهاد كتف عالٍ — يومان أو ثلاثة بين جلسات HSPU. التوازن وحده ممكن يومياً.',
      de: 'Hohe Schulterbelastung — 2-3 Tage Pause zwischen HSPU. Pures Balancieren täglich ok.',
    },
    frequencyPerWeek: { min: 3, ideal: 5, max: 7 },
    programmingStyle: {
      ar: 'تحدي يومي 10-20 دقيقة من المحاولات. HSPU بحجم منخفض 3-4 مجموعات × 3-5.',
      de: 'Täglich 10-20 Min. Versuche. HSPU geringes Volumen, 3-4 × 3-5.',
    },
    helpfulEquipment: [
      { ar: 'parallettes — أسهل على المعصم.', de: 'Parallettes — handgelenkschonender.' },
      { ar: 'حائط مسطح خالٍ من العقبات.', de: 'Saubere, hindernisfreie Wand.' },
      { ar: 'مرايا أو هاتف مثبت لمراجعة الفورم.', de: 'Spiegel oder Handy für Form-Check.' },
    ],
    milestones: [
      { ar: 'وقوف للحائط 60 ث.', de: 'Wand-Handstand 60s.' },
      { ar: 'وقوف حر 30 ث.', de: 'Freistand 30s.' },
      { ar: '5 wall HSPU بمدى كامل.', de: '5 Wand-HSPU mit voller Range.' },
      { ar: 'press to handstand.', de: 'Press to Handstand.' },
    ],
  },

  frontLever: {
    skillKey: 'frontLever',
    whyTrainIt: {
      ar: 'الفرنت ليفر يبني ظهراً عريضاً وقويّاً غير قابل للكسر. كل عضلة جذع وكتف تشتغل في تناسق فولاذي.',
      de: 'Front Lever baut breiten, unzerstörbaren Rücken — jede Core- und Schultermuskel arbeitet in stählerner Synchronität.',
    },
    mobilityPrereqs: [
      { ar: '12+ pull-ups صارمة.', de: '12+ strikte Klimmzüge.' },
      { ar: 'tuck FL hold 15 ث.', de: 'Getuckter FL 15s.' },
      { ar: 'hollow hold 60 ث.', de: 'Hollow Hold 60s.' },
    ],
    warmupSequence: [
      { ar: 'scapular pulls × 12.', de: 'Scapular Pulls × 12.' },
      { ar: 'tuck FL hold 10 ث × 3 (تحضير).', de: 'Tuck-FL 10s × 3 (Aufwärmen).' },
      { ar: 'inverted hang 20 ث.', de: 'Inverted Hang 20s.' },
    ],
    topMistakes: [
      {
        mistake: { ar: 'مرفقان منثنيان — يفقد الـ leverage.', de: 'Ellbogen gebeugt — verliert Hebel.' },
        fix: { ar: 'افكر "ادفع الأرض بعيداً" بذراعين مقفولتين.', de: '"Boden wegdrücken" mit gestreckten Armen.' },
      },
      {
        mistake: { ar: 'انفتاح ورك (يكسر السطر).', de: 'Hüfte abkippen (bricht Linie).' },
        fix: { ar: 'انكماش بطن قوي + شدّ الأرداف.', de: 'Starke Bauchspannung + Po fest.' },
      },
    ],
    recoveryNotes: {
      ar: 'الـ FL يستهلك بايسبس وأسفل الظهر بشدة. يومان راحة على الأقل بين الجلسات الكاملة.',
      de: 'FL belastet Bizeps und Lende stark — mindestens 2 Tage Pause zwischen Voll-Sessions.',
    },
    frequencyPerWeek: { min: 2, ideal: 3, max: 4 },
    programmingStyle: {
      ar: 'محاولات هولد قصيرة كثيرة — 5-8 × 5-10 ث. Pull من tuck/straddle FL لتنمية القوة الديناميكية.',
      de: 'Viele kurze Hold-Versuche — 5-8 × 5-10s. Pulls aus Tuck/Straddle für dynamische Kraft.',
    },
    helpfulEquipment: [
      { ar: 'بار سحب ثابت أو حلقات.', de: 'Stabile Klimmzugstange oder Ringe.' },
      { ar: 'مطّاطات لتقليل الوزن في المراحل الأولى.', de: 'Bänder zur Entlastung in frühen Phasen.' },
    ],
    milestones: [
      { ar: 'tuck FL 15 ث.', de: 'Tuck FL 15s.' },
      { ar: 'straddle FL 10 ث.', de: 'Straddle FL 10s.' },
      { ar: 'full FL 5 ث.', de: 'Voller FL 5s.' },
      { ar: 'FL pull-up.', de: 'FL Pull-up.' },
    ],
  },

  backLever: {
    skillKey: 'backLever',
    whyTrainIt: {
      ar: 'الباك ليفر بناء قاعدة لكل عناصر الحلقات الثابتة — iron cross، victorian، maltese. مرونة كتف نادرة + قوة بايسبس.',
      de: 'Back Lever — Fundament aller statischen Ringelemente: Iron Cross, Victorian, Maltese. Seltene Schultermobilität + Bizeps-Kraft.',
    },
    mobilityPrereqs: [
      { ar: 'german hang 30 ث بدون ألم.', de: 'German Hang 30s schmerzfrei.' },
      { ar: 'مرونة كتف للوصول للوضع المقلوب.', de: 'Schultermobilität für invertierte Position.' },
    ],
    warmupSequence: [
      { ar: 'german hang 10 ث × 3.', de: 'German Hang 10s × 3.' },
      { ar: 'shoulder dislocates × 15.', de: 'Schulter-Dislokationen × 15.' },
      { ar: 'tuck BL 5 ث × 3 (تحضير).', de: 'Tuck-BL 5s × 3.' },
    ],
    topMistakes: [
      {
        mistake: { ar: 'مرفقان منثنيان.', de: 'Ellbogen gebeugt.' },
        fix: { ar: 'افكر "ابعد المرفق عن البار" — استدارة خارج.', de: '"Ellbogen außen rotieren".' },
      },
      {
        mistake: { ar: 'كتفان متجمعان (لا مرونة).', de: 'Schultern unflexibel.' },
        fix: { ar: 'اعمل على german hang لأسابيع قبل الـ tuck BL.', de: 'Wochenlang German Hang vor Tuck-BL.' },
      },
    ],
    recoveryNotes: {
      ar: 'يجهد بايسبس (ذراعان مقفولتان مع شد). اقتصر على 2-3 جلسات أسبوعياً.',
      de: 'Belastet Bizeps (Streckung unter Last). 2-3 Sessions/Woche.',
    },
    frequencyPerWeek: { min: 2, ideal: 3, max: 4 },
    programmingStyle: {
      ar: 'محاولات هولد متعددة قصيرة + lower from inverted hang ببطء.',
      de: 'Viele kurze Halts + langsame Lower aus Inverted Hang.',
    },
    helpfulEquipment: [
      { ar: 'حلقات مرنة الزاوية.', de: 'Frei drehbare Ringe.' },
      { ar: 'مطّاطات للتدرّج.', de: 'Bänder zur Steigerung.' },
    ],
    milestones: [
      { ar: 'tuck BL 15 ث.', de: 'Tuck BL 15s.' },
      { ar: 'straddle BL 10 ث.', de: 'Straddle BL 10s.' },
      { ar: 'full BL 5 ث.', de: 'Voller BL 5s.' },
    ],
  },

  planche: {
    skillKey: 'planche',
    whyTrainIt: {
      ar: 'الـ planche قمة الكاليستنيكس — قوة كتف وصدر وجذع تتجاوز معظم الرياضيين. يستغرق سنوات لكن لا يضاهى.',
      de: 'Planche — Krone der Calisthenics: Schulter-, Brust- und Core-Kraft jenseits der meisten Athleten. Jahre Arbeit, einzigartige Belohnung.',
    },
    mobilityPrereqs: [
      { ar: 'planche lean 30 ث (كتف فوق المعصم).', de: 'Planche-Lean 30s (Schulter über Handgelenk).' },
      { ar: 'pseudo planche push-ups 8.', de: '8 Pseudo-Planche-PUs.' },
      { ar: 'مرونة معصم متطورة.', de: 'Sehr gute Handgelenksmobilität.' },
    ],
    warmupSequence: [
      { ar: 'wrist preparation 5 دقائق.', de: '5 Min. Handgelenksvorbereitung.' },
      { ar: 'planche lean 20 ث × 3 تحضير.', de: 'Planche-Lean 20s × 3 Aufwärmen.' },
      { ar: 'tuck planche 5 ث × 3.', de: 'Tuck-Planche 5s × 3.' },
    ],
    topMistakes: [
      {
        mistake: { ar: 'كتف منهار للداخل.', de: 'Schulter eingerollt nach innen.' },
        fix: { ar: 'انكماش لوحَي الكتف للأقصى (max protraction).', de: 'Maximale Schulterblatt-Protraktion.' },
      },
      {
        mistake: { ar: 'مرفقان منثنيان.', de: 'Ellbogen gebeugt.' },
        fix: { ar: 'لا تتقدم لخطوة جديدة قبل ضبط الـ lean بمرفق مقفل.', de: 'Erst weiter, wenn Lean mit gestrecktem Ellbogen sauber.' },
      },
      {
        mistake: { ar: 'تطور سريع جداً يؤدي لإصابة وتر العضد.', de: 'Zu schnelle Steigerung → Bizeps-Sehne.' },
        fix: { ar: 'اعمل عاماً كاملاً على straddle قبل full planche.', de: 'Mindestens 1 Jahr Straddle vor vollem Planche.' },
      },
    ],
    recoveryNotes: {
      ar: 'إجهاد عالٍ على وتر بايسبس وكتف. يومان أو ثلاثة بين الجلسات. ابتعد عن الأوزان عند الإحساس بأي ألم وتري.',
      de: 'Hohe Belastung auf Bizeps-Sehne und Schulter. 2-3 Tage Pause. Bei Sehnenschmerz sofort Pause.',
    },
    frequencyPerWeek: { min: 2, ideal: 3, max: 4 },
    programmingStyle: {
      ar: 'محاولات هولد قصيرة جداً (5-10 ث) لكن متعددة (8-12 محاولة لكل جلسة). تطور بطيء جداً.',
      de: 'Sehr kurze Holds (5-10s) aber viele (8-12 pro Session). Sehr langsame Steigerung.',
    },
    helpfulEquipment: [
      { ar: 'parallettes — تخفّف ضغط المعصم.', de: 'Parallettes — schonen Handgelenk.' },
      { ar: 'مطّاطات معلّقة للـ band-assisted planche.', de: 'Bandgestütztes Planche-Setup.' },
    ],
    milestones: [
      { ar: 'tuck planche 15 ث.', de: 'Tuck Planche 15s.' },
      { ar: 'straddle planche 5 ث.', de: 'Straddle Planche 5s.' },
      { ar: 'full planche 3 ث.', de: 'Full Planche 3s.' },
      { ar: 'planche push-up.', de: 'Planche Push-up.' },
    ],
  },

  muscleUp: {
    skillKey: 'muscleUp',
    whyTrainIt: {
      ar: 'الماصل أب يجمع السحب والعبور والديبس في حركة واحدة. اختبار حقيقي للقوة الانفجارية والتنسيق.',
      de: 'Muscle-Up vereint Zug, Übergang und Dip in einer Bewegung. Echter Test für explosive Kraft und Koordination.',
    },
    mobilityPrereqs: [
      { ar: '8-10 strict pull-ups.', de: '8-10 strikte Klimmzüge.' },
      { ar: '8-10 strict dips.', de: '8-10 strikte Dips.' },
      { ar: 'high pull above sternum.', de: 'High Pull übers Brustbein.' },
    ],
    warmupSequence: [
      { ar: '5 explosive pull-ups.', de: '5 explosive Klimmzüge.' },
      { ar: '5 dips بمدى كامل.', de: '5 volle Dips.' },
      { ar: 'transition negatives × 3.', de: 'Negativ-Übergänge × 3.' },
    ],
    topMistakes: [
      {
        mistake: { ar: 'سحب ضعيف — لا تتجاوز نقطة العبور.', de: 'Schwacher Zug — Übergang scheitert.' },
        fix: { ar: 'اعمل على explosive pull-ups مع pull-ups مثقّلة.', de: 'Explosive + Weighted Pull-ups trainieren.' },
      },
      {
        mistake: { ar: 'لا ميل للأمام عند العبور.', de: 'Keine Vorlage beim Übergang.' },
        fix: { ar: 'تخيّل "احنِ صدرك للبار وارفع المرفقين خلفك".', de: '"Brust zur Stange, Ellbogen nach hinten".' },
      },
    ],
    recoveryNotes: {
      ar: 'مرفقان وكتفان يجهدان من الانتقال — يومان راحة. اعمل التحضيرات (high pull, dips) في أيام منفصلة.',
      de: 'Ellbogen und Schultern werden im Übergang stark belastet — 2 Tage Pause. Vorbereitung (High Pull, Dips) an separaten Tagen.',
    },
    frequencyPerWeek: { min: 2, ideal: 3, max: 4 },
    programmingStyle: {
      ar: 'حجم منخفض، تكرارات قليلة — 4-5 مجموعات × 1-3. قوة انفجارية + تحكم.',
      de: 'Geringes Volumen, wenige Wdh. — 4-5 × 1-3. Explosivkraft + Kontrolle.',
    },
    helpfulEquipment: [
      { ar: 'بار سحب صلب.', de: 'Stabile Stange.' },
      { ar: 'حلقات للتطور المتقدم.', de: 'Ringe für Fortgeschrittene.' },
      { ar: 'كرة تنس للقبضة الكاذبة (تثبيت رسغ).', de: 'Tennisball für falschen Griff (Handgelenk).' },
    ],
    milestones: [
      { ar: 'first muscle-up (kipping).', de: 'Erster Muscle-Up (Kipping).' },
      { ar: 'strict bar muscle-up.', de: 'Strikter Stangen-MU.' },
      { ar: 'strict ring muscle-up.', de: 'Strikter Ring-MU.' },
    ],
  },

  humanFlag: {
    skillKey: 'humanFlag',
    whyTrainIt: {
      ar: 'العلم البشري يعرض قوة جانبية نادرة ومذهلة بصرياً. يدرّب obliques، شدّ كتف، وثبات جذع.',
      de: 'Human Flag zeigt seltene, optisch beeindruckende seitliche Kraft. Trainiert Obliquen, Schulterzug und Core-Stabilität.',
    },
    mobilityPrereqs: [
      { ar: 'pull-ups صارمة 8+.', de: '8+ strikte Klimmzüge.' },
      { ar: 'side plank 60 ث ثابت.', de: 'Seitliche Planke 60s stabil.' },
      { ar: 'pseudo planche lean 30 ث.', de: 'Pseudo-Planche-Lean 30s.' },
    ],
    warmupSequence: [
      { ar: 'side plank 30 ث لكل جانب.', de: 'Side Plank 30s pro Seite.' },
      { ar: 'lat activation drills.', de: 'Lat-Aktivierungen.' },
      { ar: '5 vertical flags 5 ث.', de: '5 Vertikal-Flaggen 5s.' },
    ],
    topMistakes: [
      {
        mistake: { ar: 'يد سفلى ضعيفة — تنهار.', de: 'Untere Hand zu schwach — kollabiert.' },
        fix: { ar: 'اضغط الأرض بقوة عبر يد سفلى — كأنك تدفعها بعيداً.', de: 'Untere Hand kräftig drücken — wegschieben.' },
      },
      {
        mistake: { ar: 'سحب عمودي بدلاً من جانبي.', de: 'Zug vertikal statt seitlich.' },
        fix: { ar: 'فكّر "اسحب الجسم نحو السقف، ادفع الأرضي".', de: '"Körper zur Decke ziehen, Boden wegdrücken".' },
      },
    ],
    recoveryNotes: {
      ar: 'جانبا الجذع والكتف يجهدان معاً — جلستان أسبوعياً مثالي.',
      de: 'Beide Körperseiten und Schultern stark belastet — 2 Sessions/Woche optimal.',
    },
    frequencyPerWeek: { min: 2, ideal: 3, max: 4 },
    programmingStyle: {
      ar: 'محاولات هولد متعددة قصيرة + lever raises لتطوير القوة.',
      de: 'Viele kurze Holds + Lever Raises für Kraftaufbau.',
    },
    helpfulEquipment: [
      { ar: 'عمود عمودي قوي.', de: 'Stabile vertikale Stange.' },
      { ar: 'مقابض حائط (wall hangers).', de: 'Wandgriffe.' },
    ],
    milestones: [
      { ar: 'tuck flag 8 ث.', de: 'Tuck Flag 8s.' },
      { ar: 'straddle flag 5 ث.', de: 'Straddle Flag 5s.' },
      { ar: 'full flag 5 ث.', de: 'Volle Flagge 5s.' },
    ],
  },

  dragonFlag: {
    skillKey: 'dragonFlag',
    whyTrainIt: {
      ar: 'علم التنين اختراع بروس لي — أقوى تمرين بطن إيزومتري + ديناميكي. يبني عضلات بطن مستقرة فولاذية.',
      de: 'Dragon Flag — Bruce Lees Erfindung. Stärkste isometrisch+dynamische Bauchübung. Stählerne Stabilität.',
    },
    mobilityPrereqs: [
      { ar: 'hollow hold 60 ث.', de: 'Hollow Hold 60s.' },
      { ar: 'leg raises 15 صارمة.', de: '15 strikte Leg Raises.' },
    ],
    warmupSequence: [
      { ar: 'hollow body rocks × 20.', de: 'Hollow Rocks × 20.' },
      { ar: 'tuck dragon × 5.', de: 'Tuck Dragon × 5.' },
    ],
    topMistakes: [
      {
        mistake: { ar: 'انحناء الورك في القمة.', de: 'Hüfte knickt oben ein.' },
        fix: { ar: 'حافظ على جسم خط مستقيم — البطن يعمل لا الورك.', de: 'Körper gerade — Bauch arbeitet, nicht Hüfte.' },
      },
      {
        mistake: { ar: 'سقوط بدلاً من نزول متحكم.', de: 'Fallen lassen statt kontrolliertes Ablassen.' },
        fix: { ar: 'انزل 4-5 ث في كل تكرارة.', de: '4-5s langsam ablassen.' },
      },
    ],
    recoveryNotes: {
      ar: 'إجهاد بطن وأسفل ظهر متوسط — 48 ساعة.',
      de: 'Mittlere Belastung Bauch + Lende — 48h Pause.',
    },
    frequencyPerWeek: { min: 2, ideal: 3, max: 4 },
    programmingStyle: {
      ar: 'تكرارات قليلة بطيئة — 4-5 مجموعات × 3-6.',
      de: 'Wenige langsame Wdh. — 4-5 × 3-6.',
    },
    helpfulEquipment: [
      { ar: 'مقعد ثابت أو عمود سفلي للإمساك.', de: 'Stabile Bank oder unterer Halt.' },
    ],
    milestones: [
      { ar: 'tuck dragon flag 8.', de: 'Tuck Dragon × 8.' },
      { ar: 'full dragon flag 3.', de: 'Voller Dragon × 3.' },
      { ar: 'full dragon flag 8.', de: 'Voller Dragon × 8.' },
    ],
  },

  nordicCurl: {
    skillKey: 'nordicCurl',
    whyTrainIt: {
      ar: 'النوردك أقوى تمرين خلفية فخذ بوزن الجسم — يقي إصابات ACL وhamstring الشهيرة عند الرياضيين.',
      de: 'Nordic Curl — stärkste KG-Hamstring-Übung; präventiv gegen ACL- und Hamstring-Verletzungen.',
    },
    mobilityPrereqs: [
      { ar: 'leg curl machine 5×8 (إن وجد).', de: 'Leg Curl Maschine 5×8 (falls vorhanden).' },
      { ar: 'glute ham raise 8.', de: 'Glute-Ham-Raise × 8.' },
    ],
    warmupSequence: [
      { ar: 'glute bridges × 15.', de: 'Brücke × 15.' },
      { ar: 'hamstring stretch dynamic × 10.', de: 'Dynamisches Hamstring-Stretching × 10.' },
    ],
    topMistakes: [
      {
        mistake: { ar: 'سقوط بدلاً من نزول متحكم.', de: 'Fallen statt kontrolliert.' },
        fix: { ar: 'يدان مستعدتان للسقوط بأمان — لا تخف من النزول البطيء.', de: 'Hände bereit zum Abfangen — keine Angst vorm Eccentric.' },
      },
      {
        mistake: { ar: 'ثني الورك (يصبح good morning مقلوب).', de: 'Hüfte beugen (umgekehrtes Good Morning).' },
        fix: { ar: 'حافظ على جسم خط مستقيم من الركبة للرأس.', de: 'Körper gerade von Knie bis Kopf.' },
      },
    ],
    recoveryNotes: {
      ar: 'تجهد فظيع على الفخذ الخلفي — جلستان أسبوعياً كحد أقصى.',
      de: 'Massive Hamstring-Belastung — max. 2 Sessions/Woche.',
    },
    frequencyPerWeek: { min: 1, ideal: 2, max: 3 },
    programmingStyle: {
      ar: 'حجم منخفض جداً — 3 مجموعات × 4-6 تكرار. كل تكرارة تستحق.',
      de: 'Sehr geringes Volumen — 3 × 4-6. Jede Wdh. zählt.',
    },
    helpfulEquipment: [
      { ar: 'شريك يثبّت الكاحلين.', de: 'Partner zum Fixieren der Knöchel.' },
      { ar: 'حافة سرير ثابتة.', de: 'Stabile Bettkante.' },
      { ar: 'جهاز glute ham raise.', de: 'Glute-Ham-Raise-Gerät.' },
    ],
    milestones: [
      { ar: 'full eccentric nordic 5.', de: 'Vollständiger Eccentric × 5.' },
      { ar: 'full nordic curl 1.', de: 'Voller Nordic Curl × 1.' },
      { ar: 'weighted nordic curl.', de: 'Gewichteter Nordic Curl.' },
    ],
  },

  press2HS: {
    skillKey: 'press2HS',
    whyTrainIt: {
      ar: 'الـ press to HS انتقال رشيق من L-sit إلى وقوف اليدين — قمة قوة الكتف وتحكم الجذع. يبدو سحرياً.',
      de: 'Press to HS — eleganter Übergang aus L-Sit zum Handstand; Schulterkraft + Core-Kontrolle. Wirkt magisch.',
    },
    mobilityPrereqs: [
      { ar: 'L-sit أرضي 30 ث.', de: 'L-Sit am Boden 30s.' },
      { ar: 'وقوف اليدين الحر 30 ث.', de: 'Freier Handstand 30s.' },
      { ar: 'pancake stretch — يد للأرض بين الرجلين.', de: 'Pancake-Stretch — Hände am Boden zwischen Beinen.' },
    ],
    warmupSequence: [
      { ar: 'pike compressions × 10.', de: 'Pike Compressions × 10.' },
      { ar: 'straddle compressions × 10.', de: 'Straddle Compressions × 10.' },
      { ar: 'wall handstand 30 ث × 2.', de: 'Wand-Handstand 30s × 2.' },
    ],
    topMistakes: [
      {
        mistake: { ar: 'استخدام قفز بدل القوة.', de: 'Springen statt Kraft.' },
        fix: { ar: 'العمل على negatives لأشهر قبل الـ concentric.', de: 'Monatelang Negatives vor Concentric.' },
      },
      {
        mistake: { ar: 'ضعف هيب فلكسر — الرجلان لا تصلان.', de: 'Schwacher Hüftbeuger — Beine kommen nicht hoch.' },
        fix: { ar: 'pike compressions 3 مرات أسبوعياً.', de: 'Pike Compressions 3×/Woche.' },
      },
    ],
    recoveryNotes: {
      ar: 'يجهد كتف، جذع، وهيب فلكسر معاً. 48 ساعة بين الجلسات.',
      de: 'Schultern, Core, Hüftbeuger — 48h Pause.',
    },
    frequencyPerWeek: { min: 2, ideal: 3, max: 4 },
    programmingStyle: {
      ar: 'محاولات قليلة عالية الجودة — 4-5 مجموعات × 2-4 تكرار. negatives بطيئة 5-7 ث.',
      de: 'Wenige hochwertige Wdh. — 4-5 × 2-4. Langsame Negatives 5-7s.',
    },
    helpfulEquipment: [
      { ar: 'parallettes — مدى أكبر.', de: 'Parallettes — größere Range.' },
      { ar: 'حائط للتدريب الأولي.', de: 'Wand für frühe Phasen.' },
    ],
    milestones: [
      { ar: 'wall straddle press × 5.', de: 'Wand-Straddle-Press × 5.' },
      { ar: 'free straddle press × 3.', de: 'Freie Straddle Press × 3.' },
      { ar: 'pike press to HS.', de: 'Pike Press to HS.' },
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
