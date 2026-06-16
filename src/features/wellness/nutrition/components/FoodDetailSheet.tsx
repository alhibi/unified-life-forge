/**
 * FoodDetailSheet — Full nutritional breakdown for a food item.
 * Shows macros, vitamins, minerals, benefits, and serving info.
 */
import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import {
  X, Heart, Plus, Flame, Droplets, Info, Sparkles,
  Clock, Shield, Zap, ChevronDown, ChevronUp,
} from '@/lib/icons';
import type { NutritionFoodItem, VitaminProfile, MineralProfile } from '../types';
import { RDA_MALE } from '../types';
import { toggleFavorite, isFavorite, addToRecent, nutrientDensityScore } from '../utils';

type Lang = 'ar' | 'de';

interface Props {
  food: NutritionFoodItem;
  lang: Lang;
  onClose: () => void;
  onAddToLog?: (foodId: string, servingIdx: number, qty: number) => void;
}

const T = {
  per100g: { ar: 'لكل 100 غرام', de: 'Pro 100g' },
  macros: { ar: 'القيم الغذائية الكبرى', de: 'Makronährstoffe' },
  vitamins: { ar: 'الفيتامينات', de: 'Vitamine' },
  minerals: { ar: 'المعادن', de: 'Mineralstoffe' },
  benefits: { ar: 'الفوائد الصحية', de: 'Gesundheitsvorteile' },
  serving: { ar: 'حجم الحصة', de: 'Portionsgröße' },
  tags: { ar: 'التصنيفات', de: 'Tags' },
  gi: { ar: 'المؤشر الجلايسيمي', de: 'Glykämischer Index' },
  density: { ar: 'كثافة المغذيات', de: 'Nährstoffdichte' },
  addToLog: { ar: 'أضف للسجل', de: 'Zum Log hinzufügen' },
  allergens: { ar: 'مسببات الحساسية', de: 'Allergene' },
  storage: { ar: 'نصيحة تخزين', de: 'Lagertipp' },
  ofRDA: { ar: 'من الاحتياج اليومي', de: 'der Tagesdosis' },
  kcal: { ar: 'سعرة', de: 'kcal' },
  protein: { ar: 'بروتين', de: 'Protein' },
  carbs: { ar: 'كربوهيدرات', de: 'Kohlenhydrate' },
  fat: { ar: 'دهون', de: 'Fett' },
  fiber: { ar: 'ألياف', de: 'Ballaststoffe' },
  sugar: { ar: 'سكر', de: 'Zucker' },
  satFat: { ar: 'دهون مشبعة', de: 'Gesättigte Fette' },
  cholesterol: { ar: 'كوليسترول', de: 'Cholesterin' },
  showMore: { ar: 'عرض المزيد', de: 'Mehr anzeigen' },
  showLess: { ar: 'عرض أقل', de: 'Weniger anzeigen' },
};


const VITAMIN_LABELS: Record<keyof VitaminProfile, { ar: string; de: string; unit: string; rda: number }> = {
  vitA: { ar: 'فيتامين أ', de: 'Vitamin A', unit: 'μg', rda: 900 },
  vitB1: { ar: 'فيتامين ب1', de: 'Vitamin B1', unit: 'mg', rda: 1.2 },
  vitB2: { ar: 'فيتامين ب2', de: 'Vitamin B2', unit: 'mg', rda: 1.3 },
  vitB3: { ar: 'فيتامين ب3', de: 'Vitamin B3', unit: 'mg', rda: 16 },
  vitB5: { ar: 'فيتامين ب5', de: 'Vitamin B5', unit: 'mg', rda: 5 },
  vitB6: { ar: 'فيتامين ب6', de: 'Vitamin B6', unit: 'mg', rda: 1.3 },
  vitB7: { ar: 'بيوتين (ب7)', de: 'Biotin (B7)', unit: 'μg', rda: 30 },
  vitB9: { ar: 'فولات (ب9)', de: 'Folat (B9)', unit: 'μg', rda: 400 },
  vitB12: { ar: 'فيتامين ب12', de: 'Vitamin B12', unit: 'μg', rda: 2.4 },
  vitC: { ar: 'فيتامين سي', de: 'Vitamin C', unit: 'mg', rda: 90 },
  vitD: { ar: 'فيتامين د', de: 'Vitamin D', unit: 'μg', rda: 15 },
  vitE: { ar: 'فيتامين هـ', de: 'Vitamin E', unit: 'mg', rda: 15 },
  vitK: { ar: 'فيتامين ك', de: 'Vitamin K', unit: 'μg', rda: 120 },
};

