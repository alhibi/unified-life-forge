/**
 * ForecastEnsemble — blends the hourly and daily series of every responding
 * source into one calibrated forecast.
 *
 * THIS IS THE FILE THAT MAKES THE APP "MULTI-SOURCE". Before it existed, the
 * engine queried six atmospheric models and then merged their forecasts like
 * this:
 *
 *     if (f.hourly?.length && merged.hourly.length === 0) merged.hourly = f.hourly;
 *
 * i.e. whichever adapter's promise settled first won outright, and the other
 * five forecasts were discarded. The current-conditions snapshot was properly
 * ensembled, so the app showed a consensus "now" followed by a single-model
 * "next 48 hours" — and which model that was changed between refreshes
 * depending on network jitter. That is the worst of both worlds: no accuracy
 * gain, plus visible flip-flopping.
 *
 * How the blend works
 * -------------------
 * Members are aligned on the hour (daily: on the local date), then each field
 * is combined with the treatment appropriate to its statistical nature:
 *
 *   • Continuous, roughly Gaussian (temperature, apparent temperature,
 *     humidity, pressure, cloud, UV, wind speed) → weighted mean with Grubbs
 *     outlier rejection, after per-source bias correction.
 *   • Directional (wind direction) → circular vector mean. A linear mean is
 *     simply wrong here; see CircularStats.ts.
 *   • Skewed / intermittent (precipitation amount) → weighted median. The
 *     mean of {0, 0, 0, 12 mm} is 3 mm, which is a rainfall total no member
 *     forecast; the median is 0 and correctly reads "most models say dry".
 *   • Probabilistic (precipitation probability) → a blend of the members'
 *     stated probabilities and the *fraction of members that forecast
 *     measurable rain at all*. Ensemble agreement is the more honest signal
 *     when models disagree about whether an event happens; each member's own
 *     probability is the better signal for intensity-conditioned risk. We use
 *     both.
 *   • Categorical (weather code) → weight-weighted mode, tie-broken toward the
 *     more severe condition. Under-warning is worse than over-warning.
 *
 * Every blended entry also carries:
 *   • `confidence_percent` — derived from real member spread (not a constant),
 *     attenuated by forecast horizon.
 *   • the member envelope (`*_min` / `*_max`) so the chart can draw the
 *     uncertainty band instead of pretending a single line is the truth.
 *   • `sources_count` — how many models actually voted on that hour.
 */
import { severityForWeatherCode } from '../lib/conditions';
import type { DailyEntry, ForecastLayers, HourlyEntry } from '../types/ForecastLayer';
import type { AdapterResponse, SourceId } from '../types/SourceRegistry';
import { SOURCE_REGISTRY } from '../types/SourceRegistry';
import { circularMean } from './CircularStats';
import { biasCorrection, type SkillField, weightMultiplier } from './ConsensusSkillTracker';
import { aggregate, type NumericSample, weightedMedian } from './EnsembleAggregator';

const HOUR_MS = 3_600_000;
/** Hourly horizon we publish. Beyond this, members diverge too much to be useful hour-by-hour. */
const MAX_HOURLY_HOURS = 48;
const MAX_DAILY_DAYS = 14;
/** Below this, an "hour" backed by a single member is dropped from the blend tail. */
const MIN_MEMBERS_FOR_TAIL = 1;
/** mm in an hour that counts as "measurable rain" for the agreement fraction. */
const MEASURABLE_MM = 0.1;
/** Share of the probability that comes from member agreement vs stated probability. */
const AGREEMENT_SHARE = 0.35;

export interface EnsembleContext {
  lat: number;
  lng: number;
}

/** Per-entry ensemble metadata attached to blended hourly/daily entries. */
export interface EnsembleMeta {
  sources_count: number;
  temperature_min_c?: number;
  temperature_max_c?: number;
  spread_c?: number;
}

export type BlendedHourlyEntry = HourlyEntry & EnsembleMeta;
export type BlendedDailyEntry = DailyEntry & EnsembleMeta;

