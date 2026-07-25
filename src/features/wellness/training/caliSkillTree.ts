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
  name: { ar: 'تمرين الضغط', },
  category: 'push',
  difficulty: 4,
  color: '#ef4444',
  emoji: '💪',
  primaryMuscles: ['chest', 'triceps'],
  secondaryMuscles: ['shoulders', 'core'],
  tagline: { ar: 'بداية كل قصة دفع', },
  about: {
    ar: 'تمرين الضغط هو الأساس الذي تبنى عليه كل تمارين الدفع المتقدمة. إتقانه بمدى كامل وعمق وزخم نظيف يفتح الباب للديبس والـ HSPU والبلانش.',
  },
  steps: [
    {
      key: 'wall',
      name: { ar: 'ضغط على الحائط', },
      target: { reps: 15, sets: 3 },
      cues: [
        { ar: 'الجسم خط مستقيم من الكعب للرأس.', },
        { ar: 'لمس الحائط بالأنف برفق.', },
      ],
      mistakes: [
        { ar: 'انحناء الورك للداخل.', },
      ],
      unlockCriterion: { ar: '15 تكرار × 3 مجموعات بشكل سليم.', },
      regressions: [{ ar: 'قف أبعد عن الحائط لتقليل الزاوية.', }],
      difficulty: 1,
      weeksAverage: 1,
    },
    {
      key: 'incline',
      name: { ar: 'ضغط مائل', },
      target: { reps: 12, sets: 3 },
      cues: [
        { ar: 'يد على طاولة أو حافة سرير ثابتة.', },
        { ar: 'كلما انخفض السطح، كلما صعب التمرين.', },
      ],
      unlockCriterion: { ar: '12 × 3 بمدى كامل وثبات تام.', },
      regressions: [{ ar: 'ارفع السطح أكثر — درج أعلى.', }],
      difficulty: 2,
      weeksAverage: 2,
    },
    {
      key: 'knee',
      name: { ar: 'ضغط على الركبة', },
      target: { reps: 12, sets: 3 },
      cues: [
        { ar: 'الركبة + اليد + الورك خط مستقيم.', },
        { ar: 'لا تجلس على الكعب.', },
      ],
      mistakes: [
        { ar: 'ورك مرفوع — التمرين يصبح "downward dog".', },
      ],
      unlockCriterion: { ar: '12 × 3 بشكل صارم.', },
      difficulty: 3,
      weeksAverage: 3,
    },
    {
      key: 'standard',
      name: { ar: 'ضغط قياسي', },
      target: { reps: 15, sets: 3 },
      cues: [
        { ar: 'صدر يلامس الأرض في كل تكرارة.', },
        { ar: 'مرفقان لا يفتحان أكثر من 60°.', },
        { ar: 'بطن وأرداف مشدودان طوال الحركة.', },
      ],
      unlockCriterion: { ar: '15 × 3 بمدى كامل.', },
      difficulty: 4,
      weeksAverage: 4,
    },
    {
      key: 'diamond',
      name: { ar: 'ضغط الماس', },
      target: { reps: 10, sets: 3 },
      cues: [
        { ar: 'يدان معاً تحت الصدر — السبابة والإبهام يكوّنان ماساً.', },
        { ar: 'مرفقان للخلف لتركيز الترايسبس.', },
      ],
      unlockCriterion: { ar: '10 × 3 بدون فتح اليدين.', },
      difficulty: 5,
      weeksAverage: 4,
    },
    {
      key: 'decline',
      name: { ar: 'ضغط منخفض', },
      target: { reps: 12, sets: 3 },
      cues: [
        { ar: 'القدم على كرسي 30-50 سم.', },
        { ar: 'يحفّز الجزء العلوي من الصدر والأكتاف.', },
      ],
      unlockCriterion: { ar: '12 × 3 بمدى كامل.', },
      difficulty: 5,
      weeksAverage: 5,
    },
    {
      key: 'archer',
      name: { ar: 'ضغط الرامي', },
      target: { reps: 6, sets: 3 },
      cues: [
        { ar: 'يد ممدودة جانباً، الأخرى تنزل بك.', },
        { ar: 'بدّل بين الجوانب بنعومة.', },
      ],
      unlockCriterion: { ar: '6 لكل جانب × 3.', },
      difficulty: 7,
      weeksAverage: 8,
    },
    {
      key: 'one_arm',
      name: { ar: 'ضغط بيد واحدة', },
      target: { reps: 5, sets: 3 },
      cues: [
        { ar: 'افتح القدمين للتوازن.', },
        { ar: 'الورك لا يدور — جذع ثابت.', },
      ],
      unlockCriterion: { ar: '5 × 3 لكل ذراع — قمة الإتقان.', },
      regressions: [{ ar: 'ابدأ على الحائط ثم على سطح مائل.', }],
      difficulty: 9,
      weeksAverage: 24,
    },
  ],
};

/* ──────────────── 2) Pull-up family ──────────────── */

