/**
 * Calisthenics program library.
 *
 * Each program references skills + steps from `caliSkillTree.ts`. Steps are
 * specified by `stepKey` (matches `SkillProgressionStep.key`), so the UI
 * can resolve them to current names + cues.
 */

import type { CaliExerciseStep, CaliProgramDef, CaliSession, LocalizedString } from './types';

const ex = (
  skillKey: string,
  stepKey: string,
  sets: number,
  spec: { reps?: number; holdSec?: number; restSec?: number; notes?: LocalizedString },
): CaliExerciseStep => ({ skillKey, stepKey, sets, ...spec });

const session = (
  key: string,
  name: LocalizedString,
  exercises: CaliExerciseStep[],
  estMinutes: number,
  banner?: LocalizedString,
  notes?: LocalizedString,
): CaliSession => ({ key, name, banner, estMinutes, notes, exercises });

/* ──────────────── 1) Foundations 8-week ──────────────── */

const FOUNDATIONS: CaliProgramDef = {
  key: 'cali_foundations_8w',
  name: { ar: 'الأساسات — 8 أسابيع', },
  shortName: { ar: 'الأساسات', },
  author: 'SmartHub Coaching',
  description: {
    ar: 'برنامج المبتدئ الكامل — يبني الضغط، السحب، السكوات، إل-سيت في 8 أسابيع. ثلاث جلسات أسبوعياً.',
  },
  experience: 'beginner',
  daysPerWeek: 3,
  weeks: 8,
  highlights: [
    { ar: 'لا حاجة لمعدات — فقط بار سحب.', },
    { ar: 'تطور بطيء وآمن — كل أسبوع +10% حجم.', },
    { ar: 'ينتهي بقدرة 5 pull-ups صارمة + L-sit أرضي.', },
  ],
  prerequisites: [{ ar: 'لا شروط.', }],
  equipment: ['pull_bar', 'none'],
  sessionMinutes: 50,
  weekTemplate: [
    {
      index: 1,
      sessions: [
        session('found_a', { ar: 'الجلسة A — دفع', }, [
          ex('pushUp', 'incline', 3, { reps: 12, restSec: 60 }),
          ex('squat', 'air', 3, { reps: 15, restSec: 60 }),
          ex('lSit', 'foot_supp', 3, { holdSec: 20, restSec: 60 }),
          ex('handstand', 'wall_plank', 3, { holdSec: 30, restSec: 60 }),
        ], 50, undefined, { ar: 'ركّز على فورم نظيف فوق العدد.', }),
        session('found_b', { ar: 'الجلسة B — سحب', }, [
          ex('pullUp', 'dead_hang', 3, { holdSec: 20, restSec: 60 }),
          ex('pullUp', 'scapular', 3, { reps: 8, restSec: 60 }),
          ex('squat', 'split', 3, { reps: 10, restSec: 60 }),
          ex('dragonFlag', 'hollow_hold', 3, { holdSec: 20, restSec: 60 }),
        ], 50),
        session('found_c', { ar: 'الجلسة C — كامل', }, [
          ex('pushUp', 'knee', 3, { reps: 10, restSec: 60 }),
          ex('pullUp', 'negative', 3, { reps: 4, restSec: 90 }),
          ex('squat', 'air', 3, { reps: 18, restSec: 60 }),
          ex('lSit', 'one_leg', 3, { holdSec: 12, restSec: 60 }),
        ], 55),
      ],
    },
    {
      index: 4,
      label: { ar: 'الأسبوع 4 — منتصف', },
      sessions: [
        session('found_a', { ar: 'الجلسة A — دفع', }, [
          ex('pushUp', 'standard', 3, { reps: 8, restSec: 90 }),
          ex('squat', 'split', 3, { reps: 12, restSec: 60 }),
          ex('lSit', 'tuck', 3, { holdSec: 15, restSec: 60 }),
          ex('handstand', 'chest_wall', 3, { holdSec: 20, restSec: 60 }),
        ], 55),
      ],
    },
    {
      index: 8,
      label: { ar: 'الأسبوع 8 — اختبار', },
      sessions: [
        session('found_test', { ar: 'يوم الاختبار', }, [
          ex('pushUp', 'standard', 1, { reps: 15, restSec: 120, notes: { ar: '15 = نجاح كامل.', } }),
          ex('pullUp', 'standard', 1, { reps: 5, restSec: 120 }),
          ex('squat', 'air', 1, { reps: 25, restSec: 120 }),
          ex('lSit', 'full_floor', 1, { holdSec: 15, restSec: 120 }),
        ], 30),
      ],
    },
  ],
};

