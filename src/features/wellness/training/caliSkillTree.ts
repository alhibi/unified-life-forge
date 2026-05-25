/**
 * Calisthenics skill tree.
 *
 * 14 skills × 5-9 progression steps each. Each step has explicit unlock
 * criteria, coaching cues, and common-mistake fixes. The tree is acyclic:
 * advanced skills depend on prerequisite milestones in basic skills (e.g.
 * Front Lever requires "tuck FL hold 15s" + "12 strict pull-ups").
 *
 * Sources: FIG calisthenics syllabus, Steven Low's Overcoming Gravity 2nd
 * ed., GMB Fitness progressions, Calimove/FitnessFAQs cross-reference.
 */

import type { SkillDef } from './types';

/* ──────────────── 1) Push-up family ──────────────── */

const PUSH_UP: SkillDef = {
  key: 'pushUp',
  name: { ar: 'تمرين الضغط', de: 'Liegestütz' },
  category: 'push',
  difficulty: 4,
  color: '#ef4444',
  emoji: '💪',
  primaryMuscles: ['chest', 'triceps'],
  secondaryMuscles: ['shoulders', 'core'],
  tagline: { ar: 'بداية كل قصة دفع', de: 'Beginn jeder Push-Geschichte' },
  about: {
    ar: 'تمرين الضغط هو الأساس الذي تبنى عليه كل تمارين الدفع المتقدمة. إتقانه بمدى كامل وعمق وزخم نظيف يفتح الباب للديبس والـ HSPU والبلانش.',
    de: 'Liegestütz ist die Basis aller Drückskills. Saubere Volle-Range-Wdh. öffnen die Tür zu Dips, HSPU und Planche.',
  },
  steps: [
    {
      key: 'wall',
      name: { ar: 'ضغط على الحائط', de: 'Wand-Liegestütz' },
      target: { reps: 15, sets: 3 },
      cues: [
        { ar: 'الجسم خط مستقيم من الكعب للرأس.', de: 'Körper gerade Linie.' },
        { ar: 'لمس الحائط بالأنف برفق.', de: 'Nase berührt Wand.' },
      ],
      mistakes: [
        { ar: 'انحناء الورك للداخل.', de: 'Hüfte hängt durch.' },
      ],
      unlockCriterion: { ar: '15 تكرار × 3 مجموعات بشكل سليم.', de: '15 Wdh. × 3 sauber.' },
      regressions: [{ ar: 'قف أبعد عن الحائط لتقليل الزاوية.', de: 'Weiter weg von der Wand stehen.' }],
      difficulty: 1,
      weeksAverage: 1,
    },
    {
      key: 'incline',
      name: { ar: 'ضغط مائل', de: 'Erhöhter Liegestütz' },
      target: { reps: 12, sets: 3 },
      cues: [
        { ar: 'يد على طاولة أو حافة سرير ثابتة.', de: 'Hände auf Tisch oder Bettkante.' },
        { ar: 'كلما انخفض السطح، كلما صعب التمرين.', de: 'Je niedriger die Auflage, desto schwerer.' },
      ],
      unlockCriterion: { ar: '12 × 3 بمدى كامل وثبات تام.', de: '12 × 3 voll & stabil.' },
      regressions: [{ ar: 'ارفع السطح أكثر — درج أعلى.', de: 'Auflage höher.' }],
      difficulty: 2,
      weeksAverage: 2,
    },
    {
      key: 'knee',
      name: { ar: 'ضغط على الركبة', de: 'Liegestütz auf Knien' },
      target: { reps: 12, sets: 3 },
      cues: [
        { ar: 'الركبة + اليد + الورك خط مستقيم.', de: 'Knie, Hand und Hüfte in einer Linie.' },
        { ar: 'لا تجلس على الكعب.', de: 'Nicht auf die Fersen setzen.' },
      ],
      mistakes: [
        { ar: 'ورك مرفوع — التمرين يصبح "downward dog".', de: 'Hüfte zu hoch — wird zum Down-Dog.' },
      ],
      unlockCriterion: { ar: '12 × 3 بشكل صارم.', de: '12 × 3 streng.' },
      difficulty: 3,
      weeksAverage: 3,
    },
    {
      key: 'standard',
      name: { ar: 'ضغط قياسي', de: 'Standard-Liegestütz' },
      target: { reps: 15, sets: 3 },
      cues: [
        { ar: 'صدر يلامس الأرض في كل تكرارة.', de: 'Brust berührt Boden bei jeder Wdh.' },
        { ar: 'مرفقان لا يفتحان أكثر من 60°.', de: 'Ellbogen max. 60°.' },
        { ar: 'بطن وأرداف مشدودان طوال الحركة.', de: 'Bauch und Po angespannt.' },
      ],
      unlockCriterion: { ar: '15 × 3 بمدى كامل.', de: '15 × 3 volle Range.' },
      difficulty: 4,
      weeksAverage: 4,
    },
    {
      key: 'diamond',
      name: { ar: 'ضغط الماس', de: 'Diamant-Liegestütz' },
      target: { reps: 10, sets: 3 },
      cues: [
        { ar: 'يدان معاً تحت الصدر — السبابة والإبهام يكوّنان ماساً.', de: 'Hände unter Brust — Zeigefinger und Daumen bilden Raute.' },
        { ar: 'مرفقان للخلف لتركيز الترايسبس.', de: 'Ellbogen nach hinten für Trizeps.' },
      ],
      unlockCriterion: { ar: '10 × 3 بدون فتح اليدين.', de: '10 × 3 ohne Hände zu trennen.' },
      difficulty: 5,
      weeksAverage: 4,
    },
    {
      key: 'decline',
      name: { ar: 'ضغط منخفض', de: 'Liegestütz mit erhöhten Beinen' },
      target: { reps: 12, sets: 3 },
      cues: [
        { ar: 'القدم على كرسي 30-50 سم.', de: 'Füße auf Stuhl 30-50 cm.' },
        { ar: 'يحفّز الجزء العلوي من الصدر والأكتاف.', de: 'Betont obere Brust und Schultern.' },
      ],
      unlockCriterion: { ar: '12 × 3 بمدى كامل.', de: '12 × 3 volle Range.' },
      difficulty: 5,
      weeksAverage: 5,
    },
    {
      key: 'archer',
      name: { ar: 'ضغط الرامي', de: 'Archer-Liegestütz' },
      target: { reps: 6, sets: 3 },
      cues: [
        { ar: 'يد ممدودة جانباً، الأخرى تنزل بك.', de: 'Eine Hand seitlich gestreckt, andere senkt ab.' },
        { ar: 'بدّل بين الجوانب بنعومة.', de: 'Sauberer Seitenwechsel.' },
      ],
      unlockCriterion: { ar: '6 لكل جانب × 3.', de: '6 pro Seite × 3.' },
      difficulty: 7,
      weeksAverage: 8,
    },
    {
      key: 'one_arm',
      name: { ar: 'ضغط بيد واحدة', de: 'Einarmiger Liegestütz' },
      target: { reps: 5, sets: 3 },
      cues: [
        { ar: 'افتح القدمين للتوازن.', de: 'Füße breiter für Balance.' },
        { ar: 'الورك لا يدور — جذع ثابت.', de: 'Hüfte rotiert nicht.' },
      ],
      unlockCriterion: { ar: '5 × 3 لكل ذراع — قمة الإتقان.', de: '5 × 3 pro Arm — Meisterschaft.' },
      regressions: [{ ar: 'ابدأ على الحائط ثم على سطح مائل.', de: 'Erst an Wand, dann mit Erhöhung.' }],
      difficulty: 9,
      weeksAverage: 24,
    },
  ],
};

/* ──────────────── 2) Pull-up family ──────────────── */

