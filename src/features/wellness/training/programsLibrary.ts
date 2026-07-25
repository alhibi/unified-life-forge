/**
 * Library of pre-built strength programs.
 *
 * Each program is a self-contained `ProgramDef` — week template, sessions,
 * exercises, set counts, and the progression rule that drives week-over-week
 * adjustments. All values are deterministic; if the user wants a custom
 * program they can clone the closest preset and edit.
 *
 * Sources are credited inline. None of the templates here are auto-translated
 * — Arabic and German strings were authored side-by-side.
 */

import type { LocalizedString,PrescribedExercise, PrescribedSet, ProgramDef } from './types';

/* ────────────────── Helpers ────────────────── */

const sets = (count: number, reps: number, opts: Partial<PrescribedSet> = {}): PrescribedSet[] =>
  Array.from({ length: count }, () => ({ reps, ...opts }));

const amrapSets = (count: number, reps: number, opts: Partial<PrescribedSet> = {}): PrescribedSet[] => [
  ...Array.from({ length: count - 1 }, () => ({ reps, ...opts })),
  { reps, amrap: true, ...opts },
];

const ex = (
  exerciseKey: string,
  sets_: PrescribedSet[],
  notes?: LocalizedString,
  defaultRestSec = 90,
): PrescribedExercise => ({ exerciseKey, sets: sets_, notes, defaultRestSec });

/* ────────────────── 1) Stronglifts 5×5 ────────────────── */

const STRONGLIFTS_55: ProgramDef = {
  key: 'stronglifts_55',
  name: { ar: 'سترونغ ليفتس 5×5', },
  shortName: { ar: 'SL 5×5', },
  author: 'Mehdi Hadim',
  origin: 'StrongLifts.com',
  experience: 'beginner',
  goal: 'strength',
  daysPerWeek: 3,
  weeks: 12,
  sessionMinutes: 50,
  description: {
    ar: 'برنامج المبتدئين الأشهر — خمسة تمارين مركّبة فقط ثلاث مرات أسبوعياً مع زيادة خطية. يبني أساس قوة صلب في 12 أسبوعاً.',
  },
  highlights: [
    { ar: 'خمسة تمارين فقط — لا شيء معقد.', },
    { ar: 'إضافة 2.5 كغ كل جلسة على المركّبات.', },
    { ar: 'انخفاض تلقائي 10% بعد فشل ثلاث مرات.', },
    { ar: '50 دقيقة لكل جلسة — مناسب للمشغول.', },
  ],
  equipment: ['barbell', 'rack', 'bench'],
  prerequisites: [
    { ar: 'لا شروط — هذا برنامج المبتدئ المثالي.', },
  ],
  scheme: { ar: 'خطّي ABA / BAB', },
  progression: { kind: 'linear', addKgUpper: 2.5, addKgLower: 2.5, addKgPress: 2.5 },
  weekTemplate: [
    {
      index: 1,
      sessions: [
        {
          key: 'sl_a',
          name: { ar: 'الجلسة A', },
          banner: { ar: 'سكوات + بنش + تجديف', },
          estMinutes: 50,
          exercises: [
            ex('squat', sets(5, 5), { ar: 'العمود الفقري للبرنامج كله.', }, 180),
            ex('bench', sets(5, 5), undefined, 180),
            ex('bent_row', sets(5, 5), undefined, 120),
          ],
        },
        {
          key: 'sl_b',
          name: { ar: 'الجلسة B', },
          banner: { ar: 'سكوات + ضغط رأس + ديدليفت', },
          estMinutes: 50,
          exercises: [
            ex('squat', sets(5, 5), undefined, 180),
            ex('ohp', sets(5, 5), undefined, 180),
            ex('deadlift', sets(1, 5), { ar: 'مجموعة عاملة واحدة فقط — حمل عالٍ.', }, 240),
          ],
        },
      ],
    },
  ],
};

/* ────────────────── 2) GreySkull LP ────────────────── */