interface Member<T> {
  sourceId: SourceId;
  prior: number;
  entries: T[];
}

/* ── helpers ───────────────────────────────────────────────────────── */

function priorWeight(sourceId: SourceId): number {
  const meta = SOURCE_REGISTRY[sourceId];
  // Domain-specialist sources carry weight 1.0 for their own domain but must
  // not out-vote the atmospheric models on temperature. Only atmospheric
  // members participate in the forecast blend.
  if (!meta || meta.domain !== 'atmosphere') return 0;
  return meta.weight;
}

function floorToHour(unix: number): number {
  return Math.floor(unix / HOUR_MS) * HOUR_MS;
}

/** Local calendar day key — daily entries must not be bucketed in UTC. */
function dayKey(unix: number): string {
  const d = new Date(unix);
  return `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
}

/**
 * Confidence attenuation by lead time. Anchored on published skill decay of
 * deterministic NWP: near-perfect in the nowcast window, ~55% by day 7.
 */
function horizonFactor(leadHours: number): number {
  if (leadHours <= 3) return 1;
  if (leadHours <= 12) return 0.97;
  if (leadHours <= 24) return 0.93;
  if (leadHours <= 48) return 0.86;
  if (leadHours <= 96) return 0.75;
  if (leadHours <= 168) return 0.6;
  return 0.45;
}

/** Fewer voters means less certainty regardless of how well they agree. */
function memberFactor(count: number): number {
  if (count >= 5) return 1;
  if (count === 4) return 0.96;
  if (count === 3) return 0.9;
  if (count === 2) return 0.8;
  return 0.62;
}

interface FieldSample {
  sourceId: SourceId;
  value: number;
  weight: number;
}

function buildSamples<T>(
  members: { sourceId: SourceId; prior: number; entry: T }[],
  pick: (entry: T) => number | null | undefined,
  ctx: EnsembleContext,
  skillField: SkillField | null,
): FieldSample[] {
  const out: FieldSample[] = [];
  for (const m of members) {
    const raw = pick(m.entry);
    if (raw === null || raw === undefined || !Number.isFinite(raw)) continue;
    const correction = skillField ? biasCorrection(ctx.lat, ctx.lng, m.sourceId, skillField) : 0;
    const multiplier = skillField ? weightMultiplier(ctx.lat, ctx.lng, m.sourceId, skillField) : 1;
    out.push({ sourceId: m.sourceId, value: raw + correction, weight: m.prior * multiplier });
  }
  return out;
}

function blendMean(samples: FieldSample[], fallback: number): { value: number; cv: number; min: number; max: number } {
  if (samples.length === 0) return { value: fallback, cv: 0, min: fallback, max: fallback };
  const result = aggregate(samples as NumericSample[]);
  return { value: result.value, cv: result.cv_percent, min: result.range.min, max: result.range.max };
}

/**
 * Weight-weighted mode over categorical codes. Ties resolve to the more severe
 * condition: showing "rain" when half the models say rain and half say cloud is
 * the safer error.
 */
function blendWeatherCode(samples: FieldSample[]): number {
  if (samples.length === 0) return 0;
  const severityRank: Record<string, number> = { calm: 0, mild: 1, notable: 2, severe: 3 };
  const votes = new Map<number, number>();
  for (const s of samples) {
    const code = Math.round(s.value);
    votes.set(code, (votes.get(code) ?? 0) + s.weight);
  }
  let bestCode = Math.round(samples[0].value);
  let bestWeight = -1;
  for (const [code, weight] of votes) {
    if (weight > bestWeight + 1e-9) {
      bestCode = code;
      bestWeight = weight;
    } else if (Math.abs(weight - bestWeight) <= 1e-9) {
      const incoming = severityRank[severityForWeatherCode(code)] ?? 0;
      const current = severityRank[severityForWeatherCode(bestCode)] ?? 0;
      if (incoming > current) bestCode = code;
    }
  }
  return bestCode;
}

/**
 * Precipitation probability from two independent signals — see the file header.
 */
function blendPrecipProbability(
  probabilitySamples: FieldSample[],
  amountSamples: FieldSample[],
): number {
  const stated = probabilitySamples.length
    ? blendMean(probabilitySamples, 0).value
    : null;

  let agreement: number | null = null;
  if (amountSamples.length >= 2) {
    const totalWeight = amountSamples.reduce((a, s) => a + s.weight, 0);
    const wetWeight = amountSamples
      .filter((s) => s.value >= MEASURABLE_MM)
      .reduce((a, s) => a + s.weight, 0);
    if (totalWeight > 0) agreement = (wetWeight / totalWeight) * 100;
  }

  if (stated === null && agreement === null) return 0;
  if (agreement === null) return clampPercent(stated ?? 0);
  if (stated === null) return clampPercent(agreement);
  return clampPercent(stated * (1 - AGREEMENT_SHARE) + agreement * AGREEMENT_SHARE);
}

function clampPercent(v: number): number {
  return Math.round(Math.max(0, Math.min(100, v)));
}

/** Spread-based confidence using an absolute (not relative) temperature range. */
function confidenceFromSpread(spreadC: number, memberCount: number, leadHours: number): number {
  // 0 °C spread → 100, 2 °C → ~80, 5 °C → ~50, 10 °C → ~20.
  const agreement = 100 / (1 + spreadC / 2.4);
  const value = agreement * memberFactor(memberCount) * horizonFactor(leadHours);
  return Math.round(Math.max(5, Math.min(99, value)));
}

/* ── hourly ────────────────────────────────────────────────────────── */

export function blendHourly(members: Member<HourlyEntry>[], ctx: EnsembleContext, now = Date.now()): BlendedHourlyEntry[] {
  if (members.length === 0) return [];
  if (members.length === 1) return members[0].entries.map((e) => ({ ...e, sources_count: 1 }));

  const buckets = new Map<number, { sourceId: SourceId; prior: number; entry: HourlyEntry }[]>();
  for (const member of members) {
    // Guard against a member repeating the same hour (some APIs return a
    // duplicated boundary hour between their nowcast and hourly blocks).
    const seen = new Set<number>();
    for (const entry of member.entries) {
      const hour = floorToHour(entry.timestamp_unix);
      if (seen.has(hour)) continue;
      seen.add(hour);
      const list = buckets.get(hour) ?? [];
      list.push({ sourceId: member.sourceId, prior: member.prior, entry });
      buckets.set(hour, list);
    }
  }

  const currentHour = floorToHour(now);
  const hours = Array.from(buckets.keys())
    .filter((h) => h >= currentHour - HOUR_MS && h <= currentHour + MAX_HOURLY_HOURS * HOUR_MS)
    .sort((a, b) => a - b);

  const out: BlendedHourlyEntry[] = [];

  for (const hour of hours) {
    const bucket = buckets.get(hour)!;
    if (bucket.length < MIN_MEMBERS_FOR_TAIL) continue;

    const temp = blendMean(buildSamples(bucket, (e) => e.temperature_c, ctx, 'temperature'), 0);
    const apparent = blendMean(buildSamples(bucket, (e) => e.apparent_c, ctx, 'temperature'), temp.value);
    const humidity = blendMean(buildSamples(bucket, (e) => e.humidity_percent, ctx, 'humidity'), 0);
    const pressure = blendMean(buildSamples(bucket, (e) => e.pressure_hpa, ctx, 'pressure'), 0);
    const wind = blendMean(buildSamples(bucket, (e) => e.wind_kph, ctx, 'wind'), 0);
    const cloud = blendMean(buildSamples(bucket, (e) => e.cloud_cover_percent, ctx, 'cloud'), 0);
    const uv = blendMean(buildSamples(bucket, (e) => e.uv_index, ctx, null), 0);

    const amountSamples = buildSamples(bucket, (e) => e.precip_mm, ctx, null);
    const probSamples = buildSamples(bucket, (e) => e.precip_probability_percent, ctx, null);
    const direction = circularMean(
      bucket
        .filter((m) => Number.isFinite(m.entry.wind_direction_deg))
        .map((m) => ({ degrees: m.entry.wind_direction_deg, weight: m.prior })),
    );

    const dayVotes = bucket.reduce((acc, m) => acc + (m.entry.is_day ? m.prior : -m.prior), 0);
    const spread = Math.max(0, temp.max - temp.min);
    const leadHours = Math.max(0, (hour - currentHour) / HOUR_MS);

    out.push({
      timestamp_unix: hour,
      temperature_c: round1(temp.value),
      apparent_c: round1(apparent.value),
      precip_mm: round2(Math.max(0, weightedMedian(amountSamples))),
      precip_probability_percent: blendPrecipProbability(probSamples, amountSamples),
      wind_kph: round1(Math.max(0, wind.value)),
      wind_direction_deg: Math.round(direction.degrees),
      cloud_cover_percent: clampPercent(cloud.value),
      humidity_percent: clampPercent(humidity.value),
      pressure_hpa: round1(pressure.value),
      uv_index: round1(Math.max(0, uv.value)),
      weather_code: blendWeatherCode(buildSamples(bucket, (e) => e.weather_code, ctx, null)),
      is_day: dayVotes >= 0,
      confidence_percent: confidenceFromSpread(spread, bucket.length, leadHours),
      sources_count: bucket.length,
      temperature_min_c: round1(temp.min),
      temperature_max_c: round1(temp.max),
      spread_c: round1(spread),
    });
  }

  return out;
}

/* ── daily ─────────────────────────────────────────────────────────── */

export function blendDaily(members: Member<DailyEntry>[], ctx: EnsembleContext, now = Date.now()): BlendedDailyEntry[] {
  if (members.length === 0) return [];
  if (members.length === 1) return members[0].entries.map((e) => ({ ...e, sources_count: 1 }));

  const buckets = new Map<string, { sourceId: SourceId; prior: number; entry: DailyEntry }[]>();
  const bucketDate = new Map<string, number>();

  for (const member of members) {
    const seen = new Set<string>();
    for (const entry of member.entries) {
      const key = dayKey(entry.date_unix);
      if (seen.has(key)) continue;
      seen.add(key);
      const list = buckets.get(key) ?? [];
      list.push({ sourceId: member.sourceId, prior: member.prior, entry });
      buckets.set(key, list);
      if (!bucketDate.has(key)) bucketDate.set(key, entry.date_unix);
    }
  }

  const todayKey = dayKey(now);
  const ordered = Array.from(buckets.keys())
    .map((key) => ({ key, at: bucketDate.get(key)! }))
    .filter((b) => dayKey(b.at) === todayKey || b.at >= now - 12 * HOUR_MS)
    .sort((a, b) => a.at - b.at)
    .slice(0, MAX_DAILY_DAYS);

  const out: BlendedDailyEntry[] = [];

  for (let i = 0; i < ordered.length; i += 1) {
    const bucket = buckets.get(ordered[i].key)!;
    const high = blendMean(buildSamples(bucket, (e) => e.high_c, ctx, 'temperature'), 0);
    const low = blendMean(buildSamples(bucket, (e) => e.low_c, ctx, 'temperature'), 0);
    const windMax = blendMean(buildSamples(bucket, (e) => e.wind_kph_max, ctx, 'wind'), 0);
    const uvMax = blendMean(buildSamples(bucket, (e) => e.uv_index_max, ctx, null), 0);
    const amountSamples = buildSamples(bucket, (e) => e.precip_mm, ctx, null);
    const probSamples = buildSamples(bucket, (e) => e.precip_probability_percent, ctx, null);

    // Sunrise/sunset are astronomical, not forecast: take the highest-weight
    // member rather than averaging two differently-formatted strings.
    const anchor = [...bucket].sort((a, b) => b.prior - a.prior)[0];
    const climatology = bucket.find((m) => m.entry.climatology_delta_c !== null)?.entry.climatology_delta_c ?? null;

    // Envelope across members of both extremes — the widest plausible day.
    const spread = Math.max(0, high.max - high.min, low.max - low.min);
    const leadHours = Math.max(0, (ordered[i].at - now) / HOUR_MS);

    out.push({
      date_unix: ordered[i].at,
      high_c: round1(high.value),
      low_c: round1(low.value),
      precip_mm: round2(Math.max(0, weightedMedian(amountSamples))),
      precip_probability_percent: blendPrecipProbability(probSamples, amountSamples),
      wind_kph_max: round1(Math.max(0, windMax.value)),
      uv_index_max: round1(Math.max(0, uvMax.value)),
      sunrise: anchor.entry.sunrise,
      sunset: anchor.entry.sunset,
      weather_code: blendWeatherCode(buildSamples(bucket, (e) => e.weather_code, ctx, null)),
      // Recomputed by the engine once the AQI snapshot is known.
      day_quality_score: 0,
      climatology_delta_c: climatology,
      confidence_percent: confidenceFromSpread(spread, bucket.length, leadHours),
      sources_count: bucket.length,
      temperature_min_c: round1(low.min),
      temperature_max_c: round1(high.max),
      spread_c: round1(spread),
    });
  }

  return out;
}

/* ── entry point ───────────────────────────────────────────────────── */

export interface BlendedForecast extends ForecastLayers {
  hourly: BlendedHourlyEntry[];
  daily: BlendedDailyEntry[];
  /** Source ids that contributed at least one forecast series. */
  contributors: SourceId[];
}

/**
 * Blend every atmospheric member's forecast. Single-source layers
 * (minutely nowcast, extended hourly, seasonal trend) are taken from the
 * highest-prior member that supplied them — those come from one provider by
 * construction, so there is nothing to average.
 */
export function blendForecasts(responses: AdapterResponse[], ctx: EnsembleContext, now = Date.now()): BlendedForecast {
  const withForecast = responses.filter((r) => r.ok && r.forecast);

  const hourlyMembers: Member<HourlyEntry>[] = [];
  const dailyMembers: Member<DailyEntry>[] = [];
  const contributors = new Set<SourceId>();

  for (const response of withForecast) {
    const prior = priorWeight(response.sourceId);
    if (prior <= 0) continue;
    const forecast = response.forecast!;
    if (forecast.hourly?.length) {
      hourlyMembers.push({ sourceId: response.sourceId, prior, entries: forecast.hourly });
      contributors.add(response.sourceId);
    }
    if (forecast.daily?.length) {
      dailyMembers.push({ sourceId: response.sourceId, prior, entries: forecast.daily });
      contributors.add(response.sourceId);
    }
  }

  const byPriority = [...withForecast].sort(
    (a, b) => (SOURCE_REGISTRY[b.sourceId]?.weight ?? 0) - (SOURCE_REGISTRY[a.sourceId]?.weight ?? 0),
  );
  const firstOf = <K extends 'minutely' | 'extendedHourly' | 'trend'>(key: K): NonNullable<ForecastLayers[K]> => {
    for (const response of byPriority) {
      const layer = response.forecast?.[key];
      if (layer?.length) return layer as NonNullable<ForecastLayers[K]>;
    }
    return [] as unknown as NonNullable<ForecastLayers[K]>;
  };

  return {
    minutely: firstOf('minutely'),
    hourly: blendHourly(hourlyMembers, ctx, now),
    extendedHourly: firstOf('extendedHourly'),
    daily: blendDaily(dailyMembers, ctx, now),
    trend: firstOf('trend'),
    contributors: Array.from(contributors),
  };
}

function round1(v: number): number {
  return Number(v.toFixed(1));
}

function round2(v: number): number {
  return Number(v.toFixed(2));
}