const PULL_UP: SkillDef = {
  key: 'pullUp',
  name: { ar: 'العقلة', de: 'Klimmzug' },
  category: 'pull',
  difficulty: 6,
  color: '#3b82f6',
  emoji: '🔝',
  primaryMuscles: ['back', 'biceps'],
  secondaryMuscles: ['forearms', 'core'],
  tagline: { ar: 'مقياس القوة العلوية الأول', de: 'Maßstab der oberen Kraft' },
  about: {
    ar: 'العقلة هي عَلَم القوة في عالم الكاليستنيكس. اكتسابها يفتح الباب للماصل أب والفرنت ليفر والعَلَم.',
    de: 'Der Klimmzug ist die Königsdisziplin der oberen Kraft — öffnet die Tür zu Muscle-Up, Front Lever und Human Flag.',
  },
  steps: [
    {
      key: 'dead_hang',
      name: { ar: 'تعليق ميّت 30 ث', de: 'Toter Hang 30s' },
      target: { holdSec: 30, sets: 3 },
      cues: [
        { ar: 'كتفان للأسفل ولوحان مفعلان.', de: 'Schultern runter, Schulterblätter aktiv.' },
        { ar: 'قبضة كاملة وشد البطن.', de: 'Voller Griff, Bauch fest.' },
      ],
      isHold: true,
      unlockCriterion: { ar: '30 ث × 3 بدون ألم.', de: '30s × 3 schmerzfrei.' },
      difficulty: 2,
      weeksAverage: 2,
    },
    {
      key: 'scapular',
      name: { ar: 'سحب لوحَي الكتف', de: 'Scapular Pull' },
      target: { reps: 10, sets: 3 },
      cues: [
        { ar: 'حرّك الكتفين فقط — الذراعان تبقيان مستقيمتين.', de: 'Nur Schultern bewegen — Arme bleiben gerade.' },
        { ar: '"اسحب نفسك لأعلى بنصف بوصة فقط".', de: '"Hebe dich um einen Zoll".' },
      ],
      unlockCriterion: { ar: '10 × 3 تحكم كامل.', de: '10 × 3 voll kontrolliert.' },
      difficulty: 3,
      weeksAverage: 2,
    },
    {
      key: 'negative',
      name: { ar: 'عقلة سلبية', de: 'Negativklimmzug' },
      target: { reps: 5, sets: 3, holdSec: 5 },
      cues: [
        { ar: 'اقفز للأعلى ثم انزل ببطء 4-5 ثوانٍ.', de: 'Hochspringen, langsam ablassen 4-5s.' },
      ],
      unlockCriterion: { ar: '5 × 3 بنزول 5 ث لكل تكرارة.', de: '5 × 3 mit 5s Eccentric.' },
      difficulty: 4,
      weeksAverage: 4,
    },
    {
      key: 'band_assisted',
      name: { ar: 'عقلة بمطّاط', de: 'Band-assistierter Klimmzug' },
      target: { reps: 8, sets: 3 },
      cues: [
        { ar: 'مطاط حول البار ووضع القدم.', de: 'Band um Stange und Fuß.' },
        { ar: 'قلّل من سُمك المطاط تدريجياً.', de: 'Bandstärke graduell reduzieren.' },
      ],
      unlockCriterion: { ar: '8 × 3 بمطاط متوسط.', de: '8 × 3 mit mittlerem Band.' },
      difficulty: 5,
      weeksAverage: 6,
    },
    {
      key: 'standard',
      name: { ar: 'عقلة قياسية', de: 'Standard-Klimmzug' },
      target: { reps: 5, sets: 3 },
      cues: [
        { ar: 'البار يصل إلى الذقن — مدى كامل.', de: 'Stange übers Kinn — volle Range.' },
        { ar: 'لا تأرجح — كل تكرارة من تعليق نشط.', de: 'Kein Schwung — jede Wdh. aus aktivem Hang.' },
        { ar: 'انزل تحكماً 2-3 ث.', de: 'Kontrolliert 2-3s ablassen.' },
      ],
      unlockCriterion: { ar: '5 × 3 صارمة.', de: '5 × 3 streng.' },
      difficulty: 6,
      weeksAverage: 8,
    },
    {
      key: 'wide',
      name: { ar: 'عقلة واسعة', de: 'Breiter Klimmzug' },
      target: { reps: 8, sets: 3 },
      cues: [
        { ar: 'قبضة 1.5× عرض الكتف.', de: 'Griff 1,5× Schulterbreite.' },
        { ar: 'تركيز أعلى على ظهر علوي.', de: 'Mehr oberer Rücken.' },
      ],
      unlockCriterion: { ar: '8 × 3.', de: '8 × 3.' },
      difficulty: 7,
      weeksAverage: 4,
    },
    {
      key: 'lsit_pullup',
      name: { ar: 'عقلة L-sit', de: 'L-Sit Klimmzug' },
      target: { reps: 6, sets: 3 },
      cues: [
        { ar: 'احتفظ بـ L-sit طوال الحركة.', de: 'L-Sit über die ganze Bewegung halten.' },
      ],
      unlockCriterion: { ar: '6 × 3 بدون فقدان L-sit.', de: '6 × 3 ohne L-Sit zu verlieren.' },
      difficulty: 8,
      weeksAverage: 12,
    },
    {
      key: 'archer',
      name: { ar: 'عقلة الرامي', de: 'Archer-Klimmzug' },
      target: { reps: 4, sets: 3 },
      cues: [
        { ar: 'ذراع تسحب، الأخرى ممدودة جانباً.', de: 'Eine Hand zieht, andere seitlich gestreckt.' },
      ],
      unlockCriterion: { ar: '4 لكل جانب × 3.', de: '4 pro Seite × 3.' },
      difficulty: 8,
      weeksAverage: 12,
    },
    {
      key: 'typewriter',
      name: { ar: 'عقلة الكاتبة', de: 'Typewriter Pull-up' },
      target: { reps: 4, sets: 3 },
      cues: [
        { ar: 'اسحب لأعلى ثم انزلق إلى يد ثم الأخرى.', de: 'Hoch ziehen, dann zur einen Hand "fahren", dann zur anderen.' },
      ],
      unlockCriterion: { ar: '4 لكل جانب × 3.', de: '4 pro Seite × 3.' },
      difficulty: 9,
      weeksAverage: 16,
    },
  ],
};

/* ──────────────── 3) Dip family ──────────────── */

const DIP: SkillDef = {
  key: 'dip',
  name: { ar: 'ديبس', de: 'Dips' },
  category: 'push',
  difficulty: 6,
  color: '#f59e0b',
  emoji: '🦅',
  primaryMuscles: ['triceps', 'chest'],
  secondaryMuscles: ['shoulders'],
  tagline: { ar: 'بنش الكاليستنيكس', de: 'Bankdrücken der Calisthenics' },
  about: {
    ar: 'الديبس مكافئ بنش برس في عالم وزن الجسم. أساس الترايسبس الضخم وتحضير لازم للماصل أب.',
    de: 'Dips sind das KG-Pendant zum Bankdrücken — Trizeps-Maker und Vorbereitung für Muscle-Up.',
  },
  steps: [
    {
      key: 'bench_dip',
      name: { ar: 'ديبس على مقعد', de: 'Bench Dip' },
      target: { reps: 12, sets: 3 },
      cues: [
        { ar: 'يدان على حافة كرسي، رجلان ممدودتان.', de: 'Hände an Bank, Beine ausgestreckt.' },
        { ar: 'الكوع لا يفتح — يبقى للخلف.', de: 'Ellbogen bleibt hinten — nicht ausweichen.' },
      ],
      unlockCriterion: { ar: '12 × 3.', de: '12 × 3.' },
      difficulty: 2,
      weeksAverage: 2,
    },
    {
      key: 'negative_dip',
      name: { ar: 'ديبس سلبي', de: 'Negativ-Dip' },
      target: { reps: 5, sets: 3, holdSec: 5 },
      cues: [
        { ar: 'اقفز إلى وضع القمة وانزل تحكماً 4-5 ث.', de: 'In oberste Position springen, langsam ablassen.' },
      ],
      unlockCriterion: { ar: '5 × 3 بنزول نظيف.', de: '5 × 3 saubere Eccentrics.' },
      difficulty: 4,
      weeksAverage: 4,
    },
    {
      key: 'parallel',
      name: { ar: 'ديبس متوازي', de: 'Parallel-Dip' },
      target: { reps: 8, sets: 3 },
      cues: [
        { ar: 'انزل حتى الكتف بمستوى المرفق.', de: 'Bis Schulter auf Ellbogenhöhe ablassen.' },
        { ar: 'ميل أمامي 15° لتنشيط الصدر.', de: '15° Vorlage für Brust.' },
      ],
      unlockCriterion: { ar: '8 × 3 بمدى كامل.', de: '8 × 3 volle Range.' },
      difficulty: 6,
      weeksAverage: 8,
    },
    {
      key: 'ring_dip',
      name: { ar: 'ديبس الحلقات', de: 'Ring-Dip' },
      target: { reps: 6, sets: 3 },
      cues: [
        { ar: 'حلقات متوازية في القمة (RTO turn-out).', de: 'Ringe oben nach außen drehen (RTO).' },
        { ar: 'ثبات أكبر — تحدٍّ توازني.', de: 'Mehr Stabilisation gefordert.' },
      ],
      unlockCriterion: { ar: '6 × 3 على الحلقات.', de: '6 × 3 an den Ringen.' },
      difficulty: 7,
      weeksAverage: 10,
    },
    {
      key: 'weighted',
      name: { ar: 'ديبس بأوزان', de: 'Gewichteter Dip' },
      target: { reps: 5, sets: 3 },
      cues: [
        { ar: 'حزام ديبس مع 10-20 كغ بداية.', de: 'Dip-Gürtel mit 10-20 kg starten.' },
      ],
      unlockCriterion: { ar: '5 × 3 بـ 25% من وزن الجسم.', de: '5 × 3 mit 25 % BW.' },
      difficulty: 8,
      weeksAverage: 12,
    },
    {
      key: 'korean',
      name: { ar: 'ديبس كوري', de: 'Koreanischer Dip' },
      target: { reps: 5, sets: 3 },
      cues: [
        { ar: 'يدان خلف الجسم على بار.', de: 'Hände hinter dem Körper auf Stange.' },
        { ar: 'مرونة كتف عالية مطلوبة.', de: 'Hohe Schultermobilität nötig.' },
      ],
      unlockCriterion: { ar: '5 × 3 بمدى كامل.', de: '5 × 3 volle Range.' },
      difficulty: 9,
      weeksAverage: 16,
    },
  ],
};

