/**
 * EncyclopediaTab — comprehensive wellness knowledge base for athletes in their 20s.
 *
 * Three sections (sub-tabs):
 *  • Calisthenics — skill progressions with detailed levels, cues, mistakes
 *  • Nutrition   — food atlas with macros, timing, athlete tips
 *  • Wisdom      — health science: sleep, hormones, recovery, longevity
 *
 * Designed mobile-first, fully RTL/LTR aware, polished animations.
 */

import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Search, X, ChevronDown, Dumbbell, Apple, BookOpen, Zap,
  Trophy, Flame, AlertCircle, Target, Lightbulb, Clock,
  ChevronRight, Activity, Heart, Brain, Moon, Sparkles,
  Filter,
} from '@/lib/icons';
import { useApp } from '@/contexts/AppContext';

import {
  CALISTHENICS_ATLAS, CATEGORY_LABELS, CALI_PHILOSOPHIES,
  type CalisthenicsSkill, type SkillCategory,
} from './calisthenicsAtlas';
import {
  FOOD_ATLAS, FOOD_GROUP_LABELS, MEAL_TIME_LABELS,
  type FoodAtlasEntry, type FoodGroup,
} from './foodAtlas';
import {
  HEALTH_ENCYCLOPEDIA, CATEGORY_LABELS_ENC,
  type EncyclopediaCategory,
} from './healthEncyclopedia';

/* ═══════════════════════════════════════════════════════════════════
 *  Translations
 * ═══════════════════════════════════════════════════════════════════ */

const T = {
  search: { ar: 'ابحث...', de: 'Suchen...' },
  cali:   { ar: 'كاليستنيكس',   de: 'Calisthenics' },
  food:   { ar: 'الأطعمة',       de: 'Nahrung' },
  wisdom: { ar: 'حكمة الصحة',    de: 'Wissen' },
  prerequisites: { ar: 'المتطلبات', de: 'Voraussetzungen' },
  levels: { ar: 'المستويات',     de: 'Levels' },
  cues: { ar: 'مفاتيح التقنية', de: 'Technik-Cues' },
  mistakes: { ar: 'أخطاء شائعة', de: 'Häufige Fehler' },
  muscles: { ar: 'العضلات',     de: 'Muskeln' },
  frequency: { ar: 'التكرار',   de: 'Frequenz' },
  proTip: { ar: 'نصيحة المحترف', de: 'Profi-Tipp' },
  difficulty: { ar: 'الصعوبة',  de: 'Schwierigkeit' },
  estimatedMonths: { ar: 'وقت متوقع', de: 'Geschätzte Dauer' },
  months: { ar: 'شهر', de: 'Monate' },
  benefits: { ar: 'الفوائد',    de: 'Vorteile' },
  keyNutrients: { ar: 'عناصر رئيسية', de: 'Hauptnährstoffe' },
  pairing: { ar: 'الإقران',     de: 'Kombination' },
  pitfall: { ar: 'احذر',        de: 'Warnung' },
  athleteTip: { ar: 'نصيحة الرياضي', de: 'Athleten-Tipp' },
  optimalTimes: { ar: 'أوقات مثالية', de: 'Optimale Zeiten' },
  per100g: { ar: 'لكل 100غ',    de: 'pro 100 g' },
  kcal: { ar: 'سعرة',           de: 'kcal' },
  protein: { ar: 'بروتين',      de: 'Protein' },
  carbs: { ar: 'كربوهيدرات',    de: 'Carbs' },
  fat: { ar: 'دهون',            de: 'Fett' },
  fiber: { ar: 'ألياف',         de: 'Ballast.' },
  gi: { ar: 'مؤشر سكري',        de: 'GI' },
  giLow: { ar: 'منخفض',         de: 'Niedrig' },
  giMid: { ar: 'متوسط',         de: 'Mittel' },
  giHigh: { ar: 'عالي',         de: 'Hoch' },
  philosophies: { ar: 'فلسفة الكاليستنيكس', de: 'Calisthenics-Philosophie' },
  action: { ar: 'الفعل المطلوب', de: 'Aktion' },
  impact: { ar: 'التأثير',       de: 'Wirkung' },
  myth: { ar: 'خرافة شائعة',     de: 'Mythos' },
  noResults: { ar: 'لا نتائج',   de: 'Keine Ergebnisse' },
  filterAll: { ar: 'الكل',       de: 'Alle' },
};

