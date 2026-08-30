// ============================================================================
// SourceVerifier — adapts the verified-skill stream into the existing
// ConsensusSkillTracker API. The tracker accepts `Observation` objects shaped
// like {sourceId, field, memberValue, consensusValue}; this module produces
// them from `VerifiedSkill` entries by treating the *observation* as the
// ground-truth consensus reference.
//
// INVARIANTS
//   • Never overwrites tracker data — only appends. The existing EWMA absorbs
//     new evidence gracefully.
//   • Only emits when we have ≥ MIN_SAMPLES verified observations in this
//     session; the tracker's MIN_SAMPLES (6) then gates the correction.
//   • Respects MAX_BIAS per field — anything outside that range is almost
//     certainly a unit bug, not a real bias.
//   • Stays a no-op when verification data is unavailable (private mode,
//     fresh install, etc.) so the rest of the pipeline is unchanged.
// ============================================================================

import { recordObservations, type Observation, type SkillField } from './ConsensusSkillTracker';
import type { VerifiedSkill } from './ForecastVerification';

const MIN_SAMPLES_TO_EMIT = 3;

/**
 * Map `VerifiedSkill.field` to the tracker's narrower `SkillField` union. Both
 * share the same name space, so the cast is safe — verification only ever
 * touches the five tracked fields.
 */
function toSkillField(field: VerifiedSkill['field']): SkillField {
  return field as SkillField;
}

/**
 * Convert verified skill batches into tracker observations. Each batch entry
 * becomes one `Observation` whose `memberValue` is the forecast and whose
 * `consensusValue` is the actual reading. The sign convention is preserved:
 * the tracker's existing math treats `memberValue - consensusValue` as the
 * bias, so a forecast that's 1.5 °C too warm produces a +1.5 bias exactly as
 * the previous member-vs-consensus path would have.
 *
 * Batches with fewer than MIN_SAMPLES_TO_EMIT samples are dropped — we would
 * rather have no signal than a noisy one.
 */
export function feedVerifiedSkill(verified: VerifiedSkill[]): Observation[] {
  const out: Observation[] = [];
  if (verified.length === 0) return out;
  // Group by (sourceId, field) so we can apply MIN_SAMPLES_TO_EMIT at the
  // batch level rather than per call site.
  type Group = { sourceId: VerifiedSkill['sourceId']; field: VerifiedSkill['field']; samples: number; error: number };
  const groups = new Map<string, Group>();
  for (const v of verified) {
    const key = `${v.sourceId}|${v.field}`;
    const g = groups.get(key);
    if (g) {
      g.error += v.error * v.samples;
      g.samples += v.samples;
    } else {
      groups.set(key, { sourceId: v.sourceId, field: v.field, samples: v.samples, error: v.error * v.samples });
    }
  }
  for (const g of groups.values()) {
    if (g.samples < MIN_SAMPLES_TO_EMIT) continue;
    const meanError = g.error / g.samples;
    out.push({
      sourceId: g.sourceId,
      field: toSkillField(g.field),
      memberValue: meanError,        // forecast − observed, signed
      consensusValue: 0,             // unused by the tracker for observation folding
    });
  }
  return out;
}

/**
 * One-shot helper called by the engine after a successful pipeline run.
 * Sub-set of the engine surface: pass the verified batch, get tracker updates.
 */
export function recordVerifiedSkill(verified: VerifiedSkill[], lat: number, lng: number): void {
  const obs = feedVerifiedSkill(verified);
  if (obs.length === 0) return;
  recordObservations(lat, lng, obs);
}