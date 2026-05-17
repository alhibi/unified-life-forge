/**
 * Wellness analysis engine.
 *
 * Pure functions that take the user's data (supplements, diet logs,
 * skin/hair logs) and return actionable insights. Everything runs
 * in the browser — no network calls.
 */

import type {
  Supplement,
  DietLog,
  SkinHairLog,
  IntakeLog,
} from './wellnessDb';
import {
  FOODS,
  INTERACTIONS,
  NUTRIENTS,
  SYNERGIES,
  type Lang,
} from './wellnessData';

export type Severity = 'info' | 'warn';

export interface Insight {
  id: string;
  kind:
    | 'interaction'
    | 'timing'
    | 'overlap'
    | 'gap'
    | 'correlation'
    | 'synergy'
    | 'habit';
  severity: Severity;
  title: Record<Lang, string>;
  message: Record<Lang, string>;
}

/** Helper: parse "HH:MM" to minutes-since-midnight. */
function parseTime(t: string): number | null {
  const m = /^(\d{1,2}):(\d{2})$/.exec(t.trim());
  if (!m) return null;
  const h = parseInt(m[1], 10);
  const mm = parseInt(m[2], 10);
  if (h < 0 || h > 23 || mm < 0 || mm > 59) return null;
  return h * 60 + mm;
}

function minutesGap(a: string, b: string): number | null {
  const A = parseTime(a);
  const B = parseTime(b);
  if (A == null || B == null) return null;
  return Math.abs(A - B);
}

/** Find interactions between the nutrients the user is scheduled to take. */
export function detectInteractions(supplements: Supplement[]): Insight[] {
  const active = supplements.filter((s) => s.active);
  const out: Insight[] = [];

  for (const rule of INTERACTIONS) {
    const [a, b] = rule.pair;
    const supA = active.filter((s) => s.nutrientKeys.includes(a));
    const supB = active.filter((s) => s.nutrientKeys.includes(b));
    if (supA.length === 0 || supB.length === 0) continue;

    // If the two nutrients come from the SAME supplement, it's just an FYI.
    const onlySameSupplement = supA.every((x) =>
      supB.every((y) => x.id === y.id),
    );
    if (onlySameSupplement && supA.length === 1) continue;

    // Check timing — if times overlap within 2h we raise it.
    let closeInTime = false;
    outer: for (const x of supA) {
      for (const y of supB) {
        if (x.id === y.id) continue;
        for (const tx of x.times) {
          for (const ty of y.times) {
            const g = minutesGap(tx, ty);
            if (g != null && g < 120) {
              closeInTime = true;
              break outer;
            }
          }
        }
      }
    }

    // If the rule is "info" and times are far apart, skip it.
    if (rule.severity === 'info' && !closeInTime) continue;

    const nameA = NUTRIENTS[a]?.label;
    const nameB = NUTRIENTS[b]?.label;
    if (!nameA || !nameB) continue;

    out.push({
      id: `inter-${rule.id}`,
      kind: 'interaction',
      severity: rule.severity,
      title: {
        ar: `${nameA.ar} + ${nameB.ar}`,
        de: `${nameA.de} + ${nameB.de}`,
      },
      message: rule.message,
    });
  }
  return out;
}

