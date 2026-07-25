// ============================================================================
// WeatherSnapshot — canonical weather data shape consumed by the entire app.
// Every field is strictly typed; numeric fields embed their unit in the name.
// Missing/unsupported data is `null`, never undefined or zero.
// ============================================================================

export type ThermalComfort =
  | 'dangerously_cold' | 'cold' | 'cool' | 'comfortable'
  | 'warm' | 'hot' | 'dangerously_hot';

export type PressureTendency =
  | 'rapidly_rising' | 'rising' | 'steady' | 'falling' | 'rapidly_falling';

export type PrecipType =
  | 'none' | 'rain' | 'drizzle' | 'snow' | 'sleet'
  | 'freezing_rain' | 'hail' | 'mixed' | 'ice_pellets';

export type CloudType =
  | 'clear' | 'few' | 'scattered' | 'broken'
  | 'overcast' | 'cumulonimbus' | 'towering_cumulus';

export type FogType = 'none' | 'radiation' | 'advection' | 'ground' | 'freezing';

export type UVCategory = 'low' | 'moderate' | 'high' | 'very_high' | 'extreme';

export type AQICategory =
  | 'good' | 'moderate' | 'unhealthy_sensitive'
  | 'unhealthy' | 'very_unhealthy' | 'hazardous';

export type PollenRisk = 'none' | 'low' | 'moderate' | 'high' | 'very_high';

export type SevereWeatherRisk =
  | 'none' | 'marginal' | 'slight' | 'enhanced' | 'moderate' | 'high';

export type FireDanger = 'low' | 'moderate' | 'high' | 'very_high' | 'extreme';

export type MoonPhaseName =
  | 'new_moon' | 'waxing_crescent' | 'first_quarter' | 'waxing_gibbous'
  | 'full_moon' | 'waning_gibbous' | 'last_quarter' | 'waning_crescent';

export interface WeatherSnapshot {
  meta: {
    timestamp_unix: number;
    location: { lat: number; lng: number; elevation_m: number; timezone: string };
    sources_queried: number;
    sources_responded: number;
    ensemble_confidence_percent: number;
    disagreement_score_percent: number;
    models_in_agreement: string[];
    models_outlier: string[];
    last_updated_unix: number;
    data_age_minutes: number;
    is_stale: boolean;
    fetch_duration_ms: number;
  };

  temperature: {
    actual_c: number;
    feels_like_c: number;
    dew_point_c: number;
    wet_bulb_c: number;
    heat_index_c: number | null;
    wind_chill_c: number | null;
    humidex: number | null;
    apparent_c: number;
    ensemble_range_c: { min: number; max: number };
    daily_high_c: number;
    daily_low_c: number;
    anomaly_vs_30yr_avg_c: number;
    record_high_c: number | null;
    record_low_c: number | null;
    thermal_comfort_level: ThermalComfort;
    discomfort_index: number;
  };

  moisture: {
    relative_humidity_percent: number;
    absolute_humidity_gm3: number;
    specific_humidity_gkg: number;
    vapor_pressure_deficit_kpa: number;
    soil_moisture_0_1cm_m3m3: number | null;
    soil_moisture_1_3cm_m3m3: number | null;
    soil_moisture_3_9cm_m3m3: number | null;
    soil_moisture_9_27cm_m3m3: number | null;
    soil_temperature_0cm_c: number | null;
    soil_temperature_6cm_c: number | null;
  };

  pressure: {
    msl_hpa: number;
    surface_hpa: number;
    tendency_hpa_per_3hr: number;
    tendency_direction: PressureTendency;
    tendency_label: string;
    altimeter_inhg: number;
    qnh_hpa: number;
  };

  wind: {
    speed_ms: number;
    speed_kph: number;
    speed_knots: number;
    gusts_kph: number;
    direction_deg: number;
    direction_cardinal_16pt: string;
    beaufort_scale: number;
    beaufort_description: string;
    wind_shear_100m_ms: number | null;
    wind_at_100m_kph: number | null;
    wind_run_km_day: number;
    sustained_dangerous: boolean;
    direction_variability_deg: number;
  };

  precipitation: {
    probability_percent: number;
    intensity_mm_hr: number;
    accumulation_1h_mm: number;
    accumulation_6h_mm: number;
    accumulation_24h_mm: number;
    accumulation_7d_mm: number;
    type: PrecipType;
    snow_depth_cm: number | null;
    snowfall_rate_cm_hr: number | null;
    snow_water_equivalent_mm: number | null;
    thunder_probability_percent: number;
    hail_probability_percent: number;
    lightning_density_strikes_km2_hr: number | null;
    drought_index: number | null;
  };

