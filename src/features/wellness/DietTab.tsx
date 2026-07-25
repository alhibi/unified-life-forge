/**
 * Diet tab — daily food log with REAL macro accounting.
 *
 * Old behaviour: a long, scrollable food picker with no portion editing,
 * no calorie/macro feedback, and no link to the user's profile-derived
 * targets — meaning logging a meal told the user nothing actionable.
 *
 * New behaviour:
 *   • Top hero shows today's totals (kcal/protein/carbs/fat) vs the
 *     athlete profile's daily targets, rendered as a 4-ring summary.
 *   • Each logged item has inline portion stepper (½, 1, 1.5, 2…) and
 *     shows its individual contribution.
 *   • Custom (free-text) logs render with a friendly note that macros
 *     are unknown — they still appear in the day list but don't break
 *     the totals.
 *   • Picker grid stays, but each card now shows its kcal/protein
 *     density at a glance.
 */

import { motion } from 'framer-motion';
import React, { useMemo, useState } from 'react';

import { useApp } from '@/contexts/AppContext';
import {
Beef, Calendar as CalIcon, Flame,
Info,   Minus, Plus, Salad, Search, Sparkles,
  Trash2, Wheat, } from '@/lib/icons';

import AppDatePicker from './AppDatePicker';
import { athleticSummary } from './athleticEngine';
import { CATEGORY_META, categoryOf, type FoodCategory } from './foodCategories';
import { FoodIcon } from './foodIcons';
import { hasMacros, macroFor, macrosForDate, portionGramsFor } from './foodMacros';
import { AnimatedNumber, ProgressRing, SectionHeader } from './premium/primitives';
import { SoftSurface, withAlpha } from './premium/surfaces';
import { FOOD_LIST, FOODS, type Lang } from './wellnessData';
import type { AthleteProfile, DietLog, UUID } from './wellnessDb';
import { todayIso } from './wellnessDb';

interface Props {
  dietLogs: DietLog[];
  profile?: AthleteProfile | null;
  onAdd: (date: string, foodKey: string, portion?: number) => Promise<void>;
  onRemove: (id: UUID) => Promise<void>;
  onPatch?: (id: UUID, patch: { portion?: number }) => Promise<void>;
}

const item = {
  hidden: { opacity: 0, y: 14 },
  show: { opacity: 1, y: 0, transition: { duration: 0.4, ease: [0.16, 1, 0.3, 1] as const } },
};

const T = {
  date: { ar: 'التاريخ', },
  meals: { ar: 'وجبات اليوم', },
  nothingLogged: { ar: 'لم تسجل أي طعام بعد', },
  add: { ar: 'أضف طعاماً', },
  search: { ar: 'ابحث عن طعام...', },
  all: { ar: 'الكل', },
  noResults: { ar: 'لا نتائج', },
  custom: { ar: 'كمخصص', },
  todayTotals: { ar: 'إجمالي اليوم', },
  ofTarget: { ar: 'من الهدف', },
  noTarget: {
    ar: 'أكمل ملفك لتفعيل أهداف السعرات والماكروز.',
  },
  kcal: { ar: 'سعرة', },
  protein: { ar: 'بروتين', },
  carbs: { ar: 'كربوهيدرات', },
  fat: { ar: 'دهون', },
  unknownMacros: {
    ar: 'لا توجد قيم غذائية معروفة',
  },
  portion: { ar: 'حصة', },
  approx: { ar: 'تقريبي', },
  perServing: { ar: 'لكل حصة', },
};

/* Portion options offered by the inline stepper. */
const PORTION_STEPS = [0.5, 1, 1.5, 2, 3];

function fmtKcal(n: number): string {
  if (!Number.isFinite(n)) return '—';
  return Math.round(n).toLocaleString();
}

function fmtG(n: number): string {
  if (!Number.isFinite(n)) return '—';
  return (Math.round(n * 10) / 10).toString();
}

/* ─────────────── Header: macro totals vs targets ─────────────── */

