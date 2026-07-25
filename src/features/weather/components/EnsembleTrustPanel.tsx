/**
 * EnsembleTrustPanel — makes the hybrid forecast auditable.
 *
 * The app queries up to six atmospheric models and blends them; the user has no
 * way to know that, nor how much the models disagreed, nor which one was thrown
 * out as an outlier. This panel states all of it plainly:
 *
 *   • how many sources answered, out of how many were asked,
 *   • how tightly they agreed (and what that means in plain Arabic),
 *   • which models formed the consensus and which were rejected,
 *   • the barometric tendency, with an explicit "still measuring" state
 *     instead of a fabricated "steady".
 *
 * A forecast UI that shows a single number with no provenance is asking to be
 * trusted blindly. This is the opposite of that.
 */
import { memo } from 'react';

import { AppCard } from '@/components/ui/app-shell';
import { Gauge, TrendingDown, TrendingUp } from '@/lib/icons';

import { confidenceLabel } from '../lib/vocabulary';
import type { SourceId } from '../types/SourceRegistry';
import { SOURCE_REGISTRY } from '../types/SourceRegistry';
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
  // `models_*` are plain strings on the snapshot (they cross the cache
  // boundary), so narrow through the registry rather than casting blindly.
  const isAtmospheric = (id: string) => sourceMeta(id)?.domain === 'atmosphere';
  const agreed = meta.models_in_agreement.filter(isAtmospheric);
  const outliers = meta.models_outlier.filter(isAtmospheric);

  const rising = pressure.tendency_direction === 'rising' || pressure.tendency_direction === 'rapidly_rising';
  const falling = pressure.tendency_direction === 'falling' || pressure.tendency_direction === 'rapidly_falling';
  const TendencyIcon = falling ? TrendingDown : TrendingUp;

  return (
    <AppCard as="section" aria-label="موثوقية التوقع">
      <header className="flex items-baseline justify-between gap-3">
        <h2 className="flex items-center gap-2 text-title font-semibold text-foreground">
          <Gauge className="h-5 w-5 text-muted-foreground" aria-hidden />
          موثوقية التوقع
        </h2>
        <p className="text-mini tabular-nums text-muted-foreground" dir="ltr">
          {meta.sources_responded}/{meta.sources_queried}
        </p>
      </header>

      {/* Confidence meter. Animated with scaleX, not width: animating width
          forces layout on every frame (design-system §8). */}
      <div className="mt-4">
        <div className="flex items-baseline justify-between gap-3">
          <span className="text-meta text-muted-foreground">{confidenceLabel(confidence)}</span>
          <span className="text-title font-semibold tabular-nums text-foreground" dir="ltr">
            {confidence}%
          </span>
        </div>
        <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-muted" dir="ltr">
          <div
            className="h-full origin-left rounded-full bg-primary transition-transform duration-slow ease-out-expo"
            style={{ transform: `scaleX(${confidence / 100})`, width: '100%' }}
            role="progressbar"
            aria-valuenow={confidence}
            aria-valuemin={0}
            aria-valuemax={100}
            aria-label="ثقة الإجماع بين النماذج"
          />
        </div>
      </div>

      <dl className="mt-4 grid grid-cols-2 gap-3">
        <div className="rounded-md border border-border p-3">
          <dt className="text-micro uppercase tracking-[0.14em] text-muted-foreground">تباعد النماذج</dt>
          <dd className="mt-1 text-body font-semibold tabular-nums text-foreground" dir="ltr">
            {meta.disagreement_score_percent}%
          </dd>
        </div>
        <div className="rounded-md border border-border p-3">
          <dt className="text-micro uppercase tracking-[0.14em] text-muted-foreground">اتجاه الضغط</dt>
          <dd className="mt-1 flex items-center gap-1.5 text-meta font-semibold text-foreground">
            {(rising || falling) && <TendencyIcon className="h-4 w-4 shrink-0" aria-hidden />}
            <span className="min-w-0 truncate">{pressure.tendency_label}</span>
          </dd>
          {pressure.tendency_hpa_per_3hr !== 0 && (
            <dd className="mt-0.5 text-mini tabular-nums text-muted-foreground" dir="ltr">
              {pressure.tendency_hpa_per_3hr > 0 ? '+' : ''}
              {pressure.tendency_hpa_per_3hr} hPa / 3h
            </dd>
          )}
        </div>
      </dl>

      {agreed.length > 0 && (
        <div className="mt-4">
          <p className="app-section-label mb-2">النماذج المساهمة</p>
          <ul className="flex flex-wrap gap-1.5">
            {agreed.map((id) => (
              <li
                key={id}
                className="rounded-sm border border-border px-2 py-1 text-micro font-medium text-foreground"
              >
                {sourceLabel(id)}
              </li>
            ))}
            {outliers.map((id) => (
              <li
                key={id}
                // Rejected by the Grubbs test for this refresh — shown, not
                // hidden, so a systematically odd model is visible to the user.
                className="rounded-sm border border-dashed border-border px-2 py-1 text-micro font-medium text-muted-foreground line-through"
                title="استُبعد كقيمة شاذة في هذا التحديث"
              >
                {sourceLabel(id)}
              </li>
            ))}
          </ul>
        </div>
      )}
    </AppCard>
  );
}

export const EnsembleTrustPanel = memo(EnsembleTrustPanelImpl);
export default EnsembleTrustPanel;