/* ──────────────── 2) Push-Pull-Legs 6× ──────────────── */

const PPL_CALI: CaliProgramDef = {
  key: 'cali_ppl_6d',
  name: { ar: 'PPL كاليستنيكس', },
  shortName: { ar: 'PPL', },
  author: 'SmartHub Coaching',
  description: {
    ar: 'تقسيم Push/Pull/Legs مكرر مرتين أسبوعياً — حجم مرتفع لمتقدمين.',
  },
  experience: 'intermediate',
  daysPerWeek: 6,
  weeks: 12,
  highlights: [
    { ar: '15-22 مجموعة لكل عضلة كبيرة.', },
    { ar: 'يطور الضغط، العقلة، الديبس بشكل مستقل.', },
  ],
  prerequisites: [
    { ar: '5 strict pull-ups.', },
    { ar: '15 push-ups.', },
  ],
  equipment: ['pull_bar', 'dip_bars'],
  sessionMinutes: 70,
  weekTemplate: [
    {
      index: 1,
      sessions: [
        session('push_a', { ar: 'دفع A', }, [
          ex('pushUp', 'standard', 4, { reps: 10, restSec: 90 }),
          ex('dip', 'parallel', 4, { reps: 8, restSec: 90 }),
          ex('handstand', 'pike_hspu', 3, { reps: 8, restSec: 120 }),
          ex('pushUp', 'diamond', 3, { reps: 10, restSec: 60 }),
          ex('lSit', 'full_floor', 3, { holdSec: 15, restSec: 60 }),
        ], 70),
        session('pull_a', { ar: 'سحب A', }, [
          ex('pullUp', 'standard', 4, { reps: 6, restSec: 120 }),
          ex('frontLever', 'tuck_hold', 4, { holdSec: 12, restSec: 90 }),
          ex('pullUp', 'wide', 3, { reps: 6, restSec: 90 }),
          ex('backLever', 'german_hang', 3, { holdSec: 20, restSec: 90 }),
        ], 70),
        session('legs_a', { ar: 'أرجل A', }, [
          ex('squat', 'bulgarian', 4, { reps: 10, restSec: 90 }),
          ex('nordicCurl', 'top_30', 3, { reps: 6, restSec: 120 }),
          ex('squat', 'cossack', 3, { reps: 8, restSec: 60 }),
          ex('squat', 'pistol_neg', 3, { reps: 5, restSec: 120 }),
        ], 65),
        session('push_b', { ar: 'دفع B', }, [
          ex('handstand', 'wall_hspu', 4, { reps: 5, restSec: 150 }),
          ex('dip', 'ring_dip', 4, { reps: 6, restSec: 120 }),
          ex('planche', 'lean', 4, { holdSec: 20, restSec: 90 }),
          ex('pushUp', 'decline', 3, { reps: 12, restSec: 60 }),
          ex('handstand', 'free_30', 5, { holdSec: 20, restSec: 60 }),
        ], 70),
        session('pull_b', { ar: 'سحب B', }, [
          ex('pullUp', 'lsit_pullup', 4, { reps: 5, restSec: 120 }),
          ex('frontLever', 'adv_tuck', 4, { holdSec: 10, restSec: 90 }),
          ex('muscleUp', 'high_pull', 5, { reps: 3, restSec: 120 }),
          ex('pullUp', 'archer', 3, { reps: 4, restSec: 90 }),
          ex('backLever', 'tuck_bl', 3, { holdSec: 12, restSec: 90 }),
        ], 70),
        session('legs_b', { ar: 'أرجل B', }, [
          ex('squat', 'pistol', 4, { reps: 5, restSec: 120 }),
          ex('nordicCurl', 'top_60', 3, { reps: 5, restSec: 120 }),
          ex('squat', 'cossack', 3, { reps: 10, restSec: 60 }),
          ex('dragonFlag', 'tuck_df', 4, { reps: 6, restSec: 90 }),
          ex('lSit', 'v_sit', 3, { holdSec: 8, restSec: 90 }),
        ], 70),
      ],
    },
  ],
};

/* ──────────────── 3) Skill Focus 4× — Statics ──────────────── */

