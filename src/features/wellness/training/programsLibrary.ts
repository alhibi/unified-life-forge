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

import type { ProgramDef, PrescribedExercise, PrescribedSet, LocalizedString } from './types';

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
  name: { ar: 'سترونغ ليفتس 5×5', de: 'StrongLifts 5×5' },
  shortName: { ar: 'SL 5×5', de: 'SL 5×5' },
  author: 'Mehdi Hadim',
  origin: 'StrongLifts.com',
  experience: 'beginner',
  goal: 'strength',
  daysPerWeek: 3,
  weeks: 12,
  sessionMinutes: 50,
  description: {
    ar: 'برنامج المبتدئين الأشهر — خمسة تمارين مركّبة فقط ثلاث مرات أسبوعياً مع زيادة خطية. يبني أساس قوة صلب في 12 أسبوعاً.',
    de: 'Das berühmteste Anfängerprogramm — fünf Grundübungen, 3×/Woche, lineare Steigerung. Baut in 12 Wochen ein solides Fundament.',
  },
  highlights: [
    { ar: 'خمسة تمارين فقط — لا شيء معقد.', de: 'Nur fünf Übungen — null Kompliziertheit.' },
    { ar: 'إضافة 2.5 كغ كل جلسة على المركّبات.', de: '2,5 kg pro Session auf Compounds.' },
    { ar: 'انخفاض تلقائي 10% بعد فشل ثلاث مرات.', de: 'Automatischer 10 %-Deload nach 3 Misserfolgen.' },
    { ar: '50 دقيقة لكل جلسة — مناسب للمشغول.', de: '50 Min/Session — für volle Kalender.' },
  ],
  equipment: ['barbell', 'rack', 'bench'],
  prerequisites: [
    { ar: 'لا شروط — هذا برنامج المبتدئ المثالي.', de: 'Keine — ideales Einsteigerprogramm.' },
  ],
  scheme: { ar: 'خطّي ABA / BAB', de: 'Linear ABA / BAB' },
  progression: { kind: 'linear', addKgUpper: 2.5, addKgLower: 2.5, addKgPress: 2.5 },
  weekTemplate: [
    {
      index: 1,
      sessions: [
        {
          key: 'sl_a',
          name: { ar: 'الجلسة A', de: 'Session A' },
          banner: { ar: 'سكوات + بنش + تجديف', de: 'Squat + Bench + Row' },
          estMinutes: 50,
          exercises: [
            ex('squat', sets(5, 5), { ar: 'العمود الفقري للبرنامج كله.', de: 'Rückgrat des gesamten Plans.' }, 180),
            ex('bench', sets(5, 5), undefined, 180),
            ex('bent_row', sets(5, 5), undefined, 120),
          ],
        },
        {
          key: 'sl_b',
          name: { ar: 'الجلسة B', de: 'Session B' },
          banner: { ar: 'سكوات + ضغط رأس + ديدليفت', de: 'Squat + OHP + Deadlift' },
          estMinutes: 50,
          exercises: [
            ex('squat', sets(5, 5), undefined, 180),
            ex('ohp', sets(5, 5), undefined, 180),
            ex('deadlift', sets(1, 5), { ar: 'مجموعة عاملة واحدة فقط — حمل عالٍ.', de: 'Nur ein Arbeitssatz — hohe Belastung.' }, 240),
          ],
        },
      ],
    },
  ],
};

/* ────────────────── 2) GreySkull LP ────────────────── */