function MacroTotals({
  totals,
  targets,
  lang,
}: {
  totals: { kcal: number; protein: number; carbs: number; fat: number };
  targets: { kcal: number; protein: number; carbs: number; fat: number } | null;
  lang: Lang;
}) {
  const cells: Array<{
    key: 'kcal' | 'protein' | 'carbs' | 'fat';
    label: string;
    accent: string;
    icon: any;
    suffix: string;
  }> = [
    { key: 'kcal',    label: T.kcal[lang],    accent: '#10b981', icon: Flame, suffix: '' },
    { key: 'protein', label: T.protein[lang], accent: '#ef4444', icon: Beef,  suffix: 'g' },
    { key: 'carbs',   label: T.carbs[lang],   accent: '#f59e0b', icon: Wheat, suffix: 'g' },
    { key: 'fat',     label: T.fat[lang],     accent: '#06b6d4', icon: Salad, suffix: 'g' },
  ];

  return (
    <SoftSurface accent="hsl(var(--primary))" variant="mesh" intensity={0.7} className="p-4 space-y-3">
      <SectionHeader
        title={T.todayTotals[lang]}
        icon={Flame}
        subtitle={
          targets
            ? undefined
            : T.noTarget[lang]
        }
      />
      <div className="grid grid-cols-4 gap-2">
        {cells.map(({ key, label, accent, icon: Icon, suffix }) => {
          const cur = totals[key];
          const tgt = targets ? targets[key] : null;
          const ratio = tgt && tgt > 0 ? Math.max(0, Math.min(1.5, cur / tgt)) : 0;
          const visualRatio = Math.min(1, ratio);
          const display = key === 'kcal' ? fmtKcal(cur) : fmtG(cur);
          const tgtLabel =
            tgt != null
              ? key === 'kcal' ? fmtKcal(tgt) : fmtG(tgt)
              : null;
          const overshoot = tgt != null && cur > tgt;
          const ringColor = overshoot ? '#f59e0b' : accent;
          return (
            <div key={key} className="flex flex-col items-center gap-1.5">
              <ProgressRing
                value={visualRatio}
                size={62}
                strokeWidth={5}
                color={ringColor}
                colorAlt={ringColor}
                gradient
              >
                <Icon className="w-3.5 h-3.5" style={{ color: ringColor }} />
              </ProgressRing>
              <div className="text-center" dir="ltr">
                <div className="text-[14px] font-bold tabular-nums leading-none text-foreground">
                  <AnimatedNumber value={cur} digits={key === 'kcal' ? 0 : 1} />
                  <span className="text-[10px] text-muted-foreground ms-0.5">{suffix}</span>
                </div>
                {tgtLabel && (
                  <div className="text-[10px] text-muted-foreground/70 mt-0.5">
                    /{tgtLabel}{suffix}
                  </div>
                )}
              </div>
              <p className="text-[10px] uppercase tracking-wider font-semibold text-muted-foreground/70">
                {label}
              </p>
            </div>
          );
        })}
      </div>
      {targets && (
        <p className="text-[10px] text-muted-foreground/70 text-center pt-1 leading-relaxed">
          {totals.kcal > 0
            ? `${Math.round((totals.kcal / targets.kcal) * 100)}% ${T.ofTarget[lang]}`
            : T.add[lang]}
        </p>
      )}
    </SoftSurface>
  );
}

/* ─────────────── Inline portion stepper ─────────────── */

function PortionStepper({
  value,
  onChange,
  accent,
  lang,
}: {
  value: number;
  onChange: (v: number) => void;
  accent: string;
  lang: Lang;
}) {
  const dec = () => {
    const next = Math.max(0.25, Math.round((value - 0.25) * 4) / 4);
    onChange(next);
  };
  const inc = () => {
    const next = Math.min(8, Math.round((value + 0.25) * 4) / 4);
    onChange(next);
  };
  return (
    <div
      className="inline-flex items-center gap-1 rounded-full p-0.5"
      style={{ background: withAlpha(accent, 0.08), border: `1px solid ${withAlpha(accent, 0.2)}` }}
      dir="ltr"
    >
      <button
        type="button"
        onClick={dec}
        className="w-5 h-5 rounded-full flex items-center justify-center active:scale-90 transition-transform"
        style={{ color: accent }}
        aria-label="-"
      >
        <Minus className="w-2.5 h-2.5" />
      </button>
      <span className="text-[10px] font-bold tabular-nums px-1 min-w-[1.75rem] text-center" style={{ color: accent }}>
        ×{value % 1 === 0 ? value.toFixed(0) : value.toFixed(2).replace(/0$/, '')}
      </span>
      <button
        type="button"
        onClick={inc}
        className="w-5 h-5 rounded-full flex items-center justify-center active:scale-90 transition-transform"
        style={{ color: accent }}
        aria-label="+"
      >
        <Plus className="w-2.5 h-2.5" />
      </button>
    </div>
  );
}