const SKILL_FOCUS: CaliProgramDef = {
  key: 'cali_skill_focus_4d',
  name: { ar: 'تركيز المهارات', },
  shortName: { ar: 'مهارات', },
  author: 'SmartHub Coaching',
  description: {
    ar: 'برنامج للمهارات الثابتة — handstand، planche، front lever، back lever معاً.',
  },
  experience: 'advanced',
  daysPerWeek: 4,
  weeks: 12,
  highlights: [
    { ar: 'حجم منخفض، تردد عالٍ — كل مهارة 2× أسبوعياً.', },
    { ar: 'تركّز على holds 5-15 ث متعددة.', },
    { ar: 'يبني قوة ثابتة استثنائية.', },
  ],
  prerequisites: [
    { ar: 'pull-ups صارمة 10+.', },
    { ar: 'وقوف اليدين 30 ث.', },
    { ar: 'tuck planche 10 ث.', },
  ],
  equipment: ['pull_bar', 'parallettes', 'rings'],
  sessionMinutes: 75,
  weekTemplate: [
    {
      index: 1,
      sessions: [
        session('static_push_a', { ar: 'دفع ثابت A', }, [
          ex('handstand', 'free_30', 6, { holdSec: 20, restSec: 90, notes: { ar: 'محاولات متكررة.', } }),
          ex('planche', 'tuck_pl', 5, { holdSec: 10, restSec: 90 }),
          ex('handstand', 'wall_hspu', 4, { reps: 5, restSec: 120 }),
          ex('planche', 'pseudo_pu', 4, { reps: 8, restSec: 90 }),
          ex('press2HS', 'straddle_neg', 4, { reps: 5, restSec: 120 }),
        ], 80),
        session('static_pull_a', { ar: 'سحب ثابت A', }, [
          ex('frontLever', 'straddle', 5, { holdSec: 10, restSec: 90 }),
          ex('backLever', 'full_bl', 4, { holdSec: 8, restSec: 120 }),
          ex('pullUp', 'archer', 4, { reps: 5, restSec: 90 }),
          ex('frontLever', 'tuck_raise', 4, { reps: 6, restSec: 90 }),
          ex('pullUp', 'standard', 4, { reps: 8, restSec: 90 }),
        ], 75),
        session('static_push_b', { ar: 'دفع ثابت B', }, [
          ex('planche', 'adv_tuck_pl', 5, { holdSec: 8, restSec: 120 }),
          ex('handstand', 'hs_walk', 4, { reps: 10, restSec: 60 }),
          ex('handstand', 'pike_hspu', 4, { reps: 8, restSec: 90 }),
          ex('press2HS', 'wall_straddle', 4, { reps: 4, restSec: 120 }),
        ], 70),
        session('static_pull_b', { ar: 'سحب ثابت B', }, [
          ex('frontLever', 'one_leg', 4, { holdSec: 12, restSec: 90 }),
          ex('backLever', 'straddle_bl', 4, { holdSec: 10, restSec: 90 }),
          ex('humanFlag', 'tuck_flag', 5, { holdSec: 8, restSec: 120 }),
          ex('frontLever', 'tuck_raise', 4, { reps: 6, restSec: 90 }),
        ], 75),
      ],
    },
    {
      index: 6,
      label: { ar: 'ديلود', },
      sessions: [
        session('static_deload', { ar: 'ديلود — تخفيف', }, [
          ex('handstand', 'free_30', 4, { holdSec: 15, restSec: 90 }),
          ex('planche', 'lean', 3, { holdSec: 20, restSec: 90 }),
          ex('frontLever', 'tuck_hold', 3, { holdSec: 12, restSec: 90 }),
          ex('backLever', 'german_hang', 3, { holdSec: 30, restSec: 90 }),
        ], 50),
      ],
    },
  ],
};

/* ──────────────── 4) Hybrid 5× ──────────────── */