const PULL_UP: SkillDef = {
  key: 'pullUp',
  name: { ar: 'العقلة', },
  category: 'pull',
  difficulty: 6,
  color: '#3b82f6',
  emoji: '🔝',
  primaryMuscles: ['back', 'biceps'],
  secondaryMuscles: ['forearms', 'core'],
  tagline: { ar: 'مقياس القوة العلوية الأول', },
  about: {
    ar: 'العقلة هي عَلَم القوة في عالم الكاليستنيكس. اكتسابها يفتح الباب للماصل أب والفرنت ليفر والعَلَم.',
  },
  steps: [
    {
      key: 'dead_hang',
      name: { ar: 'تعليق ميّت 30 ث', },
      target: { holdSec: 30, sets: 3 },
      cues: [
        { ar: 'كتفان للأسفل ولوحان مفعلان.', },
        { ar: 'قبضة كاملة وشد البطن.', },
      ],
      isHold: true,
      unlockCriterion: { ar: '30 ث × 3 بدون ألم.', },
      difficulty: 2,
      weeksAverage: 2,
    },
    {
      key: 'scapular',
      name: { ar: 'سحب لوحَي الكتف', },
      target: { reps: 10, sets: 3 },
      cues: [
        { ar: 'حرّك الكتفين فقط — الذراعان تبقيان مستقيمتين.', },
        { ar: '"اسحب نفسك لأعلى بنصف بوصة فقط".', },
      ],
      unlockCriterion: { ar: '10 × 3 تحكم كامل.', },
      difficulty: 3,
      weeksAverage: 2,
    },
    {
      key: 'negative',
      name: { ar: 'عقلة سلبية', },
      target: { reps: 5, sets: 3, holdSec: 5 },
      cues: [
        { ar: 'اقفز للأعلى ثم انزل ببطء 4-5 ثوانٍ.', },
      ],
      unlockCriterion: { ar: '5 × 3 بنزول 5 ث لكل تكرارة.', },
      difficulty: 4,
      weeksAverage: 4,
    },
    {
      key: 'band_assisted',
      name: { ar: 'عقلة بمطّاط', },
      target: { reps: 8, sets: 3 },
      cues: [
        { ar: 'مطاط حول البار ووضع القدم.', },
        { ar: 'قلّل من سُمك المطاط تدريجياً.', },
      ],
      unlockCriterion: { ar: '8 × 3 بمطاط متوسط.', },
      difficulty: 5,
      weeksAverage: 6,
    },
    {
      key: 'standard',
      name: { ar: 'عقلة قياسية', },
      target: { reps: 5, sets: 3 },
      cues: [
        { ar: 'البار يصل إلى الذقن — مدى كامل.', },
        { ar: 'لا تأرجح — كل تكرارة من تعليق نشط.', },
        { ar: 'انزل تحكماً 2-3 ث.', },
      ],
      unlockCriterion: { ar: '5 × 3 صارمة.', },
      difficulty: 6,
      weeksAverage: 8,
    },
    {
      key: 'wide',
      name: { ar: 'عقلة واسعة', },
      target: { reps: 8, sets: 3 },
      cues: [
        { ar: 'قبضة 1.5× عرض الكتف.', },
        { ar: 'تركيز أعلى على ظهر علوي.', },
      ],
      unlockCriterion: { ar: '8 × 3.', },
      difficulty: 7,
      weeksAverage: 4,
    },
    {
      key: 'lsit_pullup',
      name: { ar: 'عقلة L-sit', },
      target: { reps: 6, sets: 3 },
      cues: [
        { ar: 'احتفظ بـ L-sit طوال الحركة.', },
      ],
      unlockCriterion: { ar: '6 × 3 بدون فقدان L-sit.', },
      difficulty: 8,
      weeksAverage: 12,
    },
    {
      key: 'archer',
      name: { ar: 'عقلة الرامي', },
      target: { reps: 4, sets: 3 },
      cues: [
        { ar: 'ذراع تسحب، الأخرى ممدودة جانباً.', },
      ],
      unlockCriterion: { ar: '4 لكل جانب × 3.', },
      difficulty: 8,
      weeksAverage: 12,
    },
    {
      key: 'typewriter',
      name: { ar: 'عقلة الكاتبة', },
      target: { reps: 4, sets: 3 },
      cues: [
        { ar: 'اسحب لأعلى ثم انزلق إلى يد ثم الأخرى.', },
      ],
      unlockCriterion: { ar: '4 لكل جانب × 3.', },
      difficulty: 9,
      weeksAverage: 16,
    },
  ],
};

/* ──────────────── 3) Dip family ──────────────── */

const DIP: SkillDef = {
  key: 'dip',
  name: { ar: 'ديبس', },
  category: 'push',
  difficulty: 6,
  color: '#f59e0b',
  emoji: '🦅',
  primaryMuscles: ['triceps', 'chest'],
  secondaryMuscles: ['shoulders'],
  tagline: { ar: 'بنش الكاليستنيكس', },
  about: {
    ar: 'الديبس مكافئ بنش برس في عالم وزن الجسم. أساس الترايسبس الضخم وتحضير لازم للماصل أب.',
  },
  steps: [
    {
      key: 'bench_dip',
      name: { ar: 'ديبس على مقعد', },
      target: { reps: 12, sets: 3 },
      cues: [
        { ar: 'يدان على حافة كرسي، رجلان ممدودتان.', },
        { ar: 'الكوع لا يفتح — يبقى للخلف.', },
      ],
      unlockCriterion: { ar: '12 × 3.', },
      difficulty: 2,
      weeksAverage: 2,
    },
    {
      key: 'negative_dip',
      name: { ar: 'ديبس سلبي', },
      target: { reps: 5, sets: 3, holdSec: 5 },
      cues: [
        { ar: 'اقفز إلى وضع القمة وانزل تحكماً 4-5 ث.', },
      ],
      unlockCriterion: { ar: '5 × 3 بنزول نظيف.', },
      difficulty: 4,
      weeksAverage: 4,
    },
    {
      key: 'parallel',
      name: { ar: 'ديبس متوازي', },
      target: { reps: 8, sets: 3 },
      cues: [
        { ar: 'انزل حتى الكتف بمستوى المرفق.', },
        { ar: 'ميل أمامي 15° لتنشيط الصدر.', },
      ],
      unlockCriterion: { ar: '8 × 3 بمدى كامل.', },
      difficulty: 6,
      weeksAverage: 8,
    },
    {
      key: 'ring_dip',
      name: { ar: 'ديبس الحلقات', },
      target: { reps: 6, sets: 3 },
      cues: [
        { ar: 'حلقات متوازية في القمة (RTO turn-out).', },
        { ar: 'ثبات أكبر — تحدٍّ توازني.', },
      ],
      unlockCriterion: { ar: '6 × 3 على الحلقات.', },
      difficulty: 7,
      weeksAverage: 10,
    },
    {
      key: 'weighted',
      name: { ar: 'ديبس بأوزان', },
      target: { reps: 5, sets: 3 },
      cues: [
        { ar: 'حزام ديبس مع 10-20 كغ بداية.', },
      ],
      unlockCriterion: { ar: '5 × 3 بـ 25% من وزن الجسم.', },
      difficulty: 8,
      weeksAverage: 12,
    },
    {
      key: 'korean',
      name: { ar: 'ديبس كوري', },
      target: { reps: 5, sets: 3 },
      cues: [
        { ar: 'يدان خلف الجسم على بار.', },
        { ar: 'مرونة كتف عالية مطلوبة.', },
      ],
      unlockCriterion: { ar: '5 × 3 بمدى كامل.', },
      difficulty: 9,
      weeksAverage: 16,
    },
  ],
};

