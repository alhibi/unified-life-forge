/**
 * SymptomAdvisor — Highly intelligent symptoms-to-deficiency diagnostics map.
 * Recommends foods and logs them directly to the food tracker.
 */
import { AnimatePresence, motion } from 'framer-motion';
import React, { useMemo, useState } from 'react';
import { toast } from 'sonner';

import { Check, HelpCircle, Info, Plus, Sparkles } from '@/lib/icons';

import { generateId, NUTRITION_DATABASE, saveMealEntry, todayStr } from '../index';
import type { Lang, NutritionFoodItem } from '../types';

interface Props {
  lang: Lang;
}

const T = {
  title: { ar: 'مستشار الأعراض ونقص المغذيات', de: 'Mangel- & Symptomberater' },
  subtitle: {
    ar: 'اختر أي عَرَض جسدي لمعرفة النقص المحتمل ومصادر الغذاء المعالجة له',
    de: 'Wähle Symptome, um potenzielle Mängel und lindernde Lebensmittel zu finden',
  },
  selectSymptom: { ar: 'حدد الأعراض التي تشعر بها:', de: 'Symptome auswählen:' },
  potentialDeficiencies: {
    ar: 'تحليل النقص المحتمل والمقترحات:',
    de: 'Mögliche Mängel & Empfehlungen:',
  },
  richFoods: { ar: 'أطعمة غنية لحل النقص:', de: 'Hilfreiche Lebensmittel:' },
  quickAdd: { ar: 'تسجيل الوجبة', de: 'Direkt loggen' },
  added: { ar: 'تم التسجيل في سجل الطعام', de: 'Erfolgreich erfasst' },
};

interface SymptomDef {
  key: string;
  label: { ar: string; de: string };
  deficiencies: Array<{
    nutrientName: { ar: string; de: string };
    cause: { ar: string; de: string };
    foodIds: string[]; // matching IDs in NUTRITION_DATABASE
  }>;
}

const SYMPTOMS: SymptomDef[] = [
  {
    key: 'cramps',
    label: { ar: 'تشنج العضلات (المستمر)', de: 'Muskelkrämpfe' },
    deficiencies: [
      {
        nutrientName: { ar: 'المغنيسيوم والبوتاسيوم', de: 'Magnesium & Kalium' },
        cause: {
          ar: 'نقص المغنيسيوم يمنع العضلات من الارتخاء التام بعد الانقباض، بينما ينظم البوتاسيوم جهد الغشاء الخلوي.',
          de: 'Magnesiummangel verhindert die vollständige Muskelentspannung, während Kalium das Membranpotenzial steuert.',
        },
        foodIds: ['avocado', 'spinach', 'almonds', 'banana_ripe', 'sweet_potato'],
      },
    ],
  },
  {
    key: 'fatigue',
    label: { ar: 'خمول وضعف طاقة مستمر', de: 'Chronische Müdigkeit' },
    deficiencies: [
      {
        nutrientName: { ar: 'الحديد وفيتامين B12', de: 'Eisen & Vitamin B12' },
        cause: {
          ar: 'الحديد أساسي لإنتاج الهيموجلوبين الناقل للأكسجين، وب12 ضروري لتشكيل خلايا الدم الحمراء وطاقة الجهاز العصبي.',
          de: 'Eisen ist essenziell für den Sauerstofftransport (Hämoglobin), B12 für rote Blutkörperchen und Nervenenergie.',
        },
        foodIds: ['liver_beef', 'beef_lean', 'eggs_whole', 'spinach', 'tuna_fresh'],
      },
    ],
  },
  {
    key: 'joints',
    label: { ar: 'آلام وخشونة المفاصل', de: 'Gelenkschmerzen / Steifheit' },
    deficiencies: [
      {
        nutrientName: { ar: 'الكولاجين وأوميغا 3', de: 'Kollagen & Omega-3' },
        cause: {
          ar: 'الكولاجين يبني الغضاريف التي تمتص الصدمات، وتكبح أوميغا 3 الالتهابات الحادة في المفاصل بعد التمرين.',
          de: 'Kollagen baut knorpelige Stoßdämpfer auf, Omega-3-Fettsäuren hemmen akute Entzündungen nach Belastungen.',
        },
        foodIds: ['salmon_atlantic', 'sardines_canned', 'bone_marrow', 'walnuts'],
      },
    ],
  },
  {
    key: 'skin_dry',
    label: { ar: 'جفاف البشرة وتقشرها', de: 'Trockene & schuppige Haut' },
    deficiencies: [
      {
        nutrientName: { ar: 'الزنك والأحماض الدهنية الأساسية', de: 'Zink & gesättigte Fettsäuren' },
        cause: {
          ar: 'الزنك يعزز تجدد خلايا الجلد والتئام الجروح، بينما تشكل الأحماض الدهنية الحاجز الدهني المانع لتبخر الرطوبة.',
          de: 'Zink fördert die Hauterneuerung, Fettsäuren bilden die Barriere gegen Feuchtigkeitsverlust.',
        },
        foodIds: ['avocado', 'olive_oil', 'almonds', 'eggs_whole', 'shrimp'],
      },
    ],
  },
  {
    key: 'sleep',
    label: { ar: 'أرق وصعوبة الاسترخاء ليلاً', de: 'Schlafstörungen & Unruhe' },
    deficiencies: [
      {
        nutrientName: { ar: 'التريبتوفان والمغنيسيوم', de: 'Tryptophan & Magnesium' },
        cause: {
          ar: 'التريبتوفان هو الحمض الأميني السلف لإنتاج السيروتونين والميلاتونين (هرمون النوم)، ويخفض المغنيسيوم مستويات الكورتيزول المسببة للتوتر.',
          de: 'Tryptophan ist die Vorstufe für Serotonin und Melatonin (Schlaf), Magnesium senkt stressbedingtes Cortisol.',
        },
        foodIds: ['turkey_breast', 'greek_yogurt', 'cottage_cheese', 'almonds', 'banana_ripe'],
      },
    ],
  },
];

