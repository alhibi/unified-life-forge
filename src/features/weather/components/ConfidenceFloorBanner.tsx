// ============================================================================
// ConfidenceFloorBanner — the UI surface that surfaces degraded/unreliable/
// failed states. Healthy snapshots render nothing.
//
// The banner is intentionally narrow and explicit:
//   • colour ring matches severity (success / warning / danger)
//   • icon — shield-check / shield-alert / shield-x
//   • label in Arabic — "القراءة موثوقة" / "...جزئية..." / "...ضعيفة..."
//   • list of reasons — tells the user *why* the floor tripped
//   • the snapshot's data age, if stale
//
// We never silence a degraded banner. Hiding it would defeat the entire
// purpose of the floor.
// ============================================================================

import { memo } from 'react';

import {
  AlertTriangle,
  ShieldAlert,
  ShieldCheck,
  ShieldX,
} from '@/lib/icons';

import {
  evaluateConfidenceFloor,
  type Severity,
  SEVERITY_BG,
  SEVERITY_LABEL_AR,
  SEVERITY_RING,
} from '../engine/ConfidenceFloor';
import type { WeatherSnapshot } from '../types/WeatherSnapshot';

interface Props {
  snapshot: WeatherSnapshot;
  /** When true, hide even the healthy banner (default false — healthy renders nothing anyway). */
  hideWhenHealthy?: boolean;
}

const ICON_BY_SEVERITY: Record<Severity, typeof ShieldCheck> = {
  healthy:    ShieldCheck,
  degraded:   ShieldAlert,
  unreliable: ShieldX,
  failed:     AlertTriangle,
};

function ConfidenceFloorBannerImpl({ snapshot, hideWhenHealthy = false }: Props) {
  const result = evaluateConfidenceFloor(snapshot);
  if (result.severity === 'healthy' && hideWhenHealthy) return null;
  if (result.severity === 'healthy') return null;
  if (result.isOk) return null;

  const Icon = ICON_BY_SEVERITY[result.severity];
  const ringClass = SEVERITY_RING[result.severity];

  return (
    <section
      role="status"
      aria-live="polite"
      className={`relative rounded-2xl surface-depth overflow-hidden p-4 ring-1 ${ringClass.split(' ')[0]} ${SEVERITY_BG[result.severity]}`}
    >
      <span aria-hidden className={`pointer-events-none absolute inset-x-0 top-0 h-px ${ringClass.split(' ')[1] ?? ''}`} />
      <header className="flex items-center gap-2 mb-2">
        <Icon className={`w-5 h-5 shrink-0 ${ringClass.split(' ')[1] ?? ''}`} aria-hidden />
        <h2 className="font-semibold text-title leading-none">
          {SEVERITY_LABEL_AR[result.severity]}
        </h2>
      </header>
      <ul className="text-body text-foreground/85 space-y-1.5 list-none">
        {result.reasons.map((r, i) => (
          <li key={i} className="flex items-start gap-2">
            <span aria-hidden className="mt-2 inline-block w-1.5 h-1.5 rounded-full bg-current shrink-0" />
            <span>{r}</span>
          </li>
        ))}
      </ul>
      {snapshot.meta.is_stale && snapshot.meta.data_age_minutes > 0 && (
        <p className="text-mini text-muted-foreground mt-2 tabular-nums">
          {'عمر البيانات: '}{Math.round(snapshot.meta.data_age_minutes)}{' دقيقة'}
        </p>
      )}
    </section>
  );
}

export const ConfidenceFloorBanner = memo(ConfidenceFloorBannerImpl);