/* ──────────────── 4) Squat / Pistol family ──────────────── */

const SQUAT: SkillDef = {
  key: 'squat',
  name: { ar: 'سكوات', de: 'Kniebeuge' },
  category: 'legs',
  difficulty: 6,
  color: '#10b981',
  emoji: '🦵',
  primaryMuscles: ['quads', 'glutes'],
  secondaryMuscles: ['hamstrings', 'calves'],
  tagline: { ar: 'الأرجل التي تحملك للقمة', de: 'Beine, die dich tragen' },
  about: {
    ar: 'سكوات وزن الجسم بدلاً من البار — بسيط لكن مع التطور إلى pistol وshrimp يصبح اختباراً فاتكاً للقوة والتوازن.',
    de: 'KG-Squat statt Langhantel — simpel, aber Pistol und Shrimp Squat werden zum echten Kraft- und Balance-Test.',
  },
  steps: [
    {
      key: 'assisted',
      name: { ar: 'سكوات بمساعدة', de: 'Assisted Squat' },
      target: { reps: 15, sets: 3 },
      cues: [
        { ar: 'امسك إطار باب أو حلقات.', de: 'An Türrahmen oder Ringe halten.' },
      ],
      unlockCriterion: { ar: '15 × 3 بعمق كامل.', de: '15 × 3 voll tief.' },
      difficulty: 1,
      weeksAverage: 1,
    },
    {
      key: 'air',
      name: { ar: 'سكوات هوائي', de: 'Air Squat' },
      target: { reps: 20, sets: 3 },
      cues: [
        { ar: 'كعب ثابت، ركبة في خط القدم.', de: 'Ferse fest, Knie über Zehen.' },
        { ar: 'صدر مرفوع، نظر للأمام.', de: 'Brust raus, Blick geradeaus.' },
      ],
      unlockCriterion: { ar: '20 × 3 بعمق كامل.', de: '20 × 3 voll tief.' },
      difficulty: 2,
      weeksAverage: 2,
    },
    {
      key: 'split',
      name: { ar: 'سكوات منشق', de: 'Ausfallschritt' },
      target: { reps: 12, sets: 3 },
      cues: [
        { ar: 'الخطوة طويلة، الركبة الخلفية تلامس الأرض.', de: 'Großer Schritt, hinteres Knie tippt Boden.' },
      ],
      unlockCriterion: { ar: '12 لكل ساق × 3.', de: '12 pro Bein × 3.' },
      difficulty: 3,
      weeksAverage: 3,
    },
    {
      key: 'bulgarian',
      name: { ar: 'سكوات بلغاري', de: 'Bulgarischer Split-Squat' },
      target: { reps: 10, sets: 3 },
      cues: [
        { ar: 'القدم الخلفية على كرسي خلفك.', de: 'Hinterer Fuß auf Bank.' },
        { ar: 'الوزن على القدم الأمامية.', de: 'Gewicht auf vorderem Fuß.' },
      ],
      unlockCriterion: { ar: '10 × 3 بعمق.', de: '10 × 3 tief.' },
      difficulty: 4,
      weeksAverage: 4,
    },
    {
      key: 'cossack',
      name: { ar: 'سكوات كوسّاك', de: 'Kosaken-Squat' },
      target: { reps: 8, sets: 3 },
      cues: [
        { ar: 'افتح الفخذ بعرض كبير ثم نقل الوزن.', de: 'Sehr breiter Stand, Gewicht verlagern.' },
        { ar: 'الكعب ثابت، الأخرى ممدودة.', de: 'Eine Ferse fest, andere gestreckt.' },
      ],
      unlockCriterion: { ar: '8 لكل جانب × 3.', de: '8 pro Seite × 3.' },
      difficulty: 5,
      weeksAverage: 6,
    },
    {
      key: 'pistol_neg',
      name: { ar: 'بستول سلبي', de: 'Pistol Negativ' },
      target: { reps: 5, sets: 3, holdSec: 5 },
      cues: [
        { ar: 'انزل ببطء 4-5 ث، اقف بكلتا القدمين.', de: 'Langsam ablassen 4-5s, mit beiden Beinen aufstehen.' },
      ],
      unlockCriterion: { ar: '5 × 3 لكل ساق.', de: '5 × 3 pro Bein.' },
      difficulty: 6,
      weeksAverage: 8,
    },
    {
      key: 'pistol',
      name: { ar: 'بستول', de: 'Pistol-Squat' },
      target: { reps: 5, sets: 3 },
      cues: [
        { ar: 'الذراعان للأمام للتوازن.', de: 'Arme nach vorn für Balance.' },
        { ar: 'الكعب يبقى ملامساً.', de: 'Ferse bleibt am Boden.' },
        { ar: 'الساق الأخرى موازية للأرض.', de: 'Anderes Bein parallel zum Boden.' },
      ],
      unlockCriterion: { ar: '5 × 3 لكل ساق.', de: '5 × 3 pro Bein.' },
      difficulty: 8,
      weeksAverage: 16,
    },
    {
      key: 'shrimp',
      name: { ar: 'سكوات الجمبري', de: 'Shrimp-Squat' },
      target: { reps: 4, sets: 3 },
      cues: [
        { ar: 'أمسك القدم الخلفية بيد.', de: 'Hinteres Bein mit Hand greifen.' },
        { ar: 'انزل حتى الركبة الخلفية تلامس الأرض.', de: 'Bis Knie Boden berührt.' },
      ],
      unlockCriterion: { ar: '4 لكل ساق × 3.', de: '4 pro Bein × 3.' },
      difficulty: 9,
      weeksAverage: 24,
    },
  ],
};

/* ──────────────── 5) L-sit family ──────────────── */

const L_SIT: SkillDef = {
  key: 'lSit',
  name: { ar: 'إل-سيت', de: 'L-Sit' },
  category: 'core',
  difficulty: 6,
  color: '#8b5cf6',
  emoji: '🪑',
  primaryMuscles: ['core'],
  secondaryMuscles: ['triceps', 'shoulders', 'quads'],
  tagline: { ar: 'بطن من حديد', de: 'Eisenbauch' },
  about: {
    ar: 'إل-سيت يبدو بسيطاً لكنه اختبار شامل لعضلات البطن والترايسبس وهيب فلكسر معاً.',
    de: 'L-Sit wirkt simpel, ist aber ein Test für Bauch, Trizeps und Hüftbeuger zugleich.',
  },
  steps: [
    {
      key: 'foot_supp',
      name: { ar: 'إل-سيت بقدم مدعومة', de: 'L-Sit mit Fußstütze' },
      target: { holdSec: 20, sets: 3 },
      cues: [
        { ar: 'قدم على الأرض، اضغط الأرض بيديك.', de: 'Füße am Boden, mit Händen Boden eindrücken.' },
      ],
      isHold: true,
      unlockCriterion: { ar: '20 ث × 3.', de: '20s × 3.' },
      difficulty: 2,
      weeksAverage: 2,
    },
    {
      key: 'one_leg',
      name: { ar: 'إل-سيت برجل', de: 'Einbein L-Sit' },
      target: { holdSec: 15, sets: 3 },
      cues: [
        { ar: 'ساق ممدودة والأخرى منثنية.', de: 'Ein Bein gestreckt, anderes gebeugt.' },
      ],
      isHold: true,
      unlockCriterion: { ar: '15 ث لكل ساق × 3.', de: '15s pro Bein × 3.' },
      difficulty: 3,
      weeksAverage: 3,
    },
    {
      key: 'tuck',
      name: { ar: 'إل-سيت ركبة منثنية', de: 'Tuck L-Sit' },
      target: { holdSec: 20, sets: 3 },
      cues: [
        { ar: 'ركبتان مرفوعتان للصدر.', de: 'Knie zur Brust ziehen.' },
      ],
      isHold: true,
      unlockCriterion: { ar: '20 ث × 3.', de: '20s × 3.' },
      difficulty: 4,
      weeksAverage: 4,
    },
    {
      key: 'full_floor',
      name: { ar: 'إل-سيت كامل أرضي', de: 'Volles L-Sit (Boden)' },
      target: { holdSec: 15, sets: 3 },
      cues: [
        { ar: 'رجلان مستقيمتان موازيتان للأرض.', de: 'Beine gerade, parallel zum Boden.' },
        { ar: 'كتفان للأسفل، صدر مرتفع.', de: 'Schultern runter, Brust raus.' },
      ],
      isHold: true,
      unlockCriterion: { ar: '15 ث × 3 على الأرض.', de: '15s × 3 am Boden.' },
      difficulty: 6,
      weeksAverage: 8,
    },
    {
      key: 'parallettes',
      name: { ar: 'إل-سيت على parallettes', de: 'L-Sit auf Parallettes' },
      target: { holdSec: 30, sets: 3 },
      cues: [
        { ar: 'مدى أكبر — أصعب على الكتف.', de: 'Mehr Range — härter für Schultern.' },
      ],
      isHold: true,
      unlockCriterion: { ar: '30 ث × 3.', de: '30s × 3.' },
      difficulty: 7,
      weeksAverage: 12,
    },
    {
      key: 'v_sit',
      name: { ar: 'V-sit', de: 'V-Sit' },
      target: { holdSec: 10, sets: 3 },
      cues: [
        { ar: 'ارفع الرجلين إلى زاوية أعلى من 60°.', de: 'Beine über 60° heben.' },
      ],
      isHold: true,
      unlockCriterion: { ar: '10 ث × 3.', de: '10s × 3.' },
      difficulty: 8,
      weeksAverage: 16,
    },
    {
      key: 'manna',
      name: { ar: 'مانا', de: 'Manna' },
      target: { holdSec: 5, sets: 3 },
      cues: [
        { ar: 'رجلان فوق الكتف — قمة المرونة.', de: 'Beine über Schulter — Spitzenmobilität.' },
      ],
      isHold: true,
      unlockCriterion: { ar: '5 ث × 3.', de: '5s × 3.' },
      difficulty: 10,
      weeksAverage: 52,
    },
  ],
};