/** Suggest timing fixes for supplements with food-dependent absorption. */
export function detectTiming(supplements: Supplement[]): Insight[] {
  const out: Insight[] = [];
  const fatSoluble = new Set(['vitaminA', 'vitaminD', 'vitaminE', 'vitaminK', 'omega3']);

  for (const s of supplements.filter((x) => x.active)) {
    const hasFatSoluble = s.nutrientKeys.some((k) => fatSoluble.has(k));
    if (hasFatSoluble && s.withFood === 'without') {
      out.push({
        id: `timing-fat-${s.id}`,
        kind: 'timing',
        severity: 'warn',
        title: {
          ar: `${s.name}: مع الطعام`,
          de: `${s.name}: zu Mahlzeit`,
        },
        message: {
          ar: 'يحتوي على فيتامينات دهنية تمتص أفضل مع وجبة فيها دهون.',
          de: 'Enthält fettlösliche Vitamine — besser mit fetthaltiger Mahlzeit.',
        },
      });
    }
    if (s.nutrientKeys.includes('iron') && s.withFood === 'with') {
      out.push({
        id: `timing-iron-${s.id}`,
        kind: 'timing',
        severity: 'info',
        title: {
          ar: `${s.name}: على الريق`,
          de: `${s.name}: nüchtern`,
        },
        message: {
          ar: 'الحديد يمتص أفضل على معدة فارغة ومع فيتامين سي — إن لم يسبب لك غثياناً.',
          de: 'Eisen wird nüchtern und mit Vitamin C besser aufgenommen — sofern verträglich.',
        },
      });
    }
    if (s.nutrientKeys.includes('magnesium')) {
      const eveningDose = s.times.some((t) => {
        const m = parseTime(t);
        return m != null && m >= 18 * 60;
      });
      if (!eveningDose && s.times.length > 0) {
        out.push({
          id: `timing-mg-${s.id}`,
          kind: 'timing',
          severity: 'info',
          title: {
            ar: `${s.name}: المساء`,
            de: `${s.name}: abends`,
          },
          message: {
            ar: 'كثيرون يفضلون المغنيسيوم مساءً لأنه يدعم الاسترخاء والنوم.',
            de: 'Magnesium wird oft abends eingenommen — entspannend, schlaffördernd.',
          },
        });
      }
    }
  }
  return out;
}

/**
 * Detect overlap between supplement nutrients and the user's recent diet,
 * plus outright gaps (supplement covers a nutrient they rarely eat).
 */
export function detectDietOverlap(
  supplements: Supplement[],
  dietLogs: DietLog[],
  daysWindow = 7,
): Insight[] {
  const out: Insight[] = [];
  const since = new Date();
  since.setDate(since.getDate() - daysWindow);
  const sinceIso = since.toISOString().slice(0, 10);

  const recent = dietLogs.filter((d) => d.date >= sinceIso);
  if (recent.length === 0) return out;

  // Count frequency of each nutrient in the recent diet.
  const dietNutrientCount: Record<string, number> = {};
  for (const log of recent) {
    const f = FOODS[log.foodKey];
    if (!f) continue;
    for (const n of f.nutrients) {
      dietNutrientCount[n] = (dietNutrientCount[n] ?? 0) + (log.portion || 1);
    }
  }

  const active = supplements.filter((s) => s.active);
  const covered = new Set<string>();
  for (const s of active) for (const n of s.nutrientKeys) covered.add(n);

  // Strong overlaps: supplement nutrient appears frequently in diet (>=4 times/week).
  for (const n of covered) {
    const count = dietNutrientCount[n] ?? 0;
    if (count >= 4) {
      const info = NUTRIENTS[n];
      if (!info) continue;
      out.push({
        id: `overlap-${n}`,
        kind: 'overlap',
        severity: 'info',
        title: {
          ar: `تكرار في ${info.label.ar}`,
          de: `Überschneidung bei ${info.label.de}`,
        },
        message: {
          ar: `تتناول ${info.label.ar} كثيراً من الطعام — قد لا تحتاج جرعة مكمل بنفس الحجم.`,
          de: `Du nimmst ${info.label.de} häufig über die Nahrung auf — Supplementdosis evtl. reduzieren.`,
        },
      });
    }
  }

  return out;
}

/**
 * Essential nutrients that should appear in a normal week's diet — used
 * by `detectGaps` to flag what the user is neither supplementing nor
 * eating.
 *
 * The list is intentionally short — only nutrients common-enough to
 * expect them in any reasonable diet (so we don't shame the user about
 * brazil-nut-only selenium).
 */
