import { AnimatePresence,motion } from 'framer-motion';
import React, { useMemo, useState } from 'react';

import { useApp } from '@/contexts/AppContext';
import { AlertTriangle, Check,ChevronDown, FlaskConical, Sparkles, Utensils, Zap } from '@/lib/icons';

import { FoodIcon } from './foodIcons';
import {
  DOMAIN_META,
  EVIDENCE_LABEL,
  FOODS,
  INTERACTIONS,
  type Lang,
  NUTRIENT_LIST,
  NUTRIENTS,
  SYNERGIES,
} from './wellnessData';
import type { Supplement } from './wellnessDb';

function FoodChip({ foodKey, label }: { foodKey: string; label: string }) {
  return (
    <span className="text-[0.6875rem] ps-1 pe-2 py-0.5 rounded-full bg-muted/60 text-foreground/80 inline-flex items-center gap-1">
      <FoodIcon foodKey={foodKey} size={16} shape="rounded-full" />
      {label}
    </span>
  );
}

interface Props {
  supplements: Supplement[];
}

/**
 * Interactive stack picker. Lets the user select 2+ nutrients (or seed from
 * their active supplements) and see concrete benefits, warnings, timing
 * advice, and food boosters — all from the offline knowledge base.
 */
export default function StackAdvisor({ supplements }: Props) {
  const { language } = useApp();
  const lang = language as Lang;

  const activeNutrients = useMemo(() => {
    const set = new Set<string>();
    for (const s of supplements.filter((x) => x.active)) {
      for (const n of s.nutrientKeys) set.add(n);
    }
    return Array.from(set);
  }, [supplements]);

  const [selected, setSelected] = useState<string[]>(activeNutrients.slice(0, 4));
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [pickerOpen, setPickerOpen] = useState(false);

  const toggle = (k: string) =>
    setSelected((prev) =>
      prev.includes(k) ? prev.filter((x) => x !== k) : [...prev, k],
    );

  const seedFromActive = () => setSelected(activeNutrients);
  const clear = () => setSelected([]);

  // Match synergies — full + partial
  const matches = useMemo(() => {
    const sel = new Set(selected);
    return SYNERGIES.map((syn) => {
      const have = syn.nutrients.filter((n) => sel.has(n));
      const ratio = have.length / syn.nutrients.length;
      return { syn, have, missing: syn.nutrients.filter((n) => !sel.has(n)), ratio };
    })
      .filter((m) => m.ratio >= 0.5)
      .sort((a, b) => b.ratio - a.ratio);
  }, [selected]);

  const warnings = useMemo(() => {
    const sel = new Set(selected);
    return INTERACTIONS.filter(
      (r) => sel.has(r.pair[0]) && sel.has(r.pair[1]) && r.severity === 'warn',
    );
  }, [selected]);

  // Food boosters that touch the most synergies
  const recommendedFoods = useMemo(() => {
    const count: Record<string, number> = {};
    for (const m of matches) {
      if (m.ratio < 1) continue;
      for (const f of m.syn.foodBoosters ?? []) {
        count[f] = (count[f] ?? 0) + 1;
      }
    }
    return Object.entries(count)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 6)
      .map(([k]) => FOODS[k])
      .filter(Boolean);
  }, [matches]);

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-[0.9375rem] font-bold text-foreground flex items-center gap-1.5">
            <Sparkles className="w-4 h-4 text-primary" />
            {'مستشار التركيبات'}
          </h3>
          <p className="text-[0.6875rem] text-muted-foreground mt-0.5">
            {'اختر عناصرك واكتشف الفوائد المثبتة عند دمجها.'}
          </p>
        </div>
      </div>

      {/* Selected nutrients chip row */}
      <div className="bg-card border border-border/40 rounded-2xl p-3 space-y-2">
        <div className="flex items-center justify-between">
          <p className="text-[0.6875rem] font-semibold text-muted-foreground/70 uppercase tracking-wider">
            {'تركيبتك'} ({selected.length})
          </p>
          <div className="flex gap-2">
            {activeNutrients.length > 0 && (
              <button
                onClick={seedFromActive}
                className="text-[0.6875rem] font-semibold text-primary active:scale-95 transition-transform"
              >
                {'من مكملاتي'}
              </button>
            )}
            {selected.length > 0 && (
              <button
                onClick={clear}
                className="text-[0.6875rem] font-semibold text-muted-foreground active:scale-95 transition-transform"
              >
                {'مسح'}
              </button>
            )}
          </div>
        </div>

        {selected.length === 0 ? (
          <p className="text-[0.75rem] text-muted-foreground/70 py-2">
            {'لم تختر شيئاً بعد.'}
          </p>
        ) : (
          <div className="flex flex-wrap gap-1.5">
            {selected.map((k) => (
              <button
                key={k}
                onClick={() => toggle(k)}
                className="text-[0.6875rem] px-2 py-1 rounded-full bg-primary/15 border border-primary/40 text-primary flex items-center gap-1"
              >
                {NUTRIENTS[k]?.label[lang] ?? k}
                <span className="opacity-60">×</span>
              </button>
            ))}
          </div>
        )}

        <button
          onClick={() => setPickerOpen((v) => !v)}
          className="w-full mt-1 py-2 rounded-xl bg-muted/40 text-[0.75rem] font-semibold text-foreground flex items-center justify-center gap-1.5 active:scale-[0.98] transition-transform"
        >
          {'إضافة عنصر'}
          <ChevronDown
            className={`w-3.5 h-3.5 transition-transform ${pickerOpen ? 'rotate-180' : ''}`}
          />
        </button>

        <AnimatePresence>
          {pickerOpen && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.22 }}
              className="overflow-hidden"
            >
              <div className="flex flex-wrap gap-1.5 pt-2 max-h-44 overflow-y-auto">
                {NUTRIENT_LIST.map((n) => {
                  const sel = selected.includes(n.key);
                  return (
                    <button
                      key={n.key}
                      onClick={() => toggle(n.key)}
                      className={`text-[0.6875rem] px-2 py-1 rounded-full border transition-colors ${
                        sel
                          ? 'bg-primary/15 border-primary/40 text-primary'
                          : 'bg-muted/40 border-border/40 text-muted-foreground'
                      }`}
                    >
                      {n.label[lang]}
                    </button>
                  );
                })}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Warnings */}
      {warnings.length > 0 && (
        <div className="bg-destructive/5 border border-destructive/30 rounded-2xl p-3 space-y-1.5">
          <p className="text-[0.6875rem] font-bold text-destructive uppercase tracking-wider flex items-center gap-1">
            <AlertTriangle className="w-3.5 h-3.5" />
            {'تحذيرات تركيبة'}
          </p>
          {warnings.map((w) => (
            <p key={w.id} className="text-[0.75rem] text-foreground/90 leading-relaxed">
              {w.message[lang]}
            </p>
          ))}
        </div>
      )}

      {/* Matched synergies */}
      {selected.length >= 2 && matches.length === 0 && (
        <div className="bg-card border border-dashed border-border/50 rounded-2xl p-5 text-center">
          <FlaskConical className="w-8 h-8 text-muted-foreground/30 mx-auto mb-2" />
          <p className="text-[0.75rem] text-muted-foreground">
            {'لا توجد تركيبة معروفة بهذا المزيج بعد. جرّب إضافة فيتامين د، سي، أو مغنيسيوم.'}
          </p>
        </div>
      )}

      <div className="space-y-2">
        {matches.map(({ syn, missing, ratio }) => {
          const isFull = ratio === 1;
          const isOpen = expandedId === syn.id;
          const domain = DOMAIN_META[syn.domain];
          return (
            <motion.div
              key={syn.id}
              layout
              className={`rounded-2xl border overflow-hidden ${
                isFull
                  ? 'bg-primary/5 border-primary/30'
                  : 'bg-card border-border/40'
              }`}
            >
              <button
                onClick={() => setExpandedId(isOpen ? null : syn.id)}
                className="w-full p-3.5 text-start flex items-start gap-3 active:bg-muted/30 transition-colors"
              >
                <div className="w-9 h-9 rounded-xl bg-card border border-border/40 flex items-center justify-center shrink-0 text-base">
                  {domain.icon}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <h4 className="text-[0.8125rem] font-bold text-foreground">
                      {syn.title[lang]}
                    </h4>
                    {isFull && (
                      <span className="text-[0.625rem] font-bold px-1.5 py-0.5 rounded-full bg-primary text-primary-foreground flex items-center gap-0.5">
                        <Check className="w-2.5 h-2.5" />
                        {'مكتمل'}
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-1.5 mt-1 text-[0.625rem] text-muted-foreground">
                    <span className="px-1.5 py-0.5 rounded-full bg-muted/60">
                      {domain.label[lang]}
                    </span>
                    <span className="px-1.5 py-0.5 rounded-full bg-muted/60">
                      {EVIDENCE_LABEL[syn.evidence][lang]}
                    </span>
                    {!isFull && (
                      <span className="text-warning font-semibold">
                        {`ينقص ${missing.length}`}
                      </span>
                    )}
                  </div>
                </div>
                <ChevronDown
                  className={`w-4 h-4 text-muted-foreground shrink-0 mt-1.5 transition-transform ${
                    isOpen ? 'rotate-180' : ''
                  }`}
                />
              </button>

              <AnimatePresence initial={false}>
                {isOpen && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.22 }}
                    className="overflow-hidden"
                  >
                    <div className="px-3.5 pb-3.5 space-y-3 border-t border-border/30 pt-3">
                      {/* Benefits */}
                      <div>
                        <p className="text-[0.625rem] font-bold text-muted-foreground/70 uppercase tracking-wider mb-1.5 flex items-center gap-1">
                          <Zap className="w-3 h-3" />
                          {'الفوائد'}
                        </p>
                        <ul className="space-y-1">
                          {syn.benefits[lang].map((b, i) => (
                            <li
                              key={i}
                              className="text-[0.75rem] text-foreground/90 leading-relaxed flex gap-2"
                            >
                              <span className="text-primary mt-1 shrink-0">●</span>
                              <span>{b}</span>
                            </li>
                          ))}
                        </ul>
                      </div>

                      {/* How-to */}
                      <div className="bg-muted/30 rounded-xl p-2.5">
                        <p className="text-[0.625rem] font-bold text-muted-foreground/70 uppercase tracking-wider mb-1">
                          {'الطريقة'}
                        </p>
                        <p className="text-[0.75rem] text-foreground/90 leading-relaxed">
                          {syn.howTo[lang]}
                        </p>
                      </div>

                      {/* Missing nutrients to complete */}
                      {!isFull && (
                        <div>
                          <p className="text-[0.625rem] font-bold text-warning uppercase tracking-wider mb-1.5">
                            {'لإكمال التركيبة أضف'}
                          </p>
                          <div className="flex flex-wrap gap-1.5">
                            {missing.map((k) => (
                              <button
                                key={k}
                                onClick={() => toggle(k)}
                                className="text-[0.6875rem] px-2 py-1 rounded-full bg-warning/10 border border-warning/40 text-warning font-semibold"
                              >
                                + {NUTRIENTS[k]?.label[lang] ?? k}
                              </button>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Food boosters */}
                      {syn.foodBoosters && syn.foodBoosters.length > 0 && (
                        <div>
                          <p className="text-[0.625rem] font-bold text-muted-foreground/70 uppercase tracking-wider mb-1.5 flex items-center gap-1">
                            <Utensils className="w-3 h-3" />
                            {'أطعمة تعزز'}
                          </p>
                          <div className="flex flex-wrap gap-1.5">
                            {syn.foodBoosters.map((fk) => {
                              const f = FOODS[fk];
                              if (!f) return null;
                              return (
                                <FoodChip key={fk} foodKey={fk} label={f.label[lang]} />
                              );
                            })}
                          </div>
                        </div>
                      )}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          );
        })}
      </div>

      {/* Recommended foods across all full matches */}
      {recommendedFoods.length > 0 && (
        <div className="bg-card border border-border/40 rounded-2xl p-3.5">
          <p className="text-[0.6875rem] font-bold text-muted-foreground/70 uppercase tracking-wider mb-2 flex items-center gap-1">
            <Utensils className="w-3 h-3" />
            {'أضف هذه إلى يومك'}
          </p>
          <div className="flex flex-wrap gap-1.5">
            {recommendedFoods.map((f) => (
              <FoodChip key={f.key} foodKey={f.key} label={f.label[lang]} />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
