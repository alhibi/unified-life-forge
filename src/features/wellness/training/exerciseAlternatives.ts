/**
 * Exercise alternatives graph.
 *
 * Given an exercise, return functionally equivalent substitutes ordered by
 * how close they are biomechanically. Used by:
 *
 *   • Active session — "swap this exercise" (gym crowded, equipment broken)
 *   • Program library — "I don't have a barbell, replace all barbell lifts"
 *   • Plate calculator — "what's the dumbbell equivalent of 80 kg bench?"
 *
 * The graph is hand-authored, not auto-generated, because biomechanical
 * fidelity matters: a leg press is NOT equivalent to a back squat for
 * bracing, even if they hit the same muscles. Each link below carries an
 * "exchange ratio" — empirical kg-equivalent factor for converting weight.
 */

import type { LocalizedString } from './types';

export interface AlternativeLink {
  /** Target exercise key. */
  to: string;
  /** Functional similarity 0-1. 1.0 = perfect substitute. */
  similarity: number;
  /** Multiply weight by this when swapping (e.g. dumbbell bench is ~0.4 of barbell). */
  weightRatio: number;
  /** Reason / context for the swap. */
  reason: LocalizedString;
  /** Equipment downgrade flag — true if the alternative needs LESS equipment. */
  isEquipmentDowngrade?: boolean;
}

