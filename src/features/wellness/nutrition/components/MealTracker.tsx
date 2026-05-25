/**
 * MealTracker — Daily meal logging with full nutrition tracking.
 * Replaces/enhances the basic DietTab meal logging.
 */
import React, { useState, useMemo, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Plus, Trash2, Flame, Calendar, Coffee, Sun, Moon,
  Dumbbell, UtensilsCrossed, Cookie, ChevronRight,
  TrendingUp, Droplets,
} from 'lucide-react';
import { useApp } from '@/contexts/AppContext';
import type { NutritionFoodItem, MealType, MealEntry, FullNutrition } from '../types';
import {
  getMealLogForDate, saveMealEntry, removeMealEntry, generateId,
  todayStr, calculateServing, sumNutrition, FOOD_BY_ID,
  NUTRITION_DATABASE, searchFoods,
} from '../index';

type Lang = 'ar' | 'de';

const MEAL_TYPES: { type: MealType; icon: any; label: { ar: string; de: string }; color: string }[] = [
  { type: 'breakfast', icon: Coffee, label: { ar: 'إفطار', de: 'Frühstück' }, color: '#f59e0b' },
  { type: 'lunch', icon: Sun, label: { ar: 'غداء', de: 'Mittagessen' }, color: '#10b981' },
  { type: 'dinner', icon: Moon, label: { ar: 'عشاء', de: 'Abendessen' }, color: '#6366f1' },
  { type: 'snack', icon: Cookie, label: { ar: 'وجبة خفيفة', de: 'Snack' }, color: '#f97316' },
  { type: 'pre_workout', icon: Dumbbell, label: { ar: 'قبل التمرين', de: 'Pre-Workout' }, color: '#ef4444' },
  { type: 'post_workout', icon: Dumbbell, label: { ar: 'بعد التمرين', de: 'Post-Workout' }, color: '#22c55e' },
];

const T = {
  title: { ar: 'سجل الوجبات', de: 'Mahlzeiten-Log' },
  addMeal: { ar: 'أضف وجبة', de: 'Mahlzeit hinzufügen' },
  today: { ar: 'اليوم', de: 'Heute' },
  empty: { ar: 'لم تسجل أي طعام اليوم', de: 'Heute noch nichts erfasst' },
  search: { ar: 'ابحث عن طعام...', de: 'Essen suchen...' },
  totalToday: { ar: 'إجمالي اليوم', de: 'Tagessumme' },
  selectMeal: { ar: 'اختر نوع الوجبة', de: 'Mahlzeit wählen' },
  cancel: { ar: 'إلغاء', de: 'Abbrechen' },
  add: { ar: 'إضافة', de: 'Hinzufügen' },
  serving: { ar: 'الحصة', de: 'Portion' },
  qty: { ar: 'الكمية', de: 'Menge' },
};