/* ═══════════════════════════════════════════════════════════════════
 *  SubTab — top-level switcher
 * ═══════════════════════════════════════════════════════════════════ */

type SubTab = 'cali' | 'food' | 'wisdom';

const SUB_TABS: { key: SubTab; icon: any; color: string }[] = [
  { key: 'cali',   icon: Dumbbell, color: '#f97316' },
  { key: 'food',   icon: Apple,    color: '#84cc16' },
  { key: 'wisdom', icon: BookOpen, color: '#a855f7' },
];

/* ═══════════════════════════════════════════════════════════════════
 *  Difficulty indicator (1-10 dots)
 * ═══════════════════════════════════════════════════════════════════ */

function DifficultyDots({ level, color }: { level: number; color: string }) {
  return (
    <div className="flex gap-0.5">
      {Array.from({ length: 10 }).map((_, i) => (
        <div
          key={i}
          className="w-1 h-1 rounded-full transition-all"
          style={{
            backgroundColor: i < level ? color : 'hsl(var(--muted))',
            opacity: i < level ? 0.85 : 0.25,
          }}
        />
      ))}
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════
 *  CALISTHENICS SECTION
 * ═══════════════════════════════════════════════════════════════════ */

function CalisthenicsSection({ lang, query }: { lang: 'ar' | 'de'; query: string }) {
  const [expanded, setExpanded] = useState<string | null>(null);
  const [filterCat, setFilterCat] = useState<SkillCategory | 'all'>('all');

  const filtered = useMemo(() => {
    return CALISTHENICS_ATLAS.filter((skill) => {
      if (filterCat !== 'all' && skill.category !== filterCat) return false;
      if (query) {
        const q = query.toLowerCase();
        return (
          skill.name[lang].toLowerCase().includes(q) ||
          skill.description[lang].toLowerCase().includes(q)
        );
      }
      return true;
    });
  }, [filterCat, query, lang]);

  const categories: (SkillCategory | 'all')[] = ['all', 'push', 'pull', 'core', 'legs', 'static', 'dynamic'];

  return (
    <div className="space-y-3">
      {/* Philosophy hero strip */}
      <div className="overflow-x-auto -mx-3 px-3 pb-1 scrollbar-none">
        <div className="flex gap-2 w-max">
          {CALI_PHILOSOPHIES.map((p, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: i * 0.05 }}
              className="shrink-0 w-[200px] p-2.5 rounded-xl border border-border/40"
            >
              <div className="text-base mb-1">{p.emoji}</div>
              <h4 className="text-[11px] font-semibold mb-1 text-foreground">{p.title[lang]}</h4>
              <p className="text-[9px] text-muted-foreground leading-relaxed line-clamp-3">
                {p.body[lang]}
              </p>
            </motion.div>
          ))}
        </div>
      </div>

      {/* Category filters */}
      <div className="flex gap-1 overflow-x-auto scrollbar-none -mx-3 px-3" dir="ltr">
        {categories.map((cat) => {
          const active = filterCat === cat;
          return (
            <button
              key={cat}
              onClick={() => setFilterCat(cat)}
              className={`shrink-0 h-6 px-2 rounded-full text-[10px] font-medium transition-all ${
                active
                  ? 'bg-primary text-primary-foreground'
                  : 'bg-muted/40 text-muted-foreground hover:bg-muted/60'
              }`}
            >
              {cat === 'all' ? T.filterAll[lang] : CATEGORY_LABELS[cat as SkillCategory][lang]}
            </button>
          );
        })}
      </div>

      {/* Skills list */}
      <div className="space-y-2">
        <AnimatePresence>
          {filtered.length === 0 ? (
            <div className="text-center py-8 text-[11px] text-muted-foreground">{T.noResults[lang]}</div>
          ) : (
            filtered.map((skill) => (
              <SkillCard
                key={skill.key}
                skill={skill}
                lang={lang}
                expanded={expanded === skill.key}
                onToggle={() => setExpanded(expanded === skill.key ? null : skill.key)}
              />
            ))
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}

function SkillCard({
  skill, lang, expanded, onToggle,
}: { skill: CalisthenicsSkill; lang: 'ar' | 'de'; expanded: boolean; onToggle: () => void }) {
  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25 }}
      className="rounded-xl border border-border/40 overflow-hidden"
      style={{ backgroundColor: 'hsl(var(--card))' }}
    >
      {/* Header */}
      <button
        onClick={onToggle}
        className="w-full p-3 flex items-center gap-3 active:bg-muted/30 transition-colors"
      >
        <div
          className="w-10 h-10 rounded-xl flex items-center justify-center text-xl shrink-0"
          style={{ backgroundColor: `${skill.color}20`, border: `1px solid ${skill.color}40` }}
        >
          {skill.emoji}
        </div>
        <div className="flex-1 min-w-0 text-start">
          <h3 className="text-[12px] font-semibold text-foreground truncate">
            {skill.name[lang]}
          </h3>
          <div className="flex items-center gap-2 mt-0.5">
            <DifficultyDots level={skill.difficulty} color={skill.color} />
            <span className="text-[9px] text-muted-foreground">
              {skill.estimatedMonths} {T.months[lang]}
            </span>
          </div>
        </div>
        <motion.div
          animate={{ rotate: expanded ? 180 : 0 }}
          transition={{ duration: 0.2 }}
          className="shrink-0"
        >
          <ChevronDown className="w-4 h-4 text-muted-foreground" />
        </motion.div>
      </button>

      {/* Expanded content */}
      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.3 }}
            className="overflow-hidden"
          >
            <div className="px-3 pb-3 space-y-3 border-t border-border/30 pt-3">
              {/* Description */}
              <p className="text-[10.5px] text-foreground/80 leading-relaxed">
                {skill.description[lang]}
              </p>

              {/* Quick stats */}
              <div className="grid grid-cols-2 gap-1.5">
                <StatBox icon={Activity} label={T.muscles[lang]} value={skill.muscles[lang].slice(0, 2).join('، ')} color={skill.color} />
                <StatBox icon={Clock} label={T.frequency[lang]} value={skill.frequency[lang]} color={skill.color} />
              </div>

              {/* Prerequisites */}
              {skill.prerequisites.length > 0 && (
                <Section icon={Target} title={T.prerequisites[lang]} color={skill.color}>
                  <div className="space-y-1">
                    {skill.prerequisites.map((p, i) => (
                      <div key={i} className="flex items-center gap-1.5 text-[10px]">
                        <div className="w-1 h-1 rounded-full bg-muted-foreground/50" />
                        <span className="text-foreground/80">{p.min[lang]}</span>
                      </div>
                    ))}
                  </div>
                </Section>
              )}

              {/* Levels */}
              <Section icon={Trophy} title={T.levels[lang]} color={skill.color}>
                <div className="space-y-1.5">
                  {skill.levels.map((lvl, i) => (
                    <div
                      key={i}
                      className="rounded-lg p-2 border border-border/30 bg-muted/20"
                    >
                      <div className="flex items-center gap-1.5 mb-0.5">
                        <span
                          className="w-4 h-4 rounded-full flex items-center justify-center text-[8px] font-bold text-white shrink-0"
                          style={{ backgroundColor: skill.color }}
                        >
                          {i + 1}
                        </span>
                        <span className="text-[11px] font-semibold text-foreground">
                          {lvl.name[lang]}
                        </span>
                      </div>
                      <p className="text-[9.5px] text-muted-foreground leading-relaxed mb-1">
                        {lvl.description[lang]}
                      </p>
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-[8.5px] px-1.5 py-0.5 rounded bg-primary/10 text-primary font-medium">
                          {lvl.prescription[lang]}
                        </span>
                        <span className="text-[8.5px] text-muted-foreground/70">
                          → {lvl.progressCriteria[lang]}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </Section>

              {/* Cues */}
              <Section icon={Lightbulb} title={T.cues[lang]} color="#10b981">
                <ul className="space-y-1">
                  {skill.cues[lang].map((cue, i) => (
                    <li key={i} className="flex items-start gap-1.5 text-[10px]">
                      <div className="w-1 h-1 rounded-full bg-emerald-500 mt-1.5 shrink-0" />
                      <span className="text-foreground/85 leading-relaxed">{cue}</span>
                    </li>
                  ))}
                </ul>
              </Section>

              {/* Mistakes */}
              <Section icon={AlertCircle} title={T.mistakes[lang]} color="#dc2626">
                <ul className="space-y-1">
                  {skill.mistakes[lang].map((m, i) => (
                    <li key={i} className="flex items-start gap-1.5 text-[10px]">
                      <X className="w-2.5 h-2.5 text-rose-500 mt-0.5 shrink-0" />
                      <span className="text-foreground/85 leading-relaxed">{m}</span>
                    </li>
                  ))}
                </ul>
              </Section>

              {/* Pro tip */}
              <div
                className="rounded-lg p-2.5 border-l-2 bg-amber-500/5"
                style={{ borderLeftColor: '#f59e0b' }}
              >
                <div className="flex items-center gap-1.5 mb-1">
                  <Sparkles className="w-3 h-3 text-amber-500" />
                  <h5 className="text-[10px] font-semibold text-amber-600 dark:text-amber-400">{T.proTip[lang]}</h5>
                </div>
                <p className="text-[10px] text-foreground/85 leading-relaxed">
                  {skill.proTip[lang]}
                </p>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

/* ═══════════════════════════════════════════════════════════════════
 *  FOOD SECTION
 * ═══════════════════════════════════════════════════════════════════ */

function FoodSection({ lang, query }: { lang: 'ar' | 'de'; query: string }) {
  const [expanded, setExpanded] = useState<string | null>(null);
  const [filterGroup, setFilterGroup] = useState<FoodGroup | 'all'>('all');

  const filtered = useMemo(() => {
    return FOOD_ATLAS.filter((f) => {
      if (filterGroup !== 'all' && f.group !== filterGroup) return false;
      if (query) {
        const q = query.toLowerCase();
        return (
          f.name[lang].toLowerCase().includes(q) ||
          f.benefits[lang].some((b) => b.toLowerCase().includes(q))
        );
      }
      return true;
    });
  }, [filterGroup, query, lang]);

  const groups: (FoodGroup | 'all')[] = [
    'all', 'protein_animal', 'protein_plant',
    'carbs_complex', 'fats_healthy', 'micros_dense',
    'antioxidant', 'superfood', 'hydration',
  ];

  return (
    <div className="space-y-3">
      {/* Group filters */}
      <div className="flex gap-1 overflow-x-auto scrollbar-none -mx-3 px-3" dir="ltr">
        {groups.map((g) => {
          const active = filterGroup === g;
          return (
            <button
              key={g}
              onClick={() => setFilterGroup(g)}
              className={`shrink-0 h-6 px-2 rounded-full text-[10px] font-medium transition-all whitespace-nowrap ${
                active
                  ? 'bg-primary text-primary-foreground'
                  : 'bg-muted/40 text-muted-foreground hover:bg-muted/60'
              }`}
            >
              {g === 'all' ? T.filterAll[lang] : FOOD_GROUP_LABELS[g as FoodGroup][lang]}
            </button>
          );
        })}
      </div>

      {/* Food cards */}
      <div className="space-y-2">
        <AnimatePresence>
          {filtered.length === 0 ? (
            <div className="text-center py-8 text-[11px] text-muted-foreground">{T.noResults[lang]}</div>
          ) : (
            filtered.map((food) => (
              <FoodCard
                key={food.key}
                food={food}
                lang={lang}
                expanded={expanded === food.key}
                onToggle={() => setExpanded(expanded === food.key ? null : food.key)}
              />
            ))
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}

function FoodCard({
  food, lang, expanded, onToggle,
}: { food: FoodAtlasEntry; lang: 'ar' | 'de'; expanded: boolean; onToggle: () => void }) {
  const giLabel = food.glycemicIndex == null ? '—' :
    food.glycemicIndex <= 35 ? T.giLow[lang] :
    food.glycemicIndex <= 65 ? T.giMid[lang] :
    T.giHigh[lang];
  const giColor = food.glycemicIndex == null ? '#94a3b8' :
    food.glycemicIndex <= 35 ? '#10b981' :
    food.glycemicIndex <= 65 ? '#f59e0b' :
    '#ef4444';

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className="rounded-xl border border-border/40 overflow-hidden bg-card"
    >
      {/* Header */}
      <button
        onClick={onToggle}
        className="w-full p-3 flex items-center gap-3 active:bg-muted/30 transition-colors"
      >
        <div
          className="w-10 h-10 rounded-xl flex items-center justify-center text-xl shrink-0"
          style={{ backgroundColor: `${food.color}25`, border: `1px solid ${food.color}40` }}
        >
          {food.emoji}
        </div>
        <div className="flex-1 min-w-0 text-start">
          <h3 className="text-[12px] font-semibold text-foreground truncate">
            {food.name[lang]}
          </h3>
          <div className="flex items-center gap-2 mt-0.5">
            <span className="text-[9px] text-muted-foreground">
              {food.per100g.kcal} {T.kcal[lang]}
            </span>
            <span className="text-[9px] text-muted-foreground">·</span>
            <span className="text-[9px] text-muted-foreground">
              P {food.per100g.protein}g
            </span>
            {food.glycemicIndex != null && (
              <>
                <span className="text-[9px] text-muted-foreground">·</span>
                <span
                  className="text-[8.5px] font-semibold px-1 py-0.5 rounded"
                  style={{ backgroundColor: `${giColor}20`, color: giColor }}
                >
                  GI {food.glycemicIndex}
                </span>
              </>
            )}
          </div>
        </div>
        <motion.div animate={{ rotate: expanded ? 180 : 0 }} className="shrink-0">
          <ChevronDown className="w-4 h-4 text-muted-foreground" />
        </motion.div>
      </button>

      {/* Expanded */}
      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.3 }}
            className="overflow-hidden"
          >
            <div className="px-3 pb-3 space-y-3 border-t border-border/30 pt-3">
              {/* Macros */}
              <div className="grid grid-cols-4 gap-1.5">
                <MacroBox label={T.kcal[lang]} value={food.per100g.kcal} unit="" color="#a855f7" />
                <MacroBox label={T.protein[lang]} value={food.per100g.protein} unit="g" color="#3b82f6" />
                <MacroBox label={T.carbs[lang]} value={food.per100g.carbs} unit="g" color="#10b981" />
                <MacroBox label={T.fat[lang]} value={food.per100g.fat} unit="g" color="#f59e0b" />
              </div>

              {/* Optimal times */}
              <div className="flex flex-wrap gap-1">
                <Clock className="w-3 h-3 text-muted-foreground mt-0.5" />
                {food.optimalTimes.map((t, i) => (
                  <span
                    key={i}
                    className="text-[8.5px] px-1.5 py-0.5 rounded-full bg-cyan-500/10 text-cyan-700 dark:text-cyan-400 font-medium"
                  >
                    {MEAL_TIME_LABELS[t][lang]}
                  </span>
                ))}
              </div>

              {/* Benefits */}
              <Section icon={Heart} title={T.benefits[lang]} color={food.color}>
                <ul className="space-y-1">
                  {food.benefits[lang].map((b, i) => (
                    <li key={i} className="flex items-start gap-1.5 text-[10px]">
                      <div
                        className="w-1 h-1 rounded-full mt-1.5 shrink-0"
                        style={{ backgroundColor: food.color }}
                      />
                      <span className="text-foreground/85 leading-relaxed">{b}</span>
                    </li>
                  ))}
                </ul>
              </Section>

              {/* Key nutrients */}
              <div>
                <div className="flex items-center gap-1.5 mb-1.5">
                  <Zap className="w-3 h-3" style={{ color: food.color }} />
                  <h5 className="text-[10px] font-semibold text-foreground">{T.keyNutrients[lang]}</h5>
                </div>
                <div className="flex flex-wrap gap-1">
                  {food.keyNutrients[lang].map((n, i) => (
                    <span
                      key={i}
                      className="text-[8.5px] px-1.5 py-0.5 rounded-md font-medium"
                      style={{
                        backgroundColor: `${food.color}15`,
                        color: food.color,
                      }}
                    >
                      {n}
                    </span>
                  ))}
                </div>
              </div>

              {/* Pairing */}
              <div className="rounded-lg p-2.5 bg-emerald-500/5 border-l-2 border-emerald-500">
                <div className="flex items-center gap-1.5 mb-0.5">
                  <Sparkles className="w-3 h-3 text-emerald-500" />
                  <h5 className="text-[10px] font-semibold text-emerald-700 dark:text-emerald-400">{T.pairing[lang]}</h5>
                </div>
                <p className="text-[10px] text-foreground/85">{food.pairing[lang]}</p>
              </div>

              {/* Pitfall */}
              <div className="rounded-lg p-2.5 bg-rose-500/5 border-l-2 border-rose-500">
                <div className="flex items-center gap-1.5 mb-0.5">
                  <AlertCircle className="w-3 h-3 text-rose-500" />
                  <h5 className="text-[10px] font-semibold text-rose-700 dark:text-rose-400">{T.pitfall[lang]}</h5>
                </div>
                <p className="text-[10px] text-foreground/85">{food.pitfall[lang]}</p>
              </div>

              {/* Athlete tip */}
              <div className="rounded-lg p-2.5 bg-amber-500/5 border-l-2 border-amber-500">
                <div className="flex items-center gap-1.5 mb-0.5">
                  <Trophy className="w-3 h-3 text-amber-500" />
                  <h5 className="text-[10px] font-semibold text-amber-700 dark:text-amber-400">{T.athleteTip[lang]}</h5>
                </div>
                <p className="text-[10px] text-foreground/85">{food.athleteTip[lang]}</p>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

/* ═══════════════════════════════════════════════════════════════════
 *  WISDOM SECTION
 * ═══════════════════════════════════════════════════════════════════ */

const CATEGORY_ICONS: Record<EncyclopediaCategory, any> = {
  sleep: Moon, hormones: Activity, stress: Heart, mental: Brain,
  longevity: Sparkles, recovery: Zap, body_comp: Target, energy: Flame,
};

function WisdomSection({ lang, query }: { lang: 'ar' | 'de'; query: string }) {
  const [expanded, setExpanded] = useState<string | null>(null);
  const [filterCat, setFilterCat] = useState<EncyclopediaCategory | 'all'>('all');

  const filtered = useMemo(() => {
    return HEALTH_ENCYCLOPEDIA.filter((c) => {
      if (filterCat !== 'all' && c.category !== filterCat) return false;
      if (!query) return true;
      const q = query.toLowerCase();
      return (
        c.title[lang].toLowerCase().includes(q) ||
        c.description[lang].toLowerCase().includes(q) ||
        c.facts.some((f) => f.title[lang].toLowerCase().includes(q) || f.body[lang].toLowerCase().includes(q))
      );
    });
  }, [filterCat, query, lang]);

  const cats: (EncyclopediaCategory | 'all')[] = [
    'all', 'sleep', 'hormones', 'stress', 'mental',
    'recovery', 'body_comp', 'energy', 'longevity',
  ];

  return (
    <div className="space-y-3">
      {/* Category filter */}
      <div className="flex gap-1 overflow-x-auto scrollbar-none -mx-3 px-3" dir="ltr">
        {cats.map((c) => {
          const active = filterCat === c;
          const Icon = c === 'all' ? Filter : CATEGORY_ICONS[c as EncyclopediaCategory];
          return (
            <button
              key={c}
              onClick={() => setFilterCat(c)}
              className={`shrink-0 h-6 px-2 rounded-full text-[10px] font-medium transition-all flex items-center gap-1 ${
                active
                  ? 'bg-primary text-primary-foreground'
                  : 'bg-muted/40 text-muted-foreground hover:bg-muted/60'
              }`}
            >
              <Icon className="w-2.5 h-2.5" />
              {c === 'all' ? T.filterAll[lang] : CATEGORY_LABELS_ENC[c as EncyclopediaCategory][lang]}
            </button>
          );
        })}
      </div>

      {/* Chapters */}
      <div className="space-y-2">
        <AnimatePresence>
          {filtered.length === 0 ? (
            <div className="text-center py-8 text-[11px] text-muted-foreground">{T.noResults[lang]}</div>
          ) : (
            filtered.map((chapter) => {
              const isOpen = expanded === chapter.category;
              return (
                <motion.div
                  key={chapter.category}
                  layout
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="rounded-xl border border-border/40 overflow-hidden bg-card"
                >
                  <button
                    onClick={() => setExpanded(isOpen ? null : chapter.category)}
                    className="w-full p-3 flex items-center gap-3 active:bg-muted/30 transition-colors"
                  >
                    <div
                      className="w-10 h-10 rounded-xl flex items-center justify-center text-xl shrink-0"
                      style={{ backgroundColor: `${chapter.color}25`, border: `1px solid ${chapter.color}40` }}
                    >
                      {chapter.emoji}
                    </div>
                    <div className="flex-1 min-w-0 text-start">
                      <h3 className="text-[12px] font-semibold text-foreground truncate">
                        {chapter.title[lang]}
                      </h3>
                      <p className="text-[9px] text-muted-foreground line-clamp-1 mt-0.5">
                        {chapter.facts.length} {lang === 'ar' ? 'حقيقة' : 'Fakten'}
                      </p>
                    </div>
                    <motion.div animate={{ rotate: isOpen ? 180 : 0 }} className="shrink-0">
                      <ChevronDown className="w-4 h-4 text-muted-foreground" />
                    </motion.div>
                  </button>

                  <AnimatePresence>
                    {isOpen && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        className="overflow-hidden"
                      >
                        <div className="px-3 pb-3 space-y-2 border-t border-border/30 pt-3">
                          <p className="text-[10.5px] text-foreground/80 leading-relaxed mb-2">
                            {chapter.description[lang]}
                          </p>
                          {chapter.facts.map((fact, i) => (
                            <div
                              key={i}
                              className="rounded-lg p-2.5 bg-muted/20 border border-border/30 space-y-1.5"
                            >
                              <div className="flex items-start gap-2">
                                <div
                                  className="w-5 h-5 rounded-md flex items-center justify-center text-[9px] font-bold text-white shrink-0 mt-0.5"
                                  style={{ backgroundColor: chapter.color }}
                                >
                                  {i + 1}
                                </div>
                                <div className="flex-1 min-w-0">
                                  <h4 className="text-[11px] font-semibold text-foreground leading-snug">
                                    {fact.title[lang]}
                                  </h4>
                                </div>
                                <span
                                  className="text-[8.5px] font-bold px-1.5 py-0.5 rounded shrink-0"
                                  style={{
                                    backgroundColor: `${chapter.color}15`,
                                    color: chapter.color,
                                  }}
                                >
                                  {fact.impact[lang]}
                                </span>
                              </div>
                              <p className="text-[10px] text-foreground/85 leading-relaxed">
                                {fact.body[lang]}
                              </p>
                              <div className="flex items-start gap-1.5 pt-1 border-t border-border/30">
                                <Lightbulb className="w-3 h-3 text-amber-500 mt-0.5 shrink-0" />
                                <span className="text-[10px] text-foreground/85 leading-relaxed">
                                  <span className="font-semibold text-amber-600 dark:text-amber-400">
                                    {T.action[lang]}:
                                  </span>{' '}
                                  {fact.action[lang]}
                                </span>
                              </div>
                              {fact.myth && (
                                <div className="flex items-start gap-1.5 pt-1 border-t border-border/30">
                                  <X className="w-3 h-3 text-rose-500 mt-0.5 shrink-0" />
                                  <span className="text-[10px] text-foreground/85 leading-relaxed">
                                    <span className="font-semibold text-rose-600 dark:text-rose-400">
                                      {T.myth[lang]}:
                                    </span>{' '}
                                    {fact.myth[lang]}
                                  </span>
                                </div>
                              )}
                            </div>
                          ))}
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </motion.div>
              );
            })
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════
 *  Shared atoms
 * ═══════════════════════════════════════════════════════════════════ */

function Section({
  icon: Icon, title, color, children,
}: { icon: any; title: string; color: string; children: React.ReactNode }) {
  return (
    <div>
      <div className="flex items-center gap-1.5 mb-1.5">
        <Icon className="w-3 h-3" style={{ color }} />
        <h5 className="text-[10px] font-semibold text-foreground">{title}</h5>
      </div>
      {children}
    </div>
  );
}

function StatBox({
  icon: Icon, label, value, color,
}: { icon: any; label: string; value: string; color: string }) {
  return (
    <div className="rounded-lg p-2 bg-muted/20 border border-border/30">
      <div className="flex items-center gap-1 mb-0.5">
        <Icon className="w-2.5 h-2.5" style={{ color }} />
        <span className="text-[8.5px] text-muted-foreground font-medium uppercase tracking-wide">
          {label}
        </span>
      </div>
      <span className="text-[10px] font-semibold text-foreground line-clamp-1">{value}</span>
    </div>
  );
}

function MacroBox({
  label, value, unit, color,
}: { label: string; value: number; unit: string; color: string }) {
  return (
    <div
      className="rounded-lg p-1.5 text-center border"
      style={{
        backgroundColor: `${color}10`,
        borderColor: `${color}30`,
      }}
    >
      <div className="text-[10px] font-bold" style={{ color }}>
        {value}{unit}
      </div>
      <div className="text-[8px] text-muted-foreground uppercase tracking-wide">
        {label}
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════
 *  MAIN
 * ═══════════════════════════════════════════════════════════════════ */

export default function EncyclopediaTab() {
  const { language } = useApp();
  const lang = language as 'ar' | 'de';

  const [subTab, setSubTab] = useState<SubTab>('cali');
  const [query, setQuery] = useState('');

  return (
    <div className="space-y-3">
      {/* Sub-tab switcher */}
      <div
        className="bg-card border border-border/40 rounded-xl p-1 flex items-center gap-px"
        dir="ltr"
      >
        {SUB_TABS.map((t) => {
          const active = subTab === t.key;
          const Icon = t.icon;
          return (
            <button
              key={t.key}
              onClick={() => setSubTab(t.key)}
              className={`relative flex-1 h-8 flex items-center justify-center gap-1.5 rounded-lg transition-all ${
                active ? 'text-white' : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              {active && (
                <motion.div
                  layoutId="enc-subtab"
                  className="absolute inset-0 rounded-lg"
                  style={{ backgroundColor: t.color }}
                  transition={{ type: 'spring', stiffness: 500, damping: 35 }}
                />
              )}
              <span className="relative flex items-center gap-1.5">
                <Icon className="w-3 h-3" />
                <span className="text-[10px] font-semibold">{T[t.key][lang]}</span>
              </span>
            </button>
          );
        })}
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute top-1/2 -translate-y-1/2 start-2.5 w-3 h-3 text-muted-foreground pointer-events-none" />
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder={T.search[lang]}
          className="w-full h-8 ps-8 pe-7 rounded-lg bg-card border border-border/40 text-[11px] text-foreground placeholder:text-muted-foreground/60 focus:outline-none focus:border-primary/40 transition-colors"
        />
        {query && (
          <button
            onClick={() => setQuery('')}
            className="absolute top-1/2 -translate-y-1/2 end-2 w-4 h-4 rounded-full bg-muted/60 flex items-center justify-center"
          >
            <X className="w-2.5 h-2.5 text-muted-foreground" />
          </button>
        )}
      </div>

      {/* Content */}
      <AnimatePresence mode="wait">
        <motion.div
          key={subTab}
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -4 }}
          transition={{ duration: 0.2 }}
        >
          {subTab === 'cali' && <CalisthenicsSection lang={lang} query={query} />}
          {subTab === 'food' && <FoodSection lang={lang} query={query} />}
          {subTab === 'wisdom' && <WisdomSection lang={lang} query={query} />}
        </motion.div>
      </AnimatePresence>
    </div>
  );
}