/* ──────────────── 4) Squat / Pistol family ──────────────── */

const SQUAT: SkillDef = {
  key: 'squat',
  name: { ar: 'سكوات', },
  category: 'legs',
  difficulty: 6,
  color: '#10b981',
  emoji: '🦵',
  primaryMuscles: ['quads', 'glutes'],
  secondaryMuscles: ['hamstrings', 'calves'],
  tagline: { ar: 'الأرجل التي تحملك للقمة', },
  about: {
    ar: 'سكوات وزن الجسم بدلاً من البار — بسيط لكن مع التطور إلى pistol وshrimp يصبح اختباراً فاتكاً للقوة والتوازن.',
  },
  steps: [
    {
      key: 'assisted',
      name: { ar: 'سكوات بمساعدة', },
      target: { reps: 15, sets: 3 },
      cues: [
        { ar: 'امسك إطار باب أو حلقات.', },
      ],
      unlockCriterion: { ar: '15 × 3 بعمق كامل.', },
      difficulty: 1,
      weeksAverage: 1,
    },
    {
      key: 'air',
      name: { ar: 'سكوات هوائي', },
      target: { reps: 20, sets: 3 },
      cues: [
        { ar: 'كعب ثابت، ركبة في خط القدم.', },
        { ar: 'صدر مرفوع، نظر للأمام.', },
      ],
      unlockCriterion: { ar: '20 × 3 بعمق كامل.', },
      difficulty: 2,
      weeksAverage: 2,
    },
    {
      key: 'split',
      name: { ar: 'سكوات منشق', },
      target: { reps: 12, sets: 3 },
      cues: [
        { ar: 'الخطوة طويلة، الركبة الخلفية تلامس الأرض.', },
      ],
      unlockCriterion: { ar: '12 لكل ساق × 3.', },
      difficulty: 3,
      weeksAverage: 3,
    },
    {
      key: 'bulgarian',
      name: { ar: 'سكوات بلغاري', },
      target: { reps: 10, sets: 3 },
      cues: [
        { ar: 'القدم الخلفية على كرسي خلفك.', },
        { ar: 'الوزن على القدم الأمامية.', },
      ],
      unlockCriterion: { ar: '10 × 3 بعمق.', },
      difficulty: 4,
      weeksAverage: 4,
    },
    {
      key: 'cossack',
      name: { ar: 'سكوات كوسّاك', },
      target: { reps: 8, sets: 3 },
      cues: [
        { ar: 'افتح الفخذ بعرض كبير ثم نقل الوزن.', },
        { ar: 'الكعب ثابت، الأخرى ممدودة.', },
      ],
      unlockCriterion: { ar: '8 لكل جانب × 3.', },
      difficulty: 5,
      weeksAverage: 6,
    },
    {
      key: 'pistol_neg',
      name: { ar: 'بستول سلبي', },
      target: { reps: 5, sets: 3, holdSec: 5 },
      cues: [
        { ar: 'انزل ببطء 4-5 ث، اقف بكلتا القدمين.', },
      ],
      unlockCriterion: { ar: '5 × 3 لكل ساق.', },
      difficulty: 6,
      weeksAverage: 8,
    },
    {
      key: 'pistol',
      name: { ar: 'بستول', },
      target: { reps: 5, sets: 3 },
      cues: [
        { ar: 'الذراعان للأمام للتوازن.', },
        { ar: 'الكعب يبقى ملامساً.', },
        { ar: 'الساق الأخرى موازية للأرض.', },
      ],
      unlockCriterion: { ar: '5 × 3 لكل ساق.', },
      difficulty: 8,
      weeksAverage: 16,
    },
    {
      key: 'shrimp',
      name: { ar: 'سكوات الجمبري', },
      target: { reps: 4, sets: 3 },
      cues: [
        { ar: 'أمسك القدم الخلفية بيد.', },
        { ar: 'انزل حتى الركبة الخلفية تلامس الأرض.', },
      ],
      unlockCriterion: { ar: '4 لكل ساق × 3.', },
      difficulty: 9,
      weeksAverage: 24,
    },
  ],
};

/* ──────────────── 5) L-sit family ──────────────── */

const L_SIT: SkillDef = {
  key: 'lSit',
  name: { ar: 'إل-سيت', },
  category: 'core',
  difficulty: 6,
  color: '#8b5cf6',
  emoji: '🪑',
  primaryMuscles: ['core'],
  secondaryMuscles: ['triceps', 'shoulders', 'quads'],
  tagline: { ar: 'بطن من حديد', },
  about: {
    ar: 'إل-سيت يبدو بسيطاً لكنه اختبار شامل لعضلات البطن والترايسبس وهيب فلكسر معاً.',
  },
  steps: [
    {
      key: 'foot_supp',
      name: { ar: 'إل-سيت بقدم مدعومة', },
      target: { holdSec: 20, sets: 3 },
      cues: [
        { ar: 'قدم على الأرض، اضغط الأرض بيديك.', },
      ],
      isHold: true,
      unlockCriterion: { ar: '20 ث × 3.', },
      difficulty: 2,
      weeksAverage: 2,
    },
    {
      key: 'one_leg',
      name: { ar: 'إل-سيت برجل', },
      target: { holdSec: 15, sets: 3 },
      cues: [
        { ar: 'ساق ممدودة والأخرى منثنية.', },
      ],
      isHold: true,
      unlockCriterion: { ar: '15 ث لكل ساق × 3.', },
      difficulty: 3,
      weeksAverage: 3,
    },
    {
      key: 'tuck',
      name: { ar: 'إل-سيت ركبة منثنية', },
      target: { holdSec: 20, sets: 3 },
      cues: [
        { ar: 'ركبتان مرفوعتان للصدر.', },
      ],
      isHold: true,
      unlockCriterion: { ar: '20 ث × 3.', },
      difficulty: 4,
      weeksAverage: 4,
    },
    {
      key: 'full_floor',
      name: { ar: 'إل-سيت كامل أرضي', },
      target: { holdSec: 15, sets: 3 },
      cues: [
        { ar: 'رجلان مستقيمتان موازيتان للأرض.', },
        { ar: 'كتفان للأسفل، صدر مرتفع.', },
      ],
      isHold: true,
      unlockCriterion: { ar: '15 ث × 3 على الأرض.', },
      difficulty: 6,
      weeksAverage: 8,
    },
    {
      key: 'parallettes',
      name: { ar: 'إل-سيت على parallettes', },
      target: { holdSec: 30, sets: 3 },
      cues: [
        { ar: 'مدى أكبر — أصعب على الكتف.', },
      ],
      isHold: true,
      unlockCriterion: { ar: '30 ث × 3.', },
      difficulty: 7,
      weeksAverage: 12,
    },
    {
      key: 'v_sit',
      name: { ar: 'V-sit', },
      target: { holdSec: 10, sets: 3 },
      cues: [
        { ar: 'ارفع الرجلين إلى زاوية أعلى من 60°.', },
      ],
      isHold: true,
      unlockCriterion: { ar: '10 ث × 3.', },
      difficulty: 8,
      weeksAverage: 16,
    },
    {
      key: 'manna',
      name: { ar: 'مانا', },
      target: { holdSec: 5, sets: 3 },
      cues: [
        { ar: 'رجلان فوق الكتف — قمة المرونة.', },
      ],
      isHold: true,
      unlockCriterion: { ar: '5 ث × 3.', },
      difficulty: 10,
      weeksAverage: 52,
    },
  ],
};

