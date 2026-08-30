// ============================================================================
// EnsembleTrustPanel — the audit trail of the ensemble: how many sources
// answered, how tightly they agreed, the barometric tendency, and which
// models formed the consensus vs. which were rejected as outliers.
//
// New design unifies the previous header / dl / source-list into one
// clean section card with gradient accents.
// ============================================================================

import { motion } from 'framer-motion';
import { memo } from 'react';

import { Gauge, TrendingDown, TrendingUp, Users } from '@/lib/icons';

import { confidenceLabel } from '../lib/vocabulary';
import { duration, easing } from '../lib/weather-motion';
import { SOURCE_REGISTRY, type SourceId } from '../types/SourceRegistry';
import type { WeatherSnapshot } from '../types/WeatherSnapshot';

interface Props {
  snapshot: WeatherSnapshot;
}

function sourceMeta(id: string) {
  return SOURCE_REGISTRY[id as SourceId] as (typeof SOURCE_REGISTRY)[SourceId] | undefined;
}

function sourceLabel(id: string): string {
  return sourceMeta(id)?.label ?? id;
}

function EnsembleTrustPanelImpl({ snapshot }: Props) {
  const { meta, pressure } = snapshot;
  const confidence = Math.max(0, Math.min(100, meta.ensemble_confidence_percent));
  const isAtmospheric = (id: string) => sourceMeta(id)?.domain === 'atmosphere';
  const agreed = meta.models_in_agreement.filter(isAtmospheric);
  const outliers = meta.models_outlier.filter(isAtmospheric);

  const rising = pressure.tendency_direction === 'rising' || pressure.tendency_direction === 'rapidly_rising';
  const falling = pressure.tendency_direction === 'falling' || pressure.tendency_direction === 'rapidly_falling';
  const TendencyIcon = falling ? TrendingDown : TrendingUp;

  return (
    <section className="rounded-2xl border border-border/40 surface-depth overflow-hidden">
      <span aria-hidden className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-primary/50 to-transparent" />
      <header className="px-6 pt-6 pb-3 flex items-end justify-between gap-3">
        <div>
          <h2 className="flex items-center gap-2 font-bold text-lead leading-tight text-foreground">
            <Gauge className="w-5 h-5 text-primary" aria-hidden />
            {'موثوقية الإجماع'}
          </h2>
          <p className="mt-1 text-mini text-foreground/65 leading-snug">
            {'كيف اتفقت النماذج، وأيها استُبعد كشاذ'}
          </p>
        </div>
        <span className="inline-flex items-center gap-1.5 text-[0.625rem] font-bold tracking-[0.18em] uppercase text-foreground/55">
          <Users className="w-3 h-3" aria-hidden />
          <span dir="ltr" className="tabular-nums">
            {meta.sources_responded}/{meta.sources_queried}
          </span>
        </span>
      </header>

      <div className="px-6 pb-6 space-y-5">
        {/* Confidence meter */}
        <div>
          <div className="flex items-baseline justify-between gap-3 mb-2">
            <span className="text-mini text-foreground/65 font-medium">{confidenceLabel(confidence)}</span>
            <span className="text-title font-extralight tracking-tight tabular-nums text-foreground" dir="ltr">
              {confidence}
              <span className="ms-1 text-mini font-bold text-foreground/55">٪</span>
            </span>
          </div>
          <div className="h-1.5 rounded-full bg-foreground/10 overflow-hidden" dir="ltr">
            <motion.div
              className="h-full origin-left rounded-full bg-gradient-to-r from-primary/60 via-primary to-primary"
              initial={{ scaleX: 0 }}
              animate={{ scaleX: confidence / 100 }}
              transition={{ duration: duration.reveal * 2.5, ease: easing.decelerate }}
            />
          </div>
        </div>

        {/* Disagreement + tendency */}
        <div className="grid grid-cols-2 gap-3">
          <div className="rounded-xl bg-background/40 border border-foreground/10 px-4 py-3">
            <p className="text-[0.625rem] font-bold tracking-[0.18em] uppercase text-foreground/55 mb-1.5">
              {'تباعد النماذج'}
            </p>
            <p className="text-lead font-extralight text-foreground tabular-nums leading-none" dir="ltr">
              {meta.disagreement_score_percent}
              <span className="ms-1 text-[0.625rem] font-bold text-foreground/55">٪</span>
            </p>
            <p className="mt-1 text-[0.625rem] text-foreground/55 leading-snug">
              {'كلما قل الرقم، زاد الاتفاق'}
            </p>
          </div>

          <div className="rounded-xl bg-background/40 border border-foreground/10 px-4 py-3">
            <p className="text-[0.625rem] font-bold tracking-[0.18em] uppercase text-foreground/55 mb-1.5">
              {'اتجاه الضغط'}
            </p>
            <p className="flex items-center gap-1.5 text-meta font-bold text-foreground leading-tight">
              {(rising || falling) && <TendencyIcon className="w-4 h-4 shrink-0 text-primary" aria-hidden />}
              <span className="min-w-0 truncate">{pressure.tendency_label}</span>
            </p>
            {pressure.tendency_hpa_per_3hr !== 0 && (
              <p className="mt-1 text-[0.625rem] text-foreground/55 tabular-nums leading-tight" dir="ltr">
                {pressure.tendency_hpa_per_3hr > 0 ? '+' : ''}
                {pressure.tendency_hpa_per_3hr} hPa / 3h
              </p>
            )}
          </div>
        </div>

        {/* Contributor chips */}
        {agreed.length > 0 && (
          <div>
            <p className="text-[0.625rem] font-bold tracking-[0.18em] uppercase text-foreground/55 mb-2.5">
              {'النماذج المساهمة'}
            </p>
            <ul className="flex flex-wrap gap-1.5">
              {agreed.map((id) => (
                <li
                  key={id}
                  className="rounded-md bg-primary/10 border border-primary/25 px-2.5 py-1 text-mini font-bold text-foreground"
                >
                  {sourceLabel(id)}
                </li>
              ))}
              {outliers.map((id) => (
                <li
                  key={id}
                  title="استُبعد كقيمة شاذة في هذا التحديث"
                  className="rounded-md bg-background/40 border border-dashed border-foreground/25 px-2.5 py-1 text-mini font-medium text-foreground/50 line-through"
                >
                  {sourceLabel(id)}
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </section>
  );
}

export const EnsembleTrustPanel = memo(EnsembleTrustPanelImpl);
export default EnsembleTrustPanel;