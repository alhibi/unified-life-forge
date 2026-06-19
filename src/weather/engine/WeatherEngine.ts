// WeatherEngine — orchestrates everything.
//
// Pipeline per request:
//   1. Read cache (L1→L2→L3). Emit it via callback so UI paints instantly.
//   2. In parallel: dispatch every allowed adapter (closed/half-open breakers).
//   3. Collect AdapterResponses; update breaker state.
//   4. Aggregate per-field via EnsembleAggregator.
//   5. Run derived/computed fields (thermal, astronomy, scoring).
//   6. Persist to cache, emit final snapshot.

import type { PartialSnapshot, WeatherSnapshot } from '../types/WeatherSnapshot';
import type { ForecastLayers } from '../types/ForecastLayer';
import { EMPTY_FORECAST } from '../types/ForecastLayer';
import type { AdapterResponse, SourceId } from '../types/SourceRegistry';
import { SOURCE_REGISTRY } from '../types/SourceRegistry';

import { BaseAdapter, runAdapter } from '../sources/BaseAdapter';
import { OpenMeteoAdapter, OpenMeteoAirQualityAdapter } from '../sources/OpenMeteoAdapter';
import { MetNorwayAdapter } from '../sources/MetNorwayAdapter';
import { NOAAAdapter } from '../sources/NOAAAdapter';
import { TomorrowAdapter } from '../sources/TomorrowAdapter';
import { OpenWeatherAdapter } from '../sources/OpenWeatherAdapter';
import { WeatherbitAdapter } from '../sources/WeatherbitAdapter';
import { WAQIAdapter } from '../sources/WAQIAdapter';
import { StormGlassAdapter } from '../sources/StormGlassAdapter';
import { RainViewerAdapter } from '../sources/RainViewerAdapter';
import { OpenUVAdapter } from '../sources/OpenUVAdapter';
import { VisualCrossingAdapter } from '../sources/VisualCrossingAdapter';

import { breaker } from './CircuitBreaker';
import { aggregate, type NumericSample } from './EnsembleAggregator';

import { cacheManager, type CachedBundle } from '../cache/CacheManager';
import { computeAstronomy, solarPosition } from '../compute/AstronomyEngine';
import { classifyPressureTendency } from '../compute/PressureTrend';
import { dayQualityScore, outdoorHealthScore, aqiCategory, uvCategory, burnTimeMinutes } from '../compute/ComfortScorer';
import {
  apparentTemperature_C, dewPoint_C, wetBulb_C, heatIndex_C, windChill_C, humidex,
  absoluteHumidity_gm3, specificHumidity_gkg, vaporPressureDeficit_kPa,
  classifyThermalComfort, discomfortIndex, estimateCloudBase_m,
} from '../compute/ThermalCalculator';
import { beaufortScale, beaufortSeaState, degreesToCardinal16, hpaToInhg, msToKnots } from '../compute/UnitConverter';

// Composite adapter list. Open-Meteo contributes two adapters: atmospheric + AQI.
const ATMOSPHERIC_ADAPTERS: BaseAdapter[] = [
  new OpenMeteoAdapter(),
  new MetNorwayAdapter(),
  new NOAAAdapter(),
  new TomorrowAdapter(),
  new OpenWeatherAdapter(),
  new WeatherbitAdapter(),
];

const AIR_QUALITY_ADAPTERS: BaseAdapter[] = [
  new WAQIAdapter(),
  new OpenMeteoAirQualityAdapter(),
];

const SPECIALIST_ADAPTERS: BaseAdapter[] = [
  new RainViewerAdapter(),
  new OpenUVAdapter(),
  new StormGlassAdapter(),
  new VisualCrossingAdapter(),
];

const ALL_ADAPTERS = [...ATMOSPHERIC_ADAPTERS, ...AIR_QUALITY_ADAPTERS, ...SPECIALIST_ADAPTERS];

export interface EngineRequest {
  lat: number;
  lng: number;
  language?: 'ar' | 'de' | 'en';
  forceRefresh?: boolean;
}

export interface EngineResult {
  snapshot: WeatherSnapshot;
  forecast: ForecastLayers;
  tier: 'fresh' | 'L1' | 'L2' | 'L3';
  responses: AdapterResponse[];
}

