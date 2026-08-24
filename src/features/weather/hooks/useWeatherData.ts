// Back-compat shim — exposes the old `useWeatherData` shape on top of the
// new WeatherEngine so legacy consumers (LivingRibbon, SmartGreeting,
// WeatherWidget) keep working unchanged.
//
// Only the fields actually consumed by callers are populated; everything
// else maps from the canonical WeatherSnapshot.

import { useWeather } from './useWeather';
import { useWeatherForecast } from './useWeatherForecast';

export interface LegacyCurrent {
  temperature: number;
  weatherCode: number;
  isDay: boolean;
  apparentTemperature: number;
  humidity: number;
  precipitation: number;
  cloudCover: number;
  pressure: number;
  windSpeed: number;
  windDirection: number;
  windGusts: number;
  uvIndex: number;
  timestamp: number;
}

export interface LegacyHourly {
  time: number;
  hour: number;
  temperature: number;
  weatherCode: number;
  isDay: boolean;
  precipitationProbability: number;
  precipitation: number;
}

export interface LegacyDaily {
  date: number;
  weatherCode: number;
  tempMax: number;
  tempMin: number;
  sunrise: string;
  sunset: string;
  uvIndexMax: number;
  precipitationSum: number;
  precipitationProbabilityMax: number;
  windSpeedMax: number;
  windDirectionDominant: number;
}

export interface LegacyWeatherData {
  current: LegacyCurrent;
  hourly: LegacyHourly[];
  daily: LegacyDaily[];
  city: string | null;
  airQuality: { europeanAqi: number | null; pm2_5: number | null; pm10: number | null } | null;
}

export function useWeatherData(
  language: 'ar' = 'ar',
  customCoords?: { lat: number; lng: number; name?: string } | null
): { data: LegacyWeatherData | null; isRefreshing: boolean; refresh: () => void } {
  const { snapshot, isRefreshing, refresh } = useWeather(language, customCoords);
  const { forecast } = useWeatherForecast(language, customCoords);
  if (!snapshot) return { data: null, isRefreshing, refresh };

  const current: LegacyCurrent = {
    temperature: snapshot.temperature.actual_c,
    weatherCode: forecast.hourly[0]?.weather_code ?? 0,
    isDay: forecast.hourly[0]?.is_day ?? true,
    apparentTemperature: snapshot.temperature.apparent_c,
    humidity: snapshot.moisture.relative_humidity_percent,
    precipitation: snapshot.precipitation.intensity_mm_hr,
    cloudCover: snapshot.sky.cloud_cover_total_percent,
    pressure: snapshot.pressure.msl_hpa,
    windSpeed: snapshot.wind.speed_kph,
    windDirection: snapshot.wind.direction_deg,
    windGusts: snapshot.wind.gusts_kph,
    uvIndex: snapshot.solar.uv_index,
    timestamp: snapshot.meta.timestamp_unix,
  };

  const hourly: LegacyHourly[] = forecast.hourly.map(h => ({
    time: h.timestamp_unix,
    hour: new Date(h.timestamp_unix).getHours(),
    temperature: h.temperature_c,
    weatherCode: h.weather_code,
    isDay: h.is_day,
    precipitationProbability: h.precip_probability_percent,
    precipitation: h.precip_mm,
  }));

  const daily: LegacyDaily[] = forecast.daily.map(d => ({
    date: d.date_unix,
    weatherCode: d.weather_code,
    tempMax: d.high_c,
    tempMin: d.low_c,
    sunrise: d.sunrise,
    sunset: d.sunset,
    uvIndexMax: d.uv_index_max,
    precipitationSum: d.precip_mm,
    precipitationProbabilityMax: d.precip_probability_percent,
    windSpeedMax: d.wind_kph_max,
    windDirectionDominant: 0,
  }));

  return {
    data: {
      current, hourly, daily,
      city: null,
      airQuality: snapshot.airQuality.aqi_us ? {
        europeanAqi: snapshot.airQuality.aqi_eu_caqi,
        pm2_5: snapshot.airQuality.pm25_ugm3,
        pm10: snapshot.airQuality.pm10_ugm3,
      } : null,
    },
    isRefreshing,
    refresh,
  };
}
