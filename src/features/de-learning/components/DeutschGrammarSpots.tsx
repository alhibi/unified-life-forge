import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { BookOpen, Sparkles, ChevronDown, CheckCircle } from '@/lib/icons';
import { GERMAN_GRAMMAR_SPOTS, GrammarSpot } from '../data/genzGermanData';

export const DeutschGrammarSpots: React.FC = () => {
  const [expandedSpotId, setExpandedSpotId] = useState<string | null>('gm-cases');

  return (
    <div className="space-y-6">
      <div className="text-end space-y-1">
        <div className="flex items-center gap-2 justify-end">
          <span className="px-2.5 py-0.5 rounded-full bg-teal-500/10 border border-teal-500/30 text-teal-400 font-tajawal text-micro font-bold uppercase tracking-wider flex items-center gap-1">
            <BookOpen className="h-3 w-3 text-teal-400" />
            أماكن القواعد الهامة
          </span>
        </div>
        <h3 className="font-amiri text-display font-bold text-foreground">
          جسور النحو الألماني المقارن مع العربية
        </h3>
        <p className="font-tajawal text-mini text-muted-foreground leading-relaxed">
          قواعد ألمانية جوهرية مشروحة بربط مباشر مع علوم النحو العربي (الإعراب، التكسير، ترتيب الكلام) لتبسيط الفهم 100%.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-4">
        {GERMAN_GRAMMAR_SPOTS.map((spot, idx) => {
          const isExpanded = expandedSpotId === spot.id;

          return (
            <motion.div
              key={spot.id}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.25, delay: idx * 0.05 }}
              onClick={() => setExpandedSpotId(isExpanded ? null : spot.id)}
              className={`rounded-2xl border p-5 transition-all cursor-pointer ${
                isExpanded
                  ? 'border-teal-500/40 bg-card shadow-md'
                  : 'border-border/40 bg-background/80 hover:border-border/80 hover:bg-card'
              }`}
            >
              <div className="flex items-center justify-between pb-3 border-b border-border/30">
                <span className="font-plex-mono text-micro text-teal-400 font-bold bg-teal-500/10 px-2.5 py-0.5 rounded uppercase">
                  {spot.title_de}
                </span>
                <h4 className="font-tajawal text-meta font-bold text-foreground text-end">
                  {spot.title_ar}
                </h4>
              </div>

              <p className="font-tajawal text-mini text-muted-foreground text-end leading-relaxed pt-3">
                {spot.summary_ar}
              </p>

              <div className="p-3.5 my-3 rounded-xl bg-teal-500/5 border border-teal-500/20 text-end space-y-1">
                <span className="block font-tajawal text-micro font-bold text-teal-400">
                  🔗 الجسر النحوي المقارن مع النحو العربي
                </span>
                <p className="font-amiri text-meta text-foreground/90 leading-relaxed">
                  {spot.contrastive_arabic_bridge}
                </p>
              </div>

              <AnimatePresence>
                {isExpanded && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    transition={{ duration: 0.25 }}
                    className="space-y-3 pt-2 text-end"
                    dir="rtl"
                  >
                    <div className="p-3 rounded-xl bg-secondary/30 text-center font-plex-mono font-extrabold text-teal-400 text-meta" dir="ltr">
                      {spot.german_formula_de}
                    </div>

                    <div className="space-y-2">
                      <span className="block font-tajawal text-micro font-bold text-muted-foreground">أمثلة تطبيقية مشروحة:</span>
                      {spot.examples.map((ex, exIdx) => (
                        <div key={exIdx} className="p-3 rounded-xl bg-background border border-border/40 space-y-1">
                          <p className="font-plex-mono font-extrabold text-foreground text-meta" dir="ltr">
                            {ex.german_de}
                          </p>
                          <p className="font-tajawal text-mini text-muted-foreground font-medium">
                            {ex.arabic_ar}
                          </p>
                          <p className="font-tajawal text-micro text-teal-400/90 italic">
                            💡 {ex.breakdown_ar}
                          </p>
                        </div>
                      ))}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              <div className="flex justify-center pt-2">
                <ChevronDown className={`h-3.5 w-3.5 text-muted-foreground transition-transform duration-300 ${isExpanded ? 'rotate-180 text-teal-400' : ''}`} />
              </div>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
};
