/**
 * Calisthenics entry-level placement test.
 *
 * 12 questions covering each major skill family. The user picks the option
 * that matches their current ability; the chosen `stepIdx` becomes the
 * recommended starting point in that skill's ladder. The function then
 * suggests the best-fit program based on the lowest tier across all skills.
 */

import type { AssessmentQuestion, AssessmentResult, ProgramExperience } from './types';

export const ASSESSMENT_QUESTIONS: AssessmentQuestion[] = [
  {
    key: 'pushup',
    question: { ar: 'كم تمرين ضغط متتالٍ تستطيع بشكل صارم؟', de: 'Wie viele saubere Liegestütze schaffst du am Stück?' },
    skillKey: 'pushUp',
    options: [
      { label: { ar: 'لا أقدر — أحتاج للحائط أو الركبة.', de: 'Gar keine — Wand oder Knie nötig.' }, stepIdx: 0 },
      { label: { ar: '1-5 ضغطات.', de: '1-5 Liegestütze.' }, stepIdx: 2 },
      { label: { ar: '6-12 ضغطة.', de: '6-12 Liegestütze.' }, stepIdx: 3 },
      { label: { ar: '13-25 ضغطة.', de: '13-25 Liegestütze.' }, stepIdx: 4 },
      { label: { ar: '+25 + أتقن diamond/decline.', de: '+25 + Diamond/Decline.' }, stepIdx: 5 },
      { label: { ar: 'archer أو one-arm.', de: 'Archer oder Einarmig.' }, stepIdx: 7 },
    ],
  },
  {
    key: 'pullup',
    question: { ar: 'كم عقلة صارمة تستطيع؟', de: 'Wie viele strikte Klimmzüge?' },
    skillKey: 'pullUp',
    options: [
      { label: { ar: 'لا شيء — لا أتعلق.', de: 'Keine — kann nicht hängen.' }, stepIdx: 0 },
      { label: { ar: 'أتعلق 30 ث.', de: 'Hängen 30s.' }, stepIdx: 0 },
      { label: { ar: 'negatives 5×3.', de: 'Negativ 5×3.' }, stepIdx: 2 },
      { label: { ar: '1-5 صارمة.', de: '1-5 strikt.' }, stepIdx: 4 },
      { label: { ar: '6-12 صارمة.', de: '6-12 strikt.' }, stepIdx: 4 },
      { label: { ar: '+12 + L-sit أو archer.', de: '+12 + L-Sit oder Archer.' }, stepIdx: 6 },
    ],
  },
  {
    key: 'dip',
    question: { ar: 'كم ديبس متتالٍ على قضبان متوازية؟', de: 'Wie viele Dips am Barren?' },
    skillKey: 'dip',
    options: [
      { label: { ar: 'لا أصل لقضبان متوازية.', de: 'Keine — komme nicht hoch.' }, stepIdx: 0 },
      { label: { ar: 'bench dips فقط.', de: 'Nur Bench Dips.' }, stepIdx: 0 },
      { label: { ar: 'negatives 5×3.', de: 'Negativ 5×3.' }, stepIdx: 1 },
      { label: { ar: '1-5 صارمة.', de: '1-5 strikt.' }, stepIdx: 2 },
      { label: { ar: '6-15 صارمة.', de: '6-15 strikt.' }, stepIdx: 2 },
      { label: { ar: 'حلقات أو مثقّل.', de: 'Ringe oder gewichtet.' }, stepIdx: 4 },
    ],
  },
  {
    key: 'squat',
    question: { ar: 'ماذا تستطيع في تمارين السكوات؟', de: 'Was kannst du bei Kniebeugen?' },
    skillKey: 'squat',
    options: [
      { label: { ar: 'air squat 10.', de: 'Air Squat 10.' }, stepIdx: 1 },
      { label: { ar: 'split squat 10/جانب.', de: 'Split Squat 10/Seite.' }, stepIdx: 2 },
      { label: { ar: 'bulgarian split 10/جانب.', de: 'Bulgarian Split 10/Seite.' }, stepIdx: 3 },
      { label: { ar: 'pistol negatives.', de: 'Pistol Negativ.' }, stepIdx: 5 },
      { label: { ar: 'pistol صارم 5.', de: 'Strikter Pistol × 5.' }, stepIdx: 6 },
      { label: { ar: 'shrimp squat.', de: 'Shrimp Squat.' }, stepIdx: 7 },
    ],
  },
  {
    key: 'lsit',
    question: { ar: 'إل-سيت — أي مرحلة؟', de: 'L-Sit — welche Stufe?' },
    skillKey: 'lSit',
    options: [
      { label: { ar: 'لا أعرف.', de: 'Kenne ich nicht.' }, stepIdx: 0 },
      { label: { ar: 'foot-supported 20 ث.', de: 'Mit Fußstütze 20s.' }, stepIdx: 0 },
      { label: { ar: 'tuck L-sit 20 ث.', de: 'Tuck L-Sit 20s.' }, stepIdx: 2 },
      { label: { ar: 'full L-sit أرضي 15 ث.', de: 'Voller L-Sit 15s am Boden.' }, stepIdx: 3 },
      { label: { ar: 'L-sit على parallettes 30 ث.', de: 'L-Sit auf Parallettes 30s.' }, stepIdx: 4 },
      { label: { ar: 'V-sit أو manna.', de: 'V-Sit oder Manna.' }, stepIdx: 5 },
    ],
  },
  {
    key: 'handstand',
    question: { ar: 'وقوف اليدين — أين أنت؟', de: 'Handstand — wo stehst du?' },
    skillKey: 'handstand',
    options: [
      { label: { ar: 'لم أحاول.', de: 'Noch nie versucht.' }, stepIdx: 0 },
      { label: { ar: 'بلانك حائط 60 ث.', de: 'Wand-Plank 60s.' }, stepIdx: 0 },
      { label: { ar: 'chest- 30 ث.', de: 'Brust an Wand 30s.' }, stepIdx: 1 },
      { label: { ar: 'وقوف حر 5-10 ث.', de: 'Freistand 5-10s.' }, stepIdx: 3 },
      { label: { ar: 'وقوف حر 30+ ث.', de: 'Freistand 30+s.' }, stepIdx: 4 },
      { label: { ar: 'HSPU بمدى كامل.', de: 'HSPU mit voller Range.' }, stepIdx: 7 },
    ],
  },
  {
    key: 'frontLever',
    question: { ar: 'فرنت ليفر — أي مرحلة؟', de: 'Front Lever — welche Stufe?' },
    skillKey: 'frontLever',
    options: [
      { label: { ar: 'لم أبدأ.', de: 'Noch nicht angefangen.' }, stepIdx: 0 },
      { label: { ar: 'tuck FL 5 ث.', de: 'Tuck FL 5s.' }, stepIdx: 0 },
      { label: { ar: 'tuck FL 15+ ث.', de: 'Tuck FL 15+s.' }, stepIdx: 1 },
      { label: { ar: 'advanced tuck.', de: 'Adv. Tuck.' }, stepIdx: 2 },
      { label: { ar: 'straddle FL.', de: 'Straddle FL.' }, stepIdx: 4 },
      { label: { ar: 'full FL.', de: 'Voller FL.' }, stepIdx: 5 },
    ],
  },
  {
    key: 'backLever',
    question: { ar: 'باك ليفر — أي مرحلة؟', de: 'Back Lever — welche Stufe?' },
    skillKey: 'backLever',
    options: [
      { label: { ar: 'لم أبدأ.', de: 'Noch nicht.' }, stepIdx: 0 },
      { label: { ar: 'german hang 30 ث.', de: 'German Hang 30s.' }, stepIdx: 0 },
      { label: { ar: 'tuck BL 15 ث.', de: 'Tuck BL 15s.' }, stepIdx: 1 },
      { label: { ar: 'advanced tuck.', de: 'Adv. Tuck.' }, stepIdx: 2 },
      { label: { ar: 'straddle BL.', de: 'Straddle BL.' }, stepIdx: 4 },
      { label: { ar: 'full BL.', de: 'Voller BL.' }, stepIdx: 5 },
    ],
  },
  {
    key: 'planche',
    question: { ar: 'بلانش — أين أنت؟', de: 'Planche — wo bist du?' },
    skillKey: 'planche',
    options: [
      { label: { ar: 'لم أبدأ.', de: 'Noch nicht.' }, stepIdx: 0 },
      { label: { ar: 'planche lean 30 ث.', de: 'Planche-Lean 30s.' }, stepIdx: 0 },
      { label: { ar: 'frog stand 30 ث.', de: 'Frog Stand 30s.' }, stepIdx: 2 },
      { label: { ar: 'tuck planche 12 ث.', de: 'Tuck Planche 12s.' }, stepIdx: 3 },
      { label: { ar: 'advanced tuck planche.', de: 'Adv. Tuck Planche.' }, stepIdx: 4 },
      { label: { ar: 'straddle planche.', de: 'Straddle Planche.' }, stepIdx: 5 },
    ],
  },
  {
    key: 'muscleUp',
    question: { ar: 'ماصل أب؟', de: 'Muscle-Up?' },
    skillKey: 'muscleUp',
    options: [
      { label: { ar: 'لا.', de: 'Nein.' }, stepIdx: 0 },
      { label: { ar: 'high pulls.', de: 'High Pulls.' }, stepIdx: 0 },
      { label: { ar: 'transition negatives.', de: 'Negative Übergänge.' }, stepIdx: 2 },
      { label: { ar: 'kipping MU.', de: 'Kipping MU.' }, stepIdx: 3 },
      { label: { ar: 'strict bar MU.', de: 'Strikter Bar-MU.' }, stepIdx: 4 },
      { label: { ar: 'strict ring MU.', de: 'Strikter Ring-MU.' }, stepIdx: 6 },
    ],
  },
  {
    key: 'humanFlag',
    question: { ar: 'العلم البشري؟', de: 'Human Flag?' },
    skillKey: 'humanFlag',
    options: [
      { label: { ar: 'لا.', de: 'Nein.' }, stepIdx: 0 },
      { label: { ar: 'side plank 60 ث.', de: 'Side Plank 60s.' }, stepIdx: 0 },
      { label: { ar: 'vertical flag.', de: 'Vertikale Flagge.' }, stepIdx: 1 },
      { label: { ar: 'tuck flag.', de: 'Tuck-Flagge.' }, stepIdx: 2 },
      { label: { ar: 'straddle flag.', de: 'Straddle-Flagge.' }, stepIdx: 4 },
      { label: { ar: 'full flag.', de: 'Volle Flagge.' }, stepIdx: 5 },
    ],
  },
  {
    key: 'training_freq',
    question: { ar: 'كم مرة تستطيع التدرب أسبوعياً؟', de: 'Wie oft pro Woche kannst du trainieren?' },
    skillKey: 'pushUp', // dummy - this question affects program selection only
    options: [
      { label: { ar: '2 مرات', de: '2×' }, stepIdx: 0 },
      { label: { ar: '3 مرات', de: '3×' }, stepIdx: 0 },
      { label: { ar: '4-5 مرات', de: '4-5×' }, stepIdx: 0 },
      { label: { ar: '6+ مرات', de: '6+×' }, stepIdx: 0 },
    ],
  },
];