/* ──────────────── 6) Handstand family ──────────────── */

const HANDSTAND: SkillDef = {
  key: 'handstand',
  name: { ar: 'وقوف على اليدين', de: 'Handstand' },
  category: 'static',
  difficulty: 8,
  color: '#ec4899',
  emoji: '🤸',
  primaryMuscles: ['shoulders', 'core'],
  secondaryMuscles: ['traps', 'forearms'],
  prerequisites: [{ skillKey: 'pushUp', minStep: 4 }],
  tagline: { ar: 'فن السيطرة', de: 'Kunst der Kontrolle' },
  about: {
    ar: 'وقوف اليدين الحرّ يفتح عالماً جديداً — توازن، قوة كتف، تحكم نَفَس وتفكير معكوس.',
    de: 'Freier Handstand öffnet eine neue Welt — Balance, Schulterkraft, Atemkontrolle.',
  },
  steps: [
    {
      key: 'wall_plank',
      name: { ar: 'بلانك حائط', de: 'Wall Plank' },
      target: { holdSec: 60, sets: 3 },
      cues: [
        { ar: 'قدمان على الحائط، يدان على الأرض.', de: 'Füße an Wand, Hände am Boden.' },
        { ar: 'جسم مستقيم تماماً.', de: 'Komplett gerader Körper.' },
      ],
      isHold: true,
      unlockCriterion: { ar: '60 ث × 3.', de: '60s × 3.' },
      difficulty: 3,
      weeksAverage: 3,
    },
    {
      key: 'chest_wall',
      name: { ar: 'وقوف بصدر للحائط', de: 'Chest-to-Wall HS' },
      target: { holdSec: 30, sets: 3 },
      cues: [
        { ar: 'الصدر يلامس الحائط.', de: 'Brust an Wand.' },
        { ar: 'كتفان مفعلان للأقصى.', de: 'Schultern voll aktiv.' },
      ],
      isHold: true,
      unlockCriterion: { ar: '30 ث × 3.', de: '30s × 3.' },
      difficulty: 4,
      weeksAverage: 4,
    },
    {
      key: 'back_wall',
      name: { ar: 'وقوف بظهر للحائط', de: 'Back-to-Wall HS' },
      target: { holdSec: 30, sets: 3 },
      cues: [
        { ar: 'الظهر للحائط — توازن أصغر.', de: 'Rücken an Wand — kleinere Balance.' },
      ],
      isHold: true,
      unlockCriterion: { ar: '30 ث × 3.', de: '30s × 3.' },
      difficulty: 5,
      weeksAverage: 5,
    },
    {
      key: 'toe_pull',
      name: { ar: 'انفصال أصابع', de: 'Toe-Pull Freestand' },
      target: { holdSec: 5, sets: 3 },
      cues: [
        { ar: 'اسحب الأصابع عن الحائط لجرب التوازن.', de: 'Zehen kurz von Wand wegziehen.' },
      ],
      isHold: true,
      unlockCriterion: { ar: '5 ث × 3 بلا حائط.', de: '5s × 3 ohne Wand.' },
      difficulty: 6,
      weeksAverage: 8,
    },
    {
      key: 'free_30',
      name: { ar: 'وقوف حر 30 ث', de: 'Freistand 30s' },
      target: { holdSec: 30, sets: 1 },
      cues: [
        { ar: '"أصابع المخلب" تتحكم في الميل الأمامي.', de: '"Klauenfinger" steuern Vorlage.' },
        { ar: 'تعديل بالكتف لا بالورك.', de: 'Korrekturen aus der Schulter, nicht der Hüfte.' },
      ],
      isHold: true,
      unlockCriterion: { ar: '30 ث متواصلة بلا سند.', de: '30s ohne Stütze.' },
      difficulty: 7,
      weeksAverage: 16,
    },
    {
      key: 'hs_walk',
      name: { ar: 'مشي على اليدين', de: 'Handstand Walk' },
      target: { reps: 10, sets: 3 },
      cues: [
        { ar: '"خطوات" قصيرة من يد لأخرى.', de: 'Kurze "Schritte" von Hand zu Hand.' },
      ],
      unlockCriterion: { ar: '10 خطوات × 3.', de: '10 Schritte × 3.' },
      difficulty: 8,
      weeksAverage: 20,
    },
    {
      key: 'pike_hspu',
      name: { ar: 'ضغط من Pike', de: 'Pike-HSPU' },
      target: { reps: 5, sets: 3 },
      cues: [
        { ar: 'قدمان مرفوعتان على كرسي.', de: 'Füße erhöht auf Stuhl.' },
      ],
      unlockCriterion: { ar: '5 × 3.', de: '5 × 3.' },
      difficulty: 7,
      weeksAverage: 12,
    },
    {
      key: 'wall_hspu',
      name: { ar: 'HSPU بالحائط', de: 'Wand-HSPU' },
      target: { reps: 5, sets: 3 },
      cues: [
        { ar: 'الرأس يلمس الأرض، الكتف بمستوى المرفق.', de: 'Kopf am Boden, Schulter auf Ellbogenhöhe.' },
      ],
      unlockCriterion: { ar: '5 × 3 بمدى كامل.', de: '5 × 3 volle Range.' },
      difficulty: 8,
      weeksAverage: 16,
    },
    {
      key: 'free_hspu',
      name: { ar: 'HSPU حر', de: 'Freistehende HSPU' },
      target: { reps: 3, sets: 3 },
      cues: [
        { ar: 'بلا حائط — قمة الإتقان.', de: 'Ohne Wand — Spitze.' },
      ],
      unlockCriterion: { ar: '3 × 3 حر.', de: '3 × 3 freistehend.' },
      difficulty: 10,
      weeksAverage: 52,
    },
  ],
};

/* ──────────────── 7) Front Lever ──────────────── */