const GREYSKULL: ProgramDef = {
  key: 'greyskull_lp',
  name: { ar: 'غرايسكال LP', },
  shortName: { ar: 'GSLP', },
  author: 'John "Johnny Pain" Sherwood',
  experience: 'beginner',
  goal: 'powerbuilding',
  daysPerWeek: 3,
  weeks: 12,
  sessionMinutes: 55,
  description: {
    ar: 'تطور خطّي مع AMRAP في المجموعة الأخيرة. أحجام تجميل أعلى من سترونغ ليفتس مع نفس بساطة التطور.',
  },
  highlights: [
    { ar: 'AMRAP في المجموعة الأخيرة — تختبر قواك كل جلسة.', },
    { ar: 'يضم تمارين عزل (curl/triceps) للذراعين.', },
    { ar: 'سهل التطور — رفع مزدوج عند 10+ تكرار في الـ AMRAP.', },
  ],
  equipment: ['barbell', 'rack', 'bench', 'pull_up_bar'],
  scheme: { ar: 'خطّي + AMRAP', },
  progression: { kind: 'amrap', minReps: 5, addKgWhenAbove: 2.5 },
  weekTemplate: [
    {
      index: 1,
      sessions: [
        {
          key: 'gs_a',
          name: { ar: 'A — بنش + سكوات', },
          estMinutes: 55,
          exercises: [
            ex('bench', amrapSets(3, 5), undefined, 150),
            ex('squat', amrapSets(3, 5), undefined, 180),
            ex('chin_up', sets(3, 8), undefined, 120),
            ex('barbell_curl', sets(3, 10), undefined, 90),
          ],
        },
        {
          key: 'gs_b',
          name: { ar: 'B — ضغط + ديدليفت', },
          estMinutes: 55,
          exercises: [
            ex('ohp', amrapSets(3, 5), undefined, 150),
            ex('deadlift', amrapSets(1, 5), { ar: 'مجموعة AMRAP وحيدة.', }, 240),
            ex('bent_row', sets(3, 8), undefined, 120),
            ex('skull_crusher', sets(3, 10), undefined, 90),
          ],
        },
      ],
    },
  ],
};

/* ────────────────── 3) PPL (6-day Push/Pull/Legs) ────────────────── */

const PPL: ProgramDef = {
  key: 'ppl_6day',
  name: { ar: 'PPL ست أيام', },
  shortName: { ar: 'PPL 6', },
  author: 'Reddit r/Fitness wiki',
  experience: 'intermediate',
  goal: 'hypertrophy',
  daysPerWeek: 6,
  weeks: 8,
  sessionMinutes: 75,
  description: {
    ar: 'تقسيم Push/Pull/Legs مكرر مرتين أسبوعياً. تردد عالٍ + حجم عالٍ — الخيار رقم 1 لمتوسطين يبحثون عن الضخامة.',
  },
  highlights: [
    { ar: 'كل عضلة تُضرب مرتين أسبوعياً.', },
    { ar: 'يوم Push A ثقيل، Push B متوسط (حجم).', },
    { ar: '15-22 مجموعة لكل عضلة كبيرة أسبوعياً.', },
    { ar: 'تطور بنظام Double Progression.', },
  ],
  equipment: ['barbell', 'rack', 'bench', 'dumbbells', 'cable'],
  scheme: { ar: 'تقسيم 6 أيام', },
  progression: { kind: 'double', topRepRange: [6, 10], addKg: 2.5 },
  weekTemplate: [
    {
      index: 1,
      sessions: [
        {
          key: 'ppl_push_a',
          name: { ar: 'دفع A (ثقيل)', },
          estMinutes: 75,
          exercises: [
            ex('bench', sets(4, 6), undefined, 180),
            ex('ohp', sets(3, 8), undefined, 150),
            ex('incline_dumbbell_press', sets(3, 10), undefined, 120),
            ex('lateral_raise', sets(4, 12), undefined, 60),
            ex('skull_crusher', sets(3, 10), undefined, 90),
            ex('tricep_pushdown', sets(3, 12), undefined, 60),
          ],
        },
        {
          key: 'ppl_pull_a',
          name: { ar: 'سحب A (ثقيل)', },
          estMinutes: 75,
          exercises: [
            ex('deadlift', sets(3, 5), undefined, 240),
            ex('pull_up', sets(3, 8), undefined, 150),
            ex('bent_row', sets(3, 8), undefined, 120),
            ex('face_pull', sets(3, 15), undefined, 60),
            ex('barbell_curl', sets(3, 10), undefined, 90),
            ex('hammer_curl', sets(3, 12), undefined, 60),
          ],
        },
        {
          key: 'ppl_legs_a',
          name: { ar: 'أرجل A (ثقيل)', },
          estMinutes: 75,
          exercises: [
            ex('squat', sets(4, 6), undefined, 180),
            ex('romanian_dl', sets(3, 8), undefined, 150),
            ex('bulgarian_split', sets(3, 10), undefined, 90),
            ex('leg_curl', sets(3, 12), undefined, 60),
            ex('calf_raise', sets(4, 12), undefined, 60),
          ],
        },
        {
          key: 'ppl_push_b',
          name: { ar: 'دفع B (حجم)', },
          estMinutes: 75,
          exercises: [
            ex('incline_bench', sets(4, 8), undefined, 150),
            ex('dumbbell_press', sets(3, 10), undefined, 120),
            ex('arnold_press', sets(3, 10), undefined, 90),
            ex('cable_crossover', sets(3, 12), undefined, 60),
            ex('lateral_raise', sets(4, 15), undefined, 45),
            ex('overhead_extension', sets(3, 12), undefined, 60),
          ],
        },
        {
          key: 'ppl_pull_b',
          name: { ar: 'سحب B (حجم)', },
          estMinutes: 75,
          exercises: [
            ex('lat_pulldown', sets(4, 10), undefined, 90),
            ex('cable_row', sets(4, 10), undefined, 90),
            ex('chin_up', sets(3, 8), undefined, 120),
            ex('rear_delt_fly', sets(3, 15), undefined, 45),
            ex('preacher_curl', sets(3, 10), undefined, 60),
            ex('cable_curl', sets(3, 12), undefined, 60),
          ],
        },
        {
          key: 'ppl_legs_b',
          name: { ar: 'أرجل B (حجم)', },
          estMinutes: 75,
          exercises: [
            ex('front_squat', sets(4, 8), undefined, 150),
            ex('hip_thrust', sets(3, 10), undefined, 120),
            ex('leg_press', sets(3, 12), undefined, 90),
            ex('leg_extension', sets(3, 15), undefined, 60),
            ex('leg_curl', sets(3, 15), undefined, 60),
            ex('calf_raise', sets(4, 20), undefined, 45),
          ],
        },
      ],
    },
  ],
};