const ESSENTIAL_NUTRIENT_GAPS: Array<{
  key: string;
  /** minimum diet hits per `daysWindow` to consider it adequately covered */
  expected: number;
  hint: Record<Lang, string>;
}> = [
  { key: 'protein',   expected: 7, hint: {
      ar: 'البروتين أساس بناء الأنسجة. ضع مصدراً عالي البروتين في كل وجبة (بيض، عدس، دجاج، سمك، زبادي).',
      de: 'Protein ist Baustein für Gewebe. In jede Mahlzeit eine Proteinquelle (Eier, Linsen, Hähnchen, Fisch, Joghurt).',
  }},
  { key: 'omega3',    expected: 2, hint: {
      ar: 'أوميغا 3 يدعم الدماغ والقلب. مرتان أسبوعياً من سمك دهني (سلمون، سردين) أو بذور الكتان/الجوز.',
      de: 'Omega-3 für Gehirn & Herz. 2×/Woche fetter Fisch (Lachs, Sardinen) oder Lein- und Walnüsse.',
  }},
  { key: 'iron',      expected: 4, hint: {
      ar: 'الحديد ينقل الأكسجين. أدخل لحوماً حمراء، عدساً، سبانخاً، وكبدة بانتظام.',
      de: 'Eisen transportiert Sauerstoff. Rotes Fleisch, Linsen, Spinat, Leber regelmäßig.',
  }},
  { key: 'calcium',   expected: 5, hint: {
      ar: 'الكالسيوم أساس العظام. ألبان أو سردين أو لوز يومياً.',
      de: 'Calcium fürs Knochengerüst. Milchprodukte, Sardinen oder Mandeln täglich.',
  }},
  { key: 'magnesium', expected: 5, hint: {
      ar: 'المغنيسيوم يدعم العضلات والنوم. لوز، سبانخ، شوفان، أفوكادو.',
      de: 'Magnesium für Muskeln und Schlaf. Mandeln, Spinat, Hafer, Avocado.',
  }},
  { key: 'vitaminC',  expected: 5, hint: {
      ar: 'فيتامين سي مضاد أكسدة قوي. حمضيات، فلفل ملوّن، فراولة، كيوي.',
      de: 'Vitamin C als Antioxidans. Zitrusfrüchte, Paprika, Erdbeeren, Kiwi.',
  }},
  { key: 'fiber',     expected: 7, hint: {
      ar: 'الألياف تدعم الأمعاء. بقوليات، شوفان، خضروات ورقية، فواكه يومياً.',
      de: 'Ballaststoffe für den Darm. Hülsenfrüchte, Hafer, Blattgemüse, Obst täglich.',
  }},
  { key: 'probiotics', expected: 3, hint: {
      ar: 'البروبيوتيك يدعم الميكروبيوم. زبادي، كفير، لبنة، تيمبيه.',
      de: 'Probiotika fürs Mikrobiom. Joghurt, Kefir, Labneh, Tempeh.',
  }},
];

/**
 * Detect nutrient gaps — essential nutrients the user neither
 * supplements nor regularly eats. Skipped silently if the user has
 * fewer than 5 logged meals (we don't have enough signal yet).
 */
export function detectGaps(
  supplements: Supplement[],
  dietLogs: DietLog[],
  daysWindow = 7,
): Insight[] {
  const out: Insight[] = [];
  const since = new Date();
  since.setDate(since.getDate() - daysWindow);
  const sinceIso = since.toISOString().slice(0, 10);
  const recent = dietLogs.filter((d) => d.date >= sinceIso);
  if (recent.length < 5) return out; // not enough signal

  // Diet coverage by nutrient
  const dietHits: Record<string, number> = {};
  for (const log of recent) {
    const f = FOODS[log.foodKey];
    if (!f) continue;
    for (const n of f.nutrients) {
      dietHits[n] = (dietHits[n] ?? 0) + (log.portion || 1);
    }
  }

  // Supplement coverage
  const suppCovered = new Set<string>();
  for (const s of supplements) {
    if (!s.active) continue;
    for (const n of s.nutrientKeys) suppCovered.add(n);
  }

  for (const ess of ESSENTIAL_NUTRIENT_GAPS) {
    if (suppCovered.has(ess.key)) continue;          // covered via supplement
    const hits = dietHits[ess.key] ?? 0;
    if (hits >= ess.expected) continue;              // covered via diet
    const info = NUTRIENTS[ess.key];
    const label = info?.label ?? { ar: ess.key, de: ess.key };
    out.push({
      id: `gap-${ess.key}`,
      kind: 'gap',
      severity: 'info',
      title: {
        ar: `نقص محتمل: ${label.ar}`,
        de: `Möglicher Mangel: ${label.de}`,
      },
      message: ess.hint,
    });
  }

  return out;
}