  sky: {
    cloud_cover_total_percent: number;
    cloud_cover_low_percent: number;
    cloud_cover_mid_percent: number;
    cloud_cover_high_percent: number;
    cloud_ceiling_m: number | null;
    cloud_base_m: number | null;
    cloud_type: CloudType;
    visibility_km: number;
    fog_probability_percent: number;
    fog_type: FogType;
    smoke_density: number | null;
    dust_density: number | null;
  };

  solar: {
    uv_index: number;
    uv_category: UVCategory;
    uv_max_today: number;
    uv_max_time: string;
    burn_time_skin_type_2_min: number | null;
    burn_time_skin_type_4_min: number | null;
    vitamin_d_window_active: boolean;
    ghi_wm2: number;
    dni_wm2: number | null;
    dhi_wm2: number | null;
    sunshine_duration_today_min: number;
    sunshine_percent_of_possible: number;
    solar_elevation_deg: number;
    solar_azimuth_deg: number;
    clear_sky_ghi_wm2: number | null;
    cloud_radiative_effect_wm2: number | null;
  };

  airQuality: {
    aqi_us: number;
    aqi_eu_caqi: number;
    aqi_category: AQICategory;
    dominant_pollutant: string;
    pm25_ugm3: number;
    pm25_24h_avg_ugm3: number;
    pm10_ugm3: number;
    no2_ugm3: number;
    o3_ugm3: number;
    co_mgm3: number;
    so2_ugm3: number;
    nh3_ugm3: number | null;
    source_station_name: string | null;
    source_station_distance_km: number | null;
    model_vs_station_disagreement_percent: number | null;
    health_advisory: string;
  };

  biological: {
    pollen_total_index: number | null;
    pollen_grass_index: number | null;
    pollen_tree_index: number | null;
    pollen_weed_index: number | null;
    pollen_risk: PollenRisk;
    pollen_dominant_type: string | null;
    mold_risk: 'low' | 'moderate' | 'high' | null;
    mosquito_activity_index: number | null;
    outdoor_health_score: number;
  };

  instability: {
    cape_jkg: number | null;
    lifted_index: number | null;
    cin_jkg: number | null;
    storm_relative_helicity: number | null;
    k_index: number | null;
    total_totals_index: number | null;
    severe_weather_risk: SevereWeatherRisk;
    fire_weather_index: number | null;
    fire_danger_category: FireDanger | null;
  };

  marine: {
    available: boolean;
    wave_height_m: number | null;
    wave_period_s: number | null;
    wave_direction_deg: number | null;
    wave_direction_cardinal: string | null;
    swell_height_m: number | null;
    swell_period_s: number | null;
    wind_wave_height_m: number | null;
    sea_surface_temp_c: number | null;
    water_visibility_m: number | null;
    rip_current_risk: 'low' | 'moderate' | 'high' | null;
    beaufort_sea_state: number | null;
    beaufort_sea_description: string | null;
  };

  astronomical: {
    sunrise: string;
    sunset: string;
    solar_noon: string;
    astronomical_dawn: string;
    nautical_dawn: string;
    civil_dawn: string;
    civil_dusk: string;
    nautical_dusk: string;
    astronomical_dusk: string;
    golden_hour_morning_start: string;
    golden_hour_morning_end: string;
    golden_hour_evening_start: string;
    golden_hour_evening_end: string;
    blue_hour_morning_start: string;
    blue_hour_morning_end: string;
    blue_hour_evening_start: string;
    blue_hour_evening_end: string;
    day_length_hours: number;
    daylight_remaining_hours: number;
    moonrise: string | null;
    moonset: string | null;
    moon_phase_angle_deg: number;
    moon_phase_name: MoonPhaseName;
    moon_illumination_percent: number;
    moon_distance_km: number;
    is_supermoon: boolean;
    next_full_moon_date: string;
    next_lunar_eclipse: string | null;
    planetary_visibility: { planet: string; visible: boolean; direction: string }[];
  };

  climatology: {
    monthly_avg_temp_c: number | null;
    monthly_avg_precip_mm: number | null;
    monthly_avg_sunshine_hr: number | null;
    today_temp_anomaly_c: number | null;
    today_precip_anomaly_mm: number | null;
    warmest_month: string | null;
    driest_month: string | null;
    koppen_climate_class: string | null;
    elevation_m: number;
    urban_heat_island_effect_c: number | null;
    microclimate_note: string | null;
  };

  radar: {
    tiles_available: boolean;
    past_timestamps: number[];
    future_timestamps: number[];
    tile_url_template: string;
    satellite_tile_url_template: string | null;
    snowcover_tile_url_template: string | null;
    last_radar_update_unix: number;
  };
}

// Partial snapshot — what an individual adapter returns. The engine merges
// many of these into a full WeatherSnapshot. Each adapter only fills the
// sections it knows about; everything else is omitted.
export type PartialSnapshot = {
  [K in keyof WeatherSnapshot]?: Partial<WeatherSnapshot[K]>;
};