/* ────────────────── 4) Wendler 5/3/1 BBB ────────────────── */

const W531_BBB: ProgramDef = {
  key: 'w531_bbb',
  name: { ar: 'وندلر 5/3/1 BBB', },
  shortName: { ar: '5/3/1 BBB', },
  author: 'Jim Wendler',
  origin: '5/3/1: The Simplest and Most Effective Training System',
  experience: 'intermediate',
  goal: 'powerbuilding',
  daysPerWeek: 4,
  weeks: 16,
  sessionMinutes: 70,
  description: {
    ar: 'دورة الأسابيع الأربعة الكلاسيكية — 5s, 3s, 1s, ديلود. مع "Boring But Big" 5×10 على نفس الحركة.',
  },
  highlights: [
    { ar: 'تطوّر بطيء لكن لا يفشل تقريباً.', },
    { ar: 'TM = 90% من 1RM الحقيقي — يمنحك مساحة أمان.', },
    { ar: '5×10 BBB يضيف حجم تجميل ضخم.', },
    { ar: 'دورة كاملة كل 4 أسابيع — قابل للقياس.', },
  ],
  equipment: ['barbell', 'rack', 'bench'],
  scheme: { ar: '5/3/1 + BBB 5×10', },
  progression: { kind: '531', trainingMaxPct: 0.9 },
  weekTemplate: [
    {
      index: 1,
      label: { ar: 'أسبوع الـ 5s', },
      sessions: [
        {
          key: '531_squat',
          name: { ar: 'يوم السكوات', },
          estMinutes: 70,
          exercises: [
            ex('squat', [
              { reps: 5, pct1RM: 65 },
              { reps: 5, pct1RM: 75 },
              { reps: 5, pct1RM: 85, amrap: true },
            ], { ar: 'استخدم TM = 0.9 × 1RM.', }, 240),
            ex('squat', sets(5, 10, { pct1RM: 50 }), { ar: 'BBB — 5 مجموعات × 10 تكرارات', }, 90),
            ex('leg_curl', sets(5, 10), undefined, 60),
          ],
        },
        {
          key: '531_bench',
          name: { ar: 'يوم البنش', },
          estMinutes: 70,
          exercises: [
            ex('bench', [
              { reps: 5, pct1RM: 65 },
              { reps: 5, pct1RM: 75 },
              { reps: 5, pct1RM: 85, amrap: true },
            ], undefined, 240),
            ex('bench', sets(5, 10, { pct1RM: 50 }), undefined, 90),
            ex('chin_up', sets(5, 10), undefined, 90),
          ],
        },
        {
          key: '531_dl',
          name: { ar: 'يوم الديدليفت', },
          estMinutes: 70,
          exercises: [
            ex('deadlift', [
              { reps: 5, pct1RM: 65 },
              { reps: 5, pct1RM: 75 },
              { reps: 5, pct1RM: 85, amrap: true },
            ], undefined, 240),
            ex('deadlift', sets(5, 10, { pct1RM: 50 }), { ar: 'حذراً — حجم ديدليفت عالٍ.', }, 120),
            ex('hanging_leg_raise', sets(5, 10), undefined, 60),
          ],
        },
        {
          key: '531_ohp',
          name: { ar: 'يوم الضغط', },
          estMinutes: 70,
          exercises: [
            ex('ohp', [
              { reps: 5, pct1RM: 65 },
              { reps: 5, pct1RM: 75 },
              { reps: 5, pct1RM: 85, amrap: true },
            ], undefined, 240),
            ex('ohp', sets(5, 10, { pct1RM: 50 }), undefined, 90),
            ex('dip', sets(5, 10), undefined, 90),
          ],
        },
      ],
    },
    {
      index: 2,
      label: { ar: 'أسبوع الـ 3s', },
      sessions: [
        {
          key: '531_squat',
          name: { ar: 'يوم السكوات', },
          estMinutes: 70,
          exercises: [
            ex('squat', [
              { reps: 3, pct1RM: 70 },
              { reps: 3, pct1RM: 80 },
              { reps: 3, pct1RM: 90, amrap: true },
            ], undefined, 240),
            ex('squat', sets(5, 10, { pct1RM: 60 }), undefined, 90),
          ],
        },
      ],
    },
    {
      index: 3,
      label: { ar: 'أسبوع 5/3/1', },
      sessions: [
        {
          key: '531_squat',
          name: { ar: 'يوم السكوات', },
          estMinutes: 70,
          exercises: [
            ex('squat', [
              { reps: 5, pct1RM: 75 },
              { reps: 3, pct1RM: 85 },
              { reps: 1, pct1RM: 95, amrap: true },
            ], undefined, 240),
            ex('squat', sets(5, 10, { pct1RM: 65 }), undefined, 90),
          ],
        },
      ],
    },
    {
      index: 4,
      label: { ar: 'ديلود', },
      isDeload: true,
      sessions: [
        {
          key: '531_squat',
          name: { ar: 'ديلود — سكوات', },
          estMinutes: 50,
          exercises: [
            ex('squat', [
              { reps: 5, pct1RM: 40 },
              { reps: 5, pct1RM: 50 },
              { reps: 5, pct1RM: 60 },
            ], { ar: 'لا AMRAP، لا BBB في الديلود.', }, 180),
          ],
        },
      ],
    },
  ],
};