const HYBRID: CaliProgramDef = {
  key: 'cali_hybrid_5d',
  name: { ar: 'هجين قوة + مهارات', },
  shortName: { ar: 'هجين', },
  author: 'SmartHub Coaching',
  description: {
    ar: 'يجمع بين بناء القوة الأساسية (pull-ups مثقلة، dips مثقلة) وتعلم المهارات.',
  },
  experience: 'advanced',
  daysPerWeek: 5,
  weeks: 12,
  highlights: [
    { ar: 'يومان قوة مثقلة + ثلاثة مهارات.', },
    { ar: 'تطور قياسي + مهارات بصرية.', },
  ],
  prerequisites: [
    { ar: 'pull-ups 10+ ودubps 10+.', },
  ],
  equipment: ['pull_bar', 'dip_bars', 'rings', 'weight_belt'],
  sessionMinutes: 80,
  weekTemplate: [
    {
      index: 1,
      sessions: [
        session('hyb_push_kraft', { ar: 'قوة دفع', }, [
          ex('dip', 'weighted', 5, { reps: 5, restSec: 180 }),
          ex('pushUp', 'one_arm', 4, { reps: 5, restSec: 120 }),
          ex('handstand', 'wall_hspu', 4, { reps: 5, restSec: 150 }),
          ex('pushUp', 'archer', 3, { reps: 6, restSec: 90 }),
        ], 75),
        session('hyb_push_skill', { ar: 'مهارات دفع', }, [
          ex('planche', 'adv_tuck_pl', 5, { holdSec: 10, restSec: 120 }),
          ex('handstand', 'free_30', 6, { holdSec: 20, restSec: 60 }),
          ex('press2HS', 'straddle_press', 4, { reps: 3, restSec: 150 }),
          ex('planche', 'pseudo_pu', 4, { reps: 8, restSec: 90 }),
        ], 70),
        session('hyb_pull_kraft', { ar: 'قوة سحب', }, [
          ex('pullUp', 'standard', 5, { reps: 5, restSec: 180 }),
          ex('pullUp', 'archer', 4, { reps: 5, restSec: 120 }),
          ex('muscleUp', 'strict_bar', 5, { reps: 3, restSec: 180 }),
          ex('pullUp', 'wide', 3, { reps: 8, restSec: 90 }),
        ], 75),
        session('hyb_pull_skill', { ar: 'مهارات سحب', }, [
          ex('frontLever', 'full', 5, { holdSec: 5, restSec: 120 }),
          ex('backLever', 'full_bl', 4, { holdSec: 8, restSec: 120 }),
          ex('frontLever', 'fl_pull', 4, { reps: 3, restSec: 150 }),
          ex('backLever', 'straddle_bl', 4, { holdSec: 10, restSec: 90 }),
        ], 70),
        session('hyb_legs_core', { ar: 'أرجل + جذع', }, [
          ex('squat', 'pistol', 4, { reps: 6, restSec: 120 }),
          ex('nordicCurl', 'full_neg', 4, { reps: 5, restSec: 150 }),
          ex('humanFlag', 'straddle_flag', 5, { holdSec: 8, restSec: 120 }),
          ex('dragonFlag', 'full_3', 4, { reps: 6, restSec: 120 }),
          ex('lSit', 'v_sit', 3, { holdSec: 10, restSec: 90 }),
        ], 75),
      ],
    },
  ],
};

/* ──────────────── 5) Grease the Groove ──────────────── */

const GTG: CaliProgramDef = {
  key: 'cali_gtg_pullup',
  name: { ar: 'GTG — العقلة', },
  shortName: { ar: 'GTG', },
  author: 'Pavel Tsatsouline',
  description: {
    ar: 'تقنية بافلوف — تكرارات فرعية كثيرة موزعة على اليوم لزيادة عدد العقلات بسرعة.',
  },
  experience: 'intermediate',
  daysPerWeek: 7,
  weeks: 6,
  highlights: [
    { ar: 'يومياً 5-8 جلسات قصيرة.', },
    { ar: 'كل جلسة = 50% من الحد الأقصى.', },
    { ar: 'بدون إرهاق — لا تذهب للفشل.', },
    { ar: 'زيادة 2-3 تكرارات على PR في 6 أسابيع.', },
  ],
  prerequisites: [{ ar: '3+ pull-ups.', }],
  equipment: ['pull_bar'],
  sessionMinutes: 5,
  weekTemplate: [
    {
      index: 1,
      label: { ar: 'أسبوع 1-2 (50% max)', },
      sessions: [
        session('gtg_morning', { ar: 'صباحاً', }, [
          ex('pullUp', 'standard', 1, { reps: 4, notes: { ar: '50% من الحد الأقصى.', } }),
        ], 5),
        session('gtg_noon', { ar: 'ظهراً', }, [
          ex('pullUp', 'standard', 1, { reps: 4 }),
        ], 5),
        session('gtg_afternoon', { ar: 'عصراً', }, [
          ex('pullUp', 'standard', 1, { reps: 4 }),
        ], 5),
        session('gtg_evening', { ar: 'مساءً', }, [
          ex('pullUp', 'standard', 1, { reps: 4 }),
        ], 5),
        session('gtg_night', { ar: 'قبل النوم', }, [
          ex('pullUp', 'standard', 1, { reps: 4 }),
        ], 5),
      ],
    },
    {
      index: 5,
      label: { ar: 'أسبوع 5-6 (70% max)', },
      sessions: [
        session('gtg_max_test', { ar: 'اختبار', }, [
          ex('pullUp', 'standard', 1, { reps: 8, notes: { ar: 'حتى الفشل.', } }),
        ], 10),
      ],
    },
  ],
};