export default function SymptomAdvisor({ lang }: Props) {
  const [selectedSymptoms, setSelectedSymptom] = useState<string[]>([]);

  const handleToggleSymptom = (key: string) => {
    setSelectedSymptom((prev) =>
      prev.includes(key) ? prev.filter((k) => k !== key) : [...prev, key],
    );
  };

  const advisorResults = useMemo(() => {
    const list: (typeof SYMPTOMS)[0]['deficiencies'] = [];
    selectedSymptoms.forEach((key) => {
      const match = SYMPTOMS.find((s) => s.key === key);
      if (match) {
        list.push(...match.deficiencies);
      }
    });
    return list;
  }, [selectedSymptoms]);

  const handleQuickLog = (food: NutritionFoodItem) => {
    saveMealEntry({
      id: generateId(),
      foodId: food.id,
      servingIndex: 0,
      quantity: 1,
      mealType: 'snack',
      date: todayStr(),
    });
    toast.success(`${food.emoji} ${food.name[lang]} - ${T.added[lang]}`);
  };

  return (
    <div className="space-y-4" dir={lang === 'ar' ? 'rtl' : 'ltr'}>
      {/* Header */}
      <div className="rounded-2xl p-4 bg-primary/5 border border-primary/20">
        <div className="flex items-center gap-2 mb-1.5">
          <Sparkles className="w-5 h-5 text-primary" />
          <h3 className="text-sm font-bold text-foreground">{T.title[lang]}</h3>
        </div>
        <p className="text-[11px] text-muted-foreground leading-relaxed">{T.subtitle[lang]}</p>
      </div>

      {/* Selector pills */}
      <div className="space-y-2">
        <p className="text-xs font-semibold text-muted-foreground">{T.selectSymptom[lang]}</p>
        <div className="flex flex-wrap gap-1.5">
          {SYMPTOMS.map((s) => {
            const active = selectedSymptoms.includes(s.key);
            return (
              <button
                key={s.key}
                onClick={() => handleToggleSymptom(s.key)}
                className={`flex items-center gap-1.5 px-3 py-2 rounded-xl border text-[11px] font-semibold transition-all ${
                  active
                    ? 'bg-primary text-primary-foreground border-primary'
                    : 'bg-card text-muted-foreground border-border/40 hover:border-primary/30'
                }`}
              >
                <span>{s.label[lang]}</span>
                {active && <Check className="w-3.5 h-3.5" />}
              </button>
            );
          })}
        </div>
      </div>

      {/* Diagnostics cards */}
      <AnimatePresence mode="wait">
        {advisorResults.length > 0 ? (
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            className="space-y-3"
          >
            <p className="text-xs font-semibold text-muted-foreground">
              {T.potentialDeficiencies[lang]}
            </p>
            {advisorResults.map((def, idx) => {
              const matchedFoods = NUTRITION_DATABASE.filter((f) => def.foodIds.includes(f.id));
              return (
                <div
                  key={idx}
                  className="rounded-xl border border-border/30 bg-card p-3.5 space-y-2.5"
                >
                  <div className="flex items-center gap-2">
                    <div className="w-6 h-6 rounded-lg bg-amber-500/10 flex items-center justify-center">
                      <Info className="w-3.5 h-3.5 text-primary" />
                    </div>
                    <h4 className="text-[12.5px] font-bold text-foreground">
                      {def.nutrientName[lang]}
                    </h4>
                  </div>
                  <p className="text-[11.5px] text-muted-foreground leading-relaxed">
                    {def.cause[lang]}
                  </p>
                  <div className="space-y-1.5 pt-1.5 border-t border-border/30">
                    <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">
                      {T.richFoods[lang]}
                    </p>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
                      {matchedFoods.map((food) => (
                        <div
                          key={food.id}
                          className="flex items-center justify-between p-2 rounded-lg bg-muted/20 border border-border/20 text-[11px]"
                        >
                          <div className="flex items-center gap-2">
                            <span>{food.emoji}</span>
                            <span className="font-semibold text-foreground">{food.name[lang]}</span>
                          </div>
                          <button
                            onClick={() => handleQuickLog(food)}
                            className="flex items-center gap-1 text-[9px] bg-primary/10 text-primary hover:bg-primary/20 px-2 py-1 rounded font-bold transition-colors active:scale-95"
                          >
                            <Plus className="w-3 h-3" />
                            {T.quickAdd[lang]}
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              );
            })}
          </motion.div>
        ) : (
          <div className="text-center py-10 border border-dashed border-border/40 rounded-2xl bg-card">
            <HelpCircle className="w-8 h-8 text-muted-foreground/30 mx-auto mb-1.5" />
            <p className="text-xs text-muted-foreground">{T.subtitle[lang]}</p>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
