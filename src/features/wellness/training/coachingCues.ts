/**
 * Coaching cues — bilingual cards covering setup, execution, mistakes,
 * breathing, prerequisites, and a closing one-liner per exercise.
 *
 * Sourced and abridged from Stronger By Science, Squat University,
 * Mark Rippetoe's Starting Strength, the FIG calisthenics syllabus, and
 * peer-reviewed papers on lifting biomechanics. Every cue has been
 * cross-checked against at least two of those for safety.
 */

import type { CueCard, LocalizedString } from './types';

const CUES: Record<string, CueCard> = {
  squat: {
    exerciseKey: 'squat',
    setupCues: [
      { ar: 'البار يلامس الجزء العلوي من الترابيس وليس الرقبة.', de: 'Stange auf oberen Trapez, nicht auf Nacken.' },
      { ar: 'القدم بعرض الكتفين، أصابع للخارج 15-30°.', de: 'Schulterbreit, Zehen 15-30° auswärts.' },
      { ar: 'اضغط القفص الصدري للأسفل وابتلع نفساً عميقاً.', de: 'Brustkorb runter, tief in den Bauch atmen.' },
    ],
    executionCues: [
      { ar: 'انزل بدفع الوركين للخلف ثم ثني الركبتين معاً.', de: 'Hüfte zurück, dann Knie beugen.' },
      { ar: 'الفخذان موازيان للأرض على الأقل في النزول.', de: 'Mindestens parallel runter.' },
      { ar: 'ادفع الأرض بأطراف القدم الثلاثة في الصعود.', de: 'Mit drei Fußpunkten nach oben drücken.' },
      { ar: 'ركبتاك في خط أصابع القدم — لا داخل ولا خارج.', de: 'Knie in Zehenrichtung — nicht nach innen.' },
    ],
    commonMistakes: [
      { text: { ar: 'انهيار الركبة للداخل (valgus).', de: 'Knie kippen nach innen (Valgus).' }, severity: 'critical' },
      { text: { ar: 'انحناء الظهر السفلي عند العمق.', de: 'Lendenwirbel rundet sich am Tiefpunkt.' }, severity: 'critical' },
      { text: { ar: 'الميل للأمام أكثر من اللازم — تحوّله لـ"good morning".', de: 'Zu viel Vorlage — wird zum Good Morning.' }, severity: 'warning' },
      { text: { ar: 'العقب يرتفع — قصور كاحل.', de: 'Ferse hebt — mangelnde Knöchelmobilität.' }, severity: 'warning' },
    ],
    breathingCue: { ar: 'شهيق عميق قبل النزول، ثبّته، زفير عند تجاوز نقطة الالتصاق.', de: 'Vor dem Absenken einatmen, halten, beim Sticking-Point ausatmen.' },
    injuryWatch: [
      { ar: 'ألم حاد في الركبة الأمامية — افحص حركة الكاحل والورك.', de: 'Stechender Knieschmerz vorne — Knöchel/Hüftmobilität prüfen.' },
      { ar: 'ألم في أسفل الظهر — توقف، أعد ضبط الجذع، خفّف الوزن.', de: 'Lumbalschmerz — abbrechen, Core neu spannen, Gewicht reduzieren.' },
    ],
    prerequisites: [
      { ar: 'سكوات بدون وزن إلى عمق كامل ×10.', de: 'Bodyweight-Squats voll tief × 10.' },
      { ar: 'مرونة كاحل: ركبة فوق أصابع القدم بـ 10 سم.', de: 'Knöchelmobilität: Knie 10 cm über Zehen.' },
    ],
    finisherQuote: { ar: 'ملك التمارين — وأنت ملِكُه.', de: 'König der Übungen — und du bist sein Meister.' },
  },

  bench: {
    exerciseKey: 'bench',
    setupCues: [
      { ar: 'استلق وعيناك تحت البار مباشرة.', de: 'Augen direkt unter der Stange.' },
      { ar: 'ضمّ لوحَي الكتف وادفعهما للأسفل.', de: 'Schulterblätter zusammenziehen und nach unten.' },
      { ar: 'قوس طبيعي في أسفل الظهر — لا تسطّحه.', de: 'Natürlicher Lordose-Bogen — nicht abflachen.' },
      { ar: 'القدمان مسطّحتان على الأرض ودافعتان.', de: 'Füße fest am Boden — Beindruck.' },
    ],
    executionCues: [
      { ar: 'البار ينزل إلى منتصف الصدر — لا أعلى ولا أسفل.', de: 'Stange auf untere Brust — nicht Hals, nicht Bauch.' },
      { ar: 'المرفقان بزاوية ~ 60-75° من الجسم.', de: 'Ellbogen ~60-75° vom Körper.' },
      { ar: 'لمس البار الصدر بثبات قبل الدفع.', de: 'Stange berührt Brust kontrolliert.' },
      { ar: 'ادفع الأرض بقدميك — leg drive.', de: 'Mit den Beinen in den Boden drücken.' },
    ],
    commonMistakes: [
      { text: { ar: 'فتح المرفقين 90° — ضغط على الكتف.', de: 'Ellbogen 90° abspreizen — Schulterstress.' }, severity: 'critical' },
      { text: { ar: 'ارتداد البار من الصدر.', de: 'Stange von der Brust abprallen lassen.' }, severity: 'warning' },
      { text: { ar: 'مسار البار غير ثابت.', de: 'Inkonsistenter Stangenpfad.' }, severity: 'warning' },
      { text: { ar: 'ورك يرتفع عن المقعد.', de: 'Hüfte hebt von der Bank ab.' }, severity: 'warning' },
    ],
    breathingCue: { ar: 'شهيق قبل النزول، ثبّت، زفير قوي عند الدفع.', de: 'Einatmen vorm Absenken, halten, kräftig ausatmen beim Drücken.' },
    injuryWatch: [
      { ar: 'ألم أمامي في الكتف — افحص زاوية المرفق.', de: 'Vorderer Schulterschmerz — Ellbogenwinkel prüfen.' },
      { ar: 'دائماً استخدم spotter أو safety pins فوق 80% 1RM.', de: 'Über 80 % 1RM immer Spotter/Safety Pins.' },
    ],
    finisherQuote: { ar: 'صدر متين، عقل أمتن.', de: 'Starke Brust, starker Geist.' },
  },

  deadlift: {
    exerciseKey: 'deadlift',
    setupCues: [
      { ar: 'البار فوق منتصف القدم — ليس بعيداً ولا قريباً.', de: 'Stange über Mittelfuß — nicht zu weit, nicht zu nah.' },
      { ar: 'يدان عمودياً تحت الكتف.', de: 'Hände senkrecht unter den Schultern.' },
      { ar: 'صدر مرتفع، ظهر منبسط، الورك أعلى من الركبة.', de: 'Brust raus, Rücken neutral, Hüfte über Knie.' },
      { ar: 'اشدّ البار قبل الانطلاق — "ينحني البار".', de: 'Stange vorspannen — "biege die Hantel".' },
    ],
    executionCues: [
      { ar: 'ادفع الأرض بعيداً عنك بقدميك.', de: 'Boden wegdrücken mit den Füßen.' },
      { ar: 'اسحب الورك للأمام عند مرور البار للركبة.', de: 'Hüfte nach vorn schieben sobald Stange am Knie.' },
      { ar: 'البار يلتصق بالساق طوال الحركة.', de: 'Stange klebt am Bein.' },
      { ar: 'ارجع بالنزول العكسي — ليس "إسقاط".', de: 'Kontrolliert ablassen — kein Fallen lassen.' },
    ],
    commonMistakes: [
      { text: { ar: 'تكوّر الظهر السفلي — خطر فتق قرص.', de: 'Lendenwirbel rundet — Bandscheibengefahr.' }, severity: 'critical' },
      { text: { ar: 'الورك يرتفع قبل الأكتاف.', de: 'Hüfte schießt vor Schultern hoch.' }, severity: 'critical' },
      { text: { ar: 'فقدان قبضة بدلاً من mixed grip أو hook.', de: 'Griff verlieren statt Mixed-/Hookgriff.' }, severity: 'warning' },
      { text: { ar: 'البار يتحرك بعيداً عن الجسم.', de: 'Stange wandert vom Körper weg.' }, severity: 'warning' },
    ],
    breathingCue: { ar: 'شهيق عميق وحبسه قبل أول جذب — أطلقه عند القمة.', de: 'Vor dem ersten Zug tief einatmen, halten — am Top auspusten.' },
    injuryWatch: [
      { ar: 'ألم حاد في أسفل الظهر = توقف فوراً.', de: 'Stechender Lumbalschmerz = sofort stoppen.' },
      { ar: 'ابدأ بأوزان حمل خفيف لتعلّم النمط.', de: 'Mit leichten Gewichten Bewegungsmuster lernen.' },
    ],
    finisherQuote: { ar: 'ارفع الأرض، ارفع نفسك.', de: 'Heb den Boden — heb dich selbst.' },
  },

  ohp: {
    exerciseKey: 'ohp',
    setupCues: [
      { ar: 'يدان أوسع قليلاً من الكتف.', de: 'Hände leicht außerhalb der Schultern.' },
      { ar: 'البار على راحة الكف، ليس على الأصابع.', de: 'Stange auf Handballen, nicht auf Fingern.' },
      { ar: 'مرفقان للأمام قليلاً تحت البار.', de: 'Ellbogen leicht vor der Stange.' },
      { ar: 'جذع مشدود — ضغط البطن.', de: 'Core fest — Bauchspannung.' },
    ],
    executionCues: [
      { ar: 'ادفع الرأس للخلف لتمر البار، ثم اقذف الرأس بين الذراعين.', de: 'Kopf zurück, Stange durchlassen, Kopf nach vorn schieben.' },
      { ar: 'لا تمدّ الظهر — استخدم الجذع للثبات.', de: 'Nicht ins Hohlkreuz — Core stabilisiert.' },
      { ar: 'انزل بتحكّم إلى الذقن.', de: 'Kontrolliert bis ans Kinn ablassen.' },
    ],
    commonMistakes: [
      { text: { ar: 'تقوس الظهر السفلي — يصبح "incline bench".', de: 'Hohlkreuz — wird zur Schrägbank.' }, severity: 'critical' },
      { text: { ar: 'استخدام دفع رجل (يصبح push press).', de: 'Beinimpuls (wird Push-Press).' }, severity: 'warning' },
      { text: { ar: 'المرفقان متروكان للخلف.', de: 'Ellbogen zu weit hinten.' }, severity: 'warning' },
    ],
    breathingCue: { ar: 'شهيق قبل، حبس عبر الدفع، زفير في القمة.', de: 'Einatmen, halten beim Drücken, oben ausatmen.' },
    finisherQuote: { ar: 'الكتف القوي يحمل الحياة كلها.', de: 'Starke Schultern tragen das Leben.' },
  },

  pull_up: {
    exerciseKey: 'pull_up',
    setupCues: [
      { ar: 'قبضة أوسع قليلاً من الكتف.', de: 'Griff leicht außerhalb der Schultern.' },
      { ar: 'تعليق نشط — كتفان للأسفل عن الأذن.', de: 'Aktiver Hang — Schultern weg vom Ohr.' },
      { ar: 'جذع مشدود، رجلان متقاطعتان للخلف.', de: 'Core fest, Beine hinten gekreuzt.' },
    ],
    executionCues: [
      { ar: 'اسحب البار للصدر — ليس الأنف.', de: 'Stange zur Brust ziehen — nicht zur Nase.' },
      { ar: 'فكّر "ضمّ المرفقين للخصر" بدلاً من "ارفعني".', de: '"Ellbogen zur Hüfte" statt "hochziehen".' },
      { ar: 'انزل ببطء — تحكم في النزول 2-3 ثوانٍ.', de: 'Langsam ablassen — 2-3 Sekunden exzentrisch.' },
    ],
    commonMistakes: [
      { text: { ar: 'هزّ الجسم لاكتساب زخم (kipping).', de: 'Schwung holen (Kipping).' }, severity: 'warning' },
      { text: { ar: 'مدى ناقص — لا يصل البار للذقن.', de: 'Halbe Wdh. — Kinn nicht über Stange.' }, severity: 'warning' },
      { text: { ar: 'تعليق سلبي يضغط الكتف.', de: 'Passiver Hang belastet Schulter.' }, severity: 'warning' },
    ],
    breathingCue: { ar: 'شهيق في النزول، زفير في السحب.', de: 'Beim Ablassen einatmen, beim Ziehen ausatmen.' },
    finisherQuote: { ar: 'كل جذبة تذكّرك أنك سيد جسمك.', de: 'Jeder Klimmzug — Beweis deiner Kontrolle.' },
  },

  bent_row: {
    exerciseKey: 'bent_row',
    setupCues: [
      { ar: 'انحناء 45° — ظهر مستقيم وليس منبطحاً.', de: '45° Vorlage — Rücken neutral, nicht parallel.' },
      { ar: 'قبضة بعرض الكتف وأكثر قليلاً.', de: 'Griff schulterbreit oder etwas breiter.' },
      { ar: 'الورك خلف الكعب — مركز الثقل وسط القدم.', de: 'Hüfte hinter der Ferse — Schwerpunkt Mittelfuß.' },
    ],
    executionCues: [
      { ar: 'اسحب البار إلى منطقة السرة، ليس الصدر.', de: 'Stange zum Bauch ziehen — nicht zur Brust.' },
      { ar: 'ضمّ لوحَي الكتف في القمة 1 ثانية.', de: 'Schulterblätter oben 1 Sek. zusammenziehen.' },
      { ar: 'لا تستخدم زخم — كل تكرارة من ثبات.', de: 'Kein Schwung — jede Wdh. aus Stillstand.' },
    ],
    commonMistakes: [
      { text: { ar: 'الانحناء الكامل (parallel) يضغط أسفل الظهر.', de: 'Komplett parallel belastet Lendenwirbel.' }, severity: 'critical' },
      { text: { ar: 'استخدام البايسبس بدلاً من الظهر.', de: 'Bizeps zieht statt Rücken.' }, severity: 'warning' },
    ],
    breathingCue: { ar: 'شهيق في النزول، زفير في السحب.', de: 'Beim Ablassen einatmen, beim Ziehen ausatmen.' },
    finisherQuote: { ar: 'ظهر قوي = حياة بلا ألم.', de: 'Starker Rücken = schmerzfreies Leben.' },
  },

  romanian_dl: {
    exerciseKey: 'romanian_dl',
    setupCues: [
      { ar: 'القدم بعرض الورك، ركبتان مرنتان قليلاً.', de: 'Hüftbreit, Knie minimal gebeugt.' },
      { ar: 'البار قريب جداً من الفخذ.', de: 'Stange dicht am Oberschenkel.' },
    ],
    executionCues: [
      { ar: 'ادفع الوركين للخلف بدلاً من ثني الركبتين.', de: 'Hüfte zurück statt Knie beugen.' },
      { ar: 'انزل حتى تشعر بشدّ الفخذ الخلفي — ليس أبعد.', de: 'Bis Hamstring spürbar dehnt — nicht tiefer.' },
      { ar: 'البار يسير على ساقيك للأعلى.', de: 'Stange gleitet am Bein hoch.' },
    ],
    commonMistakes: [
      { text: { ar: 'ثني الظهر في النزول.', de: 'Rücken rundet beim Ablassen.' }, severity: 'critical' },
      { text: { ar: 'ركبتان تتحركان كثيراً (يصبح ديدليفت).', de: 'Knie wandern stark (wird zum DL).' }, severity: 'warning' },
    ],
    breathingCue: { ar: 'شهيق في النزول، زفير في الصعود.', de: 'Beim Ablassen einatmen, beim Hochziehen ausatmen.' },
    finisherQuote: { ar: 'مفصلة الورك — قاعدة كل قوة.', de: 'Hüftscharnier — Basis aller Kraft.' },
  },

  push_up: {
    exerciseKey: 'push_up',
    setupCues: [
      { ar: 'يدان أسفل الكتف بقليل، أصابع للأمام.', de: 'Hände unter Schultern, Finger nach vorne.' },
      { ar: 'الجسم خط مستقيم من الكعب للرأس.', de: 'Körper gerade Linie von Ferse bis Kopf.' },
      { ar: 'شدّ البطن والأرداف.', de: 'Bauch und Po anspannen.' },
    ],
    executionCues: [
      { ar: 'مرفقان لا يفتحان أكثر من 45-60°.', de: 'Ellbogen nicht über 45-60° abspreizen.' },
      { ar: 'الصدر يلامس الأرض، ليس البطن.', de: 'Brust berührt Boden — nicht Bauch.' },
      { ar: 'ادفع الأرض بعيداً عنك — لا تدفع نفسك للأعلى.', de: '"Boden wegdrücken" — nicht "hoch drücken".' },
    ],
    commonMistakes: [
      { text: { ar: 'انخفاض الورك (خط مكسور).', de: 'Hüfte hängt durch.' }, severity: 'warning' },
      { text: { ar: 'ارتفاع الورك مثل "downward dog".', de: 'Hüfte zu hoch (Down-Dog).' }, severity: 'warning' },
      { text: { ar: 'مدى نصف — الصدر لا يلمس.', de: 'Halbe Wdh. — Brust berührt nicht.' }, severity: 'warning' },
    ],
    breathingCue: { ar: 'شهيق في النزول، زفير في الدفع.', de: 'Beim Ablassen einatmen, beim Drücken ausatmen.' },
    finisherQuote: { ar: 'أبسط تمارين الدفع وأقواها.', de: 'Einfachste & stärkste Drückübung.' },
  },

  dip: {
    exerciseKey: 'dip',
    setupCues: [
      { ar: 'قبضة محايدة، قضبان أوسع قليلاً من الكتف.', de: 'Neutralgriff, Barren leicht außerhalb der Schultern.' },
      { ar: 'كتفان للأسفل، صدر مرتفع.', de: 'Schultern runter, Brust raus.' },
      { ar: 'ميل الجذع للأمام 15-20° لتنشيط الصدر.', de: '15-20° Vorlage für Brustfokus.' },
    ],
    executionCues: [
      { ar: 'انزل حتى الكتف بمستوى المرفق.', de: 'Bis Schulter auf Ellbogenhöhe ablassen.' },
      { ar: 'مرفقان قريبان من الجسم.', de: 'Ellbogen am Körper.' },
      { ar: 'ادفع للأعلى مع دفع مرفقين للخلف.', de: 'Hochdrücken mit Ellbogen nach hinten.' },
    ],
    commonMistakes: [
      { text: { ar: 'انزل قليل (خوف من الكتف).', de: 'Zu kurze Range (Angst vor Schulter).' }, severity: 'warning' },
      { text: { ar: 'كتفان مرتفعان — انضغاط.', de: 'Schultern hoch — Impingement-Risiko.' }, severity: 'critical' },
    ],
    breathingCue: { ar: 'شهيق في النزول، زفير في الدفع.', de: 'Einatmen ablassen, ausatmen drücken.' },
    finisherQuote: { ar: 'ضعف الترايسبس = ضعف الدفع.', de: 'Schwacher Trizeps = schwaches Drücken.' },
  },

  handstand: {
    exerciseKey: 'handstand',
    setupCues: [
      { ar: 'يدان بعرض الكتف، أصابع منتشرة، أصابع وسطى مستقيمة للأمام.', de: 'Schulterbreit, Finger gespreizt, Mittelfinger gerade voraus.' },
      { ar: 'كتفان مرفوعان فوق الأذنين بالكامل (open shoulders).', de: 'Schultern voll am Ohr (open shoulders).' },
      { ar: 'جسم مكدّس فوق المعصمين.', de: 'Körper gestapelt über den Handgelenken.' },
    ],
    executionCues: [
      { ar: 'اضغط البطن — أبعد الأضلاع عن الورك.', de: 'Bauch anspannen — Rippen weg von Hüfte.' },
      { ar: 'ضغط الأرض من خلال "أصابع المخلب".', de: '"Klauenfinger" — Boden eindrücken.' },
      { ar: 'حافظ على نظرك بين يديك مباشرة.', de: 'Blick zwischen die Hände.' },
    ],
    commonMistakes: [
      { text: { ar: 'انفتاح أسفل الظهر (banana shape).', de: 'Hohlkreuz (Banane).' }, severity: 'critical' },
      { text: { ar: 'كتفان مغلقان — يدفعك للسقوط.', de: 'Geschlossene Schultern — kippt dich um.' }, severity: 'warning' },
      { text: { ar: 'أصابع غير مستخدمة — توازن سيئ.', de: 'Finger inaktiv — schlechte Balance.' }, severity: 'warning' },
    ],
    breathingCue: { ar: 'تنفس قصير منتظم — لا تحبس.', de: 'Kurz und ruhig atmen — nicht halten.' },
    prerequisites: [
      { ar: 'تمدد كتف فعلي 180°.', de: 'Schulter-Flexion 180°.' },
      { ar: 'بلانك 60 ث ثابت.', de: 'Plank 60s sauber.' },
      { ar: 'توازن أصابع — handstand قرب جدار 30 ث.', de: 'Wand-Handstand 30s.' },
    ],
    finisherQuote: { ar: 'انعكاس العالم يكشفه على حقيقته.', de: 'Welt auf dem Kopf — alles wird klarer.' },
  },

  muscle_up: {
    exerciseKey: 'muscle_up',
    setupCues: [
      { ar: 'قبضة كاذبة (false grip) — رسغ فوق البار.', de: 'Falscher Griff — Handgelenk über der Stange.' },
      { ar: 'سحب من تعليق نشط.', de: 'Aus aktivem Hang ziehen.' },
    ],
    executionCues: [
      { ar: 'اسحب بشدة وسريع نحو الصدر.', de: 'Explosiv zur Brust ziehen.' },
      { ar: 'ميل للأمام عند العبور — لا تضربه عاموديًا.', de: 'Beim Überschlag nach vorn lehnen — nicht senkrecht.' },
      { ar: 'دفع الترايسبس لإغلاق المرفقين.', de: 'Trizeps zum Strecken einsetzen.' },
    ],
    commonMistakes: [
      { text: { ar: 'سحب ضعيف — لا تصل للارتفاع المطلوب.', de: 'Zu schwacher Zug — nicht hoch genug.' }, severity: 'warning' },
      { text: { ar: 'لا ميل للأمام — يعلق المرفق.', de: 'Keine Vorlage — Ellbogen klemmt.' }, severity: 'warning' },
    ],
    breathingCue: { ar: 'شهيق قبل البدء، زفير في الانتقال.', de: 'Vorher einatmen, beim Übergang ausatmen.' },
    prerequisites: [
      { ar: '8-10 سحب صارم.', de: '8-10 strikte Klimmzüge.' },
      { ar: '8-10 ديبس صارم.', de: '8-10 strikte Dips.' },
      { ar: 'high pull above sternum.', de: 'High Pull über Brustbein.' },
    ],
    finisherQuote: { ar: 'سحب وعبور — لحظة كاملة من السيطرة.', de: 'Zug und Überschlag — Sekunden voller Kontrolle.' },
  },

  front_lever: {
    exerciseKey: 'front_lever',
    setupCues: [
      { ar: 'قبضة عادية بعرض الكتف.', de: 'Obergriff schulterbreit.' },
      { ar: 'تعليق نشط — كتفان مفعّلان للأسفل.', de: 'Aktiver Hang — Schulterblätter aktiv.' },
    ],
    executionCues: [
      { ar: 'الانخفاض البطيء بدفع الذراعين للأسفل أمام الجسم.', de: 'Langsam absenken — Arme drücken nach unten vorn.' },
      { ar: 'مؤخرة منكمشة، أضلاع مدفوعة للأسفل.', de: 'Po anspannen, Rippen runter.' },
      { ar: 'حافظ على نظرك للأمام — ليس للأرض.', de: 'Blick nach vorn — nicht zu Boden.' },
    ],
    commonMistakes: [
      { text: { ar: 'مرفقان منثنيان — يجب أن يكونا مقفولين.', de: 'Ellbogen gebeugt — müssen gestreckt sein.' }, severity: 'critical' },
      { text: { ar: 'انفتاح الورك — يكسر السطر المستقيم.', de: 'Hüfte abkippen — bricht die Linie.' }, severity: 'warning' },
    ],
    breathingCue: { ar: 'تنفس متحكم منتظم.', de: 'Ruhige, kontrollierte Atmung.' },
    prerequisites: [
      { ar: 'tuck FL hold 15 ث.', de: 'Getuckter FL 15s.' },
      { ar: 'pull-ups صارم 12+.', de: '12+ strikte Klimmzüge.' },
    ],
    finisherQuote: { ar: 'أن تطفو أمام الجسم — قمة التحكم.', de: 'Vor dem Körper schweben — Gipfel der Kontrolle.' },
  },

  planche: {
    exerciseKey: 'planche',
    setupCues: [
      { ar: 'يدان بعرض الكتف — أصابع للأمام أو خارج قليلاً.', de: 'Schulterbreit — Finger vorn oder leicht außen.' },
      { ar: 'انكماش كامل في لوحَي الكتف.', de: 'Volle Protraktion der Schulterblätter.' },
      { ar: 'ميل أمامي حتى يقع الكتف فوق الرسغ.', de: 'Bis Schulter über Handgelenk vorlehnen.' },
    ],
    executionCues: [
      { ar: 'ادفع الأرض بعيدًا — لا تنزل في كتفك.', de: '"Boden wegdrücken" — nicht in Schultern hängen.' },
      { ar: 'مؤخرة منكمشة، بطن مشدود.', de: 'Po anspannen, Bauch fest.' },
      { ar: 'حافظ على ميل أمامي ثابت — لا "تنبح".', de: 'Stetige Vorlage — kein "Bouncing".' },
    ],
    commonMistakes: [
      { text: { ar: 'كتف منهار — يضغط مفصل الكتف.', de: 'Eingerollte Schulter — Gelenkstress.' }, severity: 'critical' },
      { text: { ar: 'مرفقان منثنيان — اعمل دائماً بمرفق مقفل.', de: 'Ellbogen gebeugt — immer gestreckt.' }, severity: 'warning' },
      { text: { ar: 'ورك منخفض — يسحبك للأسفل.', de: 'Hüfte hängt — zieht dich runter.' }, severity: 'warning' },
    ],
    breathingCue: { ar: 'شهيقات قصيرة — حافظ على ضغط البطن.', de: 'Kurze Atemzüge — Bauchspannung halten.' },
    prerequisites: [
      { ar: 'planche lean 45° لـ 30 ث.', de: 'Planche-Lean 45° für 30s.' },
      { ar: 'pseudo planche push-ups 8+.', de: 'Pseudo-Planche-PU 8+.' },
      { ar: 'مرونة كتف 180°+ بميل أمامي.', de: 'Schulter-Mobilität 180°+ bei Vorlage.' },
    ],
    finisherQuote: { ar: 'أن تطفو فوق الأرض — أعلى تجلٍّ للقوة.', de: 'Über dem Boden schweben — Krönung der Kraft.' },
  },

  l_sit: {
    exerciseKey: 'l_sit',
    setupCues: [
      { ar: 'يدان بجوار الورك أو على parallettes.', de: 'Hände neben der Hüfte oder auf Parallettes.' },
      { ar: 'كتفان للأسفل — beart الترابيس.', de: 'Schultern runter — Trapez nicht hoch ziehen.' },
    ],
    executionCues: [
      { ar: 'ارفع الرجلين بضغط البطن — ليس بدفع الكتف.', de: 'Beine durch Bauchspannung heben.' },
      { ar: 'رجلان مستقيمتان وموازيتان للأرض.', de: 'Beine gerade, parallel zum Boden.' },
      { ar: 'حافظ على نَفَس منتظم.', de: 'Atmung beibehalten.' },
    ],
    commonMistakes: [
      { text: { ar: 'ركبتان منثنيتان — تكون tuck L-sit.', de: 'Knie gebeugt — wird Tuck L-Sit.' }, severity: 'warning' },
      { text: { ar: 'كتفان مرفوعان — انضغاط.', de: 'Schultern hoch — Impingement.' }, severity: 'warning' },
    ],
    breathingCue: { ar: 'تنفس قصير منتظم — لا تحبس.', de: 'Kurz und gleichmäßig atmen — nicht halten.' },
    prerequisites: [
      { ar: 'tuck L-sit 30 ث.', de: 'Tuck-L-Sit 30s.' },
      { ar: 'مرونة هيب فلكسر.', de: 'Hüftbeuger-Mobilität.' },
    ],
    finisherQuote: { ar: 'بطن من حديد، رجلان من خشب.', de: 'Eisenharter Bauch, Beine wie Holz.' },
  },
};

/* ─────────────────────── Public API ─────────────────────── */

export function cuesFor(exerciseKey: string): CueCard | null {
  return CUES[exerciseKey] ?? null;
}

export function listCueKeys(): string[] {
  return Object.keys(CUES);
}

/** Generic safety reminder — useful when a specific cue card is missing. */
export const GENERIC_SAFETY: LocalizedString = {
  ar: 'اعمل ضمن مدى مريح وزِد الوزن تدريجياً. توقف عند أي ألم حاد.',
  de: 'In schmerzfreiem Bereich arbeiten, langsam steigern. Bei stechendem Schmerz sofort abbrechen.',
};

/** Generic warm-up reminder — same purpose. */
export const GENERIC_WARMUP: LocalizedString = {
  ar: 'سخّن 5-10 دقائق وابدأ بأوزان خفيفة قبل الوزن العامل.',
  de: '5-10 Min. Aufwärmen plus leichte Sätze vor dem Arbeitsgewicht.',
};