const FRONT_LEVER: SkillDef = {
  key: 'frontLever',
  name: { ar: 'فرنت ليفر', de: 'Front Lever' },
  category: 'static',
  difficulty: 9,
  color: '#06b6d4',
  emoji: '🪂',
  primaryMuscles: ['back', 'core'],
  secondaryMuscles: ['shoulders', 'biceps'],
  prerequisites: [{ skillKey: 'pullUp', minStep: 4 }],
  tagline: { ar: 'الطفو أمام البار', de: 'Schweben vor der Stange' },
  about: {
    ar: 'الفرنت ليفر هو الكأس الذهبية لقوة السحب. يبني ظهراً وحديداً وجذعاً غير قابل للكسر.',
    de: 'Front Lever — Heiliger Gral der Zugkraft. Baut Eisenrücken und unzerstörbaren Core.',
  },
  steps: [
    {
      key: 'tuck_hold',
      name: { ar: 'فرنت ليفر مطوي', de: 'Tuck Front Lever' },
      target: { holdSec: 15, sets: 3 },
      cues: [
        { ar: 'ركبتان مطويتان للصدر.', de: 'Knie eng zur Brust.' },
        { ar: 'كتفان مكتنزان، أضلاع للأسفل.', de: 'Schulterblätter retrahiert, Rippen runter.' },
      ],
      isHold: true,
      unlockCriterion: { ar: '15 ث × 3.', de: '15s × 3.' },
      difficulty: 5,
      weeksAverage: 6,
    },
    {
      key: 'tuck_raise',
      name: { ar: 'فرنت ليفر مطوي رفع', de: 'Tuck FL Raise' },
      target: { reps: 8, sets: 3 },
      cues: [
        { ar: 'من تعليق ميت إلى وضع tuck FL.', de: 'Aus totem Hang in Tuck FL.' },
      ],
      unlockCriterion: { ar: '8 × 3.', de: '8 × 3.' },
      difficulty: 6,
      weeksAverage: 8,
    },
    {
      key: 'adv_tuck',
      name: { ar: 'فرنت ليفر مفتوح', de: 'Adv. Tuck FL' },
      target: { holdSec: 15, sets: 3 },
      cues: [
        { ar: 'ركبتان مفتوحتان عن الصدر — ظهر منبسط.', de: 'Knie geöffnet — flacher Rücken.' },
      ],
      isHold: true,
      unlockCriterion: { ar: '15 ث × 3.', de: '15s × 3.' },
      difficulty: 7,
      weeksAverage: 10,
    },
    {
      key: 'one_leg',
      name: { ar: 'فرنت ليفر برجل', de: 'Einbein FL' },
      target: { holdSec: 12, sets: 3 },
      cues: [
        { ar: 'رجل ممدودة، الأخرى مطوية.', de: 'Ein Bein gestreckt, anderes getuckt.' },
      ],
      isHold: true,
      unlockCriterion: { ar: '12 ث لكل جانب × 3.', de: '12s pro Seite × 3.' },
      difficulty: 8,
      weeksAverage: 12,
    },
    {
      key: 'straddle',
      name: { ar: 'فرنت ليفر مفتوح الرجلين', de: 'Straddle FL' },
      target: { holdSec: 10, sets: 3 },
      cues: [
        { ar: 'رجلان مفتوحتان — ذراع رافعة أقصر.', de: 'Beine gespreizt — kürzerer Hebel.' },
      ],
      isHold: true,
      unlockCriterion: { ar: '10 ث × 3.', de: '10s × 3.' },
      difficulty: 9,
      weeksAverage: 16,
    },
    {
      key: 'full',
      name: { ar: 'فرنت ليفر كامل', de: 'Vollständiger FL' },
      target: { holdSec: 5, sets: 3 },
      cues: [
        { ar: 'الجسم خط مستقيم تام.', de: 'Körper komplett gerade.' },
      ],
      isHold: true,
      unlockCriterion: { ar: '5 ث × 3.', de: '5s × 3.' },
      difficulty: 10,
      weeksAverage: 24,
    },
    {
      key: 'fl_pull',
      name: { ar: 'سحب فرنت ليفر', de: 'FL Pull-up' },
      target: { reps: 3, sets: 3 },
      cues: [
        { ar: 'حافظ على وضع FL طوال السحب.', de: 'FL-Position über die ganze Zugbewegung halten.' },
      ],
      unlockCriterion: { ar: '3 × 3 بمدى كامل.', de: '3 × 3 volle Range.' },
      difficulty: 10,
      weeksAverage: 36,
    },
  ],
};

/* ──────────────── 8) Back Lever ──────────────── */

const BACK_LEVER: SkillDef = {
  key: 'backLever',
  name: { ar: 'باك ليفر', de: 'Back Lever' },
  category: 'static',
  difficulty: 7,
  color: '#14b8a6',
  emoji: '🌗',
  primaryMuscles: ['back', 'biceps'],
  secondaryMuscles: ['shoulders', 'core'],
  prerequisites: [{ skillKey: 'pullUp', minStep: 4 }],
  tagline: { ar: 'مرونة كتف وقوة بايسبس', de: 'Schultermobilität meets Bizepskraft' },
  about: {
    ar: 'الباك ليفر بوابة لـ ironcross و planche على الحلقات. يبني مرونة كتف نادرة.',
    de: 'Back Lever — Tor zu Iron Cross und Ringen-Planche. Baut seltene Schultermobilität.',
  },
  steps: [
    {
      key: 'german_hang',
      name: { ar: 'تعليق ألماني', de: 'German Hang' },
      target: { holdSec: 30, sets: 3 },
      cues: [
        { ar: 'كتفان للأقصى من المرونة.', de: 'Maximale Schultermobilität.' },
      ],
      isHold: true,
      unlockCriterion: { ar: '30 ث × 3 بدون ألم.', de: '30s × 3 schmerzfrei.' },
      difficulty: 4,
      weeksAverage: 4,
    },
    {
      key: 'tuck_bl',
      name: { ar: 'باك ليفر مطوي', de: 'Tuck Back Lever' },
      target: { holdSec: 15, sets: 3 },
      cues: [
        { ar: 'مرفقان مقفولان، ركبتان مطويتان.', de: 'Ellbogen gestreckt, Knie getuckt.' },
      ],
      isHold: true,
      unlockCriterion: { ar: '15 ث × 3.', de: '15s × 3.' },
      difficulty: 5,
      weeksAverage: 6,
    },
    {
      key: 'adv_tuck_bl',
      name: { ar: 'باك ليفر مفتوح', de: 'Adv. Tuck BL' },
      target: { holdSec: 15, sets: 3 },
      cues: [
        { ar: 'ركبتان مفتوحتان عن الجذع.', de: 'Knie geöffnet vom Rumpf.' },
      ],
      isHold: true,
      unlockCriterion: { ar: '15 ث × 3.', de: '15s × 3.' },
      difficulty: 6,
      weeksAverage: 8,
    },
    {
      key: 'one_leg_bl',
      name: { ar: 'باك ليفر برجل', de: 'Einbein BL' },
      target: { holdSec: 12, sets: 3 },
      cues: [
        { ar: 'رجل ممدودة والأخرى مطوية.', de: 'Ein Bein gestreckt, anderes getuckt.' },
      ],
      isHold: true,
      unlockCriterion: { ar: '12 ث × 3.', de: '12s × 3.' },
      difficulty: 7,
      weeksAverage: 10,
    },
    {
      key: 'straddle_bl',
      name: { ar: 'باك ليفر مفتوح الرجلين', de: 'Straddle BL' },
      target: { holdSec: 10, sets: 3 },
      cues: [
        { ar: 'رجلان مفتوحتان للجانب.', de: 'Beine seitlich gespreizt.' },
      ],
      isHold: true,
      unlockCriterion: { ar: '10 ث × 3.', de: '10s × 3.' },
      difficulty: 8,
      weeksAverage: 14,
    },
    {
      key: 'full_bl',
      name: { ar: 'باك ليفر كامل', de: 'Vollständiger BL' },
      target: { holdSec: 5, sets: 3 },
      cues: [
        { ar: 'جسم خط أفقي مستقيم.', de: 'Körper komplett horizontal.' },
      ],
      isHold: true,
      unlockCriterion: { ar: '5 ث × 3.', de: '5s × 3.' },
      difficulty: 9,
      weeksAverage: 24,
    },
  ],
};

/* ──────────────── 9) Planche ──────────────── */