/* ──────────────── 6) Handstand family ──────────────── */

const HANDSTAND: SkillDef = {
  key: 'handstand',
  name: { ar: 'وقوف على اليدين', },
  category: 'static',
  difficulty: 8,
  color: '#ec4899',
  emoji: '🤸',
  primaryMuscles: ['shoulders', 'core'],
  secondaryMuscles: ['traps', 'forearms'],
  prerequisites: [{ skillKey: 'pushUp', minStep: 4 }],
  tagline: { ar: 'فن السيطرة', },
  about: {
    ar: 'وقوف اليدين الحرّ يفتح عالماً جديداً — توازن، قوة كتف، تحكم نَفَس وتفكير معكوس.',
  },
  steps: [
    {
      key: 'wall_plank',
      name: { ar: 'بلانك حائط', },
      target: { holdSec: 60, sets: 3 },
      cues: [
        { ar: 'قدمان على الحائط، يدان على الأرض.', },
        { ar: 'جسم مستقيم تماماً.', },
      ],
      isHold: true,
      unlockCriterion: { ar: '60 ث × 3.', },
      difficulty: 3,
      weeksAverage: 3,
    },
    {
      key: 'chest_wall',
      name: { ar: 'وقوف بصدر للحائط', },
      target: { holdSec: 30, sets: 3 },
      cues: [
        { ar: 'الصدر يلامس الحائط.', },
        { ar: 'كتفان مفعلان للأقصى.', },
      ],
      isHold: true,
      unlockCriterion: { ar: '30 ث × 3.', },
      difficulty: 4,
      weeksAverage: 4,
    },
    {
      key: 'back_wall',
      name: { ar: 'وقوف بظهر للحائط', },
      target: { holdSec: 30, sets: 3 },
      cues: [
        { ar: 'الظهر للحائط — توازن أصغر.', },
      ],
      isHold: true,
      unlockCriterion: { ar: '30 ث × 3.', },
      difficulty: 5,
      weeksAverage: 5,
    },
    {
      key: 'toe_pull',
      name: { ar: 'انفصال أصابع', },
      target: { holdSec: 5, sets: 3 },
      cues: [
        { ar: 'اسحب الأصابع عن الحائط لجرب التوازن.', },
      ],
      isHold: true,
      unlockCriterion: { ar: '5 ث × 3 بلا حائط.', },
      difficulty: 6,
      weeksAverage: 8,
    },
    {
      key: 'free_30',
      name: { ar: 'وقوف حر 30 ث', },
      target: { holdSec: 30, sets: 1 },
      cues: [
        { ar: '"أصابع المخلب" تتحكم في الميل الأمامي.', },
        { ar: 'تعديل بالكتف لا بالورك.', },
      ],
      isHold: true,
      unlockCriterion: { ar: '30 ث متواصلة بلا سند.', },
      difficulty: 7,
      weeksAverage: 16,
    },
    {
      key: 'hs_walk',
      name: { ar: 'مشي على اليدين', },
      target: { reps: 10, sets: 3 },
      cues: [
        { ar: '"خطوات" قصيرة من يد لأخرى.', },
      ],
      unlockCriterion: { ar: '10 خطوات × 3.', },
      difficulty: 8,
      weeksAverage: 20,
    },
    {
      key: 'pike_hspu',
      name: { ar: 'ضغط من Pike', },
      target: { reps: 5, sets: 3 },
      cues: [
        { ar: 'قدمان مرفوعتان على كرسي.', },
      ],
      unlockCriterion: { ar: '5 × 3.', },
      difficulty: 7,
      weeksAverage: 12,
    },
    {
      key: 'wall_hspu',
      name: { ar: 'HSPU بالحائط', },
      target: { reps: 5, sets: 3 },
      cues: [
        { ar: 'الرأس يلمس الأرض، الكتف بمستوى المرفق.', },
      ],
      unlockCriterion: { ar: '5 × 3 بمدى كامل.', },
      difficulty: 8,
      weeksAverage: 16,
    },
    {
      key: 'free_hspu',
      name: { ar: 'HSPU حر', },
      target: { reps: 3, sets: 3 },
      cues: [
        { ar: 'بلا حائط — قمة الإتقان.', },
      ],
      unlockCriterion: { ar: '3 × 3 حر.', },
      difficulty: 10,
      weeksAverage: 52,
    },
  ],
};

/* ──────────────── 7) Front Lever ──────────────── */