const ALTERNATIVES: Record<string, AlternativeLink[]> = {
  // ── SQUAT FAMILY ──
  squat: [
    { to: 'front_squat', similarity: 0.85, weightRatio: 0.85, reason: { ar: 'يحمي الظهر بإجبار جذع منتصب', de: 'Schont Rücken durch aufrechten Oberkörper' } },
    { to: 'goblet_squat', similarity: 0.65, weightRatio: 0.5, reason: { ar: 'بدون رف — مناسب لمنزل', de: 'Ohne Rack — heimtauglich' }, isEquipmentDowngrade: true },
    { to: 'leg_press', similarity: 0.6, weightRatio: 1.6, reason: { ar: 'ضغط أقل على العمود الفقري', de: 'Weniger Wirbelsäulen-Belastung' } },
    { to: 'bulgarian_split', similarity: 0.7, weightRatio: 0.35, reason: { ar: 'وحيد الجانب — يعالج اللاتماثل', de: 'Einseitig — gleicht Asymmetrien aus' } },
    { to: 'hack_squat', similarity: 0.75, weightRatio: 0.85, reason: { ar: 'حركة موجّهة على آلة', de: 'Geführte Maschinen-Bewegung' } },
  ],
  front_squat: [
    { to: 'squat', similarity: 0.85, weightRatio: 1.18, reason: { ar: 'يسمح بأوزان أعلى', de: 'Erlaubt schwerere Gewichte' } },
    { to: 'goblet_squat', similarity: 0.8, weightRatio: 0.55, reason: { ar: 'بنفس الوضعية لكن أخف', de: 'Gleiche Position, leichteres Gewicht' }, isEquipmentDowngrade: true },
    { to: 'safety_bar_squat', similarity: 0.85, weightRatio: 0.95, reason: { ar: 'بدون ضغط على الكتف', de: 'Schonender für Schultern' } },
  ],
  goblet_squat: [
    { to: 'squat', similarity: 0.65, weightRatio: 2.0, reason: { ar: 'تطور طبيعي بعد إتقانه', de: 'Logische Steigerung' } },
    { to: 'front_squat', similarity: 0.8, weightRatio: 1.8, reason: { ar: 'بنفس الوضعية مع بار', de: 'Gleiche Haltung mit Langhantel' } },
    { to: 'air_squat', similarity: 0.6, weightRatio: 0, reason: { ar: 'بدون وزن — للمبتدئين', de: 'Ohne Gewicht — Einsteigerstufe' }, isEquipmentDowngrade: true },
  ],

  // ── BENCH FAMILY ──
  bench: [
    { to: 'dumbbell_press', similarity: 0.85, weightRatio: 0.4, reason: { ar: 'مدى أكبر، أمان منفرد', de: 'Größere Range, sicherer alleine' } },
    { to: 'incline_bench', similarity: 0.8, weightRatio: 0.85, reason: { ar: 'يستهدف الجزء العلوي من الصدر', de: 'Betont obere Brust' } },
    { to: 'close_grip_bench', similarity: 0.75, weightRatio: 0.85, reason: { ar: 'تركيز أكبر على الترايسبس', de: 'Mehr Trizeps-Fokus' } },
    { to: 'push_up', similarity: 0.55, weightRatio: 0, reason: { ar: 'وزن جسم — أي مكان', de: 'Körpergewicht — überall' }, isEquipmentDowngrade: true },
    { to: 'machine_chest_press', similarity: 0.65, weightRatio: 1.0, reason: { ar: 'أقل تنسيق، أكثر تركيزاً', de: 'Weniger Stabilisierung, mehr Fokus' } },
  ],
  incline_bench: [
    { to: 'bench', similarity: 0.8, weightRatio: 1.18, reason: { ar: 'العودة إلى الأفقي', de: 'Zurück zu flach' } },
    { to: 'incline_dumbbell_press', similarity: 0.85, weightRatio: 0.4, reason: { ar: 'دمبل بدلاً من بار', de: 'Kurzhantel statt Langhantel' } },
    { to: 'pike_push_up', similarity: 0.5, weightRatio: 0, reason: { ar: 'وزن جسم لتحفيز الأكتاف', de: 'Körpergewicht für Schultern' }, isEquipmentDowngrade: true },
  ],
  dumbbell_press: [
    { to: 'bench', similarity: 0.85, weightRatio: 2.5, reason: { ar: 'بار يسمح بأوزان أعلى', de: 'Langhantel — schwerere Gewichte' } },
    { to: 'incline_dumbbell_press', similarity: 0.8, weightRatio: 0.85, reason: { ar: 'ميل لزاوية مختلفة', de: 'Schräg für andere Reize' } },
    { to: 'push_up', similarity: 0.6, weightRatio: 0, reason: { ar: 'بدون وزن', de: 'Ohne Gewicht' }, isEquipmentDowngrade: true },
  ],
  push_up: [
    { to: 'bench', similarity: 0.55, weightRatio: 0, reason: { ar: 'تطوّر بإضافة وزن', de: 'Steigerung mit Gewicht' } },
    { to: 'dip', similarity: 0.7, weightRatio: 0, reason: { ar: 'تركيز ترايسبس أقوى', de: 'Stärkerer Trizeps' } },
    { to: 'pseudo_planche_pu', similarity: 0.6, weightRatio: 0, reason: { ar: 'إعداد متقدم', de: 'Fortgeschrittene Variante' } },
  ],

  // ── DEADLIFT FAMILY ──
  deadlift: [
    { to: 'sumo_dl', similarity: 0.9, weightRatio: 1.0, reason: { ar: 'نفس الحركة بميكانيكا مختلفة', de: 'Gleiche Bewegung, andere Mechanik' } },
    { to: 'romanian_dl', similarity: 0.75, weightRatio: 0.7, reason: { ar: 'تركيز على الفخذ الخلفي', de: 'Hamstring-Fokus' } },
    { to: 'trap_bar_dl', similarity: 0.85, weightRatio: 1.05, reason: { ar: 'ميكانيكا أسهل على الظهر', de: 'Rückenschonender' } },
    { to: 'rack_pull', similarity: 0.7, weightRatio: 1.15, reason: { ar: 'مدى مختصر — تحميل أعلى', de: 'Kürzere Range — mehr Last' } },
    { to: 'good_morning', similarity: 0.55, weightRatio: 0.4, reason: { ar: 'تركيز خلفي بدون رفع', de: 'Hamstring ohne ziehen' } },
  ],
  romanian_dl: [
    { to: 'deadlift', similarity: 0.75, weightRatio: 1.4, reason: { ar: 'حركة كاملة من الأرض', de: 'Volle Bewegung vom Boden' } },
    { to: 'good_morning', similarity: 0.7, weightRatio: 0.6, reason: { ar: 'بدون يدين', de: 'Ohne Hände' } },
    { to: 'leg_curl', similarity: 0.5, weightRatio: 0.5, reason: { ar: 'عزل خلفي', de: 'Isoliert Hamstrings' } },
  ],

  // ── PRESS FAMILY ──
  ohp: [
    { to: 'push_press', similarity: 0.8, weightRatio: 1.25, reason: { ar: 'يسمح بأوزان أعلى عبر دفع رجلين', de: 'Schwerer durch Beinimpuls' } },
    { to: 'dumbbell_shoulder_press', similarity: 0.85, weightRatio: 0.4, reason: { ar: 'دمبل لمدى أكبر', de: 'Kurzhantel für größere Range' } },
    { to: 'arnold_press', similarity: 0.7, weightRatio: 0.5, reason: { ar: 'تنشيط جميع رؤوس الكتف', de: 'Alle Schulterköpfe' } },
    { to: 'pike_push_up', similarity: 0.5, weightRatio: 0, reason: { ar: 'وزن جسم', de: 'Körpergewicht' }, isEquipmentDowngrade: true },
    { to: 'handstand_pushup', similarity: 0.6, weightRatio: 0, reason: { ar: 'تطور وزن جسم متقدم', de: 'Fortgeschrittene KG-Variante' } },
  ],
  push_press: [
    { to: 'ohp', similarity: 0.8, weightRatio: 0.8, reason: { ar: 'دفع نقي بدون رجلين', de: 'Reines Drücken ohne Beine' } },
    { to: 'jerk', similarity: 0.7, weightRatio: 1.15, reason: { ar: 'بمزيد من العمق في الرجلين', de: 'Tieferer Beinimpuls' } },
  ],

  // ── PULL FAMILY ──
  pull_up: [
    { to: 'chin_up', similarity: 0.9, weightRatio: 0.95, reason: { ar: 'قبضة معكوسة — بايسبس أكبر', de: 'Untergriff — mehr Bizeps' } },
    { to: 'lat_pulldown', similarity: 0.7, weightRatio: 0.7, reason: { ar: 'محمَّل بآلة — مساعدة سهلة', de: 'Maschine — leichtere Steigerung' }, isEquipmentDowngrade: true },
    { to: 'inverted_row', similarity: 0.65, weightRatio: 0, reason: { ar: 'سحب أفقي للمبتدئين', de: 'Horizontaler Zug für Einsteiger' }, isEquipmentDowngrade: true },
    { to: 'archer_pull_up', similarity: 0.85, weightRatio: 0, reason: { ar: 'تطور وحيد الجانب', de: 'Einseitige Steigerung' } },
  ],
  chin_up: [
    { to: 'pull_up', similarity: 0.9, weightRatio: 1.05, reason: { ar: 'قبضة عادية — ظهر أوسع', de: 'Obergriff — Rückenfokus' } },
    { to: 'cable_curl', similarity: 0.4, weightRatio: 0.4, reason: { ar: 'عزل بايسبس فقط', de: 'Reine Bizeps-Isolation' } },
  ],
  bent_row: [
    { to: 'pendlay_row', similarity: 0.9, weightRatio: 0.95, reason: { ar: 'كل تكرارة تبدأ من الأرض', de: 'Jede Wdh. vom Boden' } },
    { to: 'dumbbell_row', similarity: 0.8, weightRatio: 0.4, reason: { ar: 'وحيد الجانب', de: 'Einseitig' } },
    { to: 'cable_row', similarity: 0.75, weightRatio: 1.0, reason: { ar: 'توتر ثابت', de: 'Konstante Spannung' } },
    { to: 'inverted_row', similarity: 0.6, weightRatio: 0, reason: { ar: 'وزن جسم', de: 'Körpergewicht' }, isEquipmentDowngrade: true },
  ],
  lat_pulldown: [
    { to: 'pull_up', similarity: 0.7, weightRatio: 1.4, reason: { ar: 'وزن جسم — قمة', de: 'Körpergewicht — Krönung' } },
    { to: 'pullover', similarity: 0.5, weightRatio: 0.45, reason: { ar: 'إطالة أعلى للظهر', de: 'Mehr Lat-Stretch' } },
  ],

  // ── ARMS ──
  barbell_curl: [
    { to: 'dumbbell_curl', similarity: 0.85, weightRatio: 0.45, reason: { ar: 'دمبل لكل ذراع', de: 'Kurzhantel pro Arm' } },
    { to: 'cable_curl', similarity: 0.8, weightRatio: 0.9, reason: { ar: 'توتر ثابت', de: 'Konstante Spannung' } },
    { to: 'preacher_curl', similarity: 0.85, weightRatio: 0.85, reason: { ar: 'يلغي الزخم', de: 'Verhindert Schwung' } },
    { to: 'hammer_curl', similarity: 0.7, weightRatio: 0.5, reason: { ar: 'يستهدف العضلة الجانبية', de: 'Brachialis-Fokus' } },
  ],
  hammer_curl: [
    { to: 'barbell_curl', similarity: 0.7, weightRatio: 2.0, reason: { ar: 'بار للقوة', de: 'Langhantel für Kraft' } },
    { to: 'preacher_curl', similarity: 0.65, weightRatio: 1.7, reason: { ar: 'عزل بايسبس صرف', de: 'Reine Bizeps-Isolation' } },
  ],
  skull_crusher: [
    { to: 'close_grip_bench', similarity: 0.7, weightRatio: 2.0, reason: { ar: 'مركّب بدلاً من عزل', de: 'Compound statt Isolation' } },
    { to: 'tricep_pushdown', similarity: 0.75, weightRatio: 0.85, reason: { ar: 'كابل أسهل على الكوع', de: 'Kabelzug schont Ellbogen' } },
    { to: 'overhead_extension', similarity: 0.8, weightRatio: 0.9, reason: { ar: 'إطالة أعمق للترايسبس', de: 'Tieferer Trizeps-Stretch' } },
  ],

  // ── LEG ACCESSORIES ──
  leg_press: [
    { to: 'squat', similarity: 0.6, weightRatio: 0.625, reason: { ar: 'مركّب — تنشيط جذع', de: 'Compound — Core-Fokus' } },
    { to: 'hack_squat', similarity: 0.75, weightRatio: 0.85, reason: { ar: 'وضع جسم أكثر طبيعية', de: 'Natürlichere Position' } },
    { to: 'lunge', similarity: 0.5, weightRatio: 0.35, reason: { ar: 'ديناميكي ووحيد الجانب', de: 'Dynamisch & einseitig' } },
  ],
  leg_curl: [
    { to: 'romanian_dl', similarity: 0.5, weightRatio: 2.0, reason: { ar: 'مركّب يبني خلفية الفخذ', de: 'Compound Hamstring-Build' } },
    { to: 'glute_ham_raise', similarity: 0.85, weightRatio: 0, reason: { ar: 'وزن جسم متقدم', de: 'Fortgeschrittene KG-Variante' } },
    { to: 'nordic_curl', similarity: 0.9, weightRatio: 0, reason: { ar: 'وزن جسم — قمة الخلفية', de: 'Körpergewicht — Top-Übung' }, isEquipmentDowngrade: true },
  ],
  hip_thrust: [
    { to: 'glute_bridge', similarity: 0.8, weightRatio: 0.9, reason: { ar: 'مدى أقل لكن أبسط إعدادًا', de: 'Kürzere Range — einfacheres Setup' }, isEquipmentDowngrade: true },
    { to: 'romanian_dl', similarity: 0.6, weightRatio: 0.7, reason: { ar: 'مركّب أكثر', de: 'Mehr Compound-Reiz' } },
    { to: 'cable_pull_through', similarity: 0.7, weightRatio: 0.5, reason: { ar: 'كابل بدلاً من بار', de: 'Kabelzug statt Langhantel' } },
  ],

  // ── DIPS ──
  dip: [
    { to: 'bench_dip', similarity: 0.7, weightRatio: 0, reason: { ar: 'بدون قضبان متوازية', de: 'Ohne Barren' }, isEquipmentDowngrade: true },
    { to: 'close_grip_bench', similarity: 0.75, weightRatio: 0.9, reason: { ar: 'بار بدلاً من قضبان', de: 'Langhantel statt Barren' } },
    { to: 'push_up', similarity: 0.5, weightRatio: 0, reason: { ar: 'سهل وفي أي مكان', de: 'Einfach & überall' }, isEquipmentDowngrade: true },
  ],
};