const PLANCHE: SkillDef = {
  key: 'planche',
  name: { ar: 'بلانش', de: 'Planche' },
  category: 'static',
  difficulty: 10,
  color: '#f97316',
  emoji: '✈️',
  primaryMuscles: ['shoulders', 'chest', 'core'],
  secondaryMuscles: ['biceps', 'forearms'],
  prerequisites: [{ skillKey: 'pushUp', minStep: 5 }, { skillKey: 'handstand', minStep: 3 }],
  tagline: { ar: 'الطفو على اليدين', de: 'Schweben auf den Händen' },
  about: {
    ar: 'الـ planche قمة الكاليستنيكس الثابت. سنوات من العمل لكن مكافأته شعور لا يضاهى.',
    de: 'Planche — Krone der statischen Calisthenics. Jahre Arbeit, aber unvergleichlich belohnt.',
  },
  steps: [
    {
      key: 'lean',
      name: { ar: 'ميل planche', de: 'Planche Lean' },
      target: { holdSec: 30, sets: 3 },
      cues: [
        { ar: 'ميل أمامي مع مرفق مقفول.', de: 'Vorlage mit gestrecktem Ellbogen.' },
      ],
      isHold: true,
      unlockCriterion: { ar: '30 ث × 3.', de: '30s × 3.' },
      difficulty: 4,
      weeksAverage: 4,
    },
    {
      key: 'pseudo_pu',
      name: { ar: 'ضغط بلانش زائف', de: 'Pseudo-Planche-PU' },
      target: { reps: 8, sets: 3 },
      cues: [
        { ar: 'يدان للوراء قرب الورك ثم انزل.', de: 'Hände hinten neben Hüfte, ablassen.' },
      ],
      unlockCriterion: { ar: '8 × 3.', de: '8 × 3.' },
      difficulty: 5,
      weeksAverage: 6,
    },
    {
      key: 'frog',
      name: { ar: 'وقوف الضفدع', de: 'Frog Stand' },
      target: { holdSec: 30, sets: 3 },
      cues: [
        { ar: 'ركبتان على المرفقين.', de: 'Knie auf Ellbogen.' },
      ],
      isHold: true,
      unlockCriterion: { ar: '30 ث × 3.', de: '30s × 3.' },
      difficulty: 5,
      weeksAverage: 6,
    },
    {
      key: 'tuck_pl',
      name: { ar: 'بلانش مطوي', de: 'Tuck Planche' },
      target: { holdSec: 12, sets: 3 },
      cues: [
        { ar: 'ركبتان عاليتان، ظهر منبسط.', de: 'Knie hoch, Rücken flach.' },
      ],
      isHold: true,
      unlockCriterion: { ar: '12 ث × 3.', de: '12s × 3.' },
      difficulty: 6,
      weeksAverage: 8,
    },
    {
      key: 'adv_tuck_pl',
      name: { ar: 'بلانش مطوي مفتوح', de: 'Adv. Tuck Planche' },
      target: { holdSec: 10, sets: 3 },
      cues: [
        { ar: 'ركبتان مفتوحتان عن الجذع.', de: 'Knie geöffnet vom Rumpf.' },
      ],
      isHold: true,
      unlockCriterion: { ar: '10 ث × 3.', de: '10s × 3.' },
      difficulty: 8,
      weeksAverage: 12,
    },
    {
      key: 'straddle_pl',
      name: { ar: 'بلانش مفتوح الرجلين', de: 'Straddle Planche' },
      target: { holdSec: 5, sets: 3 },
      cues: [
        { ar: 'رجلان مفتوحتان جانبياً.', de: 'Beine seitlich gespreizt.' },
      ],
      isHold: true,
      unlockCriterion: { ar: '5 ث × 3.', de: '5s × 3.' },
      difficulty: 9,
      weeksAverage: 24,
    },
    {
      key: 'full_pl',
      name: { ar: 'بلانش كامل', de: 'Vollständiger Planche' },
      target: { holdSec: 3, sets: 3 },
      cues: [
        { ar: 'جسم خط مستقيم — قمة كل شيء.', de: 'Körper komplett gerade — Spitzenleistung.' },
      ],
      isHold: true,
      unlockCriterion: { ar: '3 ث × 3.', de: '3s × 3.' },
      difficulty: 10,
      weeksAverage: 52,
    },
    {
      key: 'planche_pu',
      name: { ar: 'ضغط بلانش', de: 'Planche Push-up' },
      target: { reps: 3, sets: 3 },
      cues: [
        { ar: 'دفع من وضع planche الكامل.', de: 'Aus vollem Planche drücken.' },
      ],
      unlockCriterion: { ar: '3 × 3.', de: '3 × 3.' },
      difficulty: 10,
      weeksAverage: 78,
    },
  ],
};

/* ──────────────── 10) Muscle-up ──────────────── */

const MUSCLE_UP: SkillDef = {
  key: 'muscleUp',
  name: { ar: 'ماصل أب', de: 'Muscle-Up' },
  category: 'dynamic',
  difficulty: 8,
  color: '#6366f1',
  emoji: '🎯',
  primaryMuscles: ['back', 'triceps', 'chest'],
  secondaryMuscles: ['core', 'shoulders'],
  prerequisites: [{ skillKey: 'pullUp', minStep: 4 }, { skillKey: 'dip', minStep: 2 }],
  tagline: { ar: 'سحب وعبور', de: 'Zug und Übergang' },
  about: {
    ar: 'الماصل أب يجمع السحب والعبور والديبس في حركة واحدة. علامة حقيقية على القوة الديناميكية.',
    de: 'Muscle-Up vereint Zug, Übergang und Dip in einer Bewegung. Echtes Zeichen dynamischer Kraft.',
  },
  steps: [
    {
      key: 'high_pull',
      name: { ar: 'سحب عالٍ', de: 'High Pull-up' },
      target: { reps: 5, sets: 3 },
      cues: [
        { ar: 'اسحب البار للصدر السفلي.', de: 'Stange zur unteren Brust ziehen.' },
      ],
      unlockCriterion: { ar: '5 × 3 بقمة عالية.', de: '5 × 3 mit hoher Spitze.' },
      difficulty: 5,
      weeksAverage: 6,
    },
    {
      key: 'explosive_pull',
      name: { ar: 'سحب انفجاري', de: 'Explosiver Klimmzug' },
      target: { reps: 5, sets: 3 },
      cues: [
        { ar: 'سحب أقصى سرعة، فوق الذقن بكثير.', de: 'Maximalgeschwindigkeit, weit übers Kinn.' },
      ],
      unlockCriterion: { ar: '5 × 3 بسرعة.', de: '5 × 3 explosiv.' },
      difficulty: 6,
      weeksAverage: 8,
    },
    {
      key: 'negative',
      name: { ar: 'ماصل أب سلبي', de: 'Negativ Muscle-Up' },
      target: { reps: 3, sets: 3 },
      cues: [
        { ar: 'ابدأ من القمة، انزل تحكماً.', de: 'Aus Top-Position kontrolliert ablassen.' },
      ],
      unlockCriterion: { ar: '3 × 3 بـ 4-5 ث نزول.', de: '3 × 3 mit 4-5s Eccentric.' },
      difficulty: 7,
      weeksAverage: 10,
    },
    {
      key: 'kipping',
      name: { ar: 'ماصل أب قفز', de: 'Kipping Muscle-Up' },
      target: { reps: 3, sets: 3 },
      cues: [
        { ar: 'استخدم زخم القدمين قليلاً.', de: 'Leichter Beinimpuls erlaubt.' },
      ],
      unlockCriterion: { ar: '3 × 3.', de: '3 × 3.' },
      difficulty: 7,
      weeksAverage: 12,
    },
    {
      key: 'strict_bar',
      name: { ar: 'ماصل أب صارم بار', de: 'Strict Bar MU' },
      target: { reps: 3, sets: 3 },
      cues: [
        { ar: 'بلا قفز، ميل أمامي عند العبور.', de: 'Kein Schwung, beim Übergang nach vorn lehnen.' },
      ],
      unlockCriterion: { ar: '3 × 3 صارم.', de: '3 × 3 streng.' },
      difficulty: 8,
      weeksAverage: 18,
    },
    {
      key: 'slow_mu',
      name: { ar: 'ماصل أب بطيء', de: 'Slow Muscle-Up' },
      target: { reps: 3, sets: 3 },
      cues: [
        { ar: 'صعود 3 ث لكل تكرارة.', de: '3s pro Wdh. nach oben.' },
      ],
      unlockCriterion: { ar: '3 × 3 ببطء.', de: '3 × 3 langsam.' },
      difficulty: 9,
      weeksAverage: 24,
    },
    {
      key: 'ring_mu',
      name: { ar: 'ماصل أب حلقات', de: 'Ring Muscle-Up' },
      target: { reps: 3, sets: 3 },
      cues: [
        { ar: 'قبضة كاذبة + تحول للحلقات.', de: 'Falscher Griff + Ring-Übergang.' },
      ],
      unlockCriterion: { ar: '3 × 3 حلقات.', de: '3 × 3 an Ringen.' },
      difficulty: 9,
      weeksAverage: 30,
    },
    {
      key: 'strict_ring',
      name: { ar: 'ماصل أب حلقات صارم', de: 'Strict Ring MU' },
      target: { reps: 3, sets: 3 },
      cues: [
        { ar: 'بلا قفز، حلقات.', de: 'Streng ohne Schwung an Ringen.' },
      ],
      unlockCriterion: { ar: '3 × 3 صارم على الحلقات.', de: '3 × 3 streng an Ringen.' },
      difficulty: 10,
      weeksAverage: 52,
    },
  ],
};

/* ──────────────── 11) Human Flag ──────────────── */