/* ─────────────── Single logged item row ─────────────── */

function LogRow({
  log,
  lang,
  onRemove,
  onPatch,
}: {
  log: DietLog;
  lang: Lang;
  onRemove: () => void;
  onPatch?: (patch: { portion: number }) => void;
}) {
  const food = FOODS[log.foodKey];
  const isCustom = log.foodKey.startsWith('custom:');
  const label = food?.label[lang] ?? (isCustom ? log.foodKey.slice(7) : log.foodKey);
  const cat = food ? categoryOf(log.foodKey) : 'vegetable';
  const meta = CATEGORY_META[cat];
  const macros = macroFor(log.foodKey, log.portion);
  const known = !isCustom && hasMacros(log.foodKey);
  const grams = portionGramsFor(log.foodKey) * log.portion;
  const accent = '#10b981';

  return (
    <div className="flex items-start gap-2.5 p-3">
      <FoodIcon foodKey={log.foodKey} size={36} />
      <div className="flex-1 min-w-0">
        <div className="flex items-baseline gap-2">
          <p className="text-[13px] font-semibold text-foreground truncate">{label}</p>
          <span className="text-[10px] text-muted-foreground/60 shrink-0" dir="ltr">
            {Math.round(grams)} g
          </span>
        </div>
        <p className="text-[10px] text-muted-foreground mt-0.5">
          {isCustom
            ? T.unknownMacros[lang]
            : meta.label[lang]}
        </p>
        {known && (
          <div className="flex items-center gap-2.5 mt-1.5 text-[10px] text-muted-foreground" dir="ltr">
            <span className="inline-flex items-center gap-0.5">
              <Flame className="w-2.5 h-2.5 text-emerald-500" />
              <span className="tabular-nums font-semibold text-foreground">{macros.kcal}</span>
              <span className="text-muted-foreground/70">{T.kcal[lang]}</span>
            </span>
            <span className="inline-flex items-center gap-0.5">
              <Beef className="w-2.5 h-2.5 text-rose-500" />
              <span className="tabular-nums font-semibold text-foreground">{fmtG(macros.protein)}g</span>
            </span>
            <span className="inline-flex items-center gap-0.5">
              <Wheat className="w-2.5 h-2.5 text-amber-500" />
              <span className="tabular-nums text-foreground/80">{fmtG(macros.carbs)}g</span>
            </span>
            <span className="inline-flex items-center gap-0.5">
              <Salad className="w-2.5 h-2.5 text-cyan-500" />
              <span className="tabular-nums text-foreground/80">{fmtG(macros.fat)}g</span>
            </span>
          </div>
        )}
        {onPatch && (
          <div className="mt-1.5">
            <PortionStepper
              value={log.portion ?? 1}
              onChange={(v) => onPatch({ portion: v })}
              accent={accent}
              lang={lang}
            />
          </div>
        )}
      </div>
      <button
        onClick={onRemove}
        className="p-1.5 rounded-lg bg-destructive/10 text-destructive active:scale-90 transition-transform shrink-0"
        aria-label="remove"
      >
        <Trash2 className="w-3.5 h-3.5" />
      </button>
    </div>
  );
}

/* ─────────────── Main component ─────────────── */