/* ──────────────── 6) Rings program ──────────────── */

const RINGS_PROGRAM: CaliProgramDef = {
  key: 'cali_rings_4d',
  name: { ar: 'الحلقات', },
  shortName: { ar: 'حلقات', },
  author: 'SmartHub Coaching',
  description: {
    ar: 'تدريب حلقات شامل — ثبات، قوة، ديناميكية. الحلقات أصعب من البار وتبني قوة استقرار نادرة.',
  },
  experience: 'advanced',
  daysPerWeek: 4,
  weeks: 12,
  highlights: [
    { ar: 'كل حركة على حلقات = 2× صعوبة بار.', },
    { ar: 'ثبات لوحَي الكتف لا يُضاهى.', },
  ],
  prerequisites: [
    { ar: 'pull-ups 8+ على بار.', },
    { ar: 'dips 8+ على قضبان.', },
  ],
  equipment: ['rings'],
  sessionMinutes: 75,
  weekTemplate: [
    {
      index: 1,
      sessions: [
        session('rings_stab', { ar: 'ثبات أساسي', }, [
          ex('dip', 'ring_dip', 5, { reps: 6, restSec: 120 }),
          ex('backLever', 'german_hang', 4, { holdSec: 20, restSec: 90 }),
          ex('pullUp', 'standard', 4, { reps: 6, restSec: 120 }),
          ex('lSit', 'tuck', 3, { holdSec: 15, restSec: 90 }),
        ], 70),
        session('rings_static', { ar: 'قوة ثابتة', }, [
          ex('frontLever', 'tuck_hold', 5, { holdSec: 10, restSec: 90 }),
          ex('backLever', 'tuck_bl', 4, { holdSec: 12, restSec: 90 }),
          ex('planche', 'tuck_pl', 4, { holdSec: 10, restSec: 90 }),
          ex('lSit', 'full_floor', 3, { holdSec: 15, restSec: 90 }),
        ], 70),
        session('rings_dyn', { ar: 'ديناميكي', }, [
          ex('muscleUp', 'strict_ring', 5, { reps: 3, restSec: 180 }),
          ex('dip', 'korean', 4, { reps: 5, restSec: 120 }),
          ex('muscleUp', 'kipping', 4, { reps: 5, restSec: 120 }),
          ex('pullUp', 'wide', 3, { reps: 8, restSec: 90 }),
        ], 75),
        session('rings_full', { ar: 'جسم كامل', }, [
          ex('pushUp', 'standard', 4, { reps: 12, restSec: 60 }),
          ex('pullUp', 'standard', 4, { reps: 8, restSec: 90 }),
          ex('dip', 'ring_dip', 4, { reps: 8, restSec: 90 }),
          ex('lSit', 'full_floor', 3, { holdSec: 15, restSec: 90 }),
          ex('squat', 'pistol', 3, { reps: 5, restSec: 90 }),
        ], 70),
      ],
    },
  ],
};

/* ──────────────── 7) Pure Pull-up specialization ──────────────── */