const HUMAN_FLAG: SkillDef = {
  key: 'humanFlag',
  name: { ar: 'العلم البشري', de: 'Human Flag' },
  category: 'static',
  difficulty: 9,
  color: '#be185d',
  emoji: '🚩',
  primaryMuscles: ['shoulders', 'core'],
  secondaryMuscles: ['back'],
  prerequisites: [{ skillKey: 'pullUp', minStep: 4 }, { skillKey: 'pushUp', minStep: 4 }],
  tagline: { ar: 'تحدّي الجاذبية أفقياً', de: 'Schwerkraft horizontal trotzen' },
  about: {
    ar: 'العلم البشري حركة بصرية مذهلة تتحدّى الجاذبية. تتطلب قوة جانبية وتنسيق كتف ظهر استثنائي.',
    de: 'Human Flag trotzt der Gravitation horizontal — fordert seitliche Kraft und Schulter-Rücken-Koordination.',
  },
  steps: [
    {
      key: 'side_plank',
      name: { ar: 'جانبي بلانك 60 ث', de: 'Seitliche Planke 60s' },
      target: { holdSec: 60, sets: 3 },
      cues: [{ ar: 'جذع مشدود.', de: 'Core fest.' }],
      isHold: true,
      unlockCriterion: { ar: '60 ث لكل جانب.', de: '60s pro Seite.' },
      difficulty: 3,
      weeksAverage: 3,
    },
    {
      key: 'vertical_flag',
      name: { ar: 'علم عمودي', de: 'Vertikale Flagge' },
      target: { holdSec: 10, sets: 3 },
      cues: [{ ar: 'جسم عمودي على عمود — لا أفقي بعد.', de: 'Körper vertikal an Stange — noch nicht horizontal.' }],
      isHold: true,
      unlockCriterion: { ar: '10 ث × 3.', de: '10s × 3.' },
      difficulty: 5,
      weeksAverage: 6,
    },
    {
      key: 'tuck_flag',
      name: { ar: 'علم مطوي', de: 'Getuckte Flagge' },
      target: { holdSec: 8, sets: 3 },
      cues: [{ ar: 'ركبتان للصدر.', de: 'Knie zur Brust.' }],
      isHold: true,
      unlockCriterion: { ar: '8 ث × 3.', de: '8s × 3.' },
      difficulty: 6,
      weeksAverage: 8,
    },
    {
      key: 'one_leg_flag',
      name: { ar: 'علم برجل', de: 'Einbein-Flagge' },
      target: { holdSec: 8, sets: 3 },
      cues: [{ ar: 'رجل ممدودة، الأخرى مطوية.', de: 'Ein Bein gestreckt, anderes getuckt.' }],
      isHold: true,
      unlockCriterion: { ar: '8 ث × 3.', de: '8s × 3.' },
      difficulty: 7,
      weeksAverage: 12,
    },
    {
      key: 'straddle_flag',
      name: { ar: 'علم مفتوح الرجلين', de: 'Straddle-Flagge' },
      target: { holdSec: 5, sets: 3 },
      cues: [{ ar: 'رجلان مفتوحتان.', de: 'Beine gespreizt.' }],
      isHold: true,
      unlockCriterion: { ar: '5 ث × 3.', de: '5s × 3.' },
      difficulty: 8,
      weeksAverage: 18,
    },
    {
      key: 'full_flag_5s',
      name: { ar: 'علم كامل 5 ث', de: 'Volle Flagge 5s' },
      target: { holdSec: 5, sets: 3 },
      cues: [{ ar: 'جسم أفقي تام.', de: 'Körper komplett horizontal.' }],
      isHold: true,
      unlockCriterion: { ar: '5 ث × 3.', de: '5s × 3.' },
      difficulty: 9,
      weeksAverage: 30,
    },
    {
      key: 'full_flag_15s',
      name: { ar: 'علم كامل 15 ث', de: 'Volle Flagge 15s' },
      target: { holdSec: 15, sets: 3 },
      cues: [{ ar: 'تحكم نَفَس وثبات.', de: 'Atemkontrolle und Stabilität.' }],
      isHold: true,
      unlockCriterion: { ar: '15 ث × 3.', de: '15s × 3.' },
      difficulty: 10,
      weeksAverage: 52,
    },
  ],
};

/* ──────────────── 12) Dragon Flag ──────────────── */

const DRAGON_FLAG: SkillDef = {
  key: 'dragonFlag',
  name: { ar: 'علم التنين', de: 'Dragon Flag' },
  category: 'core',
  difficulty: 7,
  color: '#7c3aed',
  emoji: '🐉',
  primaryMuscles: ['core'],
  secondaryMuscles: ['back', 'shoulders'],
  tagline: { ar: 'بطن بروس لي', de: 'Bruce Lees Bauch' },
  about: {
    ar: 'علم التنين — اختراع بروس لي الشخصي. يبني عضلات بطن مستقرة فولاذية.',
    de: 'Dragon Flag — Bruce Lees eigene Erfindung. Baut stählerne Stabilität.',
  },
  steps: [
    {
      key: 'hollow_hold',
      name: { ar: 'تجويف 30 ث', de: 'Hollow Hold 30s' },
      target: { holdSec: 30, sets: 3 },
      cues: [{ ar: 'كتفان عن الأرض، أسفل الظهر مضغوط.', de: 'Schultern vom Boden, Lende gedrückt.' }],
      isHold: true,
      unlockCriterion: { ar: '30 ث × 3.', de: '30s × 3.' },
      difficulty: 3,
      weeksAverage: 3,
    },
    {
      key: 'tuck_df',
      name: { ar: 'علم تنين مطوي', de: 'Tuck Dragon Flag' },
      target: { reps: 8, sets: 3 },
      cues: [{ ar: 'ركبتان مطويتان، ورك مرفوع.', de: 'Knie getuckt, Hüfte hoch.' }],
      unlockCriterion: { ar: '8 × 3.', de: '8 × 3.' },
      difficulty: 5,
      weeksAverage: 6,
    },
    {
      key: 'one_leg_df',
      name: { ar: 'علم تنين برجل', de: 'Einbein Dragon Flag' },
      target: { reps: 6, sets: 3 },
      cues: [{ ar: 'رجل ممدودة، الأخرى مطوية.', de: 'Ein Bein gerade, anderes getuckt.' }],
      unlockCriterion: { ar: '6 × 3.', de: '6 × 3.' },
      difficulty: 6,
      weeksAverage: 8,
    },
    {
      key: 'straddle_df',
      name: { ar: 'علم تنين مفتوح', de: 'Straddle DF' },
      target: { reps: 6, sets: 3 },
      cues: [{ ar: 'رجلان مفتوحتان.', de: 'Beine gespreizt.' }],
      unlockCriterion: { ar: '6 × 3.', de: '6 × 3.' },
      difficulty: 7,
      weeksAverage: 12,
    },
    {
      key: 'full_neg',
      name: { ar: 'علم كامل سلبي', de: 'Voller DF Negativ' },
      target: { reps: 5, sets: 3 },
      cues: [{ ar: 'انزل ببطء 4-5 ث.', de: 'Langsam ablassen 4-5s.' }],
      unlockCriterion: { ar: '5 × 3.', de: '5 × 3.' },
      difficulty: 8,
      weeksAverage: 16,
    },
    {
      key: 'full_3',
      name: { ar: 'علم تنين كامل ×3', de: 'Voller DF × 3' },
      target: { reps: 3, sets: 3 },
      cues: [{ ar: 'جسم خط مستقيم في النزول والصعود.', de: 'Körper gerade in beiden Richtungen.' }],
      unlockCriterion: { ar: '3 × 3.', de: '3 × 3.' },
      difficulty: 9,
      weeksAverage: 24,
    },
    {
      key: 'full_8',
      name: { ar: 'علم تنين كامل ×8', de: 'Voller DF × 8' },
      target: { reps: 8, sets: 3 },
      cues: [{ ar: 'تكرارات نظيفة كاملة.', de: 'Saubere volle Wdh.' }],
      unlockCriterion: { ar: '8 × 3.', de: '8 × 3.' },
      difficulty: 10,
      weeksAverage: 36,
    },
  ],
};

/* ──────────────── 13) Nordic Curl ──────────────── */