const FRONT_LEVER: SkillDef = {
  key: 'frontLever',
  name: { ar: 'فرنت ليفر', },
  category: 'static',
  difficulty: 9,
  color: '#06b6d4',
  emoji: '🪂',
  primaryMuscles: ['back', 'core'],
  secondaryMuscles: ['shoulders', 'biceps'],
  prerequisites: [{ skillKey: 'pullUp', minStep: 4 }],
  tagline: { ar: 'الطفو أمام البار', },
  about: {
    ar: 'الفرنت ليفر هو الكأس الذهبية لقوة السحب. يبني ظهراً وحديداً وجذعاً غير قابل للكسر.',
  },
  steps: [
    {
      key: 'tuck_hold',
      name: { ar: 'فرنت ليفر مطوي', },
      target: { holdSec: 15, sets: 3 },
      cues: [
        { ar: 'ركبتان مطويتان للصدر.', },
        { ar: 'كتفان مكتنزان، أضلاع للأسفل.', },
      ],
      isHold: true,
      unlockCriterion: { ar: '15 ث × 3.', },
      difficulty: 5,
      weeksAverage: 6,
    },
    {
      key: 'tuck_raise',
      name: { ar: 'فرنت ليفر مطوي رفع', },
      target: { reps: 8, sets: 3 },
      cues: [
        { ar: 'من تعليق ميت إلى وضع tuck FL.', },
      ],
      unlockCriterion: { ar: '8 × 3.', },
      difficulty: 6,
      weeksAverage: 8,
    },
    {
      key: 'adv_tuck',
      name: { ar: 'فرنت ليفر مفتوح', },
      target: { holdSec: 15, sets: 3 },
      cues: [
        { ar: 'ركبتان مفتوحتان عن الصدر — ظهر منبسط.', },
      ],
      isHold: true,
      unlockCriterion: { ar: '15 ث × 3.', },
      difficulty: 7,
      weeksAverage: 10,
    },
    {
      key: 'one_leg',
      name: { ar: 'فرنت ليفر برجل', },
      target: { holdSec: 12, sets: 3 },
      cues: [
        { ar: 'رجل ممدودة، الأخرى مطوية.', },
      ],
      isHold: true,
      unlockCriterion: { ar: '12 ث لكل جانب × 3.', },
      difficulty: 8,
      weeksAverage: 12,
    },
    {
      key: 'straddle',
      name: { ar: 'فرنت ليفر مفتوح الرجلين', },
      target: { holdSec: 10, sets: 3 },
      cues: [
        { ar: 'رجلان مفتوحتان — ذراع رافعة أقصر.', },
      ],
      isHold: true,
      unlockCriterion: { ar: '10 ث × 3.', },
      difficulty: 9,
      weeksAverage: 16,
    },
    {
      key: 'full',
      name: { ar: 'فرنت ليفر كامل', },
      target: { holdSec: 5, sets: 3 },
      cues: [
        { ar: 'الجسم خط مستقيم تام.', },
      ],
      isHold: true,
      unlockCriterion: { ar: '5 ث × 3.', },
      difficulty: 10,
      weeksAverage: 24,
    },
    {
      key: 'fl_pull',
      name: { ar: 'سحب فرنت ليفر', },
      target: { reps: 3, sets: 3 },
      cues: [
        { ar: 'حافظ على وضع FL طوال السحب.', },
      ],
      unlockCriterion: { ar: '3 × 3 بمدى كامل.', },
      difficulty: 10,
      weeksAverage: 36,
    },
  ],
};

/* ──────────────── 8) Back Lever ──────────────── */

const BACK_LEVER: SkillDef = {
  key: 'backLever',
  name: { ar: 'باك ليفر', },
  category: 'static',
  difficulty: 7,
  color: '#14b8a6',
  emoji: '🌗',
  primaryMuscles: ['back', 'biceps'],
  secondaryMuscles: ['shoulders', 'core'],
  prerequisites: [{ skillKey: 'pullUp', minStep: 4 }],
  tagline: { ar: 'مرونة كتف وقوة بايسبس', },
  about: {
    ar: 'الباك ليفر بوابة لـ ironcross و planche على الحلقات. يبني مرونة كتف نادرة.',
  },
  steps: [
    {
      key: 'german_hang',
      name: { ar: 'تعليق ألماني', },
      target: { holdSec: 30, sets: 3 },
      cues: [
        { ar: 'كتفان للأقصى من المرونة.', },
      ],
      isHold: true,
      unlockCriterion: { ar: '30 ث × 3 بدون ألم.', },
      difficulty: 4,
      weeksAverage: 4,
    },
    {
      key: 'tuck_bl',
      name: { ar: 'باك ليفر مطوي', },
      target: { holdSec: 15, sets: 3 },
      cues: [
        { ar: 'مرفقان مقفولان، ركبتان مطويتان.', },
      ],
      isHold: true,
      unlockCriterion: { ar: '15 ث × 3.', },
      difficulty: 5,
      weeksAverage: 6,
    },
    {
      key: 'adv_tuck_bl',
      name: { ar: 'باك ليفر مفتوح', },
      target: { holdSec: 15, sets: 3 },
      cues: [
        { ar: 'ركبتان مفتوحتان عن الجذع.', },
      ],
      isHold: true,
      unlockCriterion: { ar: '15 ث × 3.', },
      difficulty: 6,
      weeksAverage: 8,
    },
    {
      key: 'one_leg_bl',
      name: { ar: 'باك ليفر برجل', },
      target: { holdSec: 12, sets: 3 },
      cues: [
        { ar: 'رجل ممدودة والأخرى مطوية.', },
      ],
      isHold: true,
      unlockCriterion: { ar: '12 ث × 3.', },
      difficulty: 7,
      weeksAverage: 10,
    },
    {
      key: 'straddle_bl',
      name: { ar: 'باك ليفر مفتوح الرجلين', },
      target: { holdSec: 10, sets: 3 },
      cues: [
        { ar: 'رجلان مفتوحتان للجانب.', },
      ],
      isHold: true,
      unlockCriterion: { ar: '10 ث × 3.', },
      difficulty: 8,
      weeksAverage: 14,
    },
    {
      key: 'full_bl',
      name: { ar: 'باك ليفر كامل', },
      target: { holdSec: 5, sets: 3 },
      cues: [
        { ar: 'جسم خط أفقي مستقيم.', },
      ],
      isHold: true,
      unlockCriterion: { ar: '5 ث × 3.', },
      difficulty: 9,
      weeksAverage: 24,
    },
  ],
};

/* ──────────────── 9) Planche ──────────────── */