/**
 * Detect correlations between supplement intake frequency and skin/hair trends
 * over the last 14 days. Very simple: compare metric averages on days with
 * vs without a supplement taken.
 */
export function detectCorrelations(
  supplements: Supplement[],
  intakeLogs: IntakeLog[],
  skinHair: SkinHairLog[],
  daysWindow = 14,
): Insight[] {
  const out: Insight[] = [];
  if (skinHair.length < 4 || supplements.length === 0) return out;

  const since = new Date();
  since.setDate(since.getDate() - daysWindow);
  const sinceIso = since.toISOString().slice(0, 10);
  const logs = skinHair.filter((l) => l.date >= sinceIso);
  if (logs.length < 4) return out;

  // Build set of dates per supplement where any intake was logged.
  const datesBySupplement: Record<string, Set<string>> = {};
  for (const il of intakeLogs) {
    const d = new Date(il.takenAt).toISOString().slice(0, 10);
    if (d < sinceIso) continue;
    (datesBySupplement[il.supplementId] ??= new Set()).add(d);
  }

  const avg = (arr: number[]) =>
    arr.length === 0 ? 0 : arr.reduce((a, b) => a + b, 0) / arr.length;

  for (const s of supplements) {
    const dates = datesBySupplement[s.id];
    if (!dates || dates.size < 3) continue;

    const onDays = logs.filter((l) => dates.has(l.date));
    const offDays = logs.filter((l) => !dates.has(l.date));
    if (onDays.length < 2 || offDays.length < 2) continue;

    // Hair luster trend
    const deltaLuster = avg(onDays.map((l) => l.hairLuster)) - avg(offDays.map((l) => l.hairLuster));
    const deltaBreakouts = avg(onDays.map((l) => l.skinBreakouts)) - avg(offDays.map((l) => l.skinBreakouts));

    if (deltaLuster >= 0.6) {
      out.push({
        id: `corr-luster-${s.id}`,
        kind: 'correlation',
        severity: 'info',
        title: { ar: `${s.name} وبريق الشعر`, de: `${s.name} & Haarglanz` },
        message: {
          ar: `أيام تناولك ${s.name} كان بريق الشعر أعلى في المتوسط. ملاحظة أولية فقط.`,
          de: `An Tagen mit ${s.name} war der Haarglanz im Schnitt höher — nur ein erster Hinweis.`,
        },
      });
    }
    if (deltaBreakouts <= -0.6) {
      out.push({
        id: `corr-breakouts-${s.id}`,
        kind: 'correlation',
        severity: 'info',
        title: { ar: `${s.name} وحبوب البشرة`, de: `${s.name} & Hautunreinheiten` },
        message: {
          ar: `أيام تناولك ${s.name} كانت الحبوب أقل في المتوسط.`,
          de: `An Tagen mit ${s.name} waren Hautunreinheiten im Schnitt geringer.`,
        },
      });
    }
  }
  return out;
}

