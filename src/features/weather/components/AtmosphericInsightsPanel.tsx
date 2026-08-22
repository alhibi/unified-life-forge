/**
 * AtmosphericInsightsPanel — the atmosphere explaining itself.
 *
 * Renders the reasoner's conclusions as ranked inference cards: headline,
 * physical mechanism, and a confidence chip. Cards animate in staggered;
 * the panel is honest about silence — if physics has nothing notable to
 * say, it says exactly that instead of padding with fluff.
 */
import { motion } from 'framer-motion';
import { memo, useMemo } from 'react';

import { Brain } from '@/lib/icons';

import {
  deriveAtmosphericInsights,
  type Inference,
} from '../compute/AtmosphericReasoner';
import type { WeatherSnapshot } from '../types/WeatherSnapshot';

interface Props {
  snapshot: WeatherSnapshot;
}

const CONFIDENCE_STYLE: Record<
  Inference['confidence'],
  { dot: string; label: string; text: string }
> = {
  high: { dot: 'bg-emerald-500', label: 'استنتاج مؤكد فيزيائياً', text: 'text-emerald-400' },
  medium: { dot: 'bg-sky-500', label: 'مؤشرات قوية', text: 'text-sky-400' },
  low: { dot: 'bg-amber-500', label: 'قراءة أولية', text: 'text-amber-400' },
};

function AtmosphericInsightsPanelImpl({ snapshot }: Props) {
  const insights = useMemo(() => deriveAtmosphericInsights(snapshot), [snapshot]);

  // Rank: high confidence first, then medium, then low.
  const ranked = useMemo(() => {
    const order = { high: 0, medium: 1, low: 2 } as const;
    return [...insights].sort((a, b) => order[a.confidence] - order[b.confidence]);
  }, [insights]);

  return (
    <section
      className="relative rounded-2xl surface-depth overflow-hidden"
      aria-label="استنتاجات الغلاف الجوي"
    >
      <span aria-hidden className="pointer-events-none absolute inset-x-0 top-0 h-px bg-primary/40" />
      <header className="px-4 pt-4 pb-3 flex items-end justify-between gap-3">
        <div>
          <h2 className="flex items-center gap-2 font-semibold text-lead leading-none text-foreground">
            <Brain className="w-4 h-4 text-primary" aria-hidden />
            {'ماذا يحدث في الغلاف الجوي الآن'}
          </h2>
          <p className="mt-1.5 text-micro text-muted-foreground">
            {'استنتاجات مبنية على الفيزياء الجوية من قراءات هذه اللحظة — ليست توقعات، بل فهم'}
          </p>
        </div>
      </header>

      <div className="px-4 pb-4 space-y-2.5">
        {ranked.length === 0 ? (
          <p className="text-mini text-muted-foreground italic py-3 px-3 rounded-xl bg-muted/20 border border-border/30">
            {'الغلاف مستقر حالياً — لا أنماط جوية تستحق التنبيه خلال الساعات القادمة.'}
          </p>
        ) : (
          ranked.map((inf, i) => {
            const conf = CONFIDENCE_STYLE[inf.confidence];
            return (
              <motion.article
                key={inf.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.06, duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
                className="rounded-xl border border-border/40 bg-background/30 p-3.5 space-y-1.5"
              >
                <div className="flex items-start justify-between gap-3">
                  <h3 className="text-meta font-bold text-foreground leading-snug">
                    {inf.headlineAr}
                  </h3>
                  <span
                    className={`shrink-0 inline-flex items-center gap-1.5 mt-0.5 ${conf.text}`}
                    title={conf.label}
                  >
                    <span className={`w-1.5 h-1.5 rounded-full ${conf.dot}`} />
                    <span className="text-micro font-bold">{conf.label}</span>
                  </span>
                </div>
                <p className="text-micro leading-relaxed text-muted-foreground">
                  {inf.mechanismAr}
                </p>
              </motion.article>
            );
          })
        )}
      </div>
    </section>
  );
}

export const AtmosphericInsightsPanel = memo(AtmosphericInsightsPanelImpl);