const PLANCHE: SkillDef = {
  key: 'planche',
  name: { ar: 'بلانش', },
  category: 'static',
  difficulty: 10,
  color: '#f97316',
  emoji: '✈️',
  primaryMuscles: ['shoulders', 'chest', 'core'],
  secondaryMuscles: ['biceps', 'forearms'],
  prerequisites: [{ skillKey: 'pushUp', minStep: 5 }, { skillKey: 'handstand', minStep: 3 }],
  tagline: { ar: 'الطفو على اليدين', },
  about: {
    ar: 'الـ planche قمة الكاليستنيكس الثابت. سنوات من العمل لكن مكافأته شعور لا يضاهى.',
  },
  steps: [
    {
      key: 'lean',
      name: { ar: 'ميل planche', },
      target: { holdSec: 30, sets: 3 },
      cues: [
        { ar: 'ميل أمامي مع مرفق مقفول.', },
      ],
      isHold: true,
      unlockCriterion: { ar: '30 ث × 3.', },
      difficulty: 4,
      weeksAverage: 4,
    },
    {
      key: 'pseudo_pu',
      name: { ar: 'ضغط بلانش زائف', },
      target: { reps: 8, sets: 3 },
      cues: [
        { ar: 'يدان للوراء قرب الورك ثم انزل.', },
      ],
      unlockCriterion: { ar: '8 × 3.', },
      difficulty: 5,
      weeksAverage: 6,
    },
    {
      key: 'frog',
      name: { ar: 'وقوف الضفدع', },
      target: { holdSec: 30, sets: 3 },
      cues: [
        { ar: 'ركبتان على المرفقين.', },
      ],
      isHold: true,
      unlockCriterion: { ar: '30 ث × 3.', },
      difficulty: 5,
      weeksAverage: 6,
    },
    {
      key: 'tuck_pl',
      name: { ar: 'بلانش مطوي', },
      target: { holdSec: 12, sets: 3 },
      cues: [
        { ar: 'ركبتان عاليتان، ظهر منبسط.', },
      ],
      isHold: true,
      unlockCriterion: { ar: '12 ث × 3.', },
      difficulty: 6,
      weeksAverage: 8,
    },
    {
      key: 'adv_tuck_pl',
      name: { ar: 'بلانش مطوي مفتوح', },
      target: { holdSec: 10, sets: 3 },
      cues: [
        { ar: 'ركبتان مفتوحتان عن الجذع.', },
      ],
      isHold: true,
      unlockCriterion: { ar: '10 ث × 3.', },
      difficulty: 8,
      weeksAverage: 12,
    },
    {
      key: 'straddle_pl',
      name: { ar: 'بلانش مفتوح الرجلين', },
      target: { holdSec: 5, sets: 3 },
      cues: [
        { ar: 'رجلان مفتوحتان جانبياً.', },
      ],
      isHold: true,
      unlockCriterion: { ar: '5 ث × 3.', },
      difficulty: 9,
      weeksAverage: 24,
    },
    {
      key: 'full_pl',
      name: { ar: 'بلانش كامل', },
      target: { holdSec: 3, sets: 3 },
      cues: [
        { ar: 'جسم خط مستقيم — قمة كل شيء.', },
      ],
      isHold: true,
      unlockCriterion: { ar: '3 ث × 3.', },
      difficulty: 10,
      weeksAverage: 52,
    },
    {
      key: 'planche_pu',
      name: { ar: 'ضغط بلانش', },
      target: { reps: 3, sets: 3 },
      cues: [
        { ar: 'دفع من وضع planche الكامل.', },
      ],
      unlockCriterion: { ar: '3 × 3.', },
      difficulty: 10,
      weeksAverage: 78,
    },
  ],
};

/* ──────────────── 10) Muscle-up ──────────────── */

const MUSCLE_UP: SkillDef = {
  key: 'muscleUp',
  name: { ar: 'ماصل أب', },
  category: 'dynamic',
  difficulty: 8,
  color: '#6366f1',
  emoji: '🎯',
  primaryMuscles: ['back', 'triceps', 'chest'],
  secondaryMuscles: ['core', 'shoulders'],
  prerequisites: [{ skillKey: 'pullUp', minStep: 4 }, { skillKey: 'dip', minStep: 2 }],
  tagline: { ar: 'سحب وعبور', },
  about: {
    ar: 'الماصل أب يجمع السحب والعبور والديبس في حركة واحدة. علامة حقيقية على القوة الديناميكية.',
  },
  steps: [
    {
      key: 'high_pull',
      name: { ar: 'سحب عالٍ', },
      target: { reps: 5, sets: 3 },
      cues: [
        { ar: 'اسحب البار للصدر السفلي.', },
      ],
      unlockCriterion: { ar: '5 × 3 بقمة عالية.', },
      difficulty: 5,
      weeksAverage: 6,
    },
    {
      key: 'explosive_pull',
      name: { ar: 'سحب انفجاري', },
      target: { reps: 5, sets: 3 },
      cues: [
        { ar: 'سحب أقصى سرعة، فوق الذقن بكثير.', },
      ],
      unlockCriterion: { ar: '5 × 3 بسرعة.', },
      difficulty: 6,
      weeksAverage: 8,
    },
    {
      key: 'negative',
      name: { ar: 'ماصل أب سلبي', },
      target: { reps: 3, sets: 3 },
      cues: [
        { ar: 'ابدأ من القمة، انزل تحكماً.', },
      ],
      unlockCriterion: { ar: '3 × 3 بـ 4-5 ث نزول.', },
      difficulty: 7,
      weeksAverage: 10,
    },
    {
      key: 'kipping',
      name: { ar: 'ماصل أب قفز', },
      target: { reps: 3, sets: 3 },
      cues: [
        { ar: 'استخدم زخم القدمين قليلاً.', },
      ],
      unlockCriterion: { ar: '3 × 3.', },
      difficulty: 7,
      weeksAverage: 12,
    },
    {
      key: 'strict_bar',
      name: { ar: 'ماصل أب صارم بار', },
      target: { reps: 3, sets: 3 },
      cues: [
        { ar: 'بلا قفز، ميل أمامي عند العبور.', },
      ],
      unlockCriterion: { ar: '3 × 3 صارم.', },
      difficulty: 8,
      weeksAverage: 18,
    },
    {
      key: 'slow_mu',
      name: { ar: 'ماصل أب بطيء', },
      target: { reps: 3, sets: 3 },
      cues: [
        { ar: 'صعود 3 ث لكل تكرارة.', },
      ],
      unlockCriterion: { ar: '3 × 3 ببطء.', },
      difficulty: 9,
      weeksAverage: 24,
    },
    {
      key: 'ring_mu',
      name: { ar: 'ماصل أب حلقات', },
      target: { reps: 3, sets: 3 },
      cues: [
        { ar: 'قبضة كاذبة + تحول للحلقات.', },
      ],
      unlockCriterion: { ar: '3 × 3 حلقات.', },
      difficulty: 9,
      weeksAverage: 30,
    },
    {
      key: 'strict_ring',
      name: { ar: 'ماصل أب حلقات صارم', },
      target: { reps: 3, sets: 3 },
      cues: [
        { ar: 'بلا قفز، حلقات.', },
      ],
      unlockCriterion: { ar: '3 × 3 صارم على الحلقات.', },
      difficulty: 10,
      weeksAverage: 52,
    },
  ],
};

