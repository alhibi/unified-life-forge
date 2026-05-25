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
  name: { ar: 'الأساسات — 8 أسابيع', de: 'Fundamente — 8 Wochen' },
  shortName: { ar: 'الأساسات', de: 'Fundamente' },
  author: 'SmartHub Coaching',
  description: {
    ar: 'برنامج المبتدئ الكامل — يبني الضغط، السحب، السكوات، إل-سيت في 8 أسابيع. ثلاث جلسات أسبوعياً.',
    de: '8-Wochen-Anfängerprogramm — baut Liegestütz, Klimmzug, Squat, L-Sit auf. 3 Sessions/Woche.',
  },
  experience: 'beginner',
  daysPerWeek: 3,
  weeks: 8,
  highlights: [
    { ar: 'لا حاجة لمعدات — فقط بار سحب.', de: 'Kein Equipment außer Klimmzugstange.' },
    { ar: 'تطور بطيء وآمن — كل أسبوع +10% حجم.', de: 'Langsame, sichere Steigerung — +10 % Volumen/Woche.' },
    { ar: 'ينتهي بقدرة 5 pull-ups صارمة + L-sit أرضي.', de: 'Endet bei 5 strikten Klimmzügen + L-Sit am Boden.' },
  ],
  prerequisites: [{ ar: 'لا شروط.', de: 'Keine.' }],
  equipment: ['pull_bar', 'none'],
  sessionMinutes: 50,
  weekTemplate: [
    {
      index: 1,
      sessions: [
        session('found_a', { ar: 'الجلسة A — دفع', de: 'Session A — Drücken' }, [
          ex('pushUp', 'incline', 3, { reps: 12, restSec: 60 }),
          ex('squat', 'air', 3, { reps: 15, restSec: 60 }),
          ex('lSit', 'foot_supp', 3, { holdSec: 20, restSec: 60 }),
          ex('handstand', 'wall_plank', 3, { holdSec: 30, restSec: 60 }),
        ], 50, undefined, { ar: 'ركّز على فورم نظيف فوق العدد.', de: 'Saubere Form über Wdh.-Zahl.' }),
        session('found_b', { ar: 'الجلسة B — سحب', de: 'Session B — Ziehen' }, [
          ex('pullUp', 'dead_hang', 3, { holdSec: 20, restSec: 60 }),
          ex('pullUp', 'scapular', 3, { reps: 8, restSec: 60 }),
          ex('squat', 'split', 3, { reps: 10, restSec: 60 }),
          ex('dragonFlag', 'hollow_hold', 3, { holdSec: 20, restSec: 60 }),
        ], 50),
        session('found_c', { ar: 'الجلسة C — كامل', de: 'Session C — Ganzkörper' }, [
          ex('pushUp', 'knee', 3, { reps: 10, restSec: 60 }),
          ex('pullUp', 'negative', 3, { reps: 4, restSec: 90 }),
          ex('squat', 'air', 3, { reps: 18, restSec: 60 }),
          ex('lSit', 'one_leg', 3, { holdSec: 12, restSec: 60 }),
        ], 55),
      ],
    },
    {
      index: 4,
      label: { ar: 'الأسبوع 4 — منتصف', de: 'Woche 4 — Mitte' },
      sessions: [
        session('found_a', { ar: 'الجلسة A — دفع', de: 'Session A — Drücken' }, [
          ex('pushUp', 'standard', 3, { reps: 8, restSec: 90 }),
          ex('squat', 'split', 3, { reps: 12, restSec: 60 }),
          ex('lSit', 'tuck', 3, { holdSec: 15, restSec: 60 }),
          ex('handstand', 'chest_wall', 3, { holdSec: 20, restSec: 60 }),
        ], 55),
      ],
    },
    {
      index: 8,
      label: { ar: 'الأسبوع 8 — اختبار', de: 'Woche 8 — Test' },
      sessions: [
        session('found_test', { ar: 'يوم الاختبار', de: 'Testtag' }, [
          ex('pushUp', 'standard', 1, { reps: 15, restSec: 120, notes: { ar: '15 = نجاح كامل.', de: '15 = bestanden.' } }),
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
  name: { ar: 'PPL كاليستنيكس', de: 'Calisthenics PPL' },
  shortName: { ar: 'PPL', de: 'PPL' },
  author: 'SmartHub Coaching',
  description: {
    ar: 'تقسيم Push/Pull/Legs مكرر مرتين أسبوعياً — حجم مرتفع لمتقدمين.',
    de: 'Push/Pull/Legs zweimal — hohes Volumen für Fortgeschrittene.',
  },
  experience: 'intermediate',
  daysPerWeek: 6,
  weeks: 12,
  highlights: [
    { ar: '15-22 مجموعة لكل عضلة كبيرة.', de: '15-22 Sätze pro Hauptmuskel.' },
    { ar: 'يطور الضغط، العقلة، الديبس بشكل مستقل.', de: 'Push, Pull, Dip parallel entwickeln.' },
  ],
  prerequisites: [
    { ar: '5 strict pull-ups.', de: '5 strikte Klimmzüge.' },
    { ar: '15 push-ups.', de: '15 Liegestütze.' },
  ],
  equipment: ['pull_bar', 'dip_bars'],
  sessionMinutes: 70,
  weekTemplate: [
    {
      index: 1,
      sessions: [
        session('push_a', { ar: 'دفع A', de: 'Push A' }, [
          ex('pushUp', 'standard', 4, { reps: 10, restSec: 90 }),
          ex('dip', 'parallel', 4, { reps: 8, restSec: 90 }),
          ex('handstand', 'pike_hspu', 3, { reps: 8, restSec: 120 }),
          ex('pushUp', 'diamond', 3, { reps: 10, restSec: 60 }),
          ex('lSit', 'full_floor', 3, { holdSec: 15, restSec: 60 }),
        ], 70),
        session('pull_a', { ar: 'سحب A', de: 'Pull A' }, [
          ex('pullUp', 'standard', 4, { reps: 6, restSec: 120 }),
          ex('frontLever', 'tuck_hold', 4, { holdSec: 12, restSec: 90 }),
          ex('pullUp', 'wide', 3, { reps: 6, restSec: 90 }),
          ex('backLever', 'german_hang', 3, { holdSec: 20, restSec: 90 }),
        ], 70),
        session('legs_a', { ar: 'أرجل A', de: 'Beine A' }, [
          ex('squat', 'bulgarian', 4, { reps: 10, restSec: 90 }),
          ex('nordicCurl', 'top_30', 3, { reps: 6, restSec: 120 }),
          ex('squat', 'cossack', 3, { reps: 8, restSec: 60 }),
          ex('squat', 'pistol_neg', 3, { reps: 5, restSec: 120 }),
        ], 65),
        session('push_b', { ar: 'دفع B', de: 'Push B' }, [
          ex('handstand', 'wall_hspu', 4, { reps: 5, restSec: 150 }),
          ex('dip', 'ring_dip', 4, { reps: 6, restSec: 120 }),
          ex('planche', 'lean', 4, { holdSec: 20, restSec: 90 }),
          ex('pushUp', 'decline', 3, { reps: 12, restSec: 60 }),
          ex('handstand', 'free_30', 5, { holdSec: 20, restSec: 60 }),
        ], 70),
        session('pull_b', { ar: 'سحب B', de: 'Pull B' }, [
          ex('pullUp', 'lsit_pullup', 4, { reps: 5, restSec: 120 }),
          ex('frontLever', 'adv_tuck', 4, { holdSec: 10, restSec: 90 }),
          ex('muscleUp', 'high_pull', 5, { reps: 3, restSec: 120 }),
          ex('pullUp', 'archer', 3, { reps: 4, restSec: 90 }),
          ex('backLever', 'tuck_bl', 3, { holdSec: 12, restSec: 90 }),
        ], 70),
        session('legs_b', { ar: 'أرجل B', de: 'Beine B' }, [
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
  name: { ar: 'تركيز المهارات', de: 'Skill-Fokus' },
  shortName: { ar: 'مهارات', de: 'Skills' },
  author: 'SmartHub Coaching',
  description: {
    ar: 'برنامج للمهارات الثابتة — handstand، planche، front lever، back lever معاً.',
    de: 'Programm für statische Skills — Handstand, Planche, Front Lever, Back Lever.',
  },
  experience: 'advanced',
  daysPerWeek: 4,
  weeks: 12,
  highlights: [
    { ar: 'حجم منخفض، تردد عالٍ — كل مهارة 2× أسبوعياً.', de: 'Geringes Volumen, hohe Frequenz — jede Skill 2×/Woche.' },
    { ar: 'تركّز على holds 5-15 ث متعددة.', de: 'Viele Holds 5-15s.' },
    { ar: 'يبني قوة ثابتة استثنائية.', de: 'Außergewöhnliche statische Kraft.' },
  ],
  prerequisites: [
    { ar: 'pull-ups صارمة 10+.', de: '10+ strikte Klimmzüge.' },
    { ar: 'وقوف اليدين 30 ث.', de: 'Handstand 30s.' },
    { ar: 'tuck planche 10 ث.', de: 'Tuck Planche 10s.' },
  ],
  equipment: ['pull_bar', 'parallettes', 'rings'],
  sessionMinutes: 75,
  weekTemplate: [
    {
      index: 1,
      sessions: [
        session('static_push_a', { ar: 'دفع ثابت A', de: 'Static Push A' }, [
          ex('handstand', 'free_30', 6, { holdSec: 20, restSec: 90, notes: { ar: 'محاولات متكررة.', de: 'Viele Versuche.' } }),
          ex('planche', 'tuck_pl', 5, { holdSec: 10, restSec: 90 }),
          ex('handstand', 'wall_hspu', 4, { reps: 5, restSec: 120 }),
          ex('planche', 'pseudo_pu', 4, { reps: 8, restSec: 90 }),
          ex('press2HS', 'straddle_neg', 4, { reps: 5, restSec: 120 }),
        ], 80),
        session('static_pull_a', { ar: 'سحب ثابت A', de: 'Static Pull A' }, [
          ex('frontLever', 'straddle', 5, { holdSec: 10, restSec: 90 }),
          ex('backLever', 'full_bl', 4, { holdSec: 8, restSec: 120 }),
          ex('pullUp', 'archer', 4, { reps: 5, restSec: 90 }),
          ex('frontLever', 'tuck_raise', 4, { reps: 6, restSec: 90 }),
          ex('pullUp', 'standard', 4, { reps: 8, restSec: 90 }),
        ], 75),
        session('static_push_b', { ar: 'دفع ثابت B', de: 'Static Push B' }, [
          ex('planche', 'adv_tuck_pl', 5, { holdSec: 8, restSec: 120 }),
          ex('handstand', 'hs_walk', 4, { reps: 10, restSec: 60 }),
          ex('handstand', 'pike_hspu', 4, { reps: 8, restSec: 90 }),
          ex('press2HS', 'wall_straddle', 4, { reps: 4, restSec: 120 }),
        ], 70),
        session('static_pull_b', { ar: 'سحب ثابت B', de: 'Static Pull B' }, [
          ex('frontLever', 'one_leg', 4, { holdSec: 12, restSec: 90 }),
          ex('backLever', 'straddle_bl', 4, { holdSec: 10, restSec: 90 }),
          ex('humanFlag', 'tuck_flag', 5, { holdSec: 8, restSec: 120 }),
          ex('frontLever', 'tuck_raise', 4, { reps: 6, restSec: 90 }),
        ], 75),
      ],
    },
    {
      index: 6,
      label: { ar: 'ديلود', de: 'Deload' },
      sessions: [
        session('static_deload', { ar: 'ديلود — تخفيف', de: 'Deload' }, [
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
  name: { ar: 'هجين قوة + مهارات', de: 'Hybrid: Kraft + Skills' },
  shortName: { ar: 'هجين', de: 'Hybrid' },
  author: 'SmartHub Coaching',
  description: {
    ar: 'يجمع بين بناء القوة الأساسية (pull-ups مثقلة، dips مثقلة) وتعلم المهارات.',
    de: 'Verbindet Grundkraft (gewichtete Klimmzüge/Dips) mit Skill-Lernen.',
  },
  experience: 'advanced',
  daysPerWeek: 5,
  weeks: 12,
  highlights: [
    { ar: 'يومان قوة مثقلة + ثلاثة مهارات.', de: '2× Krafttag + 3× Skill.' },
    { ar: 'تطور قياسي + مهارات بصرية.', de: 'Messbare Steigerung + visuelle Skills.' },
  ],
  prerequisites: [
    { ar: 'pull-ups 10+ ودubps 10+.', de: '10+ Klimmzüge & Dips.' },
  ],
  equipment: ['pull_bar', 'dip_bars', 'rings', 'weight_belt'],
  sessionMinutes: 80,
  weekTemplate: [
    {
      index: 1,
      sessions: [
        session('hyb_push_kraft', { ar: 'قوة دفع', de: 'Push Kraft' }, [
          ex('dip', 'weighted', 5, { reps: 5, restSec: 180 }),
          ex('pushUp', 'one_arm', 4, { reps: 5, restSec: 120 }),
          ex('handstand', 'wall_hspu', 4, { reps: 5, restSec: 150 }),
          ex('pushUp', 'archer', 3, { reps: 6, restSec: 90 }),
        ], 75),
        session('hyb_push_skill', { ar: 'مهارات دفع', de: 'Push Skills' }, [
          ex('planche', 'adv_tuck_pl', 5, { holdSec: 10, restSec: 120 }),
          ex('handstand', 'free_30', 6, { holdSec: 20, restSec: 60 }),
          ex('press2HS', 'straddle_press', 4, { reps: 3, restSec: 150 }),
          ex('planche', 'pseudo_pu', 4, { reps: 8, restSec: 90 }),
        ], 70),
        session('hyb_pull_kraft', { ar: 'قوة سحب', de: 'Pull Kraft' }, [
          ex('pullUp', 'standard', 5, { reps: 5, restSec: 180 }),
          ex('pullUp', 'archer', 4, { reps: 5, restSec: 120 }),
          ex('muscleUp', 'strict_bar', 5, { reps: 3, restSec: 180 }),
          ex('pullUp', 'wide', 3, { reps: 8, restSec: 90 }),
        ], 75),
        session('hyb_pull_skill', { ar: 'مهارات سحب', de: 'Pull Skills' }, [
          ex('frontLever', 'full', 5, { holdSec: 5, restSec: 120 }),
          ex('backLever', 'full_bl', 4, { holdSec: 8, restSec: 120 }),
          ex('frontLever', 'fl_pull', 4, { reps: 3, restSec: 150 }),
          ex('backLever', 'straddle_bl', 4, { holdSec: 10, restSec: 90 }),
        ], 70),
        session('hyb_legs_core', { ar: 'أرجل + جذع', de: 'Beine + Core' }, [
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
  name: { ar: 'GTG — العقلة', de: 'GTG — Klimmzug' },
  shortName: { ar: 'GTG', de: 'GTG' },
  author: 'Pavel Tsatsouline',
  description: {
    ar: 'تقنية بافلوف — تكرارات فرعية كثيرة موزعة على اليوم لزيادة عدد العقلات بسرعة.',
    de: 'Pawlow-Technik — viele submaximale Wdh. über den Tag, um Klimmzug-Zahl schnell zu steigern.',
  },
  experience: 'intermediate',
  daysPerWeek: 7,
  weeks: 6,
  highlights: [
    { ar: 'يومياً 5-8 جلسات قصيرة.', de: 'Täglich 5-8 kurze Sessions.' },
    { ar: 'كل جلسة = 50% من الحد الأقصى.', de: 'Pro Session = 50 % vom Max.' },
    { ar: 'بدون إرهاق — لا تذهب للفشل.', de: 'Ohne Erschöpfung — kein Versagen.' },
    { ar: 'زيادة 2-3 تكرارات على PR في 6 أسابيع.', de: '+2-3 Wdh. auf PR in 6 Wochen.' },
  ],
  prerequisites: [{ ar: '3+ pull-ups.', de: '3+ Klimmzüge.' }],
  equipment: ['pull_bar'],
  sessionMinutes: 5,
  weekTemplate: [
    {
      index: 1,
      label: { ar: 'أسبوع 1-2 (50% max)', de: 'Woche 1-2 (50 % Max)' },
      sessions: [
        session('gtg_morning', { ar: 'صباحاً', de: 'Morgens' }, [
          ex('pullUp', 'standard', 1, { reps: 4, notes: { ar: '50% من الحد الأقصى.', de: '50 % vom Max.' } }),
        ], 5),
        session('gtg_noon', { ar: 'ظهراً', de: 'Mittags' }, [
          ex('pullUp', 'standard', 1, { reps: 4 }),
        ], 5),
        session('gtg_afternoon', { ar: 'عصراً', de: 'Nachmittag' }, [
          ex('pullUp', 'standard', 1, { reps: 4 }),
        ], 5),
        session('gtg_evening', { ar: 'مساءً', de: 'Abend' }, [
          ex('pullUp', 'standard', 1, { reps: 4 }),
        ], 5),
        session('gtg_night', { ar: 'قبل النوم', de: 'Vor dem Schlaf' }, [
          ex('pullUp', 'standard', 1, { reps: 4 }),
        ], 5),
      ],
    },
    {
      index: 5,
      label: { ar: 'أسبوع 5-6 (70% max)', de: 'Woche 5-6 (70 % Max)' },
      sessions: [
        session('gtg_max_test', { ar: 'اختبار', de: 'Test' }, [
          ex('pullUp', 'standard', 1, { reps: 8, notes: { ar: 'حتى الفشل.', de: 'Bis zum Versagen.' } }),
        ], 10),
      ],
    },
  ],
};

/* ──────────────── 6) Rings program ──────────────── */

const RINGS_PROGRAM: CaliProgramDef = {
  key: 'cali_rings_4d',
  name: { ar: 'الحلقات', de: 'Ringtraining' },
  shortName: { ar: 'حلقات', de: 'Ringe' },
  author: 'SmartHub Coaching',
  description: {
    ar: 'تدريب حلقات شامل — ثبات، قوة، ديناميكية. الحلقات أصعب من البار وتبني قوة استقرار نادرة.',
    de: 'Umfassendes Ringtraining — Stabilität, Kraft, Dynamik. Ringe sind härter als Stange, bauen seltene Stabilität.',
  },
  experience: 'advanced',
  daysPerWeek: 4,
  weeks: 12,
  highlights: [
    { ar: 'كل حركة على حلقات = 2× صعوبة بار.', de: 'Jede Ringbewegung 2× härter als Stange.' },
    { ar: 'ثبات لوحَي الكتف لا يُضاهى.', de: 'Unvergleichliche Schulterblattstabilität.' },
  ],
  prerequisites: [
    { ar: 'pull-ups 8+ على بار.', de: '8+ Klimmzüge an Stange.' },
    { ar: 'dips 8+ على قضبان.', de: '8+ Dips am Barren.' },
  ],
  equipment: ['rings'],
  sessionMinutes: 75,
  weekTemplate: [
    {
      index: 1,
      sessions: [
        session('rings_stab', { ar: 'ثبات أساسي', de: 'Grundstabilität' }, [
          ex('dip', 'ring_dip', 5, { reps: 6, restSec: 120 }),
          ex('backLever', 'german_hang', 4, { holdSec: 20, restSec: 90 }),
          ex('pullUp', 'standard', 4, { reps: 6, restSec: 120 }),
          ex('lSit', 'tuck', 3, { holdSec: 15, restSec: 90 }),
        ], 70),
        session('rings_static', { ar: 'قوة ثابتة', de: 'Statische Kraft' }, [
          ex('frontLever', 'tuck_hold', 5, { holdSec: 10, restSec: 90 }),
          ex('backLever', 'tuck_bl', 4, { holdSec: 12, restSec: 90 }),
          ex('planche', 'tuck_pl', 4, { holdSec: 10, restSec: 90 }),
          ex('lSit', 'full_floor', 3, { holdSec: 15, restSec: 90 }),
        ], 70),
        session('rings_dyn', { ar: 'ديناميكي', de: 'Dynamisch' }, [
          ex('muscleUp', 'strict_ring', 5, { reps: 3, restSec: 180 }),
          ex('dip', 'korean', 4, { reps: 5, restSec: 120 }),
          ex('muscleUp', 'kipping', 4, { reps: 5, restSec: 120 }),
          ex('pullUp', 'wide', 3, { reps: 8, restSec: 90 }),
        ], 75),
        session('rings_full', { ar: 'جسم كامل', de: 'Ganzkörper' }, [
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
  name: { ar: 'تخصص العقلة', de: 'Klimmzug-Spezialisierung' },
  shortName: { ar: 'عقلة', de: 'Klimmzug' },
  author: 'SmartHub Coaching',
  description: {
    ar: 'برنامج 6 أسابيع للوصول من 5 عقلات إلى 15+ — تردد عالٍ مع تنوع.',
    de: '6-Wochen-Plan: von 5 zu 15+ Klimmzügen — hohe Frequenz mit Variation.',
  },
  experience: 'intermediate',
  daysPerWeek: 4,
  weeks: 6,
  highlights: [
    { ar: 'تركيز 100% على العقلة.', de: '100 % Klimmzug-Fokus.' },
    { ar: 'حجم متصاعد + اختبار أسبوعي.', de: 'Steigendes Volumen + Wochentest.' },
  ],
  prerequisites: [{ ar: '5 strict pull-ups.', de: '5 strikte Klimmzüge.' }],
  equipment: ['pull_bar'],
  sessionMinutes: 30,
  weekTemplate: [
    {
      index: 1,
      sessions: [
        session('pull_a', { ar: 'A — حجم', de: 'A — Volumen' }, [
          ex('pullUp', 'standard', 6, { reps: 5, restSec: 120 }),
        ], 25),
        session('pull_b', { ar: 'B — تنوع', de: 'B — Variation' }, [
          ex('pullUp', 'wide', 4, { reps: 4, restSec: 120 }),
          ex('pullUp', 'standard', 3, { reps: 6, restSec: 90 }),
        ], 30),
        session('pull_c', { ar: 'C — كثافة', de: 'C — Intensität' }, [
          ex('pullUp', 'lsit_pullup', 4, { reps: 3, restSec: 150 }),
          ex('pullUp', 'standard', 4, { reps: 5, restSec: 120 }),
        ], 30),
        session('pull_d', { ar: 'D — اختبار', de: 'D — Test' }, [
          ex('pullUp', 'standard', 1, { reps: 5, notes: { ar: 'حتى الفشل.', de: 'Bis zum Versagen.' }, restSec: 0 }),
        ], 10),
      ],
    },
  ],
};

/* ──────────────── 8) Handstand 12-week ──────────────── */

const HANDSTAND_12W: CaliProgramDef = {
  key: 'cali_handstand_12w',
  name: { ar: 'وقوف اليدين — 12 أسبوعاً', de: 'Handstand — 12 Wochen' },
  shortName: { ar: 'HS', de: 'HS' },
  author: 'SmartHub Coaching',
  description: {
    ar: 'برنامج متخصص لوقوف اليدين الحر — من المبتدئ إلى 30 ث حر.',
    de: 'Spezialprogramm Handstand — vom Anfänger zu 30s freistehend.',
  },
  experience: 'intermediate',
  daysPerWeek: 5,
  weeks: 12,
  highlights: [
    { ar: 'تدريب يومي قصير 15-25 دقيقة.', de: 'Tägliche kurze Sessions 15-25 Min.' },
    { ar: 'يبني توازن الأصابع وقوة الكتف معاً.', de: 'Fingerbalance + Schulterkraft parallel.' },
  ],
  prerequisites: [{ ar: 'ضغط قياسي 10.', de: '10 Standard-Liegestütze.' }],
  equipment: ['none'],
  sessionMinutes: 20,
  weekTemplate: [
    {
      index: 1,
      sessions: [
        session('hs_a', { ar: 'يوم A', de: 'Tag A' }, [
          ex('handstand', 'wall_plank', 4, { holdSec: 30, restSec: 60 }),
          ex('handstand', 'chest_wall', 4, { holdSec: 20, restSec: 60 }),
          ex('lSit', 'tuck', 3, { holdSec: 15, restSec: 60 }),
        ], 20),
        session('hs_b', { ar: 'يوم B', de: 'Tag B' }, [
          ex('handstand', 'back_wall', 4, { holdSec: 20, restSec: 60 }),
          ex('handstand', 'toe_pull', 4, { holdSec: 5, restSec: 90 }),
          ex('pushUp', 'standard', 3, { reps: 10, restSec: 60 }),
        ], 20),
      ],
    },
    {
      index: 6,
      sessions: [
        session('hs_a', { ar: 'يوم A', de: 'Tag A' }, [
          ex('handstand', 'free_30', 6, { holdSec: 15, restSec: 60 }),
          ex('handstand', 'pike_hspu', 3, { reps: 6, restSec: 90 }),
        ], 25),
      ],
    },
    {
      index: 12,
      label: { ar: 'اختبار', de: 'Test' },
      sessions: [
        session('hs_test', { ar: 'اختبار حر', de: 'Freistand-Test' }, [
          ex('handstand', 'free_30', 1, { holdSec: 30, notes: { ar: 'الهدف 30 ث متواصلة.', de: 'Ziel: 30s am Stück.' } }),
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
  beginner:     { ar: 'مبتدئ',     de: 'Anfänger'        },
  intermediate: { ar: 'متوسط',     de: 'Mittelstufe'     },
  advanced:     { ar: 'متقدم',     de: 'Fortgeschritten' },
};