const GREYSKULL: ProgramDef = {
  key: 'greyskull_lp',
  name: { ar: 'غرايسكال LP', de: 'GreySkull LP' },
  shortName: { ar: 'GSLP', de: 'GSLP' },
  author: 'John "Johnny Pain" Sherwood',
  experience: 'beginner',
  goal: 'powerbuilding',
  daysPerWeek: 3,
  weeks: 12,
  sessionMinutes: 55,
  description: {
    ar: 'تطور خطّي مع AMRAP في المجموعة الأخيرة. أحجام تجميل أعلى من سترونغ ليفتس مع نفس بساطة التطور.',
    de: 'Lineare Steigerung mit AMRAP-Schlusssatz. Mehr Hypertrophie-Volumen als SL bei gleicher Einfachheit.',
  },
  highlights: [
    { ar: 'AMRAP في المجموعة الأخيرة — تختبر قواك كل جلسة.', de: 'AMRAP-Endsatz — jede Session ein Test.' },
    { ar: 'يضم تمارين عزل (curl/triceps) للذراعين.', de: 'Inklusive Isolation für Arme.' },
    { ar: 'سهل التطور — رفع مزدوج عند 10+ تكرار في الـ AMRAP.', de: 'Doppel-Steigerung bei 10+ Wdh. im AMRAP.' },
  ],
  equipment: ['barbell', 'rack', 'bench', 'pull_up_bar'],
  scheme: { ar: 'خطّي + AMRAP', de: 'Linear + AMRAP' },
  progression: { kind: 'amrap', minReps: 5, addKgWhenAbove: 2.5 },
  weekTemplate: [
    {
      index: 1,
      sessions: [
        {
          key: 'gs_a',
          name: { ar: 'A — بنش + سكوات', de: 'A — Bench + Squat' },
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
          name: { ar: 'B — ضغط + ديدليفت', de: 'B — OHP + Deadlift' },
          estMinutes: 55,
          exercises: [
            ex('ohp', amrapSets(3, 5), undefined, 150),
            ex('deadlift', amrapSets(1, 5), { ar: 'مجموعة AMRAP وحيدة.', de: 'Einzelner AMRAP-Satz.' }, 240),
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
  name: { ar: 'PPL ست أيام', de: 'PPL 6-Tage' },
  shortName: { ar: 'PPL 6', de: 'PPL 6' },
  author: 'Reddit r/Fitness wiki',
  experience: 'intermediate',
  goal: 'hypertrophy',
  daysPerWeek: 6,
  weeks: 8,
  sessionMinutes: 75,
  description: {
    ar: 'تقسيم Push/Pull/Legs مكرر مرتين أسبوعياً. تردد عالٍ + حجم عالٍ — الخيار رقم 1 لمتوسطين يبحثون عن الضخامة.',
    de: 'Push/Pull/Legs zweimal pro Woche. Hohe Frequenz + Volumen — Top-Wahl für Mittelstufe-Hypertrophie.',
  },
  highlights: [
    { ar: 'كل عضلة تُضرب مرتين أسبوعياً.', de: 'Jeder Muskel 2×/Woche.' },
    { ar: 'يوم Push A ثقيل، Push B متوسط (حجم).', de: 'Push A schwer, Push B Volumen.' },
    { ar: '15-22 مجموعة لكل عضلة كبيرة أسبوعياً.', de: '15-22 Sätze pro Hauptmuskel/Woche.' },
    { ar: 'تطور بنظام Double Progression.', de: 'Steigerung per Double Progression.' },
  ],
  equipment: ['barbell', 'rack', 'bench', 'dumbbells', 'cable'],
  scheme: { ar: 'تقسيم 6 أيام', de: '6-Tage-Split' },
  progression: { kind: 'double', topRepRange: [6, 10], addKg: 2.5 },
  weekTemplate: [
    {
      index: 1,
      sessions: [
        {
          key: 'ppl_push_a',
          name: { ar: 'دفع A (ثقيل)', de: 'Push A (schwer)' },
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
          name: { ar: 'سحب A (ثقيل)', de: 'Pull A (schwer)' },
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
          name: { ar: 'أرجل A (ثقيل)', de: 'Beine A (schwer)' },
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
          name: { ar: 'دفع B (حجم)', de: 'Push B (Volumen)' },
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
          name: { ar: 'سحب B (حجم)', de: 'Pull B (Volumen)' },
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
          name: { ar: 'أرجل B (حجم)', de: 'Beine B (Volumen)' },
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
  name: { ar: 'وندلر 5/3/1 BBB', de: 'Wendler 5/3/1 BBB' },
  shortName: { ar: '5/3/1 BBB', de: '5/3/1 BBB' },
  author: 'Jim Wendler',
  origin: '5/3/1: The Simplest and Most Effective Training System',
  experience: 'intermediate',
  goal: 'powerbuilding',
  daysPerWeek: 4,
  weeks: 16,
  sessionMinutes: 70,
  description: {
    ar: 'دورة الأسابيع الأربعة الكلاسيكية — 5s, 3s, 1s, ديلود. مع "Boring But Big" 5×10 على نفس الحركة.',
    de: 'Klassischer 4-Wochen-Zyklus — 5s, 3s, 1s, Deload. Plus "Boring But Big" 5×10 auf gleicher Bewegung.',
  },
  highlights: [
    { ar: 'تطوّر بطيء لكن لا يفشل تقريباً.', de: 'Langsame aber kaum scheiternde Steigerung.' },
    { ar: 'TM = 90% من 1RM الحقيقي — يمنحك مساحة أمان.', de: 'TM = 90 % vom echten 1RM — Sicherheitspuffer.' },
    { ar: '5×10 BBB يضيف حجم تجميل ضخم.', de: '5×10 BBB fügt enormes Volumen hinzu.' },
    { ar: 'دورة كاملة كل 4 أسابيع — قابل للقياس.', de: 'Voller 4-Wochen-Zyklus — messbar.' },
  ],
  equipment: ['barbell', 'rack', 'bench'],
  scheme: { ar: '5/3/1 + BBB 5×10', de: '5/3/1 + BBB 5×10' },
  progression: { kind: '531', trainingMaxPct: 0.9 },
  weekTemplate: [
    {
      index: 1,
      label: { ar: 'أسبوع الـ 5s', de: 'Woche 5s' },
      sessions: [
        {
          key: '531_squat',
          name: { ar: 'يوم السكوات', de: 'Squat-Tag' },
          estMinutes: 70,
          exercises: [
            ex('squat', [
              { reps: 5, pct1RM: 65 },
              { reps: 5, pct1RM: 75 },
              { reps: 5, pct1RM: 85, amrap: true },
            ], { ar: 'استخدم TM = 0.9 × 1RM.', de: 'TM = 0,9 × 1RM verwenden.' }, 240),
            ex('squat', sets(5, 10, { pct1RM: 50 }), { ar: 'BBB — 5 مجموعات × 10 تكرارات', de: 'BBB — 5 Sätze × 10 Wdh.' }, 90),
            ex('leg_curl', sets(5, 10), undefined, 60),
          ],
        },
        {
          key: '531_bench',
          name: { ar: 'يوم البنش', de: 'Bench-Tag' },
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
          name: { ar: 'يوم الديدليفت', de: 'Deadlift-Tag' },
          estMinutes: 70,
          exercises: [
            ex('deadlift', [
              { reps: 5, pct1RM: 65 },
              { reps: 5, pct1RM: 75 },
              { reps: 5, pct1RM: 85, amrap: true },
            ], undefined, 240),
            ex('deadlift', sets(5, 10, { pct1RM: 50 }), { ar: 'حذراً — حجم ديدليفت عالٍ.', de: 'Vorsicht — hohes DL-Volumen.' }, 120),
            ex('hanging_leg_raise', sets(5, 10), undefined, 60),
          ],
        },
        {
          key: '531_ohp',
          name: { ar: 'يوم الضغط', de: 'OHP-Tag' },
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
      label: { ar: 'أسبوع الـ 3s', de: 'Woche 3s' },
      sessions: [
        {
          key: '531_squat',
          name: { ar: 'يوم السكوات', de: 'Squat-Tag' },
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
      label: { ar: 'أسبوع 5/3/1', de: 'Woche 5/3/1' },
      sessions: [
        {
          key: '531_squat',
          name: { ar: 'يوم السكوات', de: 'Squat-Tag' },
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
      label: { ar: 'ديلود', de: 'Deload' },
      isDeload: true,
      sessions: [
        {
          key: '531_squat',
          name: { ar: 'ديلود — سكوات', de: 'Deload Squat' },
          estMinutes: 50,
          exercises: [
            ex('squat', [
              { reps: 5, pct1RM: 40 },
              { reps: 5, pct1RM: 50 },
              { reps: 5, pct1RM: 60 },
            ], { ar: 'لا AMRAP، لا BBB في الديلود.', de: 'Kein AMRAP, kein BBB im Deload.' }, 180),
          ],
        },
      ],
    },
  ],
};

/* ────────────────── 5) GZCLP ────────────────── */

const GZCLP: ProgramDef = {
  key: 'gzclp',
  name: { ar: 'GZCLP', de: 'GZCLP' },
  shortName: { ar: 'GZCLP', de: 'GZCLP' },
  author: 'Cody Lefever',
  experience: 'beginner',
  goal: 'strength',
  daysPerWeek: 4,
  weeks: 16,
  sessionMinutes: 60,
  description: {
    ar: 'نسخة LP من نظام GZCL ذي الطبقات الثلاث — طبقات T1 ثقيلة، T2 متوسطة، T3 خفيفة عالية التكرار.',
    de: 'LP-Version des dreischichtigen GZCL-Systems — T1 schwer, T2 mittel, T3 leicht & viele Wdh.',
  },
  highlights: [
    { ar: 'بنية T1/T2/T3 — كل طبقة لها هدف.', de: 'T1/T2/T3 — jede Stufe hat ein Ziel.' },
    { ar: 'AMRAP على المجموعة الأخيرة T1 و T2.', de: 'AMRAP auf letztem Satz T1 & T2.' },
    { ar: 'تنازل تلقائي إلى مرحلة أسهل عند الفشل.', de: 'Automatische Phasenregression bei Misserfolg.' },
  ],
  equipment: ['barbell', 'rack', 'bench'],
  scheme: { ar: 'GZCL خطّي', de: 'GZCL linear' },
  progression: { kind: 'amrap', minReps: 1, addKgWhenAbove: 2.5 },
  weekTemplate: [
    {
      index: 1,
      sessions: [
        {
          key: 'gzclp_a1',
          name: { ar: 'A1 — سكوات/بنش', de: 'A1 — Squat/Bench' },
          estMinutes: 60,
          exercises: [
            ex('squat', amrapSets(5, 3, { pct1RM: 85 }), { ar: 'T1 — AMRAP في المجموعة الأخيرة.', de: 'T1 — AMRAP-Endsatz.' }, 180),
            ex('bench', sets(3, 10, { pct1RM: 65 }), { ar: 'T2 — حجم.', de: 'T2 — Volumen.' }, 120),
            ex('lat_pulldown', sets(3, 15, { pct1RM: 55 }), { ar: 'T3 — تجميل.', de: 'T3 — Hypertrophie.' }, 90),
          ],
        },
        {
          key: 'gzclp_b1',
          name: { ar: 'B1 — ديدليفت/ضغط', de: 'B1 — Deadlift/OHP' },
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
  name: { ar: 'مادكاو 5×5', de: 'Madcow 5×5' },
  shortName: { ar: 'Madcow', de: 'Madcow' },
  author: 'Bill "Madcow" Starr',
  experience: 'intermediate',
  goal: 'strength',
  daysPerWeek: 3,
  weeks: 12,
  sessionMinutes: 75,
  description: {
    ar: 'الوارث الطبيعي لـ Stronglifts 5×5 — تطور أسبوعي بدلاً من جلسة. مثالي للمتدرب الذي تعب من الفشل اليومي.',
    de: 'Logischer SL-5×5-Nachfolger — wöchentliche statt Session-Steigerung. Ideal nach SL-Stagnation.',
  },
  highlights: [
    { ar: 'يوم خفيف + يوم متوسط + يوم ثقيل.', de: 'Leicht + Mittel + Schwer.' },
    { ar: 'تطور 2.5 كغ/أسبوع على الكامل العلوي.', de: '2,5 kg/Woche auf Oberkörper.' },
    { ar: 'ramp-up 5 مجموعات تدريجية كل جلسة.', de: '5 stufige Sätze pro Session (Ramp-up).' },
  ],
  equipment: ['barbell', 'rack', 'bench'],
  scheme: { ar: 'تطور أسبوعي', de: 'Wöchentliche Steigerung' },
  progression: { kind: 'linear', addKgUpper: 2.5, addKgLower: 2.5, addKgPress: 2.5 },
  weekTemplate: [
    {
      index: 1,
      sessions: [
        {
          key: 'madcow_mon',
          name: { ar: 'الإثنين — متوسط', de: 'Montag — Mittel' },
          estMinutes: 75,
          exercises: [
            ex('squat', [
              { reps: 5, pct1RM: 50 },
              { reps: 5, pct1RM: 60 },
              { reps: 5, pct1RM: 70 },
              { reps: 5, pct1RM: 80 },
              { reps: 5, pct1RM: 85 },
            ], { ar: 'ramp-up 5 درجات', de: '5 Stufen Ramp-up' }, 180),
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
          name: { ar: 'الأربعاء — خفيف', de: 'Mittwoch — Leicht' },
          estMinutes: 60,
          exercises: [
            ex('squat', sets(4, 5, { pct1RM: 60 }), { ar: 'سكوات خفيف للتعافي', de: 'Leichter Squat zur Erholung' }, 120),
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
          name: { ar: 'الجمعة — ثقيل', de: 'Freitag — Schwer' },
          estMinutes: 80,
          exercises: [
            ex('squat', [
              { reps: 5, pct1RM: 50 },
              { reps: 5, pct1RM: 60 },
              { reps: 5, pct1RM: 70 },
              { reps: 5, pct1RM: 80 },
              { reps: 3, pct1RM: 90 },
              { reps: 8, pct1RM: 70 },
            ], { ar: 'PR set + back-off', de: 'PR-Satz + Back-off' }, 240),
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
  name: { ar: 'علوي/سفلي 4 أيام', de: 'Ober-/Unter-Split 4×' },
  shortName: { ar: 'U/L 4', de: 'U/L 4' },
  author: 'Layne Norton (PHAT-inspired)',
  experience: 'intermediate',
  goal: 'powerbuilding',
  daysPerWeek: 4,
  weeks: 12,
  sessionMinutes: 75,
  description: {
    ar: 'تردد مرتين أسبوعياً لكل جزء — يوم قوة ويوم حجم. توازن مثالي لمتوسط يبني قوة وضخامة معاً.',
    de: '2× Frequenz pro Körperhälfte — Kraft- und Volumentag. Idealer Balance-Plan.',
  },
  highlights: [
    { ar: '2 يوم علوي، 2 يوم سفلي.', de: '2 Ober, 2 Unter.' },
    { ar: 'يوم قوة (5×5) + يوم حجم (3×10-12).', de: 'Krafttag (5×5) + Volumentag (3×10-12).' },
    { ar: 'مساحة كافية لتعافي بين الجلسات.', de: 'Ausreichend Erholung zwischen Sessions.' },
  ],
  equipment: ['barbell', 'rack', 'bench', 'dumbbells', 'cable'],
  scheme: { ar: 'علوي/سفلي 4 أيام', de: 'Ober/Unter 4-Tage' },
  progression: { kind: 'double', topRepRange: [5, 8], addKg: 2.5 },
  weekTemplate: [
    {
      index: 1,
      sessions: [
        {
          key: 'ul_upper_strength',
          name: { ar: 'علوي — قوة', de: 'Ober — Kraft' },
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
          name: { ar: 'سفلي — قوة', de: 'Unter — Kraft' },
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
          name: { ar: 'علوي — حجم', de: 'Ober — Volumen' },
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
          name: { ar: 'سفلي — حجم', de: 'Unter — Volumen' },
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
  name: { ar: 'جسم كامل ثلاث مرات', de: 'Ganzkörper 3×' },
  shortName: { ar: 'FB 3', de: 'FB 3' },
  author: 'Generic',
  experience: 'beginner',
  goal: 'general',
  daysPerWeek: 3,
  weeks: 8,
  sessionMinutes: 60,
  description: {
    ar: 'جلسة جسم كامل ثلاث مرات أسبوعياً — تردد متوازن للجميع، مناسب لمشغول الوقت.',
    de: 'Ganzkörper 3×/Woche — ausgewogene Frequenz, perfekt bei wenig Zeit.',
  },
  highlights: [
    { ar: 'كل عضلة تُضرب 3× أسبوعياً.', de: 'Jeder Muskel 3×/Woche.' },
    { ar: 'تنوع جلسات A/B/C — يمنع الملل.', de: 'A/B/C-Wechsel — keine Langeweile.' },
    { ar: 'مرن — تستطيع تخطي يوم بدون فقدان.', de: 'Flexibel — Tag ausfallen lassen geht.' },
  ],
  equipment: ['barbell', 'rack', 'bench', 'pull_up_bar'],
  scheme: { ar: 'جسم كامل', de: 'Ganzkörper' },
  progression: { kind: 'linear', addKgUpper: 2.5, addKgLower: 2.5, addKgPress: 2.5 },
  weekTemplate: [
    {
      index: 1,
      sessions: [
        {
          key: 'fb_a',
          name: { ar: 'الجلسة A', de: 'Session A' },
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
          name: { ar: 'الجلسة B', de: 'Session B' },
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
          name: { ar: 'الجلسة C', de: 'Session C' },
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
  name: { ar: 'PHUL — قوة وضخامة', de: 'PHUL — Power & Hypertrophy' },
  shortName: { ar: 'PHUL', de: 'PHUL' },
  author: 'Brandon Campbell',
  experience: 'intermediate',
  goal: 'powerbuilding',
  daysPerWeek: 4,
  weeks: 12,
  sessionMinutes: 75,
  description: {
    ar: 'يومان قوة (Power) + يومان ضخامة (Hypertrophy). أفضل ما في العالمين.',
    de: '2 Power-Tage + 2 Hypertrophie-Tage. Das Beste aus beiden Welten.',
  },
  highlights: [
    { ar: 'يوم قوة 3-5 تكرار، يوم حجم 8-12.', de: 'Power-Tag 3-5 Wdh, Volumen 8-12.' },
    { ar: 'يبني قوة وضخامة بنفس الوقت.', de: 'Baut Kraft und Masse parallel auf.' },
  ],
  equipment: ['barbell', 'rack', 'bench', 'dumbbells', 'cable'],
  scheme: { ar: 'Power × 2 + Hypertrophy × 2', de: 'Power × 2 + Hypertrophie × 2' },
  progression: { kind: 'double', topRepRange: [3, 5], addKg: 2.5 },
  weekTemplate: [
    {
      index: 1,
      sessions: [
        {
          key: 'phul_upper_power',
          name: { ar: 'علوي — قوة', de: 'Ober — Power' },
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
          name: { ar: 'سفلي — قوة', de: 'Unter — Power' },
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
          name: { ar: 'علوي — حجم', de: 'Ober — Hypertrophie' },
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
          name: { ar: 'سفلي — حجم', de: 'Unter — Hypertrophie' },
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
  strength:     { ar: 'قوة',                de: 'Kraft' },
  hypertrophy:  { ar: 'ضخامة',              de: 'Hypertrophie' },
  powerbuilding:{ ar: 'قوة وضخامة',         de: 'Powerbuilding' },
  fat_loss:     { ar: 'حرق',                de: 'Fettabbau' },
  general:      { ar: 'لياقة عامة',         de: 'Allgemeine Fitness' },
  skill:        { ar: 'مهارات',             de: 'Skills' },
};

export const EXPERIENCE_LABELS: Record<ProgramDef['experience'], LocalizedString> = {
  beginner:     { ar: 'مبتدئ',     de: 'Anfänger'        },
  intermediate: { ar: 'متوسط',     de: 'Mittelstufe'     },
  advanced:     { ar: 'متقدم',     de: 'Fortgeschritten' },
};
