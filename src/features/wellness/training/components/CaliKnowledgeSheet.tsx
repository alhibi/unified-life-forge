/**
 * Knowledge sheet for a calisthenics skill — opens from the ladder header.
 */

import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { AlertCircle, Calendar, CheckCircle2, Lightbulb, Trophy, Wrench, X, Zap } from '@/lib/icons';
import { knowledgeFor } from '../caliKnowledge';
import { skillByKey } from '../caliSkillTree';

export interface CaliKnowledgeSheetProps {
  open: boolean;
  onClose: () => void;
  skillKey: string | null;
  lang: 'ar';
}

const T = {
  why: { ar: 'لماذا تتدرب على هذه المهارة', },
  prereq: { ar: 'متطلبات المرونة', },
  warmup: { ar: 'تسلسل الإحماء', },
  mistakes: { ar: 'أخطاء وحلول', },
  recovery: { ar: 'التعافي', },
  freq: { ar: 'التردد الأسبوعي', },
  programming: { ar: 'أسلوب البرمجة', },
  equipment: { ar: 'معدات مفيدة', },
  milestones: { ar: 'محطات', },
  fix: { ar: 'الحل', },
  ideal: { ar: 'مثالي', },
  range: { ar: 'النطاق', },
};

export default function CaliKnowledgeSheet({ open, onClose, skillKey, lang }: CaliKnowledgeSheetProps) {
  const skill = skillKey ? skillByKey(skillKey) : null;
  const card = skillKey ? knowledgeFor(skillKey) : null;
  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-drawer bg-black/60 flex items-end sm:items-center justify-center"
          onClick={onClose}
        >
          <motion.div
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={{ duration: 0.3 }}
            className="w-full sm:max-w-lg bg-background rounded-t-3xl sm:rounded-3xl max-h-[88vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex justify-center pt-3 pb-1">
              <div className="w-10 h-1 rounded-full bg-muted-foreground/30" />
            </div>

            <div className="px-4 pb-6 space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  {skill && <span className="text-2xl">{skill.emoji}</span>}
                  <div>
                    <h2 className="text-base font-bold text-foreground">{skill?.name[lang]}</h2>
                    {skill && <p className="text-[10px] text-muted-foreground">{skill.tagline[lang]}</p>}
                  </div>
                </div>
                <button onClick={onClose} className="w-8 h-8 rounded-full bg-muted flex items-center justify-center" aria-label="close">
                  <X className="w-4 h-4" />
                </button>
              </div>

              {!card ? (
                <p className="text-[12px] text-muted-foreground text-center py-8">
                  {'لا توجد معلومات بعد.'}
                </p>
              ) : (
                <>
                  {/* Why train it */}
                  <Section
                    icon={<Lightbulb className="w-3.5 h-3.5 text-amber-500" />}
                    title={T.why[lang]}
                    body={<p className="text-[12px] text-foreground/90 leading-relaxed">{card.whyTrainIt[lang]}</p>}
                  />

                  {/* Frequency */}
                  <Section
                    icon={<Calendar className="w-3.5 h-3.5 text-blue-500" />}
                    title={T.freq[lang]}
                    body={
                      <div className="grid grid-cols-3 gap-1.5">
                        <Mini label={'حد أدنى'} value={`${card.frequencyPerWeek.min}×`} />
                        <Mini label={T.ideal[lang]} value={`${card.frequencyPerWeek.ideal}×`} highlight />
                        <Mini label={'حد أقصى'} value={`${card.frequencyPerWeek.max}×`} />
                      </div>
                    }
                  />

                  {/* Prerequisites */}
                  <Section
                    icon={<CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />}
                    title={T.prereq[lang]}
                    body={
                      <ul className="space-y-1">
                        {card.mobilityPrereqs.map((s, i) => (
                          <li key={i} className="bg-card border border-border/40 rounded-lg p-2 text-[12px] text-foreground/90">
                            • {s[lang]}
                          </li>
                        ))}
                      </ul>
                    }
                  />

                  {/* Warmup */}
                  <Section
                    icon={<Zap className="w-3.5 h-3.5 text-orange-500" />}
                    title={T.warmup[lang]}
                    body={
                      <ol className="space-y-1">
                        {card.warmupSequence.map((s, i) => (
                          <li key={i} className="bg-card border border-border/40 rounded-lg p-2 text-[12px] text-foreground/90 flex items-start gap-2">
                            <span className="w-5 h-5 rounded-md bg-orange-500/20 text-orange-500 flex items-center justify-center shrink-0 text-[10px] font-bold">
                              {i + 1}
                            </span>
                            <span>{s[lang]}</span>
                          </li>
                        ))}
                      </ol>
                    }
                  />

                  {/* Top mistakes */}
                  <Section
                    icon={<AlertCircle className="w-3.5 h-3.5 text-rose-500" />}
                    title={T.mistakes[lang]}
                    body={
                      <ul className="space-y-1.5">
                        {card.topMistakes.map((m, i) => (
                          <li key={i} className="bg-card border border-rose-500/30 rounded-lg p-2 space-y-1">
                            <p className="text-[12px] font-semibold text-rose-500">⚠ {m.mistake[lang]}</p>
                            <p className="text-[11px] text-foreground/85">
                              <span className="font-semibold text-emerald-500">✓ {T.fix[lang]}: </span>
                              {m.fix[lang]}
                            </p>
                          </li>
                        ))}
                      </ul>
                    }
                  />

                  {/* Recovery + Programming */}
                  <Section
                    icon={<Wrench className="w-3.5 h-3.5 text-violet-500" />}
                    title={T.programming[lang]}
                    body={
                      <div className="space-y-1.5">
                        <p className="text-[12px] text-foreground/90 leading-relaxed">{card.programmingStyle[lang]}</p>
                        <p className="text-[11px] text-muted-foreground italic">{card.recoveryNotes[lang]}</p>
                      </div>
                    }
                  />

                  {/* Helpful equipment */}
                  {card.helpfulEquipment.length > 0 && (
                    <Section
                      title={T.equipment[lang]}
                      body={
                        <ul className="space-y-1">
                          {card.helpfulEquipment.map((s, i) => (
                            <li key={i} className="text-[11px] text-foreground/85">• {s[lang]}</li>
                          ))}
                        </ul>
                      }
                    />
                  )}

                  {/* Milestones */}
                  <Section
                    icon={<Trophy className="w-3.5 h-3.5 text-amber-500" />}
                    title={T.milestones[lang]}
                    body={
                      <ul className="space-y-1">
                        {card.milestones.map((s, i) => (
                          <li key={i} className="bg-amber-500/8 border border-amber-500/30 rounded-lg p-2 text-[12px] text-foreground/90">
                            🏆 {s[lang]}
                          </li>
                        ))}
                      </ul>
                    }
                  />
                </>
              )}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

function Section({ icon, title, body }: { icon?: React.ReactNode; title: string; body: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <h4 className="text-[11px] uppercase tracking-wider text-muted-foreground/70 font-semibold flex items-center gap-1.5">
        {icon} {title}
      </h4>
      {body}
    </div>
  );
}

function Mini({ label, value, highlight = false }: { label: string; value: string; highlight?: boolean }) {
  return (
    <div className={`rounded-lg p-1.5 text-center ${highlight ? 'bg-primary/15 border border-primary/30' : 'bg-muted/30'}`}>
      <p className="text-[10px] uppercase tracking-wider text-muted-foreground/70 font-semibold">{label}</p>
      <p className={`text-[14px] font-bold tabular-nums ${highlight ? 'text-primary' : 'text-foreground'}`}>{value}</p>
    </div>
  );
}