/** Lifestyle habits pulled straight from the skin/hair logs. */
export function detectHabits(skinHair: SkinHairLog[]): Insight[] {
  const out: Insight[] = [];
  if (skinHair.length === 0) return out;
  const recent = skinHair.slice(0, 7); // newest first in DB order

  const avgSleep = recent.reduce((a, l) => a + l.sleepHours, 0) / recent.length;
  const avgWater = recent.reduce((a, l) => a + l.waterGlasses, 0) / recent.length;
  const avgStress = recent.reduce((a, l) => a + l.stress, 0) / recent.length;

  if (avgSleep < 6) {
    out.push({
      id: 'habit-sleep',
      kind: 'habit',
      severity: 'warn',
      title: { ar: 'قلة النوم', de: 'Zu wenig Schlaf' },
      message: {
        ar: `متوسط نومك ${avgSleep.toFixed(1)} ساعة آخر أسبوع. قلة النوم تؤثر على البشرة والشعر.`,
        de: `Schnitt ${avgSleep.toFixed(1)} h Schlaf letzte Woche. Wirkt sich auf Haut & Haar aus.`,
      },
    });
  }
  if (avgWater < 5) {
    out.push({
      id: 'habit-water',
      kind: 'habit',
      severity: 'info',
      title: { ar: 'شرب ماء قليل', de: 'Zu wenig Wasser' },
      message: {
        ar: `متوسط ${avgWater.toFixed(1)} كوب يومياً. ترطيب البشرة من الداخل يبدأ هنا.`,
        de: `Schnitt ${avgWater.toFixed(1)} Gläser/Tag. Hydration beginnt von innen.`,
      },
    });
  }
  if (avgStress >= 4) {
    out.push({
      id: 'habit-stress',
      kind: 'habit',
      severity: 'warn',
      title: { ar: 'إجهاد مرتفع', de: 'Hoher Stress' },
      message: {
        ar: 'الإجهاد المزمن مرتبط بتساقط الشعر وحبوب البشرة.',
        de: 'Chronischer Stress hängt mit Haarausfall und Hautunreinheiten zusammen.',
      },
    });
  }

  return out;
}

/**
 * Detect positive synergies between the user's active supplements.
 * Emits one insight per stack the user is fully (or near-fully) on.
 */
export function detectSynergies(supplements: Supplement[]): Insight[] {
  const active = supplements.filter((s) => s.active);
  if (active.length === 0) return [];
  const have = new Set<string>();
  for (const s of active) for (const n of s.nutrientKeys) have.add(n);

  const out: Insight[] = [];
  for (const syn of SYNERGIES) {
    const matched = syn.nutrients.filter((n) => have.has(n));
    // Only flag full matches (2-nutrient) or "almost full" for 3+ stacks.
    const isFull = matched.length === syn.nutrients.length;
    const isAlmost = syn.nutrients.length >= 3 && matched.length === syn.nutrients.length - 1;
    if (!isFull && !isAlmost) continue;

    out.push({
      id: `syn-${syn.id}`,
      kind: 'synergy',
      severity: 'info',
      title: syn.title,
      message: isFull
        ? { ar: syn.benefits.ar.join(' • '), de: syn.benefits.de.join(' • ') }
        : {
            ar: `أنت قريب من هذه الحزمة (تنقص ${syn.nutrients.length - matched.length} عنصر). ${syn.benefits.ar[0]}`,
            de: `Du bist nah an diesem Stack (es fehlt ${syn.nutrients.length - matched.length}). ${syn.benefits.de[0]}`,
          },
    });
  }
  return out;
}

/** Compose all insights. */
export function runAllInsights(args: {
  supplements: Supplement[];
  intakeLogs: IntakeLog[];
  dietLogs: DietLog[];
  skinHair: SkinHairLog[];
}): Insight[] {
  return [
    ...detectSynergies(args.supplements),
    ...detectInteractions(args.supplements),
    ...detectTiming(args.supplements),
    ...detectDietOverlap(args.supplements, args.dietLogs),
    ...detectGaps(args.supplements, args.dietLogs),
    ...detectCorrelations(args.supplements, args.intakeLogs, args.skinHair),
    ...detectHabits(args.skinHair),
  ];
}
