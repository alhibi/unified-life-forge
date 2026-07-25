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
    question: { ar: 'كم تمرين ضغط متتالٍ تستطيع بشكل صارم؟', },
    skillKey: 'pushUp',
    options: [
      { label: { ar: 'لا أقدر — أحتاج للحائط أو الركبة.', }, stepIdx: 0 },
      { label: { ar: '1-5 ضغطات.', }, stepIdx: 2 },
      { label: { ar: '6-12 ضغطة.', }, stepIdx: 3 },
      { label: { ar: '13-25 ضغطة.', }, stepIdx: 4 },
      { label: { ar: '+25 + أتقن diamond/decline.', }, stepIdx: 5 },
      { label: { ar: 'archer أو one-arm.', }, stepIdx: 7 },
    ],
  },
  {
    key: 'pullup',
    question: { ar: 'كم عقلة صارمة تستطيع؟', },
    skillKey: 'pullUp',
    options: [
      { label: { ar: 'لا شيء — لا أتعلق.', }, stepIdx: 0 },
      { label: { ar: 'أتعلق 30 ث.', }, stepIdx: 0 },
      { label: { ar: 'negatives 5×3.', }, stepIdx: 2 },
      { label: { ar: '1-5 صارمة.', }, stepIdx: 4 },
      { label: { ar: '6-12 صارمة.', }, stepIdx: 4 },
      { label: { ar: '+12 + L-sit أو archer.', }, stepIdx: 6 },
    ],
  },
  {
    key: 'dip',
    question: { ar: 'كم ديبس متتالٍ على قضبان متوازية؟', },
    skillKey: 'dip',
    options: [
      { label: { ar: 'لا أصل لقضبان متوازية.', }, stepIdx: 0 },
      { label: { ar: 'bench dips فقط.', }, stepIdx: 0 },
      { label: { ar: 'negatives 5×3.', }, stepIdx: 1 },
      { label: { ar: '1-5 صارمة.', }, stepIdx: 2 },
      { label: { ar: '6-15 صارمة.', }, stepIdx: 2 },
      { label: { ar: 'حلقات أو مثقّل.', }, stepIdx: 4 },
    ],
  },
  {
    key: 'squat',
    question: { ar: 'ماذا تستطيع في تمارين السكوات؟', },
    skillKey: 'squat',
    options: [
      { label: { ar: 'air squat 10.', }, stepIdx: 1 },
      { label: { ar: 'split squat 10/جانب.', }, stepIdx: 2 },
      { label: { ar: 'bulgarian split 10/جانب.', }, stepIdx: 3 },
      { label: { ar: 'pistol negatives.', }, stepIdx: 5 },
      { label: { ar: 'pistol صارم 5.', }, stepIdx: 6 },
      { label: { ar: 'shrimp squat.', }, stepIdx: 7 },
    ],
  },
  {
    key: 'lsit',
    question: { ar: 'إل-سيت — أي مرحلة؟', },
    skillKey: 'lSit',
    options: [
      { label: { ar: 'لا أعرف.', }, stepIdx: 0 },
      { label: { ar: 'foot-supported 20 ث.', }, stepIdx: 0 },
      { label: { ar: 'tuck L-sit 20 ث.', }, stepIdx: 2 },
      { label: { ar: 'full L-sit أرضي 15 ث.', }, stepIdx: 3 },
      { label: { ar: 'L-sit على parallettes 30 ث.', }, stepIdx: 4 },
      { label: { ar: 'V-sit أو manna.', }, stepIdx: 5 },
    ],
  },
  {
    key: 'handstand',
    question: { ar: 'وقوف اليدين — أين أنت؟', },
    skillKey: 'handstand',
    options: [
      { label: { ar: 'لم أحاول.', }, stepIdx: 0 },
      { label: { ar: 'بلانك حائط 60 ث.', }, stepIdx: 0 },
      { label: { ar: 'chest- 30 ث.', }, stepIdx: 1 },
      { label: { ar: 'وقوف حر 5-10 ث.', }, stepIdx: 3 },
      { label: { ar: 'وقوف حر 30+ ث.', }, stepIdx: 4 },
      { label: { ar: 'HSPU بمدى كامل.', }, stepIdx: 7 },
    ],
  },
  {
    key: 'frontLever',
    question: { ar: 'فرنت ليفر — أي مرحلة؟', },
    skillKey: 'frontLever',
    options: [
      { label: { ar: 'لم أبدأ.', }, stepIdx: 0 },
      { label: { ar: 'tuck FL 5 ث.', }, stepIdx: 0 },
      { label: { ar: 'tuck FL 15+ ث.', }, stepIdx: 1 },
      { label: { ar: 'advanced tuck.', }, stepIdx: 2 },
      { label: { ar: 'straddle FL.', }, stepIdx: 4 },
      { label: { ar: 'full FL.', }, stepIdx: 5 },
    ],
  },
  {
    key: 'backLever',
    question: { ar: 'باك ليفر — أي مرحلة؟', },
    skillKey: 'backLever',
    options: [
      { label: { ar: 'لم أبدأ.', }, stepIdx: 0 },
      { label: { ar: 'german hang 30 ث.', }, stepIdx: 0 },
      { label: { ar: 'tuck BL 15 ث.', }, stepIdx: 1 },
      { label: { ar: 'advanced tuck.', }, stepIdx: 2 },
      { label: { ar: 'straddle BL.', }, stepIdx: 4 },
      { label: { ar: 'full BL.', }, stepIdx: 5 },
    ],
  },
  {
    key: 'planche',
    question: { ar: 'بلانش — أين أنت؟', },
    skillKey: 'planche',
    options: [
      { label: { ar: 'لم أبدأ.', }, stepIdx: 0 },
      { label: { ar: 'planche lean 30 ث.', }, stepIdx: 0 },
      { label: { ar: 'frog stand 30 ث.', }, stepIdx: 2 },
      { label: { ar: 'tuck planche 12 ث.', }, stepIdx: 3 },
      { label: { ar: 'advanced tuck planche.', }, stepIdx: 4 },
      { label: { ar: 'straddle planche.', }, stepIdx: 5 },
    ],
  },
  {
    key: 'muscleUp',
    question: { ar: 'ماصل أب؟', },
    skillKey: 'muscleUp',
    options: [
      { label: { ar: 'لا.', }, stepIdx: 0 },
      { label: { ar: 'high pulls.', }, stepIdx: 0 },
      { label: { ar: 'transition negatives.', }, stepIdx: 2 },
      { label: { ar: 'kipping MU.', }, stepIdx: 3 },
      { label: { ar: 'strict bar MU.', }, stepIdx: 4 },
      { label: { ar: 'strict ring MU.', }, stepIdx: 6 },
    ],
  },
  {
    key: 'humanFlag',
    question: { ar: 'العلم البشري؟', },
    skillKey: 'humanFlag',
    options: [
      { label: { ar: 'لا.', }, stepIdx: 0 },
      { label: { ar: 'side plank 60 ث.', }, stepIdx: 0 },
      { label: { ar: 'vertical flag.', }, stepIdx: 1 },
      { label: { ar: 'tuck flag.', }, stepIdx: 2 },
      { label: { ar: 'straddle flag.', }, stepIdx: 4 },
      { label: { ar: 'full flag.', }, stepIdx: 5 },
    ],
  },
  {
    key: 'training_freq',
    question: { ar: 'كم مرة تستطيع التدرب أسبوعياً؟', },
    skillKey: 'pushUp', // dummy - this question affects program selection only
    options: [
      { label: { ar: '2 مرات', }, stepIdx: 0 },
      { label: { ar: '3 مرات', }, stepIdx: 0 },
      { label: { ar: '4-5 مرات', }, stepIdx: 0 },
      { label: { ar: '6+ مرات', }, stepIdx: 0 },
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

export const TIER_RECOMMENDATION: Record<ProgramExperience, { ar: string; }> = {
  beginner: {
    ar: 'مستواك مبتدئ — برنامج الأساسات سيبني قاعدة قوية في 8 أسابيع.',
  },
  intermediate: {
    ar: 'مستواك متوسط — يمكنك التركيز على مهارة محددة (عقلة/HS) أو حجم عالٍ.',
  },
  advanced: {
    ar: 'مستواك متقدم — مهارات متخصصة وحلقات وهجين هي الخيار الأفضل.',
  },
};