/* ──────────────── 11) Human Flag ──────────────── */

const HUMAN_FLAG: SkillDef = {
  key: 'humanFlag',
  name: { ar: 'العلم البشري', },
  category: 'static',
  difficulty: 9,
  color: '#be185d',
  emoji: '🚩',
  primaryMuscles: ['shoulders', 'core'],
  secondaryMuscles: ['back'],
  prerequisites: [{ skillKey: 'pullUp', minStep: 4 }, { skillKey: 'pushUp', minStep: 4 }],
  tagline: { ar: 'تحدّي الجاذبية أفقياً', },
  about: {
    ar: 'العلم البشري حركة بصرية مذهلة تتحدّى الجاذبية. تتطلب قوة جانبية وتنسيق كتف ظهر استثنائي.',
  },
  steps: [
    {
      key: 'side_plank',
      name: { ar: 'جانبي بلانك 60 ث', },
      target: { holdSec: 60, sets: 3 },
      cues: [{ ar: 'جذع مشدود.', }],
      isHold: true,
      unlockCriterion: { ar: '60 ث لكل جانب.', },
      difficulty: 3,
      weeksAverage: 3,
    },
    {
      key: 'vertical_flag',
      name: { ar: 'علم عمودي', },
      target: { holdSec: 10, sets: 3 },
      cues: [{ ar: 'جسم عمودي على عمود — لا أفقي بعد.', }],
      isHold: true,
      unlockCriterion: { ar: '10 ث × 3.', },
      difficulty: 5,
      weeksAverage: 6,
    },
    {
      key: 'tuck_flag',
      name: { ar: 'علم مطوي', },
      target: { holdSec: 8, sets: 3 },
      cues: [{ ar: 'ركبتان للصدر.', }],
      isHold: true,
      unlockCriterion: { ar: '8 ث × 3.', },
      difficulty: 6,
      weeksAverage: 8,
    },
    {
      key: 'one_leg_flag',
      name: { ar: 'علم برجل', },
      target: { holdSec: 8, sets: 3 },
      cues: [{ ar: 'رجل ممدودة، الأخرى مطوية.', }],
      isHold: true,
      unlockCriterion: { ar: '8 ث × 3.', },
      difficulty: 7,
      weeksAverage: 12,
    },
    {
      key: 'straddle_flag',
      name: { ar: 'علم مفتوح الرجلين', },
      target: { holdSec: 5, sets: 3 },
      cues: [{ ar: 'رجلان مفتوحتان.', }],
      isHold: true,
      unlockCriterion: { ar: '5 ث × 3.', },
      difficulty: 8,
      weeksAverage: 18,
    },
    {
      key: 'full_flag_5s',
      name: { ar: 'علم كامل 5 ث', },
      target: { holdSec: 5, sets: 3 },
      cues: [{ ar: 'جسم أفقي تام.', }],
      isHold: true,
      unlockCriterion: { ar: '5 ث × 3.', },
      difficulty: 9,
      weeksAverage: 30,
    },
    {
      key: 'full_flag_15s',
      name: { ar: 'علم كامل 15 ث', },
      target: { holdSec: 15, sets: 3 },
      cues: [{ ar: 'تحكم نَفَس وثبات.', }],
      isHold: true,
      unlockCriterion: { ar: '15 ث × 3.', },
      difficulty: 10,
      weeksAverage: 52,
    },
  ],
};

/* ──────────────── 12) Dragon Flag ──────────────── */

const DRAGON_FLAG: SkillDef = {
  key: 'dragonFlag',
  name: { ar: 'علم التنين', },
  category: 'core',
  difficulty: 7,
  color: '#7c3aed',
  emoji: '🐉',
  primaryMuscles: ['core'],
  secondaryMuscles: ['back', 'shoulders'],
  tagline: { ar: 'بطن بروس لي', },
  about: {
    ar: 'علم التنين — اختراع بروس لي الشخصي. يبني عضلات بطن مستقرة فولاذية.',
  },
  steps: [
    {
      key: 'hollow_hold',
      name: { ar: 'تجويف 30 ث', },
      target: { holdSec: 30, sets: 3 },
      cues: [{ ar: 'كتفان عن الأرض، أسفل الظهر مضغوط.', }],
      isHold: true,
      unlockCriterion: { ar: '30 ث × 3.', },
      difficulty: 3,
      weeksAverage: 3,
    },
    {
      key: 'tuck_df',
      name: { ar: 'علم تنين مطوي', },
      target: { reps: 8, sets: 3 },
      cues: [{ ar: 'ركبتان مطويتان، ورك مرفوع.', }],
      unlockCriterion: { ar: '8 × 3.', },
      difficulty: 5,
      weeksAverage: 6,
    },
    {
      key: 'one_leg_df',
      name: { ar: 'علم تنين برجل', },
      target: { reps: 6, sets: 3 },
      cues: [{ ar: 'رجل ممدودة، الأخرى مطوية.', }],
      unlockCriterion: { ar: '6 × 3.', },
      difficulty: 6,
      weeksAverage: 8,
    },
    {
      key: 'straddle_df',
      name: { ar: 'علم تنين مفتوح', },
      target: { reps: 6, sets: 3 },
      cues: [{ ar: 'رجلان مفتوحتان.', }],
      unlockCriterion: { ar: '6 × 3.', },
      difficulty: 7,
      weeksAverage: 12,
    },
    {
      key: 'full_neg',
      name: { ar: 'علم كامل سلبي', },
      target: { reps: 5, sets: 3 },
      cues: [{ ar: 'انزل ببطء 4-5 ث.', }],
      unlockCriterion: { ar: '5 × 3.', },
      difficulty: 8,
      weeksAverage: 16,
    },
    {
      key: 'full_3',
      name: { ar: 'علم تنين كامل ×3', },
      target: { reps: 3, sets: 3 },
      cues: [{ ar: 'جسم خط مستقيم في النزول والصعود.', }],
      unlockCriterion: { ar: '3 × 3.', },
      difficulty: 9,
      weeksAverage: 24,
    },
    {
      key: 'full_8',
      name: { ar: 'علم تنين كامل ×8', },
      target: { reps: 8, sets: 3 },
      cues: [{ ar: 'تكرارات نظيفة كاملة.', }],
      unlockCriterion: { ar: '8 × 3.', },
      difficulty: 10,
      weeksAverage: 36,
    },
  ],
};