const PULLUP_SPEC: CaliProgramDef = {
  key: 'cali_pullup_spec',
  name: { ar: 'تخصص العقلة', },
  shortName: { ar: 'عقلة', },
  author: 'SmartHub Coaching',
  description: {
    ar: 'برنامج 6 أسابيع للوصول من 5 عقلات إلى 15+ — تردد عالٍ مع تنوع.',
  },
  experience: 'intermediate',
  daysPerWeek: 4,
  weeks: 6,
  highlights: [
    { ar: 'تركيز 100% على العقلة.', },
    { ar: 'حجم متصاعد + اختبار أسبوعي.', },
  ],
  prerequisites: [{ ar: '5 strict pull-ups.', }],
  equipment: ['pull_bar'],
  sessionMinutes: 30,
  weekTemplate: [
    {
      index: 1,
      sessions: [
        session('pull_a', { ar: 'A — حجم', }, [
          ex('pullUp', 'standard', 6, { reps: 5, restSec: 120 }),
        ], 25),
        session('pull_b', { ar: 'B — تنوع', }, [
          ex('pullUp', 'wide', 4, { reps: 4, restSec: 120 }),
          ex('pullUp', 'standard', 3, { reps: 6, restSec: 90 }),
        ], 30),
        session('pull_c', { ar: 'C — كثافة', }, [
          ex('pullUp', 'lsit_pullup', 4, { reps: 3, restSec: 150 }),
          ex('pullUp', 'standard', 4, { reps: 5, restSec: 120 }),
        ], 30),
        session('pull_d', { ar: 'D — اختبار', }, [
          ex('pullUp', 'standard', 1, { reps: 5, notes: { ar: 'حتى الفشل.', }, restSec: 0 }),
        ], 10),
      ],
    },
  ],
};

/* ──────────────── 8) Handstand 12-week ──────────────── */

const HANDSTAND_12W: CaliProgramDef = {
  key: 'cali_handstand_12w',
  name: { ar: 'وقوف اليدين — 12 أسبوعاً', },
  shortName: { ar: 'HS', },
  author: 'SmartHub Coaching',
  description: {
    ar: 'برنامج متخصص لوقوف اليدين الحر — من المبتدئ إلى 30 ث حر.',
  },
  experience: 'intermediate',
  daysPerWeek: 5,
  weeks: 12,
  highlights: [
    { ar: 'تدريب يومي قصير 15-25 دقيقة.', },
    { ar: 'يبني توازن الأصابع وقوة الكتف معاً.', },
  ],
  prerequisites: [{ ar: 'ضغط قياسي 10.', }],
  equipment: ['none'],
  sessionMinutes: 20,
  weekTemplate: [
    {
      index: 1,
      sessions: [
        session('hs_a', { ar: 'يوم A', }, [
          ex('handstand', 'wall_plank', 4, { holdSec: 30, restSec: 60 }),
          ex('handstand', 'chest_wall', 4, { holdSec: 20, restSec: 60 }),
          ex('lSit', 'tuck', 3, { holdSec: 15, restSec: 60 }),
        ], 20),
        session('hs_b', { ar: 'يوم B', }, [
          ex('handstand', 'back_wall', 4, { holdSec: 20, restSec: 60 }),
          ex('handstand', 'toe_pull', 4, { holdSec: 5, restSec: 90 }),
          ex('pushUp', 'standard', 3, { reps: 10, restSec: 60 }),
        ], 20),
      ],
    },
    {
      index: 6,
      sessions: [
        session('hs_a', { ar: 'يوم A', }, [
          ex('handstand', 'free_30', 6, { holdSec: 15, restSec: 60 }),
          ex('handstand', 'pike_hspu', 3, { reps: 6, restSec: 90 }),
        ], 25),
      ],
    },
    {
      index: 12,
      label: { ar: 'اختبار', },
      sessions: [
        session('hs_test', { ar: 'اختبار حر', }, [
          ex('handstand', 'free_30', 1, { holdSec: 30, notes: { ar: 'الهدف 30 ث متواصلة.', } }),
        ], 10),
      ],
    },
  ],
};

/* ──────────────── Index ──────────────── */

export const CALI_PROGRAMS: CaliProgramDef[] = [
  FOUNDATIONS,
  PULLUP_SPEC,
  HANDSTAND_12W,
  PPL_CALI,
  GTG,
  HYBRID,
  SKILL_FOCUS,
  RINGS_PROGRAM,
];

export const CALI_PROGRAMS_BY_KEY: Record<string, CaliProgramDef> = Object.fromEntries(
  CALI_PROGRAMS.map((p) => [p.key, p]),
);

export function caliProgramByKey(key: string): CaliProgramDef | null {
  return CALI_PROGRAMS_BY_KEY[key] ?? null;
}

export function caliProgramsForExperience(exp: 'beginner' | 'intermediate' | 'advanced'): CaliProgramDef[] {
  return CALI_PROGRAMS.filter((p) => p.experience === exp);
}

export const CALI_EXP_LABELS: Record<string, LocalizedString> = {
  beginner:     { ar: 'مبتدئ',        },
  intermediate: { ar: 'متوسط',     },
  advanced:     { ar: 'متقدم', },
};