/* ────────────────── 5) GZCLP ────────────────── */

const GZCLP: ProgramDef = {
  key: 'gzclp',
  name: { ar: 'GZCLP', },
  shortName: { ar: 'GZCLP', },
  author: 'Cody Lefever',
  experience: 'beginner',
  goal: 'strength',
  daysPerWeek: 4,
  weeks: 16,
  sessionMinutes: 60,
  description: {
    ar: 'نسخة LP من نظام GZCL ذي الطبقات الثلاث — طبقات T1 ثقيلة، T2 متوسطة، T3 خفيفة عالية التكرار.',
  },
  highlights: [
    { ar: 'بنية T1/T2/T3 — كل طبقة لها هدف.', },
    { ar: 'AMRAP على المجموعة الأخيرة T1 و T2.', },
    { ar: 'تنازل تلقائي إلى مرحلة أسهل عند الفشل.', },
  ],
  equipment: ['barbell', 'rack', 'bench'],
  scheme: { ar: 'GZCL خطّي', },
  progression: { kind: 'amrap', minReps: 1, addKgWhenAbove: 2.5 },
  weekTemplate: [
    {
      index: 1,
      sessions: [
        {
          key: 'gzclp_a1',
          name: { ar: 'A1 — سكوات/بنش', },
          estMinutes: 60,
          exercises: [
            ex('squat', amrapSets(5, 3, { pct1RM: 85 }), { ar: 'T1 — AMRAP في المجموعة الأخيرة.', }, 180),
            ex('bench', sets(3, 10, { pct1RM: 65 }), { ar: 'T2 — حجم.', }, 120),
            ex('lat_pulldown', sets(3, 15, { pct1RM: 55 }), { ar: 'T3 — تجميل.', }, 90),
          ],
        },
        {
          key: 'gzclp_b1',
          name: { ar: 'B1 — ديدليفت/ضغط', },
          estMinutes: 60,
          exercises: [
            ex('ohp', amrapSets(5, 3, { pct1RM: 85 }), undefined, 180),
            ex('deadlift', sets(3, 10, { pct1RM: 65 }), undefined, 150),
            ex('bent_row', sets(3, 15, { pct1RM: 55 }), undefined, 90),
          ],
        },
      ],
    },
  ],
};