/* ─────────────────────── Public API ─────────────────────── */

export function alternativesFor(exerciseKey: string): AlternativeLink[] {
  return ALTERNATIVES[exerciseKey] ?? [];
}

/**
 * Find the best alternative when the user's available equipment list
 * EXCLUDES `unavailableEquipment`. Returns the highest-similarity link
 * that doesn't require the missing piece.
 */
export function bestAlternativeWithoutEquipment(
  exerciseKey: string,
  /** Mapping: exerciseKey → required equipment list. Computed by the caller from EXERCISES. */
  exerciseEquipment: Record<string, string>,
  unavailableEquipment: Set<string>,
): AlternativeLink | null {
  const links = alternativesFor(exerciseKey);
  for (const link of links.sort((a, b) => b.similarity - a.similarity)) {
    const eq = exerciseEquipment[link.to];
    if (!eq || !unavailableEquipment.has(eq)) return link;
  }
  return null;
}

/** Convert a working weight using the exchange ratio. */
export function convertWeightThroughLink(
  weightKg: number,
  link: AlternativeLink,
): number {
  if (link.weightRatio === 0) return 0; // bodyweight target
  return Math.round(weightKg * link.weightRatio * 2) / 2;
}

/**
 * Given a list of equipment the user *has*, filter alternatives down to
 * just the achievable ones — used by the program "swap all" feature.
 */
export function filterByEquipment(
  links: AlternativeLink[],
  exerciseEquipment: Record<string, string>,
  availableEquipment: Set<string>,
): AlternativeLink[] {
  return links.filter((l) => {
    const eq = exerciseEquipment[l.to];
    if (!eq) return true;
    return availableEquipment.has(eq);
  });
}
