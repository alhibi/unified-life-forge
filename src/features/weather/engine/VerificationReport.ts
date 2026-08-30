// ============================================================================
// VerificationReport — turns the raw skill stats stored by the adaptive
// tracker into a structured report the UI can render.
//
// The tracker already produces a per-(cell, source, field) stat object via
// `skillReport()`. The report builds on top of that:
//
//   1. Read every (source, field) row for the current location cell.
//   2. Bucket sources by domain (atmosphere / air-quality / marine / radar).
//   3. Compute a trust verdict per field: verified / partial / unverified.
//   4. Return a flat row list the panel can iterate.
//
// We never mutate the tracker; we only read.
// ============================================================================

import { SOURCE_REGISTRY, type SourceId } from '../types/SourceRegistry';
import {
  cellKey,
  type SkillField,
  skillReport,
  type SourceSkillReport,
} from './ConsensusSkillTracker';

export type TrustLevel = 'verified' | 'partial' | 'unverified';

/** A per-source verdict the UI can render directly. */
export interface SourceTrust {
  sourceId: SourceId;
  label: string;
  domain: string;
  /** Number of (source, field) buckets the tracker knows about. */
  bucketsWithData: number;
  /** Sum of samples across all buckets for this source. */
  totalSamples: number;
  /** Mean absolute error, weighted by sample count, across fields. */
  weightedMae: number;
  /** Mean signed error, weighted by sample count, across fields. */
  weightedBias: number;
  /** Per-field breakdown so the panel can render one row per (source, field). */
  fields: FieldTrust[];
  /** Overall trust verdict — worst of all field verdicts. */
  trust: TrustLevel;
  /** Human-readable reason for the verdict (Arabic). */
  reason: string;
}

export interface FieldTrust {
  field: SkillField;
  mae: number;
  bias: number;
  samples: number;
  weightMultiplier: number;
  trust: TrustLevel;
  reason: string;
}

/** Tunable: how many samples a (source, field) pair needs before we trust it. */
const MIN_SAMPLES_TO_TRUST = 6;
/** What fraction of the field's natural scale is "excellent"? Below this, full trust. */
const EXCELLENT_MAE_RATIO = 0.5;
/** What fraction of the field's natural scale is "good"? Below this, partial trust. */
const ACCEPTABLE_MAE_RATIO = 1.0;

/** Field natural scales, in the field's own unit. */
const FIELD_SCALE: Record<SkillField, number> = {
  temperature: 1.6,
  humidity: 8,
  pressure: 1.4,
  wind: 6,
  cloud: 18,
};

function rankTrust(t: TrustLevel): number {
  return t === 'verified' ? 0 : t === 'partial' ? 1 : 2;
}

const TRUST_LABEL: Record<TrustLevel, string> = {
  verified: 'موثّق',
  partial: 'جزئي',
  unverified: 'غير موثّق',
};

export function trustLabel(t: TrustLevel): string {
  return TRUST_LABEL[t];
}

/** Trust verdict for one field. Pure: easy to test. */
export function judgeFieldTrust(
  field: SkillField,
  mae: number,
  samples: number,
): { trust: TrustLevel; reason: string } {
  if (samples < MIN_SAMPLES_TO_TRUST) {
    return { trust: 'unverified', reason: `عينات غير كافية (${samples}/${MIN_SAMPLES_TO_TRUST})` };
  }
  const scale = FIELD_SCALE[field];
  const ratio = mae / scale;
  if (ratio <= EXCELLENT_MAE_RATIO) {
    return { trust: 'verified', reason: `دقة ممتازة: متوسط الخطأ ${mae.toFixed(2)} وحدة` };
  }
  if (ratio <= ACCEPTABLE_MAE_RATIO) {
    return { trust: 'partial', reason: `دقة مقبولة: متوسط الخطأ ${mae.toFixed(2)} وحدة` };
  }
  return { trust: 'unverified', reason: `انحراف مرتفع: متوسط الخطأ ${mae.toFixed(2)} وحدة` };
}

/** Aggregate one source's row from a flat list of (source, field) entries. */
export function aggregateSourceTrust(
  sourceId: SourceId,
  rows: SourceSkillReport[],
): SourceTrust {
  const meta = SOURCE_REGISTRY[sourceId];
  const fields: FieldTrust[] = [];
  let weightedMaeNum = 0;
  let weightedBiasNum = 0;
  let weightedDen = 0;
  let totalSamples = 0;
  let worstTrust: TrustLevel = rows.length === 0 ? 'unverified' : 'verified';

  for (const field of Object.keys(FIELD_SCALE) as SkillField[]) {
    const row = rows.find((r) => r.sourceId === sourceId && r.field === field);
    if (!row) {
      fields.push({ field, mae: 0, bias: 0, samples: 0, weightMultiplier: 1, trust: 'unverified', reason: 'لا توجد عينات' });
      continue;
    }
    const judgement = judgeFieldTrust(field, row.mae, row.samples);
    fields.push({
      field,
      mae: row.mae,
      bias: row.bias,
      samples: row.samples,
      weightMultiplier: row.weightMultiplier,
      trust: judgement.trust,
      reason: judgement.reason,
    });
    weightedMaeNum += row.mae * row.samples;
    weightedBiasNum += row.bias * row.samples;
    weightedDen += row.samples;
    totalSamples += row.samples;
    if (rankTrust(worstTrust) < rankTrust(judgement.trust)) worstTrust = judgement.trust;
  }

  const weightedMae = weightedDen > 0 ? weightedMaeNum / weightedDen : 0;
  const weightedBias = weightedDen > 0 ? weightedBiasNum / weightedDen : 0;
  const trust = worstTrust;
  const reason = trust === 'verified'
    ? `${totalSamples} عينة موثّقة`
    : trust === 'partial'
      ? `${totalSamples} عينة لكن الانحراف يتجاوز العتبة`
      : totalSamples === 0
        ? 'لم يُسجَّل أي تنبؤ بعد'
        : `${totalSamples} عينة، غير كافية بعد`;

  return {
    sourceId,
    label: meta.label,
    domain: meta.domain,
    bucketsWithData: rows.filter((r) => r.sourceId === sourceId).length,
    totalSamples,
    weightedMae,
    weightedBias,
    fields,
    trust,
    reason,
  };
}

/**
 * Build the report for one location. Reads the live tracker store; pure
 * from the caller's perspective (the side effect lives inside skillReport).
 */
export function buildVerificationReport(
  lat: number,
  lng: number,
  sourceIds: SourceId[],
  rawRows?: SourceSkillReport[],
): SourceTrust[] {
  // Touch cellKey so the caller's location is part of the call site; the
  // actual rows come from the tracker or a test override.
  const cell = cellKey(lat, lng);
  void cell;
  const rows = rawRows ?? skillReport(lat, lng);
  return sourceIds.map((id) => aggregateSourceTrust(id, rows));
}