/* ────────────────── 6) Madcow 5×5 ────────────────── */

const MADCOW: ProgramDef = {
  key: 'madcow_55',
  name: { ar: 'مادكاو 5×5', },
  shortName: { ar: 'Madcow', },
  author: 'Bill "Madcow" Starr',
  experience: 'intermediate',
  goal: 'strength',
  daysPerWeek: 3,
  weeks: 12,
  sessionMinutes: 75,
  description: {
    ar: 'الوارث الطبيعي لـ Stronglifts 5×5 — تطور أسبوعي بدلاً من جلسة. مثالي للمتدرب الذي تعب من الفشل اليومي.',
  },
  highlights: [
    { ar: 'يوم خفيف + يوم متوسط + يوم ثقيل.', },
    { ar: 'تطور 2.5 كغ/أسبوع على الكامل العلوي.', },
    { ar: 'ramp-up 5 مجموعات تدريجية كل جلسة.', },
  ],
  equipment: ['barbell', 'rack', 'bench'],
  scheme: { ar: 'تطور أسبوعي', },
  progression: { kind: 'linear', addKgUpper: 2.5, addKgLower: 2.5, addKgPress: 2.5 },
  weekTemplate: [
    {
      index: 1,
      sessions: [
        {
          key: 'madcow_mon',
          name: { ar: 'الإثنين — متوسط', },
          estMinutes: 75,
          exercises: [
            ex('squat', [
              { reps: 5, pct1RM: 50 },
              { reps: 5, pct1RM: 60 },
              { reps: 5, pct1RM: 70 },
              { reps: 5, pct1RM: 80 },
              { reps: 5, pct1RM: 85 },
            ], { ar: 'ramp-up 5 درجات', }, 180),
            ex('bench', [
              { reps: 5, pct1RM: 50 },
              { reps: 5, pct1RM: 60 },
              { reps: 5, pct1RM: 70 },
              { reps: 5, pct1RM: 80 },
              { reps: 5, pct1RM: 85 },
            ], undefined, 180),
            ex('bent_row', [
              { reps: 5, pct1RM: 50 },
              { reps: 5, pct1RM: 60 },
              { reps: 5, pct1RM: 70 },
              { reps: 5, pct1RM: 80 },
              { reps: 5, pct1RM: 85 },
            ], undefined, 120),
          ],
        },
        {
          key: 'madcow_wed',
          name: { ar: 'الأربعاء — خفيف', },
          estMinutes: 60,
          exercises: [
            ex('squat', sets(4, 5, { pct1RM: 60 }), { ar: 'سكوات خفيف للتعافي', }, 120),
            ex('ohp', [
              { reps: 5, pct1RM: 50 },
              { reps: 5, pct1RM: 60 },
              { reps: 5, pct1RM: 70 },
              { reps: 5, pct1RM: 80 },
              { reps: 5, pct1RM: 85 },
            ], undefined, 180),
            ex('deadlift', sets(5, 5, { pct1RM: 70 }), undefined, 240),
          ],
        },
        {
          key: 'madcow_fri',
          name: { ar: 'الجمعة — ثقيل', },
          estMinutes: 80,
          exercises: [
            ex('squat', [
              { reps: 5, pct1RM: 50 },
              { reps: 5, pct1RM: 60 },
              { reps: 5, pct1RM: 70 },
              { reps: 5, pct1RM: 80 },
              { reps: 3, pct1RM: 90 },
              { reps: 8, pct1RM: 70 },
            ], { ar: 'PR set + back-off', }, 240),
            ex('bench', [
              { reps: 5, pct1RM: 50 },
              { reps: 5, pct1RM: 60 },
              { reps: 5, pct1RM: 70 },
              { reps: 5, pct1RM: 80 },
              { reps: 3, pct1RM: 90 },
              { reps: 8, pct1RM: 70 },
            ], undefined, 240),
            ex('bent_row', [
              { reps: 5, pct1RM: 50 },
              { reps: 5, pct1RM: 60 },
              { reps: 5, pct1RM: 70 },
              { reps: 5, pct1RM: 80 },
              { reps: 3, pct1RM: 90 },
              { reps: 8, pct1RM: 70 },
            ], undefined, 180),
          ],
        },
      ],
    },
  ],
};