/* ──────────────── 13) Nordic Curl ──────────────── */

const NORDIC_CURL: SkillDef = {
  key: 'nordicCurl',
  name: { ar: 'نوردك كيرل', },
  category: 'legs',
  difficulty: 7,
  color: '#dc2626',
  emoji: '🔥',
  primaryMuscles: ['hamstrings'],
  secondaryMuscles: ['glutes', 'calves'],
  tagline: { ar: 'سلاح الفخذ الخلفي', },
  about: {
    ar: 'النوردك كيرل أقوى تمرين خلفية فخذ بوزن الجسم — يقي الإصابات ويبني قوة جذرية.',
  },
  steps: [
    {
      key: 'slide',
      name: { ar: 'انزلاق فخذ خلفي', },
      target: { reps: 12, sets: 3 },
      cues: [{ ar: 'منشفة تحت قدمين، اسحب الجسم.', }],
      unlockCriterion: { ar: '12 × 3.', },
      difficulty: 3,
      weeksAverage: 3,
    },
    {
      key: 'top_30',
      name: { ar: 'سلبي علوي 30°', },
      target: { reps: 8, sets: 3 },
      cues: [{ ar: 'انزل ببطء أول 30°.', }],
      unlockCriterion: { ar: '8 × 3.', },
      difficulty: 5,
      weeksAverage: 5,
    },
    {
      key: 'top_60',
      name: { ar: 'سلبي علوي 60°', },
      target: { reps: 8, sets: 3 },
      cues: [{ ar: 'مدى أعمق.', }],
      unlockCriterion: { ar: '8 × 3.', },
      difficulty: 6,
      weeksAverage: 7,
    },
    {
      key: 'full_neg',
      name: { ar: 'سلبي كامل', },
      target: { reps: 6, sets: 3 },
      cues: [{ ar: 'انزل تحكماً 4-5 ث.', }],
      unlockCriterion: { ar: '6 × 3.', },
      difficulty: 7,
      weeksAverage: 10,
    },
    {
      key: 'partial_concentric',
      name: { ar: 'صعود جزئي', },
      target: { reps: 4, sets: 3 },
      cues: [{ ar: 'دفع جزئي مع يد على أرض.', }],
      unlockCriterion: { ar: '4 × 3.', },
      difficulty: 8,
      weeksAverage: 14,
    },
    {
      key: 'full_curl',
      name: { ar: 'نوردك كامل', },
      target: { reps: 3, sets: 3 },
      cues: [{ ar: 'بلا يد — تكرارة كاملة.', }],
      unlockCriterion: { ar: '3 × 3.', },
      difficulty: 9,
      weeksAverage: 24,
    },
  ],
};

/* ──────────────── 14) Pike Press to HS ──────────────── */

const PRESS_TO_HS: SkillDef = {
  key: 'press2HS',
  name: { ar: 'ضغط للوقوف على اليدين', },
  category: 'static',
  difficulty: 9,
  color: '#0d9488',
  emoji: '🔺',
  primaryMuscles: ['shoulders', 'core'],
  secondaryMuscles: ['traps'],
  prerequisites: [{ skillKey: 'handstand', minStep: 4 }, { skillKey: 'lSit', minStep: 3 }],
  tagline: { ar: 'صعود رشيق بقوة خالصة', },
  about: {
    ar: 'الـ press to HS انتقال من L-sit أو straddle إلى وقوف يدين — قمة قوة الكتف وتحكم الجذع.',
  },
  steps: [
    {
      key: 'lsit_30',
      name: { ar: 'L-sit 30 ث', },
      target: { holdSec: 30, sets: 3 },
      cues: [{ ar: 'ثبات تام.', }],
      isHold: true,
      unlockCriterion: { ar: '30 ث × 3.', },
      difficulty: 5,
      weeksAverage: 6,
    },
    {
      key: 'straddle_neg',
      name: { ar: 'سلبي straddle press', },
      target: { reps: 5, sets: 3 },
      cues: [{ ar: 'انزل ببطء من HS إلى straddle.', }],
      unlockCriterion: { ar: '5 × 3.', },
      difficulty: 7,
      weeksAverage: 10,
    },
    {
      key: 'wall_straddle',
      name: { ar: 'straddle press بالحائط', },
      target: { reps: 5, sets: 3 },
      cues: [{ ar: 'الظهر للحائط — يساعد التوازن.', }],
      unlockCriterion: { ar: '5 × 3.', },
      difficulty: 8,
      weeksAverage: 14,
    },
    {
      key: 'straddle_press',
      name: { ar: 'straddle press حر', },
      target: { reps: 3, sets: 3 },
      cues: [{ ar: 'بلا حائط — قوة خالصة.', }],
      unlockCriterion: { ar: '3 × 3.', },
      difficulty: 9,
      weeksAverage: 24,
    },
    {
      key: 'pike_neg',
      name: { ar: 'pike press سلبي', },
      target: { reps: 5, sets: 3 },
      cues: [{ ar: 'رجلان مغلقتان.', }],
      unlockCriterion: { ar: '5 × 3.', },
      difficulty: 9,
      weeksAverage: 30,
    },
    {
      key: 'full_pike',
      name: { ar: 'pike press كامل', },
      target: { reps: 3, sets: 3 },
      cues: [{ ar: 'قمة المرونة والقوة.', }],
      unlockCriterion: { ar: '3 × 3.', },
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

export const CATEGORY_LABEL: Record<SkillDef['category'], { ar: string; }> = {
  push:    { ar: 'دفع', },
  pull:    { ar: 'سحب',  },
  legs:    { ar: 'أرجل',   },
  core:    { ar: 'جذع',   },
  static:  { ar: 'ثابت',},
  dynamic: { ar: 'ديناميكي', },
};
