import React, { useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { Trash2, Calendar as CalIcon, Search, X, Flame } from 'lucide-react';
import { useApp } from '@/contexts/AppContext';
import { FOOD_LIST, FOODS, type Lang } from './wellnessData';
import type { DietLog, UUID } from './wellnessDb';
import { todayIso } from './wellnessDb';
import { CATEGORY_META, categoryOf, type FoodCategory } from './foodCategories';
import { FoodIcon } from './foodIcons';
import AppDatePicker from './AppDatePicker';
import { SoftSurface, withAlpha } from './premium/surfaces';
import { macrosFor, defaultGramsFor, dailyMacros } from './foodMacros';

interface AddDietExtras {
  grams?: number;
  customMacros?: { kcal: number; protein: number; carbs: number; fat: number };
}

interface Props {
  dietLogs: DietLog[];
  onAdd: (date: string, foodKey: string, portion?: number, extras?: AddDietExtras) => Promise<void>;
  onRemove: (id: UUID) => Promise<void>;
}

const item = {
  hidden: { opacity: 0, y: 14 },
  show: { opacity: 1, y: 0, transition: { duration: 0.4, ease: [0.16, 1, 0.3, 1] as const } },
};

const T = {
  date:           { ar: 'التاريخ',          de: 'Datum' },
  meals:          { ar: 'وجبات اليوم',     de: 'Mahlzeiten' },
  noMeals:        { ar: 'لم تسجل أي طعام بعد', de: 'Noch keine Mahlzeiten erfasst' },
  addFood:        { ar: 'أضف طعاماً',      de: 'Essen hinzufügen' },
  search:         { ar: 'ابحث عن طعام...', de: 'Essen suchen...' },
  all:            { ar: 'الكل',             de: 'Alle' },
  noResults:      { ar: 'لا نتائج',         de: 'Keine Treffer' },
  daysTotals:     { ar: 'إجماليات اليوم',  de: 'Tagessumme' },
  protein:        { ar: 'بروتين',           de: 'Protein' },
  carbs:          { ar: 'كربوهيدرات',      de: 'Kohlenhydrate' },
  fat:            { ar: 'دهون',             de: 'Fett' },
  kcal:           { ar: 'سعرة',             de: 'kcal' },
  serving:        { ar: 'الحصة',            de: 'Portion' },
  amount:         { ar: 'الكمية (غرام)',   de: 'Menge (g)' },
  cancel:         { ar: 'إلغاء',            de: 'Abbrechen' },
  add:            { ar: 'إضافة',            de: 'Hinzufügen' },
  customFood:     { ar: 'طعام مخصص',       de: 'Eigenes Essen' },
  customName:     { ar: 'اسم الطعام',       de: 'Name' },
  customMacrosHint: {
    ar: 'القيم الغذائية لكل 100غ (اختياري — لتحليل أدق)',
    de: 'Nährwerte pro 100 g (optional — für genaue Auswertung)',
  },
  estimated:      { ar: '≈ تقريبي', de: '≈ geschätzt' },
};

/* ─────────── Portion selector overlay ─────────── */

interface PortionSelectorProps {
  foodKey: string;
  foodLabel: string;
  isCustom: boolean;
  lang: Lang;
  onCancel: () => void;
  onConfirm: (grams: number, customMacros?: AddDietExtras['customMacros']) => void;
}

function PortionSelector({ foodKey, foodLabel, isCustom, lang, onCancel, onConfirm }: PortionSelectorProps) {
  const isAr = lang === 'ar';
  const defaultGrams = defaultGramsFor(foodKey);
  const presets = useMemo(() => {
    // Build sensible portion presets centered on the default.
    const base = defaultGrams;
    const set = new Set<number>([
      Math.round(base * 0.5),
      base,
      Math.round(base * 1.5),
      Math.round(base * 2),
    ]);
    return Array.from(set).filter((g) => g > 0).sort((a, b) => a - b);
  }, [defaultGrams]);

  const [grams, setGrams] = useState<number>(defaultGrams);
  // Custom macros (only shown when isCustom)
  const [showCustomMacros, setShowCustomMacros] = useState(false);
  const [cmKcal, setCmKcal] = useState('');
  const [cmProtein, setCmProtein] = useState('');
  const [cmCarbs, setCmCarbs] = useState('');
  const [cmFat, setCmFat] = useState('');

  const customMacros = useMemo(() => {
    if (!isCustom || !showCustomMacros) return undefined;
    const k = parseFloat(cmKcal);
    if (!Number.isFinite(k) || k <= 0) return undefined;
    return {
      kcal: k,
      protein: parseFloat(cmProtein) || 0,
      carbs: parseFloat(cmCarbs) || 0,
      fat: parseFloat(cmFat) || 0,
    };
  }, [isCustom, showCustomMacros, cmKcal, cmProtein, cmCarbs, cmFat]);

  const preview = useMemo(
    () => macrosFor(foodKey, grams, customMacros),
    [foodKey, grams, customMacros],
  );

  return (
    <motion.div
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 bg-black/50 flex items-end sm:items-center justify-center"
      onClick={onCancel}
    >
      <motion.div
        initial={{ y: '100%' }} animate={{ y: 0 }} exit={{ y: '100%' }}
        transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
        className="w-full sm:max-w-md bg-background rounded-t-3xl sm:rounded-3xl max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex justify-center pt-3 pb-1">
          <div className="w-10 h-1 rounded-full bg-muted-foreground/30" />
        </div>
        <div className="px-5 pt-2 pb-6 space-y-4">
          <div className="flex items-center gap-3">
            <FoodIcon foodKey={foodKey} size={48} />
            <div className="flex-1 min-w-0">
              <h2 className="text-base font-bold text-foreground truncate">{foodLabel}</h2>
              <p className="text-[11px] text-muted-foreground">{T.serving[lang]}</p>
            </div>
            <button
              onClick={onCancel}
              className="w-8 h-8 rounded-full bg-muted/50 flex items-center justify-center"
            >
              <X className="w-4 h-4 text-muted-foreground" />
            </button>
          </div>

          {/* Preset chips */}
          <div className="flex flex-wrap gap-1.5" dir="ltr">
            {presets.map((g) => (
              <button
                key={g}
                onClick={() => setGrams(g)}
                className={`text-[12px] font-semibold px-3 py-1.5 rounded-full border transition-colors ${
                  grams === g
                    ? 'bg-primary text-primary-foreground border-primary'
                    : 'bg-card text-muted-foreground border-border/40'
                }`}
              >
                {g}g
              </button>
            ))}
          </div>

          {/* Slider + numeric input */}
          <div className="space-y-1.5">
            <label className="text-[11px] font-semibold text-muted-foreground/70 uppercase tracking-wider">
              {T.amount[lang]}
            </label>
            <div className="flex items-center gap-2" dir="ltr">
              <input
                type="range"
                min={10}
                max={500}
                step={5}
                value={Math.min(500, grams)}
                onChange={(e) => setGrams(parseInt(e.target.value, 10))}
                className="flex-1 accent-primary"
              />
              <input
                type="number"
                inputMode="numeric"
                value={grams}
                onChange={(e) => {
                  const n = parseInt(e.target.value, 10);
                  if (Number.isFinite(n) && n > 0) setGrams(n);
                  else if (e.target.value === '') setGrams(0);
                }}
                className="w-20 bg-card border border-border/40 rounded-lg px-2 py-1.5 text-sm text-foreground outline-none focus:border-primary/50 text-center"
              />
              <span className="text-sm text-muted-foreground">g</span>
            </div>
          </div>

          {/* Custom macros (only for custom foods) */}
          {isCustom && (
            <div className="space-y-2">
              {!showCustomMacros ? (
                <button
                  type="button"
                  onClick={() => setShowCustomMacros(true)}
                  className="w-full text-[11px] font-semibold text-primary py-2 rounded-xl bg-primary/8 border border-primary/20"
                >
                  + {isAr ? 'أضف القيم الغذائية' : 'Nährwerte hinzufügen'}
                </button>
              ) : (
                <div className="space-y-1.5 bg-muted/20 rounded-xl p-3 border border-border/30">
                  <p className="text-[10px] text-muted-foreground/80 leading-relaxed">
                    {T.customMacrosHint[lang]}
                  </p>
                  <div className="grid grid-cols-2 gap-2" dir="ltr">
                    {[
                      { label: 'kcal',     value: cmKcal,    set: setCmKcal },
                      { label: T.protein[lang], value: cmProtein, set: setCmProtein },
                      { label: T.carbs[lang],   value: cmCarbs,   set: setCmCarbs },
                      { label: T.fat[lang],     value: cmFat,     set: setCmFat },
                    ].map((f) => (
                      <label key={f.label} className="text-[10px] text-muted-foreground space-y-0.5">
                        <span>{f.label}</span>
                        <input
                          type="number"
                          inputMode="decimal"
                          value={f.value}
                          onChange={(e) => f.set(e.target.value)}
                          placeholder="0"
                          className="w-full bg-card border border-border/40 rounded-lg px-2 py-1.5 text-sm text-foreground outline-none focus:border-primary/50"
                        />
                      </label>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Live macro preview */}
          <div className="grid grid-cols-4 gap-1.5" dir="ltr">
            {[
              { label: 'kcal',      v: preview.kcal,    color: '#10b981' },
              { label: T.protein[lang], v: preview.protein, color: '#ef4444' },
              { label: T.carbs[lang],   v: preview.carbs,   color: '#f59e0b' },
              { label: T.fat[lang],     v: preview.fat,     color: '#8b5cf6' },
            ].map((m) => (
              <div
                key={m.label}
                className="rounded-xl px-2 py-2 text-center"
                style={{ background: withAlpha(m.color, 0.08), border: `1px solid ${withAlpha(m.color, 0.18)}` }}
              >
                <div className="text-[14px] font-bold tabular-nums" style={{ color: m.color }}>
                  {m.label === 'kcal' ? Math.round(m.v) : m.v}
                </div>
                <div className="text-[8px] text-muted-foreground/70 uppercase tracking-wider mt-0.5">
                  {m.label === 'kcal' ? T.kcal[lang] : m.label}
                </div>
              </div>
            ))}
          </div>
          {preview.source === 'fallback' && (
            <p className="text-[9px] text-muted-foreground/60 text-center">{T.estimated[lang]}</p>
          )}

          <div className="flex gap-2 pt-1">
            <button
              type="button"
              onClick={onCancel}
              className="flex-1 py-2.5 rounded-xl bg-secondary text-secondary-foreground text-sm font-medium"
            >
              {T.cancel[lang]}
            </button>
            <button
              type="button"
              onClick={() => onConfirm(grams, customMacros)}
              disabled={grams <= 0}
              className="flex-1 py-2.5 rounded-xl bg-primary text-primary-foreground text-sm font-semibold active:scale-[0.98] transition-transform disabled:opacity-50"
            >
              {T.add[lang]}
            </button>
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
}

/* ─────────── Main tab ─────────── */

export default function DietTab({ dietLogs, onAdd, onRemove }: Props) {
  const { language } = useApp();
  const lang = language as Lang;
  const isAr = lang === 'ar';
  const [date, setDate] = useState(todayIso());
  const [query, setQuery] = useState('');
  const [activeCat, setActiveCat] = useState<FoodCategory | 'all'>('all');
  const [pendingFood, setPendingFood] = useState<{ key: string; label: string; isCustom: boolean } | null>(null);

  const logsForDay = useMemo(
    () => dietLogs.filter((d) => d.date === date),
    [dietLogs, date],
  );

  const totals = useMemo(() => dailyMacros(logsForDay), [logsForDay]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return FOOD_LIST.filter((f) => {
      if (q) {
        const match =
          f.label.ar.toLowerCase().includes(q) ||
          f.label.de.toLowerCase().includes(q) ||
          f.key.includes(q);
        if (!match) return false;
      }
      if (activeCat !== 'all' && categoryOf(f.key) !== activeCat) return false;
      return true;
    });
  }, [query, activeCat]);

  const grouped = useMemo(() => {
    const map = new Map<FoodCategory, typeof FOOD_LIST>();
    for (const f of filtered) {
      const c = categoryOf(f.key);
      if (!map.has(c)) map.set(c, []);
      map.get(c)!.push(f);
    }
    return Array.from(map.entries()).sort(
      (a, b) => CATEGORY_META[a[0]].order - CATEGORY_META[b[0]].order,
    );
  }, [filtered]);

  const categoryList = useMemo(
    () =>
      (Object.keys(CATEGORY_META) as FoodCategory[]).sort(
        (a, b) => CATEGORY_META[a].order - CATEGORY_META[b].order,
      ),
    [],
  );

  return (
    <div className="space-y-5">
      {/* Date picker */}
      <motion.div variants={item} initial="hidden" animate="show">
        <SoftSurface accent="hsl(var(--primary))" variant="mesh" intensity={0.65} className="p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-primary/12 flex items-center justify-center">
                <CalIcon className="w-5 h-5 text-primary" />
              </div>
              <div>
                <p className="text-[11px] font-semibold text-muted-foreground/70 uppercase tracking-wider">
                  {T.date[lang]}
                </p>
                <p className="text-sm font-semibold text-foreground mt-0.5" dir="ltr">{date}</p>
              </div>
            </div>
            <AppDatePicker value={date} onChange={setDate} />
          </div>
        </SoftSurface>
      </motion.div>

      {/* Daily totals — only when logs exist */}
      {logsForDay.length > 0 && (
        <motion.div variants={item} initial="hidden" animate="show">
          <SoftSurface accent="#10b981" className="p-3">
            <div className="flex items-center gap-2 mb-2">
              <Flame className="w-3.5 h-3.5 text-emerald-500" />
              <p className="text-[11px] font-semibold text-muted-foreground/80 uppercase tracking-wider">
                {T.daysTotals[lang]}
              </p>
            </div>
            <div className="grid grid-cols-4 gap-1.5" dir="ltr">
              {[
                { label: T.kcal[lang],     v: totals.kcal,    color: '#10b981' },
                { label: T.protein[lang],  v: totals.protein, color: '#ef4444' },
                { label: T.carbs[lang],    v: totals.carbs,   color: '#f59e0b' },
                { label: T.fat[lang],      v: totals.fat,     color: '#8b5cf6' },
              ].map((m) => (
                <div
                  key={m.label}
                  className="rounded-lg px-1.5 py-1.5 text-center"
                  style={{ background: withAlpha(m.color, 0.08), border: `1px solid ${withAlpha(m.color, 0.16)}` }}
                >
                  <div className="text-[15px] font-bold tabular-nums" style={{ color: m.color }}>
                    {Math.round(m.v)}
                  </div>
                  <div className="text-[8px] text-muted-foreground/70 uppercase tracking-wider mt-0.5">
                    {m.label}
                  </div>
                </div>
              ))}
            </div>
          </SoftSurface>
        </motion.div>
      )}

      {/* Logged foods */}
      <motion.div variants={item} initial="hidden" animate="show" className="space-y-1">
        <p className="text-[11px] font-semibold text-muted-foreground/70 uppercase tracking-wider px-1 mb-2">
          {T.meals[lang]}
        </p>
        {logsForDay.length === 0 ? (
          <SoftSurface variant="flat" className="p-6 border-dashed">
            <p className="text-sm text-muted-foreground text-center">
              {T.noMeals[lang]}
            </p>
          </SoftSurface>
        ) : (
          <SoftSurface variant="flat" className="overflow-hidden">
            <div className="divide-y divide-border/30">
              {logsForDay.map((log) => {
                const food = FOODS[log.foodKey];
                const isCustom = log.foodKey.startsWith('custom:');
                const label = food?.label[lang] ?? (isCustom ? log.foodKey.slice(7) : log.foodKey);
                const cat = food ? categoryOf(log.foodKey) : 'vegetable';
                const meta = CATEGORY_META[cat];
                const grams = log.grams ?? (log.portion ?? 1) * defaultGramsFor(log.foodKey);
                const m = macrosFor(log.foodKey, grams, log.customMacros);
                return (
                  <div key={log.id} className="flex items-center justify-between p-3 gap-2">
                    <div className="flex items-center gap-3 min-w-0 flex-1">
                      <FoodIcon foodKey={log.foodKey} size={36} />
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-semibold text-foreground truncate">{label}</p>
                        <p className="text-[10px] text-muted-foreground mt-0.5" dir="ltr">
                          {Math.round(grams)}g · {Math.round(m.kcal)}{T.kcal[lang]} · {m.protein}g {T.protein[lang]}
                        </p>
                      </div>
                    </div>
                    <button
                      onClick={() => onRemove(log.id)}
                      className="p-2 rounded-lg bg-destructive/10 text-destructive active:scale-90 transition-transform shrink-0"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                );
              })}
            </div>
          </SoftSurface>
        )}
      </motion.div>

      {/* Food picker */}
      <motion.div variants={item} initial="hidden" animate="show" className="space-y-2">
        <p className="text-[11px] font-semibold text-muted-foreground/70 uppercase tracking-wider px-1">
          {T.addFood[lang]}
        </p>

        {/* Search */}
        <div className="relative">
          <Search className="w-4 h-4 text-muted-foreground absolute top-1/2 -translate-y-1/2 start-3 pointer-events-none" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={T.search[lang]}
            className="w-full bg-card border border-border/40 rounded-xl ps-9 pe-3 py-2.5 text-base text-foreground outline-none focus:border-primary/50"
          />
        </div>

        {/* Category chips */}
        <div className="flex gap-1.5 overflow-x-auto pb-1 -mx-1 px-1 scrollbar-none">
          <button
            onClick={() => setActiveCat('all')}
            className={`shrink-0 text-[11px] font-semibold px-2.5 py-1.5 rounded-full border transition-colors ${
              activeCat === 'all'
                ? 'bg-primary text-primary-foreground border-primary'
                : 'bg-card text-muted-foreground border-border/40'
            }`}
          >
            {T.all[lang]}
          </button>
          {categoryList.map((c) => {
            const meta = CATEGORY_META[c];
            const Icon = meta.icon;
            const active = activeCat === c;
            return (
              <button
                key={c}
                onClick={() => setActiveCat(c)}
                className={`shrink-0 flex items-center gap-1 text-[11px] font-semibold px-2.5 py-1.5 rounded-full border transition-colors ${
                  active
                    ? `${meta.bg} ${meta.color} border-current`
                    : 'bg-card text-muted-foreground border-border/40'
                }`}
              >
                <Icon className={`w-3 h-3 ${active ? '' : meta.color}`} strokeWidth={2.2} />
                {meta.label[lang]}
              </button>
            );
          })}
        </div>

        {/* Grouped grid */}
        {grouped.length === 0 ? (
          <div className="bg-card border border-dashed border-border/50 rounded-2xl p-6 text-center">
            <p className="text-sm text-muted-foreground">
              {T.noResults[lang]}
            </p>
          </div>
        ) : (
          <div className="space-y-4 pt-1">
            {grouped.map(([cat, foods]) => {
              const meta = CATEGORY_META[cat];
              const Icon = meta.icon;
              return (
                <div key={cat} className="space-y-2">
                  <div className="flex items-center gap-2 px-1">
                    <div className={`w-7 h-7 rounded-lg ${meta.bg} flex items-center justify-center`}>
                      <Icon className={`w-3.5 h-3.5 ${meta.color}`} strokeWidth={2.2} />
                    </div>
                    <h4 className="text-[12px] font-bold text-foreground">{meta.label[lang]}</h4>
                    <span className="text-[10px] text-muted-foreground">({foods.length})</span>
                  </div>
                  <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
                    {foods.map((f) => (
                      <button
                        key={f.key}
                        onClick={() => setPendingFood({ key: f.key, label: f.label[lang], isCustom: false })}
                        className="bg-card border border-border/40 rounded-xl p-2.5 flex flex-col items-center gap-1.5 active:scale-95 transition-transform hover:border-primary/40"
                      >
                        <FoodIcon foodKey={f.key} size={36} />
                        <span className="text-[11px] font-medium text-foreground text-center leading-tight">
                          {f.label[lang]}
                        </span>
                      </button>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {query.trim() && (
          <button
            onClick={() => {
              const q = query.trim();
              setPendingFood({ key: `custom:${q}`, label: q, isCustom: true });
              setQuery('');
            }}
            className="w-full bg-primary/10 border border-primary/40 rounded-xl p-3 active:scale-[0.98] transition-transform"
          >
            <span className="text-[12px] font-semibold text-primary">
              + {isAr ? `أضف "${query.trim()}" كمخصص` : `"${query.trim()}" als eigenes Essen`}
            </span>
          </button>
        )}
      </motion.div>

      {pendingFood && (
        <PortionSelector
          foodKey={pendingFood.key}
          foodLabel={pendingFood.label}
          isCustom={pendingFood.isCustom}
          lang={lang}
          onCancel={() => setPendingFood(null)}
          onConfirm={async (grams, customMacros) => {
            await onAdd(date, pendingFood.key, 1, { grams, customMacros });
            setPendingFood(null);
          }}
        />
      )}
    </div>
  );
}