/* ────────────────── 7) Upper/Lower 4-day ────────────────── */

const UPPER_LOWER: ProgramDef = {
  key: 'upper_lower_4d',
  name: { ar: 'علوي/سفلي 4 أيام', },
  shortName: { ar: 'U/L 4', },
  author: 'Layne Norton (PHAT-inspired)',
  experience: 'intermediate',
  goal: 'powerbuilding',
  daysPerWeek: 4,
  weeks: 12,
  sessionMinutes: 75,
  description: {
    ar: 'تردد مرتين أسبوعياً لكل جزء — يوم قوة ويوم حجم. توازن مثالي لمتوسط يبني قوة وضخامة معاً.',
  },
  highlights: [
    { ar: '2 يوم علوي، 2 يوم سفلي.', },
    { ar: 'يوم قوة (5×5) + يوم حجم (3×10-12).', },
    { ar: 'مساحة كافية لتعافي بين الجلسات.', },
  ],
  equipment: ['barbell', 'rack', 'bench', 'dumbbells', 'cable'],
  scheme: { ar: 'علوي/سفلي 4 أيام', },
  progression: { kind: 'double', topRepRange: [5, 8], addKg: 2.5 },
  weekTemplate: [
    {
      index: 1,
      sessions: [
        {
          key: 'ul_upper_strength',
          name: { ar: 'علوي — قوة', },
          estMinutes: 80,
          exercises: [
            ex('bench', sets(5, 5), undefined, 180),
            ex('bent_row', sets(5, 5), undefined, 150),
            ex('ohp', sets(4, 6), undefined, 150),
            ex('chin_up', sets(4, 6), undefined, 120),
            ex('skull_crusher', sets(3, 10), undefined, 90),
            ex('barbell_curl', sets(3, 10), undefined, 90),
          ],
        },
        {
          key: 'ul_lower_strength',
          name: { ar: 'سفلي — قوة', },
          estMinutes: 80,
          exercises: [
            ex('squat', sets(5, 5), undefined, 240),
            ex('romanian_dl', sets(4, 6), undefined, 180),
            ex('leg_press', sets(3, 10), undefined, 120),
            ex('leg_curl', sets(3, 12), undefined, 60),
            ex('calf_raise', sets(4, 12), undefined, 60),
            ex('hanging_leg_raise', sets(3, 10), undefined, 60),
          ],
        },
        {
          key: 'ul_upper_hyper',
          name: { ar: 'علوي — حجم', },
          estMinutes: 80,
          exercises: [
            ex('incline_dumbbell_press', sets(4, 10), undefined, 90),
            ex('cable_row', sets(4, 10), undefined, 90),
            ex('arnold_press', sets(3, 10), undefined, 90),
            ex('lat_pulldown', sets(3, 12), undefined, 90),
            ex('lateral_raise', sets(4, 15), undefined, 45),
            ex('cable_crossover', sets(3, 12), undefined, 60),
            ex('hammer_curl', sets(3, 12), undefined, 60),
            ex('tricep_pushdown', sets(3, 12), undefined, 60),
          ],
        },
        {
          key: 'ul_lower_hyper',
          name: { ar: 'سفلي — حجم', },
          estMinutes: 80,
          exercises: [
            ex('front_squat', sets(4, 8), undefined, 150),
            ex('hip_thrust', sets(4, 10), undefined, 120),
            ex('bulgarian_split', sets(3, 10), undefined, 90),
            ex('leg_extension', sets(3, 15), undefined, 60),
            ex('leg_curl', sets(3, 15), undefined, 60),
            ex('calf_raise', sets(4, 20), undefined, 45),
          ],
        },
      ],
    },
  ],
};