export default function DietTab({
  dietLogs,
  profile,
  onAdd,
  onRemove,
  onPatch,
}: Props) {
  const { language } = useApp();
  const lang = language as Lang;
  const [date, setDate] = useState(todayIso());
  const [query, setQuery] = useState('');
  const [activeCat, setActiveCat] = useState<FoodCategory | 'all'>('all');

  const logsForDay = useMemo(
    () => dietLogs.filter((d) => d.date === date),
    [dietLogs, date],
  );

  const totals = useMemo(() => macrosForDate(dietLogs, date), [dietLogs, date]);

  /* Targets — derived from athlete profile (if complete enough). */
  const targets = useMemo(() => {
    if (!profile || !profile.heightCm || !profile.weightKg || !profile.birthYear) return null;
    const sum = athleticSummary({ profile });
    if (!sum.calorieTarget || !sum.macros) return null;
    return {
      kcal: sum.calorieTarget,
      protein: sum.macros.protein,
      carbs: sum.macros.carbs,
      fat: sum.macros.fat,
    };
  }, [profile]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return FOOD_LIST.filter((f) => {
      if (q) {
        const match =
          f.label.ar.toLowerCase().includes(q) ||
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
      {/* Macro totals hero */}
      <motion.div variants={item} initial="hidden" animate="show">
        <MacroTotals totals={totals} targets={targets} lang={lang} />
      </motion.div>

      {/* Date picker */}
      <motion.div variants={item} initial="hidden" animate="show">
        <SoftSurface variant="flat" className="p-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-primary/10 flex items-center justify-center">
                <CalIcon className="w-4 h-4 text-primary" />
              </div>
              <div>
                <p className="text-[10px] font-semibold text-muted-foreground/70 uppercase tracking-wider">
                  {T.date[lang]}
                </p>
                <p className="text-[13px] font-semibold text-foreground mt-0.5" dir="ltr">{date}</p>
              </div>
            </div>
            <AppDatePicker value={date} onChange={setDate} />
          </div>
        </SoftSurface>
      </motion.div>

      {/* Logged foods */}
      <motion.div variants={item} initial="hidden" animate="show" className="space-y-1">
        <SectionHeader title={T.meals[lang]} />
        {logsForDay.length === 0 ? (
          <SoftSurface variant="flat" className="p-6 border-dashed">
            <p className="text-sm text-muted-foreground text-center">{T.nothingLogged[lang]}</p>
          </SoftSurface>
        ) : (
          <SoftSurface variant="flat" className="overflow-hidden">
            <div className="divide-y divide-border/30">
              {logsForDay.map((log) => (
                <LogRow
                  key={log.id}
                  log={log}
                  lang={lang}
                  onRemove={() => onRemove(log.id)}
                  onPatch={onPatch ? (p) => onPatch(log.id, p) : undefined}
                />
              ))}
            </div>
          </SoftSurface>
        )}
      </motion.div>

      {/* Food picker */}
      <motion.div variants={item} initial="hidden" animate="show" className="space-y-2">
        <SectionHeader title={T.add[lang]} icon={Sparkles} />

        <div className="relative">
          <Search className="w-4 h-4 text-muted-foreground absolute top-1/2 -translate-y-1/2 start-3 pointer-events-none" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={T.search[lang]}
            className="w-full bg-card border border-border/40 rounded-xl ps-9 pe-3 py-2.5 text-base text-foreground outline-none focus:border-primary/50"
          />
        </div>

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

        {grouped.length === 0 ? (
          <div className="bg-card border border-dashed border-border/50 rounded-2xl p-6 text-center">
            <p className="text-sm text-muted-foreground">{T.noResults[lang]}</p>
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
                    {foods.map((f) => {
                      const m = macroFor(f.key, 1);
                      const known = hasMacros(f.key);
                      return (
                        <button
                          key={f.key}
                          onClick={() => onAdd(date, f.key)}
                          className="bg-card border border-border/40 rounded-xl p-2.5 flex flex-col items-center gap-1 active:scale-95 transition-transform hover:border-primary/40"
                        >
                          <FoodIcon foodKey={f.key} size={36} />
                          <span className="text-[11px] font-medium text-foreground text-center leading-tight line-clamp-2">
                            {f.label[lang]}
                          </span>
                          {known ? (
                            <span className="text-[10px] text-muted-foreground/70 tabular-nums" dir="ltr">
                              {m.kcal} {T.kcal[lang]} · {fmtG(m.protein)}g P
                            </span>
                          ) : (
                            <span className="text-[10px] text-muted-foreground/40">—</span>
                          )}
                        </button>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {query.trim() && (
          <button
            onClick={() => {
              onAdd(date, `custom:${query.trim()}`);
              setQuery('');
            }}
            className="w-full bg-primary/10 border border-primary/40 rounded-xl p-3 active:scale-[0.98] transition-transform"
          >
            <span className="text-[12px] font-semibold text-primary">
              + {`أضف "${query.trim()}" ${T.custom[lang]}`}
            </span>
          </button>
        )}
      </motion.div>

      {/* Tiny note about portion semantics */}
      <p className="text-[10px] text-muted-foreground/60 leading-relaxed text-center px-3 flex items-center justify-center gap-1">
        <Info className="w-3 h-3 inline-block" />
        {'القيم الغذائية تقريبية وتعتمد على حصة قياسية لكل صنف.'}
      </p>
    </div>
  );
}