const MINERAL_LABELS: Record<keyof MineralProfile, { ar: string; de: string; unit: string; rda: number }> = {
  calcium: { ar: 'كالسيوم', de: 'Kalzium', unit: 'mg', rda: 1000 },
  iron: { ar: 'حديد', de: 'Eisen', unit: 'mg', rda: 8 },
  magnesium: { ar: 'مغنيسيوم', de: 'Magnesium', unit: 'mg', rda: 400 },
  phosphorus: { ar: 'فوسفور', de: 'Phosphor', unit: 'mg', rda: 700 },
  potassium: { ar: 'بوتاسيوم', de: 'Kalium', unit: 'mg', rda: 3400 },
  sodium: { ar: 'صوديوم', de: 'Natrium', unit: 'mg', rda: 2300 },
  zinc: { ar: 'زنك', de: 'Zink', unit: 'mg', rda: 11 },
  copper: { ar: 'نحاس', de: 'Kupfer', unit: 'mg', rda: 0.9 },
  manganese: { ar: 'منغنيز', de: 'Mangan', unit: 'mg', rda: 2.3 },
  selenium: { ar: 'سيلينيوم', de: 'Selen', unit: 'μg', rda: 55 },
  iodine: { ar: 'يود', de: 'Jod', unit: 'μg', rda: 150 },
  chromium: { ar: 'كروم', de: 'Chrom', unit: 'μg', rda: 35 },
  molybdenum: { ar: 'موليبدنوم', de: 'Molybdän', unit: 'μg', rda: 45 },
};

const TAG_LABELS: Record<string, { ar: string; de: string }> = {
  halal: { ar: 'حلال', de: 'Halal' },
  vegan: { ar: 'نباتي', de: 'Vegan' },
  vegetarian: { ar: 'نباتي (مع بيض/حليب)', de: 'Vegetarisch' },
  gluten_free: { ar: 'خالي من الغلوتين', de: 'Glutenfrei' },
  dairy_free: { ar: 'خالي من الألبان', de: 'Milchfrei' },
  high_protein: { ar: 'عالي البروتين', de: 'Proteinreich' },
  high_fiber: { ar: 'عالي الألياف', de: 'Ballaststoffreich' },
  low_carb: { ar: 'منخفض الكربوهيدرات', de: 'Low-Carb' },
  keto_friendly: { ar: 'مناسب للكيتو', de: 'Keto-freundlich' },
  heart_healthy: { ar: 'صحة القلب', de: 'Herzgesund' },
  anti_inflammatory: { ar: 'مضاد التهاب', de: 'Entzündungshemmend' },
  brain_food: { ar: 'غذاء الدماغ', de: 'Brainfood' },
  muscle_building: { ar: 'بناء العضلات', de: 'Muskelaufbau' },
  weight_loss: { ar: 'فقدان الوزن', de: 'Abnehmen' },
  energy_boost: { ar: 'زيادة الطاقة', de: 'Energieboost' },
  immune_boost: { ar: 'تعزيز المناعة', de: 'Immunstärkend' },
  gut_health: { ar: 'صحة الأمعاء', de: 'Darmgesundheit' },
  skin_health: { ar: 'صحة البشرة', de: 'Hautgesundheit' },
  bone_health: { ar: 'صحة العظام', de: 'Knochengesundheit' },
};