/* ────────────────── 8) Full-Body 3× ────────────────── */

const FULL_BODY_3: ProgramDef = {
  key: 'full_body_3',
  name: { ar: 'جسم كامل ثلاث مرات', },
  shortName: { ar: 'FB 3', },
  author: 'Generic',
  experience: 'beginner',
  goal: 'general',
  daysPerWeek: 3,
  weeks: 8,
  sessionMinutes: 60,
  description: {
    ar: 'جلسة جسم كامل ثلاث مرات أسبوعياً — تردد متوازن للجميع، مناسب لمشغول الوقت.',
  },
  highlights: [
    { ar: 'كل عضلة تُضرب 3× أسبوعياً.', },
    { ar: 'تنوع جلسات A/B/C — يمنع الملل.', },
    { ar: 'مرن — تستطيع تخطي يوم بدون فقدان.', },
  ],
  equipment: ['barbell', 'rack', 'bench', 'pull_up_bar'],
  scheme: { ar: 'جسم كامل', },
  progression: { kind: 'linear', addKgUpper: 2.5, addKgLower: 2.5, addKgPress: 2.5 },
  weekTemplate: [
    {
      index: 1,
      sessions: [
        {
          key: 'fb_a',
          name: { ar: 'الجلسة A', },
          estMinutes: 60,
          exercises: [
            ex('squat', sets(3, 5), undefined, 180),
            ex('bench', sets(3, 5), undefined, 180),
            ex('bent_row', sets(3, 8), undefined, 120),
            ex('hanging_leg_raise', sets(3, 10), undefined, 60),
          ],
        },
        {
          key: 'fb_b',
          name: { ar: 'الجلسة B', },
          estMinutes: 60,
          exercises: [
            ex('deadlift', sets(2, 5), undefined, 240),
            ex('ohp', sets(3, 5), undefined, 180),
            ex('chin_up', sets(3, 8), undefined, 120),
            ex('plank', [{ durationSec: 60 }, { durationSec: 60 }], undefined, 60),
          ],
        },
        {
          key: 'fb_c',
          name: { ar: 'الجلسة C', },
          estMinutes: 60,
          exercises: [
            ex('front_squat', sets(3, 8), undefined, 150),
            ex('incline_dumbbell_press', sets(3, 10), undefined, 90),
            ex('cable_row', sets(3, 10), undefined, 90),
            ex('barbell_curl', sets(3, 10), undefined, 60),
            ex('calf_raise', sets(3, 12), undefined, 60),
          ],
        },
      ],
    },
  ],
};

/* ────────────────── 9) PHUL ────────────────── */