export type EngineListener = (result: EngineResult) => void;

export class WeatherEngine {
  private listeners = new Set<EngineListener>();
  private inFlight: Promise<EngineResult> | null = null;

  subscribe(fn: EngineListener): () => void {
    this.listeners.add(fn);
    return () => { this.listeners.delete(fn); };
  }

  private emit(r: EngineResult) {
    for (const fn of this.listeners) fn(r);
    try {
      window.dispatchEvent(new CustomEvent('weather:refreshed', { detail: r }));
    } catch { /* SSR */ }
  }

  async request(req: EngineRequest): Promise<EngineResult> {
    if (this.inFlight && !req.forceRefresh) return this.inFlight;
    this.inFlight = this.runPipeline(req).finally(() => { this.inFlight = null; });
    return this.inFlight;
  }

  private async runPipeline(req: EngineRequest): Promise<EngineResult> {
    const t0 = performance.now();
    const cacheKey = cacheManager.keyFor(req.lat, req.lng);

    // 1 — emit cached value immediately if present.
    if (!req.forceRefresh) {
      const cached = await cacheManager.read(cacheKey);
      if (cached) {
        const preEmit: EngineResult = {
          snapshot: cached.value.snapshot,
          forecast: cached.value.forecast,
          tier: cached.tier,
          responses: [],
        };
        // Emit cached result; fall through and refresh in background.
        this.emit(preEmit);
        if (Date.now() - cached.value.cachedAt < 5 * 60_000) {
          // very fresh — skip background refresh
          return preEmit;
        }
      }
    }

    // 2 — dispatch adapters in parallel.
    const ctx = { lat: req.lat, lng: req.lng, language: req.language ?? 'ar' as const };
    const allowed = ALL_ADAPTERS.filter(a => breaker.allow(a.id));
    const responses = await Promise.allSettled(allowed.map(a => runAdapter(a, ctx)));
    const settled: AdapterResponse[] = responses.map((r, i) => {
      if (r.status === 'fulfilled') {
        if (r.value.ok) breaker.recordSuccess(r.value.sourceId, r.value.durationMs);
        else breaker.recordFailure(r.value.sourceId, r.value.durationMs);
        return r.value;
      }
      breaker.recordFailure(allowed[i].id, 0);
      return { sourceId: allowed[i].id, ok: false, durationMs: 0, error: (r.reason as Error)?.message ?? 'rejected' };
    });

    const okResponses = settled.filter(r => r.ok && r.snapshot);
    const forecastResponses = settled.filter(r => r.ok && r.forecast);

    // 3 — merge into final snapshot.
    const snapshot = this.buildSnapshot(req, okResponses, performance.now() - t0);
    const forecast = this.mergeForecasts(forecastResponses);

    // Score every daily entry using the new snapshot.
    for (const day of forecast.daily) {
      day.day_quality_score = dayQualityScore({
        sunshine_pct: Math.max(0, 100 - day.precip_probability_percent),
        gusts_kph: day.wind_kph_max,
        precip_prob_pct: day.precip_probability_percent,
        aqi_us: snapshot.airQuality.aqi_us || 50,
        temp_c: (day.high_c + day.low_c) / 2,
      });
    }

    const bundle: CachedBundle = { snapshot, forecast, cachedAt: Date.now() };
    await cacheManager.write(cacheKey, bundle);

    const result: EngineResult = { snapshot, forecast, tier: 'fresh', responses: settled };
    this.emit(result);
    return result;
  }

  private mergeForecasts(responses: AdapterResponse[]): ForecastLayers {
    const merged: ForecastLayers = { ...EMPTY_FORECAST };
    for (const r of responses) {
      const f = r.forecast ?? {};
      if (f.minutely?.length && merged.minutely.length === 0) merged.minutely = f.minutely;
      if (f.hourly?.length   && merged.hourly.length   === 0) merged.hourly   = f.hourly;
      if (f.extendedHourly?.length && merged.extendedHourly.length === 0) merged.extendedHourly = f.extendedHourly;
      if (f.daily?.length    && merged.daily.length    === 0) merged.daily    = f.daily;
      if (f.trend?.length    && merged.trend.length    === 0) merged.trend    = f.trend;
    }
    return merged;
  }

