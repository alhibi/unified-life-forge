/**
 * FoodComparer — Highly polished bilingual side-by-side food comparison engine.
 * Allows choosing up to 3 foods from the database to compare macronutrients,
 * and all 13 vitamins & 14 minerals side-by-side with comparative progress indicators.
 */
import { AnimatePresence, motion } from 'framer-motion';
import React, { useMemo, useState } from 'react';

import { Award, Check, Scale, Search, X } from '@/lib/icons';

import { FOOD_BY_ID, NUTRITION_DATABASE } from '../index';
import type { Lang, NutritionFoodItem } from '../types';

interface Props {
  lang: Lang;
}

const T = {
  title: { ar: 'مقارن الأغذية المطور', },
  subtitle: {
    ar: 'قارن قيم الماكروز والفيتامينات والمعادن بين 3 أطعمة جنباً إلى جنب',
  },
  selectFood: { ar: 'اختر طعاماً...', },
  kcal: { ar: 'سعرات', },
  protein: { ar: 'بروتين', },
  carbs: { ar: 'كربوهيدرات', },
  fat: { ar: 'دهون', },
  fiber: { ar: 'ألياف', },
  sugar: { ar: 'سكر', },
  searchPlaceholder: { ar: 'ابحث لتضيف للمقارنة...', },
  clearAll: { ar: 'مسح الكل', },
  winner: { ar: 'الرائد في', },
  per100g: { ar: 'القيم لكل 100غ', },
  macros: { ar: 'الماكرونيوترينتس', },
  vitamins: { ar: 'الفيتامينات', },
  minerals: { ar: 'المعادن', },
};

const MICRO_LABELS: Record<string, { ar: string; unit: string }> = {
  vitA: { ar: 'فيتامين أ', unit: 'µg' },
  vitB1: { ar: 'ثيامين (B1)', unit: 'mg' },
  vitB2: { ar: 'ريبوفلافين (B2)', unit: 'mg' },
  vitB3: { ar: 'نياسين (B3)', unit: 'mg' },
  vitB5: { ar: 'بانتوثينيك (B5)', unit: 'mg' },
  vitB6: { ar: 'بيريدوكسين (B6)', unit: 'mg' },
  vitB7: { ar: 'بيوتين (B7)', unit: 'µg' },
  vitB9: { ar: 'فولات (B9)', unit: 'µg' },
  vitB12: { ar: 'كوبالامين (B12)', unit: 'µg' },
  vitC: { ar: 'فيتامين سي', unit: 'mg' },
  vitD: { ar: 'فيتامين د', unit: 'µg' },
  vitE: { ar: 'فيتامين هـ', unit: 'mg' },
  vitK: { ar: 'فيتامين ك', unit: 'µg' },
  calcium: { ar: 'كالسيوم', unit: 'mg' },
  iron: { ar: 'حديد', unit: 'mg' },
  magnesium: { ar: 'مغنيسيوم', unit: 'mg' },
  phosphorus: { ar: 'فوسفور', unit: 'mg' },
  potassium: { ar: 'بوتاسيوم', unit: 'mg' },
  sodium: { ar: 'صوديوم', unit: 'mg' },
  zinc: { ar: 'زنك', unit: 'mg' },
  copper: { ar: 'نحاس', unit: 'mg' },
  manganese: { ar: 'منغنيز', unit: 'mg' },
  selenium: { ar: 'سيلينيوم', unit: 'µg' },
  iodine: { ar: 'يود', unit: 'µg' },
};