/* ────────────────── Result computation ────────────────── */

/**
 * Compute the placement result given user answers.
 *
 * `answers`: maps question key → option index (0-based) chosen.
 */
export function computeAssessment(answers: Record<string, number>): AssessmentResult {
  const bySkill: Record<string, number> = {};
  for (const q of ASSESSMENT_QUESTIONS) {
    if (q.key === 'training_freq') continue;
    const idx = answers[q.key];
    if (typeof idx !== 'number') continue;
    const opt = q.options[idx];
    if (!opt) continue;
    bySkill[q.skillKey] = Math.max(bySkill[q.skillKey] ?? 0, opt.stepIdx);
  }

  // Determine experience tier by averaging step indices of the basic five
  // skills (push, pull, dip, squat, l-sit). This avoids one ambitious answer
  // (e.g. "I can hold a tuck planche") jumping a true-beginner to advanced.
  const basics = ['pushUp', 'pullUp', 'dip', 'squat', 'lSit'];
  const basicSum = basics.reduce((s, k) => s + (bySkill[k] ?? 0), 0);
  const basicAvg = basicSum / basics.length;

  let tier: ProgramExperience = 'beginner';
  if (basicAvg >= 5) tier = 'advanced';
  else if (basicAvg >= 3) tier = 'intermediate';

  // Suggested programs ordered by best fit
  const freq = answers.training_freq ?? 1;
  const suggested: string[] = [];
  if (tier === 'beginner') {
    suggested.push('cali_foundations_8w');
    if (freq >= 2) suggested.push('cali_pullup_spec');
  } else if (tier === 'intermediate') {
    suggested.push('cali_pullup_spec', 'cali_handstand_12w');
    if (freq >= 2) suggested.push('cali_ppl_6d');
    suggested.push('cali_gtg_pullup');
  } else {
    suggested.push('cali_skill_focus_4d', 'cali_hybrid_5d', 'cali_rings_4d', 'cali_ppl_6d');
  }

  return {
    bySkill,
    tier,
    suggestedPrograms: suggested,
  };
}

export const TIER_RECOMMENDATION: Record<ProgramExperience, { ar: string; de: string }> = {
  beginner: {
    ar: 'مستواك مبتدئ — برنامج الأساسات سيبني قاعدة قوية في 8 أسابيع.',
    de: 'Du bist Anfänger — das Fundamente-Programm baut in 8 Wochen eine solide Basis.',
  },
  intermediate: {
    ar: 'مستواك متوسط — يمكنك التركيز على مهارة محددة (عقلة/HS) أو حجم عالٍ.',
    de: 'Mittelstufe — fokussiere eine Skill (Klimmzug/HS) oder hohes Volumen.',
  },
  advanced: {
    ar: 'مستواك متقدم — مهارات متخصصة وحلقات وهجين هي الخيار الأفضل.',
    de: 'Fortgeschritten — spezialisierte Skills, Ringe oder Hybrid passen.',
  },
};
