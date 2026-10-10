import { AnimatePresence,motion } from 'framer-motion';
import React, { useMemo, useState } from 'react';

import { AppCard } from '@/components/ui/app-shell';
import { Button } from '@/components/ui/button';
import { StateView } from '@/components/ui/state-view';
import { useApp } from '@/contexts/AppContext';
import { AlertTriangle, Check,ChevronDown, Sparkles, Utensils, Zap } from '@/lib/icons';

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
    <span className="text-micro ps-1 pe-2 py-0.5 rounded-full bg-muted/60 text-foreground/80 inline-flex items-center gap-1">
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
 *
 * System-unification pass: cards are <AppCard>, the no-match/empty block
 * is <StateView>, text actions are <Button>, and the per-button press
 * scaling / `active:bg-*` overrides were dropped (global press owns it).
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
          <h3 className="text-meta font-bold text-foreground flex items-center gap-1.5">
            <Sparkles className="w-4 h-4 text-primary" aria-hidden />
            {'مستشار التركيبات'}
          </h3>
          <p className="text-micro text-muted-foreground mt-0.5">
            {'اختر عناصرك واكتشف الفوائد المثبتة عند دمجها.'}
          </p>
        </div>
      </div>

      {/* Selected nutrients chip row */}
      <AppCard className="p-3 space-y-2">
        <div className="flex items-center justify-between">
          <p className="text-micro font-semibold text-muted-foreground-subtle uppercase tracking-wider">
            {'تركيبتك'} ({selected.length})
          </p>
          <div className="flex gap-2">
            {activeNutrients.length > 0 && (
              <Button
                variant="ghost"
                size="xs"
                className="text-primary"
                onClick={seedFromActive}
              >
                {'من مكملاتي'}
              </Button>
            )}
            {selected.length > 0 && (
              <Button
                variant="ghost"
                size="xs"
                className="text-muted-foreground"
                onClick={clear}
              >
                {'مسح'}
              </Button>
            )}
          </div>
        </div>

        {selected.length === 0 ? (
          <p className="text-mini text-muted-foreground-subtle py-2">
            {'لم تختر شيئاً بعد.'}
          </p>
        ) : (
          <div className="flex flex-wrap gap-1.5">
            {selected.map((k) => (
              <button
                key={k}
                onClick={() => toggle(k)}
                className="text-micro px-2 py-1 rounded-full bg-primary/15 border border-primary/40 text-primary flex items-center gap-1"
              >
                {NUTRIENTS[k]?.label[lang] ?? k}
                <span className="opacity-60">×</span>
              </button>
            ))}
          </div>
        )}

        <Button
          variant="secondary"
          size="sm"
          className="w-full mt-1"
          onClick={() => setPickerOpen((v) => !v)}
        >
          {'إضافة عنصر'}
          <ChevronDown
            className={`w-3.5 h-3.5 transition-transform ${pickerOpen ? 'rotate-180' : ''}`}
            aria-hidden
          />
        </Button>

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
                      aria-pressed={sel}
                      className={`text-micro px-2 py-1 rounded-full border transition-colors ${
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
      </AppCard>

      {/* Warnings */}
      {warnings.length > 0 && (
        <AppCard className="p-3 space-y-1.5 bg-destructive/5">
          <p className="text-micro font-bold text-destructive uppercase tracking-wider flex items-center gap-1">
            <AlertTriangle className="w-3.5 h-3.5" aria-hidden />
            {'تحذيرات تركيبة'}
          </p>
          {warnings.map((w) => (
            <p key={w.id} className="text-mini text-foreground/90 leading-relaxed">
              {w.message[lang]}
            </p>
          ))}
        </AppCard>
      )}

      {/* Matched synergies */}
      {selected.length >= 2 && matches.length === 0 && (
        <StateView
          kind="empty"
          title="لا توجد تركيبة معروفة بهذا المزيج بعد."
          body="جرّب إضافة فيتامين د، سي، أو مغنيسيوم."
        />
      )}

      <div className="space-y-2">
        {matches.map(({ syn, missing, ratio }) => {
          const isFull = ratio === 1;
          const isOpen = expandedId === syn.id;
          const domain = DOMAIN_META[syn.domain];
          return (
            <motion.div key={syn.id} layout>
              <AppCard className={`overflow-hidden ${isFull ? 'bg-primary/5' : ''}`}>
                <button
                  onClick={() => setExpandedId(isOpen ? null : syn.id)}
                  aria-expanded={isOpen}
                  className="w-full p-3.5 text-start flex items-start gap-3 transition-colors"
                >
                  <div className="w-9 h-9 rounded-lg bg-muted/40 flex items-center justify-center shrink-0 text-body">
                    {domain.icon}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <h4 className="text-mini font-bold text-foreground">
                        {syn.title[lang]}
                      </h4>
                      {isFull && (
                        <span className="text-micro font-bold px-1.5 py-0.5 rounded-full bg-primary text-primary-foreground flex items-center gap-0.5">
                          <Check className="w-2.5 h-2.5" aria-hidden />
                          {'مكتمل'}
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-1.5 mt-1 text-micro text-muted-foreground">
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
                    aria-hidden
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
                          <p className="text-micro font-bold text-muted-foreground-subtle uppercase tracking-wider mb-1.5 flex items-center gap-1">
                            <Zap className="w-3 h-3" aria-hidden />
                            {'الفوائد'}
                          </p>
                          <ul className="space-y-1">
                            {syn.benefits[lang].map((b, i) => (
                              <li
                                key={i}
                                className="text-mini text-foreground/90 leading-relaxed flex gap-2"
                              >
                                <span className="text-primary mt-1 shrink-0">●</span>
                                <span>{b}</span>
                              </li>
                            ))}
                          </ul>
                        </div>

                        {/* How-to */}
                        <div className="bg-muted/30 rounded-lg p-2.5">
                          <p className="text-micro font-bold text-muted-foreground-subtle uppercase tracking-wider mb-1">
                            {'الطريقة'}
                          </p>
                          <p className="text-mini text-foreground/90 leading-relaxed">
                            {syn.howTo[lang]}
                          </p>
                        </div>

                        {/* Missing nutrients to complete */}
                        {!isFull && (
                          <div>
                            <p className="text-micro font-bold text-warning uppercase tracking-wider mb-1.5">
                              {'لإكمال التركيبة أضف'}
                            </p>
                            <div className="flex flex-wrap gap-1.5">
                              {missing.map((k) => (
                                <button
                                  key={k}
                                  onClick={() => toggle(k)}
                                  className="text-micro px-2 py-1 rounded-full bg-warning/10 border border-warning/40 text-warning font-semibold"
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
                            <p className="text-micro font-bold text-muted-foreground-subtle uppercase tracking-wider mb-1.5 flex items-center gap-1">
                              <Utensils className="w-3 h-3" aria-hidden />
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
              </AppCard>
            </motion.div>
          );
        })}
      </div>

      {/* Recommended foods across all full matches */}
      {recommendedFoods.length > 0 && (
        <AppCard className="p-3.5">
          <p className="text-micro font-bold text-muted-foreground-subtle uppercase tracking-wider mb-2 flex items-center gap-1">
            <Utensils className="w-3 h-3" aria-hidden />
            {'أضف هذه إلى يومك'}
          </p>
          <div className="flex flex-wrap gap-1.5">
            {recommendedFoods.map((f) => (
              <FoodChip key={f.key} foodKey={f.key} label={f.label[lang]} />
            ))}
          </div>
        </AppCard>
      )}
    </div>
  );
}