const PHUL: ProgramDef = {
  key: 'phul',
  name: { ar: 'PHUL — قوة وضخامة', },
  shortName: { ar: 'PHUL', },
  author: 'Brandon Campbell',
  experience: 'intermediate',
  goal: 'powerbuilding',
  daysPerWeek: 4,
  weeks: 12,
  sessionMinutes: 75,
  description: {
    ar: 'يومان قوة (Power) + يومان ضخامة (Hypertrophy). أفضل ما في العالمين.',
  },
  highlights: [
    { ar: 'يوم قوة 3-5 تكرار، يوم حجم 8-12.', },
    { ar: 'يبني قوة وضخامة بنفس الوقت.', },
  ],
  equipment: ['barbell', 'rack', 'bench', 'dumbbells', 'cable'],
  scheme: { ar: 'Power × 2 + Hypertrophy × 2', },
  progression: { kind: 'double', topRepRange: [3, 5], addKg: 2.5 },
  weekTemplate: [
    {
      index: 1,
      sessions: [
        {
          key: 'phul_upper_power',
          name: { ar: 'علوي — قوة', },
          estMinutes: 75,
          exercises: [
            ex('bench', sets(4, 4), undefined, 180),
            ex('incline_bench', sets(3, 6), undefined, 150),
            ex('bent_row', sets(4, 4), undefined, 180),
            ex('lat_pulldown', sets(3, 8), undefined, 90),
            ex('ohp', sets(3, 6), undefined, 120),
            ex('barbell_curl', sets(3, 8), undefined, 90),
            ex('skull_crusher', sets(3, 8), undefined, 90),
          ],
        },
        {
          key: 'phul_lower_power',
          name: { ar: 'سفلي — قوة', },
          estMinutes: 75,
          exercises: [
            ex('squat', sets(4, 4), undefined, 240),
            ex('deadlift', sets(3, 5), undefined, 240),
            ex('leg_press', sets(3, 10), undefined, 90),
            ex('leg_curl', sets(3, 10), undefined, 60),
            ex('calf_raise', sets(4, 8), undefined, 60),
          ],
        },
        {
          key: 'phul_upper_hyper',
          name: { ar: 'علوي — حجم', },
          estMinutes: 75,
          exercises: [
            ex('incline_dumbbell_press', sets(4, 12), undefined, 90),
            ex('cable_crossover', sets(3, 15), undefined, 60),
            ex('cable_row', sets(4, 12), undefined, 90),
            ex('lat_pulldown', sets(3, 15), undefined, 60),
            ex('lateral_raise', sets(4, 15), undefined, 45),
            ex('preacher_curl', sets(3, 12), undefined, 60),
            ex('tricep_pushdown', sets(3, 12), undefined, 60),
          ],
        },
        {
          key: 'phul_lower_hyper',
          name: { ar: 'سفلي — حجم', },
          estMinutes: 75,
          exercises: [
            ex('front_squat', sets(4, 12), undefined, 90),
            ex('romanian_dl', sets(3, 12), undefined, 90),
            ex('leg_extension', sets(3, 15), undefined, 60),
            ex('leg_curl', sets(3, 15), undefined, 60),
            ex('calf_raise', sets(4, 20), undefined, 45),
          ],
        },
      ],
    },
  ],
};

/* ────────────────── Index ────────────────── */

export const PROGRAMS: ProgramDef[] = [
  STRONGLIFTS_55,
  GREYSKULL,
  FULL_BODY_3,
  PPL,
  UPPER_LOWER,
  W531_BBB,
  GZCLP,
  MADCOW,
  PHUL,
];

export const PROGRAMS_BY_KEY: Record<string, ProgramDef> = Object.fromEntries(
  PROGRAMS.map((p) => [p.key, p]),
);

export function programByKey(key: string): ProgramDef | null {
  return PROGRAMS_BY_KEY[key] ?? null;
}

export function programsForExperience(exp: 'beginner' | 'intermediate' | 'advanced'): ProgramDef[] {
  return PROGRAMS.filter((p) => p.experience === exp);
}

export function programsForGoal(goal: ProgramDef['goal']): ProgramDef[] {
  return PROGRAMS.filter((p) => p.goal === goal);
}

/**
 * Find the deload week index in a program, if any. Returns -1 if no deload.
 */
export function deloadWeekIndex(program: ProgramDef): number {
  return program.weekTemplate.findIndex((w) => w.isDeload);
}

/**
 * Filter for "I have these equipment items only" — returns programs all
 * of whose required equipment is in the user's set.
 */
export function programsForEquipment(available: Set<string>): ProgramDef[] {
  return PROGRAMS.filter((p) => p.equipment.every((eq) => available.has(eq)));
}

/* ────────────────── Display labels ────────────────── */

export const GOAL_LABELS: Record<ProgramDef['goal'], LocalizedString> = {
  strength:     { ar: 'قوة', },
  hypertrophy:  { ar: 'ضخامة', },
  powerbuilding:{ ar: 'قوة وضخامة', },
  fat_loss:     { ar: 'حرق', },
  general:      { ar: 'لياقة عامة', },
  skill:        { ar: 'مهارات', },
};

export const EXPERIENCE_LABELS: Record<ProgramDef['experience'], LocalizedString> = {
  beginner:     { ar: 'مبتدئ',        },
  intermediate: { ar: 'متوسط',     },
  advanced:     { ar: 'متقدم', },
};