const NORDIC_CURL: SkillDef = {
  key: 'nordicCurl',
  name: { ar: 'نوردك كيرل', de: 'Nordic Curl' },
  category: 'legs',
  difficulty: 7,
  color: '#dc2626',
  emoji: '🔥',
  primaryMuscles: ['hamstrings'],
  secondaryMuscles: ['glutes', 'calves'],
  tagline: { ar: 'سلاح الفخذ الخلفي', de: 'Hamstring-Killer' },
  about: {
    ar: 'النوردك كيرل أقوى تمرين خلفية فخذ بوزن الجسم — يقي الإصابات ويبني قوة جذرية.',
    de: 'Nordic Curl — stärkste KG-Hamstring-Übung; verletzungspräventiv und kraftaufbauend.',
  },
  steps: [
    {
      key: 'slide',
      name: { ar: 'انزلاق فخذ خلفي', de: 'Hamstring-Slide' },
      target: { reps: 12, sets: 3 },
      cues: [{ ar: 'منشفة تحت قدمين، اسحب الجسم.', de: 'Handtuch unter Füßen, Körper ziehen.' }],
      unlockCriterion: { ar: '12 × 3.', de: '12 × 3.' },
      difficulty: 3,
      weeksAverage: 3,
    },
    {
      key: 'top_30',
      name: { ar: 'سلبي علوي 30°', de: 'Eccentric Top 30°' },
      target: { reps: 8, sets: 3 },
      cues: [{ ar: 'انزل ببطء أول 30°.', de: 'Erste 30° langsam ablassen.' }],
      unlockCriterion: { ar: '8 × 3.', de: '8 × 3.' },
      difficulty: 5,
      weeksAverage: 5,
    },
    {
      key: 'top_60',
      name: { ar: 'سلبي علوي 60°', de: 'Eccentric 60°' },
      target: { reps: 8, sets: 3 },
      cues: [{ ar: 'مدى أعمق.', de: 'Größere Range.' }],
      unlockCriterion: { ar: '8 × 3.', de: '8 × 3.' },
      difficulty: 6,
      weeksAverage: 7,
    },
    {
      key: 'full_neg',
      name: { ar: 'سلبي كامل', de: 'Voller Eccentric' },
      target: { reps: 6, sets: 3 },
      cues: [{ ar: 'انزل تحكماً 4-5 ث.', de: 'Kontrolliert 4-5s ablassen.' }],
      unlockCriterion: { ar: '6 × 3.', de: '6 × 3.' },
      difficulty: 7,
      weeksAverage: 10,
    },
    {
      key: 'partial_concentric',
      name: { ar: 'صعود جزئي', de: 'Partielle Konzentrik' },
      target: { reps: 4, sets: 3 },
      cues: [{ ar: 'دفع جزئي مع يد على أرض.', de: 'Teilweises Drücken mit Hand am Boden.' }],
      unlockCriterion: { ar: '4 × 3.', de: '4 × 3.' },
      difficulty: 8,
      weeksAverage: 14,
    },
    {
      key: 'full_curl',
      name: { ar: 'نوردك كامل', de: 'Voller Nordic Curl' },
      target: { reps: 3, sets: 3 },
      cues: [{ ar: 'بلا يد — تكرارة كاملة.', de: 'Ohne Hände — volle Wdh.' }],
      unlockCriterion: { ar: '3 × 3.', de: '3 × 3.' },
      difficulty: 9,
      weeksAverage: 24,
    },
  ],
};

/* ──────────────── 14) Pike Press to HS ──────────────── */

const PRESS_TO_HS: SkillDef = {
  key: 'press2HS',
  name: { ar: 'ضغط للوقوف على اليدين', de: 'Press to Handstand' },
  category: 'static',
  difficulty: 9,
  color: '#0d9488',
  emoji: '🔺',
  primaryMuscles: ['shoulders', 'core'],
  secondaryMuscles: ['traps'],
  prerequisites: [{ skillKey: 'handstand', minStep: 4 }, { skillKey: 'lSit', minStep: 3 }],
  tagline: { ar: 'صعود رشيق بقوة خالصة', de: 'Eleganter Aufstieg durch reine Kraft' },
  about: {
    ar: 'الـ press to HS انتقال من L-sit أو straddle إلى وقوف يدين — قمة قوة الكتف وتحكم الجذع.',
    de: 'Press to HS — Übergang aus L-Sit/Straddle in Handstand; Schulterkraft & Core-Kontrolle.',
  },
  steps: [
    {
      key: 'lsit_30',
      name: { ar: 'L-sit 30 ث', de: 'L-Sit 30s' },
      target: { holdSec: 30, sets: 3 },
      cues: [{ ar: 'ثبات تام.', de: 'Vollständig stabil.' }],
      isHold: true,
      unlockCriterion: { ar: '30 ث × 3.', de: '30s × 3.' },
      difficulty: 5,
      weeksAverage: 6,
    },
    {
      key: 'straddle_neg',
      name: { ar: 'سلبي straddle press', de: 'Negativ Straddle Press' },
      target: { reps: 5, sets: 3 },
      cues: [{ ar: 'انزل ببطء من HS إلى straddle.', de: 'Langsam von HS in Straddle ablassen.' }],
      unlockCriterion: { ar: '5 × 3.', de: '5 × 3.' },
      difficulty: 7,
      weeksAverage: 10,
    },
    {
      key: 'wall_straddle',
      name: { ar: 'straddle press بالحائط', de: 'Wand-Straddle-Press' },
      target: { reps: 5, sets: 3 },
      cues: [{ ar: 'الظهر للحائط — يساعد التوازن.', de: 'Rücken an Wand — hilft balanieren.' }],
      unlockCriterion: { ar: '5 × 3.', de: '5 × 3.' },
      difficulty: 8,
      weeksAverage: 14,
    },
    {
      key: 'straddle_press',
      name: { ar: 'straddle press حر', de: 'Freie Straddle Press' },
      target: { reps: 3, sets: 3 },
      cues: [{ ar: 'بلا حائط — قوة خالصة.', de: 'Ohne Wand — reine Kraft.' }],
      unlockCriterion: { ar: '3 × 3.', de: '3 × 3.' },
      difficulty: 9,
      weeksAverage: 24,
    },
    {
      key: 'pike_neg',
      name: { ar: 'pike press سلبي', de: 'Negativ Pike Press' },
      target: { reps: 5, sets: 3 },
      cues: [{ ar: 'رجلان مغلقتان.', de: 'Beine geschlossen.' }],
      unlockCriterion: { ar: '5 × 3.', de: '5 × 3.' },
      difficulty: 9,
      weeksAverage: 30,
    },
    {
      key: 'full_pike',
      name: { ar: 'pike press كامل', de: 'Voller Pike Press' },
      target: { reps: 3, sets: 3 },
      cues: [{ ar: 'قمة المرونة والقوة.', de: 'Spitze von Mobilität und Kraft.' }],
      unlockCriterion: { ar: '3 × 3.', de: '3 × 3.' },
      difficulty: 10,
      weeksAverage: 52,
    },
  ],
};

/* ──────────────── Index ──────────────── */

export const SKILLS: SkillDef[] = [
  PUSH_UP,
  PULL_UP,
  DIP,
  SQUAT,
  L_SIT,
  HANDSTAND,
  FRONT_LEVER,
  BACK_LEVER,
  PLANCHE,
  MUSCLE_UP,
  HUMAN_FLAG,
  DRAGON_FLAG,
  NORDIC_CURL,
  PRESS_TO_HS,
];

export const SKILLS_BY_KEY: Record<string, SkillDef> = Object.fromEntries(
  SKILLS.map((s) => [s.key, s]),
);

export function skillByKey(key: string): SkillDef | null {
  return SKILLS_BY_KEY[key] ?? null;
}

export function skillsByCategory(category: SkillDef['category']): SkillDef[] {
  return SKILLS.filter((s) => s.category === category);
}

/** Skills sorted by difficulty (ascending). */
export function skillsByDifficulty(): SkillDef[] {
  return [...SKILLS].sort((a, b) => a.difficulty - b.difficulty);
}

/* ──────────────── Prerequisite resolution ──────────────── */

/**
 * For a given skill, return the prerequisite skills the user has not yet
 * cleared. `userProgress` maps skillKey → step index achieved.
 */
export function unmetPrerequisites(
  skillKey: string,
  userProgress: Record<string, number>,
): { skillKey: string; minStep: number; userStep: number }[] {
  const skill = skillByKey(skillKey);
  if (!skill?.prerequisites) return [];
  const result: { skillKey: string; minStep: number; userStep: number }[] = [];
  for (const pre of skill.prerequisites) {
    const userStep = userProgress[pre.skillKey] ?? 0;
    if (userStep < pre.minStep) {
      result.push({ skillKey: pre.skillKey, minStep: pre.minStep, userStep });
    }
  }
  return result;
}

/**
 * Returns true when the user has met all prerequisites for the given skill.
 */
export function isUnlocked(
  skillKey: string,
  userProgress: Record<string, number>,
): boolean {
  return unmetPrerequisites(skillKey, userProgress).length === 0;
}

export const CATEGORY_LABEL: Record<SkillDef['category'], { ar: string; de: string }> = {
  push:    { ar: 'دفع',     de: 'Drücken' },
  pull:    { ar: 'سحب',     de: 'Ziehen'  },
  legs:    { ar: 'أرجل',    de: 'Beine'   },
  core:    { ar: 'جذع',     de: 'Rumpf'   },
  static:  { ar: 'ثابت',    de: 'Statisch'},
  dynamic: { ar: 'ديناميكي', de: 'Dynamisch' },
};