export default function FoodDetailSheet({ food, lang, onClose, onAddToLog }: Props) {
  const [fav, setFav] = useState(isFavorite(food.id));
  const [showAllVitamins, setShowAllVitamins] = useState(false);
  const [showAllMinerals, setShowAllMinerals] = useState(false);
  const [selectedServing, setSelectedServing] = useState(0);
  const [quantity, setQuantity] = useState(1);
  const n = food.nutrition;
  const densityScore = nutrientDensityScore(food);

  useEffect(() => {
    addToRecent(food.id);
  }, [food.id]);

  const handleToggleFav = () => {
    const nowFav = toggleFavorite(food.id);
    setFav(nowFav);
  };

  // Get non-zero vitamins sorted by RDA coverage
  const vitaminEntries = Object.entries(n.vitamins)
    .filter(([, v]) => v != null && v > 0)
    .map(([k, v]) => {
      const meta = VITAMIN_LABELS[k as keyof VitaminProfile];
      const rdaPct = meta ? Math.round((v! / meta.rda) * 100) : 0;
      return { key: k, value: v!, meta, rdaPct };
    })
    .sort((a, b) => b.rdaPct - a.rdaPct);

  // Get non-zero minerals sorted by RDA coverage
  const mineralEntries = Object.entries(n.minerals)
    .filter(([, v]) => v != null && v > 0)
    .map(([k, v]) => {
      const meta = MINERAL_LABELS[k as keyof MineralProfile];
      const rdaPct = meta ? Math.round((v! / meta.rda) * 100) : 0;
      return { key: k, value: v!, meta, rdaPct };
    })
    .sort((a, b) => b.rdaPct - a.rdaPct);

  const displayedVitamins = showAllVitamins ? vitaminEntries : vitaminEntries.slice(0, 5);
  const displayedMinerals = showAllMinerals ? mineralEntries : mineralEntries.slice(0, 5);

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
        className="w-full max-w-lg bg-background rounded-t-3xl max-h-[92vh] overflow-y-auto overscroll-contain"
      >
        {/* Header */}
        <div className="sticky top-0 z-10 bg-background/95 backdrop-blur-md px-5 pt-4 pb-3 border-b border-border/30">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-2xl flex items-center justify-center text-2xl"
                style={{ backgroundColor: `${food.color}15` }}>
                {food.emoji}
              </div>
              <div>
                <h2 className="text-base font-bold text-foreground">{food.name[lang]}</h2>
                <p className="text-[11px] text-muted-foreground">{T.per100g[lang]}</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button onClick={handleToggleFav} className="p-2 rounded-full active:scale-90 transition-transform">
                <Heart className={`w-5 h-5 ${fav ? 'text-red-500 fill-red-500' : 'text-muted-foreground'}`} />
              </button>
              <button onClick={onClose} className="p-2 rounded-full bg-muted active:scale-90 transition-transform">
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>


        <div className="px-5 py-4 space-y-5">
          {/* ─── Macro Summary Ring ─── */}
          <div className="bg-muted/30 rounded-2xl p-4">
            <h3 className="text-xs font-semibold text-muted-foreground mb-3">{T.macros[lang]}</h3>
            <div className="grid grid-cols-5 gap-2 text-center">
              <MacroItem label={T.kcal[lang]} value={n.kcal} unit="" color="#f97316" />
              <MacroItem label={T.protein[lang]} value={n.protein} unit="g" color="#ef4444" />
              <MacroItem label={T.carbs[lang]} value={n.carbs} unit="g" color="#eab308" />
              <MacroItem label={T.fat[lang]} value={n.fat} unit="g" color="#06b6d4" />
              <MacroItem label={T.fiber[lang]} value={n.fiber} unit="g" color="#22c55e" />
            </div>
            {/* Extended macros */}
            <div className="grid grid-cols-3 gap-2 mt-3 pt-3 border-t border-border/30 text-[10px]">
              {n.sugar != null && (
                <div className="text-center">
                  <span className="text-muted-foreground">{T.sugar[lang]}</span>
                  <p className="font-semibold text-foreground">{n.sugar}g</p>
                </div>
              )}
              {n.saturatedFat != null && (
                <div className="text-center">
                  <span className="text-muted-foreground">{T.satFat[lang]}</span>
                  <p className="font-semibold text-foreground">{n.saturatedFat}g</p>
                </div>
              )}
              {n.cholesterol != null && (
                <div className="text-center">
                  <span className="text-muted-foreground">{T.cholesterol[lang]}</span>
                  <p className="font-semibold text-foreground">{n.cholesterol}mg</p>
                </div>
              )}
            </div>
          </div>

          {/* ─── Nutrient Density Score ─── */}
          <div className="flex items-center gap-3 p-3 rounded-xl border border-amber-500/20">
            <Sparkles className="w-5 h-5 text-amber-500" />
            <div className="flex-1">
              <p className="text-[11px] text-muted-foreground">{T.density[lang]}</p>
              <div className="flex items-baseline gap-1">
                <span className="text-lg font-bold text-foreground">{densityScore}</span>
                <span className="text-[10px] text-muted-foreground">/100</span>
              </div>
            </div>
            <div className="w-16 h-2 rounded-full bg-muted overflow-hidden">
              <div
                className="h-full rounded-full transition-all"
                style={{ width: `${Math.min(100, densityScore)}%` }}
              />
            </div>
          </div>

          {/* ─── GI Badge ─── */}
          {food.glycemicIndex != null && food.glycemicIndex > 0 && (
            <div className={`flex items-center gap-3 p-3 rounded-xl border ${
              food.glycemicIndex <= 35 ? 'bg-emerald-500/5 border-emerald-500/20' :
              food.glycemicIndex <= 55 ? 'bg-amber-500/5 border-amber-500/20' :
              'bg-red-500/5 border-red-500/20'
            }`}>
              <Zap className={`w-5 h-5 ${
                food.glycemicIndex <= 35 ? 'text-emerald-500' :
                food.glycemicIndex <= 55 ? 'text-amber-500' :
                'text-red-500'
              }`} />
              <div className="flex-1">
                <p className="text-[11px] text-muted-foreground">{T.gi[lang]}</p>
                <p className="text-sm font-bold text-foreground">{food.glycemicIndex}</p>
              </div>
              <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${
                food.glycemicIndex <= 35 ? 'bg-emerald-500/10 text-emerald-600' :
                food.glycemicIndex <= 55 ? 'bg-amber-500/10 text-amber-600' :
                'bg-red-500/10 text-red-600'
              }`}>
                {food.glycemicIndex <= 35 ? (lang === 'ar' ? 'منخفض' : 'Niedrig') :
                 food.glycemicIndex <= 55 ? (lang === 'ar' ? 'متوسط' : 'Mittel') :
                 (lang === 'ar' ? 'مرتفع' : 'Hoch')}
              </span>
            </div>
          )}


          {/* ─── Vitamins ─── */}
          {vitaminEntries.length > 0 && (
            <div>
              <h3 className="text-xs font-semibold text-foreground mb-2">{T.vitamins[lang]}</h3>
              <div className="space-y-1.5">
                {displayedVitamins.map(({ key, value, meta, rdaPct }) => (
                  <NutrientBar
                    key={key}
                    label={meta?.ar && lang === 'ar' ? meta.ar : meta?.de || key}
                    value={value}
                    unit={meta?.unit || ''}
                    rdaPct={rdaPct}
                    color="#8b5cf6"
                  />
                ))}
              </div>
              {vitaminEntries.length > 5 && (
                <button
                  onClick={() => setShowAllVitamins(!showAllVitamins)}
                  className="flex items-center gap-1 mt-2 text-[11px] text-primary"
                >
                  {showAllVitamins ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                  {showAllVitamins ? T.showLess[lang] : T.showMore[lang]}
                </button>
              )}
            </div>
          )}

          {/* ─── Minerals ─── */}
          {mineralEntries.length > 0 && (
            <div>
              <h3 className="text-xs font-semibold text-foreground mb-2">{T.minerals[lang]}</h3>
              <div className="space-y-1.5">
                {displayedMinerals.map(({ key, value, meta, rdaPct }) => (
                  <NutrientBar
                    key={key}
                    label={meta?.ar && lang === 'ar' ? meta.ar : meta?.de || key}
                    value={value}
                    unit={meta?.unit || ''}
                    rdaPct={rdaPct}
                    color="#0ea5e9"
                  />
                ))}
              </div>
              {mineralEntries.length > 5 && (
                <button
                  onClick={() => setShowAllMinerals(!showAllMinerals)}
                  className="flex items-center gap-1 mt-2 text-[11px] text-primary"
                >
                  {showAllMinerals ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                  {showAllMinerals ? T.showLess[lang] : T.showMore[lang]}
                </button>
              )}
            </div>
          )}

          {/* ─── Benefits ─── */}
          {food.benefits[lang].length > 0 && (
            <div>
              <h3 className="text-xs font-semibold text-foreground mb-2">{T.benefits[lang]}</h3>
              <div className="space-y-1.5">
                {food.benefits[lang].map((benefit, i) => (
                  <div key={i} className="flex items-start gap-2 text-[11px]">
                    <div className="w-4 h-4 rounded-full bg-emerald-500/10 flex items-center justify-center shrink-0 mt-0.5">
                      <span className="text-emerald-500 text-[8px] font-bold">{i + 1}</span>
                    </div>
                    <p className="text-foreground/80 leading-relaxed">{benefit}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ─── Tags ─── */}
          {food.tags.length > 0 && (
            <div>
              <h3 className="text-xs font-semibold text-foreground mb-2">{T.tags[lang]}</h3>
              <div className="flex flex-wrap gap-1.5">
                {food.tags.map(tag => (
                  <span key={tag} className="text-[9px] px-2 py-1 rounded-full bg-primary/10 text-primary font-medium">
                    {TAG_LABELS[tag]?.[lang] || tag}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* ─── Allergens ─── */}
          {food.allergens.length > 0 && (
            <div className="flex items-center gap-2 p-3 rounded-xl bg-red-500/5 border border-red-500/20">
              <Shield className="w-4 h-4 text-red-500" />
              <div>
                <p className="text-[11px] font-semibold text-red-600">{T.allergens[lang]}</p>
                <p className="text-[10px] text-red-500/80">{food.allergens.join(', ')}</p>
              </div>
            </div>
          )}

          {/* ─── Serving Sizes ─── */}
          <div>
            <h3 className="text-xs font-semibold text-foreground mb-2">{T.serving[lang]}</h3>
            <div className="space-y-1.5">
              {food.servings.map((s, i) => (
                <div key={i} className="flex items-center justify-between p-2 rounded-lg bg-muted/30 text-[11px]">
                  <span className="text-foreground">{s.description[lang]}</span>
                  <span className="font-semibold text-muted-foreground">{s.grams}g</span>
                </div>
              ))}
            </div>
          </div>

          {/* ─── Storage Tip ─── */}
          {food.storageTip && (
            <div className="flex items-start gap-2 p-3 rounded-xl bg-blue-500/5 border border-blue-500/20">
              <Info className="w-4 h-4 text-blue-500 shrink-0 mt-0.5" />
              <p className="text-[11px] text-foreground/80">{food.storageTip[lang]}</p>
            </div>
          )}
        </div>

        {/* Bottom safe area */}
        <div className="h-8" />
      </motion.div>
    </motion.div>
  );
}


/* ─── Helper Components ─── */

function MacroItem({ label, value, unit, color }: { label: string; value: number; unit: string; color: string }) {
  return (
    <div className="flex flex-col items-center">
      <div className="w-9 h-9 rounded-full flex items-center justify-center mb-1" style={{ backgroundColor: `${color}15` }}>
        <span className="text-[11px] font-bold" style={{ color }}>{value}{unit}</span>
      </div>
      <span className="text-[8px] text-muted-foreground leading-tight text-center">{label}</span>
    </div>
  );
}

function NutrientBar({ label, value, unit, rdaPct, color }: {
  label: string; value: number; unit: string; rdaPct: number; color: string;
}) {
  return (
    <div className="flex items-center gap-2">
      <span className="text-[10px] text-foreground/70 w-20 truncate">{label}</span>
      <div className="flex-1 h-2 rounded-full bg-muted/50 overflow-hidden">
        <div
          className="h-full rounded-full transition-all duration-700"
          style={{ width: `${Math.min(100, rdaPct)}%`, backgroundColor: color }}
        />
      </div>
      <span className="text-[9px] font-semibold text-foreground w-12 text-right" dir="ltr">
        {value}{unit}
      </span>
      <span className="text-[8px] text-muted-foreground w-8 text-right">{rdaPct}%</span>
    </div>
  );
}