export default function FoodComparer({ lang }: Props) {
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [searchOpen, setSearchOpen] = useState(false);
  const [activeSlot, setActiveSlot] = useState<number | null>(null);
  const [query, setQuery] = useState('');

  const filtered = useMemo(() => {
    if (!query.trim()) return NUTRITION_DATABASE.slice(0, 30);
    const q = query.toLowerCase();
    return NUTRITION_DATABASE.filter(
      (f) =>
        f.name.ar.toLowerCase().includes(q) ||
        f.id.includes(q),
    ).slice(0, 30);
  }, [query]);

  const selectedFoods = useMemo(() => {
    return selectedIds.map((id) => FOOD_BY_ID[id]).filter(Boolean) as NutritionFoodItem[];
  }, [selectedIds]);

  const winners = useMemo(() => {
    if (selectedFoods.length < 2) return null;
    const stats = {
      protein: { max: -1, idx: -1 },
      fiber: { max: -1, idx: -1 },
      kcal: { min: Infinity, idx: -1 },
    };
    selectedFoods.forEach((food, idx) => {
      if (food.nutrition.protein > stats.protein.max) {
        stats.protein = { max: food.nutrition.protein, idx };
      }
      if (food.nutrition.fiber > stats.fiber.max) {
        stats.fiber = { max: food.nutrition.fiber, idx };
      }
      if (food.nutrition.kcal < stats.kcal.min) {
        stats.kcal = { min: food.nutrition.kcal, idx };
      }
    });
    return stats;
  }, [selectedFoods]);

  const handleOpenSearch = (slot: number) => {
    setActiveSlot(slot);
    setSearchOpen(true);
    setQuery('');
  };

  const handleSelectFood = (food: NutritionFoodItem) => {
    if (activeSlot !== null) {
      const next = [...selectedIds];
      next[activeSlot] = food.id;
      setSelectedIds(next);
    }
    setSearchOpen(false);
    setActiveSlot(null);
  };

  const handleRemove = (idx: number) => {
    const next = [...selectedIds];
    next.splice(idx, 1);
    setSelectedIds(next.filter(Boolean));
  };

  const handleClearAll = () => {
    setSelectedIds([]);
  };

  return (
    <div className="space-y-4" dir={'rtl'}>
      {/* Hero card */}
      <div className="rounded-2xl p-4 bg-primary/5 border border-primary/20">
        <div className="flex items-center gap-2 mb-1.5">
          <Scale className="w-5 h-5 text-primary" />
          <h3 className="text-meta font-bold text-foreground">{T.title[lang]}</h3>
        </div>
        <p className="text-micro text-muted-foreground leading-relaxed">{T.subtitle[lang]}</p>
        <div className="text-micro text-muted-foreground mt-1 font-semibold">
          {T.per100g[lang]}
        </div>
      </div>

      {/* Comparison columns */}
      <div className="grid grid-cols-3 gap-2">
        {Array.from({ length: 3 }).map((_, idx) => {
          const food = selectedFoods[idx];
          return (
            <div key={idx} className="relative flex flex-col">
              {food ? (
                <div className="relative rounded-xl p-2.5 bg-card border border-border/40 text-center flex-1 flex flex-col justify-between">
                  <button
                    onClick={() => handleRemove(idx)}
                    className="absolute -top-1.5 -end-1.5 w-5 h-5 rounded-full bg-destructive/10 hover:bg-destructive/20 text-destructive flex items-center justify-center active:scale-90 transition-transform z-raised"
                  >
                    <X className="w-3 h-3" />
                  </button>
                  <div className="space-y-1">
                    <span className="text-display block">{food.emoji}</span>
                    <h4 className="text-micro font-bold text-foreground line-clamp-2 leading-tight">
                      {food.name[lang]}
                    </h4>
                  </div>
                  {/* Winner Badges */}
                  {winners && (
                    <div className="mt-2 space-y-0.5">
                      {winners.protein.idx === idx && (
                        <span className="inline-flex items-center gap-0.5 text-micro bg-red-500/10 text-red-500 font-bold px-1 py-0.5 rounded">
                          <Award className="w-2 h-2" />
                          {T.protein[lang]}
                        </span>
                      )}
                      {winners.fiber.idx === idx && food.nutrition.fiber > 0 && (
                        <span className="inline-flex items-center gap-0.5 text-micro bg-emerald-500/10 text-emerald-500 font-bold px-1 py-0.5 rounded">
                          <Award className="w-2 h-2" />
                          {T.fiber[lang]}
                        </span>
                      )}
                    </div>
                  )}
                </div>
              ) : (
                <button
                  onClick={() => handleOpenSearch(idx)}
                  className="rounded-xl border border-dashed border-border/60 hover:border-primary/50 hover:bg-primary/5 text-center p-6 flex flex-col items-center justify-center gap-1.5 text-muted-foreground flex-1 min-h-[90px]"
                >
                  <div className="w-7 h-7 rounded-full bg-muted/40 flex items-center justify-center">
                    <X className="w-3.5 h-3.5 rotate-45" />
                  </div>
                  <span className="text-micro font-semibold">{T.selectFood[lang]}</span>
                </button>
              )}
            </div>
          );
        })}
      </div>

      {selectedFoods.length > 0 && (
        <div className="flex justify-end">
          <button
            onClick={handleClearAll}
            className="text-micro text-destructive hover:underline font-semibold"
          >
            {T.clearAll[lang]}
          </button>
        </div>
      )}

      {selectedFoods.length > 0 && (
        <div className="space-y-4 rounded-2xl bg-card border border-border/40 p-3.5">
          {/* Macronutrients section */}
          <div className="space-y-2.5">
            <h5 className="text-micro font-bold text-muted-foreground border-b border-border/30 pb-1 uppercase tracking-wider">
              {T.macros[lang]}
            </h5>
            <MacroRow
              label={T.kcal[lang]}
              valueKey="kcal"
              foods={selectedFoods}
              color="#f97316"
              unit=""
            />
            <MacroRow
              label={T.protein[lang]}
              valueKey="protein"
              foods={selectedFoods}
              color="#ef4444"
              unit="g"
            />
            <MacroRow
              label={T.carbs[lang]}
              valueKey="carbs"
              foods={selectedFoods}
              color="#eab308"
              unit="g"
            />
            <MacroRow
              label={T.fat[lang]}
              valueKey="fat"
              foods={selectedFoods}
              color="#06b6d4"
              unit="g"
            />
            <MacroRow
              label={T.fiber[lang]}
              valueKey="fiber"
              foods={selectedFoods}
              color="#10b981"
              unit="g"
            />
          </div>

          {/* Micro sections (Only show if at least one food has data) */}
          <div className="space-y-2.5 pt-2">
            <h5 className="text-micro font-bold text-muted-foreground border-b border-border/30 pb-1 uppercase tracking-wider">
              {T.vitamins[lang]}
            </h5>
            {Object.keys(MICRO_LABELS)
              .slice(0, 13)
              .map((key) => (
                <MicroRow
                  key={key}
                  label={MICRO_LABELS[key][lang]}
                  microKey={key}
                  type="vitamins"
                  foods={selectedFoods}
                  color="#a855f7"
                  unit={MICRO_LABELS[key].unit}
                />
              ))}
          </div>

          <div className="space-y-2.5 pt-2">
            <h5 className="text-micro font-bold text-muted-foreground border-b border-border/30 pb-1 uppercase tracking-wider">
              {T.minerals[lang]}
            </h5>
            {Object.keys(MICRO_LABELS)
              .slice(13)
              .map((key) => (
                <MicroRow
                  key={key}
                  label={MICRO_LABELS[key][lang]}
                  microKey={key}
                  type="minerals"
                  foods={selectedFoods}
                  color="#0ea5e9"
                  unit={MICRO_LABELS[key].unit}
                />
              ))}
          </div>
        </div>
      )}

      {/* Search overlay sheet */}
      <AnimatePresence>
        {searchOpen && (
          <div
            className="fixed inset-0 z-drawer bg-black/60 flex items-end justify-center"
            onClick={() => setSearchOpen(false)}
          >
            <motion.div
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 300 }}
              onClick={(e) => e.stopPropagation()}
              className="w-full max-w-md bg-background rounded-t-3xl max-h-[80vh] flex flex-col"
            >
              <div className="p-4 border-b border-border/30 flex items-center justify-between">
                <h4 className="text-meta font-bold text-foreground">{T.selectFood[lang]}</h4>
                <button
                  onClick={() => setSearchOpen(false)}
                  className="w-7 h-7 rounded-full bg-muted flex items-center justify-center text-muted-foreground"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
              <div className="p-3">
                <div className="relative">
                  <Search className="absolute start-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <input
                    type="text"
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    placeholder={T.searchPlaceholder[lang]}
                    className="w-full ps-9 pe-4 py-2.5 rounded-xl bg-muted/50 border border-border/50 text-meta focus:outline-none focus:border-primary"
                    dir={'rtl'}
                    autoFocus
                  />
                </div>
              </div>
              <div className="flex-1 overflow-y-auto px-3 pb-6 space-y-1 max-h-[45vh]">
                {filtered.map((food) => {
                  const isAlreadyComp = selectedIds.includes(food.id);
                  return (
                    <button
                      key={food.id}
                      onClick={() => handleSelectFood(food)}
                      disabled={isAlreadyComp}
                      className={`w-full flex items-center gap-3 p-2.5 rounded-xl text-start transition-colors ${
                        isAlreadyComp
                          ? 'opacity-40 cursor-not-allowed bg-muted/10'
                          : 'hover:bg-muted/40 active:scale-[0.99]'
                      }`}
                    >
                      <span className="text-display">{food.emoji}</span>
                      <div className="flex-1 min-w-0">
                        <p className="text-mini font-bold text-foreground truncate">
                          {food.name[lang]}
                        </p>
                        <p className="text-micro text-muted-foreground mt-0.5">
                          {food.nutrition.kcal} kcal · P: {food.nutrition.protein}g · F:{' '}
                          {food.nutrition.fiber}g
                        </p>
                      </div>
                      {isAlreadyComp && <Check className="w-4 h-4 text-primary shrink-0" />}
                    </button>
                  );
                })}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}

function MacroRow({
  label,
  valueKey,
  foods,
  color,
  unit,
}: {
  label: string;
  valueKey: 'kcal' | 'protein' | 'carbs' | 'fat' | 'fiber';
  foods: NutritionFoodItem[];
  color: string;
  unit: string;
}) {
  const vals = foods.map((f) => f.nutrition[valueKey] || 0);
  const maxVal = Math.max(...vals, 1);

  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between text-micro font-semibold text-muted-foreground">
        <span>{label}</span>
      </div>
      <div className="grid grid-cols-3 gap-2">
        {Array.from({ length: 3 }).map((_, i) => {
          const food = foods[i];
          if (!food) return <div key={i} className="h-6" />;
          const val = food.nutrition[valueKey] || 0;
          const pct = (val / maxVal) * 100;
          return (
            <div key={i} className="space-y-0.5">
              <span className="text-micro font-bold text-foreground block tabular-nums">
                {val}
                {unit}
              </span>
              <div className="h-1 rounded-full bg-muted/40 overflow-hidden">
                <div
                  className="h-full rounded-full transition-all duration-300"
                  style={{ width: `${pct}%`, backgroundColor: color }}
                />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function MicroRow({
  label,
  microKey,
  type,
  foods,
  color,
  unit,
}: {
  label: string;
  microKey: string;
  type: 'vitamins' | 'minerals';
  foods: NutritionFoodItem[];
  color: string;
  unit: string;
}) {
  const vals = foods.map((f) => {
    const list = f.nutrition[type] as unknown as Record<string, number>;
    return list?.[microKey] || 0;
  });
  const maxVal = Math.max(...vals, 0);

  if (maxVal === 0) return null; // hide if none have this micro

  return (
    <div className="space-y-1">
      <div className="text-micro font-semibold text-muted-foreground/80">{label}</div>
      <div className="grid grid-cols-3 gap-2">
        {Array.from({ length: 3 }).map((_, i) => {
          const food = foods[i];
          if (!food) return <div key={i} className="h-6" />;
          const list = food.nutrition[type] as unknown as Record<string, number>;
          const val = list?.[microKey] || 0;
          const pct = maxVal > 0 ? (val / maxVal) * 100 : 0;
          return (
            <div key={i} className="space-y-0.5">
              <span className="text-micro font-bold text-foreground block tabular-nums">
                {val > 0 ? `${val}${unit}` : '—'}
              </span>
              {val > 0 && (
                <div className="h-1 rounded-full bg-muted/40 overflow-hidden">
                  <div
                    className="h-full rounded-full transition-all duration-300"
                    style={{ width: `${pct}%`, backgroundColor: color }}
                  />
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