  private collect<T>(responses: AdapterResponse[], pick: (s: PartialSnapshot) => T | undefined): { sourceId: SourceId; value: T }[] {
    const out: { sourceId: SourceId; value: T }[] = [];
    for (const r of responses) {
      const v = r.snapshot ? pick(r.snapshot) : undefined;
      if (v !== undefined && v !== null) out.push({ sourceId: r.sourceId, value: v });
    }
    return out;
  }

  private agg(samples: { sourceId: SourceId; value: number }[]) {
    const enriched: NumericSample[] = samples.map(s => ({
      sourceId: s.sourceId,
      value: s.value,
      weight: SOURCE_REGISTRY[s.sourceId].weight,
    }));
    return aggregate(enriched);
  }

  private buildSnapshot(
    req: EngineRequest,
    responses: AdapterResponse[],
    fetchDurationMs: number,
  ): WeatherSnapshot {
    const now = Date.now();

    // Ensemble each independent metric.
    const tempActual = this.agg(this.collect(responses, s => s.temperature?.actual_c).map(x => ({ sourceId: x.sourceId, value: x.value as number })));
    const humidity = this.agg(this.collect(responses, s => s.moisture?.relative_humidity_percent).map(x => ({ sourceId: x.sourceId, value: x.value as number })));
    const pressureMsl = this.agg(this.collect(responses, s => s.pressure?.msl_hpa).map(x => ({ sourceId: x.sourceId, value: x.value as number })));
    const windKph = this.agg(this.collect(responses, s => s.wind?.speed_kph).map(x => ({ sourceId: x.sourceId, value: x.value as number })));
    const windDir = this.agg(this.collect(responses, s => s.wind?.direction_deg).map(x => ({ sourceId: x.sourceId, value: x.value as number })));
    const gusts = this.agg(this.collect(responses, s => s.wind?.gusts_kph).map(x => ({ sourceId: x.sourceId, value: x.value as number })));
    const clouds = this.agg(this.collect(responses, s => s.sky?.cloud_cover_total_percent).map(x => ({ sourceId: x.sourceId, value: x.value as number })));
    const uv = this.agg(this.collect(responses, s => s.solar?.uv_index).map(x => ({ sourceId: x.sourceId, value: x.value as number })));
    const precipProb = this.agg(this.collect(responses, s => s.precipitation?.probability_percent).map(x => ({ sourceId: x.sourceId, value: x.value as number })));
    const precipMmHr = this.agg(this.collect(responses, s => s.precipitation?.intensity_mm_hr).map(x => ({ sourceId: x.sourceId, value: x.value as number })));

    const T = tempActual.value;
    const RH = Math.max(0, Math.min(100, humidity.value));
    const windKphValue = Math.max(0, windKph.value);

    const dewPoint = dewPoint_C(T, RH);
    const wetBulb  = wetBulb_C(T, RH);
    const apparent = apparentTemperature_C(T, RH, windKphValue);
    const beaufort = beaufortScale(windKphValue / 3.6);

    // Pull marine + radar + AQI + climatology + soil from the response that produced them.
    const pick = <K extends keyof PartialSnapshot>(key: K): PartialSnapshot[K] | undefined => {
      for (const r of responses) {
        const v = r.snapshot?.[key];
        if (v) return v;
      }
      return undefined;
    };

    const marine = pick('marine');
    const radar  = pick('radar');
    const aqIA   = pick('airQuality');
    const biological = pick('biological');
    const climatology = pick('climatology');
    const soil = pick('moisture');
    const locMeta = pick('meta');

    const lat = req.lat;
    const lng = req.lng;
    const astro = computeAstronomy(lat, lng, new Date(now));
    const sun = solarPosition(lat, lng, new Date(now));

    const aqiUs = aqIA?.aqi_us ?? 0;
    const uvIdx = Math.max(0, uv.value);
    const pollenTotal = biological?.pollen_total_index ?? null;

    // Confidence rollup — average non-zero per-metric confidences.
    const confidences = [tempActual.confidence_percent, humidity.confidence_percent, pressureMsl.confidence_percent, windKph.confidence_percent]
      .filter(c => c > 0);
    const ensembleConfidence = confidences.length
      ? Math.round(confidences.reduce((a, b) => a + b) / confidences.length)
      : 50;
    const cvAvg = [tempActual.cv_percent, humidity.cv_percent, pressureMsl.cv_percent, windKph.cv_percent]
      .filter(c => Number.isFinite(c));
    const disagreement = cvAvg.length ? Math.round(cvAvg.reduce((a, b) => a + b) / cvAvg.length) : 0;

    const allModelsAgreed = new Set<SourceId>();
    const allModelsOutlier = new Set<SourceId>();
    [tempActual, humidity, pressureMsl, windKph].forEach(r => {
      r.models_in_agreement.forEach(m => allModelsAgreed.add(m));
      r.models_outlier.forEach(m => allModelsOutlier.add(m));
    });

    const pressureTrend = classifyPressureTendency(0); // need history to compute Δ; placeholder

    const heat = heatIndex_C(T, RH);
    const wc = windChill_C(T, windKphValue);
    const hum = humidex(T, RH);

    return {
      meta: {
        timestamp_unix: now,
        location: {
          lat, lng,
          elevation_m: locMeta?.location?.elevation_m ?? 0,
          timezone: locMeta?.location?.timezone ?? Intl.DateTimeFormat().resolvedOptions().timeZone,
        },
        sources_queried: responses.length || 0,
        sources_responded: responses.filter(r => r.ok).length,
        ensemble_confidence_percent: ensembleConfidence,
        disagreement_score_percent: disagreement,
        models_in_agreement: Array.from(allModelsAgreed),
        models_outlier: Array.from(allModelsOutlier),
        last_updated_unix: now,
        data_age_minutes: 0,
        is_stale: false,
        fetch_duration_ms: Math.round(fetchDurationMs),
      },
      temperature: {
        actual_c: T,
        feels_like_c: apparent,
        dew_point_c: Number(dewPoint.toFixed(1)),
        wet_bulb_c: Number(wetBulb.toFixed(1)),
        heat_index_c: heat,
        wind_chill_c: wc,
        humidex: hum,
        apparent_c: Number(apparent.toFixed(1)),
        ensemble_range_c: tempActual.range,
        daily_high_c: pick('temperature')?.daily_high_c ?? T,
        daily_low_c:  pick('temperature')?.daily_low_c  ?? T,
        anomaly_vs_30yr_avg_c: climatology?.monthly_avg_temp_c !== undefined && climatology.monthly_avg_temp_c !== null
          ? Number((T - climatology.monthly_avg_temp_c).toFixed(1))
          : 0,
        record_high_c: null,
        record_low_c: null,
        thermal_comfort_level: classifyThermalComfort(apparent),
        discomfort_index: Number(discomfortIndex(T, RH).toFixed(1)),
      },
      moisture: {
        relative_humidity_percent: Math.round(RH),
        absolute_humidity_gm3: Number(absoluteHumidity_gm3(T, RH).toFixed(2)),
        specific_humidity_gkg: Number(specificHumidity_gkg(T, RH, pressureMsl.value).toFixed(2)),
        vapor_pressure_deficit_kpa: Number(vaporPressureDeficit_kPa(T, RH).toFixed(2)),
        soil_moisture_0_1cm_m3m3: soil?.soil_moisture_0_1cm_m3m3 ?? null,
        soil_moisture_1_3cm_m3m3: soil?.soil_moisture_1_3cm_m3m3 ?? null,
        soil_moisture_3_9cm_m3m3: soil?.soil_moisture_3_9cm_m3m3 ?? null,
        soil_moisture_9_27cm_m3m3: soil?.soil_moisture_9_27cm_m3m3 ?? null,
        soil_temperature_0cm_c: soil?.soil_temperature_0cm_c ?? null,
        soil_temperature_6cm_c: soil?.soil_temperature_6cm_c ?? null,
      },
      pressure: {
        msl_hpa: Number(pressureMsl.value.toFixed(1)),
        surface_hpa: pick('pressure')?.surface_hpa ?? Number(pressureMsl.value.toFixed(1)),
        tendency_hpa_per_3hr: 0,
        tendency_direction: pressureTrend.direction,
        tendency_label: pressureTrend.label,
        altimeter_inhg: Number(hpaToInhg(pressureMsl.value).toFixed(2)),
        qnh_hpa: Number(pressureMsl.value.toFixed(1)),
      },
      wind: {
        speed_ms: Number((windKphValue / 3.6).toFixed(2)),
        speed_kph: Number(windKphValue.toFixed(1)),
        speed_knots: Number(msToKnots(windKphValue / 3.6).toFixed(1)),
        gusts_kph: Number(Math.max(windKphValue, gusts.value).toFixed(1)),
        direction_deg: Math.round(((windDir.value % 360) + 360) % 360),
        direction_cardinal_16pt: degreesToCardinal16(windDir.value),
        beaufort_scale: beaufort.scale,
        beaufort_description: beaufort.description,
        wind_shear_100m_ms: null,
        wind_at_100m_kph: null,
        wind_run_km_day: Number((windKphValue * 24).toFixed(0)),
        sustained_dangerous: gusts.value > 90,
        direction_variability_deg: windDir.cv_percent,
      },
      precipitation: {
        probability_percent: Math.round(Math.max(0, Math.min(100, precipProb.value))),
        intensity_mm_hr: Number(Math.max(0, precipMmHr.value).toFixed(2)),
        accumulation_1h_mm: Number(Math.max(0, precipMmHr.value).toFixed(2)),
        accumulation_6h_mm: 0,
        accumulation_24h_mm: pick('precipitation')?.accumulation_24h_mm ?? 0,
        accumulation_7d_mm: 0,
        type: precipMmHr.value > 0 ? 'rain' : 'none',
        snow_depth_cm: null,
        snowfall_rate_cm_hr: null,
        snow_water_equivalent_mm: null,
        thunder_probability_percent: pick('precipitation')?.thunder_probability_percent ?? 0,
        hail_probability_percent: 0,
        lightning_density_strikes_km2_hr: null,
        drought_index: null,
      },
      sky: {
        cloud_cover_total_percent: Math.round(clouds.value),
        cloud_cover_low_percent: pick('sky')?.cloud_cover_low_percent ?? 0,
        cloud_cover_mid_percent: pick('sky')?.cloud_cover_mid_percent ?? 0,
        cloud_cover_high_percent: pick('sky')?.cloud_cover_high_percent ?? 0,
        cloud_ceiling_m: null,
        cloud_base_m: estimateCloudBase_m(T, dewPoint),
        cloud_type: clouds.value < 10 ? 'clear' : clouds.value < 30 ? 'few' : clouds.value < 60 ? 'scattered' : clouds.value < 90 ? 'broken' : 'overcast',
        visibility_km: pick('sky')?.visibility_km ?? 10,
        fog_probability_percent: pick('sky')?.fog_probability_percent ?? 0,
        fog_type: 'none',
        smoke_density: null,
        dust_density: null,
      },
      solar: {
        uv_index: Number(uvIdx.toFixed(1)),
        uv_category: uvCategory(uvIdx),
        uv_max_today: pick('solar')?.uv_max_today ?? uvIdx,
        uv_max_time: pick('solar')?.uv_max_time ?? astro.solar_noon,
        burn_time_skin_type_2_min: burnTimeMinutes(uvIdx, 200),
        burn_time_skin_type_4_min: burnTimeMinutes(uvIdx, 400),
        vitamin_d_window_active: uvIdx >= 3,
        ghi_wm2: pick('solar')?.ghi_wm2 ?? Math.max(0, sun.elevation_deg) * 10,
        dni_wm2: pick('solar')?.dni_wm2 ?? null,
        dhi_wm2: pick('solar')?.dhi_wm2 ?? null,
        sunshine_duration_today_min: 0,
        sunshine_percent_of_possible: Math.max(0, 100 - clouds.value),
        solar_elevation_deg: Number(sun.elevation_deg.toFixed(1)),
        solar_azimuth_deg: Number(sun.azimuth_deg.toFixed(1)),
        clear_sky_ghi_wm2: null,
        cloud_radiative_effect_wm2: null,
      },
      airQuality: {
        aqi_us: aqIA?.aqi_us ?? 0,
        aqi_eu_caqi: aqIA?.aqi_eu_caqi ?? 0,
        aqi_category: aqiCategory(aqiUs),
        dominant_pollutant: aqIA?.dominant_pollutant ?? 'unknown',
        pm25_ugm3: aqIA?.pm25_ugm3 ?? 0,
        pm25_24h_avg_ugm3: aqIA?.pm25_24h_avg_ugm3 ?? aqIA?.pm25_ugm3 ?? 0,
        pm10_ugm3: aqIA?.pm10_ugm3 ?? 0,
        no2_ugm3:  aqIA?.no2_ugm3  ?? 0,
        o3_ugm3:   aqIA?.o3_ugm3   ?? 0,
        co_mgm3:   aqIA?.co_mgm3   ?? 0,
        so2_ugm3:  aqIA?.so2_ugm3  ?? 0,
        nh3_ugm3:  aqIA?.nh3_ugm3  ?? null,
        source_station_name: aqIA?.source_station_name ?? null,
        source_station_distance_km: aqIA?.source_station_distance_km ?? null,
        model_vs_station_disagreement_percent: null,
        health_advisory: aqiUs > 150 ? 'Limit outdoor exertion' : aqiUs > 100 ? 'Sensitive groups take care' : 'Air is healthy',
      },
      biological: {
        pollen_total_index: biological?.pollen_total_index ?? null,
        pollen_grass_index: biological?.pollen_grass_index ?? null,
        pollen_tree_index:  biological?.pollen_tree_index  ?? null,
        pollen_weed_index:  biological?.pollen_weed_index  ?? null,
        pollen_risk: pollenTotal === null ? 'none' : pollenTotal < 2 ? 'low' : pollenTotal < 4 ? 'moderate' : pollenTotal < 7 ? 'high' : 'very_high',
        pollen_dominant_type: null,
        mold_risk: null,
        mosquito_activity_index: null,
        outdoor_health_score: outdoorHealthScore({ aqi_us: aqiUs, uv_index: uvIdx, pollen_total: pollenTotal, apparent_c: apparent }),
      },
      instability: {
        cape_jkg: pick('instability')?.cape_jkg ?? null,
        lifted_index: pick('instability')?.lifted_index ?? null,
        cin_jkg: null,
        storm_relative_helicity: null,
        k_index: null,
        total_totals_index: null,
        severe_weather_risk: (pick('instability')?.cape_jkg ?? 0) > 2500 ? 'moderate' : 'none',
        fire_weather_index: null,
        fire_danger_category: null,
      },
      marine: {
        available: marine?.available ?? false,
        wave_height_m: marine?.wave_height_m ?? null,
        wave_period_s: marine?.wave_period_s ?? null,
        wave_direction_deg: marine?.wave_direction_deg ?? null,
        wave_direction_cardinal: marine?.wave_direction_deg !== undefined && marine?.wave_direction_deg !== null
          ? degreesToCardinal16(marine.wave_direction_deg) : null,
        swell_height_m: marine?.swell_height_m ?? null,
        swell_period_s: marine?.swell_period_s ?? null,
        wind_wave_height_m: marine?.wind_wave_height_m ?? null,
        sea_surface_temp_c: marine?.sea_surface_temp_c ?? null,
        water_visibility_m: marine?.water_visibility_m ?? null,
        rip_current_risk: null,
        beaufort_sea_state: marine?.wave_height_m != null ? beaufortSeaState(marine.wave_height_m).state : null,
        beaufort_sea_description: marine?.wave_height_m != null ? beaufortSeaState(marine.wave_height_m).description : null,
      },
      astronomical: astro,
      climatology: {
        monthly_avg_temp_c: climatology?.monthly_avg_temp_c ?? null,
        monthly_avg_precip_mm: climatology?.monthly_avg_precip_mm ?? null,
        monthly_avg_sunshine_hr: null,
        today_temp_anomaly_c: climatology?.today_temp_anomaly_c ?? null,
        today_precip_anomaly_mm: null,
        warmest_month: null,
        driest_month: null,
        koppen_climate_class: null,
        elevation_m: locMeta?.location?.elevation_m ?? 0,
        urban_heat_island_effect_c: null,
        microclimate_note: null,
      },
      radar: radar ?? {
        tiles_available: false,
        past_timestamps: [],
        future_timestamps: [],
        tile_url_template: '',
        satellite_tile_url_template: null,
        snowcover_tile_url_template: null,
        last_radar_update_unix: 0,
      },
    } satisfies WeatherSnapshot;
  }
}

export const weatherEngine = new WeatherEngine();