export default function MealTracker() {
  const { language } = useApp();
  const lang: Lang = language === 'ar' ? 'ar' : 'de';
  const [date] = useState(todayStr());
  const [showAddForm, setShowAddForm] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);

  const entries = useMemo(() => getMealLogForDate(date), [date, refreshKey]);

  const dailyTotal = useMemo(() => {
    const nutritions = entries.map(e => {
      const food = FOOD_BY_ID[e.foodId];
      if (!food) return null;
      return calculateServing(food, e.servingIndex, e.quantity);
    }).filter(Boolean) as FullNutrition[];
    return sumNutrition(nutritions);
  }, [entries]);

  const handleRemove = useCallback((id: string) => {
    removeMealEntry(id);
    setRefreshKey(k => k + 1);
  }, []);

  const handleAdd = useCallback((foodId: string, mealType: MealType, servingIdx: number, qty: number) => {
    saveMealEntry({
      id: generateId(),
      foodId,
      servingIndex: servingIdx,
      quantity: qty,
      mealType,
      date,
    });
    setRefreshKey(k => k + 1);
    setShowAddForm(false);
  }, [date]);

  // Group entries by meal type
  const grouped = useMemo(() => {
    const map: Partial<Record<MealType, MealEntry[]>> = {};
    for (const e of entries) {
      if (!map[e.mealType]) map[e.mealType] = [];
      map[e.mealType]!.push(e);
    }
    return map;
  }, [entries]);

  return (
    <div className="space-y-4">
      {/* Daily totals header */}
      <div className="bg-gradient-to-r from-primary/10 to-emerald-500/10 rounded-2xl p-4 border border-primary/20">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-xs font-semibold text-muted-foreground">{T.totalToday[lang]}</h3>
          <div className="flex items-center gap-1 text-[10px] text-muted-foreground">
            <Calendar className="w-3 h-3" />
            {T.today[lang]}
          </div>
        </div>
        <div className="grid grid-cols-4 gap-3" dir="ltr">
          <TotalStat label="kcal" value={dailyTotal.kcal} color="#f97316" icon={Flame} />
          <TotalStat label="protein" value={Math.round(dailyTotal.protein)} suffix="g" color="#ef4444" />
          <TotalStat label="carbs" value={Math.round(dailyTotal.carbs)} suffix="g" color="#eab308" />
          <TotalStat label="fat" value={Math.round(dailyTotal.fat)} suffix="g" color="#06b6d4" />
        </div>
      </div>

      {/* Meal groups */}
      {entries.length === 0 ? (
        <div className="text-center py-10">
          <UtensilsCrossed className="w-8 h-8 mx-auto text-muted-foreground/30 mb-2" />
          <p className="text-sm text-muted-foreground">{T.empty[lang]}</p>
        </div>
      ) : (
        <div className="space-y-3">
          {MEAL_TYPES.map(({ type, icon: Icon, label, color }) => {
            const items = grouped[type];
            if (!items || items.length === 0) return null;
            return (
              <div key={type} className="rounded-xl border border-border/30 overflow-hidden">
                <div className="flex items-center gap-2 px-3 py-2 bg-muted/30">
                  <Icon className="w-3.5 h-3.5" style={{ color }} />
                  <span className="text-[11px] font-semibold text-foreground">{label[lang]}</span>
                  <span className="text-[9px] text-muted-foreground ml-auto">{items.length}</span>
                </div>
                <div className="divide-y divide-border/20">
                  {items.map(entry => {
                    const food = FOOD_BY_ID[entry.foodId];
                    if (!food) return null;
                    const n = calculateServing(food, entry.servingIndex, entry.quantity);
                    return (
                      <div key={entry.id} className="flex items-center gap-2 px-3 py-2">
                        <span className="text-sm">{food.emoji}</span>
                        <div className="flex-1 min-w-0">
                          <p className="text-[11px] font-medium text-foreground truncate">{food.name[lang]}</p>
                          <p className="text-[9px] text-muted-foreground" dir="ltr">
                            {n.kcal} kcal · {n.protein}g P · {n.carbs}g C · {n.fat}g F
                          </p>
                        </div>
                        <button onClick={() => handleRemove(entry.id)} className="p-1 text-destructive/60 active:scale-90">
                          <Trash2 className="w-3 h-3" />
                        </button>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Add button */}
      <button
        onClick={() => setShowAddForm(true)}
        className="w-full flex items-center justify-center gap-2 py-3 rounded-xl bg-primary/10 border border-primary/20 text-primary active:scale-98 transition-all"
      >
        <Plus className="w-4 h-4" />
        <span className="text-sm font-medium">{T.addMeal[lang]}</span>
      </button>

      {/* Add meal form */}
      <AnimatePresence>
        {showAddForm && (
          <AddMealForm
            lang={lang}
            onAdd={handleAdd}
            onClose={() => setShowAddForm(false)}
          />
        )}
      </AnimatePresence>
    </div>
  );
}


/* ─── Add Meal Form ─── */
function AddMealForm({ lang, onAdd, onClose }: {
  lang: Lang;
  onAdd: (foodId: string, mealType: MealType, servingIdx: number, qty: number) => void;
  onClose: () => void;
}) {
  const [step, setStep] = useState<'search' | 'options'>('search');
  const [query, setQuery] = useState('');
  const [selectedFood, setSelectedFood] = useState<NutritionFoodItem | null>(null);
  const [mealType, setMealType] = useState<MealType>('lunch');
  const [servingIdx, setServingIdx] = useState(0);
  const [qty, setQty] = useState(1);

  const results = useMemo(() => {
    if (!query.trim()) return NUTRITION_DATABASE.slice(0, 20);
    return searchFoods(query).slice(0, 20);
  }, [query]);

  const handleSelectFood = (food: NutritionFoodItem) => {
    setSelectedFood(food);
    setStep('options');
  };

  const handleConfirm = () => {
    if (selectedFood) {
      onAdd(selectedFood.id, mealType, servingIdx, qty);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-end justify-center"
      onClick={onClose}
    >
      <motion.div
        initial={{ y: '100%' }}
        animate={{ y: 0 }}
        exit={{ y: '100%' }}
        transition={{ type: 'spring', damping: 25, stiffness: 300 }}
        onClick={e => e.stopPropagation()}
        className="w-full max-w-lg bg-background rounded-t-3xl max-h-[85vh] overflow-y-auto"
      >
        <div className="p-4">
          {step === 'search' ? (
            <>
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-sm font-bold">{T.addMeal[lang]}</h3>
                <button onClick={onClose} className="text-[11px] text-primary">{T.cancel[lang]}</button>
              </div>
              <input
                type="text"
                value={query}
                onChange={e => setQuery(e.target.value)}
                placeholder={T.search[lang]}
                className="w-full px-4 py-2.5 rounded-xl bg-muted/50 border border-border/50 text-sm mb-3 focus:outline-none focus:ring-2 focus:ring-primary/30"
                autoFocus
                dir={lang === 'ar' ? 'rtl' : 'ltr'}
              />
              <div className="space-y-1 max-h-[50vh] overflow-y-auto">
                {results.map(food => (
                  <button
                    key={food.id}
                    onClick={() => handleSelectFood(food)}
                    className="w-full flex items-center gap-2 p-2 rounded-lg hover:bg-muted/50 active:scale-98 transition-all text-left"
                  >
                    <span className="text-lg">{food.emoji}</span>
                    <div className="flex-1 min-w-0">
                      <p className="text-[12px] font-medium truncate">{food.name[lang]}</p>
                      <p className="text-[9px] text-muted-foreground" dir="ltr">{food.nutrition.kcal} kcal · P:{food.nutrition.protein}g</p>
                    </div>
                    <ChevronRight className="w-3 h-3 text-muted-foreground" />
                  </button>
                ))}
              </div>
            </>
          ) : selectedFood ? (
            <>
              <div className="flex items-center gap-3 mb-4">
                <span className="text-2xl">{selectedFood.emoji}</span>
                <div>
                  <h3 className="text-sm font-bold">{selectedFood.name[lang]}</h3>
                  <p className="text-[10px] text-muted-foreground" dir="ltr">{selectedFood.nutrition.kcal} kcal/100g</p>
                </div>
              </div>

              {/* Meal type */}
              <p className="text-[11px] font-semibold mb-2">{T.selectMeal[lang]}</p>
              <div className="grid grid-cols-3 gap-1.5 mb-4">
                {MEAL_TYPES.map(({ type, icon: Icon, label, color }) => (
                  <button
                    key={type}
                    onClick={() => setMealType(type)}
                    className={`flex items-center gap-1 px-2 py-1.5 rounded-lg text-[10px] font-medium transition-all ${
                      mealType === type ? 'bg-primary text-primary-foreground' : 'bg-muted/50 text-foreground/70'
                    }`}
                  >
                    <Icon className="w-3 h-3" />
                    {label[lang]}
                  </button>
                ))}
              </div>

              {/* Serving size */}
              <p className="text-[11px] font-semibold mb-2">{T.serving[lang]}</p>
              <div className="space-y-1 mb-4">
                {selectedFood.servings.map((s, i) => (
                  <button
                    key={i}
                    onClick={() => setServingIdx(i)}
                    className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-[11px] transition-all ${
                      servingIdx === i ? 'bg-primary/10 border border-primary/30' : 'bg-muted/30'
                    }`}
                  >
                    <span>{s.description[lang]}</span>
                    <span className="font-semibold">{s.grams}g</span>
                  </button>
                ))}
              </div>

              {/* Quantity */}
              <div className="flex items-center gap-3 mb-4">
                <span className="text-[11px] font-semibold">{T.qty[lang]}</span>
                <div className="flex items-center gap-2">
                  <button onClick={() => setQty(Math.max(0.5, qty - 0.5))} className="w-7 h-7 rounded-full bg-muted flex items-center justify-center text-lg">-</button>
                  <span className="text-sm font-bold w-8 text-center">{qty}</span>
                  <button onClick={() => setQty(qty + 0.5)} className="w-7 h-7 rounded-full bg-muted flex items-center justify-center text-lg">+</button>
                </div>
              </div>

              {/* Confirm */}
              <div className="flex gap-2">
                <button onClick={() => setStep('search')} className="flex-1 py-2.5 rounded-xl bg-muted text-sm font-medium">{T.cancel[lang]}</button>
                <button onClick={handleConfirm} className="flex-1 py-2.5 rounded-xl bg-primary text-primary-foreground text-sm font-medium active:scale-95 transition-transform">
                  {T.add[lang]}
                </button>
              </div>
            </>
          ) : null}
        </div>
        <div className="h-8" />
      </motion.div>
    </motion.div>
  );
}

/* ─── Stat Helper ─── */
function TotalStat({ label, value, suffix, color, icon: Icon }: {
  label: string; value: number; suffix?: string; color: string; icon?: any;
}) {
  return (
    <div className="text-center">
      <div className="w-8 h-8 mx-auto rounded-lg flex items-center justify-center mb-1" style={{ backgroundColor: `${color}15` }}>
        {Icon && <Icon className="w-3.5 h-3.5" style={{ color }} />}
      </div>
      <p className="text-sm font-bold text-foreground">{value}{suffix}</p>
      <p className="text-[8px] text-muted-foreground">{label}</p>
    </div>
  );
}
